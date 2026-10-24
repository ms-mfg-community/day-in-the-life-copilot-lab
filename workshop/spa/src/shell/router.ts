// Hash routing over the deck's segments (AC4, spec 2.9: hash routing only, History API does not work from file://).
//
// A route hash is `#/<segment-id>`, or `#/script`, the speaker script (AC9, spec 2.7): the same document seen as the
// second surface, which is not a segment and has no place in the deck. Any other hash (`#intro`, `#user-content-x`) is an
// in-page content anchor, owned by hash-rewrite.ts, and is not a route: the router must neither navigate on it nor treat
// it as an unknown segment.

const ROUTE_PREFIX = '#/';

/** The hash of the speaker surface, which is what the presentation opens (`window.open`) for the speaker script. */
export const SCRIPT_HASH = `${ROUTE_PREFIX}script`;
/** The one name the router never looks up in the deck: a segment of this id could not be reached, so the build refuses it (F2). */
export const SCRIPT_NAME = SCRIPT_HASH.slice(ROUTE_PREFIX.length);

export type Route =
  | { kind: 'segment'; id: string }
  | { kind: 'script' }
  | { kind: 'anchor' }
  | { kind: 'unknown'; id: string };

/**
 * Classify a location hash against the known segment ids. An empty hash, `#` or `#/` is the first segment; with no
 * segments at all there is no first segment to land on, so it is unknown rather than a segment with an undefined id.
 * The speaker surface is the one name that is not looked up in the deck: it is recognised by its decoded name, exactly,
 * whatever the deck holds (a deck with no segments, or a segment that happens to be called "script").
 */
export function parseHash(hash: string, segmentIds: readonly string[]): Route {
  if (hash !== '' && hash !== '#' && !hash.startsWith(ROUTE_PREFIX)) return { kind: 'anchor' };
  const raw = hash.startsWith(ROUTE_PREFIX) ? hash.slice(ROUTE_PREFIX.length) : '';
  if (raw === '') {
    return segmentIds.length > 0 ? { kind: 'segment', id: segmentIds[0] } : { kind: 'unknown', id: '' };
  }
  let id: string;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return { kind: 'unknown', id: raw };
  }
  if (id === SCRIPT_NAME) return { kind: 'script' };
  return segmentIds.includes(id) ? { kind: 'segment', id } : { kind: 'unknown', id };
}

export function hashFor(segmentId: string): string {
  return `${ROUTE_PREFIX}${encodeURIComponent(segmentId)}`;
}
