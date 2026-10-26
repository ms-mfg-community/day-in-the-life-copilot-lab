// The accessibility gate (specs/005-teaching-spa.md 2.11; AC15, AC17, AC18; child issue 10), run in a real browser against the
// BUILT bundle:
//
//   AC15  the declared checker (helpers/a11y-tool.mjs, declared in workshop/spa/docs/a11y-tool.md) runs with exactly its declared
//         selection over every route and over every interaction's opened state, and reports zero violations;
//   AC17  every interactive element's bounding box is at least 24 x 24 CSS px, or matches a selector of
//         workshop/spa/docs/target-size-exceptions.md, which names the SC 2.5.8 exception it relies on;
//   AC18  under an emulated prefers-reduced-motion: reduce, no element has a non-zero computed animation or transition
//         duration, and no content auto-advances.
//
// Run after npm run spa:build (npm run spa:test:a11y builds first, then runs this, then the Vitest half):
//   node --test tests/spa/a11y-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browser. axe-core is a devDependency and is injected into the page.
//   SPA_QA_PLAYWRIGHT_MODULE  a playwright/index.mjs to use; otherwise `playwright`, then every copy in npm's npx cache
//   SPA_QA_BROWSER_TYPE       chromium (default), firefox or webkit, when that browser is already installed
//   SPA_QA_BROWSER_CHANNEL    chrome or msedge
//   SPA_QA_DIST               another build to serve (a mutation check uses it)
//
// The routes are every segment of the deck and the speaker script. The opened states are one per interaction of the inventory,
// opened the way a presenter opens it (OPENERS), plus the shell's shortcuts dialog. Nothing about the page is arranged for the
// checker: it sees the built page as a browser renders it, with layout and computed style, which is why this is not a Vitest file.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { launchBrowser } from '../../scripts/spa/lib/playwright.mjs';
import { A11Y_TOOL, AXE_SCRIPT } from './helpers/a11y-tool.mjs';

const ROOT = process.cwd();
const DIST = path.resolve(process.env.SPA_QA_DIST || path.join(ROOT, 'workshop/spa/dist'));
const read = (relative) => readFileSync(path.join(ROOT, relative), 'utf8');
const IDS = JSON.parse(read('workshop/spa/content/deck.json')).segments.map((segment) => segment.id);
const INVENTORY = JSON.parse(read('workshop/spa/content/interactions.json')).interactions;
const EXCEPTIONS_DOC = 'workshop/spa/docs/target-size-exceptions.md';
const ENGINE = process.env.SPA_QA_BROWSER_TYPE || 'chromium';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const MIN_TARGET = 24;
const SETTLE_MS = 1500;

/** What a user can operate: the interactive elements AC17 is about. tabindex="-1" marks a scripting target, not a user's. */
const TARGETS = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="slider"], [role="tab"], [role="button"], [role="checkbox"]';

let browser;
let server;
let base;

/** The exceptions document's table: one row per selector, with the SC 2.5.8 exception it names. */
function readExceptions() {
  const rows = read(EXCEPTIONS_DOC)
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim()));
  const [header, delimiter, ...data] = rows;
  assert.deepEqual(header, ['Selector', 'Exception', 'Why'], `${EXCEPTIONS_DOC}: the table has the columns Selector, Exception, Why`);
  assert.ok(delimiter.every((cell) => /^:?-+:?$/.test(cell)));
  const exceptions = data.map(([selector, exception, why]) => ({ selector: selector.replace(/^`|`$/g, ''), exception, why }));
  const named = new Set(['Spacing', 'Equivalent', 'Inline', 'User agent control', 'Essential']);
  for (const row of exceptions) assert.ok(named.has(row.exception), `${EXCEPTIONS_DOC}: ${JSON.stringify(row.exception)} is not one of the five exceptions of SC 2.5.8`);
  return exceptions;
}

const EXCEPTIONS = readExceptions();

before(async () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'Run npm run spa:build first');
  const launched = await launchBrowser({ engine: ENGINE, channel: process.env.SPA_QA_BROWSER_CHANNEL });
  browser = launched.browser;
  console.log(`Browser: ${ENGINE} ${browser.version()} (playwright: ${launched.playwright}); checker: ${A11Y_TOOL.tool} ${A11Y_TOOL.version}, runOnly ${JSON.stringify(A11Y_TOOL.runOnly)}`);
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

async function withContext(options, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ...options });
  context.setDefaultTimeout(10_000);
  const errors = [];
  context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  try {
    await run(context);
    assert.deepEqual(errors, [], 'the page must not throw');
  } finally {
    await context.close();
  }
}

async function open(context, hash) {
  const page = await context.newPage();
  await page.goto(`${base}${hash}`);
  await page.waitForFunction(() => window.teachingSpa);
  await page.addScriptTag({ path: AXE_SCRIPT });
  return page;
}

/** The declared checker with the declared selection, and nothing else: `A11Y_TOOL.runOnly` is handed to axe.run unchanged. */
async function runChecker(page) {
  const results = await page.evaluate((runOnly) => window.axe.run(document, { runOnly }), A11Y_TOOL.runOnly);
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => ({ target: node.target.join(' '), summary: node.failureSummary })),
  }));
}

/** Every visible interactive element with its box, and the exception selectors it matches. Elements inside an inert subtree are out of reach and not targets. */
async function measureTargets(page) {
  return page.evaluate(
    ({ selector, exceptions }) => {
      const out = [];
      for (const element of document.querySelectorAll(selector)) {
        if (element.closest('[inert]') !== null) continue;
        const rects = element.getClientRects();
        if (rects.length === 0) continue;
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden') continue;
        const box = element.getBoundingClientRect();
        out.push({
          tag: element.localName,
          id: element.id || element.closest('[id]')?.id || '',
          role: element.getAttribute('role') ?? '',
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40),
          width: box.width,
          height: box.height,
          exceptions: exceptions.filter((candidate) => element.matches(candidate)),
        });
      }
      return out;
    },
    { selector: TARGETS, exceptions: EXCEPTIONS.map((row) => row.selector) },
  );
}

/** AC15 and AC17 over the page as it is now. Returns what it saw, for the report. */
async function auditState(page, label) {
  const violations = await runChecker(page);
  assert.deepEqual(violations, [], `${label}: ${A11Y_TOOL.tool} reports violations:\n${JSON.stringify(violations, null, 2)}`);
  const targets = await measureTargets(page);
  assert.ok(targets.length > 0, `${label}: the page has interactive elements`);
  const undersized = targets.filter((target) => target.width < MIN_TARGET || target.height < MIN_TARGET);
  const unexcused = undersized.filter((target) => target.exceptions.length === 0);
  assert.deepEqual(unexcused, [], `${label}: targets under ${MIN_TARGET}x${MIN_TARGET} CSS px that no row of ${EXCEPTIONS_DOC} covers:\n${JSON.stringify(unexcused, null, 2)}`);
  return { label, targets: targets.length, excused: undersized.length };
}

/** How a presenter opens each pattern of the inventory: the state the checker must also pass. */
const OPENERS = {
  tabs: async (page, entry) => {
    await page.locator(`#${entry.id} [role="tab"]`).last().focus(); // automatic activation (F96)
    await page.waitForFunction((id) => document.querySelectorAll(`#${id} [role="tab"][aria-selected="true"]`).length === 1, entry.id);
  },
  accordion: async (page, entry) => {
    for (let i = 0; i < 20; i += 1) {
      const collapsed = page.locator(`#${entry.id} button[aria-expanded="false"]`);
      if ((await collapsed.count()) === 0) break;
      await collapsed.first().click();
    }
  },
  dialog: async (page, entry) => {
    await page.locator(`#${entry.id} button[aria-haspopup="dialog"]`).click();
    await page.waitForSelector(`#${entry.id} [role="dialog"]:not([hidden])`);
  },
  'staged-reveal': async (page, entry) => {
    for (let i = 0; i < 20; i += 1) {
      const next = page.locator(`#${entry.id} button`, { hasText: 'Next step' });
      if ((await next.getAttribute('aria-disabled')) === 'true') break;
      await next.click();
    }
  },
  'disclosure-popover': async (page, entry) => {
    await page.locator(`#${entry.id} button`).first().focus();
    await page.waitForSelector(`#${entry.id} [aria-expanded="true"]`);
  },
  'parameter-chart': async (page, entry) => {
    await page.locator(`#${entry.id} button`, { hasText: /^Increase/ }).first().click();
  },
  'node-diagram': async (page, entry) => {
    await page.locator(`#${entry.id} button`).nth(1).click();
    await page.waitForSelector(`#${entry.id} button[aria-pressed="true"]`);
  },
  carousel: async (page, entry) => {
    await page.locator(`#${entry.id} button`, { hasText: 'Next slide' }).click();
  },
  'segment-timer': async (page, entry) => {
    await page.locator(`#${entry.id} button`, { hasText: /^Start$/ }).click();
    await page.waitForFunction((id) => document.querySelector(`#${id}`).textContent.includes('Running'), entry.id);
  },
};

describe('AC15 and AC17: the declared checker over every route and every opened state, and every target 24 x 24 or declared', () => {
  for (const id of IDS) {
    test(`route #/${id} at rest`, async () => {
      await withContext({}, async (context) => {
        const page = await open(context, `#/${id}`);
        console.log(JSON.stringify(await auditState(page, `#/${id}`)));
      });
    });
    for (const entry of INVENTORY.filter((candidate) => candidate.segment === id)) {
      test(`route #/${id} with ${entry.id} (${entry.pattern}) opened`, async () => {
        assert.ok(OPENERS[entry.pattern], `no opener for the pattern ${entry.pattern}: every pattern of the inventory needs one here`);
        await withContext({}, async (context) => {
          const page = await open(context, `#/${id}`);
          await OPENERS[entry.pattern](page, entry);
          console.log(JSON.stringify(await auditState(page, `#/${id} + ${entry.id}`)));
        });
      });
    }
  }

  test('route #/script (the speaker script surface) at rest', async () => {
    await withContext({}, async (context) => {
      const page = await open(context, '#/script');
      await page.waitForSelector('[data-surface="script"]');
      console.log(JSON.stringify(await auditState(page, '#/script')));
    });
  });

  test(`route #/${IDS[0]} with the shortcuts dialog opened`, async () => {
    await withContext({}, async (context) => {
      const page = await open(context, `#/${IDS[0]}`);
      await page.click('#shortcut-help-open');
      await page.waitForSelector('#shortcut-help:not([hidden])');
      console.log(JSON.stringify(await auditState(page, `#/${IDS[0]} + shortcuts dialog`)));
    });
  });

  test('every pattern of the inventory has an opener, so no state is skipped', () => {
    for (const pattern of new Set(INVENTORY.map((entry) => entry.pattern))) assert.ok(OPENERS[pattern], pattern);
  });
});

/** The computed animation and transition durations of every element, as the engine reports them, plus the focused element's after a Tab. */
async function durations(page) {
  await page.keyboard.press('Tab'); // the first stop takes :focus-visible, where the one transition of the stylesheet applies
  return page.evaluate(() => {
    const out = [];
    for (const element of document.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      const tokens = [...style.animationDuration.split(','), ...style.transitionDuration.split(',')].map((token) => token.trim());
      if (tokens.some((token) => token !== '0s' && token !== '0ms')) {
        out.push({ tag: element.localName, id: element.id, focused: element === document.activeElement, animation: style.animationDuration, transition: style.transitionDuration });
      }
    }
    return out;
  });
}

const snapshot = (page) =>
  page.evaluate(() => JSON.stringify({ hash: location.hash, main: document.getElementById('main').innerHTML, store: window.teachingSpa.store.get() }));

describe('AC18: under prefers-reduced-motion: reduce, no non-zero animation or transition duration, and nothing auto-advances', () => {
  for (const hash of [...IDS.map((id) => `#/${id}`), '#/script']) {
    test(`route ${hash}`, async () => {
      await withContext({ reducedMotion: 'reduce' }, async (context) => {
        const page = await open(context, hash);
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true, 'the preference is emulated');
        assert.deepEqual(await durations(page), [], `${hash}: elements with a non-zero duration under reduce`);
        const before = await snapshot(page);
        await page.waitForTimeout(SETTLE_MS);
        assert.equal(await snapshot(page), before, `${hash}: the content changed by itself within ${SETTLE_MS} ms`);
      });
    });
  }

  test('control: under no-preference the stylesheet does transition the focused control, so the check above can see motion', async () => {
    await withContext({ reducedMotion: 'no-preference' }, async (context) => {
      const page = await open(context, `#/${IDS[0]}`);
      const moving = await durations(page);
      assert.ok(moving.some((element) => element.focused && element.transition !== '0s'), `the focused control has a transition under no-preference: ${JSON.stringify(moving)}`);
    });
  });
});
