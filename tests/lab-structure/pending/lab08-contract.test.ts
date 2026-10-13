import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 08 contract — the mechanical definition of done for `specs/labs/lab08.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 *
 * AC6 is withdrawn in place and its number is never reused. It asserted that the lab
 * manage COPILOT_GITHUB_TOKEN with one tool. Checking the installed extension showed
 * `gh aw secrets` has only `set` and `bootstrap` — there is no delete — so the lab's
 * `gh aw secrets set` / `gh secret delete` split is forced and correct. See
 * specs/labs/lab08.md §4 C1.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab08.md');
const SPEC = join(ROOT, 'specs/labs/lab08.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const PARTIAL = join(ROOT, 'docs/_partials/currency.md');
const WORKFLOWS = join(ROOT, '.github/workflows');

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
  expect(m, 'lab08 has no YAML frontmatter block').not.toBeNull();
  return yaml.load((m as RegExpMatchArray)[1]) as Record<string, any>;
}

/**
 * The shared partial's body: everything from its first blockquote line onward.
 * Defined this way because the partial's leading HTML comment itself contains
 * `-->` (it quotes the include markers), so a naive comment strip truncates it.
 */
const partialBody = (): string => {
  const ls = readFileSync(PARTIAL, 'utf8').replace(/\r\n/g, '\n').split('\n');
  return ls.slice(ls.findIndex((l) => l.startsWith('> '))).join('\n').trim();
};

/** The text the lab carries between the currency include markers. */
function includedCurrency(): string {
  const m = lab()
    .replace(/\r\n/g, '\n')
    .match(
      /<!--\s*@include docs\/_partials\/currency\.md[\s\S]*?-->\n([\s\S]*?)<!--\s*@end-include docs\/_partials\/currency\.md\s*-->/,
    );
  expect(m, 'lab08 must include docs/_partials/currency.md between its markers').not.toBeNull();
  return (m as RegExpMatchArray)[1].trim();
}

/** Every action name (owner/repo, pin stripped) that appears in a committed lock file. */
function lockedActionNames(): Set<string> {
  const out = new Set<string>();
  for (const f of readdirSync(WORKFLOWS).filter((n) => n.endsWith('.lock.yml'))) {
    const body = readFileSync(join(WORKFLOWS, f), 'utf8');
    for (const m of body.matchAll(/uses:\s*([A-Za-z0-9._/-]+)(?:@|\s|$)/g)) out.add(m[1]);
  }
  return out;
}

describe('lab08 contract: the spec exists and governs', () => {
  it('specs/labs/lab08.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab08 contract: AC5 — the two shells push the same branch', () => {
  it('no reference to the non-existent lab/day-in-the-life-copilot-lab branch', () => {
    expect(
      lab(),
      'labs/lab08.md:374 pushes from a ref that is not a branch in this repo; a PowerShell ' +
        'learner gets "src refspec ... does not match any"',
    ).not.toContain('lab/day-in-the-life-copilot-lab');
  });

  it('every git push origin <src>:<dst> uses the same source ref', () => {
    const srcs = new Set(
      [...lab().matchAll(/git push origin\s+([^\s:]+):([^\s`]+)/g)].map((m) => m[1]),
    );
    expect(
      [...srcs],
      `the Bash and PowerShell forms are presented as equivalent but push different source ` +
        `refs: ${[...srcs].join(', ')}`,
    ).toHaveLength(1);
  });
});

describe('lab08 contract: AC7 — §8.6 numbered steps are not swallowed by a code block', () => {
  it('no ordered-list item starts on the line after a closing fence', () => {
    const body = section('8.6').split('\n');
    let inFence = false;
    const offenders: string[] = [];
    for (let i = 0; i < body.length; i++) {
      const isFence = /^\s*(```|~~~)/.test(body[i]);
      if (isFence) {
        const closing = inFence;
        inFence = !inFence;
        if (closing && /^\d+\.\s/.test(body[i + 1] ?? '')) offenders.push(body[i + 1]);
      }
    }
    expect(
      offenders,
      'steps 6–8 belong to the main procedure but begin immediately after the closing fence ' +
        'of the "Alternatively, from your terminal" block, so they render as part of the ' +
        'alternative and the GUI learner never sees them',
    ).toEqual([]);
  });
});

describe('lab08 contract: AC8 — the illustrative compiled output names real actions', () => {
  it('the lock files actually declare actions — otherwise this check is vacuous', () => {
    expect(lockedActionNames().size).toBeGreaterThan(0);
  });

  it('every `uses:` in the lab names an action a committed .lock.yml also uses', () => {
    const known = lockedActionNames();
    const named = [...new Set([...lab().matchAll(/uses:\s*([A-Za-z0-9._/-]+)(?:@|\s|$)/g)].map((m) => m[1]))];
    const invented = named.filter((n) => !known.has(n));
    expect(
      invented,
      `lab08 shows "uses: ${invented.join(', ')}" as the compiled output, but no committed ` +
        `.github/workflows/*.lock.yml uses it. Real locks use: ${[...known].join(', ')}`,
    ).toEqual([]);
  });
});

describe('lab08 contract: AC9 — §8.3 pins the compiler before telling you to compile', () => {
  it('§8.3 names gh_aw_schema_version and links the registry', () => {
    const s = section('8.3');
    expect(
      s,
      'the registry warns that recompiling with a different version rewrites the committed ' +
        'locks, and gives the pin command; §8.3 tells the learner to compile without it',
    ).toContain('gh_aw_schema_version');
    expect(s).toContain('docs/_meta/registry.yaml');
  });
});

describe('lab08 contract: AC10 — the fork requirement is stated where it bites', () => {
  it('§8.4 says the work happens in a fork you own', () => {
    expect(
      section('8.4'),
      '§8.4 is the first section that writes to GitHub, and §8.6 pushes to origin. A learner ' +
        'in a clone of the upstream repo finds out at `git push`.',
    ).toMatch(/fork/i);
  });
});

describe('lab08 contract: AC11 — declared pacing is internally consistent', () => {
  // Consistency only — the spec's ~45-minute figure is an estimated guideline, not a
  // floor. Re-deriving the real duration is the teachability gate's job.
  it('frontmatter, the registry and the inline callout agree', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab08?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });
});

describe('lab08 contract: AC12 — the currency block is the partial, not a copy of it', () => {
  it('§8.0 is byte-identical to docs/_partials/currency.md', () => {
    expect(
      includedCurrency(),
      'the currency block is shared by 10 labs. If it is wrong, fix the partial and re-sync ' +
        'every consumer — never edit it inline here. See specs/labs/lab08.md §5.',
    ).toBe(partialBody());
  });
});
