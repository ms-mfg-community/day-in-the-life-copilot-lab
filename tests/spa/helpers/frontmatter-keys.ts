// Run-time readers for the three-link chain of specs/005-teaching-spa.md section 2.2:
//
//   AC24  document <-> curriculum   docKeys(docTable(tree))       vs  curriculumKeys(tree)
//   AC25  schema   <-> document     schemaKeys(readSchema(tree))  vs  docKeys(docTable(tree))
//   AC1   schema   <-> files        scripts/spa/validate.mjs (see validate-cli.test.ts)
//
// Every reader takes a `Tree` and reads the files it names through it. `diskTree(root)` is the
// working tree, which is what the acceptance tests read. `memoryTree(files)` is a tree held in
// memory, which is what a test uses to change a file and watch the answer change: nothing is
// written, so there is nothing to clean up and a run that is killed half way leaves nothing behind.
// None of the readers holds a list of keys: a literal list in a test would be one more hand-kept
// copy of exactly the thing the three criteria exist to stop being hand-kept.
//
// This module imports nothing from scripts/spa/. The tests must not share code with the generator
// they check, or a bug in the generator could make the tests agree with it.
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import matter from 'gray-matter';

export const DOC_PATH = 'workshop/spa/docs/content-authoring.md';
export const SCHEMA_PATH = 'workshop/spa/schema/frontmatter.schema.json';

/** The three curriculum globs of spec 005 section 2.2. `name` is what the `Occurs in` column calls each. */
export const CURRICULUM_GLOBS = [
  { name: 'slides', dir: 'workshop/slides' },
  { name: 'speaker-scripts', dir: 'workshop/speaker-scripts' },
  { name: 'labs', dir: 'labs' },
] as const;

/** Where the readers get their text. Paths are repo-relative with forward slashes. */
export interface Tree {
  /** The `*.md` files directly inside `dir` (what `dir/*.md` matches), dotfiles excluded, sorted. `[]` if `dir` is absent. */
  markdown(dir: string): string[];
  /** The text of the file at `path`. Throws if there is no such file. */
  read(path: string): string;
}

const isGlobbed = (name: string): boolean => name.endsWith('.md') && !name.startsWith('.');

/** The working tree under `root`. */
export function diskTree(root: string): Tree {
  return {
    markdown(dir) {
      try {
        return readdirSync(join(root, dir), { withFileTypes: true })
          .filter((entry) => entry.isFile() && isGlobbed(entry.name))
          .map((entry) => `${dir}/${entry.name}`)
          .sort();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
        throw error;
      }
    },
    read: (path) => readFileSync(join(root, path), 'utf8'),
  };
}

/** A tree that is just `files` (path to text): nothing is read from or written to disk. */
export function memoryTree(files: Record<string, string>): Tree {
  return {
    markdown: (dir) =>
      Object.keys(files)
        .filter((path) => posix.dirname(path) === dir && isGlobbed(posix.basename(path)))
        .sort(),
    read(path) {
      if (!Object.hasOwn(files, path)) throw new Error(`no such file in the in-memory tree: ${path}`);
      return files[path];
    },
  };
}

export interface KeyUse {
  /** The globs (by `name`) that have at least one file carrying the key. */
  globs: Set<string>;
  /** The key's value in every file that carries it, one entry per occurrence. */
  values: unknown[];
}

/** A pipe table found in a markdown document. */
export interface DocTable {
  /** 1-based line number of the header row. */
  line: number;
  headers: string[];
  rows: string[][];
}

export interface CurriculumFile {
  /** The glob's `name`: `slides`, `speaker-scripts` or `labs`. */
  glob: string;
  /** Repo-relative path with forward slashes, e.g. `labs/lab01.md`. */
  path: string;
}

/** The `*.md` files directly inside each of the three globs' directories, which is what each glob matches. */
export function curriculumFiles(tree: Tree): CurriculumFile[] {
  return CURRICULUM_GLOBS.flatMap(({ name, dir }) => tree.markdown(dir).map((path) => ({ glob: name, path })));
}

/**
 * Every top-level front-matter key across the three globs, with the globs it occurs in and the
 * values it takes. Front matter is extracted with gray-matter, as spec 005 section 2.2 says.
 * A file with no front matter contributes no keys; one whose front matter is not a mapping throws,
 * because a key set cannot be computed over it.
 */
export function curriculumKeys(tree: Tree): Map<string, KeyUse> {
  const keys = new Map<string, KeyUse>();
  for (const { glob, path } of curriculumFiles(tree)) {
    let data: unknown;
    try {
      data = matter(tree.read(path), {}).data;
    } catch (error) {
      throw new Error(`${path}: front matter cannot be parsed: ${(error as Error).message.split('\n')[0]}`);
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      throw new Error(`${path}: front matter is not a mapping of keys to values`);
    }
    for (const [key, value] of Object.entries(data)) {
      const use = keys.get(key) ?? { globs: new Set<string>(), values: [] };
      use.globs.add(glob);
      use.values.push(value);
      keys.set(key, use);
    }
  }
  return keys;
}

/** The cells of one pipe-table row, trimmed. `\|` inside a cell is a literal pipe, not a separator. */
export function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

const hasPipe = (line: string): boolean => /(?<!\\)\|/.test(line);
const isDelimiterRow = (line: string): boolean => hasPipe(line) && splitRow(line).every((cell) => /^:?-+:?$/.test(cell));

/**
 * Every pipe table in `markdown`, outside fenced code blocks. A table is a header row directly
 * above a delimiter row; its body is the run of lines after that which contain a pipe. Line
 * endings may be LF or CRLF, because the curriculum files on a Windows checkout are CRLF.
 */
export function findTables(markdown: string): DocTable[] {
  const lines = markdown.split(/\r?\n/);
  const tables: DocTable[] = [];
  let fence: string | undefined;
  for (let i = 0; i < lines.length; i += 1) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(lines[i])?.[1];
    if (marker !== undefined) {
      if (fence === undefined) fence = marker[0];
      else if (marker[0] === fence) fence = undefined;
      continue;
    }
    if (fence !== undefined || !hasPipe(lines[i]) || i + 1 >= lines.length || !isDelimiterRow(lines[i + 1])) continue;
    const rows: string[][] = [];
    let next = i + 2;
    while (next < lines.length && lines[next].trim() !== '' && hasPipe(lines[next])) {
      rows.push(splitRow(lines[next]));
      next += 1;
    }
    tables.push({ line: i + 1, headers: splitRow(lines[i]), rows });
    i = next - 1;
  }
  return tables;
}

/** Every table in workshop/spa/docs/content-authoring.md. */
export function readDocTables(tree: Tree): DocTable[] {
  return findTables(tree.read(DOC_PATH));
}

/** The document's one table. Throws unless the document holds exactly one, so a Key column is never ambiguous. */
export function docTable(tree: Tree): DocTable {
  const tables = readDocTables(tree);
  if (tables.length !== 1) {
    throw new Error(`${DOC_PATH} must hold exactly one table, found ${tables.length}${tables.map((table) => ` (header at line ${table.line})`).join('')}`);
  }
  return tables[0];
}

/** The `Key` column of a table: the first cell of every row. */
export const docKeys = (table: DocTable): string[] => table.rows.map((row) => row[0]);

export function readSchema(tree: Tree): Record<string, unknown> {
  return JSON.parse(tree.read(SCHEMA_PATH)) as Record<string, unknown>;
}

/** The top-level property names a schema declares. */
export function schemaKeys(schema: Record<string, unknown>): string[] {
  const properties = schema.properties;
  return typeof properties === 'object' && properties !== null && !Array.isArray(properties) ? Object.keys(properties) : [];
}

/** The two one-sided differences between two key sets, each sorted. Empty on both sides means equal. */
export function diffKeySets(left: Iterable<string>, right: Iterable<string>): { onlyLeft: string[]; onlyRight: string[] } {
  const l = new Set(left);
  const r = new Set(right);
  return {
    onlyLeft: [...l].filter((key) => !r.has(key)).sort(),
    onlyRight: [...r].filter((key) => !l.has(key)).sort(),
  };
}
