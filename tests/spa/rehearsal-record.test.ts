/**
 * AC22 (specs/005-teaching-spa.md; child issue 13): a rehearsal record workshop/spa/docs/rehearsal-<YYYY-MM-DD>.md exists containing
 * the headings `## Environment`, `## What was presented`, `## Defects found`, `## Verdict`, and a Verdict section whose first word is
 * PASS or FAIL.
 *
 * Every record of that name is held to the shape, not only the latest: a record that does not say PASS or FAIL first is not a
 * verdict, and AC23 reads the first word. The date in the name must be a real date, so a record can be found by it.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOCS, HEADINGS, readRecords } from './helpers/rehearsal-records';

describe('AC22 — the rehearsal record', () => {
  const records = readRecords();

  it('exists: at least one workshop/spa/docs/rehearsal-<YYYY-MM-DD>.md', () => {
    expect(records.length).toBeGreaterThan(0);
  });

  it.each(records.map((record) => [record.file, record] as const))('%s is named by a real date', (_file, record) => {
    const parsed = new Date(`${record.date}T00:00:00Z`);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
    expect(parsed.toISOString().slice(0, 10)).toBe(record.date);
  });

  it.each(records.map((record) => [record.file, record] as const))('%s has the four headings, each once, in order', (_file, record) => {
    const found = [...record.sections.keys()].filter((heading) => HEADINGS.includes(heading));
    expect(found).toEqual(HEADINGS);
    const text = readFileSync(path.join(DOCS, record.file), 'utf8').replace(/\r\n/g, '\n'); // a CRLF checkout is the same record
    for (const heading of HEADINGS) expect(text.split(`\n${heading}\n`).length - 1, heading).toBe(1);
  });

  it.each(records.map((record) => [record.file, record] as const))('%s has a Verdict section whose first word is PASS or FAIL', (_file, record) => {
    expect(['PASS', 'FAIL']).toContain(record.verdict);
  });

  it.each(records.map((record) => [record.file, record] as const))('%s says something under every heading', (_file, record) => {
    for (const heading of HEADINGS) expect((record.sections.get(heading) ?? '').trim().length, heading).toBeGreaterThan(20);
  });
});
