// The speaker script as content (specs/005-teaching-spa.md AC9, section 2.7, child 7).
//
//   - `#/script` is a route of its own in the one document, not a segment and not an anchor.
//   - The content plugin watches each segment's `scriptSource` already; it has to render it too, through the same
//     sanitised markdown pipeline as the slides, into `scriptHtml`, so the speaker surface shows the real script with no
//     fetch at run time and no prose copied into the source tree.
//
// What the scripts say is read from the scripts, at test time: the tests copy no curriculum prose.

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SCRIPT_HASH, hashFor, parseHash } from '../../workshop/spa/src/shell/router';
import { loadSegments, spaContentPlugin } from '../../workshop/spa/vite-content-plugin';
import { ac3Violations } from './helpers/html-scan';
import { ROOT } from './helpers/interaction-harness';

const VIRTUAL_ID = '\0virtual:spa-content';
const IDS = ['one', 'two', 'three'];

describe('the #/script route', () => {
  it('names the speaker surface as a route of its own', () => {
    expect(SCRIPT_HASH).toBe('#/script');
    expect(parseHash('#/script', IDS)).toEqual({ kind: 'script' });
  });

  it('is recognised whatever the deck holds, even a deck with no segments', () => {
    expect(parseHash('#/script', [])).toEqual({ kind: 'script' });
  });

  it('wins over a segment that happens to be called "script"', () => {
    expect(parseHash('#/script', ['one', 'script'])).toEqual({ kind: 'script' });
  });

  it('matches the decoded name exactly: no other spelling is the speaker surface', () => {
    for (const hash of ['#/Script', '#/scripts', '#/script/', '#/script?x=1', '#/ script', '#/script%20']) {
      expect(parseHash(hash, IDS), hash).toMatchObject({ kind: 'unknown' });
    }
    expect(parseHash('#/%73cript', IDS)).toEqual({ kind: 'script' });
  });

  it('leaves the segment, anchor and unknown routes as they were', () => {
    expect(parseHash('#/two', IDS)).toEqual({ kind: 'segment', id: 'two' });
    expect(parseHash('', IDS)).toEqual({ kind: 'segment', id: 'one' });
    expect(parseHash('#main', IDS)).toEqual({ kind: 'anchor' });
    expect(parseHash('#/nope', IDS)).toEqual({ kind: 'unknown', id: 'nope' });
    expect(parseHash('#/%E0%A4%A', IDS)).toMatchObject({ kind: 'unknown' });
    expect(hashFor('two')).toBe('#/two');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// scriptHtml from the real deck

interface DeckEntry {
  id: string;
  scriptSource: string;
}
const deck = (JSON.parse(readFileSync(path.join(ROOT, 'workshop/spa/content/deck.json'), 'utf8')) as { segments: DeckEntry[] }).segments;
const decode = (text: string): string => text.replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16))).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const textOf = (html: string): string => decode(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const scriptText = (entry: DeckEntry): string => readFileSync(path.join(ROOT, entry.scriptSource), 'utf8');
const body = (markdown: string): string => markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const headings = (markdown: string, level: 1 | 2): string[] =>
  body(markdown)
    .split(/\r?\n/)
    .filter((line) => line.startsWith(`${'#'.repeat(level)} `))
    .map((line) => line.slice(level + 1).trim());

describe('scriptHtml for the real deck', () => {
  const segments = loadSegments(ROOT);

  it('is there for every segment, in deck order', () => {
    expect(segments.map((s) => s.id)).toEqual(deck.map((d) => d.id));
    for (const segment of segments) {
      expect(typeof (segment as { scriptHtml?: unknown }).scriptHtml, segment.id).toBe('string');
      expect((segment as { scriptHtml: string }).scriptHtml.length, segment.id).toBeGreaterThan(200);
    }
  });

  it.each(deck.map((d) => [d.id, d] as const))('renders the script of %s, the one the deck names', (id, entry) => {
    const segment = segments.find((s) => s.id === id) as unknown as { scriptHtml: string; html: string };
    const markdown = scriptText(entry);
    const rendered = textOf(segment.scriptHtml);
    const [title] = headings(markdown, 1);
    expect(title, `${entry.scriptSource} has a top heading`).toBeTruthy();
    expect(rendered).toContain(decode(title));
    for (const heading of headings(markdown, 2)) expect(rendered, heading).toContain(decode(heading.replace(/[*_`]/g, '')));
    // It is the script and not the slide.
    expect(segment.scriptHtml).not.toBe(segment.html);
  });

  it('leaves the front matter out of the page', () => {
    const [{ scriptSource }] = deck;
    const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(readFileSync(path.join(ROOT, scriptSource), 'utf8'))?.[1] ?? '';
    const lines = front.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 8);
    expect(lines.length).toBeGreaterThan(0);
    const { scriptHtml } = segments[0] as unknown as { scriptHtml: string };
    for (const line of lines) expect(scriptHtml, line).not.toContain(line);
  });

  it('is sanitised by the same pipeline as the slides: nothing that runs, nothing that loads', () => {
    for (const segment of segments) expect(ac3Violations((segment as unknown as { scriptHtml: string }).scriptHtml), segment.id).toEqual([]);
  });

  it('still carries what it carried before: the slide html, the title, the minutes and the lab references', () => {
    for (const [index, segment] of segments.entries()) {
      expect(segment.id).toBe(deck[index].id);
      expect(segment.scriptSource).toBe(deck[index].scriptSource);
      expect(segment.html.length).toBeGreaterThan(200);
      expect(segment.title.length).toBeGreaterThan(0);
      expect(segment.minutes).toBeGreaterThan(0);
      expect(Array.isArray(segment.labRefs)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Fixtures: a deck of our own, so that the failures can be made on purpose

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

function repo(scripts: Record<string, string | null>): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'spa-sync-content-'));
  roots.push(root);
  for (const dir of ['workshop/spa/content', 'workshop/slides', 'workshop/speaker-scripts']) mkdirSync(path.join(root, dir), { recursive: true });
  const ids = Object.keys(scripts);
  writeFileSync(
    path.join(root, 'workshop/spa/content/deck.json'),
    JSON.stringify({ segments: ids.map((id) => ({ id, slideSource: `workshop/slides/${id}.md`, scriptSource: `workshop/speaker-scripts/${id}.md`, labRefs: [], minutes: 1 })) }),
  );
  for (const id of ids) {
    writeFileSync(path.join(root, `workshop/slides/${id}.md`), `---\ntitle: ${id.toUpperCase()}\n---\n# ${id}\n`);
    const script = scripts[id];
    if (script !== null) writeFileSync(path.join(root, `workshop/speaker-scripts/${id}.md`), script);
  }
  return root;
}

const HOSTILE = [
  '---',
  'title: front matter that must not show',
  '---',
  '# Speaker heading',
  '',
  'Say this <script>window.pwned = 1</script> first.',
  '',
  '<img src="x" onerror="window.pwned = 2">',
  '',
  '<iframe src="https://example.invalid/"></iframe>',
  '',
  '[click](javascript:window.pwned=3)',
  '',
  '## A second heading',
  '',
].join('\n');

describe('scriptHtml from a deck of our own', () => {
  it('renders the script through the sanitising pipeline', () => {
    const root = repo({ one: HOSTILE });
    const [segment] = loadSegments(root) as unknown as Array<{ scriptHtml: string }>;
    expect(ac3Violations(segment.scriptHtml)).toEqual([]);
    expect(segment.scriptHtml).not.toMatch(/<script|<iframe|onerror|javascript:/i);
    expect(textOf(segment.scriptHtml)).toContain('Speaker heading');
    expect(textOf(segment.scriptHtml)).toContain('A second heading');
    expect(segment.scriptHtml).not.toContain('front matter that must not show');
  });

  it('keeps the slide and the script apart: a script is never rewritten as a slide', () => {
    const root = repo({ one: '# Only the script says this\n' });
    const [segment] = loadSegments(root) as unknown as Array<{ html: string; scriptHtml: string }>;
    expect(segment.html).not.toContain('Only the script says this');
    expect(segment.scriptHtml).toContain('Only the script says this');
  });

  it('puts scriptHtml in the module the page imports, and the empty deck still builds the empty module', () => {
    const plugin = spaContentPlugin(repo({ one: '# One\n', two: '# Two\n' }));
    const load = plugin.load as unknown as (this: { addWatchFile(file: string): void }, id: string) => string;
    const text = load.call({ addWatchFile: () => undefined }, VIRTUAL_ID);
    const segments = JSON.parse(text.replace(/^export const segments = /, '').replace(/;$/, '')) as Array<{ id: string; scriptHtml: string }>;
    expect(segments.map((s) => s.id)).toEqual(['one', 'two']);
    expect(segments[0].scriptHtml).toContain('One');
    expect(segments[1].scriptHtml).toContain('Two');

    const empty = spaContentPlugin(repo({}));
    expect((empty.load as unknown as typeof load).call({ addWatchFile: () => undefined }, VIRTUAL_ID)).toBe('export const segments = [];');
  });

  it('fails the build, loudly, for a script that is not there, after the watch was registered so that adding it recovers', () => {
    const root = repo({ one: null });
    const watched: string[] = [];
    const plugin = spaContentPlugin(root);
    const load = plugin.load as unknown as (this: { addWatchFile(file: string): void }, id: string) => string;
    expect(() => load.call({ addWatchFile: (file) => watched.push(path.normalize(file)) }, VIRTUAL_ID)).toThrow(/ENOENT/);
    expect(watched).toContain(path.normalize(path.join(root, 'workshop/speaker-scripts/one.md')));
  });
});

describe('the declared shape of the module', () => {
  it('has scriptHtml in virtual-content.d.ts', () => {
    const declaration = readFileSync(path.join(ROOT, 'workshop/spa/src/virtual-content.d.ts'), 'utf8');
    expect(declaration).toMatch(/scriptHtml:\s*string/);
  });
});

/** The prose of a script: its lines, less the fenced code, which is code and may legitimately look like the source tree. */
function proseLines(markdown: string): string[] {
  let fenced = false;
  const prose: string[] = [];
  for (const raw of body(markdown).split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && line.length >= 60) prose.push(line);
  }
  return prose;
}

describe('no copied curriculum prose', () => {
  const srcDir = path.join(ROOT, 'workshop/spa/src');
  const sources: Array<{ file: string; text: string }> = [];
  for (const relative of readdirSync(srcDir, { recursive: true }) as string[]) {
    const file = path.join(srcDir, relative);
    if (/\.(ts|json)$/.test(relative) && statSync(file).isFile()) sources.push({ file: relative, text: readFileSync(file, 'utf8') });
  }
  sources.push({ file: 'index.html', text: readFileSync(path.join(ROOT, 'workshop/spa/index.html'), 'utf8') });

  it('looks at the whole source tree', () => {
    expect(sources.length).toBeGreaterThan(10);
  });

  it.each(deck.map((d) => [d.id, d] as const))('has no line of the %s script in the source tree', (_id, entry) => {
    const prose = proseLines(scriptText(entry));
    expect(prose.length).toBeGreaterThan(0);
    for (const line of prose) for (const source of sources) expect(source.text.includes(line), `${source.file} repeats: ${line.slice(0, 50)}`).toBe(false);
  });
});
