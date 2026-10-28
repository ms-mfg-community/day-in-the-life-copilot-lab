// Independent round-2 regressions: exercise the new browser-ended dismissal path through the shipped shell.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Presentation } from '../../workshop/spa/src/shell/presentation';
import type { ShellStore } from '../../workshop/spa/src/shell/state';
import { createBrowser, type FakeElement } from './helpers/fake-dom';
import { ROOT, segmentsFromPipeline, within } from './helpers/interaction-harness';
import { installDoubles } from './helpers/presentation-doubles';

const HTML = readFileSync(path.join(ROOT, 'workshop/spa/index.html'), 'utf8');
const SEGMENT = 'm1-extensibility-architecture';
const mounted: Presentation[] = [];

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

async function flush(): Promise<void> {
  await settle();
  vi.advanceTimersByTime(100);
  await settle();
}

async function boot() {
  const browser = createBrowser(HTML);
  const doubles = installDoubles(browser);
  for (const [name, value] of Object.entries(browser.globals)) vi.stubGlobal(name, value);
  vi.stubGlobal('navigator', doubles.navigator);
  vi.doMock('virtual:spa-content', () => ({ segments: segmentsFromPipeline() }));
  const specifier = '../../workshop/spa/src/main';
  await import(specifier);
  await flush();
  const spa = browser.window.teachingSpa as unknown as { store: ShellStore; presentation: Presentation };
  expect(spa.store.get().currentId).toBe(SEGMENT);
  mounted.push(spa.presentation);
  const element = (id: string): FakeElement => {
    const found = browser.document.getElementById(id);
    if (found === null) throw new Error(`Missing shipped element: ${id}`);
    return found;
  };
  const timer = element('m1-segment-timer');
  const start = within(timer, 'button').find((button) => button.textContent.trim() === 'Start');
  if (start === undefined) throw new Error('Missing timer Start control');
  return {
    browser,
    doubles,
    spa,
    live: element('live-region'),
    timer,
    startTimer: () => browser.pointer.click(start),
    caption: () => within(timer, 'span').find((span) => !span.hasAttribute('role'))?.textContent.trim(),
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  for (const presentation of mounted.splice(0)) presentation.dispose();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('QA SPA-06 round 2: dismissal must not discard other exit contracts', () => {
  it('AC8 writes the fullscreen-ended announcement even when dismissal also pauses a focused timer', async () => {
    const page = await boot();
    page.spa.presentation.present();
    await flush();
    page.startTimer();
    await flush();
    expect(page.caption()).toBe('Running');
    expect(page.timer.contains(page.browser.document.activeElement)).toBe(true);
    // Observe actual DOM writes, not calls to announce(): createAnnouncer deliberately drops superseded writes.
    const writes = vi.spyOn(page.live, 'textContent', 'set');

    page.doubles.endFullscreen();
    await flush();

    expect(page.spa.presentation.active).toBe(false);
    expect(page.caption()).toBe('Paused');
    expect(page.spa.store.get().currentId).toBe(SEGMENT);
    expect(writes.mock.calls.map(([text]) => text).filter((text) => /presentation mode off/i.test(text))).toEqual(
      expect.arrayContaining([expect.stringMatching(/presentation mode off.*segment 1 of/i)]),
    );
  });

  it('a stale exit rejection cannot make a newer application-requested exit dismiss its running timer', async () => {
    const page = await boot();
    page.spa.presentation.present();
    await flush();
    const oldExit = deferred();
    Object.defineProperty(page.browser.document, 'exitFullscreen', { configurable: true, value: () => oldExit.promise });
    page.spa.presentation.exit();
    // The browser ends the first session while its exit promise is still outstanding.
    page.doubles.endFullscreen();
    await flush();
    expect(page.spa.presentation.active).toBe(false);

    page.spa.presentation.present();
    await flush();
    page.startTimer();
    await flush();
    expect(page.caption()).toBe('Running');
    const newExit = deferred();
    Object.defineProperty(page.browser.document, 'exitFullscreen', { configurable: true, value: () => newExit.promise });
    page.spa.presentation.exit();
    // An answer from the ended session must not clear the newer session's application-exit marker.
    oldExit.reject(new TypeError('The old document was no longer fullscreen'));
    await settle();
    page.doubles.endFullscreen();
    newExit.resolve();
    await flush();

    expect(page.spa.presentation.active).toBe(false);
    expect(page.spa.store.get().currentId).toBe(SEGMENT);
    expect(page.caption()).toBe('Running');
    expect(page.spa.store.get().segments[SEGMENT]?.parameters['m1-segment-timer']).toMatchObject({ state: 'running' });
  });
});
