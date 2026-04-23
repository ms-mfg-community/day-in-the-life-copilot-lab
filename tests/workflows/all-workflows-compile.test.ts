import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Phase D.4 — after the `add-pr-comment` → `add-comment` safe-outputs
// key rename landed in `.github/workflows/code-review.md`, bare
// `gh aw compile` (no target) succeeds end-to-end across every gh-aw
// workflow in the repo. This test is the oracle for that invariant,
// and mirrors the skip-with-warn pattern in
// tests/workflows/weekly-audit-compiles.test.ts: if the gh CLI or
// gh-aw extension is missing, skip loudly rather than fail.
//
// Compile runs in an isolated temp copy of .github so a successful run
// does not mutate the repo's committed .lock.yml files as a side
// effect of `npm test`.
//
// Complement to weekly-audit-compiles.test.ts:
//   - weekly-audit-compiles: targeted compile, sandbox + lock-file check.
//   - this file:             bare `gh aw compile`, whole-repo fan-out,
//                            short exit-0 oracle.

const ROOT = process.cwd();

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

describe('workflows: every gh-aw workflow compiles cleanly', () => {
  it('bare `gh aw compile` exits 0 from repo root', () => {
    const avail = ghAwAvailable();
    if (!avail.ok) {
      console.warn(
        `[D.4] SKIPPING all-workflows compile assertion: ${avail.reason}. ` +
          `Install instructions: \`gh extension install github/gh-aw\`.`,
      );
      return;
    }
    const work = mkdtempSync(join(tmpdir(), 'gh-aw-compile-all-'));
    try {
      cpSync(join(ROOT, '.github'), join(work, '.github'), { recursive: true });
      const res = spawnSync('gh', ['aw', 'compile'], {
        cwd: work,
        encoding: 'utf8',
      });
      expect(
        res.status,
        `\`gh aw compile\` must exit 0 from repo root — if this fails, ` +
          `one of the .github/workflows/*.md files uses a deprecated key ` +
          `or has drifted from its .lock.yml.\n` +
          `stdout:\n${res.stdout}\nstderr:\n${res.stderr}`,
      ).toBe(0);
    } finally {
      rmSync(work, { recursive: true, force: true });
    }
  });
});

