import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const PROMPT = join(ROOT, '.github/prompts/cost-check.prompt.md');

describe('.github/prompts/cost-check.prompt.md', () => {
  it('exists at the .github/prompts/ path (not top-level prompts/)', () => {
    expect(existsSync(PROMPT), `expected ${PROMPT} to exist`).toBe(true);
  });

  it('has frontmatter with name and description', () => {
    const raw = readFileSync(PROMPT, 'utf8');
    const fm = matter(raw);
    expect(fm.data.name, 'frontmatter must include name').toBeDefined();
    expect(fm.data.description, 'frontmatter must include description').toBeDefined();
  });

  it('declares the three required sections', () => {
    const body = readFileSync(PROMPT, 'utf8');
    expect(body).toMatch(/^##\s+Footprint estimate/m);
    expect(body).toMatch(/^##\s+Compaction opportunities/m);
    expect(body).toMatch(/^##\s+Model recommendation/m);
  });

  it('references the token-and-model guide', () => {
    const body = readFileSync(PROMPT, 'utf8');
    expect(body).toMatch(/docs\/token-and-model-guide\.md/);
  });
});
