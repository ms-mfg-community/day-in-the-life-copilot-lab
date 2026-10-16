import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { spaContentPlugin } from './vite-content-plugin.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');

// base './' so the build also works from file:// (spec 2.9).
export default defineConfig({
  root: here,
  base: './',
  plugins: [spaContentPlugin(repoRoot)],
  build: { outDir: path.join(here, 'dist'), emptyOutDir: true },
});
