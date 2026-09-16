import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LABS = ['lab07.md', 'lab10.md', 'lab13.md', 'lab14.md'];

// A Cost Budget sidebar is recognized by the sentinel
// `> 💰 **Cost Budget**` (a Markdown blockquote opener).
const SENTINEL = /^>\s*💰\s*\*\*Cost Budget\*\*/m;

describe('labs: Cost Budget sidebars (Phase 7)', () => {
  for (const lab of LABS) {
    it(`${lab} has a Cost Budget sidebar`, () => {
      const body = readFileSync(join(ROOT, 'labs', lab), 'utf8');
      expect(body, `${lab} missing Cost Budget sentinel`).toMatch(SENTINEL);
    });

    it(`${lab} Cost Budget links to docs/token-and-model-guide.md`, () => {
      const body = readFileSync(join(ROOT, 'labs', lab), 'utf8');
      // Look at the blockquote that contains the sentinel.
      const lines = body.split('\n');
      const idx = lines.findIndex((l) => /^>\s*💰\s*\*\*Cost Budget\*\*/.test(l));
      expect(idx, `${lab} sentinel not found`).toBeGreaterThanOrEqual(0);
      // Capture the contiguous blockquote block.
      const block: string[] = [];
      for (let i = idx; i < lines.length && lines[i].startsWith('>'); i++) block.push(lines[i]);
      const joined = block.join('\n');
      expect(joined, `${lab} Cost Budget must link to the token guide`).toMatch(
        /docs\/token-and-model-guide\.md/,
      );
    });
  }
});
