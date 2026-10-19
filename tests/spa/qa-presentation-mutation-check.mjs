// Run: node tests/spa/qa-presentation-mutation-check.mjs
// All mutations and the baseline build are owned test fixtures below tests/spa, removed even on failure.
// No product file in the worktree is ever written.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { build } from 'vite';

const ROOT = process.cwd();
const scratch = mkdtempSync(path.join(ROOT, 'tests/spa/.qa-present-mutants-'));
const controller = 'workshop/spa/src/shell/presentation.ts';
const unit = 'tests/spa/presentation-mode.test.ts';
const qa = 'tests/spa/qa-presentation.test.ts';
const vitest = path.join(ROOT, 'node_modules/vitest/vitest.mjs');
let controls = 0;

// Round 2, finding A: the guard that keeps a disposed controller's late fullscreen rejection from rolling a newer controller back.
const withoutDisposalGuard = (root) =>
  replace(root, controller,
    "if (disposed || phase !== 'requesting') return;\n    phase = 'idle';\n    releaseKeyboard();",
    "if (phase !== 'requesting') return;\n    phase = 'idle';\n    releaseKeyboard();");
// Round 2, finding B: every test about fullscreen that the browser ends, as against one that the page asked to end.
const ENDED = 'fullscreen that ends without the page asking|fullscreen that the browser ends';

function replace(root, relative, before, after) {
  const file = path.join(root, relative);
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  assert.equal(source.split(before).length - 1, 1, `Expected exactly one mutation site in ${relative}: ${before}`);
  writeFileSync(file, source.replace(before, after));
}

function seed(name) {
  const root = path.join(scratch, name);
  mkdirSync(root);
  for (const relative of [
    'workshop/spa/src', 'workshop/spa/content', 'workshop/spa/index.html',
    'workshop/spa/vite.config.ts', 'workshop/spa/vite-content-plugin.ts',
    'workshop/slides', 'workshop/speaker-scripts', 'specs/005-teaching-spa.md',
    'package.json', 'tsconfig.json', 'vitest.config.ts', 'tests/spa/helpers', unit, qa,
  ]) {
    const destination = path.join(root, relative);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(path.join(ROOT, relative), destination, { recursive: true });
  }
  symlinkSync(path.join(ROOT, 'node_modules'), path.join(root, 'node_modules'), 'junction');
  return root;
}

function check(name, file, pattern, failures, mutate = () => {}) {
  const root = seed(name);
  mutate(root);
  const result = spawnSync(process.execPath, [vitest, 'run', file, '-t', pattern, '--reporter=dot'], {
    cwd: root,
    env: { ...process.env, NO_COLOR: '1' },
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const output = (result.stdout + result.stderr).replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const actual = Number(/Tests\s+(\d+) failed/.exec(output)?.[1] ?? 0);
  console.log(`\n${name}: exit=${result.status}; assertion failures=${actual}; expected=${failures}`);
  console.log(output.split(/\r?\n/).filter((line) => /^\s*(FAIL\s+tests\/spa\/|Test Files\s+|Tests\s+|AssertionError:)/.test(line)).join('\n'));
  if (result.error || result.status !== (failures ? 1 : 0) || actual !== failures) {
    console.log(output);
    throw new Error(`Unexpected mutation outcome for ${name}`, { cause: result.error });
  }
  controls += 1;
}

try {
  check('current-edge-cases', qa, '.', 0);
  check('current-contracts', unit, '.', 0);
  // The guard is what these two regression tests exist for: take it out and exactly they fail.
  check('disposal-guard-removed', qa, 'cannot roll a replacement controller', 1, withoutDisposalGuard);
  check('disposal-guard-removed-unit', unit, 'is not undone by the request it left outstanding', 1, withoutDisposalGuard);
  check('failure-discards-interaction-state', qa, 'preserves the segment and its interaction state', 4, (root) => {
    replace(root, controller, 'base = couldNotStart(currentSegment());',
      "Object.assign(store.get().segments[store.get().currentId], { revealedSteps: 0, parameters: {} });\n    base = couldNotStart(currentSegment());");
  });
  check('synchronous-keyboard-exception-escapes', qa, 'continues when keyboard.lock throws synchronously', 1, (root) => {
    replace(root, controller,
      'answer = Promise.resolve(nav?.keyboard?.lock?.([...KEYBOARD_LOCK_CODES]));\n    } catch (error) {\n      answer = Promise.reject(error);',
      'answer = Promise.resolve(nav?.keyboard?.lock?.([...KEYBOARD_LOCK_CODES]));\n    } catch (error) {\n      throw error;');
  });
  check('synchronous-wake-exception-escapes', qa, 'handles a synchronous wake-lock exception', 1, (root) => {
    replace(root, controller,
      "answer = Promise.resolve(nav.wakeLock.request('screen'));\n    } catch (error) {\n      answer = Promise.reject(error);",
      "answer = Promise.resolve(nav.wakeLock.request('screen'));\n    } catch (error) {\n      throw error;");
  });
  check('old-fullscreen-rejection-cancels-new-request', qa, 'late fullscreen rejection', 1, (root) => {
    replace(root, controller, 'if (token === activation) fail();', 'fail();');
  });
  check('old-keyboard-rejection-forgets-new-lock', qa, 'old keyboard rejection', 1, (root) => {
    replace(root, controller, 'if (token !== activation || !locked) return;', 'if (!locked) return;');
  });
  check('old-wake-answers-affect-new-presentation', qa, 'isolates a late wake-lock', 2, (root) => {
    replace(root, controller,
      "if (token !== wakeToken || disposed || phase !== 'presenting') {",
      "if (disposed || phase !== 'presenting') {");
    replace(root, controller,
      "if (token !== wakeToken || disposed || phase !== 'presenting') return;",
      "if (disposed || phase !== 'presenting') return;");
  });
  check('visible-events-duplicate-held-wake-lock', qa, 'does not duplicate an already-held wake lock', 1, (root) => {
    replace(root, controller, 'if (sentinel || wakePending) return;', 'if (wakePending) return;');
  });
  check('invalid-choice-silently-selects-first-monitor', qa, 'never passes an unselected or invalid screen index', 8, (root) => {
    replace(root, controller,
      "if (typeof value !== 'string' || !/^\\d+$/.test(value)) return undefined;\n    return screens[Number(value)];",
      'return screens[Number(value)] ?? screens[0];');
  });
  check('empty-monitor-list-is-swallowed', qa, 'empty screen list', 1, (root) => {
    replace(root, controller, 'if (found.length === 0) {\n      refuseScreens();\n      return;\n    }', 'if (found.length === 0) return;');
  });
  check('disposed-controller-keeps-late-wake-grant', qa, 'immediately releases a wake lock granted after disposal', 1, (root) => {
    replace(root, controller, "if (token !== wakeToken || disposed || phase !== 'presenting') {", 'if (false) {');
  });

  // Test the task's core contracts too, not just the newly added edge cases.
  check('fullscreen-disabled-guard-removed', unit, 'disables Present and says why', 2, (root) => {
    replace(root, controller, "doc.fullscreenEnabled === true && typeof root.requestFullscreen === 'function'",
      "typeof root.requestFullscreen === 'function'");
  });
  check('activation-order-reversed', unit, 'opens the speaker script first, locks the keyboard second', 1, (root) => {
    replace(root, controller,
      "if (scriptToggle?.checked === true) openSpeakerScript();\n    if (keyboardToggle?.checked === true && keyboardAvailable()) lockKeyboard(token);",
      "if (keyboardToggle?.checked === true && keyboardAvailable()) lockKeyboard(token);\n    if (scriptToggle?.checked === true) openSpeakerScript();");
  });
  check('escape-is-locked', unit, 'never passes Escape to the keyboard lock', 1, (root) => {
    replace(root, controller, "['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Space']",
      "['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Space', 'Escape']");
  });
  check('failure-is-not-announced', unit, 'stays in the window on the same segment and announces it once', 4, (root) => {
    replace(root, controller, 'base = couldNotStart(currentSegment());', "base = '';");
  });
  check('fullscreenerror-listeners-omitted', unit, 'handles a fullscreenerror', 2, (root) => {
    replace(root, controller, "doc.addEventListener('fullscreenerror', onFullscreenError);", '');
    replace(root, controller, "root.addEventListener('fullscreenerror', onFullscreenError);", '');
  });
  check('fullscreenchange-listener-omitted', unit, 'returns to the window on the same segment and writes the change', 1, (root) => {
    replace(root, controller, "doc.addEventListener('fullscreenchange', onFullscreenChange);", '');
  });
  check('wake-lock-is-not-released-on-exit', unit, 'is released when presentation mode ends', 1, (root) => {
    replace(root, controller, "phase = 'idle';\n    releaseWakeLock();", "phase = 'idle';");
  });
  check('manual-monitor-instructions-omitted', unit, 'without getScreenDetails: gives the manual steps', 1, (root) => {
    replace(root, 'workshop/spa/index.html',
      'move this browser window onto the audience monitor, then activate Present.',
      'Present on a screen.');
  });
  check('fullscreen-request-targets-main-instead-of-root', unit, 'requests fullscreen on the presentation root and on nothing else', 1, (root) => {
    replace(root, controller, 'root.requestFullscreen(); // C1',
      "doc.getElementById('main')!.requestFullscreen(); // C1");
  });
  check('blocked-speaker-window-is-swallowed', unit, 'requests fullscreen even when the speaker window is blocked', 1, (root) => {
    replace(root, controller, 'notes.script = SCRIPT_BLOCKED;\n      announce(SCRIPT_BLOCKED);', '');
  });
  check('keyboard-unlocked-before-fullscreen-exit', unit, 'releases the lock after exitFullscreen', 1, (root) => {
    replace(root, controller, 'answer = doc.exitFullscreen();', 'releaseKeyboard();\n      answer = doc.exitFullscreen();');
  });
  check('wake-lock-not-acquired-on-entry', unit, 'is requested once presentation mode is on', 1, (root) => {
    replace(root, controller, 'base = ENTERED;\n    requestWakeLock();', 'base = ENTERED;');
  });
  check('wake-lock-not-reacquired-when-visible', unit, 'is taken again after the page was hidden and shown', 1, (root) => {
    replace(root, controller, "doc.addEventListener('visibilitychange', onVisibilityChange);", '');
  });
  check('missing-wake-lock-is-silent', unit, 'is not fatal when the browser has no navigator.wakeLock', 1, (root) => {
    replace(root, controller, 'notes.wakeLock = WAKE_UNAVAILABLE;', '');
  });
  check('selected-screen-is-ignored', unit, 'passes the screen that was chosen to requestFullscreen', 1, (root) => {
    replace(root, controller, 'root.requestFullscreen({ screen })', 'root.requestFullscreen()');
  });
  check('entry-is-not-announced', unit, 'shows the presenting state, moves focus to the exit control and announces it', 1, (root) => {
    replace(root, controller, 'base = ENTERED;', "base = '';");
  });
  check('new-segment-retains-old-fullscreen-scroll', unit, 'starts at the top of the fullscreen root', 1, (root) => {
    replace(root, controller, 'root.scrollTop = 0;', 'void root.scrollTop;');
  });
  check('entry-focus-scrolls-away-from-slide', unit, 'moves focus to the exit control without scrolling', 1, (root) => {
    replace(root, controller, 'exitButton.focus?.({ preventScroll: true });', 'exitButton.focus?.();');
  });
  check('shell-does-not-publish-controller', unit, 'wires Present on the shell it ships, and publishes the controller', 1, (root) => {
    replace(root, 'workshop/spa/src/main.ts',
      'if (presentation) Object.assign((window as unknown as { teachingSpa: object }).teachingSpa, { presentation });', '');
  });

  // Round 2, finding B: when the browser spends the Escape that ends fullscreen, what Escape would have put away is put away.
  // Each control takes out one link of that chain and expects exactly the tests that stand on it to fail.
  const interactionsDir = 'workshop/spa/src/interactions';
  check('browser-ended-fullscreen-is-never-reported', unit, ENDED, 10, (root) => {
    replace(root, controller, 'if (!asked) endedByBrowser();', '');
  });
  check('an-exit-the-page-asked-for-is-reported-too', unit, ENDED, 4, (root) => {
    replace(root, controller, 'if (!asked) endedByBrowser();', 'endedByBrowser();');
  });
  check('exit-never-marks-itself-asked', unit, ENDED, 4, (root) => {
    replace(root, controller,
      '    // Before the call: the browser reports the end from inside exitFullscreen() when it has nothing to wait for.\n    exiting = true;\n', '');
  });
  check('exit-marks-itself-asked-after-the-call', unit, ENDED, 2, (root) => {
    replace(root, controller,
      '    // Before the call: the browser reports the end from inside exitFullscreen() when it has nothing to wait for.\n    exiting = true;\n', '');
    replace(root, controller, 'answer = doc.exitFullscreen();', 'answer = doc.exitFullscreen();\n      exiting = true;');
  });
  check('a-refused-exit-stays-marked-as-asked', unit, ENDED, 1, (root) => {
    replace(root, controller, '    exiting = false; // the browser refused: that exit is over, and the reader is still presenting\n', '');
  });
  check('a-throwing-hook-keeps-the-window-from-coming-back', unit, ENDED, 1, (root) => {
    replace(root, controller, "console.error('Putting away what fullscreen was showing failed', error);", 'throw error;');
  });
  check('widgets-are-put-away-before-the-window-has-said-so', unit, ENDED, 1, (root) => {
    replace(root, controller, '    if (!asked) endedByBrowser();\n', '');
    replace(root, controller,
      "    phase = 'idle';\n    releaseWakeLock();\n    releaseKeyboard();\n    notes = {};\n    showWindowed();",
      "    phase = 'idle';\n    if (!asked) endedByBrowser();\n    releaseWakeLock();\n    releaseKeyboard();\n    notes = {};\n    showWindowed();");
  });
  check('timer-pauses-wherever-the-focus-is', unit, ENDED, 1, (root) => {
    replace(root, `${interactionsDir}/segment-timer.ts`, 'if (widget.contains(doc.activeElement)) hold();', 'hold();');
  });
  check('dialog-cannot-be-dismissed', unit, ENDED, 2, (root) => {
    replace(root, `${interactionsDir}/dialog.ts`,
      'dismiss: close, // what Escape does, for when the browser has spent the key: closed, and the focus back on the button that opened it', '');
  });
  check('shell-does-not-wire-the-hook', unit, ENDED, 4, (root) => {
    replace(root, 'workshop/spa/src/main.ts', 'onEndedByBrowser: () => interactions?.dismiss?.(),', '');
  });
  check('interactions-aggregate-dismisses-nothing', unit, ENDED, 4, (root) => {
    replace(root, `${interactionsDir}/index.ts`, 'for (const interaction of mounted) interaction.dismiss?.();', '');
  });

  // Browser mutations damage only a freshly built fixture, not workshop/spa/dist or any source file.
  const browserPositive = path.join(scratch, 'browser-positive');
  await build({
    configFile: path.join(ROOT, 'workshop/spa/vite.config.ts'),
    logLevel: 'error',
    build: { outDir: browserPositive, minify: false },
  });
  function browserCheck(name, pattern, failures, mutate = () => {}, engine = 'chromium') {
    const dist = path.join(scratch, name);
    cpSync(browserPositive, dist, { recursive: true });
    mutate(dist);
    const result = spawnSync(process.execPath, [
      '--test', '--test-reporter=tap', `--test-name-pattern=${pattern}`,
      path.join(ROOT, 'tests/spa/presentation-browser-check.mjs'),
    ], {
      cwd: ROOT,
      env: { ...process.env, SPA_QA_DIST: dist, SPA_QA_BROWSER_TYPE: engine },
      encoding: 'utf8',
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const output = result.stdout + result.stderr;
    console.log(`\n${name}: exit=${result.status}; expected browser failures=${failures}`);
    console.log(output.split(/\r?\n/).filter((line) => /^(not ok |# (tests|pass|fail) )|^\s+(error:|code:)/.test(line)).join('\n'));
    if (result.error || result.status !== (failures ? 1 : 0) || Number(/^# fail (\d+)$/m.exec(output)?.[1]) !== failures) {
      console.log(output);
      throw new Error(`Unexpected browser mutation outcome for ${name}`, { cause: result.error });
    }
  }
  browserCheck('browser-unchanged', 'AC7: a real click|QA SPA-06: a focused slide link', 0);
  browserCheck('browser-fullscreen-on-wrong-element', 'AC7: a real click', 1, (dist) => {
    const assets = path.join(dist, 'assets');
    const bundle = path.join(assets, readdirSync(assets).find((file) => file.endsWith('.js')));
    const source = readFileSync(bundle, 'utf8');
    const call = /\b\w+\.requestFullscreen\(\)/.exec(source)?.[0];
    assert.ok(call, 'The unminified fixture needs its actual fullscreen call');
    assert.equal(source.split(call).length - 1, 1);
    writeFileSync(bundle, source.replace(call, 'document.getElementById("main").requestFullscreen()'));
  });
  browserCheck('browser-focused-link-hidden-by-toolbar', 'QA SPA-06: a focused slide link', 1, (dist) => {
    const index = path.join(dist, 'index.html');
    const source = readFileSync(index, 'utf8');
    const rule = /scroll-padding-bottom:\s*30vh;?/g;
    assert.equal([...source.matchAll(rule)].length, 1);
    writeFileSync(index, source.replace(rule, 'scroll-padding-bottom:0px;'));
  });

  // Round 2, finding B, in real engines. Headless Chromium keeps the Escape for the page, so there the end the page did not ask
  // for is the engine's own document.exitFullscreen(). Firefox spends the Escape the way the finding reproduces it.
  // The fixture is the built bundle, unminified, so a control cuts the one place that does the work: it names a pattern, and
  // the control fails loudly when that is not found exactly once. (The build lowers `?.` and renames what collides.)
  const mutateBundle = (dist, before, after) => {
    const assets = path.join(dist, 'assets');
    const bundle = path.join(assets, readdirSync(assets).find((file) => file.endsWith('.js')));
    const source = readFileSync(bundle, 'utf8').replace(/\r\n/g, '\n');
    assert.equal([...source.matchAll(new RegExp(before, 'g'))].length, 1, `The unminified fixture needs exactly one: ${before}`);
    writeFileSync(bundle, source.replace(before, after));
  };
  const HOOK = /return \(_a = interactions == null \? void 0 : interactions\.dismiss\) == null \? void 0 : _a\.call\(interactions\);/;
  const ENDED_IN_BROWSER = 'when the browser ends fullscreen|when the application itself asks to leave fullscreen';
  browserCheck('browser-ended-fullscreen-unchanged', ENDED_IN_BROWSER, 0);
  browserCheck('browser-ended-fullscreen-dismisses-nothing', ENDED_IN_BROWSER, 3, (dist) => {
    mutateBundle(dist, HOOK, 'return;');
  });
  browserCheck('browser-an-exit-the-page-asked-for-dismisses-too', ENDED_IN_BROWSER, 1, (dist) => {
    mutateBundle(dist, /if \(!asked\d*\) endedByBrowser\(\);/, 'endedByBrowser();');
  });
  const ESCAPE_DIALOG = 'QA SPA-06: Escape still dismisses an open dialog';
  browserCheck('firefox-escape-dialog-unchanged', ESCAPE_DIALOG, 0, () => {}, 'firefox');
  browserCheck('firefox-escape-leaves-the-dialog-open', ESCAPE_DIALOG, 1, (dist) => {
    mutateBundle(dist, HOOK, 'return;');
  }, 'firefox');

  // Independently measure the known shell failures using the actual base's HTML and entrypoint.
  const baseline = seed('base-273f94c');
  for (const relative of ['workshop/spa/index.html', 'workshop/spa/src/main.ts']) {
    writeFileSync(path.join(baseline, relative),
      execFileSync('git', ['show', `273f94c:${relative}`], { cwd: ROOT, encoding: 'utf8' }));
  }
  const dist = path.join(baseline, 'dist');
  await build({
    configFile: path.join(baseline, 'workshop/spa/vite.config.ts'),
    logLevel: 'error',
    build: { outDir: dist },
  });
  const result = spawnSync(process.execPath,
    ['--test', '--test-reporter=tap', path.join(ROOT, 'tests/spa/qa-shell-browser-check.mjs')], {
      cwd: ROOT,
      env: { ...process.env, SPA_QA_DIST: dist },
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    });
  const output = result.stdout + result.stderr;
  console.log('\nIndependent shell baseline at 273f94c:');
  console.log(output.split(/\r?\n/).filter((line) => /^(not ok |# (tests|pass|fail) )|^\s+(error:|code:)/.test(line)).join('\n'));
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.equal(Number(/^# fail (\d+)$/m.exec(output)?.[1]), 5, 'Re-establish the five known baseline failures, rather than trusting the brief');
  console.log(`\nPASS: ${controls} isolated unit controls, the browser controls, and the independent browser baseline observed.`);
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
