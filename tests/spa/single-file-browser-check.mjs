// Real-browser check of the portable single-file build (specs/005-teaching-spa.md 2.9; AC5, AC20) opened the way the presenter
// opens it: from disk, over a file: URL, with no server. The Vitest half says the page is one file with a hash-only policy;
// only a browser can say that the policy lets the page's own code run and refuses everything else, and that the inline module
// script runs at all from file: (Q8).
// Run after npm run spa:build:single (npm run spa:test:single builds first, then runs the Vitest half, then this):
//   node --test tests/spa/single-file-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browser. No dependencies are installed by this check.
//   SPA_QA_PLAYWRIGHT_MODULE  a playwright/index.mjs to use; otherwise `playwright`, then every copy in npm's npx cache
//   SPA_QA_BROWSER_TYPE       chromium (default), firefox or webkit, when that browser is already installed
//   SPA_QA_BROWSER_CHANNEL    chrome or msedge
//   SPA_QA_PORTABLE           another portable page to open (a mutation check uses it)
//
// What is real here: the file: URL, the Content-Security-Policy as the browser enforces it (a refused script is a console
// message and a page with no teachingSpa), the click on a segment link, the Present click and the script window it opens.
// Nothing is stubbed. Only the browser named by SPA_QA_BROWSER_TYPE is exercised; nothing here speaks for the other engines.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { launchBrowser } from '../../scripts/spa/lib/playwright.mjs';

const ROOT = process.cwd();
const PORTABLE = path.resolve(process.env.SPA_QA_PORTABLE || path.join(ROOT, 'workshop/spa/dist/standalone/teaching-spa.html'));
const DECK = JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/deck.json'), 'utf8')).segments;
const IDS = DECK.map((segment) => segment.id);
let browser;
let scratch;

before(async () => {
  assert.ok(existsSync(PORTABLE), `Run npm run spa:build:single first (${PORTABLE} is missing)`);
  const launched = await launchBrowser({
    engine: process.env.SPA_QA_BROWSER_TYPE || 'chromium',
    channel: process.env.SPA_QA_BROWSER_CHANNEL,
  });
  browser = launched.browser;
  console.log(`Browser: ${process.env.SPA_QA_BROWSER_TYPE || 'chromium'} ${browser.version()} (playwright: ${launched.playwright})`);
  scratch = mkdtempSync(path.join(os.tmpdir(), 'spa-11-file-'));
});

after(async () => {
  await browser?.close();
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

/** Opens `url` in a fresh context and collects every console message and page error while `run` works. */
async function withPage(url, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  context.setDefaultTimeout(10_000);
  const console_ = [];
  const errors = [];
  context.on('page', (page) => {
    page.on('console', (message) => console_.push(`${message.type()}: ${message.text()}`));
    page.on('pageerror', (error) => errors.push(error.message));
  });
  try {
    const page = await context.newPage();
    await page.goto(url);
    await run(page, { console: console_, errors, context });
  } finally {
    await context.close();
  }
}

/** The presenter options are in a panel under the bar (Setup): open it before using them. */
async function openSetup(page) {
  await page.evaluate(() => window.teachingSpa?.deck?.dismiss()); // a page opened without a module named shows its cover first
  const toggle = page.locator('#present-setup-toggle');
  if ((await toggle.count()) > 0 && (await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
}

const cspMessages = (lines) => lines.filter((line) => /content security policy|content-security-policy|refused to/i.test(line));

test('the portable page boots from a file: URL: its inline module script runs under its own policy, and nothing is refused', async () => {
  await withPage(pathToFileURL(PORTABLE).href, async (page, { console: lines, errors }) => {
    await page.waitForFunction(() => window.teachingSpa && document.querySelector('#main h1') !== null);
    const state = await page.evaluate(() => ({
      protocol: location.protocol,
      origin: window.origin,
      segment: window.teachingSpa.store.get().currentId,
      heading: document.querySelector('#main h1').textContent,
      links: document.querySelectorAll('#segment-nav a').length,
      policy: document.querySelector('head > meta:first-child').getAttribute('http-equiv'),
    }));
    assert.equal(state.protocol, 'file:');
    assert.equal(state.segment, IDS[0]);
    assert.equal(state.links, IDS.length);
    assert.equal(state.policy, 'Content-Security-Policy');
    assert.ok(state.heading.length > 0, 'the first segment is rendered');
    assert.deepEqual(cspMessages(lines), [], 'the policy refuses nothing the page does');
    assert.deepEqual(errors, []);
  });
});

test('a segment link moves the page, and the move is announced: the application works, not only loads', async () => {
  await withPage(`${pathToFileURL(PORTABLE).href}#/${IDS[0]}`, async (page, { console: lines, errors }) => {
    await page.waitForFunction(() => window.teachingSpa);
    await page.click(`#segment-nav a[href="#/${IDS[1]}"]`);
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, IDS[1]);
    await page.waitForFunction(() => document.getElementById('live-region').textContent.includes('Segment 2 of'));
    assert.equal(await page.evaluate(() => location.hash), `#/${IDS[1]}`);
    assert.deepEqual(cspMessages(lines), []);
    assert.deepEqual(errors, []);
  });
});

test('Present opens the speaker script window from the same file, and that window boots under the same policy', async () => {
  await withPage(`${pathToFileURL(PORTABLE).href}#/${IDS[0]}`, async (page, { console: lines, errors, context }) => {
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation);
    await openSetup(page);
    await page.check('#present-open-script');
    const [popup] = await Promise.all([context.waitForEvent('page'), page.click('#present-start')]);
    await popup.waitForFunction(() => document.querySelector('[data-surface="script"]') !== null);
    const surface = await popup.evaluate(() => ({
      protocol: location.protocol,
      hash: location.hash,
      policy: document.querySelector('head > meta:first-child').getAttribute('http-equiv'),
    }));
    assert.equal(surface.protocol, 'file:');
    assert.equal(surface.hash, '#/script');
    assert.equal(surface.policy, 'Content-Security-Policy');
    await page.evaluate(async () => {
      if (document.fullscreenElement !== null) await document.exitFullscreen();
    });
    assert.deepEqual(cspMessages(lines), [], 'neither window had anything refused');
    assert.deepEqual(errors, []);
  });
});

test('the policy is enforced: a script whose hash is not listed does not run (so a matching hash is what lets the page run)', async () => {
  // The built page with one more inline script, not in the policy. The page's own script still runs; the stranger does not.
  const html = readFileSync(PORTABLE, 'utf8').replace('</body>', '<script>window.__stranger = true;</script></body>');
  assert.notEqual(html, readFileSync(PORTABLE, 'utf8'));
  const file = path.join(scratch, 'stranger.html');
  writeFileSync(file, html);
  await withPage(pathToFileURL(file).href, async (page, { console: lines }) => {
    await page.waitForFunction(() => window.teachingSpa);
    assert.equal(await page.evaluate(() => window.__stranger), undefined, 'the unlisted script did not run');
    assert.ok(cspMessages(lines).length > 0, `the browser reported the refusal: ${lines.join(' | ')}`);
  });
});

test('the policy is enforced: a one-byte change to the application script stops it from running', async () => {
  const original = readFileSync(PORTABLE, 'utf8');
  const html = original.replace(/(<script type="module"[^>]*>)/, '$1;');
  assert.notEqual(html, original);
  const file = path.join(scratch, 'changed.html');
  writeFileSync(file, html);
  await withPage(pathToFileURL(file).href, async (page, { console: lines }) => {
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate(() => typeof window.teachingSpa), 'undefined', 'the changed script did not run');
    assert.ok(cspMessages(lines).length > 0, `the browser reported the refusal: ${lines.join(' | ')}`);
  });
});
