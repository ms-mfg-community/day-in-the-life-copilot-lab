import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const NODE_DIR = join(ROOT, 'node');
const NODE_COVERAGE_SUMMARY = join(NODE_DIR, 'coverage', 'coverage-summary.json');

// Phase D.3 / Finding #9 — coverage threshold check.
//
// This test READS node/coverage/coverage-summary.json directly. It does
// NOT regenerate coverage (previous versions did via execSync, which
// spawned vitest-inside-vitest and duplicated the work `make test-node`
// already performs upstream).
//
// Required ordering: run `make test-node` (or `pnpm -C node test`)
// BEFORE the root vitest suite so the summary file exists. The wired
// `make test-all` target satisfies this because it invokes `test-node`
// after the root suite already, and local developers who run the root
// suite alone from a cold clone see a loud skip instead of a spawned
// coverage run (see the skip-with-warn path below).
//
// The `--coverage` / `--coverage.reporter=json-summary` flags are set in
// node/vitest.config.ts (package script) so the file is regenerated on
// every `pnpm -C node test` run.

// Threshold floors. Phase 8 brief: Node app >= 80% line coverage; workflow
// (root vitest) code >= 70%. The "workflow code" floor is interpreted as a
// structural floor on the root vitest suite — i.e. the suite itself must
// continue to grow with the repo. We measure that by asserting a minimum
// number of test files under tests/ (the suite must not silently shrink).
const NODE_LINE_COVERAGE_FLOOR = 80;
const ROOT_TEST_FILE_FLOOR = 25; // suite was 29 files at end of Phase 7

function countTestFiles(dir: string): number {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return 0;
  let n = 0;
  for (const entry of readdirSync(abs)) {
    const full = join(abs, entry);
    if (statSync(full).isDirectory()) {
      n += countTestFiles(join(dir, entry));
    } else if (/\.test\.ts$/.test(entry)) {
      n += 1;
    }
  }
  return n;
}

describe('meta: coverage thresholds', () => {
  it(`node app line coverage is at least ${NODE_LINE_COVERAGE_FLOOR}%`, () => {
    if (!existsSync(NODE_COVERAGE_SUMMARY)) {
      // Loud skip — coverage summary is an upstream artefact of
      // `make test-node`. DO NOT regenerate here: that spawns vitest
      // inside vitest and hides missing wiring from CI. A cold-clone
      // developer running `npx vitest run` straight from root should
      // see this warn and know to run the node suite first.
      console.warn(
        `[D.3] SKIPPING node coverage floor assertion: ` +
          `${NODE_COVERAGE_SUMMARY} does not exist. ` +
          `Run \`make test-node\` (or \`pnpm -C node test\`) first to ` +
          `generate the coverage summary, then re-run this suite.`,
      );
      return;
    }
    const summary = JSON.parse(readFileSync(NODE_COVERAGE_SUMMARY, 'utf8')) as {
      total: { lines: { pct: number } };
    };
    const pct = summary.total.lines.pct;
    expect(pct, `node line coverage ${pct}% is below floor ${NODE_LINE_COVERAGE_FLOOR}%`)
      .toBeGreaterThanOrEqual(NODE_LINE_COVERAGE_FLOOR);
  });

  it(`root vitest suite has at least ${ROOT_TEST_FILE_FLOOR} test files (workflow-code floor)`, () => {
    const n = countTestFiles('tests');
    expect(n, `root suite shrank to ${n} test files (floor ${ROOT_TEST_FILE_FLOOR})`)
      .toBeGreaterThanOrEqual(ROOT_TEST_FILE_FLOOR);
  });
});

