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
const r2 = 'tests/spa/qa-shell-r2.test.ts';
const shell = 'tests/spa/shell.test.ts';
const plugin = 'workshop/spa/vite-content-plugin.ts';
const markdown = 'workshop/spa/src/content/markdown.ts';
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
    'package.json', 'tsconfig.json', 'vitest.config.ts', qa, contract, r2, shell, 'tests/spa/helpers/html-scan.ts',
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
  run('corrections-push-instead-of-replace', [qa],
    'replaces the current history entry|keeps the segment route in the address', 2, (root) => {
      replace(root, main, 'location.replace(base + hash);', 'location.hash = hash;');
    });
  run('replacement-drops-document-path-and-query', [qa], 'preserves the document path and query', 1, (root) => {
    replace(root, main,
      "const base = typeof location.href === 'string' ? location.href.split('#')[0] : '';",
      "const base = '';");
  });
  run('nav-is-rebuilt-on-every-transition', [qa], 'builds the nav links once|keeps keyboard focus', 2, (root) => {
    replace(root, main, 'if (nav.children.length !== segments.length) {', 'if (true) {');
  });
  run('segment-transition-does-not-reset-scroll', [qa], 'opens a new segment at the top', 1, (root) => {
    replace(root, main, 'window.scrollTo?.(0, 0);', '');
  });
  run('segment-transition-does-not-restore-content-focus', [qa], 'opens a new segment at the top', 1, (root) => {
    replace(root, main,
      'if (!active || !nav.contains?.(active)) main.focus?.({ preventScroll: true });', '');
  });
  run('segment-transition-steals-nav-focus', [qa], 'keeps keyboard focus', 1, (root) => {
    replace(root, main,
      'if (!active || !nav.contains?.(active)) main.focus?.({ preventScroll: true });',
      'main.focus?.({ preventScroll: true });');
  });
  run('anchor-route-settlement-omitted', [qa],
    'keeps the segment route in the address|restores the segment route after|settles malformed and absent|restores the route after each repeated',
    8, (root) => {
      replace(root, main,
        'replaceHash(hashFor(store.get().currentId)); // a segment hash is never an anchor, so this cannot repeat', '');
    });
  run('skip-click-handler-not-installed', [qa], 'handles the skip link|handles an unmarked', 3, (root) => {
    replace(root, main, "document.addEventListener('click', onSkipLinkClick);", '');
  });
  run('skip-click-handler-ignores-key-modifiers', [qa], 'does not hijack modified skip', 3, (root) => {
    replace(root, main, ' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey', '');
  });
  run('skip-link-does-not-scroll-main', [qa], 'handles the skip link|handles an unmarked|restores the segment route after a hashchange', 4, (root) => {
    replace(root, main, 'main.scrollIntoView?.();', '');
  });
  run('minimal-location-fallback-omitted', [qa], 'assigns the hash when the location cannot replace', 1, (root) => {
    replace(root, main, 'else location.hash = hash;', 'else void hash;');
  });
  // Round 2 findings from real Chrome: native history scroll restoration, and the reserved "#main" skip target.
  run('scroll-restoration-left-native', [qa], 'native scroll restoration', 3, (root) => {
    replace(root, main,
      "if (window.history && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';", '');
  });
  run('reserved-main-visible-to-content-rewrite', [qa], 'shell-reserved #main', 3, (root) => {
    replace(root, main, 'installHashRewrite(contentWindow, document);', 'installHashRewrite(window, document);');
  });
  run('reserved-main-mask-compares-undecoded', [qa], 'shell-reserved #main', 1, (root) => {
    replace(root, main,
      "return { hash: isShellHash(hash) ? '' : hash, href };", "return { hash: hash === '#main' ? '' : hash, href };");
  });
  run('reserved-main-focus-compares-undecoded', [qa], 'shell-reserved #main', 1, (root) => {
    replace(root, main, 'if (isShellHash(hash)) focusMain();', "if (hash === '#main') focusMain();");
  });
  run('reserved-main-matches-case-insensitively', [qa], 'shell-reserved #main', 1, (root) => {
    replace(root, main,
      "return decodeURIComponent(hash.slice(1)) === 'main';",
      "return decodeURIComponent(hash.slice(1)).toLowerCase() === 'main';");
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
  run('round-1-findings-before-the-fix', [qa, contract], 'watches the manifest|keeps the real curriculum link', 3, (root) => {
    writeFileSync(path.join(root, plugin),
      execFileSync('git', ['show', `3b203ff:${plugin}`], { cwd: ROOT, encoding: 'utf8' }), 'utf8');
  });
  run('renderer-drops-frontmatter-data', [r2], 'preserves front-matter data', 1, (root) => {
    replace(root, markdown, 'return { data, html: String(processor.processSync(content)) };',
      'return { data: {}, html: String(processor.processSync(content)) };');
  });
  run('renderer-does-not-forward-plugins', [r2], 'forwards both plugin kinds|keeps independent route contexts', 2, (root) => {
    replace(root, markdown, 'const processor = createProcessor(options);', 'const processor = createProcessor();');
  });
  run('renderer-accepts-javascript-frontmatter', [r2], 'refuses .* front matter', 2, (root) => {
    replace(root, markdown, 'matter(raw, MATTER_OPTIONS)', 'matter(raw)');
  });
  run('renderer-skips-final-sanitizer', [r2], 'forwards both plugin kinds', 1, (root) => {
    replace(root, markdown, '.use(rehypeSanitize)', '.use(() => () => undefined)');
  });
  run('build-reuses-another-slide-directory', [r2], 'binds the build rewrite', 1, (root) => {
    replace(root, plugin, 'slideSource: segment.slideSource, slides: deck',
      "slideSource: 'workshop/slides/left/start.md', slides: deck");
  });
  run('failed-load-reload-suppressed', [r2], 'recovers after exactly one repair', 2, (root) => {
    replace(root, plugin, "server.hot.send({ type: 'full-reload', path: '*' });", '// suppressed in this owned fixture');
  });
  run('mapped-module-updates-swallowed', [r2], 'still recovers after a successful load', 1, (root) => {
    replace(root, plugin, 'if (modules.length > 0 || !sources.has(file)) return undefined;',
      'if (modules.length > 0 && sources.has(file)) return [];\n      if (!sources.has(file)) return undefined;');
  });
  run('round-2-positive-controls', [r2], '', 0, () => {});
  console.log('\nPASS: all 44 isolated controls produced their expected real assertion results.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
