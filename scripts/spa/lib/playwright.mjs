// Finds a Playwright this machine already has and launches a browser with it. No dependency is installed by the repository
// for this: the browser checks under tests/spa and the capability probe (scripts/spa/probe.mjs) run against whatever Playwright
// is installed next to the repository or sits in npm's npx cache, the way tests/spa/*-browser-check.mjs have always found it.
//
//   SPA_QA_PLAYWRIGHT_MODULE  a playwright/index.mjs to use; otherwise `playwright`, then every copy in npm's npx cache, in turn
//
// Nothing here speaks for a browser it did not launch: the caller records what `version()` and the launch said.
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

export const ENGINES = ['chromium', 'firefox', 'webkit'];

/** Every playwright module that could be used, most deliberate first. */
export function playwrightCandidates() {
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

/**
 * Launches `engine` (chromium, firefox or webkit), through `channel` (chrome, msedge) when one is named, trying each Playwright
 * until one can. Resolves to { browser, playwright: the module path }. Rejects, naming every failure, when none can.
 */
export async function launchBrowser({ engine = 'chromium', channel, headless = true, args = [] } = {}) {
  if (!ENGINES.includes(engine)) throw new Error(`Unsupported browser type: ${engine}`);
  const failures = [];
  for (const candidate of playwrightCandidates()) {
    try {
      const imported = await import(pathToFileURL(candidate).href);
      const launcher = imported[engine] ?? imported.default?.[engine];
      const browser = await launcher.launch({ headless, args, ...(channel ? { channel } : {}) });
      return { browser, playwright: candidate };
    } catch (error) {
      failures.push(`${candidate}: ${String(error?.message ?? error).split('\n')[0]}`);
    }
  }
  throw new Error(`No Playwright that can launch ${engine}${channel ? ` (${channel})` : ''} was found; set SPA_QA_PLAYWRIGHT_MODULE.\n${failures.join('\n')}`);
}
