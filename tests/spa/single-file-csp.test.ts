/**
 * AC20 (specs/005-teaching-spa.md 2.9, F129-F131; child issue 11): the portable build's first element inside <head> is a
 * <meta http-equiv="Content-Security-Policy"> whose script-src lists only sha256- hashes that match the file's inline scripts
 * and contains none of 'unsafe-inline', 'unsafe-eval', data:.
 *
 * The page is the real build (helpers/single-file.ts), read back from disk. The hashes are computed here again, from the bytes
 * between the tags as a browser hashes them (F129), with no help from the plugin that wrote them: a test that asked the plugin
 * for the hash would be checking the plugin with the plugin. The pure functions of the plugin are then held against the same
 * page, so that what the build wrote and what they say agree.
 *
 * helpers/html-scan.ts is not used on the whole page: it reads every `<` followed by a letter as a tag, which is right for
 * sanitized content and wrong for a page whose script holds the rendered slides as strings. The two readings this test needs
 * (the first element inside <head>, the text of each inline script) are written out below instead.
 */
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contentSecurityPolicy, hashSource, inlineScripts, withContentSecurityPolicy } from '../../workshop/spa/vite-portable-plugin';
import { buildPortable, removePortable, type PortableBuild } from './helpers/single-file';

const SHA256 = /^'sha256-([A-Za-z0-9+/]{43}=)'$/;

interface Tag {
  name: string;
  attributes: Record<string, string>;
}

/** One start tag read from `html` at `at` (the `<`): its name and attributes, lower-cased names, unquoted values. */
function readTag(html: string, at: number): Tag {
  const end = html.indexOf('>', at);
  const inside = html.slice(at + 1, end === -1 ? undefined : end).replace(/\/$/, '');
  const [name, ...rest] = inside.split(/\s+/);
  const attributes: Record<string, string> = {};
  for (const match of inside.slice(name.length).matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return { name: name.toLowerCase(), attributes };
}

/** The first element inside <head>: the first start tag after the head's own. */
function firstElementInHead(html: string): Tag {
  const head = /<head\b[^>]*>/i.exec(html);
  if (head === null) throw new Error('the page has no <head>');
  const next = /<[A-Za-z]/g;
  next.lastIndex = head.index + head[0].length;
  const found = next.exec(html);
  if (found === null) throw new Error('nothing follows <head>');
  return readTag(html, found.index);
}

/** The text of every inline script: what lies between a <script ...> with no src and the first </script after it, as a browser reads it. */
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

/** The directives of a policy: name -> source list, the first occurrence winning as the browser has it. */
function directives(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name !== '' && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), sources);
  }
  return map;
}

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('base64');

const metaIsPolicy = (tag: Tag): boolean => tag.name === 'meta' && tag.attributes['http-equiv']?.toLowerCase() === 'content-security-policy';

describe('AC20 — the portable page carries a hash-only Content-Security-Policy, first in <head>', () => {
  let build: PortableBuild;
  let policy: Map<string, string[]>;

  beforeAll(() => {
    build = buildPortable();
    const first = firstElementInHead(build.html);
    expect(first.name, 'the first element inside <head> is a <meta>').toBe('meta');
    expect(metaIsPolicy(first), 'and it is the Content-Security-Policy').toBe(true);
    expect(first.attributes.content, 'the policy is in its content attribute').toBeDefined();
    policy = directives(first.attributes.content);
  }, 120_000);

  afterAll(() => {
    if (build) removePortable(build);
  });

  it('is the only Content-Security-Policy in the page, and the page is the only file the build wrote', () => {
    const metas = Array.from(build.html.matchAll(/<meta\b[^>]*>/gi), (match) => readTag(build.html, match.index)).filter(metaIsPolicy);
    expect(metas).toHaveLength(1);
    expect(build.files).toEqual(['teaching-spa.html']);
  });

  it('has a script-src of sha256- hashes and nothing else', () => {
    const sources = policy.get('script-src');
    expect(sources, 'script-src is present').toBeDefined();
    expect(sources?.length).toBeGreaterThan(0);
    for (const source of sources ?? []) expect(source).toMatch(SHA256);
  });

  it("contains none of 'unsafe-inline', 'unsafe-eval', data: where a script could come from", () => {
    for (const name of ['script-src', 'script-src-elem', 'script-src-attr', 'default-src']) {
      for (const source of policy.get(name) ?? []) {
        const lower = source.toLowerCase();
        expect(lower).not.toBe("'unsafe-inline'");
        expect(lower).not.toBe("'unsafe-eval'");
        expect(lower.startsWith('data:')).toBe(false);
      }
    }
    // default-src is what script-src falls back on where script-src-elem is absent: it allows nothing.
    expect(policy.get('default-src')).toEqual(["'none'"]);
  });

  it('lists exactly the hashes of the inline scripts in the file, computed here from the bytes between the tags', () => {
    const scripts = scriptsInPage(build.html);
    expect(scripts.length, 'the page has inline scripts').toBeGreaterThan(0);
    const expected = new Set(scripts.map((script) => `'sha256-${sha256(script)}'`));
    expect(new Set(policy.get('script-src'))).toEqual(expected);
  });

  it('matches what the plugin computes for the same page, so the build wrote what its functions say', () => {
    // Take the policy the build wrote out and let the pure function write it again: the two pages must be identical.
    const stripped = build.html.replace(/\n\s*<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
    expect(stripped).not.toBe(build.html);
    expect(withContentSecurityPolicy(stripped)).toBe(build.html);
    expect(inlineScripts(build.html)).toEqual(scriptsInPage(build.html));
    expect(contentSecurityPolicy(build.html)).toContain(`script-src ${inlineScripts(build.html).map(hashSource).join(' ')}`);
  });

  it('a one-byte change to a script no longer matches: the hash is of the script, not of the page', () => {
    const [script] = inlineScripts(build.html);
    expect(hashSource(`${script};`)).not.toBe(hashSource(script));
    expect(policy.get('script-src')).not.toContain(hashSource(`${script};`));
  });

  it('the plugin refuses a page that already has a policy, one with no inline script, and one with no <head>', () => {
    expect(() => withContentSecurityPolicy(build.html)).toThrow(/already carries/);
    expect(() => contentSecurityPolicy('<!doctype html><html><head></head><body></body></html>')).toThrow(/no inline script/);
    expect(() => withContentSecurityPolicy('<p>no head</p><script>1</script>')).toThrow(/no <head>/);
  });

  it('puts the policy first when <head> carries attributes or is upper case, and leaves everything after it as it was', () => {
    const page = '<!DOCTYPE html><HTML><HEAD lang="en"><meta charset="utf-8"><script>alert(1)</script></HEAD><body></body></HTML>';
    const out = withContentSecurityPolicy(page);
    expect(metaIsPolicy(firstElementInHead(out))).toBe(true);
    expect(out.endsWith('<meta charset="utf-8"><script>alert(1)</script></HEAD><body></body></HTML>')).toBe(true);
    expect(out).toContain(`script-src 'sha256-${sha256('alert(1)')}'`);
  });

  it('hashes two scripts separately and once each', () => {
    const page = '<html><head></head><body><script>a()</script><script type="module">b()</script><script>a()</script></body></html>';
    expect(directives(contentSecurityPolicy(page)).get('script-src')).toEqual([`'sha256-${sha256('a()')}'`, `'sha256-${sha256('b()')}'`]);
  });
});
