// AC1 (specs/005-teaching-spa.md sections 2 and 2.2): `npm run spa:validate` exits 0 over
// workshop/spa/content/ and over workshop/slides/*.md, workshop/speaker-scripts/*.md and labs/*.md,
// and exits non-zero over tests/spa/fixtures/invalid/, which holds at least one invalid fixture per
// content kind and one with an undeclared front-matter key.
//
// This is the schema <-> files link of the chain. It runs the real command over the real files and
// reads what the command reports. It never reads content-authoring.md: AC24 binds the document to the
// files and AC25 binds the schema to the document, in their own tests. Collapsing the three into one
// test would let two of them agree with each other while the third was wrong.
//
// An exit status alone proves less than it seems to, and each gap has a test:
//   - "non-zero" is also what a crash looks like (Node exits 1 on an uncaught exception), so the
//     invalid-fixture tests read the report the command prints and not only its status;
//   - "zero" is also what a validator that read no file looks like, so the valid tests compare the
//     files the command reports with the files on disk;
//   - the command runs with no shell, so a pattern such as `labs/*.md` reaches it as literal text and
//     its own expansion of the pattern is what is under test.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { CURRICULUM_GLOBS, diskTree, readSchema, schemaKeys } from './helpers/frontmatter-keys';
import { SLOW, runNode, type Run } from './helpers/run-node';

const ROOT = process.cwd();
const SCRIPT = 'scripts/spa/validate.mjs';
const CONTENT = 'workshop/spa/content';
const INVALID = 'tests/spa/fixtures/invalid';
const CURRICULUM_TARGETS = CURRICULUM_GLOBS.map(({ dir }) => `${dir}/*.md`);

interface Issue {
  keyword: string;
  path: string;
  message: string;
}
interface Checked {
  file: string;
  kind: string | null;
  ok: boolean;
  errors: Issue[];
}
interface Report {
  ok: boolean;
  targets: { target: string; files: Checked[] }[];
}

/** Runs the validator the way `npm run spa:validate` does, from the repo root. */
const validate = (...args: string[]): Run => runNode(SCRIPT, args, ROOT);

/**
 * The `--json` report. A crash prints nothing on stdout, so it fails here with the error text
 * instead of passing as "non-zero".
 */
function report(...args: string[]): { run: Run; json: Report } {
  const run = validate('--json', ...args);
  try {
    return { run, json: JSON.parse(run.stdout) as Report };
  } catch {
    throw new Error(`${SCRIPT} --json printed no report (exit ${run.status}): ${run.stderr || run.stdout}`);
  }
}

/** Every file under `dir`, recursively, as repo-relative forward-slash paths, sorted. */
const walk = (dir: string): string[] =>
  readdirSync(join(ROOT, dir), { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .flatMap((entry) => (entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]))
    .sort();

const files = (json: Report): Checked[] => json.targets.flatMap((target) => target.files);

describe('AC1: spa:validate exits 0 over the content and the curriculum', () => {
  const disk = diskTree(ROOT);

  it('is the npm script `node scripts/spa/validate.mjs`, which is the command these tests run', () => {
    const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(scripts['spa:validate']).toBe(`node ${SCRIPT}`);
  });

  it('exits 0 with no target, over the content directory and the three curriculum globs, and finds every file valid', () => {
    const { run, json } = report();
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stderr).toBe('');
    expect(json.ok).toBe(true);
    expect(json.targets.map((target) => target.target).sort()).toEqual([CONTENT, ...CURRICULUM_TARGETS].sort());
    expect(files(json).filter((file) => !file.ok)).toEqual([]);
  }, SLOW);

  it('validates the files that are on disk, so a zero cannot come from a validator that read nothing', () => {
    const { json } = report();
    const reported = (target: string): string[] => (json.targets.find((entry) => entry.target === target)?.files ?? []).map((file) => file.file).sort();
    for (const { dir } of CURRICULUM_GLOBS) {
      const onDisk = disk.markdown(dir);
      expect(onDisk.length, `${dir}/*.md files on disk`).toBeGreaterThan(0);
      expect(reported(`${dir}/*.md`), `files validated for ${dir}/*.md`).toEqual(onDisk);
    }
    const content = walk(CONTENT);
    expect(content.length, `files under ${CONTENT}`).toBeGreaterThan(0);
    expect(reported(CONTENT), `files validated for ${CONTENT}`).toEqual(content);
  }, SLOW);

  it('applies the front-matter schema to every curriculum file, and the deck, interactions and dataset schemas to the content', () => {
    const { json } = report();
    for (const { target, files: checked } of json.targets) {
      const kinds = [...new Set(checked.map((file) => file.kind))].sort();
      expect(kinds, `schemas applied to ${target}`).toEqual(target === CONTENT ? ['dataset', 'deck', 'interactions'] : ['frontmatter']);
    }
  }, SLOW);

  it.each([CONTENT, ...CURRICULUM_TARGETS])('exits 0 over %s alone, and says PASS for it', (target) => {
    const run = validate(target);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain(`PASS  ${target}  (`);
    expect(run.stdout).toContain('spa:validate: all files valid');
  }, SLOW);
});

describe('AC1: spa:validate exits non-zero over tests/spa/fixtures/invalid', () => {
  const disk = diskTree(ROOT);
  const fixtures = walk(INVALID);

  it('has fixtures to validate, so the exit status below is about something', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it('exits 1 and reports every fixture invalid, with its reasons, rather than crashing', () => {
    const { run, json } = report(INVALID);
    expect(run.status).toBe(1);
    expect(run.stderr).toBe('');
    expect(json.ok).toBe(false);
    expect(files(json).map((file) => file.file).sort()).toEqual(fixtures);
    for (const file of files(json)) {
      expect(file.ok, `${file.file} should be invalid`).toBe(false);
      expect(file.errors.length, `${file.file} should say why`).toBeGreaterThan(0);
    }
  }, SLOW);

  it('says FAIL for the directory, in the plain-text report that a person reads', () => {
    const run = validate(INVALID);
    expect(run.status).toBe(1);
    expect(run.stdout).toContain(`FAIL  ${INVALID}  (${fixtures.length} files, ${fixtures.length} invalid)`);
    expect(run.stdout).toContain(`spa:validate: ${fixtures.length} invalid file(s)`);
  }, SLOW);

  it('has at least one invalid fixture of each content kind: front matter, deck, interactions and dataset', () => {
    const { json } = report(INVALID);
    const kinds = new Set(files(json).map((file) => file.kind));
    for (const kind of ['frontmatter', 'deck', 'interactions', 'dataset']) {
      expect(kinds, `fixture kinds that ${INVALID} holds`).toContain(kind);
    }
    expect(kinds, 'a file no schema applies to is not a fixture of any kind').not.toContain(null);
  }, SLOW);

  it('rejects each fixture when it is validated alone, for a schema or semantic reason and not merely because it could not be read or classified', () => {
    for (const fixture of fixtures) {
      const { run, json } = report(fixture);
      expect(run.status, `${fixture} alone`).toBe(1);
      const [checked] = files(json);
      expect(checked.ok, `${fixture} alone`).toBe(false);
      const substantive = checked.errors.filter((error) => error.keyword !== 'unclassified' && error.keyword !== 'parse');
      expect(substantive, `${fixture}: errors from a schema or a semantic check, not from reading or classifying the file`).not.toEqual([]);
    }
  }, SLOW);

  it('has a fixture whose only offence is a front-matter key the schema does not declare, and the report names that key', () => {
    const { json } = report(INVALID);
    const undeclared = files(json).filter((file) => file.kind === 'frontmatter' && file.errors.some((error) => error.keyword === 'additionalProperties'));
    expect(undeclared.length, 'front-matter fixtures rejected for an undeclared key').toBeGreaterThan(0);
    expect(undeclared.some((file) => file.errors.every((error) => error.keyword === 'additionalProperties')), 'one with no other offence').toBe(true);

    const declared = schemaKeys(readSchema(disk));
    for (const file of undeclared) {
      const named = file.errors.filter((error) => error.keyword === 'additionalProperties').map((error) => /"([^"]+)"/.exec(error.message)?.[1]);
      const inFile = Object.keys(matter(disk.read(file.file), {}).data);
      for (const key of named) {
        expect(inFile, `${file.file} carries the key the report names`).toContain(key);
        expect(declared, `the schema declares no "${key}", which is why it is rejected`).not.toContain(key);
      }
    }
  }, SLOW);
});

describe('AC1: a validator that read nothing, or could not run, never reports success', () => {
  it.each([
    ['a target that does not exist', ['tests/spa/fixtures/no-such-directory'], /target does not exist/],
    ['a pattern that matches no file', ['labs/zz-no-such-lab-*.md'], /target matched no files/],
    ['a wildcard anywhere but the file name', ['la*/*.md'], /wildcard is only supported in the file name/],
    ['an option it does not know', ['--frobnicate'], /unknown option: --frobnicate/],
  ] as const)('exits 2, which is neither 0 nor the 1 of an invalid file, for %s', (_what, args, message) => {
    const run = validate(...args);
    expect(run.status, run.stdout + run.stderr).toBe(2);
    expect(run.stderr).toMatch(message);
    expect(run.stdout).not.toMatch(/PASS|all files valid/);
  }, SLOW);

  it('prints its usage and exits 0 for --help', () => {
    const run = validate('--help');
    expect(run.status).toBe(0);
    expect(run.stdout).toContain('Usage: node scripts/spa/validate.mjs');
  }, SLOW);
});
