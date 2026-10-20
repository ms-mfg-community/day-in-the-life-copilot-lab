// Real-browser check of presentation mode (specs/005-teaching-spa.md sections 2.5 and 2.6; AC7, AC8) against the BUILT
// bundle, because a fake DOM cannot say what a browser does with a real click and a real fullscreen request.
// Run after npm run spa:build (npm run spa:test:present builds first, then runs the Vitest half, then this):
//   node --test tests/spa/presentation-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browser. No dependencies are installed by this check.
//   SPA_QA_PLAYWRIGHT_MODULE  a playwright/index.mjs to use; otherwise `playwright`, then every copy in npm's npx cache,
//                             in turn, until one of them can launch the browser
//   SPA_QA_BROWSER_TYPE       chromium (default), firefox or webkit, when that browser is already installed
//   SPA_QA_BROWSER_CHANNEL    chrome or msedge
//   SPA_QA_DIST               another build to serve (a mutation check uses it)
//
// What is real here: the click (a trusted input event, so it carries the user activation requestFullscreen() needs), the
// fullscreen request and its fullscreenchange, document.exitFullscreen(), the page's events and focus. What is STUBBED, and
// named so in each test: a refusal of the fullscreen request, window.open, keyboard.lock, wakeLock, getScreenDetails and
// document.fullscreenEnabled === false, because a headless browser cannot be made to refuse them or to have two monitors.
// Only the browser named by SPA_QA_BROWSER_TYPE is exercised; nothing here speaks for the other engines.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = path.resolve(process.env.SPA_QA_DIST || path.join(ROOT, 'workshop/spa/dist'));
const FIRST = 'm1-extensibility-architecture';
const SECOND = 'm2-mcp';
const require = createRequire(import.meta.url);
let browser;
let server;
let base;

function playwrightCandidates() {
  if (process.env.SPA_QA_PLAYWRIGHT_MODULE) return [process.env.SPA_QA_PLAYWRIGHT_MODULE];
  const found = [];
  try {
    found.push(require.resolve('playwright'));
  } catch {
    // not installed next to the repository; the npx cache may hold one
  }
  const cache = process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'npm-cache/_npx') : path.join(os.homedir(), '.npm/_npx');
  for (const entry of existsSync(cache) ? readdirSync(cache) : []) {
    const module = path.join(cache, entry, 'node_modules/playwright/index.mjs');
    if (existsSync(module)) found.push(module);
  }
  return found;
}

// A cached Playwright whose browser revision is not installed fails here, so each copy is tried until one launches.
async function launch() {
  const engine = process.env.SPA_QA_BROWSER_TYPE || 'chromium';
  assert.ok(['chromium', 'firefox', 'webkit'].includes(engine), `Unsupported browser type: ${engine}`);
  const channel = process.env.SPA_QA_BROWSER_CHANNEL;
  const failures = [];
  for (const candidate of playwrightCandidates()) {
    try {
      const imported = await import(pathToFileURL(candidate).href);
      const launcher = (imported[engine] ?? imported.default?.[engine]);
      const launched = await launcher.launch({ headless: true, ...(channel ? { channel } : {}) });
      console.log(`Browser: ${engine} ${await launched.version()} (playwright: ${candidate})`);
      return launched;
    } catch (error) {
      failures.push(`${candidate}: ${String(error?.message ?? error).split('\n')[0]}`);
    }
  }
  throw new Error(`No Playwright that can launch ${engine} was found; set SPA_QA_PLAYWRIGHT_MODULE.\n${failures.join('\n')}`);
}

before(async () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'Run npm run spa:build first');
  browser = await launch();
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
  // 127.0.0.1 is a secure context, as http://localhost is (the specification measures on localhost, Q2).
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}/qa/nested/index.html?deck=qa`;
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

// ---------------------------------------------------------------------------------------------------------------------
// The page: instrumented before the shell boots, because the controller feature-detects when it mounts

/**
 * Runs in the page before any script of it. Records the calls that matter in window.__log, in order, and stubs only what
 * `config` asks to stub. A fullscreen request that is not stubbed goes to the browser.
 */
function instrument(config) {
  const log = (window.__log = []);
  window.__fullscreenRequests = [];
  window.__openCalls = [];
  window.__lockCalls = [];
  window.__sentinels = [];
  window.__visible = true;

  // Fullscreen: a recording wrapper; `real` goes through to the browser
  const realRequest = Element.prototype.requestFullscreen;
  Element.prototype.requestFullscreen = function requestFullscreen(...args) {
    log.push('requestFullscreen');
    const options = args[0];
    window.__fullscreenRequests.push({
      target: this.getAttribute('data-spa-root') === 'presentation' ? 'root' : this.localName,
      screen: options && options.screen ? options.screen.label : null,
      argumentCount: args.length,
    });
    if (config.fullscreen === 'reject' || config.fullscreen === 'reject-and-event') {
      if (config.fullscreen === 'reject-and-event') queueMicrotask(() => this.dispatchEvent(new Event('fullscreenerror', { bubbles: true })));
      return Promise.reject(new TypeError('Fullscreen request denied (stub)'));
    }
    if (config.fullscreen === 'error-event') {
      queueMicrotask(() => this.dispatchEvent(new Event('fullscreenerror', { bubbles: true })));
      return undefined;
    }
    // a stub ScreenDetailed is not one the browser would accept, so the browser is asked for the plain request
    return options && options.screen ? realRequest.call(this) : realRequest.apply(this, args);
  };
  const realExit = Document.prototype.exitFullscreen;
  window.__realExitFullscreen = () => realExit.call(document); // the test's own way out: not the application's, so not logged
  Document.prototype.exitFullscreen = function exitFullscreen() {
    log.push('exitFullscreen');
    return realExit.call(this);
  };
  if (config.fullscreenEnabled === false) Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get: () => false });

  // The speaker window
  window.open = (...args) => {
    log.push('open');
    window.__openCalls.push(args);
    return config.popupBlocked ? null : { closed: false };
  };

  // Keyboard Lock
  if (config.keyboard === 'absent') Object.defineProperty(Navigator.prototype, 'keyboard', { configurable: true, get: () => undefined });
  else {
    Object.defineProperty(Navigator.prototype, 'keyboard', {
      configurable: true,
      get: () => ({
        lock: async (codes) => {
          log.push('lock');
          window.__lockCalls.push(codes);
          if (config.keyboard === 'reject') throw new DOMException('Not granted (stub)', 'InvalidStateError');
        },
        unlock: () => void log.push('unlock'),
      }),
    });
  }

  // Screen Wake Lock, and the visibility the page reports
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (window.__visible ? 'visible' : 'hidden') });
  if (config.wakeLock === 'absent') Object.defineProperty(Navigator.prototype, 'wakeLock', { configurable: true, get: () => undefined });
  else {
    Object.defineProperty(Navigator.prototype, 'wakeLock', {
      configurable: true,
      get: () => ({
        request: async (type) => {
          log.push(`wakeLock.request:${type}`);
          if (config.wakeLock === 'reject') throw new DOMException('Not allowed (stub)', 'NotAllowedError');
          const sentinel = new EventTarget();
          sentinel.released = false;
          sentinel.release = async () => {
            log.push('wakeLock.release');
            if (!sentinel.released) {
              sentinel.released = true;
              sentinel.dispatchEvent(new Event('release'));
            }
          };
          window.__sentinels.push(sentinel);
          return sentinel;
        },
      }),
    });
  }

  // Window Management
  if (config.screens === 'stub' || config.screens === 'reject') {
    window.getScreenDetails = async () => {
      log.push('getScreenDetails');
      if (config.screens === 'reject') throw new DOMException('Permission denied (stub)', 'NotAllowedError');
      return {
        screens: [
          { label: 'Laptop display', width: 1920, height: 1080, isPrimary: true },
          { label: 'Projector', width: 1280, height: 720, isPrimary: false },
        ],
      };
    };
  } else {
    Object.defineProperty(window, 'getScreenDetails', { configurable: true, value: undefined });
  }
}

const DEFAULTS = {
  fullscreen: 'real', // 'real' | 'reject' | 'reject-and-event' | 'error-event'
  fullscreenEnabled: true,
  popupBlocked: false,
  keyboard: 'stub', // 'stub' | 'absent' | 'reject'
  wakeLock: 'stub', // 'stub' | 'absent' | 'reject'
  screens: 'absent', // 'absent' | 'stub' | 'reject'
};

async function withPage(overrides, run) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.setDefaultTimeout(5000);
  try {
    // All content is local; do not follow any external asset a curriculum document may reference.
    await page.route('**/*', (route) => (new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort()));
    await page.addInitScript(instrument, { ...DEFAULTS, ...overrides });
    await page.goto(`${base}#/${FIRST}`);
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation);
    await run(page);
    assert.deepEqual(errors, [], 'Presentation mode must not throw, nor leave a rejection unhandled');
  } finally {
    await page.close();
  }
}

const settled = (page) => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const log = (page) => page.evaluate(() => window.__log);
const liveRegion = (page) => page.evaluate(() => document.getElementById('live-region').textContent);
const waitForLive = (page, pattern) =>
  page.waitForFunction(({ source, flags }) => new RegExp(source, flags).test(document.getElementById('live-region').textContent), {
    source: pattern.source,
    flags: pattern.flags,
  });
const waitForFullscreen = (page, present) =>
  page.waitForFunction((expected) => (document.fullscreenElement !== null) === expected, present);
const state = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('[data-spa-root="presentation"]');
    const shown = (id) => {
      const element = document.getElementById(id);
      return element !== null && !element.hidden && element.getClientRects().length > 0;
    };
    return {
      mode: root.getAttribute('data-presentation'),
      fullscreen: document.fullscreenElement === root,
      present: shown('present-start'),
      exit: shown('present-exit'),
      id: window.teachingSpa.store.get().currentId,
      hash: location.hash,
    };
  });
const goTo = async (page, id) => {
  await page.evaluate((target) => {
    location.hash = `#/${target}`;
  }, id);
  await page.waitForFunction((target) => window.teachingSpa.store.get().currentId === target, id);
  await settled(page);
};

// ---------------------------------------------------------------------------------------------------------------------

test('the built shell has one presentation root that holds the landmarks, the controls and the live region', async () => {
  await withPage({}, async (page) => {
    const facts = await page.evaluate(() => {
      const roots = [...document.querySelectorAll('[data-spa-root="presentation"]')];
      const root = roots[0];
      return {
        roots: roots.length,
        inside: ['a[data-skip]', 'nav#segment-nav', 'main#main', '#presentation-controls', '#live-region', '#present-start'].map((selector) => root.querySelector(selector) !== null),
        script: [...document.scripts].map((script) => root.contains(script)),
        mode: root.getAttribute('data-presentation'),
        start: { disabled: document.getElementById('present-start').disabled },
        keyboardLock: document.getElementById('present-keyboard-lock').checked,
        openScript: document.getElementById('present-open-script').checked,
        guidance: document.getElementById('present-guidance').textContent,
      };
    });
    assert.equal(facts.roots, 1);
    assert.deepEqual(facts.inside, [true, true, true, true, true, true]);
    assert.ok(facts.script.length > 0 && facts.script.every((inside) => inside === false), 'the module script stays outside the root');
    assert.equal(facts.mode, 'windowed');
    assert.equal(facts.start.disabled, false);
    assert.equal(facts.keyboardLock, false, 'keyboard lock is off until the presenter turns it on');
    assert.equal(facts.openScript, false);
    assert.match(facts.guidance, /\bEsc\b/);
    assert.match(facts.guidance, /\bF11\b/);
  });
});

test('AC7: a real click on Present puts the one [data-spa-root="presentation"] element into fullscreen', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start'); // a trusted click: it carries the user activation that requestFullscreen() consumes
    await waitForFullscreen(page, true);
    const facts = await page.evaluate(() => {
      const roots = document.querySelectorAll('[data-spa-root="presentation"]');
      return {
        roots: roots.length,
        isFullscreenElement: document.fullscreenElement === roots[0],
        requests: window.__fullscreenRequests,
        main: roots[0].contains(document.getElementById('main')),
        live: roots[0].contains(document.getElementById('live-region')),
      };
    });
    assert.equal(facts.roots, 1);
    assert.equal(facts.isFullscreenElement, true);
    assert.deepEqual(
      facts.requests.map((request) => request.target),
      ['root'],
      'requestFullscreen() is called once, on the presentation root and on no other element',
    );
    assert.equal(facts.requests[0].argumentCount, 0, 'no screen was chosen, so none is asked for');
    assert.ok(facts.main && facts.live, 'the slide and the live region are inside what is fullscreen');
    await waitForLive(page, /Presentation mode on/);
    const now = await state(page);
    assert.equal(now.mode, 'presenting');
    assert.equal(now.present, false);
    assert.equal(now.exit, true);
    assert.match(await liveRegion(page), /Esc/);
  });
});

test('AC7 from the keyboard: Enter on Present enters fullscreen as well', async () => {
  await withPage({}, async (page) => {
    await page.focus('#present-start');
    await page.keyboard.press('Enter');
    await waitForFullscreen(page, true);
    assert.equal((await state(page)).mode, 'presenting');
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.id), 'present-exit');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// What the presenter sees. A fullscreen element that is not the page's root is drawn over the browser's own black
// backdrop and fixed at the size of the screen, with nothing in the page's styles to change either. These measure the
// real thing, on a segment that is taller than the screen.

test('in fullscreen the text can be read: the root is opaque and contrasts with its text', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    const facts = await page.evaluate(() => {
      const root = document.querySelector('[data-spa-root="presentation"]');
      const parse = (css) => {
        const [r, g, b, a = 1] = css.match(/[\d.]+/g).map(Number);
        return { r, g, b, a };
      };
      const over = (top, below) => ({
        r: top.r * top.a + below.r * (1 - top.a),
        g: top.g * top.a + below.g * (1 - top.a),
        b: top.b * top.a + below.b * (1 - top.a),
      });
      const luminance = ({ r, g, b }) => {
        const [lr, lg, lb] = [r, g, b].map((channel) => {
          const unit = channel / 255;
          return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
      };
      const style = getComputedStyle(root);
      const backdrop = parse(getComputedStyle(root, '::backdrop').backgroundColor);
      const background = over(parse(style.backgroundColor), backdrop);
      const text = parse(style.color);
      const [light, dark] = [luminance(background), luminance(text)].sort((a, b) => b - a);
      return { background: style.backgroundColor, text: style.color, contrast: (light + 0.05) / (dark + 0.05) };
    });
    assert.ok(facts.contrast >= 4.5, `text ${facts.text} on ${facts.background} over the backdrop has contrast ${facts.contrast.toFixed(2)}, below 4.5`);
  });
});

test('in fullscreen a segment taller than the screen scrolls inside the root, and Exit can be reached', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    const before = await page.evaluate(() => {
      const root = document.querySelector('[data-spa-root="presentation"]');
      return { overflowY: getComputedStyle(root).overflowY, scrollHeight: root.scrollHeight, clientHeight: root.clientHeight };
    });
    assert.ok(before.scrollHeight > before.clientHeight, 'the segment is taller than the screen, or this proves nothing');
    assert.ok(['auto', 'scroll'].includes(before.overflowY), `the root scrolls, it has overflow-y: ${before.overflowY}`);
    await page.mouse.move(640, 360);
    await page.mouse.wheel(0, 100000);
    await page.waitForFunction(() => document.querySelector('[data-spa-root="presentation"]').scrollTop > 0);
    const exit = await page.evaluate(() => {
      const { top, bottom } = document.getElementById('present-exit').getBoundingClientRect();
      return { top, bottom, height: innerHeight };
    });
    assert.ok(exit.top >= 0 && exit.bottom <= exit.height, `the Exit control is on screen after scrolling: ${JSON.stringify(exit)}`);
  });
});

test('entering fullscreen from a focused Present leaves the slide at its top with focus on Exit, and Exit and the Esc or F11 guidance in view', async () => {
  await withPage({}, async (page) => {
    // Pointer clicks do not focus buttons in WebKit. Verify the focus handoff from an actually focused control.
    await page.focus('#present-start'); // Present sits below a long segment, so focusing it scrolled the window to it
    await page.keyboard.press('Enter');
    await waitForFullscreen(page, true);
    await waitForLive(page, /Presentation mode on/);
    const facts = await page.evaluate(() => {
      const heading = document.querySelector('#main h1').getBoundingClientRect();
      const exit = document.getElementById('present-exit').getBoundingClientRect();
      const guidance = document.getElementById('present-guidance').getBoundingClientRect();
      return {
        scrollTop: document.querySelector('[data-spa-root="presentation"]').scrollTop,
        focus: document.activeElement && document.activeElement.id,
        heading: { top: heading.top, bottom: heading.bottom },
        exit: { top: exit.top, bottom: exit.bottom },
        guidance: { top: guidance.top, bottom: guidance.bottom },
        height: innerHeight,
      };
    });
    const onScreen = ({ top, bottom }) => top >= 0 && bottom <= facts.height;
    assert.equal(facts.focus, 'present-exit');
    assert.equal(facts.scrollTop, 0, 'moving focus to Exit must not carry the reader away from the slide');
    assert.ok(onScreen(facts.heading), `the segment heading is on screen: ${JSON.stringify(facts)}`);
    assert.ok(onScreen(facts.exit), `the Exit control is on screen without scrolling: ${JSON.stringify(facts)}`);
    assert.ok(onScreen(facts.guidance), `the Esc or F11 guidance is on screen without scrolling: ${JSON.stringify(facts)}`);
  });
});

test('in fullscreen the controls never cover the element that has focus', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    const facts = await page.evaluate(async () => {
      const root = document.querySelector('[data-spa-root="presentation"]');
      const bar = document.getElementById('presentation-controls');
      const covered = [];
      let tried = 0;
      // A screen's height of nothing above the slide, so that every element of it can be scrolled down into the strip the
      // bar covers whatever the height of the screen is (720px in Chromium, 768px in Firefox) and not only those that
      // already sit lower than that.
      const spacer = document.createElement('div');
      spacer.style.height = `${innerHeight}px`;
      root.insertBefore(spacer, root.firstChild);
      for (const target of document.querySelectorAll('#main a[href], #main button')) {
        if (!target.getClientRects().length || target.getBoundingClientRect().height > 80) continue;
        // Park the element in the strip of the screen the controls bar covers, where a browser that thinks the whole screen
        // is free sees nothing to scroll, then move focus to it.
        const parked = target.getBoundingClientRect().bottom - (innerHeight - 10);
        root.scrollTop += parked;
        if (Math.abs(target.getBoundingClientRect().bottom - (innerHeight - 10)) > 2) continue; // too near an end to park
        target.focus();
        if (document.activeElement !== target) continue; // not focusable (inside something collapsed)
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        tried += 1;
        const rect = target.getBoundingClientRect();
        const strip = bar.getBoundingClientRect();
        if (rect.bottom > strip.top + 0.5 && rect.top < strip.bottom) covered.push({ text: target.textContent.trim().slice(0, 40), rect: { top: rect.top, bottom: rect.bottom }, bar: { top: strip.top, bottom: strip.bottom } });
      }
      return { tried, covered };
    });
    assert.ok(facts.tried >= 3, `the check reached at least three focusable elements, or it proves nothing: ${facts.tried}`);
    assert.deepEqual(facts.covered, [], 'the controls bar sits on top of an element that has focus');
  });
});

test('QA SPA-06: a focused slide link stays clear of the fullscreen toolbar', async () => {
  await withPage({}, async (page) => {
    await goTo(page, 'm6-a2a-tmux');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    const target = await page.evaluate(() => {
      const root = document.querySelector('[data-spa-root="presentation"]');
      const bar = document.getElementById('presentation-controls');
      const stops = [...root.querySelectorAll('a[href],button,input,select,[tabindex]')].filter(
        (element) => element.tabIndex >= 0 && !element.disabled && !element.closest('[hidden],[inert]') && element.getClientRects().length,
      );
      // Use an actual slide link on a real segment; no spacer or extra content is inserted.
      for (let index = 1; index < stops.length; index += 1) {
        const control = stops[index];
        if (!control.matches('#main a[href]')) continue;
        const rectangle = control.getBoundingClientRect();
        if (rectangle.top + root.scrollTop < innerHeight || rectangle.height > 60) continue;
        root.scrollTop += control.getBoundingClientRect().bottom - (innerHeight - 10);
        const parked = control.getBoundingClientRect();
        if (parked.bottom <= bar.getBoundingClientRect().top || Math.abs(parked.bottom - (innerHeight - 10)) > 2) continue;
        control.setAttribute('data-qa-tab-target', '');
        return { text: control.textContent.trim().slice(0, 80), parkedBottom: parked.bottom };
      }
      throw new Error(`The real slide needs a focusable control that can be scrolled behind the toolbar: ${
        JSON.stringify(stops.map((control) => ({ text: control.textContent.trim().slice(0, 40), top: control.getBoundingClientRect().top })))
      }`);
    });
    // The application's keyboard handlers also move focus through HTMLElement.focus(). Do not use preventScroll.
    await page.locator('[data-qa-tab-target]').focus();
    await settled(page);
    const result = await page.evaluate(() => {
      const control = document.querySelector('[data-qa-tab-target]');
      const rectangle = control.getBoundingClientRect();
      const bar = document.getElementById('presentation-controls').getBoundingClientRect();
      return {
        focused: document.activeElement === control,
        top: rectangle.top,
        bottom: rectangle.bottom,
        barTop: bar.top,
        barBottom: bar.bottom,
      };
    });
    assert.equal(result.focused, true, `Focus must actually reach the selected slide link: ${JSON.stringify(target)}`);
    assert.ok(
      result.bottom <= result.barTop || result.top >= result.barBottom,
      `The newly focused control is covered by the toolbar: ${JSON.stringify({ target, result })}`,
    );
  });
});

test('a segment that opens while presenting starts at its top, not where the last one was scrolled to', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.evaluate(() => {
      document.querySelector('[data-spa-root="presentation"]').scrollTop = 600;
    });
    assert.ok((await page.evaluate(() => document.querySelector('[data-spa-root="presentation"]').scrollTop)) > 0, 'the root can be scrolled');
    await goTo(page, SECOND);
    const facts = await page.evaluate(() => {
      const heading = document.querySelector('#main h1').getBoundingClientRect();
      return {
        scrollTop: document.querySelector('[data-spa-root="presentation"]').scrollTop,
        headingTop: heading.top,
        headingBottom: heading.bottom,
        height: innerHeight,
      };
    });
    assert.equal(facts.scrollTop, 0);
    assert.ok(facts.headingTop >= 0 && facts.headingBottom <= facts.height, `the new segment's heading is on screen: ${JSON.stringify(facts)}`);
    assert.equal((await state(page)).mode, 'presenting');
  });
});

test('AC8 (real): when fullscreen ends without the application asking, the window shows the same segment and the live region says so', async () => {
  await withPage({}, async (page) => {
    await goTo(page, SECOND);
    const before = await state(page);
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await waitForLive(page, /Presentation mode on/);
    // not the application's Exit control and not a call the application made: the browser reports the end on its own
    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForLive(page, /Presentation mode off/);
    const after = await state(page);
    assert.equal(after.mode, 'windowed');
    assert.equal(after.id, SECOND);
    assert.equal(after.hash, before.hash);
    assert.equal(after.present, true);
    assert.equal(after.exit, false);
    assert.match(await liveRegion(page), /segment 2 of \d+/i);
    assert.ok(!(await log(page)).includes('exitFullscreen'), 'the application never asked to leave');
  });
});

test('AC8 (real): the Escape key ends fullscreen like a user, and the window comes back on the same segment', async (context) => {
  await withPage({}, async (page) => {
    await goTo(page, SECOND);
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.keyboard.press('Escape');
    try {
      await page.waitForFunction(() => document.fullscreenElement === null, undefined, { timeout: 1500 });
    } catch {
      // Headless Chromium keeps Escape in the browser UI layer on some builds: the page then never sees the key.
      context.skip('this browser build does not end fullscreen on Escape when headless; the exitFullscreen() variant above covers AC8');
      return;
    }
    await waitForLive(page, /Presentation mode off/);
    const after = await state(page);
    assert.equal(after.mode, 'windowed');
    assert.equal(after.id, SECOND);
  });
});

test('AC8 (simulated, as the criterion words it): a fullscreenchange with fullscreenElement null returns to the window on the same segment', async () => {
  await withPage({}, async (page) => {
    await goTo(page, SECOND);
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await waitForLive(page, /Presentation mode on/);
    await page.evaluate(() => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    await waitForLive(page, /Presentation mode off/);
    const after = await state(page);
    assert.equal(after.mode, 'windowed');
    assert.equal(after.id, SECOND);
    assert.equal(after.hash, `#/${SECOND}`);
    assert.equal(after.present, true);
    assert.equal(after.exit, false);
  });
});

test('the Exit control leaves through document.exitFullscreen() and lands on the same segment', async () => {
  await withPage({}, async (page) => {
    await goTo(page, SECOND);
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.click('#present-exit');
    await waitForFullscreen(page, false);
    await waitForLive(page, /Presentation mode off/);
    const after = await state(page);
    assert.equal(after.mode, 'windowed');
    assert.equal(after.id, SECOND);
    assert.ok((await log(page)).includes('exitFullscreen'));
  });
});

test('the segment can change while presenting, and fullscreen ends on the segment that is open', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await goTo(page, SECOND);
    assert.equal((await state(page)).mode, 'presenting');
    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForLive(page, /Presentation mode off/);
    assert.equal((await state(page)).id, SECOND);
  });
});

test('QA SPA-06: Escape still dismisses an open dialog when the browser also leaves fullscreen', async () => {
  await withPage({}, async (page) => {
    await goTo(page, 'm5c-copilot-cli-extensions');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.click('#m5c-synergy-zoom-trigger');
    const dialog = page.getByRole('dialog');
    assert.equal(await dialog.isVisible(), true, 'The existing interaction must actually be open');
    await page.keyboard.press('Escape');
    await settled(page);
    await page.waitForTimeout(250); // also allow the native fullscreen-exit and layout tasks to finish
    const facts = await page.evaluate(() => ({
      fullscreen: document.fullscreenElement !== null,
      mode: document.querySelector('[data-spa-root="presentation"]').getAttribute('data-presentation'),
      hidden: document.getElementById('m5c-synergy-zoom-dialog').hidden,
      inert: document.querySelectorAll('[inert]').length,
      focus: document.activeElement?.id,
    }));
    assert.equal(facts.hidden, true, `One Escape must still dismiss the SPA-04 dialog: ${JSON.stringify(facts)}`);
    assert.equal(facts.inert, 0, 'No modal isolation may remain after dismissal');
    assert.equal(facts.focus, 'm5c-synergy-zoom-trigger', 'Focus returns to the invoker, not a hidden or inert control');
  });
});

// Firefox and WebKit spend the Escape that leaves fullscreen: the page is told that fullscreen ended and is never handed the key,
// so the Escape that would have put away a dialog, a popover or a running timer in the window does not reach them. What every
// engine shares is the end of fullscreen itself, and `__realExitFullscreen` makes that end the same way in all of them (Chromium
// keeps Escape for the page, so the key alone proves nothing there). The application is not the one that asked, so it puts away
// what Escape would have.
const waitForWindowed = (page) =>
  page.waitForFunction(() => document.querySelector('[data-spa-root="presentation"]').getAttribute('data-presentation') === 'windowed');
const TIMER = '#m1-segment-timer';
const timerCaption = (page) => page.evaluate((selector) => document.querySelector(`${selector} > span:not([role])`).textContent.trim(), TIMER);
const startTimer = async (page) => {
  await page.click(`${TIMER} button:text-is("Start")`);
  await page.waitForFunction((selector) => document.querySelector(`${selector} > span:not([role])`).textContent.trim() === 'Running', TIMER);
  // Chromium and Firefox focus a button that is clicked, WebKit does not, and where the focus is decides whether Escape reaches the
  // timer at all. So it is put where a keyboard user would have it, on a control of the timer, the same way in every engine.
  await page.focus(`${TIMER} button:text-is("Pause")`);
};

test('when the browser ends fullscreen, an open dialog is closed, nothing stays inert, and the focus is on the button that opened it', async () => {
  await withPage({}, async (page) => {
    await goTo(page, 'm5c-copilot-cli-extensions');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.click('#m5c-synergy-zoom-trigger');
    assert.equal(await page.getByRole('dialog').isVisible(), true, 'the dialog is open before fullscreen ends');
    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForWindowed(page);
    const facts = await page.evaluate(() => ({
      hidden: document.getElementById('m5c-synergy-zoom-dialog').hidden,
      inert: document.querySelectorAll('[inert]').length,
      focus: document.activeElement?.id,
    }));
    assert.deepEqual(facts, { hidden: true, inert: 0, focus: 'm5c-synergy-zoom-trigger' });
    assert.ok(!(await log(page)).includes('exitFullscreen'), 'the application never asked to leave');
  });
});

test('when the browser ends fullscreen, a popover that is showing is put away', async () => {
  await withPage({}, async (page) => {
    await goTo(page, 'm6-a2a-tmux');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    const trigger = '#m6-segment-details button';
    await page.hover(trigger);
    await page.waitForFunction((selector) => document.querySelector(selector).getAttribute('aria-expanded') === 'true', trigger);
    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForWindowed(page);
    // right away, not after the pause a pointer that has gone is given: it is what the application did that is under test
    const facts = await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      return { expanded: button.getAttribute('aria-expanded'), hidden: document.getElementById(button.getAttribute('aria-controls')).hidden };
    }, trigger);
    assert.deepEqual(facts, { expanded: 'false', hidden: true });
  });
});

test('when the browser ends fullscreen, a running timer that the focus is in is paused', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await startTimer(page);
    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForWindowed(page);
    assert.equal(await timerCaption(page), 'Paused');
    const kept = await page.evaluate((selector) => document.querySelector(`${selector} [role="timer"]`).textContent, TIMER);
    await page.waitForTimeout(1500);
    assert.equal(await page.evaluate((selector) => document.querySelector(`${selector} [role="timer"]`).textContent, TIMER), kept, 'a paused timer keeps its time');
  });
});

test('QA round 2: AC8 fullscreen-ended text reaches the live region when browser exit also pauses the timer', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await startTimer(page);
    await waitForLive(page, /Started/);
    await page.evaluate(() => {
      const region = document.getElementById('live-region');
      window.__exitAnnouncements = [];
      window.__exitObserver = new MutationObserver(() => {
        if (region.textContent) window.__exitAnnouncements.push(region.textContent);
      });
      window.__exitObserver.observe(region, { childList: true, subtree: true, characterData: true });
    });

    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForWindowed(page);
    await page.waitForTimeout(150); // both deferred live-region writes have had time to run
    assert.equal(await timerCaption(page), 'Paused');
    assert.equal((await state(page)).id, FIRST);
    const written = await page.evaluate(() => {
      window.__exitObserver.disconnect();
      return window.__exitAnnouncements;
    });
    assert.ok(
      written.some((message) => /presentation mode off.*segment 1 of/i.test(message)),
      `AC8 requires a real status-region write, not a discarded announce() call. Observed: ${JSON.stringify(written)}`,
    );
  });
});

test('QA round 2: a stale exit rejection cannot dismiss a newer application-exited timer (exit promises stubbed)', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.evaluate(() => {
      window.__pendingExits = [];
      document.exitFullscreen = () =>
        new Promise((resolve, reject) => window.__pendingExits.push({ resolve, reject }));
      window.teachingSpa.presentation.exit();
    });
    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForWindowed(page);

    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await startTimer(page);
    await page.evaluate(async () => {
      window.teachingSpa.presentation.exit();
      window.__pendingExits[0].reject(new TypeError('The previous session is no longer fullscreen'));
      await Promise.resolve();
    });
    await page.evaluate(() => window.__realExitFullscreen());
    await page.evaluate(() => window.__pendingExits[1].resolve());
    await waitForFullscreen(page, false);
    await waitForWindowed(page);

    assert.equal((await state(page)).id, FIRST);
    assert.equal(await timerCaption(page), 'Running', 'the delayed rejection must not turn an application exit into a browser dismissal');
  });
});

test('when the browser ends fullscreen, a running timer that the focus is not in keeps running', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await startTimer(page);
    await page.evaluate(() => document.getElementById('main').focus()); // Escape elsewhere on the page does not pause the timer
    await page.evaluate(() => window.__realExitFullscreen());
    await waitForFullscreen(page, false);
    await waitForWindowed(page);
    assert.equal(await timerCaption(page), 'Running');
  });
});

test('when the application itself asks to leave fullscreen, a running timer keeps running: nothing is put away', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await startTimer(page);
    await page.evaluate(() => window.teachingSpa.presentation.exit()); // the focus stays in the timer: only who asked tells the exits apart
    await waitForFullscreen(page, false);
    await waitForWindowed(page);
    assert.ok((await log(page)).includes('exitFullscreen'), 'the application asked to leave');
    assert.equal(await timerCaption(page), 'Running');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Failure (AC7's other half: the presenter must never be stranded). The refusal is a STUB.

for (const fullscreen of ['reject', 'error-event', 'reject-and-event']) {
  test(`when the fullscreen request fails (${fullscreen}, stubbed) the window stays usable on the same segment and says so once`, async () => {
    await withPage({ fullscreen }, async (page) => {
      await goTo(page, SECOND);
      await page.click('#present-start');
      await waitForLive(page, /Fullscreen could not start/);
      await settled(page);
      const now = await state(page);
      assert.equal(now.mode, 'windowed');
      assert.equal(now.fullscreen, false);
      assert.equal(now.id, SECOND);
      assert.equal(now.present, true, 'Present is still there to try again');
      assert.equal(now.exit, false);
      assert.match(await liveRegion(page), /segment 2 of \d+/i);
      assert.deepEqual((await log(page)).filter((entry) => entry.startsWith('wakeLock')), [], 'no wake lock for a presentation that did not start');
    });
  });
}

test('with document.fullscreenEnabled false (stubbed) Present is disabled and the page says why', async () => {
  await withPage({ fullscreenEnabled: false }, async (page) => {
    const facts = await page.evaluate(() => {
      const start = document.getElementById('present-start');
      const why = document.getElementById('present-unavailable');
      return {
        disabled: start.disabled,
        ariaDisabled: start.getAttribute('aria-disabled'),
        describedBy: start.getAttribute('aria-describedby'),
        visible: !why.hidden && why.getClientRects().length > 0,
        text: why.textContent,
      };
    });
    assert.equal(facts.disabled, true);
    assert.equal(facts.ariaDisabled, 'true');
    assert.equal(facts.describedBy, 'present-unavailable');
    assert.equal(facts.visible, true);
    assert.match(facts.text, /fullscreen/i);
    await page.click('#present-start', { force: true }).catch(() => {}); // a disabled button takes no click
    assert.deepEqual(await log(page), []);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The order of the activation handler (section 2.5). The window, the lock and the screens are STUBS that record calls.

test('the handler opens the speaker script, then locks the keyboard without Escape, then requests fullscreen', async () => {
  await withPage({}, async (page) => {
    await page.check('#present-open-script');
    await page.check('#present-keyboard-lock');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    const entries = await log(page);
    assert.deepEqual(entries.slice(0, 3), ['open', 'lock', 'requestFullscreen']);
    const facts = await page.evaluate(() => ({ open: window.__openCalls, lock: window.__lockCalls }));
    assert.equal(facts.open[0][0], '#/script');
    assert.doesNotMatch(`${facts.open[0][1] ?? ''} ${facts.open[0][2] ?? ''}`, /noopener|noreferrer/i, 'the script window must keep window.opener');
    assert.equal(facts.lock.length, 1);
    assert.ok(Array.isArray(facts.lock[0]) && facts.lock[0].length > 0, 'an empty list would lock every key');
    assert.ok(!facts.lock[0].some((code) => /^escape$/i.test(code)), 'Escape is never locked (SC 2.1.2)');
  });
});

test('with both options left off, the handler calls nothing but requestFullscreen', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    assert.equal((await log(page))[0], 'requestFullscreen');
    assert.ok(!(await log(page)).some((entry) => entry === 'open' || entry === 'lock'));
  });
});

test('leaving calls exitFullscreen() before it releases the keyboard lock', async () => {
  await withPage({}, async (page) => {
    await page.check('#present-keyboard-lock');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.click('#present-exit');
    await waitForFullscreen(page, false);
    await waitForLive(page, /Presentation mode off/);
    const entries = (await log(page)).filter((entry) => entry === 'exitFullscreen' || entry === 'unlock');
    assert.deepEqual(entries, ['exitFullscreen', 'unlock']);
  });
});

test('a blocked speaker window (window.open returned null) is announced, and presenting goes on', async () => {
  await withPage({ popupBlocked: true }, async (page) => {
    await page.check('#present-open-script');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await waitForLive(page, /speaker script.*blocked/i);
    assert.equal((await state(page)).mode, 'presenting');
    assert.deepEqual((await log(page)).slice(0, 2), ['open', 'requestFullscreen']);
  });
});

test('a refused keyboard lock (stubbed) is noted and presenting goes on', async () => {
  await withPage({ keyboard: 'reject' }, async (page) => {
    await page.check('#present-keyboard-lock');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await waitForLive(page, /keyboard lock/i);
    assert.equal((await state(page)).mode, 'presenting');
  });
});

test('without keyboard.lock the toggle is disabled and says why', async () => {
  await withPage({ keyboard: 'absent' }, async (page) => {
    const facts = await page.evaluate(() => ({
      disabled: document.getElementById('present-keyboard-lock').disabled,
      hint: document.getElementById('present-keyboard-hint').textContent,
    }));
    assert.equal(facts.disabled, true);
    assert.match(facts.hint, /not available|not supported|unavailable/i);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The screen wake lock (the API is a STUB: a headless browser has no display to keep awake)

test('the wake lock is requested once presentation mode is on, and released when it ends', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.waitForFunction(() => window.__log.includes('wakeLock.request:screen'));
    assert.deepEqual(await log(page), ['requestFullscreen', 'wakeLock.request:screen']);
    await page.click('#present-exit');
    await waitForFullscreen(page, false);
    await page.waitForFunction(() => window.__log.includes('wakeLock.release'));
    assert.equal(await page.evaluate(() => window.__sentinels[0].released), true);
  });
});

test('the wake lock is taken again when the page becomes visible with presentation mode still on', async () => {
  await withPage({}, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await page.waitForFunction(() => window.__sentinels.length === 1);
    await page.evaluate(() => {
      window.__visible = false; // the user agent takes the lock back when the page is hidden
      for (const sentinel of window.__sentinels) {
        sentinel.released = true;
        sentinel.dispatchEvent(new Event('release'));
      }
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await settled(page);
    assert.equal(await page.evaluate(() => window.__sentinels.length), 1, 'nothing is requested while the page is hidden');
    await page.evaluate(() => {
      window.__visible = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => window.__sentinels.length === 2);
    assert.equal(await page.evaluate(() => window.__sentinels[1].released), false);
  });
});

test('a refused wake lock (NotAllowedError, stubbed) is noted and presentation mode stays on', async () => {
  await withPage({ wakeLock: 'reject' }, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await waitForLive(page, /wake lock/i);
    assert.equal((await state(page)).mode, 'presenting');
    assert.match(await page.evaluate(() => document.getElementById('present-notes').textContent), /wake lock/i);
  });
});

test('without navigator.wakeLock presentation mode still starts, with a note', async () => {
  await withPage({ wakeLock: 'absent' }, async (page) => {
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    await waitForLive(page, /wake lock/i);
    assert.equal((await state(page)).mode, 'presenting');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Placing the presentation on a monitor (section 2.6). getScreenDetails() is a STUB.

const MANUAL = /move this browser window onto the audience monitor, then activate Present/i;

test('without getScreenDetails the page gives the manual steps and offers no choice of screen', async () => {
  await withPage({ screens: 'absent' }, async (page) => {
    const facts = await page.evaluate(() => ({
      choose: !document.getElementById('present-choose-screen').hidden,
      guidance: document.getElementById('present-screen-guidance').textContent,
      shown: document.getElementById('present-screen-guidance').getClientRects().length > 0,
    }));
    assert.equal(facts.choose, false);
    assert.equal(facts.shown, true);
    assert.match(facts.guidance, MANUAL);
    assert.doesNotMatch(facts.guidance, /\b(chosen|selected|presenting on)\b/i);
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    assert.equal((await page.evaluate(() => window.__fullscreenRequests))[0].screen, null);
    assert.ok(!(await log(page)).includes('getScreenDetails'));
  });
});

test('when getScreenDetails is refused the page falls back to the manual steps and says so', async () => {
  await withPage({ screens: 'reject' }, async (page) => {
    await page.click('#present-choose-screen');
    await waitForLive(page, MANUAL);
    const facts = await page.evaluate(() => ({
      field: !document.getElementById('present-screen-field').hidden,
      guidance: document.getElementById('present-screen-guidance').textContent,
    }));
    assert.equal(facts.field, false);
    assert.match(facts.guidance, MANUAL);
    assert.doesNotMatch(facts.guidance, /\b(chosen|selected|presenting on)\b/i);
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    assert.equal((await page.evaluate(() => window.__fullscreenRequests))[0].screen, null, 'no monitor is claimed');
  });
});

test('a screen chosen through getScreenDetails is passed to requestFullscreen, and none otherwise', async () => {
  await withPage({ screens: 'stub' }, async (page) => {
    await page.click('#present-choose-screen');
    await page.waitForFunction(() => !document.getElementById('present-screen-field').hidden);
    assert.deepEqual(await page.evaluate(() => [...document.getElementById('present-screen').options].map((option) => option.textContent.replace(/\s+/g, ' '))).then((labels) => labels.length), 3);
    await page.selectOption('#present-screen', '1');
    await page.click('#present-start');
    await waitForFullscreen(page, true);
    const requests = await page.evaluate(() => window.__fullscreenRequests);
    assert.deepEqual(requests.map((request) => request.screen), ['Projector']);
    assert.equal(requests[0].target, 'root');
  });
});
