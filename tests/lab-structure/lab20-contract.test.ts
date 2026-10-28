import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';

/**
 * Lab 20 contract — the mechanical definition of done for `specs/labs/lab20.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab20.md');
const SPEC = join(ROOT, 'specs/labs/lab20.md');
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

const headingRe = (prefix: string): RegExp =>
  new RegExp(`^#{2,6}\\s+${prefix.replace(/\./g, '\\.')}(?![\\d.])`);

const hasSection = (prefix: string): boolean =>
  lines().some((l) => headingLevel(l) > 0 && headingRe(prefix).test(l.text));

function section(prefix: string): string {
  const all = lines();
  const from = all.findIndex((l) => headingLevel(l) > 0 && headingRe(prefix).test(l.text));
  expect(from, `heading "${prefix}" not found outside a code fence`).toBeGreaterThanOrEqual(0);
  const level = headingLevel(all[from]);
  const rest = all.slice(from + 1);
  const end = rest.findIndex((l) => {
    const lv = headingLevel(l);
    return lv > 0 && lv <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).map((l) => l.text).join('\n');
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

const MODEL_ID = /\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi;

describe('lab20 contract: the spec exists and governs', () => {
  it('specs/labs/lab20.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab20 contract: AC4 — only the published policy date is asserted', () => {
  // The registry's own `model_default_availability_policy` comment records that
  // 2026-09-01 "appears nowhere in the source" and names labs/lab20.md:50 as the
  // last file still carrying it. lab17 was already cleaned by its own contract.
  it('drops the unsourced 2026-09-01 enforcement date', () => {
    expect(
      lab(),
      'lab20 still states an enforcement date that the cited changelog does not publish',
    ).not.toMatch(/2026-09-01/);
  });

  it('states the sourced effective date instead', () => {
    expect(
      lab(),
      'lab20 should cite 2026-08-26 ("On August 26, the policy takes effect"), the only date the changelog publishes',
    ).toMatch(/2026-08-26|August 26/);
  });
});

describe('lab20 contract: AC5 — audit-log fields are the documented ones', () => {
  it('the undocumented agent_session.task event family is gone', () => {
    expect(
      lab(),
      'agent_session.task is not a documented event family; lab17-contract already bans it in lab17',
    ).not.toMatch(/agent_session\.task/);
  });

  it('describes the audit log by a field the docs actually carry', () => {
    expect(
      lab(),
      'lab20 should name actor_is_agent / agent_session_id, the fields lab17 kept, rather than an invented event name',
    ).toMatch(/actor_is_agent|agent_session_id/);
  });
});

describe('lab20 contract: AC6 — §20.0 is not an empty section', () => {
  it('if the 20.0 heading exists, it has content beyond a blockquote callout', () => {
    if (!hasSection('20.0')) return;
    const body = section('20.0')
      .split('\n')
      .filter((l) => l.trim() !== '' && !l.trim().startsWith('>') && !l.trim().startsWith('<!--'))
      .join('\n')
      .trim();
    expect(
      body.length,
      '§20.0 contains only a boilerplate callout — give it content or remove the heading',
    ).toBeGreaterThan(0);
  });
});

describe('lab20 contract: AC7 — declared pacing is internally consistent', () => {
  // Per specs/labs/README.md a pacing NUMBER may change freely and is never a
  // finding. Only agreement between the three places that state it has teeth.
  it('frontmatter, the inline callout and the registry state the same minutes', () => {
    const fm = matter(lab()).data as { pace?: { presenter_minutes?: number; self_paced_minutes?: number } };
    const callout = lab().match(/Presenter pace:\s*(\d+)\s*minutes?\s*\|\s*Self-paced:\s*(\d+)/);
    expect(callout, 'lab20 is missing its inline "⏱️ Presenter pace: X minutes | Self-paced: Y minutes" callout').not.toBeNull();

    const reg = yaml.load(readFileSync(REGISTRY, 'utf8')) as {
      labs?: Record<string, { pace_presenter_minutes?: number; pace_self_minutes?: number }>;
    };
    const row = reg.labs?.lab20;

    expect(
      [fm.pace?.presenter_minutes, Number(callout![1]), row?.pace_presenter_minutes],
      'presenter minutes disagree across frontmatter / inline callout / registry',
    ).toEqual([fm.pace?.presenter_minutes, fm.pace?.presenter_minutes, fm.pace?.presenter_minutes]);

    expect(
      [fm.pace?.self_paced_minutes, Number(callout![2]), row?.pace_self_minutes],
      'self-paced minutes disagree across frontmatter / inline callout / registry',
    ).toEqual([fm.pace?.self_paced_minutes, fm.pace?.self_paced_minutes, fm.pace?.self_paced_minutes]);
  });
});

describe('lab20 contract: AC8 — model names come from the registry', () => {
  it('every model identifier in lab20 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((lab().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab20 names model(s) absent from docs/_meta/registry.yaml models:: ${unknown.join(', ')}. ` +
        `Reference a registry tier instead of hardcoding an id.`,
    ).toEqual([]);
  });
});
