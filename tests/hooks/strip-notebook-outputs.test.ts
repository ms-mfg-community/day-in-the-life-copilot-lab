import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, statSync, mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { execScript, hasCommand, isCommittedExecutable } from '../helpers/platform';

const ROOT = process.cwd();
const HOOK = join(ROOT, 'scripts/hooks/pre-commit-strip-notebook-outputs.sh');

const FIXTURE_NB = {
  cells: [
    {
      cell_type: 'code',
      execution_count: 7,
      metadata: {},
      source: ['print("hello")\n'],
      outputs: [
        {
          output_type: 'stream',
          name: 'stdout',
          text: ['hello\n'],
        },
        {
          output_type: 'execute_result',
          execution_count: 7,
          data: { 'text/plain': ['secret-result'] },
          metadata: {},
        },
      ],
    },
    {
      cell_type: 'markdown',
      metadata: {},
      source: ['# heading\n'],
    },
    {
      cell_type: 'code',
      execution_count: 12,
      metadata: {},
      source: ['1 + 1\n'],
      outputs: [{ output_type: 'execute_result', data: { 'text/plain': ['2'] } }],
    },
  ],
  metadata: { kernelspec: { name: 'python3', display_name: 'Python 3' } },
  nbformat: 4,
  nbformat_minor: 5,
};

let workdir: string;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'strip-nb-'));
});

afterAll(() => {
  if (workdir) rmSync(workdir, { recursive: true, force: true });
});

describe('hooks: pre-commit-strip-notebook-outputs.sh', () => {
  it('script exists at the expected path', () => {
    expect(existsSync(HOOK), `expected hook at ${HOOK}`).toBe(true);
  });

  it('script is executable', () => {
    // Git's recorded mode, not the local filesystem's: NTFS has no exec bit,
    // so a checkout can never satisfy this even when the commit is correct.
    expect(
      isCommittedExecutable(HOOK),
      `expected ${HOOK} to be committed with mode 100755`,
    ).toBe(true);
  });

  it('starts with a bash shebang', () => {
    const first = readFileSync(HOOK, 'utf8').split('\n')[0];
    expect(first).toMatch(/^#!.*\b(bash|sh)\b/);
  });

  it.skipIf(!hasCommand('jq'))('strips outputs[] and clears execution_count from a fixture .ipynb', () => {
    const nbPath = join(workdir, 'fixture.ipynb');
    writeFileSync(nbPath, JSON.stringify(FIXTURE_NB, null, 2));

    // Hook must accept a notebook path argument and rewrite it in place.
    execScript(HOOK, [nbPath]);

    const cleaned = JSON.parse(readFileSync(nbPath, 'utf8'));
    for (const cell of cleaned.cells) {
      if (cell.cell_type !== 'code') continue;
      expect(cell.outputs, 'code cell outputs must be []').toEqual([]);
      expect(cell.execution_count, 'code cell execution_count must be null').toBeNull();
    }
    // Sanity: the secret token from the original outputs must be gone.
    expect(JSON.stringify(cleaned)).not.toContain('secret-result');
  });

  it.skipIf(!hasCommand('jq'))('is idempotent — running twice produces the same content', () => {
    const nbPath = join(workdir, 'fixture-idem.ipynb');
    writeFileSync(nbPath, JSON.stringify(FIXTURE_NB, null, 2));

    execScript(HOOK, [nbPath]);
    const first = readFileSync(nbPath, 'utf8');
    execScript(HOOK, [nbPath]);
    const second = readFileSync(nbPath, 'utf8');

    expect(second).toBe(first);
  });
});
