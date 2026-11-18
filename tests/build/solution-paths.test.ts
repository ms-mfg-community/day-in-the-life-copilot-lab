import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const NEW_SLN = join(ROOT, 'dotnet', 'ContosoUniversity.sln');
const OLD_SLN = join(ROOT, 'ContosoUniversity.sln');

const NEW_PROJECT_DIRS = [
  'dotnet/ContosoUniversity.Core',
  'dotnet/ContosoUniversity.Infrastructure',
  'dotnet/ContosoUniversity.Web',
  'dotnet/ContosoUniversity.Tests',
  'dotnet/ContosoUniversity.PlaywrightTests',
];

const OLD_PROJECT_DIRS = [
  'ContosoUniversity.Core',
  'ContosoUniversity.Infrastructure',
  'ContosoUniversity.Web',
  'ContosoUniversity.Tests',
  'ContosoUniversity.PlaywrightTests',
];

describe('build: .NET solution lives under dotnet/', () => {
  it('dotnet/ContosoUniversity.sln exists', () => {
    expect(existsSync(NEW_SLN)).toBe(true);
  });

  it('top-level ContosoUniversity.sln no longer exists', () => {
    expect(existsSync(OLD_SLN)).toBe(false);
  });

  it.each(NEW_PROJECT_DIRS)('%s exists after the move', (dir) => {
    expect(existsSync(join(ROOT, dir))).toBe(true);
  });

  it.each(OLD_PROJECT_DIRS)('%s no longer exists at the repo root', (dir) => {
    expect(existsSync(join(ROOT, dir))).toBe(false);
  });

  it('dotnet sln list enumerates all 5 projects under dotnet/', () => {
    expect(existsSync(NEW_SLN)).toBe(true);
    const out = execSync(`dotnet sln "${NEW_SLN}" list`, {
      encoding: 'utf8',
      cwd: ROOT,
    });
    for (const dir of NEW_PROJECT_DIRS) {
      const projectName = dir.split('/').pop()!;
      expect(out).toContain(projectName);
    }
  });

  it('solution file does not reference parent-relative paths', () => {
    const txt = readFileSync(NEW_SLN, 'utf8');
    expect(txt).not.toMatch(/\.\.[\\/]ContosoUniversity\./);
  });
});

describe('build: shipped Copilot config cites the solution at its real path', () => {
  // Copilot sessions start at the repo root, where a bare `ContosoUniversity.sln` or
  // `ContosoUniversity.Web/` does not resolve.
  const SHIPPED = [
    '.github/copilot-instructions.md',
    '.github/agents/code-reviewer.agent.md',
    '.github/agents/planner.agent.md',
    '.github/skills/coding-standards/SKILL.md',
    '.github/skills/eval-harness/SKILL.md',
    '.github/skills/tdd-workflow/SKILL.md',
    '.github/skills/verification-loop/SKILL.md',
  ];
  const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');
  const linesMatching = (rel: string, re: RegExp): string[] =>
    read(rel).split(/\r?\n/).filter((l) => re.test(l));

  it.each(SHIPPED)('%s never names a bare ContosoUniversity.sln', (rel) => {
    expect(linesMatching(rel, /(?<![\w./-])ContosoUniversity\.sln\b/)).toEqual([]);
  });

  it.each(SHIPPED)('%s names no project directory without the dotnet/ prefix', (rel) => {
    const bareDir = /(?<![\w./-])ContosoUniversity\.(?:Core|Infrastructure|Web|Tests|PlaywrightTests)\//;
    expect(linesMatching(rel, bareDir)).toEqual([]);
  });

  it('copilot-instructions.md names the solution that exists, and not as "at the repo root"', () => {
    const body = read('.github/copilot-instructions.md');
    expect(body).toContain('dotnet/ContosoUniversity.sln');
    expect(body).not.toMatch(/at the repo root/i);
    expect(existsSync(NEW_SLN)).toBe(true);
  });

  describe('verification-loop skill', () => {
    const SKILL = '.github/skills/verification-loop/SKILL.md';
    const targets = (verb: 'build' | 'test' | 'list'): string[] =>
      [...read(SKILL).matchAll(new RegExp(`\\bdotnet\\s+${verb}\\s+("?)([^\\s"]+)\\1`, 'g'))]
        .map((m) => m[2])
        .filter((t) => !t.startsWith('-'));

    it.each(['build', 'test', 'list'] as const)('every `dotnet %s` target exists on disk', (verb) => {
      const found = targets(verb);
      expect(found.length, `expected at least one dotnet ${verb} command`).toBeGreaterThan(0);
      expect(found.filter((t) => !existsSync(join(ROOT, t)))).toEqual([]);
    });

    it('builds the solution', () => {
      expect(targets('build')).toContain('dotnet/ContosoUniversity.sln');
    });

    it('Phase 2 -warnaserror command excludes NuGet audit warnings (NU1901-NU1904) that belong to Phase 4', () => {
      const body = read(SKILL);
      expect(body).toMatch(/dotnet build dotnet\/ContosoUniversity\.sln -warnaserror -warnnotaserror:NU1901,NU1902,NU1903,NU1904/);
    });

    it('tests the unit/integration project, not the .sln (it also holds the Playwright E2E project)', () => {
      // The Makefile keeps E2E out of `test-all`: it needs browsers and a running web app,
      // so `dotnet test <sln>` would report a spurious failure in a verification loop.
      expect(targets('test').filter((t) => t.endsWith('.sln'))).toEqual([]);
    });
  });
});
