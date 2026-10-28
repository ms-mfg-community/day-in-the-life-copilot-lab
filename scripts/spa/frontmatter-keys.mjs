#!/usr/bin/env node
// spa:frontmatter-keys - regenerate the Key / Occurs in / Meaning table in
// workshop/spa/docs/content-authoring.md from the curriculum itself.
//
//   npm run spa:frontmatter-keys            rewrite the table
//   npm run spa:frontmatter-keys -- --check exit 1 if the table is stale, write nothing
//
// The table is the middle link of spec 005 section 2.2's chain, and it is
// generated so it cannot be a stale hand-maintained list: Key and Occurs in come
// from the front matter of workshop/slides/*.md, workshop/speaker-scripts/*.md
// and labs/*.md. Meaning is the one column written by hand; the rewrite keeps the
// Meaning of every key that already has one, and gives a new key a TODO line.
// Only the text between the two marker comments is rewritten.
//
// A lab that adds a front-matter key therefore costs one command here. The
// closed schema still needs the new key's type written by hand: this script says
// so, and AC25 fails until it is done.
//
// Exit 0: written, unchanged, or (--check) up to date. Exit 1: --check found a
// stale table, or a curriculum file's front matter cannot be read. Exit 2: bad
// invocation or the document has no marker pair.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRICULUM_KINDS, listMarkdown, readFrontMatter } from './lib/curriculum.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOC = 'workshop/spa/docs/content-authoring.md';
const SCHEMA = 'workshop/spa/schema/frontmatter.schema.json';
const BEGIN = '<!-- spa:frontmatter-keys:begin -->';
const END = '<!-- spa:frontmatter-keys:end -->';
const HEADERS = ['Key', 'Occurs in', 'Meaning'];
const PLACEHOLDER = 'TODO: write a Meaning for this key.';
const KIND_ORDER = CURRICULUM_KINDS.map((entry) => entry.kind);

class Failure extends Error {
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

const byCodeUnit = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const splitRow = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());

/** JSON type of a parsed front-matter value, in the vocabulary of the schema's `type` keyword. */
function jsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * Top-level front-matter keys across the three globs: the kinds each occurs in
 * and the value types seen for it.
 */
function collectKeys(root) {
  const keys = new Map();
  const problems = [];
  let files = 0;
  for (const { kind, dir } of CURRICULUM_KINDS) {
    for (const name of listMarkdown(join(root, dir))) {
      files += 1;
      const loaded = readFrontMatter(join(root, dir, name));
      if (loaded.error || !isPlainObject(loaded.data)) {
        problems.push(`${dir}/${name}: ${loaded.error ?? 'front matter must be a mapping of keys to values'}`);
        continue;
      }
      for (const [key, value] of Object.entries(loaded.data)) {
        if (key === '' || key !== key.trim() || /[|`\r\n]/.test(key)) {
          problems.push(`${dir}/${name}: front-matter key ${JSON.stringify(key)} cannot be written in a table cell`);
          continue;
        }
        if (!keys.has(key)) keys.set(key, { kinds: new Set(), types: new Set() });
        keys.get(key).kinds.add(kind);
        keys.get(key).types.add(jsonType(value));
      }
    }
  }
  return { keys, problems, files };
}

/**
 * The table's own header row: every cell is a column name. Matching the first cell
 * alone would also swallow the row of a front-matter key that is literally called
 * Key, and its hand-written Meaning with it.
 */
const isHeaderRow = (cells) => HEADERS.every((header, i) => cells[i] === header);

/**
 * The row under the header: every cell is dashes (`---`, `:--`, `:-:`). A key that
 * is literally called --- has dashes in its first cell only; its Occurs in cell
 * names a kind, so its row is data.
 */
const isDelimiterRow = (cells) => cells.every((cell) => /^:?-+:?$/.test(cell));

/** The rows of the table the document holds now: key -> the text of its Meaning cell. */
function readTable(region) {
  const rows = new Map();
  for (const line of region.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = splitRow(line);
    if (cells.length !== 3) {
      // A row this script cannot read must stop the run: skipping it would replace
      // hand-written Meaning text with the placeholder without anyone noticing.
      throw new Failure(`${DOC}: a table row has ${cells.length} cells, not 3, so its Meaning cannot be kept (write a literal | inside a Meaning as \\|): ${line.trim().slice(0, 100)}`, 1);
    }
    if (isHeaderRow(cells) || isDelimiterRow(cells)) continue;
    rows.set(cells[0], cells[2]);
  }
  return rows;
}

/** Hand-written Meaning text worth keeping: not blank, and not the placeholder this script wrote. */
const writtenMeanings = (rows) => new Map([...rows].filter(([, meaning]) => meaning !== '' && meaning !== PLACEHOLDER));

function renderTable(keys, meanings) {
  const rows = [...keys.keys()].sort(byCodeUnit).map((key) => {
    const occursIn = KIND_ORDER.filter((kind) => keys.get(key).kinds.has(kind)).join(', ');
    return `| ${key} | ${occursIn} | ${meanings.get(key) ?? PLACEHOLDER} |`;
  });
  return [`| ${HEADERS.join(' | ')} |`, '|---|---|---|', ...rows].join('\n');
}

function regionBounds(text) {
  const begin = text.indexOf(BEGIN);
  const end = text.indexOf(END);
  const unique = begin !== -1 && end !== -1 && text.indexOf(BEGIN, begin + 1) === -1 && text.indexOf(END, end + 1) === -1;
  if (!unique || end < begin) {
    throw new Failure(`${DOC} must contain exactly one ${BEGIN} ... ${END} pair; the table lives between them`, 2);
  }
  return { start: begin + BEGIN.length, end };
}

function run(argv) {
  let root = REPO_ROOT;
  let check = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--check') check = true;
    else if (argv[i] === '--root' && argv[i + 1] !== undefined) root = resolve(argv[(i += 1)]);
    else throw new Failure(`usage: node scripts/spa/frontmatter-keys.mjs [--check] [--root <dir>]  (unknown argument: ${argv[i]})`, 2);
  }

  const docPath = join(root, DOC);
  if (!existsSync(docPath)) throw new Failure(`${DOC} does not exist under ${root}`, 2);
  const current = readFileSync(docPath, 'utf8').replace(/\r\n/g, '\n');
  const bounds = regionBounds(current);

  const { keys, problems, files } = collectKeys(root);
  if (problems.length > 0) throw new Failure(`cannot read the curriculum front matter, so the table was not touched:\n  ${problems.join('\n  ')}`, 1);
  if (files === 0) throw new Failure(`no curriculum files found under ${root}`, 1);

  const rows = readTable(current.slice(bounds.start, bounds.end));
  const meanings = writtenMeanings(rows);
  const next = `${current.slice(0, bounds.start)}\n${renderTable(keys, meanings)}\n${current.slice(bounds.end)}`;

  const notes = [];
  const dropped = [...rows.keys()].filter((key) => !keys.has(key)).sort(byCodeUnit);
  if (dropped.length > 0) notes.push(`no curriculum file uses these any more, so their rows were dropped: ${dropped.join(', ')}`);
  const undescribed = [...keys.keys()].filter((key) => !meanings.has(key)).sort(byCodeUnit);
  if (undescribed.length > 0) notes.push(`no hand-written Meaning yet for: ${undescribed.join(', ')}`);
  if (existsSync(join(root, SCHEMA))) {
    const accepted = new Set(Object.keys(JSON.parse(readFileSync(join(root, SCHEMA), 'utf8')).properties ?? {}));
    const unaccepted = [...keys.keys()].filter((key) => !accepted.has(key)).sort(byCodeUnit);
    const unused = [...accepted].filter((key) => !keys.has(key)).sort(byCodeUnit);
    if (unaccepted.length > 0) {
      const seen = unaccepted.map((key) => `${key} (${[...keys.get(key).types].sort(byCodeUnit).join(' or ')})`);
      notes.push(`the schema does not accept: ${seen.join(', ')} - add each to ${SCHEMA} with its type (AC25, AC1)`);
    }
    if (unused.length > 0) notes.push(`the schema accepts keys no curriculum file uses: ${unused.join(', ')} - remove them from ${SCHEMA} (AC25)`);
  }

  const stale = next !== current;
  if (check) {
    if (stale) throw new Failure(`${DOC} is stale: run npm run spa:frontmatter-keys`, 1);
  } else if (stale) {
    writeFileSync(docPath, next, 'utf8');
  }
  process.stdout.write(`spa:frontmatter-keys: ${keys.size} keys from ${files} files; ${DOC} ${check ? 'is up to date' : stale ? 'rewritten' : 'unchanged'}\n`);
  for (const note of notes) process.stdout.write(`  note: ${note}\n`);
  return 0;
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof Failure)) throw error;
  process.stderr.write(`spa:frontmatter-keys: ${error.message}\n`);
  process.exitCode = error.exitCode;
}
