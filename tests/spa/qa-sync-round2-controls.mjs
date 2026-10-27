// Independent counterfactuals for the three round-1 findings. Run in the child
// worktree after npm run spa:build:
//   node tests/spa/qa-sync-round2-controls.mjs
// Only generated test fixtures change. The live source and dist are never edited.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-sync-round2-'));
const core = 'tests/spa/sync-core.test.ts';
const shell = 'tests/spa/sync-shell.test.ts';
const runner = 'tests/spa/sync-browser-check.mjs';
const sync = 'workshop/spa/src/shell/sync.ts';
const timer = 'workshop/spa/src/interactions/segment-timer.ts';

function seed(name) {
  const root = path.join(scratch, name);
  mkdirSync(root);
  for (const relative of [
    'workshop/spa', 'workshop/slides', 'workshop/speaker-scripts',
    'specs/005-teaching-spa.md', 'package.json', 'tsconfig.json',
    'vitest.config.ts', 'tests/spa/helpers', core, shell, runner,
  ]) {
    const destination = path.join(root, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(ROOT, relative), destination, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  return root;
}

function oldSource(root, relative) {
  const text = execFileSync('git', ['show', `3ebd7e3:${relative}`], { cwd: ROOT, encoding: 'utf8' });
  writeFileSync(path.join(root, relative), text);
}

function replace(root, relative, before, after) {
  const file = path.join(root, relative);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(source.split(before).length - 1, 1, `one exact mutation site in ${relative}`);
  writeFileSync(file, source.replace(before, after));
}

function run(root, label, args, expectedFailures, browser = false) {
  const command = browser ? args : [path.join(ROOT, 'node_modules/vitest/vitest.mjs'), 'run', ...args, '--reporter=dot'];
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    encoding: 'utf8',
    timeout: 90_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  console.log(`\n${label}: exit=${result.status}; expected failures=${expectedFailures}`);
  console.log(output.split(/\r?\n/).filter((line) =>
    /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:|not ok |# (tests|pass|fail)|error:|code:)/.test(line) ||
    /ERR_HTTP_HEADERS_SENT|headers after they are sent|operation was aborted/.test(line),
  ).join('\n'));
  assert.ifError(result.error);
  assert.equal(result.status, expectedFailures === 0 ? 0 : 1, output);
  const failures = browser
    ? Number(/^# fail (\d+)$/m.exec(output)?.[1])
    : Number(/Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0);
  assert.equal(failures, expectedFailures, output);
  if (browser && expectedFailures !== 0) assert.match(output, /ERR_HTTP_HEADERS_SENT|headers after they are sent/);
}

try {
  const current = seed('shipped');
  const coreArgs = [core, '-t', 'QA R1|the name a presentation gives itself|takes the acknowledgement of the presentation that opened it'];
  const shellArgs = [shell, '-t', 'QA R1|what the timer restores is what the speaker is told'];
  const browserArgs = ['--test', '--test-reporter=tap', '--test-name-pattern=QA R1: a missing local asset', runner];
  run(current, 'current pairing, acknowledgement and identity lifecycle', coreArgs, 0);
  run(current, 'current restored timer state and announcement', shellArgs, 0);
  run(current, 'current unreadable-asset response', browserArgs, 0, true);

  const unpaired = seed('F1-before-fix');
  oldSource(unpaired, sync);
  // An inert export satisfies the newer test file's import. It does not
  // implement naming, targeting or any transport behavior in the old source.
  const old = readFileSync(path.join(unpaired, sync), 'utf8');
  writeFileSync(path.join(unpaired, sync), `${old}\nexport const PRESENTER_KEY = 'teachingSpaSyncPresenter';\n`);
  run(unpaired, 'F1 original unpaired implementation', coreArgs, 8);

  const unrestored = seed('F2-before-fix');
  oldSource(unrestored, timer);
  run(unrestored, 'F2 original timer mount without reconciliation', shellArgs, 3);

  const headers = seed('F3-before-fix');
  replace(headers, runner, 'const body = readFileSync(file);', '// Counterfactual: the read happened after the headers.');
  replace(headers, runner, 'response.end(body);', 'response.end(readFileSync(file));');
  replace(headers, runner, 'if (response.headersSent) response.destroy();\n      else response.writeHead(404).end();', 'response.writeHead(404).end();');
  run(headers, 'F3 headers committed before asset read', browserArgs, 1, true);
  console.log('\nPASS: all three prior defect classes independently went red in scratch fixtures; the delivered fixes passed their controls.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
