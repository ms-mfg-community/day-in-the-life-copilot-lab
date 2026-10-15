// Run with: node tests/spa/qa-mutation-check.mjs
// All mutations are owned test fixtures under tests/spa, never product edits.
// A run succeeds only when each selected real assertion goes red as intended.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const scratch = mkdtempSync(join(ROOT, 'tests/spa/.qa-mutants-'));
const vitest = join(ROOT, 'node_modules/vitest/vitest.mjs');
const validation = 'tests/spa/qa-validation.test.ts';
const keys = 'tests/spa/qa-frontmatter-keys.test.ts';
const lib = 'scripts/spa/lib/validate.mjs';
const frontmatterSchema = 'workshop/spa/schema/frontmatter.schema.json';

function replace(root, path, before, after) {
  const file = join(root, path);
  // Windows checkouts may use CRLF; normalize only this owned fixture, never the source tree.
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (!source.includes(before)) throw new Error(`mutation anchor absent in ${path}: ${before}`);
  writeFileSync(file, source.replace(before, after));
}

function updateJson(root, path, change) {
  const file = join(root, path);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  change(data);
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function seed(name, complete) {
  const root = join(scratch, name);
  mkdirSync(root);
  for (const dir of ['scripts/spa', 'workshop/spa/schema']) {
    cpSync(join(ROOT, dir), join(root, dir), { recursive: true });
  }
  if (complete) {
    for (const dir of ['workshop/spa/content', 'workshop/spa/docs']) {
      cpSync(join(ROOT, dir), join(root, dir), { recursive: true });
    }
    mkdirSync(join(root, 'tests/spa'), { recursive: true });
    for (const entry of readdirSync(join(ROOT, 'tests/spa'), { withFileTypes: true })) {
      if (!entry.name.startsWith('.qa-')) {
        cpSync(join(ROOT, 'tests/spa', entry.name), join(root, 'tests/spa', entry.name), { recursive: true });
      }
    }
    for (const dir of ['workshop/slides', 'workshop/speaker-scripts', 'labs']) {
      mkdirSync(join(root, dir), { recursive: true });
      for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.')) {
          cpSync(join(ROOT, dir, entry.name), join(root, dir, entry.name));
        }
      }
    }
    for (const file of ['package.json', 'vitest.config.ts']) cpSync(join(ROOT, file), join(root, file));
  }
  return root;
}

function run(name, file, pattern, expected, mutate, complete = false) {
  const root = seed(name, complete);
  mutate(root);
  const env = { ...process.env };
  delete env.SPA_QA_REPRO;
  delete env.SPA_QA_SOURCE_ROOT;
  if (!complete) env.SPA_QA_SOURCE_ROOT = root;
  const args = [vitest, 'run', file, '-t', pattern, '--reporter=dot'];
  const result = spawnSync(process.execPath, args, {
    cwd: complete ? root : ROOT,
    env,
    encoding: 'utf8',
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const failed = Number(/Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0);
  const evidence = output.split(/\r?\n/).filter((line) =>
    /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:)/.test(line),
  );
  console.log(`\nMUTATION ${name}`);
  console.log(`command: node node_modules/vitest/vitest.mjs run ${file} -t ${JSON.stringify(pattern)} --reporter=dot`);
  console.log(`isolated ${complete ? 'cwd' : 'SPA_QA_SOURCE_ROOT'}: ${root}`);
  console.log(`exit: ${result.status}; red assertions: ${failed} (expected ${expected})`);
  console.log(evidence.join('\n'));
  if (result.error || result.status !== 1 || failed !== expected) {
    console.log(output);
    throw new Error(`mutation ${name} was not proved: ${result.error?.message ?? 'unexpected exit/count'}`);
  }
}

try {
  run('semantic-checks-disabled', validation, 'QA semantic validation', 14, (root) => {
    replace(root, lib, 'export function applySemanticChecks(results) {', 'export function applySemanticChecks(results) {\n  return;');
  });
  run('inclusive-defaults-made-exclusive', validation, 'accepts a default exactly', 2, (root) => {
    replace(root, lib, 'p.default < p.min || p.default > p.max', 'p.default <= p.min || p.default >= p.max');
  });
  run('json-root-closures-opened', validation, 'rejects unknown root properties', 3, (root) => {
    for (const kind of ['deck', 'interactions', 'dataset']) {
      updateJson(root, `workshop/spa/schema/${kind}.schema.json`, (schema) => { schema.additionalProperties = true; });
    }
  });
  run('frontmatter-parser-bypassed', validation, 'rejects malformed YAML|rejects a YAML|rejects a hostile YAML|keeps the errors of both', 5, (root) => {
    replace(root, 'scripts/spa/lib/curriculum.mjs', 'export function readFrontMatter(absFile) {', 'export function readFrontMatter(absFile) {\n  return { data: {} };');
  });
  run('json-parse-error-concealed', validation, 'rejects malformed JSON', 1, (root) => {
    replace(root, lib, 'return { error: `not valid JSON: ${error.message}` };', 'return { data: {} };');
  });
  run('unclassified-files-accepted', validation, 'refuses an unclassified visible', 1, (root) => {
    replace(root, lib, 'if (kind === null) {', 'if (kind === null) return result;\n  if (kind === null) {');
  });
  run('ajv-strict-mode-disabled', validation, 'fails schema compilation on an unknown keyword', 1, (root) => {
    replace(root, lib, 'strict: true, allErrors: true', 'strict: false, allErrors: true');
  });
  run('ajv-cache-disabled', validation, 'compiles each schema once', 1, (root) => {
    replace(root, lib, 'function getValidators() {', 'function getValidators() {\n  validators = undefined;');
  });
  run('handwritten-meanings-discarded', keys, 'positive controls', 2, (root) => {
    replace(
      root,
      'scripts/spa/frontmatter-keys.mjs',
      "const writtenMeanings = (rows) => new Map([...rows].filter(([, meaning]) => meaning !== '' && meaning !== PLACEHOLDER));",
      'const writtenMeanings = () => new Map();',
    );
  });

  // Round 2: restore the earlier defects only in owned fixtures, and challenge the new sibling paths.
  run('dataset-directory-priority-reverted', validation, 'QA defect: dataset classification', 2, (root) => {
    replace(
      root,
      lib,
      "  if (basename(dirname(abs)) === 'datasets') return 'dataset';\n  if (name === 'deck.json') return 'deck';\n  if (name === 'interactions.json') return 'interactions';",
      "  if (name === 'deck.json') return 'deck';\n  if (name === 'interactions.json') return 'interactions';\n  if (basename(dirname(abs)) === 'datasets') return 'dataset';",
    );
  });
  run('named-directory-exclusions-restored', validation, 'QA defect: AC1 every content file', 3, (root) => {
    replace(
      root,
      lib,
      'for (const entry of readdirSync(dir, { withFileTypes: true })) {',
      "for (const entry of readdirSync(dir, { withFileTypes: true })) {\n    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;",
    );
  });
  run('first-cell-table-syntax-restored', keys, 'QA defect|QA round-2', 6, (root) => {
    replace(
      root,
      'scripts/spa/frontmatter-keys.mjs',
      'if (isHeaderRow(cells) || isDelimiterRow(cells)) continue;',
      "if (cells[0] === HEADERS[0] || /^:?-+:?$/.test(cells[0])) continue;",
    );
  });
  run('dataset-semantics-bypassed', validation, 'applies dataset semantic checks', 3, (root) => {
    replace(root, lib, 'function checkDataset(result, index) {', 'function checkDataset(result, index) {\n  return;');
  });
  run('hidden-dataset-index-exclusion-restored', validation, 'indexes dataset .qa-hidden', 1, (root) => {
    replace(
      root,
      lib,
      ".filter((n) => n.endsWith('.json')).sort()",
      ".filter((n) => n.endsWith('.json') && !n.startsWith('.')).sort()",
    );
  });
  run('reserved-dataset-basenames-omitted-from-index', validation, 'indexes dataset (deck|interactions)', 2, (root) => {
    replace(
      root,
      lib,
      ".filter((n) => n.endsWith('.json')).sort()",
      ".filter((n) => n.endsWith('.json') && !['deck.json', 'interactions.json'].includes(n)).sort()",
    );
  });
  run('hidden-dataset-duplicate-check-regressed', 'tests/spa/validate-cli.test.ts', 'counts the id of a dotfile', 1, (root) => {
    replace(
      root,
      lib,
      ".filter((n) => n.endsWith('.json')).sort()",
      ".filter((n) => n.endsWith('.json') && !n.startsWith('.')).sort()",
    );
  }, true);
  run('hidden-stray-files-omitted', 'tests/spa/validate-cli.test.ts', 'reports a stray', 3, (root) => {
    replace(
      root,
      lib,
      'for (const entry of readdirSync(dir, { withFileTypes: true })) {',
      "for (const entry of readdirSync(dir, { withFileTypes: true })) {\n    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;",
    );
  }, true);

  // Challenge the real, separate AC2 / AC24 / AC25 / AC1 acceptance tests too.
  run('ac2-missing-slide-reference', 'tests/spa/content-refs.test.ts', 'resolves every slideSource', 1, (root) => {
    updateJson(root, 'workshop/spa/content/deck.json', (deck) => { deck.segments[0].slideSource = 'workshop/slides/qa-no-such-slide.md'; });
  }, true);
  run('ac2-timing-drift', 'tests/spa/content-refs.test.ts', 'resolves every slideSource', 1, (root) => {
    updateJson(root, 'workshop/spa/content/deck.json', (deck) => { deck.segments[0].minutes += 1; });
  }, true);
  run('ac24-curriculum-key-undocumented', 'tests/spa/content-authoring-keys.test.ts', 'lists exactly the top-level', 1, (root) => {
    writeFileSync(join(root, 'labs/qa-new-key.md'), '---\nqa_new_runtime_key: true\n---\nFixture.\n');
  }, true);
  run('ac24-documented-key-unused', 'tests/spa/content-authoring-keys.test.ts', 'lists exactly the top-level', 1, (root) => {
    replace(root, 'workshop/spa/docs/content-authoring.md', '<!-- spa:frontmatter-keys:end -->', '| qa_unused_runtime_key | labs | Fixture. |\n<!-- spa:frontmatter-keys:end -->');
  }, true);
  run('ac25-documented-key-rejected', 'tests/spa/frontmatter-schema-keys.test.ts', 'declares every key the document lists', 1, (root) => {
    updateJson(root, frontmatterSchema, (schema) => { delete schema.properties[Object.keys(schema.properties)[0]]; });
  }, true);
  run('ac25-undocumented-key-accepted', 'tests/spa/frontmatter-schema-keys.test.ts', 'declares no key the document does not list', 1, (root) => {
    updateJson(root, frontmatterSchema, (schema) => { schema.properties.qa_only_in_schema = { type: 'boolean' }; });
  }, true);
  run('ac25-frontmatter-closure-opened', 'tests/spa/frontmatter-schema-keys.test.ts', 'declares additionalProperties: false|is closed when Ajv runs', 2, (root) => {
    updateJson(root, frontmatterSchema, (schema) => { schema.additionalProperties = true; });
  }, true);
  run('ac1-curriculum-targets-omitted', 'tests/spa/validate-cli.test.ts', 'exits 0 with no target', 1, (root) => {
    replace(
      root,
      'scripts/spa/validate.mjs',
      "const DEFAULT_TARGETS = ['workshop/spa/content', 'workshop/slides/*.md', 'workshop/speaker-scripts/*.md', 'labs/*.md'];",
      "const DEFAULT_TARGETS = ['workshop/spa/content'];",
    );
  }, true);
  run('ac1-undeclared-key-fixture-accepted', 'tests/spa/validate-cli.test.ts', 'has a fixture whose only offence', 1, (root) => {
    updateJson(root, frontmatterSchema, (schema) => { schema.additionalProperties = true; });
  }, true);
  console.log('\nPROVED: 26 isolated mutations; every QA assertion and the separate AC-chain and changed-behavior guards observed red; all fixtures removed on exit.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
