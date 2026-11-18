// Independent counterfactual evidence. Run from the SPA-07 worktree:
//   node tests/spa/qa-sync-owner-controls.mjs
// Only temporary test fixtures are altered; live product files and dist stay put.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-owner-controls-'));
const fixture = path.join(scratch, 'fixture');
const SYNC = 'workshop/spa/src/shell/sync.ts';
const BROWSER = 'tests/spa/sync-browser-check.mjs';
const UNIT = 'tests/spa/qa-sync-owner-boundaries.test.ts';
const PLUGIN = 'workshop/spa/vite-content-plugin.ts';

function execute(label, args, { code = 0, failures, minimumFailures, env = {} } = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: fixture, env: { ...process.env, ...env }, encoding: 'utf8',
    timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
  });
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  console.log(`\n${label}: exit=${result.status}`);
  const lines = output.split(/\r?\n/).filter((line) =>
    /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:|not ok |# (tests|pass|fail)|error:)/.test(line));
  console.log(lines.slice(0, 25).join('\n'));
  if (lines.length > 25) console.log(`(${lines.length - 25} additional failure detail lines omitted)`);
  assert.ifError(result.error);
  assert.equal(result.status, code, output);
  const count = Number(/^# fail (\d+)$/m.exec(output)?.[1] ?? /Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0);
  if (failures !== undefined) assert.equal(count, failures, output);
  if (minimumFailures !== undefined) assert.ok(count >= minimumFailures, output);
  return output;
}
const unit = (label, file, options = {}, extra = []) => execute(label, [
  path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', file, '--reporter=dot', ...extra,
], options);
const browser = (label, pattern, options = {}) => execute(label, [
  '--test', '--test-reporter=tap', `--test-name-pattern=${pattern}`, BROWSER,
], options);
const build = () => execute('Build the counterfactual fixture', [
  path.join(ROOT, 'node_modules/vite/bin/vite.js'), 'build',
  '--config', 'workshop/spa/vite.config.ts', '--logLevel', 'error',
]);
const write = (relative, text) => writeFileSync(path.join(fixture, relative), text);
const old = (relative) => execFileSync('git', ['show', `8877f4d:${relative}`], { cwd: ROOT, encoding: 'utf8' });
function replaceOnce(source, before, after) {
  assert.equal(source.split(before).length - 1, 1, `exactly one counterfactual site: ${before}`);
  return source.replace(before, after);
}

try {
  mkdirSync(fixture);
  for (const relative of [
    'workshop/spa', 'workshop/slides', 'workshop/speaker-scripts',
    'package.json', 'tsconfig.json', 'vitest.config.ts', 'specs/005-teaching-spa.md',
    'tests/spa/helpers', UNIT, BROWSER, 'tests/spa/sync-lifecycle.test.ts', 'tests/spa/sync-content.test.ts',
  ]) {
    const destination = path.join(fixture, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(ROOT, relative), destination, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
  const source = readFileSync(path.join(fixture, SYNC), 'utf8');
  const plugin = readFileSync(path.join(fixture, PLUGIN), 'utf8');

  unit('Round-1 boundary regressions on current code', UNIT, { failures: 0 }, ['-t', 'QA F1:']);
  browser('Round-1 browser regressions on current code', 'QA F1 boundary:', { failures: 0 });
  // A real pre-fix revision, not the author's report. The inert constant only
  // satisfies the added recovery test's import; it supplies no lifecycle code.
  const beforeRound1 = execFileSync('git', ['show', `4d78b0a:${SYNC}`], { cwd: ROOT, encoding: 'utf8' });
  write(SYNC, `${beforeRound1}\nexport const LIVENESS_MS = 1000;\n`);
  unit('Pre-fix round-1 owner boundaries must go red', UNIT, { code: 1, failures: 3 }, ['-t', 'QA F1:']);
  build();
  browser('Pre-fix round-1 browser boundaries must go red', 'QA F1 boundary:', { code: 1, failures: 3 });
  write(SYNC, source);
  build();
  unit('Restored round-1 owner boundaries return green', UNIT, { failures: 0 }, ['-t', 'QA F1:']);
  browser('Restored round-1 browser boundaries return green', 'QA F1 boundary:', { failures: 0 });

  unit('Current postMessage source rejection control', UNIT, { failures: 0 }, ['-t', 'foreign postmessage']);
  const guarded = 'if ((handle === null || handle === undefined || event.source !== handle) && adopt?.(event) !== true) return;';
  write(SYNC, replaceOnce(source, guarded, '// Counterfactual fixture: no event.source check.'));
  unit('No source guard: the passing postMessage regression goes red', UNIT, { code: 1, failures: 1 }, ['-t', 'foreign postmessage']);
  write(SYNC, source);

  browser('Current opaque reload plus Present control', 'QA F1 boundary: opaque reload', { failures: 0 });
  write(SYNC, replaceOnce(source, "if (own === 'null') return '*';", "if (own === 'null') return '/';"));
  build();
  browser('Wrong opaque targetOrigin: the new browser control goes red', 'QA F1 boundary: opaque reload', { code: 1, failures: 1 });
  write(SYNC, source);

  // The old implementation lacks the new test constants. Inert exports only
  // let the current tests load; no lifecycle behavior is supplied by the shim.
  write(SYNC, `${old(SYNC)}\nexport const SPEAKER_KEY = 'teachingSpaSyncSpeaker';\nexport const WATCH_MS = 100;\nexport const RETRY_MS = 2000;\nexport const MAX_RETRY_MS = 30000;\n`);
  unit('8877f4d lifecycle: current assertions must expose missing F1 behavior',
    'tests/spa/sync-lifecycle.test.ts', { code: 1, minimumFailures: 80 });
  build();
  browser('8877f4d named-window reuse: all six preserved QA R2 cases go red',
    'QA R2:', { code: 1, failures: 6 });
  write(SYNC, source);

  write(PLUGIN, old(PLUGIN));
  unit('8877f4d content plugin: reserved script-id rejection tests go red',
    'tests/spa/sync-content.test.ts', { code: 1, minimumFailures: 4 }, ['-t', 'a segment called']);
  write(PLUGIN, plugin);
  unit('Restore content plugin: all reserved-id controls return green',
    'tests/spa/sync-content.test.ts', { failures: 0 }, ['-t', 'a segment called']);
  unit('Restore sync: all existing lifecycle tests return green',
    'tests/spa/sync-lifecycle.test.ts', { failures: 0 });
  unit('Restore sync: the postMessage source rejection control returns green',
    UNIT, { failures: 0 }, ['-t', 'foreign postmessage']);
  build();
  browser('Restore built fixture: six preserved cases and opaque reopen return green',
    'QA R2:|QA F1 boundary: opaque reload plus Present', { failures: 0 });
  console.log('\nPASS: positive controls went red for their intended defects, and restored fixtures returned green.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
