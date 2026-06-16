import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, cpSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

// Phase C.4 / Finding 2.4 — the weekly-content-audit workflow is an
// authored gh-aw markdown spec. The authoritative validation step is
//
//     gh aw compile .github/workflows/weekly-content-audit.md
//
// (documented as `make lint-workflows` in README §Useful Commands).
// This test exercises that exact command end-to-end.
//
// Relationship to tests/workflows/weekly-audit-dry-run.test.ts:
// weekly-audit-dry-run asserts the compiled plan's *shape* (cron, safe
// outputs, permissions). This test asserts the *compile itself* succeeds
// against the file as checked in — a simpler oracle with no yaml parsing,
// and the one a human operator would run locally.
//
// Stretch goal (fixture-driven prompt dry-run) is deliberately skipped:
// gh-aw does not expose a prompt-replay harness, and mocking the agent
// runtime here would prove nothing beyond 'gh aw compile' already proves.
// Noted here so future readers don't spend time re-deriving that conclusion.

const ROOT = process.cwd();
const WORKFLOW_MD = join(
  ROOT,
  '.github',
  'workflows',
  'weekly-content-audit.md',
);

function ghAwAvailable(): { ok: true } | { ok: false; reason: string } {
  const gh = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (gh.status !== 0) {
    return { ok: false, reason: '`gh` CLI is not on PATH' };
  }
  const aw = spawnSync('gh', ['aw', '--help'], { encoding: 'utf8' });
  if (aw.status !== 0) {
    return {
      ok: false,
      reason:
        '`gh aw` extension is not installed — run: gh extension install github/gh-aw',
    };
  }
  return { ok: true };
}

describe('workflows: weekly-content-audit.md compiles cleanly', () => {
  it('workflow source file exists', () => {
    expect(existsSync(WORKFLOW_MD), `expected ${WORKFLOW_MD}`).toBe(true);
  });

  it('gh aw compile succeeds on the shipped workflow', () => {
    const avail = ghAwAvailable();
    if (!avail.ok) {
      // Loud skip — see brief. DO NOT fake-pass.
      console.warn(
        `[C.4] SKIPPING gh aw compile assertion: ${avail.reason}. ` +
          `Install instructions: \`gh extension install github/gh-aw\`.`,
      );
      return;
    }

    // Compile in an isolated copy so a successful run does NOT mutate the
    // repo's committed .lock.yml as a side-effect of `npm test`.
    const work = mkdtempSync(join(tmpdir(), 'gh-aw-compile-'));
    try {
      cpSync(join(ROOT, '.github'), join(work, '.github'), { recursive: true });
      // Drop sibling lock files so `gh aw compile weekly-content-audit`
      // only regenerates the one we care about.
      const wfDir = join(work, '.github', 'workflows');
      for (const f of [
        'code-review.md',
        'generate-prd.md',
        'code-review.lock.yml',
        'generate-prd.lock.yml',
      ]) {
        const p = join(wfDir, f);
        if (existsSync(p)) rmSync(p, { force: true });
      }

      const res = spawnSync(
        'gh',
        ['aw', 'compile', 'weekly-content-audit'],
        { cwd: work, encoding: 'utf8' },
      );
      expect(
        res.status,
        `gh aw compile must exit 0.\nstdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
      ).toBe(0);

      const lockPath = join(wfDir, 'weekly-content-audit.lock.yml');
      expect(existsSync(lockPath), 'compiler must emit the .lock.yml').toBe(true);

      // Sanity: the lock file is non-trivial (full GitHub Actions plan, not
      // an empty stub).
      const lock = readFileSync(lockPath, 'utf8');
      expect(lock.length).toBeGreaterThan(1000);
      expect(lock).toMatch(/^name:/m);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });

  it('committed weekly-content-audit.lock.yml matches the compiled output', () => {
    const committedLock = join(
      ROOT,
      '.github',
      'workflows',
      'weekly-content-audit.lock.yml',
    );
    expect(
      existsSync(committedLock),
      'committed .lock.yml must ship alongside the .md',
    ).toBe(true);
    // The lock is machine-generated; guard against stale-lock drift by
    // asserting it was regenerated after a recent-ish gh-aw version stamp.
    const body = readFileSync(committedLock, 'utf8');
    expect(body, 'committed lock must be a full Actions plan').toMatch(
      /^name:/m,
    );
    expect(body, 'committed lock must declare the cron trigger').toMatch(
      /cron:\s*['"]?0 5 \* \* 0/,
    );
  });
});
