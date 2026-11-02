import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const SKILL = join(ROOT, '.github/skills/cost-check/SKILL.md');

describe('.github/skills/cost-check/SKILL.md', () => {
  it('exists at the skill path', () => {
    expect(existsSync(SKILL), `expected ${SKILL} to exist`).toBe(true);
  });

  it('has frontmatter with name and description', () => {
    const raw = readFileSync(SKILL, 'utf8');
    const fm = matter(raw);
    expect(fm.data.name, 'frontmatter must include name').toBeDefined();
    expect(fm.data.description, 'frontmatter must include description').toBeDefined();
  });

  it('declares the three required sections', () => {
    const body = readFileSync(SKILL, 'utf8');
    expect(body).toMatch(/^##\s+Footprint estimate/m);
    expect(body).toMatch(/^##\s+Compaction opportunities/m);
    expect(body).toMatch(/^##\s+Model recommendation/m);
  });

  it('references the token-and-model guide', () => {
    const body = readFileSync(SKILL, 'utf8');
    expect(body).toMatch(/docs\/token-and-model-guide\.md/);
  });
});
