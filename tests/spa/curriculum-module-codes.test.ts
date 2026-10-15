// Two curriculum-integrity gates the Teaching SPA depends on that no acceptance criterion in
// specs/005-teaching-spa.md names, which is why both drifted undetected:
//
//   1. MODULE-CODE PAIRING. A `module` code is the key any slide/script pairing, agenda or
//      registry lookup is keyed on, so a code claimed by two slides misroutes every one of
//      them. AC2 binds a deck segment to its slide by PATH and never reads `module`, so the
//      SPA harness is blind to a collision.
//   2. SLIDE/SCRIPT MINUTES AGREEMENT. AC2 binds a segment to its SLIDE only. A script that
//      disagrees with its own slide therefore passes every existing check while the presenter
//      reads one number off the script and the deck shows another.
//
// The curriculum is read-only to the SPA (spec 005 section 2.2): this file only reads it. Each
// rule is a pure function over an extracted file list, so the negative cases run on synthetic
// input and nothing is ever written to the repository.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();

type Kind = 'slide' | 'script';

interface CurriculumFile {
  kind: Kind;
  /** Repo-relative POSIX path, so it can be compared with a script's `slide_source`. */
  path: string;
  module?: unknown;
  minutes?: unknown;
  slideSource?: unknown;
}

const SOURCES: ReadonlyArray<{ kind: Kind; dir: string }> = Object.freeze([
  { kind: 'slide', dir: 'workshop/slides' },
  { kind: 'script', dir: 'workshop/speaker-scripts' },
]);

/**
 * Front matter of every curriculum markdown file, as a flat list.
 *
 * gray-matter is given an options object deliberately: scripts/spa/lib/curriculum.mjs records
 * that an options-less call uses a process-wide content cache which hands two callers the same
 * mutable `data` object.
 */
function readCurriculum(): CurriculumFile[] {
  return SOURCES.flatMap(({ kind, dir }) =>
    readdirSync(join(ROOT, dir))
      .filter((name) => name.endsWith('.md') && !name.startsWith('.'))
      .sort()
      .map((name) => {
        const data = matter(readFileSync(join(ROOT, dir, name), 'utf8'), {}).data as Record<string, unknown>;
        return { kind, path: `${dir}/${name}`, module: data.module, minutes: data.minutes, slideSource: data.slide_source };
      }),
  );
}

/**
 * Every declared `module` code must pair exactly one slide with exactly one speaker script.
 *
 * A file that declares no `module` at all is outside the rule: `workshop/slides/00-cover.md`
 * is a cover, not a module.
 */
function findModuleCodeProblems(files: readonly CurriculumFile[]): string[] {
  const problems: string[] = [];
  const byCode = new Map<string, CurriculumFile[]>();

  for (const file of files) {
    if (file.module === undefined) continue;
    if (typeof file.module !== 'string' || file.module === '') {
      problems.push(`${file.path}: module is ${JSON.stringify(file.module)}, which is not a non-empty string`);
      continue;
    }
    const group = byCode.get(file.module) ?? [];
    group.push(file);
    byCode.set(file.module, group);
  }

  for (const [code, group] of [...byCode].sort(([a], [b]) => a.localeCompare(b))) {
    for (const kind of ['slide', 'script'] as const) {
      const named = group.filter((file) => file.kind === kind);
      if (named.length === 1) continue;
      const where = named.length === 0 ? 'no file' : named.map((file) => file.path).join(', ');
      problems.push(`module ${code}: expected exactly one ${kind}, found ${named.length} (${where})`);
    }
  }
  return problems;
}

/**
 * A speaker script and the slide it names in `slide_source` must agree on `minutes`.
 *
 * A `slide_source` that names no slide in the curriculum is drift in its own right and is
 * reported rather than skipped.
 */
function findMinutesAgreementProblems(files: readonly CurriculumFile[]): string[] {
  const problems: string[] = [];
  const slidesByPath = new Map(files.filter((file) => file.kind === 'slide').map((file) => [file.path, file]));

  for (const script of files.filter((file) => file.kind === 'script')) {
    if (typeof script.slideSource !== 'string' || script.slideSource === '') {
      problems.push(`${script.path}: slide_source is ${JSON.stringify(script.slideSource)}, which is not a non-empty string`);
      continue;
    }
    const slide = slidesByPath.get(script.slideSource);
    if (slide === undefined) {
      problems.push(`${script.path}: slide_source ${JSON.stringify(script.slideSource)} names no slide in the curriculum`);
      continue;
    }
    if (slide.minutes !== script.minutes) {
      problems.push(
        `${script.path}: minutes is ${JSON.stringify(script.minutes)} but its slide ${slide.path} says ${JSON.stringify(slide.minutes)}`,
      );
    }
  }
  return problems;
}

const slide = (over: Partial<CurriculumFile> = {}): CurriculumFile => ({
  kind: 'slide',
  path: 'workshop/slides/10-module-1.md',
  module: 'M1',
  minutes: 35,
  ...over,
});
const script = (over: Partial<CurriculumFile> = {}): CurriculumFile => ({
  kind: 'script',
  path: 'workshop/speaker-scripts/module-01.md',
  module: 'M1',
  minutes: 35,
  slideSource: 'workshop/slides/10-module-1.md',
  ...over,
});

describe('the curriculum on disk', () => {
  const files = readCurriculum();

  it('reads both curriculum directories', () => {
    expect(files.filter((file) => file.kind === 'slide').length).toBeGreaterThan(0);
    expect(files.filter((file) => file.kind === 'script').length).toBeGreaterThan(0);
  });

  it('pairs every module code with exactly one slide and one speaker script', () => {
    expect(findModuleCodeProblems(files)).toEqual([]);
  });

  it('agrees on minutes between every speaker script and the slide it accompanies', () => {
    expect(findMinutesAgreementProblems(files)).toEqual([]);
  });
});

describe('the module-code rule rejects drift', () => {
  it('accepts a code that pairs one slide with one script', () => {
    expect(findModuleCodeProblems([slide(), script()])).toEqual([]);
  });

  it('exempts a file that declares no module, such as the cover slide', () => {
    const cover = slide({ path: 'workshop/slides/00-cover.md', module: undefined, minutes: undefined });
    expect(findModuleCodeProblems([cover, slide(), script()])).toEqual([]);
  });

  it('rejects a code claimed by two slides, the M5/M5c defect', () => {
    const stray = slide({ path: 'workshop/slides/56-module-5c.md' });
    const problems = findModuleCodeProblems([slide(), stray, script()]);
    expect(problems).toEqual(['module M1: expected exactly one slide, found 2 (workshop/slides/10-module-1.md, workshop/slides/56-module-5c.md)']);
  });

  it('rejects a code that has a script but no slide', () => {
    expect(findModuleCodeProblems([script({ module: 'M5c' })])).toEqual(['module M5c: expected exactly one slide, found 0 (no file)']);
  });

  it('rejects a code that has a slide but no script', () => {
    expect(findModuleCodeProblems([slide({ module: 'M9' })])).toEqual(['module M9: expected exactly one script, found 0 (no file)']);
  });

  it('rejects a module code that is not a non-empty string', () => {
    expect(findModuleCodeProblems([slide({ module: 5 })])).toEqual(['workshop/slides/10-module-1.md: module is 5, which is not a non-empty string']);
  });
});

describe('the minutes-agreement rule rejects drift', () => {
  it('accepts a script that matches its slide', () => {
    expect(findMinutesAgreementProblems([slide(), script()])).toEqual([]);
  });

  it('rejects a script that disagrees with its slide, the M5b/M5c defect', () => {
    const problems = findMinutesAgreementProblems([slide({ minutes: 15 }), script({ minutes: 20 })]);
    expect(problems).toEqual(['workshop/speaker-scripts/module-01.md: minutes is 20 but its slide workshop/slides/10-module-1.md says 15']);
  });

  it('rejects a slide_source that names no slide in the curriculum', () => {
    const problems = findMinutesAgreementProblems([script({ slideSource: 'workshop/slides/99-gone.md' })]);
    expect(problems).toEqual(['workshop/speaker-scripts/module-01.md: slide_source "workshop/slides/99-gone.md" names no slide in the curriculum']);
  });

  it('rejects a script that declares no slide_source', () => {
    const problems = findMinutesAgreementProblems([script({ slideSource: undefined })]);
    expect(problems).toEqual(['workshop/speaker-scripts/module-01.md: slide_source is undefined, which is not a non-empty string']);
  });

  it('compares a missing minutes on either side rather than ignoring it', () => {
    const problems = findMinutesAgreementProblems([slide({ minutes: undefined }), script({ minutes: 35 })]);
    expect(problems).toEqual(['workshop/speaker-scripts/module-01.md: minutes is 35 but its slide workshop/slides/10-module-1.md says undefined']);
  });
});
