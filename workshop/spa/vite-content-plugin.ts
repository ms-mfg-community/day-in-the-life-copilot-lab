// Build-time content: reads deck.json (SPA-01) and renders each segment's slide markdown through the SPA-02 pipeline.
// Runs in Node, so gray-matter's need for Buffer never reaches the browser, and no curriculum prose is copied into source.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizePath } from 'vite';
import type { Plugin } from 'vite';
import { createRenderer } from './src/content/markdown';
import { rewriteSlideLinks } from './src/content/slide-links';

const VIRTUAL_ID = 'virtual:spa-content';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const DECK_PATH = 'workshop/spa/content/deck.json';

interface DeckSegment {
  id: string;
  slideSource: string;
  scriptSource: string;
  labRefs: string[];
  minutes: number;
}

function readDeck(repoRoot: string): DeckSegment[] {
  const deck = JSON.parse(readFileSync(path.join(repoRoot, DECK_PATH), 'utf8')) as { segments: DeckSegment[] };
  return deck.segments;
}

function renderSegments(repoRoot: string, deck: readonly DeckSegment[]) {
  return deck.map((segment) => {
    // A link to another slide is a route in the built application, not a .md file: slide-links.ts rewrites it.
    const render = createRenderer({
      extraRehypePlugins: [[rewriteSlideLinks, { slideSource: segment.slideSource, slides: deck }]],
    });
    const { data, html } = render(readFileSync(path.join(repoRoot, segment.slideSource), 'utf8'));
    const title = (data as { title?: unknown } | null)?.title;
    return {
      id: segment.id,
      minutes: segment.minutes,
      labRefs: segment.labRefs,
      scriptSource: segment.scriptSource,
      title: typeof title === 'string' && title.trim() !== '' ? title : segment.id,
      html,
    };
  });
}

export function loadSegments(repoRoot: string) {
  return renderSegments(repoRoot, readDeck(repoRoot));
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
      // watched as soon as it is known.
      for (const segment of deck) {
        track(segment.slideSource);
        track(segment.scriptSource);
        this.addWatchFile(path.join(repoRoot, segment.slideSource));
        this.addWatchFile(path.join(repoRoot, segment.scriptSource));
      }
      return `export const segments = ${JSON.stringify(renderSegments(repoRoot, deck))};`;
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
