import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 18 contract — the mechanical definition of done for `specs/labs/lab18.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 *
 * AC9 is a REGRESSION FENCE. `gh` 2.83.1 has no stack subcommand (`gh stack` →
 * unknown command; `gh pr --help` lists none), so the lab's raw `gh api` call is
 * correct and must not be "modernized" into a command that does not exist.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab18.md');
const SPEC = join(ROOT, 'specs/labs/lab18.md');
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

function frontmatter(): Record<string, any> {
  const m = lab().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(m, 'lab18 has no YAML frontmatter block').not.toBeNull();
  return yaml.load((m as RegExpMatchArray)[1]) as Record<string, any>;
}

interface Registry {
  labs?: Record<string, { pace_self_minutes?: number }>;
}
const registry = (): Registry => yaml.load(readFileSync(REGISTRY, 'utf8')) as Registry;

describe('lab18 contract: the spec exists and governs', () => {
  it('specs/labs/lab18.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab18 contract: AC4 — every ## section is numbered 18.x, and uniquely', () => {
  it('no ## heading is unnumbered', () => {
    const unnumbered = headingsAt(2).filter((h) => !/^18\.\d+\b/.test(h));
    expect(unnumbered, `unnumbered ## heading(s): ${unnumbered.join(' | ')}`).toEqual([]);
  });

  it('no 18.x number is used twice', () => {
    const nums = headingsAt(2)
      .map((h) => h.match(/^18\.\d+/)?.[0])
      .filter((n): n is string => Boolean(n));
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect([...new Set(dupes)], `duplicate ## section number(s): ${dupes.join(', ')}`).toEqual([]);
  });
});

describe('lab18 contract: AC5 — every ContosoUniversity path the lab stages exists', () => {
  it('every backticked repo-relative path resolves on disk', () => {
    const candidates = [
      ...lab().matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|ps1|mjs|ts|sln|cs))`/g),
    ]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<') && p.includes('/'));

    const missing = [...new Set(candidates)].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(
      missing,
      `lab18 cites path(s) that do not exist: ${missing.join(', ')}. The solution is split ` +
        `into ContosoUniversity.Core / .Infrastructure / .Web — there is no ` +
        `dotnet/ContosoUniversity/ project and no CourseRepository.`,
    ).toEqual([]);
  });

  it('does not tell the learner to git add a non-existent Course.cs path', () => {
    expect(
      lab(),
      `Course.cs lives at dotnet/ContosoUniversity.Core/Models/Course.cs. A learner ` +
        `copy-pasting layer 1 of the stack gets "fatal: pathspec … did not match any files".`,
    ).not.toMatch(/dotnet\/ContosoUniversity\/Models\/Course\.cs/);
  });

  it('does not reference a CourseRepository that the solution does not contain', () => {
    expect(
      lab(),
      `The repo ships a generic Repository (ContosoUniversity.Infrastructure/Data/Repository.cs) ` +
        `behind IRepository. No CourseRepository exists.`,
    ).not.toMatch(/CourseRepository/);
  });
});

describe('lab18 contract: AC6 — the Stacks claims carry their source', () => {
  it('cites GitHub stacked-pull-request documentation by URL', () => {
    expect(
      lab(),
      `§18.3 asserts a product feature, UI affordances and a REST endpoint with no ` +
        `citation at all. The claims are true (verified against docs.github.com), which ` +
        `makes the omission worse: the one sentence that is wrong sits among correct ones.`,
    ).toMatch(/docs\.github\.com\/[^\s)]*stack/i);
  });
});

describe('lab18 contract: AC7 — cascading merge is described as the source describes it', () => {
  it('does not claim merging the bottom PR retargets the PR above it', () => {
    // Whitespace-normalized: the claim is line-wrapped mid-sentence in the lab.
    expect(
      section('18.3').replace(/\s+/g, ' '),
      `CONTRADICTED by docs.github.com: "When you merge a stacked pull request, every ` +
        `pull request in the stack up to and including the one you request is merged or ` +
        `queued to merge into the base branch… A stack merge request is atomic." ` +
        `That is a cascade of merges, not a retarget.`,
    ).not.toMatch(/automatically retargets the PR above it/i);
  });

  it('describes merging up to and including the requested PR', () => {
    expect(
      lab(),
      'state the documented semantics so a learner can plan a merge order correctly',
    ).toMatch(/up to and including/i);
  });
});

describe('lab18 contract: AC8 — the asynchronous merge requirement is stated', () => {
  it('notes that merging a stack via the API needs the async merge endpoint', () => {
    expect(
      lab(),
      `The cited source flags this as [!IMPORTANT]: "A stack cannot be merged with the ` +
        `legacy synchronous merge endpoints or mutations." The lab teaches API-driven ` +
        `stack creation and then merging, so this belongs in it.`,
    ).toMatch(/asynchronous|async merge/i);
  });
});

describe('lab18 contract: AC9 — no invented gh subcommand (regression fence)', () => {
  it('does not use a gh stack / gh pr stack command', () => {
    expect(
      lab(),
      `gh 2.83.1 has no stack subcommand: "gh stack" returns unknown command and ` +
        `"gh pr --help" lists none. The raw "gh api --method POST …/stacks" call is the ` +
        `only way to register a stack from gh today — do not replace it.`,
    ).not.toMatch(/\bgh\s+(?:pr\s+)?stacks?\b/);
  });

  it('still registers the stack through gh api', () => {
    expect(section('18.3'), 'the gh api call is correct and must survive the pass').toMatch(
      /gh api[\s\S]*stacks/,
    );
  });
});

describe('lab18 contract: AC10 — the lab says how to clean up what it creates on GitHub', () => {
  it('names the branches, PRs and stack a learner is left holding', () => {
    const body = lab();
    expect(
      body,
      `The lab leaves five remote branches, four open PRs, a registered stack and a ` +
        `generated PRD issue on the learner's fork, and never says so. docs/_partials/cleanup.md ` +
        `would not help — it sweeps local state, and every artifact here is remote.`,
    ).toMatch(/clean\s*-?\s*up|teardown|tear down/i);
    expect(body, 'the teardown must name the branch deletion').toMatch(
      /git push (?:origin )?--delete|gh pr close|delete the branch/i,
    );
  });
});

describe('lab18 contract: AC11 — pacing agrees across frontmatter, registry and callout', () => {
  it('self-paced minutes agree in all three places', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab18?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });

  it('presenter minutes agree between frontmatter and the callout', () => {
    const declared = frontmatter().pace?.presenter_minutes;
    expect(lab()).toMatch(new RegExp(`Presenter pace:\\s*${declared}\\s*minutes`));
  });
});
