// Run: node tests/spa/qa-shell-browser-mutation-check.mjs
// Build once into an owned fixture, then damage only fixture bundles. Never modify application sources or the real dist.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';

const ROOT = process.cwd();
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-browser-mutants-'));
const positive = path.join(scratch, 'positive');
const runner = path.join(ROOT, 'tests/spa/qa-shell-browser-check.mjs');

function control(name, pattern, expectedFailures, before, after) {
  const dist = path.join(scratch, name);
  mkdirSync(dist);
  cpSync(positive, dist, { recursive: true });
  if (before) {
    const assets = path.join(dist, 'assets');
    const bundle = path.join(assets, readdirSync(assets).find((file) => file.endsWith('.js')));
    const source = readFileSync(bundle, 'utf8');
    assert.equal(source.split(before).length - 1, 1, `Mutation must affect exactly one fixture site: ${name}`);
    writeFileSync(bundle, source.replace(before, after));
  }
  const result = spawnSync(
    process.execPath,
    ['--test', '--test-reporter=tap', `--test-name-pattern=${pattern}`, runner],
    {
      cwd: ROOT,
      env: { ...process.env, SPA_QA_DIST: dist },
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  const output = result.stdout + result.stderr;
  const failed = Number(/^# fail (\d+)$/m.exec(output)?.[1] ?? -1);
  console.log(`\n${name}: exit=${result.status}; failing tests=${failed}; expected=${expectedFailures}`);
  console.log(
    output.split(/\r?\n/).filter((line) => /^(not ok |# (tests|pass|fail) )|^\s+(error:|code:)/.test(line)).join('\n'),
  );
  if (result.error || result.status !== (expectedFailures ? 1 : 0) || failed !== expectedFailures ||
      (expectedFailures && !output.includes('ERR_ASSERTION'))) {
    console.log(output);
    throw new Error(`Control did not demonstrate the expected assertion result: ${name}`, { cause: result.error });
  }
}

try {
  await build({
    configFile: path.join(ROOT, 'workshop/spa/vite.config.ts'),
    logLevel: 'error',
    build: { outDir: positive, minify: false, target: 'esnext' },
  });
  control('unchanged-build', '.', 0);
  control(
    'unknown-correction-pushes',
    'Unknown route recovery',
    3,
    'location.replace(base + hash);',
    'location.hash = hash;',
  );
  control(
    'navigation-recreates-links',
    'Keyboard segment navigation',
    1,
    'if (nav.children.length !== segments.length) {',
    'if (true) {',
  );
  control(
    'transition-does-not-scroll',
    'Keyboard segment navigation|A real in-content segment link',
    2,
    'window.scrollTo?.(0, 0);',
    '',
  );
  control(
    'transition-loses-content-focus',
    'A real in-content segment link',
    1,
    'if (!active || !nav.contains?.(active)) main.focus?.({ preventScroll: true });',
    '',
  );
  control(
    'transition-steals-navigation-focus',
    'Keyboard segment navigation',
    1,
    'if (!active || !nav.contains?.(active)) main.focus?.({ preventScroll: true });',
    'main.focus?.({ preventScroll: true });',
  );
  control(
    'parameter-change-remounts',
    'Parameter-only updates',
    1,
    'if (next.currentId === previous.currentId) return;',
    '',
  );
  control(
    'skip-default-navigation-not-cancelled',
    'Keyboard skip activation',
    1,
    'document.addEventListener("click", onSkipLinkClick);',
    '',
  );
  control(
    'anchor-route-is-not-restored',
    'Repeated in-page anchors',
    1,
    'function settleAnchor() {',
    'function settleAnchor() { return;',
  );
  control(
    'encoded-shell-fragment-is-not-decoded',
    'An encoded shell skip fragment',
    1,
    'return decodeURIComponent(hash.slice(1)) === "main";',
    'return hash.slice(1) === "main";',
  );
  console.log('\nPASS: positive build and all nine browser mutations produced their expected assertion outcomes.');
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
