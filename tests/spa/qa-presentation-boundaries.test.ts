// AC8 and section 2.5 require actual status-region writes, not just calls to announce().
// An unfocused timer must keep running when fullscreen ends; its next automatic announcement can race that write.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Presentation } from "../../workshop/spa/src/shell/presentation";
import type { ShellStore } from "../../workshop/spa/src/shell/state";
import { createBrowser } from "./helpers/fake-dom";
import {
  ROOT,
  segmentsFromPipeline,
  within,
} from "./helpers/interaction-harness";
import { installDoubles } from "./helpers/presentation-doubles";

const HTML = readFileSync(path.join(ROOT, "workshop/spa/index.html"), "utf8");
const SEGMENT = "m1-extensibility-architecture";
const mounted: Presentation[] = [];

async function settle(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) await Promise.resolve();
}

async function flush(): Promise<void> {
  await settle();
  vi.advanceTimersByTime(100);
  await settle();
}

async function boot(presenting: boolean) {
  const browser = createBrowser(HTML);
  const doubles = installDoubles(browser);
  for (const [name, value] of Object.entries(browser.globals))
    vi.stubGlobal(name, value);
  vi.stubGlobal("navigator", doubles.navigator);
  vi.doMock("virtual:spa-content", () => ({
    segments: segmentsFromPipeline(),
  }));
  const specifier = "../../workshop/spa/src/main";
  await import(specifier);
  await flush();
  const spa = browser.window.teachingSpa as unknown as {
    store: ShellStore;
    presentation: Presentation;
  };
  mounted.push(spa.presentation);
  const timer = browser.document.getElementById("m1-segment-timer");
  const live = browser.document.getElementById("live-region");
  const main = browser.document.getElementById("main");
  if (timer === null || live === null || main === null)
    throw new Error(
      "The shipped shell is missing its timer, main or live region",
    );
  if (presenting) {
    spa.presentation.present();
    await flush();
    expect(spa.presentation.active).toBe(true);
  }
  const start = within(timer, "button").find(
    (button) => button.textContent.trim() === "Start",
  );
  if (start === undefined) throw new Error("Missing timer Start control");
  const began = Date.now();
  browser.pointer.click(start);
  await flush();
  main.focus();
  expect(timer.contains(browser.document.activeElement)).toBe(false);
  expect(
    spa.store.get().segments[SEGMENT]?.parameters["m1-segment-timer"],
  ).toMatchObject({ state: "running" });

  return {
    browser,
    doubles,
    spa,
    timer,
    live,
    // Put the next real timer interval 25 ms ahead, with the wall clock about to cross the chosen boundary.
    // No interval, announcement or interaction module is replaced.
    nearBoundary(elapsed: number): void {
      vi.advanceTimersByTime(began + 975 - Date.now());
      vi.setSystemTime(began + elapsed - 25);
    },
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2030-01-01T09:00:00Z"));
});

afterEach(() => {
  for (const presentation of mounted.splice(0)) presentation.dispose();
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("QA SPA-06: automatic timer announcements must not erase fullscreen status before it is written", () => {
  it.each([
    { elapsed: 30 * 60_000, timerMessage: "5 minutes left." },
    { elapsed: 34 * 60_000, timerMessage: "1 minute left." },
    { elapsed: 35 * 60_000, timerMessage: "Time is up." },
  ])(
    "AC8 writes the windowed state when an unfocused timer reaches $timerMessage 25 ms later",
    async ({ elapsed, timerMessage }) => {
      const page = await boot(true);
      page.nearBoundary(elapsed);
      const writes = vi.spyOn(page.live, "textContent", "set");

      page.doubles.endFullscreen();
      await flush();

      const nonempty = writes.mock.calls.map(([text]) => text).filter(Boolean);
      expect(page.spa.presentation.active).toBe(false);
      expect(page.spa.store.get().currentId).toBe(SEGMENT);
      expect(nonempty).toEqual(
        expect.arrayContaining([expect.stringContaining(timerMessage)]),
      );
      expect(nonempty).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Presentation mode off.*segment 1 of/i),
        ]),
      );
    },
  );

  it.each(["reject", "error-event", "reject-and-event", "throw"] as const)(
    "writes the %s fullscreen failure when an unfocused timer reaches its five-minute mark 25 ms later",
    async (outcome) => {
      const page = await boot(false);
      page.nearBoundary(30 * 60_000);
      page.doubles.outcome = outcome;
      const writes = vi.spyOn(page.live, "textContent", "set");

      page.spa.presentation.present();
      await flush();

      const nonempty = writes.mock.calls.map(([text]) => text).filter(Boolean);
      expect(page.spa.presentation.active).toBe(false);
      expect(page.spa.store.get().currentId).toBe(SEGMENT);
      expect(nonempty).toEqual(
        expect.arrayContaining([expect.stringContaining("5 minutes left.")]),
      );
      expect(nonempty).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/Fullscreen could not start.*segment 1 of/i),
        ]),
      );
    },
  );
});
