// AC25 (specs/005-teaching-spa.md sections 2 and 2.2): workshop/spa/schema/frontmatter.schema.json
// declares `additionalProperties: false`, and the top-level property names it accepts equal exactly
// the `Key` column of workshop/spa/docs/content-authoring.md: no documented key is missing from the
// schema, and no key the schema accepts is absent from the document.
//
// This is the schema <-> document link of the chain. It never reads a curriculum file: AC24 binds the
// document to the files, and AC1 (validate-cli.test.ts) binds the schema to the files by running the
// validator over them. Collapsing the three into one test would let two of them agree with each other
// while the third was wrong.
//
// The schema's names are read from the schema and the document's from the document, every time this
// runs. There is no list of keys in this file. Two kinds of test live here, as in AC24:
//
//   1. The first describe block reads the working tree.
//   2. The second runs the same `inspect` function over a small tree held in memory, and shows that
//      each way the schema and the document can part company is reported. It holds no curriculum
//      file at all, which is itself the proof that this link does not depend on the other two. The key
//      names in it (alpha, beta, gamma) are fixtures for the check, not the set it expects.
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { DOC_PATH, SCHEMA_PATH, diffKeySets, diskTree, docKeys, docTable, memoryTree, readSchema, schemaKeys, type Tree } from './helpers/frontmatter-keys';

const ROOT = process.cwd();

/** What is wrong, clause by clause of AC25. An empty list means that clause holds. */
interface Findings {
  closed: string[];
  undeclared: string[];
  unlisted: string[];
}
const CLEAN: Findings = { closed: [], undeclared: [], unlisted: [] };

/**
 * Compares the schema in `tree` with the document in `tree`. The tests on the working tree and the
 * tests on a changed tree both go through this one function, so a tree that fails here shows the
 * real check failing.
 */
function inspect(tree: Tree): Findings {
  const schema = readSchema(tree);
  const found: Findings = { closed: [], undeclared: [], unlisted: [] };
  if (schema.additionalProperties !== false) {
    found.closed.push(`additionalProperties is ${JSON.stringify(schema.additionalProperties) ?? 'absent'}, expected false`);
  }
  if (schema.patternProperties !== undefined) {
    found.closed.push('patternProperties accepts key names by pattern, and a column of documented keys cannot list a pattern');
  }
  const { onlyLeft: unlisted, onlyRight: undeclared } = diffKeySets(schemaKeys(schema), docKeys(docTable(tree)));
  for (const key of undeclared) found.undeclared.push(`"${key}" is documented but the schema does not declare it`);
  for (const key of unlisted) found.unlisted.push(`"${key}" is declared by the schema but the document does not list it`);
  return found;
}

/** The key names that Ajv, in strict mode, rejects as additional properties when `data` is validated against `schema`. */
function rejectedAsAdditional(schema: Record<string, unknown>, data: Record<string, unknown>): string[] {
  const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema);
  validate(data);
  return (validate.errors ?? [])
    .filter((error) => error.keyword === 'additionalProperties')
    .map((error) => String(error.params.additionalProperty))
    .sort();
}

describe('AC25: frontmatter.schema.json accepts exactly the keys content-authoring.md documents', () => {
  const tree = diskTree(ROOT);
  let findings: Findings | undefined;
  const real = (): Findings => (findings ??= inspect(tree));
  const INVENTED = 'zz_key_that_nothing_documents';

  it('declares additionalProperties: false, and accepts no key by pattern', () => {
    expect(readSchema(tree).additionalProperties).toBe(false);
    expect(real().closed).toEqual([]);
  });

  it('has declared keys and documented keys to compare, so the comparison cannot pass over nothing', () => {
    expect(schemaKeys(readSchema(tree)).length, `properties declared by ${SCHEMA_PATH}`).toBeGreaterThan(0);
    expect(docKeys(docTable(tree)).length, `rows in the table of ${DOC_PATH}`).toBeGreaterThan(0);
  });

  it('declares every key the document lists', () => {
    expect(real().undeclared, `documented keys the schema does not declare (add them to ${SCHEMA_PATH})`).toEqual([]);
  });

  it('declares no key the document does not list', () => {
    expect(
      real().unlisted,
      `keys the schema declares that the document does not list (remove them from ${SCHEMA_PATH}, or run \`npm run spa:frontmatter-keys\` if a lab uses them)`,
    ).toEqual([]);
  });

  it('is closed when Ajv runs it in strict mode: it rejects a key nothing documents and does not reject a documented one', () => {
    const schema = readSchema(tree);
    const documented = docKeys(docTable(tree));
    expect(documented).not.toContain(INVENTED);
    expect(rejectedAsAdditional(schema, { [INVENTED]: 1 })).toEqual([INVENTED]);
    // Every value is wrong on purpose. A key the schema declares fails on its value, not as an additional property.
    expect(rejectedAsAdditional(schema, Object.fromEntries(documented.map((key) => [key, null])))).toEqual([]);
  });
});

describe('AC25: the same check reports drift in either direction, and needs no curriculum file', () => {
  const SCHEMA: Record<string, unknown> = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    additionalProperties: false,
    properties: { alpha: { type: 'integer' }, beta: { type: 'string' } },
  };
  const DOC = (...keys: string[]): string =>
    ['# Authoring', '', '| Key | Occurs in | Meaning |', '| --- | --- | --- |', ...keys.map((key) => `| ${key} | labs | Fixture. |`), ''].join('\n');
  /** `inspect` over a tree holding only a schema and a document: there is no curriculum file in it. */
  const run = (schema: Record<string, unknown> = SCHEMA, doc: string = DOC('alpha', 'beta')): Findings =>
    inspect(memoryTree({ [SCHEMA_PATH]: JSON.stringify(schema), [DOC_PATH]: doc }));
  const properties = (...names: string[]): Record<string, unknown> => ({ ...SCHEMA, properties: Object.fromEntries(names.map((name) => [name, {}])) });
  const only = (clause: Partial<Findings>): Findings => ({ ...CLEAN, ...clause });

  it('starts from a schema and a document that agree, so each change below is the only thing that can fail it', () => {
    expect(run()).toEqual(CLEAN);
  });

  it('reports a documented key the schema does not declare', () => {
    expect(run(properties('alpha'))).toEqual(only({ undeclared: ['"beta" is documented but the schema does not declare it'] }));
  });

  it('reports a key the schema declares that the document does not list', () => {
    expect(run(properties('alpha', 'beta', 'gamma'))).toEqual(only({ unlisted: ['"gamma" is declared by the schema but the document does not list it'] }));
  });

  it('reports both directions at once, and does not let one cancel the other', () => {
    expect(run(properties('alpha', 'gamma'))).toEqual({
      closed: [],
      undeclared: ['"beta" is documented but the schema does not declare it'],
      unlisted: ['"gamma" is declared by the schema but the document does not list it'],
    });
  });

  it('reports a schema that is not closed: additionalProperties true, absent or a schema', () => {
    const { additionalProperties: _closed, ...absent } = SCHEMA;
    for (const [what, schema] of [
      ['true', { ...SCHEMA, additionalProperties: true }],
      ['absent', absent],
      ['a schema', { ...SCHEMA, additionalProperties: { type: 'string' } }],
    ] as const) {
      expect(run(schema).closed, `additionalProperties ${what}`).toHaveLength(1);
    }
  });

  it('reports a schema that accepts key names by pattern, which no column of documented keys can list', () => {
    expect(run({ ...SCHEMA, patternProperties: { '^x-': {} } }).closed).toHaveLength(1);
  });

  it('shows the Ajv probe the real-tree test uses would catch an open schema', () => {
    expect(rejectedAsAdditional(SCHEMA, { gamma: 1 }), 'a closed schema').toEqual(['gamma']);
    expect(rejectedAsAdditional({ ...SCHEMA, additionalProperties: true }, { gamma: 1 }), 'an open schema').toEqual([]);
  });

  it('fails loudly when the document does not hold exactly one table, so the Key column is never ambiguous', () => {
    expect(() => run(SCHEMA, '# Authoring\n\nNo table here.\n')).toThrow(/exactly one table, found 0/);
    expect(() => run(SCHEMA, `${DOC('alpha', 'beta')}\n| Another | Table |\n| --- | --- |\n| a | b |\n`)).toThrow(/exactly one table, found 2/);
  });

  it('fails loudly when the schema file is missing or is not JSON', () => {
    expect(() => inspect(memoryTree({ [DOC_PATH]: DOC('alpha', 'beta') }))).toThrow(/frontmatter\.schema\.json/);
    expect(() => inspect(memoryTree({ [DOC_PATH]: DOC('alpha', 'beta'), [SCHEMA_PATH]: '{ not json' }))).toThrow(SyntaxError);
  });
});
