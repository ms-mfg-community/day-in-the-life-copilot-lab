/**
 * AC5 (specs/005-teaching-spa.md 2.9; child issue 11): the portable build writes workshop/spa/dist/standalone/teaching-spa.html
 * containing no `<script src=`, no `<link rel="stylesheet"`, and no `import(` of a relative or absolute URL.
 *
 * The page is the real build (helpers/single-file.ts), read back from disk. The third assertion is about code, not about
 * characters: the slides the page holds as strings quote shell commands that spell `import("./...")`, which is text, not a
 * dynamic import. So the inline module scripts are read by esbuild (a dependency of Vite, already here), bundling with every
 * import left external, whose metafile lists each import statement and each `import()` of a string literal the script has, and
 * and transformed by esbuild once more with `import()` marked unsupported, which rewrites every `import()` expression the script
 * has, literal argument or not, and leaves a string alone. A script with none of either fetches no module at run time (F125,
 * F126, F50, F55).
 */
import { build as esbuild, transform } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROOT, buildPortable, removePortable, type PortableBuild } from './helpers/single-file';

interface Imports {
  /** Every import statement and every `import()` of a string literal the script has, as esbuild lists them: `{ path, kind }`. */
  listed: Array<{ path: string; kind: string }>;
  /** Whether the script has any `import()` expression at all, whatever its argument. */
  dynamic: boolean;
}

/** esbuild rewrites `import()` where it is told the target lacks it; a script it leaves as it was has none. */
async function hasDynamicImport(script: string): Promise<boolean> {
  const options = { format: 'esm' as const, logLevel: 'silent' as const };
  const [plain, rewritten] = await Promise.all([transform(script, options), transform(script, { ...options, supported: { 'dynamic-import': false } })]);
  return plain.code !== rewritten.code;
}

async function importsOf(script: string): Promise<Imports> {
  const result = await esbuild({
    stdin: { contents: script, loader: 'js', sourcefile: 'inline.js', resolveDir: ROOT },
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    logLevel: 'silent',
    packages: 'external',
    external: ['*'],
  });
  const listed = Object.values(result.metafile.inputs).flatMap((input) => input.imports.map(({ path, kind }) => ({ path, kind })));
  return { listed, dynamic: await hasDynamicImport(script) };
}

/** The text of every inline script: between a <script ...> with no src and the first </script after it, as a browser reads it. */
function scriptsInPage(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<script\b([^>]*)>/gi)) {
    if (/\ssrc\s*=/i.test(` ${match[1]}`)) continue;
    const start = match.index + match[0].length;
    const end = html.toLowerCase().indexOf('</script', start);
    found.push(html.slice(start, end === -1 ? undefined : end));
  }
  return found;
}

describe('AC5 — the portable build is one file that fetches nothing', () => {
  let build: PortableBuild;

  beforeAll(() => {
    build = buildPortable();
  }, 120_000);

  afterAll(() => {
    if (build) removePortable(build);
  });

  it('writes teaching-spa.html and nothing else', () => {
    expect(build.files).toEqual(['teaching-spa.html']);
    expect(build.html.length).toBeGreaterThan(10_000);
  });

  it('contains no <script src=', () => {
    expect(build.html).not.toMatch(/<script\b[^>]*\ssrc\s*=/i);
  });

  it('contains no <link rel="stylesheet"', () => {
    expect(build.html).not.toMatch(/<link\b[^>]*\brel\s*=\s*["']?stylesheet/i);
    expect(build.html).not.toMatch(/<link\b[^>]*\brel\s*=\s*["']?modulepreload/i);
  });

  it('has at least one inline module script, and that is where the application is', () => {
    const scripts = scriptsInPage(build.html);
    expect(scripts.length).toBeGreaterThan(0);
    expect(build.html).toMatch(/<script type="module"[^>]*>/);
    expect(scripts.some((script) => script.includes('teachingSpa'))).toBe(true);
  });

  it('contains no import() of a URL and no import statement: nothing is fetched at run time', async () => {
    for (const script of scriptsInPage(build.html)) {
      const { listed, dynamic } = await importsOf(script);
      expect(listed).toEqual([]);
      expect(dynamic).toBe(false);
    }
  }, 60_000);

  it('the oracle sees a dynamic import of a relative URL, of an absolute URL, and of a non-literal', async () => {
    const relative = await importsOf('export const a = () => import("./chunk.js");');
    expect(relative).toEqual({ listed: [{ path: './chunk.js', kind: 'dynamic-import' }], dynamic: true });
    const absolute = await importsOf('export const a = () => import("https://cdn.example/x.js");');
    expect(absolute).toEqual({ listed: [{ path: 'https://cdn.example/x.js', kind: 'dynamic-import' }], dynamic: true });
    const statement = await importsOf('import x from "/abs.js"; export { x };');
    expect(statement).toEqual({ listed: [{ path: '/abs.js', kind: 'import-statement' }], dynamic: false });
    const dynamic = await importsOf('export const a = (name) => import(name);');
    expect(dynamic).toEqual({ listed: [], dynamic: true });
    // And the text of a slide that spells `import("...")` inside a string, or a regular expression, is not an import.
    const quoted = await importsOf('export const html = "<code>node -e \'import(\\"./policy.mjs\\")\'</code>"; export const re = /import\\(/;');
    expect(quoted).toEqual({ listed: [], dynamic: false });
  });

  it('escapes what would end the script early: no </script or <!-- inside the inlined code (F114)', () => {
    for (const script of scriptsInPage(build.html)) {
      expect(script.toLowerCase()).not.toContain('</script');
      expect(script).not.toContain('<!--');
    }
  });
});
