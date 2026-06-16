import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const ROOT = process.cwd();
const LABS_DIR = join(ROOT, 'labs');

const LINK_RE = /(?<!\!)\[[^\]]+\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function listMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));
}

function extractLinks(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  const links: string[] = [];
  for (const m of text.matchAll(LINK_RE)) {
    links.push(m[1]);
  }
  return links;
}

function isInternal(link: string): boolean {
  if (link.startsWith('http://') || link.startsWith('https://')) return false;
  if (link.startsWith('mailto:')) return false;
  if (link.startsWith('#')) return false;
  return true;
}

describe('lab-structure: internal links resolve to files on disk', () => {
  const labFiles = listMarkdown(LABS_DIR);

  it('discovers lab files', () => {
    expect(labFiles.length).toBeGreaterThan(0);
  });

  for (const file of labFiles) {
    it(`internal links in ${file.replace(ROOT + '/', '')} resolve`, () => {
      const broken: string[] = [];
      for (const link of extractLinks(file)) {
        if (!isInternal(link)) continue;
        const target = link.split('#')[0];
        if (!target) continue;
        const abs = resolve(dirname(file), target);
        if (!existsSync(abs)) {
          broken.push(`${link} -> ${abs}`);
        }
      }
      expect(broken, `broken internal links:\n${broken.join('\n')}`).toEqual([]);
    });
  }
});
