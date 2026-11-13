import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TRACKS, formatLabRange } from '../../lab-studio/client/src/labs/tracks';

// Phase 6 — the README's "Lab Modules" section and Lab Studio's rail group the
// same 20 labs into the same four learning tracks. The README is the
// authoritative curriculum; Lab Studio's tracks.ts must say the same thing, and
// the labs' numbers and file names (labs/labNN.md) must never move.

const ROOT = process.cwd();
const README = readFileSync(join(ROOT, 'README.md'), 'utf8');

/** The "## Lab Modules" section: from its heading to the next "## " heading. */
function labModules(): string {
  const start = README.indexOf('\n## Lab Modules');
  expect(start, 'README must have a "## Lab Modules" heading').toBeGreaterThan(-1);
  const rest = README.slice(start + 1);
  const next = rest.indexOf('\n## ', 3);
  return next === -1 ? rest : rest.slice(0, next);
}

interface ReadmeTrack {
  number: number;
  title: string;
  range: string;
  labs: string[];
  body: string;
}

/** Split the section at its "### Track N: Title (Labs …)" headings. */
function readmeTracks(): ReadmeTrack[] {
  const section = labModules();
  const heading = /^### Track (\d): (.+?) \((Labs? [^)]+)\)[ \t]*$/gm;
  const found = [...section.matchAll(heading)];
  return found.map((match, i) => {
    const from = (match.index ?? 0) + match[0].length;
    const to = found[i + 1]?.index ?? section.length;
    const body = section.slice(from, to);
    const labs = [...body.matchAll(/\|\s*\[Lab (\d{2})\]\(labs\/lab\1\.md\)/g)].map((m) => `lab${m[1]}`);
    return { number: Number(match[1]), title: match[2] ?? '', range: match[3] ?? '', labs, body };
  });
}

describe('README Lab Modules groups the 20 labs into four learning tracks', () => {
  it('has exactly four numbered track headings, in order', () => {
    const tracks = readmeTracks();

    expect(tracks.map((t) => t.number)).toEqual([1, 2, 3, 4]);
  });

  it.each(TRACKS.map((t) => [t.number, t] as const))('track %i heading names the title and lab range Lab Studio shows', (_n, track) => {
    const readme = readmeTracks().find((t) => t.number === track.number);

    expect(readme?.title).toBe(track.title);
    expect(readme?.range).toBe(`Labs ${formatLabRange(track.labIds)}`);
  });

  it.each(TRACKS.map((t) => [t.number, t] as const))('track %i table lists exactly the labs Lab Studio groups under it, in learning order', (_n, track) => {
    const readme = readmeTracks().find((t) => t.number === track.number);

    expect(readme?.labs).toEqual([...track.labIds]);
  });

  it('links every lab exactly once across the whole section', () => {
    const links = [...labModules().matchAll(/\]\(labs\/(lab\d{2})\.md\)/g)].map((m) => m[1]);

    const expected = Array.from({ length: 20 }, (_, i) => `lab${String(i + 1).padStart(2, '0')}`);
    expect([...links].sort()).toEqual(expected);
  });

  it('keeps Setup as the entry point to the tracks', () => {
    const section = labModules();

    expect(section).toMatch(/\[Setup\]\(#choose-your-path\)/);
    expect(section.indexOf('[Setup]')).toBeLessThan(section.indexOf('### Track 1'));
  });

  it('describes Lab 01 as configuration ecosystem, instruction hierarchy, code search and marketplace plugins', () => {
    const row = labModules()
      .split('\n')
      .find((line) => line.includes('[Lab 01](labs/lab01.md)'));

    expect(row).toContain('Configuration ecosystem, instruction hierarchy, code search, and marketplace plugins');
    expect(row).not.toMatch(/prompts/i);
  });

  it('links the debugging and observability guide from the Lab Modules section', () => {
    expect(labModules()).toContain('](docs/debugging-and-observability.md)');
  });

  it('keeps a learning-path guide that still says Labs 13 → 14 are sequential', () => {
    const section = labModules();

    expect(section).toMatch(/Learning path/);
    expect(section).toMatch(/Labs 13 → 14 are sequential/);
  });

  it('tells readers the lab numbers and file names did not change', () => {
    expect(labModules()).toMatch(/Lab numbers and file names never change/);
  });
});

describe('Lab Studio no longer presents a five-lab, one-divider curriculum', () => {
  it('does not export the old single Advanced-track divider', () => {
    const index = readFileSync(join(ROOT, 'lab-studio/client/src/labs/index.ts'), 'utf8');

    expect(index).not.toContain('ADVANCED_TRACK_START');
    expect(index).toMatch(/TRACKS/);
  });
});
