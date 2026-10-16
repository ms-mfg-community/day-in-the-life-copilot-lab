// Real-browser regression for the native scroll restoration that a hashchange-only DOM double cannot model.
// Run after npm run spa:build:
//   node --test tests/spa/qa-shell-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browser. No dependencies are installed by this check.
// SPA_QA_PLAYWRIGHT_MODULE can name playwright/index.mjs; SPA_QA_BROWSER_CHANNEL can select chrome or msedge.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'workshop/spa/dist');
const FIRST = 'm1-extensibility-architecture';
const SECOND = 'm2-mcp';
const require = createRequire(import.meta.url);
let browser;
let server;
let base;

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

before(async () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'Run npm run spa:build first');
  const { chromium } = await import(pathToFileURL(playwrightModule()).href);
  const channel = process.env.SPA_QA_BROWSER_CHANNEL;
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  console.log(`Browser: ${await browser.version()}`);
  server = http.createServer((request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const relative = pathname.slice('/qa/nested/'.length);
      const file = path.resolve(DIST, relative || 'index.html');
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
  base = `http://127.0.0.1:${server.address().port}/qa/nested/index.html?deck=qa`;
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

const settled = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

async function readPosition(page) {
  await settled(page);
  return page.evaluate(() => ({
    id: window.teachingSpa.store.get().currentId,
    hash: location.hash,
    y: scrollY,
    focus: document.activeElement?.id,
  }));
}

async function withPage(run) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    // All content is local; do not follow any external asset a curriculum document may reference.
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
    );
    await page.goto(`${base}#/${FIRST}`);
    await page.waitForFunction(() => window.teachingSpa);
    await run(page);
  } finally {
    await page.close();
  }
}

async function withHistory(run) {
  await withPage(async (page) => {
    await page.evaluate(() => window.scrollTo(0, 900));
    assert.equal((await readPosition(page)).y, 900, 'The first real segment must be scrollable');
    await page.evaluate((id) => { location.hash = `#/${id}`; }, SECOND);
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, SECOND);
    assert.equal((await readPosition(page)).y, 0, 'The outgoing transition must work before testing history');
    await page.evaluate(() => window.scrollTo(0, 1300));
    assert.equal((await readPosition(page)).y, 1300, 'The second real segment must be scrollable');
    await run(page);
  });
}

test('Back opens the previous segment at the top after native history restoration', async () => {
  await withHistory(async (page) => {
    await page.goBack();
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, FIRST);
    const actual = await readPosition(page);
    console.log('Back:', actual);
    assert.equal(actual.hash, `#/${FIRST}`);
    assert.equal(actual.focus, 'main');
    assert.equal(actual.y, 0, 'Native restoration must not undo the segment transition scroll-to-top');
  });
});

test('Forward opens the next segment at the top after native history restoration', async () => {
  await withHistory(async (page) => {
    await page.goBack();
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, FIRST);
    await settled(page);
    await page.goForward();
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, SECOND);
    const actual = await readPosition(page);
    console.log('Forward:', actual);
    assert.equal(actual.hash, `#/${SECOND}`);
    assert.equal(actual.focus, 'main');
    assert.equal(actual.y, 0, 'Native restoration must not undo the segment transition scroll-to-top');
  });
});

test('Shell #main remains a skip target when content has a sanitized Main heading', async () => {
  await withPage(async (page) => {
    await page.evaluate(() => {
      // This is the DOM the existing sanitizer produces for a valid "# Main" content heading.
      const heading = document.createElement('h2');
      heading.id = 'user-content-main';
      heading.textContent = 'Main';
      document.getElementById('main').append(heading);
      location.hash = '#main';
    });
    await page.waitForFunction(() => location.hash === '#/m1-extensibility-architecture');
    await settled(page);
    const actual = await page.evaluate(() => ({
      hash: location.hash,
      focus: document.activeElement?.id,
      mainTop: document.getElementById('main').getBoundingClientRect().top,
      headingTop: document.getElementById('user-content-main').getBoundingClientRect().top,
    }));
    console.log('Reserved #main:', actual);
    assert.equal(actual.focus, 'main');
    assert.equal(actual.hash, `#/${FIRST}`);
    assert.equal(Math.round(actual.mainTop), 0, 'A deferred content rewrite must not override the shell skip scroll');
  });
});
