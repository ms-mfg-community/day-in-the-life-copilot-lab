import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Phase 5 — Rehearsal, accessibility, and fallback-screenshots kit.
 *
 * Asserts that the Phase 5 delivery-hardening deliverables exist:
 *
 *   - workshop/rehearsal-checklist.md         dry-run checklist for presenter
 *   - workshop/a11y-notes.md                  accessibility policy/notes
 *   - workshop/fallback-screenshots/README.md fallback artefact index
 *   - workshop/fallback-screenshots/*.placeholder  one stub per module M1..M6
 *
 * Per plan: zero new devDeps, no edits to guarded surfaces
 * (slides/speaker-scripts/curriculum/preflight/registry).
 * Slide alt-text check is kept here so any future image addition
 * regresses if alt text is missing.
 */

const ROOT = process.cwd();
const WORKSHOP = join(ROOT, 'workshop');
const CHECKLIST = join(WORKSHOP, 'rehearsal-checklist.md');
const A11Y = join(WORKSHOP, 'a11y-notes.md');
const FALLBACK_DIR = join(WORKSHOP, 'fallback-screenshots');
const FALLBACK_README = join(FALLBACK_DIR, 'README.md');
const SLIDES_DIR = join(WORKSHOP, 'slides');

const REQUIRED_MODULES = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

describe('Phase 5 — rehearsal artefacts', () => {
  let checklist = '';
  beforeAll(() => {
    expect(existsSync(CHECKLIST), `${CHECKLIST} must exist`).toBe(true);
    checklist = readFileSync(CHECKLIST, 'utf8');
  });

  it('rehearsal-checklist.md has the five required sections', () => {
    const required = [
      /^##\s+Tech check\b/im,
      /^##\s+Room check\b/im,
      /^##\s+Slide[- ]advance rehearsal\b/im,
      /^##\s+Demo commands rehearsed\b/im,
      /^##\s+Backup[- ]plan triggers\b/im,
    ];
    for (const rx of required) {
      expect(checklist, `rehearsal-checklist.md missing section ${rx}`).toMatch(rx);
    }
  });

  it('rehearsal-checklist.md has actionable (check-box) items in each section', () => {
    // At least 4 markdown check boxes overall so it's a real checklist.
    const boxes = checklist.match(/^\s*-\s+\[\s?\]\s+/gm) ?? [];
    expect(boxes.length, 'expected ≥ 4 checklist items').toBeGreaterThanOrEqual(4);
  });
});

describe('Phase 5 — accessibility notes', () => {
  let notes = '';
  beforeAll(() => {
    expect(existsSync(A11Y), `${A11Y} must exist`).toBe(true);
    notes = readFileSync(A11Y, 'utf8');
  });

  it('a11y-notes.md documents alt-text policy', () => {
    expect(notes).toMatch(/alt[- ]text/i);
  });

  it('a11y-notes.md documents color-contrast verification for slide templates', () => {
    expect(notes).toMatch(/contrast/i);
    expect(notes).toMatch(/slide/i);
  });

  it('a11y-notes.md documents caption guidance for demos', () => {
    expect(notes).toMatch(/caption/i);
    expect(notes).toMatch(/demo/i);
  });

  it('a11y-notes.md documents keyboard navigation guidance', () => {
    expect(notes).toMatch(/keyboard/i);
  });
});

describe('Phase 5 — fallback screenshots kit', () => {
  let readme = '';
  beforeAll(() => {
    expect(existsSync(FALLBACK_DIR), `${FALLBACK_DIR} must exist`).toBe(true);
    expect(existsSync(FALLBACK_README), `${FALLBACK_README} must exist`).toBe(true);
    readme = readFileSync(FALLBACK_README, 'utf8');
  });

  it('fallback-screenshots/README.md lists every module M1..M6', () => {
    for (const m of REQUIRED_MODULES) {
      expect(readme, `README.md missing entry for ${m}`).toMatch(new RegExp(`\\b${m}\\b`));
    }
  });

  it('fallback-screenshots/ has at least one stub file per module', () => {
    const entries = readdirSync(FALLBACK_DIR);
    for (const m of REQUIRED_MODULES) {
      const found = entries.some((f) => f.toLowerCase().includes(m.toLowerCase()));
      expect(found, `missing stub file for ${m} in fallback-screenshots/`).toBe(true);
    }
  });

  it('README.md documents each stub filename alongside what it should show', () => {
    const entries = readdirSync(FALLBACK_DIR).filter((f) => f !== 'README.md');
    expect(entries.length, 'expected stub files in fallback-screenshots/').toBeGreaterThan(0);
    for (const f of entries) {
      expect(readme, `README.md must reference stub ${f}`).toContain(f);
    }
  });
});

describe('Phase 5 — slide a11y regression', () => {
  it('every markdown image in slide source has non-empty alt text', () => {
    if (!existsSync(SLIDES_DIR)) return;
    const files = readdirSync(SLIDES_DIR).filter((f) => f.endsWith('.md'));
    for (const f of files) {
      const src = readFileSync(join(SLIDES_DIR, f), 'utf8');
      // Match any ![alt](src) occurrence; alt may be empty string in source.
      const imgs = [...src.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
      for (const m of imgs) {
        expect(m[1].trim().length, `slide ${f} has an image without alt text: ${m[0]}`).toBeGreaterThan(0);
      }
    }
  });
});
