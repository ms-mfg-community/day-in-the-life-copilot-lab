// The generator behind `npm run spa:frontmatter-keys` (scripts/spa/frontmatter-keys.mjs).
//
// Spec 005 section 2.2 wants the Key / Occurs in / Meaning table generated, so that a lab which adds a
// front-matter key costs one command and not a hand edit. AC24 checks the table that is committed. This
// file checks the command that produces it, because a generator that quietly lost the hand-written Meaning
// text, or rewrote a table it could not read, would make that one command something nobody dares to run.
//
// Each case builds a small curriculum in a temporary directory and runs the real script over it with
// `--root`, so none of them depends on what the real curriculum holds today or on what the lab branches
// are adding to it. The expected table is written out by hand in this file, not produced by the generator,
// so the generator is never marking its own work. Only the last case reads the real repository.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DOC_PATH, SCHEMA_PATH, findTables } from './helpers/frontmatter-keys';
import { SLOW, runNode, type Run } from './helpers/run-node';

const ROOT = process.cwd();
const SCRIPT = 'scripts/spa/frontmatter-keys.mjs';
const BEGIN = '<!-- spa:frontmatter-keys:begin -->';
const END = '<!-- spa:frontmatter-keys:end -->';

// --- a small, invented curriculum and the table that describes it ---------------------------------

/** A markdown file whose front matter is `lines`. */
const withFrontMatter = (...lines: string[]): string => `---\n${lines.join('\n')}\n---\n\nBody text.\n`;

const CURRICULUM: Record<string, string> = {
  'workshop/slides/10-one.md': withFrontMatter('title: One', 'minutes: 10', 'module: M1'),
  'workshop/speaker-scripts/one.md': withFrontMatter('title: One, spoken', 'minutes: 10'),
  'labs/lab01.md': withFrontMatter('title: Lab one', 'lab_number: 1'),
};

/** What the four keys of CURRICULUM mean, as a person wrote it. `title` holds an escaped pipe on purpose. */
const MEANING: Record<string, string> = {
  lab_number: 'Where the lab sits in the sequence.',
  minutes: 'Minutes allotted in the budget.',
  module: 'The module the slide belongs to.',
  title: 'Shown as "a \\| b" in the contents.',
};

/** Where each key of CURRICULUM occurs, in the order the table lists them: slides, speaker-scripts, labs. */
const OCCURS: Record<string, string> = {
  lab_number: 'labs',
  minutes: 'slides, speaker-scripts',
  module: 'slides',
  title: 'slides, speaker-scripts, labs',
};

const rowLine = (key: string): string => `| ${key} | ${OCCURS[key]} | ${MEANING[key]} |`;
const TABLE_HEAD = ['| Key | Occurs in | Meaning |', '|---|---|---|'];

/** A document: hand-written text, the marker pair around `body`, more hand-written text. */
const documentWith = (body: string[]): string =>
  ['# Content authoring', '', 'Written by hand, above the table.', '', BEGIN, ...body, END, '', 'Written by hand, below the table.', ''].join('\n');

/** The document that matches CURRICULUM exactly. Running the generator over it must change nothing. */
const CANONICAL = documentWith([...TABLE_HEAD, ...Object.keys(MEANING).map(rowLine)]);

/** A schema that accepts exactly the keys of CURRICULUM. */
const schemaAccepting = (...keys: string[]): string => JSON.stringify({ properties: Object.fromEntries(keys.map((key) => [key, {}])) });
const SCHEMA_TEXT = schemaAccepting(...Object.keys(MEANING));

const BASE: Record<string, string> = { ...CURRICULUM, [SCHEMA_PATH]: SCHEMA_TEXT, [DOC_PATH]: CANONICAL };

/** A second lab that introduces a key the document, and the schema, have never heard of. */
const LAB_WITH_NEW_KEY = withFrontMatter('title: Lab two', 'lab_number: 2', 'new_key: [a, b]');

// --- running the script ---------------------------------------------------------------------------

let base: string;
let cases = 0;

beforeAll(() => {
  base = mkdtempSync(join(tmpdir(), 'spa-keys-'));
});

afterAll(() => {
  rmSync(base, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

/** Writes `files` (repo-relative path to text) into a directory of its own and returns that directory. */
function seed(files: Record<string, string>): string {
  cases += 1;
  const dir = join(base, `case-${cases}`);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text, 'utf8');
  }
  return dir;
}

const generate = (dir: string, ...args: string[]): Run => runNode(SCRIPT, ['--root', dir, ...args], ROOT);
const documentIn = (dir: string): string => readFileSync(join(dir, DOC_PATH), 'utf8');
const keysOf = (text: string): string[] => findTables(text)[0].rows.map((row) => row[0]);
const lines = (text: string): string[] => text.split('\n');
const outside = (text: string) => ({ above: text.slice(0, text.indexOf(BEGIN)), below: text.slice(text.indexOf(END)) });

describe('spa:frontmatter-keys: a lab that adds a front-matter key costs one command', () => {
  it('adds a row for the new key and keeps every Meaning already written, character for character', () => {
    const dir = seed({ ...BASE, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    const run = generate(dir);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain('5 keys from 4 files');
    expect(run.stdout).toContain('rewritten');

    const written = documentIn(dir);
    expect(keysOf(written)).toEqual(['lab_number', 'minutes', 'module', 'new_key', 'title']);
    for (const key of Object.keys(MEANING)) expect(lines(written), `the row of ${key}`).toContain(rowLine(key));
    expect(written).toMatch(/^\| new_key \| labs \| TODO/m);
  }, SLOW);

  it('leaves the hand-written text above and below the markers exactly as it found it', () => {
    const dir = seed({ ...BASE, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    generate(dir);
    expect(outside(documentIn(dir))).toEqual(outside(CANONICAL));
  }, SLOW);

  it('lists every kind of file a key occurs in, in the order slides, speaker-scripts, labs', () => {
    const dir = seed({ ...BASE, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    generate(dir);
    expect(lines(documentIn(dir))).toContain('| title | slides, speaker-scripts, labs | Shown as "a \\| b" in the contents. |');
  }, SLOW);

  it('says what is still to do by hand: a Meaning for the new key, and its type in the closed schema', () => {
    const dir = seed({ ...BASE, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    const { stdout } = generate(dir);
    expect(stdout).toContain('no hand-written Meaning yet for: new_key');
    expect(stdout).toContain('the schema does not accept: new_key (array)');
    expect(stdout).toContain(SCHEMA_PATH);
  }, SLOW);

  it('keeps a Meaning a person wrote for the new key on the next run, and stops reporting it as missing', () => {
    const dir = seed({ ...BASE, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    generate(dir);
    const placeholderRow = /^(\| new_key \| labs \| )TODO.*$/m;
    expect(documentIn(dir), 'the first run wrote a placeholder row for the new key').toMatch(placeholderRow);
    writeFileSync(join(dir, DOC_PATH), documentIn(dir).replace(placeholderRow, '$1What the lab introduces. |'), 'utf8');
    const again = generate(dir);
    expect(again.status, again.stdout + again.stderr).toBe(0);
    expect(lines(documentIn(dir))).toContain('| new_key | labs | What the lab introduces. |');
    expect(again.stdout).not.toContain('no hand-written Meaning yet');
  }, SLOW);

  it('is idempotent: the second run reports the table unchanged and writes the same bytes', () => {
    const dir = seed({ ...BASE, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    expect(generate(dir).stdout).toContain('rewritten');
    const written = documentIn(dir);
    const second = generate(dir);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain('unchanged');
    expect(documentIn(dir)).toBe(written);
  }, SLOW);

  it('leaves a document that already matches the curriculum untouched, and a file without front matter adds no key', () => {
    const dir = seed({ ...BASE, 'labs/setup.md': '# Setup\n\nNo front matter here.\n' });
    const run = generate(dir);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain('4 keys from 4 files');
    expect(run.stdout).toContain('unchanged');
    expect(documentIn(dir)).toBe(CANONICAL);
  }, SLOW);
});

describe('spa:frontmatter-keys: a key that leaves the curriculum, and keys the schema disagrees about', () => {
  it('drops the row of a key no file carries any more, and says so', () => {
    const withGhost = documentWith([...TABLE_HEAD, ...Object.keys(MEANING).map(rowLine), '| ghost | labs | A key that was removed. |']);
    const dir = seed({ ...BASE, [DOC_PATH]: withGhost });
    const run = generate(dir);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(keysOf(documentIn(dir))).not.toContain('ghost');
    expect(documentIn(dir)).not.toContain('A key that was removed.');
    expect(run.stdout).toContain('their rows were dropped: ghost');
  }, SLOW);

  it('reports a key the schema accepts that no file uses, and one the schema lacks, without touching the schema', () => {
    const schema = schemaAccepting(...Object.keys(MEANING), 'unused_key');
    const dir = seed({ ...BASE, [SCHEMA_PATH]: schema, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    const { stdout } = generate(dir);
    expect(stdout).toContain('the schema accepts keys no curriculum file uses: unused_key');
    expect(stdout).toContain('the schema does not accept: new_key (array)');
    expect(readFileSync(join(dir, SCHEMA_PATH), 'utf8')).toBe(schema);
  }, SLOW);
});

describe('spa:frontmatter-keys: --check', () => {
  it('exits 1 and writes nothing when the table is stale, then exits 0 once the command has run', () => {
    const dir = seed({ ...BASE, 'labs/lab02.md': LAB_WITH_NEW_KEY });

    const stale = generate(dir, '--check');
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('is stale: run npm run spa:frontmatter-keys');
    expect(documentIn(dir)).toBe(CANONICAL);

    expect(generate(dir).status).toBe(0);
    const current = generate(dir, '--check');
    expect(current.status, current.stdout + current.stderr).toBe(0);
    expect(current.stdout).toContain('is up to date');
  }, SLOW);

  it('exits 1 for a key a lab removed, and 0 for a document that matches', () => {
    const matching = seed(BASE);
    expect(generate(matching, '--check').status).toBe(0);

    const { 'labs/lab01.md': _removed, ...withoutLab } = BASE;
    const stale = seed(withoutLab);
    expect(generate(stale, '--check').status).toBe(1);
  }, SLOW);

  it('treats line endings as formatting, not content: a CRLF document that matches is up to date', () => {
    const dir = seed({ ...BASE, [DOC_PATH]: CANONICAL.replace(/\n/g, '\r\n') });
    const run = generate(dir, '--check');
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain('is up to date');
  }, SLOW);
});

describe('spa:frontmatter-keys: a Meaning is never lost', () => {
  it('keeps every Meaning when the document has CRLF line endings, as a Windows checkout does', () => {
    const dir = seed({ ...BASE, [DOC_PATH]: CANONICAL.replace(/\n/g, '\r\n'), 'labs/lab02.md': LAB_WITH_NEW_KEY });
    const run = generate(dir);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    const written = documentIn(dir).replace(/\r\n/g, '\n');
    for (const key of Object.keys(MEANING)) expect(lines(written), `the row of ${key}`).toContain(rowLine(key));
    expect(keysOf(written)).toContain('new_key');
  }, SLOW);

  it.each([
    ['four cells', '| title | slides | A Meaning | and one cell too many |'],
    ['two cells', '| title | slides |'],
  ])('stops, and leaves the document untouched, at a table row with %s, rather than replace its Meaning', (_what, row) => {
    const rows = Object.keys(MEANING).map((key) => (key === 'title' ? row : rowLine(key)));
    const original = documentWith([...TABLE_HEAD, ...rows]);
    const dir = seed({ ...BASE, [DOC_PATH]: original });
    const run = generate(dir);
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/a table row has \d cells, not 3/);
    expect(documentIn(dir)).toBe(original);
  }, SLOW);

  it('stops, and leaves the document untouched, when there is no curriculum to read, so a wrong --root cannot empty the table', () => {
    const dir = seed({ [SCHEMA_PATH]: SCHEMA_TEXT, [DOC_PATH]: CANONICAL });
    const run = generate(dir);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('no curriculum files found');
    expect(documentIn(dir)).toBe(CANONICAL);
  }, SLOW);

  it.each([
    ['front matter that is not valid YAML', withFrontMatter('title: [unclosed'), /cannot read the curriculum front matter/],
    ['front matter that is a list, not a mapping', withFrontMatter('- a', '- b'), /front matter must be a mapping/],
    ['a key that cannot be written in a table cell', withFrontMatter('"a|b": 1'), /cannot be written in a table cell/],
  ])('stops, and leaves the document untouched, for a lab with %s', (_what, lab, message) => {
    const dir = seed({ ...BASE, 'labs/lab02.md': lab });
    const run = generate(dir);
    expect(run.status, run.stdout + run.stderr).toBe(1);
    expect(run.stderr).toMatch(message);
    expect(documentIn(dir)).toBe(CANONICAL);
  }, SLOW);

  // The table has a header cell called Key and a delimiter row of dashes. A front-matter key may be spelled
  // the same way, and the script accepts it and writes its row. A reader that took any row whose first cell
  // is `Key` or dashes for the table's own furniture would drop that row, and with it the Meaning a person
  // wrote, and replace it with the placeholder on the next run, with exit 0 both times.
  it.each(['Key', '---'])('keeps the Meaning written for the key "%s", which reads like a header or delimiter cell', (key) => {
    const dir = seed({ ...BASE, 'labs/lab02.md': withFrontMatter(`${JSON.stringify(key)}: 1`) });
    const first = generate(dir);
    expect(first.status, first.stdout + first.stderr).toBe(0);
    const written = lines(documentIn(dir));
    const placeholderRow = written.find((line) => line.startsWith(`| ${key} | labs | TODO`));
    expect(placeholderRow, `the first run wrote a row for "${key}"`).toBeDefined();

    const authored = `| ${key} | labs | What a person wrote for this key. |`;
    writeFileSync(join(dir, DOC_PATH), written.map((line) => (line === placeholderRow ? authored : line)).join('\n'), 'utf8');
    const edited = documentIn(dir);

    const current = generate(dir, '--check');
    expect(current.status, `--check on a document that holds a Meaning for "${key}": ${current.stdout}${current.stderr}`).toBe(0);
    expect(current.stdout).toContain('is up to date');

    const again = generate(dir);
    expect(again.status, again.stdout + again.stderr).toBe(0);
    expect(lines(documentIn(dir)), `the row of "${key}"`).toContain(authored);
    expect(documentIn(dir), 'the second run changes nothing').toBe(edited);
    expect(again.stdout).toContain('unchanged');
    expect(again.stdout).not.toContain('no hand-written Meaning yet');
    expect(again.stdout).not.toContain('rows were dropped');
    // The table's real header and delimiter are still there, once each, and not mistaken for rows of keys.
    expect(lines(documentIn(dir)).filter((line) => line === TABLE_HEAD[0])).toHaveLength(1);
    expect(lines(documentIn(dir)).filter((line) => line === TABLE_HEAD[1])).toHaveLength(1);
  }, SLOW);
});

describe('spa:frontmatter-keys: it is invoked correctly or not at all', () => {
  it.each([
    ['no marker pair', CANONICAL.replace(BEGIN, '').replace(END, '')],
    ['two marker pairs', `${CANONICAL}\n${BEGIN}\n${END}\n`],
    ['the markers the wrong way round', CANONICAL.replace(BEGIN, '@@END@@').replace(END, BEGIN).replace('@@END@@', END)],
  ])('exits 2 and writes nothing when the document has %s', (_what, original) => {
    const dir = seed({ ...BASE, [DOC_PATH]: original, 'labs/lab02.md': LAB_WITH_NEW_KEY });
    const run = generate(dir);
    expect(run.status).toBe(2);
    expect(run.stderr).toContain('exactly one');
    expect(documentIn(dir)).toBe(original);
  }, SLOW);

  it('exits 2 when the root holds no document at all', () => {
    const run = generate(seed(CURRICULUM));
    expect(run.status).toBe(2);
    expect(run.stderr).toContain('does not exist');
  }, SLOW);

  it.each([
    ['an option it does not know', ['--frobnicate'], 'unknown argument: --frobnicate'],
    ['--root with no directory after it', ['--root'], 'unknown argument: --root'],
  ])('exits 2 for %s', (_what, args, message) => {
    const run = runNode(SCRIPT, args, ROOT);
    expect(run.status).toBe(2);
    expect(run.stderr).toContain(message);
  }, SLOW);
});

describe('spa:frontmatter-keys: over the real repository', () => {
  it('is the npm script `node scripts/spa/frontmatter-keys.mjs`, the one command a lab author is told to run', () => {
    const { scripts } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(scripts['spa:frontmatter-keys']).toBe(`node ${SCRIPT}`);
  });

  it('finds the committed document exactly as the command would write it, so there is nothing left to regenerate', () => {
    const run = runNode(SCRIPT, ['--check'], ROOT);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(run.stdout).toContain('is up to date');
  }, SLOW);
});
