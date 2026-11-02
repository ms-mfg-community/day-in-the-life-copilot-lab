import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 19 contract — the mechanical definition of done for `specs/labs/lab19.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 *
 * This is the lightest contract in batch 3 on purpose — Lab 19 is 148 lines, its
 * paths resolve and its framing is already good. Several assertions below are
 * REGRESSION FENCES protecting what the lab already gets right.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab19.md');
const SPEC = join(ROOT, 'specs/labs/lab19.md');
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

const prose = (): string =>
  lines()
    .filter((l) => !l.inFence)
    .map((l) => l.text)
    .join('\n');

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
  expect(m, 'lab19 has no YAML frontmatter block').not.toBeNull();
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

describe('lab19 contract: the spec exists and governs', () => {
  it('specs/labs/lab19.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab19 contract: AC4 — every ## section is numbered 19.x, and uniquely', () => {
  it('no ## heading is unnumbered', () => {
    const unnumbered = headingsAt(2).filter((h) => !/^19\.\d+\b/.test(h));
    expect(unnumbered, `unnumbered ## heading(s): ${unnumbered.join(' | ')}`).toEqual([]);
  });

  it('no 19.x number is used twice', () => {
    const nums = headingsAt(2)
      .map((h) => h.match(/^19\.\d+/)?.[0])
      .filter((n): n is string => Boolean(n));
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect([...new Set(dupes)], `duplicate ## section number(s): ${dupes.join(', ')}`).toEqual([]);
  });
});

describe('lab19 contract: AC5 — cross-references point at the right place', () => {
  it('every §19.x reference names a heading that exists', () => {
    const present = new Set(
      [...headingsAt(2), ...headingsAt(3)]
        .map((h) => h.match(/^(19\.\d+(?:\.\d+)?)/)?.[1])
        .filter((n): n is string => Boolean(n)),
    );
    const cited = [...new Set([...prose().matchAll(/§(19\.\d+(?:\.\d+)?)/g)].map((m) => m[1]))];
    const dangling = cited.filter((c) => !present.has(c));
    expect(dangling, `lab19 cites section(s) that do not exist: ${dangling.join(', ')}`).toEqual(
      [],
    );
  });

  it('attributes the "Portability config" block to the workflow file, not to §19.1', () => {
    expect(
      section('19.5'),
      `The Portability config block lives in .github/workflows/self-improving-agents.md, ` +
        `which §19.1 merely tells the learner to cat. A learner scrolling back to §19.1 ` +
        `to edit a config block finds prose instead.`,
    ).not.toMatch(/Portability config["'”]?\s*block\s+in\s+§19\.1/i);
  });

  it('still names the Portability config block somewhere', () => {
    expect(lab(), 'it is the mechanism that makes the workflow portable — keep it').toMatch(
      /Portability config/i,
    );
  });
});

describe('lab19 contract: AC6 — every cited path resolves', () => {
  it('every backticked repo-relative path resolves on disk', () => {
    const candidates = [
      ...lab().matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|ps1|mjs|ts|lock\.yml))`/g),
    ]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<') && p.includes('/'));

    const missing = [...new Set(candidates)].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(missing, `lab19 cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lab19 contract: AC8 — compiling rewrites a committed lock file', () => {
  it('§19.2 says the regenerated .lock.yml is a committed file', () => {
    expect(
      section('19.2'),
      `"gh aw compile self-improving-agents" rewrites ` +
        `.github/workflows/self-improving-agents.lock.yml, which is committed. The lab ` +
        `states the regeneration as an expected outcome but never says it dirties the ` +
        `working tree, nor whether to commit or discard it.`,
    ).toMatch(/commit|working tree|git status|discard/i);
  });
});

describe('lab19 contract: AC9 — the one remote write is marked and reversible', () => {
  it('§19.4 flags that triggering the workflow writes to GitHub', () => {
    expect(
      section('19.4'),
      `"gh workflow run self-improving-agents.lock.yml" triggers a real Actions run that ` +
        `opens a draft PR on the learner's repository. Every other write-heavy lab in the ` +
        `suite flags its writes; this one carries no marker at all.`,
    ).toMatch(/⚠️|writes to GitHub|opens a (?:draft )?(?:PR|pull request) on your/i);
  });

  it('the lab says how to clean up the draft PR and the schedule it leaves behind', () => {
    expect(
      lab(),
      `The lab leaves a draft PR open and a workflow that will keep running on its cron ` +
        `schedule in the learner's fork. Two or three lines is enough — do not adopt the ` +
        `cleanup partial (see specs/labs/lab19.md §5).`,
    ).toMatch(/clean\s*-?\s*up|teardown|tear down|close the (?:draft )?PR/i);
  });
});

describe('lab19 contract: AC10 — registry models (regression fence)', () => {
  it('every model identifier in lab19 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((lab().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab19 names model(s) absent from the registry: ${unknown.join(', ')}. The lab is ` +
        `currently model-free, which is why it cannot go stale — keep it that way.`,
    ).toEqual([]);
  });
});

describe('lab19 contract: the "not a GitHub product" framing survives (regression fence)', () => {
  it('still states plainly that this is not an official feature', () => {
    expect(
      lab(),
      `This is the lab's most valuable sentence and spec §4 C1 says keep it verbatim. ` +
        `A refresh that smooths it away makes the lab actively misleading.`,
    ).toMatch(/no GitHub product called/i);
  });

  it('still states the workflow may never edit itself', () => {
    expect(lab(), 'self-exclusion is the lab\'s safety argument').toMatch(
      /never let the workflow touch itself|edit itself|its own workflow file/i,
    );
  });
});

describe('lab19 contract: AC11 — pacing agrees across frontmatter, registry and callout', () => {
  it('self-paced minutes agree in all three places', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab19?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });

  it('presenter minutes agree between frontmatter and the callout', () => {
    const declared = frontmatter().pace?.presenter_minutes;
    expect(lab()).toMatch(new RegExp(`Presenter pace:\\s*${declared}\\s*minutes`));
  });
});
