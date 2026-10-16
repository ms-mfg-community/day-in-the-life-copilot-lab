import { segments } from 'virtual:spa-content';
import { installHashRewrite } from './content/hash-rewrite';
import { createAnnouncer } from './shell/live-region';
import { hashFor, parseHash } from './shell/router';
import { createState } from './shell/state';

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

function route(): void {
  const result = parseHash(window.location.hash, ids);
  if (result.kind === 'segment') store.navigate(result.id);
  else if (result.kind === 'unknown') {
    window.location.hash = hashFor(store.get().currentId);
    announce(`Unknown segment "${result.id}"`);
  }
}

// Boot order is load-bearing. The initial route is resolved and its segment rendered once, before anything subscribes,
// so a deep link opens on its own segment instead of painting the first one and announcing a move nobody made.
const initialRoute = parseHash(window.location.hash, ids);
if (initialRoute.kind === 'segment') store.navigate(initialRoute.id);
renderSegment(store.get().currentId);

store.subscribe((next, previous) => {
  if (next.currentId === previous.currentId) return;
  renderSegment(next.currentId);
  // Keep the URL on the segment that is showing, whoever navigated. After a programmatic `navigate` the hash would still
  // name the old segment, and a link back to it would match the current hash and never fire `hashchange`. When a hash
  // change led here the two already agree and nothing is written.
  const hash = hashFor(next.currentId);
  if (window.location.hash !== hash) window.location.hash = hash;
  const segment = segments.find((candidate) => candidate.id === next.currentId);
  announce(`Segment ${ids.indexOf(next.currentId) + 1} of ${ids.length}: ${segment?.title}`);
});

// A segment or in-page anchor needs nothing more here; an unknown initial route falls back to the first segment, restores
// the hash and announces, as it would on any later hashchange.
route();
window.addEventListener('hashchange', route);
// Last, so an in-page anchor in the initial hash finds the heading it names: the rewrite looks for it as soon as it is installed.
installHashRewrite(window, document);
