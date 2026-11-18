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
import { createAnnouncer, type Announcer } from '../../workshop/spa/src/shell/live-region';
import {
  KEYBOARD_LOCK_CODES,
  mountPresentation,
  type Presentation,
  type PresentationOptions,
} from '../../workshop/spa/src/shell/presentation';
import { createState, type ShellStore } from '../../workshop/spa/src/shell/state';
import { createBrowser, type Browser, type FakeElement } from './helpers/fake-dom';
import { readDeckIds, ROOT, segmentsFromPipeline, within } from './helpers/interaction-harness';
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

function mount(options: DoublesOptions = {}, hooks: Pick<PresentationOptions, 'onEndedByBrowser'> = {}): Page {
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
    ...hooks,
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

/** An answer from the browser that has not come yet: it settles when the test says so. */
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

/** From now on `document.exitFullscreen()` returns `answer` and does nothing else: the browser is slow to say what became of it. */
function exitAnswers(page: Page, answer: Promise<void>): void {
  Object.defineProperty(page.browser.document, 'exitFullscreen', { configurable: true, value: () => answer });
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

  it('lists the skip link, then the bar (the controls, the keyboard settings (SPA-09) and the nav inside it), then <main>, the pager and the live region: the tab order of the shell does not move', () => {
    expect(Array.from(root().children).map((child) => child.id || child.localName)).toEqual(['a', 'journey', 'main', 'segment-pager', 'live-region']);
    const bar = root().querySelector('#journey');
    for (const selector of ['#presentation-controls', '#keyboard-settings', 'nav#segment-nav']) expect(bar?.querySelector(selector), selector).not.toBeNull();
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
    // One request, and nothing else yet: the script window and the lock follow the browser's answer, which has not come.
    expect(page.doubles.log).toEqual(['requestFullscreen']);
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

// Section 2.5 orders the handler script window, lock, fullscreen. Measured on 2026-10-26 in the SPA-13 rehearsal (Chrome 155,
// Edge 156, Firefox 142, WebKit 26), a window.open before the request leaves no activation for requestFullscreen(), which Chrome,
// Edge and Firefox then refuse, while a window.open and a lock made once the request has been answered are honoured in all four.
// The handler therefore requests fullscreen first, with nothing awaited before it, and the rest follows the answer.
describe('the order of the activation handler (section 2.5, as measured)', () => {
  it('requests fullscreen first, with nothing before it, and opens the speaker script and locks the keyboard once the browser has answered', async () => {
    const page = mount();
    check(page, 'present-open-script');
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    expect(page.doubles.log).toEqual(['requestFullscreen']);
    await settle();
    expect(page.doubles.log).toEqual(['requestFullscreen', 'wakeLock.request:screen', 'open', 'lock']);
    expectPresenting(page);
  });

  it('opens #/script by name, with no noopener, so the two windows can talk (F43, F45, F46)', async () => {
    const page = mount();
    check(page, 'present-open-script');
    click(page, 'present-start');
    await settle();
    expect(page.doubles.open).toHaveBeenCalledTimes(1);
    const [url, target, features] = page.doubles.open.mock.calls[0];
    expect(url).toBe('#/script');
    expect(target).toEqual(expect.any(String));
    expect(`${target} ${features ?? ''}`).not.toMatch(/noopener|noreferrer/i);
  });

  it('never passes Escape to the keyboard lock, and never an empty list that would lock every key (F84, F163, F168)', async () => {
    const page = mount();
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
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
    expect(page.doubles.log).toEqual(['requestFullscreen']);
    await settle();
    expect(page.doubles.log).toEqual(['requestFullscreen', 'wakeLock.request:screen', 'open']);
    expect(page.announced.join(' ')).toMatch(/speaker script.*blocked/i);
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

  it('takes no keyboard lock for a request that failed: the lock follows an answer that said no', async () => {
    const page = mount();
    page.doubles.outcome = 'reject';
    check(page, 'present-keyboard-lock');
    click(page, 'present-start');
    await settle();
    expect(page.doubles.log).toEqual(['requestFullscreen']);
    expect(page.doubles.lockedCodes).toHaveLength(0);
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

  // The Present control is the last thing on a long page, a long way below the slide. Focusing it scrolls it into view unless the call says
  // not to, and the window would jump to the foot of the page as the reader comes back to the slide they were reading.
  it.each([
    ['the Exit control', (page: Page) => click(page, 'present-exit')],
    ['the browser, unasked', (page: Page) => page.doubles.endFullscreen()],
  ] as const)('gives the focus back to the Present control without scrolling when %s ends fullscreen', async (_how, leave) => {
    const page = mount();
    const focus = vi.spyOn(byId(page, 'present-start'), 'focus');
    click(page, 'present-start');
    await settle();
    expect(page.browser.document.activeElement).toBe(byId(page, 'present-exit'));
    focus.mockClear(); // a click may focus what it presses: only the way out is under test

    leave(page);
    await settle();
    expectWindowed(page);
    expect(focus).toHaveBeenCalled();
    for (const call of focus.mock.calls) expect(call).toEqual([{ preventScroll: true }]);
    expect(page.browser.document.activeElement).toBe(byId(page, 'present-start'));
  });

  it('does not move the focus at all when it was not on the Exit control, as before', async () => {
    const page = mount();
    const focus = vi.spyOn(byId(page, 'present-start'), 'focus');
    click(page, 'present-start');
    await settle();
    const main = byId(page, 'main');
    main.focus();
    focus.mockClear();
    page.doubles.endFullscreen();
    await settle();
    expectWindowed(page);
    expect(focus).not.toHaveBeenCalled();
    expect(page.browser.document.activeElement).toBe(main);
  });

  // An answer from the browser belongs to the exit it was asked for. An earlier presentation's exit that is refused late is not
  // this presentation's, and must neither report a failed exit nor end an exit this one has asked.
  it('says nothing about an exit that was refused late, in a presentation that has not asked to leave', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    const early = deferred();
    exitAnswers(page, early.promise);
    page.presentation.exit(); // asked, and the browser has not answered
    page.doubles.endFullscreen(); // the browser ends that presentation first
    await settle();
    expectWindowed(page);

    click(page, 'present-start');
    await settle();
    expectPresenting(page);
    const said = page.announced.length;
    early.reject(new TypeError('The earlier document was no longer fullscreen'));
    await settle();
    expectPresenting(page);
    expect(page.announced).toHaveLength(said);
    expect(last(page)).toMatch(/presentation mode on/i);
  });
});

// Firefox and WebKit spend the Escape that leaves fullscreen: the page is told that fullscreen ended and is never handed the key,
// so what that key would have put away in the window (an open dialog, a popover, a running timer) stays. The shell puts it away
// through a hook it gives the controller. The controller calls it when fullscreen ended and the page did not ask, once the
// window is back on its segment and has said so, and never on the way in, for a failed request, or for the Exit control.
describe('fullscreen that ends without the page asking (onEndedByBrowser)', () => {
  interface Seen {
    windowed: boolean;
    active: boolean;
    said: string;
  }

  /** A page whose hook records what the controller looked like at the moment it was called. */
  function hooked(options: DoublesOptions = {}): { page: Page; calls: Seen[] } {
    const calls: Seen[] = [];
    const page: Page = mount(options, {
      onEndedByBrowser: () => {
        calls.push({
          windowed: page.doubles.root.getAttribute('data-presentation') === 'windowed',
          active: page.presentation.active,
          said: last(page),
        });
      },
    });
    return { page, calls };
  }

  it('is called once for the end AC8 simulates, after the window is back and has said so', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    expect(calls).toEqual([]); // not on the way in
    page.doubles.fullscreenElement = null;
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expect(calls).toHaveLength(1);
    expect(calls[0].windowed).toBe(true);
    expect(calls[0].active).toBe(false);
    expect(calls[0].said).toMatch(/presentation mode off/i);
  });

  it('is not called again for a fullscreenchange it already knows about', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    await settle();
    expect(calls).toHaveLength(1);
  });

  it('is called for each presentation the browser ends', async () => {
    const { page, calls } = hooked();
    for (let round = 1; round <= 2; round += 1) {
      click(page, 'present-start');
      await settle();
      page.doubles.endFullscreen();
      await settle();
      expect(calls, `after the browser ended presentation ${round}`).toHaveLength(round);
    }
  });

  it('is not called when the page asked: the Exit control', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    click(page, 'present-exit');
    await settle();
    expectWindowed(page);
    expect(calls).toEqual([]);
  });

  it('is not called when the page asked and the browser answers a turn later: the promise settles before the element and the event', async () => {
    const { page, calls } = hooked();
    page.doubles.behaviour.exitIsAsync = true;
    click(page, 'present-start');
    await settle();
    click(page, 'present-exit');
    await settle();
    expectWindowed(page);
    expect(calls).toEqual([]);
  });

  it('is still called for an end the page did not ask after an Exit that the browser refused', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    page.doubles.behaviour.exitRejects = true;
    click(page, 'present-exit');
    await settle();
    expectPresenting(page);
    expect(calls).toEqual([]);
    page.doubles.endFullscreen();
    await settle();
    expectWindowed(page);
    expect(calls).toHaveLength(1);
  });

  it('is called for an end the page did not ask, in a presentation after one that the page itself ended', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    click(page, 'present-exit');
    await settle();
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    expect(calls).toHaveLength(1);
  });

  // Who asked is told by a mark the page sets when it asks. The browser's answer to an earlier presentation's exit may arrive at any
  // time, and it must not clear the mark of the exit that the presentation now running has asked for.
  it('is not called for an exit that the page asked, whatever became of the exit an earlier presentation asked for', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    const early = deferred();
    exitAnswers(page, early.promise);
    page.presentation.exit(); // asked, and the browser has not answered
    page.doubles.endFullscreen(); // the browser ends that presentation first
    await settle();
    expectWindowed(page);
    expect(calls).toEqual([]);

    click(page, 'present-start');
    await settle();
    const late = deferred();
    exitAnswers(page, late.promise);
    page.presentation.exit(); // this presentation asks to leave as well
    early.reject(new TypeError('The earlier document was no longer fullscreen')); // the answer to the earlier exit comes late
    await settle();
    page.doubles.endFullscreen();
    late.resolve();
    await settle();
    expectWindowed(page);
    expect(calls).toEqual([]);
  });

  // Within one presentation too: asking again before the browser has answered makes the second exit the one that counts, and the
  // refusal of the first may arrive while the second is still waiting.
  it('is not called for the last exit that the page asked, when an earlier exit of the same presentation is refused while it waits', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    const first = deferred();
    exitAnswers(page, first.promise);
    page.presentation.exit(); // asked, and the browser has not answered
    const second = deferred();
    exitAnswers(page, second.promise);
    page.presentation.exit(); // asked again, and the browser has not answered that either
    const said = page.announced.length;
    first.reject(new TypeError('The first exit was refused'));
    await settle();
    expectPresenting(page); // the second exit is still waiting: nothing has ended
    expect(page.announced).toHaveLength(said); // and the refusal of the first is not the answer to it
    page.doubles.endFullscreen();
    second.resolve();
    await settle();
    expectWindowed(page);
    expect(calls).toEqual([]);
  });

  it.each(['reject', 'error-event', 'reject-and-event', 'throw'] as const)(
    'is not called for a request that failed (%s): nothing was presenting, so nothing ended',
    async (outcome) => {
      const { page, calls } = hooked();
      page.doubles.outcome = outcome;
      click(page, 'present-start');
      await settle();
      expectWindowed(page);
      page.doubles.endFullscreen(); // a stray end of some other fullscreen
      await settle();
      expect(calls).toEqual([]);
    },
  );

  it('is not called when nothing was presenting', async () => {
    const { page, calls } = hooked();
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    page.doubles.endFullscreen();
    await settle();
    expect(calls).toEqual([]);
  });

  it('is not called when the controller is disposed while presenting', async () => {
    const { page, calls } = hooked();
    click(page, 'present-start');
    await settle();
    page.presentation.dispose();
    page.doubles.endFullscreen();
    await settle();
    expect(calls).toEqual([]);
  });

  it('is reported, and changes nothing about the way back, when it throws', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const page = mount({}, {
        onEndedByBrowser: () => {
          throw new Error('the hook failed');
        },
      });
      check(page, 'present-keyboard-lock');
      click(page, 'present-start');
      await settle();
      page.doubles.endFullscreen();
      await settle();
      expectWindowed(page);
      expect(last(page)).toMatch(/presentation mode off/i);
      expect(page.doubles.log).toContain('unlock');
      expect(page.doubles.log).toContain('wakeLock.release');
      expect(reported).toHaveBeenCalledTimes(1);
    } finally {
      reported.mockRestore();
    }
  });

  it('is optional: the controller ends fullscreen as before without it', async () => {
    const page = mount();
    click(page, 'present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    expectWindowed(page);
    expect(last(page)).toMatch(/presentation mode off/i);
  });
});

// AC8: the end of fullscreen is written into the live region. `createAnnouncer` writes only the latest message of a turn, and what the
// hook puts away can speak as it goes (a timer that pauses says so), so a hook that spoke after the window did would leave the region
// without the end of fullscreen: the one thing AC8 asks of it. These tests use the announcer the shell ships and look at what the live
// region is given, not at what was passed to announce().
describe('what the live region is given when fullscreen ends and the hook puts something away (AC8)', () => {
  const ENDED = 'Presentation mode off. Fullscreen ended and the window is showing segment 1 of 3.';

  /** A controller on the shipped shell and the shipped announcer, whose region records every value it is given. */
  function mountWithRegion(hook?: (say: Announcer, doubles: Doubles) => void) {
    const browser = createBrowser(INDEX_HTML);
    const doubles = installDoubles(browser);
    const store = createState([...SEGMENTS]);
    const writes: string[] = [];
    let text: string | null = '';
    const region = {
      get textContent(): string | null {
        return text;
      },
      set textContent(value: string | null) {
        text = value;
        writes.push(value ?? '');
      },
    };
    const pending: Array<() => void> = [];
    const announce = createAnnouncer(region, (work) => void pending.push(work));
    const presentation = mountPresentation({
      document: browser.document,
      window: browser.window,
      navigator: doubles.navigator,
      store,
      announce,
      describeSegment: (id: string) => `segment ${SEGMENTS.indexOf(id) + 1} of ${SEGMENTS.length}`,
      ...(hook ? { onEndedByBrowser: () => hook(announce, doubles) } : {}),
    } as never);
    if (presentation === undefined) throw new Error('presentation mode did not mount on the shipped shell');
    const page: Page = { browser, doubles, store, presentation, announced: [] };
    let from = 0; // the first write `said()` looks at: moved forward by `mark()`
    return {
      page,
      announce,
      /** What the announcer has still to write, a turn later. */
      pending,
      /** The writes that were made after `mark()`, with the clearing that precedes each announcement left out. */
      said: (): string[] => writes.slice(from).filter((value) => value !== ''),
      mark: (): void => void (from = writes.length),
      flush: (): void => void pending.splice(0).forEach((work) => work()),
      region: (): string | null => text,
    };
  }

  /** Presents, lets the announcement of that be written, and starts counting from there. */
  async function present(session: ReturnType<typeof mountWithRegion>): Promise<void> {
    click(session.page, 'present-start');
    await settle();
    session.flush();
    session.mark();
  }

  it('writes the end of fullscreen and what the hook said as one message, in that order, when the hook speaks as it puts something away', async () => {
    let windowedWhenCalled = false;
    const session = mountWithRegion((say, doubles) => {
      windowedWhenCalled = doubles.root.getAttribute('data-presentation') === 'windowed';
      say('Paused. 35 minutes left.');
    });
    await present(session);
    session.page.doubles.endFullscreen();
    await settle();
    session.flush();
    expect(windowedWhenCalled).toBe(true);
    expect(session.said()).toEqual([`${ENDED} Paused. 35 minutes left.`]);
    expect(session.region()).toBe(`${ENDED} Paused. 35 minutes left.`);
    expect(session.page.store.get().currentId).toBe('alpha');
  });

  it('writes what several pieces of work said, in the order they said it', async () => {
    const session = mountWithRegion((say) => {
      say('Paused. 35 minutes left.');
      say('Details are hidden.');
    });
    await present(session);
    session.page.doubles.endFullscreen();
    await settle();
    session.flush();
    expect(session.said()).toEqual([`${ENDED} Paused. 35 minutes left. Details are hidden.`]);
  });

  it('says the end of fullscreen once, and nothing more, when the hook puts something away silently', async () => {
    const session = mountWithRegion(() => undefined);
    await present(session);
    session.page.doubles.endFullscreen();
    await settle();
    expect(session.pending).toHaveLength(1); // one announcement was made, so no second write is on its way
    session.flush();
    expect(session.said()).toEqual([ENDED]);
  });

  it('still says what the hook said before it failed, and reports the failure', async () => {
    const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const session = mountWithRegion((say) => {
        say('Paused. 35 minutes left.');
        throw new Error('the hook failed');
      });
      await present(session);
      session.page.doubles.endFullscreen();
      await settle();
      session.flush();
      expectWindowed(session.page);
      expect(session.said()).toEqual([`${ENDED} Paused. 35 minutes left.`]);
      expect(reported).toHaveBeenCalledTimes(1);
    } finally {
      reported.mockRestore();
    }
  });

  it('says only the end of fullscreen when the page asked for it: nothing is put away, so there is nothing to add', async () => {
    const session = mountWithRegion((say) => say('Paused. 35 minutes left.'));
    await present(session);
    click(session.page, 'present-exit');
    await settle();
    session.flush();
    expect(session.said()).toEqual([ENDED]);
  });

  it('goes on announcing as it did once the end of fullscreen has been said', async () => {
    const session = mountWithRegion((say) => say('Paused. 35 minutes left.'));
    await present(session);
    session.page.doubles.endFullscreen();
    await settle();
    session.flush();
    session.mark();
    session.announce('Segment 2 of 3');
    expect(session.region()).toBe(''); // cleared at once, written on the next turn
    session.flush();
    expect(session.said()).toEqual(['Segment 2 of 3']);
  });

  // The announcer keeps only the latest message, and what it is given a few milliseconds after the page's own message would take that
  // message back out of the live region: a timer that is still running, and was not focused so was not paused, reaches its five-minute
  // mark. AC8 asks for the end of fullscreen to be written, and 2.5 for the failure of a request to be announced, so neither is taken
  // back, and what the timer says is written too: the window's message is kept, and what was announced with it is written after it.
  describe('when something else announces before the delay is over', () => {
    const MARK = '5 minutes left.';
    const ON = 'Presentation mode on. Press Esc or F11 to exit fullscreen.';
    const COULD_NOT = 'Fullscreen could not start. The window is still showing segment 1 of 3.';

    it('writes the end of fullscreen and what was announced after it, as one message, in that order', async () => {
      const session = mountWithRegion();
      await present(session);
      session.page.doubles.endFullscreen();
      await settle();
      session.announce(MARK);
      session.flush();
      expectWindowed(session.page);
      expect(session.said()).toEqual([`${ENDED} ${MARK}`]);
      expect(session.page.store.get().currentId).toBe('alpha');
    });

    it('writes what was announced just before the end of fullscreen, and then the end of fullscreen, as one message', async () => {
      const session = mountWithRegion();
      await present(session);
      session.announce(MARK);
      session.page.doubles.endFullscreen();
      await settle();
      session.flush();
      expect(session.said()).toEqual([`${MARK} ${ENDED}`]);
    });

    it('writes the end of fullscreen, what the hook said and what was announced after it, in that order', async () => {
      const session = mountWithRegion((say) => say('Paused. 35 minutes left.'));
      await present(session);
      session.page.doubles.endFullscreen();
      await settle();
      session.announce('Segment 2 of 3');
      session.flush();
      expect(session.said()).toEqual([`${ENDED} Paused. 35 minutes left. Segment 2 of 3`]);
    });

    it('writes the end of fullscreen with only the latest of what was announced after it: those still replace one another', async () => {
      const session = mountWithRegion();
      await present(session);
      session.page.doubles.endFullscreen();
      await settle();
      session.announce('Segment 2 of 3');
      session.announce(MARK);
      session.flush();
      expect(session.said()).toEqual([`${ENDED} ${MARK}`]);
    });

    it('does not say the end of fullscreen a second time with the next announcement', async () => {
      const session = mountWithRegion();
      await present(session);
      session.page.doubles.endFullscreen();
      await settle();
      session.announce(MARK);
      session.flush();
      session.mark();
      session.announce('Segment 2 of 3');
      session.flush();
      expect(session.said()).toEqual(['Segment 2 of 3']);
    });

    it.each(['reject', 'error-event', 'reject-and-event', 'throw'] as const)(
      'writes the failure of the request and what was announced after it, as one message, in that order (%s)',
      async (outcome) => {
        const session = mountWithRegion();
        session.page.doubles.outcome = outcome;
        click(session.page, 'present-start');
        await settle();
        session.announce(MARK);
        session.flush();
        expectWindowed(session.page);
        expect(session.said()).toEqual([`${COULD_NOT} ${MARK}`]);
      },
    );

    it('writes what was announced just before the failure of the request, and then the failure, as one message', async () => {
      const session = mountWithRegion();
      session.page.doubles.outcome = 'reject';
      session.announce(MARK);
      click(session.page, 'present-start');
      await settle();
      session.flush();
      expect(session.said()).toEqual([`${MARK} ${COULD_NOT}`]);
    });

    it('writes that presentation mode is on, and what was announced after it, as one message, in that order', async () => {
      const session = mountWithRegion();
      click(session.page, 'present-start');
      await settle();
      session.announce(MARK);
      session.flush();
      expectPresenting(session.page);
      expect(session.said()).toEqual([`${ON} ${MARK}`]);
    });

    it('says once that the speaker window was blocked, although what the page says about presenting carries that too', async () => {
      const session = mountWithRegion();
      session.page.doubles.behaviour.popupBlocked = true;
      check(session.page, 'present-open-script');
      click(session.page, 'present-start');
      await settle();
      session.flush();
      const written = session.said();
      expect(written).toHaveLength(1);
      expect(written[0]).toMatch(/^Presentation mode on\./);
      expect(written[0]?.match(/speaker script window was blocked/g)).toHaveLength(1);
    });
  });
});

// What the controller relies on: an announcer can be told to hold what a piece of work announces and hand it back, so that the work
// neither writes to the live region nor takes back what was announced before it.
describe('the announcer: capture', () => {
  function announcer() {
    const region = { textContent: 'old' as string | null };
    const pending: Array<() => void> = [];
    const announce = createAnnouncer(region, (work) => void pending.push(work));
    const capture = announce.capture;
    if (capture === undefined) throw new Error('the announcer has no way to hold what a piece of work announces');
    return { region, pending, announce, capture, flush: (): void => void pending.splice(0).forEach((work) => work()) };
  }

  it('hands back what the work announced, in order, and writes none of it, not even the clearing', () => {
    const { region, pending, announce, capture } = announcer();
    const caught = capture(() => {
      announce('one');
      announce('two');
    });
    expect(caught).toEqual(['one', 'two']);
    expect(region.textContent).toBe('old');
    expect(pending).toEqual([]);
  });

  it('does not take back what was announced before it, nor delay it', () => {
    const { region, announce, capture, flush } = announcer();
    announce('before');
    capture(() => announce('inside'));
    flush();
    expect(region.textContent).toBe('before');
  });

  it('returns nothing when the work announced nothing', () => {
    const { capture } = announcer();
    expect(capture(() => undefined)).toEqual([]);
  });

  it('announces as before once the work is done', () => {
    const { region, announce, capture, flush } = announcer();
    capture(() => announce('inside'));
    announce('after');
    expect(region.textContent).toBe('');
    flush();
    expect(region.textContent).toBe('after');
  });

  it('announces as before once the work has failed, and lets the failure through', () => {
    const { region, announce, capture, flush } = announcer();
    expect(() =>
      capture(() => {
        announce('inside');
        throw new Error('the work failed');
      }),
    ).toThrow('the work failed');
    announce('after');
    flush();
    expect(region.textContent).toBe('after');
  });

  it('keeps what each of two nested scopes announced to that scope', () => {
    const { region, pending, announce, capture } = announcer();
    let inner: string[] = [];
    const outer = capture(() => {
      announce('outer 1');
      inner = capture(() => announce('inner'));
      announce('outer 2');
    });
    expect(inner).toEqual(['inner']);
    expect(outer).toEqual(['outer 1', 'outer 2']);
    expect(region.textContent).toBe('old');
    expect(pending).toEqual([]);
  });
});

// What the controller relies on so that what it owes the reader is not taken back: an announcement can be kept. The announcer writes
// only the latest announcement, so one that is superseded within its delay is never written. A kept one is not superseded by an
// ordinary one: they are written together, as one announcement, in the order they were announced. Ordinary announcements still
// replace one another, and a kept one replaces an earlier kept one: whoever keeps a message says all of it.
describe('the announcer: keep', () => {
  function announcer() {
    let text: string | null = 'old';
    const writes: string[] = [];
    const region = {
      get textContent(): string | null {
        return text;
      },
      set textContent(value: string | null) {
        text = value;
        writes.push(value ?? '');
      },
    };
    const pending: Array<() => void> = [];
    const announce = createAnnouncer(region, (work) => void pending.push(work));
    return {
      announce,
      pending,
      region: (): string | null => text,
      /** What was written, with the clearing that precedes each announcement left out. */
      said: (): string[] => writes.filter((value) => value !== ''),
      flush: (): void => void pending.splice(0).forEach((work) => work()),
    };
  }

  it('clears the region at once and writes a kept message on the next turn, as it does any message', () => {
    const { announce, region, flush } = announcer();
    announce('Presentation mode off.', { keep: true });
    expect(region()).toBe('');
    flush();
    expect(region()).toBe('Presentation mode off.');
  });

  it('is not taken back by a message announced after it: both are written, as one message, in the order announced', () => {
    const { announce, said, flush } = announcer();
    announce('Presentation mode off.', { keep: true });
    announce('5 minutes left.');
    flush();
    expect(said()).toEqual(['Presentation mode off. 5 minutes left.']);
  });

  it('does not take back a message announced before it: both are written, as one message, in the order announced', () => {
    const { announce, said, flush } = announcer();
    announce('5 minutes left.');
    announce('Presentation mode off.', { keep: true });
    flush();
    expect(said()).toEqual(['5 minutes left. Presentation mode off.']);
  });

  it('is replaced by a later kept message, which says all of it', () => {
    const { announce, said, flush } = announcer();
    announce('Presentation mode on.', { keep: true });
    announce('Presentation mode on. Wake lock was not granted.', { keep: true });
    flush();
    expect(said()).toEqual(['Presentation mode on. Wake lock was not granted.']);
  });

  it('leaves ordinary messages replacing one another, and keeps the kept one', () => {
    const { announce, said, flush } = announcer();
    announce('Presentation mode off.', { keep: true });
    announce('one');
    announce('two');
    flush();
    expect(said()).toEqual(['Presentation mode off. two']);
  });

  it('writes a kept message once: the next announcement does not carry it', () => {
    const { announce, said, flush } = announcer();
    announce('Presentation mode off.', { keep: true });
    announce('5 minutes left.');
    flush();
    announce('1 minute left.');
    flush();
    expect(said()).toEqual(['Presentation mode off. 5 minutes left.', '1 minute left.']);
  });

  it('ignores a deferred write that was superseded, even when it runs after the newest, and still writes what was kept', () => {
    const { announce, pending, said } = announcer();
    announce('Presentation mode off.', { keep: true });
    announce('5 minutes left.');
    pending.splice(0).reverse().forEach((work) => work());
    expect(said()).toEqual(['Presentation mode off. 5 minutes left.']);
  });

  it('adds nothing for an ordinary message that is empty', () => {
    const { announce, region, flush } = announcer();
    announce('Presentation mode off.', { keep: true });
    announce('');
    flush();
    expect(region()).toBe('Presentation mode off.');
  });

  it('holds a kept message that work announces, as it holds any, and writes none of it', () => {
    const { announce, pending, region } = announcer();
    const capture = announce.capture;
    if (capture === undefined) throw new Error('the announcer has no way to hold what a piece of work announces');
    expect(capture(() => announce('inside', { keep: true }))).toEqual(['inside']);
    expect(region()).toBe('old');
    expect(pending).toEqual([]);
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

  // A request that is still out when its controller goes may be answered later. It belongs to a controller that is gone, so it
  // cannot report a failure: the root and the controls it would put back to windowed may be a newer controller's, presenting.
  it('is not undone by the request it left outstanding: a late rejection cannot roll a replacement on the same root back to windowed', async () => {
    const page = mount();
    let rejectOld!: (reason: unknown) => void;
    const oldRequest = new Promise<void>((_, reject) => {
      rejectOld = reject;
    });
    Object.assign(page.doubles.root, { requestFullscreen: () => oldRequest });
    click(page, 'present-start'); // out, and not answered...
    page.presentation.dispose(); // ...when this controller goes

    const announced: string[] = [];
    const replacement = mountPresentation({
      document: page.browser.document,
      window: page.browser.window,
      navigator: page.doubles.navigator,
      store: page.store,
      announce: (message: string) => void announced.push(message),
      describeSegment: () => 'the same segment',
    } as never);
    if (replacement === undefined) throw new Error('the replacement did not mount on the shipped shell');
    Object.assign(page.doubles.root, {
      requestFullscreen: async (): Promise<void> => {
        page.doubles.fullscreenElement = page.doubles.root;
        page.doubles.fire(page.browser.document, 'fullscreenchange');
      },
    });
    click(page, 'present-start');
    await settle();
    expect(replacement.active).toBe(true);
    const before = announced.length;

    rejectOld(new TypeError('the request ended after its controller'));
    await settle();
    expect(replacement.active).toBe(true);
    expect(page.doubles.root.getAttribute('data-presentation')).toBe('presenting');
    expect(byId(page, 'present-exit').isRendered()).toBe(true);
    expect(byId(page, 'present-start').isRendered()).toBe(false);
    expect(announced).toHaveLength(before);
    replacement.dispose();
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

  // Firefox and WebKit spend the Escape that leaves fullscreen, so the page is told only that fullscreen ended, and the Escape that
  // would have closed a dialog, put away a popover or paused a timer (SPA-04 and SPA-05) never reaches them. The shell puts them
  // away when fullscreen ends without the page asking, the way that Escape would have in the window, and only then.
  describe('fullscreen that the browser ends', () => {
    const boot = (segment: string) => bootShell({}, INDEX_HTML, `#/${segment}`);
    const element = (browser: Browser, id: string): FakeElement => {
      const found = browser.document.getElementById(id);
      if (found === null) throw new Error(`#${id} is not on the page`);
      return found;
    };
    const timerOf = (browser: Browser) => {
      const widget = element(browser, 'm1-segment-timer');
      return {
        start: within(widget, 'button').find((candidate) => candidate.textContent.trim() === 'Start') as FakeElement,
        readout: (): string => within(widget, '[role="timer"]')[0].textContent.trim(),
        caption: (): string => within(widget, 'span').find((node) => !node.hasAttribute('role'))?.textContent.trim() ?? '',
      };
    };
    const TIMER_SEGMENT = 'm1-extensibility-architecture';

    it('closes an open dialog, lifts the inert from the page, and gives the focus back to the button that opened it', async () => {
      const { browser, doubles, liveRegion, press } = await boot('m5c-copilot-cli-extensions');
      press('present-start');
      await wait();
      const trigger = element(browser, 'm5c-synergy-zoom-trigger');
      const dialog = element(browser, 'm5c-synergy-zoom-dialog');
      browser.pointer.click(trigger);
      expect(dialog.hidden).toBe(false);
      expect(browser.document.querySelectorAll('[inert]').length).toBeGreaterThan(0);

      doubles.endFullscreen(); // all that Firefox and WebKit show the page of an Escape that leaves fullscreen
      await wait();
      expect(dialog.hidden).toBe(true);
      expect(browser.document.querySelectorAll('[inert]')).toHaveLength(0);
      expect(browser.document.activeElement).toBe(trigger);
      expect(liveRegion.textContent).toMatch(/presentation mode off/i);
    });

    it('leaves an open dialog alone while fullscreen goes on', async () => {
      const { browser, doubles, press } = await boot('m5c-copilot-cli-extensions');
      press('present-start');
      await wait();
      browser.pointer.click(element(browser, 'm5c-synergy-zoom-trigger'));
      doubles.fire(browser.document, 'fullscreenchange'); // the root is still the fullscreen element
      await wait();
      expect(element(browser, 'm5c-synergy-zoom-dialog').hidden).toBe(false);
    });

    it('reaches the interactions of the segment that is open when fullscreen ends, not those of the segment it began on', async () => {
      const { browser, doubles, spa, press } = await boot('m6-a2a-tmux');
      press('present-start');
      await wait();
      spa.store.navigate('m5c-copilot-cli-extensions');
      await wait();
      const trigger = element(browser, 'm5c-synergy-zoom-trigger');
      browser.pointer.click(trigger);
      expect(element(browser, 'm5c-synergy-zoom-dialog').hidden).toBe(false);

      doubles.endFullscreen();
      await wait();
      expect(element(browser, 'm5c-synergy-zoom-dialog').hidden).toBe(true);
      expect(browser.document.activeElement).toBe(trigger);
    });

    it('puts away a popover that is showing, and keeps it away while the pointer rests on its button', async () => {
      const { browser, doubles, press } = await boot('m6-a2a-tmux');
      press('present-start');
      await wait();
      const trigger = within(element(browser, 'm6-segment-details'), 'button')[0];
      const popover = element(browser, trigger.getAttribute('aria-controls') ?? '');
      browser.pointer.moveTo(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(popover.hidden).toBe(false);

      doubles.endFullscreen();
      await wait();
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(popover.hidden).toBe(true);
      vi.advanceTimersByTime(2000); // the pointer is still on the button: after Escape the popover stays away until it has left
      expect(popover.hidden).toBe(true);
    });

    it('leaves a popover that was not showing free to show when the pointer arrives after fullscreen has ended', async () => {
      const { browser, doubles, press } = await boot('m6-a2a-tmux');
      press('present-start');
      await wait();
      doubles.endFullscreen();
      await wait();
      const trigger = within(element(browser, 'm6-segment-details'), 'button')[0];
      browser.pointer.moveTo(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('pauses a running timer that the focus is in, and keeps the time that is left', async () => {
      const { browser, doubles, spa, press } = await boot(TIMER_SEGMENT);
      press('present-start');
      await wait();
      const timer = timerOf(browser);
      browser.pointer.click(timer.start); // a click puts the focus on the button: it is inside the timer
      vi.advanceTimersByTime(3000);
      expect(timer.caption()).toBe('Running');

      doubles.endFullscreen();
      await wait();
      expect(timer.caption()).toBe('Paused');
      const kept = timer.readout();
      vi.advanceTimersByTime(10_000);
      expect(timer.readout()).toBe(kept);
      expect(spa.store.get().segments[TIMER_SEGMENT]?.parameters['m1-segment-timer']).toMatchObject({ state: 'paused' });
    });

    it('leaves a running timer running when the focus is not in it, as Escape does in the window', async () => {
      const { browser, doubles, press } = await boot(TIMER_SEGMENT);
      press('present-start');
      await wait();
      const timer = timerOf(browser);
      browser.pointer.click(timer.start);
      element(browser, 'main').focus(); // Escape elsewhere on the page does not pause the timer
      vi.advanceTimersByTime(3000);
      const before = timer.readout();

      doubles.endFullscreen();
      await wait();
      expect(timer.caption()).toBe('Running');
      vi.advanceTimersByTime(5000);
      expect(timer.readout()).not.toBe(before);
    });

    it('leaves a running timer running when the page itself asked to leave fullscreen', async () => {
      const { browser, doubles, spa, press } = await boot(TIMER_SEGMENT);
      press('present-start');
      await wait();
      const timer = timerOf(browser);
      browser.pointer.click(timer.start); // the focus stays in the timer: only the question of who asked can tell the two exits apart
      vi.advanceTimersByTime(3000);

      spa.presentation?.exit();
      await wait();
      expect(spa.presentation?.active).toBe(false);
      expect(doubles.log).toContain('exitFullscreen');
      expect(timer.caption()).toBe('Running');
    });
  });
});
