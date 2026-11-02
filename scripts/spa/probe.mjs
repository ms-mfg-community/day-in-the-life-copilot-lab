#!/usr/bin/env node
// spa:probe - the capability probe campaign (specs/005-teaching-spa.md 2.8, AC11; child issue 8).
//
//   npm run spa:probe                         probe every browser this machine can run, write a run file per browser, render the matrix
//   npm run spa:probe -- --browsers chrome     probe only the named browsers (chrome, msedge, firefox), then render
//   npm run spa:probe -- --matrix-only         render workshop/spa/docs/capability-matrix.md from the runs that exist, probe nothing
//   npm run spa:probe -- --headed              run the browsers with a window (the default is headless)
//
// For each browser it opens the probe page (lib/probe-page.mjs) from each of the three targets (lib/probe-targets.mjs) and tries
// each of the eleven mechanisms of section 2.8 there, from a real click where the mechanism needs a user activation. What it
// saw goes into workshop/spa/docs/probe-runs/<id>.json, one file per browser per run, with a detail for every cell; the matrix
// is then rendered from every run file (lib/capability-matrix.mjs). A verdict is only ever `works` or `fails` for a
// combination this very run tried; a browser that cannot be launched here (Safari, on Windows) gets no run file and keeps
// every row at `not measured`, which is a fact about the evidence and is written as one.
//
// The browsers are the ones Playwright finds (lib/playwright.mjs): Chrome and Edge are the installed browsers, launched by
// channel; Firefox is Playwright's own build of Firefox, which the run file says. Nothing is installed by this script.
//
// Permissions. A presenter answers a permission prompt once and the browser profile keeps the answer; an automated browser
// cannot answer a prompt, and the automation protocol's grant is not honoured for window-management by Chrome. So Chrome and
// Edge run with a profile this script prepares, in which the window-management permission is already granted to the three
// targets, as it would be in the presenter's own profile after one prompt. The run file says so in the cell's detail. Where the
// permission is still at `prompt` when the mechanism is tried, the cell is `not measured`: a prompt nobody can answer is not a
// measurement of the mechanism.
//
// Exit 0: the matrix was rendered. Exit 1: no browser could be launched, or a run could not be written. Exit 2: bad invocation.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MECHANISMS, TARGETS, readRuns, renderMatrix } from './lib/capability-matrix.mjs';
import { launchBrowser, launchPersistent } from './lib/playwright.mjs';
import { PROBE_PAGE, SERVICE_WORKER, writeProbeSite } from './lib/probe-page.mjs';
import { lanAddress, serveTargets } from './lib/probe-targets.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUNS_DIR = path.join(REPO_ROOT, 'workshop/spa/docs/probe-runs');
const MATRIX = path.join(REPO_ROOT, 'workshop/spa/docs/capability-matrix.md');

/** The browsers of the matrix this machine may be able to run, and how Playwright launches each. */
const RUNNERS = {
  chrome: { browser: 'Chrome', engine: 'chromium', channel: 'chrome' },
  msedge: { browser: 'Edge', engine: 'chromium', channel: 'msedge' },
  firefox: { browser: 'Firefox', engine: 'firefox' },
};

const WAIT_MS = 4000;

const [SECURE, FULLSCREEN, FULLSCREEN_SCREEN, BROADCAST, POST_MESSAGE, STORAGE, WAKE_LOCK, KEYBOARD_LOCK, SERVICE, MODULE_BY_URL, INLINE_MODULE] = MECHANISMS;

class Failure extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

function parseArgs(argv) {
  const options = { browsers: Object.keys(RUNNERS), matrixOnly: false, headed: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--matrix-only') options.matrixOnly = true;
    else if (arg === '--headed') options.headed = true;
    else if (arg === '--browsers' && argv[i + 1] !== undefined) {
      options.browsers = argv[(i += 1)].split(',').map((name) => name.trim());
      const unknown = options.browsers.filter((name) => !Object.hasOwn(RUNNERS, name));
      if (unknown.length > 0) throw new Failure(`unknown browser(s): ${unknown.join(', ')}; the runners are ${Object.keys(RUNNERS).join(', ')}`, 2);
    } else throw new Failure(`usage: node scripts/spa/probe.mjs [--browsers chrome,msedge,firefox] [--matrix-only] [--headed]  (unknown argument: ${arg})`, 2);
  }
  return options;
}

const works = (detail) => ({ verdict: 'works', detail });
const fails = (detail) => ({ verdict: 'fails', detail });
const unmeasured = (detail) => ({ verdict: 'not measured', detail });
const describeError = (error) => (error && typeof error === 'object' && 'name' in error ? `${error.name}: ${error.message}` : String(error));

/**
 * Runs `handler` inside a real click on the page's button, so it has the transient user activation a fullscreen request, a
 * pop-up, a wake lock or a keyboard lock needs. The handler is a function serialized into the page; it receives `done`, which it
 * calls with a result object, and `argument`. Resolves to that result, or to a timeout result.
 */
async function withinClick(page, handler, argument) {
  await page.evaluate(
    ({ source, argument: value }) => {
      window.__result = new Promise((done) => {
        const handlerFunction = new Function(`return (${source})`)();
        document.getElementById('go').addEventListener(
          'click',
          () => {
            try {
              Promise.resolve(handlerFunction(done, value)).catch((error) => done({ ok: false, error: `${error?.name}: ${error?.message}` }));
            } catch (error) {
              done({ ok: false, error: `${error?.name}: ${error?.message}` });
            }
          },
          { once: true },
        );
      });
    },
    { source: handler.toString(), argument },
  );
  await page.click('#go');
  return Promise.race([
    page.evaluate(() => window.__result),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, error: `no answer within ${WAIT_MS} ms` }), WAIT_MS)),
  ]);
}

/** Leaves fullscreen if the page is in it, so the next measurement starts windowed. */
const leaveFullscreen = (page) =>
  page.evaluate(async () => {
    if (document.fullscreenElement !== null) await document.exitFullscreen().catch(() => undefined);
  });

// ---- the eleven mechanisms on one target -------------------------------------------------------------------------------

async function measureSecureContext(page) {
  const secure = await page.evaluate(() => window.isSecureContext);
  return secure === true ? works('window.isSecureContext is true') : fails(`window.isSecureContext is ${String(secure)}`);
}

async function measureInlineModule(page) {
  const ran = await page.evaluate(() => window.__inlineModule);
  return ran === true ? works('the inline type="module" script ran and set its flag') : fails('the inline type="module" script did not run');
}

async function measureModuleByUrl(page) {
  const seen = await page.evaluate(
    (wait) =>
      new Promise((resolve) => {
        const started = Date.now();
        const look = () => {
          if (window.__moduleByUrl === true) resolve({ ran: true });
          else if (window.__moduleByUrlError !== null) resolve({ ran: false, error: window.__moduleByUrlError });
          else if (Date.now() - started > wait) resolve({ ran: false, error: 'neither ran nor reported an error' });
          else setTimeout(look, 50);
        };
        look();
      }),
    WAIT_MS,
  );
  return seen.ran ? works('<script type="module" src="./module.js"> was fetched and ran') : fails(`<script type="module" src="./module.js"> did not run: ${seen.error}`);
}

async function measureFullscreen(page) {
  const result = await withinClick(page, async (done) => {
    const enabled = document.fullscreenEnabled;
    if (typeof document.getElementById('fs').requestFullscreen !== 'function') return done({ ok: false, error: 'requestFullscreen is not a function' });
    const changed = new Promise((resolve) => document.addEventListener('fullscreenchange', () => resolve(document.fullscreenElement === document.getElementById('fs')), { once: true }));
    await document.getElementById('fs').requestFullscreen();
    const onElement = await Promise.race([changed, new Promise((resolve) => setTimeout(() => resolve('no fullscreenchange'), 3000))]);
    done({ ok: onElement === true, error: onElement === true ? undefined : `the promise resolved but ${onElement === false ? 'fullscreenElement is not the element' : onElement}`, enabled });
  });
  await leaveFullscreen(page);
  return result.ok
    ? works(`requestFullscreen() resolved and fullscreenchange made the element the fullscreenElement (fullscreenEnabled was ${result.enabled})`)
    : fails(`requestFullscreen() did not put the element fullscreen: ${result.error}`);
}

/**
 * Fullscreen on a chosen screen (2.6). The window-management permission is read before the call: `granted` is the state the
 * prepared profile gives Chrome and Edge, `prompt` is a question nobody here can answer, and that cell is not measured.
 */
async function measureFullscreenOnScreen(page, prepared) {
  const result = await withinClick(page, async (done) => {
    if (typeof window.getScreenDetails !== 'function') return done({ ok: false, absent: true, error: 'window.getScreenDetails is not a function' });
    let state = 'unknown';
    try {
      state = (await navigator.permissions.query({ name: 'window-management' })).state;
    } catch {
      // a browser that has the method but not the permission name: the call below says what happens
    }
    let details;
    try {
      details = await window.getScreenDetails();
    } catch (error) {
      return done({ ok: false, state, error: `getScreenDetails() rejected: ${error?.name}: ${error?.message}` });
    }
    const screen = details.currentScreen ?? details.screens[0];
    const changed = new Promise((resolve) => document.addEventListener('fullscreenchange', () => resolve(document.fullscreenElement === document.getElementById('fs')), { once: true }));
    await document.getElementById('fs').requestFullscreen({ screen });
    const onElement = await Promise.race([changed, new Promise((resolve) => setTimeout(() => resolve('no fullscreenchange'), 3000))]);
    done({ ok: onElement === true, state, screens: details.screens.length, error: onElement === true ? undefined : `requestFullscreen({ screen }) did not put the element fullscreen: ${String(onElement)}` });
  });
  await leaveFullscreen(page);
  if (result.absent) return fails(result.error);
  const permission = prepared
    ? `the window-management permission was "${result.state}" beforehand, granted in the browser profile the probe prepared, as a presenter's profile holds it after one accepted prompt`
    : `the window-management permission was "${result.state}" beforehand, and the probe has no way to grant it in this browser`;
  if (result.ok) return works(`getScreenDetails() listed ${result.screens} screen(s) and requestFullscreen({ screen }) put the element fullscreen; ${permission}`);
  if (result.state === 'prompt') return unmeasured(`${result.error}; ${permission}: a prompt the probe cannot answer is not a measurement`);
  return fails(`${result.error}; ${permission}`);
}

async function measureWakeLock(page) {
  const result = await withinClick(page, async (done) => {
    if (!navigator.wakeLock || typeof navigator.wakeLock.request !== 'function') return done({ ok: false, error: 'navigator.wakeLock.request is not available' });
    const sentinel = await navigator.wakeLock.request('screen');
    await sentinel.release();
    done({ ok: true });
  });
  return result.ok ? works("navigator.wakeLock.request('screen') resolved with a sentinel, which was released") : fails(`screen wake lock: ${result.error}`);
}

async function measureKeyboardLock(page) {
  const result = await withinClick(page, async (done) => {
    if (!navigator.keyboard || typeof navigator.keyboard.lock !== 'function') return done({ ok: false, error: 'navigator.keyboard.lock is not available' });
    await navigator.keyboard.lock(['ArrowLeft', 'ArrowRight']);
    navigator.keyboard.unlock();
    done({ ok: true });
  });
  return result.ok ? works("navigator.keyboard.lock(['ArrowLeft', 'ArrowRight']) resolved, and unlock() was called") : fails(`keyboard lock: ${result.error}`);
}

async function measureServiceWorker(page) {
  const result = await page.evaluate(
    async (worker) => {
      if (!('serviceWorker' in navigator)) return { ok: false, error: 'navigator.serviceWorker is not available' };
      try {
        const registration = await navigator.serviceWorker.register(`./${worker}`);
        await registration.unregister();
        return { ok: true };
      } catch (error) {
        return { ok: false, error: `${error?.name}: ${error?.message}` };
      }
    },
    SERVICE_WORKER,
  );
  return result.ok ? works('navigator.serviceWorker.register("./sw.js") resolved, and the registration was unregistered') : fails(`service worker: ${result.error}`);
}

/**
 * The three mechanisms between two documents: the page opens a second copy of itself from a click (the pop-up the Teaching SPA
 * opens for the speaker script), the second posts over BroadcastChannel, writes localStorage, and posts to its opener, and the
 * first says what reached it. The pop-up also says whether it can read its opener, which is the fact 2.7's design turned on.
 */
async function measureBetweenDocuments(context, page, url) {
  await page.evaluate(() => {
    window.__between = { broadcast: null, storage: null, message: null };
    try {
      const channel = new BroadcastChannel('teaching-spa-probe');
      channel.addEventListener('message', (event) => {
        window.__between.broadcast = `message ${JSON.stringify(event.data)} arrived`;
      });
    } catch (error) {
      window.__between.broadcast = `BroadcastChannel could not be made: ${error?.name}: ${error?.message}`;
    }
    window.addEventListener('storage', (event) => {
      window.__between.storage = `storage event for key ${JSON.stringify(event.key)} arrived`;
    });
    window.addEventListener('message', (event) => {
      window.__between.message = `message ${JSON.stringify(event.data)} arrived with origin ${JSON.stringify(event.origin)}`;
    });
  });
  const popupPromise = context.waitForEvent('page', { timeout: WAIT_MS }).catch(() => null);
  const opened = await withinClick(
    page,
    (done, url) => {
      const handle = window.open(url, 'teaching-spa-probe-peer');
      done({ ok: handle !== null && handle !== undefined, error: handle === null || handle === undefined ? 'window.open returned ' + String(handle) : undefined });
    },
    url,
  );
  const popup = await popupPromise;
  if (!opened.ok || popup === null) {
    const reason = `the second document could not be opened: ${opened.error ?? 'no page event'}`;
    return { broadcast: fails(reason), storage: fails(reason), message: fails(reason), popupClosed: async () => undefined };
  }
  await popup.waitForLoadState('load');
  const sent = await popup.evaluate(() => {
    const report = {};
    try {
      new BroadcastChannel('teaching-spa-probe').postMessage('hello');
      report.broadcast = 'posted';
    } catch (error) {
      report.broadcast = `${error?.name}: ${error?.message}`;
    }
    try {
      localStorage.setItem('teaching-spa-probe', String(Date.now()));
      report.storage = 'written';
    } catch (error) {
      report.storage = `${error?.name}: ${error?.message}`;
    }
    try {
      if (!window.opener) throw new TypeError('window.opener is ' + String(window.opener));
      window.opener.postMessage('hello', '*');
      report.message = 'posted';
    } catch (error) {
      report.message = `${error?.name}: ${error?.message}`;
    }
    try {
      report.openerReadable = `the opener's location.href is readable (${window.opener.location.href === location.href ? 'the same page' : 'another page'})`;
    } catch (error) {
      report.openerReadable = `reading the opener's location throws ${error?.name}`;
    }
    report.origin = window.origin;
    return report;
  });
  const arrived = await page.evaluate(
    (wait) =>
      new Promise((resolve) => {
        const started = Date.now();
        const look = () => {
          const all = window.__between;
          if ((all.broadcast && all.storage && all.message) || Date.now() - started > wait) resolve(all);
          else setTimeout(look, 50);
        };
        look();
      }),
    WAIT_MS,
  );
  const origin = `the documents' origin is ${JSON.stringify(sent.origin)}; ${sent.openerReadable}`;
  const verdict = (received, posted, what) => {
    if (received !== null && received.includes('arrived')) return works(`${received}; ${origin}`);
    if (posted !== 'posted' && posted !== 'written') return fails(`${what}: the second document could not send: ${posted}; ${origin}`);
    return fails(`${what}: sent by the second document, nothing arrived at the first within ${WAIT_MS} ms${received ? ` (${received})` : ''}; ${origin}`);
  };
  return {
    broadcast: verdict(arrived.broadcast, sent.broadcast, 'BroadcastChannel'),
    storage: verdict(arrived.storage, sent.storage, 'storage event'),
    message: verdict(arrived.message, sent.message, 'postMessage to the opener'),
    popupClosed: () => popup.close(),
  };
}

/** The eleven mechanisms on one target, in `context`, which is left as it was (its pages closed). */
async function probeTarget(context, target, url, prepared) {
  const results = [];
  const record = (mechanism, outcome) => results.push({ mechanism, target, ...outcome });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load' });
    record(SECURE, await measureSecureContext(page));
    record(INLINE_MODULE, await measureInlineModule(page));
    record(MODULE_BY_URL, await measureModuleByUrl(page));
    record(SERVICE, await measureServiceWorker(page));
    record(WAKE_LOCK, await measureWakeLock(page));
    record(KEYBOARD_LOCK, await measureKeyboardLock(page));
    record(FULLSCREEN, await measureFullscreen(page));
    record(FULLSCREEN_SCREEN, await measureFullscreenOnScreen(page, prepared));
    const between = await measureBetweenDocuments(context, page, url);
    record(BROADCAST, between.broadcast);
    record(POST_MESSAGE, between.message);
    record(STORAGE, between.storage);
    await between.popupClosed();
  } finally {
    await page.close();
  }
  return results;
}

function describeTarget(target, urls, notes) {
  if (urls[target] === undefined) return `not served: ${notes[target]}`;
  // The temporary directory and this machine's address say nothing a reader of the run needs, and the first is the user's home.
  if (target === 'file:') return 'file:///<temporary directory>/probe.html';
  return urls[target].replace(/^(https:\/\/)[^/]+/, "$1<this machine's LAN address>:<port>").replace(/^(http:\/\/localhost):\d+/, '$1:<port>');
}

/**
 * A Chromium profile in which the window-management permission is granted to each served target, written the way Chrome keeps a
 * permission the user granted: a content-setting exception in the profile's Preferences. Returns the profile directory.
 */
function prepareChromiumProfile(dir, urls) {
  const profile = path.join(dir, 'profile');
  mkdirSync(path.join(profile, 'Default'), { recursive: true });
  const granted = { setting: 1, last_modified: '13300000000000000' };
  const exceptions = { 'file:///*,*': granted };
  for (const [target, url] of Object.entries(urls)) {
    if (target !== 'file:') exceptions[`${new URL(url).origin},*`] = granted;
  }
  const preferences = { profile: { content_settings: { exceptions: { window_placement: exceptions } } } };
  writeFileSync(path.join(profile, 'Default', 'Preferences'), JSON.stringify(preferences));
  return profile;
}

/**
 * Launches `runner` and hands back { version, playwright, prepared, forTarget, close }: `forTarget(target)` gives the context to
 * probe that target in and a function that puts it away afterwards. Chrome and Edge run in the prepared profile, one persistent
 * context for every target, and are told to trust the run's certificate by its key (lib/probe-targets.mjs), so the https page is
 * not in an ignored-error state. Firefox runs a fresh context per target and is told to ignore the certificate error, which is
 * the only way Playwright offers it.
 */
async function openBrowser(runner, options, site) {
  const headless = !options.headed;
  if (runner.engine === 'chromium') {
    const userDataDir = prepareChromiumProfile(site.dir, site.urls);
    const launched = await launchPersistent({
      engine: runner.engine,
      channel: runner.channel,
      headless,
      userDataDir,
      args: site.spki !== undefined ? [`--ignore-certificate-errors-spki-list=${site.spki}`] : [],
    });
    const { context } = launched;
    context.setDefaultTimeout(WAIT_MS * 3);
    for (const page of context.pages()) await page.close(); // the profile's start page
    return {
      version: context.browser()?.version() ?? 'unknown',
      playwright: launched.version,
      prepared: true,
      forTarget: async () => ({ context, release: async () => undefined }),
      close: () => context.close(),
    };
  }
  const launched = await launchBrowser({ engine: runner.engine, channel: runner.channel, headless });
  const { browser } = launched;
  return {
    version: browser.version(),
    playwright: launched.version,
    prepared: false,
    forTarget: async () => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, ignoreHTTPSErrors: site.spki !== undefined });
      context.setDefaultTimeout(WAIT_MS * 3);
      return { context, release: () => context.close() };
    },
    close: () => browser.close(),
  };
}

async function probeBrowser(name, runner, options, site) {
  let opened;
  try {
    opened = await openBrowser(runner, options, site);
  } catch (error) {
    process.stdout.write(`spa:probe: ${runner.browser} could not be launched here, so it keeps every row at not measured\n  ${String(error.message).split('\n')[0]}\n`);
    return undefined;
  }
  // The browser says what it saw, and what it saw names this machine's address and ports; a reader of the run needs neither.
  const address = lanAddress();
  const redact = (text) => (address === undefined ? text : text.split(address).join("<this machine's LAN address>")).replace(/(localhost|LAN address>):\d+/g, '$1:<port>');
  try {
    const ranAt = new Date().toISOString();
    const results = [];
    for (const target of TARGETS) {
      const url = site.urls[target];
      if (url === undefined) {
        for (const mechanism of MECHANISMS) results.push({ mechanism, target, ...unmeasured(`the target was not served: ${site.notes[target]}`) });
        continue;
      }
      process.stdout.write(`spa:probe: ${runner.browser} ${opened.version} on ${target} ...\n`);
      const { context, release } = await opened.forTarget(target);
      try {
        results.push(...(await probeTarget(context, target, url, opened.prepared)).map((result) => ({ ...result, detail: redact(result.detail) })));
      } catch (error) {
        for (const mechanism of MECHANISMS) {
          if (!results.some((result) => result.mechanism === mechanism && result.target === target)) {
            results.push({ mechanism, target, ...unmeasured(`the probe itself failed on this target before this mechanism was tried: ${describeError(error)}`) });
          }
        }
      } finally {
        await release();
      }
    }
    return {
      id: `${ranAt.slice(0, 10)}-${name}-${opened.version}`,
      browser: runner.browser,
      engine: runner.engine,
      channel: runner.channel ?? null,
      version: opened.version,
      build: runner.channel ? `the installed ${runner.browser}, launched by channel ${runner.channel}` : `Playwright's build of ${runner.browser}`,
      playwright: opened.playwright,
      headless: !options.headed,
      profile: opened.prepared
        ? 'a profile prepared by the probe, with the window-management permission granted to the three targets'
        : 'a fresh profile per target, with nothing granted',
      platform: `${os.platform()} ${os.release()}`,
      ranAt,
      targets: Object.fromEntries(TARGETS.map((target) => [target, describeTarget(target, site.urls, site.notes)])),
      results,
    };
  } finally {
    await opened.close();
  }
}

async function run(argv) {
  const options = parseArgs(argv);
  mkdirSync(RUNS_DIR, { recursive: true });
  if (!options.matrixOnly) {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'spa-probe-'));
    writeProbeSite(dir);
    const site = { dir, ...(await serveTargets(dir, PROBE_PAGE)) };
    let written = 0;
    try {
      for (const [target, note] of Object.entries(site.notes)) process.stdout.write(`spa:probe: ${target} is not served: ${note}\n`);
      for (const name of options.browsers) {
        const result = await probeBrowser(name, RUNNERS[name], options, site);
        if (result === undefined) continue;
        writeFileSync(path.join(RUNS_DIR, `${result.id}.json`), `${JSON.stringify(result, null, 2)}\n`);
        written += 1;
        process.stdout.write(`spa:probe: wrote workshop/spa/docs/probe-runs/${result.id}.json\n`);
      }
    } finally {
      await site.close();
      rmSync(dir, { recursive: true, force: true });
    }
    if (written === 0) throw new Failure('no browser could be launched, so no run was written and the matrix was not touched', 1);
  }
  const runs = readRuns(RUNS_DIR);
  writeFileSync(MATRIX, renderMatrix(runs));
  process.stdout.write(`spa:probe: rendered workshop/spa/docs/capability-matrix.md from ${runs.length} run file(s)\n`);
  return 0;
}

run(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    process.stderr.write(`spa:probe: ${error.message}\n`);
    process.exitCode = error instanceof Failure ? error.exitCode : 1;
  },
);
