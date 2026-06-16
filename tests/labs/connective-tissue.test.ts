import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Phase D.2 / Phase A Finding 5.1–5.5 — Lab 11 → 12–14 connective
// tissue. Five concrete cross-reference gaps were enumerated in
// .orchestrator/phase-A-findings.md § Category 5. This test is the
// RED-first oracle each of those prose edits must flip GREEN.
//
//   5.1  lab11.md  — "What's next" names Labs 12/13/14 but none are
//                    hyperlinked.
//   5.2  lab12.md  — Prerequisites section has no mention of Lab 11.
//   5.3  lab13.md  — Prerequisites section has no mention of Lab 11
//                    or Lab 12.
//   5.4  lab14.md  — Cross-references section lists Labs 07/10/13
//                    only; should also nod to Labs 11 & 12.
//   5.5  README.md — Lab Modules table has no learning-path guidance
//                    for the 01-10 → 11 → 12 → 13 → 14 progression.

const ROOT = process.cwd();
const LAB11 = join(ROOT, 'labs/lab11.md');
const LAB12 = join(ROOT, 'labs/lab12.md');
const LAB13 = join(ROOT, 'labs/lab13.md');
const LAB14 = join(ROOT, 'labs/lab14.md');
const README = join(ROOT, 'README.md');

function hasLink(body: string, target: string): boolean {
  // Match `](lab12.md)`, `](./lab12.md)`, `](labs/lab12.md)`.
  return new RegExp(`\\]\\(\\.?/?(labs/)?${target}(#[^)]*)?\\)`).test(body);
}

describe('labs: Lab 11 → 12–14 connective tissue (Findings 5.1–5.5)', () => {
  it('5.1 — lab11.md hyperlinks Lab 12, 13, and 14', () => {
    const body = readFileSync(LAB11, 'utf8');
    expect(hasLink(body, 'lab12.md'), 'lab11 must hyperlink lab12.md').toBe(true);
    expect(hasLink(body, 'lab13.md'), 'lab11 must hyperlink lab13.md').toBe(true);
    expect(hasLink(body, 'lab14.md'), 'lab11 must hyperlink lab14.md').toBe(true);
  });

  it('5.2 — lab12.md references Lab 11 as background context', () => {
    const body = readFileSync(LAB12, 'utf8');
    expect(
      /Lab\s*11/i.test(body),
      'lab12 must mention Lab 11 (builds-on / background note)',
    ).toBe(true);
    expect(
      hasLink(body, 'lab11.md'),
      'lab12 must hyperlink lab11.md at least once',
    ).toBe(true);
  });

  it('5.3 — lab13.md references Lab 11 and Lab 12 as background context', () => {
    const body = readFileSync(LAB13, 'utf8');
    expect(/Lab\s*11/i.test(body), 'lab13 must mention Lab 11').toBe(true);
    expect(/Lab\s*12/i.test(body), 'lab13 must mention Lab 12').toBe(true);
    expect(hasLink(body, 'lab11.md'), 'lab13 must hyperlink lab11.md').toBe(true);
    expect(hasLink(body, 'lab12.md'), 'lab13 must hyperlink lab12.md').toBe(true);
  });

  it('5.4 — lab14.md cross-references include Lab 11 and Lab 12', () => {
    const body = readFileSync(LAB14, 'utf8');
    expect(hasLink(body, 'lab11.md'), 'lab14 must hyperlink lab11.md').toBe(true);
    expect(hasLink(body, 'lab12.md'), 'lab14 must hyperlink lab12.md').toBe(true);
  });

  it('5.5 — README.md has a learning-path note below the Lab Modules table', () => {
    const body = readFileSync(README, 'utf8');
    // Oracle: the Lab Modules section must contain a sentence naming
    // the 11 / 12 / 13 → 14 progression so readers know which labs are
    // standalone vs. sequential.
    const modulesIdx = body.indexOf('## Lab Modules');
    expect(modulesIdx, 'README must have a "## Lab Modules" heading').toBeGreaterThan(-1);
    const tail = body.slice(modulesIdx);
    expect(
      /learning path|core sequence|sequential|standalone/i.test(tail),
      'README Lab Modules section must include a learning-path note',
    ).toBe(true);
    expect(
      /13\s*(→|->|then)\s*14/i.test(tail),
      'README learning-path note must call out the 13 → 14 sequence',
    ).toBe(true);
  });
});
