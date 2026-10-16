// Build-time content: reads deck.json (SPA-01) and renders each segment's slide markdown through the SPA-02 pipeline.
// Runs in Node, so gray-matter's need for Buffer never reaches the browser, and no curriculum prose is copied into source.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { renderMarkdown } from './src/content/markdown.ts';

const VIRTUAL_ID = 'virtual:spa-content';
const RESOLVED_ID = `\0${VIRTUAL_ID}`;

interface DeckSegment {
  id: string;
  slideSource: string;
  scriptSource: string;
  labRefs: string[];
  minutes: number;
}

export function loadSegments(repoRoot: string) {
  const deck = JSON.parse(readFileSync(path.join(repoRoot, 'workshop/spa/content/deck.json'), 'utf8')) as {
    segments: DeckSegment[];
  };
  return deck.segments.map((segment) => {
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

export function spaContentPlugin(repoRoot: string): Plugin {
  return {
    name: 'spa-content',
    resolveId: (id) => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const segments = loadSegments(repoRoot);
      for (const segment of segments) {
        this.addWatchFile(path.join(repoRoot, 'workshop/spa/content/deck.json'));
        this.addWatchFile(path.join(repoRoot, segment.scriptSource));
      }
      return `export const segments = ${JSON.stringify(segments)};`;
    },
  };
}
