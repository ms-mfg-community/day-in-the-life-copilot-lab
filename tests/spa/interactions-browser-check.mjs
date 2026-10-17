// Real-browser check of the five interaction patterns of issue 4 (tabs, accordion, dialog, staged-reveal,
// disclosure-popover), run against the built artifact in Chromium and Firefox.
//
// The vitest suites (interaction-inventory.test.ts, interaction-behavior.test.ts) drive the same code in the fake DOM
// (helpers/fake-dom.ts), which fake-dom-browser-check.mjs holds to these engines. Here nothing is faked: the keyboard and the
// pointer are real, the page is the output of npm run spa:build, and the AC6 audit of the inventory test is the very same
// file (helpers/interaction-audit.ts), bundled and run inside the page. Roles and accessible names are also read through
// Playwright's getByRole, an implementation of the ARIA role and name rules that is independent of that audit.
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
const deckIds = readJson('workshop/spa/content/deck.json').segments.map((segment) => segment.id);

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

async function withPage(engine, segmentId, run) {
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

        // Tab goes into the active tab, then out of the tablist to the panel, and Shift+Tab comes back.
        await page.locator('#segment-nav a').last().focus();
        await page.keyboard.press('Tab');
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
  });
}
