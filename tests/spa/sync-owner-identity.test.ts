// SPA-07 J1 and R2-S2 (specs/005-teaching-spa.md 2.7; AC9, AC10): who owns a script window that cannot read the window that opened it.
//
// A page that runs from a file: URL has an opaque origin. `window.origin` is "null", a read through the handle of another window throws a
// SecurityError (so the script window cannot read the name its presentation gave itself), and yet every file: page of the browser shares one
// BroadcastChannel and one localStorage. A hello that names no one is answered by every presentation that is open, and the first answer used
// to win (probe P5); a presentation that takes the named window by opening it again was not heard (probe P2); and a script window that was
// not synchronized did not hear the presentation that opened it again until it looked again, seconds later (R2-S2).
//
// The Lab's `file` windows have exactly that (helpers/sync-doubles.ts), and `throwOnCrossOrigin` has the handles throw as a browser does. The
// real thing, in Chromium, is in sync-browser-check.mjs; what is here is the life of the speaker step by step, with the clock in the test's
// hand, and the transports, listeners and messages that it holds at each step.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHANNEL_NAME,
  PRESENTER_KEY,
  PROTOCOL,
  STORAGE_KEYS,
  VERSION,
  createPresenterSync,
  createSpeakerSync,
  parseSyncConfig,
  type PresenterSync,
  type SpeakerSync,
  type SyncState,
  type SyncStateName,
  type SyncStatus,
  type TransportName,
} from '../../workshop/spa/src/shell/sync';
import { stateAt } from './helpers/speaker-rig';
import { Lab, drain, type LabWindow, type Via, type WindowHandle } from './helpers/sync-doubles';

const IDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'];
const BUDGET_MS = 500; // AC9
const stateOf = (index: number): SyncState => stateAt(IDS, index);

let lab: Lab;
const held: Array<{ dispose(): void }> = [];

beforeEach(() => {
  vi.useFakeTimers();
  lab = new Lab();
  lab.throwOnCrossOrigin = true; // as a browser does for what another origin's window has
});
afterEach(() => {
  for (const part of held.splice(0)) part.dispose();
  vi.useRealTimers();
});

// -- a presentation, and a script window that was opened by one --------------------------------------------------------------

interface Presentation {
  readonly id: string;
  readonly win: LabWindow;
  readonly sync: PresenterSync;
  /** The segments that a script window asked it to move to (two-way only). */
  readonly moves: string[];
  /** The presentation moves to a segment, and says so to the script windows that follow it. */
  show(index: number): Promise<void>;
}

function presentation(id: string, index: number, options: { on?: LabWindow; file?: boolean; fail?: TransportName[]; twoWay?: boolean } = {}): Presentation {
  const win = options.on ?? lab.window(`presentation-${id}`, { file: options.file ?? true });
  const at = { index };
  const moves: string[] = [];
  const sync = createPresenterSync({
    window: win,
    config: parseSyncConfig('', { fail: options.fail, twoWay: options.twoWay }),
    segmentIds: IDS,
    snapshot: () => stateOf(at.index),
    navigate: (segment) => void moves.push(segment),
    presenterId: id,
  });
  held.push(sync);
  return {
    id,
    win,
    sync,
    moves,
    async show(next) {
      at.index = next;
      sync.publish();
      await drain();
    },
  };
}

interface Script {
  readonly win: LabWindow;
  /** What the window that opened it holds of it, and hands to `setPopup`. */
  readonly handle: WindowHandle;
  readonly sync: SpeakerSync;
  readonly states: SyncState[];
  /** What the surface shows: the speaker's words for where it stands, and the segment of the last state that it was given. */
  shows(): { sync: SyncStateName; transport: TransportName | null; index: number | null };
}

/**
 * The window that `opener` opens, and the script on it. The presentation that is handed the window says what it shows before the page of the
 * script window has loaded, so no one hears that: the script starts a turn later, as the page does.
 */
async function openScript(opener: LabWindow, options: { give?: PresenterSync; fail?: TransportName[]; timeoutMs?: number; twoWay?: boolean } = {}): Promise<Script> {
  const popup = lab.popup(opener, 'speaker');
  options.give?.setPopup(popup.handle);
  await drain();
  const statuses: SyncStatus[] = [];
  const states: SyncState[] = [];
  const sync = createSpeakerSync({
    window: popup.window,
    config: parseSyncConfig('', { fail: options.fail, timeoutMs: options.timeoutMs, twoWay: options.twoWay }),
    segmentIds: IDS,
    sessionId: 'S',
    onStatus: (status) => void statuses.push(status),
    onState: (state) => void states.push(state),
  });
  held.push(sync);
  sync.start();
  return {
    win: popup.window,
    handle: popup.handle,
    sync,
    states,
    shows: () => ({
      sync: statuses[statuses.length - 1]?.state ?? 'connecting',
      transport: statuses[statuses.length - 1]?.transport ?? null,
      index: states.length === 0 ? null : states[states.length - 1].segmentIndex,
    }),
  };
}

/** The laboratory runs, and the clock goes on by `ms`. */
async function elapse(ms: number): Promise<void> {
  await drain();
  await vi.advanceTimersByTimeAsync(ms);
  await drain();
}

// -- what went over the wire --------------------------------------------------------------------------------------------------

const speakerSent = (via: Via, type: string) => lab.sent(via, 'speaker').filter((message) => message.type === type);
const positionOf = (via: Via, type: string): number =>
  lab.traffic.findIndex((entry) => entry.via === via && entry.from === 'speaker' && (entry.data as { type?: unknown }).type === type);
const claimOf = (presenter: string, index: number, seq = 1) => ({ app: PROTOCOL, v: VERSION, from: 'presenter', type: 'claim', presenter, seq, state: stateOf(index) });
const identify = { app: PROTOCOL, v: VERSION, from: 'speaker', type: 'identify', session: 'asked-by-a-test' };

describe('J1: a script window that cannot read its opener asks the opener who it is, and takes no other for it', () => {
  it('P5: an older presentation that hears the same BroadcastChannel is not followed, and the hello names the owner', async () => {
    // Arrange: an older, unrelated presentation is open (it hears a hello first), then the owner opens the script window.
    const older = presentation('P-older', 4);
    const owner = presentation('P-owner', 1);

    // Act
    const speaker = await openScript(owner.win, { give: owner.sync });
    await elapse(BUDGET_MS);

    // Assert: the owner's segment, from the owner, over the BroadcastChannel that works, after the opener was asked.
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 1 });
    expect(speaker.states.map((state) => state.segmentIndex)).not.toContain(4);
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual(['P-owner']);
    expect(positionOf('postmessage', 'identify')).toBeGreaterThanOrEqual(0);
    expect(positionOf('postmessage', 'identify')).toBeLessThan(positionOf('broadcastchannel', 'hello'));
    expect(older.sync.active).toEqual([]);
    await owner.show(2);
    await older.show(5);
    expect(speaker.shows().index).toBe(2);
  });

  it('P5: an opener that carries no presentation is asked, and no other presentation is taken in its place', async () => {
    // Arrange: a window that opened the script window and is no presentation, and a presentation of the origin that is not its owner.
    const stranger = presentation('P-stranger', 4);
    const page = lab.window('some-page', { file: true });

    // Act
    const speaker = await openScript(page, { timeoutMs: 300 });
    await elapse(BUDGET_MS);

    // Assert: nothing named no one on a transport that every presentation hears, and the speaker says so.
    expect(speaker.shows()).toEqual({ sync: 'not-synchronized', transport: null, index: null });
    expect(speaker.states).toEqual([]);
    expect(stranger.sync.active).toEqual([]);
    expect(speakerSent('broadcastchannel', 'hello')).toEqual([]);
    expect(lab.sent('storage', 'speaker')).toEqual([]);
  });

  it('P2: a presentation that takes the named window is followed within 500 ms, and the one before it is not followed again', async () => {
    // Arrange: the first presentation owns the window.
    const first = presentation('P-first', 1);
    const speaker = await openScript(first.win, { give: first.sync });
    await elapse(BUDGET_MS);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 1 });

    // Act: a second presentation opens the window by its name. A browser does not load the page again, and the window that asked is the opener now
    // (measured in Chromium); the presentation is handed the window, and says what it shows.
    const second = presentation('P-second', 3);
    speaker.win.opener = lab.proxy(speaker.win, second.win);
    second.sync.setPopup(lab.proxy(second.win, speaker.win));
    await elapse(BUDGET_MS);

    // Assert: it follows the new owner, asked by name, and the first one's words are nothing to it.
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 3 });
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual(['P-first', 'P-second']);
    await first.show(5);
    expect(speaker.shows().index).toBe(3);
    await second.show(4);
    expect(speaker.shows().index).toBe(4);
  });

  it('P2: the name learned for one window is not the name of the window that replaces it', async () => {
    // Arrange: paired with the first presentation, whose name it learned from the window that opened it.
    const first = presentation('P-first', 1);
    const speaker = await openScript(first.win, { give: first.sync });
    await elapse(BUDGET_MS);
    expect(speaker.shows().sync).toBe('synchronized');

    // Act: another window is its opener now, and says nothing.
    speaker.win.opener = lab.proxy(speaker.win, lab.window('elsewhere', { file: true }));
    await elapse(BUDGET_MS * 4);

    // Assert: it asked the new opener, was not answered, and did not go back to the presentation that the old opener had.
    expect(speaker.shows().sync).toBe('not-synchronized');
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual(['P-first']);
    await first.show(5);
    expect(speaker.shows().index).toBe(1);
  });

  it('an ack from a window that is not the owner is not taken for the owner, whatever session it carries', async () => {
    // Arrange: the owner does not hear the BroadcastChannel, so the hello that names it goes unanswered there.
    const owner = presentation('P-owner', 1, { fail: ['broadcastchannel'] });
    const speaker = await openScript(owner.win, { give: owner.sync, timeoutMs: 400 });
    await drain(); // the opener was asked, it said who it is, and the hello (the second handshake: S-2) is out

    // Act: another presentation of the origin answers it, with the session of the hello.
    const other = lab.window('other-presentation', { file: true });
    const channel = new other.BroadcastChannel!(CHANNEL_NAME);
    channel.postMessage({ app: PROTOCOL, v: VERSION, from: 'presenter', type: 'ack', presenter: 'P-older', session: 'S-2', seq: 9, state: stateOf(4) });
    await elapse(100);
    channel.close();

    // Assert: the answer was not taken, and the owner was reached over the transport that it hears.
    expect(speaker.states.map((state) => state.segmentIndex)).not.toContain(4);
    await elapse(1000);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'postmessage', index: 1 });
    expect(speaker.states.map((state) => state.segmentIndex)).not.toContain(4);
  });

  it('with postMessage forced to fail there is no line to the opener, and the speaker pairs as it did, with the first presentation that answers', async () => {
    const owner = presentation('P-owner', 1);
    const speaker = await openScript(owner.win, { give: owner.sync, fail: ['postmessage'] });
    await elapse(BUDGET_MS);

    expect(speaker.win.listenerCount('message')).toBe(0);
    expect(positionOf('postmessage', 'identify')).toBe(-1);
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual([undefined]);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 1 });
  });
});

describe('R2-S2: the claim of the opener is taken in every phase, on whatever transport is held', () => {
  it('not synchronized: the presentation that opens the window again is followed within 500 ms, over the BroadcastChannel that worked', async () => {
    // Arrange: followed over the BroadcastChannel, then the page is reloaded: it says goodbye on its way out.
    const first = presentation('P-first', 1);
    const speaker = await openScript(first.win, { give: first.sync });
    await elapse(BUDGET_MS);
    first.sync.dispose();
    await elapse(BUDGET_MS);
    expect(speaker.shows().sync).toBe('not-synchronized');

    // Act: the new page on the same window is handed the named window again (Present).
    const reloaded = presentation('P-reloaded', 4, { on: first.win });
    reloaded.sync.setPopup(speaker.handle);
    await elapse(BUDGET_MS);

    // Assert
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 4 });
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual(['P-first', 'P-reloaded']);
    await reloaded.show(5);
    expect(speaker.shows().index).toBe(5);
  });

  it('looking: a claim that comes while the opener is being asked is followed at once, and the question is not waited out', async () => {
    // Arrange: the presentation has not been handed the window, so it cannot answer who it is.
    const owner = presentation('P-owner', 2);
    const speaker = await openScript(owner.win);
    await elapse(100);
    expect(speaker.shows()).toEqual({ sync: 'connecting', transport: null, index: null });
    expect(speakerSent('broadcastchannel', 'hello')).toEqual([]);

    // Act
    owner.sync.setPopup(speaker.handle);
    await elapse(BUDGET_MS);

    // Assert
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 2 });
  });

  it('looking: a request to move that is made while the owner it was told of is being asked is kept, and goes to that owner when it answers', async () => {
    // Arrange: the presentation has not been handed the window, and it does not hear the BroadcastChannel, where the hello that names it waits
    const owner = presentation('P-owner', 2, { fail: ['broadcastchannel'], twoWay: true });
    const speaker = await openScript(owner.win, { twoWay: true, timeoutMs: 400 });
    await elapse(100);
    expect(speaker.shows().sync).toBe('connecting');
    expect(speaker.sync.navigate('delta')).toBe(false); // nothing is synchronized, so the surface does not ask for a move

    // Act: it says that the window is its own, and the script window shows itself as synchronized at once, with the hello still out
    owner.sync.setPopup(speaker.handle);
    await elapse(50);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'postmessage', index: 2 });
    expect(speaker.sync.navigate('delta')).toBe(true); // Previous and Next are on, and a click is not dropped
    expect(owner.moves).toEqual([]);

    // Assert: the hello on the BroadcastChannel is not answered, the one on the line is, and the move goes with that answer
    await elapse(500);
    expect(owner.moves).toEqual(['delta']);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'postmessage', index: 2 });
  });

  it('over storage, where it follows a presentation that only `storage` reaches, the claim that its owner puts on the line is taken as well', async () => {
    // Arrange: a window whose opener can be read, and a presentation that no other transport reaches: BroadcastChannel and the line time out
    const owner = presentation('P-owner', 1, { file: false, fail: ['broadcastchannel', 'postmessage'] });
    const speaker = await openScript(owner.win, { timeoutMs: 100 });
    await elapse(500);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'storage', index: 1 });
    expect(speaker.win.listenerCount('message')).toBe(1); // the line is open, though `storage` is what is held
    const said = speakerSent('storage', 'hello').length;

    // Act: the window that opened the script window says, on the line, that the script window is its own and shows segment 4
    lab.proxy(owner.win, speaker.win).postMessage(claimOf('P-owner', 4, 50), 'https://spa.test');
    await elapse(BUDGET_MS);

    // Assert: it is shown at once, and nothing is asked again
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'storage', index: 4 });
    expect(speakerSent('storage', 'hello')).toHaveLength(said);
  });

  it('the line to the opener is held while paired over the BroadcastChannel, while not synchronized, and until dispose', async () => {
    const first = presentation('P-first', 1);
    const speaker = await openScript(first.win, { give: first.sync });
    await elapse(BUDGET_MS);
    expect(speaker.shows().transport).toBe('broadcastchannel');
    expect(speaker.win.listenerCount('message')).toBe(1);

    first.sync.dispose();
    await elapse(BUDGET_MS);
    expect(speaker.shows().sync).toBe('not-synchronized');
    expect(speaker.win.listenerCount('message')).toBe(1);
    expect(lab.openChannels()).toBe(0);

    speaker.sync.dispose();
    expect(speaker.win.listenerCount()).toBe(0);
  });

  it.each(['looking', 'not synchronized'] as const)('a claim from a window that is not the opener is not taken while %s', async (phase) => {
    // Arrange
    const first = presentation('P-first', 1);
    const speaker =
      phase === 'looking'
        ? await openScript(lab.window('some-page', { file: true }), { timeoutMs: 5000 })
        : await openScript(first.win, { give: first.sync });
    await elapse(BUDGET_MS);
    if (phase === 'not synchronized') {
      first.sync.dispose();
      await elapse(BUDGET_MS);
    }
    const before = speaker.shows();

    // Act: a presentation that did not open this window says that the window is its own.
    const stranger = presentation('P-stranger', 5);
    lab.proxy(stranger.win, speaker.win).postMessage(claimOf('P-stranger', 5), '*');
    await elapse(BUDGET_MS);

    // Assert
    expect(speaker.shows()).toEqual(before);
    expect(speaker.states.map((state) => state.segmentIndex)).not.toContain(5);
  });
});

describe('a readable opener (http, https, localhost) is still known by the name on its window', () => {
  it('not synchronized: a claim that names the presentation on the window is followed at once; one that names another, or none, is not', async () => {
    // Arrange: followed, then gone (the marker comes off the window with the page).
    const first = presentation('P-first', 1, { file: false });
    const speaker = await openScript(first.win, { give: first.sync });
    await elapse(BUDGET_MS);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 1 });
    expect(positionOf('postmessage', 'identify')).toBe(-1); // the name is on the window: no one is asked
    first.sync.dispose();
    await elapse(BUDGET_MS);
    expect(speaker.shows().sync).toBe('not-synchronized');
    const opener = lab.proxy(first.win, speaker.win);

    // Act and assert: no name on the window, so the claim of the window that carries none is no one's
    opener.postMessage(claimOf('P-liar', 3), 'https://spa.test');
    await drain();
    expect(speaker.shows()).toEqual({ sync: 'not-synchronized', transport: null, index: 1 });

    // another presentation puts its name on the window; a claim that gives a different name is refused
    const second = presentation('P-second', 2, { on: first.win, file: false });
    opener.postMessage(claimOf('P-liar', 3), 'https://spa.test');
    await drain();
    expect(speaker.shows()).toEqual({ sync: 'not-synchronized', transport: null, index: 1 });

    // and the presentation that carries the name is followed at once, and then asked by name
    second.sync.setPopup(speaker.handle);
    await drain();
    expect(speaker.shows().index).toBe(2);
    expect(speaker.shows().sync).toBe('synchronized');
    await elapse(BUDGET_MS);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 2 });
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual(['P-first', 'P-second']);
  });
});

describe('the presenter answers the question of who it is only for the window it opened', () => {
  it('a window that is not the script window gets no answer, and the script window gets its claim', async () => {
    const owner = presentation('P-owner', 1);
    const popup = lab.popup(owner.win, 'speaker');
    owner.sync.setPopup(popup.handle);
    await drain();
    const claims = () => lab.sent('postmessage', owner.win.name).filter((message) => message.type === 'claim').length;
    const before = claims();

    lab.proxy(lab.window('stranger', { file: true }), owner.win).postMessage(identify, '*');
    await drain();
    expect(claims()).toBe(before);

    lab.proxy(popup.window, owner.win).postMessage(identify, '*');
    await drain();
    expect(claims()).toBe(before + 1);
  });

  it('a presentation that holds no script window (reloaded in place, opaque) cannot answer: it reaches the script window through Present', async () => {
    const reloaded = presentation('P-reloaded', 3);
    const popup = lab.popup(reloaded.win, 'speaker');

    lab.proxy(popup.window, reloaded.win).postMessage(identify, '*');
    await drain();

    expect(lab.sent('postmessage', reloaded.win.name)).toEqual([]);
    expect(Reflect.get(reloaded.win, PRESENTER_KEY)).toBe('P-reloaded');
  });
});

// §2.7: a receiver ignores any message whose counter is not greater than the last one it applied. A presentation counts every message that carries a
// state (a state, a claim, the answer to a hello) in one sequence, so for one presentation the greater counter is the later state, whichever
// transport it comes on, and the transports do not deliver in the order that it said things in: a claim that is posted on the line can be here before
// the answer that was given, over a channel, to the hello that went out first.
describe('S2: what the window shows is not taken back by a state that its presentation said before it', () => {
  // The window that opened the script window is no presentation of its own here: it says what a test has it say, and when, so that the order in
  // which things arrive is the test's. Its marker cannot be read (a file: page), so what it says it is, on the line, is all that the window knows.
  const FAIL_BEFORE: Record<TransportName, TransportName[]> = { broadcastchannel: [], postmessage: ['broadcastchannel'], storage: ['broadcastchannel'] };
  const shown = (speaker: Script): number[] => speaker.states.map((state) => state.segmentIndex);
  const said = (type: 'ack' | 'state', index: number, seq: number, session?: string) => ({ ...claimOf('P-owner', index, seq), type, ...(session === undefined ? {} : { session }) });

  /** `page` says something to the script window, on a transport. The script window hears it if it holds that one, and the line is always held. */
  function say(page: LabWindow, speaker: Script, via: Via, message: object): void {
    if (via === 'postmessage') {
      lab.proxy(page, speaker.win).postMessage(message, '*');
    } else if (via === 'broadcastchannel') {
      const channel = new page.BroadcastChannel!(CHANNEL_NAME);
      channel.postMessage(message);
      channel.close();
    } else {
      page.localStorage!.setItem(STORAGE_KEYS.toSpeaker, JSON.stringify(message));
    }
  }

  for (const via of ['broadcastchannel', 'postmessage', 'storage'] as const) {
    it.each([
      ['a claim', 'lower than', 'claim', 9],
      ['a claim', 'equal to', 'claim', 10],
      ['an ack', 'lower than', 'ack', 9],
      ['an ack', 'equal to', 'ack', 10],
    ] as const)(`while the hello is out over ${via}: %s with a counter that is %s the one of the claim that is shown does not take it back`, async (_label, _order, type, counter) => {
      // Arrange: the opener said who it is and what it shows (counter 5), and was asked by name over `via`, where no one answers yet
      const page = lab.window('presentation-P-owner', { file: true });
      const speaker = await openScript(page, { fail: FAIL_BEFORE[via], timeoutMs: 100 });
      say(page, speaker, 'postmessage', claimOf('P-owner', 1, 5));
      await drain();
      if (via === 'storage') await elapse(100); // the hello on the line, the first that works, goes unanswered: storage is next
      const session = speakerSent(via, 'hello').at(-1)?.session;
      expect(session).toEqual(expect.any(String));
      // it moved on and says so on the line (counter 10), before what it said earlier (an answer to the hello, a claim) gets here
      say(page, speaker, 'postmessage', claimOf('P-owner', 3, 10));
      await drain();
      expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: via, index: 3 });

      // Act
      say(page, speaker, type === 'claim' ? 'postmessage' : via, { ...claimOf('P-owner', 2, counter), type, ...(type === 'ack' ? { session } : {}) });
      await drain();

      // Assert: the older state was not shown, and the window is still following the presentation: what it says after that is
      expect(shown(speaker)).toEqual([1, 3]);
      expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: via, index: 3 });
      say(page, speaker, via, said('ack', 4, 11, session as string));
      await drain();
      say(page, speaker, via, said('state', 5, 12));
      await drain();
      expect(shown(speaker)).toEqual([1, 3, 4, 5]);
      expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: via, index: 5 });
    });
  }

  it('not synchronized: a claim that is not newer than the one that was shown is not shown, and nothing is asked again for it; a newer one is', async () => {
    // Arrange: a presentation claimed the window and showed segment 3 (counter 10), and then did not answer the hello on any transport
    const page = lab.window('presentation-P-owner', { file: true });
    const speaker = await openScript(page, { timeoutMs: 100 });
    say(page, speaker, 'postmessage', claimOf('P-owner', 3, 10));
    await elapse(500);
    expect(speaker.shows()).toEqual({ sync: 'not-synchronized', transport: null, index: 3 });
    const asked = speakerSent('broadcastchannel', 'hello').length;

    // Act: what it said before (counter 9), and what it said again (counter 10), reach the window that is not synchronized
    say(page, speaker, 'postmessage', claimOf('P-owner', 2, 9));
    say(page, speaker, 'postmessage', claimOf('P-owner', 4, 10));
    await elapse(100);

    // Assert: neither was shown, and neither made the window ask again
    expect(shown(speaker)).toEqual([3]);
    expect(speaker.shows()).toEqual({ sync: 'not-synchronized', transport: null, index: 3 });
    expect(speakerSent('broadcastchannel', 'hello')).toHaveLength(asked);

    // and one that is newer is shown at once, and the presentation is asked for its state again, by name
    say(page, speaker, 'postmessage', claimOf('P-owner', 5, 11));
    await drain();
    expect(shown(speaker)).toEqual([3, 5]);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'postmessage', index: 5 });
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual(Array<string>(asked + 1).fill('P-owner'));
  });

  it('a presentation that takes the window counts for itself: it is followed whatever its counters are, and the one before it is not followed again', async () => {
    // Arrange: the first presentation claimed the window with a high counter, and is being asked
    const first = lab.window('presentation-P-first', { file: true });
    const speaker = await openScript(first, { timeoutMs: 1000 });
    say(first, speaker, 'postmessage', claimOf('P-first', 4, 500));
    await drain();
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'postmessage', index: 4 });

    // Act: another presentation opens the window by its name (the browser makes it the opener), and counts from one
    const second = lab.window('presentation-P-second', { file: true });
    speaker.win.opener = lab.proxy(speaker.win, second);
    lab.proxy(second, speaker.win).postMessage(claimOf('P-second', 2, 1), '*');
    await drain();

    // Assert: it is shown, and asked by name, and its answer is taken, and the first one's counters are nothing to it
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'postmessage', index: 2 });
    expect(speakerSent('broadcastchannel', 'hello').map((hello) => hello.to)).toEqual(['P-first', 'P-second']);
    const session = speakerSent('broadcastchannel', 'hello').at(-1)?.session;
    say(second, speaker, 'broadcastchannel', { ...claimOf('P-second', 3, 2), type: 'ack', session });
    await drain();
    expect(shown(speaker)).toEqual([4, 2, 3]);
    expect(speaker.shows()).toEqual({ sync: 'synchronized', transport: 'broadcastchannel', index: 3 });
  });
});
