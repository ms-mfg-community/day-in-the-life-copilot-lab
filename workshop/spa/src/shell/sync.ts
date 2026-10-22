// Keeping the speaker script in step with the presentation (specs/005-teaching-spa.md 2.7, AC9, AC10).
//
// Two windows of one origin, the presentation (the opener) and the speaker script (the window it opened, `#/script`), say what
// the presentation shows to one another over the first of three transports that answers, probed in this order:
//
//   1. BroadcastChannel  needs no handle on the other window, and reaches the same origin only; an opaque origin reaches nobody.
//   2. postMessage       between the opener and the opened window, whose handles are kept (no `noopener`, F45-F47). The target
//                        origin is the page's own; "*" is for `window.origin === "null"` alone, an opaque origin (C2), and a
//                        receiver acts only on a message whose `event.source` is the window it holds.
//   3. localStorage      a `storage` event reaches the OTHER windows of the origin and never the writer (F33, F34); every access
//                        is guarded, because an opaque origin throws a SecurityError from the getter itself.
//
// A transport is not taken for working because it opened: the speaker says hello over it, once, and waits `timeoutMs` for an ack
// that carries the session of that hello. Only then is it synchronized. Without an ack from any of the three, the speaker is
// `not-synchronized` (AC10), which is a state of its own and not a failure of the page: the surface shows it and has its own
// navigation. The presenter is the one that holds the state; the speaker follows it, one way, unless two-way was asked for.
//
// Pairing. BroadcastChannel and `storage` reach every window of the origin, so a second presentation that is open (a rehearsal tab,
// an older one) hears every hello as well as the one that opened the script window, and would answer it. A presentation puts its
// name on its own window (`PRESENTER_KEY`); the script window reads it through `window.opener`, which a browser allows between
// windows of one origin and refuses in any other case, and says whom its hello is for (`to`). A presentation answers a hello that
// names it or names no one, and nothing else; the speaker takes the ack of the presentation it named, and of no other. What it asks
// the presentation to do (`navigate`) names that presentation in the same way, so one that answered it for want of a name is not moved.
//
// What goes over a transport is presentation state and nothing else (a segment, a reveal count, the timer), in envelopes of
// `{ app, v, type, from, ... }`. Every number that orders them is a counter that only goes up: a state is applied only if its
// counter is greater than the last one applied, so a stale or a duplicate one does nothing. Everything that arrives is
// validated; nothing that arrives is trusted to have the shape it should.
//
// Failures can be forced, one transport at a time or all of them (`sync-fail=broadcastchannel,postmessage,storage|all` in the
// URL, `fail` in the options), and the timeout set (`sync-timeout=<ms>`), so that every path is one a test can walk. The script
// window is opened with a URL that is only a fragment, which resolves against the page that opens it, so it inherits the query
// string of the presentation and the URL reaches both windows.
//
// Who owns the script window, and for how long. The script window is opened with a name (`teaching-spa-script`) and so is reused by it,
// and the presentation that opened it first is not the one that has it for good: a second presentation that opens it takes it and the
// browser makes that presentation its `window.opener`; a presentation that is reloaded is a new one on the same window; one that is closed
// has nothing left to follow. So the pairing is not made once, at the handshake. It is kept true, six ways:
//
//   claim    A presentation that is handed a script window that is already running (it reads `SPEAKER_KEY` through the handle) says so, with
//            its state, on each transport that is not forced to fail. Who sent a claim is known over postMessage alone, so that is the one
//            that is believed: the script window takes it only from the window that is its opener NOW (`event.source` and the origin), only
//            while it is paired, and only if that window is what the claim says (where the name on it can be read it is the claimant's; a
//            window that can be read and carries none is no owner; where it cannot be read, an opaque origin, the sender is the whole of
//            the proof). It follows that presentation from then on, forgets the counters of the one before and says hello to the new one,
//            which is what makes it answer and publish. It never leaves `synchronized` for it. Over BroadcastChannel and `storage`, where any
//            window of the origin can write and none is known to have, a claim is believed in nothing it says and none of its numbers is
//            kept: it is a hint to look at who owns this window, and if that is the presentation it names, the window is handed over to it,
//            by hello, and shows what that presentation says to the hello, and never what the claim said.
//   bye      A presentation that is closed or reloaded (`pagehide` of a page that is not kept for later) says goodbye on the transports it
//            was answered on, and the script window that follows it becomes `not-synchronized` at once. A goodbye from any other presentation
//            than the one that is followed does nothing, and neither does a state of one. It is best effort: in an opaque origin a message
//            that a page posts as it unloads reaches the other window with no `source` (Chromium), so it cannot be told from the message
//            of any window and is not acted on, and there it is the question (see `liveness`) that finds the presentation gone.
//   watch    While paired, and with an opener it can look at, the script window looks at it every `WATCH_MS`: is it still there, not closed,
//            the same window, and does it still carry the name of the presentation that is followed. That reads properties and sends
//            nothing, so a presentation that is only idle is never given up on, and one that is closed without a word, reloaded in place
//            without one, or replaced by another is found anyway: gone (closed, or a window that no presentation names) is `not-synchronized`,
//            another presentation is a new handshake (the 500 ms of AC9). A request to move (two-way) looks first, so that it is never made
//            of a presentation that has lost the window.
//   liveness Where the opener cannot be looked at (one opened by hand has none; one in an opaque origin cannot be read) there is no watch, so
//            the script window asks. A presentation it follows that has said nothing for `LIVENESS_MS` is asked, by name and on the transport
//            it answered on, whether it is there, and one that does not say so within the timeout of the handshake is gone: `not-synchronized`.
//            Whatever the presentation says (a state, a claim, the answer) starts the wait again, so one that is being used is never asked
//            and an idle one costs a small message a second and is never given up on. Only the presentation that is followed answers, for the
//            session of this hello, so one that was reloaded in place (a new one, with no memory of the hello) is the one that does not.
//   recover  A script window that is not synchronized, for a reason that can pass (nobody answered; a presentation went away), looks again,
//            silently, until it is: when its opener is another window or carries another name, and from time to time otherwise (`RETRY_MS`,
//            doubling to `MAX_RETRY_MS`). Only the transports that are not forced to fail are tried, and where all are forced there is no timer.
//            Where presentations name themselves, a hello always names one: a window with no name (a page that is loading) is waited on, and
//            a hello that names no one is never sent to be answered by whatever presentation of the origin happens to hear it.
//   adopt    A presentation that was reloaded in place was never handed the script window it opened, and cannot answer over postMessage
//            without a handle to it. The hello of a window that proves, through its own opener (the name is on this window), that THIS
//            presentation opened it gives it that window, once, from the origin of the page and no other. A presentation that was handed a
//            window, or told there is none (`setPopup`), adopts none, and neither does one whose origin is opaque, where no name can be read.
//
// Known limits: a script window whose opener cannot be read has no one to name when it says hello, and takes the first presentation that
// answers it, asking that one alone to move. In an opaque origin it still learns that the window was handed to another presentation, from a
// claim over postMessage, whose sender it knows. One opened by hand has no opener, so no presentation can claim it: it follows the one it
// found until that one says goodbye or does not answer the question (`liveness`), and then the next that answers. With no watch, and no
// goodbye that can be attributed (an opaque origin), a presentation that is reloaded or crashes is found in about `LIVENESS_MS` plus the
// timeout (two seconds by default, and not the 500 ms of a window that can be looked at), and from then on the window says it is not
// synchronized and has its own navigation. BroadcastChannel and `storage` carry no sender, so a window of the origin that knows the name
// of the presentation that is followed can still put a state, a goodbye or an answer on them; what is hardened is who may take the window
// (see `nudge`). In an opaque origin a reloaded presentation reaches the script window by opening it again.

import type { ShellState } from './state';

export type TransportName = 'broadcastchannel' | 'postmessage' | 'storage';
export const TRANSPORTS: readonly TransportName[] = ['broadcastchannel', 'postmessage', 'storage'];
export const DEFAULT_TIMEOUT_MS = 1000;
export const MAX_TIMEOUT_MS = 30_000;
export const PROTOCOL = 'teaching-spa-sync';
export const VERSION = 1;
export const CHANNEL_NAME = 'teaching-spa-sync';
export const STORAGE_KEYS = { toSpeaker: 'teaching-spa-sync:to-speaker', toPresenter: 'teaching-spa-sync:to-presenter' } as const;
/**
 * The property of its own window under which a presenter says who it is (the `presenterId` of its messages). A script window reads it
 * through `window.opener` to learn which presentation opened it. Only a window of the same origin can be read through a handle, which
 * is the window that is meant; from any other the read throws, and is taken as not knowing.
 */
export const PRESENTER_KEY = 'teachingSpaSyncPresenter';
/**
 * The property of its own window under which a script window says that one is running on it, for the presentation that is handed the window
 * (the claim). Through the handle it reads three ways: there (a script is running there, which has to be told who owns it now), not there
 * (a window that is still opening, which will say hello itself) and unreadable (another origin, an opaque one: it is told over postMessage
 * alone, which checks who sent it).
 */
export const SPEAKER_KEY = 'teachingSpaSyncSpeaker';
/** How often a script window that has a presentation to look at looks at it, in milliseconds: well inside the 500 ms that AC9 allows. */
export const WATCH_MS = 100;
/**
 * How long a script window that follows a presentation it cannot look at (nothing readable on the window that opened it: an opaque origin,
 * or no opener at all) waits after it last heard from it, before it asks that presentation whether it is still there. The wait for the
 * answer is the timeout of the handshake. Slow enough that an idle presentation costs one small message a second, and not a flap: an
 * idle presentation answers at once, and one that does not is given up on only after the timeout.
 */
export const LIVENESS_MS = 1000;
/** How long a script window that is not synchronized waits before it asks again, and the longest it ever waits (it doubles in between). */
export const RETRY_MS = 2000;
export const MAX_RETRY_MS = 30_000;
/** What reading the marker of a script window says when the platform refuses the read, as it does across origins. */
const UNREADABLE = Symbol('unreadable');
/** What reading the name on a window says when the read is allowed and the window carries none: a page that is loading, or no presentation. */
const ABSENT = Symbol('absent');

/** The most steps of a reveal a state may claim: far past any slide, so a number made up to be large is refused. */
const MAX_REVEALED = 1000;
/** The longest name (of a presenter, a session, a timer) that is taken. */
const MAX_NAME = 200;
/** The speakers one presenter keeps count of, per transport: a window that says hello over and over does not grow it. */
const MAX_SESSIONS = 16;

export interface SyncConfig {
  readonly timeoutMs: number;
  readonly fail: ReadonlySet<TransportName>;
  readonly twoWay: boolean;
}

export interface SyncOptions {
  readonly timeoutMs?: number;
  readonly fail?: readonly TransportName[] | 'all';
  readonly twoWay?: boolean;
}

export type TimerPhase = 'idle' | 'running' | 'paused' | 'done';
const PHASES: readonly string[] = ['idle', 'running', 'paused', 'done'];

export interface SyncTimer {
  readonly id: string;
  readonly state: TimerPhase;
  readonly elapsedMs: number;
  readonly startedAt: number | null;
}

export interface SyncState {
  readonly segmentIndex: number;
  readonly segmentId: string;
  readonly revealedSteps: number;
  readonly timer: SyncTimer | null;
}

export type AttemptOutcome = 'synchronized' | 'timeout' | 'unavailable' | 'forced-failure' | 'send-failed';

export interface Attempt {
  readonly transport: TransportName;
  readonly outcome: AttemptOutcome;
}

export type SyncStateName = 'connecting' | 'synchronized' | 'not-synchronized';

export interface SyncStatus {
  readonly state: SyncStateName;
  readonly transport: TransportName | null;
  readonly attempts: readonly Attempt[];
}

/** What the core needs of a window: the DOM lib is not in this project's TypeScript, and a test hands over a window of its own. */
export interface SyncWindow {
  readonly origin?: string;
  readonly location?: { readonly origin?: string };
  readonly opener?: unknown;
  readonly BroadcastChannel?: new (name: string) => unknown;
  readonly localStorage?: unknown;
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
}

// -- small things ---------------------------------------------------------------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isSeq = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const isName = (value: unknown): value is string => typeof value === 'string' && value !== '' && value.length <= MAX_NAME;

/** Reads what the platform may refuse to give (a getter that throws a SecurityError, a dead proxy) and says `fallback` if it does. */
function safe<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/** Names a presenter or a session on the wire. It only has to differ from the others': nothing rests on it being unguessable. */
function randomId(): string {
  const api = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const uuid = safe(() => (typeof api?.randomUUID === 'function' ? api.randomUUID() : undefined), undefined);
  return uuid ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// -- configuration --------------------------------------------------------------------------------------------------------

function readTimeout(raw: string | null): number | undefined {
  if (raw === null || !/^\d+$/.test(raw)) return undefined; // a whole number of milliseconds, and nothing else
  const ms = Number(raw);
  return ms > 0 ? Math.min(ms, MAX_TIMEOUT_MS) : undefined;
}

/**
 * The configuration of a window: what the URL says (`?sync-fail=`, `?sync-timeout=`, `?sync-two-way=`) and what the options say. What it
 * does not know it leaves at its default. The failure hooks of the two add up, the timeout of the options wins, and two-way is on
 * if either asks for it.
 */
export function parseSyncConfig(search?: string | null, options: SyncOptions = {}): SyncConfig {
  const params = new URLSearchParams(search ?? '');
  const fail = new Set<TransportName>();
  const forbid = (name: string): void => {
    if (name === 'all') for (const each of TRANSPORTS) fail.add(each);
    else if ((TRANSPORTS as readonly string[]).includes(name)) fail.add(name as TransportName);
  };
  for (const value of params.getAll('sync-fail')) value.split(',').forEach(forbid);
  if (options.fail === 'all') forbid('all');
  else for (const name of options.fail ?? []) forbid(name);

  let timeoutMs = readTimeout(params.get('sync-timeout')) ?? DEFAULT_TIMEOUT_MS;
  const asked = options.timeoutMs;
  if (typeof asked === 'number' && Number.isFinite(asked) && asked > 0) timeoutMs = Math.min(Math.max(1, Math.round(asked)), MAX_TIMEOUT_MS);

  const twoWayParam = params.get('sync-two-way');
  return { timeoutMs, fail, twoWay: options.twoWay === true || twoWayParam === '1' || twoWayParam === 'true' };
}

// -- the target origin of a postMessage -----------------------------------------------------------------------------------

/** An origin a postMessage can be aimed at: a scheme and a host, and no path. "null" and "file://" are not. */
const ORIGIN = /^[a-z][a-z0-9+.-]*:\/\/[^/?#\s]+$/i;

/**
 * Where the page posts to (F40-F42, C2). It is the origin of the page itself, so that the message goes to nobody else. `"*"` is for
 * `window.origin === "null"` alone, the serialization of an opaque origin, which no origin string can name. A blob: URL does not
 * make an origin opaque and does not change this, and neither does a `location.origin` that says "null". Where the page cannot
 * tell its origin, `"/"`: the same origin as the page, as a postMessage defaults to.
 */
export function targetOriginFor(win: SyncWindow): string {
  const own = safe(() => win.origin as unknown, undefined);
  if (own === 'null') return '*';
  if (typeof own === 'string' && ORIGIN.test(own)) return own;
  const located = safe(() => win.location?.origin as unknown, undefined);
  return typeof located === 'string' && ORIGIN.test(located) ? located : '/';
}

/** The origin a message from the other window must say it has: an opaque document says "null", whoever it is, which is why the source is checked as well. */
const peerOriginFor = (target: string): string | null => (target === '*' ? 'null' : target === '/' ? null : target);

// -- what goes over the wire ----------------------------------------------------------------------------------------------

type Envelope = Record<string, unknown>;

const envelope = (fields: Envelope): Envelope => ({ app: PROTOCOL, v: VERSION, ...fields });

function readEnvelope(data: unknown): Envelope | null {
  return isRecord(data) && data.app === PROTOCOL && data.v === VERSION ? data : null;
}

/** A timer as the segment timer keeps it in the store (segment-timer.ts), or the one of a segment that has a timer nobody has started. */
function readStoredTimer(id: string, value: unknown): SyncTimer {
  const idle: SyncTimer = { id, state: 'idle', elapsedMs: 0, startedAt: null };
  if (!isRecord(value)) return idle;
  const { state, elapsedMs, startedAt } = value;
  if (typeof state !== 'string' || !PHASES.includes(state) || !isTime(elapsedMs)) return idle;
  if (state === 'running') return isTime(startedAt) ? { id, state, elapsedMs, startedAt } : idle;
  return { id, state: state as TimerPhase, elapsedMs, startedAt: null };
}

/**
 * What the presentation shows, from the state of the shell: the segment, how much of it is revealed, and the timer of the segment, if
 * it has one. `timerIdOf` says which interaction is the timer of a segment. Null when there is no segment to show.
 */
export function snapshotFrom(state: ShellState, segmentIds: readonly string[], timerIdOf: (segmentId: string) => string | undefined): SyncState | null {
  const segmentId = state.currentId;
  const segmentIndex = typeof segmentId === 'string' ? segmentIds.indexOf(segmentId) : -1;
  if (segmentIndex < 0) return null;
  const record = Object.hasOwn(state.segments, segmentId) ? state.segments[segmentId] : undefined;
  const steps = record?.revealedSteps;
  const revealedSteps = typeof steps === 'number' && Number.isInteger(steps) ? Math.min(Math.max(steps, 0), MAX_REVEALED) : 0;
  const timerId = timerIdOf(segmentId);
  const timer = timerId === undefined || !isName(timerId) ? null : readStoredTimer(timerId, record?.parameters[timerId]);
  return { segmentIndex, segmentId, revealedSteps, timer };
}

/** A state that arrived, rebuilt from the fields it may have and no others; null for anything that is not a state of this deck. */
function readState(value: unknown, segmentIds: readonly string[]): SyncState | null {
  if (!isRecord(value)) return null;
  const { segmentId, segmentIndex, revealedSteps, timer } = value;
  if (typeof segmentId !== 'string') return null;
  const index = segmentIds.indexOf(segmentId);
  if (index < 0 || segmentIndex !== index) return null;
  if (typeof revealedSteps !== 'number' || !Number.isInteger(revealedSteps) || revealedSteps < 0 || revealedSteps > MAX_REVEALED) return null;
  if (timer === null) return { segmentIndex: index, segmentId, revealedSteps, timer: null };
  if (!isRecord(timer)) return null;
  const { id, state, elapsedMs, startedAt } = timer;
  if (!isName(id) || typeof state !== 'string' || !PHASES.includes(state) || !isTime(elapsedMs)) return null;
  if (startedAt !== null && !isTime(startedAt)) return null;
  return { segmentIndex: index, segmentId, revealedSteps, timer: { id, state: state as TimerPhase, elapsedMs, startedAt } };
}

function sameState(a: SyncState, b: SyncState): boolean {
  if (a.segmentId !== b.segmentId || a.segmentIndex !== b.segmentIndex || a.revealedSteps !== b.revealedSteps) return false;
  if (a.timer === null || b.timer === null) return a.timer === b.timer;
  return a.timer.id === b.timer.id && a.timer.state === b.timer.state && a.timer.elapsedMs === b.timer.elapsedMs && a.timer.startedAt === b.timer.startedAt;
}

// -- the three transports -------------------------------------------------------------------------------------------------

/** One way of talking to the other window. `close` lets go of everything it holds: its listeners, its channel and the key it wrote. */
interface Port {
  /** False when the message could not go out. Never throws. */
  send(message: Envelope): boolean;
  close(): void;
}

interface ChannelLike {
  postMessage(data: unknown): void;
  close(): void;
  addEventListener?(type: 'message', listener: (event: { data?: unknown }) => void): void;
  removeEventListener?(type: 'message', listener: (event: { data?: unknown }) => void): void;
  onmessage?: ((event: { data?: unknown }) => void) | null;
}

interface HandleLike {
  readonly closed?: boolean;
  postMessage(data: unknown, targetOrigin?: string): void;
}

interface StorageLike {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** `window.localStorage`, or null where it cannot be had. THE one place the getter is read: it throws a SecurityError in an opaque origin. */
function storageOf(win: SyncWindow): StorageLike | null {
  return safe(() => {
    const storage = win.localStorage as Partial<StorageLike> | null | undefined;
    return storage !== null && storage !== undefined && typeof storage.setItem === 'function' && typeof storage.removeItem === 'function' ? (storage as StorageLike) : null;
  }, null);
}

/** A window that can be posted to, as far as can be told now: a handle that is there, has not been closed and has the method. */
function usableHandle(handle: unknown): handle is HandleLike {
  return safe(() => typeof handle === 'object' && handle !== null && typeof (handle as HandleLike).postMessage === 'function' && (handle as HandleLike).closed !== true, false);
}

/**
 * The name the presentation on a window gave itself (`PRESENTER_KEY`), read through a handle to that window, or null. It is read when it
 * is needed, and not assumed: a window of another origin, an opaque one included, throws a SecurityError for anything but `postMessage`
 * and `closed`, a window that is gone says nothing, and a window with no presentation on it has no name. None of them is a failure; each
 * is a window that has no one to name.
 */
function presenterOn(handle: unknown): string | null {
  const name = markerOn(handle);
  return typeof name === 'string' ? name : null;
}

/**
 * The same read, told three ways that are three different things: the name; `ABSENT`, where the read is allowed and there is no name (a page
 * that is loading, a window that is no presentation, a presentation that has gone from it); and `UNREADABLE`, where the platform refuses
 * the read, as another origin or an opaque one does, which says nothing about who is there. A window that cannot be read is not a window
 * that has no name, and what follows from the one must not be taken from the other.
 */
function markerOn(handle: unknown): string | typeof ABSENT | typeof UNREADABLE {
  try {
    if (typeof handle !== 'object' || handle === null) return ABSENT;
    const name = (handle as Record<string, unknown>)[PRESENTER_KEY];
    return isName(name) ? name : ABSENT;
  } catch {
    return UNREADABLE;
  }
}

/** Who the window that opened this one says it is: see `presenterOn`. Read again each time, because what opened a window can change. */
function openerPresenter(win: SyncWindow): string | null {
  return presenterOn(safe(() => win.opener, null));
}

/** A BroadcastChannel, or null when there is none to be had: the engine lacks it, or says no to it. */
function openBroadcast(win: SyncWindow, onData: (data: unknown) => void): Port | null {
  const Channel = safe(() => win.BroadcastChannel, undefined);
  if (typeof Channel !== 'function') return null;
  let channel: ChannelLike;
  try {
    channel = new Channel(CHANNEL_NAME) as ChannelLike;
  } catch {
    return null;
  }
  if (typeof channel !== 'object' || channel === null) return null;
  if (typeof channel.postMessage !== 'function' || typeof channel.close !== 'function') return null;
  const listener = (event: { data?: unknown }): void => onData(event.data);
  if (typeof channel.addEventListener === 'function') channel.addEventListener('message', listener);
  else channel.onmessage = listener;
  return {
    send(message) {
      try {
        channel.postMessage(message);
        return true;
      } catch {
        return false;
      }
    },
    close() {
      try {
        if (typeof channel.removeEventListener === 'function') channel.removeEventListener('message', listener);
        else channel.onmessage = null;
        channel.close();
      } catch {
        // a channel that is already gone has nothing left to let go of
      }
    },
  };
}

/**
 * postMessage between two windows. `peer` is the window on the other end, read when it is needed and not before: the handle the
 * presenter keeps of its popup, or the opener of the speaker. A message is acted on only if its `event.source` IS that window,
 * and, where the origin of the document is known, only if it says that origin, so another window of the same origin, an
 * iframe or a script that posts to this one does not move anything (C2, F40-F42). `adopt`, which only a presenter that was never
 * given its popup passes, may take a message from another source for one from the window it should hold (see the presenter).
 */
function openMessages(
  win: SyncWindow,
  peer: () => unknown,
  peerOrigin: string | null,
  targetOrigin: string,
  onData: (data: unknown) => void,
  adopt?: (event: { data?: unknown; source?: unknown; origin?: unknown }) => boolean,
): Port {
  const listener = (event: { data?: unknown; source?: unknown; origin?: unknown }): void => {
    const handle = peer();
    if ((handle === null || handle === undefined || event.source !== handle) && adopt?.(event) !== true) return;
    if (peerOrigin !== null && event.origin !== peerOrigin) return;
    onData(event.data);
  };
  win.addEventListener('message', listener);
  return {
    send(message) {
      const handle = peer();
      if (!usableHandle(handle)) return false;
      try {
        handle.postMessage(message, targetOrigin);
        return true;
      } catch {
        return false; // a window that went away, or a message that could not be carried
      }
    },
    close() {
      win.removeEventListener('message', listener);
    },
  };
}

/**
 * localStorage as a message box: one key to write and one to listen to. A `storage` event reaches the other windows of the origin
 * and never the one that wrote, so a write is no answer to itself. Only the event is read (`newValue`), not the storage, so what
 * an earlier presenter left behind is not taken for a reply. Every access to the storage is guarded.
 */
function openStorage(win: SyncWindow, listenKey: string, writeKey: string, onData: (data: unknown) => void): Port {
  let wrote = false;
  const listener = (event: { key?: unknown; newValue?: unknown; storageArea?: unknown }): void => {
    if (event.key !== listenKey || typeof event.newValue !== 'string') return;
    if (event.storageArea !== undefined && event.storageArea !== null) {
      const own = storageOf(win);
      if (own !== null && event.storageArea !== own) return; // another storage area (sessionStorage) is not the message box
    }
    let data: unknown;
    try {
      data = JSON.parse(event.newValue);
    } catch {
      return;
    }
    onData(data);
  };
  win.addEventListener('storage', listener);
  return {
    send(message) {
      const storage = storageOf(win);
      if (storage === null) return false;
      try {
        storage.setItem(writeKey, JSON.stringify(message));
        wrote = true;
        return true;
      } catch {
        return false; // the quota, or a storage that says no
      }
    },
    close() {
      win.removeEventListener('storage', listener);
      if (!wrote) return;
      wrote = false;
      try {
        storageOf(win)?.removeItem(writeKey);
      } catch {
        // a key that cannot be removed is left, and is no answer to anyone: only events are read
      }
    },
  };
}

// -- the presenter --------------------------------------------------------------------------------------------------------

export interface PresenterSyncOptions {
  readonly window: SyncWindow;
  readonly config: SyncConfig;
  /** The state to send: read when a speaker says hello and whenever `publish()` is called. Null when there is none to send. */
  readonly snapshot: () => SyncState | null;
  readonly segmentIds: readonly string[];
  /** What a speaker's request to move is applied with. Called only when two-way navigation was asked for. */
  readonly navigate?: (segmentId: string) => void;
  /** Names this instance of the presenter on the wire. Default: a fresh random one. */
  readonly presenterId?: string;
}

export interface PresenterSync {
  /**
   * The window that was opened for the speaker script, as `window.open` returned it, or null when it was blocked. A script window that is
   * already running (one that was opened by another presentation, or by this one before it was reloaded) is told that this presentation
   * has it now: see "claim" above.
   */
  setPopup(handle: unknown): void;
  /** Tells every speaker that follows what the presentation shows now, if that changed. */
  publish(): void;
  /** The transports on which a speaker has been answered. */
  readonly active: readonly TransportName[];
  readonly targetOrigin: string;
  /** Says goodbye to the speakers that follow, then lets go of everything. */
  dispose(): void;
}

/**
 * The presentation's side. It listens on every transport that is not forced to fail, answers a hello on the transport it came by, and
 * after that sends the state, on each transport that has been answered, whenever `publish()` sees it change. It says nothing to a
 * window that has not said hello, except to a script window that is running and has just been handed to it (the claim), and it says
 * goodbye to the speakers it has answered when it goes.
 */
export function createPresenterSync(options: PresenterSyncOptions): PresenterSync {
  const { window: win, config, segmentIds } = options;
  const id = options.presenterId ?? randomId();
  const targetOrigin = targetOriginFor(win);
  const peerOrigin = peerOriginFor(targetOrigin);
  const ports = new Map<TransportName, Port>();
  /** For each transport, the sessions it has answered, with the counter of the last request to move that was applied for each. */
  const answered = new Map<TransportName, Map<string, number>>(TRANSPORTS.map((name) => [name, new Map<string, number>()]));
  let popup: unknown = null;
  /** Whether it was ever given a script window, or told there was none: a presentation that never was has not lost it, it never had it (adopt). */
  let told = false;
  let seq = 0;
  let last: SyncState | null = null;
  let disposed = false;

  /** Whether what a speaker said is for this presentation: it names it, or names no one, as a script window that nothing opened cannot. */
  const forMe = (message: Envelope): boolean => message.to === undefined || message.to === id;

  const sessionsOf = (name: TransportName): Map<string, number> => answered.get(name) ?? new Map<string, number>();
  const active = (): TransportName[] => TRANSPORTS.filter((name) => sessionsOf(name).size > 0);

  function current(): SyncState | null {
    try {
      return readState(options.snapshot(), segmentIds);
    } catch (error) {
      console.error('the state of the presentation could not be read for the speaker script', error);
      return null;
    }
  }

  function publish(): void {
    if (disposed) return;
    const following = active();
    if (following.length === 0) return;
    const state = current();
    if (state === null || (last !== null && sameState(last, state))) return;
    last = state;
    const message = envelope({ type: 'state', from: 'presenter', presenter: id, seq: (seq += 1), state });
    for (const name of following) ports.get(name)?.send(message);
  }

  /**
   * Tells a script window that is running, and was just handed to this presentation, that it is this one's now, with what it shows: the
   * window follows it without a handshake that it would have to wait for. A window that has no script on it yet is still opening, and its
   * hello is what pairs it. A window that cannot be read (another origin, an opaque one) is told over postMessage alone, because that is
   * the one transport on which the receiver can tell who sent it, and it is the receiver that decides.
   */
  function claim(): void {
    const handle = popup;
    if (ports.size === 0 || !usableHandle(handle)) return;
    const marker = safe<unknown>(() => Reflect.get(handle, SPEAKER_KEY), UNREADABLE);
    if (marker === undefined) return;
    const state = current();
    if (state === null) return;
    last = state;
    const message = envelope({ type: 'claim', from: 'presenter', presenter: id, seq: (seq += 1), state });
    for (const [name, port] of ports) {
      if (marker === UNREADABLE && name !== 'postmessage') continue;
      port.send(message);
    }
  }

  /**
   * A speaker that says, through its own opener, that this presentation opened it, is the window that this presentation should have had:
   * it takes it, once, if it was never given one. Origin and source are checked as for any message, and the origin must be a real one
   * (where it is opaque the name cannot be read, so nothing could be proved).
   */
  // ghcp-was-here: a deliberate, narrow exception to "act only on a message whose source is the window you hold" (F40-F42). Ceiling: a
  // presentation that was never handed the script window (it was reloaded in place, or its popup was blocked) takes the first window that
  // proves, by the name on its own opener, that this very presentation opened it, and says hello; once, and never where the origin is opaque
  // (the name cannot be read there, so nothing could be proved). Upgrade path: have presentation.ts tell its caller when the popup was
  // blocked, so that "handed no window" can be told from "never handed one" and the exception goes (a change to the onScriptWindow contract).
  function adopt(event: { data?: unknown; source?: unknown; origin?: unknown }): boolean {
    if (told || usableHandle(popup) || peerOrigin === null || peerOrigin === 'null' || event.origin !== peerOrigin) return false;
    const message = readEnvelope(event.data);
    if (message === null || message.from !== 'speaker' || message.type !== 'hello' || !forMe(message) || !usableHandle(event.source)) return false;
    if (presenterOn(safe(() => (event.source as { opener?: unknown }).opener, null)) !== id) return false;
    popup = event.source;
    return true;
  }

  function answer(name: TransportName, hello: Envelope): void {
    const session = hello.session;
    const port = ports.get(name);
    if (!isName(session) || port === undefined) return;
    publish(); // the speakers that already follow are brought up to date first, so none is behind the state this one starts from
    const state = current();
    if (state === null) return;
    last = state;
    if (!port.send(envelope({ type: 'ack', from: 'presenter', presenter: id, session, seq: (seq += 1), state }))) return;
    const sessions = sessionsOf(name);
    if (!sessions.has(session) && sessions.size >= MAX_SESSIONS) {
      const oldest = sessions.keys().next();
      if (oldest.done !== true) sessions.delete(oldest.value);
    }
    sessions.set(session, sessions.get(session) ?? 0);
  }

  function move(name: TransportName, request: Envelope): void {
    if (!config.twoWay) return; // one way is the default: the presentation is moved by the presenter alone
    const { session, seq: counter, segmentId } = request;
    if (typeof session !== 'string') return;
    const sessions = sessionsOf(name);
    const previous = sessions.get(session);
    if (previous === undefined || !isSeq(counter) || counter <= previous) return; // not a speaker that was answered, or a stale or duplicate request
    if (typeof segmentId !== 'string' || !segmentIds.includes(segmentId)) return;
    sessions.set(session, counter);
    options.navigate?.(segmentId);
  }

  /**
   * A script window that cannot look at this window (an opaque origin, or no opener at all) asks from time to time whether this presentation
   * is still there, and a page that was replaced without a word is told from one that is only idle by whether it answers. It answers a
   * question that names it, for a handshake it has answered on this transport, with the number of the question, and does nothing else: it
   * sends no state, and takes no counter (a question changes nothing that a speaker follows).
   */
  function confirm(name: TransportName, ping: Envelope): void {
    const { session, n, to } = ping;
    const port = ports.get(name);
    if (port === undefined || to !== id || !isName(session) || !isSeq(n) || n < 1 || !sessionsOf(name).has(session)) return;
    port.send(envelope({ type: 'pong', from: 'presenter', presenter: id, session, n }));
  }

  const receive =
    (name: TransportName) =>
    (data: unknown): void => {
      if (disposed) return;
      const message = readEnvelope(data);
      if (message === null || message.from !== 'speaker' || !forMe(message)) return; // a hello or a request that names another presentation is not ours to answer
      if (message.type === 'hello') answer(name, message);
      else if (message.type === 'navigate') move(name, message);
      else if (message.type === 'ping') confirm(name, message);
    };

  for (const name of TRANSPORTS) {
    if (config.fail.has(name)) continue; // a forced failure opens nothing: no channel, no listener
    const port =
      name === 'broadcastchannel'
        ? openBroadcast(win, receive(name))
        : name === 'postmessage'
          ? openMessages(win, () => popup, peerOrigin, targetOrigin, receive(name), adopt)
          : openStorage(win, STORAGE_KEYS.toPresenter, STORAGE_KEYS.toSpeaker, receive(name));
    if (port !== null) ports.set(name, port);
  }

  /**
   * Says who this presentation is, on its window, for the script window that it opens to read through `window.opener`. Last, after what
   * listens is listening: a script window that finds the name finds a presentation that can hear its hello.
   */
  const named = safe(() => Reflect.defineProperty(win, PRESENTER_KEY, { value: id, configurable: true }), false);

  return {
    setPopup(handle) {
      if (disposed) return;
      const next = handle ?? null;
      told = true;
      if (next !== popup) {
        popup = next;
        sessionsOf('postmessage').clear(); // another window has not shaken hands: what was answered was said to the one before
      }
      claim(); // also when it is the handle it had: a window that is opened again, by name, is its own again, whoever it was following
    },
    publish,
    get active() {
      return active();
    },
    targetOrigin,
    dispose() {
      if (disposed) return;
      disposed = true;
      // goodbye, on each transport that has a speaker on it, before the ports go: best effort, because the page may be on its way out
      // (`pagehide`), and the speaker does not rely on it, it also looks at the window (see the speaker)
      const bye = envelope({ type: 'bye', from: 'presenter', presenter: id });
      for (const name of active()) ports.get(name)?.send(bye);
      for (const port of ports.values()) port.close();
      ports.clear();
      for (const sessions of answered.values()) sessions.clear();
      popup = null;
      // only its own name comes off the window: a presentation that was started there since has put its own
      if (named) safe(() => Reflect.get(win, PRESENTER_KEY) === id && Reflect.deleteProperty(win, PRESENTER_KEY), false);
    },
  };
}

// -- the speaker ----------------------------------------------------------------------------------------------------------

export interface SpeakerSyncOptions {
  readonly window: SyncWindow;
  readonly config: SyncConfig;
  readonly segmentIds: readonly string[];
  /**
   * Called when the speaker starts connecting, when it is synchronized, and when it is not (AC10): not for each attempt. It is called
   * again whenever that changes later, because the presentation that owned the window left, or another one owns it now.
   */
  readonly onStatus: (status: SyncStatus) => void;
  /** Called with the state of the presentation: once from the handshake, and again for every change after it. */
  readonly onState: (state: SyncState) => void;
  /** Names the first handshake on the wire. Default: a fresh random one. Each handshake after it adds its number. */
  readonly sessionId?: string;
}

export interface SpeakerSync {
  /** Probes the transports in order. Said once: a second call, or a call after `dispose()`, does nothing. */
  start(): void;
  /** Where the speaker stands now; `attempts` holds each transport as it is resolved. */
  readonly status: SyncStatus;
  readonly targetOrigin: string;
  /**
   * Asks the presentation that owns this window to move to a segment. True if the request went out, or will go out as soon as the
   * presentation that owns the window now has been found: only when two-way was asked for and the speaker is synchronized. False when
   * it did not, including when the presentation turned out to be gone: the speaker is then not synchronized, and says so.
   */
  navigate(segmentId: string): boolean;
  /** Lets go of everything it holds: the transport, the watch and the marker on its window. */
  dispose(): void;
}

/** Who owns the script window, as far as this window can tell: the window that opened it, and the name its presentation gave itself (null: none that can be read). */
interface Identity {
  readonly handle: unknown;
  readonly key: string | null;
}

/**
 * The speaker script's side. `start()` tries BroadcastChannel, then postMessage, then localStorage, and stays on the first one whose
 * presenter answers the hello: the presentation that opened this window where the window can tell which that is (see "Pairing" above),
 * and otherwise the first that answers. A transport that is forced to fail, or that is not there (no BroadcastChannel, no usable opener, no
 * storage), is passed over at once and costs no time; one that is there and says nothing costs the timeout. When none answers, it
 * says `not-synchronized` and holds nothing open.
 *
 * It is `synchronized` for as long as the presentation it follows owns this window and is there, and no longer (see "Who owns the script
 * window" above): a claim from the presentation that owns it now moves it over at once; a goodbye, a closed window, a presentation that is
 * not the one it follows any more, or one that cannot be looked at and does not say that it is there when it is asked (see `liveness`), make
 * it say so, and look for the one that is there; and a window that is not synchronized looks again when something changes, or after a while.
 */
export function createSpeakerSync(options: SpeakerSyncOptions): SpeakerSync {
  const { window: win, config, segmentIds } = options;
  const targetOrigin = targetOriginFor(win);
  const peerOrigin = peerOriginFor(targetOrigin);
  /** What it is doing: looking for a presentation (`probing`), following one (`paired`) or not synchronized, with nothing open (`idle`). */
  let phase: 'probing' | 'paired' | 'idle' = 'probing';
  /** The transport that is being probed, or is the one it settled on, and who owned the window when the hello went out (the name is what the ack must come from). */
  let held: {
    readonly name: TransportName;
    readonly port: Port;
    readonly identity: Identity;
    timer: ReturnType<typeof setTimeout> | undefined;
  } | null = null;
  let status: SyncStatus = { state: 'connecting', transport: null, attempts: [] };
  let started = false;
  let disposed = false;
  let session = options.sessionId ?? randomId();
  let handshakes = 1;
  let presenter = '';
  let lastSeq = 0;
  let requests = 0;
  /** Who owned the window when it settled: the owner is compared with this, and a change is the end of that pairing. */
  let pairing: Identity = { handle: null, key: null };
  /** The attempts of the probe that is running, or ran last. Said to the surface only for a probe that the surface can see. */
  let trail: Attempt[] = [];
  /** A probe of a window that is not synchronized, which says nothing unless it finds the presentation: it does not turn a status into `connecting` and back. */
  let silent = false;
  /** A request to move that was made while the owner of the window changed: it goes to the owner that is found. */
  let pendingMove: string | null = null;
  /** The wait for the answer to the hello that follows a claim, and the one between two looks at the window. */
  let verifying: ReturnType<typeof setTimeout> | undefined;
  let watching: ReturnType<typeof setTimeout> | undefined;
  /**
   * For a presentation that cannot be looked at (see `heard`): the wait before it is asked whether it is there and, once it was asked, the
   * wait for the answer. One timer, so never both. `asked` counts the questions and never goes down, so that no two of them are alike (a
   * `storage` event fires for a value that changed); `waiting` is the number of the one that is out, or 0 where none is.
   */
  let alive: ReturnType<typeof setTimeout> | undefined;
  let asked = 0;
  let waiting = 0;
  /** Who owned the window when the hello last went out, and what has passed since, for a window that is not synchronized. */
  let lastTried: Identity = { handle: null, key: null };
  let tried: Identity | null = null;
  let idleMs = 0;
  let retryMs = RETRY_MS;
  /**
   * Whether the window that opened this one has been seen to carry the name of a presentation (and the last pairing was not with one that
   * carries none). Where it has, a window that names no one is a page that is loading, or a window that is no presentation: nobody can be
   * asked by name, and a hello that names no one is not sent (a presentation of the origin that is not the owner would answer it on
   * BroadcastChannel or in storage).
   */
  let openerNames = false;

  const say = (next: SyncStatus): void => {
    status = next;
    options.onStatus(next);
  };
  const record = (transport: TransportName, outcome: AttemptOutcome): void => {
    trail = [...trail, { transport, outcome }];
    if (!silent) status = { ...status, attempts: trail };
  };
  const opener = (): unknown => safe(() => win.opener ?? null, null);
  const identityNow = (): Identity => ({ handle: opener(), key: openerPresenter(win) });
  const sameIdentity = (a: Identity, b: Identity): boolean => a.handle === b.handle && a.key === b.key;
  const nextSession = (): string => {
    handshakes += 1;
    return options.sessionId === undefined ? randomId() : `${options.sessionId}-${handshakes}`;
  };

  function open(name: TransportName): Port | null {
    const onData = receive(name);
    if (name === 'broadcastchannel') return openBroadcast(win, onData);
    if (name === 'postmessage') return usableHandle(opener()) ? openMessages(win, opener, peerOrigin, targetOrigin, onData) : null;
    return storageOf(win) === null ? null : openStorage(win, STORAGE_KEYS.toSpeaker, STORAGE_KEYS.toPresenter, onData);
  }

  /** Lets go of the transport it holds, and of the wait for an answer on it, and of the question that was out. */
  function release(): void {
    if (verifying !== undefined) clearTimeout(verifying);
    verifying = undefined;
    stopAsking();
    if (held === null) return;
    if (held.timer !== undefined) clearTimeout(held.timer);
    held.port.close();
    held = null;
  }

  function stopWatch(): void {
    if (watching !== undefined) clearTimeout(watching);
    watching = undefined;
  }

  /** Stops asking: the wait before the next question, or for the answer to the one that is out, which is not waited for any more. */
  function stopAsking(): void {
    if (alive !== undefined) clearTimeout(alive);
    alive = undefined;
    waiting = 0;
  }

  /**
   * The presentation it follows was heard from (it answered, it said what it shows, it claimed the window): the wait before it is asked
   * whether it is still there starts again. Only a presentation that cannot be looked at is asked, which is a window that no name can be read
   * on (an opaque origin, or an opener that carries none) or that no presentation opened. Where the name can be read, the watch sees
   * the presentation go, and replaced, and nothing is asked: the traffic of an idle presentation stays what it was.
   */
  function heard(): void {
    stopAsking();
    if (disposed || phase !== 'paired' || pairing.key !== null) return;
    alive = setTimeout(ask, LIVENESS_MS);
  }

  /** Asks the presentation, by name and on the transport it keeps, whether it is there. Nothing it says is taken for anything but the answer to this. */
  function ask(): void {
    alive = undefined;
    if (disposed || phase !== 'paired' || held === null) return;
    asked += 1;
    waiting = asked;
    if (!held.port.send(envelope({ type: 'ping', from: 'speaker', session, to: presenter, n: asked }))) {
      lost(); // nothing can be put to it any more: its window is closed, or its transport is gone
      return;
    }
    alive = setTimeout(lost, config.timeoutMs);
  }

  /** The presentation was asked whether it is there and did not say so within the time of a handshake: whatever the window says, it is gone. */
  function lost(): void {
    alive = undefined;
    if (!disposed && phase === 'paired') degrade();
  }

  /** The answer to the question that is out, and to no other: from the presentation that is followed, for this handshake. It is there. */
  function answered(message: Envelope): void {
    if (waiting !== 0 && message.session === session && message.n === waiting) heard();
  }

  function probeFrom(first: number): void {
    for (let index = first; index < TRANSPORTS.length; index += 1) {
      if (disposed) return;
      const name = TRANSPORTS[index];
      if (config.fail.has(name)) {
        record(name, 'forced-failure');
        continue;
      }
      // it asks the presentation that owns the window, by name, and takes the word of no other (a window that cannot say who: anyone's)
      const identity = identityNow();
      if (identity.key !== null) openerNames = true;
      // the owner is between two pages (its name is off the window) where it had one: there is no one to ask by name, and a hello that names
      // no one would be answered by any presentation of the origin that hears it
      else if (openerNames) break;
      const port = open(name);
      if (port === null) {
        record(name, 'unavailable');
        continue;
      }
      const attempt = { name, port, identity, timer: undefined as ReturnType<typeof setTimeout> | undefined };
      held = attempt;
      const hello = envelope({ type: 'hello', from: 'speaker', session, ...(identity.key === null ? {} : { to: identity.key }) });
      if (!port.send(hello)) {
        held = null;
        port.close();
        record(name, 'send-failed');
        continue;
      }
      tried = identity;
      attempt.timer = setTimeout(() => timeOut(attempt), config.timeoutMs);
      return;
    }
    gaveUp();
  }

  /** No transport answered: not synchronized, and nothing held open. A probe that was silent says nothing of it, and waits longer next time. */
  function gaveUp(): void {
    if (disposed) return;
    phase = 'idle';
    pendingMove = null;
    lastTried = tried ?? identityNow();
    tried = null;
    idleMs = 0;
    if (silent) retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
    else say({ state: 'not-synchronized', transport: null, attempts: trail });
    silent = false;
    arm();
  }

  function timeOut(attempt: NonNullable<typeof held>): void {
    if (disposed || held !== attempt || phase !== 'probing') return;
    held = null;
    attempt.port.close();
    record(attempt.name, 'timeout');
    probeFrom(TRANSPORTS.indexOf(attempt.name) + 1);
  }

  /** The presentation answered the hello: the speaker follows it, over the transport it answered on. */
  function settle(attempt: NonNullable<typeof held>, from: string, seq: number, state: SyncState): void {
    if (attempt.timer !== undefined) clearTimeout(attempt.timer);
    attempt.timer = undefined;
    presenter = from;
    lastSeq = seq;
    requests = 0;
    pairing = attempt.identity;
    openerNames = pairing.key !== null;
    tried = null;
    phase = 'paired';
    record(attempt.name, 'synchronized');
    silent = false;
    say({ state: 'synchronized', transport: attempt.name, attempts: trail });
    options.onState(state);
    heard();
    arm();
    if (pendingMove === null) return;
    const move = pendingMove;
    pendingMove = null;
    request(move);
  }

  function request(segmentId: string): boolean {
    if (held === null) return false;
    requests += 1;
    return held.port.send(envelope({ type: 'navigate', from: 'speaker', session, seq: requests, segmentId, to: presenter }));
  }

  /** A state of the presentation it follows: the first one it has not had. Says what became of it (a stale one is a state, and is not shown). */
  function follow(message: Envelope): 'applied' | 'stale' | 'invalid' {
    const { seq } = message;
    if (!isSeq(seq)) return 'invalid';
    const state = readState(message.state, segmentIds);
    if (state === null) return 'invalid';
    if (seq <= lastSeq) return 'stale'; // one it has had already
    lastSeq = seq;
    options.onState(state);
    return 'applied';
  }

  /**
   * The window has another owner: the speaker follows it from `seq` on (the counters of the owner before are not its counters, and that
   * owner can no longer move the window) and shakes hands with it, by name, to be answered on the transport it keeps. It says nothing of it
   * and never leaves `synchronized`, unless there is nothing to shake hands on, or the new owner does not answer: it looks again, in the open.
   */
  function handOver(from: string, key: string | null, seq: number): boolean {
    if (verifying !== undefined) clearTimeout(verifying);
    verifying = undefined;
    stopAsking();
    presenter = from;
    lastSeq = seq;
    requests = 0;
    session = nextSession();
    pairing = { handle: opener(), key };
    openerNames = key !== null;
    if (held === null || !held.port.send(envelope({ type: 'hello', from: 'speaker', session, to: from }))) {
      repair();
      return false;
    }
    verifying = setTimeout(() => {
      verifying = undefined;
      if (!disposed && phase === 'paired') repair(); // the new owner does not answer on this transport
    }, config.timeoutMs);
    return true;
  }

  /**
   * A claim came over BroadcastChannel or `storage`, which say nothing of who sent it: any window of the origin can post to them, and one that
   * knows the name of the presentation it follows can copy it. So the claim is not believed, whatever it says, and none of its numbers is
   * kept; it is a reason to look at who owns this window now. If that is a presentation by the name the claim gives, and not the one that
   * is followed, the window is handed over to it and that presentation is asked for its state, by name: what the window shows is what the
   * owner says to its own hello, and never what a claim says.
   */
  // ghcp-was-here: a claim over BroadcastChannel or `storage` is a hint, and the owner is what the window says it is. Ceiling: no sender is
  // known on those two transports, so a window of the origin that knows the name of the presentation that is followed can still put a
  // `state`, a `bye` or a `pong` on them, as it could before; what is hardened is the transfer of the window from one presentation to
  // another, which is the one that moved the speaker without the presentation. Upgrade path: a secret that the two windows agree on over
  // postMessage, where the sender is known, and that every message on the other two carries (it cannot reach a window nothing opened).
  function nudge(from: string): void {
    const owner = markerOn(opener());
    if (typeof owner !== 'string' || owner !== from || from === presenter) return;
    handOver(owner, owner, 0);
  }

  /**
   * A presentation says that this window is its own now, with what it shows. Over postMessage, `openMessages` has checked that the window
   * that posted it is the window that opened this one, and its origin: it is believed if that window is what it says it is. Where the name on
   * the opener can be read it must be the name the claim gives, and a window that can be read and carries none is no presentation, and no
   * owner (a window that cannot be read, an opaque origin, says nothing of who is there: the window that posted is the whole of the proof).
   * A claim from the presentation it follows is a state; from another one, the speaker follows that one, starting from what the claim says,
   * and shakes hands with it. Over the other two transports a claim is no more than a hint (see `nudge`).
   */
  function takeClaim(name: TransportName, claim: Envelope): void {
    const { presenter: from, seq } = claim;
    if (!isName(from) || !isSeq(seq) || seq < 1) return;
    const state = readState(claim.state, segmentIds);
    if (state === null) return;
    if (name !== 'postmessage') {
      nudge(from);
      return;
    }
    const marker = markerOn(opener());
    if (marker === ABSENT || (typeof marker === 'string' && marker !== from)) return;
    if (from === presenter) {
      if (follow(claim) === 'applied') heard();
      return;
    }
    if (!handOver(from, marker === UNREADABLE ? null : marker, seq)) return;
    options.onState(state);
    heard();
  }

  function accept(name: TransportName, message: Envelope): void {
    if (phase === 'probing') {
      const attempt = held;
      if (attempt === null || message.type !== 'ack' || message.session !== session) return; // an answer to some other hello is not an answer to this one
      const { presenter: from, seq } = message;
      if (!isName(from) || !isSeq(seq) || seq < 1) return;
      if (attempt.identity.key !== null && from !== attempt.identity.key) return; // it asked the presentation that owns the window, and takes the word of no other
      const state = readState(message.state, segmentIds);
      if (state === null) return;
      settle(attempt, from, seq, state);
      return;
    }
    if (phase !== 'paired') return;
    if (message.type === 'claim') {
      takeClaim(name, message);
      return;
    }
    if (message.presenter !== presenter) return; // a presentation that is not the one it follows: what it says is nothing to this window
    if (message.type === 'bye') {
      degrade(); // the one it follows has gone
    } else if (message.type === 'pong') {
      answered(message);
    } else if (message.type === 'state') {
      if (follow(message) === 'applied') heard();
    } else if (message.type === 'ack' && message.session === session) {
      if (verifying !== undefined) {
        clearTimeout(verifying);
        verifying = undefined;
      }
      if (follow(message) !== 'invalid') heard(); // an answer to its hello says that the presentation is there, whether or not it had the state already
    }
  }

  function receive(name: TransportName): (data: unknown) => void {
    return (data) => {
      if (disposed || held === null || held.name !== name) return;
      const message = readEnvelope(data);
      if (message !== null && message.from === 'presenter') accept(name, message);
    };
  }

  /** The presentation it followed is gone: not synchronized, with nothing held open, and the manual controls on. It looks again when something changes. */
  function degrade(): void {
    release();
    lastTried = pairing;
    tried = null;
    presenter = '';
    lastSeq = 0;
    requests = 0;
    pendingMove = null;
    phase = 'idle';
    idleMs = 0;
    retryMs = RETRY_MS;
    say({ state: 'not-synchronized', transport: null, attempts: status.attempts });
    arm();
  }

  /** The window has another owner, or the one it has does not answer: it looks again, in the open (connecting, then synchronized or not). */
  function repair(): void {
    release();
    session = nextSession();
    presenter = '';
    lastSeq = 0;
    requests = 0;
    phase = 'probing';
    silent = false;
    trail = [];
    tried = null;
    idleMs = 0;
    retryMs = RETRY_MS;
    say({ state: 'connecting', transport: null, attempts: [] });
    probeFrom(0);
  }

  /** The window that is not synchronized looks again, quietly: nothing is said unless a presentation answers. */
  function recover(): void {
    release();
    session = nextSession();
    phase = 'probing';
    silent = true;
    trail = [];
    tried = null;
    probeFrom(0);
  }

  /**
   * Whether the presentation it is paired with is still there and still owns the window. `gone`: nothing owns the window that can be asked
   * now: the window that opened this one is closed, or it carries no name where the last one that owned it had one (a page that is loading,
   * or a window that is no presentation). `other`: this window has another opener, or the presentation on its opener is another one. Only
   * what can be read is compared, so across origins, where nothing but `closed` and the handle itself can be read, those are all there is
   * to see.
   */
  function inspect(): 'ok' | 'gone' | 'other' {
    const handle = opener();
    const moved = pairing.handle === null ? handle !== null : handle !== pairing.handle;
    if (pairing.handle !== null && !usableHandle(handle)) return 'gone';
    const key = openerPresenter(win);
    if (key === null && openerNames && (moved || pairing.key !== null)) return 'gone'; // no one to ask by name: it waits for a name, and then asks that one
    if (moved) return 'other';
    if (pairing.key !== null ? key !== presenter : key !== null && key !== presenter) return 'other';
    return 'ok';
  }

  /** The one watch: a look at the window while it follows a presentation it can look at, and while it is not synchronized and could look again. */
  function arm(): void {
    if (watching !== undefined || !started || disposed) return;
    const watched = phase === 'paired' ? pairing.handle !== null || pairing.key !== null : phase === 'idle' && TRANSPORTS.some((name) => !config.fail.has(name));
    if (watched) watching = setTimeout(tick, WATCH_MS);
  }

  function tick(): void {
    watching = undefined;
    if (disposed) return;
    if (phase === 'paired') {
      const seen = inspect();
      if (seen === 'gone') {
        degrade();
        return;
      }
      if (seen === 'other') {
        repair();
        return;
      }
    } else if (phase === 'idle') {
      look();
    }
    arm();
  }

  /**
   * Whether it is time to look for a presentation again. A window that is not synchronized looks when the owner of the window is not the
   * one it asked last (a presentation was reloaded, or opened, or reopened it), and otherwise after a wait that doubles each time nothing
   * answers. It does not look where there is no one to ask: the window that opened it is closed, or has no name now, where one had it.
   */
  function look(): void {
    const here = identityNow();
    if (here.handle !== null && !usableHandle(here.handle)) return; // the window that opened it is closed
    if (openerNames && here.key === null) return; // the presentation that named itself is loading, or gone: a hello that names no one is not sent now
    if (sameIdentity(here, lastTried)) {
      idleMs += WATCH_MS;
      if (idleMs < retryMs) return;
    } else {
      retryMs = RETRY_MS;
    }
    recover();
  }

  return {
    start() {
      if (started || disposed) return;
      started = true;
      // says, on its window, that a script is running on it: a presentation that is handed the window reads this (see the presenter's claim)
      safe(() => Reflect.defineProperty(win, SPEAKER_KEY, { value: true, configurable: true }), false);
      say(status);
      probeFrom(0);
    },
    get status() {
      return status;
    },
    targetOrigin,
    navigate(segmentId) {
      if (disposed || !config.twoWay || phase !== 'paired' || held === null || !segmentIds.includes(segmentId)) return false;
      // a request goes to the presentation that owns the window now, and never to the one that did: the owner is looked at first
      const seen = inspect();
      if (seen === 'gone') {
        degrade();
        return false;
      }
      if (seen === 'other') {
        pendingMove = segmentId;
        repair();
        return true;
      }
      return request(segmentId);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      stopWatch();
      release();
      if (started) safe(() => Reflect.deleteProperty(win, SPEAKER_KEY), false);
    },
  };
}
