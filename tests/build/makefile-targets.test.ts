import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MAKEFILE = join(ROOT, 'Makefile');
const REQUIRED_TARGETS = ['test-dotnet', 'test-node', 'test-all', 'lint-labs'];

describe('build: top-level Makefile declares required targets', () => {
  it('Makefile exists at the repo root', () => {
    expect(existsSync(MAKEFILE)).toBe(true);
  });

  it.each(REQUIRED_TARGETS)('declares target "%s" with a non-empty recipe', (target) => {
    const txt = readFileSync(MAKEFILE, 'utf8');
    const lines = txt.split('\n');
    const headerIdx = lines.findIndex((l) =>
      new RegExp(`^${target}\\s*:`).test(l),
    );
    expect(headerIdx, `target ${target} not declared`).toBeGreaterThanOrEqual(0);

    let recipeLines = 0;
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\S/.test(line) && line.trim() !== '') break;
      if (line.startsWith('\t') && line.trim() !== '') recipeLines++;
    }
    expect(recipeLines, `target ${target} has empty recipe`).toBeGreaterThan(0);
  });
});
