// Independent SPA-05 regressions, derived from specs/005-teaching-spa.md:
// section 7, child 5 ("each with a long description"), section 2.3 (timer state
// outlives navigation), and section 2.11/F93/F104 (accurate live status).
// These tests intentionally do not repair the implementation.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeElement } from './helpers/fake-dom';
import {
  PART_TWO,
  auditLongDescription,
  bootFromBundle,
  bootFromSource,
  buildBundle,
  readDeckIds,
  readInventory,
  removeBundle,
  segmentsFromPipeline,
  type Booted,
  type Bundle,
  type Flavour,
} from './helpers/interaction-harness';

const inventory = readInventory();
const timer = inventory.find((entry) => entry.pattern === 'segment-timer');
if (timer === undefined) throw new Error('SPA-05 must declare a segment timer');
const timerEntry = timer;
const away = readDeckIds().find((id) => id !== timerEntry.segment);
if (away === undefined) throw new Error('The timer persistence probe needs another real segment');
const awayId = away;
const segment = segmentsFromPipeline().find((entry) => entry.id === timerEntry.segment);
if (segment === undefined) throw new Error('The timer must belong to a real segment');
const total = segment.minutes * 60_000;

describe.each<Flavour>(['source', 'bundle'])('QA SPA-05 child 5 long descriptions (%s)', (flavour) => {
  let page: Booted | undefined;
  let bundle: Bundle | undefined;

  beforeAll(async () => {
    if (flavour === 'bundle') bundle = buildBundle();
    page = flavour === 'bundle' ? await bootFromBundle(bundle as Bundle) : await bootFromSource();
  }, 120_000);

  afterAll(() => {
    page?.cleanup();
    if (bundle !== undefined) removeBundle(bundle);
  });

  it('gives each of the four child-5 patterns its declared, reachable, associated long description', async () => {
    const problems: string[] = [];
    for (const pattern of PART_TWO) {
      const entries = inventory.filter((entry) => entry.pattern === pattern);
      expect(entries.length, `${pattern} cannot be omitted from this check`).toBeGreaterThan(0);
      for (const entry of entries) {
        await (page as Booted).go(entry.segment);
        problems.push(...auditLongDescription((page as Booted).document, entry));
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('QA SPA-05 timer persistence and truthful remaining-time status', () => {
  let page: Booted;

  const button = (name: string): FakeElement => {
    const found = page.root(timerEntry.id).querySelectorAll('button').find((node) => node.textContent === name);
    if (found === undefined) throw new Error(`No timer ${name} button`);
    return found;
  };
  const shown = (): string => {
    const readout = page.root(timerEntry.id).querySelector('[role="timer"]');
    if (readout === null) throw new Error('No timer readout');
    return readout.textContent;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2030-01-01T09:00:00Z'));
    page = await bootFromSource();
    await page.go(timerEntry.segment);
  });

  afterEach(() => {
    page?.cleanup();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('does not give elapsed time back on navigation after the active wall clock moved backwards', async () => {
    page.pointer.click(button('Start'));
    vi.advanceTimersByTime(10_000);
    vi.setSystemTime(Date.now() - 3_600_000);
    vi.advanceTimersByTime(5_000);
    const before = shown();
    expect(before).not.toBe(`${total / 60_000}:00`);

    await page.go(awayId);
    await page.go(timerEntry.segment);

    expect(shown(), 'Navigation must retain the elapsed time already shown by the running timer').toBe(before);
  });

  it('does not discard newly elapsed time on repeated visits after restoring a future stored start', async () => {
    page.spa.store.update(timerEntry.segment, (state) => ({
      ...state,
      parameters: {
        ...state.parameters,
        [timerEntry.id]: { state: 'running', elapsedMs: 5_000, startedAt: Date.now() + 3_600_000 },
      },
    }));
    await page.go(awayId);
    await page.go(timerEntry.segment);
    vi.advanceTimersByTime(5_000);
    const before = shown();

    await page.go(awayId);
    await page.go(timerEntry.segment);

    expect(shown(), 'A recovered future timestamp must not reset elapsed time on every visit').toBe(before);
  });

  it.each([270, 30])('announces the actual %i seconds left after a delayed tick, not the expired threshold', (secondsLeft) => {
    const began = Date.now();
    page.pointer.click(button('Start'));
    vi.advanceTimersByTime(1_000);
    // The wall clock advances while interval callbacks do not run, as when a
    // laptop sleeps or a background page's callbacks are delayed.
    vi.setSystemTime(began + total - secondsLeft * 1_000 - 1_000);
    vi.advanceTimersByTime(1_000);
    vi.advanceTimersByTime(50);

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    const time = [
      minutes ? `${minutes} minute${minutes === 1 ? '' : 's'}` : '',
      seconds ? `${seconds} second${seconds === 1 ? '' : 's'}` : '',
    ].filter(Boolean).join(' ');
    expect(shown()).toBe(`${minutes}:${String(seconds).padStart(2, '0')}`);
    expect(page.liveRegion.textContent, 'The audible remaining time must agree with the visible countdown').toBe(`${time} left.`);
  });
});
