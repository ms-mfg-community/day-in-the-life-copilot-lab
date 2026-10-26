// The rehearsal run-through (specs/005-teaching-spa.md section 7, child issue 13; AC22): the Teaching SPA driven end to end the way a
// presenter drives it, in a real browser, against the BUILT bundle, and the portable file over file:. Each run prints what it saw
// (transport, the time the speaker script took to follow each move, the screens the browser listed) so a rehearsal record can be
// written from it. It is not part of `npm test`: it needs a browser, and a rehearsal is something a person decides to hold.
//
// Run after npm run spa:build and npm run spa:build:single:
//   node --test tests/spa/rehearsal-browser-check.mjs
//   SPA_QA_BROWSER_TYPE       chromium (default), firefox or webkit
//   SPA_QA_BROWSER_CHANNEL    chrome or msedge, to rehearse in the installed browser
//   SPA_QA_HEADED=1           with a window, so fullscreen lands on this machine's own monitors
//
// The walk: open the first segment; get the speaker script window and Present (in Chrome and Edge from one click, with the option;
// in Firefox and WebKit, which end fullscreen when a window opens, from the Open speaker script control first, as the page says);
// see fullscreen and the script window following (AC9: within 500 ms); step through every segment with the n shortcut and see the
// script follow each move; start and pause the
// timer with t and see the script show it; reveal every step of the staged reveal and see the script show the stage; open and
// close the enlarged diagram; exit presentation mode and hear it said; then the portable file from disk, with its own script
// window, over two moves. Nothing is stubbed.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../../scripts/spa/lib/playwright.mjs';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'workshop/spa/dist');
const PORTABLE = path.join(DIST, 'standalone/teaching-spa.html');
const read = (relative) => JSON.parse(readFileSync(path.join(ROOT, relative), 'utf8'));
const IDS = read('workshop/spa/content/deck.json').segments.map((segment) => segment.id);
const INVENTORY = read('workshop/spa/content/interactions.json').interactions;
const TIMER = INVENTORY.find((entry) => entry.pattern === 'segment-timer');
const REVEAL = INVENTORY.find((entry) => entry.pattern === 'staged-reveal');
const DIALOG = INVENTORY.find((entry) => entry.pattern === 'dialog');
const BUDGET_MS = 500;
const ENGINE = process.env.SPA_QA_BROWSER_TYPE || 'chromium';
const HEADED = process.env.SPA_QA_HEADED === '1';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
let browser;
let server;
let base;
const report = { browser: '', steps: [] };
const note = (step, detail) => {
  report.steps.push({ step, ...detail });
  console.log(`rehearsal: ${step}: ${JSON.stringify(detail)}`);
};

before(async () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'Run npm run spa:build first');
  assert.ok(existsSync(PORTABLE), 'Run npm run spa:build:single first');
  const launched = await launchBrowser({ engine: ENGINE, channel: process.env.SPA_QA_BROWSER_CHANNEL, headless: !HEADED });
  browser = launched.browser;
  report.browser = `${process.env.SPA_QA_BROWSER_CHANNEL ?? ENGINE} ${browser.version()}, ${HEADED ? 'headed' : 'headless'}, playwright ${launched.version}`;
  console.log(`rehearsal: ${report.browser}`);
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
  console.log(`rehearsal report: ${JSON.stringify(report)}`);
});

const now = () => performance.now();

/** Waits until the script window shows segment `index`, and returns how long that took from `since`. */
async function followed(popup, index, since) {
  await popup.waitForFunction((want) => document.querySelector('[data-surface="script"]')?.getAttribute('data-segment-index') === String(want), index, { timeout: 5000 });
  return Math.round(now() - since);
}

async function walk(context, page, popupPromise, label) {
  const popup = await popupPromise;
  assert.ok(popup, `${label}: the speaker script window opened`);
  await popup.waitForFunction(() => document.querySelector('[data-surface="script"]') !== null);
  const started = now();
  await popup.waitForFunction(() => document.querySelector('[data-surface="script"]').getAttribute('data-sync-state') === 'synchronized', undefined, { timeout: 5000 });
  const sync = await popup.evaluate(() => {
    const surface = document.querySelector('[data-surface="script"]');
    return { state: surface.getAttribute('data-sync-state'), transport: surface.getAttribute('data-sync-transport'), origin: window.origin };
  });
  note(`${label}: script window synchronized`, { ...sync, afterMs: Math.round(now() - started) });

  const latencies = [];
  for (let index = 1; index < IDS.length; index += 1) {
    await page.focus('#main');
    const since = now();
    await page.keyboard.press('n');
    await page.waitForFunction((want) => window.teachingSpa.store.get().currentId === want, IDS[index]);
    const ms = await followed(popup, index, since);
    latencies.push(ms);
    assert.ok(ms <= BUDGET_MS, `${label}: the script followed the move to ${IDS[index]} in ${ms} ms, over the ${BUDGET_MS} ms budget`);
  }
  note(`${label}: n through every segment, script followed each`, { latenciesMs: latencies, max: Math.max(...latencies), budgetMs: BUDGET_MS });
  return popup;
}

test('the presentation: Present with the speaker script window, every segment, the timer, the reveal, the dialog, and the way out', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  context.setDefaultTimeout(10_000);
  const errors = [];
  context.on('page', (p) => p.on('pageerror', (error) => errors.push(error.message)));
  try {
    const page = await context.newPage();
    await page.goto(`${base}#/${IDS[0]}`);
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation && window.teachingSpa.sync);
    const screens = await page.evaluate(async () => {
      if (typeof window.getScreenDetails !== 'function') return 'getScreenDetails is not available';
      return `getScreenDetails is available; screen.isExtended is ${String(window.screen.isExtended)}`;
    });
    note('before presenting', { screens, presentEnabled: await page.evaluate(() => !document.getElementById('present-start').disabled) });

    // Chrome and Edge keep fullscreen when the script window opens, so one click does both; Firefox and WebKit end fullscreen when a
    // window opens or is raised, so there the script window is opened first, from its own control, as the page tells the presenter.
    const oneClick = ENGINE === 'chromium';
    let popupPromise;
    if (oneClick) {
      await page.check('#present-open-script');
      popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    } else {
      popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
      await page.click('#present-script-open');
      await page.waitForFunction(() => document.getElementById('live-region').textContent.includes('speaker script window is open'));
      await page.bringToFront();
    }
    await page.click('#present-start');
    await page.waitForFunction(() => document.querySelector('[data-spa-root]').getAttribute('data-presentation') === 'presenting');
    await page.waitForTimeout(500); // long enough for a browser that ends fullscreen when the script window opens to have done so
    const presenting = await page.evaluate(() => ({
      fullscreen: document.fullscreenElement !== null,
      mode: document.querySelector('[data-spa-root]').getAttribute('data-presentation'),
      notes: document.getElementById('present-notes').textContent,
    }));
    note(oneClick ? 'Present, with the script window from the same click' : 'Open speaker script, then Present', presenting);
    assert.equal(presenting.fullscreen, true, 'the presentation root is fullscreen');
    assert.equal(presenting.mode, 'presenting');

    const popup = await walk(context, page, popupPromise, 'presentation');

    // Back to the timer's segment: start and pause it from the keyboard, and see the script show each.
    await page.goto(`${base}#/${TIMER.segment}`);
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.sync);
    await page.focus('#main');
    await page.keyboard.press('t');
    await popup.waitForFunction(() => document.querySelector('[data-surface="script"]').getAttribute('data-timer-state') === 'running', undefined, { timeout: 5000 });
    await page.keyboard.press('t');
    await popup.waitForFunction(() => document.querySelector('[data-surface="script"]').getAttribute('data-timer-state') === 'paused', undefined, { timeout: 5000 });
    note('t starts and pauses the timer; the script shows running, then paused', { segment: TIMER.segment });

    await page.goto(`${base}#/${REVEAL.segment}`);
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.sync);
    let steps = 0;
    for (let i = 0; i < 20; i += 1) {
      const next = page.locator(`#${REVEAL.id} button`, { hasText: 'Next step' });
      if ((await next.getAttribute('aria-disabled')) === 'true') break;
      await next.focus();
      await page.keyboard.press('Enter');
      steps += 1;
      await popup.waitForFunction((want) => document.querySelector('[data-surface="script"]').getAttribute('data-revealed-steps') === String(want), steps, { timeout: 5000 });
    }
    note('every step of the staged reveal, the script shows the stage', { segment: REVEAL.segment, steps });

    await page.goto(`${base}#/${DIALOG.segment}`);
    await page.waitForFunction(() => window.teachingSpa);
    await page.locator(`#${DIALOG.id} button[aria-haspopup="dialog"]`).focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector(`#${DIALOG.id} [role="dialog"]:not([hidden])`);
    await page.keyboard.press('Escape');
    await page.waitForSelector(`#${DIALOG.id} [role="dialog"][hidden]`, { state: 'attached' });
    note('the enlarged diagram opens on Enter and closes on Escape', { segment: DIALOG.segment });

    // The way out: a reload in place left fullscreen behind (a browser ends fullscreen on navigation), so present again and exit by the control.
    const presentingNow = await page.evaluate(() => document.fullscreenElement !== null);
    if (!presentingNow) {
      await page.click('#present-start');
      await page.waitForFunction(() => document.fullscreenElement !== null);
    }
    await page.click('#present-exit');
    await page.waitForFunction(() => document.querySelector('[data-spa-root]').getAttribute('data-presentation') === 'windowed');
    await page.waitForFunction(() => document.getElementById('live-region').textContent.includes('Presentation mode off'));
    note('Exit presentation: windowed again, and said so', { live: await page.evaluate(() => document.getElementById('live-region').textContent) });
    assert.deepEqual(errors, [], 'neither window threw');
  } finally {
    await context.close();
  }
});

test('the portable file from disk: boots, presents, opens its script window, and the script follows two moves', async () => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  context.setDefaultTimeout(10_000);
  const errors = [];
  context.on('page', (p) => p.on('pageerror', (error) => errors.push(error.message)));
  try {
    const page = await context.newPage();
    await page.goto(`${pathToFileURL(PORTABLE).href}#/${IDS[0]}`);
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation && window.teachingSpa.sync);
    const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    if (ENGINE === 'chromium') {
      await page.check('#present-open-script');
      await page.click('#present-start');
    } else {
      await page.click('#present-script-open');
      await page.bringToFront();
      await page.click('#present-start');
    }
    const popup = await popupPromise;
    assert.ok(popup, 'file: the speaker script window opened');
    await popup.waitForFunction(() => document.querySelector('[data-surface="script"]')?.getAttribute('data-sync-state') === 'synchronized', undefined, { timeout: 5000 });
    const sync = await popup.evaluate(() => {
      const surface = document.querySelector('[data-surface="script"]');
      return { transport: surface.getAttribute('data-sync-transport'), origin: window.origin, protocol: location.protocol };
    });
    const latencies = [];
    for (const index of [1, 2]) {
      await page.focus('#main');
      const since = now();
      await page.keyboard.press('n');
      latencies.push(await followed(popup, index, since));
    }
    note('file: portable page presented with its script window, two moves followed', { ...sync, latenciesMs: latencies, budgetMs: BUDGET_MS });
    for (const ms of latencies) assert.ok(ms <= BUDGET_MS);
    await page.evaluate(async () => {
      if (document.fullscreenElement !== null) await document.exitFullscreen();
    });
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
});
