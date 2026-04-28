import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const DOTNET_DIR = join(ROOT, 'labs', 'appendices', 'dotnet');
const NODE_DIR = join(ROOT, 'labs', 'appendices', 'node');
const REQUIRED_KEYS = ['title', 'lab_number', 'track'] as const;

function walkMd(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walkMd(p));
    else if (entry.endsWith('.md')) out.push(p);
  }
  return out;
}

describe('lab-structure: dotnet/node appendix parity', () => {
  it('labs/appendices/dotnet exists and is non-empty', () => {
    expect(existsSync(DOTNET_DIR)).toBe(true);
    expect(walkMd(DOTNET_DIR).length).toBeGreaterThan(0);
  });

  it('labs/appendices/node exists and is non-empty', () => {
    expect(existsSync(NODE_DIR)).toBe(true);
    expect(walkMd(NODE_DIR).length).toBeGreaterThan(0);
  });

  it('every dotnet appendix has a sibling node appendix at the same relative path', () => {
    const missing: string[] = [];
    for (const f of walkMd(DOTNET_DIR)) {
      const rel = relative(DOTNET_DIR, f);
      const sibling = join(NODE_DIR, rel);
      if (!existsSync(sibling)) missing.push(rel);
    }
    expect(missing, `missing node appendices:\n${missing.join('\n')}`).toEqual(
      [],
    );
  });

  it('every appendix has required frontmatter (title, lab_number, track)', () => {
    const violations: string[] = [];
    for (const f of [...walkMd(DOTNET_DIR), ...walkMd(NODE_DIR)]) {
      const parsed = matter(readFileSync(f, 'utf8'));
      if (!parsed.matter.length) {
        violations.push(`${relative(ROOT, f)} missing frontmatter`);
        continue;
      }
      for (const key of REQUIRED_KEYS) {
        if (parsed.data[key] === undefined) {
          violations.push(`${relative(ROOT, f)} missing key ${key}`);
        }
      }
    }
    expect(violations, violations.join('\n')).toEqual([]);
  });
});
