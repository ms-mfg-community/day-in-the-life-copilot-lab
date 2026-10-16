import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 05 contract — the mechanical definition of done for `specs/labs/lab05.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab05.md');
const SPEC = join(ROOT, 'specs/labs/lab05.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

/** Lines tagged with whether they sit inside a fenced block. Fence delimiters count as fenced. */
function lines(body: string = lab()): Line[] {
  let inFence = false;
  const out: Line[] = [];
  for (const text of body.split('\n')) {
    if (/^\s*(```|~~~)/.test(text)) {
      inFence = !inFence;
      out.push({ text, inFence: true });
      continue;
    }
    out.push({ text, inFence });
  }
  return out;
}

const headingLevel = (l: Line): number => {
  if (l.inFence) return 0;
  const m = l.text.match(/^(#{2,6})\s/);
  return m ? m[1].length : 0;
};

/** The body of the section whose heading starts with `prefix`, up to the next same-or-higher heading. */
function section(prefix: string): string {
  const all = lines();
  const head = new RegExp(`^#{2,6}\\s+${prefix.replace(/\./g, '\\.')}(?![\\d.])`);
  const from = all.findIndex((l) => headingLevel(l) > 0 && head.test(l.text));
  expect(from, `heading "${prefix}" not found outside a code fence`).toBeGreaterThanOrEqual(0);
  const level = headingLevel(all[from]);
  const rest = all.slice(from + 1);
  const end = rest.findIndex((l) => {
    const lv = headingLevel(l);
    return lv > 0 && lv <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).map((l) => l.text).join('\n');
}

/** The table row whose first cell contains `needle`. */
function row(text: string, needle: string): string {
  const found = text.split('\n').find((l) => l.startsWith('|') && l.split('|')[1]?.includes(needle));
  expect(found, `no table row whose first cell contains "${needle}"`).toBeDefined();
  return found as string;
}

/** A slash command, never a path segment (`.github/agents/` must not satisfy `/agent`). */
const slash = (name: string): RegExp => new RegExp(`(?<![\\w./])/${name}\\b`);

interface Registry {
  mcp_servers?: { name: string }[];
  labs?: Record<string, { pace_self_minutes?: number }>;
}

const registry = (): Registry => yaml.load(readFileSync(REGISTRY, 'utf8')) as Registry;

const registryServerNames = (): string[] => (registry().mcp_servers ?? []).map((s) => s.name);

/** Frontmatter of the lab, parsed as YAML. */
function frontmatter(): Record<string, any> {
  const m = lab().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(m, 'lab05 has no YAML frontmatter block').not.toBeNull();
  return yaml.load((m as RegExpMatchArray)[1]) as Record<string, any>;
}

describe('lab05 contract: the spec exists and governs', () => {
  it('specs/labs/lab05.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab05 contract: AC5 — the server table does not outrun the registry', () => {
  // Deliberately a SUBSET check, not exact equality. The registry's mcp_servers: is a
  // superset of what a learner gets: `filesystem` is pinned there as "Prepared core
  // only; restricted to this checkout's synthetic fixture directory", so forcing it
  // into a learner-facing table would make the lab less accurate, not more. The false
  // SYNC CLAIM is what needs fixing, and AC6 catches that.
  it('the registry actually lists servers — otherwise this check is vacuous', () => {
    expect(registryServerNames().length).toBeGreaterThan(0);
  });

  it('§5.1 names no server the registry does not list', () => {
    const known = new Set(registryServerNames());
    const extra = [
      ...new Set(
        lines(section('5.1'))
          .filter((l) => !l.inFence && l.text.startsWith('|'))
          .map((l) => l.text.split('|')[1]?.trim() ?? '')
          .map((cell) => cell.match(/^`([a-z0-9-]+)`$/)?.[1])
          .filter((n): n is string => Boolean(n)),
      ),
    ].filter((n) => !known.has(n));

    expect(
      extra,
      `§5.1 names server(s) absent from docs/_meta/registry.yaml mcp_servers:: ` +
        `${extra.join(', ')}. Registry lists: ${[...known].join(', ')}.`,
    ).toEqual([]);
  });
});

describe('lab05 contract: AC6 — no hardcoded server count', () => {
  it('states no server count that disagrees with the registry', () => {
    const m = lab().match(/ships with (\d+) MCP servers/i);
    const claimed = m ? Number(m[1]) : null;
    expect(
      claimed === null || claimed === registryServerNames().length,
      `lab05 claims "${m?.[0]}" but docs/_meta/registry.yaml mcp_servers: has ` +
        `${registryServerNames().length} entries. Derive the list from the registry and drop the count.`,
    ).toBe(true);
  });
});

describe('lab05 contract: AC7/AC8 — §5.0 agrees with lab01 and lab07', () => {
  it('the plan/autopilot row names /plan and /autopilot', () => {
    const r = row(section('5.0'), 'Plan mode vs autopilot mode');
    expect(r, 'labs/lab01.md:35 and labs/lab07.md:47 both name /plan').toMatch(slash('plan'));
    expect(r, 'labs/lab01.md:35 and labs/lab07.md:47 both name /autopilot').toMatch(
      slash('autopilot'),
    );
  });

  it('the /model row drops the tier-or-id form', () => {
    const r = row(section('5.0'), 'Mid-session model switch');
    expect(
      r,
      'tier names are registry keys, not /model arguments — see labs/lab07.md:48 and ' +
        'tests/lab-structure/lab07-contract.test.ts AC6',
    ).not.toMatch(/tier-or-id/);
  });
});

describe('lab05 contract: AC9 — the lab undoes what it mutates', () => {
  it('has a cleanup section', () => {
    const found = lines().find((l) => headingLevel(l) > 0 && /clean\s?up/i.test(l.text));
    expect(
      found,
      'lab05 adds a server to ~/.copilot/mcp-config.json and appends to the git-tracked ' +
        '.copilot/lessons/log.md, and currently tells the learner to undo neither',
    ).toBeDefined();
  });

  it('the cleanup names both files the lab mutates', () => {
    const all = lines();
    const from = all.findIndex((l) => headingLevel(l) > 0 && /clean\s?up/i.test(l.text));
    const body = from === -1 ? '' : all.slice(from).map((l) => l.text).join('\n');
    expect(body, 'cleanup must name ~/.copilot/mcp-config.json').toContain('mcp-config.json');
    expect(body, 'cleanup must name .copilot/lessons/log.md').toContain('.copilot/lessons/log.md');
  });
});

describe('lab05 contract: AC10 — declared pacing is internally consistent', () => {
  // Consistency only. The spec's ~30-minute figure is an ESTIMATED GUIDELINE, not a
  // floor — re-deriving the real duration from the material is the teachability
  // gate's job, and asserting an estimate here would freeze one reviewer's guess
  // into a hard gate. What a test can honestly decide is that the three places the
  // number lives do not disagree.
  it('frontmatter, the registry and the inline callout agree', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab05?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(
      lab(),
      `the "⏱️ Presenter pace" callout must state ${declared} self-paced minutes`,
    ).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });
});

describe('lab05 contract: AC11 — cited paths resolve', () => {
  it('every backticked repo-relative path exists on disk', () => {
    const re = /`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|mjs|ts))`/g;
    const missing = [
      ...new Set(
        [...lab().matchAll(re)]
          .map((m) => m[1])
          .filter((p) => p.includes('/') && !p.startsWith('~') && !p.includes('*')),
      ),
    ].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(missing, `lab05 cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});
