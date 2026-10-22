// The speaker surface, mounted on a window of the laboratory (helpers/sync-doubles.ts): what it shows, how it follows the
// presentation (AC9) and what it does when nobody answers (AC10). specs/005-teaching-spa.md section 2.7.
//
// Each test builds its own pair of windows. The presentation is the real core (sync.ts) with a state the test sets; the surface is the
// real `mountSpeaker` on the shipped index.html. The shell itself, booted, is in sync-shell.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountSpeaker } from '../../workshop/spa/src/shell/speaker';
import { createState } from '../../workshop/spa/src/shell/state';
import { createPresenterSync, parseSyncConfig, TRANSPORTS, WATCH_MS, type PresenterSync, type SyncState, type SyncTimer, type TransportName } from '../../workshop/spa/src/shell/sync';
import { clockOf, DECK, disposeScenes, scene, stateAt, type Scene, type SceneOptions } from './helpers/speaker-rig';
import { drain, Lab, type LabWindow } from './helpers/sync-doubles';

/** The hooks that make a transport the first one standing (the others before it are forced to fail). */
const FIRST: Record<TransportName, TransportName[]> = {
  broadcastchannel: [],
  postmessage: ['broadcastchannel'],
  storage: ['broadcastchannel', 'postmessage'],
};

const timer = (state: SyncTimer['state'], more: Partial<SyncTimer> = {}): SyncTimer => ({ id: 'timer-1', state, elapsedMs: 0, startedAt: null, ...more });
const MINUTE = 60_000;

/** The `state` envelopes the presentation sent on one road, oldest first. */
const statesSent = (s: Scene, via: 'broadcastchannel' | 'postmessage'): Array<Record<string, unknown>> =>
  s.lab.sent(via, 'presenter').filter((message) => message.type === 'state');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-03-01T09:00:00Z'));
});

afterEach(() => {
  disposeScenes();
  vi.useRealTimers();
});

describe('the surface', () => {
  it('is one section in main, marked as the script surface, and nothing else is there', () => {
    const s = scene();
    const main = s.speakerWin.document.getElementById('main');
    expect(main?.children).toHaveLength(1);
    expect(main?.children[0]).toBe(s.root());
    expect(s.speaker.element).toBe(s.root());
    expect(s.attr('data-surface')).toBe('script');
  });

  it('exposes the zero-based index and the id of the segment it shows', async () => {
    const s = scene({ at: 1 });
    await drain();
    expect(s.index()).toBe('1');
    expect(s.attr('data-segment-id')).toBe('beta');
  });

  it('starts on the first segment, whatever the presentation shows, until it hears from it', () => {
    const s = scene({ at: 2, withPresenter: false });
    expect(s.index()).toBe('0');
    expect(s.attr('data-segment-id')).toBe('alpha');
  });

  it('says which segment it shows and where it stands, in words', () => {
    const s = scene();
    expect(s.text('speaker-title')).toContain('Alpha segment');
    expect(s.text('speaker-position')).toBe('Segment 1 of 3');
    expect(s.el('speaker-title').localName).toBe('h1');
  });

  it('titles the document after the segment', () => {
    const s = scene();
    expect(s.speakerWin.document.title).toBe('Speaker script — Alpha segment — Teaching SPA');
  });

  it('renders the script of the segment, as markup', () => {
    const s = scene();
    expect(s.el('speaker-body').querySelector('h2')?.textContent).toBe('Alpha script');
    expect(s.text('speaker-body')).toContain('Say the alpha words.');
  });

  it('shows the script of another segment, and none of the old one, when the segment changes', async () => {
    const s = scene();
    await drain();
    await s.show(stateAt(s.ids, 1));
    expect(s.el('speaker-body').querySelectorAll('li')).toHaveLength(2);
    expect(s.text('speaker-body')).toContain('First beta point');
    expect(s.text('speaker-body')).not.toContain('alpha words');
    expect(s.text('speaker-title')).toContain('Beta segment');
    expect(s.text('speaker-position')).toBe('Segment 2 of 3');
    expect(s.speakerWin.document.title).toContain('Beta segment');
  });

  it('says that there is no script, and shows no other, for a segment that has none', async () => {
    const s = scene({ at: 1 });
    await drain();
    await s.show(stateAt(s.ids, 2));
    expect(s.text('speaker-body')).toMatch(/no speaker script/i);
    expect(s.text('speaker-body')).not.toContain('beta point');
  });

  it('controls are real buttons, so the keyboard reaches them', () => {
    const s = scene();
    for (const id of ['speaker-prev', 'speaker-next']) {
      expect(s.el(id).localName).toBe('button');
      expect(s.el(id).getAttribute('type')).toBe('button');
    }
  });

  it('mounts nothing, and starts nothing, on a page that has no main element', () => {
    const lab = new Lab();
    const win = lab.window('lonely');
    const document = {
      title: '',
      getElementById: (): null => null,
      createElement: (): never => {
        throw new Error('nothing should be created');
      },
    };
    const mounted = mountSpeaker({ document, window: win, store: createState(['alpha']), segments: DECK, announce: () => undefined, config: parseSyncConfig('') });
    expect(mounted).toBeNull();
    expect(lab.openChannels()).toBe(0);
    expect(win.listenerCount()).toBe(0);
  });
});

describe('the reveal stage', () => {
  it('shows the stage the presentation is at, and follows it', async () => {
    const s = scene({ state: { revealedSteps: 1 } });
    await drain();
    expect(s.attr('data-revealed-steps')).toBe('1');
    await s.show(stateAt(s.ids, 1, { revealedSteps: 3 }));
    expect(s.attr('data-revealed-steps')).toBe('3');
    expect(s.text('speaker-reveal')).toContain('3');
    await s.show(stateAt(s.ids, 1, { revealedSteps: 4 }));
    expect(s.attr('data-revealed-steps')).toBe('4');
    expect(s.text('speaker-reveal')).toContain('4');
  });
});

describe('the timer', () => {
  it('shows a timer that is ready, with all of the segment time left', async () => {
    const s = scene({ state: { timer: timer('idle') } });
    await drain();
    expect(s.attr('data-timer-state')).toBe('idle');
    expect(s.text('speaker-timer')).toContain('Ready');
    expect(s.text('speaker-timer')).toContain(clockOf(10 * MINUTE));
  });

  it('shows a paused timer with the time it had left when it was paused', async () => {
    const s = scene({ state: { timer: timer('paused', { elapsedMs: 150_000 }) } });
    await drain();
    expect(s.attr('data-timer-state')).toBe('paused');
    expect(s.text('speaker-timer')).toContain('Paused');
    expect(s.text('speaker-timer')).toContain(clockOf(10 * MINUTE - 150_000));
  });

  it('shows a timer that has run out', async () => {
    const s = scene({ state: { timer: timer('done', { elapsedMs: 10 * MINUTE }) } });
    await drain();
    expect(s.attr('data-timer-state')).toBe('done');
    expect(s.text('speaker-timer')).toContain('Time is up');
  });

  it('shows a running timer counting down once a second, from the time the presentation started it', async () => {
    const s = scene({ state: { timer: timer('running', { elapsedMs: MINUTE, startedAt: Date.now() }) } });
    await drain();
    expect(s.attr('data-timer-state')).toBe('running');
    expect(s.text('speaker-timer')).toContain('Running');
    expect(s.text('speaker-timer')).toContain(clockOf(9 * MINUTE));
    vi.advanceTimersByTime(1000);
    expect(s.text('speaker-timer')).toContain(clockOf(9 * MINUTE - 1000));
    vi.advanceTimersByTime(29_000);
    expect(s.text('speaker-timer')).toContain(clockOf(9 * MINUTE - 30_000));
  });

  it('counts a timer that was started before the speaker opened from the time it was started, not from the time of the speaker', async () => {
    const startedAt = Date.now() - 45_000;
    const s = scene({ state: { timer: timer('running', { elapsedMs: 0, startedAt }) } });
    await drain();
    expect(s.text('speaker-timer')).toContain(clockOf(10 * MINUTE - 45_000));
  });

  it('never shows less than nothing left', async () => {
    const s = scene({ state: { timer: timer('running', { elapsedMs: 10 * MINUTE - 2000, startedAt: Date.now() }) } });
    await drain();
    vi.advanceTimersByTime(10_000);
    expect(s.text('speaker-timer')).toContain(clockOf(0));
    expect(s.text('speaker-timer')).not.toContain('-');
  });

  it('says that a segment has no timer when the presentation has none for it', async () => {
    const s = scene({ state: { timer: null } });
    await drain();
    expect(s.attr('data-timer-state')).toBe('none');
    expect(s.text('speaker-timer')).toMatch(/no timer/i);
  });

  it('ticks only while the timer runs: a second timer is not left behind by a pause, a stop or a move', async () => {
    const watch = 1; // not the clock of a timer: the look at the window that opened the script window, which is there whatever the timer does
    const s = scene({ state: { timer: timer('running', { elapsedMs: 0, startedAt: Date.now() }) } });
    await drain();
    expect(vi.getTimerCount()).toBeGreaterThan(watch);
    await s.show(stateAt(s.ids, 0, { timer: timer('paused', { elapsedMs: 5000 }) }));
    expect(vi.getTimerCount()).toBe(watch);
    await s.show(stateAt(s.ids, 0, { timer: timer('running', { elapsedMs: 5000, startedAt: Date.now() }) }));
    expect(vi.getTimerCount()).toBeGreaterThan(watch);
    await s.show(stateAt(s.ids, 1, { timer: null }));
    expect(vi.getTimerCount()).toBe(watch);
  });

  it('keeps one ticker, not one for each state it is told', async () => {
    const s = scene({ state: { timer: timer('running', { elapsedMs: 0, startedAt: Date.now() }) } });
    await drain();
    const one = vi.getTimerCount();
    for (let step = 1; step <= 5; step += 1) await s.show(stateAt(s.ids, 0, { revealedSteps: step, timer: timer('running', { elapsedMs: 0, startedAt: Date.now() }) }));
    expect(vi.getTimerCount()).toBe(one);
  });
});

describe('the status', () => {
  it('is connecting, in words, until a handshake completes, and the controls wait', () => {
    const s = scene({ withPresenter: false });
    expect(s.attr('data-sync-state')).toBe('connecting');
    expect(s.attr('data-sync-transport')).toBe('none');
    expect(s.text('speaker-sync-status')).toMatch(/connecting/i);
    expect(s.el('speaker-next').disabled).toBe(true);
    expect(s.el('speaker-prev').disabled).toBe(true);
  });

  it.each(TRANSPORTS)('is synchronized when the presentation answers over %s, and names that transport', async (name) => {
    const s = scene({ options: { fail: FIRST[name] } });
    await drain();
    expect(s.attr('data-sync-state')).toBe('synchronized');
    expect(s.attr('data-sync-transport')).toBe(name);
    expect(s.text('speaker-sync-status')).toMatch(/synchronized/i);
    expect(s.text('speaker-sync-status')).not.toMatch(/not synchronized/i);
  });

  it('says in the status region, and keeps it there, that it is synchronized', async () => {
    const s = scene();
    await drain();
    const said = s.announced.filter((entry) => /synchronized/i.test(entry.message) && !/not synchronized/i.test(entry.message));
    expect(said).toHaveLength(1);
    expect(said[0].keep).toBe(true);
  });

  it('keeps the status text apart from the live region: the surface adds no second one', () => {
    const s = scene();
    expect(s.root().querySelector('[aria-live]')).toBeNull();
    expect(s.root().querySelector('[role="status"]')).toBeNull();
    expect(s.root().querySelector('[role="alert"]')).toBeNull();
  });
});

describe('following the presentation (AC9)', () => {
  it.each(TRANSPORTS)('shows the index the presentation advanced to, over %s, with no timer in between', async (name) => {
    const s = scene({ options: { fail: FIRST[name] } });
    await drain();
    expect(s.attr('data-sync-transport')).toBe(name);
    // Only the turns of the laboratory go by: nothing in the update may wait for a timer, let alone for 500 ms of them.
    await s.show(stateAt(s.ids, 1));
    expect(s.index()).toBe('1');
    await s.show(stateAt(s.ids, 2));
    expect(s.index()).toBe('2');
    expect(s.store.get().currentId).toBe('gamma');
    expect(vi.getTimerCount()).toBe(1); // what is left is the look at the window that opened it, which delivers nothing: the moves above waited for no clock
  });

  it('follows every move, in either direction, and returns to the start', async () => {
    const s = scene();
    await drain();
    for (const index of [1, 2, 0, 2, 1, 0]) {
      await s.show(stateAt(s.ids, index));
      expect(s.index()).toBe(String(index));
      expect(s.attr('data-segment-id')).toBe(s.ids[index]);
    }
  });

  it('shows the segment the presentation is at when it opens, not the first', async () => {
    const s = scene({ at: 2 });
    await drain();
    expect(s.index()).toBe('2');
    expect(s.text('speaker-title')).toContain('Gamma segment');
  });

  it('takes the first state from the handshake, over the road it was shaken on', async () => {
    const s = scene({ at: 1, state: { revealedSteps: 2 }, options: { fail: FIRST.storage } });
    await drain();
    expect(s.attr('data-sync-transport')).toBe('storage');
    expect(s.index()).toBe('1');
    expect(s.attr('data-revealed-steps')).toBe('2');
  });

  it('ignores a stale message and a duplicate, even from the opener, and takes a fresh one from the same road', async () => {
    const s = scene({ options: { fail: FIRST.postmessage } });
    await drain();
    expect(s.attr('data-sync-transport')).toBe('postmessage');
    await s.show(stateAt(s.ids, 1));
    await s.show(stateAt(s.ids, 2));
    const [first, second] = statesSent(s, 'postmessage');
    expect(s.index()).toBe('2');
    const replay = async (data: unknown): Promise<void> => {
      s.lab.inject(s.speakerWin, { data, origin: s.presenterWin.trueOrigin, source: s.speakerWin.opener });
      await drain();
    };
    await replay(first);
    expect(s.index()).toBe('2'); // older than what it has seen
    await replay(second);
    expect(s.index()).toBe('2'); // the same as what it has seen
    await replay({ ...first, seq: Number(second.seq) + 1 });
    expect(s.index()).toBe('1'); // the road is open: this one was refused for being old, not for being injected
  });
});

describe('direction', () => {
  it('is one way by default: the controls are disabled once synchronized, say why, and send nothing', async () => {
    const s = scene();
    await drain();
    expect(s.attr('data-sync-state')).toBe('synchronized');
    expect(s.el('speaker-next').disabled).toBe(true);
    expect(s.el('speaker-prev').disabled).toBe(true);
    expect(s.text('speaker-controls-note')).toMatch(/presentation/i);
    s.el('speaker-next').click();
    await drain();
    expect(s.navigated).toEqual([]);
    expect(s.lab.sent('broadcastchannel', 'speaker').filter((message) => message.type === 'navigate')).toEqual([]);
    expect(s.index()).toBe('0');
  });

  it('is two way when it is asked for: a control asks the presentation, and the surface moves when the presentation does', async () => {
    const s = scene({ at: 1, options: { twoWay: true } });
    await drain();
    expect(s.el('speaker-next').disabled).toBe(false);
    expect(s.el('speaker-prev').disabled).toBe(false);
    s.el('speaker-next').click();
    await drain();
    expect(s.navigated).toEqual(['gamma']);
    expect(s.index()).toBe('1'); // it does not guess: it shows what the presentation says
    await s.show(stateAt(s.ids, 2));
    expect(s.index()).toBe('2');
    s.el('speaker-prev').click();
    await drain();
    expect(s.navigated).toEqual(['gamma', 'beta']);
  });

  it('is asked for in the URL as well as in the options', async () => {
    const s = scene({ search: '?sync-two-way=1' });
    await drain();
    expect(s.el('speaker-next').disabled).toBe(false);
    s.el('speaker-next').click();
    await drain();
    expect(s.navigated).toEqual(['beta']);
  });

  it('does not offer to go past either end of the script', async () => {
    const s = scene({ options: { twoWay: true } });
    await drain();
    expect(s.el('speaker-prev').disabled).toBe(true);
    await s.show(stateAt(s.ids, 2));
    expect(s.el('speaker-next').disabled).toBe(true);
    expect(s.el('speaker-prev').disabled).toBe(false);
  });

  it('asks in vain when the presentation is one way: the request is ignored and the surface stays where the presentation is', async () => {
    const s = scene({ options: { twoWay: true }, presenterOptions: {} });
    await drain();
    s.el('speaker-next').click();
    await drain();
    expect(s.navigated).toEqual([]); // the presentation is one way: it ignores the request
    expect(s.index()).toBe('0'); // and the surface stays where the presentation is
  });
});

describe('when no handshake completes (AC10)', () => {
  const NOT_SYNCHRONIZED = /not synchronized/i;

  const HOOKS: Array<[string, SceneOptions]> = [
    ['the failure hook in the options, for all', { options: { fail: 'all' } }],
    ['the failure hook in the options, one by one', { options: { fail: [...TRANSPORTS] } }],
    ['the failure hook in the URL, for all', { search: '?sync-fail=all' }],
    ['the failure hook in the URL, one by one', { search: '?sync-fail=broadcastchannel,postmessage,storage' }],
  ];
  const TIMEOUTS: Array<[string, SceneOptions]> = [
    ['the options', { options: { timeoutMs: 200 } }],
    ['the URL', { search: '?sync-timeout=200' }],
  ];
  const asserts = (s: Scene): void => {
    expect(s.attr('data-sync-state')).toBe('not-synchronized');
    expect(s.attr('data-sync-transport')).toBe('none');
    expect(s.text('speaker-sync-status')).toMatch(NOT_SYNCHRONIZED);
    expect(s.el('speaker-sync-status').hidden).toBe(false);
  };

  it.each(HOOKS)('shows the not-synchronized state at once, with %s', (_name, o) => {
    const s = scene(o);
    asserts(s);
    expect(s.lab.traffic).toEqual([]); // a transport that is forced to fail is not opened, not tried and not timed out
    expect(s.lab.openChannels()).toBe(0);
  });

  it.each(TIMEOUTS)('shows it after each transport has had its timeout, when nobody answers (%s)', async (_name, o) => {
    const s = scene({ ...o, withPresenter: false });
    expect(s.attr('data-sync-state')).toBe('connecting');
    await vi.advanceTimersByTimeAsync(599);
    expect(s.attr('data-sync-state')).toBe('connecting');
    await vi.advanceTimersByTimeAsync(1);
    asserts(s);
    expect(vi.getTimerCount()).toBe(1); // the look that asks again from time to time (see "recover" in sync.ts): nothing is held open
    expect(s.lab.openChannels()).toBe(0);
  });

  it('shows it when a popup was blocked and the only road left is postMessage, which needs the handle that was never given', async () => {
    const s = scene({ popup: 'blocked', options: { fail: ['broadcastchannel', 'storage'], timeoutMs: 100 } });
    await vi.advanceTimersByTimeAsync(100);
    asserts(s);
  });

  it('announces the change in the status region, once, and keeps it there', () => {
    const s = scene({ options: { fail: 'all' } });
    const said = s.announced.filter((entry) => NOT_SYNCHRONIZED.test(entry.message));
    expect(said).toHaveLength(1);
    expect(said[0].keep).toBe(true);
  });

  it('does not announce it while it is still trying', async () => {
    const s = scene({ withPresenter: false, options: { timeoutMs: 200 } });
    await vi.advanceTimersByTimeAsync(300);
    expect(s.announced.filter((entry) => NOT_SYNCHRONIZED.test(entry.message))).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(300);
    expect(s.announced.filter((entry) => NOT_SYNCHRONIZED.test(entry.message))).toHaveLength(1);
  });

  it('offers manual navigation that changes the script, not only the words of the status', () => {
    const s = scene({ options: { fail: 'all' } });
    expect(s.el('speaker-next').disabled).toBe(false);
    expect(s.el('speaker-prev').disabled).toBe(true); // at the start

    s.el('speaker-next').click();
    expect(s.index()).toBe('1');
    expect(s.attr('data-segment-id')).toBe('beta');
    expect(s.store.get().currentId).toBe('beta');
    expect(s.text('speaker-title')).toContain('Beta segment');
    expect(s.text('speaker-position')).toBe('Segment 2 of 3');
    expect(s.text('speaker-body')).toContain('First beta point');
    expect(s.text('speaker-body')).not.toContain('alpha words');
    expect(s.speakerWin.document.title).toContain('Beta segment');

    s.el('speaker-next').click();
    expect(s.index()).toBe('2');
    expect(s.text('speaker-body')).toMatch(/no speaker script/i);
    expect(s.el('speaker-next').disabled).toBe(true); // at the end

    s.el('speaker-prev').click();
    s.el('speaker-prev').click();
    expect(s.index()).toBe('0');
    expect(s.text('speaker-body')).toContain('Say the alpha words.');
    expect(s.attr('data-sync-state')).toBe('not-synchronized'); // moving does not pretend it is synchronized
  });

  it('works the same from a timeout as from a forced failure', async () => {
    const s = scene({ withPresenter: false, options: { timeoutMs: 100 } });
    expect(s.el('speaker-next').disabled).toBe(true); // still connecting
    await vi.advanceTimersByTimeAsync(300);
    expect(s.el('speaker-next').disabled).toBe(false);
    s.el('speaker-next').click();
    expect(s.index()).toBe('1');
    expect(s.text('speaker-body')).toContain('First beta point');
  });

  it('announces where manual navigation went, and sends nothing to anyone', () => {
    const s = scene({ options: { fail: 'all' } });
    s.announced.length = 0;
    s.el('speaker-next').click();
    expect(s.announced).toContainEqual({ message: 'Segment 2 of 3: Beta segment', keep: false });
    expect(s.lab.traffic).toEqual([]);
  });

  it('says what is not known instead of showing what is not true: no reveal stage and no timer', () => {
    const s = scene({ options: { fail: 'all' } });
    expect(s.attr('data-revealed-steps')).toBe('0');
    expect(s.attr('data-timer-state')).toBe('none');
  });

  it('does not follow a presentation that appears after it gave up, when every transport is forced to fail: nothing is tried, so there is nothing to look again with', async () => {
    const s = scene({ withPresenter: false, options: { fail: 'all' } });
    s.el('speaker-next').click();
    await drain();
    expect(s.index()).toBe('1');
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('an opaque origin', () => {
  it('has one road, postMessage, with * as the target, and takes a message only from the window it holds', async () => {
    const s = scene({ presenter: { opaque: true }, options: { timeoutMs: 100 } });
    await vi.advanceTimersByTimeAsync(100); // BroadcastChannel and storage are of no use to a document with an opaque origin
    await drain();
    expect(s.attr('data-sync-state')).toBe('synchronized');
    expect(s.attr('data-sync-transport')).toBe('postmessage');

    const sent = s.lab.traffic.filter((entry) => entry.via === 'postmessage');
    expect(sent.length).toBeGreaterThan(0);
    for (const entry of sent) expect(entry.targetOrigin).toBe('*');
    expect(s.lab.traffic.filter((entry) => entry.via === 'storage')).toEqual([]);
    expect(s.presenterWin.keysInStorage()).toEqual([]);
    expect(s.speakerWin.keysInStorage()).toEqual([]);

    await s.show(stateAt(s.ids, 2));
    expect(s.index()).toBe('2');

    // What is sent is the state of the presentation, and nothing that a page could be robbed of.
    const text = JSON.stringify(sent.map((entry) => entry.data));
    expect(text).not.toMatch(/href|url|cookie|token|password|secret|credential|authorization/i);

    // A message that is well formed, and newer, from a window that is not the one it holds, is not acted on...
    const genuine = statesSent(s, 'postmessage').at(-1);
    if (genuine === undefined) throw new Error('the presentation sent no state');
    const forged = { ...genuine, seq: Number(genuine.seq) + 5, state: { ...(genuine.state as object), segmentIndex: 0, segmentId: 'alpha' } };
    const stranger = s.lab.proxy(s.speakerWin, s.lab.window('stranger', { opaque: true }));
    s.lab.inject(s.speakerWin, { data: forged, origin: 'null', source: stranger });
    await drain();
    expect(s.index()).toBe('2');
    s.lab.inject(s.speakerWin, { data: forged, origin: 'null', source: null });
    await drain();
    expect(s.index()).toBe('2');

    // ...and the same message from the window it holds is: it was refused for where it came from, and for nothing else.
    s.lab.inject(s.speakerWin, { data: forged, origin: 'null', source: s.speakerWin.opener });
    await drain();
    expect(s.index()).toBe('0');
  });
});

describe('lifecycle', () => {
  it.each(TRANSPORTS)('lets go of everything it holds on %s when it is disposed, and stops following', async (name) => {
    const s = scene({ options: { fail: FIRST[name] }, state: { timer: timer('running', { elapsedMs: 0, startedAt: Date.now() }) } });
    await drain();
    expect(s.attr('data-sync-transport')).toBe(name);
    if (name === 'broadcastchannel') expect(s.lab.openChannels()).toBe(2);
    if (name === 'postmessage') expect(s.speakerWin.listenerCount('message')).toBe(1);
    if (name === 'storage') expect(s.speakerWin.listenerCount('storage')).toBe(1);

    s.speaker.dispose();
    expect(s.lab.openChannels()).toBe(name === 'broadcastchannel' ? 1 : 0);
    expect(s.speakerWin.listenerCount('message')).toBe(0);
    expect(s.speakerWin.listenerCount('storage')).toBe(0);
    expect(vi.getTimerCount()).toBe(0); // the ticker of a running timer too

    const before = s.index();
    await s.show(stateAt(s.ids, 2));
    s.store.navigate('beta');
    expect(s.index()).toBe(before);

    s.presenter?.dispose();
    expect(s.lab.openChannels()).toBe(0);
  });

  it('lets go of what it holds while it is still connecting', async () => {
    const s = scene({ withPresenter: false, options: { timeoutMs: 500 } });
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    s.speaker.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(s.lab.openChannels()).toBe(0);
    await vi.advanceTimersByTimeAsync(5000);
    expect(s.attr('data-sync-state')).toBe('connecting'); // it did not go on to probe a transport after it was disposed
  });

  it('can be disposed twice', () => {
    const s = scene();
    s.speaker.dispose();
    expect(() => s.speaker.dispose()).not.toThrow();
  });

  it('does not announce, or move, after it is disposed', () => {
    const s = scene({ options: { fail: 'all' } });
    s.speaker.dispose();
    s.announced.length = 0;
    s.el('speaker-next').click();
    expect(s.index()).toBe('0');
    expect(s.announced).toEqual([]);
  });
});

describe('when the window changes hands, or the presentation it follows goes away (AC9, AC10)', () => {
  const NOT_SYNCHRONIZED = /not synchronized/i;
  /** What AC9 allows between a presentation moving and the script showing it. */
  const BUDGET_MS = 500;
  const extras: PresenterSync[] = [];

  afterEach(() => {
    for (const each of extras.splice(0)) each.dispose();
  });

  /** A presentation of its own on `win`: a page that was loaded there, or one that opens the script window by its name. */
  const presentation = (s: Scene, win: LabWindow, id: string, shown: { value: SyncState }, o: { fail?: TransportName[]; twoWay?: boolean } = {}): PresenterSync => {
    const made = createPresenterSync({
      window: win,
      config: parseSyncConfig('', { fail: o.fail ?? [], twoWay: o.twoWay === true }),
      snapshot: () => shown.value,
      segmentIds: s.ids,
      navigate: (segment) => void s.navigated.push(segment),
      presenterId: id,
    });
    extras.push(made);
    return made;
  };

  /** The turns of the laboratory and the clock, 10 ms at a time, until `done` or until the 500 ms is up. How long that took. */
  const within = async (done: () => boolean): Promise<number> => {
    let elapsed = 0;
    await drain();
    while (!done() && elapsed < BUDGET_MS) {
      await vi.advanceTimersByTimeAsync(10);
      await drain();
      elapsed += 10;
    }
    return elapsed;
  };

  /** Every value `data-sync-state` was given from now on, oldest first. */
  const watchStates = (s: Scene): (() => string[]) => {
    const spy = vi.spyOn(s.root(), 'setAttribute');
    return () => spy.mock.calls.filter(([name]) => name === 'data-sync-state').map(([, value]) => String(value));
  };

  const notSynchronized = (s: Scene): void => {
    expect(s.attr('data-sync-state')).toBe('not-synchronized');
    expect(s.attr('data-sync-transport')).toBe('none');
    expect(s.text('speaker-sync-status')).toMatch(NOT_SYNCHRONIZED);
    expect(s.el('speaker-sync-status').hidden).toBe(false);
    expect(s.attr('data-revealed-steps')).toBe('0'); // what the presentation last said is not shown as if it were true
    expect(s.attr('data-timer-state')).toBe('none');
    const said = s.announced.filter((entry) => NOT_SYNCHRONIZED.test(entry.message));
    expect(said).toHaveLength(1);
    expect(said[0].keep).toBe(true);
  };

  it.each(TRANSPORTS)('stops saying that it is synchronized when the presentation says goodbye, over %s, and its own controls take over', async (name) => {
    const s = scene({ at: 1, options: { fail: FIRST[name] }, state: { revealedSteps: 2, timer: timer('running', { startedAt: Date.now() }) } });
    await drain();
    expect(s.attr('data-sync-state')).toBe('synchronized');
    expect(s.attr('data-sync-transport')).toBe(name);
    expect(s.attr('data-timer-state')).toBe('running');
    expect(s.el('speaker-next').disabled).toBe(true); // the presentation moves the script
    s.announced.length = 0;

    s.presenter?.dispose(); // `pagehide` of a page that is not kept
    await drain();
    notSynchronized(s);
    expect(s.el('speaker-next').disabled).toBe(false);
    expect(s.el('speaker-prev').disabled).toBe(false);
    const quiet = s.lab.traffic.length;
    s.el('speaker-next').click();
    expect(s.index()).toBe('2');
    expect(s.store.get().currentId).toBe('gamma');
    s.el('speaker-prev').click();
    s.el('speaker-prev').click();
    expect(s.index()).toBe('0');
    expect(s.attr('data-sync-state')).toBe('not-synchronized'); // moving does not pretend that it is synchronized
    expect(s.lab.traffic).toHaveLength(quiet); // and asks no one
  });

  it.each(TRANSPORTS)('stops saying it within a look when the window of the presentation is closed with no word, over %s', async (name) => {
    const s = scene({ options: { fail: FIRST[name] } });
    await drain();
    s.announced.length = 0;
    const quiet = s.lab.traffic.length;

    s.presenterWin.closed = true;
    await vi.advanceTimersByTimeAsync(2 * WATCH_MS);
    await drain();
    notSynchronized(s);
    expect(s.el('speaker-next').disabled).toBe(false);
    expect(s.lab.traffic).toHaveLength(quiet); // it found out by looking, and asked no one
    s.el('speaker-next').click();
    expect(s.index()).toBe('1');
  });

  it.each(TRANSPORTS)('follows a presentation that is reloaded in place, over %s, to what its new page shows, within the 500 ms of AC9', async (name) => {
    const s = scene({ options: { fail: FIRST[name] } });
    await drain();
    expect(s.index()).toBe('0');
    s.announced.length = 0;

    const shown = { value: stateAt(s.ids, 2, { revealedSteps: 1 }) };
    presentation(s, s.presenterWin, 'P-2', shown, { fail: FIRST[name] }); // the page that was there is gone and said nothing; a new one is on the window
    const took = await within(() => s.index() === '2' && s.attr('data-sync-state') === 'synchronized');
    expect(took).toBeLessThanOrEqual(BUDGET_MS);
    expect(s.attr('data-sync-transport')).toBe(name);
    expect(s.attr('data-revealed-steps')).toBe('1');
    expect(s.announced).toContainEqual({ message: 'Synchronized with the presentation.', keep: true });

    await s.show(stateAt(s.ids, 1)); // the page that is gone, if it were not
    expect(s.index()).toBe('2');
  });

  it.each(TRANSPORTS)('follows the presentation that opens the window again by its name, over %s, at once, and says nothing but synchronized while it does', async (name) => {
    const s = scene({ options: { fail: FIRST[name] } });
    await drain();
    const written = watchStates(s);
    s.announced.length = 0;

    const win = s.lab.window('presenter-2');
    const shown = { value: stateAt(s.ids, 2, { revealedSteps: 3 }) };
    const second = presentation(s, win, 'P-2', shown, { fail: FIRST[name] });
    s.speakerWin.opener = s.lab.proxy(s.speakerWin, win); // the browser makes it the opener of the window it opens again by name
    second.setPopup(s.lab.proxy(win, s.speakerWin));
    await drain();
    expect(s.index()).toBe('2'); // in the turns of the laboratory: no clock, so well inside the 500 ms
    expect(s.attr('data-revealed-steps')).toBe('3');
    expect(s.attr('data-sync-transport')).toBe(name);
    expect(new Set(written())).toEqual(new Set(['synchronized']));
    expect(s.announced.some((entry) => NOT_SYNCHRONIZED.test(entry.message))).toBe(false);

    await s.show(stateAt(s.ids, 1)); // the presentation that had the window, still open, can no longer move it
    expect(s.index()).toBe('2');
    shown.value = stateAt(s.ids, 0);
    second.publish();
    await drain();
    expect(s.index()).toBe('0'); // and the one that has it does
    expect(new Set(written())).toEqual(new Set(['synchronized']));
  });

  it('asks the presentation to move that has the window now, and moves nothing, when two-way navigation is on', async () => {
    const s = scene({ options: { twoWay: true } });
    await drain();
    const win = s.lab.window('presenter-2');
    const shown = { value: stateAt(s.ids, 1) };
    const second = presentation(s, win, 'P-2', shown, { twoWay: true });
    s.speakerWin.opener = s.lab.proxy(s.speakerWin, win); // the browser makes it the opener of the window it opens again by name
    second.setPopup(s.lab.proxy(win, s.speakerWin));
    await drain();
    expect(s.index()).toBe('1');

    s.el('speaker-next').click();
    await drain();
    expect(s.navigated).toEqual(['gamma']); // the presentation that has the window moved, once, and the one before it was not asked
    expect(s.index()).toBe('1'); // and the surface moves when that presentation shows it
    shown.value = stateAt(s.ids, 2);
    second.publish();
    await drain();
    expect(s.index()).toBe('2');
  });

  it('moves the script by itself when a click comes after the presentation went and before the window noticed, and asks no one', async () => {
    const s = scene({ options: { twoWay: true } });
    await drain();
    expect(s.el('speaker-next').disabled).toBe(false); // two-way: the controls ask the presentation to move
    s.announced.length = 0;
    const quiet = s.lab.traffic.length;

    s.presenterWin.closed = true; // gone, and not looked at yet
    s.el('speaker-next').click();
    expect(s.attr('data-sync-state')).toBe('not-synchronized');
    expect(s.index()).toBe('1'); // the click was not lost: the script moved by itself
    expect(s.navigated).toEqual([]);
    expect(s.lab.traffic).toHaveLength(quiet);
    const said = s.announced.filter((entry) => NOT_SYNCHRONIZED.test(entry.message));
    expect(said).toHaveLength(1);
    expect(said[0].keep).toBe(true);
  });

  it('does not stop saying that it is synchronized because the presentation is idle, however long it waits, and asks no one to find out', async () => {
    const s = scene();
    await drain();
    const written = watchStates(s);
    s.announced.length = 0;
    const quiet = s.lab.traffic.length;

    for (const wait of [500, 1000, 2500, 30_000]) {
      await vi.advanceTimersByTimeAsync(wait);
      await drain();
    }
    expect(written()).toEqual([]); // nothing was said: no status changed
    expect(s.attr('data-sync-state')).toBe('synchronized');
    expect(s.announced).toEqual([]);
    expect(s.lab.traffic).toHaveLength(quiet); // and nothing was asked of the presentation to find out that it is there
    await s.show(stateAt(s.ids, 2));
    expect(s.index()).toBe('2'); // and it still follows, after all that time
  });

  it('follows a presentation that appears after it gave up, when nothing was forced: it looks again, quietly, and says so when one answers', async () => {
    const s = scene({ withPresenter: false, options: { timeoutMs: 100 } });
    await vi.advanceTimersByTimeAsync(300);
    expect(s.attr('data-sync-state')).toBe('not-synchronized');
    s.announced.length = 0;

    const shown = { value: stateAt(s.ids, 2) };
    presentation(s, s.presenterWin, 'P-9', shown);
    const took = await within(() => s.attr('data-sync-state') === 'synchronized');
    expect(took).toBeLessThanOrEqual(BUDGET_MS);
    expect(s.index()).toBe('2');
    expect(s.announced).toContainEqual({ message: 'Synchronized with the presentation.', keep: true });
  });
});
