import { segments } from 'virtual:spa-content';
import inventory from '../content/interactions.json';
import { installHashRewrite, type HashWindow } from './content/hash-rewrite';
import { mountInteractions, type Mounted } from './interactions';
import { mountKeyboard } from './shell/keyboard';
import { createAnnouncer } from './shell/live-region';
import {
  mountPresentation,
  type PresentationDocument,
  type PresentationNavigator,
  type PresentationWindow,
} from './shell/presentation';
import { SCRIPT_HASH, hashFor, parseHash } from './shell/router';
import { mountSpeaker, type SpeakerDocument, type SpeakerWindow } from './shell/speaker';
import { createState, type ShellState } from './shell/state';
import { createPresenterSync, parseSyncConfig, snapshotFrom, type SyncWindow } from './shell/sync';

const ids = segments.map((segment) => segment.id);
const store = createState(ids);
const nav = document.getElementById('segment-nav') as HTMLElement;
const main = document.getElementById('main') as HTMLElement;
const announce = createAnnouncer(document.getElementById('live-region') as HTMLElement);

// One document, two surfaces (spec 2.7): the presentation shows the segments, and `#/script` is the speaker's script. The hash says
// which of the two this page is, once, when it boots; a page that is running does not turn into the other (see changeSurface).
const initialRoute = parseHash(window.location.hash, ids);
const onScript = initialRoute.kind === 'script';
// The failure hooks and the timeout of the synchronization (sync.ts). A window opened from the presentation inherits the query of it.
const syncConfig = parseSyncConfig(window.location.search);

// Extension point for later issues: interactions, fullscreen and the speaker window attach through these.
(window as unknown as { teachingSpa: object }).teachingSpa = { store, announce, segments };
function expose(extra: object): void {
  Object.assign((window as unknown as { teachingSpa: object }).teachingSpa, extra);
}

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

// Where the address goes back to when it named a way station and no surface: the script on the speaker's page, the segment that
// is open on the presentation's.
function home(): string {
  return onScript ? SCRIPT_HASH : hashFor(store.get().currentId);
}

// The surface is chosen when the page boots, and the two hold different things (the presentation the fullscreen, the keyboard and the
// interactions; the speaker a transport). So a hash that names the other surface is a change of surface: the page loads again at that
// address, as a visit to it would, and neither surface carries what it holds into the other. A window with no reload changes nothing.
function changeSurface(): void {
  if (typeof window.location.reload === 'function') window.location.reload();
}

function route(): void {
  const result = parseHash(window.location.hash, ids);
  if (result.kind === 'unknown') {
    replaceHash(home());
    announce(`Unknown segment "${result.id}"`);
  } else if (result.kind === 'script' || result.kind === 'segment') {
    if ((result.kind === 'script') !== onScript) changeSurface();
    else if (result.kind === 'segment') store.navigate(result.id);
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
  replaceHash(home()); // a segment hash is never an anchor, so this cannot repeat
}

// A browser restores the scroll offset of the entry it travels to (Back, Forward) after the hashchange handlers have run,
// which would undo the scroll to the top that openAtTop made for the segment that opened. The shell scrolls explicitly, so
// it takes that over: every segment opens at its top, whichever way the reader arrived.
if (window.history && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

// Boot order is load-bearing. The initial route is resolved and its segment rendered once, before anything subscribes,
// so a deep link opens on its own segment instead of painting the first one and announcing a move nobody made. The speaker's
// surface is built in the same place, instead of a segment, and follows the store itself (speaker.ts).
if (initialRoute.kind === 'segment') store.navigate(initialRoute.id);

// The speaker's page: the script in <main>, and none of what belongs to the presentation. Its deck navigation and its Present
// controls have nothing to do in a window that is not the one being presented, so they are put away; the skip link stays, as a
// way into <main> on either surface.
function mountScriptSurface() {
  nav.hidden = true;
  for (const id of ['presentation-controls', 'keyboard-settings']) {
    const section = document.getElementById(id);
    if (section) section.hidden = true;
  }
  return mountSpeaker({
    document: document as unknown as SpeakerDocument,
    window: window as unknown as SpeakerWindow,
    store,
    segments,
    announce,
    config: syncConfig,
  });
}

const speaker = onScript ? mountScriptSurface() : null;
if (!onScript) renderSegment(store.get().currentId);
if (speaker) expose({ speaker });

function followStore(next: ShellState, previous: ShellState): void {
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
}
// The speaker's page has no segment to render and keeps its address on `#/script`: it moves the script itself.
if (!onScript) store.subscribe(followStore);

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

// What the presentation tells the speaker's window (spec 2.7), and the handle it tells it through. It listens from the start, not from
// the moment a window is opened: a script window that the browser blocked is one the user opens by hand, and finds the presentation
// by BroadcastChannel or by storage. The segment, the reveal stage and the timer all live in the store, so a change of the store is
// what is said. The one interaction that keeps time for a segment is the one the inventory names.
const timerIdOf = (segmentId: string): string | undefined =>
  inventory.interactions.find((entry) => entry.pattern === 'segment-timer' && entry.segment === segmentId)?.id;
// The presenter's shortcuts (spec 2.10): single keys with a setting that turns them off, modifier equivalents that always work, and
// the dialog that lists them. Only on the presentation surface: the speaker's page has its own controls and no deck to move.
const keyboard = onScript ? null : mountKeyboard({ document, window, store, segmentIds: ids, announce, timerIdOf });
if (keyboard) expose({ keyboard });

const presenter = onScript
  ? null
  : createPresenterSync({
      window: window as unknown as SyncWindow,
      config: syncConfig,
      segmentIds: ids,
      snapshot: () => snapshotFrom(store.get(), ids, timerIdOf),
      navigate: (id) => store.navigate(id), // the script window's request, and only when the URL turned two-way navigation on
    });
if (presenter) {
  store.subscribe(() => presenter.publish());
  expose({ sync: presenter });
}

// Presentation mode (spec 2.5). Last, once the segment is on screen, so nothing here can keep it from rendering. A shell
// without the controls, or a document with no selector support, mounts nothing and boots as it did before. The speaker's page has
// no presentation to mount: it is not the window that is presented.
const presentation = onScript
  ? null
  : mountPresentation({
      document: document as unknown as PresentationDocument,
      window: window as unknown as PresentationWindow,
      navigator: (typeof navigator === 'undefined' ? undefined : navigator) as unknown as PresentationNavigator | undefined,
      store,
      announce,
      // Reads inside a sentence ("the window is showing segment 2 of 9: Title"), and says where the reader is when fullscreen ends.
      describeSegment: (id) => {
        const segment = segments.find((candidate) => candidate.id === id);
        return `segment ${ids.indexOf(id) + 1} of ${ids.length}${segment ? `: ${segment.title}` : ''}`;
      },
      // Firefox and WebKit end fullscreen with the Escape and never hand it to the page, so what Escape closes, hides or pauses
      // (SPA-04/05) would stay as it was: the interactions of the segment that is on show put it away.
      onEndedByBrowser: () => {
        interactions?.dismiss?.();
        keyboard?.dismiss();
      },
      // The window that was opened for the script is kept, and is the road of postMessage to it.
      onScriptWindow: (opened) => presenter?.setPopup(opened),
    });
if (presentation) expose({ presentation });

// A channel, a listener and a timer are held for the synchronization: they are let go of when the page goes away. Not when it is
// only put into the back/forward cache, because it comes back from there with everything it held.
window.addEventListener('pagehide', (event) => {
  if ((event as { persisted?: boolean }).persisted === true) return;
  presenter?.dispose();
  speaker?.dispose();
  keyboard?.dispose();
});
