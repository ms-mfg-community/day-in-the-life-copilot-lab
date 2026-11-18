import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 12 contract — the mechanical definition of done for `specs/labs/lab12.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab12.md');
const SPEC = join(ROOT, 'specs/labs/lab12.md');
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
const registryRaw = (): string => readFileSync(REGISTRY, 'utf8');

function frontmatter(): Record<string, any> {
  const m = lab().match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(m, 'lab12 has no YAML frontmatter block').not.toBeNull();
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
  expect(m, 'lab12 must include docs/_partials/currency.md between its markers').not.toBeNull();
  return (m as RegExpMatchArray)[1].trim();
}

/** Headings at a given level, outside code fences, excluding the H1 title. */
const headingsAt = (level: number): string[] =>
  lines()
    .filter((l) => headingLevel(l) === level)
    .map((l) => l.text.replace(/^#+\s+/, '').trim());

describe('lab12 contract: the spec exists and governs', () => {
  it('specs/labs/lab12.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab12 contract: AC4 — every ## section is numbered, and uniquely', () => {
  it('no ## heading is unnumbered', () => {
    const unnumbered = headingsAt(2).filter((h) => !/^12\.\d+\b/.test(h));
    expect(
      unnumbered,
      `lab12 is the only lab whose currency section is unnumbered, and the file skips 12.3 ` +
        `and 12.4 entirely (12.2 → Part A → Part B → 12.5). Unnumbered: ${unnumbered.join(' | ')}`,
    ).toEqual([]);
  });

  it('no two ## headings share a number', () => {
    const nums = headingsAt(2)
      .map((h) => h.match(/^(12\.\d+)/)?.[1])
      .filter((n): n is string => Boolean(n));
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect(dupes, `duplicate ## section numbers: ${dupes.join(', ')}`).toEqual([]);
  });
});

describe('lab12 contract: AC5 — every ### section is numbered, and uniquely', () => {
  it('no ### heading is unnumbered', () => {
    const unnumbered = headingsAt(3).filter((h) => !/^(?:[AB]\.\d+|12\.\d+\.\d+)\b/.test(h));
    expect(unnumbered, `unnumbered ### heading(s): ${unnumbered.join(' | ')}`).toEqual([]);
  });

  it('no two ### headings share a number', () => {
    const nums = headingsAt(3)
      .map((h) => h.match(/^((?:[AB]\.\d+|12\.\d+\.\d+))/)?.[1])
      .filter((n): n is string => Boolean(n));
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect(
      dupes,
      `two sections share a number: ${dupes.join(', ')}. "A.3 Live Fabric" and "A.3 (Offline ` +
        `path)" are both A.3, and §A.1/§A.2 cross-reference "A.3" ambiguously.`,
    ).toEqual([]);
  });
});

describe('lab12 contract: AC6 — cited paths resolve', () => {
  // `.vscode/settings.json` and `.vscode/mcp.json` are files the LEARNER creates in
  // their own checkout; they are not repo artifacts. See specs/labs/lab12.md §5.
  const LEARNER_CREATED = new Set(['.vscode/settings.json', '.vscode/mcp.json']);

  it('every backticked repo-relative path exists on disk', () => {
    const re = /`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|mjs|ts|py|ipynb|parquet))`/g;
    const missing = [
      ...new Set(
        [...lab().matchAll(re)]
          .map((m) => m[1])
          .filter(
            (p) =>
              p.includes('/') &&
              !p.startsWith('~') &&
              !p.includes('*') &&
              !LEARNER_CREATED.has(p),
          ),
      ),
    ].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(
      missing,
      `lab12 cites path(s) that do not exist: ${missing.join(', ')}. §B.2 step 1 tells every ` +
        `Live-path learner to open a notebook that was never committed.`,
    ).toEqual([]);
  });
});

describe('lab12 contract: AC7 — no unsourced Fabric throttling numbers', () => {
  const CLAIMS: [string, RegExp][] = [
    ['a requests-per-minute rate limit', /\d+\s*requests?\s*(?:\/|per\s+)minute/i],
    ['an exponential back-off schedule', /capped at\s*\d+\s*s\b/i],
  ];

  for (const [what, re] of CLAIMS) {
    it(`states no ${what} it does not source`, () => {
      const hit = lab().match(re);
      expect(
        hit?.[0] ?? null,
        `lab12 asserts ${what} with no citation: "${hit?.[0]}". Keep the shape — 429s happen, ` +
          `the server honours Retry-After, prefer one wide query to fifty narrow ones — and ` +
          `drop the number. See specs/labs/lab12.md §4 C2.`,
      ).toBeNull();
    });
  }
});

describe('lab12 contract: AC8 — no dangling citation to the registry', () => {
  it('does not claim the registry documents Fabric runtime versions unless it does', () => {
    const claims = /runtime\s+versions\s+are\s+documented\s+in\s+the\s+registry/i.test(lab());
    const registryHasRuntimeKey = /^\s*\w*runtime\w*\s*:/m.test(registryRaw());
    expect(
      !claims || registryHasRuntimeKey,
      'labs/lab12.md:505 says "Fabric\'s runtime versions are documented in the registry", but ' +
        'docs/_meta/registry.yaml contains no runtime key. Same defect class as lab10 D2.',
    ).toBe(true);
  });
});

describe('lab12 contract: AC9 — no development branch in a learner prerequisite', () => {
  it('does not instruct the learner to check out feature/modernize', () => {
    expect(
      lab(),
      '§12.1 lists `feature/modernize` as a prerequisite checkout. The branch exists, so this ' +
        'is not false — but a development branch has no place in a learner prerequisite, and ' +
        'it will rot. `main` is the answer.',
    ).not.toContain('feature/modernize');
  });
});

describe('lab12 contract: AC12 — declared pacing is internally consistent', () => {
  // Consistency only — the spec's ~75-minute figure is an estimated guideline, not a
  // floor. Re-deriving the real duration is the teachability gate's job.
  it('frontmatter, the registry and the inline callout agree', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab12?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });
});

describe('lab12 contract: AC13 — the currency block is the partial, not a copy of it', () => {
  it('the included currency block is byte-identical to docs/_partials/currency.md', () => {
    expect(
      includedCurrency(),
      'the currency block is shared by 10 labs. If it is wrong, fix the partial and re-sync ' +
        'every consumer — never edit it inline here. See specs/labs/lab12.md §5.',
    ).toBe(partialBody());
  });
});

describe('lab12 contract: AC14 — §12.2 is honest about overwriting the committed fixture', () => {
  it('warns that regenerating overwrites labs/fixtures/lab12/sales.parquet', () => {
    expect(
      section('12.2'),
      '§12.2 tells every learner — including Live-path ones — to run a heredoc that writes ' +
        'labs/fixtures/lab12/sales.parquet, a COMMITTED file pinned by ' +
        'tests/lab-structure/lab12-fixture-exists.test.ts, and never says so.',
    ).toMatch(/overwrit/i);
  });
});
