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
// Known limit: nothing polls once synchronized (no heartbeat), so a presenter that is reloaded is a new presenter: the speaker
// stays with the one it shook hands with, and is brought back by reloading it.

import type { ShellState } from './state';

export type TransportName = 'broadcastchannel' | 'postmessage' | 'storage';
export const TRANSPORTS: readonly TransportName[] = ['broadcastchannel', 'postmessage', 'storage'];
export const DEFAULT_TIMEOUT_MS = 1000;
export const MAX_TIMEOUT_MS = 30_000;
export const PROTOCOL = 'teaching-spa-sync';
export const VERSION = 1;
export const CHANNEL_NAME = 'teaching-spa-sync';
export const STORAGE_KEYS = { toSpeaker: 'teaching-spa-sync:to-speaker', toPresenter: 'teaching-spa-sync:to-presenter' } as const;

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
 * iframe or a script that posts to this one does not move anything (C2, F40-F42).
 */
function openMessages(win: SyncWindow, peer: () => unknown, peerOrigin: string | null, targetOrigin: string, onData: (data: unknown) => void): Port {
  const listener = (event: { data?: unknown; source?: unknown; origin?: unknown }): void => {
    const handle = peer();
    if (handle === null || handle === undefined || event.source !== handle) return;
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
  /** The window that was opened for the speaker script, as `window.open` returned it, or null when it was blocked. */
  setPopup(handle: unknown): void;
  /** Tells every speaker that follows what the presentation shows now, if that changed. */
  publish(): void;
  /** The transports on which a speaker has been answered. */
  readonly active: readonly TransportName[];
  readonly targetOrigin: string;
  dispose(): void;
}

/**
 * The presentation's side. It listens on every transport that is not forced to fail, answers a hello on the transport it came by, and
 * after that sends the state, on each transport that has been answered, whenever `publish()` sees it change. It says nothing to a
 * window that has not said hello.
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
  let seq = 0;
  let last: SyncState | null = null;
  let disposed = false;

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

  const receive =
    (name: TransportName) =>
    (data: unknown): void => {
      if (disposed) return;
      const message = readEnvelope(data);
      if (message === null || message.from !== 'speaker') return;
      if (message.type === 'hello') answer(name, message);
      else if (message.type === 'navigate') move(name, message);
    };

  for (const name of TRANSPORTS) {
    if (config.fail.has(name)) continue; // a forced failure opens nothing: no channel, no listener
    const port =
      name === 'broadcastchannel'
        ? openBroadcast(win, receive(name))
        : name === 'postmessage'
          ? openMessages(win, () => popup, peerOrigin, targetOrigin, receive(name))
          : openStorage(win, STORAGE_KEYS.toPresenter, STORAGE_KEYS.toSpeaker, receive(name));
    if (port !== null) ports.set(name, port);
  }

  return {
    setPopup(handle) {
      if (disposed) return;
      const next = handle ?? null;
      if (next === popup) return;
      popup = next;
      sessionsOf('postmessage').clear(); // another window has not shaken hands: what was answered was said to the one before
    },
    publish,
    get active() {
      return active();
    },
    targetOrigin,
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const port of ports.values()) port.close();
      ports.clear();
      for (const sessions of answered.values()) sessions.clear();
      popup = null;
    },
  };
}

// -- the speaker ----------------------------------------------------------------------------------------------------------

export interface SpeakerSyncOptions {
  readonly window: SyncWindow;
  readonly config: SyncConfig;
  readonly segmentIds: readonly string[];
  /** Called when the speaker starts connecting, when it is synchronized, and when it is not (AC10): not for each attempt. */
  readonly onStatus: (status: SyncStatus) => void;
  /** Called with the state of the presentation: once from the handshake, and again for every change after it. */
  readonly onState: (state: SyncState) => void;
  /** Names this handshake on the wire. Default: a fresh random one. */
  readonly sessionId?: string;
}

export interface SpeakerSync {
  /** Probes the transports in order. Said once: a second call, or a call after `dispose()`, does nothing. */
  start(): void;
  /** Where the speaker stands now; `attempts` holds each transport as it is resolved. */
  readonly status: SyncStatus;
  readonly targetOrigin: string;
  /** Asks the presentation to move to a segment. True if the request went out: only when two-way was asked for and the speaker is synchronized. */
  navigate(segmentId: string): boolean;
  dispose(): void;
}

/**
 * The speaker script's side. `start()` tries BroadcastChannel, then postMessage, then localStorage, and stays on the first one whose
 * presenter answers the hello. A transport that is forced to fail, or that is not there (no BroadcastChannel, no usable opener, no
 * storage), is passed over at once and costs no time; one that is there and says nothing costs the timeout. When none answers, it
 * says `not-synchronized` and holds nothing open.
 */
export function createSpeakerSync(options: SpeakerSyncOptions): SpeakerSync {
  const { window: win, config, segmentIds } = options;
  const session = options.sessionId ?? randomId();
  const targetOrigin = targetOriginFor(win);
  const peerOrigin = peerOriginFor(targetOrigin);
  /** The transport that is being probed, or is the one it settled on. */
  let held: { readonly name: TransportName; readonly port: Port; timer: ReturnType<typeof setTimeout> | undefined } | null = null;
  let status: SyncStatus = { state: 'connecting', transport: null, attempts: [] };
  let started = false;
  let disposed = false;
  let presenter = '';
  let lastSeq = 0;
  let requests = 0;

  const say = (next: SyncStatus): void => {
    status = next;
    options.onStatus(next);
  };
  const record = (transport: TransportName, outcome: AttemptOutcome): void => {
    status = { ...status, attempts: [...status.attempts, { transport, outcome }] };
  };
  const opener = (): unknown => safe(() => win.opener, null);

  function open(name: TransportName): Port | null {
    const onData = receive(name);
    if (name === 'broadcastchannel') return openBroadcast(win, onData);
    if (name === 'postmessage') return usableHandle(opener()) ? openMessages(win, opener, peerOrigin, targetOrigin, onData) : null;
    return storageOf(win) === null ? null : openStorage(win, STORAGE_KEYS.toSpeaker, STORAGE_KEYS.toPresenter, onData);
  }

  function probeFrom(first: number): void {
    for (let index = first; index < TRANSPORTS.length; index += 1) {
      if (disposed) return;
      const name = TRANSPORTS[index];
      if (config.fail.has(name)) {
        record(name, 'forced-failure');
        continue;
      }
      const port = open(name);
      if (port === null) {
        record(name, 'unavailable');
        continue;
      }
      const attempt = { name, port, timer: undefined as ReturnType<typeof setTimeout> | undefined };
      held = attempt;
      if (!port.send(envelope({ type: 'hello', from: 'speaker', session }))) {
        held = null;
        port.close();
        record(name, 'send-failed');
        continue;
      }
      attempt.timer = setTimeout(() => timeOut(attempt), config.timeoutMs);
      return;
    }
    say({ state: 'not-synchronized', transport: null, attempts: status.attempts });
  }

  function timeOut(attempt: NonNullable<typeof held>): void {
    if (disposed || held !== attempt || status.state !== 'connecting') return;
    held = null;
    attempt.port.close();
    record(attempt.name, 'timeout');
    probeFrom(TRANSPORTS.indexOf(attempt.name) + 1);
  }

  function accept(name: TransportName, message: Envelope): void {
    if (status.state === 'connecting') {
      if (message.type !== 'ack' || message.session !== session) return; // an answer to some other hello is not an answer to this one
      const { presenter: from, seq } = message;
      if (!isName(from) || !isSeq(seq) || seq < 1) return;
      const state = readState(message.state, segmentIds);
      if (state === null) return;
      if (held?.timer !== undefined) clearTimeout(held.timer);
      if (held !== null) held.timer = undefined;
      presenter = from;
      lastSeq = seq;
      record(name, 'synchronized');
      say({ state: 'synchronized', transport: name, attempts: status.attempts });
      options.onState(state);
    } else if (status.state === 'synchronized') {
      if (message.type !== 'state' || message.presenter !== presenter) return; // the presenter it shook hands with, and no other
      const { seq } = message;
      if (!isSeq(seq) || seq <= lastSeq) return; // stale, or one it has had already
      const state = readState(message.state, segmentIds);
      if (state === null) return;
      lastSeq = seq;
      options.onState(state);
    }
  }

  function receive(name: TransportName): (data: unknown) => void {
    return (data) => {
      if (disposed || held === null || held.name !== name) return;
      const message = readEnvelope(data);
      if (message !== null && message.from === 'presenter') accept(name, message);
    };
  }

  return {
    start() {
      if (started || disposed) return;
      started = true;
      say(status);
      probeFrom(0);
    },
    get status() {
      return status;
    },
    targetOrigin,
    navigate(segmentId) {
      if (disposed || !config.twoWay || status.state !== 'synchronized' || held === null || !segmentIds.includes(segmentId)) return false;
      requests += 1;
      return held.port.send(envelope({ type: 'navigate', from: 'speaker', session, seq: requests, segmentId }));
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (held !== null) {
        if (held.timer !== undefined) clearTimeout(held.timer);
        held.port.close();
        held = null;
      }
    },
  };
}
