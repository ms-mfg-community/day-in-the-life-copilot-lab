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
