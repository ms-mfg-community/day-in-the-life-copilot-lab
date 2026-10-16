import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 15 contract — the mechanical definition of done for `specs/labs/lab15.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and `tests/lab-structure/` when its lab's pass starts, and a
 * relative import would break on the move.
 *
 * AC5 is a REGRESSION FENCE, not a work item: Lab 13's pass owns the currency
 * partial and re-syncs this lab. It must already be green when Lab 15's pass
 * begins, and Lab 15's pass must keep it green without touching the block.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab15.md');
const SPEC = join(ROOT, 'specs/labs/lab15.md');
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

const headingsAt = (level: number): string[] =>
  lines()
    .filter((l) => headingLevel(l) === level)
    .map((l) => l.text.replace(/^#+\s+/, '').trim());

/** Body of a numbered section, up to the next heading of the same or higher level. */
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
  expect(m, 'lab15 has no YAML frontmatter block').not.toBeNull();
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

const partialBody = (): string => {
  const ls = readFileSync(PARTIAL, 'utf8').replace(/\r\n/g, '\n').split('\n');
  return ls
    .slice(ls.findIndex((l) => l.startsWith('> ')))
    .join('\n')
    .trim();
};

function includedCurrency(): string {
  const m = lab()
    .replace(/\r\n/g, '\n')
    .match(
      /<!--\s*@include docs\/_partials\/currency\.md[\s\S]*?-->\n([\s\S]*?)<!--\s*@end-include docs\/_partials\/currency\.md\s*-->/,
    );
  expect(m, 'lab15 must include docs/_partials/currency.md between its markers').not.toBeNull();
  return (m as RegExpMatchArray)[1].trim();
}

describe('lab15 contract: the spec exists and governs', () => {
  it('specs/labs/lab15.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab15 contract: AC4 — every ## section is numbered 15.x, and uniquely', () => {
  it('no ## heading is unnumbered', () => {
    const unnumbered = headingsAt(2).filter((h) => !/^15\.\d+\b/.test(h));
    expect(unnumbered, `unnumbered ## heading(s): ${unnumbered.join(' | ')}`).toEqual([]);
  });

  it('no 15.x number is used twice', () => {
    const nums = headingsAt(2)
      .map((h) => h.match(/^15\.\d+/)?.[0])
      .filter((n): n is string => Boolean(n));
    const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
    expect([...new Set(dupes)], `duplicate ## section number(s): ${dupes.join(', ')}`).toEqual([]);
  });
});

describe('lab15 contract: AC5 — the currency block is the partial, not a copy of it', () => {
  it('the included currency block is byte-identical to docs/_partials/currency.md', () => {
    expect(
      includedCurrency(),
      `lab15's LSP row has been reworded locally ("This lab is where you configure and ` +
        `observe it.") instead of carrying the partial's text. The partial is shared by ten ` +
        `labs and the markers say "do not edit inline". Lab 13's pass re-syncs this block; ` +
        `Lab 15's pass must not touch it. See specs/labs/lab15.md §5.`,
    ).toBe(partialBody());
  });
});

describe('lab15 contract: AC6 — the global installs are flagged and reversible', () => {
  it('§15.2 warns that the language-server installs are global', () => {
    expect(
      section('15.2'),
      `"dotnet tool install -g csharp-ls" and "npm install -g typescript-language-server" ` +
        `install onto the learner's machine, outside the repo, and the lab never says so.`,
    ).toMatch(/global/i);
  });

  it('the lab tells the learner how to remove both servers', () => {
    const body = lab();
    expect(body, 'a lab that installs globally must say how to uninstall').toMatch(
      /dotnet tool uninstall/,
    );
    expect(body, 'a lab that installs globally must say how to uninstall').toMatch(
      /npm uninstall -g/,
    );
  });
});

describe('lab15 contract: AC7 — the project-wide rename is guarded and undone', () => {
  it('§15.3 warns the rename edits committed source', () => {
    expect(
      section('15.3'),
      `The rename touches 58 occurrences of FirstMidName across committed C# source. ` +
        `The lab must say so before the learner runs it.`,
    ).toMatch(/commit(?:ted)?|revert|undo|restore/i);
  });

  it('the lab gives a named command that restores the dotnet tree', () => {
    expect(
      lab(),
      `Without a restore step, every later lab that touches dotnet/ runs against a ` +
        `mutated tree and git status is dirty for reasons the learner did not expect.`,
    ).toMatch(/git (?:restore|checkout)\s+(?:--\s+)?dotnet/);
  });

  it('does not ask for a call hierarchy on a type that does not exist', () => {
    expect(
      lab(),
      `There is no CourseRepository in the solution — it ships a generic Repository ` +
        `(dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs) behind IRepository. ` +
        `The LSP query returns nothing and the exercise appears to prove LSP is broken.`,
    ).not.toMatch(/CourseRepository/);
  });
});

describe('lab15 contract: AC8 — the real LSP configuration surface is named', () => {
  it('names the copilot lsp subcommand', () => {
    expect(lab(), '`copilot --help` lists: lsp  Inspect language server configuration').toMatch(
      /copilot lsp/,
    );
  });

  it('names the /lsp slash command', () => {
    expect(
      lab(),
      `"copilot help" lists "/lsp - Manage language server configuration". The lab ` +
        `currently hedges that the config surface is "versioned with your CLI build" ` +
        `rather than naming either real surface.`,
    ).toMatch(/\/lsp\b/);
  });
});

describe('lab15 contract: AC9/AC10 — registry models and cited paths', () => {
  it('every model identifier in lab15 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((lab().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab15 names model(s) absent from the registry: ${unknown.join(', ')}`,
    ).toEqual([]);
  });

  it('every backticked repo-relative path resolves on disk', () => {
    const candidates = [
      ...lab().matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|ps1|mjs|ts|sln|cs))`/g),
    ]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<') && p.includes('/'));

    const missing = [...new Set(candidates)].filter((rel) => !existsSync(join(ROOT, rel)));
    expect(missing, `lab15 cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('lab15 contract: AC11 — pacing agrees across frontmatter, registry and callout', () => {
  it('self-paced minutes agree in all three places', () => {
    const declared = frontmatter().pace?.self_paced_minutes;
    expect(registry().labs?.lab15?.pace_self_minutes, 'registry disagrees with frontmatter').toBe(
      declared,
    );
    expect(lab()).toMatch(new RegExp(`Self-paced:\\s*${declared}\\s*minutes`));
  });

  it('presenter minutes agree between frontmatter and the callout', () => {
    const declared = frontmatter().pace?.presenter_minutes;
    expect(lab()).toMatch(new RegExp(`Presenter pace:\\s*${declared}\\s*minutes`));
  });
});
