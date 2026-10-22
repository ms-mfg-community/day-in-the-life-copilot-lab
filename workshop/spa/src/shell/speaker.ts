// The speaker script surface (specs/005-teaching-spa.md 2.7, AC9, AC10): the script of the segment the presentation is on, the stage
// of the reveal it has reached and the time left on its timer, in the same document as the presentation, at `#/script`.
//
// The surface follows the presentation over the first transport that answers (sync.ts) and is in one of three states, which it says in
// words and in `data-sync-state`:
//
//   connecting        looking for the presentation; it shows the first segment, and its controls wait.
//   synchronized      following it (AC9): the segment, the reveal and the timer are the presentation's. The controls are off, because
//                     the presentation moves the script, unless two-way navigation was asked for: then they ask the presentation to move,
//                     and the surface moves when it does. It says this only while the presentation it follows owns this window and is
//                     there: when another presentation opens the window again, it follows that one, and moves to what it shows within
//                     the 500 ms of AC9; when the presentation leaves (goodbye, closed, reloaded away), it stops saying it.
//   not-synchronized  nothing answered (AC10), every transport was forced to fail, or the presentation it followed is gone. This is a
//                     state of its own, not a broken page: the surface says so, announces it in the status region, and its controls move
//                     the script by themselves. It looks for a presentation again, quietly, whenever the window has a new owner, and
//                     after a while (sync.ts), and is synchronized again, and says so, when one answers.
//
// What the page exposes, besides `data-segment-index` (zero-based, the one the spec names): `data-surface="script"`,
// `data-segment-id`, `data-sync-state`, `data-sync-transport` (the transport that answered, or `none`), `data-revealed-steps` and
// `data-timer-state` (`idle|running|paused|done`, or `none` where the segment has no timer or the surface is not following).
//
// The script is the markup the build made from the curriculum's own script file, through the same sanitizing pipeline as the slides
// (vite-content-plugin.ts): nothing is fetched here and nothing is written here. No structural DOM type is imported, because this
// project's TypeScript has no DOM lib; the shell hands over the real document and window, a test hands over the fake ones.

import type { Announcer } from './live-region';
import type { ShellStore } from './state';
import { createSpeakerSync, type SpeakerSync, type SyncConfig, type SyncState, type SyncStateName, type SyncTimer, type SyncWindow, type TimerPhase, type TransportName } from './sync';

export interface SpeakerElement {
  textContent: string | null;
  innerHTML: string;
  hidden: boolean;
  disabled?: boolean;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  removeAttribute(name: string): void;
  append(...children: unknown[]): void;
  replaceChildren(...children: unknown[]): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface SpeakerDocument {
  title: string;
  getElementById(id: string): SpeakerElement | null;
  createElement(tagName: string): SpeakerElement;
}

export interface SpeakerWindow extends SyncWindow {
  scrollTo?(x: number, y: number): void;
}

export interface SpeakerSegment {
  readonly id: string;
  readonly title: string;
  readonly minutes: number;
  /** Sanitized at build time. Missing or empty for a segment whose script file is not there. */
  readonly scriptHtml?: string;
}

export interface MountSpeakerOptions {
  readonly document: SpeakerDocument;
  readonly window: SpeakerWindow;
  /** Where the surface is. `main.ts` hands over the store of the page; the presentation's own is a different one, in the other window. */
  readonly store: Pick<ShellStore, 'get' | 'navigate' | 'subscribe'>;
  readonly segments: readonly SpeakerSegment[];
  readonly announce: Announcer;
  readonly config: SyncConfig;
}

export interface Speaker {
  /** The one `section#speaker-script` in `main`. */
  readonly element: SpeakerElement;
  readonly sync: SpeakerSync;
  /** Lets go of the transport, the timer and the store: what `pagehide` calls. The page stays as it is. */
  dispose(): void;
}

const SECOND = 1000;

const TRANSPORT_WORDS: Record<TransportName, string> = {
  broadcastchannel: 'BroadcastChannel',
  postmessage: 'postMessage',
  storage: 'storage events',
};

const TIMER_WORDS: Record<TimerPhase, string> = { idle: 'Ready', running: 'Running', paused: 'Paused', done: 'Time is up' };

const NOTES: Record<'connecting' | 'one-way' | 'two-way' | 'manual', string> = {
  connecting: 'Waiting for the presentation to answer. The controls stay off until it does, or until the search ends.',
  'one-way': 'The presentation moves this script. The controls stay off while it is in charge.',
  'two-way': 'The controls ask the presentation to move, and this script follows when it does.',
  manual: 'The presentation is not moving this script. Previous and Next move it on their own.',
};

const NO_SCRIPT = 'There is no speaker script for this segment.';

/** The time as the segment timer shows it: whole minutes and two-digit seconds, a second that has begun counted as left. */
function clock(ms: number): string {
  const seconds = Math.ceil(Math.max(0, ms) / SECOND);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** What is left of the segment's time on a timer, at `now`: a running timer has been counting since `startedAt`, the others are where they stopped. */
function remaining(timer: SyncTimer, totalMs: number, now: number): number {
  const running = timer.state === 'running' && timer.startedAt !== null ? Math.max(0, now - timer.startedAt) : 0;
  return Math.max(0, totalMs - Math.min(totalMs, timer.elapsedMs + running));
}

/** What the presentation last said of the segment it is on. */
interface Reported {
  readonly segmentId: string;
  readonly revealedSteps: number;
  readonly timer: SyncTimer | null;
}

/**
 * Builds the surface in `main` and starts the synchronization. Null, having touched nothing, on a page with no `main`.
 * The first render is the first segment, connecting: nothing is shown as the presentation's until the presentation has said it.
 */
export function mountSpeaker(options: MountSpeakerOptions): Speaker | null {
  const { document: doc, window: win, store, segments, announce, config } = options;
  const main = doc.getElementById('main');
  if (main === null || segments.length === 0) return null;
  const ids = segments.map((segment) => segment.id);

  // -- the page

  const make = (tag: string, attributes: Record<string, string> = {}, text?: string): SpeakerElement => {
    const element = doc.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const title = make('h1', { id: 'speaker-title' });
  const position = make('p', { id: 'speaker-position' });
  const status = make('p', { id: 'speaker-sync-status' }); // plain text: the one status region of the page is #live-region
  const timerLine = make('p', { id: 'speaker-timer', role: 'timer', 'aria-label': 'Segment timer' });
  const reveal = make('p', { id: 'speaker-reveal' });
  const previous = make('button', { id: 'speaker-prev', type: 'button' }, 'Previous segment');
  const next = make('button', { id: 'speaker-next', type: 'button' }, 'Next segment');
  const note = make('p', { id: 'speaker-controls-note' });
  const controls = make('div', { role: 'group', 'aria-label': 'Move through the script' });
  controls.append(previous, next, note);
  const body = make('div', { id: 'speaker-body' });
  const section = make('section', { id: 'speaker-script', 'data-surface': 'script', 'aria-labelledby': 'speaker-title' });
  section.append(title, position, status, timerLine, reveal, controls, body);
  main.replaceChildren(section);

  // -- what it shows

  let phase: SyncStateName = 'connecting';
  let via: TransportName | null = null;
  let reported: Reported | null = null;
  let shown = -1; // the index whose script is in the page
  let ticker: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const indexNow = (): number => Math.max(0, ids.indexOf(store.get().currentId));
  /** What the presentation said, if it is following and the segment on show is the one it said it of. */
  const known = (): Reported | null => (phase === 'synchronized' && reported !== null && reported.segmentId === ids[indexNow()] ? reported : null);

  function stopTicker(): void {
    if (ticker !== undefined) clearTimeout(ticker);
    ticker = undefined;
  }

  /** The timer line, and the one timeout that redraws it when the second it shows is over: only while the timer is running and has time left. */
  function drawTimer(): void {
    stopTicker();
    const timer = known()?.timer ?? null;
    section.setAttribute('data-timer-state', timer?.state ?? 'none');
    if (timer === null) {
      timerLine.textContent = phase === 'synchronized' ? 'No timer on this segment.' : 'Timer not available without the presentation.';
      return;
    }
    const segment = segments[indexNow()];
    const total = Math.max(0, Number(segment.minutes) || 0) * 60 * SECOND;
    const left = remaining(timer, total, Date.now());
    timerLine.textContent = timer.state === 'done' ? TIMER_WORDS.done : `${TIMER_WORDS[timer.state]}, ${clock(left)} left`;
    if (timer.state !== 'running' || left <= 0 || disposed) return;
    // The shown second changes when the time left falls to a whole second below the one it shows, so that is when to look again.
    const wait = left - (Math.ceil(left / SECOND) - 1) * SECOND;
    ticker = setTimeout(() => {
      ticker = undefined;
      if (!disposed) drawTimer();
    }, wait);
  }

  function drawControls(index: number): void {
    const manual = phase === 'not-synchronized';
    const asking = phase === 'synchronized' && config.twoWay;
    previous.disabled = !(manual || asking) || index <= 0;
    next.disabled = !(manual || asking) || index >= ids.length - 1;
    note.textContent = NOTES[manual ? 'manual' : asking ? 'two-way' : phase === 'synchronized' ? 'one-way' : 'connecting'];
  }

  function drawStatus(): void {
    status.textContent =
      phase === 'connecting'
        ? 'Connecting to the presentation…'
        : phase === 'synchronized'
          ? `Synchronized with the presentation, over ${TRANSPORT_WORDS[via ?? 'broadcastchannel']}.`
          : 'Not synchronized with the presentation.';
  }

  function drawSegment(index: number): void {
    const segment = segments[index];
    const name = segment.title === '' ? segment.id : segment.title;
    title.textContent = name; // front matter is untrusted: text, never HTML
    position.textContent = `Segment ${index + 1} of ${ids.length}`;
    const script = segment.scriptHtml ?? '';
    if (script.trim() === '') body.replaceChildren(make('p', {}, NO_SCRIPT));
    else body.innerHTML = script; // sanitized by the SPA-02 pipeline at build time, as the slides are
    doc.title = `Speaker script — ${name} — Teaching SPA`;
  }

  /** Draws everything the state says. Whether the segment on show changed is the answer, so that its script is set only when it does. */
  function render(): boolean {
    const index = indexNow();
    const moved = index !== shown;
    if (moved) drawSegment(index);
    shown = index;
    const now = known();
    section.setAttribute('data-segment-index', String(index));
    section.setAttribute('data-segment-id', ids[index]);
    section.setAttribute('data-sync-state', phase);
    section.setAttribute('data-sync-transport', via ?? 'none');
    section.setAttribute('data-revealed-steps', String(now?.revealedSteps ?? 0));
    drawStatus();
    reveal.textContent = now === null ? 'Revealed steps: not available without the presentation.' : `Revealed steps: ${now.revealedSteps}`;
    drawTimer();
    drawControls(index);
    return moved;
  }

  render();

  // Whoever moves the segment, the script is redrawn in the same turn (AC9 gives it 500 ms and uses none), starts at its top, and is
  // announced as a move of the presentation is.
  const unsubscribe = store.subscribe(() => {
    if (disposed || !render()) return;
    if (typeof win.scrollTo === 'function') win.scrollTo(0, 0);
    const segment = segments[shown];
    announce(`Segment ${shown + 1} of ${ids.length}: ${segment.title === '' ? segment.id : segment.title}`);
  });

  /** The presentation's state: its reveal and its timer first, so that the segment it moves to is drawn with its own. */
  function follow(state: SyncState): void {
    if (disposed) return;
    reported = { segmentId: state.segmentId, revealedSteps: state.revealedSteps, timer: state.timer };
    if (store.get().currentId === state.segmentId) render();
    else store.navigate(state.segmentId); // the subscriber draws it
  }

  const sync = createSpeakerSync({
    window: win,
    config,
    segmentIds: ids,
    onStatus: (next) => {
      if (disposed) return;
      const before = phase;
      phase = next.state;
      via = next.transport;
      if (phase !== 'synchronized') reported = null; // what the presentation last said is no longer known to be true
      render();
      if (phase === before) return;
      if (phase === 'synchronized') announce('Synchronized with the presentation.', { keep: true });
      else if (phase === 'not-synchronized') announce('Not synchronized with the presentation. Previous and Next move the script on their own.', { keep: true });
    },
    onState: follow,
  });

  const step = (offset: -1 | 1) => (): void => {
    if (disposed) return;
    const target = ids[indexNow() + offset];
    if (target === undefined) return;
    // A request goes to the presentation that owns the window now. If it turns out there is none (it left since the last look), the
    // speaker has just said so, and the click moves the script by itself, as it would have in the state it is in now (AC10).
    if (phase === 'synchronized' && config.twoWay && sync.navigate(target)) return; // the surface moves when the presentation does
    if (sync.status.state === 'not-synchronized') store.navigate(target); // the actual segment moves, and the script with it (AC10)
  };
  const onPrevious = step(-1);
  const onNext = step(1);
  previous.addEventListener('click', onPrevious);
  next.addEventListener('click', onNext);

  sync.start();

  return {
    element: section,
    sync,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      stopTicker();
      sync.dispose();
      previous.removeEventListener('click', onPrevious);
      next.removeEventListener('click', onNext);
    },
  };
}
