import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 04 contract — the mechanical definition of done for `specs/labs/lab04.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab04.md');
const SPEC = join(ROOT, 'specs/labs/lab04.md');

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

/**
 * A slash command / slash-invoked name, never a path segment. Without the lookbehind,
 * `/create-dotnet-test` matches the solutions path
 * `solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md`, and `/skills`
 * matches `.github/skills/` — both would pass on the unedited lab.
 */
const slash = (name: string): RegExp => new RegExp(`(?<![\\w./])/${name}`);

describe('lab04 contract: the spec exists and governs', () => {
  it('specs/labs/lab04.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });
});

describe('lab04 contract: AC4 — prompt files are invoked with a forward slash', () => {
  const atForms: Array<[string, RegExp]> = [
    ['@prompt-name', /@prompt-name/],
    ['@create-dotnet-test', /@create-dotnet-test/],
    ['@create-node-test', /@create-node-test/],
    ['@create-<track>-test', /@create-<track>-test/],
    ['`@name`', /`@name`/],
  ];

  it.each(atForms)('the %s invocation form is gone', (_label, re) => {
    expect(lab()).not.toMatch(re);
  });

  it('the corrected /create-dotnet-test form is present as a command, not a path', () => {
    expect(lab()).toMatch(slash('create-dotnet-test'));
  });
});

describe('lab04 contract: AC5 — one Skills vs Prompts callout, not two', () => {
  it('the callout appears exactly once', () => {
    const hits = lab().match(/Skills vs Prompts/g) ?? [];
    expect(hits.length, `found ${hits.length} copies of the callout`).toBe(1);
  });
});

describe('lab04 contract: AC6 — skills can also be named explicitly', () => {
  it('§4.1 drops the claim that skills cannot be invoked', () => {
    expect(section('4.1')).not.toMatch(/you\s+don.{0,2}t\s+invoke\s+them/i);
  });

  it('§4.1 names the documented forward-slash form', () => {
    expect(section('4.1')).toMatch(/forward slash|\/skill-name/i);
  });
});

describe('lab04 contract: AC7 — the command skill runs inside the CLI session', () => {
  it('§4.4 contains no @-prefixed prompt invocation', () => {
    expect(section('4.4')).not.toMatch(/@create-/);
  });

  it('§4.4 runs /create-dotnet-test as a command and no longer sends the learner to an IDE for it', () => {
    const sec = section('4.4');
    expect(sec).toMatch(slash('create-dotnet-test'));
    expect(sec).not.toMatch(/in your IDE|not the terminal/i);
  });

  it('the lab still records that prompt files are IDE-only', () => {
    expect(lab()).toMatch(/IDE-only|only available in VS Code/i);
  });
});

describe('lab04 contract: AC8 — no unsourced description limit', () => {
  it('the "max 1024 chars" claim is gone', () => {
    expect(lab()).not.toMatch(/1024/);
  });
});

describe('lab04 contract: AC9 — §4.2 is honest that the skill already ships', () => {
  it('§4.2 says the dotnet-testing skill already exists / is overwritten', () => {
    expect(section('4.2')).toMatch(/already (ships|exists)|ships with|overwrit|replaces/i);
  });
});

describe('lab04 contract: AC10 — a deterministic skills check is named', () => {
  it('the lab names /skills list or /skills info', () => {
    expect(lab()).toMatch(/(?<![\w./])\/skills\s+(list|info)\b/);
  });
});
