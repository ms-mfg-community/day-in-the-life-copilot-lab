// Run: node tests/spa/qa-presentation-announcer-controls.mjs
// Only generated test fixtures are mutated; production files and the committed QA regressions are never edited.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const TEST = 'tests/spa/qa-presentation-announcer-delta.test.ts';
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-announcer-delta-'));
const fixture = path.join(scratch, 'fixture');
const relative = 'workshop/spa/src/shell/live-region.ts';

function run(label, failures) {
  const result = spawnSync(
    process.execPath,
    [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', TEST, '--reporter=dot'],
    { cwd: fixture, encoding: 'utf8', timeout: 60_000, maxBuffer: 4 * 1024 * 1024 },
  );
  assert.ifError(result.error);
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  console.log(`\n${label}: exit=${result.status}; expected assertion failures=${failures}`);
  console.log(output.split(/\r?\n/).filter((line) => /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:)/.test(line)).join('\n'));
  assert.equal(result.status, failures ? 1 : 0, output);
  assert.equal(Number(/Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0), failures, output);
  if (failures) assert.match(output, /AssertionError:/, 'A red control must fail an assertion, not collection or setup');
}

try {
  mkdirSync(fixture);
  for (const file of [
    'workshop/spa/src', 'workshop/spa/content', 'workshop/spa/index.html',
    'workshop/spa/vite.config.ts', 'workshop/spa/vite-content-plugin.ts',
    'workshop/slides', 'workshop/speaker-scripts', 'package.json',
    'tsconfig.json', 'vitest.config.ts', 'tests/spa/helpers', TEST,
  ]) {
    const destination = path.join(fixture, file);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(ROOT, file), destination, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
  const target = path.join(fixture, relative);
  const source = readFileSync(target, 'utf8').replace(/\r\n/g, '\n');
  const mutate = (before, after) => {
    assert.equal(source.split(before).length - 1, 1, 'A red control needs one exact mutation site');
    writeFileSync(target, source.replace(before, after));
  };

  run('Unmodified fixture', 0);
  mutate('const keep = options?.keep === true;', 'const keep = options?.keep === true;\n    if (keep) return;');
  run('Kept statuses are never written: every new test must go red', 11);
  mutate('      waiting = [];\n', '');
  run('Written statuses leak into later announcements', 9);
  mutate('      held.push(message);\n      return;', '      held.push(message);');
  run('Captured announcements also corrupt pending writes', 1);
  writeFileSync(target, source);
  const controller = path.join(fixture, 'workshop/spa/src/shell/presentation.ts');
  const controllerSource = readFileSync(controller, 'utf8');
  const popupAnnouncement = 'announce(SCRIPT_BLOCKED, { keep: true });';
  assert.equal(controllerSource.split(popupAnnouncement).length - 1, 1, 'One direct blocked-popup announcement');
  writeFileSync(controller, controllerSource.replace(popupAnnouncement, 'announce(SCRIPT_BLOCKED);'));
  run('The blocked-popup caller forgets to keep its message while fullscreen is pending', 1);
  writeFileSync(controller, controllerSource);
  run('Restored fixture', 0);
  console.log('\nPASS: all eleven added tests were observed red; the restored fixture is green.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
