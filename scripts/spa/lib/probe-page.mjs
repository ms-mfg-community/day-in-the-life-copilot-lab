// The page the capability probe (scripts/spa/probe.mjs) opens in each browser from each target (specs/005-teaching-spa.md 2.8,
// AC11). It is deliberately not the Teaching SPA: it holds the smallest page on which each of the eleven mechanisms can be
// tried, so that a result says something about the browser and the target and nothing about the application's own code.
//
// Two of the mechanisms are decided by the page loading at all: the inline module script and the module script fetched by
// URL each set a flag when they run, and the second one reports its error event when it does not. Everything else is driven
// from the probe through the automation protocol, from a real click where a user activation is needed.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const PROBE_PAGE = 'probe.html';
export const MODULE_BY_URL = 'module.js';
export const SERVICE_WORKER = 'sw.js';

const PAGE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Teaching SPA capability probe</title>
    <script>
      // Classic script, so it runs everywhere: the flags the two module scripts set are read against these defaults.
      window.__inlineModule = false;
      window.__moduleByUrl = false;
      window.__moduleByUrlError = null;
    </script>
    <script type="module">
      window.__inlineModule = true;
    </script>
    <script type="module" src="./${MODULE_BY_URL}" onerror="window.__moduleByUrlError = 'error event on the script element'"></script>
  </head>
  <body>
    <h1>Teaching SPA capability probe</h1>
    <p>This page measures what this browser allows from this address. It is opened by scripts/spa/probe.mjs.</p>
    <div id="fs" style="min-height: 4rem; border: 1px solid currentColor; padding: 1rem">The element that is asked to go fullscreen.</div>
    <button type="button" id="go">Go</button>
  </body>
</html>
`;

const MODULE = `window.__moduleByUrl = true;\n`;

// A service worker that does nothing: registering it is the measurement, and a worker that intercepted fetches would
// change what the next target sees.
const WORKER = `self.addEventListener('install', () => self.skipWaiting());\n`;

/** Writes the probe site into `dir` and returns the file names. */
export function writeProbeSite(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, PROBE_PAGE), PAGE);
  writeFileSync(path.join(dir, MODULE_BY_URL), MODULE);
  writeFileSync(path.join(dir, SERVICE_WORKER), WORKER);
  return { page: PROBE_PAGE, module: MODULE_BY_URL, worker: SERVICE_WORKER };
}
