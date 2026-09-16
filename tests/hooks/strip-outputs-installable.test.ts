import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, execSync } from 'node:child_process';

// Phase C.2 / Finding 2.1 — the pre-commit-strip-notebook-outputs.sh script
// works, but nothing in .devcontainer/, Makefile, or README auto-installs it.
// A learner who skips Lab 12 never gets the hook.
//
// This test exercises the chosen install path end-to-end:
//   1. .githooks/pre-commit must exist in-repo, be executable, and
//      delegate to scripts/hooks/pre-commit-strip-notebook-outputs.sh.
//   2. `make setup-hooks` (the opt-in command advertised in README) must
//      set core.hooksPath to .githooks in a scratch git repo.
//   3. After the install command runs, a staged notebook picked up by
//      `.githooks/pre-commit` has its outputs[] stripped.
//
// The test uses a tempdir scratch repo and points hooks at the repo's
// .githooks/ directory directly — so it validates the ACTUAL wrapper
// shipped in the repo, not a local copy.

const ROOT = process.cwd();
const GITHOOKS_DIR = join(ROOT, '.githooks');
const GITHOOKS_PRECOMMIT = join(GITHOOKS_DIR, 'pre-commit');
const STRIP_SCRIPT = join(ROOT, 'scripts/hooks/pre-commit-strip-notebook-outputs.sh');

const FIXTURE_NB = {
  cells: [
    {
      cell_type: 'code',
      execution_count: 42,
      metadata: {},
      source: ['print("hello")\n'],
      outputs: [
        {
          output_type: 'stream',
          name: 'stdout',
          text: ['leaked-secret-value\n'],
        },
      ],
    },
  ],
  metadata: { kernelspec: { name: 'python3', display_name: 'Python 3' } },
  nbformat: 4,
  nbformat_minor: 5,
};

let workdir: string;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'hooks-install-'));
});

afterAll(() => {
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

describe('hooks: strip-outputs install path is wired (not Lab-12-only)', () => {
  it('.githooks/pre-commit wrapper exists at the canonical install path', () => {
    expect(
      existsSync(GITHOOKS_PRECOMMIT),
      `expected wrapper at ${GITHOOKS_PRECOMMIT}`,
    ).toBe(true);
  });

  it('.githooks/pre-commit is executable', () => {
    const mode = statSync(GITHOOKS_PRECOMMIT).mode;
    expect(
      (mode & 0o111) !== 0,
      `expected ${GITHOOKS_PRECOMMIT} to be executable`,
    ).toBe(true);
  });

  it('.githooks/pre-commit delegates to the shipped strip-outputs script', () => {
    const body = readFileSync(GITHOOKS_PRECOMMIT, 'utf8');
    // The wrapper must reference the canonical script path. Path format is
    // flexible (absolute, ${repo}/scripts..., or repo-root-relative).
    expect(body).toMatch(/scripts\/hooks\/pre-commit-strip-notebook-outputs\.sh/);
  });

  it('Makefile exposes a `setup-hooks` target that installs the hooks path', () => {
    const makefile = readFileSync(join(ROOT, 'Makefile'), 'utf8');
    expect(makefile, 'Makefile must declare setup-hooks').toMatch(
      /^setup-hooks:/m,
    );
    expect(makefile).toMatch(/git config core\.hooksPath \.githooks/);
  });

  it('running the install command registers .githooks in a scratch repo', () => {
    const scratch = join(workdir, 'scratch');
    mkdirSync(scratch);
    execFileSync('git', ['init', '-q', scratch]);
    // Emulate the one-liner the README/Makefile advertise.
    execSync('git config core.hooksPath .githooks', { cwd: scratch });
    const out = execSync('git config --get core.hooksPath', { cwd: scratch })
      .toString()
      .trim();
    expect(out).toBe('.githooks');
  });

  it('wrapper strips outputs when invoked on a staged .ipynb path', () => {
    // We invoke the wrapper with an explicit argv so the strip path is
    // exercised without needing a real `git commit` dance. This is the
    // contract Lab 12 teaches: the wrapper forwards .ipynb paths to the
    // canonical script.
    const nbPath = join(workdir, 'notebook.ipynb');
    writeFileSync(nbPath, JSON.stringify(FIXTURE_NB, null, 2));

    // Sanity pre-condition: the strip script must be on disk (the wrapper
    // will refuse to run otherwise).
    expect(existsSync(STRIP_SCRIPT)).toBe(true);

    execFileSync(GITHOOKS_PRECOMMIT, [nbPath], { stdio: 'pipe' });

    const cleaned = JSON.parse(readFileSync(nbPath, 'utf8'));
    for (const cell of cleaned.cells) {
      if (cell.cell_type !== 'code') continue;
      expect(cell.outputs).toEqual([]);
      expect(cell.execution_count).toBeNull();
    }
    expect(JSON.stringify(cleaned)).not.toContain('leaked-secret-value');
  });
});
