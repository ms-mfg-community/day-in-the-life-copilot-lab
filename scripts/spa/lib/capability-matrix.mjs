// The capability matrix (specs/005-teaching-spa.md 2.8, AC11): what it is made of, and how it is rendered from the probe runs.
//
// One row per (mechanism x browser x target): the eleven mechanisms of the table in 2.8, spelled as that table spells them,
// the four browsers and the three targets, 132 rows. The Verdict of a row is `works` or `fails` only where a probe run
// measured that combination in that browser; its Evidence is then the id of the run, which names the file under
// workshop/spa/docs/probe-runs/ that holds the measurement. Every other row is `not measured`, with the id of the section 4
// question that says why the combination may never be settled, or `—` where it simply has not been probed. Nothing is
// inferred from another browser, another target, or the specification's own table.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** The eleven mechanisms, in the order and spelling of the first column of the table in section 2.8. */
export const MECHANISMS = [
  'Secure context',
  '`requestFullscreen()`',
  '`requestFullscreen({screen})`',
  '`BroadcastChannel`',
  '`postMessage` via handle/`opener`',
  '`localStorage` + `storage` event',
  'Screen Wake Lock',
  'Keyboard Lock',
  'Service worker',
  'ES module script fetched by URL',
  'Inline `type="module"` script',
];

export const BROWSERS = ['Chrome', 'Edge', 'Firefox', 'Safari'];
export const TARGETS = ['file:', 'http://localhost', 'https://'];
export const HEADERS = ['Mechanism', 'Browser', 'Target', 'Verdict', 'Evidence'];
export const NOT_MEASURED = 'not measured';
export const DASH = '—';

/**
 * Why a file: combination that no probe measured may never be settled: the section 4 question each file: cell of the 2.8
 * table points at. The module script fetched by URL is forbidden by 2.9 rather than open, so its unmeasured row carries the dash.
 */
export const OPEN_QUESTION_FOR_FILE = {
  'Secure context': 'Q1',
  '`requestFullscreen()`': 'Q2',
  '`requestFullscreen({screen})`': 'Q11',
  '`BroadcastChannel`': 'Q4',
  '`postMessage` via handle/`opener`': 'Q4',
  '`localStorage` + `storage` event': 'Q5',
  'Screen Wake Lock': 'Q6',
  'Keyboard Lock': 'Q6',
  'Service worker': 'Q7',
  'ES module script fetched by URL': DASH,
  'Inline `type="module"` script': 'Q8',
};

/** The evidence of a row no probe measured: the open question for a file: row, the dash elsewhere. */
export function unmeasuredEvidence(mechanism, target) {
  return target === 'file:' ? OPEN_QUESTION_FOR_FILE[mechanism] : DASH;
}

/** Every probe run under `dir`, parsed, with its file name checked against its id. */
export function readRuns(dir) {
  const runs = [];
  for (const name of readdirSync(dir).filter((file) => file.endsWith('.json')).sort()) {
    const run = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    if (run.id !== name.slice(0, -'.json'.length)) throw new Error(`${name}: its id is ${JSON.stringify(run.id)}, not the file name`);
    runs.push(run);
  }
  return runs;
}

/** The latest run per browser: a browser probed twice is reported from the run that ran last. */
export function latestRuns(runs) {
  const latest = new Map();
  for (const run of runs) {
    const held = latest.get(run.browser);
    if (held === undefined || Date.parse(run.ranAt) > Date.parse(held.ranAt)) latest.set(run.browser, run);
  }
  return latest;
}

/** The 132 rows, each { mechanism, browser, target, verdict, evidence }. */
export function matrixRows(runs) {
  const latest = latestRuns(runs);
  const rows = [];
  for (const mechanism of MECHANISMS) {
    for (const browser of BROWSERS) {
      const run = latest.get(browser);
      for (const target of TARGETS) {
        const measured = run?.results.find((result) => result.mechanism === mechanism && result.target === target);
        if (measured !== undefined && (measured.verdict === 'works' || measured.verdict === 'fails')) {
          rows.push({ mechanism, browser, target, verdict: measured.verdict, evidence: run.id });
        } else {
          rows.push({ mechanism, browser, target, verdict: NOT_MEASURED, evidence: unmeasuredEvidence(mechanism, target) });
        }
      }
    }
  }
  return rows;
}

const cell = (text) => text.replace(/\|/g, '\\|');

/** The document: a preamble that says how to read it, and the one table. */
export function renderMatrix(runs) {
  const latest = latestRuns(runs);
  const rows = matrixRows(runs);
  const measured = rows.filter((row) => row.verdict !== NOT_MEASURED).length;
  const runLines = BROWSERS.map((browser) => {
    const run = latest.get(browser);
    if (run === undefined) return `- **${browser}**: no probe run. No runner for this browser exists on the machines that ran the campaign, so all of its rows are \`not measured\`.`;
    return `- **${browser}**: [\`${run.id}\`](probe-runs/${run.id}.json) — ${run.version}${run.build ? ` (${run.build})` : ''}, ${run.headless ? 'headless' : 'headed'}, ${run.platform}, ${run.ranAt}.`;
  });
  return [
    '# Capability matrix',
    '',
    'The measured deployment matrix of the Teaching SPA ([spec 005](../../../specs/005-teaching-spa.md), section 2.8, AC11): one row',
    'for every mechanism × browser × target. This file is generated by `npm run spa:probe` from the probe runs under',
    '[`probe-runs/`](probe-runs/); do not edit the table by hand. `npm run spa:probe -- --matrix-only` renders it again from the',
    'runs that exist without probing.',
    '',
    '## How to read it',
    '',
    '- **Verdict** is `works` or `fails` only where a probe run measured that exact combination, in that browser, on that target.',
    '  Its **Evidence** is then the id of the run, which names the file under `probe-runs/` that holds the measurement and its detail.',
    '- Every other row is `not measured`. Its Evidence is the id of the open question in section 4 of the spec that says why the',
    '  combination may never be settled (the `file:` rows), or `—` where it simply has not been probed. A verdict is never inferred',
    '  from another browser, another target, or the spec\'s own table (section 2.8).',
    '- A `fails` verdict is what the probe saw in that run: the detail in the run file says what the browser said, and tells a',
    '  mechanism that is absent from one that refused. A permission prompt the probe could not answer is not a measurement, so such',
    '  a cell is `not measured` in the run and here, with the reason in the run file.',
    '- A probe run is evidence about the browser build and the machine it ran on, recorded in the run file, and nothing more.',
    '',
    '## Runs',
    '',
    ...runLines,
    '',
    `${measured} of ${rows.length} rows are measured.`,
    '',
    '## Matrix',
    '',
    `| ${HEADERS.join(' | ')} |`,
    `|${HEADERS.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${[row.mechanism, row.browser, row.target, row.verdict, row.evidence].map(cell).join(' | ')} |`),
    '',
  ].join('\n');
}
