import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 09 contract — the mechanical definition of done for `specs/labs/lab09.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab09.md');
const SPEC = join(ROOT, 'specs/labs/lab09.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const PARTIAL = join(ROOT, 'docs/_partials/currency.md');

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

interface Registry {
  labs?: Record<string, { pace_self_minutes?: number }>;
}
const registry = (): Registry => yaml.load(readFileSync(REGISTRY, 'utf8')) as Registry;

function frontmatter(): Record<string, any> {
  const m = lab().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(m, 'lab09 has no YAML frontmatter block').not.toBeNull();
  return yaml.load((m as RegExpMatchArray)[1]) as Record<string, any>;
}

const partialBody = (): string => {
  const ls = readFileSync(PARTIAL, 'utf8').replace(/\r\n/g, '\n').split('\n');
  return ls.slice(ls.findIndex((l) => l.startsWith('> '))).join('\n').trim();
};

function includedCurrency(): string {
  const m = lab()
    .replace(/\r\n/g, '\n')
    .match(
      /<!--\s*@include docs\/_partials\/currency\.md[\s\S]*?-->\n([\s\S]*?)<!--\s*@end-include docs\/_partials\/currency\.md\s*-->/,
    );
  expect(m, 'lab09 must include docs/_partials/currency.md between its markers').not.toBeNull();
  return (m as RegExpMatchArray)[1].trim();
}

/** The body of the lab from its cleanup heading to the end of the file. */
function cleanupBody(): string {
  const all = lines();
  const from = all.findIndex((l) => headingLevel(l) > 0 && /clean\s?up/i.test(l.text));
  expect(from, 'lab09 has no cleanup section').toBeGreaterThanOrEqual(0);
  return all.slice(from).map((l) => l.text).join('\n');
}

describe('lab09 contract: the spec exists and governs', () => {
  it('specs/labs/lab09.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab09 contract: AC5 — cleanup names the four GitHub objects the lab creates', () => {
  // The generic sweep in docs/_partials/cleanup.md talks about ~/.copilot/lessons/,
  // core.hooksPath and node/.a2a/ — none of which this lab touches — and says nothing
  // about the ruleset that keeps forcing Copilot review on every future PR.
  const REQUIRED: [string, RegExp][] = [
    ['the repository ruleset', /ruleset/i],
    ['the issue', /\bissue\b/i],
    ['the branch the Coding Agent created', /\bbranch\b/i],
    ['the pull request', /pull request|\bPR\b/],
  ];

  for (const [what, re] of REQUIRED) {
    it(`cleanup names ${what}`, () => {
      expect(
        cleanupBody(),
        `lab09 creates a ruleset, an issue, a branch and a PR and currently cleans up none ` +
          `of them. A learner finishes with a live ruleset forcing Copilot review on every ` +
          `future PR in their fork.`,
      ).toMatch(re);
    });
  }
});

describe('lab09 contract: AC6/AC7 — no unsourced vendor claims', () => {
  it('states no plan-tier availability matrix', () => {
    // Two such rows exist today and they disagree with each other about Pro,
    // which is the tell. The lab already links four official docs pages.
    expect(lab()).not.toMatch(/Available on Copilot Pro/i);
  });

  it('names no static-analysis engines as fact', () => {
    expect(
      lab(),
      'three named third-party engines, no source, and the list names no C# analyzer in a ' +
        '.NET repo — so even if accurate it misleads here',
    ).not.toMatch(/CodeQL,\s*ESLint,?\s*(?:and\s*)?PMD/i);
  });
});

describe('lab09 contract: AC8 — no branch-name shape presented as expected output', () => {
  it('does not tell the learner to expect copilot/fix-{issue-number}', () => {
    expect(lab()).not.toMatch(/copilot\/fix-\{issue-number\}/);
  });
});

describe('lab09 contract: AC9 — prerequisites are stated up front', () => {
  const head = (): string => {
    const body = lab().replace(/^---\n[\s\S]*?\n---\n/, '');
    return body.slice(0, body.search(/^## /m));
  };

  it('links lab02.md — §9.8 is about the instructions Lab 02 writes', () => {
    expect(head()).toMatch(/\]\((?:\.\/)?lab02\.md\)/);
  });

  it('links lab08.md — §9.9 and §9.10 build on the gh-aw chain', () => {
    expect(head()).toMatch(/\]\((?:\.\/)?lab08\.md\)/);
  });

  it('states that §9.2 needs admin rights on the repository', () => {
    expect(
      head(),
      'creating a repository ruleset requires admin. A learner without it hits a dead end at ' +
        'step 1 of §9.2.',
    ).toMatch(/admin/i);
  });
});

describe('lab09 contract: AC10 — declared pacing is reachable and consistent', () => {
  it('self-paced minutes is at least the 40 derived in the spec (§6 D6)', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(
      declared,
      `lab09 declares ${declared} self-paced minutes while asking the learner through an ` +
        `8-step ruleset wizard and two Coding Agent cycles the lab itself times at 2–5 ` +
        `minutes each. See specs/labs/lab09.md §6 D6.`,
    ).toBeGreaterThanOrEqual(40);
  });

  it('frontmatter, the registry and the inline callout agree', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab09?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });
});

describe('lab09 contract: AC11 — the currency block is the partial, not a copy of it', () => {
  it('§9.0 is byte-identical to docs/_partials/currency.md', () => {
    expect(
      includedCurrency(),
      'the currency block is shared by 10 labs. If it is wrong, fix the partial and re-sync ' +
        'every consumer — never edit it inline here. See specs/labs/lab09.md §5.',
    ).toBe(partialBody());
  });
});

describe('lab09 contract: AC12 — cited paths resolve', () => {
  it('every backticked repo-relative path exists on disk', () => {
    const re = /`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|mjs|ts|cs))`/g;
    const missing = [
      ...new Set(
        [...lab().matchAll(re)]
          .map((m) => m[1])
          .filter((p) => p.includes('/') && !p.startsWith('~') && !p.includes('*')),
      ),
    ].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(missing, `lab09 cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});
