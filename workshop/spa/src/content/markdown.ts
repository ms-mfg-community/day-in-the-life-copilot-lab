// The markdown -> HTML pipeline: AC3 of specs/005-teaching-spa.md (child issue 2), section 2.2, F132-F149.
//
// Stages, in order, and why:
//   gray-matter         splits off the front matter. It parses YAML and JSON, but it performs no sanitizing and no slug
//                       generation (F149), so neither is assumed below.
//   remark-parse        markdown to mdast.
//   remark-frontmatter  recognises a leading YAML block so it is dropped, not rendered. YAML only (F133). Its `anywhere`
//                       option is forbidden (F135): it would swallow any later `---` block. It does not parse the YAML
//                       (F134); gray-matter does.
//   remark-rehype       mdast to hast with raw HTML OFF (F136): no allowDangerousHtml, and no rehype-raw (F137). Raw HTML
//                       in curriculum markdown is therefore dropped, not passed through.
//   rehype-slug         gives each heading without an id a github-slugger slug and suffixes duplicates (-1, -2). It is
//                       given no `prefix` (F142): the sanitizer adds the prefix once, and a second would double it.
//   rehype-sanitize     LAST, with the default schema untouched (F138, F139, F141). It removes on* attributes, <script>
//                       and every URL scheme outside its allowlist (so no javascript:), and it prefixes every id and name
//                       with `user-content-` so content cannot shadow DOM properties (F140). That prefix breaks in-page
//                       links; hash-rewrite.ts, beside this file, is the rewrite that repairs them (F143, F144).
//   rehype-stringify    hast to a string, again without allowDangerousHtml.
//
// There is no option to skip, move or loosen the sanitizer. The extra-plugin seam exists so that a test can put hostile
// nodes into the tree and prove the sanitizer, as wired here, removes them; the extras run before rehype-slug and
// rehype-sanitize, never after. The build also uses it, for one plugin (slide-links.ts, which routes a link from one
// slide to another): whatever an extra writes, the sanitizer still checks it.
//
// Two things for whoever renders this in the shell (child issue 3):
//   - `data` is whatever the front matter holds, untrusted and of any shape, and it is not sanitized. A title such as
//     "<script>..." stays in `data`, never in `html`, so escape it when you render it.
//   - gray-matter needs Node's global `Buffer`. That is fine in Node and in Vitest, but the browser has none: parse
//     front matter at build time, or polyfill it.

import matter from 'gray-matter';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { PluggableList } from 'unified';

export interface ProcessorOptions {
  /** Plugins that run on the markdown tree, before it becomes HTML. */
  extraRemarkPlugins?: PluggableList;
  /** Plugins that run on the HTML tree, before rehype-slug and rehype-sanitize. */
  extraRehypePlugins?: PluggableList;
}

/** The pipeline. The extras are a seam: tests put hostile nodes through it, the build passes the slide-link rewrite. They run before the sanitizer. */
export function createProcessor(options: ProcessorOptions = {}) {
  return unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ['yaml']) // F133: YAML only. F135: never `anywhere`.
    .use(options.extraRemarkPlugins ?? [])
    .use(remarkRehype) // F136, F137: raw HTML stays off.
    .use(options.extraRehypePlugins ?? [])
    .use(rehypeSlug) // F142: no `prefix`; the sanitizer prefixes once.
    .use(rehypeSanitize) // Last, default schema (F138, F139, F141).
    .use(rehypeStringify);
}

/**
 * gray-matter selects an engine from the text after the opening fence, and its `javascript` engine runs the block with
 * eval(): `---js` front matter would execute at render time, and the spec's CSP forbids 'unsafe-eval'. The engine is
 * replaced under both names. gray-matter 4.0.3 registers only `javascript` and maps `js` (in any case) onto it, so
 * naming `js` too is belt and braces: the lock-down does not rest on that alias table. YAML (the default) and JSON
 * stay: neither can run code, and js-yaml's safe schema rejects tags such as !!js/function. A language that is not
 * registered throws, with one quirk: a name that exists on Object.prototype (`constructor`, `toString`, ...) is found
 * through the engines object's prototype chain and gives inert, oddly shaped `data` instead of an error. Nothing runs;
 * it is one more reason `data` is `unknown`.
 */
const REFUSED = {
  parse(): never {
    throw new Error('Front matter in JavaScript is refused: gray-matter would run it with eval(). Use YAML or JSON.');
  },
};

/**
 * Always an options object: gray-matter caches parsed input by its text only when called with none, and a cached
 * result must never stand in for one parsed under these engines.
 */
const MATTER_OPTIONS = { engines: { javascript: REFUSED, js: REFUSED } };

export interface RenderedMarkdown {
  /** The front matter as gray-matter parsed it: untrusted, not coerced, and of any shape. `{}` when there is none. */
  data: unknown;
  /** Sanitized HTML for the body. Every heading carries a `user-content-` prefixed id. */
  html: string;
}

/**
 * `renderMarkdown` with extra plugins: the same front matter lock-down and the same pipeline, so the sanitizer is still
 * the last stage and an extra cannot put anything past it. Without options it is `renderMarkdown`.
 */
export function createRenderer(options: ProcessorOptions = {}): (raw: string) => RenderedMarkdown {
  const processor = createProcessor(options);
  return (raw) => {
    const { data, content } = matter(raw, MATTER_OPTIONS);
    return { data, html: String(processor.processSync(content)) };
  };
}

const render = createRenderer();

/**
 * Render a curriculum markdown file: gray-matter splits off the front matter, and the pipeline renders the body.
 * Throws for front matter in a language the pipeline refuses, or for front matter that is not valid.
 */
export function renderMarkdown(raw: string): RenderedMarkdown {
  return render(raw);
}
