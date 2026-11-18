// A segment timer (specs/005-teaching-spa.md 2.4, F104, F108): the minutes of the segment, counted down by hand. Nothing in it
// starts by itself, so the count is off until Start is pressed (SC 2.2.2), and Pause and Stop are there for as long as it runs
// (F108). It never moves to another segment: it says the time is up and leaves what comes next to the presenter. The state is
// kept in the store as three small facts, which is also what the presenter sync will carry (2.7), and the time that went by
// while the segment was away is found from the wall clock when it is back (2.3).

import { create, hasModifier } from './dom';
import { isRecord, readParameter, writeParameter } from './persist';
import type { Mounter } from './types';

// The stylesheet (styles.css) draws the timer's box and the clock's type; the layout of the row travels with the elements. The timer sits in the page,
// not over it, so it cannot hide the item that has the focus (2.4.11), and its buttons are at least 24 by 24 CSS pixels (2.5.8).
const BOX = 'display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem;';
const CLOCK = 'font-variant-numeric:tabular-nums;';
const BUTTON = 'min-width:24px;min-height:24px;';
// The long description takes a row of its own under the clock and the buttons.
const NOTE = 'flex-basis:100%;margin:0;';

type Phase = 'idle' | 'running' | 'paused' | 'done';
type Count = { readonly phase: Phase; readonly elapsed: number };

const CAPTIONS: Readonly<Record<Phase, string>> = { idle: 'Ready', running: 'Running', paused: 'Paused', done: 'Time is up' };

/** The times left at which a running count says so, once each, longest first. */
const MARKS: readonly number[] = [300_000, 60_000];

const unit = (count: number, name: string): string => (count === 0 ? '' : `${count} ${name}${count === 1 ? '' : 's'}`);

/** The time as a clock shows it: whole minutes and two-digit seconds, a second that has begun counted as left. */
function clock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The time as it is said, which a listener hears and does not see: minutes and seconds in words. */
function words(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return [unit(Math.floor(seconds / 60), 'minute'), unit(seconds % 60, 'second')].filter((part) => part !== '').join(' ');
}

/** The long description (F109): what is counted, what each control does and what is said, from the minutes of the segment and the marks above. */
function describe(minutes: number): string {
  return [
    `Counts down the ${minutes} minutes of this segment, and only after Start is pressed.`,
    'Start counts down from the whole time, or goes on from where Pause left it. Pause keeps the time that is left.',
    'Stop goes back to the whole time with nothing counting. Reset goes back to it, counting or paused as it was.',
    `The time left is said when the state changes, and when ${MARKS.map(words).join(' and ')} are left.`,
    'At the end it says so and stops, and it never moves to another segment.',
  ].join(' ');
}

/** The count as the store holds it, or a count that has not started when the store holds anything else (2.3). */
function restore(value: unknown, total: number, now: number): Count {
  const idle: Count = { phase: 'idle', elapsed: 0 };
  if (!isRecord(value)) return idle;
  const { state, elapsedMs, startedAt } = value;
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0) return idle;
  let elapsed = elapsedMs;
  if (state === 'running') {
    if (typeof startedAt !== 'number' || !Number.isFinite(startedAt)) return idle;
    elapsed += Math.max(0, now - startedAt); // a start in the future is a clock that was set back: the count goes on from now
  } else if (state !== 'paused' && state !== 'done') {
    return idle;
  }
  return state === 'done' || elapsed >= total ? { phase: 'done', elapsed: total } : { phase: state, elapsed };
}

export const mountSegmentTimer: Mounter = ({ entry, segment, root, document: doc, store, announce }) => {
  const total = segment.minutes * 60_000;
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error(`segment-timer ${entry.id}: segment ${segment.id} has no minutes to pace`);
  }

  // The clock is a timer, which a screen reader does not read out as it changes, and it is not a live region either: what is
  // said is said through the status region of the shell, when the state changes (F104).
  const readout = create(doc, 'span', { role: 'timer', 'aria-label': 'Time remaining', style: CLOCK });
  const status = create(doc, 'span');
  const [start, pause, stop, reset] = ['Start', 'Pause', 'Stop', 'Reset'].map((name) =>
    create(doc, 'button', { type: 'button', style: BUTTON }, name),
  );
  const widget = create(
    doc,
    'div',
    { id: entry.id, role: 'group', 'aria-label': entry.label, 'aria-describedby': entry.longDescriptionId, style: BOX },
    readout,
    ' ',
    status,
    ' ',
    start,
    ' ',
    pause,
    ' ',
    stop,
    ' ',
    reset,
  );
  // Text in the group, not a control: the group is described by it (F109), and Tab still visits the four buttons and nothing else.
  if (entry.longDescriptionId !== undefined) widget.append(create(doc, 'p', { id: entry.longDescriptionId, style: NOTE }, describe(segment.minutes)));
  const lead = root.firstElementChild;
  if (lead !== null && lead.localName === 'h1') lead.after(widget);
  else root.prepend(widget);

  const now = Date.now();
  const kept = readParameter(store, segment.id, entry.id);
  let { phase, elapsed } = restore(kept, total, now);
  let last = now; // when `elapsed` was last brought up to the wall clock
  let mark = 0; // which of MARKS is the next to be said
  let ticker: ReturnType<typeof setInterval> | undefined;

  const left = (): number => total - elapsed;
  const put = (node: HTMLElement, text: string): void => {
    if (node.textContent !== text) node.textContent = text;
  };
  const render = (): void => {
    put(readout, clock(left()));
    put(status, CAPTIONS[phase]);
  };
  /** Keeps the state in the store, on a change of state and when the segment is left, and never on a tick, where only the time moves. */
  const save = (): void => {
    writeParameter(store, segment.id, entry.id, { state: phase, elapsedMs: elapsed, startedAt: phase === 'running' ? last : null });
  };
  /**
   * Brings the count up to the wall clock, by the time since it was last brought up. A clock set back adds nothing, so a count
   * never runs backwards, and never stands still for the hour the clock went back.
   * ghcp-was-here: a clock set back while the segment is away is read against the start that was kept when the segment was left,
   * so it counts as no time passed: what was counted is never given back, but the time the clock hid cannot be known.
   */
  const catchUp = (): void => {
    const at = Date.now();
    elapsed = Math.min(total, elapsed + Math.max(0, at - last));
    last = at;
  };
  /** The marks still to come: the ones the time left has not reached, so one that is already past is not said when the count goes on. */
  const resetMarks = (): void => {
    const next = MARKS.findIndex((time) => left() > time);
    mark = next < 0 ? MARKS.length : next;
  };
  const say = (verb: string): void => announce(`${verb}. ${words(left())} left.`);

  const stopTicking = (): void => {
    if (ticker !== undefined) clearInterval(ticker);
    ticker = undefined;
  };
  /** The time is up: said once, and the count stops. Nothing else moves: what comes next is for the presenter to decide. */
  const finish = (): void => {
    stopTicking();
    phase = 'done';
    elapsed = total;
    render();
    save();
    announce(`${CAPTIONS.done}.`);
  };
  // ghcp-was-here: the count is made from the wall clock, not from the ticks, so a tab in the background, where the interval
  // is slowed down, is right again at its next tick, but its figure and its five and one minute marks are late until then.
  // Upgrade path: catch up on visibilitychange, once a pattern may keep a listener on the document.
  const tick = (): void => {
    catchUp();
    if (left() <= 0) {
      finish();
      return;
    }
    render();
    const before = mark;
    while (mark < MARKS.length && left() <= MARKS[mark]) mark += 1;
    // The time that is left is what is said, the one the clock shows: it is the mark itself when the tick was on time, and not
    // the mark that a late tick, after a sleep or in a tab in the background, has already gone past.
    if (mark > before) announce(`${words(left())} left.`);
  };
  const startTicking = (): void => {
    stopTicking();
    ticker = setInterval(tick, 1000);
  };

  /** Start: counts from the whole time, or goes on from where Pause left it. Nothing happens while it is counting. */
  const begin = (): void => {
    if (phase === 'running') return;
    if (phase === 'done') elapsed = 0;
    phase = 'running';
    last = Date.now();
    resetMarks();
    startTicking();
    render();
    save();
    say('Started');
  };
  /** Pause: keeps the time that is left. */
  const hold = (): void => {
    if (phase !== 'running') return;
    catchUp();
    if (left() <= 0) {
      finish();
      return;
    }
    stopTicking();
    phase = 'paused';
    render();
    save();
    say('Paused');
  };
  /** Stop: back to the whole time, with nothing counting. */
  const halt = (): void => {
    if (phase === 'idle') return;
    stopTicking();
    phase = 'idle';
    elapsed = 0;
    render();
    save();
    say('Stopped');
  };
  /** Reset: back to the whole time, and counting if it was counting, paused if it was paused. */
  const restart = (): void => {
    if (phase === 'idle') return;
    elapsed = 0;
    last = Date.now();
    if (phase === 'done') phase = 'idle';
    if (phase === 'running') {
      resetMarks();
      startTicking(); // a second from now, not from the tick that was due, so the figure does not lag
    }
    render();
    save();
    say('Reset');
  };

  start.addEventListener('click', begin);
  pause.addEventListener('click', hold);
  stop.addEventListener('click', halt);
  reset.addEventListener('click', restart);
  // Escape pauses, from anywhere in the timer, the way it closes a popover: the way out of something that is going on.
  widget.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || hasModifier(event) || phase !== 'running') return;
    event.preventDefault();
    hold();
  });

  render();
  resetMarks();
  if (phase === 'running') startTicking();
  // The wall clock can carry a count to its end while the segment is away, and then the store still says what it said when the
  // segment was left: running, or paused with no time left. The store is what the presenter sync carries (2.7), so it is told what the
  // page shows, as finish() tells it when the time runs out in front of the reader, and a speaker is never shown a count that is
  // still running where the page says the time is up. It is told and nothing is said: the way back is what is announced, not the time.
  if (phase === 'done' && !(isRecord(kept) && kept.state === 'done')) save();
  return {
    // For when the browser has spent the Escape: pauses, as the key does, and only when the focus is in the timer, because the key
    // only reaches the timer from there. A timer that is not running has nothing to put away.
    dismiss(): void {
      if (widget.contains(doc.activeElement)) hold();
    },
    dispose(): void {
      stopTicking();
      if (phase !== 'running') return;
      // The store holds the start the count began from, and a clock that was set back since then puts that start in the future,
      // so the next visit would count less than this page has. What has been counted is kept as it stands, against the clock now.
      catchUp();
      save();
    },
  };
};
