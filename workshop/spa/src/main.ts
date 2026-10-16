import { segments } from 'virtual:spa-content';
import { installHashRewrite } from './content/hash-rewrite.ts';
import { createAnnouncer } from './shell/live-region.ts';
import { hashFor, parseHash } from './shell/router.ts';
import { createState } from './shell/state.ts';

const ids = segments.map((segment) => segment.id);
const store = createState(ids);
const nav = document.getElementById('segment-nav') as HTMLElement;
const main = document.getElementById('main') as HTMLElement;
const announce = createAnnouncer(document.getElementById('live-region') as HTMLElement);

// Extension point for later issues: interactions, fullscreen and the speaker window attach through these.
(window as unknown as { teachingSpa: object }).teachingSpa = { store, announce, segments };

function renderNav(currentId: string): void {
  nav.replaceChildren(
    ...segments.map((segment) => {
      const link = document.createElement('a');
      link.href = hashFor(segment.id);
      link.textContent = segment.title; // front matter is untrusted: text, never HTML
      if (segment.id === currentId) link.setAttribute('aria-current', 'page');
      return link;
    }),
  );
}

function renderSegment(id: string): void {
  const segment = segments.find((candidate) => candidate.id === id);
  if (!segment) return;
  const heading = document.createElement('h1');
  heading.textContent = segment.title;
  const body = document.createElement('div');
  body.innerHTML = segment.html; // sanitized by the SPA-02 pipeline at build time
  main.replaceChildren(heading, body);
  renderNav(id);
  document.title = `${segment.title} — Teaching SPA`;
}

store.subscribe((next, previous) => {
  if (next.currentId === previous.currentId) return;
  renderSegment(next.currentId);
  const segment = segments.find((candidate) => candidate.id === next.currentId);
  announce(`Segment ${ids.indexOf(next.currentId) + 1} of ${ids.length}: ${segment?.title}`);
});

function route(): void {
  const result = parseHash(window.location.hash, ids);
  if (result.kind === 'segment') store.navigate(result.id);
  else if (result.kind === 'unknown') {
    window.location.hash = hashFor(store.get().currentId);
    announce(`Unknown segment "${result.id}"`);
  }
}

installHashRewrite(window, document);
window.addEventListener('hashchange', route);
renderSegment(store.get().currentId);
route();
