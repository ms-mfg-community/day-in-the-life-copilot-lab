// Independent round-2 checks of the shared-announcer delta: real delay boundaries, later timer marks, and capture failure.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAnnouncer } from '../../workshop/spa/src/shell/live-region';
import type { Presentation } from '../../workshop/spa/src/shell/presentation';
import type { ShellStore } from '../../workshop/spa/src/shell/state';
import { createBrowser } from './helpers/fake-dom';
import { ROOT, segmentsFromPipeline, within } from './helpers/interaction-harness';
import { installDoubles } from './helpers/presentation-doubles';

const HTML = readFileSync(path.join(ROOT, 'workshop/spa/index.html'), 'utf8');
const SEGMENT = 'm1-extensibility-architecture';
const mounted: Presentation[] = [];

async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

async function flush(): Promise<void> {
  await settle();
  vi.advanceTimersByTime(100);
  await settle();
}

function recordingRegion() {
  let text: string | null = 'old';
  const writes: string[] = [];
  const region = {
    get textContent(): string | null {
      return text;
    },
    set textContent(value: string | null) {
      text = value;
      if (value) writes.push(value);
    },
  };
  return { region, writes, announce: createAnnouncer(region) };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2030-01-01T09:00:00Z'));
});

afterEach(() => {
  for (const presentation of mounted.splice(0)) presentation.dispose();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('QA delta: presentation announcements do not change a running timer', () => {
  it.each(['browser-ended', 'reject', 'error-event', 'reject-and-event', 'throw', 'blocked-popup-pending'] as const)(
    '%s keeps counting through both later marks without replaying fullscreen status',
    async (outcome) => {
      const browser = createBrowser(HTML);
      const doubles = installDoubles(browser);
      for (const [name, value] of Object.entries(browser.globals)) vi.stubGlobal(name, value);
      vi.stubGlobal('navigator', doubles.navigator);
      vi.doMock('virtual:spa-content', () => ({ segments: segmentsFromPipeline() }));
      const specifier = '../../workshop/spa/src/main';
      await import(specifier);
      await flush();
      const spa = browser.window.teachingSpa as unknown as { store: ShellStore; presentation: Presentation };
      mounted.push(spa.presentation);
      if (outcome === 'browser-ended') {
        spa.presentation.present();
        await flush();
        expect(spa.presentation.active).toBe(true);
      }
      const timer = browser.document.getElementById('m1-segment-timer');
      const live = browser.document.getElementById('live-region');
      const main = browser.document.getElementById('main');
      if (!timer || !live || !main) throw new Error('The real shell must have its timer, main and live region');
      const start = within(timer, 'button').find((button) => button.textContent.trim() === 'Start');
      const readout = within(timer, '[role="timer"]')[0];
      if (!start || !readout) throw new Error('The real timer must have its Start control and readout');
      const began = Date.now();
      browser.pointer.click(start);
      await flush();
      main.focus();
      vi.advanceTimersByTime(began + 975 - Date.now());
      vi.setSystemTime(began + 30 * 60_000 - 25);
      const writes = vi.spyOn(live, 'textContent', 'set');

      if (outcome === 'browser-ended') doubles.endFullscreen();
      else {
        doubles.outcome = outcome === 'blocked-popup-pending' ? 'pending' : outcome;
        if (outcome === 'blocked-popup-pending') {
          const scriptToggle = browser.document.getElementById('present-open-script');
          if (!scriptToggle) throw new Error('The real shell must have its speaker-window option');
          Object.assign(scriptToggle, { checked: true });
          doubles.behaviour.popupBlocked = true;
        }
        spa.presentation.present();
      }
      await flush();

      const status =
        outcome === 'browser-ended'
          ? /Presentation mode off.*segment 1 of/
          : outcome === 'blocked-popup-pending'
            ? /speaker script window was blocked/
            : /Fullscreen could not start.*segment 1 of/;
      expect(writes.mock.calls.some(([text]) => status.test(text) && text.includes('5 minutes left.'))).toBe(true);
      if (outcome === 'blocked-popup-pending') {
        expect(doubles.open).toHaveBeenCalledTimes(1);
        expect(doubles.requests).toHaveLength(1); // Blocking the popup must not prevent the pending fullscreen request.
      }
      expect(spa.presentation.active).toBe(false);
      expect(spa.store.get().currentId).toBe(SEGMENT);
      expect(spa.store.get().segments[SEGMENT]?.parameters['m1-segment-timer']).toMatchObject({ state: 'running' });
      expect(readout.textContent).toBe('5:00');

      // A status label alone cannot prove the timer is running: observe the next tick, then both remaining real marks.
      vi.advanceTimersByTime(1000);
      expect(readout.textContent).toBe('4:59');
      writes.mockClear();
      vi.advanceTimersByTime(4 * 60_000 - 1000);
      expect(readout.textContent).toBe('1:00');
      expect(live.textContent).toBe('1 minute left.');
      vi.advanceTimersByTime(60_000);
      expect(readout.textContent).toBe('0:00');
      expect(live.textContent).toBe('Time is up.');
      expect(spa.store.get().segments[SEGMENT]?.parameters['m1-segment-timer']).toMatchObject({ state: 'done' });
      expect(writes.mock.calls.map(([text]) => text).filter(Boolean)).toEqual(['1 minute left.', 'Time is up.']);
    },
  );
});

describe('QA delta: the shared announcer at its real 50 ms boundary', () => {
  it.each([0, 49, 50, 51])('writes both statuses when the ordinary update arrives at %i ms', (delay) => {
    const { announce, region, writes } = recordingRegion();
    announce('Presentation mode off. Segment 1.', { keep: true });
    vi.advanceTimersByTime(delay);
    announce('5 minutes left.');
    vi.advanceTimersByTime(50);
    expect(writes.join(' ')).toBe('Presentation mode off. Segment 1. 5 minutes left.');
    expect(writes).toHaveLength(delay < 50 ? 1 : 2);
    expect(region.textContent).toBe(delay < 50 ? 'Presentation mode off. Segment 1. 5 minutes left.' : '5 minutes left.');
  });

  it('preserves both pending messages across a nested capture failure without leaking captured messages', () => {
    const { announce, region, writes } = recordingRegion();
    announce('Presentation mode off.', { keep: true });
    announce('5 minutes left.');
    const capture = announce.capture;
    if (!capture) throw new Error('The shipped announcer must support capture');
    expect(() =>
      capture(() => {
        announce('discarded ordinary');
        capture(() => announce('discarded kept', { keep: true }));
        throw new Error('dismissal failed');
      }),
    ).toThrow('dismissal failed');
    expect(region.textContent).toBe('');
    vi.advanceTimersByTime(50);
    expect(writes).toEqual(['Presentation mode off. 5 minutes left.']);
    announce('Segment 2.');
    vi.advanceTimersByTime(50);
    expect(writes).toEqual(['Presentation mode off. 5 minutes left.', 'Segment 2.']);
  });
});
