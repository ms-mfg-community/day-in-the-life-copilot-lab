// Validation harness for the Teaching SPA content (spec 005, AC1).
//
// One Ajv 2020-12 instance, strict mode on, built once per process and reused
// (spec 005 section 2.2: F150, F152, F155). `validate.errors` is overwritten by
// every call, so each call's errors are copied into plain objects before the
// next call (F151).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { readFrontMatter } from './curriculum.mjs';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const SCHEMA_DIR = join(REPO_ROOT, 'workshop', 'spa', 'schema');

const SCHEMA_FILES = Object.freeze({
  frontmatter: 'frontmatter.schema.json',
  deck: 'deck.schema.json',
  interactions: 'interactions.schema.json',
  dataset: 'dataset.schema.json',
  diagrams: 'diagrams.schema.json',
});

/** Bad invocation or unreadable environment: the CLI exits 2, never 0 or 1. */
export class UsageError extends Error {}

export const toPosix = (path) => path.split(sep).join('/');

/** Repo-relative POSIX path, or the absolute POSIX path for anything outside the repo. */
export function displayPath(abs) {
  const rel = relative(REPO_ROOT, abs);
  return rel.startsWith('..') || isAbsolute(rel) ? toPosix(abs) : toPosix(rel);
}

let validators;
function getValidators() {
  if (!validators) {
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    validators = {};
    for (const [kind, file] of Object.entries(SCHEMA_FILES)) {
      validators[kind] = ajv.compile(JSON.parse(readFileSync(join(SCHEMA_DIR, file), 'utf8')));
    }
  }
  return validators;
}

const issue = (keyword, path, message) => ({ keyword, path, message });

function describe(error) {
  const path = error.instancePath === '' ? '(root)' : error.instancePath;
  switch (error.keyword) {
    case 'additionalProperties':
      return issue(error.keyword, path, `undeclared property "${error.params.additionalProperty}"`);
    case 'required':
      return issue(error.keyword, path, `missing required property "${error.params.missingProperty}"`);
    case 'enum':
      return issue(error.keyword, path, `must be one of: ${error.params.allowedValues.join(', ')}`);
    default:
      return issue(error.keyword, path, error.message ?? 'is invalid');
  }
}

function schemaIssues(kind, data) {
  const validate = getValidators()[kind];
  if (validate(data)) return [];
  // `if` reports "must match then schema" next to the real error from the then branch.
  return validate.errors.filter((error) => error.keyword !== 'if').map(describe);
}

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Which schema governs a file, decided by its parent directory and its name:
 * datasets/*.json, deck.json, interactions.json, diagrams.json and *.md (front matter).
 * The directory decides first. Spec 005 section 2.1 says every .json file in
 * datasets/ is a dataset, so datasets/deck.json is a dataset that happens to be
 * called deck.json, not a deck. Only outside datasets/ does a reserved name pick
 * the schema. Returns null for anything else, which the validator reports as a
 * failure so a stray file under workshop/spa/content/ cannot escape validation.
 */
export function classify(abs) {
  const name = basename(abs);
  if (name.endsWith('.md')) return 'frontmatter';
  if (!name.endsWith('.json')) return null;
  if (basename(dirname(abs)) === 'datasets') return 'dataset';
  if (name === 'deck.json') return 'deck';
  if (name === 'interactions.json') return 'interactions';
  if (name === 'diagrams.json') return 'diagrams';
  return null;
}

function readJson(abs) {
  try {
    return { data: JSON.parse(readFileSync(abs, 'utf8').replace(/^\uFEFF/, '')) };
  } catch (error) {
    return { error: `not valid JSON: ${error.message}` };
  }
}

/** Validate one file against the schema its kind selects. Never throws for a bad file. */
export function validateFile(abs) {
  const kind = classify(abs);
  const result = { file: abs, kind, errors: [], data: undefined };
  if (kind === null) {
    result.errors.push(
      issue('unclassified', '(file)', 'no schema applies; expected deck.json, interactions.json, diagrams.json, datasets/*.json or *.md'),
    );
    return result;
  }
  const loaded = kind === 'frontmatter' ? readFrontMatter(abs) : readJson(abs);
  if (loaded.error) {
    result.errors.push(issue('parse', '(file)', loaded.error));
    return result;
  }
  if (kind === 'frontmatter' && !isPlainObject(loaded.data)) {
    result.errors.push(issue('type', '(root)', 'front matter must be a mapping of keys to values'));
    return result;
  }
  result.data = loaded.data;
  result.errors.push(...schemaIssues(kind, loaded.data));
  return result;
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

const hasWildcard = (text) => /[*?]/.test(text);

function globToRegExp(glob) {
  const body = [...glob]
    .map((ch) => (ch === '*' ? '[^/\\\\]*' : ch === '?' ? '[^/\\\\]' : ch.replace(/[.+^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${body}$`);
}

/**
 * Every regular file in dir, sorted. Nothing is skipped by name: a dotfile, a
 * hidden directory and a directory called node_modules are listed like any
 * other, because AC1 says every file under workshop/spa/content/ validates and a
 * file the walker hides is a file that can be malformed without anyone noticing.
 */
function listFiles(dir, recursive) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) files.push(...listFiles(abs, true));
    } else if (entry.isFile()) {
      files.push(abs);
    }
  }
  return files.sort();
}

/**
 * Files a target names: a directory (every file under it, hidden files and
 * node_modules included), a single file, or a pattern whose wildcard sits in the
 * file name only (`labs/*.md`, matched like a shell glob: `*` never crosses a
 * directory and never matches a leading dot). The leading-dot rule belongs to
 * the glob, which is how the curriculum targets are written; a directory target
 * is a promise to check everything in it.
 */
export function expandTarget(target, baseDir) {
  const abs = resolve(baseDir, target);
  const name = basename(abs);
  if (hasWildcard(name)) {
    const dir = dirname(abs);
    if (hasWildcard(dir)) throw new UsageError(`a wildcard is only supported in the file name: ${target}`);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) throw new UsageError(`target directory does not exist: ${target}`);
    const pattern = globToRegExp(name);
    return listFiles(dir, false).filter((file) => pattern.test(basename(file)) && !basename(file).startsWith('.'));
  }
  if (!existsSync(abs)) throw new UsageError(`target does not exist: ${target}`);
  return statSync(abs).isDirectory() ? listFiles(abs, true) : [abs];
}

// ---------------------------------------------------------------------------
// Checks JSON Schema cannot express: ids that must be unique, and references
// from one file to another. They run only on files that already satisfy their
// schema, so they can rely on the shape.
// ---------------------------------------------------------------------------

function readOptionalJson(abs) {
  if (!existsSync(abs)) return undefined;
  const loaded = readJson(abs);
  return loaded.error ? undefined : loaded.data;
}

/** What a content root (the directory holding deck.json and datasets/) declares, read from disk. */
function indexRoot(root) {
  const deck = readOptionalJson(join(root, 'deck.json'));
  const segmentIds = new Set(
    Array.isArray(deck?.segments) ? deck.segments.map((s) => s?.id).filter((id) => typeof id === 'string') : [],
  );
  const datasetDir = join(root, 'datasets');
  const hasDatasetDir = existsSync(datasetDir) && statSync(datasetDir).isDirectory();
  const datasetFiles = new Map();
  if (hasDatasetDir) {
    // The same set classify() calls datasets (every .json in datasets/), hidden
    // names included, so an id shared with a dotfile is still a duplicate.
    for (const name of readdirSync(datasetDir).filter((n) => n.endsWith('.json')).sort()) {
      const id = readOptionalJson(join(datasetDir, name))?.id;
      if (typeof id === 'string') datasetFiles.set(id, [...(datasetFiles.get(id) ?? []), join(datasetDir, name)]);
    }
  }
  return { hasDeck: deck !== undefined, segmentIds, hasDatasetDir, datasetFiles };
}

function noteDuplicates(result, values, pathOf, label) {
  const first = new Map();
  values.forEach((value, index) => {
    if (first.has(value)) {
      result.errors.push(issue('semantic', pathOf(index), `duplicate ${label} "${value}" (first used at ${pathOf(first.get(value))})`));
    } else {
      first.set(value, index);
    }
  });
}

function checkDeck(result) {
  noteDuplicates(result, result.data.segments.map((s) => s.id), (i) => `/segments/${i}/id`, 'segment id');
}

function checkInteractions(result, index) {
  const { interactions } = result.data;
  noteDuplicates(result, interactions.map((i) => i.id), (i) => `/interactions/${i}/id`, 'interaction id');
  interactions.forEach((interaction, i) => {
    const at = `/interactions/${i}`;
    if (!index.hasDeck) {
      result.errors.push(issue('semantic', `${at}/segment`, `segment "${interaction.segment}" cannot be resolved: no deck.json beside interactions.json`));
    } else if (!index.segmentIds.has(interaction.segment)) {
      result.errors.push(issue('semantic', `${at}/segment`, `segment "${interaction.segment}" is not a segment id in deck.json`));
    }
    if (interaction.dataset !== undefined && !index.datasetFiles.has(interaction.dataset)) {
      const why = index.hasDatasetDir ? 'is not the id of any file in datasets/' : 'cannot be resolved: no datasets/ directory beside interactions.json';
      result.errors.push(issue('semantic', `${at}/dataset`, `dataset "${interaction.dataset}" ${why}`));
    }
  });
}

function checkDataset(result, index) {
  const dataset = result.data;
  const sharers = (index.datasetFiles.get(dataset.id) ?? []).filter((file) => file !== result.file);
  if (sharers.length > 0) {
    result.errors.push(issue('semantic', '/id', `dataset id "${dataset.id}" is also used by ${sharers.map(displayPath).join(', ')}`));
  }
  noteDuplicates(result, dataset.parameters.map((p) => p.id), (i) => `/parameters/${i}/id`, 'parameter id');
  noteDuplicates(result, dataset.outputs.map((o) => o.id), (i) => `/outputs/${i}/id`, 'output id');
  dataset.parameters.forEach((p, i) => {
    if (!(p.min < p.max)) {
      result.errors.push(issue('semantic', `/parameters/${i}`, `min (${p.min}) must be less than max (${p.max})`));
    } else if (p.default < p.min || p.default > p.max) {
      result.errors.push(issue('semantic', `/parameters/${i}/default`, `default ${p.default} is outside [${p.min}, ${p.max}]`));
    }
  });
  const declared = new Set(dataset.parameters.map((p) => p.id));
  dataset.outputs.forEach((output, i) => {
    output.terms.forEach((term, j) => {
      if (!declared.has(term.parameter)) {
        result.errors.push(issue('semantic', `/outputs/${i}/terms/${j}/parameter`, `names parameter "${term.parameter}", which this dataset does not declare`));
      }
    });
  });
}

/** Run the cross-file checks over schema-valid results, appending to each result's errors. */
export function applySemanticChecks(results) {
  const roots = new Map();
  const indexFor = (root) => {
    if (!roots.has(root)) roots.set(root, indexRoot(root));
    return roots.get(root);
  };
  for (const result of results) {
    if (result.errors.length > 0 || result.data === undefined) continue;
    if (result.kind === 'deck') checkDeck(result);
    else if (result.kind === 'interactions') checkInteractions(result, indexFor(dirname(result.file)));
    else if (result.kind === 'dataset') checkDataset(result, indexFor(dirname(dirname(result.file))));
  }
}
