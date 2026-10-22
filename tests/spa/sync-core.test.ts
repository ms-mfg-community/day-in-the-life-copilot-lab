// The synchronisation core (specs/005-teaching-spa.md section 2.7, AC9 and AC10), against windows that talk to each other
// the way browser windows do (tests/spa/helpers/sync-doubles.ts) and not against stubs that say yes.
//
// What is pinned here:
//   - three transports, probed IN ORDER (BroadcastChannel, postMessage, localStorage), each with a real handshake and its own
//     timeout; an open channel is not a handshake
//   - deterministic failure hooks for each transport and for all of them, in options and in the URL
//   - the opener and the popup handle are checked when they are used, not assumed
//   - postMessage: the target origin is the page's own, and "*" only where window.origin is "null"; the receiver acts
//     only on a message whose event.source is the window it holds (for the script window, the one that opened it), and on
//     nothing but presentation state
//   - localStorage: every access guarded; the storage event never reaches the writer, so only a real peer completes it
//   - a counter that only goes up: stale and duplicate states are ignored
//   - one way by default, two way only when asked for
//   - dispose leaves no channel, listener, timer or key behind; while paired, the only timer is the watch (WATCH_MS) that
//     looks at who holds the script window
//
// What is NOT here: one pairing, from the handshake on. Who owns the script window after that (a presentation that takes it by
// name, is reloaded in place, goes away; the claim, the goodbye, the watch, the recovery) is in sync-lifecycle.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHANNEL_NAME,
  DEFAULT_TIMEOUT_MS,
  PRESENTER_KEY,
  PROTOCOL,
  STORAGE_KEYS,
  VERSION,
  createPresenterSync,
  createSpeakerSync,
  parseSyncConfig,
  targetOriginFor,
  type PresenterSync,
  type SpeakerSync,
  type SyncOptions,
  type SyncState,
  type SyncStatus,
  type SyncWindow,
  type TransportName,
} from '../../workshop/spa/src/shell/sync';
import { Lab, drain, type LabWindow, type LabWindowOptions } from './helpers/sync-doubles';

const IDS = ['alpha', 'beta', 'gamma'];
const ORIGIN = 'https://spa.test';
const TRANSPORTS: readonly TransportName[] = ['broadcastchannel', 'postmessage', 'storage'];
/** The failure hooks that make each transport the first one standing. */
const ONLY: Record<TransportName, TransportName[]> = {
  broadcastchannel: [],
  postmessage: ['broadcastchannel'],
  storage: ['broadcastchannel', 'postmessage'],
};

const at = (index: number, more: Partial<SyncState> = {}): SyncState => ({ segmentIndex: index, segmentId: IDS[index], revealedSteps: 0, timer: null, ...more });
const TIMER = { id: 'm1-segment-timer', state: 'running', elapsedMs: 1500, startedAt: 1000 } as const;
const wire = (fields: Record<string, unknown>): Record<string, unknown> => ({ app: PROTOCOL, v: VERSION, ...fields });

interface RigOptions {
  presenter?: LabWindowOptions;
  speaker?: LabWindowOptions;
  options?: SyncOptions;
  /** Options for the presenter alone, where it is to differ from the speaker's. */
  presenterOptions?: SyncOptions;
  search?: string;
  withPresenter?: boolean;
  popup?: 'held' | 'blocked';
}

function rig(o: RigOptions = {}) {
  const lab = new Lab();
  const presenterWin = lab.window('presenter', o.presenter);
  const { window: speakerWin, handle } = lab.popup(presenterWin, 'speaker', o.speaker);
  const current = { value: at(0) };
  const navigated: string[] = [];
  const states: SyncState[] = [];
  const statuses: SyncStatus[] = [];
  const presenter: PresenterSync | undefined =
    o.withPresenter === false
      ? undefined
      : createPresenterSync({
          window: presenterWin,
          config: parseSyncConfig(o.search, o.presenterOptions ?? o.options),
          snapshot: () => current.value,
          segmentIds: IDS,
          navigate: (id) => void navigated.push(id),
          presenterId: 'P-1',
        });
  presenter?.setPopup(o.popup === 'blocked' ? null : handle);
  const speaker: SpeakerSync = createSpeakerSync({
    window: speakerWin,
    config: parseSyncConfig(o.search, o.options),
    segmentIds: IDS,
    onStatus: (status) => void statuses.push(status),
    onState: (state) => void states.push(state),
    sessionId: 'S-1',
  });
  const made = {
    lab,
    presenterWin,
    speakerWin,
    handle,
    presenter,
    speaker,
    current,
    navigated,
    states,
    statuses,
    /** The speaker's attempts, as "transport:outcome". */
    attempts: (): string[] => speaker.status.attempts.map((a) => `${a.transport}:${a.outcome}`),
    async start(): Promise<void> {
      speaker.start();
      await drain();
    },
    async show(next: SyncState): Promise<void> {
      current.value = next;
      presenter?.publish();
      await drain();
    },
  };
  rigs.push(made);
  return made;
}
type Rig = ReturnType<typeof rig>;
/** Only what cleanup needs, so that the type of a rig does not depend on the list of rigs. */
const rigs: Array<{ speaker: SpeakerSync; presenter: PresenterSync | undefined }> = [];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  for (const made of rigs.splice(0)) {
    made.speaker.dispose();
    made.presenter?.dispose();
  }
  vi.useRealTimers();
});

/** The counter of a recorded message, if it has one: what a test forged through the channel (a string, null, an array) has none. */
const seqOf = (message: unknown): number[] => {
  const seq = (message as { seq?: unknown } | null | undefined)?.seq;
  return typeof seq === 'number' && Number.isFinite(seq) ? [seq] : [];
};
const lastSeq = (r: Rig, via: TransportName): number => Math.max(0, ...r.lab.sent(via, 'presenter').flatMap(seqOf));
/**
 * A state from the presenter. The presenter is P-1 unless a third argument says otherwise, and it says it even when it says `undefined`:
 * a default parameter would turn a forged message with NO presenter into a genuine one.
 */
const stateMessage = (seq: unknown, state: unknown, ...from: [] | [presenter: unknown]): Record<string, unknown> =>
  wire({ type: 'state', from: 'presenter', presenter: from.length === 0 ? 'P-1' : from[0], seq, state });

type BroadcastChannelLike = new (name: string) => { postMessage(data: unknown): void; close(): void };
/** Puts a message in front of the speaker over one transport, the way a peer that is not the presenter instance would. */
const FORGE: Record<TransportName, (r: Rig, data: unknown) => Promise<void>> = {
  async broadcastchannel(r, data) {
    const channel = new (r.presenterWin.BroadcastChannel as unknown as BroadcastChannelLike)(CHANNEL_NAME);
    channel.postMessage(data);
    channel.close();
    await drain();
  },
  async postmessage(r, data) {
    r.lab.inject(r.speakerWin, { data, origin: ORIGIN, source: r.speakerWin.opener });
    await drain();
  },
  async storage(r, data) {
    r.lab.injectStorage(r.speakerWin, { key: STORAGE_KEYS.toSpeaker, newValue: JSON.stringify(data) });
    await drain();
  },
};

// ---------------------------------------------------------------------------------------------------------------------
describe('the configuration', () => {
  it('asks for nothing by default: no failure forced, one way, the default timeout', () => {
    const config = parseSyncConfig('');
    expect(config.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect([...config.fail]).toEqual([]);
    expect(config.twoWay).toBe(false);
    expect(parseSyncConfig(null)).toEqual(config);
    expect(parseSyncConfig(undefined)).toEqual(config);
  });

  it('reads the failure hooks, the timeout and the two-way switch from the URL, with or without the question mark', () => {
    for (const search of ['?sync-fail=broadcastchannel,postmessage&sync-timeout=250&sync-two-way=1', 'sync-fail=broadcastchannel,postmessage&sync-timeout=250&sync-two-way=1']) {
      const config = parseSyncConfig(search);
      expect([...config.fail].sort()).toEqual(['broadcastchannel', 'postmessage']);
      expect(config.timeoutMs).toBe(250);
      expect(config.twoWay).toBe(true);
    }
    expect([...parseSyncConfig('?sync-fail=all').fail].sort()).toEqual(['broadcastchannel', 'postmessage', 'storage']);
    expect([...parseSyncConfig('?sync-fail=storage').fail]).toEqual(['storage']);
  });

  it('ignores what it does not know instead of guessing', () => {
    expect([...parseSyncConfig('?sync-fail=bogus,,').fail]).toEqual([]);
    expect([...parseSyncConfig('?sync-fail=BroadcastChannel').fail]).toEqual([]);
    for (const timeout of ['abc', '-5', '0', '1.5', '', 'NaN', 'Infinity']) {
      expect(parseSyncConfig(`?sync-timeout=${timeout}`).timeoutMs, timeout).toBe(DEFAULT_TIMEOUT_MS);
    }
    expect(parseSyncConfig('?sync-timeout=99999999').timeoutMs).toBe(30_000);
    for (const value of ['0', 'false', 'yes', '']) expect(parseSyncConfig(`?sync-two-way=${value}`).twoWay, value).toBe(false);
    expect(parseSyncConfig('?sync-two-way=true').twoWay).toBe(true);
  });

  it('takes options as well, and where the two meet the failure hooks add up and the options say the timeout', () => {
    const options = parseSyncConfig('', { timeoutMs: 40, fail: ['storage'], twoWay: true });
    expect(options.timeoutMs).toBe(40);
    expect([...options.fail]).toEqual(['storage']);
    expect(options.twoWay).toBe(true);
    expect([...parseSyncConfig('', { fail: 'all' }).fail].sort()).toEqual([...TRANSPORTS].sort());

    const both = parseSyncConfig('?sync-fail=broadcastchannel&sync-timeout=900', { fail: ['storage'], timeoutMs: 40 });
    expect([...both.fail].sort()).toEqual(['broadcastchannel', 'storage']);
    expect(both.timeoutMs).toBe(40);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the target origin of a postMessage (F40-F42, F48, C2)', () => {
  const win = (shape: { origin?: unknown; locationOrigin?: unknown; href?: string }): SyncWindow =>
    ({ origin: shape.origin, location: { origin: shape.locationOrigin, href: shape.href }, addEventListener() {}, removeEventListener() {} }) as unknown as SyncWindow;

  it('is the origin of the page itself', () => {
    expect(targetOriginFor(win({ origin: ORIGIN, locationOrigin: ORIGIN }))).toBe(ORIGIN);
  });

  it('is "*" when window.origin is "null", and only then', () => {
    expect(targetOriginFor(win({ origin: 'null', locationOrigin: ORIGIN }))).toBe('*');
    expect(targetOriginFor(win({ origin: 'null', locationOrigin: 'null' }))).toBe('*');
    for (const origin of [ORIGIN, 'file://', 'http://localhost:5173', undefined, '', 42, null, 'NULL', ' null', 'null ']) {
      for (const locationOrigin of [ORIGIN, 'null', undefined, '']) {
        expect(targetOriginFor(win({ origin, locationOrigin })) === '*', `${String(origin)} / ${String(locationOrigin)}`).toBe(origin === 'null');
      }
    }
  });

  it('is not "*" just because the page was loaded from a blob: URL', () => {
    expect(targetOriginFor(win({ origin: ORIGIN, locationOrigin: ORIGIN, href: 'blob:https://spa.test/7d6a-11' }))).toBe(ORIGIN);
    expect(targetOriginFor(win({ origin: ORIGIN, locationOrigin: 'null', href: 'blob:null/7d6a-11' }))).toBe(ORIGIN);
  });

  it('falls back to the location when the engine has no window.origin, and to "/" when it cannot tell', () => {
    expect(targetOriginFor(win({ origin: undefined, locationOrigin: ORIGIN }))).toBe(ORIGIN);
    expect(targetOriginFor(win({ origin: 42, locationOrigin: ORIGIN }))).toBe(ORIGIN);
    // "null" in location.origin does not say that the document is opaque, so it never buys a "*".
    expect(targetOriginFor(win({ origin: undefined, locationOrigin: 'null' }))).toBe('/');
    expect(targetOriginFor(win({ origin: undefined, locationOrigin: undefined }))).toBe('/');
    expect(targetOriginFor(win({ origin: '', locationOrigin: '' }))).toBe('/');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('probing the transports in order, with a handshake each', () => {
  it('tries BroadcastChannel first and stops there when a presenter answers', async () => {
    const r = rig();
    await r.start();
    expect(r.speaker.status).toEqual({ state: 'synchronized', transport: 'broadcastchannel', attempts: [{ transport: 'broadcastchannel', outcome: 'synchronized' }] });
    expect(r.statuses.map((s) => s.state)).toEqual(['connecting', 'synchronized']);
    expect(r.lab.sent('postmessage')).toEqual([]);
    expect(r.lab.traffic.filter((t) => t.via === 'storage')).toEqual([]);
    expect(r.presenter?.active).toEqual(['broadcastchannel']);
  });

  it('does not take an open channel for a handshake: with nobody to answer, it waits out the timeout and moves on, in order', async () => {
    const r = rig({ withPresenter: false, options: { timeoutMs: 100 } });
    await r.start();
    expect(r.speaker.status).toMatchObject({ state: 'connecting', transport: null, attempts: [] });
    await vi.advanceTimersByTimeAsync(99);
    expect(r.speaker.status).toMatchObject({ state: 'connecting', attempts: [] });
    expect(r.lab.sent('postmessage')).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(r.attempts()).toEqual(['broadcastchannel:timeout']);
    expect(r.speaker.status.state).toBe('connecting');
    expect(r.lab.sent('postmessage', 'speaker')).toHaveLength(1);
    expect(r.lab.traffic.filter((t) => t.via === 'storage')).toEqual([]);

    await vi.advanceTimersByTimeAsync(100);
    expect(r.attempts()).toEqual(['broadcastchannel:timeout', 'postmessage:timeout']);
    expect(r.lab.traffic.filter((t) => t.via === 'storage')).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(100);
    expect(r.speaker.status).toEqual({
      state: 'not-synchronized',
      transport: null,
      attempts: [
        { transport: 'broadcastchannel', outcome: 'timeout' },
        { transport: 'postmessage', outcome: 'timeout' },
        { transport: 'storage', outcome: 'timeout' },
      ],
    });
    expect(r.statuses.map((s) => s.state)).toEqual(['connecting', 'not-synchronized']);
    // Nothing is held open and nothing more is sent. The one timer left is the look at the window that opened it, which asks again
    // from time to time (see "recover" in sync.ts) and says nothing unless a presentation answers.
    expect(r.lab.openChannels()).toBe(0);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('uses the default timeout when none is configured', async () => {
    const r = rig({ withPresenter: false });
    await r.start();
    await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS - 1);
    expect(r.attempts()).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(r.attempts()).toEqual(['broadcastchannel:timeout']);
  });

  it('is started once: a second start() neither probes again nor restarts the clock', async () => {
    const r = rig({ withPresenter: false, options: { timeoutMs: 100 } });
    await r.start();
    r.speaker.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(r.attempts()).toEqual(['broadcastchannel:timeout']);
    expect(r.lab.sent('broadcastchannel', 'speaker')).toHaveLength(1);
  });

  it('says what it is trying to say: a hello that carries the handshake and nothing else', async () => {
    const r = rig({ withPresenter: false });
    await r.start();
    const [hello] = r.lab.sent('broadcastchannel', 'speaker');
    expect(hello).toEqual(wire({ type: 'hello', from: 'speaker', session: 'S-1' }));
  });

  it('shows a speaker with nothing to follow yet as connecting, with no transport', () => {
    const r = rig();
    expect(r.speaker.status).toEqual({ state: 'connecting', transport: null, attempts: [] });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the failure hooks (options and the URL)', () => {
  it.each([
    [['broadcastchannel'], 'postmessage'],
    [['broadcastchannel', 'postmessage'], 'storage'],
    [['postmessage'], 'broadcastchannel'],
    [['storage'], 'broadcastchannel'],
    [['postmessage', 'storage'], 'broadcastchannel'],
    [['broadcastchannel', 'storage'], 'postmessage'],
  ] as Array<[TransportName[], TransportName]>)('with %j forced to fail, the first one standing is %s', async (fail, winner) => {
    const r = rig({ options: { fail } });
    await r.start();
    expect(r.speaker.status).toMatchObject({ state: 'synchronized', transport: winner });
    const expected = TRANSPORTS.slice(0, TRANSPORTS.indexOf(winner)).map((t) => `${t}:forced-failure`);
    expect(r.attempts()).toEqual([...expected, `${winner}:synchronized`]);
    for (const failed of fail) {
      if (failed === 'storage') expect(r.lab.traffic.filter((t) => t.via === 'storage'), failed).toEqual([]);
      else expect(r.lab.sent(failed), failed).toEqual([]);
    }
  });

  it('reads the same hooks from the URL', async () => {
    const r = rig({ search: '?sync-fail=broadcastchannel,postmessage' });
    await r.start();
    expect(r.attempts()).toEqual(['broadcastchannel:forced-failure', 'postmessage:forced-failure', 'storage:synchronized']);
  });

  it.each([
    ['in options', { options: { fail: 'all' } }],
    ['in the URL', { search: '?sync-fail=all' }],
  ] as Array<[string, RigOptions]>)('with every transport forced to fail %s, says not-synchronized at once and sends nothing (AC10)', async (_where, options) => {
    const r = rig(options);
    await r.start();
    expect(r.speaker.status).toEqual({
      state: 'not-synchronized',
      transport: null,
      attempts: [
        { transport: 'broadcastchannel', outcome: 'forced-failure' },
        { transport: 'postmessage', outcome: 'forced-failure' },
        { transport: 'storage', outcome: 'forced-failure' },
      ],
    });
    expect(r.statuses.map((s) => s.state)).toEqual(['connecting', 'not-synchronized']);
    expect(r.lab.traffic).toEqual([]);
    expect(r.lab.openChannels()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(r.presenter?.active).toEqual([]);
  });

  it('keeps a transport that is not forced in the running when another is', async () => {
    const r = rig({ options: { fail: ['broadcastchannel'], timeoutMs: 100 } });
    await r.start();
    expect(r.attempts()).toEqual(['broadcastchannel:forced-failure', 'postmessage:synchronized']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the opener and the popup handle are checked when they are used (C3)', () => {
  it.each([
    ['there is no opener', null],
    ['the opener is not a window', {}],
    ['the opener has been closed', { closed: true, postMessage: () => undefined }],
    ['the opener cannot postMessage', { closed: false, postMessage: 1 }],
  ] as Array<[string, unknown]>)('postMessage is unavailable when %s, which costs no timeout', async (_name, opener) => {
    const r = rig({ options: { fail: ['broadcastchannel'], timeoutMs: 5000 } });
    r.speakerWin.opener = opener;
    await r.start(); // no timer is advanced
    expect(r.attempts()).toEqual(['broadcastchannel:forced-failure', 'postmessage:unavailable', 'storage:synchronized']);
  });

  it('ignores a hello over postMessage when it holds no popup handle (the popup was blocked), and the speaker times out of it', async () => {
    const r = rig({ popup: 'blocked', options: { fail: ['broadcastchannel'], timeoutMs: 100 } });
    await r.start();
    expect(r.lab.sent('postmessage', 'speaker')).toHaveLength(1); // the speaker did say hello
    await vi.advanceTimersByTimeAsync(100);
    expect(r.lab.sent('postmessage', 'presenter')).toEqual([]); // and nobody was answered
    expect(r.attempts()).toEqual(['broadcastchannel:forced-failure', 'postmessage:timeout', 'storage:synchronized']);
  });

  it('serves BroadcastChannel and storage with no popup handle at all: a window opened by hand still gets its state', async () => {
    const r = rig({ popup: 'blocked' });
    await r.start();
    expect(r.speaker.status).toMatchObject({ state: 'synchronized', transport: 'broadcastchannel' });
    await r.show(at(1));
    expect(r.states.at(-1)).toEqual(at(1));
  });

  it('does not post to a popup that has been closed, nor throw when posting fails', async () => {
    const r = rig({ options: { fail: ['broadcastchannel'] } });
    await r.start();
    expect(r.speaker.status.transport).toBe('postmessage');
    r.speakerWin.closed = true;
    await expect(r.show(at(1))).resolves.toBeUndefined();
    const sentBefore = r.lab.sent('postmessage', 'presenter').length;
    await r.show(at(2));
    expect(r.lab.sent('postmessage', 'presenter')).toHaveLength(sentBefore);

    const hostile = { closed: false, postMessage: () => { throw new DOMException('no', 'DataCloneError'); } };
    r.presenter?.setPopup(hostile);
    await expect(r.show(at(0))).resolves.toBeUndefined();
    r.presenter?.setPopup({ get closed(): boolean { throw new Error('a dead proxy'); }, postMessage: () => undefined });
    await expect(r.show(at(1))).resolves.toBeUndefined();
  });

  it('follows the handle it is given last: a message from the window it let go is no longer acted on', async () => {
    const r = rig({ options: { fail: ['broadcastchannel'] } });
    const stranger = r.lab.window('stranger');
    const old = r.lab.proxy(r.presenterWin, r.speakerWin);
    r.presenter?.setPopup(r.lab.proxy(r.presenterWin, stranger));
    r.lab.inject(r.presenterWin, { data: wire({ type: 'hello', from: 'speaker', session: 'S-9' }), origin: ORIGIN, source: old });
    await drain();
    expect(r.lab.sent('postmessage', 'presenter')).toEqual([]);
    r.presenter?.setPopup(old);
    r.lab.inject(r.presenterWin, { data: wire({ type: 'hello', from: 'speaker', session: 'S-9' }), origin: ORIGIN, source: old });
    await drain();
    expect(r.lab.sent('postmessage', 'presenter')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe.each(TRANSPORTS)('state over %s', (via) => {
  const hooks = (): SyncOptions => ({ fail: ONLY[via] });

  it('starts from the presenter, follows every change, and counts upwards (AC9)', async () => {
    const r = rig({ options: hooks() });
    r.current.value = at(1, { revealedSteps: 2, timer: { ...TIMER } });
    await r.start();
    expect(r.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    expect(r.states).toEqual([at(1, { revealedSteps: 2, timer: { ...TIMER } })]);

    await r.show(at(2, { revealedSteps: 1 }));
    await r.show(at(0));
    expect(r.states.map((s) => s.segmentIndex)).toEqual([1, 2, 0]);
    expect(r.states.at(-1)).toEqual(at(0));

    const seqs = r.lab.sent(via, 'presenter').map((m) => m.seq as number);
    expect(seqs.length).toBeGreaterThanOrEqual(3);
    for (let i = 1; i < seqs.length; i += 1) expect(seqs[i]).toBeGreaterThan(seqs[i - 1]);
  });

  it('needs no timer to deliver a change, and holds only the look at its opener once synchronized (nothing polls for the state)', async () => {
    const r = rig({ options: hooks() });
    await r.start();
    expect(vi.getTimerCount()).toBe(1); // the look at the window that opened it (WATCH_MS): it reads two properties and sends nothing
    await r.show(at(1)); // no clock advanced: a change is a message, not a wait
    expect(r.states.at(-1)).toEqual(at(1));
    expect(vi.getTimerCount()).toBe(1);
  });

  it('sends a change once, and says nothing when nothing changed', async () => {
    const r = rig({ options: hooks() });
    await r.start();
    const sent = (): number => r.lab.sent(via, 'presenter').length;
    const before = sent();
    await r.show(at(1));
    expect(sent()).toBe(before + 1);
    await r.show(at(1, {}));
    await r.show({ ...at(1) });
    expect(sent()).toBe(before + 1);
    expect(r.states).toHaveLength(2);
  });

  it('applies a counter only when it is greater than the last one applied (stale and duplicate states are ignored)', async () => {
    const r = rig({ options: hooks() });
    await r.start();
    await r.show(at(1));
    const last = lastSeq(r, via);
    const applied = r.states.length;

    for (const seq of [last, last - 1, 0, -3]) await FORGE[via](r, stateMessage(seq, at(2)));
    expect(r.states).toHaveLength(applied);
    expect(r.speaker.status.state).toBe('synchronized');

    await FORGE[via](r, stateMessage(last + 1, at(2)));
    expect(r.states).toHaveLength(applied + 1);
    expect(r.states.at(-1)).toEqual(at(2));

    await FORGE[via](r, stateMessage(last + 1, at(0))); // the same counter again, now a duplicate
    await FORGE[via](r, stateMessage(last, at(0))); // an older one, now stale
    expect(r.states.at(-1)).toEqual(at(2));
    expect(r.states).toHaveLength(applied + 1);
  });

  it('does not take a counter that is not a whole number', async () => {
    const r = rig({ options: hooks() });
    await r.start();
    const last = lastSeq(r, via);
    const applied = r.states.length;
    for (const seq of [last + 0.5, String(last + 10), null, Number.NaN, Number.POSITIVE_INFINITY, undefined, {}, [last + 1], true]) {
      await FORGE[via](r, stateMessage(seq, at(2)));
    }
    expect(r.states).toHaveLength(applied);
  });

  it('follows the presenter it shook hands with, and no other, however high a counter the other offers', async () => {
    const r = rig({ options: hooks() });
    await r.start();
    const applied = r.states.length;
    await FORGE[via](r, stateMessage(lastSeq(r, via) + 100, at(2), 'P-2'));
    await FORGE[via](r, stateMessage(lastSeq(r, via) + 101, at(2), undefined));
    expect(r.states).toHaveLength(applied);
  });

  it('ignores an acknowledgement of a handshake that was not its own', async () => {
    const r = rig({ options: hooks(), withPresenter: false });
    await r.start();
    const ack = wire({ type: 'ack', from: 'presenter', presenter: 'P-X', session: 'S-OTHER', seq: 1, state: at(2) });
    await FORGE[via](r, ack);
    expect(r.states).toEqual([]);
    expect(r.speaker.status.state).toBe('connecting');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('what the speaker will not act on', () => {
  const GOOD = (seq: number): Record<string, unknown> => stateMessage(seq, at(2));
  const BAD: Array<[string, (seq: number) => unknown]> = [
    ['a string', () => 'hello'],
    ['null', () => null],
    ['an array', () => []],
    ['another application', (seq) => ({ ...GOOD(seq), app: 'someone-else' })],
    ['another version of the protocol', (seq) => ({ ...GOOD(seq), v: VERSION + 1 })],
    ['a message of no type', (seq) => ({ ...GOOD(seq), type: undefined })],
    ['a message of a type it does not know', (seq) => ({ ...GOOD(seq), type: 'reboot' })],
    ['a message from the speaker side', (seq) => ({ ...GOOD(seq), from: 'speaker' })],
    ['a state with no state in it', (seq) => ({ ...GOOD(seq), state: undefined })],
    ['a segment that is not in the deck', (seq) => stateMessage(seq, { ...at(2), segmentId: 'nope' })],
    ['an index that does not belong to the id', (seq) => stateMessage(seq, { ...at(2), segmentIndex: 0 })],
    ['an index outside the deck', (seq) => stateMessage(seq, { ...at(2), segmentIndex: 9 })],
    ['a negative reveal count', (seq) => stateMessage(seq, { ...at(2), revealedSteps: -1 })],
    ['a fractional reveal count', (seq) => stateMessage(seq, { ...at(2), revealedSteps: 1.5 })],
    ['a reveal count that is not a number', (seq) => stateMessage(seq, { ...at(2), revealedSteps: '2' })],
    ['an absurd reveal count', (seq) => stateMessage(seq, { ...at(2), revealedSteps: 1e9 })],
    ['a timer in a state there is not', (seq) => stateMessage(seq, { ...at(2), timer: { ...TIMER, state: 'exploding' } })],
    ['a timer with negative time elapsed', (seq) => stateMessage(seq, { ...at(2), timer: { ...TIMER, elapsedMs: -5 } })],
    ['a timer with time that is not a number', (seq) => stateMessage(seq, { ...at(2), timer: { ...TIMER, elapsedMs: 'a while' } })],
    ['a timer that started at nothing a clock reads', (seq) => stateMessage(seq, { ...at(2), timer: { ...TIMER, startedAt: 'now' } })],
    ['a timer with no name', (seq) => stateMessage(seq, { ...at(2), timer: { ...TIMER, id: '' } })],
    ['a state that is a string', (seq) => stateMessage(seq, 'beta')],
  ];

  it.each(BAD)('ignores %s, and says nothing about it', async (_name, make) => {
    const r = rig();
    await r.start();
    const applied = r.states.length;
    const statuses = r.statuses.length;
    await FORGE.broadcastchannel(r, make(lastSeq(r, 'broadcastchannel') + 1));
    expect(r.states).toHaveLength(applied);
    expect(r.statuses).toHaveLength(statuses);
    expect(r.speaker.status.state).toBe('synchronized');
    // and it did not spoil the next good message
    await FORGE.broadcastchannel(r, GOOD(lastSeq(r, 'broadcastchannel') + 1));
    expect(r.states.at(-1)).toEqual(at(2));
  });

  it('accepts a good state, with a timer, as it is', async () => {
    const r = rig();
    await r.start();
    await FORGE.broadcastchannel(r, stateMessage(lastSeq(r, 'broadcastchannel') + 1, at(1, { revealedSteps: 3, timer: { ...TIMER, state: 'paused', startedAt: null } })));
    expect(r.states.at(-1)).toEqual(at(1, { revealedSteps: 3, timer: { ...TIMER, state: 'paused', startedAt: null } }));
  });

  it('takes from a message only the fields it knows, and hands on a state that is not the message', async () => {
    const r = rig();
    await r.start();
    await FORGE.broadcastchannel(r, stateMessage(lastSeq(r, 'broadcastchannel') + 1, { ...at(1), extra: 'cookie=1', timer: null }));
    const state = r.states.at(-1) as unknown as Record<string, unknown>;
    expect(Object.keys(state).sort()).toEqual(['revealedSteps', 'segmentId', 'segmentIndex', 'timer']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('postMessage: origin and source', () => {
  it('posts to the page\'s own origin in both directions, never "*" and never a wildcard by another name', async () => {
    const r = rig({ options: { fail: ['broadcastchannel'] } });
    await r.start();
    await r.show(at(1));
    const posts = r.lab.traffic.filter((t) => t.via === 'postmessage');
    expect(posts.length).toBeGreaterThanOrEqual(3);
    for (const post of posts) expect(post.targetOrigin, `${post.from} -> ${post.to}`).toBe(ORIGIN);
    expect(r.speaker.targetOrigin).toBe(ORIGIN);
    expect(r.presenter?.targetOrigin).toBe(ORIGIN);
  });

  it('is not moved to "*" by a blob: URL', async () => {
    const r = rig({ options: { fail: ['broadcastchannel'] } });
    Object.defineProperty(r.speakerWin.location, 'href', { configurable: true, value: 'blob:https://spa.test/7d6a-11' });
    await r.start();
    for (const post of r.lab.traffic.filter((t) => t.via === 'postmessage')) expect(post.targetOrigin).toBe(ORIGIN);
  });

  describe('the receiver acts only on a message from the window it holds', () => {
    it('the speaker: not on a message from any other window, from none, or from another origin', async () => {
      const r = rig({ options: { fail: ['broadcastchannel'] } });
      await r.start();
      await r.show(at(1));
      const applied = r.states.length;
      const next = lastSeq(r, 'postmessage') + 1;
      const stranger = r.lab.window('iframe');

      r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: ORIGIN, source: r.lab.proxy(r.speakerWin, stranger) });
      r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: ORIGIN, source: null });
      r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: ORIGIN, source: r.speakerWin });
      r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: 'https://evil.test', source: r.speakerWin.opener });
      await drain();
      expect(r.states).toHaveLength(applied);

      r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: ORIGIN, source: r.speakerWin.opener });
      await drain();
      expect(r.states.at(-1)).toEqual(at(2));
    });

    it('the presenter: not on a hello or a request to move that came from another window, and not by replying to it', async () => {
      const r = rig({ options: { fail: ['broadcastchannel'], twoWay: true } });
      const request = (segmentId: string): Record<string, unknown> => wire({ type: 'navigate', from: 'speaker', session: 'S-1', seq: 1, segmentId });
      // The handshake of the window it holds is answered, once.
      r.lab.inject(r.presenterWin, { data: wire({ type: 'hello', from: 'speaker', session: 'S-1' }), origin: ORIGIN, source: r.handle });
      await drain();
      expect(r.lab.sent('postmessage', 'presenter')).toHaveLength(1);
      expect(r.presenter?.active).toEqual(['postmessage']);

      // Everything else, in the right shape and with the session it knows, is not acted on.
      const stranger = r.lab.proxy(r.presenterWin, r.lab.window('iframe'));
      for (const data of [wire({ type: 'hello', from: 'speaker', session: 'S-9' }), request('beta')]) {
        r.lab.inject(r.presenterWin, { data, origin: ORIGIN, source: stranger });
        r.lab.inject(r.presenterWin, { data, origin: ORIGIN, source: null });
        r.lab.inject(r.presenterWin, { data, origin: ORIGIN, source: r.presenterWin });
        r.lab.inject(r.presenterWin, { data, origin: 'https://evil.test', source: r.handle });
      }
      await drain();
      expect(r.lab.sent('postmessage', 'presenter')).toHaveLength(1); // no reply to any of them
      expect(r.navigated).toEqual([]);

      r.lab.inject(r.presenterWin, { data: request('beta'), origin: ORIGIN, source: r.handle });
      await drain();
      expect(r.navigated).toEqual(['beta']);
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('an opaque origin (a sandboxed document; a page from a file: URL where the engine says so)', () => {
  it('goes past BroadcastChannel, which reaches nobody, and over postMessage with "*", and never touches storage', async () => {
    const r = rig({ presenter: { opaque: true }, options: { timeoutMs: 100 } });
    await r.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(r.attempts()).toEqual(['broadcastchannel:timeout', 'postmessage:synchronized']);
    expect(r.speaker.targetOrigin).toBe('*');
    expect(r.presenter?.targetOrigin).toBe('*');
    await r.show(at(1, { revealedSteps: 1 }));
    expect(r.states.at(-1)).toEqual(at(1, { revealedSteps: 1 }));
    const posts = r.lab.traffic.filter((t) => t.via === 'postmessage');
    expect(posts.length).toBeGreaterThanOrEqual(3);
    for (const post of posts) expect(post.targetOrigin).toBe('*');
    expect(r.lab.traffic.filter((t) => t.via === 'storage')).toEqual([]);
    expect(r.presenterWin.keysInStorage()).toEqual([]);
  });

  it('sends nothing but presentation state, to a window that anyone could be listening in on', async () => {
    const r = rig({ presenter: { opaque: true }, options: { fail: ['broadcastchannel'], twoWay: true } });
    r.current.value = at(1, { revealedSteps: 2, timer: { ...TIMER } });
    await r.start();
    await r.show(at(2, { timer: { ...TIMER, state: 'paused', startedAt: null } }));
    expect(r.speaker.navigate('alpha')).toBe(true);
    await drain();

    const keys = new Map<string, string[]>();
    for (const post of r.lab.traffic) {
      const data = post.data as Record<string, unknown>;
      keys.set(String(data.type), Object.keys(data).sort());
      const state = data.state as Record<string, unknown> | undefined;
      if (state !== undefined) {
        expect(Object.keys(state).sort()).toEqual(['revealedSteps', 'segmentId', 'segmentIndex', 'timer']);
        if (state.timer !== null) expect(Object.keys(state.timer as object).sort()).toEqual(['elapsedMs', 'id', 'startedAt', 'state']);
      }
    }
    expect(keys.get('hello')).toEqual(['app', 'from', 'session', 'type', 'v']);
    expect(keys.get('ack')).toEqual(['app', 'from', 'presenter', 'seq', 'session', 'state', 'type', 'v']);
    expect(keys.get('state')).toEqual(['app', 'from', 'presenter', 'seq', 'state', 'type', 'v']);
    expect(keys.get('navigate')).toEqual(['app', 'from', 'segmentId', 'seq', 'session', 'to', 'type', 'v']);
    // `to` is the name of the presentation that the speaker follows, which the presentation has said about itself in every ack: no more than that
    const sent = r.lab.traffic.map((t) => t.data as Record<string, unknown>);
    expect(sent.find((data) => data.type === 'navigate')?.to).toBe(sent.find((data) => data.type === 'ack')?.presenter);
    expect(JSON.stringify(r.lab.traffic.map((t) => t.data))).not.toMatch(/cookie|token|password|secret|authorization|credential|href|url/i);
  });

  it('leans on the source: a message in the right shape from any other window is not acted on, and neither is one from another origin', async () => {
    const r = rig({ presenter: { opaque: true }, options: { fail: ['broadcastchannel'] } });
    await r.start();
    const applied = r.states.length;
    const next = lastSeq(r, 'postmessage') + 1;
    const stranger = r.lab.proxy(r.speakerWin, r.lab.window('iframe', { opaque: true }));
    r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: 'null', source: stranger });
    r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: 'null', source: null });
    r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: 'https://evil.test', source: r.speakerWin.opener });
    await drain();
    expect(r.states).toHaveLength(applied);
    r.lab.inject(r.speakerWin, { data: stateMessage(next, at(2)), origin: 'null', source: r.speakerWin.opener });
    await drain();
    expect(r.states.at(-1)).toEqual(at(2));

    const hello = wire({ type: 'hello', from: 'speaker', session: 'S-7' });
    const before = r.lab.sent('postmessage', 'presenter').length;
    r.lab.inject(r.presenterWin, { data: hello, origin: 'null', source: r.lab.proxy(r.presenterWin, r.lab.window('iframe', { opaque: true })) });
    await drain();
    expect(r.lab.sent('postmessage', 'presenter')).toHaveLength(before);
  });

  it('is not the same as a same-origin pair that merely says so: a "*" is for the opaque case alone', async () => {
    const r = rig({ presenter: { origin: ORIGIN }, options: { fail: ['broadcastchannel'] } });
    await r.start();
    expect(r.lab.traffic.some((t) => t.targetOrigin === '*')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('localStorage', () => {
  const STORAGE_ONLY: SyncOptions = { fail: ['broadcastchannel', 'postmessage'] };

  it.each([
    ['the getter throws a SecurityError', 'getter-throws', 'storage:unavailable'],
    ['there is no localStorage', 'absent', 'storage:unavailable'],
    ['setItem throws', 'set-throws', 'storage:send-failed'],
    ['getItem throws', 'get-throws', 'storage:synchronized'],
    ['removeItem throws', 'remove-throws', 'storage:synchronized'],
  ] as const)('when %s, nothing throws out of a guard and the outcome is the honest one', async (_what, mode, outcome) => {
    const r = rig({ presenter: { storage: mode }, speaker: { storage: mode }, options: STORAGE_ONLY });
    await r.start();
    expect(r.attempts().at(-1)).toBe(outcome);
    await expect(r.show(at(1))).resolves.toBeUndefined();
    expect(() => r.speaker.dispose()).not.toThrow();
    expect(() => r.presenter?.dispose()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is not unavailable on the presenter\'s side only: a presenter that cannot reach its storage leaves the speaker to time out', async () => {
    const r = rig({ presenter: { storage: 'getter-throws' }, options: { ...STORAGE_ONLY, timeoutMs: 100 } });
    await r.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(r.attempts()).toEqual(['broadcastchannel:forced-failure', 'postmessage:forced-failure', 'storage:timeout']);
    expect(r.speaker.status.state).toBe('not-synchronized');
  });

  it('does not take its own write for an answer: the storage event never reaches the writer, so only a peer completes the handshake', async () => {
    const r = rig({ withPresenter: false, options: { ...STORAGE_ONLY, timeoutMs: 100 } });
    await r.start();
    const writes = r.lab.traffic.filter((t) => t.via === 'storage');
    expect(writes).toHaveLength(1);
    expect(writes[0].data).toEqual(wire({ type: 'hello', from: 'speaker', session: 'S-1' }));
    await vi.advanceTimersByTimeAsync(100);
    expect(r.speaker.status).toMatchObject({ state: 'not-synchronized' });
    expect(r.attempts().at(-1)).toBe('storage:timeout');
  });

  it('ignores a storage event that is about another key, that removed the value, or that holds no message', async () => {
    const r = rig({ options: STORAGE_ONLY });
    await r.start();
    const applied = r.states.length;
    const ok = JSON.stringify(stateMessage(lastSeq(r, 'storage') + 1, at(2)));
    r.lab.injectStorage(r.speakerWin, { key: 'something-else', newValue: ok });
    r.lab.injectStorage(r.speakerWin, { key: null, newValue: null });
    r.lab.injectStorage(r.speakerWin, { key: STORAGE_KEYS.toSpeaker, newValue: null });
    r.lab.injectStorage(r.speakerWin, { key: STORAGE_KEYS.toSpeaker, newValue: '{not json' });
    r.lab.injectStorage(r.speakerWin, { key: STORAGE_KEYS.toSpeaker, newValue: '"just a string"' });
    r.lab.injectStorage(r.speakerWin, { key: STORAGE_KEYS.toPresenter, newValue: ok });
    await drain();
    expect(r.states).toHaveLength(applied);
    r.lab.injectStorage(r.speakerWin, { key: STORAGE_KEYS.toSpeaker, newValue: ok });
    await drain();
    expect(r.states.at(-1)).toEqual(at(2));
  });

  it('removes the keys it wrote when it goes', async () => {
    const r = rig({ options: STORAGE_ONLY });
    await r.start();
    await r.show(at(1));
    expect(r.presenterWin.keysInStorage().sort()).toEqual([STORAGE_KEYS.toPresenter, STORAGE_KEYS.toSpeaker].sort());
    r.speaker.dispose();
    r.presenter?.dispose();
    expect(r.presenterWin.keysInStorage()).toEqual([]);
  });

  it('is not fooled by a message left in storage by an earlier presenter: a new speaker waits for an answer to its own hello', async () => {
    const r = rig({ withPresenter: false, options: { ...STORAGE_ONLY, timeoutMs: 100 } });
    r.presenterWin.storageObject?.setItem(STORAGE_KEYS.toSpeaker, JSON.stringify(wire({ type: 'ack', from: 'presenter', presenter: 'OLD', session: 'S-OLD', seq: 99, state: at(2) })));
    await r.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(r.states).toEqual([]);
    expect(r.speaker.status.state).toBe('not-synchronized');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('one way by default, two way on request', () => {
  it('has the speaker send nothing to move the presenter by default', async () => {
    const r = rig();
    await r.start();
    expect(r.speaker.navigate('beta')).toBe(false);
    await drain();
    expect(r.lab.sent('broadcastchannel', 'speaker').map((m) => m.type)).toEqual(['hello']);
    expect(r.navigated).toEqual([]);
  });

  it('has the presenter ignore a request to move that arrives anyway, whoever sends it', async () => {
    const r = rig();
    await r.start();
    await FORGE.broadcastchannel(r, wire({ type: 'navigate', from: 'speaker', session: 'S-1', seq: 1, segmentId: 'beta' }));
    expect(r.navigated).toEqual([]);
  });

  it.each(TRANSPORTS)('lets the speaker move the presenter over %s when both sides asked for it', async (via) => {
    const r = rig({ options: { fail: ONLY[via], twoWay: true } });
    await r.start();
    expect(r.speaker.navigate('beta')).toBe(true);
    await drain();
    expect(r.navigated).toEqual(['beta']);
    expect(r.speaker.navigate('gamma')).toBe(true);
    await drain();
    expect(r.navigated).toEqual(['beta', 'gamma']);
  });

  it('is only a request: the speaker follows the presenter, who moves when the application says so', async () => {
    const r = rig({ options: { twoWay: true } });
    await r.start();
    r.speaker.navigate('gamma');
    await drain();
    expect(r.states.at(-1)).toEqual(at(0)); // nothing moved yet
    await r.show(at(2)); // the application did it, and said so
    expect(r.states.at(-1)).toEqual(at(2));
  });

  it('refuses to send a request for a segment that is not in the deck, and to act on one', async () => {
    const r = rig({ options: { twoWay: true } });
    await r.start();
    expect(r.speaker.navigate('nope')).toBe(false);
    expect(r.speaker.navigate('')).toBe(false);
    await FORGE.broadcastchannel(r, wire({ type: 'navigate', from: 'speaker', session: 'S-1', seq: 5, segmentId: 'nope' }));
    expect(r.navigated).toEqual([]);
  });

  it('applies a request once: a stale or duplicate counter, or a handshake it does not know, is ignored', async () => {
    const r = rig({ options: { twoWay: true } });
    await r.start();
    // the session is always said, even when it is `undefined`: a default would make a request with no handshake a request of this one
    const request = (seq: unknown, session: unknown, segmentId = 'beta') => wire({ type: 'navigate', from: 'speaker', session, seq, segmentId });
    await FORGE.broadcastchannel(r, request(5, 'S-1'));
    expect(r.navigated).toEqual(['beta']);
    await FORGE.broadcastchannel(r, request(5, 'S-1', 'gamma'));
    await FORGE.broadcastchannel(r, request(4, 'S-1', 'gamma'));
    await FORGE.broadcastchannel(r, request(0, 'S-1', 'gamma'));
    await FORGE.broadcastchannel(r, request('9', 'S-1', 'gamma'));
    await FORGE.broadcastchannel(r, request(6, 'S-NOT-MINE', 'gamma'));
    await FORGE.broadcastchannel(r, request(6, undefined, 'gamma'));
    expect(r.navigated).toEqual(['beta']);
    await FORGE.broadcastchannel(r, request(6, 'S-1', 'gamma'));
    expect(r.navigated).toEqual(['beta', 'gamma']);
  });

  it('keeps one way when only the speaker asked for two: the presenter decides', async () => {
    const r = rig({ options: { twoWay: true }, presenterOptions: { twoWay: false } });
    await r.start();
    r.speaker.navigate('beta');
    await drain();
    expect(r.navigated).toEqual([]);
  });

  it('cannot move anything before it is synchronized', async () => {
    const r = rig({ options: { twoWay: true, fail: 'all' } });
    await r.start();
    expect(r.speaker.navigate('beta')).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('lifecycle (a window that is closed leaves nothing behind)', () => {
  it.each(TRANSPORTS)('releases every channel, listener, timer and key of %s on dispose, twice over without harm', async (via) => {
    const r = rig({ options: { fail: ONLY[via] } });
    await r.start();
    await r.show(at(1));
    r.speaker.dispose();
    expect(r.speakerWin.listenerCount('message')).toBe(0);
    expect(r.speakerWin.listenerCount('storage')).toBe(0);
    expect(r.lab.openChannels(CHANNEL_NAME)).toBe(ONLY[via].includes('broadcastchannel') ? 0 : 1); // the presenter's own, where it opened one
    r.presenter?.dispose();
    r.presenter?.dispose();
    r.speaker.dispose();
    expect(r.presenterWin.listenerCount('message')).toBe(0);
    expect(r.presenterWin.listenerCount('storage')).toBe(0);
    expect(r.lab.openChannels()).toBe(0);
    expect(r.presenterWin.keysInStorage()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a probe that is still waiting: no later attempt, no later status', async () => {
    const r = rig({ withPresenter: false, options: { timeoutMs: 100 } });
    await r.start();
    const statuses = r.statuses.length;
    r.speaker.dispose();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(r.statuses).toHaveLength(statuses);
    expect(r.lab.sent('postmessage')).toEqual([]);
    expect(r.lab.openChannels()).toBe(0);
  });

  it('does not start after it was disposed', async () => {
    const r = rig();
    r.speaker.dispose();
    await r.start();
    expect(r.lab.traffic).toEqual([]);
    expect(r.statuses).toEqual([]);
  });

  it('ignores what arrives after dispose, and does not publish or navigate', async () => {
    const r = rig({ options: { twoWay: true } });
    await r.start();
    r.speaker.dispose();
    const applied = r.states.length;
    await r.show(at(1));
    expect(r.states).toHaveLength(applied);
    expect(r.speaker.navigate('beta')).toBe(false);

    r.presenter?.dispose();
    const sent = r.lab.traffic.length;
    await r.show(at(2));
    expect(r.lab.traffic).toHaveLength(sent);
  });

  it('says nothing on the wire before a speaker has said hello', async () => {
    const r = rig();
    await r.show(at(1));
    await r.show(at(2));
    expect(r.lab.traffic).toEqual([]);
    expect(r.presenter?.active).toEqual([]);
  });

  it('survives a BroadcastChannel that cannot be constructed, and one that is not there at all', async () => {
    for (const broadcast of ['throws', false] as const) {
      const r = rig({ presenter: { broadcast }, speaker: { broadcast }, options: { timeoutMs: 100 } });
      await r.start();
      expect(r.attempts()).toEqual(['broadcastchannel:unavailable', 'postmessage:synchronized']);
      await r.show(at(1));
      expect(r.states.at(-1)).toEqual(at(1));
    }
  });
});

describe('QA round 1: simultaneous presentations on the same origin', () => {
  function competingPresenters(via: 'broadcastchannel' | 'storage', twoWay = false) {
    const lab = new Lab();
    const unrelatedWin = lab.window('unrelated-presentation');
    const ownerWin = lab.window('opening-presentation');
    const popup = lab.popup(ownerWin, 'owned-speaker');
    const config = parseSyncConfig('', { fail: ONLY[via], twoWay });
    const ownerState = { value: at(0) };
    const ownerMoves: string[] = [];
    const unrelatedMoves: string[] = [];
    const states: SyncState[] = [];

    // Open the unrelated presentation first, as happens when an older rehearsal tab
    // remains open. Both instances use the real transport and its real handshake.
    const unrelated = createPresenterSync({
      window: unrelatedWin,
      config,
      segmentIds: IDS,
      snapshot: () => at(0),
      navigate: (id) => void unrelatedMoves.push(id),
      presenterId: 'unrelated-presenter',
    });
    const owner = createPresenterSync({
      window: ownerWin,
      config,
      segmentIds: IDS,
      snapshot: () => ownerState.value,
      navigate: (id) => void ownerMoves.push(id),
      presenterId: 'opening-presenter',
    });
    owner.setPopup(popup.handle);
    const speaker = createSpeakerSync({
      window: popup.window,
      config,
      segmentIds: IDS,
      onStatus: () => undefined,
      onState: (state) => void states.push(state),
      sessionId: 'owned-speaker-session',
    });
    rigs.push({ speaker, presenter: owner }, { speaker, presenter: unrelated });
    return { speaker, owner, ownerState, states, ownerMoves, unrelatedMoves };
  }

  it.each(['broadcastchannel', 'storage'] as const)(
    'QA R1: advancing the opening presentation still reaches its speaker over %s when another presentation is open',
    async (via) => {
      const r = competingPresenters(via);
      r.speaker.start();
      await drain();
      expect(r.speaker.status.state).toBe('synchronized');

      r.ownerState.value = at(1);
      r.owner.publish();
      await drain();

      expect(r.states.at(-1)).toEqual(at(1));
    },
  );

  it.each(['broadcastchannel', 'storage'] as const)(
    'QA R1: opt-in two-way navigation over %s does not move an unrelated presentation',
    async (via) => {
      const r = competingPresenters(via, true);
      r.speaker.start();
      await drain();
      expect(r.speaker.navigate('beta')).toBe(true);
      await drain();

      expect(r.ownerMoves).toEqual(['beta']);
      expect(r.unrelatedMoves).toEqual([]);
    },
  );
});

// ---------------------------------------------------------------------------------------------------------------------
// The class behind QA round 1, F1. BroadcastChannel and `storage` reach EVERY window of the origin, so what pairs a script window
// with the presentation that opened it cannot be the medium. The speaker reads who its opener is (through `window.opener`, which
// only a window of the same origin lets it do) and says so in its hello; a presentation answers a hello that names it, or names
// no one, and nothing else. These walk each way the two can meet: which presentation is the older, one script window or two, a
// hello that is forged, a speaker that has nothing to name, and what the name leaves on the window.
describe('pairing: a speaker follows the presentation that opened it, and no other of the origin', () => {
  type Shared = 'broadcastchannel' | 'storage';
  const SHARED: readonly Shared[] = ['broadcastchannel', 'storage'];
  const MATRIX = [
    ['broadcastchannel', 'an older'],
    ['broadcastchannel', 'a newer'],
    ['storage', 'an older'],
    ['storage', 'a newer'],
  ] as const;

  interface Presentation {
    readonly id: string;
    readonly win: LabWindow;
    readonly sync: PresenterSync;
    readonly moves: string[];
    show(next: SyncState): void;
  }

  const held: Array<{ dispose(): void }> = [];
  afterEach(() => {
    for (const each of held.splice(0)) each.dispose();
  });

  /**
   * Presentations of one origin and the script windows they open, as when a rehearsal tab is left open beside the one that is
   * presented. Only the transport under test stands: postMessage, and the shared transport that is not under test, are forced to fail.
   */
  function origin(via: Shared, twoWay = false) {
    const lab = new Lab();
    const config = parseSyncConfig('', { fail: ONLY[via], twoWay });

    function present(id: string): Presentation {
      const win = lab.window(id);
      const shown = { value: at(0) };
      const moves: string[] = [];
      const sync = createPresenterSync({
        window: win,
        config,
        segmentIds: IDS,
        snapshot: () => shown.value,
        navigate: (segment) => void moves.push(segment),
        presenterId: id,
      });
      held.push(sync);
      return {
        id,
        win,
        sync,
        moves,
        show(next) {
          shown.value = next;
          sync.publish();
        },
      };
    }

    /** A speaker on a window that is there already. */
    function listen(win: LabWindow, session: string) {
      const states: SyncState[] = [];
      const speaker = createSpeakerSync({
        window: win,
        config,
        segmentIds: IDS,
        onStatus: () => undefined,
        onState: (state) => void states.push(state),
        sessionId: session,
      });
      held.push(speaker);
      return { speaker, states, win };
    }

    /** The script window of a presentation; or, with none, one that nothing opened: a tab of the user's own, which has no opener. */
    function script(session: string, opener?: Presentation) {
      if (opener === undefined) return listen(lab.window(`${session}-by-hand`), session);
      const popup = lab.popup(opener.win, `${session}-window`);
      opener.sync.setPopup(popup.handle);
      return listen(popup.window, session);
    }

    return { lab, present, script, listen };
  }

  /** What a window of the origin that is none of the presentations puts on a shared transport, toward the presentations. */
  async function say(lab: Lab, via: Shared, message: Record<string, unknown>): Promise<void> {
    const stranger = lab.window(`stranger-${lab.windows.length}`);
    if (via === 'broadcastchannel') {
      const channel = new (stranger.BroadcastChannel as unknown as BroadcastChannelLike)(CHANNEL_NAME);
      channel.postMessage(message);
      channel.close();
    } else {
      stranger.localStorage?.setItem(STORAGE_KEYS.toPresenter, JSON.stringify(message));
    }
    await drain();
  }
  const helloOf = (fields: Record<string, unknown> = {}): Record<string, unknown> => wire({ type: 'hello', from: 'speaker', session: 'S-X', ...fields });
  const everything = (lab: Lab): Array<Record<string, unknown>> => lab.traffic.map((entry) => entry.data as Record<string, unknown>);
  const acks = (lab: Lab): Array<Record<string, unknown>> => everything(lab).filter((message) => message.type === 'ack');
  const whoSpoke = (lab: Lab): string[] =>
    [...new Set(everything(lab).filter((message) => message.from === 'presenter').map((message) => String(message.presenter)))].sort();

  it.each(MATRIX)('over %s, a speaker follows the presentation that opened it, with %s presentation open beside it', async (via, which) => {
    const o = origin(via);
    const early = which === 'an older' ? o.present('rehearsal') : null;
    const live = o.present('live');
    const rehearsal = early ?? o.present('rehearsal');
    const s = o.script('S-live', live);
    s.speaker.start();
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });

    live.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
    rehearsal.show(at(2)); // what the other presentation shows is none of this script window's business
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));

    expect(live.sync.active).toEqual([via]);
    expect(rehearsal.sync.active).toEqual([]);
    expect(whoSpoke(o.lab)).toEqual(['live']); // nothing came from the other: not an acknowledgement, not a state
  });

  it.each(MATRIX)('over %s, with two-way on, a request to move reaches the presentation that opened the speaker and not %s presentation beside it', async (via, which) => {
    const o = origin(via, true);
    const early = which === 'an older' ? o.present('rehearsal') : null;
    const live = o.present('live');
    const rehearsal = early ?? o.present('rehearsal');
    const s = o.script('S-live', live);
    s.speaker.start();
    await drain();

    expect(s.speaker.navigate('beta')).toBe(true);
    await drain();
    expect(live.moves).toEqual(['beta']);
    expect(rehearsal.moves).toEqual([]);
  });

  it.each(SHARED)('over %s, presentations that each opened a script window each keep their own', async (via) => {
    const o = origin(via, true);
    const a = o.present('A');
    const b = o.present('B');
    const sa = o.script('S-A', a);
    const sb = o.script('S-B', b);
    sa.speaker.start();
    sb.speaker.start();
    await drain();
    expect(sa.speaker.status.state).toBe('synchronized');
    expect(sb.speaker.status.state).toBe('synchronized');

    a.show(at(1));
    await drain();
    expect(sa.states.at(-1)).toEqual(at(1));
    expect(sb.states.at(-1)).toEqual(at(0));
    b.show(at(2));
    await drain();
    expect(sb.states.at(-1)).toEqual(at(2));
    expect(sa.states.at(-1)).toEqual(at(1));

    expect(sb.speaker.navigate('gamma')).toBe(true);
    await drain();
    expect(b.moves).toEqual(['gamma']);
    expect(a.moves).toEqual([]);
  });

  describe('what a hello says', () => {
    it.each(SHARED)('over %s, a presentation that it does not name does not answer it, and tells its sender nothing afterwards', async (via) => {
      const o = origin(via);
      const live = o.present('live');
      await say(o.lab, via, helloOf({ to: 'another-presentation' }));
      expect(acks(o.lab)).toEqual([]);
      expect(live.sync.active).toEqual([]);
      live.show(at(1));
      await drain();
      expect(everything(o.lab).filter((message) => message.from === 'presenter')).toEqual([]);
    });

    it.each(SHARED)('over %s, the presentation that it names answers it', async (via) => {
      const o = origin(via);
      const live = o.present('live');
      await say(o.lab, via, helloOf({ to: 'live' }));
      expect(acks(o.lab)).toMatchObject([{ presenter: 'live', session: 'S-X' }]);
      expect(live.sync.active).toEqual([via]);
    });

    it.each(SHARED)('over %s, a hello that names no one is answered by every presentation: a script window opened by hand has no one to name', async (via) => {
      const o = origin(via);
      o.present('rehearsal');
      o.present('live');
      await say(o.lab, via, helloOf());
      expect(acks(o.lab).map((ack) => ack.presenter).sort()).toEqual(['live', 'rehearsal']);
    });

    it.each(SHARED)('over %s, a name that is not a name is not taken for no name at all', async (via) => {
      const o = origin(via);
      const live = o.present('live');
      for (const to of ['', 5, null, ['live'], { id: 'live' }, 'live'.repeat(100)]) await say(o.lab, via, helloOf({ to }));
      expect(acks(o.lab)).toEqual([]);
      expect(live.sync.active).toEqual([]);
    });
  });

  describe('what a request to move says', () => {
    it.each(SHARED)('over %s, a request that names another presentation is not acted on, and one that names this one, or no one, is', async (via) => {
      const o = origin(via, true);
      const live = o.present('live');
      await say(o.lab, via, helloOf()); // answered: the session is one it keeps
      expect(live.sync.active).toEqual([via]);
      const ask = (fields: Record<string, unknown>): Record<string, unknown> => wire({ type: 'navigate', from: 'speaker', session: 'S-X', segmentId: 'beta', ...fields });

      await say(o.lab, via, ask({ seq: 1, to: 'another-presentation' }));
      await say(o.lab, via, ask({ seq: 2, to: 5 }));
      await say(o.lab, via, ask({ seq: 3, to: null }));
      expect(live.moves).toEqual([]);
      await say(o.lab, via, ask({ seq: 4, to: 'live' }));
      await say(o.lab, via, ask({ seq: 5, segmentId: 'gamma' }));
      expect(live.moves).toEqual(['beta', 'gamma']); // and the ones that were not for it did not use up its counters
    });
  });

  describe('what a speaker says, and whom it listens to', () => {
    it.each(SHARED)('over %s, its hello names the presentation that opened it', async (via) => {
      const o = origin(via);
      const s = o.script('S-live', o.present('live'));
      s.speaker.start();
      await drain();
      expect(o.lab.sent(via).find((message) => message.type === 'hello')).toEqual(wire({ type: 'hello', from: 'speaker', session: 'S-live', to: 'live' }));
    });

    it.each(SHARED)('over %s, its hello names no one when it cannot tell who opened it', async (via) => {
      const o = origin(via);
      // a tab of the user's own: no opener
      o.script('S-hand').speaker.start();
      // a window that a page opened that has no presentation on it
      o.listen(o.lab.popup(o.lab.window('some-page'), 'S-page-window').window, 'S-page').speaker.start();
      // an opener that cannot be read, as a window of another origin cannot: every property but the two a handle always has throws
      const refusing = new Proxy({ closed: false, postMessage: (): void => undefined } as Record<string | symbol, unknown>, {
        get(target, key) {
          if (key === 'closed' || key === 'postMessage') return target[key];
          throw new DOMException('Blocked a frame from accessing a cross-origin frame.', 'SecurityError');
        },
      });
      const odd = o.lab.window('S-odd-window');
      odd.opener = refusing;
      o.listen(odd, 'S-odd').speaker.start();
      // an opener whose name is not a name: a number, nothing, a list, one too long to be taken
      const sessions = ['S-hand', 'S-odd', 'S-page'];
      for (const [index, name] of [5, '', null, ['live'], 'live'.repeat(100)].entries()) {
        const win = o.lab.window(`S-name-${index}-window`);
        win.opener = { closed: false, postMessage: (): void => undefined, [PRESENTER_KEY]: name };
        o.listen(win, `S-name-${index}`).speaker.start();
        sessions.push(`S-name-${index}`);
      }
      await drain();

      const hellos = o.lab.sent(via).filter((message) => message.type === 'hello');
      expect(hellos.map((message) => message.session).sort()).toEqual(sessions.sort());
      for (const hello of hellos) expect(Object.keys(hello)).not.toContain('to');
    });

    it.each(SHARED)('over %s, takes the acknowledgement of the presentation that opened it and not that of another', async (via) => {
      const r = rig({ withPresenter: false, options: { fail: ONLY[via], timeoutMs: 100 } });
      Object.defineProperty(r.presenterWin, PRESENTER_KEY, { value: 'P-1', configurable: true }); // its opener says who it is, and does not answer
      await r.start();
      const ack = (presenter: string, state: SyncState): Record<string, unknown> =>
        wire({ type: 'ack', from: 'presenter', presenter, session: 'S-1', seq: 1, state });

      await FORGE[via](r, ack('P-2', at(2)));
      expect(r.states).toEqual([]);
      expect(r.speaker.status.state).toBe('connecting');

      await FORGE[via](r, ack('P-1', at(1)));
      expect(r.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
      expect(r.states).toEqual([at(1)]);

      await FORGE[via](r, stateMessage(2, at(2), 'P-2')); // and it stays with the one it took
      expect(r.states).toEqual([at(1)]);
    });

    it.each(SHARED)('over %s, a script window that nothing opened follows the first presentation that answers it, and asks that one alone to move', async (via) => {
      const o = origin(via, true);
      const rehearsal = o.present('rehearsal');
      const live = o.present('live');
      const s = o.script('S-hand'); // a tab of the user's own: no opener, so no one to name
      s.speaker.start();
      await drain();
      expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
      expect(rehearsal.sync.active).toEqual([via]); // the hello named no one, so both answered it
      expect(live.sync.active).toEqual([via]);

      rehearsal.show(at(1));
      live.show(at(2));
      await drain();
      const last = s.states.at(-1)?.segmentIndex;
      expect([1, 2]).toContain(last); // it follows one of them, and not both
      const followed = last === 1 ? rehearsal : live;
      const other = followed === rehearsal ? live : rehearsal;

      expect(s.speaker.navigate('beta')).toBe(true);
      await drain();
      expect(followed.moves).toEqual(['beta']);
      expect(other.moves).toEqual([]); // it answered, and registered the session, and is still not the one that was asked
    });

    it.each(SHARED)('over %s, takes the first acknowledgement there is when nothing says who opened it', async (via) => {
      const r = rig({ withPresenter: false, options: { fail: ONLY[via], timeoutMs: 100 } });
      r.speakerWin.opener = null; // a tab of the user's own
      await r.start();
      await FORGE[via](r, wire({ type: 'ack', from: 'presenter', presenter: 'P-2', session: 'S-1', seq: 1, state: at(2) }));
      expect(r.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
      expect(r.states).toEqual([at(2)]);
    });
  });

  describe('the name a presentation gives itself', () => {
    const named = (win: LabWindow): unknown => Reflect.get(win, PRESENTER_KEY);
    const make = (win: LabWindow, presenterId: string): PresenterSync =>
      createPresenterSync({ window: win, config: parseSyncConfig(''), segmentIds: IDS, snapshot: () => at(0), presenterId });

    it('is on its window while it runs, and is taken away when it is disposed', () => {
      const win = new Lab().window('presentation');
      const sync = make(win, 'live');
      expect(named(win)).toBe('live');
      sync.dispose();
      expect(Object.hasOwn(win, PRESENTER_KEY)).toBe(false);
    });

    it('is not taken away by a presentation that it is no longer the name of', () => {
      const win = new Lab().window('presentation');
      const older = make(win, 'older');
      const newer = make(win, 'newer');
      expect(named(win)).toBe('newer');
      older.dispose();
      expect(named(win)).toBe('newer');
      newer.dispose();
      expect(Object.hasOwn(win, PRESENTER_KEY)).toBe(false);
    });

    it('is a convenience to the script window and no more: a window that will not take it does not stop the presentation from answering', async () => {
      const lab = new Lab();
      const win = lab.window('presentation');
      Object.preventExtensions(win); // a property cannot be added to it
      const config = parseSyncConfig('', { fail: ['postmessage', 'storage'] });
      const presenter = createPresenterSync({ window: win, config, segmentIds: IDS, snapshot: () => at(1), presenterId: 'live' });
      held.push(presenter);
      expect(Object.hasOwn(win, PRESENTER_KEY)).toBe(false);

      const states: SyncState[] = [];
      const speaker = createSpeakerSync({ window: lab.window('script-by-hand'), config, segmentIds: IDS, onStatus: () => undefined, onState: (state) => void states.push(state), sessionId: 'S-1' });
      held.push(speaker);
      speaker.start();
      await drain();
      expect(speaker.status).toMatchObject({ state: 'synchronized', transport: 'broadcastchannel' });
      expect(states).toEqual([at(1)]);
      expect(() => presenter.dispose()).not.toThrow();
    });
  });
});
