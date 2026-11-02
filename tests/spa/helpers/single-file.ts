// The portable single-file build (specs/005-teaching-spa.md 2.9; AC5, AC20) in a directory of its own, for the tests that read it.
//
// The shared workshop/spa/dist/standalone is left alone, as interaction-harness.ts leaves dist alone: another test file may be
// reading it. The build is the real one, `vite build` with workshop/spa/vite.single.config.ts, with only the output directory
// moved; nothing about the page is arranged for the test.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const PORTABLE_FILE = 'teaching-spa.html';

export interface PortableBuild {
  dir: string;
  file: string;
  html: string;
  /** Every file the build wrote under its directory, relative, sorted. The portable build writes one. */
  files: string[];
}

export function buildPortable(): PortableBuild {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'spa-portable-'));
  const viteBin = path.join(ROOT, 'node_modules/vite/bin/vite.js');
  const result = spawnSync(
    process.execPath,
    [viteBin, 'build', '--config', 'workshop/spa/vite.single.config.ts', '--outDir', dir, '--emptyOutDir'],
    { cwd: ROOT, encoding: 'utf8' },
  );
  if (result.status !== 0) throw new Error(`single-file: vite build failed\n${result.stdout}\n${result.stderr}`);
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'))
    .sort();
  const file = path.join(dir, PORTABLE_FILE);
  return { dir, file, html: readFileSync(file, 'utf8'), files };
}

export function removePortable(build: PortableBuild): void {
  rmSync(build.dir, { recursive: true, force: true });
}
