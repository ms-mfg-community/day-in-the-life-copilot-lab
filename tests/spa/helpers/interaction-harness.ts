// The harness for the interaction tests (specs/005-teaching-spa.md sections 2.4 and 2.10, AC6 and AC13): it boots the
// real shell into the fake DOM (helpers/fake-dom.ts), from source and from a fresh production build, and holds the one
// ARIA audit that decides whether an `interactions.json` entry is present in the DOM with the role set its pattern needs.
//
// Nothing here may import a module that names the DOM (the root tsconfig has no DOM lib), so the shell is loaded through
// a variable specifier, as qa-shell.test.ts does.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { vi } from 'vitest';
import { loadSegments } from '../../../workshop/spa/vite-content-plugin';
import type { ShellStore } from '../../../workshop/spa/src/shell/state';
import { createBrowser, type Browser, type FakeElement } from './fake-dom';
import type { InventoryEntry } from './interaction-audit';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

// ---------------------------------------------------------------------------------------------------------------------
// The inventory and the specification

export function readInventory(): InventoryEntry[] {
  const file = path.join(ROOT, 'workshop/spa/content/interactions.json');
  return (JSON.parse(readFileSync(file, 'utf8')) as { interactions: InventoryEntry[] }).interactions;
}

export function readDeckIds(): string[] {
  const file = path.join(ROOT, 'workshop/spa/content/deck.json');
  return (JSON.parse(readFileSync(file, 'utf8')) as { segments: Array<{ id: string }> }).segments.map((segment) => segment.id);
}

/** The pattern names of the table in section 2.4 of the specification: the backticked first column, in order. */
export function readSpecPatterns(): string[] {
  const spec = readFileSync(path.join(ROOT, 'specs/005-teaching-spa.md'), 'utf8');
  const start = spec.indexOf('### 2.4');
  const end = spec.indexOf('### 2.5');
  if (start < 0 || end < start) throw new Error('harness: section 2.4 of the specification was not found');
  const rows = spec
    .slice(start, end)
    .split('\n')
    .filter((line) => line.startsWith('|'));
  // the first two rows of a Markdown table are its header and its separator
  return rows.slice(2).flatMap((row) => {
    const name = /^\|\s*`([a-z-]+)`\s*\|/.exec(row)?.[1];
    return name === undefined ? [] : [name];
  });
}

/** The five patterns issue 4 (SPA-04) built. */
export const PART_ONE = ['tabs', 'accordion', 'dialog', 'staged-reveal', 'disclosure-popover'] as const;

/** The four patterns issue 5 (SPA-05) builds. Together with PART_ONE they are the nine patterns of section 2.4. */
export const PART_TWO = ['parameter-chart', 'node-diagram', 'carousel', 'segment-timer'] as const;

// ---------------------------------------------------------------------------------------------------------------------
// Booting the shell

type SegmentRecord = ReadonlyArray<{ id: string; minutes: number; labRefs: string[]; scriptSource: string; title: string; html: string; scriptHtml: string }>;

let renderedSegments: SegmentRecord | undefined;

/** The real slide HTML (SPA-01 and SPA-02 pipeline), rendered once per test file because it is the slow part of a boot. */
export function segmentsFromPipeline(): SegmentRecord {
  renderedSegments ??= loadSegments(ROOT);
  return renderedSegments;
}

export interface TeachingSpa {
  store: ShellStore;
  announce: (message: string) => void;
  segments: SegmentRecord;
}

export interface Booted extends Browser {
  spa: TeachingSpa;
  main: FakeElement;
  liveRegion: FakeElement;
  /** Navigate through the store, as a link does, and let the hashchange it causes settle. */
  go(segmentId: string): Promise<void>;
  /** The element an inventory id names; throws when it is missing, which is the failure the tests want to read. */
  root(interactionId: string): FakeElement;
  cleanup(): void;
}

export async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

let bootCount = 0;

async function boot(shellHtml: string, load: () => Promise<unknown>, hash: string): Promise<Booted> {
  vi.resetModules();
  const browser = createBrowser(shellHtml);
  if (hash !== '') {
    browser.window.location.hash = hash;
    await flush(); // the hashchange of this assignment belongs to nobody yet
  }
  for (const [name, value] of Object.entries(browser.globals)) vi.stubGlobal(name, value);
  await load();
  const spa = browser.window.teachingSpa as TeachingSpa | undefined;
  if (spa === undefined) throw new Error('harness: the shell did not publish window.teachingSpa');
  const main = browser.document.getElementById('main');
  const liveRegion = browser.document.getElementById('live-region');
  if (main === null || liveRegion === null) throw new Error('harness: the shell DOM has no #main or #live-region');
  return {
    ...browser,
    spa,
    main,
    liveRegion,
    async go(segmentId: string): Promise<void> {
      spa.store.navigate(segmentId);
      await flush();
    },
    root(interactionId: string): FakeElement {
      const found = browser.document.getElementById(interactionId);
      if (found === null) throw new Error(`harness: #${interactionId} is not in the DOM of ${spa.store.get().currentId}`);
      return found;
    },
    cleanup(): void {
      vi.unstubAllGlobals();
      vi.resetModules();
    },
  };
}

/** The shell as the dev server runs it: workshop/spa/index.html, with the slides from the content pipeline. */
export async function bootFromSource(hash = ''): Promise<Booted> {
  const shell = readFileSync(path.join(ROOT, 'workshop/spa/index.html'), 'utf8');
  return boot(
    shell,
    async () => {
      vi.doMock('virtual:spa-content', () => ({ segments: segmentsFromPipeline() }));
      const specifier = '../../../workshop/spa/src/main';
      await import(specifier);
    },
    hash,
  );
}

export interface Bundle {
  dir: string;
  indexHtml: string;
  entry: string;
}

/**
 * A production build in a directory of its own. The shared workshop/spa/dist is left alone: another test file may be
 * reading it, and a build that empties it halfway would fail that file for a reason that has nothing to do with it.
 */
export function buildBundle(): Bundle {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'spa-interactions-dist-'));
  const viteBin = path.join(ROOT, 'node_modules/vite/bin/vite.js');
  const result = spawnSync(
    process.execPath,
    [viteBin, 'build', '--config', 'workshop/spa/vite.config.ts', '--outDir', dir, '--emptyOutDir'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`harness: vite build failed\n${result.stdout}\n${result.stderr}`);
  const scripts = readdirSync(path.join(dir, 'assets')).filter((name) => name.endsWith('.js'));
  if (scripts.length === 0) throw new Error('harness: the build produced no script');
  return { dir, indexHtml: readFileSync(path.join(dir, 'index.html'), 'utf8'), entry: path.join(dir, 'assets', scripts[0]) };
}

export function removeBundle(bundle: Bundle): void {
  rmSync(bundle.dir, { recursive: true, force: true });
}

/** The built artifact: dist/index.html and its script, executed against the fake DOM. */
export async function bootFromBundle(bundle: Bundle, hash = ''): Promise<Booted> {
  return boot(
    bundle.indexHtml,
    async () => {
      bootCount += 1; // a fresh query makes the loader evaluate the bundle again
      await import(`${pathToFileURL(bundle.entry).href}?boot=${bootCount}`);
    },
    hash,
  );
}

export type Flavour = 'source' | 'bundle';

// ---------------------------------------------------------------------------------------------------------------------
// Reading the page the way assistive technology would

// The audit itself (and the helpers that read names and find elements) lives in interaction-audit.ts, a pure module, so that
// interactions-browser-check.mjs can run the very same code in real browsers. The tests keep importing it from here.

export { ariaName, auditInteraction, auditLongDescription, contentName, within, type InventoryEntry } from './interaction-audit';

