import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';

/**
 * Lab 06 contract — the mechanical definition of done for `specs/labs/lab06.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab06.md');
const SPEC = join(ROOT, 'specs/labs/lab06.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const HOOK_CONFIG = join(ROOT, '.github/hooks/default.json');

const lab = (): string => readFileSync(LAB, 'utf8');

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
