// Shared by scripts/spa/validate.mjs and scripts/spa/frontmatter-keys.mjs.
//
// The curriculum is the source of truth and is read-only to the SPA (spec 005
// section 2.2): this module only reads it.
import { readdirSync, readFileSync } from 'node:fs';
import matter from 'gray-matter';

/**
 * The three curriculum globs of spec 005 section 2.2 (AC1, AC24). Each is a
 * non-recursive `*.md`, so labs/appendices/** is deliberately outside them.
 */
export const CURRICULUM_KINDS = Object.freeze([
  Object.freeze({ kind: 'slides', dir: 'workshop/slides' }),
  Object.freeze({ kind: 'speaker-scripts', dir: 'workshop/speaker-scripts' }),
  Object.freeze({ kind: 'labs', dir: 'labs' }),
]);

/** Names of the `*.md` files directly inside absDir, sorted. A missing directory yields []. */
export function listMarkdown(absDir) {
  let entries;
  try {
    entries = readdirSync(absDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Front matter of one markdown file, extracted with gray-matter (spec 005
 * section 2.2). A file with no front matter yields `{ data: {} }`. A file whose
 * front matter is not valid YAML yields `{ error }` instead of throwing, so a
 * batch reports every bad file rather than stopping at the first.
 */
export function readFrontMatter(absFile) {
  const raw = readFileSync(absFile, 'utf8');
  try {
    // An options object bypasses gray-matter's process-wide content cache, which
    // would otherwise hand two callers the same mutable `data` object.
    return { data: matter(raw, {}).data };
  } catch (error) {
    return { error: `front matter is not valid YAML: ${String(error.message).split('\n')[0]}` };
  }
}
