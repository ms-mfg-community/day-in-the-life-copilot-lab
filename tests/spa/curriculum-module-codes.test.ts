// One curriculum-integrity gate the Teaching SPA depends on that no acceptance criterion in
// specs/005-teaching-spa.md names, which is why it drifted undetected.
//
// MODULE-CODE PAIRING. A `module` code is the key any slide/script pairing, agenda or registry
// lookup is keyed on, so a code claimed by two slides misroutes every one of them. AC2 binds a
// deck segment to its slide by PATH and never reads `module`, so the SPA harness is blind to a
// collision.
//
// DELIBERATELY NOT GATED: whether a slide and its speaker script agree on `minutes`. Pacing is
// the curriculum track's call, not a build gate (John, 2026-10-15), and the two are allowed to
// differ. workshop/spa/docs/content-authoring.md discloses that a script carries its own copy.
//
// The curriculum is read-only to the SPA (spec 005 section 2.2): this file only reads it. The
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
  /** Repo-relative POSIX path. */
  path: string;
  module?: unknown;
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
        return { kind, path: `${dir}/${name}`, module: data.module };
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

const slide = (over: Partial<CurriculumFile> = {}): CurriculumFile => ({
  kind: 'slide',
  path: 'workshop/slides/10-module-1.md',
  module: 'M1',
  ...over,
});
const script = (over: Partial<CurriculumFile> = {}): CurriculumFile => ({
  kind: 'script',
  path: 'workshop/speaker-scripts/module-01.md',
  module: 'M1',
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
});

describe('the module-code rule rejects drift', () => {
  it('accepts a code that pairs one slide with one script', () => {
    expect(findModuleCodeProblems([slide(), script()])).toEqual([]);
  });

  it('exempts a file that declares no module, such as the cover slide', () => {
    const cover = slide({ path: 'workshop/slides/00-cover.md', module: undefined });
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

