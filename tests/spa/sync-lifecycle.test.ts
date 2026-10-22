// The script window and who owns it (specs/005-teaching-spa.md section 2.7, AC9 and AC10), against windows that talk to each other the way
// browser windows do (tests/spa/helpers/sync-doubles.ts).
//
// A script window is not paired with a presentation once, at the handshake, and left that way. The presentation that owns it changes: a second
// presentation opens it again by name, and the browser makes that one its `window.opener`; a presentation is reloaded in place, a new page on the
// same window; one is closed, or reloaded away. The invariant, which the tests here walk from every side: a script window says it is synchronized
// only while it follows the presentation that owns it NOW, and that presentation is there. When that changes it either follows the new owner inside
// the 500 ms that AC9 allows, or it says that it is not synchronized (AC10), with its own navigation on. "Inside 500 ms" is measured on the fake
// clock, a step at a time, and a case that needs no clock at all is checked in turns of the laboratory and nothing else.
//
// What is pinned, over each transport where the transport matters:
//   - claim:   a presentation that is handed a script window that is running says so, with its state. The script window takes it only from the
//              window that is its opener now (on postMessage, `event.source` and the origin; elsewhere the name on that opener), only while it
//              is paired, and not malformed. It forgets the counters of the owner before, shakes hands with the new one by name, and never says
//              that it is anything but synchronized in between. The owner before it can neither move it nor let it go.
//   - bye and watch: a presentation that goes away says goodbye on the transports it was answered on; one that does not is found out by looking
//              at its window (closed, its name gone, another opener). A presentation that is only idle is never given up on, and nothing is sent.
//   - recover: a script window that is not synchronized looks again, quietly: when its window has a new owner, and from time to time otherwise
//              (a wait that doubles to a limit). It asks nobody by name that it cannot name once it has been told a name, and it never opens
//              or tries a transport that is forced to fail.
//   - adopt:   a presentation reloaded in place was never handed the window it opened. A script window that proves, by the name on its own
//              opener, that this presentation opened it, is answered over postMessage, once, and nothing else is.
//   - opaque:  where no name can be read, the window that posted is the whole of the proof; the claim is taken on postMessage alone.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHANNEL_NAME,
  MAX_RETRY_MS,
  PRESENTER_KEY,
  PROTOCOL,
  RETRY_MS,
  SPEAKER_KEY,
  STORAGE_KEYS,
  VERSION,
  WATCH_MS,
  createPresenterSync,
  createSpeakerSync,
  parseSyncConfig,
  type PresenterSync,
  type SpeakerSync,
  type SyncOptions,
  type SyncState,
  type SyncStatus,
  type TransportName,
} from '../../workshop/spa/src/shell/sync';
import { Lab, drain, type LabWindow } from './helpers/sync-doubles';

type Envelope = Record<string, unknown>;

const IDS = ['alpha', 'beta', 'gamma'];
const ORIGIN = 'https://spa.test';
/** What AC9 allows between the presentation moving and the script window showing it. */
const BUDGET_MS = 500;
const TRANSPORTS: readonly TransportName[] = ['broadcastchannel', 'postmessage', 'storage'];
/** The transports that reach every window of the origin, and need no handle on the other window. */
const SHARED = ['broadcastchannel', 'storage'] as const;
/** The failure hooks that make each transport the first one standing. */
const ONLY: Record<TransportName, TransportName[]> = {
  broadcastchannel: [],
  postmessage: ['broadcastchannel'],
  storage: ['broadcastchannel', 'postmessage'],
};
/** The failure hooks that leave each transport the only one standing. */
const ALONE: Record<TransportName, TransportName[]> = {
  broadcastchannel: ['postmessage', 'storage'],
  postmessage: ['broadcastchannel', 'storage'],
  storage: ['broadcastchannel', 'postmessage'],
};

const at = (index: number): SyncState => ({ segmentIndex: index, segmentId: IDS[index], revealedSteps: 0, timer: null });
const wire = (fields: Envelope): Envelope => ({ app: PROTOCOL, v: VERSION, ...fields });
const claim = (presenter: unknown, seq: unknown, state: unknown): Envelope => wire({ type: 'claim', from: 'presenter', presenter, seq, state });
const bye = (presenter: unknown): Envelope => wire({ type: 'bye', from: 'presenter', presenter });
const helloOf = (fields: Envelope = {}): Envelope => wire({ type: 'hello', from: 'speaker', session: 'S-1', ...fields });
const sorted = (message: Envelope): string[] => Object.keys(message).sort();

// -- the laboratory -------------------------------------------------------------------------------------------------------------

interface Presentation {
  readonly id: string;
  readonly win: LabWindow;
  readonly sync: PresenterSync;
  /** The requests to move that it acted on. */
  readonly moves: string[];
  /** What it shows. */
  readonly shown: { value: SyncState };
  show(next: SyncState): void;
}

interface Script {
  readonly speaker: SpeakerSync;
  readonly win: LabWindow;
  /** Every state the surface was given, oldest first. */
  readonly states: SyncState[];
  /** Every status the surface was told, oldest first. */
  readonly statuses: SyncStatus[];
  /** What the statuses said, in order: `connecting`, `synchronized`, `not-synchronized`. */
  kinds(): string[];
}

interface WorldOptions {
  /** The transports that are forced to fail, for every window of the world. */
  fail?: readonly TransportName[] | 'all';
  twoWay?: boolean;
  timeoutMs?: number;
  /** Every window has an opaque origin, and a read through the handle of another window throws, as it does in a browser. */
  opaque?: boolean;
}

const held: Array<{ dispose(): void }> = [];

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  for (const each of held.splice(0).reverse()) each.dispose();
  vi.useRealTimers();
});

/** One origin, its presentations, the script windows they open and the user's own tabs. */
function world(o: WorldOptions = {}) {
  const lab = new Lab();
  const opaque = o.opaque === true;
  lab.throwOnCrossOrigin = opaque;
  const options: SyncOptions = { fail: o.fail ?? [], twoWay: o.twoWay === true, ...(o.timeoutMs === undefined ? {} : { timeoutMs: o.timeoutMs }) };
  const config = parseSyncConfig('', options);

  /** A presentation, on a window of its own or on `on`: the page that is loaded in a window that has one already. */
  function present(id: string, on?: LabWindow): Presentation {
    const win = on ?? lab.window(id, { opaque });
    const shown = { value: at(0) };
    const moves: string[] = [];
    const sync = createPresenterSync({ window: win, config, segmentIds: IDS, snapshot: () => shown.value, navigate: (segment) => void moves.push(segment), presenterId: id });
    held.push(sync);
    return {
      id,
      win,
      sync,
      moves,
      shown,
      show(next) {
        shown.value = next;
        sync.publish();
      },
    };
  }

  /** The surface of a script window that is there already, for the window to be listened on. It is started by the test. */
  function listen(win: LabWindow, session: string): Script {
    const states: SyncState[] = [];
    const statuses: SyncStatus[] = [];
    const speaker = createSpeakerSync({
      window: win,
      config,
      segmentIds: IDS,
      onStatus: (status) => void statuses.push(status),
      onState: (state) => void states.push(state),
      sessionId: session,
    });
    held.push(speaker);
    return { speaker, win, states, statuses, kinds: () => statuses.map((status) => status.state) };
  }

  /** The script window that a presentation opens, and is handed: nothing runs on it yet, so it has nothing to claim. */
  function open(opener: Presentation, session: string): Script {
    const popup = lab.popup(opener.win, `${session}-window`);
    opener.sync.setPopup(popup.handle);
    return listen(popup.window, session);
  }

  /** A script window that no presentation opened and that runs no presentation: opened by a window that has none. */
  function bare(session: string): Script {
    const popup = lab.popup(lab.window(`${session}-opener`, { opaque }), `${session}-window`);
    return listen(popup.window, session);
  }

  /** The browser makes `taker` the opener of the script window, as it does when that presentation opens the window by its name again. */
  function reopen(script: Script, taker: Presentation): void {
    script.win.opener = lab.proxy(script.win, taker.win);
  }

  /** `window.open(url, 'teaching-spa-script')` from `taker`: the window that is there is reused, its opener is `taker` now, and `taker` is handed it. */
  function take(script: Script, taker: Presentation): void {
    reopen(script, taker);
    taker.sync.setPopup(lab.proxy(taker.win, script.win));
  }

  /** The page on `old`'s window is loaded again, in place: with its goodbye (`pagehide`), or without (the page is only gone, and says no more). */
  function reload(old: Presentation, id: string, o: { bye: boolean }): Presentation {
    if (o.bye) old.sync.dispose();
    return present(id, old.win);
  }

  /** Steps the clock 10 ms at a time until `done`, or until `limit` has gone by. How long it took. */
  async function within(done: () => boolean, limit = BUDGET_MS): Promise<number> {
    let elapsed = 0;
    await drain();
    while (!done() && elapsed < limit) {
      await vi.advanceTimersByTimeAsync(10);
      await drain();
      elapsed += 10;
    }
    return elapsed;
  }

  /** The hellos that a script window put on the wire, oldest first. */
  const hellos = (script: Script): Envelope[] =>
    lab.traffic.filter((entry) => entry.from === script.win.name && (entry.data as Envelope).type === 'hello').map((entry) => entry.data as Envelope);

  /**
   * A message that no presentation sent, put in front of a script window over one transport, as a window that is not what it says it is would:
   * on a shared transport from the channel or the storage of a stranger, over postMessage from `source` (the opener, by default) and `origin`.
   */
  async function forge(via: TransportName, script: Script, data: unknown, from: { source?: unknown; origin?: string } = {}): Promise<void> {
    if (via === 'broadcastchannel') {
      const stranger = lab.window(`stranger-${lab.windows.length}`);
      const channel = new (stranger.BroadcastChannel as unknown as new (name: string) => { postMessage(data: unknown): void; close(): void })(CHANNEL_NAME);
      channel.postMessage(data);
      channel.close();
    } else if (via === 'storage') {
      lab.injectStorage(script.win, { key: STORAGE_KEYS.toSpeaker, newValue: JSON.stringify(data) });
    } else {
      lab.inject(script.win, { data, origin: from.origin ?? (opaque ? 'null' : ORIGIN), source: 'source' in from ? from.source : script.win.opener });
    }
    await drain();
  }

  return { lab, config, present, listen, open, bare, reopen, take, reload, within, hellos, forge };
}

/** Two presentations of one origin, A and B, and the script window that A opened, started: over `via`, the first transport standing. */
function paired(via: TransportName, o: { twoWay?: boolean } = {}) {
  const w = world({ fail: ONLY[via], ...o });
  const a = w.present('A');
  const b = w.present('B');
  const s = w.open(a, 'S');
  s.speaker.start();
  return { w, a, b, s };
}

// -- 1. the window is opened again, by name, by another presentation ------------------------------------------------------------

describe.each(TRANSPORTS)('a presentation that is handed the script window that another one has, over %s', (via) => {
  it('is followed at once, in turns of the laboratory and no time, and the script window never says that it is anything but synchronized', async () => {
    const { w, a, b, s } = paired(via);
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    a.show(at(1));
    a.show(at(2));
    await drain();
    expect(s.states.at(-1)).toEqual(at(2));

    b.shown.value = at(1);
    w.take(s, b);
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    expect(s.kinds()).toEqual(['connecting', 'synchronized']);
  });

  it('forgets the counters of the owner before it: the new owner starts again from its own, and is followed from its first state', async () => {
    const { w, a, b, s } = paired(via);
    await drain();
    for (const index of [1, 2, 0, 1]) a.show(at(index)); // the counter of A is past 5
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));

    b.shown.value = at(2);
    w.take(s, b);
    await drain();
    expect(s.states.at(-1)).toEqual(at(2)); // its first state has the counter 1: stale, if A's were still the last that was applied
    b.show(at(0));
    await drain();
    expect(s.states.at(-1)).toEqual(at(0));
    b.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
  });

  it('shakes hands with the new owner, by name, and says nothing more to the one before', async () => {
    const { w, b, s } = paired(via);
    await drain();
    const mark = w.lab.traffic.length;
    w.take(s, b);
    await drain();
    expect(w.hellos(s)).toEqual([
      wire({ type: 'hello', from: 'speaker', session: 'S', to: 'A' }),
      wire({ type: 'hello', from: 'speaker', session: 'S-2', to: 'B' }),
    ]);
    const since = w.lab.traffic.slice(mark).filter((entry) => entry.from === s.win.name);
    expect(since.map((entry) => (entry.data as Envelope).to)).toEqual(['B']);
    if (via === 'postmessage') expect(since.map((entry) => entry.to)).toEqual(['B']); // posted to the window of the new owner, and to no other
  });

  it('is not moved, let go of or answered to by the owner before it: its states, its acknowledgements and its goodbye are nothing to the new pairing', async () => {
    const { w, a, b, s } = paired(via);
    await drain();
    b.shown.value = at(1);
    w.take(s, b);
    await drain();
    const given = s.states.length;
    const said = s.statuses.length;

    a.show(at(2)); // a state with a counter far past the new owner's
    a.sync.dispose(); // and its goodbye
    await drain();
    expect(s.states).toHaveLength(given);
    expect(s.statuses).toHaveLength(said);
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });

    b.show(at(2));
    await drain();
    expect(s.states.at(-1)).toEqual(at(2));
    expect(w.hellos(s)).toHaveLength(2);
  });

  it('moves only the new owner when two-way navigation is on, and never the one before it', async () => {
    const { w, a, b, s } = paired(via, { twoWay: true });
    await drain();
    w.take(s, b);
    await drain();
    expect(s.speaker.navigate('gamma')).toBe(true);
    await drain();
    expect(b.moves).toEqual(['gamma']);
    expect(a.moves).toEqual([]);
    expect(w.lab.sent(via, s.win.name).filter((message) => message.type === 'navigate').map((message) => message.to)).toEqual(['B']);

    a.show(at(1)); // and what the one before it shows does not move the script
    await drain();
    expect(s.states.at(-1)).not.toEqual(at(1));
  });

  it('moves the new owner too when the request is made before the claim was heard: it goes to the owner that is found', async () => {
    const { w, a, b, s } = paired(via, { twoWay: true });
    await drain();
    w.take(s, b);
    expect(s.speaker.navigate('gamma')).toBe(true); // this very turn: the claim is still on its way
    await w.within(() => b.moves.length > 0);
    expect(b.moves).toEqual(['gamma']);
    expect(a.moves).toEqual([]);
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
  });

  it('takes a claim from the owner it follows for a state: no handshake, and no word about it', async () => {
    const { w, a, b, s } = paired(via);
    await drain();
    w.take(s, b);
    await drain();
    const said = s.statuses.length;
    const asked = w.hellos(s).length;

    b.shown.value = at(2);
    b.sync.setPopup(w.lab.proxy(b.win, s.win)); // the window is opened again, by name, from the same presentation
    await drain();
    expect(s.states.at(-1)).toEqual(at(2));
    expect(w.hellos(s)).toHaveLength(asked);
    expect(s.statuses).toHaveLength(said);
    expect(a.moves).toEqual([]);
  });

  it('goes back and forth: each presentation is followed when it has the window, with a handshake of its own each time', async () => {
    const { w, a, b, s } = paired(via);
    await drain();
    for (const [index, owner] of [b, a, b, a].entries()) {
      owner.shown.value = at(index % IDS.length);
      w.take(s, owner);
      await drain();
      expect(s.states.at(-1)).toEqual(at(index % IDS.length));
    }
    expect(w.hellos(s).map((hello) => [hello.session, hello.to])).toEqual([
      ['S', 'A'],
      ['S-2', 'B'],
      ['S-3', 'A'],
      ['S-4', 'B'],
      ['S-5', 'A'],
    ]);
    expect(s.kinds()).toEqual(['connecting', 'synchronized']);
  });

  it('is found out by looking at the window, within the 500 ms, when no claim was heard: the browser made another presentation its opener and that one said nothing', async () => {
    const { w, a, b, s } = paired(via);
    await drain();
    b.shown.value = at(2);
    w.reopen(s, b);
    const took = await w.within(() => s.speaker.status.state === 'synchronized' && s.states.at(-1)?.segmentIndex === 2);
    expect(took).toBeLessThanOrEqual(BUDGET_MS);
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'connecting', 'synchronized']); // it says that it looks
    expect(w.hellos(s).at(-1)).toMatchObject({ to: 'B' });
    a.show(at(0));
    await drain();
    expect(s.states.at(-1)).toEqual(at(2));
  });

  it('is not given another presentation to follow by a window that has no presentation on it: it says that it is not synchronized, and asks no one that it cannot name', async () => {
    const { w, a, s } = paired(via);
    const rehearsal = w.present('R'); // another presentation of the origin, open beside, which would answer a hello that names no one
    await drain();
    const plain = w.lab.window('plain');
    w.reopen(s, { win: plain } as Presentation);
    await vi.advanceTimersByTimeAsync(WATCH_MS);
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(w.hellos(s)).toHaveLength(1);
    expect(rehearsal.sync.active).toEqual([]);

    const owner = w.present('N', plain); // a presentation starts on that window: it is the owner, and has a name
    owner.shown.value = at(2);
    const took = await w.within(() => s.speaker.status.state === 'synchronized');
    expect(took).toBeLessThanOrEqual(BUDGET_MS);
    expect(s.states.at(-1)).toEqual(at(2));
    expect(w.hellos(s).at(-1)).toMatchObject({ to: 'N' });
    expect(rehearsal.sync.active).toEqual([]);
    a.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(2));
  });
});

// -- 2. what is not a claim ----------------------------------------------------------------------------------------------------

describe.each(TRANSPORTS)('a claim that is not from the presentation that owns the window, over %s', (via) => {
  const unchanged = async (s: Script, before: { states: number; statuses: number }, w: ReturnType<typeof world>): Promise<void> => {
    expect(s.states).toHaveLength(before.states);
    expect(s.statuses).toHaveLength(before.statuses);
    expect(w.hellos(s)).toHaveLength(1); // no handshake with a presentation that was not found to own the window
    await Promise.resolve();
  };
  const before = (s: Script): { states: number; statuses: number } => ({ states: s.states.length, statuses: s.statuses.length });

  it('is not taken when it names a presentation that is not the one the opener says it is', async () => {
    const { w, a, s } = paired(via);
    await drain();
    const mark = before(s);
    await w.forge(via, s, claim('B', 1, at(2))); // over postMessage it is the opener that posts it: A, which does not claim to be B
    await unchanged(s, mark, w);
    a.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1)); // it still follows A
  });

  it('is not taken from a presentation that holds a handle on the window and does not own it: the browser never made it the opener', async () => {
    const { w, a, s } = paired(via);
    const c = w.present('C');
    await drain();
    const mark = before(s);
    c.shown.value = at(2);
    c.sync.setPopup(w.lab.proxy(c.win, s.win)); // a script runs there, so it says that the window is its own
    await drain();
    await unchanged(s, mark, w);
    expect(c.sync.active).toEqual([]);
    a.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
  });

  const BAD: Array<[string, Envelope]> = [
    ['no presenter', claim(undefined, 1, at(2))],
    ['a presenter that is not a name', claim(42, 1, at(2))],
    ['an empty presenter', claim('', 1, at(2))],
    ['a presenter name that is far too long', claim('B'.repeat(201), 1, at(2))],
    ['a counter of 0', claim('B', 0, at(2))],
    ['a negative counter', claim('B', -1, at(2))],
    ['a counter that is not a whole number', claim('B', 1.5, at(2))],
    ['a counter that is a string', claim('B', '1', at(2))],
    ['no counter', claim('B', undefined, at(2))],
    ['no state', claim('B', 1, undefined)],
    ['a state that is null', claim('B', 1, null)],
    ['a segment that is not in the deck', claim('B', 1, { ...at(2), segmentId: 'omega' })],
    ['an index that is not the index of its segment', claim('B', 1, { ...at(2), segmentIndex: 0 })],
    ['a reveal count that is not a count', claim('B', 1, { ...at(2), revealedSteps: -1 })],
  ];
  it.each(BAD)('is not taken with %s, though it comes from the presentation that does own the window', async (_name, bad) => {
    const { w, b, s } = paired(via);
    await drain();
    b.shown.value = at(2);
    w.reopen(s, b); // B is its opener now, and has said nothing
    const mark = before(s);
    await w.forge(via, s, bad);
    await unchanged(s, mark, w);

    await w.forge(via, s, claim('B', 1, at(2))); // the same claim, well formed, is taken: it was refused for what it said, and for nothing else
    expect(s.states.at(-1)).toEqual(at(2));
    expect(w.hellos(s).at(-1)).toEqual(wire({ type: 'hello', from: 'speaker', session: 'S-2', to: 'B' }));
  });

  if (via === 'postmessage') {
    const PLACES: Array<[string, (w: ReturnType<typeof world>, s: Script, a: Presentation) => { source?: unknown; origin?: string }]> = [
      ['no window at all', () => ({ source: null })],
      ['the script window itself', (w, s) => ({ source: w.lab.proxy(s.win, s.win) })],
      ['a window that is none of its business', (w, s) => ({ source: w.lab.proxy(s.win, w.lab.window('stranger')) })],
      ['the window of the owner before it', (w, s, a) => ({ source: w.lab.proxy(s.win, a.win) })],
      ['another origin', () => ({ origin: 'https://evil.test' })],
    ];
    it.each(PLACES)('is not taken when it was posted by %s, and is when the window that is the opener posts it', async (_name, from) => {
      const { w, a, b, s } = paired(via);
      await drain();
      b.shown.value = at(2);
      w.reopen(s, b);
      const mark = before(s);
      await w.forge(via, s, claim('B', 1, at(2)), from(w, s, a));
      await unchanged(s, mark, w);
      await w.forge(via, s, claim('B', 1, at(2)));
      expect(s.states.at(-1)).toEqual(at(2));
      expect(w.hellos(s).at(-1)).toMatchObject({ session: 'S-2', to: 'B' });
    });
  } else {
    it('is not taken when the name on the opener cannot be read: nothing says who sent a message on this transport, so nothing is believed', async () => {
      const { w, s } = paired(via);
      await drain();
      const refusing = { closed: false, postMessage: (): void => undefined };
      Object.defineProperty(refusing, PRESENTER_KEY, {
        get(): never {
          throw new DOMException('Blocked a frame with origin from accessing a cross-origin frame.', 'SecurityError');
        },
      });
      s.win.opener = refusing;
      const mark = before(s);
      await w.forge(via, s, claim('A2', 1, at(2)));
      await w.forge(via, s, claim('A', 99, at(2)));
      await unchanged(s, mark, w);
    });
  }

  it('is not taken while the script window is still looking for a presentation, or when it has given up on finding one', async () => {
    const w = world({ fail: ALONE[via], timeoutMs: 100 });
    const s = w.bare('S');
    s.speaker.start();
    await w.forge(via, s, claim('B', 1, at(2))); // looking
    expect(s.states).toEqual([]);
    expect(s.speaker.status.state).toBe('connecting');

    await vi.advanceTimersByTimeAsync(100);
    await drain();
    expect(s.speaker.status.state).toBe('not-synchronized');
    await w.forge(via, s, claim('B', 1, at(2))); // given up
    expect(s.states).toEqual([]);
    expect(s.speaker.status.state).toBe('not-synchronized');
    expect(w.hellos(s)).toHaveLength(1);
  });
});

describe('a claim in an opaque origin, where the name on the opener cannot be read and the window that posted it is all there is to go by', () => {
  function opaquePair(o: { twoWay?: boolean } = {}) {
    const w = world({ fail: ['broadcastchannel'], opaque: true, ...o }); // BroadcastChannel reaches nobody: postMessage is the road
    const a = w.present('A');
    const b = w.present('B');
    const s = w.open(a, 'S');
    s.speaker.start();
    return { w, a, b, s };
  }

  it('is taken over postMessage from the window that is its opener, which is then followed, by name, with no word in between', async () => {
    const { w, a, b, s } = opaquePair({ twoWay: true });
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: 'postmessage' });
    for (const index of [1, 2, 1]) a.show(at(index));
    await drain();

    b.shown.value = at(2);
    w.take(s, b);
    await drain();
    expect(s.states.at(-1)).toEqual(at(2));
    expect(s.kinds()).toEqual(['connecting', 'synchronized']);
    expect(w.hellos(s).at(-1)).toEqual(wire({ type: 'hello', from: 'speaker', session: 'S-2', to: 'B' }));

    expect(s.speaker.navigate('alpha')).toBe(true);
    await drain();
    expect(b.moves).toEqual(['alpha']);
    expect(a.moves).toEqual([]);
    for (const entry of w.lab.traffic) if (entry.via === 'postmessage') expect(entry.targetOrigin).toBe('*');
  });

  it('is not taken from any other window, nor from another origin, and is from the window that is its opener', async () => {
    const { w, a, b, s } = opaquePair();
    await drain();
    b.shown.value = at(2);
    w.reopen(s, b);
    const stranger = w.lab.window('stranger', { opaque: true });
    const given = s.states.length;
    for (const from of [{ source: w.lab.proxy(s.win, stranger) }, { source: w.lab.proxy(s.win, a.win) }, { source: null }, { origin: ORIGIN }]) {
      await w.forge('postmessage', s, claim('B', 1, at(2)), from);
    }
    expect(s.states).toHaveLength(given);
    expect(w.hellos(s)).toHaveLength(1);

    await w.forge('postmessage', s, claim('B', 1, at(2)));
    expect(s.states.at(-1)).toEqual(at(2));
    expect(w.hellos(s)).toHaveLength(2);
  });

  it('is claimed only over postMessage by the presentation, which cannot tell whether a script runs there: nothing goes to a transport that a stranger could read', async () => {
    const { w, b, s } = opaquePair();
    await drain();
    const mark = w.lab.traffic.length;
    w.take(s, b);
    await drain();
    const claims = w.lab.traffic.slice(mark).filter((entry) => (entry.data as Envelope).type === 'claim');
    expect(claims.map((entry) => entry.via)).toEqual(['postmessage']);
  });

  it('does not adopt a presentation reloaded in place: it is reached again by opening the window, and the script window finds it by looking, after a while', async () => {
    const { w, a, s } = opaquePair();
    await drain();
    a.sync.dispose();
    await drain();
    expect(s.speaker.status.state).toBe('not-synchronized');
    const a2 = w.present('A2', a.win);
    a2.shown.value = at(2);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(s.speaker.status.state).toBe('not-synchronized'); // it was never handed the window, and where nothing can be read nothing proves that it opened it
    a2.sync.setPopup(w.lab.proxy(a2.win, s.win));
    const took = await w.within(() => s.speaker.status.state === 'synchronized', 10_000);
    expect(took).toBeLessThan(10_000);
    expect(s.states.at(-1)).toEqual(at(2));
  });
});

// -- 3. a presentation that goes away ------------------------------------------------------------------------------------------

describe.each(TRANSPORTS)('a presentation that goes away, over %s', (via) => {
  it('says goodbye, and the script window is not synchronized at once, with nothing held open and no one asked', async () => {
    const { w, a, s } = paired(via);
    await drain();
    a.sync.dispose();
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
    expect(w.lab.openChannels()).toBe(via === 'broadcastchannel' ? 1 : 0); // what is left is B's own channel: the script window and A hold none
    expect(s.win.listenerCount('message')).toBe(0);
    expect(s.win.listenerCount('storage')).toBe(0);

    await vi.advanceTimersByTimeAsync(60_000); // the window that named itself is gone: there is no one to ask, so no one is
    expect(w.hellos(s)).toHaveLength(1);
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
  });

  it('is found out with no goodbye at all when its window is closed: not synchronized within one look', async () => {
    const { w, a, s } = paired(via);
    await drain();
    const mark = w.lab.traffic.length;
    a.win.closed = true;
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', 2 * WATCH_MS);
    expect(took).toBeLessThanOrEqual(WATCH_MS);
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    expect(w.lab.traffic.slice(mark)).toEqual([]); // found by looking: it sent nothing to do so
    await vi.advanceTimersByTimeAsync(60_000);
    expect(w.hellos(s)).toHaveLength(1); // a closed window has no one to ask
  });

  it.each([
    ['its name is gone from its window', (w: ReturnType<typeof world>, a: Presentation): void => void Reflect.deleteProperty(a.win, PRESENTER_KEY)],
    ['the script window has no opener any more', (_w: ReturnType<typeof world>, _a: Presentation, s?: Script): void => void (s !== undefined && (s.win.opener = null))],
  ])('is found out when %s', async (_name, change) => {
    const { w, a, s } = paired(via);
    await drain();
    change(w, a, s);
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', 2 * WATCH_MS);
    expect(took).toBeLessThanOrEqual(WATCH_MS);
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
  });

  it('does not let go of a presentation because of the goodbye of another, or of a goodbye that says nothing', async () => {
    const { w, a, s } = paired(via);
    await drain();
    const mark = s.statuses.length;
    for (const presenter of ['B', 'a', undefined, null, 42, '', 'A'.repeat(300)]) await w.forge(via, s, bye(presenter));
    expect(s.statuses).toHaveLength(mark);
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    a.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));

    await w.forge(via, s, bye('A')); // the one it follows
    expect(s.speaker.status.state).toBe('not-synchronized');
  });

  it('never gives up on a presentation that is only idle, and sends nothing to find out, however long it waits', async () => {
    const { w, a, s } = paired(via);
    await drain();
    const settled = w.lab.traffic.length;
    for (const wait of [500, 1000, 2500, 30_000]) {
      await vi.advanceTimersByTimeAsync(wait);
      await drain();
      expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    }
    expect(s.kinds()).toEqual(['connecting', 'synchronized']);
    expect(w.lab.traffic).toHaveLength(settled);
    expect(vi.getTimerCount()).toBe(1); // the one look at the opener, and nothing else
    a.show(at(2));
    await drain();
    expect(s.states.at(-1)).toEqual(at(2)); // and it still follows when the presentation moves, after all that time
  });

  it('asks no one to move a presentation that is gone: the request is not sent, and the script window says that it is not synchronized', async () => {
    const { w, a, s } = paired(via, { twoWay: true });
    await drain();
    a.win.closed = true; // gone, and not looked at yet
    expect(s.speaker.navigate('beta')).toBe(false);
    expect(s.speaker.status.state).toBe('not-synchronized');
    await drain();
    expect(w.lab.sent(via, s.win.name).filter((message) => message.type === 'navigate')).toEqual([]);
    expect(a.moves).toEqual([]);
  });
});

describe.each(SHARED)('a script window that nothing opened (a tab of the user\'s own), over %s', (via) => {
  it('has no window to look at, so it holds no timer while it follows, and the goodbye ends it all the same', async () => {
    const w = world({ fail: ONLY[via] });
    const a = w.present('A');
    const s = w.listen(w.lab.window('by-hand'), 'S');
    s.speaker.start();
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(s.speaker.status.state).toBe('synchronized');
    a.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));

    a.sync.dispose();
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
  });

  it('asks again from time to time, and the wait doubles to a limit, and it says nothing while it does: the window is not told that it is looking', async () => {
    const w = world({ fail: ALONE[via], timeoutMs: 100 });
    const s = w.listen(w.lab.window('by-hand'), 'S');
    s.speaker.start();
    const asked = [0];
    let seen = w.hellos(s).length;
    const t0 = Date.now();
    await vi.advanceTimersByTimeAsync(100);
    await drain();
    expect(s.kinds()).toEqual(['connecting', 'not-synchronized']);
    const status = s.speaker.status;

    while (Date.now() - t0 < 91_000) {
      await vi.advanceTimersByTimeAsync(100);
      await drain();
      const count = w.hellos(s).length;
      if (count > seen) {
        asked.push(Date.now() - t0);
        seen = count;
      }
    }
    const gaps = asked.slice(1).map((time, index) => time - asked[index]);
    expect(gaps).toEqual([RETRY_MS + 100, 2 * RETRY_MS + 100, 4 * RETRY_MS + 100, 8 * RETRY_MS + 100, MAX_RETRY_MS + 100, MAX_RETRY_MS + 100]);
    expect(s.kinds()).toEqual(['connecting', 'not-synchronized']);
    expect(s.speaker.status).toBe(status); // not even a new status object: the silent probes did not touch what it says
    for (const hello of w.hellos(s)) expect(hello.to).toBeUndefined(); // there is no one to name, and a window that cannot tell asks anyone
  });

  it('finds the presentation that is there when it asks, and starts again from the short wait when that one goes away', async () => {
    const w = world({ fail: ALONE[via], timeoutMs: 100 });
    const s = w.listen(w.lab.window('by-hand'), 'S');
    s.speaker.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.speaker.status.state).toBe('not-synchronized');
    const a = w.present('A');
    a.shown.value = at(2);
    const first = await w.within(() => s.speaker.status.state === 'synchronized', RETRY_MS + 2 * WATCH_MS);
    expect(first).toBeLessThan(RETRY_MS);
    expect(s.states.at(-1)).toEqual(at(2));
    expect(s.kinds()).toEqual(['connecting', 'not-synchronized', 'synchronized']);

    a.sync.dispose();
    await drain();
    expect(s.speaker.status.state).toBe('not-synchronized');
    const a2 = w.present('A2', a.win);
    a2.shown.value = at(1);
    const second = await w.within(() => s.speaker.status.state === 'synchronized', RETRY_MS + 2 * WATCH_MS);
    expect(second).toBeLessThanOrEqual(RETRY_MS + 2 * WATCH_MS);
    expect(s.states.at(-1)).toEqual(at(1));
  });
});

// -- 4. a presentation that is reloaded in place --------------------------------------------------------------------------------

describe.each(TRANSPORTS)('a presentation that is reloaded in place, over %s', (via) => {
  it('with its goodbye: not synchronized at once, nothing said while the page loads, and followed within the 500 ms of its coming back', async () => {
    const { w, a, s } = paired(via);
    await drain();
    a.sync.dispose(); // pagehide
    await drain();
    expect(s.speaker.status.state).toBe('not-synchronized');

    await vi.advanceTimersByTimeAsync(3000); // the page is loading: no name on the window, so no one to ask
    expect(w.hellos(s)).toHaveLength(1);
    expect(s.speaker.status.state).toBe('not-synchronized');

    const a2 = w.present('A2', a.win);
    a2.shown.value = at(2);
    const took = await w.within(() => s.speaker.status.state === 'synchronized' && s.states.at(-1)?.segmentIndex === 2);
    expect(took).toBeLessThanOrEqual(BUDGET_MS);
    expect(w.hellos(s).at(-1)).toMatchObject({ to: 'A2' });
    a2.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
  });

  it('with no goodbye: its name changing is found out, and it is followed again within the 500 ms, in the open', async () => {
    const { w, a, s } = paired(via);
    await drain();
    const a2 = w.reload(a, 'A2', { bye: false });
    a2.shown.value = at(2);
    const took = await w.within(() => s.speaker.status.state === 'synchronized' && s.states.at(-1)?.segmentIndex === 2);
    expect(took).toBeLessThanOrEqual(BUDGET_MS);
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'connecting', 'synchronized']);
    a2.show(at(0));
    await drain();
    expect(s.states.at(-1)).toEqual(at(0));

    a.sync.dispose(); // the goodbye of the page that is gone comes late: it is nothing to the pairing with the new one
    a.show(at(1));
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    expect(s.states.at(-1)).toEqual(at(0));
    expect(Reflect.get(a.win, PRESENTER_KEY)).toBe('A2'); // and it did not take the name of the new page off the window
  });

  it('is followed when it is asked to move by the script window (two-way), and by nobody else', async () => {
    const { w, a, s } = paired(via, { twoWay: true });
    await drain();
    const a2 = w.reload(a, 'A2', { bye: true });
    await w.within(() => s.speaker.status.state === 'synchronized');
    expect(s.speaker.navigate('gamma')).toBe(true);
    await drain();
    expect(a2.moves).toEqual(['gamma']);
    expect(a.moves).toEqual([]);
  });
});

// -- 5. reloaded, and presented again with the script window kept ----------------------------------------------------------------

describe.each(TRANSPORTS)('a presentation that is reloaded and presents again, with the script window kept, over %s', (via) => {
  it.each([
    ['with its goodbye', true],
    ['with no goodbye', false],
  ])('%s: the named window is reused, and it is followed again within the 500 ms', async (_name, withBye) => {
    const { w, a, s } = paired(via);
    await drain();
    const a2 = w.reload(a, 'A2', { bye: withBye });
    a2.shown.value = at(2);
    a2.sync.setPopup(w.lab.proxy(a2.win, s.win)); // window.open(url, 'teaching-spa-script') gives the page the window that is there already
    const took = await w.within(() => s.speaker.status.state === 'synchronized' && s.states.at(-1)?.segmentIndex === 2);
    expect(took).toBeLessThanOrEqual(BUDGET_MS);
    expect(w.hellos(s).at(-1)).toMatchObject({ to: 'A2' });
    if (!withBye) expect(s.kinds()).toEqual(['connecting', 'synchronized']); // the claim is heard: no look, no word

    a2.show(at(1));
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
    a.show(at(0)); // the page that is gone, if it were not
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
  });
});

// -- 6. nothing is looked for that is forced not to be there --------------------------------------------------------------------

describe('the transports that are forced to fail', () => {
  it.each(TRANSPORTS)('are never opened, tried or answered on, when it looks again: only %s stands', async (standing) => {
    const forced = TRANSPORTS.filter((name) => name !== standing);
    const w = world({ fail: forced, timeoutMs: 100 });
    const s = w.bare('S'); // opened by a window that runs no presentation: it has an opener to post to, and no one answers
    s.speaker.start();
    await vi.advanceTimersByTimeAsync(20_000);
    await drain();
    expect(w.lab.traffic.length).toBeGreaterThan(1); // it did look again
    expect(w.lab.traffic.every((entry) => entry.via === standing)).toBe(true);
    for (const name of forced) expect(s.speaker.status.attempts).toContainEqual({ transport: name, outcome: 'forced-failure' });
    if (standing !== 'broadcastchannel') expect(w.lab.openChannels()).toBe(0);
  });

  it('leave nothing to look at and nothing to ask when every one is forced: no timer, no traffic, however long it waits', async () => {
    const w = world({ fail: 'all' });
    const a = w.present('A');
    const s = w.open(a, 'S');
    s.speaker.start();
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(w.lab.traffic).toEqual([]);
    expect(w.lab.openChannels()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    w.take(s, w.present('B'));
    await drain();
    expect(w.lab.traffic).toEqual([]); // and a presentation that is handed the window does not claim it over a transport that is forced to fail either
  });

  it('are not claimed over: a presentation says that the window is its own on the transports that are not forced, and on no other', async () => {
    const w = world({ fail: ['broadcastchannel', 'storage'] });
    const a = w.present('A');
    const popup = w.lab.popup(a.win, 'S-window');
    Reflect.defineProperty(popup.window, SPEAKER_KEY, { value: true, configurable: true });
    a.sync.setPopup(popup.handle);
    await drain();
    expect(w.lab.traffic.map((entry) => entry.via)).toEqual(['postmessage']);
  });
});

// -- 7. a probe that is under way when the name goes -----------------------------------------------------------------------------

describe('a window that has been seen with a name', () => {
  it('is not asked by a hello that names no one when the name is gone before the next transport is tried', async () => {
    const w = world({ fail: ['postmessage'], timeoutMs: 100 }); // BroadcastChannel, then storage
    const opener = w.lab.window('opener');
    Reflect.defineProperty(opener, PRESENTER_KEY, { value: 'A', configurable: true }); // a presentation that does not answer
    const s = w.listen(w.lab.popup(opener, 'S-window').window, 'S');
    s.speaker.start();
    expect(w.hellos(s)).toEqual([wire({ type: 'hello', from: 'speaker', session: 'S', to: 'A' })]);

    await vi.advanceTimersByTimeAsync(50);
    Reflect.deleteProperty(opener, PRESENTER_KEY); // the page is reloading
    await vi.advanceTimersByTimeAsync(50);
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    expect(w.hellos(s)).toHaveLength(1); // storage was not tried with a hello that anyone of the origin would have answered
    expect(w.lab.traffic.filter((entry) => entry.via === 'storage')).toEqual([]);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(w.hellos(s)).toHaveLength(1);
    Reflect.defineProperty(opener, PRESENTER_KEY, { value: 'B', configurable: true });
    await vi.advanceTimersByTimeAsync(WATCH_MS);
    await drain();
    expect(w.hellos(s).at(-1)).toMatchObject({ to: 'B' });
  });
});

// -- 8. the presentation's side ------------------------------------------------------------------------------------------------

describe('a presentation that is handed a script window', () => {
  const marked = (script: LabWindow): LabWindow => {
    Reflect.defineProperty(script, SPEAKER_KEY, { value: true, configurable: true });
    return script;
  };

  it('says nothing to a window that has no script on it yet, which will say hello itself', async () => {
    const w = world();
    const a = w.present('A');
    const popup = w.lab.popup(a.win, 'S-window');
    a.sync.setPopup(popup.handle);
    await drain();
    expect(w.lab.traffic).toEqual([]);
  });

  it('claims a window that a script runs on, with its state, on each transport that is not forced to fail, and only that', async () => {
    const w = world();
    const a = w.present('A');
    a.shown.value = at(1);
    const popup = w.lab.popup(a.win, 'S-window');
    marked(popup.window);
    a.sync.setPopup(popup.handle);
    await drain();
    const claims = w.lab.traffic.filter((entry) => (entry.data as Envelope).type === 'claim');
    expect(claims.map((entry) => entry.via).sort()).toEqual(['broadcastchannel', 'postmessage', 'storage']);
    for (const entry of claims) {
      const message = entry.data as Envelope;
      expect(sorted(message)).toEqual(['app', 'from', 'presenter', 'seq', 'state', 'type', 'v']);
      expect(message).toEqual(wire({ type: 'claim', from: 'presenter', presenter: 'A', seq: 1, state: at(1) }));
    }
    expect(w.lab.traffic.find((entry) => entry.via === 'postmessage')?.targetOrigin).toBe(ORIGIN);

    a.show(at(2)); // nobody has answered a hello: a claim is not a handshake, and the presentation publishes to no one
    await drain();
    expect(w.lab.traffic.filter((entry) => (entry.data as Envelope).type === 'state')).toEqual([]);
  });

  it('claims again each time it is handed the window, with a counter that goes up', async () => {
    const w = world({ fail: ['postmessage', 'storage'] });
    const a = w.present('A');
    const popup = w.lab.popup(a.win, 'S-window');
    marked(popup.window);
    a.sync.setPopup(popup.handle);
    a.shown.value = at(2);
    a.sync.setPopup(popup.handle);
    await drain();
    expect(w.lab.sent('broadcastchannel', 'A').map((message) => [message.seq, (message.state as SyncState).segmentIndex])).toEqual([
      [1, 0],
      [2, 2],
    ]);
  });

  it('claims over postMessage alone a window that it cannot read: one that refuses the read says nothing of what runs there, and only postMessage tells who sent it', async () => {
    const w = world();
    const a = w.present('A');
    const posted: Array<[Envelope, string]> = [];
    const refusing = { closed: false, postMessage: (data: unknown, target: string): void => void posted.push([data as Envelope, target]) };
    Object.defineProperty(refusing, SPEAKER_KEY, {
      get(): never {
        throw new DOMException('Blocked a frame with origin from accessing a cross-origin frame.', 'SecurityError');
      },
    });
    a.sync.setPopup(refusing);
    await drain();
    expect(posted).toHaveLength(1);
    expect(posted[0][0]).toMatchObject({ type: 'claim', presenter: 'A' });
    expect(posted[0][1]).toBe(ORIGIN);
    expect(w.lab.traffic).toEqual([]); // nothing on BroadcastChannel or in storage
  });

  it.each([
    ['it was blocked (no window)', (): unknown => null],
    ['it has been closed', (w: ReturnType<typeof world>, a: Presentation): unknown => {
      const popup = w.lab.popup(a.win, 'S-window');
      marked(popup.window).closed = true;
      return popup.handle;
    }],
    ['it is not a window', (): unknown => ({ closed: false })],
  ])('claims nothing when %s', async (_name, make) => {
    const w = world();
    const a = w.present('A');
    a.sync.setPopup(make(w, a));
    await drain();
    expect(w.lab.traffic).toEqual([]);
  });

  it('claims nothing when it has nothing to show, and nothing when every transport is forced to fail', async () => {
    const w = world();
    const lab = w.lab;
    const win = lab.window('P');
    const quiet = createPresenterSync({ window: win, config: w.config, segmentIds: IDS, snapshot: () => null, presenterId: 'P' });
    held.push(quiet);
    const popup = lab.popup(win, 'S-window');
    marked(popup.window);
    quiet.setPopup(popup.handle);
    await drain();
    expect(lab.traffic).toEqual([]);
  });

  describe('that was never handed the window it opened (a reload in place), and is asked over postMessage by that window', () => {
    function adoption(o: { opaque?: boolean; twoWay?: boolean } = {}) {
      const lab = new Lab();
      const win = lab.window('P', { opaque: o.opaque });
      const script = lab.popup(win, 'S-window');
      const moves: string[] = [];
      const sync = createPresenterSync({
        window: win,
        config: parseSyncConfig('', { fail: ['broadcastchannel', 'storage'], twoWay: o.twoWay === true }),
        snapshot: () => at(1),
        segmentIds: IDS,
        navigate: (segment) => void moves.push(segment),
        presenterId: 'P-1',
      });
      held.push(sync);
      const origin = o.opaque === true ? 'null' : ORIGIN;
      return {
        lab,
        win,
        script,
        sync,
        moves,
        /** The script window says hello over postMessage, as the browser delivers it. */
        say(from: LabWindow, message: Envelope = helloOf({ to: 'P-1' })): void {
          lab.deliverMessage(from, win, message, origin === 'null' ? '*' : ORIGIN);
        },
        acks: (): Envelope[] => lab.sent('postmessage', 'P').filter((message) => message.type === 'ack'),
      };
    }

    it('answers, and holds that window from then on', async () => {
      const x = adoption();
      x.say(x.script.window);
      await drain();
      expect(x.acks()).toEqual([wire({ type: 'ack', from: 'presenter', presenter: 'P-1', session: 'S-1', seq: 1, state: at(1) })]);
      expect(x.sync.active).toEqual(['postmessage']);
      x.sync.publish();
      await drain();
      expect(x.lab.sent('postmessage', 'P')).toHaveLength(1); // nothing changed
    });

    it('does it once: the window that was taken is the window it holds, and another is not taken for it', async () => {
      const x = adoption();
      x.say(x.script.window);
      await drain();
      const other = x.lab.popup(x.win, 'S2-window');
      x.say(other.window, helloOf({ session: 'S-2', to: 'P-1' }));
      await drain();
      expect(x.acks()).toHaveLength(1);
    });

    it('answers a hello that names no one as well, like any other', async () => {
      const x = adoption();
      x.say(x.script.window, helloOf());
      await drain();
      expect(x.acks()).toHaveLength(1);
    });

    const REFUSED: Array<[string, (x: ReturnType<typeof adoption>) => void | LabWindow]> = [
      ['it was told that there is no window', (x) => x.sync.setPopup(null)],
      ['it was handed another window', (x) => x.sync.setPopup(x.lab.proxy(x.win, x.lab.popup(x.win, 'other-window').window))],
      ['the window was opened by no presentation', (x) => x.lab.window('by-none')],
      [
        'the window was opened by another presentation',
        (x) => {
          const elsewhere = x.lab.window('elsewhere');
          held.push(createPresenterSync({ window: elsewhere, config: parseSyncConfig(''), snapshot: () => at(0), segmentIds: IDS, presenterId: 'P-2' }));
          return x.lab.popup(elsewhere, 'by-another').window;
        },
      ],
      [
        'the window was opened by a window with no presentation on it',
        (x) => x.lab.popup(x.lab.window('plain'), 'by-plain').window,
      ],
      [
        'the window has been closed',
        (x) => {
          x.script.window.closed = true;
        },
      ],
    ];
    it.each(REFUSED)('answers nothing when %s', async (_name, arrange) => {
      const x = adoption();
      const sender = arrange(x) ?? x.script.window;
      x.say(sender);
      await drain();
      expect(x.acks()).toEqual([]);
      expect(x.lab.sent('postmessage', 'P')).toEqual([]);
      expect(x.sync.active).toEqual([]);
    });

    it('answers nothing that is not a hello, however the window proves itself, and takes the window for no request to move', async () => {
      const x = adoption({ twoWay: true });
      x.say(x.script.window, wire({ type: 'navigate', from: 'speaker', session: 'S-1', seq: 1, segmentId: 'gamma', to: 'P-1' }));
      x.say(x.script.window, wire({ type: 'state', from: 'presenter', presenter: 'P-9', seq: 9, state: at(2) }));
      await drain();
      expect(x.moves).toEqual([]);
      expect(x.acks()).toEqual([]);
      x.say(x.script.window); // and it was not taken by either: the hello is
      await drain();
      expect(x.acks()).toHaveLength(1);
    });

    it('answers nothing that names another presentation', async () => {
      const x = adoption();
      x.say(x.script.window, helloOf({ to: 'P-9' }));
      await drain();
      expect(x.acks()).toEqual([]);
    });

    it('answers nothing that is said from another origin, though the window proves itself', async () => {
      const x = adoption();
      x.lab.inject(x.win, { data: helloOf({ to: 'P-1' }), origin: 'https://evil.test', source: x.lab.proxy(x.win, x.script.window) });
      await drain();
      expect(x.acks()).toEqual([]);
    });

    it('answers nothing in an opaque origin, where the name on the opener of the window cannot be read, and no window proves anything', async () => {
      const x = adoption({ opaque: true });
      x.lab.throwOnCrossOrigin = true;
      x.say(x.script.window);
      await drain();
      expect(x.acks()).toEqual([]);
    });
  });
});

describe('a presentation that goes away', () => {
  it('says goodbye on the transports where a script window follows it, and on no other, and says it once', async () => {
    const w = world(); // every transport stands for the presentation, and the script window settles on the first
    const a = w.present('A');
    const s = w.open(a, 'S');
    s.speaker.start();
    await drain();
    expect(a.sync.active).toEqual(['broadcastchannel']);
    const mark = w.lab.traffic.length;
    a.sync.dispose();
    await drain();
    const goodbyes = w.lab.traffic.slice(mark);
    expect(goodbyes.map((entry) => entry.via)).toEqual(['broadcastchannel']);
    expect(goodbyes[0].data).toEqual(wire({ type: 'bye', from: 'presenter', presenter: 'A' }));
    expect(sorted(goodbyes[0].data as Envelope)).toEqual(['app', 'from', 'presenter', 'type', 'v']);

    a.sync.dispose();
    await drain();
    expect(w.lab.traffic).toHaveLength(mark + 1);
  });

  it('says nothing when no script window ever followed it', async () => {
    const w = world();
    const a = w.present('A');
    a.sync.dispose();
    await drain();
    expect(w.lab.traffic).toEqual([]);
  });

  it('takes its name off its window, and no one else\'s', () => {
    const w = world();
    const a = w.present('A');
    expect(Reflect.get(a.win, PRESENTER_KEY)).toBe('A');
    a.sync.dispose();
    expect(Reflect.get(a.win, PRESENTER_KEY)).toBeUndefined();
  });
});

describe('a script window', () => {
  it('says on its window, for as long as it runs, that a script is running there, and takes that off when it goes', async () => {
    const w = world();
    const a = w.present('A');
    const idle = w.open(a, 'idle');
    expect(Reflect.get(w.lab.proxy(a.win, idle.win), SPEAKER_KEY)).toBeUndefined(); // a window that has not started is still opening

    const s = w.open(a, 'S');
    s.speaker.start();
    await drain();
    expect(Reflect.get(w.lab.proxy(a.win, s.win), SPEAKER_KEY)).toBe(true);

    s.speaker.dispose();
    expect(Reflect.get(w.lab.proxy(a.win, s.win), SPEAKER_KEY)).toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
    expect(s.win.listenerCount('message')).toBe(0);
    expect(s.win.listenerCount('storage')).toBe(0);
    expect(w.lab.openChannels()).toBe(1); // the presentation's: the script window holds none
  });

  it.each(TRANSPORTS)('lets go of the look at its opener, and of everything else, when it is disposed while it follows over %s, and while it is not synchronized', async (via) => {
    const { w, a, s } = paired(via);
    await drain();
    expect(vi.getTimerCount()).toBe(1);
    s.speaker.dispose();
    expect(vi.getTimerCount()).toBe(0);
    a.show(at(2));
    a.sync.dispose();
    await w.within(() => false, 2 * WATCH_MS);
    expect(s.kinds()).toEqual(['connecting', 'synchronized']); // what it was told after it was gone, it did not hear

    const other = paired(via);
    await drain();
    other.a.sync.dispose();
    await drain();
    expect(other.s.speaker.status.state).toBe('not-synchronized');
    expect(vi.getTimerCount()).toBeGreaterThan(0); // not synchronized, with a window it could still look at: the look is what finds the next owner
    other.s.speaker.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});
