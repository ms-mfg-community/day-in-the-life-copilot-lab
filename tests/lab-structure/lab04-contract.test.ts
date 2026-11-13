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
 * `solutions/lab04-skill-and-prompt/create-dotnet-test/SKILL.md`, and `/skills`
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

describe('lab04 contract: AC11 — a "Spot the Anti-Pattern" callout covers broad descriptions and uninvocable syntax', () => {
  const TITLE = '🚫 Spot the Anti-Pattern: Overly Broad Skill Descriptions & Uninvocable Syntax';
  const EXEMPLAR = '.github/skills/commit/SKILL.md';
  const text = (): string => lab().replace(/\r\n/g, '\n');

  /** The contiguous `>` blockquote that holds the title, `> ` prefixes removed. */
  const callout = (): string => {
    const all = text().split('\n');
    const at = all.findIndex((l) => l.startsWith('>') && l.includes(TITLE));
    expect(at, `no blockquote callout titled "${TITLE}"`).toBeGreaterThanOrEqual(0);
    let to = at;
    while (to + 1 < all.length && all[to + 1].startsWith('>')) to++;
    return all
      .slice(at, to + 1)
      .map((l) => l.replace(/^>\s?/, ''))
      .join('\n');
  };

  it('is a blockquote callout with the exact title', () => {
    expect(text()).toMatch(new RegExp(`^> \\*\\*${TITLE}\\*\\*`, 'm'));
  });

  it('shows why a vague description causes false-positive activation and context bloat', () => {
    const c = callout();
    expect(c).toMatch(/description/i);
    expect(c).toMatch(/broad|vague/i);
    expect(c).toMatch(/context/i);
    expect(c).toMatch(/activat/i);
  });

  it('names both uninvocable-syntax traps: IDE-only ${input:...} placeholders and ADD: commit prefixes', () => {
    const c = callout();
    expect(c).toContain('${input:');
    expect(c).toContain('ADD:');
    expect(c).toMatch(/IDE|VS Code/);
    expect(c, 'does not name the repo commit rule the ADD: prefix contradicts').toContain('<type>: <description>');
  });

  it('points at the clean exemplar, and the exemplar really is clean', () => {
    expect(callout()).toContain(EXEMPLAR);
    const skill = readFileSync(join(ROOT, EXEMPLAR), 'utf8');
    expect(skill, 'the commit skill still uses IDE-only ${input:...}').not.toContain('${input:');
    expect(skill, 'the commit skill still uses ADD:/UP:/DEL: prefixes').not.toMatch(/\b(ADD|UP|DEL):/);
  });

  it('links the exemplar with a path that resolves from labs/', () => {
    expect(text()).toContain(`](../${EXEMPLAR})`);
    expect(existsSync(join(ROOT, 'labs', '..', EXEMPLAR))).toBe(true);
  });
});

describe('lab04 contract: AC12 — §4.4 carries a Debug It callout: was the skill loaded, matched or skipped?', () => {
  const DEBUG_TITLE = '🔍 Debug It (VS Code & Copilot CLI)';
  const callouts = (body: string): string[] => {
    const all = body.replace(/\r\n/g, '\n').split('\n');
    const out: string[] = [];
    all.forEach((l, i) => {
      if (!l.startsWith(`> **${DEBUG_TITLE}**`)) return;
      let to = i;
      while (to + 1 < all.length && all[to + 1].startsWith('>')) to++;
      out.push(all.slice(i, to + 1).map((x) => x.replace(/^>\s?/, '')).join('\n'));
    });
    return out;
  };
  const callout = (): string => callouts(section('4.4'))[0] ?? '';

  it('has exactly one such callout in the lab, and it sits in §4.4, next to the /skills list check', () => {
    expect(callouts(lab()).length).toBe(1);
    expect(callouts(section('4.4')).length, 'the callout is not inside §4.4').toBe(1);
  });

  it('keeps it apart from the anti-pattern callout in §4.3 (separate blockquotes, separate sections)', () => {
    expect(section('4.3')).toContain('Spot the Anti-Pattern');
    expect(section('4.3')).not.toContain('Debug It');
  });

  it('uses /skills list and /env to see what was discovered, and /context with per-skill usage tied to experimental mode', () => {
    expect(callout()).toContain('`/skills list`');
    expect(callout()).toContain('`/env`');
    expect(callout()).toContain('`/context`');
    expect(callout()).toMatch(/experimental/i);
    expect(callout()).toMatch(/inside (?:the same|a running) `copilot` session|in the same `copilot` session/);
  });

  it('separates a skill that was loaded from one the model used, and a command skill from a knowledge skill', () => {
    expect(callout()).toMatch(/description/i);
    expect(callout()).toContain('disable-model-invocation');
  });

  it('names the VS Code route: Discovery events (loaded, skipped or rejected) in the Logs view of Show Agent Debug Logs', () => {
    expect(callout()).toContain('Show Agent Debug Logs');
    expect(callout()).toContain('Logs view');
    expect(callout()).toContain('Discovery');
    expect(callout()).toMatch(/loaded, skipped or rejected/);
  });

  it('links the guide, and never repeats the Skills vs Prompts phrase (AC5)', () => {
    expect(callout()).toContain('debugging-and-observability.md');
    expect(lab().match(/Skills vs Prompts/g)?.length).toBe(1);
  });
});

describe('lab04 contract: spec alignment — specs/labs/lab04.md records the Phase 4 criterion', () => {
  it('has AC12 observed by this contract test', () => {
    expect(readFileSync(SPEC, 'utf8')).toMatch(/^\|\s*AC12\s*\|[^\n]*lab04-contract/m);
  });
});
