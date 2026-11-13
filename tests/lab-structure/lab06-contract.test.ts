import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { createServer, request, type RequestListener } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import matter from 'gray-matter';
import yaml from 'js-yaml';

/**
 * Lab 06 contract — the mechanical definition of done for `specs/labs/lab06.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 *
 * AC12–AC17 were added with Phase 3 of the 2026-11 remediation (hooks overhaul). They
 * pin the primary-source precision rules adjudicated on 2026-11-12 against the GitHub
 * hooks reference, the VS Code agent-hooks page and the Copilot CLI built-in docs.
 *
 * AC18–AC19 were added after the first independent review of Phase 3. AC18 runs the four
 * `.env` guards from §6.2.2 instead of reading them; AC19 pins where the optional guard
 * registration lives and that Clean up removes it before the script it points at.
 *
 * AC20 was added with Phase 4 (debugging and observability, 2026-11-12). It pins the §6.4
 * Debug It callout and the optional §6.4.1 walkthrough. The guide it links, the
 * TROUBLESHOOTING.md toolkit and the one-liners it teaches (AC21, AC22) are pinned in
 * `debugging-observability-contract.test.ts`.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab06.md');
const SPEC = join(ROOT, 'specs/labs/lab06.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const HOOK_CONFIG = join(ROOT, '.github/hooks/default.json');
const CONFIG_REF = join(ROOT, 'docs/copilot-config-reference.md');

const lab = (): string => readFileSync(LAB, 'utf8');
const configRef = (): string => readFileSync(CONFIG_REF, 'utf8');
const spec = (): string => readFileSync(SPEC, 'utf8');

/** The 14 events in the hooks reference's "Hook events" table. */
const REFERENCE_EVENTS = [
  'sessionStart',
  'userPromptSubmitted',
  'userPromptTransformed',
  'permissionRequest',
  'preToolUse',
  'postToolUse',
  'postToolUseFailure',
  'subagentStart',
  'subagentStop',
  'agentStop',
  'preCompact',
  'notification',
  'errorOccurred',
  'sessionEnd',
];

/** The 15th event: documented only in the Copilot CLI's built-in docs (`setting:hooks.preMcpToolCall`). */
const CLI_BUILD_EVENT = 'preMcpToolCall';
const ALL_EVENTS = [...REFERENCE_EVENTS, CLI_BUILD_EVENT];

/** The PascalCase configuration aliases the hooks reference documents: 11 of the 15 events. */
const DOCUMENTED_ALIASES: Array<[string, string]> = [
  ['sessionStart', 'SessionStart'],
  ['userPromptSubmitted', 'UserPromptSubmit'],
  ['permissionRequest', 'PermissionRequest'],
  ['preToolUse', 'PreToolUse'],
  ['postToolUse', 'PostToolUse'],
  ['postToolUseFailure', 'PostToolUseFailure'],
  ['subagentStop', 'SubagentStop'],
  ['agentStop', 'Stop'],
  ['preCompact', 'PreCompact'],
  ['errorOccurred', 'ErrorOccurred'],
  ['sessionEnd', 'SessionEnd'],
];

/** The four events with no documented PascalCase alias. */
const NO_ALIAS_EVENTS = ['userPromptTransformed', 'preMcpToolCall', 'subagentStart', 'notification'];

/**
 * The lab as flowing prose: blockquote markers stripped and whitespace collapsed.
 * The claims under review live inside `>` callouts and wrap mid-sentence, so a
 * regex run against the raw text silently misses anything spanning a line break.
 */
const prose = (): string =>
  lab()
    .split('\n')
    .map((l) => l.replace(/^\s*>\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');

/** Normalise CRLF so line-anchored patterns behave the same on a Windows checkout. */
const lf = (s: string): string => s.replace(/\r\n/g, '\n');

/**
 * The text under the first heading that matches `heading`, up to (not including) the next
 * heading of the same or a higher level. Sub-headings stay inside the slice, so `## 6.2`
 * includes `### 6.2.2`. Fenced code is skipped when looking for headings: a `# comment`
 * line inside a bash or PowerShell block is not a heading.
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

/** True when any ~`size`-char window of `text` (whitespace collapsed) satisfies every pattern. */
function windowHas(text: string, patterns: RegExp[], size = 500): boolean {
  const flat = text.replace(/\s+/g, ' ');
  const step = Math.floor(size / 2);
  for (let i = 0; i < Math.max(flat.length, 1); i += step) {
    const w = flat.slice(i, i + size);
    if (patterns.every((p) => p.test(w))) return true;
  }
  return false;
}

/** Cells of a Markdown table row, outer pipes removed. Table cells in these files never contain a literal `|`. */
const cells = (row: string): string[] =>
  row
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((c) => c.trim());

const section4 = (): string => sectionUnder(configRef(), /^##\s+4\.\s+Hooks\s*$/);
const section43 = (): string => sectionUnder(configRef(), /^###\s+4\.3\s/);
const section622 = (): string => sectionUnder(lab(), /^###\s+6\.2\.2\s/);
/** Part 2 of §6.2.2: the shell-free `exec` + `args` entry and the optional registration of the guard. */
const part2 = (): string => sectionUnder(section622(), /^####\s+2\.\s/);
/** The file part 2 tells the learner to create for the optional guard registration. */
const registrationPath = (): string | undefined =>
  part2().match(/[Cc]reate `((?:\.github\/hooks|~\/\.copilot\/hooks)\/[\w.-]+\.json)`/)?.[1];
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** The numbered catalogue row for `event`: `| <n> | `event` | …`. */
const catalogueRow = (event: string): string | undefined =>
  section43()
    .split('\n')
    .find((l) => new RegExp(`^\\|\\s*\\d+\\s*\\|\\s*\`${event}\`\\s*\\|`).test(l));

/** The surface-matrix row for `event`: `| `event` | source | Copilot CLI | cloud agent | VS Code |` (five cells). */
const surfaceRow = (event: string): string | undefined =>
  section43()
    .split('\n')
    .find((l) => new RegExp(`^\\|\\s*\`${event}\`\\s*\\|`).test(l) && cells(l).length === 5);

describe('lab06 contract: the spec exists and governs', () => {
  it('specs/labs/lab06.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab06 contract: AC4 — the hooks reference link is live', () => {
  // Verified 2026-10-15: the old path returns a hard 404; the reference moved to
  // /en/copilot/reference/hooks-reference. It is the lab's only external link.
  it('drops the dead using-github-copilot/using-hooks URL', () => {
    expect(
      lab(),
      'labs/lab06.md cites https://docs.github.com/en/copilot/using-github-copilot/using-hooks, which returns 404',
    ).not.toMatch(/using-github-copilot\/using-hooks/);
  });

  it('cites the current hooks reference', () => {
    expect(
      lab(),
      'lab06 should cite docs.github.com/en/copilot/reference/hooks-reference',
    ).toMatch(/reference\/hooks-reference/);
  });
});

describe('lab06 contract: AC5 — exit-code semantics are stated correctly', () => {
  // The reference states command preToolUse hooks are FAIL-CLOSED: a non-zero exit
  // (including exit 2) denies the call even if stdout says allow. The lab currently
  // teaches the opposite, which is wrong in the unsafe direction.
  it('does not claim a non-zero exit is universally ignored', () => {
    expect(
      prose(),
      'lab06 claims non-zero hook exits are "silently ignored" — command preToolUse hooks are fail-closed',
    ).not.toMatch(/silently ignored/i);
  });

  it('states that command preToolUse hooks are fail-closed on a non-zero exit', () => {
    expect(
      prose(),
      'lab06 should teach that a non-zero exit from a command preToolUse hook denies the tool call',
    ).toMatch(/fail-closed|fail closed/i);
  });
});

describe('lab06 contract: AC6 — the event table is not presented as complete', () => {
  it('marks the lifecycle event list non-exhaustive and points at the catalogue', () => {
    expect(
      prose(),
      'lab06 lists five of fourteen documented events as if complete, and contradicts its own §6.2.1 ' +
        'which names three more. Mark the table non-exhaustive rather than enumerating all fourteen.',
    ).toMatch(/non-exhaustive|not exhaustive|not the complete|full (?:event )?(?:catalogue|catalog|list)/i);
  });
});

describe('lab06 contract: AC7 — hook discovery is more than .github/hooks', () => {
  it('names the user-level hooks directory', () => {
    expect(
      prose(),
      'lab06 presents .github/hooks/default.json as the hook configuration; the runtime also loads ~/.copilot/hooks/',
    ).toMatch(/~\/\.copilot\/hooks|\.copilot[\\/]hooks|COPILOT_HOME/);
  });

  it('names policy-level hooks', () => {
    expect(
      prose(),
      'lab06 should mention policy hooks, which load before all others and cannot be disabled',
    ).toMatch(/policy hook|policy-level hook/i);
  });
});

describe('lab06 contract: AC8 — no hardcoded CLI version in prose', () => {
  // §6.0's own currency callout says labs reference the registry rather than
  // hardcoding values. §6.2.1's heading does the opposite on the same page.
  it('does not pin a Copilot CLI version inline', () => {
    const hits = lab().match(/\b1\.0\.\d{2,}\b/g) ?? [];
    expect(
      hits,
      `lab06 hardcodes CLI version(s) ${hits.join(', ')} while §6.0 tells the reader labs reference ` +
        `docs/_meta/registry.yaml (copilot_cli_version_floor) instead. The lab contradicts itself.`,
    ).toEqual([]);
  });
});

describe('lab06 contract: AC9 — the repo-hooks table matches the repo', () => {
  it('every hook the lab presents as shipped is registered in .github/hooks/default.json', () => {
    const registered = readFileSync(HOOK_CONFIG, 'utf8');

    // Rows of the §6.5 "Hooks in this repository" table. `dotnet-build` is excluded:
    // the learner creates and registers it during the lab.
    const tableStart = lab().indexOf('Hooks in this repository');
    expect(tableStart, 'lab06 is missing its "Hooks in this repository" table').toBeGreaterThan(-1);
    const table = lab().slice(tableStart, tableStart + 1200);

    const claimed = [...table.matchAll(/^\|\s*([a-z0-9-]+)\s*\|/gim)]
      .map((m) => m[1])
      .filter((n) => !['hook', 'dotnet-build'].includes(n));

    expect(claimed.length, 'no hook rows parsed out of the §6.5 table').toBeGreaterThan(0);

    const missing = claimed.filter((name) => !registered.includes(name));
    expect(
      missing,
      `lab06 presents hook(s) as shipped in this repository that .github/hooks/default.json does not ` +
        `register: ${missing.join(', ')}. Correct the lab's table — do not register the script, which ` +
        `would change this repo's live hook behaviour.`,
    ).toEqual([]);
  });
});

describe('lab06 contract: AC10 — declared pacing is internally consistent', () => {
  it('frontmatter, the inline callout and the registry state the same minutes', () => {
    const fm = matter(lab()).data as { pace?: { presenter_minutes?: number; self_paced_minutes?: number } };
    const callout = lab().match(/Presenter pace:\s*(\d+)\s*minutes?\s*\|\s*Self-paced:\s*(\d+)/);
    expect(callout, 'lab06 is missing its inline "⏱️ Presenter pace: …" callout').not.toBeNull();

    const reg = yaml.load(readFileSync(REGISTRY, 'utf8')) as {
      labs?: Record<string, { pace_presenter_minutes?: number; pace_self_minutes?: number }>;
    };
    const row = reg.labs?.lab06;

    expect(
      [Number(callout![1]), row?.pace_presenter_minutes],
      'presenter minutes disagree across frontmatter / inline callout / registry',
    ).toEqual([fm.pace?.presenter_minutes, fm.pace?.presenter_minutes]);

    expect(
      [Number(callout![2]), row?.pace_self_minutes],
      'self-paced minutes disagree across frontmatter / inline callout / registry',
    ).toEqual([fm.pace?.self_paced_minutes, fm.pace?.self_paced_minutes]);
  });
});

describe('lab06 contract: AC11 — the stdin-JSON teaching survives', () => {
  // This is the lab's single teaching idea. The correction pass must not lose it
  // while fixing the claims around it.
  it('still states the event payload arrives as JSON on stdin', () => {
    expect(lab()).toMatch(/JSON (?:object )?on stdin|on stdin/i);
  });

  it('still warns that TOOL_NAME and FILE_PATH are not exported', () => {
    expect(lab()).toMatch(/TOOL_NAME/);
    expect(lab()).toMatch(/NOT SET|never set|never exported|not exported/i);
  });

  it('still names the two environment variables the runtime does set', () => {
    expect(lab()).toMatch(/COPILOT_PROJECT_DIR/);
    expect(lab()).toMatch(/CLAUDE_PROJECT_DIR/);
  });
});

describe('lab06 contract: AC12 — §6.1 stays a concise beginner table; a collapsible deep dive names all 15 events', () => {
  const s61 = (): string => sectionUnder(lab(), /^##\s+6\.1\s/);
  const introTable = (): string => s61().split('<details>')[0];
  const deepDive = (): string =>
    lab().match(
      /<details>\s*<summary>[^<]*All 15 Hook Lifecycle Interrupts[^<]*<\/summary>([\s\S]*?)<\/details>/,
    )?.[1] ?? '';

  it('keeps the §6.1 beginner intro table marked non-exhaustive, ahead of the deep dive', () => {
    expect(
      introTable(),
      '§6.1 must still say its intro table is non-exhaustive (AC6) now that a 15-event deep dive exists',
    ).toMatch(/non-exhaustive/i);
  });

  it('keeps the §6.1 beginner intro table concise: at most six event rows', () => {
    const rows = introTable()
      .split('\n')
      .filter((l) => /^\|\s*`[a-z][A-Za-z]+`\s*\|/.test(l));
    expect(rows.length, 'no event rows parsed out of the §6.1 intro table').toBeGreaterThan(0);
    expect(
      rows.length,
      '§6.1 is a 3-minute beginner fly-by; the full event list belongs in the deep dive and the config reference',
    ).toBeLessThanOrEqual(6);
  });

  it('has a collapsible "Deep Dive: All 15 Hook Lifecycle Interrupts & Surface Matrix" inside §6.1', () => {
    expect(s61()).toMatch(
      /<summary>\s*Deep Dive: All 15 Hook Lifecycle Interrupts & Surface Matrix\s*<\/summary>/,
    );
  });

  it.each(ALL_EVENTS)('names %s in the deep dive', (event) => {
    expect(deepDive(), `the deep dive does not name ${event}`).toContain(`\`${event}\``);
  });

  it.each(['Session interrupts', 'Turn and prompt interrupts', 'Subagent interrupts', 'Tool-execution interrupts'])(
    'groups the deep dive under a "%s" heading',
    (label) => {
      expect(deepDive()).toContain(`**${label}**`);
    },
  );

  it('attributes preMcpToolCall to the Copilot CLI built-in docs, not the hooks reference table', () => {
    expect(
      windowHas(deepDive(), [/preMcpToolCall/, /built-in documentation/i, /not in the GitHub hooks reference/i], 700),
      '14 events come from the GitHub hooks reference; the 15th (preMcpToolCall) must be attributed to the CLI build docs',
    ).toBe(true);
  });

  it('links the deep dive to the exhaustive catalogue in the config reference', () => {
    expect(s61()).toMatch(/copilot-config-reference\.md#43-event-catalogue/);
  });
});

describe('lab06 contract: AC13 — docs/copilot-config-reference.md §4.3 is the exhaustive 15-event catalogue', () => {
  it('is headed "4.3 Event catalogue", the anchor lab06 links to', () => {
    expect(configRef()).toMatch(/^###\s+4\.3\s+Event catalogue\s*$/m);
  });

  it('numbers exactly the 15 events, no more and no fewer', () => {
    const listed = section43()
      .split('\n')
      .map((l) => l.match(/^\|\s*\d+\s*\|\s*`([A-Za-z]+)`\s*\|/)?.[1])
      .filter((e): e is string => Boolean(e));
    expect([...listed].sort()).toEqual([...ALL_EVENTS].sort());
  });

  it.each(ALL_EVENTS)('has a surface-matrix row for %s', (event) => {
    expect(surfaceRow(event), `no surface-matrix row for ${event}`).toBeDefined();
  });

  it.each(DOCUMENTED_ALIASES)('lists the documented PascalCase alias for %s as %s', (event, alias) => {
    const row = catalogueRow(event);
    expect(row, `no catalogue row for ${event}`).toBeDefined();
    expect(cells(row!)[2]).toBe(`\`${alias}\``);
  });

  it.each(NO_ALIAS_EVENTS)('claims no PascalCase alias for %s', (event) => {
    const row = catalogueRow(event);
    expect(row, `no catalogue row for ${event}`).toBeDefined();
    expect(
      cells(row!)[2],
      `${event} has no documented PascalCase alias; write free text such as "none documented", never a backticked alias`,
    ).not.toMatch(/`/);
  });

  it.each(REFERENCE_EVENTS)('attributes %s to the GitHub hooks reference', (event) => {
    const row = surfaceRow(event);
    expect(row, `no surface-matrix row for ${event}`).toBeDefined();
    expect(cells(row!)[1]).toMatch(/hooks-reference/);
  });

  it('attributes preMcpToolCall to the Copilot CLI build docs and not to the hooks reference', () => {
    const row = surfaceRow(CLI_BUILD_EVENT);
    expect(row, `no surface-matrix row for ${CLI_BUILD_EVENT}`).toBeDefined();
    expect(cells(row!)[1]).toMatch(/setting:hooks\.preMcpToolCall/);
    expect(cells(row!)[1], 'preMcpToolCall is not in the hooks reference event table').not.toMatch(/hooks-reference/);
  });

  it('records all four errorContext values and the CLI model-call wording for errorOccurred', () => {
    const row = catalogueRow('errorOccurred');
    expect(row, 'no catalogue row for errorOccurred').toBeDefined();
    for (const value of ['model_call', 'tool_execution', 'system', 'user_input']) {
      expect(row!, `errorOccurred row is missing errorContext "${value}"`).toContain(value);
    }
    expect(row!).toMatch(/model call/i);
  });

  it('records that userPromptSubmitted fires at most once per cloud agent job', () => {
    const row = surfaceRow('userPromptSubmitted');
    expect(row, 'no surface-matrix row for userPromptSubmitted').toBeDefined();
    expect(cells(row!)[3]).toMatch(/at most once/i);
  });

  it.each(['permissionRequest', 'notification'])('says %s does not fire in the cloud agent', (event) => {
    const row = surfaceRow(event);
    expect(row, `no surface-matrix row for ${event}`).toBeDefined();
    expect(cells(row!)[3]).toMatch(/does not fire|does not apply|no effect/i);
  });

  it.each(['permissionRequest', 'notification'])('asserts no unverified VS Code exclusion for %s', (event) => {
    const row = surfaceRow(event);
    expect(row, `no surface-matrix row for ${event}`).toBeDefined();
    expect(
      cells(row!)[4],
      'the reference documents CLI vs cloud agent only; it does not exclude the VS Code Copilot harness',
    ).not.toMatch(/not supported|unsupported|never fires|does not fire|excluded|CLI only/i);
  });

  it('documents stop_hook_active on the agentStop row only', () => {
    const stop = catalogueRow('agentStop');
    const subagentStop = catalogueRow('subagentStop');
    expect(stop, 'no catalogue row for agentStop').toBeDefined();
    expect(subagentStop, 'no catalogue row for subagentStop').toBeDefined();
    expect(stop!).toMatch(/stop_hook_active/);
    expect(
      subagentStop!,
      'stop_hook_active is documented on the agentStop payload, not on the shared-runtime subagentStop payload',
    ).not.toMatch(/stop_hook_active/);
  });

  it.each(['agentStop', 'subagentStop'])('records decision block with a reason for %s', (event) => {
    const row = catalogueRow(event);
    expect(row, `no catalogue row for ${event}`).toBeDefined();
    expect(windowHas(row!, [/decision/, /block/, /reason/], 600)).toBe(true);
  });

  it('documents the 8-consecutive-block runaway guard for the stop events', () => {
    expect(
      windowHas(section4(), [/agentStop/, /subagentStop/, /(?:8|eight) consecutive/i, /runaway/i], 900),
    ).toBe(true);
  });

  it('documents the additionalContext caps: 10 KB for postToolUse, 10 MiB for sessionStart and subagentStart', () => {
    expect(windowHas(section4(), [/postToolUse/, /10 KB/], 400)).toBe(true);
    expect(windowHas(section4(), [/sessionStart/, /subagentStart/, /10 MiB/], 700)).toBe(true);
  });

  it.each(['UserPromptTransformed', 'PreMcpToolCall', 'SubagentStart'])(
    'never invents the PascalCase alias %s',
    (alias) => {
      const pattern = new RegExp(`\\b${alias}\\b`);
      expect(configRef()).not.toMatch(pattern);
      expect(lab()).not.toMatch(pattern);
    },
  );

  it('uses the capitalised word Notification only as the hook_event_name payload value', () => {
    for (const text of [configRef(), lab()].map(lf)) {
      const stray = [...text.matchAll(/\bNotification\b/g)].filter(
        (m) => !/hook_event_name\W{0,4}$/.test(text.slice(Math.max(0, (m.index ?? 0) - 40), m.index)),
      );
      expect(stray.length, 'Notification is a payload value, not a PascalCase config alias').toBe(0);
    }
  });
});

describe('lab06 contract: AC14 — §6.2.2 teaches polyglot hooks, shell-free exec, http webhooks and prompt hooks', () => {
  it('sits between §6.2.1 and §6.3', () => {
    const body = lf(lab());
    const at = (re: RegExp): number => body.search(re);
    expect(at(/^###\s+6\.2\.1\s/m)).toBeGreaterThan(-1);
    expect(at(/^###\s+6\.2\.2\s/m), '§6.2.2 is missing or comes before §6.2.1').toBeGreaterThan(
      at(/^###\s+6\.2\.1\s/m),
    );
    expect(at(/^##\s+6\.3\s/m), '§6.3 must follow §6.2.2').toBeGreaterThan(at(/^###\s+6\.2\.2\s/m));
  });

  it.each([
    ['a Node.js example that reads stdin without jq', /```(?:js|javascript|mjs)\s[\s\S]*?readFileSync\(0/],
    ['a Python example that reads stdin', /```python\s[\s\S]*?json\.load\(sys\.stdin\)/],
    ['a Bash example that uses jq', /```bash\s[\s\S]*?\bjq\b/],
    ['a PowerShell example that parses stdin', /```powershell\s[\s\S]*?ConvertFrom-Json/],
  ])('shows %s', (_label, pattern) => {
    expect(section622()).toMatch(pattern);
  });

  it('names node and python3 as interpreters', () => {
    expect(section622()).toMatch(/`node`/);
    expect(section622()).toMatch(/python3/);
  });

  it('shows a shell-free exec + args registration for a Node script', () => {
    expect(section622()).toMatch(/"exec":\s*"node"[\s\S]{0,120}"args":\s*\[/);
  });

  it('states that args are not the event: the event still arrives on stdin', () => {
    expect(section622()).toMatch(/still arrives on stdin/i);
  });

  it('says exec + args work in Copilot CLI and the VS Code Copilot harness, and that the cloud agent needs bash or command', () => {
    expect(
      windowHas(section622(), [/\bexec\b/, /VS Code/, /Copilot CLI/, /cloud agent/i, /\bcommand\b/], 700),
    ).toBe(true);
  });

  it.each(['"type": "http"', '"url"', '"headers"', '"allowedEnvVars"'])('shows an http hook using %s', (token) => {
    expect(section622()).toContain(token);
  });

  it.each(['COPILOT_HOOK_ALLOW_LOCALHOST=1', 'COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1'])(
    'names the HTTP gating variable %s',
    (token) => {
      expect(section622()).toContain(token);
    },
  );

  it('shows a prompt hook that is limited to interactive sessionStart', () => {
    expect(section622()).toMatch(/"type":\s*"prompt"/);
    expect(windowHas(section622(), [/prompt hook/i, /sessionStart/, /interactive/i], 600)).toBe(true);
  });

  it.each([
    ['argument rewriting', /modifiedArgs/],
    ['result replacement', /modifiedResult/],
    ['context injection', /additionalContext/],
    ['forcing another turn', /"decision":\s*"block"/],
    ['subagent response redaction', /modifiedResponse/],
    ['live progress messages', /"type":\s*"progress"/],
    ['regex matchers', /"matcher":/],
    ['agent-scoped hooks', /\.agent\.md[\s\S]{0,300}hooks:|hooks:[\s\S]{0,300}\.agent\.md/],
  ])('summarises the advanced capability: %s', (_label, pattern) => {
    expect(section622()).toMatch(pattern);
  });
});

describe('lab06 contract: AC15 — surface and failure semantics are attributed precisely', () => {
  // Adjudicated 2026-11-12 against docs.github.com/en/copilot/reference/hooks-reference,
  // code.visualstudio.com/docs/agent-customization/hooks and the Copilot CLI built-in docs.
  const teachingLines = (): string[] => [...lf(lab()).split('\n'), ...lf(section4()).split('\n')];

  it('does not call shell-free exec + args Copilot-CLI-only', () => {
    const execLines = teachingLines().filter((l) => /\bexec\b/.test(l));
    expect(execLines.length, 'neither lab06 nor config reference §4 mentions exec, so this guard would pass vacuously').toBeGreaterThan(0);
    const offending = execLines.filter((l) =>
      /(?:Copilot )?CLI[- ]only|only (?:supported )?(?:in|by) (?:the )?Copilot CLI/i.test(l),
    );
    expect(
      offending,
      'exec + args are documented for the VS Code Copilot harness as well as Copilot CLI; the cloud agent is the exception',
    ).toEqual([]);
  });

  it('does not call an http hook the only way to keep cloud agent logs', () => {
    const httpLines = teachingLines().filter((l) => /\bhttp\b/i.test(l));
    expect(httpLines.length, 'no line mentions http, so this guard would pass vacuously').toBeGreaterThan(0);
    const offending = httpLines.filter((l) => /\bonly way\b/i.test(l));
    expect(offending, 'a command hook could also make an outbound request; http is the recommended built-in type').toEqual([]);
  });

  it('calls the http hook the recommended built-in hook type once the destination host is admin-allowlisted', () => {
    expect(
      windowHas(section622(), [/recommended built-in hook type/i, /cloud agent/i, /allow-?list/i], 800),
    ).toBe(true);
  });

  it('contrasts a fail-closed command preToolUse with a fail-open HTTP preToolUse', () => {
    expect(windowHas(section622(), [/command/i, /fail-closed/i, /non-zero/i], 700)).toBe(true);
    expect(windowHas(section622(), [/HTTP/, /fail-open/i, /network error/i, /non-2xx/i], 700)).toBe(true);
  });

  it('says command preToolUse timeouts, and empty or unparseable stdout, fall through to the normal permission flow', () => {
    expect(
      windowHas(section4(), [/timeout/i, /empty or unparseable/i, /normal permission flow/i], 900),
    ).toBe(true);
  });
});

describe('lab06 contract: AC16 — the config reference documents all three hook types and the advanced outputs', () => {
  it.each([
    ['a shell-free exec entry', /"exec":\s*"[^"]+"/],
    ['the args array', /"args":\s*\[/],
    ['http hooks', /"type":\s*"http"/],
    ['the http url field', /"url":/],
    ['the http headers field', /"headers":/],
    ['allowedEnvVars', /allowedEnvVars/],
    ['prompt hooks', /"type":\s*"prompt"/],
    ['the loopback switch', /COPILOT_HOOK_ALLOW_LOCALHOST=1/],
    ['the plain-http auth-hook switch', /COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1/],
    ['argument rewriting', /modifiedArgs/],
    ['result replacement', /modifiedResult/],
    ['subagent response rewriting', /modifiedResponse/],
    ['live progress messages', /"type":\s*"progress"/],
    ['the matcher table', /notification_type/],
    ['agent-scoped hooks', /Agent-scoped hooks/i],
    ['the camelCase versus PascalCase payload choice', /snake_case/],
    ['the Claude tool-name mapping', /`Bash`[\s\S]{0,400}`Read`[\s\S]{0,400}`Edit`/],
  ])('documents %s in §4', (_label, pattern) => {
    expect(section4()).toMatch(pattern);
  });

  it('says exec + args work in the VS Code Copilot harness as well as Copilot CLI', () => {
    expect(windowHas(section4(), [/\bexec\b/, /VS Code/, /Copilot CLI/, /cloud agent/i], 700)).toBe(true);
  });
});

describe('lab06 contract: AC17 — the new material stays off the timed route and out of the live hook config', () => {
  it('the Timed route callout names §6.2.2 as untimed reference', () => {
    expect(
      prose(),
      'the timed route is unchanged; the Timed route callout must say §6.2.2 is optional and not timed',
    ).toMatch(/Timed route\b.{0,1200}6\.2\.2/);
  });

  it.each(['guard-env', 'guard_env', 'audit-receiver', 'audit-local'])(
    '.github/hooks/default.json does not register the §6.2.2 example %s',
    (name) => {
      expect(readFileSync(HOOK_CONFIG, 'utf8')).not.toContain(name);
    },
  );
});

/*
 * AC18 — the four guards in §6.2.2 are RUN, not just read.
 *
 * Round 1 shipped four `.env` guards whose prose claimed "every version reads the same event and prints the
 * same decision". Nobody had run them against anything but friendly input. Fed an `apply_patch` call (whose
 * toolArgs is the patch text, not JSON), every one of them threw while parsing, and a thrown error in a
 * command `preToolUse` hook is a DENY. The four also disagreed with each other on empty strings, arrays, case,
 * Windows separators and more. So this block extracts the guards from the lab text, writes them out under the
 * names the lab gives them, and feeds every runtime found on this machine one shared set of events.
 *
 * Runtimes that are absent are skipped, as elsewhere in this suite (CI installs jq and has the rest). Node.js
 * is always present because Vitest is running on it.
 */
type GuardOutcome = 'none' | 'deny' | 'crash';

interface GuardCase {
  name: string;
  /** Exactly what is piped to the guard on stdin. */
  stdin: string;
  outcome: GuardOutcome;
  /** For `deny`: the file name the decision must name, in the case it was written. */
  file?: string;
}

interface GuardRun {
  status: number | null;
  stdout: string;
  stderr: string;
}

const PATCH = (...lines: string[]): string => ['*** Begin Patch', ...lines, '*** End Patch'].join('\n');
const ADD_ENV_PATCH = PATCH('*** Add File: .env', '+X=1');

/** A `preToolUse` event as Copilot sends it. An `undefined` argument leaves that field out entirely. */
const toolEvent = (toolName: unknown, toolArgs?: unknown): string =>
  JSON.stringify({
    sessionId: 's',
    timestamp: 1,
    cwd: '/repo',
    ...(toolName === undefined ? {} : { toolName }),
    ...(toolArgs === undefined ? {} : { toolArgs }),
  });

/** The `preToolUse` form of a tool's arguments: a JSON-encoded string. */
const encoded = (value: unknown): string => JSON.stringify(value);

const deny = (name: string, stdin: string, file: string): GuardCase => ({ name, stdin, outcome: 'deny', file });
const noOpinion = (name: string, stdin: string): GuardCase => ({ name, stdin, outcome: 'none' });
const crashes = (name: string, stdin: string): GuardCase => ({ name, stdin, outcome: 'crash' });

const GUARD_CASES: GuardCase[] = [
  // What the guard has always done.
  deny('edit .env (arguments as a JSON-encoded string)', toolEvent('edit', encoded({ path: '.env' })), '.env'),
  deny('edit .env.local through file_path', toolEvent('edit', encoded({ file_path: '.env.local' })), '.env.local'),
  deny('edit a nested .env.production', toolEvent('edit', encoded({ path: 'src/.env.production' })), '.env.production'),
  noOpinion('edit .env.example is allowed', toolEvent('edit', encoded({ path: '.env.example' }))),
  noOpinion('edit an ordinary source file', toolEvent('edit', encoded({ path: 'src/Program.cs' }))),
  deny('create .env', toolEvent('create', encoded({ path: '.env' })), '.env'),
  deny('write config/.env through file_path', toolEvent('write', encoded({ file_path: 'config/.env' })), '.env'),
  deny('edit .env with the arguments already an object', toolEvent('edit', { path: '.env' }), '.env'),
  noOpinion('view .env is read-only', toolEvent('view', encoded({ path: '.env' }))),
  noOpinion('the bash tool is not inspected', toolEvent('bash', encoded({ command: 'echo X=1 > .env' }))),
  noOpinion('edit with no toolArgs at all', toolEvent('edit')),
  noOpinion('edit with an empty path', toolEvent('edit', encoded({ path: '' }))),
  noOpinion('edit with an empty object', toolEvent('edit', encoded({}))),
  deny('a name ending in a dot, .env., is a secrets file', toolEvent('edit', encoded({ path: '.env.' })), '.env.'),
  noOpinion('.envrc is not a secrets file', toolEvent('edit', encoded({ path: '.envrc' }))),
  deny('upper-case .ENV is still .env', toolEvent('edit', encoded({ path: '.ENV' })), '.ENV'),
  deny('mixed-case .Env.Local', toolEvent('edit', encoded({ path: 'a/.Env.Local' })), '.Env.Local'),
  noOpinion('upper-case .ENV.EXAMPLE is still the allowed example', toolEvent('edit', encoded({ path: '.ENV.EXAMPLE' }))),
  deny('Windows separators: C:\\repo\\.env', toolEvent('edit', encoded({ path: 'C:\\repo\\.env' })), '.env'),
  deny('Windows separators: config\\.env.local', toolEvent('edit', encoded({ path: 'config\\.env.local' })), '.env.local'),
  noOpinion('a path that ends in a slash has no file name', toolEvent('edit', encoded({ path: 'src/.env/' }))),
  deny('either key counts: file_path is ordinary, path is .env', toolEvent('edit', encoded({ file_path: 'src/a.cs', path: '.env' })), '.env'),
  deny('a non-string file_path is ignored and path still counts', toolEvent('edit', encoded({ file_path: 5, path: '.env' })), '.env'),
  noOpinion('a non-string file_path alone is no opinion', toolEvent('edit', encoded({ file_path: 5 }))),
  noOpinion('a null path is no opinion', toolEvent('edit', encoded({ path: null }))),
  noOpinion('an array path is no opinion', toolEvent('edit', encoded({ path: ['.env'] }))),
  noOpinion('an object path is no opinion', toolEvent('edit', encoded({ path: { a: 1 } }))),

  // Arguments that are not an object: no opinion, never a crash (a crash here is a DENY).
  noOpinion('toolArgs is the empty string', toolEvent('edit', '')),
  noOpinion('toolArgs is the text [1,2]', toolEvent('edit', '[1,2]')),
  noOpinion('toolArgs is a real JSON array', toolEvent('edit', [1, 2])),
  noOpinion('toolArgs is null', toolEvent('edit', null)),
  noOpinion('toolArgs is a number', toolEvent('edit', 5)),
  noOpinion('toolArgs is a boolean', toolEvent('edit', true)),
  noOpinion('toolArgs is the text 5', toolEvent('edit', '5')),
  noOpinion('toolArgs is the text null', toolEvent('edit', 'null')),
  noOpinion('toolArgs is the text true', toolEvent('edit', 'true')),
  noOpinion('toolArgs is plain text', toolEvent('edit', 'not json')),
  noOpinion('toolArgs is truncated JSON', toolEvent('edit', '{"path":')),
  noOpinion('toolArgs is a JSON-encoded string', toolEvent('edit', encoded('just a string'))),
  noOpinion('toolArgs is an array holding an object (a real array)', toolEvent('edit', [{ path: '.env' }])),
  noOpinion('toolArgs is an array holding an object (as text)', toolEvent('edit', encoded([{ path: '.env' }]))),

  // The tool name is checked before the arguments are touched.
  noOpinion('view with raw patch text as its arguments', toolEvent('view', ADD_ENV_PATCH)),
  noOpinion('bash with plain-text arguments', toolEvent('bash', 'not json')),
  noOpinion('grep with null arguments', toolEvent('grep', null)),
  noOpinion('no toolName at all', toolEvent(undefined, encoded({ path: '.env' }))),
  noOpinion('PascalCase Edit is not the camelCase tool name', toolEvent('Edit', encoded({ path: '.env' }))),
  noOpinion('upper-case EDIT is not the tool name either', toolEvent('EDIT', encoded({ path: '.env' }))),
  noOpinion('a non-string toolName', toolEvent(5, encoded({ path: '.env' }))),

  // apply_patch: the arguments are the patch text itself, raw or JSON-encoded.
  deny('apply_patch adds .env (raw patch text)', toolEvent('apply_patch', ADD_ENV_PATCH), '.env'),
  deny('apply_patch adds .env (JSON-encoded patch text)', toolEvent('apply_patch', encoded(ADD_ENV_PATCH)), '.env'),
  deny('apply_patch updates .env.local', toolEvent('apply_patch', PATCH('*** Update File: .env.local', '@@', '-A=1', '+A=2')), '.env.local'),
  deny('apply_patch moves a file onto .env', toolEvent('apply_patch', PATCH('*** Update File: src/a.cs', '*** Move to: .env')), '.env'),
  deny('apply_patch deletes .env', toolEvent('apply_patch', PATCH('*** Delete File: .env')), '.env'),
  noOpinion(
    'apply_patch touching only ordinary files',
    toolEvent('apply_patch', PATCH('*** Update File: src/Program.cs', '@@', '-a', '+b', '*** Add File: README.md', '+hi')),
  ),
  noOpinion(
    'apply_patch whose content merely mentions .env',
    toolEvent('apply_patch', PATCH('*** Update File: README.md', '@@', '-x', '+copy .env.example to .env')),
  ),
  noOpinion(
    'apply_patch content that looks like a header is prefixed with + and is not one',
    toolEvent('apply_patch', PATCH('*** Update File: README.md', '@@', '+*** Add File: .env')),
  ),
  noOpinion('apply_patch .env.example only', toolEvent('apply_patch', PATCH('*** Add File: .env.example', '+X='))),
  deny(
    'apply_patch with .env as the second file',
    toolEvent('apply_patch', PATCH('*** Update File: src/a.cs', '@@', '-a', '+b', '*** Add File: .env', '+X=1')),
    '.env',
  ),
  deny('apply_patch with CRLF line endings', toolEvent('apply_patch', ADD_ENV_PATCH.replace(/\n/g, '\r\n')), '.env'),
  deny('apply_patch with trailing spaces after the path', toolEvent('apply_patch', PATCH('*** Add File: .env   ', '+X=1')), '.env'),
  deny('apply_patch with a Windows path', toolEvent('apply_patch', PATCH('*** Add File: C:\\repo\\.env', '+X=1')), '.env'),
  noOpinion('apply_patch header keywords are case-sensitive', toolEvent('apply_patch', PATCH('*** add file: .env', '+X=1'))),
  noOpinion('apply_patch with an empty string', toolEvent('apply_patch', '')),
  noOpinion('apply_patch with null', toolEvent('apply_patch', null)),
  noOpinion('apply_patch with an array', toolEvent('apply_patch', [1])),
  noOpinion('apply_patch with a number', toolEvent('apply_patch', 5)),
  noOpinion('apply_patch with text that is not a patch', toolEvent('apply_patch', 'hello')),
  deny('apply_patch with object arguments naming .env', toolEvent('apply_patch', { path: '.env' }), '.env'),

  // Input that is not JSON at all is an error in the event itself: fail loudly (fail-closed under preToolUse).
  crashes('stdin is not JSON', 'not json'),
  crashes('stdin is truncated JSON', '{"toolName":"edit"'),

  // Valid JSON that is not an event object: there is nothing to decide, so no opinion.
  noOpinion('the event is JSON null', 'null'),
  noOpinion('the event is an empty JSON array', '[]'),
  noOpinion('the event is a JSON array of numbers', '[1,2]'),
  noOpinion('the event is a JSON number', '5'),
  noOpinion('the event is a JSON string', '"edit"'),
  noOpinion('the event is JSON true', 'true'),
];

const IS_WINDOWS = process.platform === 'win32';

/** Stdout and stderr when `command` exits 0, otherwise null (including when it cannot be started). */
const probe = (command: string, args: string[]): string | null => {
  const r = spawnSync(command, args, { encoding: 'utf8', timeout: 20_000 });
  return r.error || r.status !== 0 ? null : `${r.stdout}${r.stderr}`;
};

const pythonCommand = (): string | null =>
  ['python3', 'python'].find((c) => /^Python 3\./.test(probe(c, ['--version']) ?? '')) ?? null;

const pwshCommand = (): string | null =>
  Number(probe('pwsh', ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.Major'])?.trim()) >= 7 ? 'pwsh' : null;

/**
 * A bash that can see `jq`. On Windows that is Git Bash only: WSL's bash.exe receives `C:\a\b` and resolves it as
 * the relative path `C:ab` (see tests/helpers/platform.ts; this file keeps its helpers inline on purpose).
 */
const bashWithJqCommand = (): string | null => {
  const candidates = IS_WINDOWS
    ? ['C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe'].filter((p) => existsSync(p))
    : ['bash'];
  return candidates.find((c) => probe(c, ['-c', 'command -v jq']) !== null) ?? null;
};

const GUARDS: Array<{ label: string; file: string; command: string | null; args: (script: string) => string[] }> = [
  { label: 'Node.js', file: 'guard-env.mjs', command: process.execPath, args: (s) => [s] },
  { label: 'Python', file: 'guard_env.py', command: pythonCommand(), args: (s) => [s] },
  { label: 'Bash', file: 'guard-env.sh', command: bashWithJqCommand(), args: (s) => [s] },
  { label: 'PowerShell', file: 'guard-env.ps1', command: pwshCommand(), args: (s) => ['-NoProfile', '-NonInteractive', '-File', s] },
];

/** The code block in §6.2.2 whose first comment names `scripts/hooks/<file>`, with LF endings. */
const guardSource = (file: string): string | undefined => {
  const comment = file.endsWith('.mjs') ? '//' : '#';
  const block = new RegExp(
    '```[a-z]+\\n((?:#!/usr/bin/env bash\\n)?' + escapeRe(`${comment} scripts/hooks/${file}`) + '[^\\n]*\\n[\\s\\S]*?)```',
  );
  return section622().match(block)?.[1];
};

/** The `echo '{…}' | node scripts/hooks/guard-env.mjs` example events the lab has the learner pipe in. */
const documentedEvents = (): string[] =>
  [...section622().matchAll(/echo '(\{[^\n]*\})' \| node scripts\/hooks\/guard-env\.mjs/g)].map((m) => m[1]);

/** The one line the lab says the learner should see for those events. */
const documentedLine = (): string | undefined => section622().match(/You should see one line: `(\{[^`]+\})`/)?.[1];

const runGuard = (command: string, args: string[], input: string): Promise<GuardRun> =>
  new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), 60_000);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.stdin.on('error', () => {}); // a guard may exit before it has read all of stdin
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ status: null, stdout, stderr: String(e) });
    });
    child.on('close', (status) => {
      clearTimeout(timer);
      resolve({ status, stdout, stderr });
    });
    child.stdin.end(input);
  });

async function inPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** What a guard run amounts to: crashed (non-zero exit), no opinion (nothing printed), or a deny decision. */
function decision(r: GuardRun): { outcome: GuardOutcome | 'unexpected'; reason?: string } {
  if (r.status !== 0) return { outcome: 'crash' };
  const out = r.stdout.trim();
  if (out === '') return { outcome: 'none' };
  try {
    const json = JSON.parse(out) as { permissionDecision?: unknown; permissionDecisionReason?: unknown };
    if (json.permissionDecision === 'deny' && typeof json.permissionDecisionReason === 'string') {
      return { outcome: 'deny', reason: json.permissionDecisionReason };
    }
  } catch {
    /* not JSON: reported as unexpected below */
  }
  return { outcome: 'unexpected', reason: out.slice(0, 120) };
}

/** A description of how `r` departs from what `c` requires, or undefined when it does what the case says. */
function misjudged(c: GuardCase, r: GuardRun | undefined): string | undefined {
  if (r === undefined) return 'was never run';
  const got = decision(r);
  if (got.outcome !== c.outcome) {
    const detail = r.status !== 0 ? `exit ${r.status}: ${r.stderr.trim().split('\n')[0]}` : (got.reason ?? '');
    return `expected ${c.outcome}, got ${got.outcome} (${detail})`;
  }
  if (c.outcome === 'deny') {
    const want = `Do not edit ${c.file}: secrets stay out of tool calls.`;
    if (got.reason !== want) return `expected the reason "${want}", got "${got.reason}"`;
  }
  return undefined;
}

describe('lab06 contract: AC18 — the four §6.2.2 guards run, and they give the same answer on the same event', () => {
  const available = GUARDS.filter((g) => g.command !== null);
  const results = new Map<string, GuardRun[]>();
  let dir = '';

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'lab06-guards-'));
    for (const g of GUARDS) {
      const source = guardSource(g.file);
      if (source !== undefined) writeFileSync(join(dir, g.file), source);
    }
    // One pool across every (runtime, event) pair, so a slow starter such as PowerShell overlaps the fast ones.
    const jobs = available.flatMap((g) => GUARD_CASES.map((c, index) => ({ g, c, index })));
    const runs = await inPool(jobs, 6, ({ g, c }) => runGuard(g.command!, g.args(join(dir, g.file)), c.stdin));
    jobs.forEach(({ g, index }, k) => {
      const list = results.get(g.label) ?? [];
      list[index] = runs[k];
      results.set(g.label, list);
    });
  }, 600_000);

  afterAll(() => {
    if (dir !== '') rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it.each(GUARDS.map((g) => g.file))('the lab ships %s as a complete script, named by its first-line comment', (file) => {
    expect(guardSource(file), `no code block in §6.2.2 starts with the comment naming scripts/hooks/${file}`).toBeDefined();
  });

  for (const g of GUARDS) {
    it.skipIf(g.command === null)(`the ${g.label} guard follows the shared rules on all ${GUARD_CASES.length} events`, () => {
      const runs = results.get(g.label) ?? [];
      const wrong = GUARD_CASES.flatMap((c, i) => {
        const problem = misjudged(c, runs[i]);
        return problem === undefined ? [] : [`${c.name}: ${problem}`];
      });
      expect(
        wrong,
        `the ${g.label} guard departs from the contract on ${wrong.length} event(s). A crash on a legitimate event ` +
          'is a deny under a command preToolUse hook, so it locks the learner out of that tool.',
      ).toEqual([]);
    });
  }

  it('every runtime found on this machine gives the same decision on every event', () => {
    const split = GUARD_CASES.flatMap((c, i) => {
      const seen = new Set(available.map((g) => JSON.stringify(decision(results.get(g.label)![i]))));
      return seen.size > 1 ? [c.name] : [];
    });
    expect(split, `the guards (${available.map((g) => g.label).join(', ')}) disagree on these events`).toEqual([]);
  });

  for (const g of GUARDS) {
    it.skipIf(g.command === null)(
      `the ${g.label} guard prints exactly the line the lab promises for each example event it pipes in`,
      async () => {
        const line = documentedLine();
        const events = documentedEvents();
        expect(line, 'the lab no longer says "You should see one line: `{…}`"').toBeDefined();
        expect(events.length, "no `echo '{…}' | node scripts/hooks/guard-env.mjs` example found in §6.2.2").toBeGreaterThan(0);
        for (const event of events) {
          const r = await runGuard(g.command!, g.args(join(dir, g.file)), event);
          expect({ status: r.status, stdout: r.stdout.trim() }, `example event: ${event}`).toEqual({ status: 0, stdout: line });
        }
      },
      60_000,
    );
  }

  it('§6.2.2 states the three rules every guard follows: tool name first, odd arguments are no opinion, non-JSON input fails', () => {
    expect(windowHas(section622(), [/tool name first/i, /no opinion/i, /never a crash/i], 1500)).toBe(true);
    expect(windowHas(section622(), [/not JSON at all/i, /non-zero/i], 500)).toBe(true);
  });

  it('§6.2.2 explains that toolArgs is not always a JSON object, with apply_patch as the plain-text case', () => {
    expect(windowHas(section622(), [/toolArgs/, /apply_patch/, /plain text/i, /not JSON/i], 900)).toBe(true);
  });

  it('the config reference warns in §4.9 that toolArgs is not always JSON and says to check the tool name first', () => {
    const s49 = sectionUnder(configRef(), /^###\s+4\.9\s/);
    expect(windowHas(s49, [/toolArgs/, /unknown/, /apply_patch/, /plain text/i, /tool name/i], 900)).toBe(true);
  });
});

describe('lab06 contract: AC19 — the optional guard registration lives in a named scratch file, and Clean up removes it before the script', () => {
  const cleanUp = (): string => {
    const s = section622();
    const at = s.indexOf('**Clean up.**');
    return at === -1 ? '' : s.slice(at);
  };
  const fences = (md: string, lang: string): string[] =>
    [...md.matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);

  it('tells the learner which file to create for the registration', () => {
    expect(
      registrationPath(),
      'part 2 must say "Create `<path>`" for the registration; an unnamed "hooks file" is how it ended up in default.json',
    ).toBeDefined();
  });

  it('puts the registration in its own project-level file, never default.json', () => {
    expect(
      registrationPath(),
      'the guard path is relative to this repository, so the registration must live in .github/hooks/ (a user-level ' +
        'hook runs in every repository and denies edits wherever the script is missing) and must not be default.json',
    ).toMatch(/^\.github\/hooks\/(?!default\.json$)[\w.-]+\.json$/);
  });

  it('says in so many words that the registration does not go in default.json', () => {
    expect(windowHas(part2(), [/never|do not|don't|not in/i, /`\.github\/hooks\/default\.json`/], 300)).toBe(true);
  });

  it('mentions default.json in §6.2.2 only to say it stays untouched', () => {
    const sentences = section622()
      .replace(/\s+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter((s) => /default\.json/.test(s));
    expect(sentences.length, 'no sentence in §6.2.2 mentions default.json, so this guard would pass vacuously').toBeGreaterThan(0);
    expect(sentences.filter((s) => !/\b(?:never|not|untouched|outside|nothing)\b/i.test(s))).toEqual([]);
  });

  it('gives a complete, valid hooks file that launches the guard script without a shell', () => {
    const files = fences(part2(), 'json').flatMap((b) => {
      try {
        const parsed: unknown = JSON.parse(b);
        return typeof parsed === 'object' && parsed !== null && 'hooks' in parsed ? [parsed] : [];
      } catch {
        return [];
      }
    }) as Array<{ version?: number; hooks?: { preToolUse?: Array<Record<string, unknown>> } }>;
    expect(files.length, 'part 2 has no complete hooks file (a JSON object with "version" and "hooks") to copy').toBeGreaterThan(0);
    expect(files[0].version).toBe(1);
    expect(files[0].hooks?.preToolUse?.[0]).toMatchObject({ type: 'command', exec: 'node', args: ['scripts/hooks/guard-env.mjs'] });
  });

  it('explains that a registration that outlives its script denies calls, because command preToolUse is fail-closed', () => {
    expect(windowHas(part2(), [/fail-closed/i, /missing|deleted|outlive/i, /denied|denies/i], 800)).toBe(true);
  });

  it('Clean up deletes the registration files before the scripts, and every script the section saves, in both shells', () => {
    const base = registrationPath()?.split('/').pop() ?? '(no registration file named)';
    const blocks = [...fences(cleanUp(), 'bash'), ...fences(cleanUp(), 'powershell')];
    expect(blocks.length, 'Clean up needs one bash block and one PowerShell block').toBe(2);
    for (const block of blocks) {
      for (const saved of [base, 'audit-local.json', 'guard-env.mjs', 'guard_env.py', 'guard-env.sh', 'guard-env.ps1', 'audit-receiver.mjs']) {
        expect(block, `Clean up never deletes ${saved}`).toContain(saved);
      }
      expect(
        block.indexOf(base),
        `Clean up must delete ${base} before guard-env.mjs: a registration whose script is gone denies every call it matches`,
      ).toBeLessThan(block.indexOf('guard-env.mjs'));
    }
  });

  it('Clean up says to delete the registration first', () => {
    expect(windowHas(cleanUp(), [/registration/i, /first|before/i], 500)).toBe(true);
  });

  it('the repository ships no copy of the scratch registration or of any other §6.2.2 scratch file', () => {
    const shipped = readdirSync(join(ROOT, '.github/hooks')).filter((f) => /guard-env|guard_env|audit-local|audit-receiver/.test(f));
    expect(
      shipped,
      'committed without its script, the registration would deny every edit for everyone who clones the repository',
    ).toEqual([]);
  });
});

describe('lab06 contract: Phase 3 executable listings', () => {
  const fences = (md: string, lang: string): string[] =>
    [...lf(md).matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);

  it('the complete JSON hook examples parse and obey the command, HTTP and prompt field contracts', () => {
    for (const md of [section4(), section622()]) {
      const files = fences(md, 'json').map((b) => JSON.parse(b)).filter((v) => v.hooks);
      expect(files.length, 'no complete hooks files found').toBeGreaterThan(0);
      for (const file of files) {
        expect(file.version).toBe(1);
        for (const [event, entries] of Object.entries(file.hooks)) {
          expect(Array.isArray(entries), `${event} must contain an array`).toBe(true);
          for (const entry of entries as Array<Record<string, unknown>>) {
            const type = entry.type ?? 'command';
            expect(['command', 'http', 'prompt']).toContain(type);
            if (type === 'command') {
              if (entry.exec) {
                expect(typeof entry.exec).toBe('string');
                expect(Array.isArray(entry.args)).toBe(true);
                expect((entry.args as unknown[]).every((arg) => typeof arg === 'string')).toBe(true);
                for (const shell of ['bash', 'powershell', 'command']) expect(entry).not.toHaveProperty(shell);
              } else {
                expect(['bash', 'powershell', 'command'].some((key) => typeof entry[key] === 'string')).toBe(true);
              }
            } else if (type === 'http') {
              const url = new URL(entry.url as string);
              expect(['http:', 'https:']).toContain(url.protocol);
              if (url.protocol === 'http:') {
                expect(url.hostname).toBe('127.0.0.1');
                expect(event).toBe('postToolUse');
              }
              if (entry.allowedEnvVars) {
                expect(url.protocol, 'header environment expansion requires HTTPS').toBe('https:');
                expect(Array.isArray(entry.allowedEnvVars)).toBe(true);
                expect((entry.allowedEnvVars as unknown[]).every((name) => typeof name === 'string')).toBe(true);
              }
            } else {
              expect(event).toBe('sessionStart');
              expect(typeof entry.prompt).toBe('string');
              expect((entry.prompt as string).trim().length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it('the agent-scoped YAML examples parse as frontmatter with a Windows override and a command fallback', () => {
    for (const md of [section4(), section622()]) {
      const examples = fences(md, 'yaml');
      expect(examples.length).toBeGreaterThan(0);
      for (const example of examples) {
        expect(matter(example).data).toMatchObject({
          name: 'formatter',
          description: 'Formats changed files',
          hooks: {
            PostToolUse: [{
              type: 'command',
              command: './scripts/format-changed-files.sh',
              windows: './scripts/format-changed-files.ps1',
            }],
          },
        });
      }
    }
  });

  it('the shell-free registration launches its relative script in a checkout with spaces and errors when that script is gone', () => {
    const config = JSON.parse(fences(part2(), 'json')[0]);
    const entry = config.hooks.preToolUse[0] as { exec: string; args: string[]; matcher: string };
    const dir = mkdtempSync(join(tmpdir(), 'lab06 checkout with spaces '));
    try {
      const scripts = join(dir, 'scripts/hooks');
      mkdirSync(scripts, { recursive: true });
      const script = join(scripts, 'guard-env.mjs');
      writeFileSync(script, guardSource('guard-env.mjs')!);
      const matcher = new RegExp(`^(?:${entry.matcher})$`);
      expect(['edit', 'create', 'write', 'apply_patch', 'view', 'bash', 'powershell', 'textedit'].map((name) => matcher.test(name)))
        .toEqual([true, true, true, true, false, false, false, false]);

      const options = { cwd: dir, input: toolEvent('edit', encoded({ path: '.env' })), encoding: 'utf8' as const, timeout: 10_000 };
      const present = spawnSync(entry.exec, entry.args, options);
      expect({ status: present.status, output: JSON.parse(present.stdout) }).toEqual({
        status: 0,
        output: { permissionDecision: 'deny', permissionDecisionReason: 'Do not edit .env: secrets stay out of tool calls.' },
      });
      rmSync(script);
      const missing = spawnSync(entry.exec, entry.args, options);
      expect(missing.error).toBeUndefined();
      expect(missing.status).toBe(1);
      expect(missing.stderr).toMatch(/MODULE_NOT_FOUND/);
      expect(missing.stdout).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  /** Run the documented request handler on a real loopback socket, without registering any Copilot hook. */
  async function withReceiver(check: (url: string, logs: string[]) => Promise<void>): Promise<void> {
    const source = guardSource('audit-receiver.mjs');
    expect(source, 'the local audit receiver listing is missing').toBeDefined();
    const server = createServer();
    const logs: string[] = [];
    try {
      // Only the import and listener wiring are adapted: an ephemeral port avoids conflicts with a learner's server.
      runInNewContext(source!.replace(/^import \{ createServer \} from 'node:http';\n/m, ''), {
        createServer: (handler: RequestListener) => {
          server.on('request', handler);
          return {
            listen: (port: number, host: string, ready: () => void) => {
              expect(port).toBe(8787);
              expect(host).toBe('127.0.0.1');
              return server.listen(0, host, ready);
            },
          };
        },
        console: { log: (line: string) => logs.push(line) },
      }, { timeout: 1_000 });
      await once(server, 'listening');
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('receiver did not open a TCP port');
      const local = fences(sectionUnder(section622(), /^####\s+3\.\s/), 'json')
        .map((b) => JSON.parse(b))
        .flatMap((file) => file.hooks.postToolUse)
        .find((entry) => entry.url.startsWith('http://'));
      expect(local, 'the local HTTP registration is missing').toBeDefined();
      await check(`http://127.0.0.1:${address.port}${new URL(local.url).pathname}`, logs);
    } finally {
      server.closeAllConnections();
      if (server.listening) await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    }
  }

  const post = (url: string, chunks: string[]): Promise<{ status: number | undefined; type: string | undefined; body: string }> =>
    new Promise((resolve, reject) => {
      const req = request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Source': 'copilot-cli' } }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('error', reject);
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
      });
      req.on('error', reject);
      req.setTimeout(5_000, () => req.destroy(new Error('audit receiver timed out')));
      for (const chunk of chunks) req.write(chunk);
      req.end();
    });

  it('the audit receiver consumes chunked tool events, returns no decision, and logs metadata rather than tool arguments', async () => {
    await withReceiver(async (url, logs) => {
      const body = toolEvent('view', { path: 'README.md', text: 'do-not-log-this-payload'.repeat(1_000) });
      const reply = await post(url, [body.slice(0, 40), body.slice(40)]);
      expect(reply).toEqual({ status: 200, type: 'application/json', body: '{}' });
      expect(logs.filter((line) => /POST \/copilot-audit tool=view$/.test(line))).toHaveLength(1);
      expect(logs.join('\n')).not.toContain('do-not-log-this-payload');
      expect(logs.join('\n')).not.toContain('README.md');
    });
  });

  it('the audit receiver tolerates unparseable input and still handles subsequent and concurrent hook POSTs', async () => {
    await withReceiver(async (url, logs) => {
      expect(await post(url, ['not json'])).toEqual({ status: 200, type: 'application/json', body: '{}' });
      const replies = await Promise.all(['edit', 'create'].map((name) => post(url, [toolEvent(name, { path: 'src/Program.cs' })])));
      expect(replies).toEqual([
        { status: 200, type: 'application/json', body: '{}' },
        { status: 200, type: 'application/json', body: '{}' },
      ]);
      expect(logs.filter((line) => /POST \/copilot-audit tool=/.test(line))).toHaveLength(3);
      for (const name of ['(none)', 'edit', 'create']) expect(logs.some((line) => line.endsWith(`tool=${name}`))).toBe(true);
    });
  });

  for (const [label, lang] of [['Bash', 'bash'], ['PowerShell', 'powershell']] as const) {
    const runtime = GUARDS.find((g) => g.label === label)!;
    it.skipIf(runtime.command === null)(`the ${label} cleanup removes the scratch hooks and scripts without deleting shipped or unrelated files`, () => {
      const dir = mkdtempSync(join(tmpdir(), `lab06-cleanup-${label}-`));
      try {
        const home = join(dir, 'fixture home');
        const project = join(dir, 'checkout');
        for (const path of [join(home, '.copilot/hooks'), join(project, '.github/hooks'), join(project, 'scripts/hooks')]) {
          mkdirSync(path, { recursive: true });
        }
        writeFileSync(join(home, '.qa-fixture-home'), 'owned by this test');
        const targets = [
          join(project, '.github/hooks/guard-env-local.json'),
          join(home, '.copilot/hooks/audit-local.json'),
          ...['guard-env.mjs', 'guard_env.py', 'guard-env.sh', 'guard-env.ps1', 'audit-receiver.mjs']
            .map((file) => join(project, 'scripts/hooks', file)),
        ];
        for (const path of targets) writeFileSync(path, 'scratch fixture');
        const preserved = [join(project, '.github/hooks/default.json'), join(home, '.copilot/hooks/keep.json'), join(project, 'scripts/hooks/keep.txt')];
        for (const path of preserved) writeFileSync(path, 'must remain byte-for-byte');
        const cleanup = section622().slice(section622().indexOf('**Clean up.**'));
        const block = fences(cleanup, lang)[0];
        expect(block).toBeDefined();
        const script = join(dir, `cleanup.${lang === 'bash' ? 'sh' : 'ps1'}`);
        const prelude = lang === 'bash'
          ? 'set -e\n[[ -f "$HOME/.qa-fixture-home" ]] || exit 99\n'
          : `$ErrorActionPreference = 'Stop'\nSet-Variable -Name HOME -Value '${home.replace(/'/g, "''")}' -Force\nif (-not (Test-Path "$HOME/.qa-fixture-home")) { throw 'not a fixture home' }\n`;
        const verifyEnvironment = lang === 'powershell'
          ? '\nif (Test-Path Env:COPILOT_HOOK_ALLOW_LOCALHOST) { throw "cleanup left the localhost override enabled" }\n'
          : '';
        writeFileSync(script, prelude + block + verifyEnvironment);
        const run = spawnSync(runtime.command!, runtime.args(script), {
          cwd: project,
          env: { ...process.env, HOME: home, COPILOT_HOOK_ALLOW_LOCALHOST: '1' },
          encoding: 'utf8',
          timeout: 20_000,
        });
        expect({ status: run.status, stderr: run.stderr }).toEqual({ status: 0, stderr: '' });
        expect(targets.filter((path) => existsSync(path)), 'cleanup left a registration or script behind').toEqual([]);
        expect(preserved.map((path) => readFileSync(path, 'utf8'))).toEqual(preserved.map(() => 'must remain byte-for-byte'));
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});

describe('lab06 contract: AC20 — §6.4.1 is the Debugging & Observability walkthrough, and §6.4 carries the Debug It callout', () => {
  const TITLE = '🔍 Debug It (VS Code & Copilot CLI)';
  const s64 = (): string => sectionUnder(lab(), /^##\s+6\.4\s/);
  const s641 = (): string => sectionUnder(lab(), /^###\s+6\.4\.1\s/);
  const part = (n: number): string => sectionUnder(s641(), new RegExp(`^####\\s+${n}\\.\\s`));
  const fences = (md: string, lang: string): string[] =>
    [...lf(md).matchAll(new RegExp('```' + lang + '\\n([\\s\\S]*?)```', 'g'))].map((m) => m[1]);
  const callouts = (md: string): string[] => {
    const all = lf(md).split('\n');
    const out: string[] = [];
    all.forEach((l, i) => {
      if (!l.startsWith(`> **${TITLE}**`)) return;
      let to = i;
      while (to + 1 < all.length && all[to + 1].startsWith('>')) to++;
      out.push(all.slice(i, to + 1).map((x) => x.replace(/^>\s?/, '')).join('\n'));
    });
    return out;
  };

  it('puts §6.4.1 inside §6.4, before §6.5 Final, so no existing section is renumbered', () => {
    const body = lf(lab());
    const at = (re: RegExp): number => body.search(re);
    expect(at(/^##\s+6\.4\s/m)).toBeGreaterThan(-1);
    expect(at(/^###\s+6\.4\.1\s/m), '§6.4.1 is missing or comes before §6.4').toBeGreaterThan(at(/^##\s+6\.4\s/m));
    expect(at(/^##\s+6\.5\s/m), '§6.5 must still follow §6.4.1').toBeGreaterThan(at(/^###\s+6\.4\.1\s/m));
    expect(s64()).toContain('### 6.4.1');
  });

  it('replaces the old "Verifying hooks in VS Code" callout with one Debug It callout in §6.4', () => {
    expect(lab()).not.toMatch(/Verifying hooks in VS Code/);
    expect(callouts(lab()).length).toBe(1);
    expect(callouts(s64()).length, 'the callout is not inside §6.4').toBe(1);
  });

  it('the §6.4 callout asks "did my hook run?", points at §6.4.1 and the guide, and keeps the Output channel straight', () => {
    const [c] = callouts(s64());
    expect(c, 'no Debug It callout inside §6.4').toBeDefined();
    expect(c).toMatch(/hook/i);
    expect(c).toContain('§6.4.1');
    expect(c).toContain('debugging-and-observability.md');
    expect(c).toContain('`hook.start`');
    expect(c).toContain('`hook.end`');
    expect(c).toMatch(/inside a running `copilot` session/);
    expect(windowHas(c, [/GitHub Copilot Chat Hooks/, /legacy Local|old Local/i], 400)).toBe(true);
    expect(windowHas(c, [/GitHub Copilot Chat/, /general/i], 400)).toBe(true);
  });

  it('is optional and untimed: the Timed route callout names §6.4.1, and §6.4.1 opens by saying it is not on the timed route', () => {
    expect(prose(), 'the Timed route callout must say §6.4.1 is optional and not timed').toMatch(/Timed route\b.{0,1600}6\.4\.1/);
    expect(s641()).toMatch(/not on the timed route/i);
  });

  it('keeps the core path as it was: the Timed route callout still counts §6.4 and §6.6 as timed, and pacing is untouched (AC10)', () => {
    expect(prose()).toMatch(/Timed route\b.{0,300}§6\.3, §6\.4/);
  });

  it('has four numbered parts: VS Code, session data, asking Copilot, OpenTelemetry', () => {
    const titles = [...s641().matchAll(/^####\s+(\d)\.\s+(.*)$/gm)].map((m) => `${m[1]}. ${m[2]}`);
    expect(titles).toHaveLength(4);
    expect(titles[0]).toMatch(/^1\..*VS Code/);
    expect(titles[1]).toMatch(/^2\..*session/i);
    expect(titles[2]).toMatch(/^3\..*Copilot/);
    expect(titles[3]).toMatch(/^4\..*OpenTelemetry/);
  });

  it('part 1 (VS Code): both capture settings, enabled before reproducing; the panel and its four views; OTLP export; the Chat Debug view', () => {
    const p = part(1);
    expect(windowHas(p, [/chat\.agentHost\.agentDebugLog\.enabled/, /Agent Host|Copilot harness/, /before/i], 600)).toBe(true);
    expect(windowHas(p, [/github\.copilot\.chat\.agentDebugLog\.fileLogging\.enabled/, /Local/, /reload/i], 600)).toBe(true);
    for (const t of ['Show Agent Debug Logs', 'Developer: Open Agent Debug Logs', 'Logs view', 'Summary view', 'Agent Flow Chart', 'Cache Explorer', 'OTLP', 'Show Chat Debug View']) {
      expect(p, `part 1 does not mention ${t}`).toContain(t);
    }
    for (const t of ['System prompt', 'User prompt', 'Context', 'Response', 'Tool responses']) {
      expect(p, `part 1 does not list the Chat Debug section ${t}`).toContain(t);
    }
  });

  it('part 1 keeps the Output channels straight: GitHub Copilot Chat Hooks is the legacy Local channel, GitHub Copilot Chat the general one, with all three shortcuts', () => {
    const p = part(1);
    expect(windowHas(p, [/GitHub Copilot Chat Hooks/, /legacy Local|old Local/i], 400)).toBe(true);
    for (const k of ['Ctrl+Shift+U', 'Cmd+Shift+U', 'Ctrl+K Ctrl+H']) expect(p).toContain(k);
  });

  it('part 2 (session data): the session-state folder and every file in it, /session id, and summary in session-store.db rather than workspace.yaml', () => {
    const p = part(2);
    expect(p).toMatch(/~\/\.copilot\/session-state\/<session-id>\//);
    for (const f of ['events.jsonl', 'workspace.yaml', 'plan.md', 'session.db', 'session-store.db']) {
      expect(p, `part 2 does not name ${f}`).toContain(`\`${f}\``);
    }
    expect(p).toContain('/session id');
    expect(windowHas(p, [/chronological event log/i], 300)).toBe(true);
    expect(windowHas(p, [/`plan\.md`/, /`session\.db`/, /\bsql\b/, /only|when|if/i], 600)).toBe(true);
    expect(windowHas(p, [/summary/, /`session-store\.db`/], 400)).toBe(true);
  });

  it('part 2 shows both one-liners: which hooks ran, from hook.start events, in PowerShell and in Bash with jq', () => {
    expect(fences(part(2), 'powershell').some((b) => /^# Which hooks ran/.test(b) && /hook\.start/.test(b))).toBe(true);
    expect(fences(part(2), 'bash').some((b) => /^# Which hooks ran/.test(b) && /\bjq\b/.test(b) && /hook\.start/.test(b))).toBe(true);
  });

  it('part 3 (ask Copilot): /diagnose, /collect-debug-logs, session_store_sql, #debugEventsSnapshot and /troubleshoot', () => {
    const p = part(3);
    for (const t of ['/diagnose', '/collect-debug-logs', 'session_store_sql', '#debugEventsSnapshot', '/troubleshoot']) {
      expect(p, `part 3 does not mention ${t}`).toContain(t);
    }
    expect(windowHas(p, [/\/diagnose/, /current session/i, /permission request/i], 600)).toBe(true);
    expect(windowHas(p, [/\/collect-debug-logs/, /\.tgz/, /consent/i, /gist/i], 700)).toBe(true);
    expect(windowHas(p, [/session_store_sql/, /cloud/i, /local/i], 700)).toBe(true);
  });

  it('part 4 (OpenTelemetry): the three activation variables, SPAN_ONLY, and the span tree invoke_agent → chat / execute_tool', () => {
    const p = part(4);
    for (const t of ['COPILOT_OTEL_FILE_EXPORTER_PATH', 'OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318', 'COPILOT_OTEL_ENABLED', 'OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY', 'invoke_agent', 'execute_tool']) {
      expect(p, `part 4 does not mention ${t}`).toContain(t);
    }
    expect(p).toMatch(/\bchat\b/);
    expect(windowHas(p, [/SPAN_ONLY/, /sensitive/i, /prompts?/i], 700)).toBe(true);
  });

  it('part 4 writes the trace file outside the repository: its commands use the OS temp folder, never ./copilot-otel.jsonl', () => {
    const code = [...fences(part(4), 'bash'), ...fences(part(4), 'powershell')].join('\n');
    expect(code).toContain('/tmp/copilot-otel.jsonl');
    expect(code).toContain('GetTempPath');
    expect(code, 'the exercise must not write the trace file into the checkout').not.toContain('./copilot-otel.jsonl');
    // The text may put emphasis between the words ("**not** git-ignored"), so allow a few non-word characters.
    expect(windowHas(part(4), [/outside the repository|not\W{0,4}git-ignored|\.gitignore/i, /copilot-otel\.jsonl/], 600)).toBe(true);
  });

  it('part 4 shows the span-name and hook-event one-liners in both shells', () => {
    for (const re of [/^# Span names/, /^# Hooks in the OTel file/]) {
      expect(fences(part(4), 'powershell').some((b) => re.test(b)), `no PowerShell block ${re}`).toBe(true);
      expect(fences(part(4), 'bash').some((b) => re.test(b) && /\bjq\b/.test(b)), `no Bash block ${re}`).toBe(true);
    }
  });

  it('Tidy up deletes the trace file and clears the variable, in both shells', () => {
    const tidy = (): string => {
      const s = s641();
      const at = s.indexOf('**Tidy up.**');
      return at === -1 ? '' : s.slice(at);
    };
    expect(tidy(), 'no "**Tidy up.**" step in §6.4.1').not.toBe('');
    const bash = fences(tidy(), 'bash');
    const ps = fences(tidy(), 'powershell');
    expect(bash.some((b) => /rm -f/.test(b) && b.includes('/tmp/copilot-otel.jsonl'))).toBe(true);
    expect(ps.some((b) => /Remove-Item/.test(b) && b.includes('copilot-otel.jsonl') && b.includes('Env:COPILOT_OTEL_FILE_EXPORTER_PATH'))).toBe(true);
  });

  it('says what the session folders and the trace file can hold, and to review before sharing', () => {
    expect(windowHas(s641(), [/not encrypted/i, /prompts?|source code/i], 700)).toBe(true);
    expect(s641()).toMatch(/review/i);
  });

  it('never registers a debugging hook in the live config (the walkthrough edits no file in the repository)', () => {
    expect(readFileSync(HOOK_CONFIG, 'utf8')).not.toMatch(/otel|debug-log|copilot-otel/i);
  });
});

describe('lab06 contract: spec alignment — specs/labs/lab06.md matches the Phase 3 scope', () => {
  const criteria = (): string => sectionUnder(spec(), /^##\s+3\.\s+Acceptance criteria\s*$/);
  const nonGoals = (): string => sectionUnder(spec(), /^##\s+5\.\s+Non-goals\s*$/);

  it.each(['AC12', 'AC13', 'AC14', 'AC15', 'AC16', 'AC17', 'AC18', 'AC19', 'AC20'])(
    'has acceptance criterion %s observed by this contract test',
    (id) => {
      expect(criteria()).toMatch(new RegExp(`^\\|\\s*${id}\\s*\\|[^\\n]*lab06-contract`, 'm'));
    },
  );

  it('lists the optional guard registration file among the write steps in §2', () => {
    const base = registrationPath()?.split('/').pop();
    expect(base, 'the lab names no registration file, so the spec cannot list it').toBeDefined();
    expect(
      sectionUnder(spec(), /^##\s+2\.\s+Declared surface\s*$/),
      `the lab has the learner create ${base}, a live fail-closed hook; the spec's write steps must say so`,
    ).toContain(base!);
  });

  it('fences the guard registration, and its removal, in §7', () => {
    const base = registrationPath()?.split('/').pop();
    expect(base, 'the lab names no registration file, so the spec cannot fence it').toBeDefined();
    const s7 = sectionUnder(spec(), /^##\s+7\.\s/);
    expect(windowHas(s7, [new RegExp(escapeRe(base!)), /registration/i, /fail-closed|denied|denies/i], 700)).toBe(true);
    expect(windowHas(s7, [/Clean up/i, /registration/i, /before/i], 700)).toBe(true);
  });

  it('records the wider event matrix in C18: apply_patch and arguments that are not an object', () => {
    const row = spec()
      .split('\n')
      .find((l) => /^\|\s*C18\s*\|/.test(l));
    expect(row, 'specs/labs/lab06.md has no C18 row').toBeDefined();
    expect(row!, 'C18 still describes the original, friendlier set of events').toMatch(/apply_patch/);
    expect(row!).toMatch(/not an object/i);
    expect(row!, 'the old eight-event claim is superseded').not.toMatch(/same eight events/i);
  });

  it.each([
    ['the collapsible 15-event deep dive', /Deep Dive/],
    ['§6.2.2 (polyglot hooks, exec + args, http webhooks)', /6\.2\.2/],
    ['docs/copilot-config-reference.md §4.3 as the exhaustive catalogue', /4\.3/],
  ])('states in the non-goals: %s', (_label, pattern) => {
    expect(nonGoals()).toMatch(pattern);
  });

  it('states in the non-goals that §6.1 keeps a concise, non-exhaustive beginner intro table', () => {
    expect(windowHas(nonGoals(), [/6\.1/, /concise/i, /non-exhaustive/i], 600)).toBe(true);
  });

  it('no longer carries the superseded "do not edit the config reference" non-goal', () => {
    expect(nonGoals()).not.toMatch(/Do not edit `docs\/copilot-config-reference\.md`/);
  });

  it('no longer carries the superseded "do not enumerate all fourteen" non-goal', () => {
    expect(nonGoals()).not.toMatch(/Do not enumerate all fourteen/i);
  });
});
