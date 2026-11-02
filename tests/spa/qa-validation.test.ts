// Independent missing-behavior tests for child issue 1 of spec 005.
// The two "QA defect" describes at the end were expected failures (it.fails) while the validator
// still classified datasets/deck.json by its name and walked past dotfiles; both are fixed, so they
// are ordinary tests now and a regression turns them red.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONTENT, DATASET, DECK, INTERACTIONS, QASandbox } from './helpers/qa-sandbox';
import { SLOW, runNode } from './helpers/run-node';

interface Deck {
  segments: Array<{ id: string; minutes: number }>;
}
interface Inventory {
  interactions: Array<{ id: string; segment: string; dataset?: string }>;
}
interface Dataset {
  id: string;
  parameters: Array<{ id: string; min: number; max: number; default: number }>;
  outputs: Array<{ id: string; terms: Array<{ parameter: string; coefficient: number }> }>;
}

let box: QASandbox;
beforeEach(() => {
  box = new QASandbox();
});
afterEach(() => {
  box?.close();
});

const checked =  (run: ReturnType<QASandbox['validate']>) => box.report(run).targets.flatMap((target) => target.files);

function expectInvalid(target: string, path: string, keyword = 'semantic'): void {
  const run = box.validate(target);
  expect(run.status, run.stdout + run.stderr).toBe(1);
  expect(run.stderr).toBe('');
  expect(checked(run)).toEqual([
    expect.objectContaining({
      ok: false,
      errors: expect.arrayContaining([expect.objectContaining({ keyword, path })]),
    }),
  ]);
}

describe('QA semantic validation: IDs and sibling references', () => {
  it('rejects duplicate segment IDs', () => {
    const deck = box.json<Deck>(DECK);
    deck.segments.push(structuredClone(deck.segments[0]));
    box.writeJson(DECK, deck);
    expectInvalid(DECK, `/segments/${deck.segments.length - 1}/id`);
  }, SLOW);

  it('rejects duplicate interaction IDs', () => {
    const inventory = box.json<Inventory>(INTERACTIONS);
    inventory.interactions.push(structuredClone(inventory.interactions[0]));
    box.writeJson(INTERACTIONS, inventory);
    expectInvalid(INTERACTIONS, `/interactions/${inventory.interactions.length - 1}/id`);
  }, SLOW);

  it('rejects a well-formed segment ID absent from its sibling deck', () => {
    const inventory = box.json<Inventory>(INTERACTIONS);
    inventory.interactions[0].segment = 'qa-no-such-segment';
    box.writeJson(INTERACTIONS, inventory);
    expectInvalid(INTERACTIONS, '/interactions/0/segment');
  }, SLOW);

  it('rejects interactions without a sibling deck rather than treating references as optional', () => {
    box.remove(DECK);
    expectInvalid(INTERACTIONS, '/interactions/0/segment');
  }, SLOW);

  it('rejects a dataset reference absent from the sibling dataset directory', () => {
    const inventory = box.json<Inventory>(INTERACTIONS);
    inventory.interactions[0].dataset = 'qa-no-such-dataset';
    box.writeJson(INTERACTIONS, inventory);
    expectInvalid(INTERACTIONS, '/interactions/0/dataset');
  }, SLOW);

  it('rejects dataset references when the sibling directory is missing', () => {
    const inventory = box.json<Inventory>(INTERACTIONS);
    inventory.interactions[0].dataset = box.json<Dataset>(DATASET).id;
    box.writeJson(INTERACTIONS, inventory);
    box.remove(`${CONTENT}/datasets`);
    expectInvalid(INTERACTIONS, '/interactions/0/dataset');
  }, SLOW);

  it('rejects an ID used by two dataset files even when only one file is targeted', () => {
    box.writeJson(`${CONTENT}/datasets/qa-duplicate.json`, box.json<Dataset>(DATASET));
    expectInvalid(DATASET, '/id');
  }, SLOW);

  it.each(['parameters', 'outputs'] as const)('rejects duplicate %s IDs', (field) => {
    const dataset = box.json<Dataset>(DATASET);
    if (field === 'parameters') dataset.parameters.push(structuredClone(dataset.parameters[0]));
    else dataset.outputs.push(structuredClone(dataset.outputs[0]));
    box.writeJson(DATASET, dataset);
    expectInvalid(DATASET, `/${field}/${dataset[field].length - 1}/id`);
  }, SLOW);
});

describe('QA semantic validation: numeric boundaries and declarative terms', () => {
  it.each(['equal', 'reversed'] as const)('rejects %s parameter bounds', (what) => {
    const dataset = box.json<Dataset>(DATASET);
    const parameter = dataset.parameters[0];
    parameter.min = parameter.max + (what === 'equal' ? 0 : 1);
    box.writeJson(DATASET, dataset);
    expectInvalid(DATASET, '/parameters/0');
  }, SLOW);

  it.each(['below', 'above'] as const)('rejects a default %s the parameter range', (where) => {
    const dataset = box.json<Dataset>(DATASET);
    const parameter = dataset.parameters[0];
    parameter.default = where === 'below' ? parameter.min - 1 : parameter.max + 1;
    box.writeJson(DATASET, dataset);
    expectInvalid(DATASET, '/parameters/0/default');
  }, SLOW);

  it.each(['min', 'max'] as const)('accepts a default exactly at %s, so bounds are inclusive', (bound) => {
    const dataset = box.json<Dataset>(DATASET);
    dataset.parameters[0].default = dataset.parameters[0][bound];
    box.writeJson(DATASET, dataset);
    const run = box.validate(DATASET);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(checked(run)[0].errors).toEqual([]);
  }, SLOW);

  it('rejects undeclared term parameters, including a bad term after 2,000 valid terms', () => {
    const dataset = box.json<Dataset>(DATASET);
    const parameter = dataset.parameters[0].id;
    dataset.outputs[0].terms = [
      ...Array.from({ length: 2_000 }, () => ({ parameter, coefficient: 1 })),
      { parameter: 'qaUndeclared', coefficient: 1 },
    ];
    box.writeJson(DATASET, dataset);
    expectInvalid(DATASET, '/outputs/0/terms/2000/parameter');
  }, SLOW);
});

describe('QA schema and batch error paths', () => {
  it.each([DECK, INTERACTIONS, DATASET])('rejects unknown root properties in %s', (target) => {
    box.writeJson(target, { ...box.json<Record<string, unknown>>(target), qa_unexpected: true });
    expectInvalid(target, '(root)', 'additionalProperties');
  }, SLOW);

  it.each([
    ['malformed JSON', DATASET, '{ "id": ', 'parse'],
    ['malformed YAML', 'labs/qa-malformed.md', '---\ntitle: [unclosed\n---\n', 'parse'],
    ['a YAML sequence', 'labs/qa-sequence.md', '---\n- one\n- two\n---\n', 'type'],
    ['a YAML scalar', 'labs/qa-scalar.md', '---\nfalse\n---\n', 'type'],
    ['a hostile YAML tag', 'labs/qa-tag.md', '---\ntitle: !!js/function "function () {}"\n---\n', 'parse'],
  ])('rejects %s with a file error, not a crash', (_what, target, text, keyword) => {
    box.write(target, text);
    expectInvalid(target, keyword === 'type' ? '(root)' : '(file)', keyword);
  }, SLOW);

  it('keeps the errors of both front-matter files after successive calls of the same Ajv validator', () => {
    const files = ['labs/qa-first.md', 'labs/qa-second.md'];
    const keys = ['qa_first_undeclared', 'qa_second_undeclared'];
    files.forEach((file, index) => box.write(file, `---\n${keys[index]}: true\n---\n`));
    const run = box.validate(...files);
    expect(run.status, run.stdout + run.stderr).toBe(1);
    const results = checked(run);
    expect(results).toHaveLength(2);
    results.forEach((result, index) => {
      expect(result.file).toBe(files[index]);
      expect(result.errors).toEqual([
        { keyword: 'additionalProperties', path: '(root)', message: `undeclared property "${keys[index]}"` },
      ]);
    });
  }, SLOW);

  it('refuses an unclassified visible content file instead of treating it as valid', () => {
    box.write(`${CONTENT}/qa-not-content.txt`, 'unclassified\n');
    const run = box.validate(CONTENT);
    expect(run.status, run.stdout + run.stderr).toBe(1);
    expect(checked(run)).toContainEqual(expect.objectContaining({
      file: `${CONTENT}/qa-not-content.txt`,
      kind: null,
      ok: false,
      errors: [expect.objectContaining({ keyword: 'unclassified' })],
    }));
  }, SLOW);

  it('fails schema compilation on an unknown keyword, proving Ajv strict mode is enabled', () => {
    const path = 'workshop/spa/schema/dataset.schema.json';
    box.writeJson(path, { ...box.json<Record<string, unknown>>(path), qa_unknown_keyword: true });
    const run = box.validate();
    expect(run.status, run.stdout + run.stderr).toBe(2);
    expect(run.stderr).toContain('unknown keyword: "qa_unknown_keyword"');
    expect(run.stdout).toBe('');
  }, SLOW);

  it('compiles each schema once and reuses it across all curriculum and content files in a process', () => {
    // A test-only preload counts compile calls without changing the validator.
    box.write('qa-compile-trace.mjs', [
      "import Ajv2020 from 'ajv/dist/2020.js';",
      'const compile = Ajv2020.prototype.compile;',
      'Ajv2020.prototype.compile = function (...args) {',
      "  process.stderr.write('QA_COMPILE\\n');",
      '  return compile.apply(this, args);',
      '};',
      "await import('./scripts/spa/validate.mjs');",
    ].join('\n'));
    const run = runNode(join(box.root, 'qa-compile-trace.mjs'), ['--json'], box.root);
    const schemas = readdirSync(join(box.root, 'workshop/spa/schema')).filter((name) => name.endsWith('.schema.json'));
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(checked(run).length).toBeGreaterThan(schemas.length);
    expect(run.stderr.match(/^QA_COMPILE$/gm)).toHaveLength(schemas.length);
  }, SLOW);
});

describe('QA defect: dataset classification follows datasets/*.json', () => {
  it.each(['deck.json', 'interactions.json'])('uses the dataset schema for datasets/%s', (name) => {
    const path = `${CONTENT}/datasets/${name}`;
    box.writeJson(path, { ...box.json<Dataset>(DATASET), id: 'qa-renamed-dataset' });
    const run = box.validate(path);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(checked(run)).toEqual([expect.objectContaining({ file: path, kind: 'dataset', ok: true, errors: [] })]);
  }, SLOW);
});

describe('QA round-2: dataset directory and hidden-file rules reach sibling callers', () => {
  it.each(['deck.json', 'interactions.json', '.qa-hidden.json'])('applies dataset semantic checks to datasets/%s, not only its JSON schema', (name) => {
    const path = `${CONTENT}/datasets/${name}`;
    const dataset = box.json<Dataset>(DATASET);
    dataset.id = 'qa-semantic-dataset';
    dataset.parameters[0].default = dataset.parameters[0].max + 1;
    box.writeJson(path, dataset);
    expectInvalid(path, '/parameters/0/default');
    expect(checked(box.validate(path))[0].kind).toBe('dataset');
  }, SLOW);

  it.each(['deck.json', 'interactions.json', '.qa-hidden.json'])('indexes dataset %s for interactions even when only the inventory is targeted', (name) => {
    const dataset = box.json<Dataset>(DATASET);
    const inventory = box.json<Inventory>(INTERACTIONS);
    inventory.interactions[0].dataset = dataset.id;
    box.writeJson(INTERACTIONS, inventory);
    box.writeJson(`${CONTENT}/datasets/${name}`, dataset);
    box.remove(DATASET);
    const run = box.validate(INTERACTIONS);
    expect(run.status, run.stdout + run.stderr).toBe(0);
    expect(checked(run)).toEqual([
      expect.objectContaining({ file: INTERACTIONS, kind: 'interactions', ok: true, errors: [] }),
    ]);
  }, SLOW);
});

describe('QA defect: AC1 every content file means no silently omitted files', () => {
  it.each([
    `${CONTENT}/datasets/.qa-hidden.json`,
    `${CONTENT}/.qa-hidden/datasets/bad.json`,
    `${CONTENT}/node_modules/datasets/bad.json`,
  ])('does not silently omit %s', (path) => {
    box.write(path, '{"malformed": ');
    const run = box.validate(CONTENT);
    expect(run.status, run.stdout + run.stderr).toBe(1);
    expect(checked(run)).toContainEqual(expect.objectContaining({ file: path, kind: 'dataset', ok: false }));
  }, SLOW);
});
