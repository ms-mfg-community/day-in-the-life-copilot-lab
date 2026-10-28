// Run from the worktree: node tests/spa/qa-presentation-round2-controls.mjs
// Counterfactual controls touch generated test fixtures only; none is a proposed production fix. Aimed at the fixed product: each
// control puts one fix back in a generated copy and expects exactly the regression test that stands on it to fail.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';

const ROOT = process.cwd();
const TEST = 'tests/spa/qa-presentation-round2.test.ts';
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-present-round2-'));
const controller = 'workshop/spa/src/shell/presentation.ts';

function seed(name) {
  const root = path.join(scratch, name);
  mkdirSync(root);
  for (const relative of [
    'workshop/spa/src', 'workshop/spa/content', 'workshop/spa/index.html',
    'workshop/spa/vite.config.ts', 'workshop/spa/vite-content-plugin.ts',
    'workshop/slides', 'workshop/speaker-scripts', 'specs/005-teaching-spa.md',
    'package.json', 'tsconfig.json', 'vitest.config.ts', 'tests/spa/helpers', TEST,
  ]) {
    const destination = path.join(root, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(ROOT, relative), destination, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  return root;
}

function replace(root, relative, before, after) {
  const file = path.join(root, relative);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(source.split(before).length - 1, 1, `Control requires one exact site in ${relative}`);
  writeFileSync(file, source.replace(before, after));
}

function revertAnnouncementFix(root) {
  // Before the fix, what the hook put away announced for itself and took the end of fullscreen back out of the live region.
  // Two layers hold it now (the controller keeps its own message, and folds what the hook says into it), so both are put back.
  replace(root, controller, 'if (announce.capture) said = announce.capture(putAway);\n    else putAway();', 'putAway();');
  replace(root, 'workshop/spa/src/shell/live-region.ts',
    'waiting = [...waiting.filter((one) => one.keep !== keep), { message, keep }];', 'waiting = [{ message, keep }];');
}

function revertExitToken(root) {
  // Before the fix, the answer to any exit was believed, whichever presentation it was asked in.
  replace(root, controller, 'if (mine === exitToken) exitFailed();', 'exitFailed();');
}

function unit(name, expectedFailures, mutate = () => {}) {
  const root = seed(name);
  mutate(root);
  const result = spawnSync(process.execPath, [
    path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--reporter=dot',
  ], { cwd: root, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  console.log(`\n${name}: exit=${result.status}; expected failing tests=${expectedFailures}`);
  console.log(output.split(/\r?\n/).filter((line) =>
    /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:)/.test(line)).join('\n'));
  assert.ifError(result.error);
  assert.equal(result.status, expectedFailures ? 1 : 0, output);
  assert.equal(Number(/Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0), expectedFailures, output);
}

try {
  unit('shipped-behavior', 0);
  unit('announcement-fix-reverted', 1, revertAnnouncementFix);
  unit('exit-token-reverted', 1, revertExitToken);
  unit('both-fixes-reverted', 2, (root) => {
    revertAnnouncementFix(root);
    revertExitToken(root);
  });

  // Measure the optional WebKit matrix failures on the round-1 tree; do not assume every current failure pre-exists.
  const baseline = seed('before-round2-6937a0a');
  const files = execFileSync('git', [
    'ls-tree', '-r', '--name-only', '6937a0a', '--', 'workshop/spa/src', 'workshop/spa/index.html',
  ], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\r?\n/);
  for (const file of files) {
    writeFileSync(path.join(baseline, file),
      execFileSync('git', ['show', `6937a0a:${file}`], { cwd: ROOT, encoding: 'utf8' }));
  }
  const dist = path.join(baseline, 'dist');
  await build({
    configFile: path.join(baseline, 'workshop/spa/vite.config.ts'),
    logLevel: 'error',
    build: { outDir: dist },
  });
  const result = spawnSync(process.execPath, [
    '--test',
    '--test-reporter=tap',
    '--test-name-pattern=parameter-chart: every parameter|carousel: Previous|segment-timer: Start|backwards clock adjustment|actual 400 milliseconds',
    path.join(ROOT, 'tests/spa/interactions-browser-check.mjs'),
  ], {
    cwd: ROOT,
    env: { ...process.env, SPA_QA_DIST: dist, SPA_QA_PRESENT: '1', SPA_QA_BROWSER_TYPE: 'webkit' },
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  console.log(`\nWebKit interaction baseline at 6937a0a: exit=${result.status}`);
  const output = result.stdout + result.stderr;
  console.log(output.split(/\r?\n/).filter((line) =>
    /(^\s*not ok |^# (tests|pass|fail) |^\s+(error:|code:))/.test(line)).join('\n'));
  assert.ifError(result.error);
  assert.equal(result.status, 1, output);
  const failures = Number(/^# fail (\d+)$/m.exec(output)?.[1]);
  assert.ok(Number.isInteger(failures) && failures > 0, output);
  console.log(`\nPASS: both new regressions isolated independently. Diagnostic WebKit baseline: ${failures}/5 failures; no attribution is claimed for the others.`);
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
