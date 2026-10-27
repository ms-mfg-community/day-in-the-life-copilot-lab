// Independent SPA-06 edge cases. The fixture is the shipped index.html, not a second hand-written shell.
// Product files are never modified by these tests.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAnnouncer } from '../../workshop/spa/src/shell/live-region';
import {
  mountPresentation,
  type Presentation,
  type PresentationWakeLockSentinel,
} from '../../workshop/spa/src/shell/presentation';
import { createState } from '../../workshop/spa/src/shell/state';
import { createBrowser, type FakeElement } from './helpers/fake-dom';
import { installDoubles, type DoublesOptions } from './helpers/presentation-doubles';

const HTML = readFileSync(path.resolve('workshop/spa/index.html'), 'utf8');
const mounted: Presentation[] = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

function mount(options: DoublesOptions = {}) {
  const browser = createBrowser(HTML);
  const doubles = installDoubles(browser, options);
  const store = createState(['alpha', 'beta', 'gamma']);
  const messages: string[] = [];
  const live = browser.document.getElementById('live-region');
  if (live === null) throw new Error('The shipped shell needs its real live region');
  // Use the production announcer, keeping deferred writes under the test's control.
  const writes: Array<() => void> = [];
  const announce = createAnnouncer(live, (write) => writes.push(write));
  const presentation = mountPresentation({
    document: browser.document,
    window: browser.window,
    navigator: doubles.navigator,
    store,
    announce: (message: string) => {
      messages.push(message);
      announce(message);
    },
    describeSegment: (id: string) => id,
  } as never);
  if (presentation === undefined) throw new Error('SPA-06 must mount on its shipped markup');
  mounted.push(presentation);
  const element = (id: string): FakeElement => {
    const found = browser.document.getElementById(id);
    if (found === null) throw new Error(`Missing shipped control: ${id}`);
    return found;
  };
  return {
    browser,
    doubles,
    store,
    presentation,
    messages,
    live,
    element,
    click: (id: string) => browser.pointer.click(element(id)),
    check: (id: string) => Object.assign(element(id), { checked: true }),
    flushLive: () => {
      for (const write of writes.splice(0)) write();
    },
  };
}

function sentinel() {
  const release = vi.fn(async () => {});
  const value: PresentationWakeLockSentinel = { released: false, release };
  return { value, release };
}

afterEach(() => {
  for (const presentation of mounted.splice(0)) presentation.dispose();
  vi.restoreAllMocks();
});

describe('QA SPA-06: failures must preserve the working window', () => {
  it.each(['reject', 'error-event', 'reject-and-event', 'throw'] as const)(
    'preserves the segment and its interaction state after %s, then allows a clean retry',
    async (outcome) => {
      const page = mount();
      page.store.navigate('beta');
      page.store.update('beta', (state) => ({
        ...state,
        revealedSteps: 3,
        parameters: { tabs: { selected: 2 }, chart: 17, timer: { state: 'paused', elapsedMs: 9000 } },
      }));
      const before = structuredClone(page.store.get());
      page.doubles.outcome = outcome;
      page.check('present-keyboard-lock');
      page.click('present-start');
      await settle();
      page.flushLive();
      expect(page.store.get()).toEqual(before);
      expect(page.live.textContent).toMatch(/fullscreen could not start.*beta/i);
      // The lock follows the browser's answer (section 2.5 as measured, SPA-13): a request that failed took none, so none is held.
      expect(page.doubles.keyboardLock).not.toHaveBeenCalled();
      expect(page.doubles.keyboardUnlock).not.toHaveBeenCalled();
      expect(page.doubles.wakeLockRequest).not.toHaveBeenCalled();

      page.doubles.outcome = 'resolve';
      page.click('present-start');
      await settle();
      page.doubles.endFullscreen();
      await settle();
      page.flushLive();
      expect(page.store.get()).toEqual(before);
      expect(page.live.textContent).toMatch(/presentation mode off.*beta/i);
    },
  );

  it('continues when keyboard.lock throws synchronously, with a blocked popup and a refused wake lock', async () => {
    const page = mount();
    page.doubles.behaviour.popupBlocked = true;
    page.doubles.behaviour.wakeLockRejects = true;
    page.doubles.keyboardLock.mockImplementationOnce(() => {
      page.doubles.log.push('lock');
      throw new DOMException('Denied synchronously', 'SecurityError');
    });
    page.check('present-open-script');
    page.check('present-keyboard-lock');
    page.click('present-start');
    expect(page.doubles.log).toEqual(['requestFullscreen']);
    await settle();
    expect(page.doubles.log).toEqual(['requestFullscreen', 'wakeLock.request:screen', 'open', 'lock']);
    page.flushLive();
    expect(page.presentation.active).toBe(true);
    expect(page.live.textContent).toMatch(/speaker script.*blocked/i);
    expect(page.live.textContent).toMatch(/keyboard lock/i);
    expect(page.live.textContent).toMatch(/wake lock/i);
  });

  it('handles a synchronous wake-lock exception without leaving presentation mode', async () => {
    const page = mount();
    page.doubles.wakeLockRequest.mockImplementationOnce(() => {
      throw new DOMException('Denied synchronously', 'NotAllowedError');
    });
    page.click('present-start');
    await settle();
    page.flushLive();
    expect(page.presentation.active).toBe(true);
    expect(page.live.textContent).toMatch(/wake lock.*not granted/i);
    page.doubles.endFullscreen();
    await settle();
    expect(page.presentation.active).toBe(false);
  });
});

describe('QA SPA-06: repeated and overlapping requests', () => {
  it('does not let a late fullscreen rejection cancel a newer pending activation', async () => {
    const page = mount();
    const old = deferred<void>();
    Object.assign(page.doubles.root, { requestFullscreen: () => old.promise });
    page.click('present-start');
    page.doubles.fire(page.doubles.root, 'fullscreenerror');
    await settle();
    const next = deferred<void>();
    Object.assign(page.doubles.root, { requestFullscreen: () => next.promise });
    page.click('present-start');
    const before = [...page.messages];
    old.reject(new TypeError('Old request'));
    await settle();
    expect(page.messages).toEqual(before);
    page.doubles.fullscreenElement = page.doubles.root;
    page.doubles.fire(page.browser.document, 'fullscreenchange');
    next.resolve();
    await settle();
    expect(page.presentation.active).toBe(true);
  });

  it('does not let an old keyboard rejection release the next presentation keyboard lock', async () => {
    const page = mount();
    const old = deferred<void>();
    page.doubles.keyboardLock.mockImplementationOnce(() => old.promise);
    page.check('present-keyboard-lock');
    page.click('present-start');
    await settle();
    page.doubles.endFullscreen();
    await settle();
    page.click('present-start');
    await settle();
    old.reject(new DOMException('Old request', 'AbortError'));
    await settle();
    expect(page.element('present-notes').textContent).not.toMatch(/keyboard lock/i);
    page.doubles.endFullscreen();
    await settle();
    expect(page.doubles.keyboardUnlock).toHaveBeenCalledTimes(2);
  });

  it.each(['grant', 'reject'] as const)(
    'isolates a late wake-lock %s from an older presentation, without losing the new lock',
    async (outcome) => {
      const page = mount();
      const old = deferred<PresentationWakeLockSentinel>();
      const stale = sentinel();
      page.doubles.wakeLockRequest.mockImplementationOnce(() => old.promise as never);
      page.click('present-start');
      await settle();
      page.doubles.endFullscreen();
      await settle();
      page.click('present-start');
      await settle();
      expect(page.doubles.sentinels).toHaveLength(1);
      const fresh = page.doubles.sentinels[0];
      if (outcome === 'grant') old.resolve(stale.value);
      else old.reject(new DOMException('Old request', 'NotAllowedError'));
      await settle();
      expect(page.presentation.active).toBe(true);
      expect(fresh.released).toBe(false);
      expect(stale.release).toHaveBeenCalledTimes(outcome === 'grant' ? 1 : 0);
      expect(page.element('present-notes').textContent).not.toMatch(/wake lock/i);
      page.doubles.endFullscreen();
      await settle();
      expect(fresh.released).toBe(true);
    },
  );

  it('does not duplicate an already-held wake lock on repeated visible events', async () => {
    const page = mount();
    page.click('present-start');
    await settle();
    for (let count = 0; count < 5; count += 1) page.doubles.setVisible(true);
    await settle();
    expect(page.doubles.wakeLockRequest).toHaveBeenCalledTimes(1);
    page.doubles.endFullscreen();
    await settle();
    expect(page.doubles.log.filter((entry) => entry === 'wakeLock.release')).toHaveLength(1);
  });
});

describe('QA SPA-06: monitor selection is strictly opt-in', () => {
  it.each([
    { name: 'unselected', value: '' },
    { name: 'negative', value: '-1' },
    { name: 'past last screen', value: '2' },
    { name: 'fraction', value: '1.5' },
    { name: 'infinity', value: 'Infinity' },
    { name: 'exponent', value: '1e0' },
    { name: 'oversized whitespace', value: ' '.repeat(1000) },
    { name: 'oversized integer', value: '9'.repeat(10000) },
  ])(
    'never passes an unselected or invalid screen index ($name)',
    async ({ value }) => {
      const page = mount({ screens: true });
      page.click('present-choose-screen');
      await settle();
      Object.assign(page.element('present-screen'), { value });
      page.click('present-start');
      await settle();
      expect(page.doubles.requests).toEqual([[]]);
      expect(page.presentation.active).toBe(true);
    },
  );

  it('treats an empty screen list as unavailable and keeps Present usable', async () => {
    const page = mount({ screens: true });
    page.doubles.getScreenDetails.mockResolvedValueOnce({ screens: [] });
    page.click('present-choose-screen');
    await settle();
    page.flushLive();
    expect(page.element('present-screen-field').hidden).toBe(true);
    expect(page.live.textContent).toMatch(/move this browser window onto the audience monitor, then activate Present/i);
    page.click('present-start');
    await settle();
    expect(page.doubles.requests).toEqual([[]]);
    expect(page.presentation.active).toBe(true);
  });
});

describe('QA SPA-06: disposed controllers cannot write into a newer shell', () => {
  it('cannot roll a replacement controller back to windowed when a disposed request rejects', async () => {
    const page = mount();
    const pending = deferred<void>();
    Object.assign(page.doubles.root, { requestFullscreen: () => pending.promise });
    page.click('present-start');
    page.presentation.dispose();
    const replacement = mountPresentation({
      document: page.browser.document,
      window: page.browser.window,
      navigator: page.doubles.navigator,
      store: page.store,
      announce: (message: string) => {
        page.live.textContent = message;
      },
    } as never);
    if (replacement === undefined) throw new Error('The replacement must mount on the same shipped shell');
    mounted.push(replacement);
    Object.assign(page.doubles.root, {
      requestFullscreen: async () => {
        page.doubles.fullscreenElement = page.doubles.root;
        page.doubles.fire(page.browser.document, 'fullscreenchange');
      },
    });
    page.click('present-start');
    await settle();
    expect(replacement.active).toBe(true);
    expect(page.doubles.root.getAttribute('data-presentation')).toBe('presenting');
    const before = [...page.messages];
    pending.reject(new TypeError('Request ended after teardown'));
    await settle();
    page.flushLive();
    expect(page.doubles.fullscreenElement).toBe(page.doubles.root);
    expect(page.doubles.root.getAttribute('data-presentation')).toBe('presenting');
    expect(page.element('present-exit').hidden).toBe(false);
    expect(page.live.textContent).toMatch(/presentation mode on/i);
    expect(page.messages).toEqual(before);
  });

  it('immediately releases a wake lock granted after disposal', async () => {
    const page = mount();
    const pending = deferred<PresentationWakeLockSentinel>();
    const late = sentinel();
    page.doubles.wakeLockRequest.mockImplementationOnce(() => pending.promise as never);
    page.click('present-start');
    await settle();
    page.presentation.dispose();
    const before = [...page.messages];
    pending.resolve(late.value);
    await settle();
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(page.messages).toEqual(before);
  });
});
