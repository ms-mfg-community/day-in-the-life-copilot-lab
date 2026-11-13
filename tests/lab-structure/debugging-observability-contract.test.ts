import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/**
 * Phase 4 contract — Debugging & Observability (2026-11 remediation).
 *
 * Pins `docs/debugging-and-observability.md`, the "Diagnostic Toolkit" section of
 * `TROUBLESHOOTING.md`, and what the seven per-lab `🔍 Debug It` callouts share. Each lab's own
 * contract test (`lab01-contract` … `lab07-contract`) pins the callout's placement and content in
 * that lab; Lab 06's also pins the §6.4.1 walkthrough. The spec rows are `specs/labs/lab06.md`
 * AC21 and AC22 and the per-lab ACs added with Phase 4.
 *
 * The precision rules below come from the Khriss adjudication of 2026-11-12 (items 7 and 8) and
 * from the primary sources re-read while writing this phase: the VS Code "Debug chat interactions"
 * page, the VS Code agent hooks page, the VS Code 1.111 release notes, and the Copilot CLI built-in
 * documentation (`topic:monitoring#*`, `topic:sessions#*`, `command:/diagnose`, …). They exist
 * because the plan that preceded this phase was wrong in four places, each pinned here:
 *   - it put `summary` in `workspace.yaml` (it lives in the `sessions` table of `session-store.db`);
 *   - it called `events.jsonl` a "complete" log (the docs call it the event log; nothing says complete);
 *   - it said `/diagnose` explains why a tool or hook failed (the docs say permission requests);
 *   - it said `/context` shows usage per skill and agent (only in experimental mode).
 *
 * Helpers are deliberately inline: a contract test is `git mv`-ed between `pending/` and this
 * directory, and a relative import would break on the move.
 */

const ROOT = process.cwd();
const GUIDE_PATH = join(ROOT, 'docs/debugging-and-observability.md');
const TROUBLE_PATH = join(ROOT, 'TROUBLESHOOTING.md');
const SPEC_06 = join(ROOT, 'specs/labs/lab06.md');
const LAB_IDS = ['lab01', 'lab02', 'lab03', 'lab04', 'lab05', 'lab06', 'lab07'] as const;
const CALLOUT_TITLE = '🔍 Debug It (VS Code & Copilot CLI)';

const lf = (s: string): string => s.replace(/\r\n/g, '\n');
const labPath = (id: string): string => join(ROOT, 'labs', `${id}.md`);
const lab = (id: string): string => lf(readFileSync(labPath(id), 'utf8'));

function guide(): string {
  if (!existsSync(GUIDE_PATH)) throw new Error('docs/debugging-and-observability.md does not exist');
  return lf(readFileSync(GUIDE_PATH, 'utf8'));
}
const troubleshooting = (): string => lf(readFileSync(TROUBLE_PATH, 'utf8'));

/**
 * The text under the first heading that matches `heading`, up to the next heading of the same or a
 * higher level. Fenced code is skipped when looking for headings.
 */
function sectionUnder(md: string, heading: RegExp): string {
  const lines = lf(md).split('\n');
  let inFence = false;
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*```/.test(lines[i])) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = lines[i].match(/^(#{1,6})\s/);
    if (!m) continue;
    if (start === -1) {
      if (heading.test(lines[i])) {
        start = i;
        level = m[1].length;
      }
    } else if (m[1].length <= level) {
      return lines.slice(start, i).join('\n');
    }
  }
  return start === -1 ? '' : lines.slice(start).join('\n');
}

/** True when some ~`size`-char window of `text` (whitespace collapsed) satisfies every pattern. */
function windowHas(text: string, patterns: RegExp[], size = 500): boolean {
  const flat = text.replace(/\s+/g, ' ');
  const step = Math.floor(size / 2);
  for (let i = 0; i < Math.max(flat.length, 1); i += step) {
    const w = flat.slice(i, i + size);
    if (patterns.every((p) => p.test(w))) return true;
  }
  return false;
}

/** Sentences and table rows of `text`, with Markdown emphasis kept: the unit the precision rules apply to. */
const sentences = (text: string): string[] =>
  lf(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .split(/\n|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^[>\s|*-]+/, '').trim())
    .filter(Boolean);

/** Cells of a Markdown table row, outer pipes removed. */
const cells = (row: string): string[] =>
  row
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

/** The table row in `text` whose first cell matches `first`. */
const rowStartingWith = (text: string, first: RegExp): string | undefined =>
  text.split('\n').find((l) => l.startsWith('|') && first.test(cells(l)[0] ?? ''));

/** GitHub's heading anchor: lower-case, punctuation dropped, each space a hyphen. */
const slug = (heading: string): string =>
  heading
    .replace(/`/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

const headingSlugs = (md: string): Set<string> => {
  const out = new Set<string>();
  let inFence = false;
  for (const l of lf(md).split('\n')) {
    if (/^\s*```/.test(l)) inFence = !inFence;
    else if (!inFence) {
      const m = l.match(/^#{1,6}\s+(.*)$/);
      if (m) out.add(slug(m[1]));
    }
  }
  return out;
};

/** Every contiguous `>` blockquote that opens with the Debug It title, `> ` prefixes removed. */
function debugItCallouts(md: string): string[] {
  const all = lf(md).split('\n');
  const found: string[] = [];
  all.forEach((l, i) => {
    if (!l.startsWith(`> **${CALLOUT_TITLE}**`)) return;
    let to = i;
    while (to + 1 < all.length && all[to + 1].startsWith('>')) to++;
    found.push(
      all
        .slice(i, to + 1)
        .map((x) => x.replace(/^>\s?/, ''))
        .join('\n'),
    );
  });
  return found;
}

/**
 * What every Phase 4 text is checked against: the guide, the toolkit and the seven labs. The names
 * are static so `it.each` does no file I/O while Vitest collects the suite; a missing guide then
 * fails the tests that need it, one by one, instead of failing collection for the whole file.
 */
const TEXT_NAMES: string[] = ['docs/debugging-and-observability.md', 'TROUBLESHOOTING.md', ...LAB_IDS.map((id) => `labs/${id}.md`)];
const textOf = (name: string): string => {
  if (name === 'docs/debugging-and-observability.md') return guide();
  if (name === 'TROUBLESHOOTING.md') return troubleshooting();
  return lab(name.replace(/^labs\//, '').replace(/\.md$/, ''));
};
const phase4Texts = (): Array<[string, string]> => TEXT_NAMES.map((n): [string, string] => [n, textOf(n)]);

describe('phase 4 contract: AC21 — the guide exists and is verified', () => {
  it('docs/debugging-and-observability.md exists', () => {
    expect(existsSync(GUIDE_PATH)).toBe(true);
  });

  it('opens with a verification banner dated 2026-11-12 that names the primary sources', () => {
    const head = guide().split('\n').slice(0, 14).join('\n');
    expect(head).toMatch(/2026-11-12/);
    expect(head).toMatch(/code\.visualstudio\.com/);
    expect(head).toMatch(/built-in documentation|built-in docs/i);
  });

  it('numbers its sections 1–8 in the order the labs and TROUBLESHOOTING.md link them', () => {
    const titles = [...guide().matchAll(/^##\s+(\d)\.\s+(.*)$/gm)].map((m) => `${m[1]}. ${m[2]}`);
    expect(titles).toEqual([
      '1. Pick the right tool',
      '2. VS Code: Agent Debug Logs and the Chat Debug view',
      '3. Copilot CLI: session data and logs',
      '4. Use Copilot to understand a session',
      '5. OpenTelemetry',
      '6. Triage by symptom',
      '7. Before you share anything',
      '8. Sources and verification',
    ]);
  });
});

describe('phase 4 contract: AC21 — VS Code: capture settings, panel, views and chat analysis', () => {
  const s21 = (): string => sectionUnder(guide(), /^###\s+2\.1\s/);
  const s22 = (): string => sectionUnder(guide(), /^###\s+2\.2\s/);
  const s23 = (): string => sectionUnder(guide(), /^###\s+2\.3\s/);
  const s24 = (): string => sectionUnder(guide(), /^###\s+2\.4\s/);
  const s25 = (): string => sectionUnder(guide(), /^###\s+2\.5\s/);

  it('names chat.agentHost.agentDebugLog.enabled for Agent Host sessions and says to enable it before reproducing, because capture is not retroactive', () => {
    expect(windowHas(s21(), [/chat\.agentHost\.agentDebugLog\.enabled/, /Agent Host/, /Copilot harness/i], 600)).toBe(true);
    expect(windowHas(s21(), [/before/i, /not retroactive/i], 400)).toBe(true);
  });

  it('names github.copilot.chat.agentDebugLog.fileLogging.enabled for Local sessions and says to reload the editor before /troubleshoot', () => {
    expect(
      windowHas(s21(), [/github\.copilot\.chat\.agentDebugLog\.fileLogging\.enabled/, /Local/, /reload/i, /\/troubleshoot/], 600),
    ).toBe(true);
  });

  it('keeps the two settings apart: neither setting name shares a table row with the other', () => {
    for (const row of s21().split('\n').filter((l) => l.startsWith('|'))) {
      const both =
        /chat\.agentHost\.agentDebugLog\.enabled/.test(row) &&
        /github\.copilot\.chat\.agentDebugLog\.fileLogging\.enabled/.test(row);
      expect(both, `one row names both settings: ${row}`).toBe(false);
    }
  });

  it.each(['Show Agent Debug Logs', 'Developer: Open Agent Debug Logs'])('opens the panel with %s', (name) => {
    expect(s22()).toContain(name);
  });

  it.each(['Logs view', 'Summary view', 'Agent Flow Chart', 'Cache Explorer'])('describes the %s', (name) => {
    expect(s22()).toContain(name);
  });

  it('says the Cache Explorer is for low cache reuse, and that the panel exports and imports OTLP JSON', () => {
    expect(windowHas(s22(), [/Cache Explorer/, /cache reuse/i], 500)).toBe(true);
    expect(windowHas(s22(), [/Export/, /Import/, /OTLP/, /JSON/], 500)).toBe(true);
  });

  it.each(['Show Chat Debug View', 'Developer: Show Chat Debug View'])('opens the Chat Debug view with %s', (name) => {
    expect(s23()).toContain(name);
  });

  it.each(['System prompt', 'User prompt', 'Context', 'Response', 'Tool responses'])(
    'lists the Chat Debug section "%s"',
    (name) => {
      expect(s23()).toContain(`**${name}**`);
    },
  );

  it('attaches the events with the sparkle icon or #debugEventsSnapshot, and analyses them with /troubleshoot <question> or /troubleshoot #session', () => {
    expect(s24()).toMatch(/sparkle/i);
    expect(s24()).toContain('#debugEventsSnapshot');
    expect(s24()).toMatch(/\/troubleshoot\s+[A-Za-z<]/);
    expect(s24()).toContain('/troubleshoot #session');
  });

  it('says the GitHub Copilot Chat Hooks Output channel belongs to the legacy Local setup, and GitHub Copilot Chat is the general channel', () => {
    expect(windowHas(s25(), [/GitHub Copilot Chat Hooks/, /legacy Local|old Local/i], 400)).toBe(true);
    expect(windowHas(s25(), [/\*\*GitHub Copilot Chat\*\*|`GitHub Copilot Chat`/, /general|extension/i, /Output/], 500)).toBe(true);
  });

  it('gives the Output panel shortcut for all three platforms', () => {
    const row = windowHas(s25(), [/Ctrl\+Shift\+U/, /Cmd\+Shift\+U/, /Ctrl\+K Ctrl\+H/, /Windows/, /macOS/, /Linux/], 500);
    expect(row).toBe(true);
  });

  it('names MCP: List Servers and Chat: Open Customizations', () => {
    expect(s25()).toContain('MCP: List Servers');
    expect(s25()).toContain('Chat: Open Customizations');
  });
});

describe('phase 4 contract: AC21 — Copilot CLI session data: precise descriptions', () => {
  const s31 = (): string => sectionUnder(guide(), /^###\s+3\.1\s/);

  it('says session data lives under ~/.copilot/session-state/<session-id>/ (or $COPILOT_HOME)', () => {
    expect(s31()).toMatch(/~\/\.copilot\/session-state\/<session-id>\//);
    expect(s31()).toContain('$COPILOT_HOME');
  });

  it('describes events.jsonl as the session\'s chronological event log', () => {
    expect(windowHas(s31(), [/`events\.jsonl`/, /chronological event log/i], 300)).toBe(true);
  });

  it.each(TEXT_NAMES)(
    '%s never calls the event log complete or a record of every internal operation',
    (name) => {
      const text = textOf(name);
      expect(text).not.toMatch(/every internal operation/i);
      expect(text).not.toMatch(/complete[^.\n]{0,40}event log/i);
      expect(text).not.toMatch(/complete record of/i);
    },
  );

  it('describes workspace.yaml as session metadata: id, cwd, repository, branch, created_at and updated_at', () => {
    expect(
      windowHas(
        s31(),
        [/`workspace\.yaml`/, /metadata/i, /`id`/, /`cwd`/, /`repository`/, /`branch`/, /`created_at`/, /`updated_at`/],
        500,
      ),
    ).toBe(true);
  });

  it('puts summary in the sessions table of session-store.db, not in workspace.yaml', () => {
    expect(windowHas(s31(), [/summary/, /session-store\.db/, /`sessions` table/], 400)).toBe(true);
  });

  it.each(TEXT_NAMES)('%s never says workspace.yaml holds the summary', (name) => {
    const text = textOf(name);
    const offending = sentences(text).filter(
      (s) =>
        /workspace\.yaml/.test(s) &&
        /\bsummary\b/i.test(s) &&
        !/\b(not|never|instead|rather than|isn't|doesn't|does not)\b/i.test(s),
    );
    expect(offending, 'summary lives in session-store.db, not workspace.yaml').toEqual([]);
  });

  it('says plan.md and session.db exist only when the session uses plans or the sql tool', () => {
    expect(windowHas(s31(), [/`plan\.md`/, /`session\.db`/, /\bsql\b/, /plan/i, /only|when|if/i], 700)).toBe(true);
  });

  it('warns that the session files are not encrypted', () => {
    expect(s31()).toMatch(/not encrypted/i);
  });

  it('tells the reader how to find the current session: /session id', () => {
    expect(guide()).toContain('/session id');
  });
});

describe('phase 4 contract: AC21 — session_store_sql: cloud materialized views are not the local SQLite tables', () => {
  const s43 = (): string => sectionUnder(guide(), /^###\s+4\.3\s/);
  const CLOUD = ['sessions', 'turns', 'checkpoints', 'session_files', 'session_refs', 'session_usage', 'tool_executions', 'events'];
  const LOCAL = ['sessions', 'turns', 'checkpoints', 'session_files', 'session_refs', 'search_index'];

  it('has a store table with a Cloud row listing the eight materialized views', () => {
    const row = rowStartingWith(s43(), /^Cloud/i);
    expect(row, 'no table row whose first cell starts with "Cloud"').toBeDefined();
    for (const name of CLOUD) expect(row!, `the Cloud row does not name ${name}`).toContain(`\`${name}\``);
    expect(row!).toMatch(/materialized view/i);
  });

  it('has a Local row for source: "local" and ~/.copilot/session-store.db listing exactly the six local tables', () => {
    const row = rowStartingWith(s43(), /^Local/i);
    expect(row, 'no table row whose first cell starts with "Local"').toBeDefined();
    expect(row!).toContain('source: "local"');
    expect(row!).toContain('~/.copilot/session-store.db');
    for (const name of LOCAL) expect(row!, `the Local row does not name ${name}`).toContain(`\`${name}\``);
    for (const absent of ['session_usage', 'tool_executions', '`events`']) {
      expect(row!, `${absent} is a cloud view; the local store has no such table`).not.toContain(absent);
    }
  });

  it('says the local store has no session_usage, tool_executions or events table', () => {
    expect(windowHas(s43(), [/session_usage/, /tool_executions/, /events/, /local/i, /no such table|do not exist|does not have|has no/i], 600)).toBe(true);
  });

  it('notes that the cloud store takes DuckDB SQL and the local store SQLite SQL', () => {
    expect(windowHas(s43(), [/DuckDB/, /SQLite/, /INTERVAL/], 700)).toBe(true);
  });

  it('shows one runnable example for each store', () => {
    const blocks = [...s43().matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks.some((b) => /tool_executions/.test(b) && /INTERVAL/i.test(b))).toBe(true);
    expect(blocks.some((b) => /search_index/.test(b) && /MATCH/i.test(b))).toBe(true);
  });

  it('local SQL example executes: empty history, FTS filtering, duplicate hits, newest first and a five-session limit', () => {
    const sql = [...s43().matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => /search_index/.test(b));
    expect(sql, 'no local SQLite example to execute').toBeDefined();
    // DDL read from the installed CLI's sqlite_master on 2026-11-12, not an invented store schema.
    // Use Python's stdlib SQLite, as in the lab's Python guard checks: early node:sqlite has no FTS5.
    const python = ['python', 'python3'].find((command) =>
      spawnSync(command, ['-c', 'import sqlite3'], { encoding: 'utf8', timeout: 5000 }).status === 0,
    );
    expect(python, 'the SQL integration fixture needs Python with the standard sqlite3 module').toBeDefined();
    const fixture = `
import json, sqlite3, sys
sql = sys.stdin.read()
db = sqlite3.connect(':memory:')
try:
    db.execute("CREATE TABLE sessions (id TEXT PRIMARY KEY, cwd TEXT, repository TEXT, branch TEXT, summary TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), host_type TEXT)")
    db.execute('CREATE VIRTUAL TABLE search_index USING fts5(content, session_id UNINDEXED, source_type UNINDEXED, source_id UNINDEXED)')
    empty = db.execute(sql).fetchall()
    for n in range(1, 8):
        db.execute('INSERT INTO sessions (id, summary, created_at) VALUES (?, ?, ?)',
                   (f's{n}', f'Hook session {n}', f'2026-11-{n:02d}T12:00:00Z'))
        db.execute('INSERT INTO search_index VALUES (?, ?, ?, ?)', ('hook execution', f's{n}', 'turn', f't{n}'))
    db.execute('INSERT INTO search_index VALUES (?, ?, ?, ?)', ('another hook hit', 's7', 'turn', 't-duplicate'))
    db.execute('INSERT INTO sessions (id, summary, created_at) VALUES (?, ?, ?)',
               ('unrelated', 'Newest but not about hooks', '2026-11-12T12:00:00Z'))
    db.execute('INSERT INTO search_index VALUES (?, ?, ?, ?)', ('an unrelated question', 'unrelated', 'turn', 't-unrelated'))
    print(json.dumps({'empty': empty, 'ids': [row[0] for row in db.execute(sql)]}))
finally:
    db.close()
    `;
    const result = spawnSync(python!, ['-c', fixture], {
      input: sql!, encoding: 'utf8', timeout: 20_000,
    });
    expect(result.status, result.error?.message ?? result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ empty: [], ids: ['s7', 's6', 's5', 's4', 's3'] });
  });
});

describe('phase 4 contract: AC21 — /diagnose and /collect-debug-logs are described as documented', () => {
  const s41 = (): string => sectionUnder(guide(), /^###\s+4\.1\s/);
  const s42 = (): string => sectionUnder(guide(), /^###\s+4\.2\s/);

  it('describes /diagnose [prompt] as analysing the current session\'s logs, including why a permission request needed approval', () => {
    expect(windowHas(s41(), [/\/diagnose \[prompt\]/, /current session/i, /logs/i, /permission request/i], 600)).toBe(true);
  });

  it.each(TEXT_NAMES)('%s does not claim /diagnose explains why a tool or hook failed', (name) => {
    const text = textOf(name);
    const offending = sentences(text).filter(
      (s) => /\/diagnose/.test(s) && /why (?:a |the |your )?(?:tool|hook)s?\b[^.]{0,30}\bfail/i.test(s),
    );
    expect(offending, 'the docs say /diagnose analyses session logs, including permission requests').toEqual([]);
  });

  it('describes /collect-debug-logs: a local .tgz, sharing with GitHub after consent, or a secret gist', () => {
    expect(windowHas(s42(), [/\/collect-debug-logs/, /\.tgz/, /consent/i, /secret (?:GitHub )?gist/i], 700)).toBe(true);
  });

  it('shows the documented usage line of /collect-debug-logs', () => {
    expect(s42()).toContain('/collect-debug-logs [file [path]|share [path]|session [file [path]|gist|share [path]|<path>]|gist|<path>]');
  });

  it('warns that debug logs hold prompts, source code and tool output, and says to review them before sharing', () => {
    expect(windowHas(s42(), [/prompts/i, /source code/i, /review/i], 700)).toBe(true);
  });
});

describe('phase 4 contract: AC21 — /context and the in-session inspection commands', () => {
  const s34 = (): string => sectionUnder(guide(), /^###\s+3\.4\s/);

  it.each(['/env', '/instructions', '/context', '/usage', '/tasks', '/mcp list', '/skills list'])('lists %s', (cmd) => {
    expect(s34()).toContain(`\`${cmd}`);
  });

  it('gives the /context split: System Prompt, Custom Instructions, System Tools, MCP Tools, Messages, Free Space and Buffer', () => {
    for (const part of ['System Prompt', 'Custom Instructions', 'System Tools', 'MCP Tools', 'Messages', 'Free Space', 'Buffer']) {
      expect(s34(), `/context row does not name ${part}`).toContain(part);
    }
  });

  it.each(TEXT_NAMES)('%s ties per-skill and per-agent /context usage to experimental mode', (name) => {
    const text = textOf(name);
    const offending = sentences(text).filter(
      (s) => /\/context/.test(s) && /per[- ](?:skill|agent|subagent|tool|plugin)/i.test(s) && !/experimental/i.test(s),
    );
    expect(offending, '/context only breaks usage down per skill or agent in experimental mode').toEqual([]);
  });

  it('shows how to turn experimental mode on, and that it takes effect after a restart', () => {
    expect(windowHas(s34(), [/\/settings experimental on/, /restart/i, /--experimental/], 600)).toBe(true);
  });
});

describe('phase 4 contract: AC21 — process logs', () => {
  const s33 = (): string => sectionUnder(guide(), /^###\s+3\.3\s/);

  it('teaches copilot --log-level debug --log-dir ./logs and the default ~/.copilot/logs/ location', () => {
    expect(s33()).toContain('copilot --log-level debug --log-dir ./logs');
    expect(s33()).toContain('~/.copilot/logs/');
    expect(s33()).toMatch(/process-<timestamp>-<pid>\.log/);
  });

  it('lists the log levels and says all is the same as debug', () => {
    expect(windowHas(s33(), [/none/, /error/, /warning/, /info/, /debug/, /\ball\b/, /same as/i], 700)).toBe(true);
  });

  it('keeps OTEL_LOG_LEVEL apart from the CLI --log-level', () => {
    expect(windowHas(guide(), [/OTEL_LOG_LEVEL/, /not the CLI/i, /--log-level/], 400)).toBe(true);
  });
});

describe("phase 4 contract: AC21 — what the documents say about this repository's .gitignore is true", () => {
  /**
   * The rule in this repository's own `.gitignore` that git applies to `path`, as its pattern text, or null when none
   * does. `--no-index` asks what the rules say whether or not the path is tracked. A match from a global excludes
   * file or `.git/info/exclude` belongs to the reader's machine, not to this repository, so it counts as no rule.
   *
   * Probe a FILE, never a folder. `git check-ignore -v logs/` exits 0 and prints `.gitignore:64:`, an empty pattern,
   * then a tab and `logs/`: line 64 is a blank line, and any path that ends in a slash matches it (observed with
   * `git check-ignore -v no-such-folder/`; this file has CRLF line endings, which is probably why git reads its blank
   * lines as empty patterns). Read as `.gitignore:64:logs/`, that output was taken for a `logs/` rule that does not
   * exist, and four places then said this repository ignores `logs/`. Its log rules are `*.log`, which covers the
   * process logs, and `.github/logs/`.
   */
  function gitignoreRuleFor(path: string): string | null {
    const r = spawnSync('git', ['check-ignore', '--no-index', '--verbose', '--', path], { cwd: ROOT, encoding: 'utf8', timeout: 20_000 });
    // Exit 0 means ignored and 1 means not ignored. Anything else is git failing, which must not read as "not ignored".
    if (r.error || (r.status !== 0 && r.status !== 1)) {
      throw new Error(`git check-ignore failed for ${path}: ${r.error?.message ?? r.stderr}`);
    }
    const match = r.stdout.match(/^(.+?):\d+:(.*)\t/);
    return match && match[1] === '.gitignore' && !match[2].startsWith('!') ? match[2] : null;
  }

  /** What the documents say about git ignoring files here: one probe for each, and the rule that should answer it. */
  const FACTS = [
    { says: 'process logs (*.log) are ignored', probe: 'logs/process-2026-11-12T00-00-00-000Z-4242.log', rule: '*.log' },
    { says: 'a /collect-debug-logs .tgz is ignored', probe: 'copilot-debug-logs.tgz', rule: '*.tgz' },
    { says: 'copilot-otel.jsonl is not ignored', probe: 'copilot-otel.jsonl', rule: null },
    { says: 'a non-.log file in logs/ is not ignored', probe: 'logs/notes.txt', rule: null },
  ];

  it.each(FACTS)('git agrees that $says', ({ probe, rule }) => {
    expect(gitignoreRuleFor(probe)).toBe(rule);
  });

  /** A sentence about git ignoring something. */
  const ABOUT_IGNORING = /git-ignored|\.gitignore|\bignor(?:e|es|ed)\b/i;
  /** The logs folder named as such: `logs`, `logs/`, `./logs` or `./logs/` on its own, or "the logs folder". */
  const LOGS_FOLDER = /`(?:\.\/)?logs\/?`|\blogs? (?:folder|directory)\b/i;

  it.each(TEXT_NAMES)('%s never says the logs folder is git-ignored: the rule is *.log, which covers the process logs in it', (name) => {
    const offending = sentences(textOf(name)).filter((s) => ABOUT_IGNORING.test(s) && LOGS_FOLDER.test(s));
    expect(offending, 'this repository ignores *.log and has no rule for a logs folder: say the process logs are ignored').toEqual([]);
  });

  it.each([
    { where: 'the guide, section 3.3', text: (): string => sectionUnder(guide(), /^###\s+3\.3\s/) },
    { where: 'the Lab 05 callout', text: (): string => debugItCallouts(lab('lab05'))[0] ?? '' },
    { where: 'the Diagnostic Toolkit', text: (): string => sectionUnder(troubleshooting(), /^##\s+.*Diagnostic Toolkit/) },
  ])('$where says the process logs are git-ignored through the *.log rule', ({ text }) => {
    expect(sentences(text()).some((s) => ABOUT_IGNORING.test(s) && s.includes('`*.log`'))).toBe(true);
  });
});

describe('phase 4 contract: AC21 — OpenTelemetry', () => {
  const s5 = (): string => sectionUnder(guide(), /^##\s+5\.\s/);
  const s51 = (): string => sectionUnder(guide(), /^###\s+5\.1\s/);
  const s53 = (): string => sectionUnder(guide(), /^###\s+5\.3\s/);
  const s54 = (): string => sectionUnder(guide(), /^###\s+5\.4\s/);

  it('names the three ways OTel switches on, with the exact values', () => {
    expect(s51()).toContain('COPILOT_OTEL_ENABLED=true');
    expect(s51()).toContain('OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318');
    expect(s51()).toContain('COPILOT_OTEL_FILE_EXPORTER_PATH=./copilot-otel.jsonl');
  });

  it('says the endpoint auto-enables the otlp-http exporter and the file path auto-enables the JSON-lines file exporter with no collector', () => {
    expect(windowHas(s51(), [/OTEL_EXPORTER_OTLP_ENDPOINT/, /auto-enable/i, /otlp-http/], 500)).toBe(true);
    expect(windowHas(s51(), [/COPILOT_OTEL_FILE_EXPORTER_PATH/, /auto-enable/i, /JSON-lines/i, /collector/i], 600)).toBe(true);
  });

  it('warns that ./copilot-otel.jsonl is not git-ignored here and can hold prompts once content capture is on', () => {
    // "**not** git-ignored" has emphasis markers between the words, so allow a few non-word characters.
    expect(windowHas(s51(), [/copilot-otel\.jsonl/, /not\W{0,4}(?:git-)?ignored|\.gitignore/i, /delete|outside/i], 700)).toBe(true);
  });

  it('documents COPILOT_OTEL_EXPORTER_TYPE (otlp-http or file) and OTEL_EXPORTER_OTLP_PROTOCOL (http/json or http/protobuf)', () => {
    expect(windowHas(s54(), [/COPILOT_OTEL_EXPORTER_TYPE/, /otlp-http/, /`file`/], 400)).toBe(true);
    expect(windowHas(s54(), [/OTEL_EXPORTER_OTLP_PROTOCOL/, /http\/json/, /http\/protobuf/], 400)).toBe(true);
  });

  it('documents OTEL_LOG_LEVEL with its seven values and COPILOT_OTEL_SOURCE_NAME defaulting to "github.copilot"', () => {
    expect(windowHas(s54(), [/OTEL_LOG_LEVEL/, /NONE/, /ERROR/, /WARN/, /INFO/, /DEBUG/, /VERBOSE/, /ALL/], 600)).toBe(true);
    expect(windowHas(s54(), [/COPILOT_OTEL_SOURCE_NAME/, /github\.copilot/], 300)).toBe(true);
  });

  it('makes NO_CONTENT the default and SPAN_ONLY the opt-in for prompts, responses, system instructions, tool arguments and results, and sandbox decisions', () => {
    expect(s53()).toContain('OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY');
    expect(windowHas(s53(), [/NO_CONTENT/, /default/i, /metadata/i], 400)).toBe(true);
    expect(
      windowHas(s53(), [/SPAN_ONLY/, /prompts?/i, /responses?/i, /system instructions/i, /tool (?:call )?arguments/i, /results/i, /sandbox/i], 900),
    ).toBe(true);
  });

  it('says SPAN_AND_EVENT also enables span content, because separate content events are not exported', () => {
    expect(windowHas(s53(), [/SPAN_AND_EVENT/, /span content/i, /not exported/i], 500)).toBe(true);
  });

  it('warns that content capture can hold sensitive code and prompts and belongs in trusted environments only', () => {
    expect(windowHas(s53(), [/sensitive/i, /trusted/i], 500)).toBe(true);
  });

  it('shows the span tree invoke_agent → plan → chat / execute_tool, notes plan is plan mode only, and says subagents join the same trace', () => {
    expect(s5()).toContain('invoke_agent');
    expect(s5()).toMatch(/chat <model>/);
    expect(s5()).toMatch(/execute_tool <tool>/);
    expect(windowHas(s5(), [/\bplan\b/, /plan mode/i], 400)).toBe(true);
    expect(windowHas(s5(), [/subagent/i, /same trace/i], 400)).toBe(true);
  });

  it('separates what the docs state from what was observed on the build the guide was written against', () => {
    expect(windowHas(s5(), [/observed/i, /not (?:a )?documented|documentation does not/i], 800)).toBe(true);
  });
});

describe('phase 4 contract: AC21 — triage, sharing and sources', () => {
  const s6 = (): string => sectionUnder(guide(), /^##\s+6\.\s/);
  const s7 = (): string => sectionUnder(guide(), /^##\s+7\.\s/);
  const s8 = (): string => sectionUnder(guide(), /^##\s+8\.\s/);

  it.each(LAB_IDS)('the triage table points at %s', (id) => {
    expect(s6()).toContain(`../labs/${id}.md`);
  });

  it('the sharing checklist says logs and exports can hold prompts, source code, file paths and secrets', () => {
    expect(windowHas(s7(), [/prompts/i, /source code/i, /file paths/i, /secrets?|credentials/i], 600)).toBe(true);
  });

  it.each([
    'topic:monitoring#activation',
    'topic:monitoring#environment-variables',
    'topic:monitoring#content-capture',
    'topic:sessions#where-sessions-are-stored',
    'command:/diagnose',
    'command:/collect-debug-logs',
    'command:/context',
    'https://code.visualstudio.com/docs/agents/agent-troubleshooting/chat-debug-view',
  ])('the sources table cites %s', (cite) => {
    expect(s8()).toContain(cite);
  });

  it('attributes #debugEventsSnapshot to the VS Code 1.111 release notes, not to the debug-view page', () => {
    expect(windowHas(s8(), [/#debugEventsSnapshot/, /1\.111/, /release notes/i], 500)).toBe(true);
  });

  it('marks session_store_sql and the record shapes as taken from the tool description or from observation, not from published docs', () => {
    expect(windowHas(s8(), [/session_store_sql/, /tool/i, /description|cost-check/i], 600)).toBe(true);
    expect(windowHas(s8(), [/Observed/, /events\.jsonl/, /JSON-lines/i], 700)).toBe(true);
  });
});

describe('phase 4 contract: AC21 — every link in the guide resolves', () => {
  it('every relative link in the guide points at a file that exists', () => {
    const broken: string[] = [];
    for (const m of guide().matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)\)/g)) {
      const link = m[1];
      if (/^(https?:|mailto:|#)/.test(link)) continue;
      const target = link.split('#')[0];
      if (target && !existsSync(resolve(dirname(GUIDE_PATH), target))) broken.push(link);
    }
    expect(broken).toEqual([]);
  });

  it('every in-page anchor in the guide matches one of its headings', () => {
    const slugs = headingSlugs(guide());
    const missing = [...guide().matchAll(/\]\(#([^)\s]+)\)/g)].map((m) => m[1]).filter((a) => !slugs.has(a));
    expect(missing).toEqual([]);
  });
});

describe('phase 4 contract: AC22 — TROUBLESHOOTING.md has a Diagnostic Toolkit section', () => {
  const toolkit = (): string => sectionUnder(troubleshooting(), /^##\s+.*Diagnostic Toolkit/);

  it('has a top-level (##) section titled "Diagnostic Toolkit: VS Code Debug Views, CLI /diagnose, Session Data & OpenTelemetry"', () => {
    // An emoji prefix is allowed, as on the file's other headings, and so are backticks around /diagnose.
    expect(troubleshooting()).toMatch(
      /^##\s+(?:\S+\s+)?Diagnostic Toolkit: VS Code Debug Views, CLI `?\/diagnose`?, Session Data & OpenTelemetry\s*$/m,
    );
  });

  it('comes before the per-lab issues, so it is the first thing a presenter sees', () => {
    const t = troubleshooting();
    expect(t.search(/^##\s+.*Diagnostic Toolkit/m)).toBeGreaterThan(-1);
    expect(t.search(/^##\s+.*Diagnostic Toolkit/m)).toBeLessThan(t.search(/^##\s+.*Per-Lab & Per-Track Issues/m));
  });

  it('keeps the existing sections', () => {
    for (const h of ['Per-Lab & Per-Track Issues', 'Known Limitations', 'Critical Issues', 'Prevention Checklist']) {
      expect(troubleshooting()).toMatch(new RegExp(`^##\\s+.*${h}`, 'm'));
    }
  });

  it.each([
    'Show Agent Debug Logs',
    'Agent Flow Chart',
    'Show Chat Debug View',
    '/troubleshoot',
    '#debugEventsSnapshot',
    'events.jsonl',
    '/diagnose',
    '/collect-debug-logs',
    '/context',
    'COPILOT_OTEL_ENABLED',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'COPILOT_OTEL_FILE_EXPORTER_PATH',
    'OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT',
  ])('the toolkit names %s', (token) => {
    expect(toolkit()).toContain(token);
  });

  it('links the guide and says content capture is opt-in and sensitive', () => {
    expect(toolkit()).toMatch(/\]\(docs\/debugging-and-observability\.md(?:#[^)]*)?\)/);
    expect(windowHas(toolkit(), [/SPAN_ONLY/, /sensitive|trusted/i], 600)).toBe(true);
  });

  it('every relative link the toolkit adds resolves', () => {
    const broken: string[] = [];
    for (const m of toolkit().matchAll(/(?<!!)\[[^\]]+\]\(([^)\s]+)\)/g)) {
      const link = m[1];
      if (/^(https?:|mailto:|#)/.test(link)) continue;
      const target = link.split('#')[0];
      if (target && !existsSync(resolve(ROOT, target))) broken.push(link);
    }
    expect(broken).toEqual([]);
  });

  it('the GitHub Copilot Chat Hooks channel is only ever called a legacy Local-setup channel', () => {
    const offending = sentences(toolkit()).filter((s) => /GitHub Copilot Chat Hooks/.test(s) && !/legacy|old Local|Local setup|Local harness/i.test(s));
    expect(offending).toEqual([]);
  });
});

describe('phase 4 contract: the seven Debug It callouts share one shape', () => {
  it.each(LAB_IDS)('%s carries exactly one "🔍 Debug It (VS Code & Copilot CLI)" callout', (id) => {
    expect(debugItCallouts(lab(id)).length).toBe(1);
  });

  it.each(LAB_IDS)('the %s callout names both surfaces and links the guide', (id) => {
    const [c] = debugItCallouts(lab(id));
    expect(c, `${id} has no callout`).toBeDefined();
    expect(c).toMatch(/Copilot CLI/);
    expect(c).toMatch(/VS Code/);
    expect(c).toMatch(/\]\(\.\.\/docs\/debugging-and-observability\.md(?:#[^)]*)?\)/);
  });

  it.each(LAB_IDS)('the %s callout tells the reader which commands go inside a copilot session', (id) => {
    const [c] = debugItCallouts(lab(id));
    expect(c, `${id} has no callout`).toBeDefined();
    // "inside a running `copilot` session", "in your restarted copilot session", "in the same `copilot` session" …
    expect(c).toMatch(/\b(?:inside|in)\s+(?:(?:a|an|the|your|that|this)\s+)?(?:(?:running|restarted|same|open)\s+)*`?copilot`?\s+session/i);
  });

  it.each(LAB_IDS)('%s hardcodes no Copilot CLI version', (id) => {
    expect(lab(id).match(/\b1\.0\.\d{2,}\b/g) ?? []).toEqual([]);
  });

  it('every anchor the labs and TROUBLESHOOTING.md use on the guide matches one of its headings', () => {
    const slugs = headingSlugs(guide());
    const used: Array<[string, string]> = [];
    for (const [name, text] of [...LAB_IDS.map((id): [string, string] => [`labs/${id}.md`, lab(id)]), ['TROUBLESHOOTING.md', troubleshooting()] as [string, string]]) {
      for (const m of text.matchAll(/debugging-and-observability\.md#([^)\s]+)/g)) used.push([name, m[1]]);
    }
    const missing = used.filter(([, a]) => !slugs.has(a)).map(([n, a]) => `${n}#${a}`);
    expect(missing).toEqual([]);
  });

  it('GitHub Copilot Chat Hooks is never presented as the channel for the Copilot harness: every sentence that names it also says Local or legacy', () => {
    for (const [name, text] of phase4Texts()) {
      const offending = sentences(text).filter((s) => /GitHub Copilot Chat Hooks/.test(s) && !/legacy|old Local|Local setup|Local harness|Local sessions/i.test(s));
      expect(offending, `${name}: "GitHub Copilot Chat Hooks" without saying it is the legacy Local channel`).toEqual([]);
    }
  });
});

/*
 * The one-liners in Lab 06 §6.4.1 are RUN, not just read. A typo in a one-liner that reads a log is
 * the kind of defect nobody finds by proofreading, and the lab tells a learner to trust the output.
 * The test extracts each block by the comment on its first line, points its input variable at a
 * fixture written here, and runs it with every runtime found on this machine. A runtime that is not
 * installed is skipped, as elsewhere in this suite. Node.js is always present because Vitest is
 * running on it, and builds the fixtures.
 */
describe('phase 4 contract: Lab 06 §6.4.1 one-liners run against fixture logs', () => {
  const s641 = (): string => sectionUnder(lab('lab06'), /^###\s+6\.4\.1\s/);
  const fences = (md: string, lang: string): string[] =>
    [...md.matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);

  const probe = (command: string, args: string[], timeoutMs = 20_000): string | null => {
    const r = spawnSync(command, args, { encoding: 'utf8', timeout: timeoutMs });
    return r.error || r.status !== 0 ? null : `${r.stdout}${r.stderr}`;
  };
  const pwsh = Number(probe('pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'])?.trim()) >= 7 ? 'pwsh' : null;

  /**
   * A Bash that can see jq. On Linux and macOS that is `bash`. On Windows it is Git Bash when that has jq, and
   * otherwise WSL, whose Windows drives are mounted under /mnt (Git Bash uses /c). Both need the script and the
   * fixtures as POSIX paths, which `toPosix` produces.
   */
  interface BashRunner {
    command: string;
    prefix: string[];
    toPosix: (windowsPath: string) => string;
  }
  const toGitBashPath = (p: string): string => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => `/${d.toLowerCase()}`);
  const toWslPath = (p: string): string => p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d: string) => `/mnt/${d.toLowerCase()}`);
  const bashRunner = ((): BashRunner | null => {
    if (process.platform !== 'win32') {
      return probe('bash', ['-c', 'command -v jq']) !== null ? { command: 'bash', prefix: [], toPosix: (p) => p } : null;
    }
    const gitBash = ['C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe'].find(
      (p) => existsSync(p) && probe(p, ['-c', 'command -v jq']) !== null,
    );
    if (gitBash) return { command: gitBash, prefix: [], toPosix: toGitBashPath };
    // WSL starts its virtual machine on first use and stops it when idle, so a probe that lands while the whole
    // suite is loading the machine, or while an idle VM is shutting down, can fail once and pass on the next try.
    // Retrying keeps one transient failure from silently dropping the seven Bash tests below.
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (probe('wsl', ['-e', 'bash', '-c', 'command -v jq'], 60_000) !== null) return { command: 'wsl', prefix: ['-e', 'bash'], toPosix: toWslPath };
    }
    console.warn('phase 4 contract: no Bash with jq was found (Git Bash has none and the WSL probe failed 3 times), so the Bash + jq one-liner tests are skipped.');
    return null;
  })();
  const bashWithJq = bashRunner?.command ?? null;

  let dir = '';
  let events = '';
  let otel = '';
  /** An OTel file whose records carry the marker word, as a SPAN_ONLY run would leave them. */
  let otelMarker = '';

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'phase4-oneliners-'));
    mkdirSync(join(dir, 'logs'));
    writeFileSync(
      join(dir, 'logs/process-2026-11-12-1234.log'),
      Array.from({ length: 30 }, (_, n) =>
        `WARN MCP server connection failed: fetch trace ${n + 1}\nWARN MCP server connection failed: other-server ${n + 1}\n`,
      ).join(''),
    );
    events = join(dir, 'events.jsonl');
    otel = join(dir, 'copilot-otel.jsonl');
    otelMarker = join(dir, 'copilot-otel-marker.jsonl');
    writeFileSync(
      otelMarker,
      [
        JSON.stringify({ type: 'span', name: 'invoke_agent', attributes: { 'gen_ai.input.messages': 'List the files. Marker: PINEAPPLE-7431.' } }),
        JSON.stringify({ type: 'span', name: 'chat <model>', attributes: { 'gen_ai.output.messages': 'PINEAPPLE-7431' } }),
        JSON.stringify({ type: 'metric', name: 'gen_ai.client.operation.duration', dataPoints: [] }),
      ].join('\n') + '\n',
    );
    const ev = (type: string, data: Record<string, unknown>, id: string): string =>
      JSON.stringify({ type, data, id, timestamp: '2026-01-01T00:00:00.000Z', parentId: null });
    writeFileSync(
      events,
      [
        ev('session.start', { sessionId: 's' }, '1'),
        ev('hook.start', { hookInvocationId: 'a', hookType: 'userPromptSubmitted', input: {} }, '2'),
        ev('hook.end', { hookInvocationId: 'a', hookType: 'userPromptSubmitted', success: true }, '3'),
        ev('hook.start', { hookInvocationId: 'b', hookType: 'preToolUse', input: {} }, '4'),
        ev('hook.end', { hookInvocationId: 'b', hookType: 'preToolUse', success: false }, '5'),
        ev('hook.start', { hookInvocationId: 'c', hookType: 'preToolUse', input: {} }, '6'),
        ev('hook.end', { hookInvocationId: 'c', hookType: 'preToolUse', success: true }, '7'),
        ev('user.message', { content: 'hello' }, '8'),
      ].join('\n') + '\n',
    );
    const span = (name: string, spanId: string, parentSpanId: string | undefined, hookTypes: string[] = []): string =>
      JSON.stringify({
        type: 'span',
        traceId: 't1',
        spanId,
        ...(parentSpanId ? { parentSpanId } : {}),
        name,
        attributes: {},
        events: hookTypes.map((t) => ({ name: 'github.copilot.hook.start', attributes: { 'github.copilot.hook.type': t } })),
      });
    // Spans are written as they finish, so children come before their parent.
    writeFileSync(
      otel,
      [
        span('chat <model>', 'c1', 'root'),
        span('execute_tool task', 'e1', 'root'),
        span('invoke_agent explore', 'sub', 'e1'),
        span('invoke_agent', 'root', undefined, ['preToolUse', 'preToolUse', 'postToolUse']),
        JSON.stringify({ type: 'metric', name: 'gen_ai.client.operation.duration', dataPoints: [] }),
      ].join('\n') + '\n',
    );
  });

  afterAll(() => {
    if (dir !== '') rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  /** The block under §6.4.1 whose first line is the comment `# <starts>` (or `// …`). */
  const block = (lang: string, starts: RegExp): string | undefined =>
    fences(s641(), lang).find((b) => starts.test(b.split('\n')[0]));
  /** The same lookup in the guide. */
  const guideBlock = (lang: string, starts: RegExp): string | undefined =>
    fences(guide(), lang).find((b) => starts.test(b.split('\n')[0]));

  const runPwsh = (source: string, variable: 'events' | 'otel', file?: string): string => {
    const target = file ?? (variable === 'events' ? events : otel);
    const patched = source.replace(new RegExp(`^\\$${variable} = .*$`, 'm'), `$${variable} = '${target.replace(/'/g, "''")}'`);
    const script = join(dir, `run-${Math.random().toString(36).slice(2)}.ps1`);
    writeFileSync(script, patched);
    const r = spawnSync(pwsh!, ['-NoProfile', '-NonInteractive', '-File', script], { encoding: 'utf8', timeout: 30_000 });
    expect({ status: r.status, stderr: r.stderr }).toEqual({ status: 0, stderr: '' });
    return r.stdout;
  };
  /** `okStatus` lists the exit codes that are a normal outcome: `grep -c` exits 1 when the count is 0. */
  const runBash = (source: string, variable: 'EVENTS' | 'OTEL', options: { file?: string; okStatus?: number[] } = {}): string => {
    const runner = bashRunner!;
    const target = runner.toPosix(options.file ?? (variable === 'EVENTS' ? events : otel));
    const patched = source.replace(new RegExp(`^${variable}=.*$`, 'm'), `${variable}='${target}'`);
    const script = join(dir, `run-${Math.random().toString(36).slice(2)}.sh`);
    writeFileSync(script, patched.replace(/\r\n/g, '\n'));
    const r = spawnSync(runner.command, [...runner.prefix, runner.toPosix(script)], { encoding: 'utf8', timeout: 60_000 });
    expect(options.okStatus ?? [0], `exit status ${r.status}: ${r.stderr}`).toContain(r.status);
    expect(r.stderr).toBe('');
    return r.stdout;
  };

  /** Pairs of (count, name) found in command output, in any layout the shell prints them. */
  const counts = (out: string): Record<string, number> => {
    const found: Record<string, number> = {};
    for (const m of out.matchAll(/^\s*(\d+)\s+([A-Za-z.]+)\s*$/gm)) found[m[2]] = Number(m[1]);
    return found;
  };

  it('§6.4.1 has the one-liners: hook types in events.jsonl, and span names and hook events in the OTel file, each in both shells', () => {
    for (const [lang, re] of [
      ['powershell', /^# Which hooks ran/],
      ['bash', /^# Which hooks ran/],
      ['powershell', /^# Span names/],
      ['bash', /^# Span names/],
      ['powershell', /^# Hooks in the OTel file/],
      ['bash', /^# Hooks in the OTel file/],
    ] as const) {
      expect(block(lang, re), `§6.4.1 has no ${lang} block starting "${re.source}"`).toBeDefined();
    }
  });

  it.skipIf(pwsh === null)('PowerShell: counts the hooks that ran, by hook type, from events.jsonl', () => {
    const got = counts(runPwsh(block('powershell', /^# Which hooks ran/)!, 'events'));
    expect(got).toEqual({ userPromptSubmitted: 1, preToolUse: 2 });
  });

  it.skipIf(bashWithJq === null)('Bash + jq: counts the hooks that ran, by hook type, from events.jsonl', () => {
    const got = counts(runBash(block('bash', /^# Which hooks ran/)!, 'EVENTS'));
    expect(got).toEqual({ userPromptSubmitted: 1, preToolUse: 2 });
  });

  it.skipIf(pwsh === null)('PowerShell: lists the span names in file order, children before their parent, and no metric', () => {
    const lines = runPwsh(block('powershell', /^# Span names/)!, 'otel').split(/\r?\n/).filter(Boolean);
    expect(lines).toEqual(['chat <model>', 'execute_tool task', 'invoke_agent explore', 'invoke_agent']);
  });

  it.skipIf(bashWithJq === null)('Bash + jq: lists the span names in file order, children before their parent, and no metric', () => {
    const lines = runBash(block('bash', /^# Span names/)!, 'OTEL').split(/\r?\n/).filter(Boolean);
    expect(lines).toEqual(['chat <model>', 'execute_tool task', 'invoke_agent explore', 'invoke_agent']);
  });

  it.skipIf(pwsh === null)('PowerShell: counts the hook events recorded on the spans, by hook type', () => {
    const got = counts(runPwsh(block('powershell', /^# Hooks in the OTel file/)!, 'otel'));
    expect(got).toEqual({ preToolUse: 2, postToolUse: 1 });
  });

  it.skipIf(bashWithJq === null)('Bash + jq: counts the hook events recorded on the spans, by hook type', () => {
    const got = counts(runBash(block('bash', /^# Hooks in the OTel file/)!, 'OTEL'));
    expect(got).toEqual({ preToolUse: 2, postToolUse: 1 });
  });

  it('§6.4.1 has the marker check in both shells', () => {
    for (const lang of ['powershell', 'bash']) {
      expect(block(lang, /^# Marker check/), `§6.4.1 has no ${lang} marker check`).toBeDefined();
    }
  });

  it.skipIf(pwsh === null)('PowerShell: the marker check counts the lines that hold the marker: 2 once content is captured, 0 in a metadata-only file', () => {
    const src = block('powershell', /^# Marker check/)!;
    expect(Number(runPwsh(src, 'otel', otelMarker).trim())).toBe(2);
    expect(Number(runPwsh(src, 'otel').trim())).toBe(0);
  });

  it.skipIf(bashWithJq === null)('Bash: the marker check counts the lines that hold the marker: 2 once content is captured, 0 in a metadata-only file', () => {
    const src = block('bash', /^# Marker check/)!;
    expect(Number(runBash(src, 'OTEL', { file: otelMarker }).trim())).toBe(2);
    expect(Number(runBash(src, 'OTEL', { okStatus: [1] }).trim())).toBe(0);
  });

  it('the guide has its own one-liners — records by type, failed hooks and span names — in both shells', () => {
    for (const lang of ['powershell', 'bash']) {
      for (const re of [/^# Count the records/, /^# Which hooks failed/, /^# Span names/]) {
        expect(guideBlock(lang, re), `the guide has no ${lang} block starting "${re.source}"`).toBeDefined();
      }
    }
  });

  const BY_TYPE = { 'session.start': 1, 'hook.start': 3, 'hook.end': 3, 'user.message': 1 };

  it.skipIf(pwsh === null)('guide, PowerShell: counts the records of a session by type', () => {
    expect(counts(runPwsh(guideBlock('powershell', /^# Count the records/)!, 'events'))).toEqual(BY_TYPE);
  });

  it.skipIf(bashWithJq === null)('guide, Bash + jq: counts the records of a session by type', () => {
    expect(counts(runBash(guideBlock('bash', /^# Count the records/)!, 'EVENTS'))).toEqual(BY_TYPE);
  });

  it.skipIf(pwsh === null)('guide, PowerShell: lists the hooks that ended unsuccessfully', () => {
    const lines = runPwsh(guideBlock('powershell', /^# Which hooks failed/)!, 'events').split(/\r?\n/).filter(Boolean);
    expect(lines).toEqual(['preToolUse']);
  });

  it.skipIf(bashWithJq === null)('guide, Bash + jq: lists the hooks that ended unsuccessfully', () => {
    const lines = runBash(guideBlock('bash', /^# Which hooks failed/)!, 'EVENTS').split(/\r?\n/).filter(Boolean);
    expect(lines).toEqual(['preToolUse']);
  });

  it.skipIf(pwsh === null)('guide, PowerShell: lists the span names in file order', () => {
    const lines = runPwsh(guideBlock('powershell', /^# Span names/)!, 'otel').split(/\r?\n/).filter(Boolean);
    expect(lines).toEqual(['chat <model>', 'execute_tool task', 'invoke_agent explore', 'invoke_agent']);
  });

  it.skipIf(bashWithJq === null)('guide, Bash + jq: lists the span names in file order', () => {
    const lines = runBash(guideBlock('bash', /^# Span names/)!, 'OTEL').split(/\r?\n/).filter(Boolean);
    expect(lines).toEqual(['chat <model>', 'execute_tool task', 'invoke_agent explore', 'invoke_agent']);
  });

  it.skipIf(pwsh === null)('Lab 05 PowerShell log search selects the server and returns only its last twenty matches', () => {
    const source = lab('lab05').match(/`(Select-String -Path \.\/logs\/process-\*\.log[^`]+)`/)?.[1];
    expect(source, 'no PowerShell log-search example').toBeDefined();
    const out = runPwsh(`Set-Location '${dir.replace(/'/g, "''")}'\n${source} | ForEach-Object { $_.Line }\n`, 'events');
    expect([...out.matchAll(/fetch trace (\d+)/g)].map((m) => Number(m[1]))).toEqual(
      Array.from({ length: 20 }, (_, n) => n + 11),
    );
    expect(out).not.toContain('other-server');
  });

  it.skipIf(bashWithJq === null)('Lab 05 Bash log search selects the server and returns only its last twenty matches', () => {
    const source = lab('lab05').match(/`(grep -h fetch \.\/logs\/process-\*\.log[^`]+)`/)?.[1];
    expect(source, 'no Bash log-search example').toBeDefined();
    const out = runBash(`cd '${bashRunner!.toPosix(dir)}'\n${source}\n`, 'EVENTS');
    expect([...out.matchAll(/fetch trace (\d+)/g)].map((m) => Number(m[1]))).toEqual(
      Array.from({ length: 20 }, (_, n) => n + 11),
    );
    expect(out).not.toContain('other-server');
  });

  it.skipIf(pwsh === null)('PowerShell edge cases: empty logs, sessions without hooks and spans without hook events produce no false positives', () => {
    const empty = join(dir, 'empty log.jsonl');
    const noHooks = join(dir, 'no hooks.jsonl');
    const noFailures = join(dir, 'successful hooks.jsonl');
    const noHookSpans = join(dir, 'spans without hooks.jsonl');
    writeFileSync(empty, '');
    writeFileSync(noHooks, '{"type":"session.start","data":{"sessionId":"empty"}}\n');
    writeFileSync(noFailures, '{"type":"hook.end","data":{"hookType":"preToolUse","success":true}}\n');
    writeFileSync(noHookSpans, '{"type":"metric","name":"duration"}\n{"type":"span","name":"invoke_agent"}\n');

    expect(runPwsh(block('powershell', /^# Which hooks ran/)!, 'events', empty).trim()).toBe('');
    expect(runPwsh(block('powershell', /^# Which hooks ran/)!, 'events', noHooks).trim()).toBe('');
    expect(runPwsh(guideBlock('powershell', /^# Which hooks failed/)!, 'events', noFailures).trim()).toBe('');
    expect(runPwsh(block('powershell', /^# Hooks in the OTel file/)!, 'otel', noHookSpans).trim()).toBe('');
    expect(runPwsh(block('powershell', /^# Span names/)!, 'otel', noHookSpans).trim()).toBe('invoke_agent');
  });

  it.skipIf(bashWithJq === null)('Bash edge cases: empty logs, sessions without hooks and spans without hook events produce no false positives', () => {
    const empty = join(dir, 'empty bash log.jsonl');
    const noHooks = join(dir, 'no bash hooks.jsonl');
    const noFailures = join(dir, 'successful bash hooks.jsonl');
    const noHookSpans = join(dir, 'bash spans without hooks.jsonl');
    writeFileSync(empty, '');
    writeFileSync(noHooks, '{"type":"session.start","data":{"sessionId":"empty"}}\n');
    writeFileSync(noFailures, '{"type":"hook.end","data":{"hookType":"preToolUse","success":true}}\n');
    writeFileSync(noHookSpans, '{"type":"metric","name":"duration"}\n{"type":"span","name":"invoke_agent"}\n');

    expect(runBash(block('bash', /^# Which hooks ran/)!, 'EVENTS', { file: empty }).trim()).toBe('');
    expect(runBash(block('bash', /^# Which hooks ran/)!, 'EVENTS', { file: noHooks }).trim()).toBe('');
    expect(runBash(guideBlock('bash', /^# Which hooks failed/)!, 'EVENTS', { file: noFailures }).trim()).toBe('');
    expect(runBash(block('bash', /^# Hooks in the OTel file/)!, 'OTEL', { file: noHookSpans }).trim()).toBe('');
    expect(runBash(block('bash', /^# Span names/)!, 'OTEL', { file: noHookSpans }).trim()).toBe('invoke_agent');
  });

  it.skipIf(pwsh === null)('PowerShell Tidy up removes the trace and both capture variables, preserves unrelated data and is repeatable', () => {
    const cleanupDir = mkdtempSync(join(dir, 'cleanup with spaces-'));
    const trace = join(cleanupDir, 'copilot-otel.jsonl');
    const unrelated = join(cleanupDir, 'keep.txt');
    writeFileSync(trace, 'private trace');
    writeFileSync(unrelated, 'keep me');
    const tidy = fences(s641().slice(s641().indexOf('**Tidy up.**')), 'powershell')[0];
    expect(tidy, 'no PowerShell cleanup to execute').toBeDefined();
    const script = join(cleanupDir, 'tidy.ps1');
    writeFileSync(script, `${tidy}\n${tidy}\n@{
      trace = Test-Path (Join-Path ([IO.Path]::GetTempPath()) 'copilot-otel.jsonl')
      exporter = Test-Path Env:COPILOT_OTEL_FILE_EXPORTER_PATH
      capture = Test-Path Env:OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT
      unrelated = $env:PHASE4_KEEP
    } | ConvertTo-Json -Compress\n`);
    const result = spawnSync(pwsh!, ['-NoProfile', '-NonInteractive', '-File', script], {
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env, TMPDIR: cleanupDir, TEMP: cleanupDir, TMP: cleanupDir,
        COPILOT_OTEL_FILE_EXPORTER_PATH: trace,
        OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT: 'SPAN_ONLY',
        PHASE4_KEEP: 'keep me',
      },
    });
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
    expect(JSON.parse(result.stdout)).toEqual({ trace: false, exporter: false, capture: false, unrelated: 'keep me' });
    expect(existsSync(trace)).toBe(false);
    expect(readFileSync(unrelated, 'utf8')).toBe('keep me');
  });

  it.skipIf(bashWithJq === null)('Bash Tidy up removes only its trace and is repeatable', () => {
    const trace = join(dir, 'bash cleanup trace.jsonl');
    const unrelated = join(dir, 'bash keep.txt');
    writeFileSync(trace, 'private trace');
    writeFileSync(unrelated, 'keep me');
    const tidy = fences(s641().slice(s641().indexOf('**Tidy up.**')), 'bash')[0];
    expect(tidy, 'no Bash cleanup to execute').toBeDefined();
    // Keep the command's behavior, but never let a test delete the learner's /tmp file.
    const source = tidy.replaceAll('/tmp/copilot-otel.jsonl', `'${bashRunner!.toPosix(trace)}'`);
    const script = join(dir, 'tidy.sh');
    writeFileSync(script, `${source}\n${source}\n`);
    const result = spawnSync(bashRunner!.command, [...bashRunner!.prefix, bashRunner!.toPosix(script)], {
      encoding: 'utf8', timeout: 30_000,
    });
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: '' });
    expect(existsSync(trace)).toBe(false);
    expect(readFileSync(unrelated, 'utf8')).toBe('keep me');
  });
});

describe('phase 4 contract: the new tables render', () => {
  /**
   * GitHub splits a table row on every unescaped pipe, code spans included, so a command usage such as
   * `/mcp [list|get]` inside a cell adds columns. This repository's convention is that table cells never
   * hold a literal pipe; count the way GitHub does and compare each row with its header.
   */
  const cellCount = (row: string): number => row.replace(/\\\|/g, '').replace(/^\s*\||\|\s*$/g, '').split('|').length;
  function mismatchedRows(md: string): string[] {
    const lines = lf(md).split('\n');
    const bad: string[] = [];
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*```/.test(lines[i])) {
        inFence = !inFence;
        continue;
      }
      if (inFence || !/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) continue;
      const width = cellCount(lines[i]);
      let j = i;
      while (j < lines.length && /^\s*\|/.test(lines[j])) {
        if (cellCount(lines[j]) !== width) bad.push(`${cellCount(lines[j])} cells, header has ${width}: ${lines[j].slice(0, 90)}`);
        j++;
      }
      i = j - 1;
    }
    return bad;
  }

  it('every table in the guide has the same number of cells in every row', () => {
    expect(mismatchedRows(guide())).toEqual([]);
  });

  it('every table in the Diagnostic Toolkit has the same number of cells in every row', () => {
    expect(mismatchedRows(sectionUnder(troubleshooting(), /^##\s+.*Diagnostic Toolkit/))).toEqual([]);
  });

  it('every table in Lab 06 §6.4.1 has the same number of cells in every row', () => {
    expect(mismatchedRows(sectionUnder(lab('lab06'), /^###\s+6\.4\.1\s/))).toEqual([]);
  });

  it.each(LAB_IDS)('the table rows Phase 4 added to specs/labs/%s.md have the same number of cells as their header', (id) => {
    // Only the rows this phase wrote: they are the ones that say "Phase 4" or are the AC / C / D rows it added.
    const text = lf(readFileSync(join(ROOT, 'specs/labs', `${id}.md`), 'utf8'));
    const phase4 = (row: string): boolean => /Phase 4|debugging-observability-contract/.test(row);
    const lines = text.split('\n');
    const bad: string[] = [];
    let width = 0;
    lines.forEach((l, i) => {
      if (/^\s*\|/.test(l) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] ?? '')) width = cellCount(l);
      else if (/^\s*\|/.test(l) && width && phase4(l) && cellCount(l) !== width) bad.push(`${cellCount(l)} cells, header has ${width}: ${l.slice(0, 90)}`);
      else if (!/^\s*\|/.test(l)) width = 0;
    });
    expect(bad).toEqual([]);
  });
});

describe('phase 4 contract: specs/labs/lab06.md records the guide and the toolkit', () => {
  const spec = (): string => lf(readFileSync(SPEC_06, 'utf8'));
  it.each(['AC21', 'AC22'])('has %s observed by the Phase 4 contract', (id) => {
    expect(spec()).toMatch(new RegExp(`^\\|\\s*${id}\\s*\\|[^\\n]*debugging-observability-contract`, 'm'));
  });

  it('records the primary-source corrections the plan needed (summary, complete log, /diagnose, /context) as claims', () => {
    for (const needle of [/workspace\.yaml/, /\/diagnose/, /\/context/, /#debugEventsSnapshot/, /OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT/]) {
      expect(spec(), `the spec's outside-world claims never mention ${needle}`).toMatch(needle);
    }
  });
});