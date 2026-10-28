/**
 * AC16 (specs/005-teaching-spa.md 2.11; child issue 10): workshop/spa/docs/wcag-22-aa-conformance.md has one row per Level A
 * and Level AA success criterion of WCAG 2.2, each with a `method` of `automated` or `manual` and a non-empty evidence path
 * that resolves on disk.
 *
 * The set of criteria is the one the spec's open question Q9 says it must be built from: the published WCAG 2.2
 * Recommendation (W3C Recommendation, 12 December 2024, https://www.w3.org/TR/WCAG22/), read on 2026-10-26 for child issue 10.
 * It has 31 Level A and 24 Level AA criteria: 4.1.1 Parsing is removed in 2.2 and is not a row; 2.4.11, 2.5.7, 2.5.8, 3.2.6,
 * 3.3.7 and 3.3.8 are new in 2.2 and are. The list is written out here so that the record is held to the Recommendation and
 * not to itself.
 *
 * Beyond the letter of AC16: an `automated` row must point at the gate (a11y-browser-check.mjs) among its evidence, and the
 * criteria the spec's section 2.11 relies on directly must all be rows (they are, if the set is complete; this makes the
 * failure legible when it is not).
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const RECORD = path.join(ROOT, 'workshop/spa/docs/wcag-22-aa-conformance.md');
const GATE = 'tests/spa/a11y-browser-check.mjs';

/** WCAG 2.2, Level A and Level AA: number, name, level. */
const CRITERIA: ReadonlyArray<readonly [string, string, 'A' | 'AA']> = [
  ['1.1.1', 'Non-text Content', 'A'],
  ['1.2.1', 'Audio-only and Video-only (Prerecorded)', 'A'],
  ['1.2.2', 'Captions (Prerecorded)', 'A'],
  ['1.2.3', 'Audio Description or Media Alternative (Prerecorded)', 'A'],
  ['1.2.4', 'Captions (Live)', 'AA'],
  ['1.2.5', 'Audio Description (Prerecorded)', 'AA'],
  ['1.3.1', 'Info and Relationships', 'A'],
  ['1.3.2', 'Meaningful Sequence', 'A'],
  ['1.3.3', 'Sensory Characteristics', 'A'],
  ['1.3.4', 'Orientation', 'AA'],
  ['1.3.5', 'Identify Input Purpose', 'AA'],
  ['1.4.1', 'Use of Color', 'A'],
  ['1.4.2', 'Audio Control', 'A'],
  ['1.4.3', 'Contrast (Minimum)', 'AA'],
  ['1.4.4', 'Resize Text', 'AA'],
  ['1.4.5', 'Images of Text', 'AA'],
  ['1.4.10', 'Reflow', 'AA'],
  ['1.4.11', 'Non-text Contrast', 'AA'],
  ['1.4.12', 'Text Spacing', 'AA'],
  ['1.4.13', 'Content on Hover or Focus', 'AA'],
  ['2.1.1', 'Keyboard', 'A'],
  ['2.1.2', 'No Keyboard Trap', 'A'],
  ['2.1.4', 'Character Key Shortcuts', 'A'],
  ['2.2.1', 'Timing Adjustable', 'A'],
  ['2.2.2', 'Pause, Stop, Hide', 'A'],
  ['2.3.1', 'Three Flashes or Below Threshold', 'A'],
  ['2.4.1', 'Bypass Blocks', 'A'],
  ['2.4.2', 'Page Titled', 'A'],
  ['2.4.3', 'Focus Order', 'A'],
  ['2.4.4', 'Link Purpose (In Context)', 'A'],
  ['2.4.5', 'Multiple Ways', 'AA'],
  ['2.4.6', 'Headings and Labels', 'AA'],
  ['2.4.7', 'Focus Visible', 'AA'],
  ['2.4.11', 'Focus Not Obscured (Minimum)', 'AA'],
  ['2.5.1', 'Pointer Gestures', 'A'],
  ['2.5.2', 'Pointer Cancellation', 'A'],
  ['2.5.3', 'Label in Name', 'A'],
  ['2.5.4', 'Motion Actuation', 'A'],
  ['2.5.7', 'Dragging Movements', 'AA'],
  ['2.5.8', 'Target Size (Minimum)', 'AA'],
  ['3.1.1', 'Language of Page', 'A'],
  ['3.1.2', 'Language of Parts', 'AA'],
  ['3.2.1', 'On Focus', 'A'],
  ['3.2.2', 'On Input', 'A'],
  ['3.2.3', 'Consistent Navigation', 'AA'],
  ['3.2.4', 'Consistent Identification', 'AA'],
  ['3.2.6', 'Consistent Help', 'A'],
  ['3.3.1', 'Error Identification', 'A'],
  ['3.3.2', 'Labels or Instructions', 'A'],
  ['3.3.3', 'Error Suggestion', 'AA'],
  ['3.3.4', 'Error Prevention (Legal, Financial, Data)', 'AA'],
  ['3.3.7', 'Redundant Entry', 'A'],
  ['3.3.8', 'Accessible Authentication (Minimum)', 'AA'],
  ['4.1.2', 'Name, Role, Value', 'A'],
  ['4.1.3', 'Status Messages', 'AA'],
];

/** The criteria section 2.11 of the spec relies on directly. */
const RELIED_ON = ['1.4.3', '1.4.11', '1.4.13', '2.1.1', '2.1.2', '2.1.4', '2.2.2', '2.4.3', '2.4.7', '2.4.11', '2.5.7', '2.5.8', '4.1.3'];

interface Row {
  criterion: string;
  name: string;
  level: string;
  method: string;
  evidence: string[];
  notes: string;
}

const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());

function readRecord(): { headers: string[]; rows: Row[] } {
  const lines = readFileSync(RECORD, 'utf8')
    .split('\n')
    .filter((line) => line.trim().startsWith('|'));
  const [header, delimiter, ...data] = lines.map(cells);
  if (!delimiter?.every((cell) => /^:?-+:?$/.test(cell))) throw new Error('the record has no table');
  const rows = data.map((row) => {
    if (row.length !== 6) throw new Error(`a row has ${row.length} cells, not 6: ${row.join(' | ')}`);
    const [criterion, name, level, method, evidence, notes] = row;
    return {
      criterion,
      name,
      level,
      method,
      evidence: evidence
        .split(/\s*,\s*/)
        .map((item) => item.replace(/^`|`$/g, ''))
        .filter((item) => item !== ''),
      notes,
    };
  });
  return { headers: header, rows };
}

describe('AC16 — the WCAG 2.2 Level A and AA conformance record', () => {
  const record = readRecord();

  it('is a table of criterion, name, level, method, evidence and notes', () => {
    expect(record.headers).toEqual(['Criterion', 'Name', 'Level', 'Method', 'Evidence', 'Notes']);
  });

  it('has exactly one row per Level A and Level AA success criterion of WCAG 2.2, 55 in all, and no other', () => {
    expect(CRITERIA).toHaveLength(55);
    expect(CRITERIA.filter(([, , level]) => level === 'A')).toHaveLength(31);
    expect(record.rows.map((row) => row.criterion)).toEqual(CRITERIA.map(([number]) => number));
    for (const [number, name, level] of CRITERIA) {
      const row = record.rows.find((candidate) => candidate.criterion === number);
      expect(row?.name, number).toBe(name);
      expect(row?.level, number).toBe(level);
    }
    expect(record.rows.some((row) => row.criterion === '4.1.1')).toBe(false);
  });

  it('every row has a method of automated or manual', () => {
    for (const row of record.rows) expect(['automated', 'manual'], row.criterion).toContain(row.method);
  });

  it('every row has a non-empty evidence path, and every path resolves on disk', () => {
    for (const row of record.rows) {
      expect(row.evidence.length, `${row.criterion} has evidence`).toBeGreaterThan(0);
      for (const item of row.evidence) {
        const file = path.join(ROOT, item);
        expect(existsSync(file) && statSync(file).isFile(), `${row.criterion}: ${item} resolves to a file`).toBe(true);
      }
    }
  });

  it('every automated row names the gate among its evidence, and the gate exists', () => {
    expect(existsSync(path.join(ROOT, GATE))).toBe(true);
    for (const row of record.rows.filter((candidate) => candidate.method === 'automated')) expect(row.evidence, row.criterion).toContain(GATE);
    expect(record.rows.some((row) => row.method === 'automated')).toBe(true);
    expect(record.rows.some((row) => row.method === 'manual')).toBe(true);
  });

  it('every criterion section 2.11 of the spec relies on is a row', () => {
    for (const number of RELIED_ON) expect(record.rows.map((row) => row.criterion), number).toContain(number);
  });

  it('every row has a note', () => {
    for (const row of record.rows) expect(row.notes.length, row.criterion).toBeGreaterThan(0);
  });
});
