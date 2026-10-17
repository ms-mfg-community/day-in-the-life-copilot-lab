import { segments } from 'virtual:spa-content';
import { installHashRewrite, type HashWindow } from './content/hash-rewrite';
import { mountInteractions, type Mounted } from './interactions';
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

// The links are built once. Replacing them on every segment would destroy the link a keyboard user has just activated
// and drop focus to <body>, so later renders only move `aria-current`.
function renderNav(currentId: string): void {
  if (nav.children.length !== segments.length) {
    nav.replaceChildren(
      ...segments.map((segment) => {
        const link = document.createElement('a');
        link.href = hashFor(segment.id);
        link.textContent = segment.title; // front matter is untrusted: text, never HTML
        return link;
      }),
    );
  }
  segments.forEach((segment, index) => {
    const link = nav.children[index];
    if (segment.id === currentId) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

// The interactions of the segment on show. Each one may hold something outside the segment's own DOM (a listener on the
// document, a timer, a store subscription, the inert marker of an open dialog), so they are undone before the segment goes.
let interactions: Mounted | undefined;

function renderSegment(id: string): void {
  const segment = segments.find((candidate) => candidate.id === id);
  if (!segment) return;
  interactions?.dispose();
  const heading = document.createElement('h1');
  heading.textContent = segment.title;
  const body = document.createElement('div');
  body.innerHTML = segment.html; // sanitized by the SPA-02 pipeline at build time
  main.replaceChildren(heading, body);
  interactions = mountInteractions({ segment, root: body, document, store, announce });
  renderNav(id);
  document.title = `${segment.title} — Teaching SPA`;
}

// Puts `hash` in the address in place of the current history entry. A hash that only marked a way station (an unknown
// route, an in-page anchor, the skip link) must not stay in the history: Back would land on it, correcting it again would
// push a new entry over the forward history, and the user could never get back any further.
function replaceHash(hash: string): void {
  const { location } = window;
  if (typeof location.replace === 'function') {
    const base = typeof location.href === 'string' ? location.href.split('#')[0] : '';
    location.replace(base + hash);
  } else location.hash = hash; // a minimal location double cannot replace an entry
}

function route(): void {
  const result = parseHash(window.location.hash, ids);
  if (result.kind === 'segment') store.navigate(result.id);
  else if (result.kind === 'unknown') {
    replaceHash(hashFor(store.get().currentId));
    announce(`Unknown segment "${result.id}"`);
  }
}

// A new segment opens from its top, as slide-links.ts promises for a link into a slide. Focus the user had inside the
// replaced content is gone, so it moves to <main> to stay where the new content starts; focus on a nav link is left
// alone, because that link survives the render.
function openAtTop(): void {
  window.scrollTo?.(0, 0);
  const active = document.activeElement;
  if (!active || !nav.contains?.(active)) main.focus?.({ preventScroll: true }); // the scroll above set the position
}

function focusMain(): void {
  main.scrollIntoView?.();
  main.focus?.({ preventScroll: true });
}

// "#main" is the shell's own skip target, so the content rewrite must never see it: a sanitized heading titled "Main" has
// the id `user-content-main`, and the rewrite would queue a scroll to it that lands after focusMain and carries the reader
// off the main landmark. A browser resolves the percent-encoded spelling (#%6Dain) to <main id="main"> too, so the fragment
// is compared decoded. Case matters: #MAIN names no element, so it stays a content anchor for the rewrite.
function isShellHash(hash: string): boolean {
  try {
    return decodeURIComponent(hash.slice(1)) === 'main';
  } catch {
    return false; // not valid percent-encoding, so it names nothing
  }
}

// The window as the content rewrite sees it: the real one, except that the shell's own hash reads as empty.
const contentWindow: HashWindow = {
  get location() {
    const { hash, href } = window.location;
    return { hash: isShellHash(hash) ? '' : hash, href };
  },
  addEventListener: (type, listener) => window.addEventListener(type, listener),
  removeEventListener: (type, listener) => window.removeEventListener(type, listener),
};

// The skip link and an in-page anchor must not leave "#main" or "#some-heading" in the address: a reload, a bookmark or a
// shared link would then lose the segment and open the first one. The skip link is handled in place, so the address never
// changes. For an anchor the browser has already changed it, so it goes back to the open segment once the scroll to the
// heading has been arranged (see the order of the listeners below).
function onSkipLinkClick(event: MouseEvent): void {
  if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = (event.target as Element | null)?.closest?.('a[href]');
  if (!link || (link.getAttribute('data-skip') === null && link.getAttribute('href') !== '#main')) return;
  event.preventDefault();
  focusMain();
}

function settleAnchor(): void {
  const hash = window.location.hash;
  if (parseHash(hash, ids).kind !== 'anchor') return;
  if (isShellHash(hash)) focusMain();
  replaceHash(hashFor(store.get().currentId)); // a segment hash is never an anchor, so this cannot repeat
}

// A browser restores the scroll offset of the entry it travels to (Back, Forward) after the hashchange handlers have run,
// which would undo the scroll to the top that openAtTop made for the segment that opened. The shell scrolls explicitly, so
// it takes that over: every segment opens at its top, whichever way the reader arrived.
if (window.history && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

// Boot order is load-bearing. The initial route is resolved and its segment rendered once, before anything subscribes,
// so a deep link opens on its own segment instead of painting the first one and announcing a move nobody made.
const initialRoute = parseHash(window.location.hash, ids);
if (initialRoute.kind === 'segment') store.navigate(initialRoute.id);
renderSegment(store.get().currentId);

store.subscribe((next, previous) => {
  if (next.currentId === previous.currentId) return;
  renderSegment(next.currentId);
  openAtTop();
  // Keep the URL on the segment that is showing, whoever navigated. After a programmatic `navigate` the hash would still
  // name the old segment, and a link back to it would match the current hash and never fire `hashchange`. When a hash
  // change led here the two already agree and nothing is written.
  const hash = hashFor(next.currentId);
  if (window.location.hash !== hash) window.location.hash = hash;
  const segment = segments.find((candidate) => candidate.id === next.currentId);
  announce(`Segment ${ids.indexOf(next.currentId) + 1} of ${ids.length}: ${segment?.title}`);
});

// A segment needs nothing more here; an unknown initial route falls back to the first segment, replaces the hash and
// announces, as it would on any later hashchange.
route();
window.addEventListener('hashchange', route);
// Before the rewrite, so the skip link is handled here and its click never reaches the rewrite.
document.addEventListener('click', onSkipLinkClick);
// After the route, so an in-page anchor in the initial hash finds the heading it names: the rewrite looks for it as soon as
// it is installed.
installHashRewrite(contentWindow, document);
// Last, and in this order on every hashchange: the route ignores an anchor, the rewrite arranges the scroll to the heading
// it names (it reads the hash, so that must still be the anchor), and only then does the address go back to the segment.
settleAnchor();
window.addEventListener('hashchange', settleAnchor);
