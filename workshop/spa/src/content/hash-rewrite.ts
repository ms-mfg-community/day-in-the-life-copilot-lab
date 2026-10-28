// The hash rewrite for the user-content- clobber prefix: AC3 of specs/005-teaching-spa.md, section 2.2 (F140, F143, F144).
//
// rehype-sanitize's default schema prefixes every `id` and `name` it keeps with `user-content-`, so that content cannot
// shadow DOM properties (`<img name="cookie">` would replace `document.cookie`). The price is that an in-page link
// `[see](#intro)` still points at `#intro` while the heading is now `id="user-content-intro"`, so the browser finds
// nothing to scroll to. Section 2.2: the application MUST ship that rewrite, or MUST NOT emit in-page anchors from
// content. This module is the rewrite.
//
// It is the script from the rehype-sanitize readme, restated so that nothing in it touches a global: the window, the
// document and the scheduler are parameters, and a test can pass fakes. In a browser, pass the real `window` and
// `document`; they satisfy the structural types below. Wiring it into the shell, and deciding what a content hash may
// collide with in the router, belong to child issue 3.
//
// The hash is attacker-controlled text. It is only ever decoded, lower-cased (github-slugger lower-cases heading ids)
// and prefixed into a string that is handed to getElementById and getElementsByName. It is never parsed as markup
// and never put in a selector: `querySelector('#' + hash)` would interpret it.

/** The prefix rehype-sanitize's default schema puts on every `id` and `name` it keeps (its `clobberPrefix`). */
export const CLOBBER_PREFIX = 'user-content-';

/** The one thing the rewrite needs from an element. */
export interface ScrollTarget {
  scrollIntoView(): void;
}

/** A click, as far as the rewrite is concerned. */
export interface HashClickEvent {
  /** The clicked element: the link itself, or something inside it. */
  target: unknown;
  defaultPrevented: boolean;
}

/** The part of `window` the rewrite uses. */
export interface HashWindow {
  location: { hash: string; href: string };
  addEventListener(type: 'hashchange', listener: () => void): void;
  removeEventListener(type: 'hashchange', listener: () => void): void;
}

/** The part of `document` the rewrite uses. */
export interface HashDocument {
  getElementById(id: string): ScrollTarget | null;
  getElementsByName(name: string): ArrayLike<ScrollTarget>;
  addEventListener(type: 'click', listener: (event: HashClickEvent) => void): void;
  removeEventListener(type: 'click', listener: (event: HashClickEvent) => void): void;
}

/** Runs `work` once the current task is over, so the browser has finished its own handling of the navigation first. */
export type Defer = (work: () => void) => void;

const defaultDefer: Defer = (work) => {
  setTimeout(work, 0);
};

/**
 * The id that heading carries for a URL fragment, or `undefined` when there is nothing to look up: an empty fragment,
 * or one that is not valid percent-encoding. A leading `#` is optional.
 */
export function prefixedIdForHash(hash: string): string | undefined {
  const fragment = hash.startsWith('#') ? hash.slice(1) : hash;
  let decoded: string;
  try {
    decoded = decodeURIComponent(fragment);
  } catch {
    return undefined;
  }
  return decoded === '' ? undefined : CLOBBER_PREFIX + decoded.toLowerCase();
}

/**
 * Scroll to the element the current hash names, looking for the prefixed id first and the prefixed name second. An
 * element carrying the bare hash is never a match: only the sanitizer's output can be, and that is always prefixed.
 */
export function scrollToHash(win: HashWindow, doc: HashDocument, defer: Defer = defaultDefer): void {
  const id = prefixedIdForHash(win.location.hash);
  if (id === undefined) return;
  const target: ScrollTarget | undefined = doc.getElementById(id) ?? doc.getElementsByName(id)[0];
  if (target !== undefined) {
    defer(() => {
      target.scrollIntoView();
    });
  }
}

/** What a click target may offer: an element has `closest`, a link has a string `href`. */
interface Clicked {
  closest?: (selector: string) => unknown;
  href?: unknown;
}

/** The link a click landed on: the target itself if it is one, else its nearest link ancestor. */
function linkOf(target: unknown): { href: string } | undefined {
  if (typeof target !== 'object' || target === null) return undefined;
  const clicked = target as Clicked;
  const link = typeof clicked.closest === 'function' ? clicked.closest('a[href]') : clicked;
  if (typeof link !== 'object' || link === null) return undefined;
  const { href } = link as Clicked;
  return typeof href === 'string' ? { href } : undefined;
}

/**
 * Make in-page links work: scroll to the current hash now, whenever it changes, and when a link to the hash the page
 * is already on is clicked (the browser fires no `hashchange` for that, and finds no un-prefixed id to scroll to).
 * Returns a function that removes both listeners.
 */
export function installHashRewrite(win: HashWindow, doc: HashDocument, defer: Defer = defaultDefer): () => void {
  const onHashChange = (): void => {
    scrollToHash(win, doc, defer);
  };
  const onClick = (event: HashClickEvent): void => {
    const link = linkOf(event.target);
    if (link === undefined || link.href !== win.location.href || win.location.hash.length <= 1) return;
    // Wait, so that a handler which cancels the click is honoured and the browser's own navigation is over.
    defer(() => {
      if (!event.defaultPrevented) scrollToHash(win, doc, defer);
    });
  };
  onHashChange();
  win.addEventListener('hashchange', onHashChange);
  doc.addEventListener('click', onClick);
  return () => {
    win.removeEventListener('hashchange', onHashChange);
    doc.removeEventListener('click', onClick);
  };
}
