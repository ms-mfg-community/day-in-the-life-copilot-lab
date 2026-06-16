import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

// Phase D.1 / Finding #6 — symmetry parity with
// tests/lab-structure/lab{11,12,13}-exists-and-linked.test.ts. Lab 14
// closes the orchestrator arc (Lab 13 → 14) and deserves the same
// "exists + enumerated + linked-from-a-prior-lab" contract the earlier
// labs carry. Assertions per Phase D brief:
//   1. labs/lab14.md exists and has frontmatter
//   2. README.md lab-modules table lists it
//   3. docs/_meta/registry.yaml `labs:` block includes it
//   4. labs/setup.md references it
//   5. at least one prior-lab cross-link points at lab14.md
//      (Lab 13 → Lab 14 is the canonical one per Phase A Finding 5.4)

const ROOT = process.cwd();
const LAB14 = join(ROOT, 'labs/lab14.md');
const README = join(ROOT, 'README.md');
const SETUP = join(ROOT, 'labs/setup.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const LABS_DIR = join(ROOT, 'labs');

describe('lab-structure: lab14 exists and is linked', () => {
  it('labs/lab14.md exists', () => {
    expect(existsSync(LAB14), `expected ${LAB14} to exist`).toBe(true);
  });

  it('lab14 has frontmatter consistent with sibling labs', () => {
    const raw = readFileSync(LAB14, 'utf8');
    const parsed = matter(raw);
    expect(parsed.matter.length, 'lab14 must have a YAML frontmatter block').toBeGreaterThan(0);
    expect(parsed.data.title, 'lab14 must declare title').toBeTypeOf('string');
    expect(parsed.data.lab_number, 'lab14 lab_number must equal 14').toBe(14);
    expect(parsed.data.pace, 'lab14 must declare pace').toBeDefined();
    expect(parsed.data.pace.presenter_minutes).toBeTypeOf('number');
    expect(parsed.data.pace.self_paced_minutes).toBeTypeOf('number');
  });

  it('lab14 is referenced from README.md lab-modules table', () => {
    const body = readFileSync(README, 'utf8');
    expect(body, 'README must link to labs/lab14.md').toContain('labs/lab14.md');
    expect(body, 'README lab table must list Lab 14').toMatch(/Lab 14/);
  });

  it('lab14 is enumerated in docs/_meta/registry.yaml labs block', () => {
    const yaml = readFileSync(REGISTRY, 'utf8');
    expect(yaml, 'registry.yaml labs: block must include a lab14 key').toMatch(
      /^\s{2}lab14:\s*$/m,
    );
  });

  it('lab14 is referenced from labs/setup.md', () => {
    const body = readFileSync(SETUP, 'utf8');
    expect(body, 'labs/setup.md must reference lab14').toMatch(/lab14/i);
  });

  it('at least one prior-lab markdown file hyperlinks to lab14.md', () => {
    const priors = readdirSync(LABS_DIR)
      .filter((f) => /^lab(\d{2})\.md$/.test(f) && f !== 'lab14.md')
      .map((f) => join(LABS_DIR, f));

    const linkers = priors.filter((p) => {
      const body = readFileSync(p, 'utf8');
      // Match markdown link targets like `](lab14.md)` or `](./lab14.md)`.
      return /\]\(\.?\/?lab14\.md/.test(body);
    });

    expect(
      linkers.length,
      `no prior lab hyperlinks to lab14.md — expected at least one ` +
        `(Lab 13 → Lab 14 is the canonical forward bridge)`,
    ).toBeGreaterThanOrEqual(1);
  });
});
