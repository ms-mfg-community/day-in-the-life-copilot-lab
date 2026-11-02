import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('QA SPA-07 extraction: every shell source stays below 800 lines', () => {
  const shell = new URL('../../workshop/spa/src/shell/', import.meta.url);
  const oversized = readdirSync(fileURLToPath(shell))
    .filter((file) => file.endsWith('.ts'))
    .map((file) => {
      const source = readFileSync(new URL(file, shell), 'utf8');
      const lines = source.split(/\r?\n/).length - (source.endsWith('\n') ? 1 : 0);
      return { file, lines };
    })
    .filter(({ lines }) => lines >= 800);

  expect(oversized).toEqual([]);
});
