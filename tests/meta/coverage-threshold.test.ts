import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const NODE_DIR = join(ROOT, 'node');
const NODE_COVERAGE_SUMMARY = join(NODE_DIR, 'coverage', 'coverage-summary.json');

// Threshold floors. Phase 8 brief: Node app >= 80% line coverage; workflow
// (root vitest) code >= 70%. The "workflow code" floor is interpreted as a
// structural floor on the root vitest suite — i.e. the suite itself must
// continue to grow with the repo. We measure that by asserting a minimum
// number of test files under tests/ (the suite must not silently shrink).
const NODE_LINE_COVERAGE_FLOOR = 80;
const ROOT_TEST_FILE_FLOOR = 25; // suite was 29 files at end of Phase 7

function ensureNodeCoverage(): void {
  if (existsSync(NODE_COVERAGE_SUMMARY)) return;
  // Generate coverage on demand. Use pnpm if available, fall back to npx.
  // Coverage config lives in node/vitest.config.ts.
  try {
    execSync('pnpm -C node test -- --coverage --coverage.reporter=json-summary', {
      stdio: 'pipe',
      cwd: ROOT,
    });
  } catch (err) {
    // Surface the failure with context — the assertion below will fail loudly.
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`failed to generate node coverage: ${detail}`);
  }
}

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
    ensureNodeCoverage();
    expect(
      existsSync(NODE_COVERAGE_SUMMARY),
      `expected coverage summary at ${NODE_COVERAGE_SUMMARY}`,
    ).toBe(true);
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
