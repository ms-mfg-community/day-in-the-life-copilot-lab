// Build-time content: reads deck.json (SPA-01) and renders each segment's slide markdown through the SPA-02 pipeline.
// Runs in Node, so gray-matter's need for Buffer never reaches the browser, and no curriculum prose is copied into source.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { renderMarkdown } from './src/content/markdown';

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
    const { data, html } = renderMarkdown(readFileSync(path.join(repoRoot, segment.slideSource), 'utf8'));
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
  return {
    name: 'spa-content',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const deck = readDeck(repoRoot);
      // The module is built from deck.json and from every file it renders, so a change to any of them rebuilds it.
      // deck.json is watched on its own, not per segment: a deck with no segments still has to notice one being added.
      // Watches are registered before rendering so a slide that fails to render is rebuilt as soon as it is fixed.
      this.addWatchFile(path.join(repoRoot, DECK_PATH));
      for (const segment of deck) {
        this.addWatchFile(path.join(repoRoot, segment.slideSource));
        this.addWatchFile(path.join(repoRoot, segment.scriptSource));
      }
      return `export const segments = ${JSON.stringify(renderSegments(repoRoot, deck))};`;
    },
  };
}
