// A segment timer (specs/005-teaching-spa.md 2.4, F104, F108): the minutes of the segment, counted down by hand. Nothing in it
// starts by itself, so the count is off until Start is pressed (SC 2.2.2), and Pause and Stop are there for as long as it runs
// (F108). It never moves to another segment: it says the time is up and leaves what comes next to the presenter. The state is
// kept in the store as three small facts, which is also what the presenter sync will carry (2.7), and the time that went by
// while the segment was away is found from the wall clock when it is back (2.3).

import { create, hasModifier } from './dom';
import { isRecord, readParameter, writeParameter } from './persist';
import type { Mounter } from './types';

// The shell has no stylesheet yet (see dialog.ts), so the presentation travels with the elements. The timer sits in the page,
// not over it, so it cannot hide the item that has the focus (2.4.11), and its buttons are at least 24 by 24 CSS pixels (2.5.8).
const BOX = 'margin:1rem 0;padding:0.75rem 1rem;border:1px solid CanvasText;display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem;';
const CLOCK = 'font-size:1.5rem;font-variant-numeric:tabular-nums;';
const BUTTON = 'min-width:24px;min-height:24px;';

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
    { id: entry.id, role: 'group', 'aria-label': entry.label, style: BOX },
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
  const lead = root.firstElementChild;
  if (lead !== null && lead.localName === 'h1') lead.after(widget);
  else root.prepend(widget);

  const now = Date.now();
  let { phase, elapsed } = restore(readParameter(store, segment.id, entry.id), total, now);
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
  /** Keeps the state in the store, on a change of state and never on a tick, where only the time moves. */
  const save = (): void => {
    writeParameter(store, segment.id, entry.id, { state: phase, elapsedMs: elapsed, startedAt: phase === 'running' ? last : null });
  };
  /**
   * Brings the count up to the wall clock, by the time since it was last brought up. A clock set back adds nothing, so a count
   * never runs backwards, and never stands still for the hour the clock went back.
   * ghcp-was-here: while the timer is on the page that is all the clock does to it, but the start in the store is read against
   * the wall clock when the segment is visited again, so a clock set back while the segment is away counts as no time passed.
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
    let reached = 0;
    for (; mark < MARKS.length && left() <= MARKS[mark]; mark += 1) reached = MARKS[mark];
    if (reached > 0) announce(`${words(reached)} left.`);
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
  return { dispose: stopTicking };
};
