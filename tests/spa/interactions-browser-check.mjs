// Real-browser check of the nine interaction patterns of the inventory, run against the built artifact in Chromium and
// Firefox: tabs, accordion, dialog, staged-reveal and disclosure-popover (issue 4), and parameter-chart, node-diagram,
// carousel and segment-timer (issue 5).
//
// The vitest suites (interaction-inventory.test.ts, interaction-behavior.test.ts, long-descriptions.test.ts) drive the same
// code in the fake DOM (helpers/fake-dom.ts), which fake-dom-browser-check.mjs holds to these engines. Here nothing is
// faked: the keyboard and the pointer are real, the page is the output of npm run spa:build, and the AC6 audit of the
// inventory test is the very same file (helpers/interaction-audit.ts), bundled and run inside the page. Roles and accessible
// names are also read through Playwright's getByRole, an implementation of the ARIA role and name rules that is independent
// of that audit. What only a real engine can say is asked of it: the size and the colors a control is painted with, whether
// a description is visible, where the focus is, and what the live region was given. The one thing that is faked is the
// clock, in the tests of the segment timer: Playwright's page.clock holds time still, so that a count of minutes is exact.
//
// Run after npm run spa:build:
//   node --test tests/spa/interactions-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browsers; nothing is installed. As in the other browser checks,
// SPA_QA_PLAYWRIGHT_MODULE can name playwright/index.mjs. SPA_QA_BROWSER_TYPE restricts the run to one engine (by default
// chromium and firefox both run), SPA_QA_BROWSER_CHANNEL selects chrome or msedge for chromium, and SPA_QA_DIST serves
// another build.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = path.resolve(process.env.SPA_QA_DIST || path.join(ROOT, 'workshop/spa/dist'));
const ENGINES = process.env.SPA_QA_BROWSER_TYPE ? [process.env.SPA_QA_BROWSER_TYPE] : ['chromium', 'firefox'];
const require = createRequire(import.meta.url);

const readJson = (file) => JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));
const inventory = readJson('workshop/spa/content/interactions.json').interactions;
const deck = readJson('workshop/spa/content/deck.json').segments;
const deckIds = deck.map((segment) => segment.id);

function entryFor(pattern) {
  const entry = inventory.find((candidate) => candidate.pattern === pattern);
  assert.ok(entry, `the inventory declares no ${pattern}`);
  return entry;
}

let automation;
let server;
let base;
let auditSource;
const browsers = new Map();

function playwrightModule() {
  if (process.env.SPA_QA_PLAYWRIGHT_MODULE) return process.env.SPA_QA_PLAYWRIGHT_MODULE;
  try {
    return require.resolve('playwright');
  } catch {
    const cache = process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, 'npm-cache/_npx')
      : path.join(os.homedir(), '.npm/_npx');
    for (const entry of existsSync(cache) ? readdirSync(cache) : []) {
      const module = path.join(cache, entry, 'node_modules/playwright/index.mjs');
      if (existsSync(module)) return module;
    }
    throw new Error('Playwright is unavailable; set SPA_QA_PLAYWRIGHT_MODULE to an installed playwright/index.mjs.');
  }
}

/** The audit is TypeScript that imports the fake DOM for its types only, so bundling it leaves just the audit. */
async function bundleAudit() {
  const esbuild = await import('esbuild');
  const build = esbuild.build ?? esbuild.default.build;
  const bundle = await build({
    entryPoints: [path.join(ROOT, 'tests/spa/helpers/interaction-audit.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    globalName: '__audit',
    platform: 'browser',
    logLevel: 'silent',
  });
  return bundle.outputFiles[0].text;
}

before(async () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'Run npm run spa:build first');
  auditSource = await bundleAudit();
  automation = await import(pathToFileURL(playwrightModule()).href);
  for (const engine of ENGINES) {
    assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), `Unsupported browser type: ${engine}`);
    const channel = engine === 'chromium' ? process.env.SPA_QA_BROWSER_CHANNEL : undefined;
    const browser = await automation[engine].launch({ headless: true, ...(channel ? { channel } : {}) });
    console.log(`Browser: ${engine} ${browser.version()}`);
    browsers.set(engine, browser);
  }
  // Under a nested path, so that the build is also shown to work away from the root of its origin.
  server = http.createServer((request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = path.resolve(DIST, pathname.slice('/qa/nested/'.length) || 'index.html');
      if (!pathname.startsWith('/qa/nested/') || !file.startsWith(DIST + path.sep)) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : 'text/html');
      response.end(readFileSync(file));
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/qa/nested/index.html`;
});

after(async () => {
  for (const browser of browsers.values()) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

// ---------------------------------------------------------------------------------------------------------------------
// Driving the page

/** Two frames and a little more: long enough for a store notification, an announcement (50 ms) and a hover timer to land. */
const settle = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 120)))));

/** Where a fake clock starts (see withPage). */
const CLOCK_START = new Date('2030-01-01T09:00:00Z');

/**
 * Runs `run` on a page that has loaded the segment. With `clock`, the page's clock is Playwright's: time flows as it does
 * anywhere until the test holds it with page.clock.pauseAt, and then moves only when the test moves it (runFor, fastForward).
 * A page whose clock is held cannot settle() by waiting for a frame, so such a test moves time itself.
 */
async function withPage(engine, segmentId, run, { clock = false } = {}) {
  const page = await browsers.get(engine).newPage({ viewport: { width: 1280, height: 720 } });
  const problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console error: ${message.text()}`);
  });
  page.setDefaultTimeout(5000);
  try {
    // All content is local; nothing a curriculum document references is followed.
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
    );
    if (clock) await page.clock.install({ time: CLOCK_START });
    await page.goto(`${base}#/${segmentId}`);
    await page.waitForFunction((id) => window.teachingSpa?.store.get().currentId === id, segmentId);
    await page.addScriptTag({ content: auditSource });
    await page.bringToFront();
    await settle(page);
    await run(page);
    assert.deepEqual(problems, [], 'the page must neither throw nor log an error');
  } finally {
    await page.close();
  }
}

async function go(page, segmentId) {
  await page.evaluate((id) => window.teachingSpa.store.navigate(id), segmentId);
  await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, segmentId);
  await settle(page);
}

/** Leaves the segment and comes back to it, the way a presenter moves through the deck. */
async function roundTrip(page, segmentId) {
  await go(page, deckIds.find((id) => id !== segmentId));
  await go(page, segmentId);
}

const isFocused = (page, selector, index = 0) =>
  page.evaluate(([css, at]) => document.activeElement !== null && document.activeElement === document.querySelectorAll(css)[at], [selector, index]);

const attributeOf = (page, selector, name, index = 0) =>
  page.evaluate(([css, attribute, at]) => document.querySelectorAll(css)[at]?.getAttribute(attribute) ?? null, [selector, name, index]);

const inertCount = (page) => page.evaluate(() => document.querySelectorAll('[inert]').length);
const liveRegion = (page) => page.evaluate(() => document.getElementById('live-region').textContent);
const revealedSteps = (page, segmentId) => page.evaluate((id) => window.teachingSpa.store.get().segments[id].revealedSteps, segmentId);

/** Presses `key` `times` times; every press must leave the focus inside `selector`'s element. */
async function pressKeepingFocusIn(page, key, times, selector) {
  for (let press = 1; press <= times; press++) {
    await page.keyboard.press(key);
    const inside = await page.evaluate((css) => document.querySelector(css).contains(document.activeElement), selector);
    assert.equal(inside, true, `${key} number ${press} moved the focus out of ${selector}`);
  }
}

/** Whether the engine itself would paint the element: not hidden, not display:none, not collapsed, not transparent. */
const isVisible = (page, selector, index = 0) =>
  page.evaluate(
    ([css, at]) => document.querySelectorAll(css)[at]?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) ?? false,
    [selector, index],
  );

/** The rendered size in CSS pixels of every element that matches: what 2.5.8 asks about, and only a real layout can say. */
const sizesOf = (page, selector) =>
  page.evaluate(
    (css) =>
      [...document.querySelectorAll(css)].map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { width, height };
      }),
    selector,
  );

/** Every control that matches is at least 24 by 24 CSS pixels (2.5.8, AC17). */
async function assertTargetSize(page, selector, what) {
  const sizes = await sizesOf(page, selector);
  assert.ok(sizes.length > 0, `${what}: ${selector} matches nothing`);
  sizes.forEach(({ width, height }, at) => {
    assert.ok(width >= 24 && height >= 24, `${what} number ${at} is ${width} by ${height} CSS pixels, under 24 by 24`);
  });
}

/** Records what the live region is given from now on: an announcement clears the region and, a moment later, fills it. */
const watchLiveRegion = (page) =>
  page.evaluate(() => {
    const region = document.getElementById('live-region');
    window.__said = [];
    new MutationObserver(() => window.__said.push(region.textContent)).observe(region, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
/** What the live region was given since watchLiveRegion: one text for each announcement, in order. */
const announcements = (page) => page.evaluate(() => window.__said.filter((text) => text !== ''));

/** Records every change under `selector` (an attribute, a child, a text) from now on. */
const watchChanges = (page, selector) =>
  page.evaluate((css) => {
    window.__changes = [];
    new MutationObserver((records) => window.__changes.push(...records.map((record) => `${record.type}:${record.attributeName ?? ''}`))).observe(
      document.querySelector(css),
      { attributes: true, childList: true, characterData: true, subtree: true },
    );
  }, selector);
const changes = (page) => page.evaluate(() => window.__changes);

/** Counts the intervals the page holds, which it cannot be asked: the page's setInterval and clearInterval keep the count. */
const countIntervals = (page) =>
  page.evaluate(() => {
    const live = new Set();
    const set = window.setInterval.bind(window);
    const clear = window.clearInterval.bind(window);
    window.setInterval = (...args) => {
      const id = set(...args);
      live.add(id);
      return id;
    };
    window.clearInterval = (id) => {
      live.delete(id);
      return clear(id);
    };
    window.__intervals = live;
  });
const intervals = (page) => page.evaluate(() => window.__intervals.size);

/** Moves to another segment without settle(), which waits for a frame and so needs a clock that is moving. */
async function visit(page, segmentId) {
  await page.evaluate((id) => window.teachingSpa.store.navigate(id), segmentId);
  await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, segmentId);
}

const squash = (text) => text.replace(/\s+/g, ' ').trim();
const stored = (page, segmentId, interactionId) =>
  page.evaluate(([segment, id]) => window.teachingSpa.store.get().segments[segment]?.parameters?.[id], [segmentId, interactionId]);

/**
 * What a test needs to drive the segment timer and read it back, on a page whose clock the test holds (withPage with `clock`).
 * Times are in whole seconds, because a tick is a second; the expected figures are worked out here from the minutes of the
 * segment in the deck, not taken from the page.
 */
function timerOf(page, entry) {
  const total = deck.find((segment) => segment.id === entry.segment).minutes * 60;
  const widget = page.getByRole('group', { name: entry.label });
  const unit = (count, name) => (count === 0 ? [] : [`${count} ${name}${count === 1 ? '' : 's'}`]);
  return {
    total,
    widget,
    button: (name) => widget.getByRole('button', { name, exact: true }),
    /** What the clock shows, and the caption beside it. */
    readout: () => page.evaluate((id) => document.querySelector(`#${id} [role="timer"]`).textContent, entry.id),
    caption: () => page.evaluate((id) => document.querySelector(`#${id} > span:not([role])`).textContent, entry.id),
    /** The clock as it shows `seconds` after the time began to run down, and the time as it is said. */
    shows: (seconds) => `${Math.floor((total - seconds) / 60)}:${String((total - seconds) % 60).padStart(2, '0')}`,
    says: (seconds) => [...unit(Math.floor((total - seconds) / 60), 'minute'), ...unit((total - seconds) % 60, 'second')].join(' '),
    /** The page's own time moves on by `seconds`, and every timer it holds that falls due in them fires, an announcement's 50 ms included. */
    pass: (seconds) => page.clock.runFor(seconds * 1000),
    /** The clock jumps by `seconds` and each timer fires once, as for a page that was asleep: the quick way over a long stretch. */
    jump: (seconds) => page.clock.fastForward(seconds * 1000),
    /** What a tick said at the very end of a stretch is written to the live region 50 ms later, which is a little more time. */
    speak: () => page.clock.runFor(60),
  };
}

/** Holds the page's clock, a minute after it began, so that nothing moves until the test moves it. */
const hold = (page) => page.clock.pauseAt(new Date(CLOCK_START.getTime() + 60_000));

// ---------------------------------------------------------------------------------------------------------------------

for (const engine of ENGINES) {
  describe(engine, () => {
    // AC6: every id of the inventory is in the built DOM with the role set of its pattern.
    for (const entry of inventory) {
      test(`AC6: ${entry.id} (${entry.pattern}) is in the DOM with its role set`, async () => {
        await withPage(engine, entry.segment, async (page) => {
          assert.deepEqual(await page.evaluate((one) => window.__audit.auditInteraction(document, one), entry), []);
          assert.equal(await page.locator(`#${entry.id}`).count(), 1, `#${entry.id} must exist exactly once`);
        });
      });
    }

    test('AC6: ids are unique, every aria reference resolves and widgets add no link, in every segment', async () => {
      for (const segmentId of deckIds) {
        await withPage(engine, segmentId, async (page) => {
          const problems = await page.evaluate((id) => {
            const found = [];
            const seen = new Set();
            for (const element of document.querySelectorAll('[id]')) {
              if (seen.has(element.id)) found.push(`duplicate id ${element.id}`);
              seen.add(element.id);
            }
            for (const attribute of ['aria-controls', 'aria-labelledby', 'aria-describedby']) {
              for (const element of document.querySelectorAll(`[${attribute}]`)) {
                for (const target of element.getAttribute(attribute).split(/\s+/).filter(Boolean)) {
                  if (document.getElementById(target) === null) found.push(`${attribute}="${target}" resolves to nothing`);
                }
              }
            }
            const main = document.getElementById('main');
            const shape = [...main.children].map((child) => child.localName).join(',');
            if (shape !== 'h1,div') found.push(`<main> holds ${shape}, not h1,div`);
            const slide = window.teachingSpa.segments.find((segment) => segment.id === id);
            const links = new DOMParser().parseFromString(slide.html, 'text/html').querySelectorAll('a[href]').length;
            if (main.querySelectorAll('a[href]').length !== links) found.push('an interaction added or removed a link');
            return found;
          }, segmentId);
          assert.deepEqual(problems, [], segmentId);
        });
      }
    });

    test('tabs: roles, roving focus, wrap, Home and End, Up and Down, Tab order and persistence', async () => {
      const entry = entryFor('tabs');
      await withPage(engine, entry.segment, async (page) => {
        const tabs = `#${entry.id} [role="tab"]`;
        const list = page.getByRole('tablist', { name: entry.label });
        assert.equal(await list.count(), 1);
        const total = await list.getByRole('tab').count();
        assert.ok(total >= 2);
        assert.equal(await page.getByRole('tab', { selected: true }).count(), 1);
        const firstName = (await page.locator(tabs).first().textContent()).trim();
        assert.equal(await page.getByRole('tabpanel', { name: firstName }).count(), 1, 'one panel is exposed, named by its tab');
        assert.equal(await page.getByRole('tabpanel').count(), 1, 'the other panels are hidden');

        const state = () =>
          page.evaluate((css) => {
            const all = [...document.querySelectorAll(css)];
            return {
              selected: all.findIndex((tab) => tab.getAttribute('aria-selected') === 'true'),
              focused: all.findIndex((tab) => tab === document.activeElement),
              shown: all.flatMap((tab, at) => (document.getElementById(tab.getAttribute('aria-controls')).hidden ? [] : [at])),
              roving: all.map((tab) => tab.getAttribute('tabindex')),
            };
          }, tabs);
        const at = (index) => ({
          selected: index,
          focused: index,
          shown: [index],
          roving: Array.from({ length: total }, (_, tab) => (tab === index ? '0' : '-1')),
        });
        const last = total - 1;

        // Tab goes into the active tab, then out of the tablist to the panel, and Shift+Tab comes back. What stands before the
        // tablist on the slide (a segment timer, on the first segment) is passed on the way in; the tablist is entered once,
        // at its active tab, which is the only tab stop it has.
        await page.locator('#segment-nav a').last().focus();
        let entered = false;
        for (let press = 0; press < 12 && !entered; press++) {
          await page.keyboard.press('Tab');
          entered = await page.evaluate((id) => document.getElementById(id).contains(document.activeElement), entry.id);
        }
        assert.equal(entered, true, 'Tab from the navigation reaches the tabs');
        assert.deepEqual(await state(), at(0));
        await page.keyboard.press('Tab');
        assert.equal(await attributeOf(page, `#${entry.id} [role="tabpanel"]:not([hidden])`, 'tabindex'), '0');
        assert.equal(
          await page.evaluate((id) => document.activeElement === document.querySelector(`#${id} [role="tabpanel"]:not([hidden])`), entry.id),
          true,
          'the next Tab stop after the active tab is its panel',
        );
        await page.keyboard.press('Shift+Tab');
        assert.deepEqual(await state(), at(0));

        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await state(), at(1), 'ArrowRight moves, focuses and activates');
        await page.keyboard.press('ArrowLeft');
        assert.deepEqual(await state(), at(0));
        await page.keyboard.press('ArrowLeft');
        assert.deepEqual(await state(), at(last), 'ArrowLeft wraps from the first tab to the last');
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await state(), at(0), 'ArrowRight wraps from the last tab to the first');
        await page.keyboard.press('End');
        assert.deepEqual(await state(), at(last));
        await page.keyboard.press('Home');
        assert.deepEqual(await state(), at(0));
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        assert.deepEqual(await state(), at(0), 'a horizontal tablist ignores Up and Down');

        await page.keyboard.press('End');
        await roundTrip(page, entry.segment);
        assert.equal((await state()).selected, last, 'the active tab survives leaving the segment');
        const stored = await page.evaluate(
          ([id, tab]) => window.teachingSpa.store.get().segments[id].parameters[tab],
          [entry.segment, entry.id],
        );
        assert.equal(stored, last);
      });
    });

    test('QA regression: direct focus automatically activates a tab and persists its selection (F96)', async () => {
      const entry = entryFor('tabs');
      await withPage(engine, entry.segment, async (page) => {
        const tabs = page.locator(`#${entry.id} [role="tab"]`);
        const last = (await tabs.count()) - 1;
        for (const index of [1, last, 0]) {
          await tabs.nth(index).focus();
          assert.equal(await isFocused(page, `#${entry.id} [role="tab"]`, index), true);
          assert.equal(await tabs.nth(index).getAttribute('aria-selected'), 'true', 'automatic activation must follow focus itself');
          const panel = await tabs.nth(index).getAttribute('aria-controls');
          assert.equal(await page.locator(`#${panel}`).isVisible(), true);
          assert.equal(
            await page.evaluate(([segment, id]) => window.teachingSpa.store.get().segments[segment].parameters[id], [entry.segment, entry.id]),
            index,
          );
        }
        await roundTrip(page, entry.segment);
        assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
      });
    });

    test('accordion: roles, Enter and Space, aria-disabled on the last open panel, Tab order and persistence', async () => {
      const entry = entryFor('accordion');
      await withPage(engine, entry.segment, async (page) => {
        const headers = `#${entry.id} button[aria-controls]`;
        const group = page.getByRole('group', { name: entry.label });
        assert.equal(await group.count(), 1);
        const total = await page.locator(headers).count();
        assert.ok(total >= 2);
        const headings = group.getByRole('heading');
        assert.equal(await headings.count(), total, 'one heading per header');
        for (let at = 0; at < total; at++) {
          assert.equal(await headings.nth(at).getByRole('button').count(), 1, `heading ${at} holds one button`);
        }
        assert.equal(await group.getByRole('button', { expanded: true }).count(), 1);

        const state = () =>
          page.evaluate((css) => {
            return [...document.querySelectorAll(css)].map((button) => ({
              expanded: button.getAttribute('aria-expanded'),
              disabled: button.getAttribute('aria-disabled'),
              shown: !document.getElementById(button.getAttribute('aria-controls')).hidden,
            }));
          }, headers);
        const open = async () => (await state()).flatMap((header, at) => (header.expanded === 'true' ? [at] : []));

        assert.deepEqual(await open(), [0]);
        assert.equal((await state())[0].disabled, 'true', 'the only open panel cannot be collapsed');
        assert.equal((await state())[1].disabled, null);

        const first = page.locator(headers).first();
        await first.focus();
        await page.keyboard.press('Enter');
        assert.deepEqual(await open(), [0], 'Enter on the last open header changes nothing');

        // Tab and Shift+Tab visit every header, in order.
        const visited = [];
        for (let press = 0; press < total * 4 && visited.length < total - 1; press++) {
          await page.keyboard.press('Tab');
          const at = await page.evaluate((css) => [...document.querySelectorAll(css)].indexOf(document.activeElement), headers);
          if (at >= 0) visited.push(at);
        }
        assert.deepEqual(visited, Array.from({ length: total - 1 }, (_, at) => at + 1), 'Tab reaches each header in order');
        const back = [];
        for (let press = 0; press < total * 4 && back.length < total - 1; press++) {
          await page.keyboard.press('Shift+Tab');
          const at = await page.evaluate((css) => [...document.querySelectorAll(css)].indexOf(document.activeElement), headers);
          if (at >= 0) back.push(at);
        }
        assert.deepEqual(back, Array.from({ length: total - 1 }, (_, at) => total - 2 - at), 'Shift+Tab reaches each header in reverse');

        const second = page.locator(headers).nth(1);
        await second.focus();
        await page.keyboard.press('Enter');
        assert.deepEqual(await open(), [0, 1]);
        assert.equal((await state())[0].disabled, null, 'with two open panels either can collapse');
        assert.equal((await state())[0].shown && (await state())[1].shown, true);
        await page.keyboard.press('Space');
        assert.deepEqual(await open(), [0], 'Space collapses it again');
        assert.equal((await state())[0].disabled, 'true');

        const third = page.locator(headers).nth(2);
        await third.focus();
        await page.keyboard.press('Space');
        assert.deepEqual(await open(), [0, 2]);
        await roundTrip(page, entry.segment);
        assert.deepEqual(await open(), [0, 2], 'the open panels survive leaving the segment');
        const stored = await page.evaluate(
          ([id, accordion]) => window.teachingSpa.store.get().segments[id].parameters[accordion],
          [entry.segment, entry.id],
        );
        assert.deepEqual(stored, [0, 2]);
      });
    });

    test('dialog: opens, keeps Tab inside, and Escape and Close return the focus to the invoker (AC13)', async () => {
      const entry = entryFor('dialog');
      await withPage(engine, entry.segment, async (page) => {
        const trigger = `#${entry.id} button[aria-haspopup="dialog"]`;
        const dialog = `#${entry.id} [role="dialog"]`;
        const close = `${dialog} button`;
        const isOpen = () => page.evaluate((css) => !document.querySelector(css).hidden, dialog);

        assert.equal(await page.getByRole('dialog').count(), 0, 'a closed dialog is not exposed');
        assert.equal(await page.getByRole('dialog', { name: entry.label, includeHidden: true }).count(), 1);
        assert.equal(await isOpen(), false);
        assert.equal(await inertCount(page), 0);

        // Enter
        await page.locator(trigger).focus();
        await page.keyboard.press('Enter');
        assert.equal(await isOpen(), true);
        assert.equal(await page.getByRole('dialog', { name: entry.label }).count(), 1);
        assert.equal(await attributeOf(page, dialog, 'aria-modal'), 'true');
        assert.equal(await isFocused(page, close), true, 'the focus moves in, onto the close control');
        assert.ok((await inertCount(page)) > 0, 'the rest of the page is inert while the dialog is open');
        await pressKeepingFocusIn(page, 'Tab', 6, dialog);
        await pressKeepingFocusIn(page, 'Shift+Tab', 6, dialog);
        await page.keyboard.press('Escape');
        assert.equal(await isOpen(), false, 'Escape closes it');
        assert.equal(await isFocused(page, trigger), true, 'and the focus is back on the exact invoker');
        assert.equal(await inertCount(page), 0);

        // Space, then the close control by Enter
        await page.keyboard.press('Space');
        assert.equal(await isOpen(), true);
        assert.equal(await isFocused(page, close), true);
        await page.keyboard.press('Enter');
        assert.equal(await isOpen(), false);
        assert.equal(await isFocused(page, trigger), true);

        // The pointer: a click opens it; a click on text inside it that cannot take focus is no trap.
        await page.locator(trigger).click();
        assert.equal(await isOpen(), true);
        await page.locator(`${dialog} h2`).click();
        await page.keyboard.press('Tab');
        assert.equal(
          await page.evaluate((css) => document.querySelector(css).contains(document.activeElement), dialog),
          true,
          'Tab brings the focus back inside after a click on dead text',
        );
        await page.locator(`${dialog} h2`).click();
        await page.keyboard.press('Escape');
        assert.equal(await isOpen(), false, 'Escape works with the focus outside the dialog too');
        assert.equal(await isFocused(page, trigger), true);
        await page.locator(trigger).click();
        await page.locator(close).click();
        assert.equal(await isOpen(), false);
        assert.equal(await isFocused(page, trigger), true, 'closing with the pointer restores the focus as well');

        // Leaving the segment with the dialog open releases the page.
        await page.locator(trigger).click();
        assert.ok((await inertCount(page)) > 0);
        await roundTrip(page, entry.segment);
        assert.equal(await inertCount(page), 0);
        assert.equal(await isOpen(), false, 'it is closed on return');
      });
    });

    test('QA regression: an aria-modal dialog visually obscures background content (F103)', async () => {
      const entry = entryFor('dialog');
      await withPage(engine, entry.segment, async (page) => {
        // Compare actual painting, not inert/ARIA flags: those do not visually obscure anything.
        // Two independent background samples allow either a page-wide backdrop or a dimmed main surface.
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.evaluate(() => document.fonts.ready);
        const samples = [];
        for (const selector of ['#segment-nav', '#main > h1']) {
          const clip = await page.locator(selector).boundingBox();
          assert.ok(clip && clip.width > 0 && clip.height > 0);
          const before = await page.screenshot({ clip, animations: 'disabled' });
          assert.deepEqual(await page.screenshot({ clip, animations: 'disabled' }), before, 'the unchanged background sample must be stable');
          samples.push({ clip, before });
        }
        await page.locator(`#${entry.id} button[aria-haspopup="dialog"]`).focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.getByRole('dialog', { name: entry.label }).getAttribute('aria-modal'), 'true');
        assert.ok((await inertCount(page)) > 0);
        await page.evaluate(() => window.scrollTo(0, 0));
        await settle(page);
        const obscured = [];
        for (const { clip, before } of samples) {
          obscured.push(!before.equals(await page.screenshot({ clip, animations: 'disabled' })));
        }
        assert.ok(obscured.some(Boolean), 'F103: aria-modal=true requires visual obscuring; both background samples remained pixel-identical');
        // Control for the check after it closes: the same trial click is refused while the dialog covers the page.
        await assert.rejects(
          page.locator('#segment-nav a').first().click({ trial: true, timeout: 500 }),
          /intercepts pointer events/,
          'while it is open, a pointer does not reach the page behind it',
        );

        // And nothing is left over once it closes. Not a second pixel comparison: closing sends focus back to the trigger, which
        // scrolls it into view, and Firefox replays that scroll after an explicit scrollTo, so the page does not hold still for one.
        // What a leftover backdrop would break does not depend on the scroll position: the dialog is no longer exposed, nothing is
        // inert, and a pointer reaches the page behind it again. A trial click runs the actionability hit test (it fails with
        // "intercepts pointer events" if something sits on top of the target) without activating anything.
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0, 'a closed dialog is not exposed');
        assert.equal(await inertCount(page), 0, 'closing the dialog gives the page behind it back');
        await page.locator('#segment-nav a').first().click({ trial: true, timeout: 5000 });
      });
    });

    test('staged-reveal: buttons and arrow keys step through the slide, announce it, and keep the step', async () => {
      const entry = entryFor('staged-reveal');
      await withPage(engine, entry.segment, async (page) => {
        const group = page.getByRole('group', { name: entry.label });
        assert.equal(await group.count(), 1);
        const previous = group.getByRole('button', { name: /previous|back/i });
        const next = group.getByRole('button', { name: /next|forward/i });
        assert.equal(await previous.count(), 1);
        assert.equal(await next.count(), 1);
        const buttons = `#${entry.id} button`;
        const hiddenCount = () => page.evaluate(() => document.querySelectorAll('#main > div > [hidden]').length);
        const total = Number(/of (\d+)/.exec(await group.textContent())[1]);
        assert.ok(total >= 2);

        assert.equal(await revealedSteps(page, entry.segment), 0);
        assert.equal(await attributeOf(page, buttons, 'aria-disabled', 0), 'true', 'there is nothing before the first step');
        const hiddenAtStart = await hiddenCount();
        assert.ok(hiddenAtStart > 0);
        assert.doesNotMatch(await liveRegion(page), /\bstep\b/i, 'nothing is announced on mount');

        await next.focus();
        await page.keyboard.press('Enter');
        await settle(page);
        assert.equal(await revealedSteps(page, entry.segment), 1);
        assert.match(await liveRegion(page), new RegExp(`^Step 1 of ${total}: \\S`), 'the stage and its heading reach the live region');
        assert.equal(await isFocused(page, buttons, 1), true, 'the focus stays on the button that was pressed');

        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        await settle(page);
        assert.equal(await revealedSteps(page, entry.segment), 3);
        assert.match(await liveRegion(page), new RegExp(`^Step 3 of ${total}: \\S`));
        await page.keyboard.press('ArrowLeft');
        await settle(page);
        assert.equal(await revealedSteps(page, entry.segment), 2);
        assert.match(await liveRegion(page), new RegExp(`^Step 2 of ${total}: \\S`));
        assert.ok((await hiddenCount()) < hiddenAtStart, 'sections have appeared');

        await page.keyboard.press('ArrowRight');
        await settle(page);
        const atThree = await hiddenCount();
        await roundTrip(page, entry.segment);
        assert.equal(await revealedSteps(page, entry.segment), 3, 'the step survives leaving the segment');
        assert.equal(await hiddenCount(), atThree, 'and the page shows it');
        assert.match(await liveRegion(page), /^Segment \d+ of \d+/, 'coming back announces the segment, not a step');

        // To the end and back: the end buttons are spent but stay focusable, and the last step shows everything.
        await page.locator(buttons).nth(1).focus();
        for (let step = 3; step < total + 2; step++) await page.keyboard.press('ArrowRight');
        await settle(page);
        assert.equal(await revealedSteps(page, entry.segment), total);
        assert.equal(await hiddenCount(), 0, 'every section is shown at the last step');
        assert.equal(await attributeOf(page, buttons, 'aria-disabled', 1), 'true');
        assert.equal(await isFocused(page, buttons, 1), true, 'a spent button keeps the focus');
        const announced = await liveRegion(page);
        await page.keyboard.press('Enter');
        await settle(page);
        assert.equal(await liveRegion(page), announced, 'a spent button announces nothing');
        await page.keyboard.press('ArrowLeft');
        await settle(page);
        assert.equal(await revealedSteps(page, entry.segment), total - 1);
      });
    });

    test('disclosure-popover: nothing opens from empty space beside the button', async () => {
      const entry = entryFor('disclosure-popover');
      await withPage(engine, entry.segment, async (page) => {
        const trigger = page.locator(`#${entry.id} button[aria-expanded]`);
        const box = await trigger.boundingBox();
        const root = await page.locator(`#${entry.id}`).boundingBox();
        const point = { x: box.x + box.width + 300, y: box.y + box.height / 2 };
        assert.ok(point.x < root.x + root.width && point.y > root.y && point.y < root.y + root.height, 'the point is inside the widget, beside the button');
        await page.mouse.move(5, 700);
        await page.mouse.move(point.x, point.y, { steps: 6 });
        await page.waitForTimeout(600);
        assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.getByRole('button', { name: entry.label, expanded: false }).count(), 1);
      });
    });

    test('disclosure-popover: hover reveals it, it is hoverable and persistent, and leaving hides it', async () => {
      const entry = entryFor('disclosure-popover');
      await withPage(engine, entry.segment, async (page) => {
        const trigger = page.locator(`#${entry.id} button[aria-expanded]`);
        const popover = page.locator(`#${await trigger.getAttribute('aria-controls')}`);
        const expanded = () => trigger.getAttribute('aria-expanded');
        const hidden = () => popover.evaluate((node) => node.hidden);

        await page.mouse.move(5, 700);
        assert.equal(await hidden(), true);
        await trigger.hover();
        await page.waitForFunction((id) => document.getElementById(id).hidden === false, await popover.getAttribute('id'));
        assert.equal(await expanded(), 'true');
        assert.match(await popover.textContent(), /\d+ minutes/);
        assert.equal(await popover.locator('a, [href]').count(), 0, 'the popover adds no link');

        await popover.hover(); // the pointer crosses from the button onto the popover
        await page.waitForTimeout(700);
        assert.equal(await expanded(), 'true', 'it is hoverable: moving onto it keeps it open');
        await page.waitForTimeout(1500);
        assert.equal(await expanded(), 'true', 'it is persistent: nothing hides it while the pointer is over it');

        await page.mouse.move(5, 700);
        await page.waitForFunction((id) => document.getElementById(id).hidden === true, await popover.getAttribute('id'), { timeout: 3000 });
        assert.equal(await expanded(), 'false');
      });
    });

    test('disclosure-popover: Escape dismisses it under the pointer without moving anything (AC13)', async () => {
      const entry = entryFor('disclosure-popover');
      await withPage(engine, entry.segment, async (page) => {
        const trigger = page.locator(`#${entry.id} button[aria-expanded]`);
        const expanded = () => trigger.getAttribute('aria-expanded');
        await page.mouse.move(5, 700);
        await trigger.hover();
        await page.waitForFunction((id) => document.querySelector(`#${id} button[aria-expanded]`).getAttribute('aria-expanded') === 'true', entry.id);
        const box = await trigger.boundingBox();
        await page.keyboard.press('Escape');
        assert.equal(await expanded(), 'false');
        await page.waitForTimeout(600);
        assert.equal(await expanded(), 'false', 'it stays dismissed while the pointer rests on the button');
        assert.deepEqual(await trigger.boundingBox(), box, 'nothing moved');

        // A new hover reveals it again once the pointer has left.
        await page.mouse.move(5, 700);
        await page.waitForTimeout(700);
        await trigger.hover();
        await page.waitForFunction((id) => document.querySelector(`#${id} button[aria-expanded]`).getAttribute('aria-expanded') === 'true', entry.id);

        // Pressed while the pointer rests on the popover itself.
        await page.locator(`#${await trigger.getAttribute('aria-controls')}`).hover();
        await page.keyboard.press('Escape');
        assert.equal(await expanded(), 'false');
        await page.mouse.move(5, 700);
        await page.waitForTimeout(700);
        await trigger.hover();
        await page.waitForFunction((id) => document.querySelector(`#${id} button[aria-expanded]`).getAttribute('aria-expanded') === 'true', entry.id);
      });
    });

    test('disclosure-popover: keyboard focus reveals it, Escape dismisses it and focus returns from inside it (AC13)', async () => {
      const entry = entryFor('disclosure-popover');
      await withPage(engine, entry.segment, async (page) => {
        const trigger = `#${entry.id} button[aria-expanded]`;
        const expanded = () => attributeOf(page, trigger, 'aria-expanded');
        await page.mouse.move(5, 700);

        await page.locator('#segment-nav a').last().focus();
        await page.keyboard.press('Tab');
        assert.equal(await isFocused(page, trigger), true, 'the button is the first Tab stop of the slide');
        assert.equal(await expanded(), 'true', 'focus reveals it');
        await page.keyboard.press('Escape');
        assert.equal(await expanded(), 'false', 'Escape dismisses it');
        assert.equal(await isFocused(page, trigger), true, 'without moving the focus');
        await page.keyboard.press('Tab');
        assert.equal(await isFocused(page, trigger), false);
        assert.equal(await expanded(), 'false');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await isFocused(page, trigger), true);
        assert.equal(await expanded(), 'true', 'focusing it again reveals it again');

        // With the focus inside the popover, Escape hands it back to the button.
        const popover = `#${await attributeOf(page, trigger, 'aria-controls')}`;
        await page.locator(popover).click();
        assert.equal(await isFocused(page, popover), true);
        assert.equal(await expanded(), 'true', 'focus moving from the button into the popover keeps it open');
        await page.keyboard.press('Escape');
        assert.equal(await expanded(), 'false');
        assert.equal(await isFocused(page, trigger), true, 'focus returns to the button');

        // Activation reveals it too, which is what touch and Safari rely on.
        await page.keyboard.press('Tab');
        await page.mouse.move(5, 700);
        await page.locator(trigger).focus();
        await page.keyboard.press('Escape');
        await page.keyboard.press('Enter');
        assert.equal(await expanded(), 'true', 'Enter on a dismissed button reveals it again');
      });
    });

    // -------------------------------------------------------------------------------------------------------------------
    // Part 2: parameter-chart, node-diagram, carousel, segment-timer

    // AC19: what the built page does with every long description the inventory declares.
    for (const entry of inventory.filter((candidate) => candidate.longDescriptionId !== undefined)) {
      test(`AC19: ${entry.id} has its long description in the page, visible, and associated with it`, async () => {
        await withPage(engine, entry.segment, async (page) => {
          const id = entry.longDescriptionId;
          const description = `[id="${id}"]`;
          assert.equal(await page.locator(description).count(), 1, `#${id} must be in the page exactly once`);
          assert.equal(await isVisible(page, description), true, 'it is rendered: not hidden, not display:none');
          assert.equal(
            await page.evaluate((target) => document.getElementById(target).closest('[hidden], [inert], [aria-hidden="true"]') === null, id),
            true,
            'and nothing above it hides it from a reader',
          );
          const text = squash(await page.locator(description).innerText());
          assert.ok(text.length >= 40, `it says something, not "${text}"`);
          assert.ok(
            ((await attributeOf(page, `#${entry.id}`, 'aria-describedby')) ?? '').split(/\s+/).includes(id),
            `#${entry.id} must name it in aria-describedby`,
          );
          assert.equal(await page.getByRole('group', { name: entry.label }).count(), 1, 'the pattern has the accessible name of the inventory');
          if (engine === 'chromium') {
            // The engine's own accessibility tree, which no part of this repository computes.
            const client = await page.context().newCDPSession(page);
            try {
              const { root } = await client.send('DOM.getDocument');
              const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector: `#${entry.id}` });
              const { nodes } = await client.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
              const computed = squash(nodes[0]?.description?.value ?? '');
              assert.ok(computed.length >= 40, `the accessibility tree gives #${entry.id} a description of its own: "${computed}"`);
              assert.ok(text.startsWith(computed.slice(0, 20)), 'and it is the long description');
            } finally {
              await client.detach();
            }
          }
        });
      });
    }

    test('parameter-chart: every parameter is set from the keyboard or by single clicks, the outputs follow, and the values stay', async () => {
      const entry = entryFor('parameter-chart');
      const model = readJson(`workshop/spa/content/datasets/${entry.dataset}.json`);
      const figure = (value) => value.toLocaleString('en-US', { maximumFractionDigits: 3 });
      // The outputs of the dataset at some values, worked out here from its coefficients and from nothing else.
      const outputsAt = (values) =>
        Object.fromEntries(
          model.outputs.map((output) => [
            output.id,
            (output.constant ?? 0) + output.terms.reduce((sum, term) => sum + term.coefficient * values[term.parameter], 0),
          ]),
        );
      const defaults = Object.fromEntries(model.parameters.map((parameter) => [parameter.id, parameter.default]));
      const [first, second] = model.parameters;
      await withPage(engine, entry.segment, async (page) => {
        const group = page.getByRole('group', { name: entry.label });
        assert.equal(await group.count(), 1);
        const slider = (parameter) => group.getByRole('slider', { name: parameter.label, exact: true });
        const button = (verb, parameter) => group.getByRole('button', { name: `${verb} ${parameter.label}`, exact: true });
        const descriptionText = async () => squash(await page.locator(`[id="${entry.longDescriptionId}"]`).innerText());
        assert.equal(await group.getByRole('slider').count(), model.parameters.length, 'one slider for each parameter of the dataset');

        // What the chart says: each slider's range, value and text, each output's figure beside its baseline, and the long description.
        const expectChart = async (values, why) => {
          const outputs = outputsAt(values);
          const baseline = outputsAt(defaults);
          for (const parameter of model.parameters) {
            const one = slider(parameter);
            assert.equal(await one.getAttribute('aria-valuemin'), String(parameter.min), why);
            assert.equal(await one.getAttribute('aria-valuemax'), String(parameter.max), why);
            assert.equal(await one.getAttribute('aria-valuenow'), String(values[parameter.id]), `${why}: ${parameter.label}`);
            assert.equal(await one.getAttribute('aria-valuetext'), `${figure(values[parameter.id])} ${parameter.unit}`, why);
          }
          const said = await page.evaluate(
            (id) => Object.fromEntries([...document.querySelectorAll(`#${id} dt`)].map((term) => [term.textContent, term.nextElementSibling.textContent])),
            entry.id,
          );
          const long = await descriptionText();
          for (const output of model.outputs) {
            const text = said[output.label];
            assert.ok(text?.includes(`${figure(outputs[output.id])} ${output.unit}`), `${why}: ${output.label} says "${text}", not ${figure(outputs[output.id])} ${output.unit}`);
            assert.ok(text.includes(figure(baseline[output.id])) && /baseline/i.test(text), `${why}: ${output.label} sets the baseline beside the figure: "${text}"`);
            assert.ok(long.includes(output.label) && long.includes(figure(outputs[output.id])), `${why}: the long description gives the current ${output.label}`);
          }
          for (const parameter of model.parameters) {
            assert.ok(long.includes(parameter.label) && long.includes(figure(values[parameter.id])), `${why}: the long description gives the current ${parameter.label}`);
          }
        };

        let values = { ...defaults };
        await expectChart(values, 'at the start');
        assert.match(await descriptionText(), /baseline/i, 'the long description relates the model on show to the baseline');
        await assertTargetSize(page, `#${entry.id} [role="slider"]`, 'a slider');
        await assertTargetSize(page, `#${entry.id} button`, 'a button');
        await watchLiveRegion(page);

        // The keyboard: an arrow moves a step, Home and End the ends of the range, and a key at an end changes nothing.
        await slider(first).focus();
        for (const [key, delta] of [['ArrowRight', first.step], ['ArrowUp', first.step], ['ArrowLeft', -first.step], ['ArrowDown', -first.step]]) {
          await page.keyboard.press(key);
          values = { ...values, [first.id]: values[first.id] + delta };
          await expectChart(values, key);
        }
        assert.equal(await isFocused(page, `#${entry.id} [role="slider"]`), true, 'the slider keeps the focus');
        await settle(page);
        await page.keyboard.press('End');
        values = { ...values, [first.id]: first.max };
        await expectChart(values, 'End');
        await settle(page);
        const said = await announcements(page);
        const afterEnd = outputsAt(values);
        const beforeEnd = outputsAt(defaults);
        for (const output of model.outputs.filter((candidate) => afterEnd[candidate.id] !== beforeEnd[candidate.id])) {
          assert.ok(said.at(-1).includes(`${output.label}: ${figure(afterEnd[output.id])}`), `the live region says the new ${output.label}: "${said.at(-1)}"`);
        }
        await page.keyboard.press('ArrowRight');
        await settle(page);
        await expectChart(values, 'ArrowRight at the end');
        assert.equal((await announcements(page)).length, said.length, 'a key at the end of the range announces nothing');
        await page.keyboard.press('Home');
        values = { ...values, [first.id]: first.min };
        await expectChart(values, 'Home');
        await page.keyboard.press('ArrowLeft');
        await expectChart(values, 'ArrowLeft at the start of the range');

        // Tab leaves the slider for the button that follows it, then reaches the next parameter, in order.
        const focused = () =>
          page.evaluate(() => {
            const element = document.activeElement;
            return element.getAttribute('role') === 'slider'
              ? `slider ${document.getElementById(element.getAttribute('aria-labelledby')).textContent}`
              : `${element.localName} ${element.textContent}`;
          });
        await page.keyboard.press('Tab');
        assert.equal(await focused(), `button Increase ${first.label}`);
        await page.keyboard.press('Tab');
        assert.equal(await focused(), `button Decrease ${second.label}`);
        await page.keyboard.press('Tab');
        assert.equal(await focused(), `slider ${second.label}`);
        await page.keyboard.press('End');
        values = { ...values, [second.id]: second.max };
        await expectChart(values, 'End on the second parameter');

        // The pointer, a click at a time and no drag (F88): the buttons are the single-pointer way to a value.
        await button('Decrease', second).click();
        values = { ...values, [second.id]: values[second.id] - second.step };
        await expectChart(values, 'a click on Decrease');
        assert.equal(await button('Decrease', second).evaluate((element) => element === document.activeElement), true, 'a button keeps the focus it was given');
        assert.equal(await button('Decrease', second).getAttribute('aria-controls'), await slider(second).getAttribute('id'), 'and says which slider it moves');
        for (let click = 0; click < 3; click++) await button('Increase', first).click();
        values = { ...values, [first.id]: values[first.id] + 3 * first.step };
        await expectChart(values, 'three clicks on Increase');

        // It stays: through a visit to another segment, and in the store.
        await roundTrip(page, entry.segment);
        await expectChart(values, 'after leaving the segment and coming back');
        assert.deepEqual(await stored(page, entry.segment, entry.id), values);
      });
    });

    test('node-diagram: the nodes are reached and traversed from the keyboard, chosen by Enter, Space or a click, and the choice stays', async () => {
      const entry = entryFor('node-diagram');
      await withPage(engine, entry.segment, async (page) => {
        const group = page.getByRole('group', { name: entry.label });
        assert.equal(await group.count(), 1);
        const nodes = `#${entry.id} button[aria-pressed]`;
        const list = `[id="${entry.longDescriptionId}"]`;
        const total = await page.locator(nodes).count();
        assert.ok(total >= 3, 'a diagram of a few nodes');
        assert.equal(await group.getByRole('button').count(), total, 'every button of the diagram is a node');
        assert.equal(await group.getByRole('button', { pressed: true }).count(), 1, 'one node is selected');
        await watchLiveRegion(page);

        // The nodes come from the slide: each is named by the bold lead-in of an item of the list that is the long description.
        const leadIns = await page.evaluate(
          (css) => [...document.querySelectorAll(`${css} > li`)].map((item) => item.firstElementChild.textContent.replace(/\s+/g, ' ').trim()),
          list,
        );
        assert.equal(leadIns.length, total);
        assert.deepEqual((await page.locator(nodes).allTextContents()).map(squash), leadIns);
        for (const name of leadIns) assert.equal(await group.getByRole('button', { name, exact: true }).count(), 1, `a node is named "${name}"`);
        const description = squash(await page.locator(list).innerText());
        for (const name of leadIns) assert.ok(description.includes(name), `the long description names "${name}"`);
        await assertTargetSize(page, nodes, 'a node');

        const state = () =>
          page.evaluate((css) => {
            const all = [...document.querySelectorAll(css)];
            return {
              pressed: all.flatMap((node, at) => (node.getAttribute('aria-pressed') === 'true' ? [at] : [])),
              focused: all.indexOf(document.activeElement),
              roving: all.map((node) => node.getAttribute('tabindex')),
            };
          }, nodes);
        // The tab stop is the node the reader was last on, which is not always the node that is selected.
        const at = (pressed, focused) => ({
          pressed: [pressed],
          focused,
          roving: Array.from({ length: total }, (_, node) => (node === (focused >= 0 ? focused : pressed) ? '0' : '-1')),
        });
        const details = `#${entry.id}-details`;
        const nameOfNode = (index) => attributeOf(page, nodes, 'id', index);
        assert.deepEqual(await state(), at(0, -1), 'the first node is selected, and is the tab stop');
        assert.equal(await isVisible(page, details), true, 'what the selected node shows is on the page');
        assert.equal(await attributeOf(page, details, 'aria-labelledby'), await nameOfNode(0));

        // One tab stop: Tab leaves the diagram for what follows it, and Shift+Tab comes back to the node it left. The page has
        // nothing tabbable after the diagram, and what an engine does at the last tab stop of a page differs (Chromium hands the
        // focus to the body, Firefox keeps it where it was), so a probe button on each side gives the focus somewhere to go.
        await page.evaluate((id) => {
          const diagram = document.getElementById(id);
          for (const [place, name] of [['before', 'probe-before'], ['after', 'probe-after']]) {
            const probe = document.createElement('button');
            probe.id = name;
            probe.textContent = name;
            diagram[place](probe);
          }
        }, entry.id);
        const onProbe = () => page.evaluate(() => document.activeElement.id);
        await page.locator(nodes).first().focus();
        await page.keyboard.press('Tab');
        assert.equal(await onProbe(), 'probe-after', 'Tab goes from the diagram to what follows it, past every other node');
        await page.keyboard.press('Shift+Tab');
        assert.deepEqual(await state(), at(0, 0), 'and Shift+Tab comes back to the node it left');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await onProbe(), 'probe-before', 'Shift+Tab goes from the diagram to what precedes it');
        await page.keyboard.press('Tab');
        assert.deepEqual(await state(), at(0, 0), 'and Tab comes back to the same node');
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await state(), at(0, 2));
        await page.keyboard.press('Tab');
        assert.equal(await onProbe(), 'probe-after');
        await page.keyboard.press('Shift+Tab');
        assert.deepEqual(await state(), at(0, 2), 'the tab stop is the node the reader was last on, not the node that is selected');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        assert.deepEqual(await state(), at(0, 0));

        // The arrows move the focus and choose nothing, in all four directions, and wrap at both ends.
        for (let press = 1; press <= total; press++) {
          await page.keyboard.press('ArrowRight');
          assert.deepEqual(await state(), at(0, press % total), `ArrowRight number ${press}`);
        }
        await page.keyboard.press('ArrowDown');
        assert.deepEqual(await state(), at(0, 1), 'ArrowDown goes to the next node');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        assert.deepEqual(await state(), at(0, total - 1), 'ArrowLeft wraps from the first node to the last');
        await page.keyboard.press('ArrowUp');
        assert.deepEqual(await state(), at(0, total - 2), 'ArrowUp goes to the previous node');

        // Enter and Space choose the node that has the focus, and a click chooses the node it is made on.
        await page.locator(nodes).nth(1).focus();
        await page.keyboard.press('Enter');
        assert.deepEqual(await state(), at(1, 1), 'Enter selects');
        await page.keyboard.press('ArrowRight');
        assert.deepEqual(await state(), at(1, 2), 'moving is not selecting');
        await page.keyboard.press('Space');
        assert.deepEqual(await state(), at(2, 2), 'Space selects');
        await page.locator(nodes).first().click();
        assert.deepEqual(await state(), at(0, 0), 'a click selects, and the node takes the focus and the tab stop');

        // What a node shows when selected is its item of the slide, less the lead-in, and it is on the page.
        for (let node = 0; node < total; node++) {
          await page.locator(nodes).nth(node).click();
          const rest = await page.evaluate(
            ([css, at]) => {
              const item = document.querySelectorAll(`${css} > li`)[at];
              return item.textContent.replace(item.firstElementChild.textContent, '');
            },
            [list, node],
          );
          assert.equal(squash(await page.locator(details).innerText()), squash(rest), `node ${node} shows its item`);
          assert.ok(squash(rest).length > 0);
          assert.equal(await isVisible(page, details), true);
          assert.equal(await attributeOf(page, details, 'aria-labelledby'), await nameOfNode(node), 'and the details are named by the node');
        }

        // The selected node is 3:1 against what is next to it (F91), read from what the engine painted.
        await page.locator(nodes).nth(1).click();
        const painted = await page.evaluate(
          ([css, groupCss]) => {
            const channels = (color) => color.match(/[\d.]+/g).slice(0, 3).map(Number);
            const light = (color) => {
              const [r, g, b] = channels(color).map((channel) => {
                const level = channel / 255;
                return level <= 0.03928 ? level / 12.92 : ((level + 0.055) / 1.055) ** 2.4;
              });
              return 0.2126 * r + 0.7152 * g + 0.0722 * b;
            };
            const ratio = (one, other) => {
              const [high, low] = [light(one), light(other)].sort((a, b) => b - a);
              return (high + 0.05) / (low + 0.05);
            };
            const all = [...document.querySelectorAll(css)];
            const chosen = all.find((node) => node.getAttribute('aria-pressed') === 'true');
            const style = (node) => getComputedStyle(node);
            const surface = style(document.querySelector(groupCss)).backgroundColor;
            return {
              surface: ratio(style(chosen).backgroundColor, surface),
              border: ratio(style(chosen).borderTopColor, surface),
              neighbours: all.filter((node) => node !== chosen).map((node) => ratio(style(chosen).backgroundColor, style(node).backgroundColor)),
              text: ratio(style(chosen).color, style(chosen).backgroundColor),
            };
          },
          [nodes, `#${entry.id}`],
        );
        assert.ok(painted.surface >= 3, `the selected node against the diagram: ${painted.surface}:1`);
        assert.ok(painted.border >= 3, `the border of the selected node against the diagram: ${painted.border}:1`);
        painted.neighbours.forEach((ratio, node) => assert.ok(ratio >= 3, `the selected node against another node ${node}: ${ratio}:1`));
        assert.ok(painted.text >= 4.5, `the text of the selected node: ${painted.text}:1`);

        // Choosing a node moves no node: the two states take the same room.
        const boxes = () =>
          page.evaluate(
            (css) => [...document.querySelectorAll(css)].map((node) => Object.values(node.getBoundingClientRect().toJSON()).map((value) => Math.round(value * 2) / 2)),
            nodes,
          );
        await page.locator(nodes).first().click();
        const first = await boxes();
        await page.locator(nodes).nth(total - 1).click();
        assert.deepEqual(await boxes(), first, 'selecting another node moves and resizes none');

        assert.deepEqual(await announcements(page), [], 'a diagram says nothing to the live region: it has none (the inventory declares statusRegion false)');

        // The choice stays.
        await page.locator(nodes).nth(2).click();
        await roundTrip(page, entry.segment);
        assert.deepEqual(await state(), at(2, -1), 'the selected node survives leaving the segment');
        assert.equal(await stored(page, entry.segment, entry.id), 2);
        assert.equal(await attributeOf(page, details, 'aria-labelledby'), await nameOfNode(2));
      });
    });

    test('carousel: Previous and Next move between the slides and keep the focus, nothing is announced twice, and the slide stays', async () => {
      const entry = entryFor('carousel');
      await withPage(engine, entry.segment, async (page) => {
        const root = `#${entry.id}`;
        const carousel = page.getByRole('group', { name: entry.label });
        assert.equal(await carousel.count(), 1);
        assert.equal(await attributeOf(page, root, 'aria-roledescription'), 'carousel');
        const slides = `${root} [aria-roledescription="slide"]`;
        const buttons = `${root} > div:first-child button`;
        const total = await page.locator(slides).count();
        assert.ok(total >= 2, 'a carousel of a few slides');

        // The slides are groups of the carousel, each with a name of its own; the wrapper is the one polite live region.
        const names = await page.evaluate((css) => [...document.querySelectorAll(css)].map((slide) => `${slide.getAttribute('role')}:${slide.getAttribute('aria-label')}`), slides);
        assert.ok(names.every((name) => /^group:\S/.test(name)), `every slide is a named group: ${names}`);
        assert.equal(new Set(names).size, total, 'and each is named differently');
        assert.equal(
          await page.evaluate((css) => new Set([...document.querySelectorAll(css)].map((slide) => slide.parentElement)).size, slides),
          1,
          'the slides share one wrapper',
        );
        assert.equal(await page.evaluate((css) => document.querySelector(css).parentElement.getAttribute('aria-live'), slides), 'polite');
        await assertTargetSize(page, buttons, 'a button');

        const shown = () => page.evaluate((css) => [...document.querySelectorAll(css)].flatMap((slide, at) => (slide.checkVisibility() ? [at] : [])), slides);
        const place = () => page.evaluate((css) => document.querySelector(css).firstElementChild.querySelector('span').textContent, root);
        const previous = carousel.getByRole('button', { name: /^previous/i });
        const next = carousel.getByRole('button', { name: /^next/i });
        assert.equal(await previous.count(), 1);
        assert.equal(await next.count(), 1);
        assert.deepEqual(await shown(), [0], 'one slide is on show');
        assert.equal(await place(), `1 of ${total}`);
        const slideName = (index) => names[index].slice('group:'.length);
        assert.equal(await page.getByRole('group', { name: slideName(0), exact: true }).count(), 1, 'the slide on show is a group of its name');
        assert.equal(await page.getByRole('group', { name: slideName(1), exact: true }).count(), 0, 'a slide that is not on show is not exposed');
        await page.evaluate((css) => (window.__wrapper = document.querySelector(css).parentElement), slides);
        await watchLiveRegion(page);

        // The pointer, and then the keyboard on the focused button: the button keeps the focus, and goes round at the ends.
        await next.click();
        assert.deepEqual(await shown(), [1]);
        assert.equal(await place(), `2 of ${total}`);
        assert.equal(await isFocused(page, buttons, 1), true, 'Next keeps the focus when it is pressed');
        let index = 1;
        for (const key of ['Enter', 'Space', 'Enter', 'Space']) {
          await page.keyboard.press(key);
          index = (index + 1) % total;
          assert.deepEqual(await shown(), [index], `${key} on Next`);
          assert.equal(await place(), `${index + 1} of ${total}`);
          assert.equal(await isFocused(page, buttons, 1), true);
        }
        await page.keyboard.press('Shift+Tab');
        assert.equal(await isFocused(page, buttons, 0), true, 'Previous comes before Next in the Tab order');
        for (const key of ['Enter', 'Space', 'Enter']) {
          await page.keyboard.press(key);
          index = (index - 1 + total) % total;
          assert.deepEqual(await shown(), [index], `${key} on Previous`);
          assert.equal(await isFocused(page, buttons, 0), true, 'Previous keeps the focus when it is pressed');
        }
        await previous.click();
        index = (index - 1 + total) % total;
        assert.deepEqual(await shown(), [index]);

        // Nothing was rebuilt, and the shell's live region was not used: the wrapper is the live region of a carousel.
        assert.equal(await page.evaluate((css) => window.__wrapper === document.querySelector(css).parentElement, slides), true);
        await settle(page);
        assert.deepEqual(await announcements(page), [], 'the inventory declares no status region for a carousel');

        // The slide stays.
        await roundTrip(page, entry.segment);
        assert.deepEqual(await shown(), [index], 'the slide on show survives leaving the segment');
        assert.equal(await place(), `${index + 1} of ${total}`);
        assert.equal(await stored(page, entry.segment, entry.id), index);
      });
    });

    test('carousel: nothing rotates by itself, so there is nothing to pause or to stop under reduced motion (F99)', async () => {
      const entry = entryFor('carousel');
      await withPage(
        engine,
        entry.segment,
        async (page) => {
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.clock.pauseAt(new Date(CLOCK_START.getTime() + 5_000));
          await watchChanges(page, `#${entry.id}`);
          await page.clock.runFor(10 * 60_000); // ten minutes of the page's own time, and every timer it holds fired on the way
          assert.deepEqual(await changes(page), [], 'no slide was shown, hidden or renamed');
          assert.equal(await page.locator(`#${entry.id} [aria-roledescription="slide"]:not([hidden])`).count(), 1);
        },
        { clock: true },
      );
    });

    test('segment-timer: nothing counts until Start is pressed, whatever time passes and whatever the motion setting', async () => {
      const entry = entryFor('segment-timer');
      await withPage(
        engine,
        entry.segment,
        async (page) => {
          const timer = timerOf(page, entry);
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await countIntervals(page);
          await watchLiveRegion(page);
          await hold(page);
          await watchChanges(page, `#${entry.id}`);
          assert.equal(await timer.readout(), timer.shows(0), 'the whole time of the segment is on the clock');
          assert.equal(await timer.caption(), 'Ready');
          assert.equal(await stored(page, entry.segment, entry.id), undefined, 'nothing is kept for a timer nobody has used');
          await timer.pass(30 * 60); // half an hour of the page's own time, every timer it holds fired on the way
          assert.deepEqual(await changes(page), [], 'the timer did not change');
          assert.equal(await intervals(page), 0, 'and it holds no interval');
          assert.deepEqual(await announcements(page), [], 'and it said nothing');
          assert.equal(await page.evaluate(() => window.teachingSpa.store.get().currentId), entry.segment, 'and the deck stayed where it was');
          // Pause, Stop and Reset have nothing to do yet, and do it without a word.
          for (const name of ['Pause', 'Stop', 'Reset']) await timer.button(name).click();
          await timer.pass(1);
          assert.deepEqual(await announcements(page), [], 'a control with nothing to do says nothing');
          assert.deepEqual(await changes(page), [], 'and changes nothing');
        },
        { clock: true },
      );
    });

    test('segment-timer: Start, Pause, Stop and Reset work from the pointer and the keyboard, the time counts down, and each change is said', async () => {
      const entry = entryFor('segment-timer');
      await withPage(
        engine,
        entry.segment,
        async (page) => {
          const timer = timerOf(page, entry);
          const focusedButton = () => page.evaluate(() => document.activeElement.textContent);
          await countIntervals(page);
          await watchLiveRegion(page);
          await hold(page);
          const said = async (...texts) => assert.deepEqual(await announcements(page), texts);

          // The timer has the roles and the name of a timer, its figure is not a live region, and its controls are big enough.
          const group = page.getByRole('group', { name: entry.label });
          assert.equal(await group.count(), 1);
          assert.equal(await group.getByRole('timer', { name: 'Time remaining' }).count(), 1, 'the figure is a timer, with a name');
          assert.equal(await attributeOf(page, `#${entry.id} [role="timer"]`, 'aria-live'), null, 'and not a live region: every second would be read out');
          assert.deepEqual(
            await group.getByRole('button').allTextContents(),
            ['Start', 'Pause', 'Stop', 'Reset'],
            'four buttons: a way to start the count, and ways to pause and to stop it (F108)',
          );
          await assertTargetSize(page, `#${entry.id} button`, 'a timer button');

          // The pointer: Start begins the count from the whole time, and the shell's status region says so (F104).
          await timer.button('Start').click();
          assert.equal(await timer.caption(), 'Running');
          assert.equal(await intervals(page), 1, 'one interval does the counting');
          assert.equal(await isFocused(page, `#${entry.id} button`, 0), true, 'Start keeps the focus it was given');
          await timer.pass(1);
          await said(`Started. ${timer.says(0)} left.`);
          assert.equal(await timer.readout(), timer.shows(1));
          const kept = await stored(page, entry.segment, entry.id);
          assert.equal(kept.state, 'running');
          assert.equal(kept.elapsedMs, 0);
          await timer.pass(29);
          assert.equal(await timer.readout(), timer.shows(30), 'a second at a time');
          await said(`Started. ${timer.says(0)} left.`); // a tick says nothing
          assert.deepEqual(await stored(page, entry.segment, entry.id), kept, 'and a tick writes nothing to the store');

          // Pause keeps the time that is left, and the count does not go on while it is paused.
          await timer.button('Pause').click();
          assert.equal(await timer.caption(), 'Paused');
          assert.equal(await intervals(page), 0, 'a paused timer holds no interval');
          assert.deepEqual(await stored(page, entry.segment, entry.id), { state: 'paused', elapsedMs: 30_000, startedAt: null });
          await timer.pass(10);
          assert.equal(await timer.readout(), timer.shows(30), 'ten seconds went by and none was counted');
          await said(`Started. ${timer.says(0)} left.`, `Paused. ${timer.says(30)} left.`);

          // Start goes on from where Pause left it, and Escape pauses from the keyboard without leaving the timer.
          await timer.button('Start').click();
          await timer.pass(5);
          assert.equal(await timer.readout(), timer.shows(35));
          await page.keyboard.press('Escape');
          assert.equal(await timer.caption(), 'Paused', 'Escape pauses a running timer');
          assert.equal(await isFocused(page, `#${entry.id} button`, 0), true, 'and the focus stays where it was');
          await timer.pass(1);
          assert.equal((await announcements(page)).at(-1), `Paused. ${timer.says(35)} left.`);
          await page.keyboard.press('Escape');
          await timer.pass(1);
          assert.equal((await announcements(page)).length, 4, 'Escape on a timer that is not counting does nothing and says nothing');

          // The keyboard: Tab goes Start, Pause, Stop, Reset; Enter and Space press the button that has the focus.
          await timer.button('Start').focus();
          await page.keyboard.press('Enter');
          assert.equal(await timer.caption(), 'Running', 'Enter on Start');
          await page.keyboard.press('Tab');
          assert.equal(await focusedButton(), 'Pause');
          await page.keyboard.press('Space');
          assert.equal(await timer.caption(), 'Paused', 'Space on Pause');
          await page.keyboard.press('Tab');
          assert.equal(await focusedButton(), 'Stop');
          await page.keyboard.press('Enter');
          assert.equal(await timer.caption(), 'Ready', 'Enter on Stop');
          assert.equal(await timer.readout(), timer.shows(0), 'Stop gives back the whole time');
          assert.deepEqual(await stored(page, entry.segment, entry.id), { state: 'idle', elapsedMs: 0, startedAt: null });
          await page.keyboard.press('Tab');
          assert.equal(await focusedButton(), 'Reset');
          await timer.pass(1);
          const before = (await announcements(page)).length;
          await page.keyboard.press('Space');
          await timer.pass(1);
          assert.equal((await announcements(page)).length, before, 'Reset on a timer that has not started says nothing');

          // Reset goes back to the whole time and goes on counting, or stays paused, as the timer was.
          await timer.button('Start').click();
          await timer.pass(10);
          assert.equal(await timer.readout(), timer.shows(10));
          await timer.button('Reset').click();
          assert.equal(await timer.readout(), timer.shows(0), 'Reset gives back the whole time');
          assert.equal(await timer.caption(), 'Running', 'and a running timer runs on');
          await timer.pass(2);
          assert.equal(await timer.readout(), timer.shows(2), 'from the second after the reset');
          assert.equal((await announcements(page)).at(-1), `Reset. ${timer.says(0)} left.`);
          await timer.button('Pause').click();
          await timer.pass(3);
          await timer.button('Reset').click();
          assert.equal(await timer.caption(), 'Paused', 'a paused timer stays paused');
          assert.equal(await timer.readout(), timer.shows(0));
          assert.equal(await intervals(page), 0);
          await timer.button('Stop').click();
          assert.equal(await timer.caption(), 'Ready');
          assert.equal(await page.evaluate(() => window.teachingSpa.store.get().currentId), entry.segment, 'no control moved the deck');
        },
        { clock: true },
      );
    });

    test('segment-timer: the marks and the end are said once, the end moves nothing, and a finished timer can be started again', async () => {
      const entry = entryFor('segment-timer');
      await withPage(
        engine,
        entry.segment,
        async (page) => {
          const timer = timerOf(page, entry);
          await countIntervals(page);
          await watchLiveRegion(page);
          await hold(page);
          const hash = await page.evaluate(() => location.hash);
          await timer.button('Start').click();
          await timer.jump(timer.total - 301); // the minutes between are not interesting: the ticks that follow are
          assert.equal(await timer.readout(), '5:01');
          assert.deepEqual(await announcements(page), [`Started. ${timer.says(0)} left.`], 'nothing is said as the time runs down');
          await timer.pass(1);
          await timer.speak();
          assert.equal((await announcements(page)).at(-1), '5 minutes left.', 'five minutes are said as they are reached');
          await timer.jump(239);
          assert.equal(await timer.readout(), '1:01');
          await timer.pass(1);
          await timer.speak();
          assert.equal((await announcements(page)).at(-1), '1 minute left.', 'and one minute');
          await timer.jump(59);
          assert.equal(await timer.readout(), '0:01');
          assert.equal(await timer.caption(), 'Running');
          assert.equal((await announcements(page)).length, 3, 'neither was said twice');

          // The end: said once, the count stops, and the presenter, not the timer, decides what comes next.
          await timer.pass(1);
          await timer.speak();
          assert.equal(await timer.readout(), '0:00');
          assert.equal(await timer.caption(), 'Time is up');
          assert.equal((await announcements(page)).at(-1), 'Time is up.');
          assert.equal(await intervals(page), 0, 'the interval is cleared when the time is up');
          assert.deepEqual(await stored(page, entry.segment, entry.id), { state: 'done', elapsedMs: timer.total * 1000, startedAt: null });
          await timer.pass(120);
          assert.equal((await announcements(page)).length, 4, 'and nothing more is said, though time goes on');
          assert.equal(await timer.readout(), '0:00');
          assert.equal(await page.evaluate(() => window.teachingSpa.store.get().currentId), entry.segment, 'the deck did not move on');
          assert.equal(await page.evaluate(() => location.hash), hash, 'and the address did not change');

          // Start after the end counts the whole time again, and Reset after the end gives the timer back unstarted.
          await timer.button('Start').click();
          assert.equal(await timer.readout(), timer.shows(0));
          assert.equal(await timer.caption(), 'Running');
          await timer.pass(2);
          assert.equal(await timer.readout(), timer.shows(2));
          assert.equal((await announcements(page)).at(-1), `Started. ${timer.says(0)} left.`);
          await timer.jump(timer.total);
          await timer.speak();
          assert.equal(await timer.caption(), 'Time is up');
          assert.equal((await announcements(page)).at(-1), 'Time is up.', 'and it is said again for the count that has run out again');
          await timer.button('Reset').click();
          assert.equal(await timer.caption(), 'Ready');
          assert.equal(await timer.readout(), timer.shows(0));
          assert.equal(await intervals(page), 0);
        },
        { clock: true },
      );
    });

    test('segment-timer: the count follows the wall clock, so a stretch the page did not run for is not lost', async () => {
      const entry = entryFor('segment-timer');
      await withPage(
        engine,
        entry.segment,
        async (page) => {
          const timer = timerOf(page, entry);
          await watchLiveRegion(page);
          await hold(page);
          await timer.button('Start').click();
          await timer.pass(1);
          // The way a closed laptop, or a background tab whose timers were held back, is seen by the page: the clock jumps
          // and the interval fires once, however much time went by.
          await page.clock.fastForward(10 * 60_000);
          assert.equal(await timer.readout(), timer.shows(1 + 600), 'ten minutes went by and ten minutes were counted, with one tick');
          await timer.pass(1);
          assert.equal(await timer.readout(), timer.shows(1 + 600 + 1));
          // A jump over a mark says the mark the time left has reached, once: the five minutes it passed are not said as well.
          await page.clock.fastForward((timer.total - 30 - 602) * 1000);
          assert.equal(await timer.readout(), '0:30');
          await timer.pass(1);
          assert.deepEqual(await announcements(page), [`Started. ${timer.says(0)} left.`, '1 minute left.']);
          await page.clock.fastForward(5 * 60_000);
          assert.equal(await timer.readout(), '0:00', 'the count stops at the end, and does not go below it');
          assert.equal(await timer.caption(), 'Time is up');
          await timer.pass(1);
          assert.equal((await announcements(page)).at(-1), 'Time is up.');
        },
        { clock: true },
      );
    });

    test('segment-timer: a running, paused or finished count survives leaving the segment, and nothing is left counting behind', async () => {
      const entry = entryFor('segment-timer');
      const away = deckIds.find((id) => id !== entry.segment);
      await withPage(
        engine,
        entry.segment,
        async (page) => {
          const timer = timerOf(page, entry);
          await countIntervals(page);
          await watchLiveRegion(page);
          await hold(page);

          // Running: the minute away is counted, from the wall clock, and the segment is counting again.
          await timer.button('Start').click();
          await timer.pass(5);
          await visit(page, away);
          assert.equal(await intervals(page), 0, 'leaving the segment clears its interval');
          await timer.pass(60);
          await visit(page, entry.segment);
          assert.equal(await timer.readout(), timer.shows(65), 'the time away is counted for a count that was running');
          assert.equal(await timer.caption(), 'Running');
          assert.equal(await intervals(page), 1, 'and the timer counts again');
          await timer.pass(5);
          assert.equal(await timer.readout(), timer.shows(70));

          // Paused: what was left is left, however long the segment is away.
          await timer.button('Pause').click();
          await visit(page, away);
          assert.equal(await intervals(page), 0);
          await timer.pass(10 * 60);
          await visit(page, entry.segment);
          assert.equal(await timer.readout(), timer.shows(70), 'the time away is not counted for a count that was paused');
          assert.equal(await timer.caption(), 'Paused');
          assert.equal(await intervals(page), 0, 'a paused timer holds no interval when it is back');

          // Stopped: it is back at the whole time, and not counting.
          await timer.button('Stop').click();
          await visit(page, away);
          await visit(page, entry.segment);
          assert.equal(await timer.readout(), timer.shows(0));
          assert.equal(await timer.caption(), 'Ready');
          assert.equal(await intervals(page), 0);

          // Finished while the segment was away: the time is up when it is back, and it is not said again.
          await timer.button('Start').click();
          await timer.pass(1);
          await visit(page, away);
          await timer.pass(timer.total);
          await timer.pass(1);
          const said = (await announcements(page)).filter((text) => text.includes('Time is up'));
          assert.deepEqual(said, [], 'a timer that is not on the page says nothing');
          await visit(page, entry.segment);
          await timer.pass(1);
          assert.equal(await timer.readout(), '0:00');
          assert.equal(await timer.caption(), 'Time is up');
          assert.equal(await intervals(page), 0);
          assert.deepEqual(
            (await announcements(page)).filter((text) => text.includes('Time is up')),
            [],
            'the end that happened while the segment was away is shown, and is not announced late',
          );
          assert.equal(await page.evaluate(() => window.teachingSpa.store.get().currentId), entry.segment);
        },
        { clock: true },
      );
    });
  });
}
