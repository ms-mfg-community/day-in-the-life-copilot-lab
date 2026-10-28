import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 03 contract — the mechanical definition of done for `specs/labs/lab03.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 *
 * Helpers are deliberately inline rather than shared: a contract test is `git mv`-ed
 * between `pending/` and this directory when its lab's pass starts, and a relative
 * import would break on the move.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab03.md');
const SPEC = join(ROOT, 'specs/labs/lab03.md');

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

/** The table row whose first cell contains `needle`. */
function row(text: string, needle: string): string {
  const found = text.split('\n').find((l) => l.startsWith('|') && l.split('|')[1]?.includes(needle));
  expect(found, `no table row whose first cell contains "${needle}"`).toBeDefined();
  return found as string;
}

describe('lab03 contract: the spec exists and governs', () => {
  it('specs/labs/lab03.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });
});

describe('lab03 contract: AC4 — the documented invocation form is used', () => {
  const atForms: Array<[string, RegExp]> = [
    ['@dotnet-dev', /@dotnet-dev/],
    ['@<track>-dev', /@<track>-dev/],
    ['@agent-name', /@agent-name/],
  ];

  it.each(atForms)('the %s invocation form is gone', (_label, re) => {
    expect(lab()).not.toMatch(re);
  });

  it('§3.4 selects the agent with the documented --agent flag', () => {
    expect(section('3.4')).toMatch(/--agent\b/);
  });
});

describe('lab03 contract: AC5 — the takeaways name the real invocation', () => {
  it('the Invocation row names --agent or /agent', () => {
    const r = row(section('3.5'), 'Invocation');
    expect(r).toMatch(/--agent\b|(?<![\w./])\/agent\b/);
    expect(r).not.toMatch(/@agent-name/);
  });
});

describe('lab03 contract: AC6 — mcp-servers has the published shape', () => {
  it('mcp-servers is not an array of strings', () => {
    expect(lab()).not.toMatch(/mcp-servers:\s*\[/);
  });

  it('the lab still demonstrates the mcp-servers key', () => {
    expect(lab()).toContain('mcp-servers');
  });
});

describe('lab03 contract: AC7 — the repo-local MCP config is named', () => {
  it('§3.3 names this repository .copilot/mcp-config.json', () => {
    const sec = section('3.3');
    const repoLocal = sec
      .split('\n')
      .some((l) => /(?<!~\/)(?<!\w)\.copilot\/mcp-config\.json/.test(l) && !/~\/\.copilot/.test(l));
    expect(repoLocal, '§3.3 points only at the home-directory MCP config').toBe(true);
  });
});

describe('lab03 contract: AC8 — no unsourced suffix absolute', () => {
  it('drops the claim that a plain .md file will not be picked up', () => {
    expect(lab()).not.toMatch(/will not be picked up/i);
  });

  it('still recommends the .agent.md convention', () => {
    expect(lab()).toContain('.agent.md');
  });
});

describe('lab03 contract: AC9 — name is not sold as the invocation handle', () => {
  it('the frontmatter comment no longer says name is how users invoke', () => {
    expect(lab()).not.toMatch(/How users invoke/i);
  });
});

describe('lab03 contract: AC10 — the tools table survives intact', () => {
  it.each([['read'], ['edit'], ['execute'], ['search'], ['agent'], ['web']])(
    'the %s tool alias is still listed',
    (alias) => {
      expect(row(section('3.1'), `\`${alias}\``)).toBeDefined();
    },
  );
});
