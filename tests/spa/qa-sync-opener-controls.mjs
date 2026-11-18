// Independently exercise J1/R2-S2 and the extraction against c6b14ad, then
// restore the current implementation. Product mutations exist only in fixtures.
// Run from the SPA-07 worktree: node tests/spa/qa-sync-opener-controls.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-opener-controls-'));
const fixture = path.join(scratch, 'fixture');
const SYNC = 'workshop/spa/src/shell/sync.ts';
const UNIT = 'tests/spa/qa-sync-owner-boundaries.test.ts';
const IDENTITY = 'tests/spa/sync-owner-identity.test.ts';
const SIZE = 'tests/spa/qa-sync-module-boundary.test.ts';
const BROWSER = 'tests/spa/sync-browser-check.mjs';
const identityCases = 'P5: an older|P2: a presentation that takes|not synchronized: the presentation';

function run(label, args, { failures = 0 } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: fixture, env: process.env, encoding: 'utf8',
    timeout: 180_000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  console.log(`\n${label}: exit=${result.status}\n${output}`);
  assert.ifError(result.error);
  assert.equal(result.status, failures === 0 ? 0 : 1, output);
  const count = Number(/^# fail (\d+)$/m.exec(output)?.[1] ?? /Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0);
  assert.equal(count, failures, output);
}

const unit = (label, file, pattern, failures = 0) => run(label, [
  path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', file,
  ...(pattern ? ['-t', pattern] : []),
], { failures });
const build = () => run('Build fixture', [
  path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build',
  '--config', 'workshop/spa/vite.config.ts', '--logLevel', 'error',
]);
const browser = (label, failures) => run(label, [
  '--test', '--test-reporter=tap', '--test-name-pattern=QA F1 recovery:|J1 file:', BROWSER,
], { failures });

try {
  mkdirSync(fixture);
  for (const relative of [
    'workshop/spa', 'workshop/slides', 'workshop/speaker-scripts',
    'package.json', 'tsconfig.json', 'vitest.config.ts', 'specs/005-teaching-spa.md',
    'tests/spa/helpers', UNIT, IDENTITY, SIZE, BROWSER,
  ]) {
    const destination = path.join(fixture, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(ROOT, relative), destination, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
  const current = readFileSync(path.join(fixture, SYNC), 'utf8');
  const historical = execFileSync('git', ['show', `c6b14ad:${SYNC}`], { cwd: ROOT, encoding: 'utf8' });

  writeFileSync(path.join(fixture, SYNC), historical);
  unit('RED c6b14ad: preserved opaque idle recovery', UNIT, 'QA F1 recovery:', 1);
  unit('RED c6b14ad: P5, P2, and idle BroadcastChannel claims', IDENTITY, identityCases, 3);
  unit('RED c6b14ad: the shell size contract', SIZE, '', 1);
  build();
  browser('RED c6b14ad: real file lifecycle and opaque idle recovery', 3);

  writeFileSync(path.join(fixture, SYNC), current);
  unit('GREEN restored: preserved opaque idle recovery', UNIT, 'QA F1 recovery:');
  unit('GREEN restored: all opener identity and lifecycle cases', IDENTITY, '');
  unit('GREEN restored: the shell size contract', SIZE, '');
  build();
  browser('GREEN restored: real file lifecycle and opaque idle recovery', 0);
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
