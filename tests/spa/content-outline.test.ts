// What the content plugin adds for the journey chrome (workshop/spa/src/shell/journey.ts; specs/005-teaching-spa.md 2.2, the
// no-drift rule): every segment's h2 sections by the ids the sanitizer gave them, its module code from the front matter, and the
// cover slide's title and tagline, all read from the curriculum files at build time and none of it copied into source.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { loadCover, loadSegments, outcomeOf, outlineOf } from '../../workshop/spa/vite-content-plugin';

const ROOT = process.cwd();

describe('the outline of a slide (outlineOf)', () => {
  it('lists every h2 by id with its text: tags dropped, character references resolved, other headings left out', () => {
    const html =
      '<h1 id="user-content-m9">M9</h1><h2 id="user-content-a-b">A <code>b</code> &#x26; c</h2><p>x</p>' +
      '<h2 id="user-content-d">D &lt;e&gt;</h2><h3 id="user-content-f">F</h3><h2>no id</h2>';
    expect(outlineOf(html)).toEqual([
      { id: 'user-content-a-b', title: 'A b & c' },
      { id: 'user-content-d', title: 'D <e>' },
    ]);
  });

  it('is empty for a slide without h2 sections', () => {
    expect(outlineOf('<h1 id="user-content-x">X</h1><p>y</p>')).toEqual([]);
  });
});

describe('the outcome of a module (outcomeOf)', () => {
  const curriculum = '## Modules\n\n### M1 — One (35 min)\n\n**Advanced outcome.** Can do *this*\nand `that`.\n\n**Anchor labs.** lab01.\n\n### M2 — Two\n\n**Advanced outcome.** Two.\n\n## After\n';
  it('renders the paragraph after the module heading, sanitized, and nothing for a module without one', () => {
    expect(outcomeOf(curriculum, 'M1')).toBe('<p>Can do <em>this</em> and <code>that</code>.</p>');
    expect(outcomeOf(curriculum, 'M2')).toBe('<p>Two.</p>');
    expect(outcomeOf(curriculum, 'M5b')).toBeUndefined();
  });
});

describe('the deck as the journey sees it', () => {
  const segments = loadSegments(ROOT);

  it('gives the six curriculum modules their advanced outcome', () => {
    for (const segment of segments) {
      if (/^M[1-6]$/.test(segment.module ?? '')) expect(segment.outcomeHtml, segment.id).toMatch(/^<p>.+<\/p>$/);
    }
  });

  it('gives every segment its module code and its sections, each section id present in the html', () => {
    for (const segment of segments) {
      expect(segment.module, segment.id).toMatch(/^M[0-9]+[a-z]*$/);
      expect(segment.sections.length, segment.id).toBeGreaterThan(1);
      for (const section of segment.sections) {
        expect(segment.html, `${segment.id}: ${section.id}`).toContain(`id="${section.id}"`);
        expect(section.title, `${segment.id}: ${section.id}`).not.toMatch(/<|&[a-z#]/);
      }
    }
  });

  it('reads the cover slide the deck names: its title, and its first h2 as the tagline', () => {
    const deck = JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/deck.json'), 'utf8')) as { cover?: string };
    expect(typeof deck.cover).toBe('string');
    const front = matter(readFileSync(path.join(ROOT, deck.cover as string), 'utf8')).data as { role?: unknown; title?: unknown };
    expect(front.role).toBe('cover');
    const cover = loadCover(ROOT);
    expect(cover).toEqual({ title: front.title, tagline: expect.any(String) });
    expect(cover?.tagline).not.toBe('');
  });
});
