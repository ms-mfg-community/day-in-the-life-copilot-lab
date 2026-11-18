// AC24 (specs/005-teaching-spa.md sections 2 and 2.2): workshop/spa/docs/content-authoring.md holds
// one table whose column headers are exactly `Key`, `Occurs in`, `Meaning`, and whose set of `Key`
// values equals exactly the set of top-level front-matter keys across workshop/slides/*.md,
// workshop/speaker-scripts/*.md and labs/*.md: no key in those files is missing from it, and no key
// it lists is absent from all of them.
//
// This is the document <-> curriculum link of the chain. It never opens the schema: AC25 binds the
// schema to the document and AC1 binds the schema to the files, in their own tests, because each
// leaves open exactly what the other two close.
//
// Two kinds of test live here, and they fail for different reasons on purpose.
//
//   1. The first describe block reads the working tree. The expected key set is computed from the
//      curriculum files every time this runs; there is no list of keys in this file. When a lab adds a
//      front-matter key and does not regenerate the document, these are the tests that go red, and the
//      message names the command that fixes it.
//   2. The second describe block runs the same `inspect` function over a small tree held in memory,
//      and shows that each way the document can drift is reported. It does not read the curriculum,
//      so it stays green while the curriculum changes in other branches, and it writes nothing. The
//      key names in it (alpha, beta, gamma) are fixtures for the check, not the set it expects.
//
// What is deliberately NOT asserted: that a Meaning is prose rather than the `TODO` placeholder the
// generator writes for a key it has not seen before. The brief is that a lab which adds a front-matter
// key costs one command and no hand edit; a test that failed on the placeholder would turn that into a
// command plus a hand edit on the gate every lab branch shares. The generator reports every key still
// holding a placeholder each time it runs. A blank Meaning cell is still a failure: that is a
// malformed row, not an unwritten one.
import { describe, expect, it } from 'vitest';
import { CURRICULUM_GLOBS, DOC_PATH, curriculumKeys, diffKeySets, diskTree, docKeys, memoryTree, readDocTables, type Tree } from './helpers/frontmatter-keys';

const ROOT = process.cwd();
const HEADERS = ['Key', 'Occurs in', 'Meaning'];
const FIX = 'run `npm run spa:frontmatter-keys`';

/** What is wrong with the document, clause by clause of AC24. An empty list means that clause holds. */
interface Findings {
  table: string[];
  headers: string[];
  rows: string[];
  keys: string[];
  occursIn: string[];
}
const CLEAN: Findings = { table: [], headers: [], rows: [], keys: [], occursIn: [] };

/**
 * Checks the document in `tree` against the curriculum files in `tree`. The tests on the working
 * tree and the tests on a changed tree both go through this one function, so a tree that fails here
 * shows the real check failing.
 */
function inspect(tree: Tree): Findings {
  const found: Findings = { table: [], headers: [], rows: [], keys: [], occursIn: [] };
  const tables = readDocTables(tree);
  if (tables.length !== 1) {
    found.table.push(`expected exactly one table, found ${tables.length}${tables.map((table) => ` (header at line ${table.line})`).join('')}`);
    return found;
  }
  const [table] = tables;
  if (JSON.stringify(table.headers) !== JSON.stringify(HEADERS)) {
    found.headers.push(`headers are [${table.headers.join(' | ')}], expected [${HEADERS.join(' | ')}]`);
  }

  const keyColumn = docKeys(table);
  table.rows.forEach((row, index) => {
    const label = `row ${index + 1}${row[0] === '' ? '' : ` (${row[0]})`}`;
    if (row.length !== HEADERS.length) found.rows.push(`${label} has ${row.length} cells, expected ${HEADERS.length}`);
    else if (row[2] === '') found.rows.push(`${label} has a blank Meaning`);
    if (row[0] === '') found.rows.push(`${label} has a blank Key`);
    else if (keyColumn.indexOf(row[0]) !== index) found.rows.push(`${label} repeats a Key listed above it`);
  });

  const files = curriculumKeys(tree);
  const { onlyLeft: undocumented, onlyRight: unused } = diffKeySets(files.keys(), keyColumn);
  for (const key of undocumented) found.keys.push(`"${key}" occurs in ${[...(files.get(key)?.globs ?? [])].join(', ')} but the document does not list it`);
  for (const key of unused) found.keys.push(`"${key}" is listed but no file in the three globs has it`);

  for (const row of table.rows) {
    const actual = files.get(row[0])?.globs;
    if (actual === undefined || row.length < 2) continue; // a key no file uses is already reported under `keys`
    const listed = row[1].split(',').map((name) => name.trim());
    const { onlyLeft: unlisted, onlyRight: wrong } = diffKeySets(actual, listed);
    if (unlisted.length > 0 || wrong.length > 0) {
      found.occursIn.push(`"${row[0]}" lists [${listed.join(', ')}] but occurs in [${[...actual].join(', ')}]`);
    }
  }
  return found;
}

describe('AC24: content-authoring.md documents the front-matter keys the curriculum uses', () => {
  const tree = diskTree(ROOT);
  let findings: Findings | undefined;
  const real = (): Findings => (findings ??= inspect(tree));

  it('holds exactly one table', () => {
    expect(real().table).toEqual([]);
  });

  it('has the column headers Key, Occurs in, Meaning, in that order and spelled exactly so', () => {
    expect(real().headers).toEqual([]);
  });

  it('has rows of exactly three cells, each with a Key and a Meaning, and lists no key twice', () => {
    expect(real().rows).toEqual([]);
  });

  it('reads front-matter keys from each of the three globs, so the comparison cannot pass over nothing', () => {
    const files = curriculumKeys(tree);
    for (const { name, dir } of CURRICULUM_GLOBS) {
      const inGlob = [...files.values()].filter((use) => use.globs.has(name));
      expect(inGlob.length, `front-matter keys read from ${dir}/*.md`).toBeGreaterThan(0);
    }
  });

  it('lists exactly the top-level front-matter keys that occur across the three globs', () => {
    expect(real().keys, `the document and the curriculum files disagree on the key set (${FIX})`).toEqual([]);
  });

  it('says in `Occurs in` which of the globs each key occurs in', () => {
    expect(real().occursIn, `Occurs in cells that disagree with the files (${FIX})`).toEqual([]);
  });
});

describe('AC24: the same check reports drift when the files it reads change', () => {
  const DOC = (...rows: string[]): string =>
    ['# Authoring', '', 'Some words.', '', '| Key | Occurs in | Meaning |', '| --- | --- | --- |', ...rows, '', 'More words.', ''].join('\n');
  const ROWS = ['| alpha | slides, speaker-scripts | First. |', '| beta | labs | Second. |'];
  const FILES: Record<string, string> = {
    [DOC_PATH]: DOC(...ROWS),
    'workshop/slides/s.md': '---\nalpha: 1\n---\nSlide.\n',
    'workshop/speaker-scripts/s.md': '---\nalpha: 2\n---\nScript.\n',
    'labs/l.md': '---\nbeta: 3\n---\nLab.\n',
  };
  /** `inspect` over the base tree with `changes` (path to new text) laid over it. */
  const run = (changes: Record<string, string> = {}): Findings => inspect(memoryTree({ ...FILES, ...changes }));
  /** `inspect` over the base tree with the document's rows replaced. */
  const withRows = (...rows: string[]): Findings => run({ [DOC_PATH]: DOC(...rows) });
  /** The base tree's findings with exactly one clause failing. */
  const only = (clause: Partial<Findings>): Findings => ({ ...CLEAN, ...clause });

  it('starts from a tree that passes, so each change below is the only thing that can fail it', () => {
    expect(run()).toEqual(CLEAN);
  });

  it('reports a key a lab starts using that the document does not list', () => {
    expect(run({ 'labs/l.md': '---\nbeta: 3\ngamma: 4\n---\nLab.\n' })).toEqual(only({ keys: ['"gamma" occurs in labs but the document does not list it'] }));
  });

  it('reports a key that arrives in a new file, so the files are globbed and not remembered', () => {
    expect(run({ 'workshop/slides/new.md': '---\ngamma: 1\n---\n' })).toEqual(only({ keys: ['"gamma" occurs in slides but the document does not list it'] }));
  });

  it('reports a key the document lists once no file has it, as when a lab drops its only use of a key', () => {
    expect(run({ 'labs/l.md': 'A lab with no front matter at all.\n' })).toEqual(only({ keys: ['"beta" is listed but no file in the three globs has it'] }));
  });

  it('reports a key the document lists that no file has, as when a key is mistyped', () => {
    expect(withRows(...ROWS, '| gamma | labs | Third. |')).toEqual(only({ keys: ['"gamma" is listed but no file in the three globs has it'] }));
  });

  it('counts only top-level keys, and only those in the front matter at the head of a file', () => {
    expect(run({ 'labs/l.md': '---\nbeta:\n  nested: 1\n---\nLab.\n' }), 'a key inside a value is not a top-level key').toEqual(CLEAN);
    expect(run({ 'labs/l.md': '---\nbeta: 3\n---\nLab.\n\n---\nfake: 1\n---\n' }), 'a block after a horizontal rule in the body is not front matter').toEqual(CLEAN);
  });

  it('matches the *.md files directly inside each glob folder, as the globs do', () => {
    expect(run({ 'labs/sub/x.md': '---\ngamma: 1\n---\n' }), 'a file in a folder under the glob folder').toEqual(CLEAN);
    expect(run({ 'labs/notes.txt': '---\ngamma: 1\n---\n' }), 'a file that is not markdown').toEqual(CLEAN);
    expect(run({ 'labs/.hidden.md': '---\ngamma: 1\n---\n' }), 'a dotfile, which a glob does not match').toEqual(CLEAN);
  });

  it('reports no table, a second table, and still ignores a table inside a code fence', () => {
    const fenced = '\n```md\n| Key | Occurs in | Meaning |\n| --- | --- | --- |\n| fenced | labs | Inside a code fence. |\n```\n';
    expect(run({ [DOC_PATH]: DOC(...ROWS) + fenced }), 'a fenced example table is code, not a table of the document').toEqual(CLEAN);

    const second = '\n| Another | Table |\n| --- | --- |\n| a | b |\n';
    expect(run({ [DOC_PATH]: DOC(...ROWS) + second })).toEqual(only({ table: [expect.stringMatching(/found 2 /)] }));
    expect(run({ [DOC_PATH]: '# Authoring\n\nNo table here.\n' })).toEqual(only({ table: [expect.stringMatching(/found 0$/)] }));
  });

  it('reports column headers that are not exactly Key, Occurs in, Meaning, in that order', () => {
    for (const headers of [['Key', 'Occurs in', 'Notes'], ['Occurs in', 'Key', 'Meaning'], ['key', 'Occurs in', 'Meaning'], ['Key', 'Meaning']]) {
      const doc = DOC(...ROWS).replace('| Key | Occurs in | Meaning |', `| ${headers.join(' | ')} |`);
      expect(run({ [DOC_PATH]: doc }).headers, `headers [${headers.join(' | ')}]`).toHaveLength(1);
    }
  });

  it('reports an `Occurs in` cell that lacks a glob the key occurs in or names one it does not, and ignores order', () => {
    expect(withRows('| alpha | slides | First. |', ROWS[1])).toEqual(only({ occursIn: [expect.stringContaining('"alpha"')] }));
    expect(withRows('| alpha | slides, speaker-scripts, labs | First. |', ROWS[1])).toEqual(only({ occursIn: [expect.stringContaining('"alpha"')] }));
    expect(withRows('| alpha | speaker-scripts,slides | First. |', ROWS[1]), 'order and spacing of the cell').toEqual(CLEAN);
  });

  it('reports a row that is not three cells, a Key listed twice, and a blank Meaning or Key', () => {
    expect(withRows('| alpha | slides, speaker-scripts |', ROWS[1]).rows).toEqual([expect.stringContaining('has 2 cells')]);
    expect(withRows('| alpha | slides, speaker-scripts | First. | extra |', ROWS[1]).rows).toEqual([expect.stringContaining('has 4 cells')]);
    expect(withRows(...ROWS, ROWS[0]).rows).toEqual([expect.stringContaining('repeats a Key')]);
    expect(withRows('| alpha | slides, speaker-scripts |  |', ROWS[1]).rows).toEqual([expect.stringContaining('blank Meaning')]);
    expect(withRows(...ROWS, '|  | labs | Orphan. |').rows).toEqual([expect.stringContaining('blank Key')]);
  });

  it('does not fail a Meaning that is still the generator placeholder (see the note at the top of this file)', () => {
    expect(withRows('| alpha | slides, speaker-scripts | TODO: write a Meaning for this key. |', ROWS[1])).toEqual(CLEAN);
  });

  it('reads LF and CRLF the same, as a Windows checkout leaves the curriculum files in CRLF', () => {
    expect(run({ [DOC_PATH]: DOC(...ROWS).replace(/\n/g, '\r\n') }), 'a CRLF document').toEqual(CLEAN);
    expect(run({ 'labs/l.md': '---\r\nbeta: 3\r\n---\r\nLab.\r\n' }), 'a CRLF curriculum file').toEqual(CLEAN);
  });

  it('fails loudly, rather than skipping, a file whose front matter cannot be read as a mapping', () => {
    expect(() => run({ 'labs/l.md': '---\nkey: [unclosed\n---\nbody\n' })).toThrow(/labs\/l\.md: front matter cannot be parsed/);
    expect(() => run({ 'labs/l.md': '---\n- one\n- two\n---\nbody\n' })).toThrow(/labs\/l\.md: front matter is not a mapping/);
  });

  it('fails loudly when the document itself is missing', () => {
    const { [DOC_PATH]: _doc, ...withoutDoc } = FILES;
    expect(() => inspect(memoryTree(withoutDoc))).toThrow(/content-authoring\.md/);
  });
});
