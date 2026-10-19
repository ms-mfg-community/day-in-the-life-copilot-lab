// Presentation mode (specs/005-teaching-spa.md sections 2.5 and 2.6; AC7, AC8): gesture-bound fullscreen on the one
// [data-spa-root="presentation"] element, the order of what the Present handler calls, failure handling, fullscreenchange
// reconciliation, and the optional keyboard lock, speaker window, wake lock and screen choice.
//
// The shipped workshop/spa/index.html is parsed into the fake DOM (helpers/fake-dom.ts) and the browser APIs the fake does
// not model are recording doubles (helpers/presentation-doubles.ts). The real-browser half of AC7 and AC8 is
// presentation-browser-check.mjs; `npm run spa:test:present` runs both.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { KEYBOARD_LOCK_CODES, mountPresentation, type Presentation } from '../../workshop/spa/src/shell/presentation';
import { createState, type ShellStore } from '../../workshop/spa/src/shell/state';
import { createBrowser, type Browser, type FakeElement } from './helpers/fake-dom';
import { readDeckIds, ROOT, segmentsFromPipeline } from './helpers/interaction-harness';
import { installDoubles, type Doubles, type DoublesOptions } from './helpers/presentation-doubles';

const INDEX_HTML = readFileSync(path.join(ROOT, 'workshop/spa/index.html'), 'utf8');
const CONTROLS = /<section id="presentation-controls"[\s\S]*?<\/section>/;
const SEGMENTS: readonly string[] = ['alpha', 'beta', 'gamma'];

// ---------------------------------------------------------------------------------------------------------------------
// A mounted controller on the shipped shell

interface Page {
  browser: Browser;
  doubles: Doubles;
  store: ShellStore;
  presentation: Presentation;
  /** Every message the controller handed to `announce`, in order. */
  announced: string[];
}

function mount(options: DoublesOptions = {}): Page {
  const browser = createBrowser(INDEX_HTML);
  const doubles = installDoubles(browser, options);
  const store = createState([...SEGMENTS]);
  const announced: string[] = [];
  const presentation = mountPresentation({
    document: browser.document,
    window: browser.window,
    navigator: doubles.navigator,
    store,
    announce: (message: string) => void announced.push(message),
    describeSegment: (id: string) => `segment ${SEGMENTS.indexOf(id) + 1} of ${SEGMENTS.length}`,
  } as never);
  if (presentation === undefined) throw new Error('presentation mode did not mount on the shipped shell');
  return { browser, doubles, store, presentation, announced };
}

function byId(page: Page, id: string): FakeElement {
  const found = page.browser.document.getElementById(id);
  if (found === null) throw new Error(`#${id} is not in the shell`);
  return found;
}

const click = (page: Page, id: string): void => page.browser.pointer.click(byId(page, id));
/** The checkbox model of the fake DOM keeps no `checked`, so a test sets it as a plain property, as a browser would. */
const check = (page: Page, id: string, checked = true): void => void Object.assign(byId(page, id), { checked });
const last = (page: Page): string => page.announced.at(-1) ?? '';

/** Lets every promise the controller started run to the end (the doubles settle within a few microtask turns). */
async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

function expectWindowed(page: Page): void {
  expect(page.doubles.root.getAttribute('data-presentation')).toBe('windowed');
  expect(page.presentation.active).toBe(false);
  expect(byId(page, 'present-start').isRendered()).toBe(true);
  expect(byId(page, 'present-start').disabled).toBe(false);
  expect(byId(page, 'present-exit').isRendered()).toBe(false);
  expect(byId(page, 'present-options').isRendered()).toBe(true);
}

function expectPresenting(page: Page): void {
  expect(page.doubles.root.getAttribute('data-presentation')).toBe('presenting');
  expect(page.presentation.active).toBe(true);
  expect(byId(page, 'present-start').isRendered()).toBe(false);
  expect(byId(page, 'present-exit').isRendered()).toBe(true);
  expect(byId(page, 'present-options').isRendered()).toBe(false);
}

// ---------------------------------------------------------------------------------------------------------------------

describe('the shell markup (index.html)', () => {
  const root = (): FakeElement => {
    const found = createBrowser(INDEX_HTML).document.querySelector('[data-spa-root="presentation"]');
    if (found === null) throw new Error('index.html has no presentation root');
    return found;
  };

  it('has exactly one presentation root, and the landmarks, the controls and the live region are inside it', () => {
    const { document } = createBrowser(INDEX_HTML);
    expect(document.querySelectorAll('[data-spa-root="presentation"]')).toHaveLength(1);
    const found = document.querySelector('[data-spa-root="presentation"]');
    for (const selector of ['a[data-skip]', 'nav#segment-nav', 'main#main', '#presentation-controls', '#live-region']) {
      expect(found?.querySelector(selector), selector).not.toBeNull();
    }
    expect(document.body.contains(found)).toBe(true);
  });

  it('lists the skip link, the nav and <main> first, then the controls, then the live region: the tab order of the shell does not move', () => {
    expect(Array.from(root().children).map((child) => child.id || child.localName)).toEqual([
      'a',
      'segment-nav',
      'main',
      'presentation-controls',
      'live-region',
    ]);
  });

  it('keeps the module script outside the root', () => {
    const { document } = createBrowser(INDEX_HTML);
    const script = document.querySelector('script');
    expect(script).not.toBeNull();
    expect(document.querySelector('[data-spa-root="presentation"]')?.contains(script)).toBe(false);
  });

  it('ships Present, a hidden exit control, and the keyboard lock and the speaker window switched off', () => {
    const { document } = createBrowser(INDEX_HTML);
    const start = document.getElementById('present-start');
    expect(start?.localName).toBe('button');
    expect(start?.getAttribute('type')).toBe('button');
    expect(start?.isRendered()).toBe(true);
    expect(document.getElementById('present-exit')?.hidden).toBe(true);
    for (const id of ['present-keyboard-lock', 'present-open-script']) {
      const toggle = document.getElementById(id);
      expect(toggle?.localName, id).toBe('input');
      expect(toggle?.getAttribute('type'), id).toBe('checkbox');
      expect(toggle?.hasAttribute('checked'), id).toBe(false);
    }
  });

  it('says on the page that Esc or F11 exits fullscreen (F172) and how to put the window on the audience monitor (2.6)', () => {
    const { document } = createBrowser(INDEX_HTML);
    const guidance = document.getElementById('present-guidance');
    expect(guidance?.isRendered()).toBe(true);
    expect(guidance?.textContent).toMatch(/\bEsc\b/);
    expect(guidance?.textContent).toMatch(/\bF11\b/);
    const placement = document.getElementById('present-screen-guidance');
    expect(placement?.isRendered()).toBe(true);
    expect(placement?.textContent).toMatch(/move this browser window onto the audience monitor, then activate Present/i);
  });
});

describe('mounting', () => {
  it('marks the root as windowed and leaves Present ready', () => {
    const page = mount();
    expectWindowed(page);
    expect(byId(page, 'present-unavailable').isRendered()).toBe(false);
    expect(page.doubles.log).toEqual([]);
    expect(page.announced).toEqual([]);
  });

  it('does nothing, and does not throw, on a shell without the presentation markup', () => {
    const browser = createBrowser(INDEX_HTML.replace(CONTROLS, ''));
    const store = createState([...SEGMENTS]);
    expect(mountPresentation({ document: browser.document, window: browser.window, store, announce: () => {} } as never)).toBeUndefined();
  });

  it('does nothing on the stripped-down document of the shell tests, which has no querySelector', () => {
    const document = { getElementById: () => null, addEventListener: () => {} };
    const store = createState([...SEGMENTS]);
    expect(mountPresentation({ document, window: {}, store, announce: () => {} } as never)).toBeUndefined();
  });
});

describe('when fullscreen is not available (F4)', () => {
  it.each([false, 'missing'] as const)('disables Present and says why (fullscreenEnabled: %s)', (fullscreenEnabled) => {
    const page = mount({ fullscreenEnabled });
    const start = byId(page, 'present-start');
    const why = byId(page, 'present-unavailable');
    expect(start.disabled).toBe(true);
    expect(start.getAttribute('aria-disabled')).toBe('true');
    expect(start.getAttribute('aria-describedby')).toBe('present-unavailable');
    expect(why.isRendered()).toBe(true);
    expect(why.textContent).toMatch(/fullscreen/i);
    click(page, 'present-start');
    expect(page.doubles.log).toEqual([]);
    expect(page.presentation.active).toBe(false);
  });

  it('does not call requestFullscreen when asked from code either', () => {
    const page = mount({ fullscreenEnabled: false });
    page.presentation.present();
    expect(page.doubles.log).toEqual([]);
    expect(page.doubles.root.getAttribute('data-presentation')).toBe('windowed');
  });

  it('leaves Present enabled and the explanation hidden when fullscreen is available', () => {
    const page = mount();
    expect(byId(page, 'present-start').getAttribute('aria-disabled')).toBeNull();
    expect(byId(page, 'present-unavailable').isRendered()).toBe(false);
  });
});

describe('activating Present (AC7)', () => {
  it('requests fullscreen on the presentation root and on nothing else, inside the click and without an await ahead of it', async () => {
    const page = mount();
    click(page, 'present-start');
    // synchronous: the transient user activation that the click carries is spent by this very call
    expect(page.doubles.log).toEqual(['requestFullscreen']);
    expect(page.doubles.requests).toEqual([[]]);
    await settle();
    expect(page.doubles.log.filter((entry) => entry.startsWith('requestFullscreen:'))).toEqual([]);
    expect(page.doubles.fullscreenElement).toBe(page.doubles.root);
  });

  it('shows the presenting state, moves focus to the exit control and announces it with the way out', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(page.browser.document.activeElement).toBe(byId(page, 'present-exit'));
    expect(last(page)).toMatch(/presentation mode on/i);
    expect(last(page)).toMatch(/\bEsc\b/);
    expect(last(page)).toMatch(/\bF11\b/);
  });

  it('moves focus to the exit control without scrolling: fullscreen starting is no request to move the slide', async () => {
    const page = mount();
    const focus = vi.spyOn(byId(page, 'present-exit'), 'focus');
    click(page, 'present-start');
    await settle();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(page.browser.document.activeElement).toBe(byId(page, 'present-exit'));
  });

  it('is activated from the keyboard as well', async () => {
    const page = mount();
    byId(page, 'present-start').focus();
    await page.browser.keyboard.press('Enter');
    expect(page.doubles.log[0]).toBe('requestFullscreen');
    await settle();
    expectPresenting(page);
  });

  it('ignores a second activation while the first is still waiting', () => {
    const page = mount();
    page.doubles.outcome = 'pending';
    check(page, 'present-open-script');
    check(page, 'present-keyboard-lock');
    page.presentation.present();
    page.presentation.present();
    expect(page.doubles.log).toEqual(['open', 'lock', 'requestFullscreen']);
  });

  it('does nothing when asked while the root is already the fullscreen element', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.doubles.log.length = 0;
    page.presentation.present();
    await settle();
    expect(page.doubles.log).toEqual([]);
  });
});

describe('the order of the activation handler (section 2.5)', () => {
  it('opens the speaker script first, locks the keyboard second and requests fullscreen last', () => {
    const page = mount();
    check(page, 'present-open-script');
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    expect(page.doubles.log).toEqual(['open', 'lock', 'requestFullscreen']);
  });

  it('opens #/script by name, with no noopener, so the two windows can talk (F43, F45, F46)', () => {
    const page = mount();
    check(page, 'present-open-script');
    click(page, 'present-start');
    expect(page.doubles.open).toHaveBeenCalledTimes(1);
    const [url, target, features] = page.doubles.open.mock.calls[0];
    expect(url).toBe('#/script');
    expect(target).toEqual(expect.any(String));
    expect(`${target} ${features ?? ''}`).not.toMatch(/noopener|noreferrer/i);
  });

  it('never passes Escape to the keyboard lock, and never an empty list that would lock every key (F84, F163, F168)', () => {
    const page = mount();
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    expect(page.doubles.lockedCodes).toHaveLength(1);
    const codes = page.doubles.lockedCodes[0];
    expect(codes).toEqual([...KEYBOARD_LOCK_CODES]);
    expect(codes?.length).toBeGreaterThan(0);
    expect(codes?.map((code) => code.toLowerCase())).not.toContain('escape');
    expect(KEYBOARD_LOCK_CODES.map((code) => code.toLowerCase())).not.toContain('escape');
  });

  it('calls nothing but requestFullscreen when both options are left off, which is how they start', () => {
    const page = mount();
    click(page, 'present-start');
    expect(page.doubles.log).toEqual(['requestFullscreen']);
    expect(page.doubles.open).not.toHaveBeenCalled();
    expect(page.doubles.keyboardLock).not.toHaveBeenCalled();
  });

  it('reads the options at the time of the click, so a box ticked and then cleared does nothing', () => {
    const page = mount();
    check(page, 'present-keyboard-lock');
    check(page, 'present-keyboard-lock', false);
    click(page, 'present-start');
    expect(page.doubles.log).toEqual(['requestFullscreen']);
  });

  it('releases the lock after exitFullscreen(), not before (F163)', async () => {
    const page = mount();
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
    page.doubles.log.length = 0;
    click(page, 'present-exit');
    await settle();
    expect(page.doubles.log.filter((entry) => entry === 'exitFullscreen' || entry === 'unlock')).toEqual(['exitFullscreen', 'unlock']);
  });

  it('keeps that order when the browser reports the end of fullscreen a turn later, as it does', async () => {
    const page = mount();
    page.doubles.behaviour.exitIsAsync = true;
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
    page.doubles.log.length = 0;
    page.presentation.exit();
    // the event that ends the presentation has not arrived, yet the lock is already let go, and after exitFullscreen()
    expect(page.doubles.log.filter((entry) => entry === 'exitFullscreen' || entry === 'unlock')).toEqual(['exitFullscreen', 'unlock']);
    expectPresenting(page);
    await settle();
    expectWindowed(page);
    expect(page.doubles.keyboardUnlock).toHaveBeenCalledTimes(1);
  });

  it('releases the keyboard lock once, however fullscreen ended', async () => {
    const page = mount();
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    expect(page.doubles.keyboardUnlock).toHaveBeenCalledTimes(1);
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expect(page.doubles.keyboardUnlock).toHaveBeenCalledTimes(1);
  });

  it('still presents, and says so, when the browser refuses the keyboard lock', async () => {
    const page = mount();
    page.doubles.behaviour.keyboardRejects = true;
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/keyboard lock/i);
    expect(byId(page, 'present-notes').textContent).toMatch(/keyboard lock/i);
  });

  it('disables the keyboard-lock toggle, and says why, where there is no keyboard.lock (F167), and still presents', async () => {
    const page = mount({ keyboard: false });
    const toggle = byId(page, 'present-keyboard-lock');
    expect(toggle.disabled).toBe(true);
    expect(byId(page, 'present-keyboard-hint').textContent).toMatch(/not available|not supported|unavailable/i);
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(page.doubles.log).not.toContain('lock');
  });

  it('requests fullscreen even when the speaker window is blocked, and announces that it was', async () => {
    const page = mount();
    page.doubles.behaviour.popupBlocked = true;
    check(page, 'present-open-script');
    click(page, 'present-start');
    expect(page.doubles.log).toEqual(['open', 'requestFullscreen']);
    expect(page.announced.join(' ')).toMatch(/speaker script.*blocked/i);
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/presentation mode on/i);
    expect(last(page)).toMatch(/speaker script.*blocked/i);
    expect(byId(page, 'present-notes').textContent).toMatch(/speaker script.*blocked/i);
  });

  it('treats a window.open that throws as a blocked window', async () => {
    const page = mount();
    page.doubles.open.mockImplementationOnce(() => {
      throw new DOMException('sandboxed', 'SecurityError');
    });
    check(page, 'present-open-script');
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/speaker script.*blocked/i);
  });

  it('says nothing about the speaker window when it opened', async () => {
    const page = mount();
    check(page, 'present-open-script');
    click(page, 'present-start');
    await settle();
    expect(page.announced.join(' ')).not.toMatch(/speaker script/i);
  });
});

describe('when fullscreen fails (F3, F9, F10)', () => {
  it.each(['reject', 'error-event', 'reject-and-event', 'throw'] as const)(
    'stays in the window on the same segment and announces it once (%s)',
    async (outcome) => {
      const page = mount();
      page.store.navigate('beta');
      page.doubles.outcome = outcome;
      click(page, 'present-start');
      await settle();
      expectWindowed(page);
      expect(page.store.get().currentId).toBe('beta');
      expect(page.announced.filter((message) => /fullscreen could not start/i.test(message))).toHaveLength(1);
      expect(last(page)).toMatch(/segment 2 of 3/);
      expect(page.doubles.log).not.toContain('wakeLock.request:screen');
    },
  );

  it('handles a fullscreenerror that reaches only the document, when the call returned no promise to reject', async () => {
    const page = mount();
    page.doubles.outcome = 'pending';
    click(page, 'present-start');
    page.doubles.fire(page.browser.document, 'fullscreenerror');
    await settle();
    expectWindowed(page);
    expect(last(page)).toMatch(/fullscreen could not start/i);
  });

  it('handles a fullscreenerror at the root that does not bubble', async () => {
    const page = mount();
    page.doubles.outcome = 'pending';
    click(page, 'present-start');
    page.doubles.fire(page.doubles.root, 'fullscreenerror', false);
    await settle();
    expectWindowed(page);
    expect(last(page)).toMatch(/fullscreen could not start/i);
  });

  it('ignores a fullscreenerror that belongs to some other element', async () => {
    const page = mount();
    page.doubles.outcome = 'pending';
    click(page, 'present-start');
    const main = page.browser.document.getElementById('main');
    if (main === null) throw new Error('no main');
    page.doubles.fire(main, 'fullscreenerror');
    await settle();
    expect(page.announced).toEqual([]);
  });

  it('gives up the keyboard lock it took for a request that failed', async () => {
    const page = mount();
    page.doubles.outcome = 'reject';
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
    expect(page.doubles.log).toEqual(['lock', 'requestFullscreen', 'unlock']);
  });

  it('does not report a failure once fullscreen has in fact begun (a stale second request)', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.doubles.fire(page.doubles.root, 'fullscreenerror');
    await settle();
    expectPresenting(page);
    expect(page.announced.join(' ')).not.toMatch(/could not start/i);
  });

  it('lets the presenter try again, and the retry starts clean', async () => {
    const page = mount();
    page.doubles.outcome = 'reject';
    click(page, 'present-start');
    await settle();
    expect(last(page)).toMatch(/could not start/i);
    page.doubles.outcome = 'resolve';
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/presentation mode on/i);
    expect(last(page)).not.toMatch(/could not start/i);
  });

});

describe('fullscreenchange (AC8)', () => {
  it('returns to the window on the same segment and writes the change to the live region when fullscreen ends unasked', async () => {
    const page = mount();
    page.store.navigate('beta');
    const hash = page.browser.window.location.hash;
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    // the browser ends fullscreen: document.fullscreenElement becomes null and fullscreenchange fires at the document
    page.doubles.fullscreenElement = null;
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expectWindowed(page);
    expect(page.store.get().currentId).toBe('beta');
    expect(page.browser.window.location.hash).toBe(hash);
    expect(last(page)).toMatch(/presentation mode off/i);
    expect(last(page)).toMatch(/segment 2 of 3/);
    expect(page.browser.document.activeElement).toBe(byId(page, 'present-start'));
  });

  it('lands on the segment that is open when fullscreen ends, wherever the reader went meanwhile', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.store.navigate('gamma');
    expectPresenting(page);
    page.doubles.endFullscreen();
    await settle();
    expect(page.store.get().currentId).toBe('gamma');
    expect(last(page)).toMatch(/segment 3 of 3/);
  });

  it('never navigates by itself', async () => {
    const page = mount();
    const seen: string[] = [];
    page.store.subscribe((next) => void seen.push(next.currentId));
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    expect(seen).toEqual([]);
    expect(page.store.get().currentId).toBe('alpha');
  });

  it('marks presentation mode on when the root becomes the fullscreen element, however it got there', async () => {
    const page = mount();
    page.doubles.fullscreenElement = page.doubles.root;
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/presentation mode on/i);
    expect(page.doubles.log).toContain('wakeLock.request:screen');
  });

  it('says nothing about a fullscreenchange it already knows about', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    const before = page.announced.length;
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expect(page.announced).toHaveLength(before);
  });

  it('says nothing about a fullscreenchange that is not presentation mode', async () => {
    const page = mount();
    page.doubles.fire(page.browser.document, 'fullscreenchange'); // fullscreenElement is null and nothing was presenting
    const main = page.browser.document.getElementById('main');
    if (main === null) throw new Error('no main');
    page.doubles.fullscreenElement = main; // some other element
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expectWindowed(page);
    expect(page.announced).toEqual([]);
  });

  it('stays presenting while some element inside the root is fullscreen on top of it', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    const main = page.browser.document.getElementById('main');
    if (main === null) throw new Error('no main');
    page.doubles.fullscreenElement = main;
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expectPresenting(page);
    expect(page.doubles.log).not.toContain('wakeLock.release');
  });

  it('handles a promise that resolves before its event, and the event that follows', async () => {
    const page = mount();
    page.doubles.outcome = 'resolve-then-event';
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(page.announced.filter((message) => /presentation mode on/i.test(message))).toHaveLength(1);
  });

  it('puts the exit control to work: it leaves through exitFullscreen() and lands in the window', async () => {
    const page = mount();
    page.store.navigate('gamma');
    click(page, 'present-start');
    await settle();
    click(page, 'present-exit');
    await settle();
    expectWindowed(page);
    expect(page.doubles.log).toContain('exitFullscreen');
    expect(page.store.get().currentId).toBe('gamma');
    expect(last(page)).toMatch(/presentation mode off/i);
  });

  it('says so, and stays presenting, when exitFullscreen() is refused', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.doubles.behaviour.exitRejects = true;
    click(page, 'present-exit');
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/could not leave fullscreen/i);
    expect(last(page)).toMatch(/\bEsc\b/);
  });
});

// In fullscreen the presentation root, not the window, is what scrolls (workshop/spa/index.html), so the scroll to the top
// that main.ts makes for a new segment (openAtTop) never reaches it. The controller carries that promise over to the root.
describe('a segment that opens while presenting', () => {
  const scrollTopOf = (page: Page): number => (page.doubles.root as unknown as { scrollTop: number }).scrollTop;
  const scrollRootTo = (page: Page, offset: number): void => void Object.assign(page.doubles.root, { scrollTop: offset });

  it('starts at the top of the fullscreen root, not where the last segment was scrolled to', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    scrollRootTo(page, 640);
    page.store.navigate('beta');
    expect(scrollTopOf(page)).toBe(0);
    expectPresenting(page);
  });

  it('leaves the root alone when the window is what shows the page', () => {
    const page = mount();
    scrollRootTo(page, 640);
    page.store.navigate('beta');
    expect(scrollTopOf(page)).toBe(640);
  });

  it('is the only thing that moves it: a step revealed inside the segment keeps the reader where they are', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    scrollRootTo(page, 640);
    page.store.update('alpha', (segment) => ({ ...segment, revealedSteps: segment.revealedSteps + 1 }));
    expect(scrollTopOf(page)).toBe(640);
  });

  it('starts at the top again once fullscreen has ended and presenting has begun anew', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    scrollRootTo(page, 640);
    page.store.navigate('beta'); // windowed now: not the controller's to scroll
    expect(scrollTopOf(page)).toBe(640);
    click(page, 'present-start');
    await settle();
    page.store.navigate('gamma');
    expect(scrollTopOf(page)).toBe(0);
  });
});

describe('the screen wake lock (F70 to F77)', () => {
  it('is requested once presentation mode is on, in a secure and visible page', async () => {
    const page = mount();
    click(page, 'present-start');
    expect(page.doubles.wakeLockRequest).not.toHaveBeenCalled(); // not before fullscreen began
    await settle();
    expect(page.doubles.log).toEqual(['requestFullscreen', 'wakeLock.request:screen']);
    expect(page.doubles.wakeLockRequest).toHaveBeenCalledWith('screen');
    expect(page.doubles.sentinels).toHaveLength(1);
  });

  it('is not requested while the page is hidden, and is when it becomes visible with presentation mode still on', async () => {
    const page = mount({ visible: false });
    click(page, 'present-start');
    await settle();
    expect(page.doubles.wakeLockRequest).not.toHaveBeenCalled();
    page.doubles.setVisible(true);
    await settle();
    expect(page.doubles.wakeLockRequest).toHaveBeenCalledTimes(1);
    expect(page.doubles.sentinels[0].released).toBe(false);
  });

  it('is taken again after the page was hidden and shown (F75)', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.doubles.setVisible(false); // the user agent releases the lock
    await settle();
    expect(page.doubles.sentinels[0].released).toBe(true);
    expect(page.doubles.wakeLockRequest).toHaveBeenCalledTimes(1);
    page.doubles.setVisible(true);
    await settle();
    expect(page.doubles.wakeLockRequest).toHaveBeenCalledTimes(2);
    expect(page.doubles.sentinels).toHaveLength(2);
    expect(page.doubles.sentinels[1].released).toBe(false);
  });

  it('is not taken again when the page becomes visible outside presentation mode', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    page.doubles.setVisible(false);
    page.doubles.setVisible(true);
    await settle();
    expect(page.doubles.wakeLockRequest).toHaveBeenCalledTimes(1);
  });

  it('does not ask twice when the page flickers while a request is out', async () => {
    const page = mount();
    page.doubles.behaviour.wakeLockWaits = true;
    click(page, 'present-start');
    await settle();
    page.doubles.setVisible(true);
    page.doubles.setVisible(true);
    await settle();
    expect(page.doubles.wakeLockRequest).toHaveBeenCalledTimes(1);
  });

  it('is released when presentation mode ends, whoever ended it', async () => {
    for (const end of ['exit-control', 'browser'] as const) {
      const page = mount();
      click(page, 'present-start');
      await settle();
      if (end === 'exit-control') click(page, 'present-exit');
      else page.doubles.endFullscreen();
      await settle();
      expect(page.doubles.sentinels[0].released, end).toBe(true);
      expect(page.doubles.log.filter((entry) => entry === 'wakeLock.release'), end).toHaveLength(1);
    }
  });

  it('is released at once if presentation mode ended while the request was out', async () => {
    const page = mount();
    page.doubles.behaviour.wakeLockWaits = true;
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    page.doubles.grantWakeLock();
    await settle();
    expect(page.doubles.sentinels).toHaveLength(1);
    expect(page.doubles.sentinels[0].released).toBe(true);
  });

  it('is not fatal when the request is refused (NotAllowedError): presentation mode stays on and says so', async () => {
    const page = mount();
    page.doubles.behaviour.wakeLockRejects = true;
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/presentation mode on/i);
    expect(last(page)).toMatch(/wake lock/i);
    expect(byId(page, 'present-notes').textContent).toMatch(/wake lock/i);
  });

  it('is not fatal when the browser has no navigator.wakeLock, and says so', async () => {
    const page = mount({ wakeLock: false });
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(last(page)).toMatch(/wake lock/i);
  });

  it('is not requested outside a secure context', async () => {
    const page = mount({ secure: false });
    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    expect(page.doubles.wakeLockRequest).not.toHaveBeenCalled();
    expect(last(page)).toMatch(/wake lock/i);
  });

  it('forgets the note of an earlier refusal once a later request succeeds', async () => {
    const page = mount();
    page.doubles.behaviour.wakeLockRejects = true;
    click(page, 'present-start');
    await settle();
    expect(byId(page, 'present-notes').textContent).toMatch(/wake lock/i);
    page.doubles.behaviour.wakeLockRejects = false;
    page.doubles.setVisible(false);
    page.doubles.setVisible(true);
    await settle();
    expect(page.doubles.sentinels).toHaveLength(1);
    expect(byId(page, 'present-notes').textContent).not.toMatch(/wake lock/i);
  });

  it('leaves no note behind once presentation mode has ended', async () => {
    const page = mount({ wakeLock: false });
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    expect(byId(page, 'present-notes').textContent).toBe('');
    expect(last(page)).not.toMatch(/wake lock/i);
  });
});

describe('putting the presentation on the audience monitor (section 2.6)', () => {
  const MANUAL = /move this browser window onto the audience monitor, then activate Present/i;
  const CLAIM = /\b(chosen|selected|presenting on)\b/i;

  it('without getScreenDetails: gives the manual steps, offers no screen choice and asks for no screen', async () => {
    const page = mount({ screens: false });
    expect(byId(page, 'present-choose-screen').isRendered()).toBe(false);
    expect(byId(page, 'present-screen-field').isRendered()).toBe(false);
    expect(byId(page, 'present-screen-guidance').isRendered()).toBe(true);
    expect(byId(page, 'present-screen-guidance').textContent).toMatch(MANUAL);
    expect(byId(page, 'present-screen-guidance').textContent).not.toMatch(CLAIM);
    click(page, 'present-start');
    await settle();
    expect(page.doubles.requests).toEqual([[]]);
    expect(page.doubles.getScreenDetails).not.toHaveBeenCalled();
    expect(page.announced.join(' ')).not.toMatch(CLAIM);
  });

  it('with getScreenDetails: offers the choice, but asks for the permission only when it is used', () => {
    const page = mount({ screens: true });
    expect(byId(page, 'present-choose-screen').isRendered()).toBe(true);
    expect(byId(page, 'present-screen-field').isRendered()).toBe(false);
    expect(page.doubles.getScreenDetails).not.toHaveBeenCalled();
    expect(byId(page, 'present-screen-guidance').textContent).toMatch(MANUAL);
  });

  it('lists the screens once the permission is granted, and does not start presenting by doing so', async () => {
    const page = mount({ screens: true });
    click(page, 'present-choose-screen');
    await settle();
    expect(page.doubles.log).toEqual(['getScreenDetails']);
    expect(byId(page, 'present-screen-field').isRendered()).toBe(true);
    const labels = Array.from(byId(page, 'present-screen').children).map((option) => option.textContent);
    expect(labels).toHaveLength(3); // this window's screen, then the two screens
    expect(labels[1]).toMatch(/Laptop display.*1920.*1080/);
    expect(labels[2]).toMatch(/Projector.*1280.*720/);
    expect(page.doubles.requests).toEqual([]);
    expect(page.announced.join(' ')).not.toMatch(CLAIM);
  });

  it('passes the screen that was chosen to requestFullscreen as { screen }', async () => {
    const page = mount({ screens: true });
    click(page, 'present-choose-screen');
    await settle();
    Object.assign(byId(page, 'present-screen'), { value: '1' });
    click(page, 'present-start');
    await settle();
    expect(page.doubles.requests).toEqual([[{ screen: page.doubles.screens[1] }]]);
    expectPresenting(page);
  });

  it('passes no screen when the choice is left on the current window', async () => {
    const page = mount({ screens: true });
    click(page, 'present-choose-screen');
    await settle();
    Object.assign(byId(page, 'present-screen'), { value: '' });
    click(page, 'present-start');
    await settle();
    expect(page.doubles.requests).toEqual([[]]);
  });

  it('falls back to the manual steps, and announces it, when the permission is refused', async () => {
    const page = mount({ screens: true });
    page.doubles.behaviour.screensReject = true;
    click(page, 'present-choose-screen');
    await settle();
    expect(byId(page, 'present-screen-field').isRendered()).toBe(false);
    expect(byId(page, 'present-screen-guidance').isRendered()).toBe(true);
    expect(byId(page, 'present-screen-guidance').textContent).toMatch(MANUAL);
    expect(byId(page, 'present-screen-guidance').textContent).not.toMatch(CLAIM);
    expect(last(page)).toMatch(/screen/i);
    expect(last(page)).toMatch(MANUAL);
    click(page, 'present-start');
    await settle();
    expect(page.doubles.requests).toEqual([[]]);
    expectPresenting(page);
  });

  it('asks for no screen again after a refusal that follows a grant', async () => {
    const page = mount({ screens: true });
    click(page, 'present-choose-screen');
    await settle();
    Object.assign(byId(page, 'present-screen'), { value: '1' });
    page.doubles.behaviour.screensReject = true;
    click(page, 'present-choose-screen');
    await settle();
    click(page, 'present-start');
    await settle();
    expect(page.doubles.requests).toEqual([[]]);
  });
});

describe('dispose', () => {
  it('removes every listener it added and lets go of what it holds', async () => {
    const page = mount();
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
    const { document } = page.browser;
    expect(document.listenerCount('fullscreenchange')).toBeGreaterThan(0);
    page.presentation.dispose();
    for (const type of ['fullscreenchange', 'fullscreenerror', 'visibilitychange']) {
      expect(document.listenerCount(type), `document ${type}`).toBe(0);
    }
    expect(page.doubles.root.listenerCount('fullscreenerror')).toBe(0);
    expect(byId(page, 'present-start').listenerCount('click')).toBe(0);
    expect(byId(page, 'present-exit').listenerCount('click')).toBe(0);
    expect(page.doubles.log).toContain('unlock');
    expect(page.doubles.log).toContain('wakeLock.release');
  });

  it('stops watching the store', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.presentation.dispose();
    Object.assign(page.doubles.root, { scrollTop: 640 });
    page.store.navigate('beta');
    expect((page.doubles.root as unknown as { scrollTop: number }).scrollTop).toBe(640);
  });

  it('is silent afterwards', async () => {
    const page = mount();
    page.presentation.dispose();
    const before = page.announced.length;
    page.doubles.fullscreenElement = page.doubles.root;
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    page.presentation.present();
    await settle();
    expect(page.announced).toHaveLength(before);
    expect(page.doubles.log).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The shell as main.ts boots it

describe('the shell (main.ts)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function bootShell(options: DoublesOptions = {}, html = INDEX_HTML, hash = '') {
    vi.resetModules();
    const browser = createBrowser(html);
    if (hash !== '') {
      browser.window.location.hash = hash;
      await settle(); // the hashchange of this assignment belongs to nobody yet
    }
    const doubles = installDoubles(browser, options);
    for (const [name, value] of Object.entries(browser.globals)) vi.stubGlobal(name, value);
    vi.stubGlobal('navigator', doubles.navigator);
    vi.doMock('virtual:spa-content', () => ({ segments: segmentsFromPipeline() }));
    const specifier = '../../workshop/spa/src/main';
    await import(specifier);
    await settle();
    const spa = browser.window.teachingSpa as unknown as { store: ShellStore; presentation?: Presentation };
    const liveRegion = browser.document.getElementById('live-region');
    if (liveRegion === null) throw new Error('no live region');
    const ids = readDeckIds();
    const press = (id: string): void => browser.pointer.click(browser.document.getElementById(id) as FakeElement);
    return { browser, doubles, spa, liveRegion, ids, press };
  }

  const wait = async (): Promise<void> => {
    await settle();
    vi.advanceTimersByTime(500); // the announcer writes on a later turn
    await settle();
  };

  it('wires Present on the shell it ships, and publishes the controller next to the store', async () => {
    const { spa, doubles, press } = await bootShell();
    expect(spa.presentation).toBeDefined();
    expect(spa.presentation?.active).toBe(false);
    press('present-start');
    expect(doubles.log[0]).toBe('requestFullscreen');
    await wait();
    expect(spa.presentation?.active).toBe(true);
  });

  it('AC7 and AC8 on the real shell: present on the second segment, lose fullscreen, and be back on the second segment with it in the live region', async () => {
    const { browser, doubles, spa, liveRegion, ids, press } = await bootShell({}, INDEX_HTML, `#/${readDeckIds()[1]}`);
    expect(spa.store.get().currentId).toBe(ids[1]);
    const hash = browser.window.location.hash;
    press('present-start');
    await wait();
    expect(doubles.fullscreenElement).toBe(doubles.root);
    expect(liveRegion.textContent).toMatch(/presentation mode on/i);

    doubles.fullscreenElement = null;
    doubles.fire(browser.document, 'fullscreenchange');
    await wait();
    expect(spa.presentation?.active).toBe(false);
    expect(spa.store.get().currentId).toBe(ids[1]);
    expect(browser.window.location.hash).toBe(hash);
    expect(liveRegion.textContent).toMatch(/presentation mode off/i);
    expect(liveRegion.textContent).toContain(`segment 2 of ${ids.length}`);
    expect(doubles.root.getAttribute('data-presentation')).toBe('windowed');
  });

  it('keeps presenting across a change of segment, and ends on the segment that is open', async () => {
    const { doubles, spa, browser, ids, liveRegion, press } = await bootShell();
    press('present-start');
    await wait();
    spa.store.navigate(ids[2]);
    await wait();
    expect(spa.presentation?.active).toBe(true);
    doubles.endFullscreen();
    await wait();
    expect(spa.store.get().currentId).toBe(ids[2]);
    expect(browser.window.location.hash).toBe(`#/${ids[2]}`);
    expect(liveRegion.textContent).toContain(`segment 3 of ${ids.length}`);
  });

  it('boots, and publishes no controller, on a shell without the presentation controls', async () => {
    const { spa, doubles, browser } = await bootShell({}, INDEX_HTML.replace(CONTROLS, ''));
    expect(spa.presentation).toBeUndefined();
    expect(doubles.log).toEqual([]);
    expect(browser.document.getElementById('main')?.children.length).toBeGreaterThan(0);
  });

  it('boots, with Present disabled and explained, where the browser has no Fullscreen API', async () => {
    const { browser, spa } = await bootShell({ fullscreenEnabled: 'missing' });
    expect(spa.presentation).toBeDefined();
    expect(browser.document.getElementById('present-start')?.disabled).toBe(true);
    expect(browser.document.getElementById('present-unavailable')?.isRendered()).toBe(true);
  });
});
