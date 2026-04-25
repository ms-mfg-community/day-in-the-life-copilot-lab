import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const GH_CLAB = join(ROOT, 'solutions', 'lab-gh-extensions', 'gh-clab', 'gh-clab');

describe('extensions: solutions/lab-gh-extensions/gh-clab/gh-clab', () => {
  it('file exists', () => {
    expect(existsSync(GH_CLAB)).toBe(true);
  });

  it('has a Node shebang on line 1', () => {
    const firstLine = readFileSync(GH_CLAB, 'utf8').split('\n')[0];
    expect(firstLine).toBe('#!/usr/bin/env node');
  });

  it('has the executable bit set for the owner', () => {
    const mode = statSync(GH_CLAB).mode;
    expect((mode & 0o100) !== 0).toBe(true);
  });

  it('smoke: mock mode exits 0 and prints output (no credentials, no diff required)', () => {
    // GH_CLAB_MOCK=1 forces the deterministic mock path; --allow-empty lets
    // the script run inside a clean working tree (no diff against HEAD).
    const out = execFileSync(GH_CLAB, ['--mock', '--allow-empty'], {
      env: { ...process.env, GH_CLAB_MOCK: '1' },
      encoding: 'utf8',
      timeout: 10000,
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.toLowerCase()).toMatch(/changelog|gh clab|mock|added|summariz/);
  });
});
