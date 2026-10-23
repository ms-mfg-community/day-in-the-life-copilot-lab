// The speaker script's side of the sync (specs/005-teaching-spa.md 2.7, AC9, AC10). The wire format, the three transports and the presenter are in
// ./sync, which re-exports this file, so the rest of the shell takes the speaker from there. What this stands on is described there ("Pairing",
// "An opener that cannot be read"); this is how it lives.
//
// Who owns the script window, and for how long. The script window is opened with a name (`teaching-spa-script`) and so is reused by it, and the
// presentation that opened it first is not the one that has it for good: a second presentation that opens it takes it, and the browser makes that
// presentation its `window.opener`; a presentation that is reloaded is a new one on the same window; one that is closed has nothing left to follow.
// So the pairing is not made once, at the handshake. It is kept true by one line to the opener and four habits.
//
// The line. Unless postMessage is forced to fail, the script window listens to its opener from `start()` until `dispose()`, and for nothing else:
// whatever it is doing (looking, paired, not synchronized) and over whatever transport it is paired (BroadcastChannel, `storage` or this one), the
// line is open, and only `dispose()` closes it. A message on it is acted on only if its `event.source` is the window that is the opener NOW and it
// says the origin of the page (`openMessages`). It is the one transport on which the receiver knows who sent a message, so it is the one that is
// believed about who owns the window. It carries two things:
//
//   identity  Where the name on the opener cannot be read (an opaque origin: a page from a file: URL, a sandbox) the opener is asked who it is
//             (`identify`) before anything is said on BroadcastChannel or `storage`, which every presentation of the origin hears and would answer,
//             the first one or an older one or one that has nothing to do with this window. The presentation that opened the window says so, in a
//             claim. That name is kept for the window that is the opener now and no other, and goes when the presentation does; the hello names it,
//             and only its ack is taken. An opener that does not say (a window that is no presentation, one that was never handed this window) is no
//             owner: the window says that it is not synchronized, and asks again from time to time (`recover`). Where the name can be read, it is
//             on the window and no one is asked.
//   claim     A presentation that is handed a script window that is already running says so, with its state (the presenter's `claim`). The window
//             takes it in every phase and over whatever transport it holds, from its opener alone, if that window is what it says it is: where the
//             name on it can be read it is the claimant's (a window that can be read and carries none is no owner), and where it cannot be read
//             the sender is the whole of the proof. It then shows the state of the claim at once and is `synchronized`, follows that presentation from
//             then on, forgets the counters of the one before and says hello to it, by name, on the transport it holds or, where it holds none (it
//             had given up), on the first that works, and the presentation answers and publishes: the 500 ms of AC9, also for a presentation that
//             was reloaded and a window that was not synchronized. If the new owner does not answer, it looks again, in the open. Over
//             BroadcastChannel and `storage`, where any window of the origin can write and none is known to have, a claim is believed in nothing
//             it says: it is a hint to look at who owns this window (`nudge`), and the owner is what the window says, and what it says to a hello.
//
//   bye       A presentation that is closed or reloaded (`pagehide` of a page that is not kept for later) says goodbye on the transports it
//             was answered on, and the script window that follows it becomes `not-synchronized` at once. A goodbye from any other presentation
//             than the one that is followed does nothing, and neither does a state of one. It is best effort: in an opaque origin a message that a
//             page posts as it unloads reaches the other window with no `source` (Chromium), so it cannot be told from the message of any window
//             and is not acted on (BroadcastChannel, which is tried first, delivers it), and then it is the question (`liveness`) that finds the
//             presentation gone.
//   watch     While paired, and with an opener it can look at, the script window looks at it every `WATCH_MS`: is it still there, not closed,
//             the same window, and does it still carry the name of the presentation that is followed. That reads properties and sends nothing,
//             so a presentation that is only idle is never given up on, and one that is closed without a word, reloaded in place without one, or
//             replaced by another is found anyway: gone (closed, or a window that no presentation names) is `not-synchronized`, another
//             presentation is a new handshake (the 500 ms of AC9). A request to move (two-way) looks first, so that it is never made of a
//             presentation that has lost the window.
//   liveness  Where the opener cannot be looked at (one opened by hand has none; one in an opaque origin cannot be read) there is no watch, so the
//             script window asks. A presentation it follows that has said nothing for `LIVENESS_MS` is asked, by name and on the transport it
//             answered on, whether it is there, and one that does not say so within the timeout of the handshake is gone: `not-synchronized`.
//             Whatever the presentation says (a state, a claim, the answer) starts the wait again, so one that is being used is never asked and an
//             idle one costs a small message a second and is never given up on. Only the presentation that is followed answers, for the session of
//             this hello, so one that was reloaded in place (a new one, with no memory of the hello) is the one that does not.
//   recover   A script window that is not synchronized, for a reason that can pass (nobody answered; a presentation went away), looks again,
//             silently, until it is: when its opener is another window or carries another name, and from time to time otherwise (`RETRY_MS`,
//             doubling to `MAX_RETRY_MS`). Only the transports that are not forced to fail are tried, and where all are forced there is no timer.
//             Where presentations name themselves, a hello always names one: a window with no name (a page that is loading) is waited on. Where
//             they cannot be read, the opener is asked first (`identity`), and a hello that names no one is sent only where postMessage is forced to
//             fail and there is no one to ask.
//
// Known limits. Where postMessage is forced to fail there is no line, and a script window whose opener cannot be read has no one to name: it takes
// the first presentation that answers, and asks that one alone to move. One opened by hand has no opener, so no presentation can claim it: it follows
// the one it found until that one says goodbye or does not answer the question (`liveness`), and then the next that answers. A presentation in an
// opaque origin that was reloaded in place was never handed this window, holds no handle to it and cannot say who it is over the line: the window
// finds it gone (its goodbye over BroadcastChannel, where there is one, or otherwise the question, in about `LIVENESS_MS` plus the timeout: two
// seconds by default, and not the 500 ms of a window that can be looked at), says that it is not synchronized and has its own navigation, and follows
// that presentation again when it opens the window (Present): its claim is taken at once. BroadcastChannel and `storage` carry no sender, so a window
// of the origin that knows the name of the presentation that is followed can still put a state, a goodbye or an answer on them; what is hardened is
// who may take the window (see `nudge`).

import {
  ABSENT, LIVENESS_MS, MAX_RETRY_MS, RETRY_MS, SPEAKER_KEY, STORAGE_KEYS, TRANSPORTS, UNREADABLE, WATCH_MS, envelope, isName, isSeq, markerOn,
  openBroadcast, openMessages, openStorage, openerPresenter, peerOriginFor, randomId, readEnvelope, readState, safe, storageOf, targetOriginFor,
  usableHandle,
  type Attempt, type AttemptOutcome, type Envelope, type Port, type SyncConfig, type SyncState, type SyncStatus, type SyncWindow, type TransportName,
} from './sync';

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
  /** Lets go of everything it holds: the line, the transport, the watch and the marker on its window. */
  dispose(): void;
}

/** Who owns the script window, as far as this window can tell: the window that opened it, and the name its presentation gave itself (null: none that can be read). */
interface Identity {
  readonly handle: unknown;
  readonly key: string | null;
  /** Whom a hello is for: that name or, where it cannot be read, the one the presentation on the opener said (`learned`). Null: no one is known. */
  readonly owner: string | null;
}

/**
 * The speaker script's side. `start()` opens the line to the opener, then tries BroadcastChannel, then postMessage, then localStorage, and stays on
 * the first one whose presenter answers the hello: the presentation that opened this window, which it knows by the name on the window or, where that
 * cannot be read, by asking it over the line (see above), and otherwise the first that answers. A transport that is forced to fail, or that is
 * not there (no BroadcastChannel, no usable opener, no storage), is passed over at once and costs no time; one that is there and says nothing costs
 * the timeout. When none answers, it says `not-synchronized` and holds nothing open but the line.
 *
 * It is `synchronized` for as long as the presentation it follows owns this window and is there, and no longer (see above): a claim from the
 * presentation that owns it now moves it over at once; a goodbye, a closed window, a presentation that is not the one it follows any more, or one
 * that cannot be looked at and does not say that it is there when it is asked (see `liveness`), make it say so, and look for the one that is there;
 * and a window that is not synchronized looks again when something changes, or after a while.
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
  /** The line to the opener: open from `start()` to `dispose()` and held by nothing else, and null where postMessage is forced to fail. */
  let line: Port | null = null;
  let status: SyncStatus = { state: 'connecting', transport: null, attempts: [] };
  let started = false;
  let disposed = false;
  let session = options.sessionId ?? randomId();
  let handshakes = 1;
  let presenter = '';
  let lastSeq = 0;
  let requests = 0;
  /** Who owned the window when it settled: the owner is compared with this, and a change is the end of that pairing. */
  let pairing: Identity = { handle: null, key: null, owner: null };
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
  let lastTried: Identity = { handle: null, key: null, owner: null };
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
  /** What the presentation on an opener that cannot be read said it is, over the line, and which window it said it for: it holds for that window only (`identityNow`). */
  let learned: { readonly handle: unknown; readonly key: string } | null = null;
  /** The wait for the opener to say who it is: the timeout of a handshake, which a claim ends. */
  let identifying: ReturnType<typeof setTimeout> | undefined;

  const say = (next: SyncStatus): void => {
    status = next;
    options.onStatus(next);
  };
  /** Says that the window is synchronized over `transport`, unless the surface was told so already (a claim said it, and the handshake that follows it says it again): the trail is kept either way. */
  const synchronized = (transport: TransportName): void => {
    const told = status.state === 'synchronized' && status.transport === transport;
    status = { state: 'synchronized', transport, attempts: trail };
    if (!told) options.onStatus(status);
  };
  const record = (transport: TransportName, outcome: AttemptOutcome): void => {
    trail = [...trail, { transport, outcome }];
    if (!silent) status = { ...status, attempts: trail };
  };
  const opener = (): unknown => safe(() => win.opener ?? null, null);
  /** Who owns the window now. What the opener said it is is good for that opener only, and only while its name cannot be read: it is dropped otherwise. */
  const identityNow = (): Identity => {
    const handle = opener();
    const marker = markerOn(handle);
    if (learned !== null && (learned.handle !== handle || marker !== UNREADABLE)) learned = null;
    const key = typeof marker === 'string' ? marker : null;
    return { handle, key, owner: key ?? learned?.key ?? null };
  };
  const sameIdentity = (a: Identity, b: Identity): boolean => a.handle === b.handle && a.key === b.key;
  const nextSession = (): string => {
    handshakes += 1;
    return options.sessionId === undefined ? randomId() : `${options.sessionId}-${handshakes}`;
  };

  function open(name: TransportName): Port | null {
    if (name === 'postmessage') {
      // the line is not opened for a transport and not closed with it: this is a view of it, that the transport can let go of
      const wire = line;
      return wire !== null && usableHandle(opener()) ? { send: (message) => wire.send(message), close: () => undefined } : null;
    }
    const onData = receive(name);
    if (name === 'broadcastchannel') return openBroadcast(win, onData);
    return storageOf(win) === null ? null : openStorage(win, STORAGE_KEYS.toSpeaker, STORAGE_KEYS.toPresenter, onData);
  }

  /** Lets go of the transport it holds, and of the wait for an answer on it, and of the question that was out. Never of the line. */
  function release(): void {
    if (verifying !== undefined) clearTimeout(verifying);
    verifying = undefined;
    if (identifying !== undefined) clearTimeout(identifying);
    identifying = undefined;
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
      // it asks the presentation that owns the window, by name, and takes the word of no other (a window that cannot say who, and has no line to ask on: anyone's)
      const identity = identityNow();
      if (identity.key !== null) openerNames = true;
      // the owner is between two pages (its name is off the window) where it had one: there is no one to ask by name, and a hello that names
      // no one would be answered by any presentation of the origin that hears it
      else if (openerNames) break;
      // an opener that cannot be read is asked who it is before anything goes where every presentation of the origin hears it
      if (name !== 'postmessage' && identity.owner === null && line !== null && usableHandle(identity.handle) && markerOn(identity.handle) === UNREADABLE) {
        identify(identity);
        return;
      }
      const port = open(name);
      if (port === null) {
        record(name, 'unavailable');
        continue;
      }
      const attempt = { name, port, identity, timer: undefined as ReturnType<typeof setTimeout> | undefined };
      held = attempt;
      const hello = envelope({ type: 'hello', from: 'speaker', session, ...(identity.owner === null ? {} : { to: identity.owner }) });
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

  /**
   * The opener cannot be read, so it is asked who it is, on the line, and the transports wait for the answer: a claim, which `takeClaim` takes in
   * whatever phase the window is in. An opener that does not answer within the timeout of a handshake is no owner, and nothing is said where
   * every presentation of the origin would hear it.
   */
  function identify(identity: Identity): void {
    if (line === null || !line.send(envelope({ type: 'identify', from: 'speaker' }))) {
      record('postmessage', 'send-failed');
      gaveUp();
      return;
    }
    tried = identity;
    identifying = setTimeout(() => {
      identifying = undefined;
      if (disposed || phase !== 'probing') return;
      record('postmessage', 'timeout');
      gaveUp();
    }, config.timeoutMs);
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
    synchronized(attempt.name);
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
   * `readable` is whether the name on the window was read; where it was not, the name is the one the owner gave, and holds for this window.
   */
  function handOver(from: string, readable: boolean, seq: number): boolean {
    if (verifying !== undefined) clearTimeout(verifying);
    verifying = undefined;
    stopAsking();
    presenter = from;
    lastSeq = seq;
    requests = 0;
    session = nextSession();
    const handle = opener();
    pairing = { handle, key: readable ? from : null, owner: from };
    learned = readable ? null : { handle, key: from };
    openerNames = readable;
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
    handOver(owner, true, 0);
  }

  /**
   * A presentation says that this window is its own now, with what it shows. Over the line, `openMessages` has checked that the window that posted
   * it is the window that opened this one, and its origin: it is believed if that window is what it says it is. Where the name on the opener can
   * be read it must be the name the claim gives, and a window that can be read and carries none is no presentation, and no owner (a window that
   * cannot be read, an opaque origin, says nothing of who is there: the window that posted is the whole of the proof). This is so in every phase.
   * Paired: a claim from the presentation it follows is a state; from another one, the speaker follows that one, starting from what the claim says,
   * and shakes hands with it on the transport it holds. Looking, or not synchronized, there is nothing to shake hands on and nothing to wait for:
   * the surface shows what the claim says as synchronized at once, and the owner it was told of is said hello to, by name, on the first transport
   * that works (BroadcastChannel first), so that it answers and publishes; where a hello to that owner is out already (by name, or on the line,
   * which only the window that opened this one can answer) it is not asked again, and its answer completes the handshake. Over the other two
   * transports a claim is no more than a hint (see `nudge`).
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
    const handle = opener();
    const marker = markerOn(handle);
    if (marker === ABSENT || (typeof marker === 'string' && marker !== from)) return;
    const readable = marker !== UNREADABLE;
    if (phase === 'paired') {
      if (from === presenter) {
        if (follow(claim) === 'applied') heard();
      } else if (handOver(from, readable, seq)) {
        options.onState(state);
        heard();
      }
      return;
    }
    learned = readable ? null : { handle, key: from };
    const out = phase === 'probing' ? held : null;
    if (out !== null && (out.identity.owner === from || (out.identity.owner === null && out.name === 'postmessage'))) {
      // the handshake that is out is with this presentation: it was asked by name, or on the line, where only the window that opened this one can
      // answer. It is not begun again (that would be one more hello, and the answer to the first would be taken for no answer): the surface has the
      // state at once, and the answer completes what is under way
      silent = false;
      synchronized(out.name);
      options.onState(state);
      return;
    }
    release();
    session = nextSession();
    phase = 'probing';
    silent = false;
    trail = [];
    tried = null;
    presenter = '';
    lastSeq = 0;
    requests = 0;
    idleMs = 0;
    retryMs = RETRY_MS;
    synchronized('postmessage');
    options.onState(state);
    probeFrom(0);
  }

  function accept(name: TransportName, message: Envelope): void {
    if (phase === 'probing') {
      const attempt = held;
      if (attempt === null || message.type !== 'ack' || message.session !== session) return; // an answer to some other hello is not an answer to this one
      const { presenter: from, seq } = message;
      if (!isName(from) || !isSeq(seq) || seq < 1) return;
      if (attempt.identity.owner !== null && from !== attempt.identity.owner) return; // it asked the presentation that owns the window, and takes the word of no other
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

  /** What comes on BroadcastChannel or `storage`: acted on if it is the transport that is held. */
  function receive(name: TransportName): (data: unknown) => void {
    return (data) => {
      if (disposed || held === null || held.name !== name) return;
      const message = readEnvelope(data);
      if (message !== null && message.from === 'presenter') accept(name, message);
    };
  }

  /** What the opener says on the line. A claim is for every phase and every transport; the rest is for the handshake, where postMessage is what is held. */
  function fromOpener(data: unknown): void {
    if (disposed) return;
    const message = readEnvelope(data);
    if (message === null || message.from !== 'presenter') return;
    if (message.type === 'claim') takeClaim('postmessage', message);
    else if (held !== null && held.name === 'postmessage') accept('postmessage', message);
  }

  /** The presentation it followed is gone: not synchronized, with nothing held open but the line, and the manual controls on. It looks again when something changes. */
  function degrade(): void {
    release();
    lastTried = pairing;
    tried = null;
    presenter = '';
    lastSeq = 0;
    requests = 0;
    pendingMove = null;
    learned = null; // the name was that presentation's, and it is gone
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
   * (Where the name cannot be read, a presentation that opens the window again says so itself, on the line: see `takeClaim`.)
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
      // the line first, so that a presentation that reads the marker below, and claims the window, finds a script that hears it
      if (!config.fail.has('postmessage')) line = openMessages(win, opener, peerOrigin, targetOrigin, fromOpener);
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
      if (disposed || !config.twoWay || !segmentIds.includes(segmentId)) return false;
      // a presentation said that the window is its own, and the surface shows it as synchronized while the hello that it is asked is out (see
      // `takeClaim`): Previous and Next are on, so the request waits for the answer, and goes to the owner that answers
      if (phase === 'probing' && status.state === 'synchronized') {
        pendingMove = segmentId;
        return true;
      }
      if (phase !== 'paired' || held === null) return false;
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
      line?.close();
      line = null;
      if (started) safe(() => Reflect.deleteProperty(win, SPEAKER_KEY), false);
    },
  };
}
