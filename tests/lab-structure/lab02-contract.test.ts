import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 02 contract — the mechanical definition of done for `specs/labs/lab02.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab02.md');
const SPEC = join(ROOT, 'specs/labs/lab02.md');

const lab = (): string => readFileSync(LAB, 'utf8');

type Line = { text: string; inFence: boolean };

/**
 * Lab 02 pastes Markdown the learner copies, so `## ContosoUniversity Conventions`
 * and `### ADR-001` appear *inside* fenced blocks. Section slicing has to ignore those
 * or it cuts a section short at a heading that is really sample content.
 */
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

/** Text of one numbered section, stopping at the next heading of the same or higher level. */
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
 * The `/instructions` slash command, never the `.github/instructions/` path.
 * Without the lookbehind this check passes on the unedited lab, which already
 * contains `ls -1 .github/instructions/*.instructions.md`.
 */
const SLASH_INSTRUCTIONS = /(?<![\w./])\/instructions\b/;

describe('lab02 contract: the spec exists and governs', () => {
  it('specs/labs/lab02.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });

  it('the section parser ignores headings inside fenced sample Markdown', () => {
    expect(section('2.1')).toContain('## ContosoUniversity Conventions');
    expect(section('2.3')).toContain('### ADR-001');
  });
});

describe('lab02 contract: AC4 — References name the CLI doc', () => {
  it('links the Copilot CLI custom-instructions doc, not only the github.com one', () => {
    expect(lab()).toContain('copilot-cli/customize-copilot/add-custom-instructions');
  });
});

describe('lab02 contract: AC5 — the research citation points at the real paper', () => {
  it('arXiv 2506.17056 appears nowhere (it is a superconductivity paper)', () => {
    expect(lab()).not.toMatch(/2506\.17056/);
  });

  it('cites arXiv 2602.11988 and names it', () => {
    expect(lab()).toMatch(/2602\.11988/);
    expect(lab()).toMatch(/Evaluating AGENTS\.md/i);
  });
});

describe('lab02 contract: AC6 — the research callout matches its source', () => {
  const research = (): string => section('2.3');

  it('states the abstract\'s cost finding: inference cost over 20% on average', () => {
    expect(research()).toMatch(/over\s+20\s*%/i);
  });

  it('does not carry the invented 14-22% reasoning-token range', () => {
    expect(research()).not.toMatch(/14\s*[-\u2013\u2014]\s*22\s*%/);
  });

  it('does not carry the unsupported "nearly 100% redundant" figure', () => {
    expect(research()).not.toMatch(/nearly\s+100\s*%/i);
  });

  it('keeps the finding that it held for developer-committed files too', () => {
    expect(research()).toMatch(/developer-(committed|written|authored)/i);
  });

  it('names repository overviews as the unhelpful part, per the abstract', () => {
    expect(research()).toMatch(/overview/i);
  });
});

describe('lab02 contract: AC7 — /instructions is the deterministic check', () => {
  it('§2.2.3 names the /instructions command', () => {
    expect(section('2.2.3')).toMatch(SLASH_INSTRUCTIONS);
  });

  it('the model probe is no longer crowned the authoritative test', () => {
    expect(lab()).not.toMatch(/functional probe above is the authoritative test/i);
  });
});

describe('lab02 contract: AC8 — restart callout names both documented remedies', () => {
  it('§2.1 names /new and copilot --continue', () => {
    const sec = section('2.1');
    expect(sec).toMatch(/(?<![\w./])\/new\b/);
    expect(sec).toMatch(/--continue\b/);
  });
});

describe('lab02 contract: AC9 — setup prerequisite is stated up front', () => {
  it('links setup.md before the first ## heading', () => {
    const body = lab().replace(/^---\n[\s\S]*?\n---\n/, '');
    const head = body.slice(0, body.search(/^## /m));
    expect(head).toMatch(/\]\((?:\.\/)?setup\.md\)/);
  });
});

describe('lab02 contract: AC10 — sources are combined, not ranked', () => {
  it('§2.2 says Copilot combines the applicable instruction files', () => {
    expect(section('2.2')).toMatch(/combin/i);
  });

  it('§2.2 still names all three files that apply to a .cshtml edit', () => {
    const sec = section('2.2');
    for (const f of ['copilot-instructions.md', 'AGENTS.md', 'razor-views.instructions.md']) {
      expect(sec, `cascade callout no longer names ${f}`).toContain(f);
    }
  });

  it('the lab introduces no numbered precedence ranking for instruction sources', () => {
    expect(lab()).not.toMatch(/\|\s*Priority\s*\|/i);
  });
});
