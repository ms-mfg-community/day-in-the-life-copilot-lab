import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const TEMPLATE = join(ROOT, 'docs', '_meta', 'audit-report.template.md');

/**
 * The weekly-content-audit workflow generates docs/_meta/audit-report.md from
 * docs/_meta/audit-report.template.md. This test pins the template's schema so
 * future edits cannot silently drift from what the workflow agent is told to
 * emit. Section names + ordering matter: the audit PR body is rendered from
 * this file, and reviewers read it top-to-bottom.
 */
describe('workflows: audit-report template format', () => {
  it('template file exists at docs/_meta/audit-report.template.md', () => {
    expect(existsSync(TEMPLATE)).toBe(true);
  });

  it('contains the required top-level sections in the prescribed order', () => {
    const body = readFileSync(TEMPLATE, 'utf8');
    const required = [
      '# Weekly Content Staleness Audit',
      '## Summary',
      '## Checks',
      '## Suggestions for Additions',
      '## Metadata',
    ];
    let cursor = -1;
    for (const heading of required) {
      const idx = body.indexOf(heading);
      expect(idx, `missing section heading "${heading}"`).toBeGreaterThan(-1);
      expect(idx, `section "${heading}" out of order`).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });

  it('Checks section enumerates all seven audit checks as level-3 headings', () => {
    const body = readFileSync(TEMPLATE, 'utf8');
    const checksStart = body.indexOf('## Checks');
    const checksEnd = body.indexOf('## Suggestions for Additions');
    expect(checksStart, 'Checks section missing').toBeGreaterThan(-1);
    expect(checksEnd, 'Suggestions for Additions section missing').toBeGreaterThan(checksStart);
    const checksBlock = body.slice(checksStart, checksEnd);
    const expected = [
      '### 1. Copilot CLI version',
      '### 2. gh-aw schema/features',
      '### 3. MCP server versions',
      '### 4. Documentation URLs',
      '### 5. Package versions',
      '### 6. Model names & pricing',
      '### 7. Lab pacing',
    ];
    for (const heading of expected) {
      expect(checksBlock, `Checks section missing "${heading}"`).toContain(heading);
    }
  });

  it('Summary table has a row per check plus a Total row', () => {
    const body = readFileSync(TEMPLATE, 'utf8');
    const summaryStart = body.indexOf('## Summary');
    const summaryEnd = body.indexOf('## Checks');
    expect(summaryStart).toBeGreaterThan(-1);
    expect(summaryEnd).toBeGreaterThan(summaryStart);
    const block = body.slice(summaryStart, summaryEnd);
    // Markdown table header + separator + 7 check rows + 1 total row.
    const rows = block.split('\n').filter((l) => l.trim().startsWith('|'));
    expect(
      rows.length,
      `expected at least 10 table rows (header + sep + 7 + total), got ${rows.length}`,
    ).toBeGreaterThanOrEqual(10);
    expect(block).toMatch(/\*\*Total\*\*/);
  });

  it('Metadata block exposes run_date_utc, branch, registry_schema_version, workflow', () => {
    const body = readFileSync(TEMPLATE, 'utf8');
    const meta = body.slice(body.indexOf('## Metadata'));
    for (const key of ['run_date_utc', 'branch', 'registry_schema_version', 'workflow']) {
      expect(meta, `Metadata missing key "${key}"`).toContain(key);
    }
    expect(meta).toMatch(/automation\/weekly-audit-YYYY-MM-DD/);
    expect(meta).toContain('.github/workflows/weekly-content-audit.md');
  });
});
