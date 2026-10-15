// AC2 (specs/005-teaching-spa.md section 2.2): every slideSource, scriptSource and labRefs
// entry in workshop/spa/content/deck.json resolves to an existing file, and each segment's
// `minutes` equals the `minutes` front-matter value of its slide.
//
// The deck REFERENCES the curriculum by path and copies none of it ("Source of truth stays
// where it is"). This test is what keeps those references honest. It reads the curriculum with
// gray-matter itself and does not import the validator, so a bug the validator shares with the
// deck cannot make both pass.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, posix } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const DECK_FILE = 'workshop/spa/content/deck.json';

interface Segment {
  id: string;
  slideSource: string;
  scriptSource: string;
  labRefs: string[];
  minutes: number;
}
interface Deck {
  segments: Segment[];
}

const readDeck = (): Deck => JSON.parse(readFileSync(join(ROOT, DECK_FILE), 'utf8')) as Deck;
const copyOf = (deck: Deck): Deck => JSON.parse(JSON.stringify(deck)) as Deck;

/**
 * True when `rel` (repo-relative, POSIX) names a regular file and every path segment is spelled
 * exactly as it is on disk. A plain existence check accepts a wrong-case path on Windows and
 * macOS and rejects it on Linux, which is where CI runs.
 */
function isFileExactCase(rel: string): boolean {
  let dir = ROOT;
  for (const part of rel.split('/')) {
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      return false;
    }
    if (!names.includes(part)) return false;
    dir = join(dir, part);
  }
  try {
    return statSync(dir).isFile();
  } catch {
    return false;
  }
}

/** A reference is a repo-relative POSIX path that stays inside the repository. */
function shapeProblem(ref: unknown): string | undefined {
  if (typeof ref !== 'string' || ref === '') return 'is not a non-empty string';
  if (ref.includes('\\')) return 'uses a backslash; write a POSIX path';
  if (ref.startsWith('/') || /^[A-Za-z]:/.test(ref)) return 'is absolute; write a repo-relative path';
  if (posix.normalize(ref) !== ref || ref.split('/').includes('..')) return 'is not a normalised path inside the repository';
  return undefined;
}

const frontMatter = (rel: string): Record<string, unknown> => matter(readFileSync(join(ROOT, rel), 'utf8')).data as Record<string, unknown>;

/** True when the reference is well formed and names a file that exists. */
const resolves = (ref: unknown): ref is string => typeof ref === 'string' && shapeProblem(ref) === undefined && isFileExactCase(ref);

/** Every reference that does not resolve, and every segment whose minutes differ from its slide's. */
function findRefProblems(deck: Deck): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  deck.segments.forEach((segment, index) => {
    const at = `segments[${index}] (${segment.id})`;
    if (ids.has(segment.id)) problems.push(`${at}: segment id is used twice`);
    ids.add(segment.id);

    const labRefs: unknown[] = Array.isArray(segment.labRefs) ? segment.labRefs : [];
    if (!Array.isArray(segment.labRefs)) problems.push(`${at}: labRefs is not an array`);
    const refs: Array<[string, unknown]> = [
      ['slideSource', segment.slideSource],
      ['scriptSource', segment.scriptSource],
      ...labRefs.map((ref, i): [string, unknown] => [`labRefs[${i}]`, ref]),
    ];
    for (const [field, ref] of refs) {
      const shape = shapeProblem(ref);
      if (shape !== undefined) problems.push(`${at}: ${field} ${JSON.stringify(ref)} ${shape}`);
      else if (!resolves(ref)) problems.push(`${at}: ${field} ${JSON.stringify(ref)} does not resolve to an existing file`);
    }

    if (resolves(segment.slideSource)) {
      const slideMinutes = frontMatter(segment.slideSource).minutes;
      if (slideMinutes === undefined) {
        problems.push(`${at}: ${segment.slideSource} has no \`minutes\` front matter for the segment to agree with`);
      } else if (segment.minutes !== slideMinutes) {
        problems.push(`${at}: minutes is ${JSON.stringify(segment.minutes)} but ${segment.slideSource} says ${JSON.stringify(slideMinutes)}`);
      }
    }
  });
  return problems;
}

/** A segment's speaker script must be the one that accompanies the segment's slide. */
function findPairingProblems(deck: Deck): string[] {
  const problems: string[] = [];
  deck.segments.forEach((segment, index) => {
    if (!resolves(segment.scriptSource)) return; // findRefProblems reports it
    const accompanies = frontMatter(segment.scriptSource).slide_source;
    if (accompanies !== segment.slideSource) {
      problems.push(
        `segments[${index}] (${segment.id}): ${segment.scriptSource} accompanies ${JSON.stringify(accompanies)} (its slide_source), not ${JSON.stringify(segment.slideSource)}`,
      );
    }
  });
  return problems;
}

function* walkStrings(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === 'string') {
    yield [path, value];
  } else if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) yield* walkStrings(item, `${path}[${i}]`);
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) yield* walkStrings(item, `${path}.${key}`);
  }
}

/** Ids and paths never contain whitespace; a string that does is prose, which the deck must not carry. */
function findProseProblems(deck: Deck): string[] {
  return [...walkStrings(deck, '$')]
    .filter(([, text]) => /\s/.test(text))
    .map(([path, text]) => `${path}: ${JSON.stringify(text.slice(0, 60))} contains whitespace, so it is prose and not a path or an id`);
}

describe('AC2: workshop/spa/content/deck.json references the curriculum by path', () => {
  const deck = readDeck();

  it('lists at least one segment', () => {
    expect(Array.isArray(deck.segments)).toBe(true);
    expect(deck.segments.length).toBeGreaterThan(0);
  });

  it('resolves every slideSource, scriptSource and labRefs entry to an existing file, and agrees with each slide on minutes', () => {
    expect(findRefProblems(deck)).toEqual([]);
  });

  it('pairs each speaker script with the slide it accompanies', () => {
    expect(findPairingProblems(deck)).toEqual([]);
  });

  it('copies no prose out of the curriculum: every string is a path or an id', () => {
    expect(findProseProblems(deck)).toEqual([]);
  });
});

describe('AC2: the checks reject a deck that has drifted', () => {
  const deck = readDeck();

  /** Apply `change` to a copy of the deck and return the problems the ref check finds in it. */
  const refProblemsAfter = (change: (copy: Deck) => void): string[] => {
    const copy = copyOf(deck);
    change(copy);
    return findRefProblems(copy);
  };

  it('rejects a slideSource that does not exist', () => {
    const problems = refProblemsAfter((d) => (d.segments[0].slideSource = 'workshop/slides/no-such-slide.md'));
    expect(problems.some((p) => p.includes('slideSource') && p.includes('does not resolve'))).toBe(true);
  });

  it('rejects a scriptSource that does not exist', () => {
    const problems = refProblemsAfter((d) => (d.segments[0].scriptSource = 'workshop/speaker-scripts/no-such-script.md'));
    expect(problems.some((p) => p.includes('scriptSource') && p.includes('does not resolve'))).toBe(true);
  });

  it('rejects a labRefs entry that does not exist', () => {
    const problems = refProblemsAfter((d) => d.segments[0].labRefs.push('labs/lab99-no-such-lab.md'));
    expect(problems.some((p) => p.includes('labRefs[') && p.includes('does not resolve'))).toBe(true);
  });

  it('rejects a path whose case differs from the file on disk', () => {
    const problems = refProblemsAfter((d) => (d.segments[0].slideSource = d.segments[0].slideSource.toUpperCase()));
    expect(problems.some((p) => p.includes('slideSource') && p.includes('does not resolve'))).toBe(true);
  });

  it('rejects a reference to a directory', () => {
    const problems = refProblemsAfter((d) => (d.segments[0].slideSource = 'workshop/slides'));
    expect(problems.some((p) => p.includes('slideSource') && p.includes('does not resolve'))).toBe(true);
  });

  it('rejects a path that escapes the repository, is absolute, or uses a backslash', () => {
    expect(refProblemsAfter((d) => (d.segments[0].slideSource = '../outside.md')).some((p) => p.includes('normalised path'))).toBe(true);
    expect(refProblemsAfter((d) => (d.segments[0].slideSource = '/etc/hosts')).some((p) => p.includes('absolute'))).toBe(true);
    expect(refProblemsAfter((d) => (d.segments[0].slideSource = 'workshop\\slides\\10-module-1.md')).some((p) => p.includes('backslash'))).toBe(true);
  });

  it('rejects a segment whose minutes differ from its slide', () => {
    const problems = refProblemsAfter((d) => (d.segments[0].minutes += 1));
    expect(problems.some((p) => p.includes('minutes is') && p.includes('says'))).toBe(true);
  });

  it('rejects a segment whose slide has no minutes to agree with', () => {
    // The cover slide carries only a title and a role.
    const problems = refProblemsAfter((d) => (d.segments[0].slideSource = 'workshop/slides/00-cover.md'));
    expect(problems.some((p) => p.includes('has no `minutes`'))).toBe(true);
  });

  it('rejects a segment id used twice', () => {
    const problems = refProblemsAfter((d) => (d.segments[1].id = d.segments[0].id));
    expect(problems.some((p) => p.includes('used twice'))).toBe(true);
  });

  it('rejects a script that accompanies a different slide', () => {
    const copy = copyOf(deck);
    [copy.segments[0].scriptSource, copy.segments[1].scriptSource] = [copy.segments[1].scriptSource, copy.segments[0].scriptSource];
    expect(findPairingProblems(copy).length).toBeGreaterThan(0);
  });

  it('rejects prose in the deck', () => {
    const copy = copyOf(deck) as unknown as { segments: Array<Record<string, unknown>> };
    copy.segments[0].summary = 'Learn how the extensibility surfaces fit together.';
    expect(findProseProblems(copy as unknown as Deck).length).toBe(1);
  });
});
