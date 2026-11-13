// Production-bundle browser gate, following tests/spa/*-browser-check.mjs.
// Build first: cd lab-studio && npm run build
// Run: node --test --test-concurrency=1 tests/labs/studio-browser-check.mjs
// Required: LAB_STUDIO_QA_SCRATCH (this session's scratch directory).
// Playwright comes from the existing Node track, or LAB_STUDIO_QA_PLAYWRIGHT_MODULE.
// LAB_STUDIO_QA_BROWSER_CHANNEL can select an installed chrome/msedge browser.
// No remote GitHub operations or model requests are made by these four tests.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import path from 'node:path';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const STUDIO = path.join(ROOT, 'lab-studio');
const PATH_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 11, 13, 14, 16, 17, 18, 19, 20];
const require = createRequire(import.meta.url);
let browser;
let server;
let serverOutput = '';
let base;
let context;
let page;

async function availablePort() {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const address = reservation.address();
  assert.ok(address && typeof address !== 'string');
  const closing = once(reservation, 'close');
  reservation.close();
  await closing;
  return address.port;
}

before(async () => {
  const scratch = process.env.LAB_STUDIO_QA_SCRATCH;
  assert.ok(scratch && existsSync(scratch), 'Set LAB_STUDIO_QA_SCRATCH to the session scratch directory');
  process.env.TEMP = scratch;
  process.env.TMP = scratch;
  assert.ok(existsSync(path.join(STUDIO, 'client/dist/index.html')), 'Build Lab Studio before this check');
  const port = await availablePort();
  base = `http://127.0.0.1:${port}`;
  const loader = require.resolve('tsx', { paths: [STUDIO] });
  server = spawn(process.execPath, ['--import', pathToFileURL(loader).href, 'server/src/index.ts'], {
    cwd: STUDIO,
    env: {
      ...process.env,
      LAB_STUDIO_HOST: '127.0.0.1',
      LAB_STUDIO_PORT: String(port),
      LAB_STUDIO_SANDBOX: mkdtempSync(path.join(scratch, 'studio-browser-')),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => { serverOutput = serverOutput + String(chunk); });
  server.stderr.on('data', (chunk) => { serverOutput = serverOutput + String(chunk); });
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline && server.exitCode === null) {
    try {
      const response = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) { ready = true; break; }
    } catch {
      // This is bounded startup polling, not an application failure being retried.
    }
    await delay(100);
  }
  assert.ok(ready, `Lab Studio did not become ready:\n${serverOutput}`);
  const playwrightModule = process.env.LAB_STUDIO_QA_PLAYWRIGHT_MODULE ??
    require.resolve('@playwright/test', { paths: [path.join(ROOT, 'node')] });
  const imported = await import(pathToFileURL(playwrightModule).href);
  const chromium = imported.chromium ?? imported.default?.chromium;
  assert.ok(chromium, 'The selected Playwright module must export chromium');
  browser = await chromium.launch({
    headless: true,
    ...(process.env.LAB_STUDIO_QA_BROWSER_CHANNEL ? { channel: process.env.LAB_STUDIO_QA_BROWSER_CHANNEL } : {}),
  });
  console.log(`Lab Studio browser: Chromium ${browser.version()}`);
});

after(async () => {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    const exiting = once(server, 'exit');
    server.kill('SIGTERM'); // This exact child PID only; no name-based process kill.
    await exiting;
  }
});

beforeEach(async () => {
  const reset = await fetch(`${base}/api/sandbox/reset`, {
    method: 'POST',
    headers: { Origin: base },
  });
  assert.equal(reset.status, 200);
  context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => {
    if (localStorage.getItem('phase6-qa-initialized')) return;
    localStorage.setItem('phase6-qa-initialized', 'true');
    localStorage.setItem('lab-studio-location', JSON.stringify({ labIdx: 9, stepIdx: 0 }));
    localStorage.setItem('lab-studio-progress', JSON.stringify({
      'lab01/marketplace': true,
      'lab10/layer1': true,
      'lab01/map': false,
      'lab99/removed': true,
    }));
  });
  page = await context.newPage();
  await page.goto(base);
  await page.locator('.rail-track').first().waitFor();
});

afterEach(async () => {
  if (context) await context.close();
});

async function location() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('lab-studio-location')));
}

async function progress() {
  return page.evaluate(() => JSON.parse(localStorage.getItem('lab-studio-progress')));
}

async function openLab(number) {
  await page.locator('.rail-lab-head').nth(PATH_NUMBERS.indexOf(number)).click();
  assert.equal((await location()).labIdx, number - 1);
}

async function workspaceFile(file) {
  const response = await context.request.get(`${base}/api/sandbox/file`, { params: { path: file } });
  assert.equal(response.status(), 200);
  return (await response.json()).content;
}

test('homeAndRail.browser.showFourTracksAndPreserveExistingProgressAndNumericLocations', async () => {
  assert.deepEqual(await location(), { labIdx: 9, stepIdx: 0 });
  await page.locator('.rail-brand').click();
  assert.equal(await page.locator('.home-hero .eyebrow').textContent(), 'Everything GitHub Copilot · 20 labs · 4 tracks');
  assert.deepEqual(await page.locator('.home-hero .track-section').evaluateAll((sections) =>
    sections.map((section) => section.getAttribute('aria-labelledby')),
  ), ['home-track1', 'home-track2', 'home-track3', 'home-track4']);
  assert.deepEqual(await page.locator('.home-hero tbody td:first-child code').allTextContents(),
    PATH_NUMBERS.map((number) => String(number).padStart(2, '0')));
  assert.deepEqual(await page.locator('.rail-track-progress').allTextContents(), ['1/30', '1/21', '0/12', '0/11']);
  assert.match(await page.locator('.home-hero .step-nav').innerText(), /2\/74 steps verified/);
  assert.match(await page.locator('.home-hero tbody tr').first().innerText(), /1\/4/);
  const clipping = await page.locator('.rail-track-header, .home-hero .track-head').evaluateAll((headers) =>
    headers.filter((header) => header.scrollWidth > header.clientWidth + 1).length,
  );
  assert.equal(clipping, 0, 'New track headers must not horizontally clip at the desktop viewport');
  for (const number of PATH_NUMBERS) await openLab(number);
  await openLab(1);
  assert.equal(await page.locator('.rail-steps .punch.done').count(), 1);
  assert.match(await page.locator('.rail-steps button').last().innerText(), /marketplace/i);
});

test('manual.browser.nextAndBackFollowEveryTrackBoundaryAndTheLab01ConceptOrder', async () => {
  await openLab(1);
  const expected = [
    'The configuration ecosystem',
    'The instruction hierarchy',
    'Try it — ask the planner for a plan',
    'Discover agents from the marketplace',
  ];
  for (const [index, heading] of expected.entries()) {
    assert.equal(await page.locator('.manual h1').innerText(), heading);
    if (index < expected.length - 1) await page.locator('.step-nav .primary').click();
  }
  for (const [position, number] of PATH_NUMBERS.entries()) {
    await openLab(number);
    const lastStep = (await page.locator('.rail-steps button').count()) - 1;
    await page.locator('.rail-steps button').last().click();
    await page.locator('.step-nav .primary').click();
    if (position === PATH_NUMBERS.length - 1) {
      assert.deepEqual(await location(), { labIdx: -1, stepIdx: 0 });
      break;
    }
    assert.deepEqual(await location(), { labIdx: PATH_NUMBERS[position + 1] - 1, stepIdx: 0 });
    await page.getByRole('button', { name: '← Back', exact: true }).click();
    assert.deepEqual(await location(), { labIdx: number - 1, stepIdx: lastStep });
  }
  await openLab(1);
  await page.getByRole('button', { name: '← Back', exact: true }).click();
  assert.deepEqual(await location(), { labIdx: -1, stepIdx: 0 });
});

test('agentsMd.browser.insertVerifyAndReloadPersistTheRealOperationalContext', async () => {
  await openLab(2);
  await page.locator('.rail-steps button').filter({ hasText: 'AGENTS.md — operational notes, not an ADR' }).click();
  await page.locator('.verify-card').getByRole('button', { name: 'Verify ▸', exact: true }).click();
  await page.locator('.verify-msg.fail').waitFor();
  assert.match(await page.locator('.verify-msg.fail').innerText(), /## Operational Notes/);
  const fileCard = page.locator('.manual .snippet').filter({
    has: page.locator('.snippet-head span').filter({ hasText: /^AGENTS\.md$/ }),
  });
  await fileCard.getByRole('button', { name: 'Insert for me ▸', exact: true }).click();
  await fileCard.getByRole('button', { name: 'Written ✓', exact: true }).waitFor();
  const saved = await workspaceFile('AGENTS.md');
  assert.match(saved, /## Operational Notes/);
  assert.match(saved, /enrollmentDate/);
  assert.match(saved, /immutable copies/);
  assert.doesNotMatch(saved, /ADR-001|Architecture Decisions|## Layout/);
  await page.locator('.verify-card').getByRole('button', { name: 'Verify ▸', exact: true }).click();
  await page.locator('.verify-msg.pass').waitFor();
  assert.equal((await progress())['lab02/agents-md'], true);
  assert.equal((await progress())['lab01/marketplace'], true);
  await page.reload();
  await page.locator('.verify-card.pass').waitFor();
  assert.equal(await workspaceFile('AGENTS.md'), saved);
  assert.equal((await location()).labIdx, 1);
  assert.equal((await location()).stepIdx, 2);
  assert.equal((await progress())['lab02/agents-md'], true);
});

test('hooks.browser.deepDiveAndBothQuizzesPersistOnlyCorrectAnswersWithoutRegisteringTheExample', async () => {
  const originalHooks = await workspaceFile('.github/hooks/default.json');
  await openLab(6);
  const summary = page.locator('.manual details > summary');
  assert.match(await summary.innerText(), /all 15 hook lifecycle interrupts/i);
  const lifecycleRows = page.locator('.manual details tbody tr');
  assert.equal(await lifecycleRows.count(), 15);
  await summary.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.manual details').getAttribute('open'), null);
  await page.keyboard.press('Enter');
  assert.notEqual(await page.locator('.manual details').getAttribute('open'), null);
  const styles = await page.locator('.manual details table').first().evaluate((table) => getComputedStyle(table).fontSize);
  assert.equal(styles, '13px');
  for (const [title, key] of [
    ['Three hook types, any language', 'lab06/types'],
    ['Debugging & observability: see what Copilot did', 'lab06/debug'],
  ]) {
    await page.locator('.rail-steps button').filter({ hasText: title }).click();
    assert.equal(await page.locator('.quiz-result').count(), 0);
    await page.locator('.quiz input[type=radio]').nth(0).check();
    await page.getByRole('button', { name: 'Check answer ▸', exact: true }).click();
    assert.equal((await progress())[key], undefined, `${key}: a wrong answer must not complete the step`);
    await page.locator('.quiz-result.no').waitFor();
    await page.locator('.quiz input[type=radio]').nth(1).check();
    await page.getByRole('button', { name: 'Check answer ▸', exact: true }).click();
    await page.locator('.quiz-result.ok').waitFor();
    assert.equal((await progress())[key], true);
  }
  await page.reload();
  await page.locator('.rail-steps').waitFor();
  assert.equal((await progress())['lab06/types'], true);
  assert.equal((await progress())['lab06/debug'], true);
  assert.equal(await workspaceFile('.github/hooks/default.json'), originalHooks);
});
