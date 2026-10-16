// Real-browser regression for the native scroll restoration that a hashchange-only DOM double cannot model.
// Run after npm run spa:build:
//   node --test tests/spa/qa-shell-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browser. No dependencies are installed by this check.
// SPA_QA_PLAYWRIGHT_MODULE can name playwright/index.mjs; SPA_QA_BROWSER_CHANNEL can select chrome or msedge.
// SPA_QA_BROWSER_TYPE can select chromium (default), firefox, or webkit when that browser is already installed.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
// A mutation check can serve an owned build fixture without changing product files or the real dist.
const DIST = path.resolve(process.env.SPA_QA_DIST || path.join(ROOT, 'workshop/spa/dist'));
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
  const automation = await import(pathToFileURL(playwrightModule()).href);
  const engine = process.env.SPA_QA_BROWSER_TYPE || 'chromium';
  assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), `Unsupported browser type: ${engine}`);
  const channel = process.env.SPA_QA_BROWSER_CHANNEL;
  browser = await automation[engine].launch({ headless: true, ...(channel ? { channel } : {}) });
  console.log(`Browser: ${engine} ${await browser.version()}`);
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
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(5000);
  try {
    // All content is local; do not follow any external asset a curriculum document may reference.
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort(),
    );
    await page.goto(`${base}#/${FIRST}`);
    await page.waitForFunction(() => window.teachingSpa);
    await run(page);
    assert.deepEqual(errors, [], 'The shell must not throw while handling navigation');
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

for (const invalid of ['#/no-such-segment', '#/%E0%A4%A', '#/constructor']) {
  test(`Unknown route recovery preserves Back and Forward: ${invalid}`, async () => {
    await withPage(async (page) => {
      await page.evaluate((id) => { location.hash = `#/${id}`; }, SECOND);
      await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, SECOND);
      const content = await page.locator('#main > div').elementHandle();
      await page.evaluate((hash) => { location.hash = hash; }, invalid);
      await page.waitForFunction(
        (id) => location.hash === `#/${id}` && document.getElementById('live-region').textContent.includes('Unknown segment'),
        SECOND,
      );
      assert.equal(await content.evaluate((node) => node.isConnected), true, 'An invalid route must not remount content');

      // A correction can replace the invalid entry with the current segment, leaving one duplicate. It must not push
      // another entry every time Back visits the invalid route. Use bounded traversal, never an unbounded retry.
      await page.goBack();
      await settled(page);
      await page.goBack();
      const back = await readPosition(page);
      assert.equal(back.id, FIRST, 'Two Back presses must leave the corrected entry and reach the earlier segment');
      assert.equal(back.hash, `#/${FIRST}`);
      await page.goForward();
      await settled(page);
      await page.goForward();
      const forward = await readPosition(page);
      assert.equal(forward.id, SECOND);
      assert.equal(forward.hash, `#/${SECOND}`, 'Correction must preserve the forward history');
      assert.equal(new URL(page.url()).search, '?deck=qa');
    });
  });
}

test('Keyboard segment navigation keeps the activated link focused and the next Tab usable', async () => {
  await withPage(async (page) => {
    const secondLink = await page.locator(`#segment-nav a[href="#/${SECOND}"]`).elementHandle();
    await page.keyboard.press('Tab'); // skip link
    await page.keyboard.press('Tab'); // first segment
    await page.keyboard.press('Tab'); // second segment
    assert.equal(await secondLink.evaluate((node) => node === document.activeElement), true);
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.keyboard.press('Enter');
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, SECOND);
    assert.equal(await secondLink.evaluate((node) => node.isConnected && node === document.activeElement), true);
    assert.equal((await readPosition(page)).y, 0);
    assert.equal(await page.locator('#segment-nav [aria-current="page"]').count(), 1);
    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement === document.getElementById('segment-nav').children[2]),
      true,
      'The keyboard must continue from the activated link rather than restart at the skip link',
    );
  });
});

test('A real in-content segment link moves removed focus to main and opens the destination at the top', async () => {
  await withPage(async (page) => {
    await page.evaluate(() => { location.hash = '#/m6-a2a-tmux'; });
    await page.waitForFunction(() => window.teachingSpa.store.get().currentId === 'm6-a2a-tmux');
    const link = page.locator('#main a[href="#/m5b-gh-extensions"]');
    assert.equal(await link.count(), 1, 'Use a link from the compiled curriculum, not invented presentation prose');
    await link.focus();
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.teachingSpa.store.get().currentId === 'm5b-gh-extensions');
    const actual = await readPosition(page);
    assert.equal(actual.hash, '#/m5b-gh-extensions');
    assert.equal(actual.focus, 'main');
    assert.equal(actual.y, 0);
  });
});

test('Parameter-only updates preserve mounted content, focus and scroll and survive a round trip', async () => {
  await withPage(async (page) => {
    await page.evaluate((id) => { location.hash = `#/${id}`; }, SECOND);
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, SECOND);
    const content = await page.locator('#main > div').elementHandle();
    const link = page.locator('#main a').first();
    await link.focus();
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.evaluate((id) => {
      window.teachingSpa.store.update(id, (current) => ({
        ...current, revealedSteps: 2, parameters: { qaBudget: 42 },
      }));
    }, SECOND);
    assert.equal(await content.evaluate((node) => node.isConnected), true, 'Updating parameters is not a segment transition');
    assert.equal(await link.evaluate((node) => node === document.activeElement), true);
    assert.equal((await readPosition(page)).y, 900);
    for (const id of [FIRST, SECOND]) {
      await page.evaluate((next) => window.teachingSpa.store.navigate(next), id);
      await page.waitForFunction((next) => location.hash === `#/${next}`, id);
    }
    assert.deepEqual(
      await page.evaluate((id) => window.teachingSpa.store.get().segments[id], SECOND),
      { revealedSteps: 2, parameters: { qaBudget: 42 } },
    );
  });
});

test('Keyboard skip activation keeps the non-first route and history entry intact across reload', async () => {
  await withPage(async (page) => {
    await page.evaluate((id) => { location.hash = `#/${id}`; }, SECOND);
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, SECOND);
    const before = await page.evaluate(() => ({ href: location.href, length: history.length }));
    await page.locator('[data-skip]').focus();
    await page.keyboard.press('Enter');
    const actual = await readPosition(page);
    assert.equal(actual.focus, 'main');
    assert.equal(await page.evaluate(() => location.href), before.href, 'The skip link must never replace the segment route');
    assert.equal(await page.evaluate(() => history.length), before.length, 'The skip link must not add a history entry');
    assert.ok(Math.abs(await page.locator('#main').evaluate((node) => node.getBoundingClientRect().top)) <= 1);
    await page.reload();
    await page.waitForFunction(() => window.teachingSpa);
    assert.equal((await readPosition(page)).id, SECOND);
  });
});

test('Repeated in-page anchors scroll the real heading but retain the non-first route across reload', async () => {
  await withPage(async (page) => {
    await page.evaluate((id) => { location.hash = `#/${id}`; }, SECOND);
    await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, SECOND);
    const content = await page.locator('#main > div').elementHandle();
    const headingId = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('#main [id^="user-content-"]')].filter(
        (node) => node.offsetTop > 200 && node.offsetTop < document.documentElement.scrollHeight - innerHeight,
      );
      const heading = candidates[Math.floor(candidates.length / 2)];
      if (!heading) throw new Error('The real segment needs a scrollable heading for the anchor fixture');
      const link = document.createElement('a');
      link.id = 'qa-anchor';
      link.href = `#${heading.id.slice('user-content-'.length)}`;
      link.textContent = 'QA anchor';
      document.getElementById('main').append(link);
      return heading.id;
    });
    const before = new URL(page.url());
    for (let activation = 0; activation < 2; activation++) {
      await page.locator('#qa-anchor').focus();
      await page.keyboard.press('Enter');
      await settled(page);
      const actual = await readPosition(page);
      assert.equal(actual.hash, `#/${SECOND}`, 'An in-page anchor must not become the bookmarkable segment route');
      assert.equal(actual.id, SECOND);
      assert.equal(await content.evaluate((node) => node.isConnected), true);
      const top = await page.locator(`[id="${headingId}"]`).evaluate((node) => node.getBoundingClientRect().top);
      assert.ok(Math.abs(top) <= 1, `The content heading must still be reached after route settlement (top=${top})`);
      assert.equal(new URL(page.url()).pathname, before.pathname);
      assert.equal(new URL(page.url()).search, before.search);
    }
    await page.reload();
    await page.waitForFunction(() => window.teachingSpa);
    assert.equal((await readPosition(page)).id, SECOND);
  });
});

test('An encoded shell skip fragment cannot be stolen by a content heading named Main', async () => {
  await withPage(async (page) => {
    await page.evaluate(() => {
      const heading = document.createElement('h2');
      heading.id = 'user-content-main';
      heading.textContent = 'QA heading';
      document.getElementById('main').append(heading);
      location.hash = '#%6Dain';
    });
    await page.waitForFunction((id) => location.hash === `#/${id}`, FIRST);
    await settled(page);
    assert.equal((await readPosition(page)).focus, 'main');
    const top = await page.locator('#main').evaluate((node) => node.getBoundingClientRect().top);
    assert.ok(Math.abs(top) <= 1, `Decoded #main must reach the landmark, not user-content-main (top=${top})`);
  });
});
