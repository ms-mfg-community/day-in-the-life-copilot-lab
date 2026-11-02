// Real-browser check of the keyboard model (specs/005-teaching-spa.md 2.10; AC12, AC13, AC14) against the BUILT bundle, because
// only an engine's own sequential focus navigation says where Tab really goes, and only a real localStorage says whether the
// setting survives a reload. The Vitest half (keyboard.test.ts) holds the same rules in the fake DOM.
// Run after npm run spa:build (npm run spa:test:keyboard builds first, then runs the Vitest half, then this):
//   node --test tests/spa/keyboard-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browser. No dependencies are installed by this check.
//   SPA_QA_PLAYWRIGHT_MODULE  a playwright/index.mjs to use; otherwise `playwright`, then every copy in npm's npx cache
//   SPA_QA_BROWSER_TYPE       chromium (default), firefox or webkit, when that browser is already installed
//   SPA_QA_BROWSER_CHANNEL    chrome or msedge
//   SPA_QA_DIST               another build to serve (a mutation check uses it)
//
// What is real here: Tab, Enter, Escape, the characters and Ctrl+Alt chords as the engine delivers them, focus, the hash, and
// localStorage. Nothing is stubbed; no pointer is used except in the one control case that shows the guard trips. Only the
// browser named by SPA_QA_BROWSER_TYPE is exercised; nothing here speaks for the other engines.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { launchBrowser } from '../../scripts/spa/lib/playwright.mjs';

const ROOT = process.cwd();
const DIST = path.resolve(process.env.SPA_QA_DIST || path.join(ROOT, 'workshop/spa/dist'));
const read = (relative) => JSON.parse(readFileSync(path.join(ROOT, relative), 'utf8'));
const IDS = read('workshop/spa/content/deck.json').segments.map((segment) => segment.id);
const INVENTORY = read('workshop/spa/content/interactions.json').interactions;
const TIMER = INVENTORY.find((entry) => entry.pattern === 'segment-timer');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const ENGINE = process.env.SPA_QA_BROWSER_TYPE || 'chromium';
let browser;
let server;
let base;

before(async () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'Run npm run spa:build first');
  const launched = await launchBrowser({ engine: ENGINE, channel: process.env.SPA_QA_BROWSER_CHANNEL });
  browser = launched.browser;
  console.log(`Browser: ${ENGINE} ${browser.version()} (playwright: ${launched.playwright})`);
  server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const file = path.resolve(DIST, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(DIST + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    response.end(readFileSync(file));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://localhost:${server.address().port}/index.html`;
});

after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});

/** Opens the shell at a segment in a fresh context; `run` gets the page and the pointer-event log the page keeps. */
async function withPage(run, { hash = `#/${IDS[0]}`, context: given } = {}) {
  const context = given ?? (await browser.newContext({ viewport: { width: 1280, height: 720 } }));
  context.setDefaultTimeout(10_000);
  const errors = [];
  context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  await context.addInitScript(() => {
    window.__pointerEvents = [];
    for (const type of ['pointerdown', 'pointerup', 'pointermove', 'mousedown', 'mouseup', 'mousemove']) {
      document.addEventListener(type, (event) => window.__pointerEvents.push(event.type), { capture: true });
    }
  });
  try {
    const page = await context.newPage();
    await page.goto(`${base}${hash}`);
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.keyboard);
    await run(page, context);
    assert.deepEqual(errors, [], 'the page must not throw');
  } finally {
    if (given === undefined) await context.close();
  }
}

const currentId = (page) => page.evaluate(() => window.teachingSpa.store.get().currentId);
const pointerEvents = (page) => page.evaluate(() => window.__pointerEvents);

/** Where focus is: the id of the focused element, or of its nearest ancestor with one, and its tag. */
const focused = (page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    return { tag: active?.localName ?? null, id: active?.id || active?.closest?.('[id]')?.id || null, nav: active?.closest?.('#segment-nav') !== null, href: active?.getAttribute?.('href') ?? null };
  });

/** Tabs once round the page from the skip link, collecting where focus lands, until it comes back to the skip link or leaves the page. */
async function tabRound(page) {
  await page.focus('a[data-skip]');
  const visited = [];
  for (let i = 0; i < 400; i += 1) {
    await page.keyboard.press('Tab');
    const now = await focused(page);
    if (now.tag === 'body' || now.tag === null || (now.tag === 'a' && now.href === '#main')) break; // out of the page, or round again
    visited.push(now);
  }
  return visited;
}

/** Goes to a segment by keyboard only: Tab to its link, Enter. */
async function goByKeyboard(page, id) {
  await page.focus('a[data-skip]');
  for (let i = 0; i < 400; i += 1) {
    await page.keyboard.press('Tab');
    const now = await focused(page);
    if (now.nav && now.href === `#/${id}`) break;
    assert.notEqual(now.tag, 'body', `Tab left the page before reaching the link to ${id}`);
  }
  await page.keyboard.press('Enter');
  await page.waitForFunction((want) => window.teachingSpa.store.get().currentId === want, id);
}

/** Whether a visited focus record sits inside the element with `id`. */
const insideOf = (page, visited, id) =>
  page.evaluate(
    ({ visited, id }) => {
      const root = document.getElementById(id);
      if (root === null) return false;
      return visited.some((record) => record.id !== null && (record.id === id || root.contains(document.getElementById(record.id))));
    },
    { visited, id },
  );

test('AC12: a keyboard-only traversal reaches every inventory element in every segment, and every segment through its link, with no pointer event', async () => {
  await withPage(async (page) => {
    for (const id of IDS) {
      if ((await currentId(page)) !== id) await goByKeyboard(page, id);
      const visited = await tabRound(page);
      for (const entry of INVENTORY.filter((candidate) => candidate.segment === id)) {
        assert.ok(await insideOf(page, visited, entry.id), `${entry.id} (${entry.pattern}) in ${id} is reached by Tab; visited: ${visited.map((v) => v.id).join(',')}`);
      }
      for (const other of IDS) assert.ok(visited.some((record) => record.nav && record.href === `#/${other}`), `the link to ${other} is reached from ${id}`);
    }
    assert.deepEqual(await pointerEvents(page), []);
  });
});

test('AC12 control: a pointer is seen by the guard', async () => {
  await withPage(async (page) => {
    await page.click(`#segment-nav a[href="#/${IDS[1]}"]`);
    const seen = await pointerEvents(page);
    assert.ok(seen.includes('pointerdown') || seen.includes('mousedown'), `the guard records a pointer: ${seen.join(',')}`);
  });
});

test('AC13: every dialog and popover of the inventory, and the shortcuts dialog, close on Escape and give focus back to what invoked them', async () => {
  await withPage(async (page) => {
    for (const entry of INVENTORY.filter((candidate) => candidate.pattern === 'dialog' || candidate.pattern === 'disclosure-popover')) {
      if ((await currentId(page)) !== entry.segment) await goByKeyboard(page, entry.segment);
      const trigger = page.locator(`#${entry.id} button`).first();
      await trigger.focus();
      if (entry.pattern === 'dialog') await page.keyboard.press('Enter');
      const controlled = await trigger.getAttribute('aria-controls');
      await page.waitForFunction((id) => !document.getElementById(id).hidden, controlled);
      await page.keyboard.press('Escape');
      await page.waitForFunction((id) => document.getElementById(id).hidden, controlled);
      assert.ok(await trigger.evaluate((element) => element === document.activeElement), `${entry.id}: focus is back on the trigger`);
    }
    await page.focus('#shortcut-help-open');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.getElementById('shortcut-help').hidden);
    assert.ok(await page.evaluate(() => document.getElementById('shortcut-help').contains(document.activeElement)));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('shortcut-help').hidden);
    assert.equal((await focused(page)).id, 'shortcut-help-open');
    // And from ? with focus on a link: back to the link.
    await page.focus(`#segment-nav a[href="#/${IDS[1]}"]`);
    await page.keyboard.press('Shift+?');
    await page.waitForFunction(() => !document.getElementById('shortcut-help').hidden);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.getElementById('shortcut-help').hidden);
    assert.equal((await focused(page)).href, `#/${IDS[1]}`);
    assert.deepEqual(await pointerEvents(page), []);
  });
});

test('AC14: with the setting off no single key changes state, with it on each does, the modifier forms always do, and the setting survives a reload', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  try {
    await withPage(
      async (page) => {
        const shortcuts = await page.evaluate(() => window.teachingSpa.keyboard.shortcuts);
        assert.ok(shortcuts.length >= 2);
        const state = () => page.evaluate(() => JSON.stringify({ store: window.teachingSpa.store.get(), help: !document.getElementById('shortcut-help').hidden }));
        // On, from the second segment (so n and p both have somewhere to go) and the timer's own segment for t.
        for (const shortcut of shortcuts) {
          const where = shortcut.id === 'timer' && TIMER ? TIMER.segment : IDS[1];
          await page.goto(`${base}#/${where}`);
          await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.keyboard);
          await page.focus('#main');
          const before = await state();
          await page.keyboard.press(shortcut.key === '?' ? 'Shift+?' : shortcut.key);
          await page.waitForTimeout(150);
          assert.notEqual(await state(), before, `${shortcut.key} changes state with the setting on`);
          if (shortcut.id === 'help') await page.keyboard.press('Escape');
        }
        // Off, by keyboard: Tab is not needed, the checkbox takes focus and Space.
        await page.focus('#shortcut-single-key');
        await page.keyboard.press('Space');
        await page.waitForFunction(() => window.teachingSpa.keyboard.singleKeyShortcutsEnabled() === false);
        for (const shortcut of shortcuts) {
          const where = shortcut.id === 'timer' && TIMER ? TIMER.segment : IDS[1];
          await page.goto(`${base}#/${where}`);
          await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.keyboard);
          assert.equal(await page.evaluate(() => window.teachingSpa.keyboard.singleKeyShortcutsEnabled()), false, 'the setting is kept across the reload');
          await page.focus('#main');
          const before = await state();
          await page.keyboard.press(shortcut.key === '?' ? 'Shift+?' : shortcut.key);
          await page.waitForTimeout(150);
          assert.equal(await state(), before, `${shortcut.key} changes nothing with the setting off`);
          await page.keyboard.press(`Control+Alt+${shortcut.letter === '/' ? 'Slash' : shortcut.letter.toUpperCase()}`);
          await page.waitForTimeout(150);
          assert.notEqual(await state(), before, `${shortcut.modifier} changes state with the setting off`);
          if (shortcut.id === 'help') await page.keyboard.press('Escape');
        }
        assert.deepEqual(await pointerEvents(page), []);
      },
      { hash: `#/${IDS[1]}`, context },
    );
  } finally {
    await context.close();
  }
});
