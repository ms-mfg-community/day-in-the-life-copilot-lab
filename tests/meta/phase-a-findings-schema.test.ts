import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const REPORT_PATH = join(process.cwd(), '.orchestrator', 'phase-A-findings.md');

const REQUIRED_FRONTMATTER_KEYS = [
  'phase',
  'role',
  'status',
  'arc',
  'branch',
  'head_at_audit',
  'total_findings',
  'categories',
] as const;

const REQUIRED_CATEGORY_HEADINGS = [
  '## Category 1 — Enumeration gaps',
  '## Category 2 — Shipped-but-unwired machinery',
  '## Category 3 — TDD debt',
  '## Category 4 — Documentation drift',
  '## Category 5 — Cross-references',
] as const;

describe('meta: phase-A findings report schema', () => {
  it('findings report file exists', () => {
    expect(
      existsSync(REPORT_PATH),
      `expected ${REPORT_PATH} to exist`,
    ).toBe(true);
  });

  const raw = existsSync(REPORT_PATH) ? readFileSync(REPORT_PATH, 'utf8') : '';
  const parsed = raw ? matter(raw) : { data: {}, content: '' };

  it('has YAML frontmatter block', () => {
    expect(raw.startsWith('---'), 'report must begin with YAML frontmatter').toBe(true);
  });

  it.each(REQUIRED_FRONTMATTER_KEYS)('frontmatter has required key "%s"', (key) => {
    expect(
      parsed.data[key],
      `frontmatter is missing key "${key}"`,
    ).toBeDefined();
  });

  it('frontmatter declares phase A', () => {
    expect(parsed.data.phase).toBe('A');
  });

  it('frontmatter total_findings matches a positive integer', () => {
    expect(typeof parsed.data.total_findings).toBe('number');
    expect(parsed.data.total_findings).toBeGreaterThan(0);
  });

  it('frontmatter categories array covers all 5 expected slugs', () => {
    const cats = parsed.data.categories as string[];
    expect(Array.isArray(cats)).toBe(true);
    for (const slug of [
      'enumeration-gaps',
      'shipped-but-unwired',
      'tdd-debt',
      'documentation-drift',
      'cross-references',
    ]) {
      expect(cats).toContain(slug);
    }
  });

  it.each(REQUIRED_CATEGORY_HEADINGS)('body contains heading "%s"', (heading) => {
    expect(
      parsed.content.includes(heading),
      `report body is missing heading "${heading}"`,
    ).toBe(true);
  });

  it('each category section contains at least one finding row (markdown table)', () => {
    const sections = parsed.content.split(/^## Category /m).slice(1);
    expect(sections.length).toBe(5);
    for (const section of sections) {
      const tableRows = section
        .split('\n')
        .filter((l) => l.startsWith('|') && !l.startsWith('|---') && !l.startsWith('| #'));
      expect(
        tableRows.length,
        `category section starting "${section.slice(0, 40)}..." has no finding rows`,
      ).toBeGreaterThan(0);
    }
  });
});
