import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 07 contract — the mechanical definition of done for `specs/labs/lab07.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab07.md');
const SPEC = join(ROOT, 'specs/labs/lab07.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

function lines(): Line[] {
  let inFence = false;
  const out: Line[] = [];
  for (const text of lab().split('\n')) {
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

/** The list item / line within `text` that names `needle`. */
function lineNaming(text: string, needle: string): string {
  const found = text.split('\n').find((l) => l.includes(needle));
  expect(found, `no line naming "${needle}"`).toBeDefined();
  return found as string;
}

/** Every model id named in the registry's `models:` block, flattened across tiers. */
function registryModels(): Set<string> {
  const doc = yaml.load(readFileSync(REGISTRY, 'utf8')) as { models?: Record<string, unknown> };
  const out = new Set<string>();
  for (const value of Object.values(doc.models ?? {})) {
    if (typeof value === 'string') out.add(value);
    else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') out.add(v);
  }
  return out;
}

// Vendor model identifiers, e.g. claude-opus-4.6 / gpt-5.4. Matches an id shape,
// not any mention of a vendor. Same shape the lab10 contract uses.
const MODEL_ID = /\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi;

/** A slash command, never a path segment (`.github/agents/` must not satisfy `/agent`). */
const slash = (name: string): RegExp => new RegExp(`(?<![\\w./])/${name}`);

describe('lab07 contract: the spec exists and governs', () => {
  it('specs/labs/lab07.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });
});

describe('lab07 contract: AC4 — model ids come from the registry', () => {
  it('the registry actually lists models — otherwise this check is vacuous', () => {
    expect(registryModels().size).toBeGreaterThan(0);
  });

  it('every model identifier in lab07 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((lab().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab07 names model(s) absent from docs/_meta/registry.yaml models:: ${unknown.join(', ')}. ` +
        `Reference the registry tier (models.cheap / models.premium) instead of hardcoding an id. ` +
        `Registry currently knows: ${[...known].sort().join(', ')}`,
    ).toEqual([]);
  });

  it('claude-opus-4.6 is gone — the CLI does not serve it', () => {
    expect(lab()).not.toMatch(/claude-opus-4\.6/);
  });
});

describe('lab07 contract: AC5 — no hardcoded id is called the repo default', () => {
  it('no vendor model id is labelled "the repo default"', () => {
    expect(lab()).not.toMatch(
      /(?:claude|gpt|gemini|grok)-[a-z0-9.-]+`?\s*\(?\s*the repo default/i,
    );
  });
});

describe('lab07 contract: AC6 — the /model row is accurate', () => {
  it('drops the tier-or-id argument and still points at the registry', () => {
    const r = row(section('7.0'), 'Mid-session model switch');
    expect(r).toContain('/model');
    expect(r).not.toMatch(/tier-or-id/);
    expect(r).toMatch(/registry|models\./);
  });
});

describe('lab07 contract: AC7 — the plan/autopilot row names the commands', () => {
  it('names /plan and /autopilot', () => {
    const r = row(section('7.0'), 'Plan mode vs autopilot mode');
    expect(r).toMatch(slash('plan'));
    expect(r).toMatch(slash('autopilot'));
  });
});

describe('lab07 contract: AC8 — §7.4 uses the documented invocation', () => {
  it('no bare @lab-orchestrator is typed into the CLI', () => {
    expect(section('7.4')).not.toMatch(/@lab-orchestrator/);
  });

  it('§7.4 names the /agent command', () => {
    expect(section('7.4')).toMatch(slash('agent'));
  });
});

describe('lab07 contract: AC9 — §7.1 is honest about what is on disk', () => {
  it('the four-file list is not framed as expected ls output', () => {
    expect(section('7.1')).not.toMatch(/You should see:/);
  });

  it('the dotnet-qa entry says where it comes from', () => {
    expect(lineNaming(section('7.1'), 'dotnet-qa.agent.md')).toMatch(/7\.5|later|bonus/i);
  });
});

describe('lab07 contract: AC10 — prerequisites are stated up front', () => {
  it('links lab03.md before the first ## heading', () => {
    const body = lab().replace(/^---\n[\s\S]*?\n---\n/, '');
    const head = body.slice(0, body.search(/^## /m));
    expect(head).toMatch(/\]\((?:\.\/)?lab03\.md\)/);
  });
});
