import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 13 contract — the mechanical definition of done for `specs/labs/lab13.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 *
 * This lab's pass also owns the repo-wide fix to `docs/_partials/currency.md`
 * (spec §5 scope allowance), so AC10/AC11 below reach outside `labs/lab13.md`.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab13.md');
const SPEC = join(ROOT, 'specs/labs/lab13.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const PARTIAL = join(ROOT, 'docs/_partials/currency.md');

/** Every lab that includes the shared currency partial. Spec §5 lists all ten. */
const INCLUDERS = [
  'lab06',
  'lab08',
  'lab09',
  'lab11',
  'lab12',
  'lab13',
  'lab15',
  'lab-hardening',
  'lab-gh-extensions',
  'lab-copilot-cli-extensions',
];

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

/** Heading texts at a given level, outside code fences, excluding the H1 title. */
const headingsAt = (level: number): string[] =>
  lines()
    .filter((l) => headingLevel(l) === level)
    .map((l) => l.text.replace(/^#+\s+/, '').trim());

/** Prose only: drops fenced blocks, where `§A.1`-style text is illustrative. */
const prose = (): string =>
  lines()
    .filter((l) => !l.inFence)
    .map((l) => l.text)
    .join('\n');

function frontmatter(): Record<string, any> {
  const m = lab().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(m, 'lab13 has no YAML frontmatter block').not.toBeNull();
  return yaml.load((m as RegExpMatchArray)[1]) as Record<string, any>;
}

interface Registry {
  labs?: Record<string, { pace_self_minutes?: number }>;
  models?: Record<string, unknown>;
}
const registry = (): Registry => yaml.load(readFileSync(REGISTRY, 'utf8')) as Registry;

/** Every model id named in the registry's `models:` block, flattened across tiers. */
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

// Vendor model identifiers, e.g. claude-opus-4.6 / gpt-5.4. Deliberately narrow:
// it matches an id shape, not any mention of a vendor.
const MODEL_ID = /\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi;

/** The partial's shared body: from its first `> ` line to EOF, normalized. */
const partialBody = (): string => {
  const ls = readFileSync(PARTIAL, 'utf8').replace(/\r\n/g, '\n').split('\n');
  return ls
    .slice(ls.findIndex((l) => l.startsWith('> ')))
    .join('\n')
    .trim();
};

/** The body a given lab carries between its include markers. */
function includedCurrency(stem: string): string {
  const body = readFileSync(join(ROOT, `labs/${stem}.md`), 'utf8').replace(/\r\n/g, '\n');
  const m = body.match(
    /<!--\s*@include docs\/_partials\/currency\.md[\s\S]*?-->\n([\s\S]*?)<!--\s*@end-include docs\/_partials\/currency\.md\s*-->/,
  );
  expect(
    m,
    `labs/${stem}.md must include docs/_partials/currency.md between its markers`,
  ).not.toBeNull();
  return (m as RegExpMatchArray)[1].trim();
}

describe('lab13 contract: the spec exists and governs', () => {
  it('specs/labs/lab13.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab13 contract: AC4 — every ## section is numbered 13.x, and uniquely', () => {
  it('no ## heading is unnumbered', () => {
    const unnumbered = headingsAt(2).filter((h) => !/^13\.\d+\b/.test(h));
    expect(
      unnumbered,
      `unnumbered ## heading(s): ${unnumbered.join(' | ')}. Today "Copilot CLI currency", ` +
        `"Part A" and "Part B" carry no number, which is why the lab's own §13.3.1 ` +
        `cross-reference points at nothing. See specs/labs/lab13.md §6 D2 for the map.`,
    ).toEqual([]);
  });

  it('no 13.x number is used twice', () => {
    const nums = headingsAt(2)
      .map((h) => h.match(/^13\.\d+/)?.[0])
      .filter((n): n is string => Boolean(n));
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect([...new Set(dupes)], `duplicate ## section number(s): ${dupes.join(', ')}`).toEqual([]);
  });

  it('13.0 is the currency section, per the house convention', () => {
    const first = headingsAt(2)[0] ?? '';
    expect(
      first,
      `the first ## section should be "13.0 Copilot CLI currency …" — every sibling lab ` +
        `numbers its currency block <n>.0. Found: "${first}"`,
    ).toMatch(/^13\.0\b.*currency/i);
  });
});

describe('lab13 contract: AC5 — internal section cross-references resolve', () => {
  it('every §13.x / §13.x.y reference names a heading that exists', () => {
    const present = new Set(
      [...headingsAt(2), ...headingsAt(3)]
        .map((h) => h.match(/^(13\.\d+(?:\.\d+)?)/)?.[1])
        .filter((n): n is string => Boolean(n)),
    );
    const cited = [...new Set([...prose().matchAll(/§(13\.\d+(?:\.\d+)?)/g)].map((m) => m[1]))];
    const dangling = cited.filter((c) => !present.has(c));
    expect(
      dangling,
      `lab13 cites section(s) that do not exist: ${dangling.join(', ')}. ` +
        `Present: ${[...present].sort().join(', ')}. ` +
        `Today line 223 cites §13.3.1, which is nowhere in the lab.`,
    ).toEqual([]);
  });
});

describe('lab13 contract: AC6 — the Part A / Part B scheme is gone', () => {
  it('no §A.n or §B.n cross-reference survives', () => {
    const hits = [...new Set(prose().match(/§[AB]\.\d+/g) ?? [])];
    expect(
      hits,
      `lab13 still uses the old lettered scheme: ${hits.join(', ')}. ` +
        `Rewrite per specs/labs/lab13.md §6 D2 — labs/lab14.md cites these too and is ` +
        `corrected in its own pass against the same map.`,
    ).toEqual([]);
  });

  it('no heading is introduced by a bare "Part A" / "Part B"', () => {
    const bad = [...headingsAt(2), ...headingsAt(3)].filter((h) =>
      /^(?:Part [AB]|[AB]\.\d)/.test(h),
    );
    expect(bad, `heading(s) still unnumbered: ${bad.join(' | ')}`).toEqual([]);
  });
});

describe('lab13 contract: AC7 — ACP is the Agent Client Protocol', () => {
  it('never expands ACP as "Agent Communication Protocol"', () => {
    expect(
      lab(),
      `The CLI's own help says: "--acp  Start as Agent Client Protocol server". ` +
        `The lab is named after this protocol and currently expands it wrongly in both ` +
        `its intro and its §13.0 definition table.`,
    ).not.toMatch(/Agent Communication Protocol/i);
  });

  it('expands ACP as "Agent Client Protocol" at least once', () => {
    expect(lab(), 'the lab must define the acronym it is named after').toMatch(
      /Agent Client Protocol/i,
    );
  });
});

describe('lab13 contract: AC8 — model names come from the registry', () => {
  it('every model identifier in lab13 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((lab().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab13 names model(s) absent from docs/_meta/registry.yaml models:: ${unknown.join(', ')}. ` +
        `The registry records claude-opus-4.7 as dropped because the CLI no longer serves it, ` +
        `so the 💸 callout sends learners to a model they cannot select. ` +
        `Registry knows: ${[...known].sort().join(', ')}`,
    ).toEqual([]);
  });
});

describe('lab13 contract: AC9 — no undocumented environment variable', () => {
  it('does not set or mention COPILOT_AGENT_NAME', () => {
    expect(
      lab(),
      `COPILOT_AGENT_NAME is not among the variables "copilot help environment" documents. ` +
        `Drop the assignment; --agent already names the agent.`,
    ).not.toMatch(/COPILOT_AGENT_NAME/);
  });
});

describe('lab13 contract: AC10 — the shared currency partial is corrected', () => {
  const partial = (): string => readFileSync(PARTIAL, 'utf8');

  it('drops the /model <tier-or-id> form', () => {
    expect(
      partial(),
      `"/model <tier-or-id>" is wrong: the CLI's /model takes a model id or "auto". ` +
        `tests/lab-structure/lab07-contract.test.ts already bans this string in lab07, ` +
        `so the partial currently contradicts a lab that was refreshed to the standard.`,
    ).not.toMatch(/tier-or-id/);
  });

  it('names /model MODEL-ID and /model auto', () => {
    const p = partial();
    expect(p, 'the /model row must name a concrete argument form').toMatch(/\/model\s+MODEL-ID/);
    expect(p, 'the /model row must name the auto form').toMatch(/\/model\s+auto/);
  });

  it('does not claim autopilot mode is the default', () => {
    expect(
      partial(),
      `"autopilot mode is the default" is false: copilot --help ships --autopilot ` +
        `("Start in autopilot mode") and --mode [interactive, plan, autopilot]. ` +
        `labs/lab01.md:35 and labs/lab07.md:47 already say it is a toggle you switch on.`,
    ).not.toMatch(/autopilot mode is the default/i);
  });

  it('names /autopilot and describes it as a toggle, not a default', () => {
    expect(partial(), 'the plan/autopilot row must name the /autopilot command').toMatch(
      /\/autopilot/,
    );
    expect(partial(), 'match the wording lab01 and lab07 already use').toMatch(/not the default/i);
  });

  it('does not describe Shift+Tab as toggling plan/autopilot modes', () => {
    expect(
      partial(),
      `"copilot help" says "shift+tab - switch modes" and there are three modes ` +
        `(interactive, plan, autopilot), so "toggle" is wrong for the same reason the ` +
        `/model row's tier syntax was.`,
    ).not.toMatch(/toggle\s+plan\/autopilot\s+modes/i);
  });
});

describe('lab13 contract: AC11 — all ten consumers are re-synced to the partial', () => {
  it.each(INCLUDERS)('labs/%s.md carries a byte-identical currency block', (stem) => {
    expect(
      includedCurrency(stem),
      `labs/${stem}.md has drifted from docs/_partials/currency.md. There is no re-sync ` +
        `tool: copy the partial's body (first "> " line to EOF) between the markers by hand. ` +
        `All ten consumers must match — see specs/labs/lab13.md §5.`,
    ).toBe(partialBody());
  });

  it('the spec names every including lab, so the re-sync list cannot silently shrink', () => {
    const spec = readFileSync(SPEC, 'utf8');
    const missing = INCLUDERS.filter((s) => !spec.includes(`${s}.md`));
    expect(missing, `specs/labs/lab13.md does not name: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lab13 contract: AC13 — pacing agrees across frontmatter, registry and callout', () => {
  it('self-paced minutes agree in all three places', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab13?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });

  it('presenter minutes agree between frontmatter and the callout', () => {
    const declared = frontmatter().pace?.presenter_minutes;
    expect(lab()).toMatch(new RegExp(`Presenter pace:\\s*${declared}\\s*minutes`));
  });
});
