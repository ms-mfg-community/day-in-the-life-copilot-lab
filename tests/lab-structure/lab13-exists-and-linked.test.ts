import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const LAB13 = join(ROOT, 'labs/lab13.md');
const README = join(ROOT, 'README.md');
const SETUP = join(ROOT, 'labs/setup.md');

describe('lab-structure: lab13 exists and is linked', () => {
  it('labs/lab13.md exists', () => {
    expect(existsSync(LAB13), `expected ${LAB13} to exist`).toBe(true);
  });

  it('lab13 has frontmatter consistent with sibling labs', () => {
    const raw = readFileSync(LAB13, 'utf8');
    const parsed = matter(raw);
    expect(parsed.matter.length, 'lab13 must have a YAML frontmatter block').toBeGreaterThan(0);
    expect(parsed.data.title, 'lab13 must declare title').toBeTypeOf('string');
    expect(parsed.data.lab_number, 'lab13 lab_number must equal 13').toBe(13);
    expect(parsed.data.pace, 'lab13 must declare pace').toBeDefined();
    expect(parsed.data.pace.presenter_minutes).toBeTypeOf('number');
    expect(parsed.data.pace.self_paced_minutes).toBeTypeOf('number');
  });

  it('lab13 has the required top-level sections', () => {
    const body = readFileSync(LAB13, 'utf8');
    // Concept primer + hands-on + failure modes + wrap-up are required
    expect(body, 'lab13 must include a concept primer / overview heading').toMatch(/^##\s+13\.\d+/m);
    expect(body, 'lab13 must include a hands-on section').toMatch(/hands[- ]?on|Part A|Part B/i);
    expect(body, 'lab13 must include a failure-modes section').toMatch(/failure[- ]?mode|failure modes/i);
    expect(body, 'lab13 must include a wrap-up / next-steps callout').toMatch(/wrap[- ]?up|next step|recap|checklist/i);
  });

  it('lab13 is referenced from README.md', () => {
    const body = readFileSync(README, 'utf8');
    expect(body, 'README must link to labs/lab13.md').toContain('labs/lab13.md');
    expect(body, 'README lab table must list Lab 13').toMatch(/Lab 13/);
  });

  it('lab13 is referenced from labs/setup.md', () => {
    const body = readFileSync(SETUP, 'utf8');
    expect(body, 'labs/setup.md must reference lab13').toMatch(/lab13/i);
  });
});
