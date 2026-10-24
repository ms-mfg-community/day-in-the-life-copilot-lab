// Real-browser check of the speaker script and its synchronization (specs/005-teaching-spa.md 2.7; AC9, AC10) against the BUILT
// bundle, because a fake DOM cannot say what a browser does with a real window.open(), a real BroadcastChannel, a real
// postMessage between two documents, a real `storage` event, or an origin that is opaque.
// Run after npm run spa:build (npm run spa:test:sync builds first, then runs the Vitest half, then this):
//   node --test tests/spa/sync-browser-check.mjs
// Requires Playwright (local or in npm's cache) and its browser. No dependencies are installed by this check.
//   SPA_QA_PLAYWRIGHT_MODULE  a playwright/index.mjs to use; otherwise `playwright`, then every copy in npm's npx cache,
//                             in turn, until one of them can launch the browser
//   SPA_QA_BROWSER_TYPE       chromium (default), firefox or webkit, when that browser is already installed
//   SPA_QA_BROWSER_CHANNEL    chrome or msedge
//   SPA_QA_DIST               another build to serve (a mutation check uses it)
//
// What is real here: the click on Present (a trusted input event, so window.open() is allowed), the second window it opens and its
// `window.opener`, BroadcastChannel, postMessage with the `event.source` and `event.origin` the browser gives, localStorage and the
// `storage` event between two documents, the timeouts, and an opaque origin (the pages of /qa/opaque/ are served with a
// `Content-Security-Policy: sandbox` header, so `window.origin` is "null" and the localStorage getter throws a SecurityError).
// What is STUBBED, and named so in each test: window.open giving back null or undefined (a popup blocker), a window with no
// BroadcastChannel, and the iframe that posts a message that is not from the opener. Everything else goes through to the browser.
// Only the browser named by SPA_QA_BROWSER_TYPE is exercised; nothing here speaks for the other engines.
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const DIST = path.resolve(process.env.SPA_QA_DIST || path.join(ROOT, 'workshop/spa/dist'));
const read = (relative) => readFileSync(path.join(ROOT, relative), 'utf8');
const DECK = JSON.parse(read('workshop/spa/content/deck.json')).segments;
const INVENTORY = JSON.parse(read('workshop/spa/content/interactions.json')).interactions;
const IDS = DECK.map((segment) => segment.id);
const TIMER = INVENTORY.find((entry) => entry.pattern === 'segment-timer');
const REVEAL = INVENTORY.find((entry) => entry.pattern === 'staged-reveal');
const BUDGET_MS = 500; // AC9
const require = createRequire(import.meta.url);
let browser;
let server;
let origin;

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
      const launcher = imported[engine] ?? imported.default?.[engine];
      const launched = await launcher.launch({ headless: true, ...(channel ? { channel } : {}) });
      console.log(`Browser: ${engine} ${await launched.version()} (playwright: ${candidate})`);
      return launched;
    } catch (error) {
      failures.push(`${candidate}: ${String(error?.message ?? error).split('\n')[0]}`);
    }
  }
  throw new Error(`No Playwright that can launch ${engine} was found; set SPA_QA_PLAYWRIGHT_MODULE.\n${failures.join('\n')}`);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
// The same bundle under two paths. The second is served with a sandbox, without allow-same-origin: its documents have an opaque
// origin, as a page in a sandboxed frame has (C2). Its scripts are fetched with `Origin: null`, so every file allows any origin.
const SURFACES = {
  '/qa/nested/': {},
  '/qa/opaque/': { '.html': { 'Content-Security-Policy': 'sandbox allow-scripts allow-popups' } },
};

before(async () => {
  assert.ok(existsSync(path.join(DIST, 'index.html')), 'Run npm run spa:build first');
  assert.ok(TIMER && REVEAL && IDS.length >= 3, 'the deck and its inventory must hold a timer, a reveal and three segments');
  browser = await launch();
  server = http.createServer((request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const prefix = Object.keys(SURFACES).find((one) => pathname.startsWith(one));
      const file = prefix === undefined ? null : path.resolve(DIST, pathname.slice(prefix.length) || 'index.html');
      if (file === null || !file.startsWith(DIST + path.sep)) {
        response.writeHead(404).end();
        return;
      }
      // The body is read before the status line is written: a 200 cannot be taken back, so a file that is not there has to be found
      // out while a 404 can still be sent (writing the headers first made the catch below throw ERR_HTTP_HEADERS_SENT).
      const body = readFileSync(file);
      const extension = path.extname(file);
      response.writeHead(200, {
        'Content-Type': TYPES[extension] ?? 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        ...(SURFACES[prefix][extension] ?? {}),
      });
      response.end(body);
    } catch {
      // Whatever failed, the request ends here: with a 404 while nothing has been said, by dropping the connection once something has.
      if (response.headersSent) response.destroy();
      else response.writeHead(404).end();
    }
  });
  // 127.0.0.1 is a secure context, as http://localhost is (the specification measures on localhost, Q2).
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});

const url = (surface, query = '', hash = '') => `${origin}/qa/${surface}/index.html?deck=qa${query === '' ? '' : `&${query}`}${hash}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const flat = (text) => text.replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------------------------------------------------
// The pages: instrumented before the shell boots, in every document of the context (the presentation, the script window and the
// iframes a test makes). It records; it stubs only what `config` asks it to stub.

function instrument(config) {
  window.__openCalls = []; // what window.open was called with, and nothing else of it
  window.__messages = []; // every message event that reached this window, as the browser delivered it
  window.__attrs = []; // each value the attributes of the surface took, and when, on a clock that both windows share
  window.__said = []; // each text the live region held
  window.__channels = { opened: 0, closed: 0 };
  window.__storage = { reads: 0, refusals: [] };

  window.addEventListener(
    'message',
    (event) => {
      window.__messages.push({ data: event.data, origin: event.origin, fromOpener: window.opener !== null && event.source === window.opener });
    },
    true,
  );

  // A page that is gone does not always get to say goodbye. With `silentPagehide` the pagehide of the window is kept from everything
  // that listens after this, the shell included: this is the first listener the window has, so that nothing is said and the other
  // window has to find out for itself.
  if (config.silentPagehide) window.addEventListener('pagehide', (event) => event.stopImmediatePropagation(), true);

  // An observer belongs to a document. A window that is opened empty and then sent to the page (the script window: window.open gives
  // it an about:blank first, and the page loads into that same window when the origins match) keeps its global object and its
  // listeners but gets a new document, and this script does not run again for it. So the observers are bound to the document the
  // window has now, and again to every document it gets: from a capturing listener on the window, which hears readystatechange of
  // whatever document it has, and before the scripts of the page run (they are deferred).
  let watching = [];
  const attach = () => {
    if (window.__bound === document) return;
    window.__bound = document;
    for (const observer of watching) observer.disconnect();
    let lastSaid = '';
    const attributes = new MutationObserver((records) => {
      for (const record of records) {
        window.__attrs.push({
          name: record.attributeName,
          value: record.target.getAttribute(record.attributeName),
          at: performance.timeOrigin + performance.now(),
        });
      }
    });
    const live = new MutationObserver(() => {
      const region = document.getElementById('live-region');
      const text = region === null ? '' : region.textContent;
      if (text !== '' && text !== lastSaid) window.__said.push(text);
      lastSaid = text;
    });
    attributes.observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-segment-index', 'data-sync-state', 'data-revealed-steps', 'data-timer-state'],
    });
    live.observe(document, { childList: true, subtree: true, characterData: true });
    watching = [attributes, live];
  };
  attach();
  window.addEventListener('readystatechange', attach, true);

  // BroadcastChannel: counted (opened, closed), or taken away, for a window whose engine has none.
  const RealChannel = window.BroadcastChannel;
  if (config.noBroadcastChannel) {
    delete window.BroadcastChannel;
  } else if (typeof RealChannel === 'function') {
    window.BroadcastChannel = class extends RealChannel {
      constructor(name) {
        super(name);
        window.__channels.opened += 1;
      }

      close() {
        window.__channels.closed += 1;
        super.close();
      }
    };
  }

  // localStorage: the getter is counted, and what it throws is noted and thrown on. Nothing is swallowed here.
  const holder = Object.getOwnPropertyDescriptor(window, 'localStorage') ? window : Window.prototype;
  const own = Object.getOwnPropertyDescriptor(holder, 'localStorage');
  if (own && typeof own.get === 'function') {
    Object.defineProperty(holder, 'localStorage', {
      configurable: true,
      enumerable: own.enumerable,
      get() {
        window.__storage.reads += 1;
        try {
          return own.get.call(this);
        } catch (error) {
          window.__storage.refusals.push(error.name);
          throw error;
        }
      },
    });
  }

  // window.open: the real one, with its handle kept for the test; or, where the test says so, a window that was refused.
  const realOpen = window.open;
  window.open = function open(...args) {
    window.__openCalls.push(args);
    if (config.popupBlocked === 'null') return null; // STUB: a popup blocker
    if (config.popupBlocked === 'undefined') return undefined; // STUB: a popup blocker that says nothing
    const handle = realOpen.apply(window, args);
    window.__opened = handle;
    return handle;
  };

  // The same message as another window of the page's own origin would send it: from an iframe, with the iframe as its source.
  // The iframe stays, so that the message is delivered with a source and not with null.
  window.__frames = [];
  window.__forge = (message, targetOrigin) => {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    document.body.append(frame);
    window.__frames.push(frame);
    frame.contentWindow.Function('target', 'message', 'targetOrigin', 'target.postMessage(message, targetOrigin)')(window.__opened, message, targetOrigin);
  };

  // What a presenter does with a mouse, with the time it was done at.
  window.__go = (id) => {
    const at = performance.timeOrigin + performance.now();
    document.querySelector(`#segment-nav a[href="#/${id}"]`).click();
    return at;
  };
  window.__press = (selector, label) => {
    const at = performance.timeOrigin + performance.now();
    const button = [...document.querySelectorAll(selector)].find((one) => one.textContent === label);
    if (!button) throw new Error(`no "${label}" in ${selector}`);
    button.click();
    return at;
  };
}

/** A browser context of its own (so its channels and its storage are its own), with every request outside the page's origin refused. */
async function withSession(config, run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const problems = [];
  const requests = [];
  const logs = [];
  context.setDefaultTimeout(8000);
  context.on('request', (request) => requests.push({ url: request.url(), type: request.resourceType() }));
  context.on('page', (page) => {
    page.on('pageerror', (error) => problems.push(error.message));
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) logs.push(message.text());
    });
  });
  try {
    await context.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
    await context.addInitScript(instrument, config);
    await run(context, { requests, logs });
    assert.deepEqual(problems, [], 'the speaker script and its synchronization must not throw, nor leave a rejection unhandled');
  } finally {
    await context.close();
  }
}

async function openPresenter(context, query = '', surface = 'nested') {
  const page = await context.newPage();
  await page.goto(url(surface, query));
  await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation && window.teachingSpa.sync);
  return observed(page);
}

/** The instrument of a window is bound to the page the window shows. If it were not, every wait below would run out its time and say nothing of why. */
async function observed(page) {
  assert.equal(await page.evaluate(() => window.__bound === document), true, 'the instrument observes the document that this window shows');
  return page;
}

/** The control the presenter uses: the option, then a real click on Present. The script window is the one the browser opens for it. */
async function openScript(page) {
  await page.check('#present-open-script');
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('#present-start')]);
  await popup.waitForFunction(() => window.teachingSpa && window.teachingSpa.speaker);
  return observed(popup);
}

async function present(context, query = '', surface = 'nested') {
  const page = await openPresenter(context, query, surface);
  return { page, popup: await openScript(page) };
}

async function openByHand(context, query = '') {
  const speaker = await context.newPage();
  await speaker.goto(url('nested', query, '#/script'));
  await speaker.waitForFunction(() => window.teachingSpa && window.teachingSpa.speaker);
  return observed(speaker);
}

const waitFor = (page, condition, argument) => page.waitForFunction(condition, argument, { polling: 10 });
const synchronized = (page) => waitFor(page, () => document.getElementById('speaker-script').getAttribute('data-sync-state') === 'synchronized');
const notSynchronized = (page) => waitFor(page, () => document.getElementById('speaker-script').getAttribute('data-sync-state') === 'not-synchronized');

const facts = (page) =>
  page.evaluate(() => {
    const section = document.getElementById('speaker-script');
    const read = (name) => section.getAttribute(name);
    const text = (id) => document.getElementById(id).textContent;
    return {
      surface: read('data-surface'),
      index: read('data-segment-index'),
      id: read('data-segment-id'),
      sync: read('data-sync-state'),
      transport: read('data-sync-transport'),
      revealed: read('data-revealed-steps'),
      timer: read('data-timer-state'),
      title: text('speaker-title'),
      position: text('speaker-position'),
      status: text('speaker-sync-status'),
      clock: text('speaker-timer'),
      reveal: text('speaker-reveal'),
      note: text('speaker-controls-note'),
      body: text('speaker-body'),
      previousDisabled: document.getElementById('speaker-prev').disabled,
      nextDisabled: document.getElementById('speaker-next').disabled,
      hash: location.hash,
    };
  });

const attempts = (page) => page.evaluate(() => window.teachingSpa.speaker.sync.status.attempts.map((one) => `${one.transport}:${one.outcome}`));
const current = (page) => page.evaluate(() => window.teachingSpa.store.get().currentId);
const said = (page) => page.evaluate(() => window.__said);
const counts = (page) => page.evaluate(() => ({ ...window.__channels }));
const go = (page, id) => page.evaluate((target) => window.__go(target), id);
const press = (page, selector, label) => page.evaluate(([where, name]) => window.__press(where, name), [selector, label]);

/** How long after `since` (a time on the clock that both windows share) the attribute of the script surface took the value. */
async function arrival(page, name, value, since) {
  try {
    await waitFor(page, (wanted) => window.__attrs.some((one) => one.name === wanted.name && one.value === wanted.value && one.at >= wanted.since), { name, value, since });
  } catch (error) {
    const seen = await page
      .evaluate(() => ({ attrs: window.__attrs, now: performance.timeOrigin + performance.now(), observed: window.__bound === document, readyState: document.readyState, href: location.href }))
      .catch((reason) => ({ unreadable: String(reason) }));
    throw new Error(`${name} never took the value ${value} after ${since}: ${JSON.stringify(seen)} (${String(error.message).split('\n')[0]})`);
  }
  const at = await page.evaluate(
    (wanted) => window.__attrs.find((one) => one.name === wanted.name && one.value === wanted.value && one.at >= wanted.since).at,
    { name, value, since },
  );
  return at - since;
}

/** AC9: the presentation moves to `id`; the script surface is on the same segment, `data-segment-index` and all, within the budget. */
async function advanceTo(page, popup, id) {
  const index = IDS.indexOf(id);
  const at = await go(page, id);
  const delay = await arrival(popup, 'data-segment-index', String(index), at);
  assert.ok(delay <= BUDGET_MS, `the script surface took ${delay.toFixed(1)} ms to follow the presentation to ${id}; the budget is ${BUDGET_MS} ms`);
  const shown = await facts(popup);
  assert.equal(shown.index, String(index));
  assert.equal(shown.id, id);
  return delay;
}

/** The states the speaker was given by the opener, with the message events of the browser: the data of each, unchanged. */
const statesFromOpener = (popup) =>
  popup.evaluate(() =>
    window.__messages.filter((one) => one.fromOpener && one.data && one.data.app === 'teaching-spa-sync' && one.data.type === 'state').map((one) => one.data),
  );

/** What went over which transport, as the speaker window saw it. */
const traffic = (popup) =>
  popup.evaluate(() => ({
    messages: window.__messages
      .filter((one) => one.data && one.data.app === 'teaching-spa-sync')
      .map((one) => ({ type: one.data.type, origin: one.origin, fromOpener: one.fromOpener })),
    toSpeaker: localStorage.getItem('teaching-spa-sync:to-speaker'),
    toPresenter: localStorage.getItem('teaching-spa-sync:to-presenter'),
  }));

/** The plain text of the first heading of each of two levels in a speaker script, read from the file now: nothing of a script is written down here. */
function probes(segment) {
  const text = read(segment.scriptSource).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const heading = (level) => {
    const line = text.split(/\r?\n/).find((one) => new RegExp(`^#{${level}} [^#]`).test(one));
    return line === undefined ? null : line.replace(/^#+\s+/, '').trim();
  };
  const plain = [heading(1), heading(2)].filter((one) => one !== null && /^[\p{L}\p{N} .,:;'’—–()/-]+$/u.test(one));
  assert.ok(plain.length > 0, `${segment.scriptSource} has no plain heading to look for`);
  return plain;
}

const TRANSPORT_ROWS = [
  { name: 'broadcastchannel', query: '', attempts: ['broadcastchannel:synchronized'] },
  { name: 'postmessage', query: 'sync-fail=broadcastchannel', attempts: ['broadcastchannel:forced-failure', 'postmessage:synchronized'] },
  {
    name: 'storage',
    query: 'sync-fail=broadcastchannel,postmessage',
    attempts: ['broadcastchannel:forced-failure', 'postmessage:forced-failure', 'storage:synchronized'],
  },
];
const withQuery = (query, more) => (query === '' ? more : `${query}&${more}`);

// ---------------------------------------------------------------------------------------------------------------------
// One document, two surfaces

test('#/script is the speaker surface of the same document: the script of the first segment, its position, its state, and no presentation chrome', async () => {
  await withSession({}, async (context, { requests }) => {
    const speaker = await openByHand(context, 'sync-timeout=200');
    const before = await facts(speaker);
    assert.equal(before.surface, 'script');
    assert.equal(before.index, '0');
    assert.equal(before.id, IDS[0]);
    assert.equal(before.position, `Segment 1 of ${IDS.length}`);
    assert.notEqual(before.title, '');
    assert.equal(before.hash, '#/script');
    assert.equal(await speaker.evaluate(() => document.querySelectorAll('[data-spa-root="presentation"]').length), 1, 'the one document of the shell');
    const chrome = await speaker.evaluate(() => ({
      nav: document.getElementById('segment-nav').hidden,
      controls: document.getElementById('presentation-controls').hidden,
      presentation: window.teachingSpa.presentation ?? null,
      sync: window.teachingSpa.sync ?? null,
      sections: document.querySelectorAll('#main > *').length,
    }));
    assert.deepEqual(chrome, { nav: true, controls: true, presentation: null, sync: null, sections: 1 });
    // the real script of that segment, which the page was built with: no request fetched it
    const body = flat((await facts(speaker)).body);
    for (const text of probes(DECK[0])) assert.ok(body.includes(text), `the script of ${IDS[0]} shows "${text}"`);
    assert.deepEqual(
      requests.filter((one) => ['fetch', 'xhr', 'eventsource', 'websocket'].includes(one.type) || /speaker-scripts|\.md(\?|$)/.test(one.url)),
      [],
    );
  });
});

test('the hash moves a window between the two surfaces, and the skip link stays on the surface it is on', async () => {
  await withSession({}, async (context) => {
    const page = await openByHand(context, 'sync-timeout=200');
    await page.focus('a[data-skip]');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => [document.activeElement && document.activeElement.id, location.hash]), ['main', '#/script']);
    // into the presentation: the surface is built once, so the window is loaded again for the other one
    await page.evaluate((id) => {
      location.hash = `#/${id}`;
    }, IDS[1]);
    await page.waitForFunction((id) => window.teachingSpa && window.teachingSpa.presentation && !window.teachingSpa.speaker && window.teachingSpa.store.get().currentId === id, IDS[1]);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#speaker-script').length), 0);
    assert.notEqual(await page.evaluate(() => document.querySelector('#main h1').textContent), '');
    // and back
    await page.evaluate(() => {
      location.hash = '#/script';
    });
    await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.speaker && !window.teachingSpa.presentation);
    assert.equal((await facts(page)).hash, '#/script');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// AC9

test('AC9: Present with the script option opens #/script, without noopener, and advancing the presentation moves data-segment-index within 500 ms', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    const opened = await popup.evaluate(() => ({ opener: window.opener !== null, name: window.name, href: location.href }));
    assert.equal(opened.opener, true, 'the window was opened without noopener, so it can reach the window that opened it');
    assert.equal(opened.name, 'teaching-spa-script');
    assert.match(opened.href, /\?deck=qa#\/script$/, 'a fragment resolves against the page that opens it, so the query string reaches both windows');
    assert.deepEqual(await page.evaluate(() => window.__openCalls), [['#/script', 'teaching-spa-script']], 'the fragment and the name, and no features string');
    assert.equal(context.pages().length, 2, 'one presentation, one script window');
    const before = await facts(popup);
    assert.equal(before.transport, 'broadcastchannel');
    assert.equal(before.index, '0');
    assert.deepEqual(await attempts(popup), ['broadcastchannel:synchronized']);
    assert.equal(await page.evaluate(() => window.teachingSpa.sync.targetOrigin), origin, 'the presenter posts to its own origin, and not to *');

    const delays = [];
    for (const id of [IDS[1], IDS[2], IDS[1]]) delays.push(await advanceTo(page, popup, id)); // forward, forward, and back
    console.log(`AC9 over BroadcastChannel: the script surface followed in ${delays.map((one) => one.toFixed(1)).join(', ')} ms (budget ${BUDGET_MS})`);
    assert.equal(await current(page), IDS[1]);
  });
});

for (const row of TRANSPORT_ROWS) {
  test(`AC9 over ${row.name}: a real handshake, the transports before it passed over in order, and the traffic on this one alone`, async () => {
    await withSession({}, async (context) => {
      const { page, popup } = await present(context, row.query);
      await synchronized(popup);
      assert.equal((await facts(popup)).transport, row.name);
      assert.deepEqual(await attempts(popup), row.attempts);
      const delays = [await advanceTo(page, popup, IDS[1]), await advanceTo(page, popup, IDS[2])];
      console.log(`AC9 over ${row.name}: ${delays.map((one) => one.toFixed(1)).join(', ')} ms (budget ${BUDGET_MS})`);

      const seen = await traffic(popup);
      const wire = seen.messages.map((one) => one.type);
      if (row.name === 'postmessage') {
        assert.ok(wire.includes('ack') && wire.includes('state'), 'the ack and the states came as messages');
        assert.ok(seen.messages.every((one) => one.fromOpener && one.origin === origin), 'from the opener, from the origin of the page');
        assert.equal(seen.toSpeaker, null, 'and nothing was written to the storage');
      } else if (row.name === 'storage') {
        assert.deepEqual(wire, [], 'no message from a window');
        assert.match(seen.toSpeaker, /"type":"state"/, 'the presenter wrote its state to the key the speaker listens to');
        assert.match(seen.toPresenter, /"type":"hello"/, 'the speaker said hello on the other key');
      } else {
        assert.deepEqual(wire, [], 'no message from a window');
        assert.deepEqual([seen.toSpeaker, seen.toPresenter], [null, null], 'and nothing in the storage');
      }
      const open = await Promise.all([counts(page), counts(popup)]);
      assert.deepEqual(open.map((one) => one.opened > 0), row.name === 'broadcastchannel' ? [true, true] : [false, false], 'a forced failure opens no channel');
    });
  });
}

test('an engine without BroadcastChannel is found out at run time: the speaker passes it over and the handshake goes by postMessage', async () => {
  await withSession({ noBroadcastChannel: true }, async (context) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    assert.deepEqual(await attempts(popup), ['broadcastchannel:unavailable', 'postmessage:synchronized']);
    await advanceTo(page, popup, IDS[1]);
  });
});

test('a script window opened by hand has no opener: BroadcastChannel carries it, and storage does when that is forced to fail', async () => {
  const rows = [
    { query: '', expected: ['broadcastchannel:synchronized'], transport: 'broadcastchannel' },
    { query: 'sync-fail=broadcastchannel', expected: ['broadcastchannel:forced-failure', 'postmessage:unavailable', 'storage:synchronized'], transport: 'storage' },
  ];
  for (const row of rows) {
    await withSession({}, async (context) => {
      const page = await openPresenter(context, row.query);
      const speaker = await openByHand(context, row.query);
      await synchronized(speaker);
      assert.equal(await speaker.evaluate(() => window.opener), null);
      assert.equal((await facts(speaker)).transport, row.transport);
      assert.deepEqual(await attempts(speaker), row.expected);
      await advanceTo(page, speaker, IDS[1]);
    });
  }
});

test('the reveal stage and the timer of the segment follow the presentation too', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    // the timer
    if ((await current(page)) !== TIMER.segment) await advanceTo(page, popup, TIMER.segment);
    assert.equal((await facts(popup)).timer, 'idle');
    assert.match((await facts(popup)).clock, /^Ready, \d+:\d{2} left$/);
    let at = await press(page, `#${TIMER.id} button`, 'Start');
    assert.ok((await arrival(popup, 'data-timer-state', 'running', at)) <= BUDGET_MS, 'the timer is shown running within the budget');
    const running = (await facts(popup)).clock;
    assert.match(running, /^Running, \d+:\d{2} left$/);
    await sleep(1300);
    assert.notEqual((await facts(popup)).clock, running, 'a running timer counts down on the script surface');
    at = await press(page, `#${TIMER.id} button`, 'Pause');
    assert.ok((await arrival(popup, 'data-timer-state', 'paused', at)) <= BUDGET_MS);
    const paused = (await facts(popup)).clock;
    assert.match(paused, /^Paused, \d+:\d{2} left$/);
    await sleep(1300);
    assert.equal((await facts(popup)).clock, paused, 'a paused timer stands still');
    // the reveal
    await advanceTo(page, popup, REVEAL.segment);
    assert.equal((await facts(popup)).revealed, '0');
    for (const [label, steps] of [['Next step', '1'], ['Next step', '2'], ['Previous step', '1']]) {
      at = await press(page, `#${REVEAL.id} button`, label);
      assert.ok((await arrival(popup, 'data-revealed-steps', steps, at)) <= BUDGET_MS, `${steps} steps shown within the budget`);
      assert.equal((await facts(popup)).reveal, `Revealed steps: ${steps}`);
    }
    // and back to the timer: the state the presentation holds for that segment, not the one before
    await advanceTo(page, popup, TIMER.segment);
    assert.equal((await facts(popup)).timer, 'paused');
  });
});

test('every script of the deck is in the bundle: the speaker walks the whole deck with the network cut, and nothing was fetched', async () => {
  await withSession({}, async (context, { requests }) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    await context.setOffline(true);
    const delays = [];
    for (let index = 0; index < IDS.length; index += 1) {
      if (index > 0) delays.push(await advanceTo(page, popup, IDS[index]));
      const shown = await facts(popup);
      assert.equal(shown.position, `Segment ${index + 1} of ${IDS.length}`);
      const body = flat(shown.body);
      assert.ok(body.length > 200, `the script of ${IDS[index]} is on the page`);
      for (const text of probes(DECK[index])) assert.ok(body.includes(text), `the script of ${IDS[index]} shows "${text}"`);
    }
    console.log(`AC9 across the deck, offline: ${delays.map((one) => one.toFixed(1)).join(', ')} ms`);
    assert.ok(requests.every((one) => one.url.startsWith(origin)), 'nothing left the origin');
    assert.deepEqual(
      requests.filter((one) => ['fetch', 'xhr', 'eventsource', 'websocket'].includes(one.type)),
      [],
      'no fetch, no XHR',
    );
    assert.deepEqual(requests.filter((one) => /speaker-scripts|\.md(\?|$)/.test(one.url)), [], 'no script was requested');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// One way by default, two ways on request

test('by default the presentation moves the script and nothing else does: the controls are off while synchronized', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    const shown = await facts(popup);
    assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [true, true]);
    assert.match(shown.note, /presentation moves this script/i);
    await popup.evaluate(() => document.getElementById('speaker-next').click());
    await sleep(300);
    assert.equal(await current(page), IDS[0], 'the presentation did not move');
    assert.equal((await facts(popup)).index, '0', 'nor did the script');
  });
});

test('a script window that asks for two-way navigation of a presentation that did not is ignored', async () => {
  await withSession({}, async (context) => {
    const page = await openPresenter(context);
    const speaker = await openByHand(context, 'sync-two-way=1');
    await synchronized(speaker);
    assert.equal((await facts(speaker)).nextDisabled, false, 'it offers the control, as it was asked to');
    await speaker.evaluate(() => document.getElementById('speaker-next').click());
    await sleep(300);
    assert.equal(await current(page), IDS[0], 'the presentation decides, and it was not asked for two ways');
    assert.equal((await facts(speaker)).index, '0');
  });
});

for (const row of TRANSPORT_ROWS) {
  test(`opt-in two-way over ${row.name}: Next in the script window moves the presentation, and the script follows it`, async () => {
    await withSession({}, async (context) => {
      const { page, popup } = await present(context, withQuery(row.query, 'sync-two-way=1'));
      await synchronized(popup);
      assert.equal((await facts(popup)).transport, row.name);
      assert.equal((await facts(popup)).nextDisabled, false);
      assert.match((await facts(popup)).note, /ask the presentation to move/i);
      const at = await press(popup, '#speaker-next', 'Next segment');
      await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, IDS[1]);
      const roundTrip = await arrival(popup, 'data-segment-index', '1', at);
      assert.ok(roundTrip <= BUDGET_MS, `the request and the answer took ${roundTrip.toFixed(1)} ms`);
      assert.equal((await facts(popup)).id, IDS[1]);
      // and a move of the presentation reaches the script as before
      await advanceTo(page, popup, IDS[2]);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// AC10

test('AC10: every transport forced to fail: not-synchronized, a visible status, manual navigation that moves the script, and the change announced', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=all');
    await notSynchronized(popup);
    const shown = await facts(popup);
    assert.equal(shown.sync, 'not-synchronized');
    assert.equal(shown.transport, 'none');
    assert.match(shown.status, /not synchronized/i);
    assert.equal(await popup.locator('#speaker-sync-status').isVisible(), true, 'the status can be seen');
    assert.deepEqual(await attempts(popup), ['broadcastchannel:forced-failure', 'postmessage:forced-failure', 'storage:forced-failure']);
    assert.deepEqual(await Promise.all([counts(popup), counts(page)]), [{ opened: 0, closed: 0 }, { opened: 0, closed: 0 }], 'a forced failure opens nothing');
    assert.deepEqual(await popup.evaluate(() => window.__storage), { reads: 0, refusals: [] }, 'nor does it ask for the storage');
    await waitFor(popup, () => /not synchronized/i.test(window.__said.join(' ')));
    assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [true, false], 'Previous is off at the first segment; Next is on');
    assert.match(shown.note, /Previous and Next move it on their own/);

    // the navigation is the speaker's own, and it moves the actual script
    const first = flat(shown.body);
    await popup.click('#speaker-next');
    await popup.waitForFunction(() => document.getElementById('speaker-script').getAttribute('data-segment-index') === '1');
    const second = await facts(popup);
    assert.equal(second.id, IDS[1]);
    assert.equal(second.position, `Segment 2 of ${IDS.length}`);
    assert.notEqual(flat(second.body), first, 'the script on the page is the script of the other segment');
    for (const text of probes(DECK[1])) assert.ok(flat(second.body).includes(text), `the script of ${IDS[1]} shows "${text}"`);
    assert.equal(await popup.title(), `Speaker script — ${second.title} — Teaching SPA`);
    assert.equal(await current(page), IDS[0], 'and the presentation did not move');
    await waitFor(popup, () => window.__said.some((one) => /Segment 2 of/.test(one)));
    await popup.click('#speaker-prev');
    await popup.waitForFunction(() => document.getElementById('speaker-script').getAttribute('data-segment-index') === '0');
    assert.equal(flat((await facts(popup)).body), first);
    // the presentation moving does not move it
    await go(page, IDS[2]);
    await sleep(300);
    assert.equal((await facts(popup)).index, '0');
  });
});

test('AC10 by the clock: with nobody to answer, the transports are tried in order, each is given its timeout, and then the surface says so', async () => {
  await withSession({}, async (context) => {
    const speaker = await openByHand(context, 'sync-timeout=250');
    assert.equal((await facts(speaker)).sync === 'connecting' || (await facts(speaker)).sync === 'not-synchronized', true);
    await notSynchronized(speaker);
    const marks = await speaker.evaluate(() => window.__attrs.filter((one) => one.name === 'data-sync-state'));
    const started = marks.find((one) => one.value === 'connecting');
    const ended = marks.find((one) => one.value === 'not-synchronized');
    assert.ok(started && ended, `the surface passed through connecting to not-synchronized: ${JSON.stringify(marks)}`);
    const took = ended.at - started.at;
    assert.ok(took >= 2 * 250 - 40, `two transports were given 250 ms each, so it took at least 460 ms, and it took ${took.toFixed(0)}`);
    assert.ok(took < 3000, `and it did not wait on the one that cannot be used (the opener): ${took.toFixed(0)} ms`);
    assert.deepEqual(await attempts(speaker), ['broadcastchannel:timeout', 'postmessage:unavailable', 'storage:timeout']);
    const shown = await facts(speaker);
    assert.match(shown.status, /not synchronized/i);
    await waitFor(speaker, () => /not synchronized/i.test(window.__said.join(' ')));
    // manual navigation, over the real script
    await speaker.click('#speaker-next');
    await speaker.waitForFunction(() => document.getElementById('speaker-script').getAttribute('data-segment-index') === '1');
    assert.notEqual(flat((await facts(speaker)).body), flat(shown.body));
    await waitFor(speaker, () => window.__said.some((one) => /Segment 2 of/.test(one)));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// What is posted to the window is not trusted because it is well-formed (2.7, C2)

test('postMessage: a well-formed state from a window that is not the opener is ignored, and the same message from the opener is not', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel');
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    const [latest] = (await statesFromOpener(popup)).slice(-1);
    const forged = { ...latest, seq: latest.seq + 100, state: { ...latest.state, segmentId: IDS[2], segmentIndex: 2 } };
    await page.evaluate(([data, target]) => window.__forge(data, target), [forged, origin]);
    await waitFor(popup, (seq) => window.__messages.some((one) => one.data && one.data.seq === seq), forged.seq);
    const arrived = await popup.evaluate((seq) => window.__messages.filter((one) => one.data && one.data.seq === seq).map((one) => [one.origin, one.fromOpener]), forged.seq);
    assert.deepEqual(arrived, [[origin, false]], 'the message got to the window, from the same origin, and not from the opener');
    assert.equal((await facts(popup)).index, '1', 'and it moved nothing');
    await page.evaluate(([data, target]) => window.__opened.postMessage(data, target), [forged, origin]);
    await waitFor(popup, () => document.getElementById('speaker-script').getAttribute('data-segment-index') === '2');
  });
});

test('postMessage: a stale or a duplicate counter changes nothing, and a greater one from the opener does', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel');
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    await advanceTo(page, popup, IDS[2]);
    const states = await statesFromOpener(popup);
    assert.ok(states.length >= 2 && states[0].seq < states[states.length - 1].seq, 'the counters of the presenter only go up');
    const [stale] = states;
    const latest = states[states.length - 1];
    const toOpener = (message) => page.evaluate(([data, target]) => window.__opened.postMessage(data, target), [message, origin]);
    const received = (seq, n) => waitFor(popup, (wanted) => window.__messages.filter((one) => one.data && one.data.seq === wanted.seq).length >= wanted.n, { seq, n });

    await toOpener(stale); // a state of an earlier segment, with an earlier counter
    await received(stale.seq, 2);
    assert.equal((await facts(popup)).index, '2', 'a stale counter was not applied');

    const duplicate = { ...latest, state: { ...latest.state, segmentId: IDS[0], segmentIndex: 0 } }; // the counter of the last state, another segment
    await toOpener(duplicate);
    await received(latest.seq, 2);
    assert.equal((await facts(popup)).index, '2', 'a duplicate counter was not applied');

    const greater = { ...latest, seq: latest.seq + 1, state: { ...latest.state, segmentId: IDS[0], segmentIndex: 0 } }; // the same message, with a counter that is greater
    await toOpener(greater);
    await waitFor(popup, () => document.getElementById('speaker-script').getAttribute('data-segment-index') === '0');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// An opaque origin (C2): window.origin is "null", location.origin is not, and the storage refuses

test('in an opaque origin the presenter and the speaker post with *, only to each other, and the origin of the URL is not what they say', async () => {
  await withSession({}, async (context, { logs }) => {
    const { page, popup } = await present(context, 'sync-timeout=300', 'opaque');
    await synchronized(popup);
    const where = (one) => one.evaluate(() => ({ origin: window.origin, located: location.origin, opener: window.opener !== null }));
    assert.deepEqual(await where(page), { origin: 'null', located: origin, opener: false });
    assert.deepEqual(await where(popup), { origin: 'null', located: origin, opener: true });
    assert.equal(await page.evaluate(() => window.teachingSpa.sync.targetOrigin), '*', 'window.origin is "null", so it is *');
    assert.equal(await popup.evaluate(() => window.teachingSpa.speaker.sync.targetOrigin), '*');
    // BroadcastChannel reaches nobody in an opaque origin (the engine says no, or nobody answers); the window handle does. The script window
    // shows itself as synchronized as soon as the presentation has said, on the line, that the window is its own (it was asked who it is,
    // because its name cannot be read); the hello that follows it, on BroadcastChannel first, completes the handshake, and the attempts are
    // the ones of that handshake: they are read when it is done
    await waitFor(popup, () => window.teachingSpa.speaker.sync.status.attempts.some((one) => one.outcome === 'synchronized'));
    const tried = await attempts(popup);
    assert.equal(tried.length, 2);
    assert.match(tried[0], /^broadcastchannel:(unavailable|timeout)$/);
    assert.equal(tried[1], 'postmessage:synchronized');
    assert.equal((await facts(popup)).transport, 'postmessage');
    const seen = await traffic(popup).catch((error) => ({ refused: error.message }));
    assert.ok(seen.refused !== undefined, 'the test itself cannot read the storage of an opaque origin either');
    const messages = await popup.evaluate(() =>
      window.__messages.filter((one) => one.data && one.data.app === 'teaching-spa-sync').map((one) => [one.data.type, one.origin, one.fromOpener]),
    );
    assert.ok(messages.length >= 1 && messages.every(([, from, fromOpener]) => from === 'null' && fromOpener === true), JSON.stringify(messages));

    const delays = [await advanceTo(page, popup, IDS[1]), await advanceTo(page, popup, IDS[2])];
    console.log(`AC9 over postMessage in an opaque origin: ${delays.map((one) => one.toFixed(1)).join(', ')} ms (budget ${BUDGET_MS})`);

    // Every window of an opaque origin says "null", so the origin does not tell the opener from another window: the source does. (A frame
    // of the opener cannot play that window here: the sandbox of a page is the sandbox of its frames, and each of them has an origin of
    // its own that the opener cannot reach into.) The script window posts the message to itself: it says "null", like the opener does,
    // and its source is the window itself, which is not the opener.
    const [latest] = (await statesFromOpener(popup)).slice(-1);
    const forged = { ...latest, seq: latest.seq + 100, state: { ...latest.state, segmentId: IDS[0], segmentIndex: 0 } };
    await popup.evaluate((data) => window.postMessage(data, '*'), forged);
    await waitFor(popup, (seq) => window.__messages.some((one) => one.data && one.data.seq === seq), forged.seq);
    const arrived = await popup.evaluate((seq) => window.__messages.filter((one) => one.data && one.data.seq === seq).map((one) => [one.origin, one.fromOpener]), forged.seq);
    assert.deepEqual(arrived, [['null', false]], 'it says "null" like the opener does, and it is not the opener');
    assert.equal((await facts(popup)).index, '2', 'and it moved nothing');
    await page.evaluate(([data, target]) => window.__opened.postMessage(data, target), [forged, '*']);
    await waitFor(popup, () => document.getElementById('speaker-script').getAttribute('data-segment-index') === '0');
    assert.deepEqual(logs.filter((one) => /postMessage|target origin/i.test(one)), [], 'the browser refused no postMessage for its target origin');
  });
});

test('in an opaque origin the storage is not there to be used: the getter throws, is guarded, and the speaker says it is not synchronized', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel,postmessage', 'opaque');
    await notSynchronized(popup);
    assert.deepEqual(await attempts(popup), ['broadcastchannel:forced-failure', 'postmessage:forced-failure', 'storage:unavailable']);
    const storage = await popup.evaluate(() => window.__storage);
    assert.ok(storage.reads >= 1, 'the speaker did ask for the storage');
    assert.ok(storage.refusals.length >= 1 && storage.refusals.every((name) => name === 'SecurityError'), `and was refused: ${JSON.stringify(storage)}`);
    assert.match((await facts(popup)).status, /not synchronized/i);
    await waitFor(popup, () => /not synchronized/i.test(window.__said.join(' ')));
    await popup.click('#speaker-next'); // manual navigation, as in any not-synchronized state
    await popup.waitForFunction(() => document.getElementById('speaker-script').getAttribute('data-segment-index') === '1');
    // the presentation never touched the throwing getter in any way that is visible: it is still the page it was
    assert.equal(await current(page), IDS[0]);
    await go(page, IDS[1]);
    assert.equal(await current(page), IDS[1]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// A blocked window

for (const blocked of ['null', 'undefined']) {
  test(`popup blocked (STUB: window.open gives back ${blocked}): it is surfaced and announced, nothing is sent, and the presentation goes on`, async () => {
    await withSession({ popupBlocked: blocked }, async (context) => {
      const page = await openPresenter(context);
      await page.check('#present-open-script');
      await page.click('#present-start');
      await page.waitForFunction(() => /speaker script.*blocked/i.test(document.getElementById('present-notes').textContent));
      await waitFor(page, () => window.__said.some((one) => /speaker script.*blocked/i.test(one)));
      assert.equal(context.pages().length, 1, 'no window');
      assert.deepEqual(await page.evaluate(() => window.__openCalls), [['#/script', 'teaching-spa-script']]);
      assert.deepEqual(await page.evaluate(() => window.teachingSpa.sync.active), []);
      await go(page, IDS[1]);
      assert.equal(await current(page), IDS[1], 'the presentation still works');
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Lifecycle

test('lifecycle: a script window that goes to the back-forward cache keeps its channel; one that is left lets go of it and stops following', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    assert.deepEqual(await counts(popup), { opened: 1, closed: 0 });
    await popup.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    assert.deepEqual(await counts(popup), { opened: 1, closed: 0 }, 'the page may come back, and nothing was let go of');
    await advanceTo(page, popup, IDS[1]); // and it still follows

    await popup.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
    assert.deepEqual(await counts(popup), { opened: 1, closed: 1 }, 'the channel was closed');
    await go(page, IDS[2]);
    await sleep(300);
    assert.equal((await facts(popup)).index, '1', 'a script window that was left no longer follows');
  });
});

test('lifecycle: a presentation that is left lets go of its channels, says goodbye, and the script window it leaves says it is no longer synchronized', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    assert.deepEqual(await page.evaluate(() => window.teachingSpa.sync.active), ['broadcastchannel']);
    // The page stays alive, so that what the script window is told, and not only what it can no longer be told, is seen.
    const since = await page.evaluate(() => {
      const at = performance.timeOrigin + performance.now();
      window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }));
      return at;
    });
    assert.deepEqual(await counts(page), { opened: 1, closed: 1 });
    assert.deepEqual(await page.evaluate(() => window.teachingSpa.sync.active), []);

    // A clean departure: the script window was told, so within the AC9 budget it no longer says synchronized, it says so out loud,
    // and Previous and Next are its own. A stale index that merely stopped moving is not that.
    const left = await arrival(popup, 'data-sync-state', 'not-synchronized', since);
    assert.ok(left <= BUDGET_MS, `the script window took ${left.toFixed(1)} ms to stop claiming that it follows a presentation that said goodbye`);
    const shown = await facts(popup);
    assert.equal(shown.sync, 'not-synchronized');
    assert.equal(shown.transport, 'none');
    assert.match(shown.status, /not synchronized/i);
    assert.equal(await popup.locator('#speaker-sync-status').isVisible(), true, 'the status can be seen');
    assert.match(shown.note, /Previous and Next move it on their own/);
    await waitFor(popup, () => /not synchronized/i.test(window.__said.join(' ')));
    assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [true, false], 'Previous is off at the first segment; Next is on');

    await go(page, IDS[1]);
    await sleep(300);
    assert.equal(await current(page), IDS[1], 'the presentation itself is as it was');
    assert.equal((await facts(popup)).index, '0', 'and the script window does not follow it');
    await popup.click('#speaker-next');
    await popup.waitForFunction(() => document.getElementById('speaker-script').getAttribute('data-segment-index') === '1');
    assert.equal((await facts(popup)).sync, 'not-synchronized', 'the script window moves by hand, and does not say that it is synchronized again');
  });
});

test('lifecycle: a script window that was closed and opened again is brought to the segment on show, and follows from there', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context);
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    await popup.close();
    await go(page, IDS[3]); // nobody to tell: nothing throws, and the presentation moves
    assert.equal(await current(page), IDS[3]);
    // The window that opened took the focus, and the browser may have ended the fullscreen of this one already: SPA-06 follows it back
    // (the presentation controller reconciles with what the document says). So leave only if it is still on, and in one step.
    await page.evaluate(() => {
      const exit = document.getElementById('present-exit');
      if (!exit.hidden) exit.click();
    });
    await page.waitForFunction(() => document.fullscreenElement === null && !document.getElementById('present-start').hidden);
    const [again] = await Promise.all([page.waitForEvent('popup'), page.click('#present-start')]);
    await again.waitForFunction(() => window.teachingSpa && window.teachingSpa.speaker);
    await synchronized(again);
    const shown = await facts(again);
    assert.equal(shown.id, IDS[3], 'the segment on show, and not the one the window was closed on');
    assert.equal(shown.transport, 'broadcastchannel');
    await advanceTo(page, again, IDS[4]);
  });
});

// Independent regressions: an old presentation tab is a real browser peer, not a
// forged message. State and navigation must remain paired with the opening tab.
for (const row of TRANSPORT_ROWS.filter((one) => one.name !== 'postmessage')) {
  test(`QA R1: AC9 over ${row.name} follows the opening tab rather than an older presentation`, async () => {
    await withSession({}, async (context) => {
      const unrelated = await openPresenter(context, row.query);
      const owner = await openPresenter(context, row.query);
      const popup = await openScript(owner);
      await synchronized(popup);
      assert.equal((await facts(popup)).transport, row.name);

      const since = await go(owner, IDS[1]);
      await sleep(BUDGET_MS);

      assert.equal((await facts(popup)).index, '1', 'the opening tab advanced but its speaker stayed paired with the older tab');
      assert.ok((await arrival(popup, 'data-segment-index', '1', since)) <= BUDGET_MS);
      assert.equal(await current(unrelated), IDS[0]);
    });
  });

  test(`QA R1: two-way ${row.name} navigation must leave an unrelated presentation tab unchanged`, async () => {
    await withSession({}, async (context) => {
      const query = withQuery(row.query, 'sync-two-way=1');
      const unrelated = await openPresenter(context, query);
      const owner = await openPresenter(context, query);
      const popup = await openScript(owner);
      await synchronized(popup);
      assert.equal((await facts(popup)).transport, row.name);

      await popup.click('#speaker-next');
      await owner.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, IDS[1]);
      await waitFor(popup, () => document.getElementById('speaker-script').getAttribute('data-segment-index') === '1');

      assert.equal(await current(unrelated), IDS[0], 'Next must move only the presentation that opened this speaker');
    });
  });
}

test('QA R1: revisiting an expired timer synchronizes the done phase, not Running at zero', async () => {
  await withSession({}, async (context) => {
    // STUB: a shared wall-clock offset accelerates the time spent on another
    // segment. Controls, timer restoration, transport, and both DOMs are real.
    await context.addInitScript(() => {
      const now = Date.now.bind(Date);
      window.__qaClockOffset = 0;
      Date.now = () => now() + window.__qaClockOffset;
    });
    const { page, popup } = await present(context);
    await synchronized(popup);
    if ((await current(page)) !== TIMER.segment) await advanceTo(page, popup, TIMER.segment);
    await press(page, `#${TIMER.id} button`, 'Start');
    await waitFor(popup, () => document.getElementById('speaker-script').getAttribute('data-timer-state') === 'running');
    const otherId = IDS.find((id) => id !== TIMER.segment);
    await advanceTo(page, popup, otherId);
    const offset = DECK.find((segment) => segment.id === TIMER.segment).minutes * 60_000 + 1000;
    for (const one of [page, popup]) await one.evaluate((ms) => { window.__qaClockOffset = ms; }, offset);
    await advanceTo(page, popup, TIMER.segment);

    assert.match(await page.locator(`#${TIMER.id}`).innerText(), /Time is up/, 'the actual presentation timer has completed');
    assert.equal((await facts(popup)).timer, 'done', 'the speaker must report the phase actually shown by the presentation');
    assert.match((await facts(popup)).clock, /Time is up/);
  });
});

test('QA R1: a missing local asset returns 404 without crashing the synchronization browser runner', async () => {
  const response = await fetch(`${origin}/qa/nested/qa-r1-missing-asset.js`, { signal: AbortSignal.timeout(1000) });
  assert.equal(response.status, 404);
  await response.arrayBuffer();
});

// The same defect by every road that a read of the file can fail on, not the one file that is not there: a directory (EISDIR), a name
// that is not a file at all, and a path that is not under either surface. Each is answered, with a 404, and the runner serves on.
test('whatever the runner cannot read for a request is answered with a 404, and it goes on serving the pages', async () => {
  const unreadable = ['/qa/nested/assets', '/qa/nested/assets/', '/qa/opaque/assets', '/qa/nested/%00', '/qa/nested/..%2f..%2fpackage.json', '/package.json', '/qa/'];
  for (const where of unreadable) {
    const response = await fetch(`${origin}${where}`, { signal: AbortSignal.timeout(1500) });
    assert.equal(response.status, 404, `${where} has nothing to give`);
    await response.arrayBuffer();
  }
  const page = await fetch(url('nested'), { signal: AbortSignal.timeout(1500) });
  assert.equal(page.status, 200, 'and a page that is there is still served');
  assert.match(await page.text(), /<div id="app"|<body/i);
});

// A named target can already exist (C3). Open a second presentation through a
// real link in the first so both presentations can address that existing target.
// Advancing must follow the WindowProxy that the second Present actually kept,
// whether the browser reused the named speaker or created a new one.
async function reopenNamedSpeaker(context, query) {
  const { page: first, popup } = await present(context, query);
  await synchronized(popup);
  await first.evaluate(async () => {
    if (document.fullscreenElement !== null) await document.exitFullscreen();
  });
  await first.evaluate(() => {
    const link = document.createElement('a');
    link.id = 'qa-r2-another-presentation';
    link.href = location.href;
    link.target = 'qa-r2-second-presentation';
    link.rel = 'opener';
    link.textContent = 'Open another presentation';
    document.body.prepend(link);
  });
  const [second] = await Promise.all([
    first.waitForEvent('popup'),
    first.click('#qa-r2-another-presentation'),
  ]);
  await second.waitForFunction(() => window.teachingSpa && window.teachingSpa.sync);
  await second.check('#present-open-script');
  await second.click('#present-start');
  await second.waitForFunction(() => window.__opened && window.__opened.teachingSpa?.speaker);
  assert.equal(await second.evaluate(() => window.__opened.opener === window), true, 'the browser paired the named target with the second opener');
  return { first, second, popup };
}

for (const row of TRANSPORT_ROWS) {
  test(`QA R2: AC9 over ${row.name} survives a second presenter opening the existing named speaker`, async () => {
    await withSession({}, async (context) => {
      const { first, second } = await reopenNamedSpeaker(context, row.query);

      await go(second, IDS[1]);
      await sleep(BUDGET_MS);
      const opened = await second.evaluate(() => {
        const surface = window.__opened.document.getElementById('speaker-script');
        return {
          index: surface.getAttribute('data-segment-index'),
          sync: surface.getAttribute('data-sync-state'),
        };
      });

      assert.equal(opened.sync, 'synchronized');
      assert.equal(opened.index, '1', 'the returned speaker handle must follow the presentation that just opened it within 500 ms');
      assert.equal(await current(first), IDS[0], 'reopening the named target must not navigate the old presentation');
    });
  });

  test(`QA R2: two-way ${row.name} navigation after named-speaker reuse moves the new opener only`, async () => {
    await withSession({}, async (context) => {
      const { first, second } = await reopenNamedSpeaker(context, withQuery(row.query, 'sync-two-way=1'));
      await second.evaluate(() => window.__opened.document.getElementById('speaker-next').click());
      await sleep(BUDGET_MS);

      const actual = { oldPresentation: await current(first), newPresentation: await current(second) };
      assert.deepEqual(
        actual,
        { oldPresentation: IDS[0], newPresentation: IDS[1] },
        'the speaker returned by the second Present must navigate its current opener, not the presentation it followed before reuse',
      );
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// F1 of the independent review of SPA-07: the script window follows the presentation that owns it NOW. What it shook hands with is not
// forever. Another presentation can take over the named window (the QA R2 cases above), a presentation can be reloaded in place or
// presented again, and it can go away. In each case the script window pairs with whoever owns it within the AC9 budget, or says that
// it is not synchronized, out loud, and leaves Previous and Next to the speaker. Real tabs, a real reload, a real close.

/** A presentation page after a reload: the same tab, so the same window proxy for the script window to look at, and a new document. */
async function reloaded(page) {
  await page.evaluate(async () => {
    if (document.fullscreenElement !== null) await document.exitFullscreen();
  });
  await page.reload();
  await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation && window.teachingSpa.sync);
  return observed(page);
}

/** The segment after the one that is on show: where a presenter goes next. */
const segmentAfter = async (page) => IDS[IDS.indexOf(await current(page)) + 1];

/** Every value the sync state of the script surface took, in order. */
const syncStates = (page) => page.evaluate(() => window.__attrs.filter((one) => one.name === 'data-sync-state').map((one) => one.value));

for (const row of TRANSPORT_ROWS) {
  test(`F1: a presentation that is reloaded in place is followed again by the script window it opened, over ${row.name}`, async () => {
    await withSession({}, async (context) => {
      const { page, popup } = await present(context, withQuery(row.query, 'sync-two-way=1'));
      await synchronized(popup);
      await advanceTo(page, popup, IDS[1]);

      await reloaded(page);
      // Nothing is done to the script window, and it is not asked for anything: it is the window it was, with the tab that opened it,
      // now showing a new presentation, which it is to find for itself. Advancing right away is the hardest case for the budget.
      const next = await segmentAfter(page);
      await advanceTo(page, popup, next);
      const shown = await facts(popup);
      assert.equal(shown.sync, 'synchronized');
      assert.equal(shown.transport, row.name);

      // Opted into two ways, Next asks the presentation that is there now, which is the reloaded one.
      const asked = IDS[IDS.indexOf(next) + 1];
      await popup.click('#speaker-next');
      await page.waitForFunction((id) => window.teachingSpa.store.get().currentId === id, asked);
      await waitFor(popup, (id) => document.getElementById('speaker-script').getAttribute('data-segment-id') === id, asked);
    });
  });

  test(`F1: a presentation that is reloaded and presented again reuses the script window that is open, and the script follows it within the budget, over ${row.name}`, async () => {
    await withSession({}, async (context) => {
      const { page, popup } = await present(context, row.query);
      await synchronized(popup);
      await advanceTo(page, popup, IDS[1]);

      await reloaded(page);
      await page.check('#present-open-script');
      await page.click('#present-start');
      await page.waitForFunction(() => window.__opened && window.__opened.teachingSpa?.speaker);
      assert.equal(context.pages().length, 2, 'the browser reused the named window, and did not make another');
      assert.equal(await page.evaluate(() => window.__opened.opener === window), true, 'and the document that asked for it is its opener');

      await advanceTo(page, popup, await segmentAfter(page));
      const shown = await facts(popup);
      assert.equal(shown.sync, 'synchronized');
      assert.equal(shown.transport, row.name);
    });
  });

  for (const goodbye of [true, false]) {
    test(`F1: a presentation that is closed${goodbye ? '' : ' without a goodbye'} leaves the script window not synchronized, saying so, with Previous and Next its own, over ${row.name}`, async () => {
      await withSession(goodbye ? {} : { silentPagehide: true }, async (context) => {
        const { page, popup } = await present(context, row.query);
        await synchronized(popup);
        await advanceTo(page, popup, IDS[1]);
        if (!goodbye) {
          // The proof that nothing is said: the shell does not hear the page go, and has let go of nothing. Whatever the script window
          // does next, it does because the opener it has been looking at is closed.
          await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })));
          assert.deepEqual(await page.evaluate(() => window.teachingSpa.sync.active), [row.name], 'the shell never heard it');
        }
        const since = await popup.evaluate(() => performance.timeOrigin + performance.now());
        await page.close();

        const left = await arrival(popup, 'data-sync-state', 'not-synchronized', since);
        assert.ok(left <= 1500, `the script window took ${left.toFixed(0)} ms to stop claiming that it follows a presentation that is closed`);
        const shown = await facts(popup);
        assert.equal(shown.sync, 'not-synchronized');
        assert.equal(shown.transport, 'none');
        assert.match(shown.status, /not synchronized/i);
        assert.equal(await popup.locator('#speaker-sync-status').isVisible(), true, 'the status can be seen');
        await waitFor(popup, () => /not synchronized/i.test(window.__said.join(' ')));
        assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [false, false], 'Previous and Next are the speaker\'s own');

        await popup.click('#speaker-next');
        await popup.waitForFunction(() => document.getElementById('speaker-script').getAttribute('data-segment-index') === '2');
        await sleep(1500);
        const later = await facts(popup);
        assert.equal(later.index, '2', 'it stays where the speaker put it');
        const states = await syncStates(popup);
        assert.deepEqual(
          states.slice(states.lastIndexOf('synchronized') + 1).filter((one) => one !== 'not-synchronized'),
          [],
          `nobody is there, and from the moment it said so it did not say anything else: ${states.join(' ')}`,
        );
      });
    });
  }

  test(`F1: a presentation that is there and idle is not given up on: the script window stays synchronized across a wait, over ${row.name}`, async () => {
    await withSession({}, async (context) => {
      const { page, popup } = await present(context, row.query);
      await synchronized(popup);
      await sleep(2500);
      const states = await syncStates(popup);
      assert.ok(!states.includes('not-synchronized'), `a presentation that has nothing to say is not a presentation that is gone: ${states.join(' ')}`);
      assert.equal(states.at(-1), 'synchronized');
      assert.equal((await facts(popup)).transport, row.name);
      await advanceTo(page, popup, IDS[1]);
    });
  });

  test(`F1: the presentation that lost the named script window goes away, and the script window stays with the one that took it, over ${row.name}`, async () => {
    await withSession({}, async (context) => {
      const { first, second, popup } = await reopenNamedSpeaker(context, row.query);
      await advanceTo(second, popup, IDS[1]);
      await first.close();
      await sleep(700);
      assert.equal((await facts(popup)).sync, 'synchronized', 'the one that went away did not take the script window with it');
      assert.ok(!(await syncStates(popup)).includes('not-synchronized'));
      await advanceTo(second, popup, IDS[2]);
    });
  });
}

test('F1: a script window opened by hand before any presentation is there pairs with the one that comes later, without being asked', async () => {
  await withSession({}, async (context) => {
    const speaker = await openByHand(context, 'sync-timeout=250');
    await notSynchronized(speaker);
    const page = await openPresenter(context);
    await synchronized(speaker);
    assert.equal((await facts(speaker)).transport, 'broadcastchannel');
    await advanceTo(page, speaker, IDS[1]);
  });
});

// Independent F1 boundary: the correct presenter id is readable, not secret.
// A claim carrying it must still come from the actual opener, not another tab
// on a transport shared by the origin. Check the wrong DOM and a subsequent
// genuine update, not just whether the status continues to say synchronized.
for (const row of TRANSPORT_ROWS.filter((one) => one.name !== 'postmessage')) {
  test(`QA F1 boundary: a foreign ${row.name} claim cannot impersonate the current opener or freeze later updates`, async () => {
    await withSession({}, async (context) => {
      const { page, popup } = await present(context, row.query);
      await synchronized(popup);
      await advanceTo(page, popup, IDS[1]);
      const foreign = await openPresenter(context, row.query);
      const presenter = await page.evaluate(() => window.teachingSpaSyncPresenter);
      const message = {
        app: 'teaching-spa-sync', v: 1, type: 'claim', from: 'presenter',
        presenter, seq: Number.MAX_SAFE_INTEGER,
        state: { segmentId: IDS[2], segmentIndex: 2, revealedSteps: 0, timer: null },
      };
      await foreign.evaluate(([via, data]) => {
        if (via === 'broadcastchannel') {
          const channel = new BroadcastChannel('teaching-spa-sync');
          channel.postMessage(data);
          channel.close();
        } else {
          localStorage.setItem('teaching-spa-sync:to-speaker', JSON.stringify(data));
        }
      }, [row.name, message]);
      await sleep(50);
      const afterClaim = (await facts(popup)).index;
      await go(page, IDS[0]);
      await sleep(BUDGET_MS);
      const after = await facts(popup);
      assert.deepEqual(
        { afterClaim, afterOwnerMove: after.index, sync: after.sync },
        { afterClaim: '1', afterOwnerMove: '0', sync: 'synchronized' },
        'a claim from a different real tab must neither move the script nor poison later owner counters',
      );
    });
  });
}

test('QA F1 boundary: opaque reload plus Present recovers the named speaker within 500 ms', async () => {
  await withSession({}, async (context) => {
    // No API is stubbed: the existing sandbox surface supplies distinct opaque
    // origins, and postMessage with the held WindowProxy is its working path.
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel', 'opaque');
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    await reloaded(page);
    await page.check('#present-open-script');
    await page.click('#present-start');
    assert.equal(context.pages().length, 2, 'Present reuses the open named window');
    await advanceTo(page, popup, IDS[2]);
    assert.equal((await facts(popup)).sync, 'synchronized');
  });
});

test('QA F1 boundary: opaque presenter reload without a bye cannot leave a falsely synchronized script', async () => {
  await withSession({ silentPagehide: true }, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel', 'opaque');
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    await reloaded(page);
    await go(page, IDS[2]);
    // A generous failure-detection allowance, not a new AC9 budget. There is
    // no departure event: the existing silentPagehide fault hook suppresses it.
    await sleep(3500);
    const shown = await facts(popup);
    assert.ok(
      shown.sync !== 'synchronized' || shown.index === '2',
      `the reloaded owner is on segment 2, but after 3.5 s the script still reports ${JSON.stringify({
        index: shown.index, sync: shown.sync, status: shown.status,
        previousDisabled: shown.previousDisabled, nextDisabled: shown.nextDisabled,
      })}`,
    );
    if (shown.sync === 'not-synchronized') {
      assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [false, false]);
      assert.match(shown.status, /not synchronized/i);
      await waitFor(popup, () => /not synchronized/i.test(window.__said.join(' ')));
    }
  });
});

// An opaque origin cannot read the window that opened it, so the script window has nothing to look at and asks (sync.ts, `liveness`). The
// question has to be put and answered for real, in the browser: staying synchronized across a wait proves nothing for a window that never asked.
test('F1: an idle presentation in an opaque origin is asked whether it is there, answers every time, and is not given up on', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel', 'opaque');
    await synchronized(popup);
    await sleep(3500); // three questions a second apart, each answered at once, and nothing said by the presentation
    const states = await syncStates(popup);
    assert.ok(!states.includes('not-synchronized'), `a presentation that answers is not a presentation that is gone: ${states.join(' ')}`);
    assert.equal(states.at(-1), 'synchronized');
    const answers = await popup.evaluate(
      () => window.__messages.filter((one) => one.fromOpener && one.data && one.data.app === 'teaching-spa-sync' && one.data.type === 'pong').length,
    );
    assert.ok(answers >= 2 && answers <= 5, `the script window asked about once a second and its opener answered each time: ${answers} answers in 3.5 s`);
    await advanceTo(page, popup, IDS[1]);
  });
});

test('F1: an opaque presentation that is closed without a goodbye is found out through its window, and the script window has its own navigation', async () => {
  await withSession({ silentPagehide: true }, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel', 'opaque');
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]); // in the middle of the deck, so that neither Previous nor Next is off for want of a segment
    const since = await popup.evaluate(() => performance.timeOrigin + performance.now());
    await page.close();
    const left = await arrival(popup, 'data-sync-state', 'not-synchronized', since);
    assert.ok(left <= 1500, `the script window took ${left.toFixed(0)} ms to stop claiming that it follows a presentation that is closed`);
    const shown = await facts(popup);
    assert.equal(shown.transport, 'none');
    assert.match(shown.status, /not synchronized/i);
    assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [false, false], 'Previous and Next are the speaker\'s own');
    await waitFor(popup, () => /not synchronized/i.test(window.__said.join(' ')));
  });
});

// A message that a page posts as it unloads reaches the other window of an opaque origin with no `source` (Chromium), so that it cannot be told
// from the message of any window and is not acted on: the goodbye of an opaque presentation that is reloaded is lost, and the question of
// `liveness` is what finds it, within the second it waits to ask and the second it waits for the answer (the default timeout), and not at once.
test('F1: an opaque presentation that is reloaded, goodbye and all, is found out by the question and is not left as the one that is followed', async () => {
  await withSession({}, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel', 'opaque');
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    const since = await popup.evaluate(() => performance.timeOrigin + performance.now());
    await reloaded(page);
    const left = await arrival(popup, 'data-sync-state', 'not-synchronized', since);
    assert.ok(left <= 3000, `the script window took ${left.toFixed(0)} ms to stop claiming that it follows a presentation that was reloaded; the question and its answer take 2000`);
    const shown = await facts(popup);
    assert.equal(shown.transport, 'none');
    assert.match(shown.status, /not synchronized/i);
    assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [false, false], 'Previous and Next are the speaker\'s own');
    await waitFor(popup, () => /not synchronized/i.test(window.__said.join(' ')));
  });
});

test('QA F1 recovery: opaque reload then Present after liveness loss follows within 500 ms', async () => {
  await withSession({ silentPagehide: true }, async (context) => {
    const { page, popup } = await present(context, 'sync-fail=broadcastchannel', 'opaque');
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    await reloaded(page);
    await go(page, IDS[2]);
    await notSynchronized(popup);
    const degraded = await facts(popup);
    assert.deepEqual([degraded.previousDisabled, degraded.nextDisabled], [false, false]);

    // Reuse through the real Present control, but only after the new liveness
    // path has released the old pairing. No window or transport is stubbed.
    await page.check('#present-open-script');
    await page.click('#present-start');
    assert.equal(context.pages().length, 2, 'the named speaker is reused');
    await sleep(BUDGET_MS);
    const shown = await facts(popup);
    assert.deepEqual(
      { sync: shown.sync, index: shown.index },
      { sync: 'synchronized', index: '2' },
      `Present must repair an already degraded opaque speaker within ${BUDGET_MS} ms; got ${JSON.stringify({
        sync: shown.sync, index: shown.index, transport: shown.transport,
      })}`,
    );
    await advanceTo(page, popup, IDS[3]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// J1 of the independent review of SPA-07, over a REAL file: URL, as P1-P6 of the independent probe, kept as tests. The portable page
// (specification 2.9) is a file that the teacher opens by double click. Its origin is "null", so the script window cannot read the
// window that opened it, and BroadcastChannel and localStorage are shared by every copy of that file that is open. Without a way to
// ask the opener who it is, the script window would take the first presentation that answered: an older one that has nothing to do
// with it (P5), or the one that has just given the named window away (P2). The build of this repository is still index.html and a
// module script, which file: will not fetch, so the bundle is put inside the page, as the single-file build will have it. Nothing
// else is changed and nothing is stubbed: a real click on Present, real windows, a real reload, a real close.

let portableDir;
/** The URL of dist/index.html with its bundle inside the page, written once to a temporary directory that is removed after the run. */
function portableUrl() {
  if (portableDir === undefined) {
    const html = readFileSync(path.join(DIST, 'index.html'), 'utf8');
    const tag = html.match(/<script[^>]*src="\.\/assets\/([^"]+\.js)"[^>]*><\/script>/);
    assert.ok(tag, 'dist/index.html has a module script to put inside the page');
    const bundle = readFileSync(path.join(DIST, 'assets', tag[1]), 'utf8');
    assert.ok(!/<\/script/i.test(bundle), 'the bundle holds no </script, which putting it inside the page would have to escape');
    portableDir = mkdtempSync(path.join(os.tmpdir(), 'spa-07-file-'));
    writeFileSync(path.join(portableDir, 'index.html'), html.replace(tag[0], () => `<script type="module">${bundle}</script>`));
  }
  return pathToFileURL(path.join(portableDir, 'index.html')).href;
}

after(() => {
  if (portableDir !== undefined) rmSync(portableDir, { recursive: true, force: true });
});

/** The context of withSession for pages that are files. A file has no origin to hold the requests to, so none is held. */
async function withFiles(run) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const problems = [];
  context.setDefaultTimeout(8000);
  context.on('page', (page) => page.on('pageerror', (error) => problems.push(error.message)));
  try {
    await context.addInitScript(instrument, {});
    await run(context);
    assert.deepEqual(problems, [], 'the speaker script and its synchronization must not throw, nor leave a rejection unhandled');
  } finally {
    await context.close();
  }
}

async function openFilePresenter(context, query = '') {
  const page = await context.newPage();
  await page.goto(`${portableUrl()}${query === '' ? '' : `?${query}`}#/${IDS[0]}`);
  await page.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation && window.teachingSpa.sync);
  return observed(page);
}

/** Present takes the presentation into full screen, and a presentation in full screen has no Present control to use again. */
const leaveFullscreen = (page) =>
  page.evaluate(async () => {
    if (document.fullscreenElement !== null) await document.exitFullscreen();
  });

async function presentFile(context, query = '') {
  const page = await openFilePresenter(context, query);
  const popup = await openScript(page);
  await leaveFullscreen(page);
  return { page, popup };
}

/** The Present control used again, for a script window that is already open under its name. The time is that of the click, on the shared clock. */
async function presentAgain(page) {
  await page.check('#present-open-script');
  await page.evaluate(() =>
    document.getElementById('present-start').addEventListener(
      'click',
      () => {
        window.__presentedAt = performance.timeOrigin + performance.now();
      },
      { capture: true, once: true },
    ),
  );
  await page.click('#present-start');
  await leaveFullscreen(page);
  return page.evaluate(() => window.__presentedAt);
}

/** Every segment index the script surface took, in order, as the page it is in saw it happen. */
const segmentsShown = (popup) => popup.evaluate(() => window.__attrs.filter((one) => one.name === 'data-segment-index').map((one) => one.value));

test('J1 file: P1 a script window that cannot read its opener, over a file whose origin is null, follows the presentation that opened it within 500 ms', async () => {
  await withFiles(async (context) => {
    const { page, popup } = await presentFile(context);
    await synchronized(popup);
    const environment = await popup.evaluate(() => {
      let opener;
      try {
        opener = typeof window.opener.teachingSpaSyncPresenter;
      } catch (error) {
        opener = error.name;
      }
      return { origin: window.origin, locationOrigin: location.origin, channel: typeof BroadcastChannel, opener };
    });
    assert.deepEqual(
      environment,
      { origin: 'null', locationOrigin: 'file://', channel: 'function', opener: 'SecurityError' },
      'a file is an opaque origin: BroadcastChannel is there and the window that opened it cannot be read',
    );
    const shown = await facts(popup);
    assert.deepEqual({ sync: shown.sync, index: shown.index, transport: shown.transport }, { sync: 'synchronized', index: '0', transport: 'broadcastchannel' });
    await advanceTo(page, popup, IDS[1]);
    await advanceTo(page, popup, IDS[2]);
  });
});

test('J1 file: P2 a second presentation that takes the named script window is followed within 500 ms, and the one it took it from is not followed again', async () => {
  await withFiles(async (context) => {
    const { page: first, popup } = await presentFile(context);
    await synchronized(popup);
    await advanceTo(first, popup, IDS[1]);
    // The first presentation opens a second one of the same file, with its opener, the way a presenter opens another tab of it: the two
    // are related, so the second can name the script window that the first opened.
    await first.evaluate(() => {
      const link = document.createElement('a');
      link.id = 'j1-another-presentation';
      link.href = location.href;
      link.target = 'j1-another-presentation';
      link.rel = 'opener';
      link.textContent = 'Open another presentation';
      document.body.prepend(link);
    });
    const [second] = await Promise.all([first.waitForEvent('popup'), first.click('#j1-another-presentation')]);
    await second.waitForFunction(() => window.teachingSpa && window.teachingSpa.presentation && window.teachingSpa.sync);
    await observed(second);
    await go(second, IDS[3]);
    const pages = context.pages().length;

    const at = await presentAgain(second);
    assert.equal(context.pages().length, pages, 'Present names the script window that is open, and the browser gives that one back');
    assert.equal(await second.evaluate(() => window.__opened.opener === window), true, 'the browser paired the named window with the second presentation');
    const delay = await arrival(popup, 'data-segment-index', String(IDS.indexOf(IDS[3])), at);
    assert.ok(delay <= BUDGET_MS, `the script window took ${delay.toFixed(1)} ms to show the presentation that took it; the budget is ${BUDGET_MS} ms`);
    await advanceTo(second, popup, IDS[2]);

    // The first presentation is still open, and still moving. It is not the owner of the script window any more.
    await go(first, IDS[4]);
    await sleep(2 * BUDGET_MS);
    const shown = await facts(popup);
    assert.deepEqual(
      { sync: shown.sync, index: shown.index },
      { sync: 'synchronized', index: String(IDS.indexOf(IDS[2])) },
      `the script window must stay with the presentation that owns it, not follow the one that gave it up: ${JSON.stringify(shown)}`,
    );
    assert.ok(!(await segmentsShown(popup)).includes(String(IDS.indexOf(IDS[4]))), 'the script window never showed the segment that only the first presentation went to');
  });
});

test('J1 file: P3 a presentation that is reloaded in place is followed again within 500 ms, or the script window does not say that it is synchronized', async () => {
  await withFiles(async (context) => {
    const { page, popup } = await presentFile(context);
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    await reloaded(page);
    await go(page, IDS[2]);
    await sleep(BUDGET_MS);
    const soon = await facts(popup);
    assert.ok(
      soon.sync !== 'synchronized' || soon.index === '2',
      `the presentation was reloaded and is on segment 2, but 500 ms later the script window says ${JSON.stringify({ sync: soon.sync, index: soon.index })}`,
    );
    // A presentation that is reloaded does not hold the window it opened any more: only Present, which names the script window again,
    // brings the two back together over a file. Until then the script window does not say that it follows anything.
    await sleep(3 * BUDGET_MS);
    const later = await facts(popup);
    assert.ok(
      later.sync !== 'synchronized' || later.index === '2',
      `after 2 s the script window says ${JSON.stringify({ sync: later.sync, index: later.index })} of a presentation that is on segment 2`,
    );
  });
});

test('J1 file: P4 a presentation that is reloaded and then presented again takes its script window back within 500 ms, and AC9 holds', async () => {
  await withFiles(async (context) => {
    const { page, popup } = await presentFile(context);
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    await reloaded(page);
    await go(page, IDS[2]);
    await sleep(4000); // the script window has had time to find out that its owner went, to ask, and to give up for now
    const waiting = await facts(popup);
    assert.ok(waiting.sync !== 'synchronized' || waiting.index === '2', `a presentation that is on segment 2 is not what the script window shows: ${JSON.stringify(waiting)}`);

    await presentAgain(page);
    await sleep(BUDGET_MS);
    const shown = await facts(popup);
    assert.deepEqual(
      { sync: shown.sync, index: shown.index },
      { sync: 'synchronized', index: '2' },
      `Present must bring the script window back within ${BUDGET_MS} ms: ${JSON.stringify({ sync: shown.sync, index: shown.index, transport: shown.transport })}`,
    );
    await advanceTo(page, popup, IDS[3]);
  });
});

test('J1 file: P5 an older presentation of the same file that is open is not followed by a script window that another presentation opened', async () => {
  await withFiles(async (context) => {
    assert.ok(IDS.length > 5, 'the deck has a segment for the older presentation to be on');
    const older = await openFilePresenter(context);
    await go(older, IDS[5]);
    const { page, popup } = await presentFile(context);
    await synchronized(popup);
    const shown = await facts(popup);
    assert.deepEqual({ sync: shown.sync, index: shown.index }, { sync: 'synchronized', index: '0' }, 'the script window shows the presentation that opened it, not the older one');
    await advanceTo(page, popup, IDS[2]);

    await go(older, IDS[4]);
    await sleep(2 * BUDGET_MS);
    assert.equal((await facts(popup)).index, '2', 'the older presentation moved, and the script window did not');
    const seen = await segmentsShown(popup);
    assert.ok(!seen.includes('5') && !seen.includes('4'), `the script window never showed a segment that only the older presentation was on: ${seen.join(' ')}`);
  });
});

test('J1 file: P6 a presentation that is closed stops being followed: the script window says that it is not synchronized', async () => {
  await withFiles(async (context) => {
    const { page, popup } = await presentFile(context);
    await synchronized(popup);
    await advanceTo(page, popup, IDS[1]);
    const since = await popup.evaluate(() => performance.timeOrigin + performance.now());
    await page.close();
    const left = await arrival(popup, 'data-sync-state', 'not-synchronized', since);
    assert.ok(left <= 3500, `the script window took ${left.toFixed(0)} ms to stop claiming that it follows a presentation that is closed`);
    const shown = await facts(popup);
    assert.equal(shown.transport, 'none');
    assert.deepEqual([shown.previousDisabled, shown.nextDisabled], [false, false], "Previous and Next are the speaker's own");
  });
});

test('QA claim ordering: a delayed real BroadcastChannel ack cannot rewind the newer opener claim', async () => {
  await withSession({}, async (context) => {
    // STUB: hold only the first acknowledgement at the receiver. This models
    // different delivery times for BroadcastChannel and postMessage, rather than
    // inventing an acknowledgement or a presenter identity. Everything sent is
    // produced by the built presenter and carried by the browser's real APIs.
    await context.addInitScript(() => {
      const Channel = window.BroadcastChannel;
      window.BroadcastChannel = class extends Channel {
        constructor(name) {
          super(name);
          this.addEventListener('message', (event) => {
            const data = event.data;
            if (location.hash !== '#/script' || data?.app !== 'teaching-spa-sync' || data.type !== 'ack') return;
            if (!window.__qaReleaseAck) {
              window.__qaHeldAck = data;
              event.stopImmediatePropagation();
            } else {
              window.__qaDeliveredAck = true;
            }
          });
        }
      };
    });
    const { page, popup } = await present(context, 'sync-timeout=4000');
    await waitFor(popup, () => !!window.__qaHeldAck);
    const olderAck = await popup.evaluate(() => window.__qaHeldAck);
    assert.equal(olderAck.state.segmentIndex, 0, 'the held ack is the actual initial presentation state');
    assert.equal((await facts(popup)).sync, 'connecting', 'the original handshake is still awaiting that acknowledgement');

    await go(page, IDS[2]);
    await leaveFullscreen(page);
    await presentAgain(page);
    await waitFor(popup, () => document.getElementById('speaker-script').getAttribute('data-segment-index') === '2');
    assert.equal((await facts(popup)).sync, 'synchronized', 'the authenticated current-opener claim was applied');

    await popup.evaluate(() => { window.__qaReleaseAck = true; });
    await page.evaluate((ack) => {
      const channel = new BroadcastChannel('teaching-spa-sync');
      channel.postMessage(ack);
      channel.close();
    }, olderAck);
    await waitFor(popup, () => window.__qaDeliveredAck === true);
    const shown = await facts(popup);
    assert.deepEqual(
      { sync: shown.sync, index: shown.index },
      { sync: 'synchronized', index: '2' },
      'the initial ack predates the claim: §2.7 requires its older counter to be ignored, not to show the old script as synchronized',
    );
  });
});

// S2 of the second round over a REAL file: URL, where the script window cannot read its opener (J1) and so learns who the opener is from
// the first claim it gets from it. QA claim ordering above is the same case over http, where the opener is readable. The claim of a
// second Present is the newest thing that the script window knows of the presentation; the answer to the hello that was said before it,
// and arrives after it, must not take the window back to the state that the presentation was in then (2.7: a message whose counter is
// not greater than the last one applied is ignored). Nothing is invented: both the claim and the answer are the presentation's own.
test('S2 file: the answer to a hello that was said before a newer claim does not take the script window back, and the window goes on following', async () => {
  await withFiles(async (context) => {
    // STUB: the first acknowledgement is held at the script window, as in QA claim ordering, so that it arrives after the claim, as it would
    // from a slower transport. The page of the presentation is not touched.
    await context.addInitScript(() => {
      const Channel = window.BroadcastChannel;
      window.BroadcastChannel = class extends Channel {
        constructor(name) {
          super(name);
          this.addEventListener('message', (event) => {
            const data = event.data;
            if (location.hash !== '#/script' || data?.app !== 'teaching-spa-sync' || data.type !== 'ack') return;
            if (!window.__releaseAck) {
              window.__heldAck = data;
              event.stopImmediatePropagation();
            } else {
              window.__deliveredAck = true;
            }
          });
        }
      };
    });
    const { page, popup } = await presentFile(context, 'sync-timeout=4000');
    await waitFor(popup, () => !!window.__heldAck);
    const older = await popup.evaluate(() => window.__heldAck);
    assert.equal(older.state.segmentIndex, 0, 'the held acknowledgement is what the presentation said first: it is on segment 0');

    await go(page, IDS[2]);
    await presentAgain(page);
    await waitFor(popup, () => document.getElementById('speaker-script').getAttribute('data-segment-index') === '2');
    assert.equal((await facts(popup)).sync, 'synchronized', 'the claim of the presentation that opened the window is shown at once');

    await popup.evaluate(() => {
      window.__releaseAck = true;
    });
    await page.evaluate((ack) => {
      const channel = new BroadcastChannel('teaching-spa-sync');
      channel.postMessage(ack);
      channel.close();
    }, older);
    await waitFor(popup, () => window.__deliveredAck === true);
    await sleep(BUDGET_MS);
    const shown = await facts(popup);
    assert.deepEqual(
      { sync: shown.sync, index: shown.index },
      { sync: 'synchronized', index: '2' },
      'the answer that was said before the claim is older than it: its counter is not greater, so it is not shown',
    );
    const seen = await segmentsShown(popup);
    assert.deepEqual(
      seen.slice(seen.indexOf('2')).filter((index) => index !== '2'),
      [],
      `the script surface never went back from segment 2: ${seen.join(' ')}`,
    );
    // The handshake did complete, and over the working transport: the window follows the presentation again, within the budget of AC9.
    await advanceTo(page, popup, IDS[3]);
  });
});

test('QA claim recovery: a real file opener claim cannot rewind the script after transient liveness loss', async () => {
  await withFiles(async (context) => {
    // STUB: drop only pong delivery at the receiver to model a transient loss,
    // without replacing either document, its identity, or any state payload.
    await context.addInitScript(() => {
      const Channel = window.BroadcastChannel;
      window.BroadcastChannel = class extends Channel {
        constructor(name) {
          super(name);
          this.addEventListener('message', (event) => {
            if (location.hash === '#/script' && window.__qaDropPongs && event.data?.type === 'pong') {
              window.__qaDroppedPong = true;
              event.stopImmediatePropagation();
            }
          });
        }
      };
    });
    const { page, popup } = await presentFile(context, 'sync-timeout=200');
    await synchronized(popup);
    const delayedClaim = await popup.evaluate(() =>
      window.__messages.find((one) => one.fromOpener && one.data?.type === 'claim')?.data,
    );
    assert.equal(delayedClaim?.state.segmentIndex, 0, 'the delayed payload is the real initial opener claim, not a fabricated state');
    await advanceTo(page, popup, IDS[2]);
    await popup.evaluate(() => { window.__qaDropPongs = true; });
    await notSynchronized(popup);
    assert.equal(await popup.evaluate(() => window.__qaDroppedPong), true, 'a lost liveness response caused the transition');
    assert.equal((await facts(popup)).index, '2');
    const before = await popup.evaluate(() => ({ messages: window.__messages.length, segments: window.__attrs.filter((one) => one.name === 'data-segment-index').length }));

    // The current opener delivers its original claim only after the timeout.
    // Any later fresh ack may recover, but cannot excuse a transient rewind.
    await page.evaluate((claim) => window.__opened.postMessage(claim, '*'), delayedClaim);
    await waitFor(popup, (start) => window.__messages.slice(start).some((one) => one.fromOpener && one.data?.type === 'claim'), before.messages);
    const after = (await segmentsShown(popup)).slice(before.segments);
    assert.ok(!after.includes('0'), `§2.7 still applies after liveness loss: an old claim rewound segment 2; subsequent segments were ${JSON.stringify(after)}`);
  });
});
