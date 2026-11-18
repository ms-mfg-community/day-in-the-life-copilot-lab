// Links from one slide to another: AC4 of specs/005-teaching-spa.md (child issue 3), section 2.9.
//
// Curriculum markdown links to a sibling slide the way GitHub renders it: a path from the slide, ending in .md
// (`[extensions](55-module-5b-gh-extensions.md)`). The built application has no such file. The slides are compiled into
// the bundle, there is one page, and a segment is reached by its hash route, so that href leaves the application and
// lands on a 404. This rewrites an href that names another slide of the manifest to that segment's route (`#/<id>`), and
// the curriculum markdown stays as it is.
//
// It is a hast transformer for the pipeline's extra-plugin seam, so it runs before rehype-sanitize and the sanitizer is
// still the last stage: what is written here is checked like everything else. `#/<id>` has no scheme, which the default
// schema keeps.
//
// Only an href that resolves to a manifest `slideSource` is touched; every other one keeps the text it was written with:
//   - an external URL, `mailto:`, or any other scheme, and a network-path (`//host`) or root-relative (`/x`) reference;
//   - an in-page `#anchor`, which hash-rewrite.ts owns, and a bare `?query`;
//   - a lab (`../../labs/lab-x.md`) or any other file that is not a segment of the deck.
// A fragment or query on a slide href is dropped: a route is `#/<id>` and nothing else (router.ts reads `#/<id>#x` as an
// unknown segment), so a link to `slide.md#heading` opens that segment from its top.

import path from 'node:path';
import { hashFor } from '../shell/router';

/** What the rewrite needs of a manifest segment. */
export interface SlideRef {
  id: string;
  /** Repository-relative, POSIX separators: `workshop/slides/60-module-6.md`. */
  slideSource: string;
}

export interface SlideLinkOptions {
  /** The slide being rendered. Its directory is what a relative href is relative to. */
  slideSource: string;
  /** Every slide of the manifest, this one included. */
  slides: readonly SlideRef[];
}

/** A scheme (`https:`, `mailto:`, `javascript:`), as a URL parser reads it. */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * The rehype plugin. It takes `{ slideSource, slides }` and rewrites, in place, every `<a href>` that resolves to one of
 * `slides`. It never throws on an odd tree or an odd href: what it cannot place it leaves alone.
 */
export function rewriteSlideLinks(options: SlideLinkOptions): (tree: unknown) => void {
  const directory = path.posix.dirname(options.slideSource);
  const routes = new Map<string, string>();
  for (const slide of options.slides) {
    // The manifest is JSON nobody type-checked: an entry that is not a slide is not a target, whatever else is wrong with it.
    if (typeof slide.id === 'string' && typeof slide.slideSource === 'string') {
      routes.set(path.posix.normalize(slide.slideSource), slide.id);
    }
  }

  function routeFor(href: string): string | undefined {
    if (SCHEME.test(href) || href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) return undefined;
    const end = href.search(/[?#]/);
    const file = end === -1 ? href : href.slice(0, end);
    let decoded = file;
    try {
      decoded = decodeURI(file); // `%20` and the like: the manifest holds paths, and the markdown parser encoded this one
    } catch {
      // not valid percent-encoding: it names no file in the manifest either way
    }
    const id = routes.get(path.posix.join(directory, decoded));
    return id === undefined ? undefined : hashFor(id);
  }

  return (tree) => {
    // A work list, not recursion: a document can nest as deep as it likes, and the call stack is not its to spend.
    const pending: unknown[] = [tree];
    while (pending.length > 0) {
      const node = pending.pop();
      if (!isRecord(node)) continue;
      if (node.type === 'element' && node.tagName === 'a' && isRecord(node.properties)) {
        const route = typeof node.properties.href === 'string' ? routeFor(node.properties.href) : undefined;
        if (route !== undefined) node.properties.href = route;
      }
      if (Array.isArray(node.children)) for (const child of node.children) pending.push(child);
    }
  };
}
