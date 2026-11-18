/**
 * AC11 (specs/005-teaching-spa.md 2.8; child issue 8): workshop/spa/docs/capability-matrix.md holds one table whose column
 * headers are exactly Mechanism, Browser, Target, Verdict, Evidence, with exactly one row for every combination of the eleven
 * mechanisms named in section 2.8, the four browsers and the three targets (132 rows, no duplicates, none missing). Every
 * Verdict is exactly one of works, fails, not measured. Where the verdict is works or fails, Evidence is a probe-run id naming
 * a file under workshop/spa/docs/probe-runs/ or a URL in the section 3 table; where it is not measured, Evidence is exactly
 * `—` or the id of a Q row of the section 4 table.
 *
 * The vocabulary is read from the spec itself, not from the script that renders the matrix: the mechanisms are the first
 * column of the table in 2.8, the Q ids are the first column of the table in 4, the URLs are the third column of the table in
 * 3. A matrix that drifted from any of them fails here, whatever the renderer thinks.
 *
 * Beyond the letter of AC11: a probe-run id used as evidence must name a run of that row's browser that measured that
 * row's mechanism on that row's target with that verdict, because an id that names a file is not evidence of a cell the file
 * does not contain; and a browser with no run file has every row at not measured, because nothing may be inferred for it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SPEC = path.join(ROOT, 'specs/005-teaching-spa.md');
const MATRIX = path.join(ROOT, 'workshop/spa/docs/capability-matrix.md');
const RUNS = path.join(ROOT, 'workshop/spa/docs/probe-runs');

const HEADERS = ['Mechanism', 'Browser', 'Target', 'Verdict', 'Evidence'];
const BROWSERS = ['Chrome', 'Edge', 'Firefox', 'Safari'];
const TARGETS = ['file:', 'http://localhost', 'https://'];
const VERDICTS = ['works', 'fails', 'not measured'];
const DASH = '—';

const spec = readFileSync(SPEC, 'utf8');

/** The lines of `text` between the heading that starts with `from` and the next heading that starts with `to`. */
function section(text: string, from: string, to: string): string {
  const start = text.indexOf(`\n${from}`);
  const end = text.indexOf(`\n${to}`, start + 1);
  if (start < 0 || end < 0) throw new Error(`the spec has no section from ${from} to ${to}`);
  return text.slice(start, end);
}

const cells = (line: string): string[] =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));

/** The data rows of the Markdown tables in `text`: every `|` line that is neither a header nor a delimiter row. */
function tableRows(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].trim().startsWith('|')) continue;
    const row = cells(lines[i]);
    if (row.every((cell) => /^:?-+:?$/.test(cell))) continue; // delimiter
    if (lines[i + 1] !== undefined && cells(lines[i + 1]).every((cell) => /^:?-+:?$/.test(cell))) continue; // header
    rows.push(row);
  }
  return rows;
}

/** The eleven mechanisms: the first column of the table in section 2.8. */
function specMechanisms(): string[] {
  return tableRows(section(spec, '### 2.8', '### 2.9')).map((row) => row[0]);
}

/** The open questions: the first column of the Q rows of the table in section 4. */
function specQuestions(): string[] {
  return tableRows(section(spec, '## 4.', '## 5.'))
    .map((row) => row[0])
    .filter((id) => /^Q\d+$/.test(id));
}

/** The source URLs: the third column of the table in section 3. */
function specUrls(): Set<string> {
  return new Set(
    tableRows(section(spec, '## 3.', '### Verifier caveats'))
      .filter((row) => /^F\d+$/.test(row[0]))
      .map((row) => row[2]),
  );
}

interface Row {
  mechanism: string;
  browser: string;
  target: string;
  verdict: string;
  evidence: string;
}

interface Table {
  headers: string[];
  rows: Row[];
}

/** The one table of the matrix document: its header cells and its data rows. Throws when there is not exactly one table. */
function readMatrix(): Table {
  const text = readFileSync(MATRIX, 'utf8');
  const lines = text.split('\n');
  const tables: { headers: string[]; rows: string[][] }[] = [];
  let current: { headers: string[]; rows: string[][] } | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim().startsWith('|')) {
      current = undefined;
      continue;
    }
    const row = cells(line);
    if (current === undefined) {
      const next = lines[i + 1];
      if (next === undefined || !cells(next).every((cell) => /^:?-+:?$/.test(cell))) throw new Error(`a table at line ${i + 1} has no delimiter row`);
      current = { headers: row, rows: [] };
      tables.push(current);
      i += 1;
      continue;
    }
    current.rows.push(row);
  }
  if (tables.length !== 1) throw new Error(`the matrix document has ${tables.length} tables, not one`);
  const [table] = tables;
  return {
    headers: table.headers,
    rows: table.rows.map((row) => {
      if (row.length !== 5) throw new Error(`a row has ${row.length} cells: ${row.join(' | ')}`);
      const [mechanism, browser, target, verdict, evidence] = row;
      return { mechanism, browser, target, verdict, evidence };
    }),
  };
}

interface Run {
  id: string;
  browser: string;
  ranAt: string;
  results: Array<{ mechanism: string; target: string; verdict: string; detail: string }>;
}

function readRun(id: string): Run {
  return JSON.parse(readFileSync(path.join(RUNS, `${id}.json`), 'utf8')) as Run;
}

const key = (row: { mechanism: string; browser: string; target: string }): string => `${row.mechanism} | ${row.browser} | ${row.target}`;

describe('AC11 — the capability matrix', () => {
  const mechanisms = specMechanisms();
  const questions = specQuestions();
  const urls = specUrls();
  const table = readMatrix();

  it('reads eleven mechanisms, Q rows and source URLs out of the spec (the oracle has something to hold the matrix against)', () => {
    expect(mechanisms).toHaveLength(11);
    expect(new Set(mechanisms).size).toBe(11);
    expect(mechanisms).toContain('Secure context');
    expect(questions.length).toBeGreaterThanOrEqual(8);
    expect(questions).toContain('Q8');
    expect(urls.size).toBeGreaterThan(50);
  });

  it('has exactly the column headers Mechanism, Browser, Target, Verdict, Evidence', () => {
    expect(table.headers).toEqual(HEADERS);
  });

  it('has exactly one row for every mechanism × browser × target: 132 rows, no duplicates, none missing', () => {
    expect(table.rows).toHaveLength(11 * 4 * 3);
    const seen = new Set(table.rows.map(key));
    expect(seen.size).toBe(132);
    for (const mechanism of mechanisms) {
      for (const browser of BROWSERS) {
        for (const target of TARGETS) expect(seen.has(key({ mechanism, browser, target })), key({ mechanism, browser, target })).toBe(true);
      }
    }
  });

  it('spells every mechanism as section 2.8 spells it, and every browser and target as AC11 names them', () => {
    for (const row of table.rows) {
      expect(mechanisms, row.mechanism).toContain(row.mechanism);
      expect(BROWSERS, row.browser).toContain(row.browser);
      expect(TARGETS, row.target).toContain(row.target);
    }
  });

  it('has a Verdict that is exactly works, fails or not measured in every row', () => {
    for (const row of table.rows) expect(VERDICTS, key(row)).toContain(row.verdict);
  });

  it('where the verdict is works or fails, the Evidence is a probe-run id naming a file under probe-runs/, or a URL of the section 3 table', () => {
    const measured = table.rows.filter((row) => row.verdict !== 'not measured');
    expect(measured.length, 'the matrix has at least one measured row').toBeGreaterThan(0);
    for (const row of measured) {
      const isUrl = urls.has(row.evidence);
      const file = path.join(RUNS, `${row.evidence}.json`);
      const isRun = /^[A-Za-z0-9._-]+$/.test(row.evidence) && existsSync(file) && statSync(file).isFile();
      expect(isUrl || isRun, `${key(row)}: evidence ${JSON.stringify(row.evidence)}`).toBe(true);
    }
  });

  it('where the verdict is not measured, the Evidence is exactly — or the id of a Q row of the section 4 table', () => {
    for (const row of table.rows.filter((row) => row.verdict === 'not measured')) {
      expect(row.evidence === DASH || questions.includes(row.evidence), `${key(row)}: evidence ${JSON.stringify(row.evidence)}`).toBe(true);
    }
  });

  it('a probe-run id used as evidence names a run of that browser that measured that mechanism on that target with that verdict', () => {
    for (const row of table.rows.filter((row) => row.verdict !== 'not measured' && !urls.has(row.evidence))) {
      const run = readRun(row.evidence);
      expect(run.id, key(row)).toBe(row.evidence);
      expect(run.browser, key(row)).toBe(row.browser);
      const result = run.results.find((candidate) => candidate.mechanism === row.mechanism && candidate.target === row.target);
      expect(result, `${key(row)}: the run has no result for it`).toBeDefined();
      expect(result?.verdict, key(row)).toBe(row.verdict);
      expect(typeof result?.detail === 'string' && result.detail.length > 0, `${key(row)}: the run says why`).toBe(true);
    }
  });

  it('a browser with no probe run has every one of its 33 rows at not measured: nothing is inferred for it', () => {
    const probed = new Set(
      readdirSync(RUNS)
        .filter((name) => name.endsWith('.json'))
        .map((name) => readRun(name.slice(0, -'.json'.length)).browser),
    );
    for (const browser of BROWSERS.filter((candidate) => !probed.has(candidate))) {
      const rows = table.rows.filter((row) => row.browser === browser);
      expect(rows).toHaveLength(33);
      for (const row of rows) expect(row.verdict, key(row)).toBe('not measured');
    }
  });

  it('every probe-run file is named by its id, says which browser it is, and holds only works, fails or not measured results with a detail', () => {
    const files = readdirSync(RUNS).filter((name) => name.endsWith('.json'));
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const run = readRun(name.slice(0, -'.json'.length));
      expect(run.id).toBe(name.slice(0, -'.json'.length));
      expect(BROWSERS).toContain(run.browser);
      expect(Number.isNaN(Date.parse(run.ranAt))).toBe(false);
      for (const result of run.results) {
        expect(mechanisms).toContain(result.mechanism);
        expect(TARGETS).toContain(result.target);
        expect(VERDICTS).toContain(result.verdict);
        expect(result.detail.length).toBeGreaterThan(0);
      }
    }
  });
});
