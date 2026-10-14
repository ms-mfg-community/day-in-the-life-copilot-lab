import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 14 contract — the mechanical definition of done for `specs/labs/lab14.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab14.md');
const SPEC = join(ROOT, 'specs/labs/lab14.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

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

const headingsAt = (level: number): string[] =>
  lines()
    .filter((l) => headingLevel(l) === level)
    .map((l) => l.text.replace(/^#+\s+/, '').trim());

function frontmatter(): Record<string, any> {
  const m = lab().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(m, 'lab14 has no YAML frontmatter block').not.toBeNull();
  return yaml.load((m as RegExpMatchArray)[1]) as Record<string, any>;
}

interface Registry {
  labs?: Record<string, { pace_self_minutes?: number }>;
  models?: Record<string, unknown>;
}
const registry = (): Registry => yaml.load(readFileSync(REGISTRY, 'utf8')) as Registry;

function registryModels(): Set<string> {
  const out = new Set<string>();
  for (const value of Object.values(registry().models ?? {})) {
    if (typeof value === 'string') out.add(value.toLowerCase());
    else if (Array.isArray(value)) {
      for (const v of value) if (typeof v === 'string') out.add(v.toLowerCase());
    }
  }
  return out;
}

const MODEL_ID = /\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi;

describe('lab14 contract: the spec exists and governs', () => {
  it('specs/labs/lab14.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab14 contract: AC4 — every ## section is numbered 14.x, and uniquely', () => {
  it('no ## heading is unnumbered', () => {
    const unnumbered = headingsAt(2).filter((h) => !/^14\.\d+\b/.test(h));
    expect(
      unnumbered,
      `unnumbered ## heading(s): ${unnumbered.join(' | ')}. "Compatibility matrix" is the ` +
        `only unnumbered section and it sits before 14.0, so numbering it shifts the rest ` +
        `down one. See specs/labs/lab14.md §6 D6 for the map.`,
    ).toEqual([]);
  });

  it('no 14.x number is used twice', () => {
    const nums = headingsAt(2)
      .map((h) => h.match(/^14\.\d+/)?.[0])
      .filter((n): n is string => Boolean(n));
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect([...new Set(dupes)], `duplicate ## section number(s): ${dupes.join(', ')}`).toEqual([]);
  });
});

describe('lab14 contract: AC5/AC6 — the model-policy callout states the sourced date', () => {
  it('does not claim an org-wide rollout completed 2026-09-01', () => {
    expect(
      lab(),
      `docs/_meta/registry.yaml records that "enforced org-wide by 2026-09-01" appears ` +
        `nowhere in the cited changelog, re-verified absent on 2026-10-12, and names ` +
        `labs/lab14.md:45 as a carrier awaiting its own spec'd pass. This is that pass.`,
    ).not.toMatch(/2026-09-01/);
  });

  it('names 2026-08-26, the only effective date the changelog publishes', () => {
    expect(
      lab(),
      `The changelog announced the policy 2026-07-29 and says "On August 26, the policy ` +
        `takes effect". State that date, not an invented rollout-completion date.`,
    ).toMatch(/2026-08-26/);
  });

  it('links the changelog the registry cites', () => {
    expect(
      lab(),
      `A date-bearing policy claim must carry its source. The registry already holds the ` +
        `URL: github.blog/changelog/2026-07-29-default-model-enablement-for-copilot-business-and-enterprise/`,
    ).toMatch(/2026-07-29-default-model-enablement-for-copilot-business-and-enterprise/);
  });

  it('still teaches the substance: default-on-unless-disabled', () => {
    expect(
      lab(),
      'the callout is correct apart from its date — do not delete it while fixing D1',
    ).toMatch(/default-on-unless-disabled/);
  });
});

describe('lab14 contract: AC7 — model names come from the registry', () => {
  it('every model identifier in lab14 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((lab().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab14 names model(s) absent from docs/_meta/registry.yaml models:: ${unknown.join(', ')}. ` +
        `Registry knows: ${[...known].sort().join(', ')}`,
    ).toEqual([]);
  });
});

describe('lab14 contract: AC8/AC9 — every path the lab points at exists', () => {
  it('no reference to .orchestrator/ survives', () => {
    expect(
      lab(),
      `The 🪞 meta callout claims the hand-off contracts under ".orchestrator/session.md" ` +
        `are "real artefacts from that build-out". Neither the file nor the directory ` +
        `exists. handoff.sh writes to .copilot/orchestrator-handoffs/ instead.`,
    ).not.toMatch(/\.orchestrator\//);
  });

  it('does not point the learner at a repo-relative .copilot/session-state/', () => {
    expect(
      lab(),
      `The CLI's session folder is ~/.copilot/session-state/<id>/ (or $COPILOT_HOME). ` +
        `The repo's .copilot/ holds only lessons/ and mcp-config.json, so a learner ` +
        `following this creates a stray directory in the repository.`,
    ).not.toMatch(/(?<!~\/)(?<!\w)\.copilot\/session-state\//);
  });

  it('every backticked repo-relative path resolves on disk', () => {
    const body = lab();
    const candidates = [
      ...body.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|ps1|mjs|ts|sln|cs))`/g),
    ]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<') && p.includes('/'));

    const missing = [...new Set(candidates)].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(missing, `lab14 cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lab14 contract: AC10 — cross-references into Lab 13 use its refreshed numbering', () => {
  it('no §B.n reference to Lab 13 survives', () => {
    const hits = [...new Set(lab().match(/§[AB]\.\d+/g) ?? [])];
    expect(
      hits,
      `lab14 cites Lab 13's old lettered scheme: ${hits.join(', ')}. Lab 13's hand-off ` +
        `schema becomes §13.4.2. The map is stated identically in both specs ` +
        `(specs/labs/lab13.md §6 D2, specs/labs/lab14.md §6 D5).`,
    ).toEqual([]);
  });

  it('attributes trust boundaries to Lab 13 §13.1, not §13.2', () => {
    expect(
      lab(),
      `Lab 13 has no §13.2 today, and after its refresh §13.2 is "Prerequisites". ` +
        `Trust boundaries live in "What is A2A — and what is ACP?", which becomes §13.1.`,
    ).not.toMatch(/Lab 13 §13\.2/);
  });

  it('names Lab 13 §13.4.2 as the hand-off schema', () => {
    expect(
      lab(),
      'lab14 operationalises that schema in three places and must cite its new number',
    ).toMatch(/§13\.4\.2/);
  });
});

describe('lab14 contract: AC11 — the lab tears down what it creates', () => {
  it('tells the learner to kill the session this lab actually creates', () => {
    expect(
      lab().replace(/\s+/g, ' '),
      `The lab starts a long-lived tmux session named copilot-orch and never tells the ` +
        `learner to stop it. The §14.2 primer's generic "tmux kill-session -t NAME" is a ` +
        `reference table entry, not a teardown — name the real session.`,
    ).toMatch(/tmux kill-session -t copilot-orch/);
  });

  it('names the hand-off output directory handoff.sh actually writes to', () => {
    expect(
      lab(),
      `handoff.sh:41 defaults OUT_DIR to .copilot/orchestrator-handoffs. The lab leaves ` +
        `timestamped docs there and never mentions the path.`,
    ).toMatch(/\.copilot\/orchestrator-handoffs/);
  });
});

describe('lab14 contract: AC12 — pacing agrees across frontmatter, registry and callout', () => {
  it('self-paced minutes agree in all three places', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab14?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });

  it('presenter minutes agree between frontmatter and the callout', () => {
    const declared = frontmatter().pace?.presenter_minutes;
    expect(lab()).toMatch(new RegExp(`Presenter pace:\\s*${declared}\\s*minutes`));
  });
});
