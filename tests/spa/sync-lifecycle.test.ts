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
//              window that is its opener now (on postMessage, `event.source` and the origin, and the name on that opener where it can be read: a
//              window that can be read and carries none is no owner, which is not the same as one that cannot be read), only while it is paired,
//              and not malformed. It forgets the counters of the owner before, shakes hands with the new one by name, and never says that it is
//              anything but synchronized in between. The owner before it can neither move it nor let it go. BroadcastChannel and `storage` do not
//              say who sent a claim, so there it is a hint to look at the window: what is shown is what the owner says to the hello, never what
//              the claim said, and no number in it is kept.
//   - bye and watch: a presentation that goes away says goodbye on the transports it was answered on; one that does not is found out by looking
//              at its window (closed, its name gone, another opener). A presentation that is only idle is never given up on, and nothing is sent.
//   - liveness: where the window cannot be looked at (an opaque origin, or no opener) the script window asks the presentation whether it is there,
//              from time to time, and is not synchronized when it is not answered: a reload without a goodbye is found out, an idle presentation
//              is never given up on, one that is heard from is not asked, and nothing but the answer of the presentation that is followed counts.
//   - recover: a script window that is not synchronized looks again, quietly: when its window has a new owner, and from time to time otherwise
//              (a wait that doubles to a limit). It asks nobody by name that it cannot name once it has been told a name, and it never opens
//              or tries a transport that is forced to fail.
//   - adopt:   a presentation reloaded in place was never handed the window it opened. A script window that proves, by the name on its own
//              opener, that this presentation opened it, is answered over postMessage, once, and nothing else is.
//   - opaque:  where no name can be read, the window that posted is the whole of the proof; the claim is taken on postMessage alone.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHANNEL_NAME,
  LIVENESS_MS,
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

  /**
   * The page of `old` is gone and has said nothing, not even to a question put to it: the window stays, as the same window does when a page is
   * replaced, and nothing that ran on it listens, answers or says goodbye any more. What `reload(..., { bye: false })` leaves behind is a page
   * that still answers.
   */
  function vanish(old: Presentation): void {
    old.win.unload();
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

  return { lab, config, present, listen, open, bare, reopen, take, reload, vanish, within, hellos, forge };
}

/** Two presentations of one origin, A and B, and the script window that A opened, started: over `via`, the first transport standing (or, with `fail`, whichever are left). */
function paired(via: TransportName, o: { twoWay?: boolean; fail?: readonly TransportName[] } = {}) {
  const w = world({ fail: ONLY[via], ...o });
  const a = w.present('A');
  const b = w.present('B');
  const s = w.open(a, 'S');
  s.speaker.start();
  return { w, a, b, s };
}

/**
 * A script window that follows a presentation it cannot look at because the window that opened it cannot be read: an opaque origin, where the one
 * road is postMessage, between the two windows that hold each other's handle, and the name on the other window is refused.
 */
function sealed(o: { twoWay?: boolean } = {}) {
  const w = world({ fail: ['broadcastchannel'], opaque: true, ...o });
  const a = w.present('A');
  const b = w.present('B');
  const s = w.open(a, 'S');
  s.speaker.start();
  return { w, a, b, s };
}

/** A tab of the user's own, which no presentation opened: no opener to look at, and a shared road, `via`, to follow a presentation on. */
function byHand(via: (typeof SHARED)[number]) {
  const w = world({ fail: ONLY[via] });
  const a = w.present('A');
  const s = w.listen(w.lab.window('by-hand'), 'S');
  s.speaker.start();
  return { w, a, s };
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

  it(
    via === 'postmessage'
      ? 'takes a claim from the owner it follows for a state, where the window that posted it is the window that owns the script window: no handshake, and no word about it'
      : 'does not take a claim from the owner it follows for a state, where nothing says who sent it: it is in step already, and it asks no one and says nothing',
    async () => {
      // over a shared transport it stands alone: a claim that comes on the line as well, from the window that owns the script window, is the next test
      const { w, a, b, s } = via === 'postmessage' ? paired(via) : paired(via, { fail: ALONE[via] });
      await drain();
      w.take(s, b);
      await drain();
      const said = s.statuses.length;
      const asked = w.hellos(s).length;
      const had = s.states.length;

      b.shown.value = at(2);
      b.sync.setPopup(w.lab.proxy(b.win, s.win)); // the window is opened again, by name, from the same presentation
      await drain();
      if (via === 'postmessage') expect(s.states.at(-1)).toEqual(at(2));
      else expect(s.states).toHaveLength(had); // nothing that came over a transport that does not say who sent it is shown
      expect(w.hellos(s)).toHaveLength(asked);
      expect(s.statuses).toHaveLength(said);
      expect(a.moves).toEqual([]);
    },
  );

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

// the line to the opener is open for as long as the script window runs, so a claim that the presentation it follows puts on it is heard whatever the held transport is
describe('a script window that follows a presentation over BroadcastChannel, with the line to its opener open as well', () => {
  it('takes the claim that the owner puts on the line for a state, though BroadcastChannel is what it follows it on: no handshake, and no word about it', async () => {
    const { w, a, b, s } = paired('broadcastchannel');
    await drain();
    w.take(s, b);
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: 'broadcastchannel' });
    const said = s.statuses.length;
    const asked = w.hellos(s).length;

    b.shown.value = at(2);
    b.sync.setPopup(w.lab.proxy(b.win, s.win)); // opened again, by name, from the presentation it follows: the claim goes over BroadcastChannel and over postMessage
    await drain();
    expect(s.states.at(-1)).toEqual(at(2)); // the one that came on the line is believed, and the one on BroadcastChannel is a hint that adds nothing
    expect(w.hellos(s)).toHaveLength(asked);
    expect(s.statuses).toHaveLength(said);
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: 'broadcastchannel' });
    expect(a.moves).toEqual([]);
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

    it('is not taken from an opener whose name is gone: a window that can be read and has no presentation on it is not a window that cannot be read, and the script window says that it is not synchronized', async () => {
      const { w, a, s } = paired(via);
      await drain();
      Reflect.deleteProperty(a.win, PRESENTER_KEY); // the page left the window (a page that is loading, or one that ended without a word); a read of it still works
      const mark = before(s);
      await w.forge(via, s, claim('ghost', 1, at(2))); // from the window that is its opener, naming a presentation that is not there
      await unchanged(s, mark, w);
      expect(s.speaker.status.state).toBe('synchronized'); // not taken, and not yet looked at

      const took = await w.within(() => s.speaker.status.state === 'not-synchronized', 2 * WATCH_MS);
      expect(took).toBeLessThanOrEqual(WATCH_MS);
      expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
      expect(s.states).toHaveLength(mark.states);
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
  it('says goodbye, and the script window is not synchronized at once, with nothing held open but the line to its opener, and no one asked', async () => {
    const { w, a, s } = paired(via);
    await drain();
    a.sync.dispose();
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
    expect(w.lab.openChannels()).toBe(via === 'broadcastchannel' ? 1 : 0); // what is left is B's own channel: the script window and A hold none
    expect(s.win.listenerCount('message')).toBe(via === 'storage' ? 0 : 1); // the line to its opener stays, wherever postMessage is not forced to fail: it is how the owner is heard
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
  it('has no window to look at, so it asks the presentation from time to time instead, and the goodbye ends it all the same', async () => {
    const { a, s } = byHand(via);
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    expect(vi.getTimerCount()).toBe(1); // the wait for the next question, and no look at an opener, which it has not
    await vi.advanceTimersByTimeAsync(30_000);
    await drain();
    expect(s.speaker.status.state).toBe('synchronized'); // asked, and answered, all along
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

// -- 9. a presentation that goes without a word, where the window that follows it cannot look at its window ---------------------------------

/**
 * What a script window says to a presentation, put in front of that presentation over one transport: as the script window does (postMessage, from
 * the window that the presentation holds, unless `from` says another) or as any window of the origin could (BroadcastChannel, storage).
 */
async function tell(
  w: ReturnType<typeof world>,
  via: TransportName,
  a: Presentation,
  s: Script,
  data: unknown,
  from: { source?: unknown; origin?: string } = {},
): Promise<void> {
  if (via === 'broadcastchannel') {
    const stranger = w.lab.window(`stranger-${w.lab.windows.length}`);
    const channel = new (stranger.BroadcastChannel as unknown as new (name: string) => { postMessage(data: unknown): void; close(): void })(CHANNEL_NAME);
    channel.postMessage(data);
    channel.close();
  } else if (via === 'storage') {
    w.lab.injectStorage(a.win, { key: STORAGE_KEYS.toPresenter, newValue: JSON.stringify(data) });
  } else {
    w.lab.inject(a.win, { data, origin: from.origin ?? ORIGIN, source: 'source' in from ? from.source : w.lab.proxy(a.win, s.win) });
  }
  await drain();
}

const ping = (fields: Envelope = {}): Envelope => wire({ type: 'ping', from: 'speaker', session: 'S', to: 'A', n: 7, ...fields });
const pong = (fields: Envelope = {}): Envelope => wire({ type: 'pong', from: 'presenter', presenter: 'A', session: 'S', n: 1, ...fields });
const questions = (w: ReturnType<typeof world>, via: TransportName, script: Script): Envelope[] => w.lab.sent(via, script.win.name).filter((message) => message.type === 'ping');

describe('a script window that cannot look at the window of the presentation it follows (an opaque origin, where the name on it cannot be read)', () => {
  it('asks the presentation from time to time, and says that it is not synchronized when nothing answers: the page was replaced and said nothing', async () => {
    const { w, a, s } = sealed();
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: 'postmessage' });
    a.show(at(1));
    await drain();

    w.vanish(a); // reloaded in place with no goodbye: the window is the same one, and the page that was on it answers no one
    const a2 = w.present('A2', a.win); // and a page with a name of its own is on it, which was never handed the script window
    a2.show(at(2));
    const limit = LIVENESS_MS + w.config.timeoutMs;
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', limit + BUDGET_MS);
    expect(took).toBeGreaterThanOrEqual(LIVENESS_MS); // it does not guess: it asks first
    expect(took).toBeLessThanOrEqual(limit);
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
    expect(s.states.at(-1)).toEqual(at(1)); // what it shows is what the presentation it followed said last: nothing of the page that is there now
    expect(questions(w, 'postmessage', s)).toEqual([wire({ type: 'ping', from: 'speaker', session: 'S', to: 'A', n: 1 })]);

    await vi.advanceTimersByTimeAsync(3_000);
    await drain();
    expect(s.speaker.status.state).toBe('not-synchronized'); // that page was never handed the window, and where nothing can be read nothing proves that it opened it
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
    expect(questions(w, 'postmessage', s)).toHaveLength(1); // and it asks no more: it is not following anyone
  });

  it('never flaps for a presentation that is only idle: it answers every question, however long the window waits', async () => {
    const { w, a, s } = sealed();
    await drain();
    const given = s.states.length; // what the handshake gave: the questions that follow add nothing to it
    expect(given).toBeGreaterThanOrEqual(1);
    for (const wait of [500, 1000, 2500, 30_000]) {
      await vi.advanceTimersByTimeAsync(wait);
      await drain();
      expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: 'postmessage' });
    }
    expect(s.kinds()).toEqual(['connecting', 'synchronized']);
    const asked = questions(w, 'postmessage', s);
    const answered = w.lab.sent('postmessage', 'A').filter((message) => message.type === 'pong');
    expect(asked.length).toBeGreaterThanOrEqual(30); // a question a second, a small one, and no more than that
    expect(asked.length).toBeLessThanOrEqual(35);
    expect(answered).toHaveLength(asked.length);
    expect(w.hellos(s)).toHaveLength(1);
    expect(s.states).toHaveLength(given); // nothing was said that is a state: a question changes nothing
    a.show(at(2));
    await drain();
    expect(s.states.at(-1)).toEqual(at(2)); // and it still follows, after all that time
  });

  it('is asked nothing more, and does not wait for an answer, while the presentation says something at least once a second', async () => {
    const { w, a, s } = sealed();
    await drain();
    for (let step = 0; step < 10; step += 1) {
      await vi.advanceTimersByTimeAsync(LIVENESS_MS - 100);
      a.show(at((step % 2) + 1));
      await drain();
    }
    expect(questions(w, 'postmessage', s)).toEqual([]);
    expect(s.speaker.status.state).toBe('synchronized');
  });

  it('asks the owner that the window has now, with the handshake of that owner, and finds that one gone as well, when it goes', async () => {
    const { w, a, b, s } = sealed();
    await drain();
    w.take(s, b);
    await drain();
    await vi.advanceTimersByTimeAsync(3 * LIVENESS_MS + 100);
    await drain();
    const asked = questions(w, 'postmessage', s);
    expect(asked.length).toBeGreaterThanOrEqual(3);
    for (const message of asked) expect(message).toMatchObject({ to: 'B', session: 'S-2' });
    expect(w.lab.sent('postmessage', 'A').filter((message) => message.type === 'pong')).toEqual([]); // the one before it is not asked, and answers nothing
    expect(a.moves).toEqual([]);
    expect(s.speaker.status.state).toBe('synchronized');

    w.vanish(b);
    const limit = LIVENESS_MS + w.config.timeoutMs;
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', limit + BUDGET_MS);
    expect(took).toBeLessThanOrEqual(limit);
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
  });

  it('is not synchronized within a look when the window of the presentation is closed, with no goodbye and nobody asked: `closed` can be read where nothing else can', async () => {
    const { w, a, s } = sealed();
    await drain();
    a.win.closed = true;
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', 2 * WATCH_MS);
    expect(took).toBeLessThanOrEqual(WATCH_MS);
    expect(questions(w, 'postmessage', s)).toEqual([]);
  });

  it('holds nothing when it is disposed, wherever it is in asking: waiting to ask, or waiting for the answer', async () => {
    const waiting = sealed();
    await drain();
    waiting.s.speaker.dispose();
    expect(vi.getTimerCount()).toBe(0);

    const asking = sealed();
    await drain();
    asking.w.vanish(asking.a);
    await vi.advanceTimersByTimeAsync(LIVENESS_MS); // the question is out, and nothing answers it
    expect(questions(asking.w, 'postmessage', asking.s)).toHaveLength(1);
    asking.s.speaker.dispose();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(asking.s.kinds()).toEqual(['connecting', 'synchronized']); // and it did not say that it was not, after it was gone
  });

  const NOT_ANSWERS: Array<[string, Envelope]> = [
    ['one from another presentation', pong({ presenter: 'B' })],
    ['one for another handshake', pong({ session: 'S-9' })],
    ['one that answers another question', pong({ n: 2 })],
    ['one that answers a question that was never asked', pong({ n: 0 })],
    ['one with no counter', pong({ n: undefined })],
    ['one that a script window said', pong({ from: 'speaker' })],
    ['one from a protocol that is not ours', pong({ app: 'something-else' })],
  ];
  it.each(NOT_ANSWERS)('does not take %s for the answer to its question: it says that it is not synchronized when the time is up', async (_name, wrong) => {
    const { w, a, s } = sealed();
    await drain();
    w.vanish(a);
    await w.forge('postmessage', s, pong()); // an answer to a question that has not been asked yet: it answers nothing
    await vi.advanceTimersByTimeAsync(LIVENESS_MS);
    await drain();
    expect(questions(w, 'postmessage', s)).toEqual([wire({ type: 'ping', from: 'speaker', session: 'S', to: 'A', n: 1 })]);

    await w.forge('postmessage', s, wrong);
    expect(s.speaker.status.state).toBe('synchronized'); // not told yet
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', w.config.timeoutMs + BUDGET_MS);
    expect(took).toBeLessThanOrEqual(w.config.timeoutMs);
  });

  it('takes the answer to its question for the answer, once: a second one of the same does nothing', async () => {
    const { w, a, s } = sealed();
    await drain();
    w.vanish(a); // nothing answers by itself: the answers here are made by hand
    await vi.advanceTimersByTimeAsync(LIVENESS_MS);
    await drain();
    await w.forge('postmessage', s, pong({ n: 1 }));
    await w.forge('postmessage', s, pong({ n: 1 })); // it was answered already
    await vi.advanceTimersByTimeAsync(LIVENESS_MS - 10);
    await drain();
    expect(questions(w, 'postmessage', s)).toHaveLength(1); // the next one is a second after the answer
    await vi.advanceTimersByTimeAsync(10);
    await drain();
    expect(questions(w, 'postmessage', s).map((message) => message.n)).toEqual([1, 2]);
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', w.config.timeoutMs + BUDGET_MS);
    expect(took).toBeLessThanOrEqual(w.config.timeoutMs); // and the answer to the first question is not the answer to the second
  });
});

describe.each(SHARED)('a script window that nothing opened, which follows a presentation by %s and cannot look at it', (via) => {
  it('asks the presentation, and says that it is not synchronized when nothing answers: its window is gone, and nothing said so', async () => {
    const { w, a, s } = byHand(via);
    await drain();
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    w.vanish(a);
    const limit = LIVENESS_MS + w.config.timeoutMs;
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', limit + BUDGET_MS);
    expect(took).toBeGreaterThanOrEqual(LIVENESS_MS);
    expect(took).toBeLessThanOrEqual(limit);
    expect(s.speaker.status).toMatchObject({ state: 'not-synchronized', transport: null });
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized']);
    expect(questions(w, via, s)).toEqual([wire({ type: 'ping', from: 'speaker', session: 'S', to: 'A', n: 1 })]);
  });

  it('looks again when it is not synchronized, quietly, and follows the presentation that is there then', async () => {
    const { w, a, s } = byHand(via);
    await drain();
    w.vanish(a);
    await w.within(() => s.speaker.status.state === 'not-synchronized', LIVENESS_MS + w.config.timeoutMs + BUDGET_MS);
    const a2 = w.present('A2', a.win);
    a2.show(at(2));
    const took = await w.within(() => s.speaker.status.state === 'synchronized', RETRY_MS + 2 * WATCH_MS);
    expect(took).toBeLessThanOrEqual(RETRY_MS + 2 * WATCH_MS);
    expect(s.states.at(-1)).toEqual(at(2));
    expect(s.kinds()).toEqual(['connecting', 'synchronized', 'not-synchronized', 'synchronized']);
    a2.show(at(0));
    await drain();
    expect(s.states.at(-1)).toEqual(at(0));
  });

  it('is not kept synchronized by another presentation of the origin that is there: the question names the one that it follows', async () => {
    const { w, a, s } = byHand(via);
    await drain();
    const rehearsal = w.present('R'); // open beside, after the window settled on A
    await drain();
    w.vanish(a);
    const took = await w.within(() => s.speaker.status.state === 'not-synchronized', LIVENESS_MS + w.config.timeoutMs + BUDGET_MS);
    expect(took).toBeLessThanOrEqual(LIVENESS_MS + w.config.timeoutMs);
    expect(w.lab.sent(via, 'R').filter((message) => message.type === 'pong')).toEqual([]);
    expect(rehearsal.sync.active).toEqual([]);
  });
});

describe.each(TRANSPORTS)('a presentation that is asked whether it is there, over %s', (via) => {
  const pongs = (w: ReturnType<typeof world>): Envelope[] => w.lab.sent(via, 'A').filter((message) => message.type === 'pong');

  it('answers a script window that it has answered, once, with the question it was asked, and changes nothing else: no state, no counter, no request', async () => {
    const { w, a, s } = paired(via, { twoWay: true });
    await drain();
    await tell(w, via, a, s, ping({ n: 7 }));
    expect(pongs(w)).toEqual([wire({ type: 'pong', from: 'presenter', presenter: 'A', session: 'S', n: 7 })]);
    expect(sorted(pongs(w)[0])).toEqual(['app', 'from', 'n', 'presenter', 'session', 'type', 'v']);
    expect(a.moves).toEqual([]);

    a.show(at(1));
    await drain();
    const states = w.lab.sent(via, 'A').filter((message) => message.type === 'state');
    expect(states).toEqual([wire({ type: 'state', from: 'presenter', presenter: 'A', seq: 2, state: at(1) })]); // the acknowledgement had 1: a question took none
  });

  const UNANSWERED: Array<[string, Envelope]> = [
    ['a question for another presentation', ping({ to: 'B' })],
    ['a question that names no one', ping({ to: undefined })],
    ['a question that names something that is not a name', ping({ to: 42 })],
    ['a handshake that it has not answered', ping({ session: 'S-9' })],
    ['an empty handshake', ping({ session: '' })],
    ['a handshake that is not a name', ping({ session: 7 })],
    ['a counter of 0', ping({ n: 0 })],
    ['a negative counter', ping({ n: -1 })],
    ['a counter that is not a whole number', ping({ n: 1.5 })],
    ['a counter that is a string', ping({ n: '1' })],
    ['no counter', ping({ n: undefined })],
    ['a counter that is past what a number holds exactly', ping({ n: Number.MAX_SAFE_INTEGER + 1 })],
    ['a question that a presentation said', ping({ from: 'presenter' })],
    ['a protocol that is not ours', ping({ app: 'something-else' })],
    ['a version that is not ours', ping({ v: 2 })],
  ];
  it.each(UNANSWERED)('says nothing to %s', async (_name, bad) => {
    const { w, a, s } = paired(via);
    await drain();
    await tell(w, via, a, s, bad);
    expect(pongs(w)).toEqual([]);
    await tell(w, via, a, s, ping()); // the same question, well formed, is answered: it was refused for what it said, and for nothing else
    expect(pongs(w)).toHaveLength(1);
  });

  it('says nothing to a question when it has not answered a hello on this transport, though the handshake is the one it answered on another', async () => {
    const { w, a, s } = paired(via);
    await drain();
    const other = TRANSPORTS.find((name) => name !== via && !ONLY[via].includes(name));
    if (other === undefined) return; // the transports before this one are forced to fail: there is no other to ask on
    await tell(w, other, a, s, ping());
    expect(w.lab.sent(other, 'A').filter((message) => message.type === 'pong')).toEqual([]);
  });

  if (via === 'postmessage') {
    const PLACES: Array<[string, (w: ReturnType<typeof world>, s: Script, a: Presentation) => { source?: unknown; origin?: string }]> = [
      ['no window at all', () => ({ source: null })],
      ['a window that is none of its business', (w, _s, a) => ({ source: w.lab.proxy(a.win, w.lab.window('stranger')) })],
      ['its own window', (w, _s, a) => ({ source: w.lab.proxy(a.win, a.win) })],
      ['another origin', () => ({ origin: 'https://evil.test' })],
    ];
    it.each(PLACES)('says nothing to a question that was posted by %s', async (_name, place) => {
      const { w, a, s } = paired(via);
      await drain();
      await tell(w, via, a, s, ping(), place(w, s, a));
      expect(pongs(w)).toEqual([]);
    });
  }
});

// -- 10. a claim that does not say who sent it -----------------------------------------------------------------------------------------

describe.each(SHARED)('a claim that comes over %s, which does not say who sent it', (via) => {
  it('is not shown, and its counter is not kept, whoever it says it is from: the name of the owner is no proof that the owner sent it', async () => {
    const { w, a, s } = paired(via);
    await drain();
    const had = s.states.length;
    await w.forge(via, s, claim('A', Number.MAX_SAFE_INTEGER, at(2))); // the name of the presentation that owns the window, from a window that is not that presentation
    expect(s.states).toHaveLength(had);
    expect(s.speaker.status).toMatchObject({ state: 'synchronized', transport: via });
    expect(w.hellos(s)).toHaveLength(1);

    a.show(at(1)); // what the owner shows next is shown: the counter of the claim was not kept
    await drain();
    expect(s.states.at(-1)).toEqual(at(1));
    a.show(at(2));
    await drain();
    expect(s.states.at(-1)).toEqual(at(2));
    expect(s.kinds()).toEqual(['connecting', 'synchronized']);
  });

  it('is a reason to ask the presentation that owns the window, and the window shows what that one says: not what the claim says', async () => {
    const { w, b, s } = paired(via);
    await drain();
    b.shown.value = at(1);
    w.reopen(s, b); // the browser made B the opener, and B has said nothing
    await w.forge(via, s, claim('B', Number.MAX_SAFE_INTEGER, at(2))); // a state that B does not show, with a counter that would hold everything after it
    expect(w.hellos(s).at(-1)).toEqual(wire({ type: 'hello', from: 'speaker', session: 'S-2', to: 'B' }));
    expect(s.states.at(-1)).toEqual(at(1));
    expect(s.states).not.toContainEqual(at(2));
    expect(s.kinds()).toEqual(['connecting', 'synchronized']);

    b.show(at(0));
    await drain();
    expect(s.states.at(-1)).toEqual(at(0));
  });
});
