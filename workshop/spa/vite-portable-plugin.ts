// The portable single-file build (specs/005-teaching-spa.md 2.9; AC5, AC20): the policy of the one file, and the plugin that
// writes it in. vite-plugin-singlefile puts the bundle inside the page as an inline module script; this runs after it and
// puts a Content-Security-Policy in front of everything else in <head>, with a sha256 hash for each inline script and
// nothing else in script-src, so the page opened from disk runs its own code and no other.
//
// The policy is computed from the page as built, never written by hand: a hash that does not match the script it is for is
// a page that does nothing, and that is found out in front of an audience. The pure functions are exported so a test can
// hold the built file against them.

import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';

/** The portable build's file name, inside the build's outDir (2.1). */
export const PORTABLE_FILE = 'teaching-spa.html';

const INLINE_SCRIPT = /<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
const HEAD_OPEN = /<head\b[^>]*>/i;

/** The text of each inline script of the page, as the browser hashes it: the bytes between the tags, untouched. */
export function inlineScripts(html: string): string[] {
  return Array.from(html.matchAll(INLINE_SCRIPT), (match) => match[1]);
}

/** A CSP hash-source for one inline script (F129): sha256 over the UTF-8 bytes of its text, base64. */
export function hashSource(script: string): string {
  return `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`;
}

/**
 * The policy for the portable page (2.9, AC20). script-src is the hashes of the inline scripts and nothing else: no
 * 'unsafe-inline', no 'unsafe-eval', no data: (F130, F121). Styles are inline too (the shell's own <style> and the style
 * attributes the interactions carry), so they are allowed as such; style attributes have no hash form a browser accepts without
 * 'unsafe-hashes', and a style cannot run code. Images and fonts the bundler inlines are data: URIs (F113, F116). Nothing is
 * fetched at presentation time (1, Non-goals), so every other kind of resource is refused.
 */
export function contentSecurityPolicy(html: string): string {
  const scripts = inlineScripts(html);
  if (scripts.length === 0) throw new Error(`${PORTABLE_FILE}: the page has no inline script, so nothing was inlined into it`);
  const sources = [...new Set(scripts.map(hashSource))].join(' ');
  return [
    "default-src 'none'",
    `script-src ${sources}`,
    "style-src 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src data:",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/** The page with its policy as the first element inside <head> (F131: a meta policy applies to nothing before it). */
export function withContentSecurityPolicy(html: string): string {
  const head = HEAD_OPEN.exec(html);
  if (head === null) throw new Error(`${PORTABLE_FILE}: the page has no <head>`);
  if (/http-equiv\s*=\s*["']?content-security-policy/i.test(html)) {
    throw new Error(`${PORTABLE_FILE}: the page already carries a Content-Security-Policy; this build writes the only one`);
  }
  const policy = contentSecurityPolicy(html);
  const at = head.index + head[0].length;
  return `${html.slice(0, at)}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />${html.slice(at)}`;
}

/**
 * Rewrites the single HTML asset of the bundle with its policy. Listed after vite-plugin-singlefile, and like it a post
 * hook, so it sees the page with the bundle already inside it, and the asset the single-file plugin emitted under
 * PORTABLE_FILE in place of index.html.
 */
export function portableCspPlugin(): Plugin {
  return {
    name: 'spa-portable-csp',
    enforce: 'post',
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const pages = Object.values(bundle).filter((asset) => asset.type === 'asset' && asset.fileName.endsWith('.html'));
        if (pages.length !== 1 || pages[0].fileName !== PORTABLE_FILE) {
          throw new Error(`the portable build must produce exactly ${PORTABLE_FILE}; found ${pages.map((page) => page.fileName).join(', ') || 'no page'}`);
        }
        const page = pages[0];
        if (page.type !== 'asset') return;
        const html = typeof page.source === 'string' ? page.source : Buffer.from(page.source).toString('utf8');
        page.source = withContentSecurityPolicy(html);
      },
    },
  };
}
