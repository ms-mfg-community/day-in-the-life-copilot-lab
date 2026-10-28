// Build-time content: reads deck.json (SPA-01) and renders each segment's slide markdown, and its speaker script, through the
// SPA-02 pipeline. Runs in Node, so gray-matter's need for Buffer never reaches the browser, and no curriculum prose is copied
// into source.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { createRenderer } from './src/content/markdown';
import { rewriteSlideLinks } from './src/content/slide-links';
import { SCRIPT_HASH, SCRIPT_NAME } from './src/shell/router';

const VIRTUAL_ID = 'virtual:spa-content';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const DECK_PATH = 'workshop/spa/content/deck.json';
const CURRICULUM_PATH = 'workshop/curriculum.md';

/**
 * The curriculum's "Advanced outcome" paragraph of a module, by its code: the paragraph that follows the module's `### M<code>`
 * heading and opens with the bold words. Rendered through the same sanitizing pipeline as a slide, so it is HTML the shell may
 * put in the page; `undefined` for a module the curriculum has no entry for (M5b and M5c today).
 */
export function outcomeOf(curriculum: string, moduleCode: string): string | undefined {
  const heading = new RegExp(`^### ${moduleCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^\n]*\n([\\s\\S]*?)(?=^### |\n## )`, 'm');
  const section = heading.exec(curriculum)?.[1];
  const paragraph = section === undefined ? undefined : /\*\*Advanced outcome\.\*\*\s*([\s\S]*?)(?:\n\s*\n|$)/.exec(section)?.[1];
  if (paragraph === undefined) return undefined;
  const { html } = createRenderer()(paragraph.replace(/\s+/g, ' ').trim());
  return html;
}

interface DeckSegment {
  id: string;
  slideSource: string;
  scriptSource: string;
  labRefs: string[];
  minutes: number;
}

interface Deck {
  segments: DeckSegment[];
  /** The cover slide (`role: cover`): not a segment, but where the shell's own header takes the workshop's title and tagline from. */
  cover?: string;
}

/** One h2 section of a slide: the outline the shell shows beside the slide and in the agenda. */
export interface Section {
  id: string;
  title: string;
}

/** What the shell's header says about the workshop, read from the cover slide and written into index.html at build time. */
export interface Cover {
  title: string;
  /** The cover's first h2, as text: "Four hours. Copilot CLI only. No primer content." */
  tagline: string;
}

/**
 * `#/script` is the speaker surface, and the router recognises it before it looks in the deck (parseHash), so the link of a
 * segment called "script" would open the speaker script and the segment could never be shown. That is found out here, when the
 * deck is read, and not in front of an audience: every such segment is named, by its place in the manifest, and the build fails.
 * Nothing but that exact id is reserved: the router matches the decoded name exactly, so `Script` or `script-notes` are segments.
 */
function rejectReservedIds(segments: readonly DeckSegment[]): void {
  const where = segments.flatMap((segment, index) => (segment.id === SCRIPT_NAME ? [`segments[${index}]`] : []));
  if (where.length === 0) return;
  throw new Error(
    `${DECK_PATH}: ${where.join(', ')} ${where.length === 1 ? 'has' : 'have'} the id "${SCRIPT_NAME}", which is reserved: ` +
      `${SCRIPT_HASH} is the speaker script, so a segment of that name could never be reached. Give it another id.`,
  );
}

function readDeck(repoRoot: string): Deck {
  const deck = JSON.parse(readFileSync(path.join(repoRoot, DECK_PATH), 'utf8')) as Deck;
  // After the manifest has been read, and so after load() has already asked for it to be watched: renaming the segment recovers.
  rejectReservedIds(deck.segments);
  return deck;
}

const NAMED_REFERENCES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** The text of a fragment of the pipeline's HTML: tags dropped, the character references rehype-stringify writes resolved. */
function textOfHtml(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole: string, entity: string) => {
      if (entity[0] !== '#') return NAMED_REFERENCES[entity.toLowerCase()] ?? whole;
      const hex = entity[1] === 'x' || entity[1] === 'X';
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isNaN(code) ? whole : String.fromCodePoint(code);
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** The h2 sections of a rendered slide, in order, by the ids the sanitizer gave them: what a link to a section of the slide uses. */
export function outlineOf(html: string): Section[] {
  const sections: Section[] = [];
  for (const match of html.matchAll(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/g)) {
    const id = /\bid="([^"]*)"/.exec(match[1])?.[1];
    if (id !== undefined && id !== '') sections.push({ id, title: textOfHtml(match[2]) });
  }
  return sections;
}

/** The cover slide the deck names, rendered: its title and tagline. Null when the deck names none. */
export function loadCover(repoRoot: string): Cover | null {
  const deck = readDeck(repoRoot);
  if (deck.cover === undefined) return null;
  const { data, html } = createRenderer()(readFileSync(path.join(repoRoot, deck.cover), 'utf8'));
  const title = (data as { title?: unknown } | null)?.title;
  const tagline = /<h2\b[^>]*>([\s\S]*?)<\/h2>/.exec(html)?.[1];
  return {
    title: typeof title === 'string' && title.trim() !== '' ? title.trim() : '',
    tagline: tagline === undefined ? '' : textOfHtml(tagline),
  };
}

const escapeHtml = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Writes `text` into the empty element of index.html with this id. The element is the shell's, so it had better be there, and empty. */
function fillElement(html: string, id: string, text: string): string {
  const pattern = new RegExp(`(<[a-z][a-z0-9]*\\b[^>]*\\bid="${id}"[^>]*>)(</)`);
  if (!pattern.test(html)) throw new Error(`index.html: no empty element with id="${id}" for the cover slide's text to go into`);
  return html.replace(pattern, `$1${escapeHtml(text)}$2`);
}

function renderSegments(repoRoot: string, deck: readonly DeckSegment[]) {
  let curriculum = '';
  try {
    curriculum = readFileSync(path.join(repoRoot, CURRICULUM_PATH), 'utf8');
  } catch {
    // a fixture repository without a curriculum: no outcomes
  }
  return deck.map((segment) => {
    // A link to another slide is a route in the built application, not a .md file: slide-links.ts rewrites it.
    const render = createRenderer({
      extraRehypePlugins: [[rewriteSlideLinks, { slideSource: segment.slideSource, slides: deck }]],
    });
    const { data, html } = render(readFileSync(path.join(repoRoot, segment.slideSource), 'utf8'));
    const title = (data as { title?: unknown } | null)?.title;
    const moduleCode = (data as { module?: unknown } | null)?.module;
    // The speaker script goes through the same sanitising pipeline, after the slide so that a slide that is missing still fails
    // first. It is not a slide: it has no links to other slides to rewrite, and its front matter is read and left out of the page.
    const { html: scriptHtml } = createRenderer()(readFileSync(path.join(repoRoot, segment.scriptSource), 'utf8'));
    return {
      id: segment.id,
      minutes: segment.minutes,
      labRefs: segment.labRefs,
      scriptSource: segment.scriptSource,
      title: typeof title === 'string' && title.trim() !== '' ? title : segment.id,
      // The front matter's module code (M1, M5b) and the slide's h2 sections: the shell's header, outline and agenda show them.
      module: typeof moduleCode === 'string' && moduleCode.trim() !== '' ? moduleCode.trim() : undefined,
      sections: outlineOf(html),
      outcomeHtml: typeof moduleCode === 'string' ? outcomeOf(curriculum, moduleCode.trim()) : undefined,
      html,
      scriptHtml,
    };
  });
}

export function loadSegments(repoRoot: string) {
  return renderSegments(repoRoot, readDeck(repoRoot).segments);
}

export function spaContentPlugin(repoRoot: string): Plugin {
  // The files the virtual module is built from, spelled the way Vite spells a changed file in handleHotUpdate. Every
  // load refills it, before it reads any of them.
  const sources = new Set<string>();
  const track = (file: string) => sources.add(normalizePath(path.join(repoRoot, file)));

  return {
    name: 'spa-content',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      sources.clear();
      // The module is built from deck.json and from every file it renders, so a change to any of them rebuilds it.
      // deck.json is watched on its own, not per segment: a deck with no segments still has to notice one being added.
      // It is watched before it is parsed: a manifest that does not parse throws out of this load, and a watch that was
      // only registered after the parse would never exist for the very file that has to be repaired.
      track(DECK_PATH);
      this.addWatchFile(path.join(repoRoot, DECK_PATH));
      const deck = readDeck(repoRoot);
      // Likewise the slides and scripts are watched before any of them is rendered, so one that fails to render is
      // watched as soon as it is known. The cover is read by transformIndexHtml, not here, but a change to it is a change
      // to the page: it is tracked so that handleHotUpdate reloads the page.
      if (deck.cover !== undefined) track(deck.cover);
      if (existsSync(path.join(repoRoot, CURRICULUM_PATH))) {
        track(CURRICULUM_PATH);
        this.addWatchFile(path.join(repoRoot, CURRICULUM_PATH));
      }
      for (const segment of deck.segments) {
        track(segment.slideSource);
        track(segment.scriptSource);
        this.addWatchFile(path.join(repoRoot, segment.slideSource));
        this.addWatchFile(path.join(repoRoot, segment.scriptSource));
      }
      return `export const segments = ${JSON.stringify(renderSegments(repoRoot, deck.segments))};`;
    },
    // The cover slide's title and tagline go into the shell's header at build time, as text: the page says what the
    // workshop is without a line of it being copied into source, and without a script having to run first.
    transformIndexHtml(html) {
      const cover = loadCover(repoRoot);
      if (cover === null) return html;
      return fillElement(fillElement(html, 'brand-title', cover.title), 'brand-tagline', cover.tagline);
    },
    // Watching a file is not enough to recover from a load that threw. Vite links a watched file to the module that
    // watched it only when the load returns, so after a throw (a manifest that does not parse, a slide that does not
    // render) the repaired file maps to no module, `modules` is empty, and nothing tells the page to reload: the error
    // overlay stays until someone reloads by hand. Handing the virtual module back does not help either: it was never
    // analyzed, so Vite stops propagating at it and still sends nothing. A file this module is built from that Vite
    // cannot map to a module is that case, so say so to the page directly. Once a load has succeeded the file is mapped
    // and Vite reloads the page itself.
    handleHotUpdate({ file, modules, server }) {
      if (modules.length > 0 || !sources.has(file)) return undefined;
      server.hot.send({ type: 'full-reload', path: '*' });
      return [];
    },
  };
}
