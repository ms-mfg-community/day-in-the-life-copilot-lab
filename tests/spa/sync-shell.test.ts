// The shell as each of the two surfaces (specs/005-teaching-spa.md AC9, AC10 and section 2.7): main.ts booted in a window of the laboratory
// (helpers/sync-doubles.ts), once as the presentation, once as the script surface at #/script. The other side of each pair is the real
// core (sync.ts) or the real `mountSpeaker` on a window of its own, because two copies of main.ts cannot share one process: it reads the
// bare `window` and `document`. The two booted for real, in two real windows, are in sync-browser-check.mjs.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPresentation } from '../../workshop/spa/src/shell/presentation';
import { hashFor } from '../../workshop/spa/src/shell/router';
import { mountSpeaker, type Speaker } from '../../workshop/spa/src/shell/speaker';
import { createState } from '../../workshop/spa/src/shell/state';
import { createPresenterSync, createSpeakerSync, parseSyncConfig, PROTOCOL, VERSION, type SyncOptions, type SyncState, type SyncStatus } from '../../workshop/spa/src/shell/sync';
import { createBrowser, FakeEvent, type FakeElement } from './helpers/fake-dom';
import { ROOT, segmentsFromPipeline } from './helpers/interaction-harness';
import { installDoubles, type Doubles, type DoublesOptions } from './helpers/presentation-doubles';
import { bootShell, clockOf, INDEX_HTML, leave, leaveShells, settle, stateAt, type Announced, type Shell } from './helpers/speaker-rig';
import { drain, Lab, type LabWindow } from './helpers/sync-doubles';

const SEGMENTS = segmentsFromPipeline();
const IDS = SEGMENTS.map((segment) => segment.id);
const SCRIPT = '#/script';
const MINUTE = 60_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-03-01T09:00:00Z'));
});

const surfaces: Speaker[] = [];
afterEach(() => {
  for (const surface of surfaces.splice(0)) surface.dispose();
  leaveShells();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

// -- helpers ------------------------------------------------------------------------------------------------------------------

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`${what} is not there`);
  return value;
}

/** What a piece of markup is as text in the fake DOM, so that a test can ask for the script that was built without writing a word of it. */
function textOf(win: LabWindow, html: string): string {
  const probe = win.document.createElement('div');
  probe.innerHTML = html;
  return probe.textContent;
}

const surfaceAttr = (win: LabWindow, name: string): string | null => win.document.getElementById('speaker-script')?.getAttribute(name) ?? null;
const bodyText = (win: LabWindow): string => must(win.document.getElementById('speaker-body'), '#speaker-body').textContent;
const idle = async (ms = 100): Promise<void> => void (await vi.advanceTimersByTimeAsync(ms));

/** A script window with main.ts booted in it at #/script, and the presentation that opened it as the core, with a state of its own. */
async function speakerShell(o: { search?: string; hash?: string; peer?: boolean; peerOptions?: SyncOptions } = {}) {
  const lab = new Lab();
  const opener = lab.window('presenter', { search: o.search });
  const popup = lab.popup(opener, 'speaker', { search: o.search });
  const current = { value: stateAt(IDS, 0) };
  const peer =
    o.peer === false
      ? undefined
      : createPresenterSync({ window: opener, config: parseSyncConfig(o.search, o.peerOptions), snapshot: () => current.value, segmentIds: IDS, presenterId: 'P-1' });
  peer?.setPopup(popup.handle);
  const shell = await bootShell(popup.window, { hash: o.hash ?? SCRIPT });
  const show = async (next: SyncState): Promise<void> => {
    current.value = next;
    peer?.publish();
    await drain();
  };
  return { lab, opener, popup, peer, shell, show, win: popup.window };
}

/** A presentation window with main.ts booted in it, and the window that `window.open` is going to give it. */
async function presenterShell(o: { search?: string; doubles?: DoublesOptions } = {}) {
  const lab = new Lab();
  const win = lab.window('presenter', { search: o.search });
  const popup = lab.popup(win, 'speaker', { search: o.search });
  const shell = await bootShell(win, { doubles: o.doubles });
  const { doubles } = shell;
  // The double's own `open` logs the call and hands back a stand-in; this one logs the same, and hands back the real window of the lab.
  doubles.open.mockImplementation(() => {
    doubles.log.push('open');
    return doubles.behaviour.popupBlocked ? null : popup.handle;
  });
  return { lab, win, popup, shell };
}

/** The user presents, with the speaker script window asked for. */
async function present(shell: Shell, withScript = true): Promise<void> {
  if (withScript) shell.check('present-open-script', true);
  shell.press('present-start');
  await settle();
}

/** The page of the script window loading: the real surface, on a window of its own. */
function openSurface(win: LabWindow, search?: string, options?: SyncOptions) {
  win.document.open(INDEX_HTML);
  const store = createState(IDS);
  const announced: Announced[] = [];
  const speaker = must(
    mountSpeaker({
      document: win.document,
      window: win,
      store,
      segments: SEGMENTS,
      announce: (message, o) => void announced.push({ message, keep: o?.keep === true }),
      config: parseSyncConfig(search, options),
    }),
    'the speaker surface',
  );
  surfaces.push(speaker);
  return { speaker, store, announced };
}

/** The core of the script window, for a test that wants the states and the statuses and not the page. */
function openCore(win: LabWindow, search?: string, options?: SyncOptions) {
  const states: SyncState[] = [];
  const statuses: SyncStatus[] = [];
  const sync = createSpeakerSync({
    window: win,
    config: parseSyncConfig(search, options),
    segmentIds: IDS,
    onStatus: (status) => void statuses.push(status),
    onState: (state) => void states.push(state),
    sessionId: 'S-1',
  });
  return { sync, states, statuses };
}

const navLink = (shell: Shell, id: string): FakeElement => must(shell.el('segment-nav').querySelector(`a[href="${hashFor(id)}"]`), `the link to ${id}`);

// -- the shell, as the script surface -------------------------------------------------------------------------------------------

describe('the shell at #/script', () => {
  it('boots the speaker surface in the same document, instead of a segment', async () => {
    const { shell } = await speakerShell();
    const main = shell.el('main');
    expect(main.children).toHaveLength(1);
    expect(main.children[0]).toBe(shell.el('speaker-script'));
    expect(surfaceAttr(shell.win, 'data-surface')).toBe('script');
    expect(surfaceAttr(shell.win, 'data-segment-index')).toBe('0');
    expect(shell.win.location.hash).toBe(SCRIPT);
    expect(shell.spa.speaker).toBeDefined();
    expect(shell.spa.presentation).toBeUndefined();
    expect(shell.win.document.getElementById('m1-segment-timer')).toBeNull(); // a slide's interaction is not mounted on the script
  });

  it('keeps what the two surfaces share: the skip link and the one status region', async () => {
    const { shell } = await speakerShell();
    const skip = must(shell.win.document.querySelector('a.skip-link'), 'the skip link');
    expect(skip.isRendered()).toBe(true);
    expect(shell.liveRegion.getAttribute('role')).toBe('status');
    expect(shell.win.document.querySelectorAll('[aria-live]')).toHaveLength(1);
  });

  it('hides the controls and the navigation that belong to the presentation', async () => {
    const { shell } = await speakerShell();
    expect(shell.el('presentation-controls').hidden).toBe(true);
    expect(shell.el('segment-nav').hidden).toBe(true);
  });

  it('shows the script that was built for the segment, and its title and its position', async () => {
    const { shell } = await speakerShell();
    const first = SEGMENTS[0];
    expect(first.scriptHtml.length).toBeGreaterThan(0);
    expect(bodyText(shell.win)).toBe(textOf(shell.win, first.scriptHtml));
    expect(shell.el('speaker-title').textContent).toContain(first.title);
    expect(shell.el('speaker-position').textContent).toBe(`Segment 1 of ${IDS.length}`);
    expect(shell.win.document.title).toContain(first.title);
  });

  it('shows the script of every segment the presentation moves to, and follows it there (AC9)', async () => {
    const { shell, show } = await speakerShell();
    await drain();
    expect(surfaceAttr(shell.win, 'data-sync-state')).toBe('synchronized');
    for (const index of [1, 2, 3, 4, 5, 6, 7, 0].filter((i) => i < IDS.length)) {
      await show(stateAt(IDS, index));
      expect(surfaceAttr(shell.win, 'data-segment-index')).toBe(String(index));
      expect(surfaceAttr(shell.win, 'data-segment-id')).toBe(IDS[index]);
      expect(bodyText(shell.win)).toBe(textOf(shell.win, SEGMENTS[index].scriptHtml));
      expect(shell.win.document.title).toContain(SEGMENTS[index].title);
      expect(shell.win.location.hash).toBe(SCRIPT); // the surface does not take the hash of the segment it shows
    }
  });

  it('shows the reveal stage and the timer that the presentation reports', async () => {
    const { shell, show } = await speakerShell();
    await drain();
    const timer = { id: 'm1-segment-timer', state: 'running' as const, elapsedMs: 0, startedAt: Date.now() };
    await show(stateAt(IDS, 0, { revealedSteps: 2, timer }));
    expect(surfaceAttr(shell.win, 'data-revealed-steps')).toBe('2');
    expect(surfaceAttr(shell.win, 'data-timer-state')).toBe('running');
    expect(shell.el('speaker-timer').textContent).toContain(clockOf(SEGMENTS[0].minutes * MINUTE));
    vi.advanceTimersByTime(1000);
    expect(shell.el('speaker-timer').textContent).toContain(clockOf(SEGMENTS[0].minutes * MINUTE - 1000));
  });

  it('reads the hooks from its own URL: the popup keeps the query of the window that opened it', async () => {
    const { shell } = await speakerShell({ search: '?sync-fail=broadcastchannel' });
    await drain();
    expect(surfaceAttr(shell.win, 'data-sync-transport')).toBe('postmessage');
  });

  it('is two way only when the URL asks for it', async () => {
    const one = await speakerShell();
    await drain();
    expect(one.shell.el('speaker-next').disabled).toBe(true);
    leaveShells();
    vi.resetModules();
    const two = await speakerShell({ search: '?sync-two-way=1', peerOptions: { twoWay: true } });
    await drain();
    expect(two.shell.el('speaker-next').disabled).toBe(false);
  });
});

describe('AC10 in the shell: when no handshake completes', () => {
  it('shows not-synchronized with every transport forced to fail, offers manual navigation, and announces it in #live-region', async () => {
    const { shell, win } = await speakerShell({ search: '?sync-fail=all' });
    expect(surfaceAttr(win, 'data-sync-state')).toBe('not-synchronized');
    const status = shell.el('speaker-sync-status');
    expect(status.hidden).toBe(false);
    expect(status.textContent).toMatch(/not synchronized/i);
    await idle();
    expect(shell.liveRegion.textContent).toMatch(/not synchronized/i);

    // the navigation is a working one: it changes the script that is shown, and nothing else about the page
    expect(shell.el('speaker-next').disabled).toBe(false);
    shell.press('speaker-next');
    expect(surfaceAttr(win, 'data-segment-index')).toBe('1');
    expect(surfaceAttr(win, 'data-segment-id')).toBe(IDS[1]);
    expect(bodyText(win)).toBe(textOf(win, SEGMENTS[1].scriptHtml));
    expect(shell.el('speaker-title').textContent).toContain(SEGMENTS[1].title);
    expect(win.location.hash).toBe(SCRIPT);
    expect(shell.spa.store.get().currentId).toBe(IDS[1]);

    shell.press('speaker-prev');
    expect(surfaceAttr(win, 'data-segment-index')).toBe('0');
    expect(bodyText(win)).toBe(textOf(win, SEGMENTS[0].scriptHtml));
  });

  it('does not lose the announcement to the navigation that follows at once: the two are written together', async () => {
    const { shell } = await speakerShell({ search: '?sync-fail=all' });
    // Before the status region has been written (it is, a moment after it is cleared): this is what `keep` is for.
    shell.press('speaker-next');
    await idle();
    expect(shell.liveRegion.textContent).toMatch(/not synchronized/i);
    expect(shell.liveRegion.textContent).toContain(`Segment 2 of ${IDS.length}`);
  });

  it('shows it after the timeouts, over a window that nobody answers', async () => {
    const { shell, win } = await speakerShell({ search: '?sync-timeout=100', peer: false });
    expect(surfaceAttr(win, 'data-sync-state')).toBe('connecting');
    await idle(299);
    expect(surfaceAttr(win, 'data-sync-state')).toBe('connecting');
    await idle(1);
    expect(surfaceAttr(win, 'data-sync-state')).toBe('not-synchronized');
    await idle(50); // the region is cleared and written a moment later, so that the same words are read again
    expect(shell.liveRegion.textContent).toMatch(/not synchronized/i);
    shell.press('speaker-next');
    expect(surfaceAttr(win, 'data-segment-index')).toBe('1');
  });
});

describe('the two surfaces are told apart by the hash, in one document', () => {
  it('a hash change to a segment, on the script surface, is a change of surface: the page is loaded again, and nothing is rewritten', async () => {
    const { shell, win } = await speakerShell();
    win.location.hash = hashFor(IDS[1]);
    await settle();
    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(win.location.hash).toBe(hashFor(IDS[1]));
    expect(surfaceAttr(win, 'data-segment-index')).toBe('0');
    expect(shell.spa.store.get().currentId).toBe(IDS[0]);
  });

  it('an unknown hash on the script surface is put back to #/script and announced, as on the presentation', async () => {
    const { shell, win } = await speakerShell();
    win.location.hash = '#/there-is-no-such-segment';
    await settle();
    await idle();
    expect(win.location.hash).toBe(SCRIPT);
    expect(win.location.reload).not.toHaveBeenCalled();
    expect(shell.liveRegion.textContent).toMatch(/unknown segment/i);
  });

  it('the skip link, on the script surface, moves the focus and leaves the script where it is', async () => {
    const { shell, win } = await speakerShell();
    shell.pointer.click(must(win.document.querySelector('a.skip-link'), 'the skip link'));
    await settle();
    expect(win.location.hash).toBe(SCRIPT);
    expect(win.location.reload).not.toHaveBeenCalled();
    expect(surfaceAttr(win, 'data-segment-index')).toBe('0');
    expect(win.document.activeElement).toBe(shell.el('main'));
  });

  it('a hash change to #/script, on the presentation, is a change of surface: the page is loaded again', async () => {
    const { win } = await presenterShell();
    win.location.hash = SCRIPT;
    await settle();
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('a move between segments, on the presentation, loads nothing again and keeps the hash of the segment', async () => {
    const { shell, win } = await presenterShell();
    shell.pointer.click(navLink(shell, IDS[1]));
    await settle();
    expect(win.location.reload).not.toHaveBeenCalled();
    expect(win.location.hash).toBe(hashFor(IDS[1]));
    expect(shell.spa.store.get().currentId).toBe(IDS[1]);
    expect(win.document.getElementById('speaker-script')).toBeNull();
  });
});

// -- the shell, as the presentation ---------------------------------------------------------------------------------------------

describe('the shell as the presentation', () => {
  it('asks for the script window by name, without noopener, and keeps the window it is given for the postMessage road', async () => {
    const { shell, popup, lab } = await presenterShell({ search: '?sync-fail=broadcastchannel,storage' });
    const peer = openCore(popup.window, '?sync-fail=broadcastchannel,storage');
    await present(shell);
    expect(shell.doubles.open).toHaveBeenCalledTimes(1);
    const [url, target, features] = shell.doubles.open.mock.calls[0];
    expect(url).toBe(SCRIPT);
    expect(target).toBe('teaching-spa-script');
    expect(String(features ?? '')).not.toMatch(/noopener|noreferrer/i);

    peer.sync.start();
    await drain();
    // The only road left is postMessage, which is answered only to the window that was opened: the handle was kept, or this is not.
    expect(peer.sync.status).toMatchObject({ state: 'synchronized', transport: 'postmessage' });
    const sent = lab.traffic.filter((entry) => entry.via === 'postmessage');
    expect(sent.length).toBeGreaterThan(0);
    for (const entry of sent) expect(entry.targetOrigin).not.toBe('*');
  });

  it('keeps the order of SPA-06: the script window, then the keyboard lock, then fullscreen', async () => {
    const { shell } = await presenterShell();
    shell.check('present-open-script', true);
    shell.check('present-keyboard-lock', true);
    shell.press('present-start');
    expect(shell.doubles.log).toEqual(['open', 'lock', 'requestFullscreen']); // as the click leaves it, before anything is awaited
  });

  it('moves the script surface within 500 ms of advancing the presentation, once it is open (AC9)', async () => {
    const { shell, popup } = await presenterShell();
    await present(shell);
    const surface = openSurface(popup.window); // the page of the new window loads and probes
    await drain();
    expect(surfaceAttr(popup.window, 'data-sync-state')).toBe('synchronized');
    expect(surfaceAttr(popup.window, 'data-segment-index')).toBe('0');

    // The user advances. Nothing but the turns of the laboratory go by: not a timer, let alone 500 ms of them.
    shell.pointer.click(navLink(shell, IDS[1]));
    await settle();
    expect(shell.spa.store.get().currentId).toBe(IDS[1]);
    expect(surfaceAttr(popup.window, 'data-segment-index')).toBe('1');
    expect(bodyText(popup.window)).toBe(textOf(popup.window, SEGMENTS[1].scriptHtml));

    shell.pointer.click(navLink(shell, IDS[2]));
    await settle();
    expect(surfaceAttr(popup.window, 'data-segment-index')).toBe('2');
    expect(surface.store.get().currentId).toBe(IDS[2]);
  });

  it('moves it over each road when only that road is standing', async () => {
    for (const hooks of ['', '?sync-fail=broadcastchannel', '?sync-fail=broadcastchannel,postmessage']) {
      const { shell, popup } = await presenterShell({ search: hooks });
      await present(shell);
      openSurface(popup.window, hooks);
      await drain();
      expect(surfaceAttr(popup.window, 'data-sync-state')).toBe('synchronized');
      shell.pointer.click(navLink(shell, IDS[1]));
      await settle();
      expect(surfaceAttr(popup.window, 'data-segment-index')).toBe('1');
      leaveShells();
      vi.resetModules();
    }
  });

  it('shows the timer that the user starts on the presentation, and the reveal stage, on the script surface', async () => {
    const { shell, popup } = await presenterShell();
    await present(shell);
    openSurface(popup.window);
    await drain();
    const start = must(
      shell.el('m1-segment-timer').querySelectorAll('button').find((button) => button.textContent.trim() === 'Start'),
      'the Start button of the timer',
    );
    shell.pointer.click(start);
    await settle();
    expect(surfaceAttr(popup.window, 'data-timer-state')).toBe('running');

    const staged = 'm4-gh-aw';
    expect(IDS).toContain(staged);
    shell.spa.store.update(staged, (segment) => ({ ...segment, revealedSteps: 1 }));
    shell.pointer.click(navLink(shell, staged));
    await settle();
    expect(surfaceAttr(popup.window, 'data-segment-id')).toBe(staged);
    expect(surfaceAttr(popup.window, 'data-revealed-steps')).toBe('1');
  });

  it('QA R1: returning to an expired running timer reports the same done phase on both surfaces', async () => {
    const inventory = JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/interactions.json'), 'utf8')) as {
      interactions: Array<{ id: string; pattern: string; segment: string }>;
    };
    const timer = must(inventory.interactions.find((entry) => entry.pattern === 'segment-timer'), 'the inventory timer');
    const timed = must(SEGMENTS.find((segment) => segment.id === timer.segment), 'the timed segment');
    const otherId = must(IDS.find((id) => id !== timed.id), 'a different segment');
    const { shell, popup } = await presenterShell();
    await present(shell);
    openSurface(popup.window);
    await drain();
    shell.spa.store.navigate(timed.id);
    const start = must(shell.el(timer.id).querySelectorAll('button').find((button) => button.textContent.trim() === 'Start'), 'Start');
    shell.pointer.click(start);
    await settle();
    expect(surfaceAttr(popup.window, 'data-timer-state')).toBe('running');

    shell.spa.store.navigate(otherId);
    await settle();
    // No timer is mounted while this segment is away. Move the wall clock, not
    // a product field, so re-entry exercises the real timer restoration path.
    vi.setSystemTime(Date.now() + timed.minutes * MINUTE + 1000);
    shell.spa.store.navigate(timed.id);
    await settle();

    expect(shell.el(timer.id).textContent).toContain('Time is up');
    expect(surfaceAttr(popup.window, 'data-timer-state')).toBe('done');
    expect(shell.el(timer.id).textContent).not.toContain('Running');
  });

  // The class behind the finding above: what the speaker is told is what the store holds, and the timer of the segment gives the
  // store the phase it shows (as finish() does when the time runs out in front of the reader) whenever the wall clock, and not a
  // press, moved it. These walk each way the store can disagree with the timer that mounts from it.
  describe('what the timer restores is what the speaker is told', () => {
    /** The segment with a timer, from the inventory of the build, so that no id of the deck is written here. */
    function timedSegment() {
      const inventory = JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/interactions.json'), 'utf8')) as {
        interactions: Array<{ id: string; pattern: string; segment: string }>;
      };
      const timer = must(inventory.interactions.find((entry) => entry.pattern === 'segment-timer'), 'the inventory timer');
      const timed = must(SEGMENTS.find((segment) => segment.id === timer.segment), 'the timed segment');
      return { timer, timed, otherId: must(IDS.find((id) => id !== timed.id), 'a different segment'), totalMs: timed.minutes * MINUTE };
    }

    /** A presentation with its speaker following it, standing on a segment that is not the timed one. */
    async function followed(timedId: string, otherId: string) {
      const { shell, popup } = await presenterShell();
      await present(shell);
      openSurface(popup.window);
      await drain();
      shell.spa.store.navigate(otherId);
      await settle();
      expect(shell.spa.store.get().currentId).not.toBe(timedId);
      return { shell, popup };
    }

    const kept = (shell: Shell, segmentId: string, timerId: string): unknown => shell.spa.store.get().segments[segmentId].parameters[timerId];

    it('leaves the store holding done, with the whole time, when the clock ran the time out while the segment was away', async () => {
      const { timer, timed, otherId, totalMs } = timedSegment();
      const { shell, popup } = await followed(timed.id, otherId);
      shell.spa.store.navigate(timed.id);
      shell.pointer.click(must(shell.el(timer.id).querySelectorAll('button').find((button) => button.textContent.trim() === 'Start'), 'Start'));
      await settle();
      expect(kept(shell, timed.id, timer.id)).toMatchObject({ state: 'running' });

      shell.spa.store.navigate(otherId);
      await settle();
      vi.setSystemTime(Date.now() + totalMs + 1000);
      shell.spa.store.navigate(timed.id);
      await settle();

      expect(kept(shell, timed.id, timer.id)).toEqual({ state: 'done', elapsedMs: totalMs, startedAt: null });
      expect(surfaceAttr(popup.window, 'data-timer-state')).toBe('done');
      expect(must(popup.window.document.getElementById('speaker-timer'), '#speaker-timer').textContent).toContain('Time is up');
    });

    it('says nothing of it in the live region of the presentation: it is the way back that is announced', async () => {
      const { timer, timed, otherId, totalMs } = timedSegment();
      const { shell } = await followed(timed.id, otherId);
      shell.spa.store.navigate(timed.id);
      shell.pointer.click(must(shell.el(timer.id).querySelectorAll('button').find((button) => button.textContent.trim() === 'Start'), 'Start'));
      await settle();
      shell.spa.store.navigate(otherId);
      await settle();
      vi.setSystemTime(Date.now() + totalMs + 1000);
      shell.spa.store.navigate(timed.id);
      await settle();
      await idle(); // the announcer writes the region a moment after it was told

      expect(shell.liveRegion.textContent).toMatch(/Segment \d+ of \d+/);
      expect(shell.liveRegion.textContent).not.toMatch(/time is up/i);
    });

    it('reports done for a paused timer whose stored time is already past the end', async () => {
      const { timer, timed, otherId, totalMs } = timedSegment();
      const { shell, popup } = await followed(timed.id, otherId);
      shell.spa.store.update(timed.id, (segment) => ({
        ...segment,
        parameters: { ...segment.parameters, [timer.id]: { state: 'paused', elapsedMs: totalMs + 5000, startedAt: null } },
      }));
      shell.spa.store.navigate(timed.id);
      await settle();

      expect(shell.el(timer.id).textContent).toContain('Time is up');
      expect(surfaceAttr(popup.window, 'data-timer-state')).toBe('done');
      expect(kept(shell, timed.id, timer.id)).toEqual({ state: 'done', elapsedMs: totalMs, startedAt: null });
    });

    it('does not write the timer again when the way back finds the phase it was left in, and the speaker has it counting', async () => {
      const { timer, timed, otherId } = timedSegment();
      const { shell, popup } = await followed(timed.id, otherId);
      shell.spa.store.navigate(timed.id);
      shell.pointer.click(must(shell.el(timer.id).querySelectorAll('button').find((button) => button.textContent.trim() === 'Start'), 'Start'));
      await settle();
      shell.spa.store.navigate(otherId);
      await settle();
      const left = kept(shell, timed.id, timer.id);
      expect(left).toMatchObject({ state: 'running' });

      vi.setSystemTime(Date.now() + 5000);
      shell.spa.store.navigate(timed.id);
      await settle();

      expect(kept(shell, timed.id, timer.id)).toBe(left); // the same object: nothing was written
      expect(surfaceAttr(popup.window, 'data-timer-state')).toBe('running');
    });
  });

  it.each([
    ['null', (): object | null => null],
    ['undefined', (): object | null => undefined as unknown as null],
    ['a throw', (): object | null => {
      throw new Error('popup blocked');
    }],
  ])('surfaces a blocked popup (%s) and presents all the same', async (_name, blocked) => {
    const { shell } = await presenterShell();
    shell.doubles.open.mockImplementation(blocked);
    await present(shell);
    expect(shell.el('present-notes').textContent).toMatch(/speaker script.*blocked/i);
    await idle();
    expect(shell.liveRegion.textContent).toMatch(/speaker script.*blocked/i);
    expect(shell.doubles.log).toContain('requestFullscreen');
  });

  it('is still listening when the popup was blocked: a script window opened by hand follows over BroadcastChannel', async () => {
    const { shell, lab } = await presenterShell();
    shell.doubles.open.mockImplementation(() => null);
    await present(shell);
    const byHand = lab.window('by-hand'); // a tab of the user's own: it has no opener
    openSurface(byHand);
    await drain();
    expect(surfaceAttr(byHand, 'data-sync-state')).toBe('synchronized');
    expect(surfaceAttr(byHand, 'data-sync-transport')).toBe('broadcastchannel');
    shell.spa.store.navigate(IDS[2]);
    await settle();
    expect(surfaceAttr(byHand, 'data-segment-index')).toBe('2');
  });

  it('does not answer postMessage when it holds no window, except to a window that says that this presentation opened it: a blocked popup leaves nothing to be mistaken for one', async () => {
    const { lab, win, shell } = await presenterShell({ search: '?sync-fail=broadcastchannel,storage' });
    shell.doubles.open.mockImplementation(() => null);
    await present(shell);
    // Windows that say hello as a script window would, and are not the one this presentation opened: one that no presentation opened, and
    // one that another presentation opened. Neither has this presentation for an opener, so neither is taken for its window.
    const elsewhere = lab.window('elsewhere');
    const other = createPresenterSync({ window: elsewhere, config: parseSyncConfig(''), snapshot: () => stateAt(IDS, 0), segmentIds: IDS, presenterId: 'P-2' });
    const strangers = [lab.window('by-none'), lab.popup(elsewhere, 'by-another').window];
    for (const stranger of strangers) {
      const hello = { app: PROTOCOL, v: VERSION, type: 'hello', from: 'speaker', session: `S-${stranger.name}` };
      lab.inject(win, { data: hello, origin: win.trueOrigin, source: lab.proxy(win, stranger) });
    }
    await drain();
    expect(lab.sent('postmessage', 'presenter')).toEqual([]);
    other.dispose();
  });

  it('answers postMessage over a window that says, by the name on its opener, that this presentation opened it, though it was never handed it: one reloaded in place', async () => {
    const { shell, popup } = await presenterShell({ search: '?sync-fail=broadcastchannel,storage' });
    // no Present: this page is not the one that opened the script window (popup), which has the window of this page for an opener all the same
    const peer = openCore(popup.window, '?sync-fail=broadcastchannel,storage&sync-timeout=100');
    peer.sync.start();
    await idle(100);
    expect(peer.sync.status).toMatchObject({ state: 'synchronized', transport: 'postmessage' });
    shell.spa.store.navigate(IDS[2]);
    await settle();
    expect(peer.states.at(-1)?.segmentId).toBe(IDS[2]);
  });

  it('is not asked to open a window that the user did not ask for', async () => {
    const { shell } = await presenterShell();
    await present(shell, false);
    expect(shell.doubles.open).not.toHaveBeenCalled();
  });

  it('publishes its synchronization, for a page that wants to look at it', async () => {
    const { shell } = await presenterShell();
    expect(shell.spa.sync).toBeDefined();
    expect(shell.spa.sync?.targetOrigin).not.toBe('*');
  });
});

describe('the hook that hands over the window that was opened', () => {
  type Hook = (handle: unknown, doubles: Doubles) => void;

  async function mount(hook?: Hook, behaviour: { blocked?: 'null' | 'undefined' | 'throws' } = {}) {
    const browser = createBrowser(INDEX_HTML);
    const doubles = installDoubles(browser);
    const handle = { closed: false };
    doubles.open.mockImplementation(() => {
      doubles.log.push('open');
      if (behaviour.blocked === 'throws') throw new Error('popup blocked');
      if (behaviour.blocked === 'null') return null;
      if (behaviour.blocked === 'undefined') return undefined as unknown as null;
      return handle;
    });
    // The fake DOM is structural, as in presentation-mode.test.ts, which hands it over the same way.
    const presentation = mountPresentation({
      document: browser.document,
      window: browser.window,
      navigator: doubles.navigator,
      store: createState(IDS),
      announce: () => undefined,
      onScriptWindow: hook === undefined ? undefined : (opened: unknown) => hook(opened, doubles),
    } as never);
    expect(presentation).toBeDefined();
    for (const id of ['present-open-script', 'present-keyboard-lock']) {
      Object.assign(must(browser.document.getElementById(id), id) as object, { checked: true });
    }
    browser.pointer.click(must(browser.document.getElementById('present-start'), 'the start button'));
    const order = [...doubles.log]; // what the click itself did: the order that spec 2.5 makes normative, before anything is awaited
    await settle();
    return { doubles, handle, order };
  }

  it('is given the very window that window.open returned, before the keyboard is locked and the page goes fullscreen', async () => {
    let given: unknown = 'not called';
    const { handle, order } = await mount((opened, seen) => {
      given = opened;
      seen.log.push('hook');
    });
    expect(given).toBe(handle);
    expect(order).toEqual(['open', 'hook', 'lock', 'requestFullscreen']);
  });

  it.each(['null', 'undefined', 'throws'] as const)('is not called when the window was blocked (%s)', async (blocked) => {
    const hook = vi.fn();
    const { order } = await mount(hook, { blocked });
    expect(hook).not.toHaveBeenCalled();
    expect(order).toEqual(['open', 'lock', 'requestFullscreen']);
  });

  it('does not stop the presentation when it throws', async () => {
    const { order } = await mount(() => {
      throw new Error('the hook is broken');
    });
    expect(order).toEqual(['open', 'lock', 'requestFullscreen']);
  });

  it('is optional', async () => {
    const { order } = await mount(undefined);
    expect(order).toEqual(['open', 'lock', 'requestFullscreen']);
  });
});

// -- what the shell holds, and lets go of ---------------------------------------------------------------------------------------

describe('lifecycle', () => {
  it('the presentation lets go of its channel and its listeners when the page goes away', async () => {
    const { shell, win, lab } = await presenterShell();
    await present(shell);
    await idle();
    expect(lab.openChannels()).toBe(1);
    expect(win.listenerCount('message')).toBe(1);
    expect(win.listenerCount('storage')).toBe(1);
    leave(win);
    expect(lab.openChannels()).toBe(0);
    expect(win.listenerCount('message')).toBe(0);
    expect(win.listenerCount('storage')).toBe(0);
  });

  it('the script surface lets go of its channel, its listeners and its timers when the page goes away', async () => {
    const { shell, win, lab, show } = await speakerShell({ search: '?sync-fail=broadcastchannel' });
    await drain();
    await show(stateAt(IDS, 0, { timer: { id: 'm1-segment-timer', state: 'running', elapsedMs: 0, startedAt: Date.now() } }));
    await idle();
    expect(vi.getTimerCount()).toBeGreaterThan(0); // the clock of the running timer
    expect(win.listenerCount('message')).toBe(1);
    leave(win);
    expect(win.listenerCount('message')).toBe(0);
    expect(win.listenerCount('storage')).toBe(0);
    expect(lab.openChannels()).toBe(0);
    await idle();
    expect(vi.getTimerCount()).toBe(0);
    expect(shell.spa.speaker).toBeDefined();
  });

  it('the script surface lets go of the BroadcastChannel it holds as well', async () => {
    const { win, lab, peer } = await speakerShell();
    await drain();
    expect(lab.openChannels()).toBe(2); // the presentation's and the surface's
    leave(win);
    expect(lab.openChannels()).toBe(1);
    peer?.dispose();
    expect(lab.openChannels()).toBe(0);
  });
});

// -- the window changes hands, or the presentation that owns it goes away ------------------------------------------------------------
//
// The script window follows the presentation that owns it now, and only while that presentation is there (AC9, AC10, spec 2.7). The core
// is proven for each of those turns in sync-lifecycle.test.ts; this is the shell that takes them: main.ts as the presentation, which
// says goodbye when its page goes, and claims the window it opens; and the script surface that mounts on the window it is given.

describe('the script window, when the presentation that owns it changes or goes away (AC9, AC10)', () => {
  const NOT_SYNCHRONIZED = 'Not synchronized with the presentation. Previous and Next move the script on their own.';
  const control = (win: LabWindow, id: string): FakeElement => must(win.document.getElementById(id), id) as FakeElement;

  it('a presentation whose page is closed says goodbye: the script window stops saying that it follows one, announces it, and moves by itself from Previous and Next', async () => {
    const { shell, win, popup } = await presenterShell();
    await present(shell);
    const surface = openSurface(popup.window);
    await drain();
    expect(surfaceAttr(popup.window, 'data-sync-state')).toBe('synchronized');
    expect(control(popup.window, 'speaker-next').disabled).toBe(true); // one way, and following: the controls have nothing to do
    surface.announced.length = 0;

    leave(win); // `pagehide`, and the page is not going into the cache: it is closed, or it goes somewhere else
    await drain();
    expect(surfaceAttr(popup.window, 'data-sync-state')).toBe('not-synchronized');
    expect(surface.announced).toEqual([{ message: NOT_SYNCHRONIZED, keep: true }]);
    expect(control(popup.window, 'speaker-prev').disabled).toBe(true); // at the first segment, there is nothing before
    expect(control(popup.window, 'speaker-next').disabled).toBe(false);

    control(popup.window, 'speaker-next').click();
    expect(surfaceAttr(popup.window, 'data-segment-index')).toBe('1'); // by itself: nobody is there to follow
    expect(surface.store.get().currentId).toBe(IDS[1]);
    await idle(10_000);
    expect(surfaceAttr(popup.window, 'data-sync-state')).toBe('not-synchronized'); // and it does not go back to a presentation that is gone
    expect(surfaceAttr(popup.window, 'data-segment-index')).toBe('1');
  });

  it('a presentation whose page is only put into the back/forward cache has not gone: it says nothing, and the script window goes on following it', async () => {
    const { shell, win, popup } = await presenterShell();
    await present(shell);
    const surface = openSurface(popup.window);
    await drain();
    surface.announced.length = 0;

    win.dispatchEvent(Object.assign(new FakeEvent('pagehide'), { persisted: true }));
    await drain();
    await idle(1000);
    expect(surfaceAttr(popup.window, 'data-sync-state')).toBe('synchronized');
    shell.spa.store.navigate(IDS[1]);
    await settle();
    expect(surfaceAttr(popup.window, 'data-segment-index')).toBe('1'); // the presentation still moves it
    expect(surfaceAttr(popup.window, 'data-sync-state')).toBe('synchronized');
    expect(surface.announced.map((entry) => entry.message)).not.toContain(NOT_SYNCHRONIZED);
  });

  it('a presentation that asks for the window by name, while another has it, takes it: the script window follows this one at once, and no longer hears the one before', async () => {
    const lab = new Lab();
    const win = lab.window('presenter');
    const before = lab.window('presenter-before');
    const script = lab.popup(before, 'speaker'); // opened by a presentation that is still open, and followed
    const earlier = { value: stateAt(IDS, 1) };
    const peer = createPresenterSync({ window: before, config: parseSyncConfig(undefined), snapshot: () => earlier.value, segmentIds: IDS, presenterId: 'P-before' });
    peer.setPopup(script.handle);
    const surface = openSurface(script.window);
    await drain();
    for (const index of [2, 0, 2, 1]) {
      earlier.value = stateAt(IDS, index); // it has said a good deal by now: more than the new presentation will have by the time it is asked about
      peer.publish();
      await drain();
    }
    expect(surfaceAttr(script.window, 'data-sync-state')).toBe('synchronized');
    expect(surfaceAttr(script.window, 'data-segment-index')).toBe('1');
    surface.announced.length = 0;

    const shell = await bootShell(win);
    shell.doubles.open.mockImplementation(() => {
      shell.doubles.log.push('open');
      // Given the name of a window that is open, the browser uses that window again, and makes the page that asked its opener.
      script.window.opener = lab.proxy(script.window, win);
      return lab.proxy(win, script.window);
    });
    await present(shell);
    await drain();
    expect(shell.doubles.open).toHaveBeenCalledTimes(1);
    expect(surfaceAttr(script.window, 'data-sync-state')).toBe('synchronized');
    expect(surfaceAttr(script.window, 'data-segment-index')).toBe('0'); // where the presentation that has the window now is

    shell.spa.store.navigate(IDS[2]);
    await settle();
    expect(surfaceAttr(script.window, 'data-segment-index')).toBe('2');
    expect(surface.store.get().currentId).toBe(IDS[2]);

    earlier.value = stateAt(IDS, 1);
    peer.publish(); // the one before goes on, and it is not heard
    await drain();
    expect(surfaceAttr(script.window, 'data-segment-index')).toBe('2');
    peer.dispose(); // and its leaving does not take the window from the one that has it
    await drain();
    await idle(1000);
    expect(surfaceAttr(script.window, 'data-sync-state')).toBe('synchronized');
    shell.spa.store.navigate(IDS[0]);
    await settle();
    expect(surfaceAttr(script.window, 'data-segment-index')).toBe('0');
    expect(surface.announced.map((entry) => entry.message)).not.toContain(NOT_SYNCHRONIZED);
  });
});

describe('offline', () => {
  it.each(['the presentation', 'the script surface'] as const)('%s fetches nothing at run time: the script is in the bundle', async (which) => {
    const fetched = vi.fn(() => {
      throw new Error('the shell must not fetch');
    });
    vi.stubGlobal('fetch', fetched);
    vi.stubGlobal(
      'XMLHttpRequest',
      class {
        constructor() {
          throw new Error('the shell must not make a request');
        }
      },
    );
    if (which === 'the script surface') {
      const { shell, show } = await speakerShell();
      await drain();
      await show(stateAt(IDS, 1));
      shell.press('speaker-next');
      await idle();
    } else {
      const { shell } = await presenterShell();
      await present(shell);
      shell.pointer.click(navLink(shell, IDS[1]));
      await idle();
    }
    expect(fetched).not.toHaveBeenCalled();
  });
});

describe('where the shell touches storage and windows', () => {
  const read = (file: string): string => readFileSync(path.join(ROOT, 'workshop/spa/src', file), 'utf8');

  it.each(['main.ts', 'shell/speaker.ts', 'shell/presentation.ts'])('%s reaches no storage of its own: the one guarded door is in sync.ts', (file) => {
    expect(read(file)).not.toMatch(/\b(localStorage|sessionStorage|indexedDB)\b/);
  });

  it.each(['main.ts', 'shell/speaker.ts', 'shell/sync.ts'])('%s opens no window: window.open is called in presentation.ts, once', (file) => {
    expect(read(file)).not.toMatch(/\.open\s*\(/);
  });

  it('presentation.ts calls window.open once, with a URL and a name and no features, so never with noopener or noreferrer', () => {
    const source = read('shell/presentation.ts');
    const calls = [...source.matchAll(/\.open\?*\.?\(([^)]*)\)/g)];
    expect(calls).toHaveLength(1);
    // The arguments of the call itself, not the comment beside it that says why there is no `noopener`.
    const args = calls[0][1].split(',').map((arg) => arg.trim());
    expect(args).toHaveLength(2);
    expect(args.join(' ')).not.toMatch(/noopener|noreferrer/);
  });
});
