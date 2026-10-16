// Hash routing over the deck's segments (AC4, spec 2.9: hash routing only, History API does not work from file://).
//
// A route hash is `#/<segment-id>`. Any other hash (`#intro`, `#user-content-x`) is an in-page content anchor, owned by
// hash-rewrite.ts, and is not a route: the router must neither navigate on it nor treat it as an unknown segment.

const ROUTE_PREFIX = '#/';

export type Route =
  | { kind: 'segment'; id: string }
  | { kind: 'anchor' }
  | { kind: 'unknown'; id: string };

/**
 * Classify a location hash against the known segment ids. An empty hash, `#` or `#/` is the first segment; with no
 * segments at all there is no first segment to land on, so it is unknown rather than a segment with an undefined id.
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
  return segmentIds.includes(id) ? { kind: 'segment', id } : { kind: 'unknown', id };
}

export function hashFor(segmentId: string): string {
  return `${ROUTE_PREFIX}${encodeURIComponent(segmentId)}`;
}
