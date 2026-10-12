import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Lab 01 contract — the mechanical definition of done for `specs/labs/lab01.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 */

const ROOT = process.cwd();
const LAB = join(ROOT, 'labs/lab01.md');
const SPEC = join(ROOT, 'specs/labs/lab01.md');

const read = (p: string): string => readFileSync(p, 'utf8');
const lab = (): string => read(LAB);
const ls = (dir: string): string[] => readdirSync(join(ROOT, dir));

/** Text of one `## ` section, from its heading to the next `## ` heading. */
function section(headingStart: string): string {
  const lines = lab().split('\n');
  const from = lines.findIndex((l) => l.startsWith(`## ${headingStart}`));
  expect(from, `heading "## ${headingStart}" not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(from + 1);
  const len = rest.findIndex((l) => l.startsWith('## '));
  return rest.slice(0, len === -1 ? undefined : len).join('\n');
}

/** The table row whose first cell contains `needle`. */
function row(text: string, needle: string): string {
  const found = text.split('\n').find((l) => l.startsWith('|') && l.split('|')[1]?.includes(needle));
  expect(found, `no table row starting with "${needle}"`).toBeDefined();
  return found as string;
}

const leadingInt = (cell: string): number => Number((cell.trim().match(/^\d+/) ?? [])[0]);

describe('lab01 contract: the spec exists and governs', () => {
  it('specs/labs/lab01.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC)).toBe(true);
  });
});

describe('lab01 contract: AC5 — §1.1 counts equal the disk', () => {
  const map = (): string => section('1.1');
  const countOf = (needle: string): number => leadingInt(row(map(), needle).split('|')[3]);

  const mcpServers = Object.keys(JSON.parse(read(join(ROOT, '.copilot/mcp-config.json'))).mcpServers);
  const hookEvents = Object.keys(JSON.parse(read(join(ROOT, '.github/hooks/default.json'))).hooks);

  const cases: Array<[string, number]> = [
    ['.github/agents/', ls('.github/agents').filter((f) => f.endsWith('.agent.md')).length],
    ['.github/skills/', ls('.github/skills').length],
    ['.github/prompts/', ls('.github/prompts').filter((f) => f.endsWith('.prompt.md')).length],
    ['.github/instructions/', ls('.github/instructions').filter((f) => f.endsWith('.instructions.md')).length],
    ['.github/hooks/', hookEvents.length],
    ['.copilot/mcp-config.json', mcpServers.length],
    ['.github/workflows/*.md', ls('.github/workflows').filter((f) => f.endsWith('.md')).length],
  ];

  it.each(cases)('%s row states the on-disk count', (needle, onDisk) => {
    expect(onDisk, `${needle} has nothing on disk — the check would be vacuous`).toBeGreaterThan(0);
    expect(countOf(needle)).toBe(onDisk);
  });
});

describe('lab01 contract: AC6 — no priority ranking; sources are combined', () => {
  it('§1.2 table has no numbered rows and no "Priority" column', () => {
    const sec = section('1.2');
    const numbered = sec.split('\n').filter((l) => /^\|\s*[1-6]\s*\|/.test(l));
    expect(numbered, `numbered ranking rows: ${numbered.join(' / ')}`).toEqual([]);
    expect(sec).not.toMatch(/\|\s*Priority\s*\|/i);
  });

  it('§1.2 says the sources are combined and path files need an applyTo match', () => {
    const sec = section('1.2');
    expect(sec).toMatch(/combin/i);
    expect(sec).toMatch(/applyTo/);
    expect(sec).toMatch(/\.github\/instructions\//);
  });
});

describe('lab01 contract: AC7 — plugin worked example', () => {
  const installLines = (): string[] =>
    lab().split('\n').filter((l) => /copilot\s+plugin\s+install\s/.test(l) && !l.trimStart().startsWith('#'));

  it('no install command names github/awesome-copilot (it is a marketplace, not a plugin repo)', () => {
    const bad = installLines().filter((l) => l.includes('github/awesome-copilot'));
    expect(bad).toEqual([]);
  });

  it('the worked example installs awesome-copilot@awesome-copilot', () => {
    expect(installLines().some((l) => l.includes('awesome-copilot@awesome-copilot'))).toBe(true);
  });
});

describe('lab01 contract: AC8 — no /plugin-name invocation form', () => {
  it('lab does not teach invoking a plugin as /plugin-name', () => {
    expect(lab()).not.toMatch(/\/plugin-name/);
  });
});

describe('lab01 contract: AC9 — CLI table rows', () => {
  const table = (): string => section('1.0a');

  it('plan/autopilot row names /autopilot', () => {
    expect(row(table(), 'Plan mode vs autopilot mode')).toContain('/autopilot');
  });

  it('/model row does not claim a tier argument and still points at the registry', () => {
    const r = row(table(), 'Mid-session model switch');
    expect(r).toContain('/model');
    expect(r).not.toMatch(/tier-or-id/);
    expect(r).toMatch(/registry|models\./);
  });
});

describe('lab01 contract: AC10 — setup prerequisite is stated up front', () => {
  it('links setup.md before the first ## heading', () => {
    const body = lab().replace(/^---\n[\s\S]*?\n---\n/, '');
    const head = body.slice(0, body.search(/^## /m));
    expect(head).toMatch(/\]\((?:\.\/)?setup\.md\)/);
  });
});

describe('lab01 contract: AC11 — code-intelligence claims', () => {
  it('§1.3 no longer says "(GA)" or "(seconds)" and still names both LSP config paths', () => {
    const sec = section('1.3');
    expect(sec).toContain('.github/lsp.json');
    expect(sec).toContain('~/.copilot/lsp-config.json');
    expect(sec).not.toMatch(/\(GA\)/);
    expect(sec).not.toMatch(/\(seconds\)/i);
  });
});
