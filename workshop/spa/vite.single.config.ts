import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { spaContentPlugin } from './vite-content-plugin';
import { PORTABLE_FILE, portableCspPlugin } from './vite-portable-plugin';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

// The portable single-file build (spec 2.9): the same source as vite.config.ts, as one HTML file the presenter opens from disk.
// vite-plugin-singlefile sets the build configuration it needs (base './', one chunk, every asset inlined, F113) and puts the
// bundle inside the page as an inline module script; portableCspPlugin then writes the page's Content-Security-Policy (AC20).
// No module is preloaded, because there is only the one, inline: the polyfill would be dead code under a policy that fetches nothing.
//
// The file lands under dist/standalone/. `npm run spa:build` empties dist/, this file with it, so build the portable file after
// the multi-file build when both are wanted.
export default defineConfig({
  root: here,
  base: './',
  plugins: [spaContentPlugin(repoRoot), viteSingleFile({ outputFileName: PORTABLE_FILE }), portableCspPlugin()],
  build: {
    outDir: path.join(here, 'dist/standalone'),
    emptyOutDir: true,
    modulePreload: { polyfill: false },
  },
});
