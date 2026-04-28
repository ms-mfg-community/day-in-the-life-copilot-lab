import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const LABS_DIR = join(process.cwd(), 'labs');
const REQUIRED_KEYS = ['title', 'lab_number', 'pace'] as const;

function listLabFiles(): string[] {
  if (!existsSync(LABS_DIR)) return [];
  return readdirSync(LABS_DIR)
    .filter((f) => /^lab\d+\.md$/.test(f))
    .sort();
}

describe('lab-structure: labs have required frontmatter', () => {
  const labs = listLabFiles();

  it('discovers lab files', () => {
    expect(labs.length).toBeGreaterThan(0);
  });

  it.each(labs)('%s has YAML frontmatter with required keys', (lab) => {
    const raw = readFileSync(join(LABS_DIR, lab), 'utf8');
    const parsed = matter(raw);
    expect(
      parsed.matter.length,
      `${lab} is missing frontmatter block`,
    ).toBeGreaterThan(0);

    for (const key of REQUIRED_KEYS) {
      expect(
        parsed.data[key],
        `${lab} is missing frontmatter key "${key}"`,
      ).toBeDefined();
    }

    const expectedNumber = Number((lab.match(/^lab(\d+)/) ?? [])[1]);
    expect(
      parsed.data.lab_number,
      `${lab} lab_number should equal ${expectedNumber}`,
    ).toBe(expectedNumber);
  });
});
