// Run: node tests/spa/qa-shell-mutation-check.mjs
// Mutations are isolated, owned test fixtures. No source-tree product file is written.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-shell-mutants-'));
const viteTest = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
const qa = 'tests/spa/qa-shell.test.ts';
const contract = 'tests/spa/qa-shell-contract.test.ts';
const shell = 'tests/spa/shell.test.ts';
const plugin = 'workshop/spa/vite-content-plugin.ts';
const main = 'workshop/spa/src/main.ts';
const state = 'workshop/spa/src/shell/state.ts';
const router = 'workshop/spa/src/shell/router.ts';
const live = 'workshop/spa/src/shell/live-region.ts';

function seed(name) {
  const root = path.join(scratch, name);
  mkdirSync(root);
  for (const rel of [
    'workshop/spa/src', 'workshop/spa/content', 'workshop/slides', 'workshop/speaker-scripts',
    'workshop/spa/index.html', 'workshop/spa/vite.config.ts', plugin,
    'package.json', 'tsconfig.json', 'vitest.config.ts', qa, contract, shell, 'tests/spa/helpers/html-scan.ts',
  ]) {
    const dest = path.join(root, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(path.join(ROOT, rel), dest, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  return root;
}

function replace(root, rel, before, after) {
  const file = path.join(root, rel);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (!source.includes(before)) throw new Error(`Mutation anchor absent: ${rel}: ${before}`);
  writeFileSync(file, source.replace(before, after), 'utf8');
}

function run(name, files, pattern, expectedFailures, mutate) {
  const root = seed(name);
  mutate(root);
  const args = [viteTest, 'run', ...files, '--reporter=dot'];
  if (pattern) args.push('-t', pattern);
  const env = { ...process.env };
  delete env.SPA_QA_REPRO;
  delete env.SPA_QA_SOURCE_ROOT;
  const result = spawnSync(process.execPath, args, {
    cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 4 * 1024 * 1024,
  });
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const actualFailures = Number(/Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0);
  console.log(`\n${name}: exit=${result.status}; failing assertions=${actualFailures}; expected=${expectedFailures}`);
  console.log(`fixture: ${root}`);
  console.log(`command: node node_modules/vitest/vitest.mjs run ${files.join(' ')}${pattern ? ` -t ${JSON.stringify(pattern)}` : ''}`);
  console.log(output.split(/\r?\n/).filter((line) => /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:)/.test(line)).join('\n'));
  if (result.error || result.status !== (expectedFailures ? 1 : 0) || actualFailures !== expectedFailures) {
    console.log(output);
    throw new Error(`Unproved fixture ${name}: ${result.error?.message ?? 'unexpected exit/failure count'}`);
  }
}

try {
  run('original-f4bc9c7', [qa], 'QA defect', 9, (root) => {
    for (const rel of [main, state, router, live, plugin, 'workshop/spa/vite.config.ts', shell]) {
      const original = execFileSync('git', ['show', `f4bc9c7:${rel}`], { cwd: ROOT, encoding: 'utf8' });
      writeFileSync(path.join(root, rel), original, 'utf8');
    }
  });
  run('script-watches-omitted', [qa], 'spaContentPlugin watches', 1, (root) => {
    replace(root, plugin, 'this.addWatchFile(path.join(repoRoot, segment.scriptSource));', '');
  });
  run('all-watches-omitted-on-missing-slide', [contract], 'watches every slide and script before', 1, (root) => {
    for (const expr of ['DECK_PATH', 'segment.slideSource', 'segment.scriptSource']) {
      replace(root, plugin, `this.addWatchFile(path.join(repoRoot, ${expr}));`, '');
    }
  });
  run('empty-deck-default-guard-removed', [contract], 'classifies', 3, (root) => {
    replace(root, router,
      "segmentIds.length > 0 ? { kind: 'segment', id: segmentIds[0] } : { kind: 'unknown', id: '' }",
      "{ kind: 'segment', id: segmentIds[0] }");
  });
  run('route-decoding-removed', [contract], 'oversized and malformed', 1, (root) => {
    replace(root, router, 'id = decodeURIComponent(raw);', 'id = raw;');
  });
  run('updates-mutate-previous-snapshots', [contract], 'retains previous parameter snapshots', 1, (root) => {
    replace(root, state,
      'set({ ...state, segments: { ...state.segments, [id]: updated } });',
      'Object.assign(state.segments[id], updated); set({ ...state });');
  });
  run('unknown-updaters-invoked', [contract], 'does not invoke an unknown-id updater', 1, (root) => {
    replace(root, state, 'if (!Object.hasOwn(state.segments, id)) return;', '');
  });
  run('updater-errors-swallowed', [contract], 'does not invoke an unknown-id updater', 1, (root) => {
    replace(root, state, 'const updated = change(current);',
      'let updated; try { updated = change(current); } catch { return; }');
  });
  run('stale-callbacks-enabled', [contract], 'ignores stale deferred callbacks', 1, (root) => {
    replace(root, live, 'if (ticket === latest) region.textContent = message;', 'region.textContent = message;');
  });
  run('unknown-initial-route-recovery-removed', [qa], 'reports an unknown initial route', 1, (root) => {
    replace(root, main, "else if (result.kind === 'unknown')", 'else if (false)');
  });
  run('parameter-updates-rerender-and-announce', [qa], 'presenter parameters change without navigation', 1, (root) => {
    replace(root, main, 'if (next.currentId === previous.currentId) return;', '');
  });
  run('untrusted-titles-injected-as-markup', [qa], 'renders hostile front-matter title', 1, (root) => {
    replace(root, main, 'link.textContent = segment.title;', 'link.innerHTML = segment.title;');
    replace(root, main, 'heading.textContent = segment.title;', 'heading.innerHTML = segment.title;');
  });
  run('navigation-discards-segment-state', [shell], 'keeps segment state across navigation', 1, (root) => {
    replace(root, state, 'set({ ...state, currentId: id });',
      'set({ ...state, currentId: id, segments: Object.fromEntries(segmentIds.map(id => [id, emptySegment()])) });');
  });
  run('subscriber-notifications-dropped', [contract], 'retains previous parameter snapshots', 1, (root) => {
    replace(root, state, 'listeners.forEach((listener) => listener(next, previous));', '');
  });
  run('frontmatter-title-fallback-removed', [qa], 'falls back to segment.id', 1, (root) => {
    replace(root, plugin, "title: typeof title === 'string' && title.trim() !== '' ? title : segment.id,", 'title,');
  });
  run('manifest-order-reversed', [qa], 'loads every real curriculum segment', 1, (root) => {
    replace(root, plugin, 'return deck.map((segment) => {', 'return [...deck].reverse().map((segment) => {');
  });
  run('absolute-build-base', [qa], 'executes the built dist', 1, (root) => {
    replace(root, 'workshop/spa/vite.config.ts', "base: './',", "base: '/',");
  });
  run('status-landmark-removed', [qa], 'executes the built dist', 1, (root) => {
    replace(root, 'workshop/spa/index.html', 'role="status"', 'role="none"');
  });
  // Positive controls: repair only the owned fixtures, not product or curriculum sources.
  // This proves the new assertions can be green and do not merely fail because the harness cannot boot.
  run('fixture-positive-controls', [qa, contract], '', 0, (root) => {
    replace(root, plugin, 'const deck = readDeck(repoRoot);',
      'this.addWatchFile(path.join(repoRoot, DECK_PATH));\n      const deck = readDeck(repoRoot);');
    replace(root, 'workshop/slides/60-module-6.md',
      '](56-module-5c-copilot-cli-extensions.md)', '](#/m5c-copilot-cli-extensions)');
    replace(root, 'workshop/slides/60-module-6.md',
      '](55-module-5b-gh-extensions.md)', '](#/m5b-gh-extensions)');
  });
  console.log('\nPASS: all 19 isolated controls produced their expected real assertion results.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
