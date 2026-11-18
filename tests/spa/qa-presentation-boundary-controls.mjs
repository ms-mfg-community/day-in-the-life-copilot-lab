// Run from the worktree: node tests/spa/qa-presentation-boundary-controls.mjs
// Counterfactual fixtures only. The announcer that forgets what was kept is the behaviour before the fix, not a proposal: it is
// put back in a generated copy to show that the boundary regressions stand on the fix, and nothing in the worktree is written.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';

const ROOT = process.cwd();
const TEST = 'tests/spa/qa-presentation-boundaries.test.ts';
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-present-boundary-'));
const fixture = path.join(scratch, 'fixture');
const announcerPath = path.join(fixture, 'workshop/spa/src/shell/live-region.ts');

function execute(args, cwd, extraEnv = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  assert.ifError(result.error);
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  console.log(output.split(/\r?\n/).filter((line) =>
    /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:|not ok |# (tests|pass|fail) )/.test(line)).join('\n'));
  return { code: result.status, output };
}

function unit(label, expectedFailures) {
  console.log(`\n${label}`);
  const result = execute([path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--reporter=dot'], fixture);
  console.log(`exit=${result.code}; expected assertion failures=${expectedFailures}`);
  assert.equal(result.code, expectedFailures ? 1 : 0, result.output);
  assert.equal(Number(/Tests\s+(\d+) failed/.exec(result.output)?.[1] ?? 0), expectedFailures, result.output);
}

try {
  mkdirSync(fixture);
  for (const relative of [
    'workshop/spa/src', 'workshop/spa/content', 'workshop/spa/index.html',
    'workshop/spa/vite.config.ts', 'workshop/spa/vite-content-plugin.ts',
    'workshop/slides', 'workshop/speaker-scripts', 'package.json',
    'tsconfig.json', 'vitest.config.ts', 'tests/spa/helpers', TEST,
  ]) {
    const destination = path.join(fixture, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(ROOT, relative), destination, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
  const source = readFileSync(announcerPath, 'utf8');
  // The one place that keeps what was kept: a message is replaced by one of its own kind only. Without it, any announcement
  // replaces whatever waits for the delay, which is how the announcer behaved before the fix.
  const site = 'waiting = [...waiting.filter((one) => one.keep !== keep), { message, keep }];';
  const forgetful = 'waiting = [{ message, keep }];';
  assert.equal(source.split(site).length - 1, 1, 'one exact site that keeps what was kept');

  unit('Unmodified product fixture: every boundary regression must be green', 0);
  writeFileSync(announcerPath, source.replace(site, forgetful));
  unit('Counterfactual: the announcer forgets what was kept (as before the fix)', 7);

  const dist = path.join(scratch, 'product-dist');
  await build({
    configFile: path.join(ROOT, 'workshop/spa/vite.config.ts'),
    logLevel: 'error',
    build: { outDir: dist, minify: false },
  });
  const counterfactualDist = path.join(scratch, 'counterfactual-dist');
  cpSync(dist, counterfactualDist, { recursive: true });
  const assets = path.join(counterfactualDist, 'assets');
  const bundle = path.join(assets, readdirSync(assets).find((file) => file.endsWith('.js')));
  const builtSource = readFileSync(bundle, 'utf8');
  assert.equal(builtSource.split(site).length - 1, 1, 'the built fixture contains the same site');
  writeFileSync(bundle, builtSource.replace(site, forgetful));
  const browser = (label, directory, engine, passes, failures) => {
    console.log(`\n${label}: ${engine}`);
    const result = execute([
      '--test', '--test-reporter=tap', '--test-name-pattern=QA boundary:',
      path.join(ROOT, 'tests/spa/presentation-browser-check.mjs'),
    ], ROOT, { SPA_QA_DIST: directory, SPA_QA_BROWSER_TYPE: engine });
    assert.equal(result.code, failures ? 1 : 0, result.output);
    assert.equal(Number(/^# pass (\d+)$/m.exec(result.output)?.[1]), passes, result.output);
    assert.equal(Number(/^# fail (\d+)$/m.exec(result.output)?.[1]), failures, result.output);
  };
  for (const engine of ['chromium', 'firefox', 'webkit']) {
    browser('Product built bundle', dist, engine, 2, 0);
    browser('Counterfactual built bundle (announcer forgets what was kept)', counterfactualDist, engine, 0, 2);
  }

  writeFileSync(announcerPath, source);
  unit('Restore the fixture: every boundary regression must be green again', 0);
  console.log('\nPASS: seven unit regressions green/red/green; two browser regressions green on the product and red on the counterfactual in each engine.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
