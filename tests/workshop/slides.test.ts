import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

/**
 * Phase 2 — Slide framework outcome tests.
 *
 * These tests are deliberately OUTCOME-BASED, not structural. Per
 * `.orchestrator/plan.md` Phase 2 finding #4, we do NOT assert per-module
 * file existence parity — that would couple the slide layout to the test
 * and force lock-step edits in Phase 3. Instead we assert:
 *
 *   1. `make slides` builds `workshop/dist/index.html` successfully from
 *      a clean dist.
 *   2. The built HTML has `<html lang="...">` set (a11y smoke).
 *   3. Every `<img>` in the built HTML carries an `alt` attribute
 *      (a11y smoke).
 *   4. Every internal `<a href>` / `<link href>` / `<script src>` /
 *      `<img src>` in the built HTML resolves on disk — either inside
 *      `workshop/dist/` or at the repo root.
 *   5. Every file-path token referenced inside a code span in the slide
 *      source resolves on disk (so a live demo command like
 *      `cat labs/lab14.md` can't rot silently).
 *   6. Every `labNN` anchor-lab reference in the slide source resolves
 *      to a real lab id in `docs/_meta/registry.yaml`.
 *
 * Deeper a11y (contrast, keyboard nav) is Phase 5 per plan.md.
 */

const REPO_ROOT = resolve(__dirname, '..', '..');
const SLIDES_DIR = join(REPO_ROOT, 'workshop', 'slides');
const DIST_DIR = join(REPO_ROOT, 'workshop', 'dist');
const BUILT_INDEX = join(DIST_DIR, 'index.html');
const REGISTRY_PATH = join(REPO_ROOT, 'docs', '_meta', 'registry.yaml');

function readAllSlideSource(): string {
  if (!existsSync(SLIDES_DIR)) return '';
  const files = readdirSync(SLIDES_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();
  return files
    .map((f) => readFileSync(join(SLIDES_DIR, f), 'utf8'))
    .join('\n\n');
}

function loadRegistryLabIds(): Set<string> {
  const raw = readFileSync(REGISTRY_PATH, 'utf8');
  const doc = yaml.load(raw) as { labs?: Record<string, unknown> };
  return new Set(Object.keys(doc.labs ?? {}));
}

describe('workshop slides — build pipeline', () => {
  beforeAll(() => {
    // Build from a clean dist so we prove the target is reproducible.
    execSync('rm -rf workshop/dist && make slides', {
      cwd: REPO_ROOT,
      stdio: 'pipe',
    });
  }, 180_000);

  it('produces workshop/dist/index.html', () => {
    expect(existsSync(BUILT_INDEX)).toBe(true);
    expect(statSync(BUILT_INDEX).size).toBeGreaterThan(0);
  });

  it('sets <html lang="..."> for a11y', () => {
    const html = readFileSync(BUILT_INDEX, 'utf8');
    expect(html).toMatch(/<html[^>]*\blang=(["'])[a-zA-Z][a-zA-Z0-9-]*\1/);
  });

  it('gives every <img> an alt attribute', () => {
    const html = readFileSync(BUILT_INDEX, 'utf8');
    const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
    for (const tag of imgs) {
      expect(
        /\balt\s*=/.test(tag),
        `<img> without alt: ${tag}`,
      ).toBe(true);
    }
  });

  it('resolves every internal href/src to a file on disk', () => {
    const html = readFileSync(BUILT_INDEX, 'utf8');
    const refs: string[] = [];
    const attrRe = /\b(?:href|src)\s*=\s*(["'])([^"']+)\1/gi;
    let m: RegExpExecArray | null;
    while ((m = attrRe.exec(html)) !== null) {
      refs.push(m[2]);
    }

    const unresolved: string[] = [];
    for (const ref of refs) {
      if (
        ref.startsWith('http://') ||
        ref.startsWith('https://') ||
        ref.startsWith('//') ||
        ref.startsWith('data:') ||
        ref.startsWith('mailto:') ||
        ref.startsWith('#') ||
        ref === ''
      ) {
        continue;
      }
      // Strip query + fragment.
      const cleaned = ref.split('#')[0].split('?')[0];
      if (cleaned === '') continue;
      const candidates = isAbsolute(cleaned)
        ? [join(REPO_ROOT, cleaned.replace(/^\/+/, ''))]
        : [join(DIST_DIR, cleaned), join(REPO_ROOT, cleaned)];
      const ok = candidates.some((p) => existsSync(p));
      if (!ok) unresolved.push(ref);
    }
    expect(unresolved, `unresolved internal refs: ${unresolved.join(', ')}`).toEqual([]);
  });
});

describe('workshop slides — source cross-references', () => {
  it('references only file paths that exist on disk', () => {
    const src = readAllSlideSource();
    expect(src.length, 'no slide source found under workshop/slides/').toBeGreaterThan(0);

    // Extract code-span tokens (`...`) that look like repo-relative paths.
    // We intentionally only check tokens ending in a file extension we
    // care about for live demos / hand-off artifacts.
    const pathRe = /`([A-Za-z0-9_./-]+\.(?:md|ts|js|sh|ps1|ya?ml|json|cs|csproj))`/g;
    const tokens = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = pathRe.exec(src)) !== null) {
      tokens.add(m[1]);
    }

    const missing: string[] = [];
    for (const token of tokens) {
      // Ignore bare filenames with no directory component (e.g., AGENTS.md
      // mentioned generically) — those aren't path references.
      if (!token.includes('/')) continue;
      const p = join(REPO_ROOT, token);
      if (!existsSync(p)) missing.push(token);
    }
    expect(missing, `slide source references missing paths: ${missing.join(', ')}`).toEqual([]);
  });

  it('every labNN reference resolves to a registry lab id', () => {
    const src = readAllSlideSource();
    const labIds = loadRegistryLabIds();
    const refs = new Set<string>();
    const labRe = /\blab\d{2}\b/g;
    let m: RegExpExecArray | null;
    while ((m = labRe.exec(src)) !== null) {
      refs.add(m[0]);
    }
    const unknown = [...refs].filter((r) => !labIds.has(r));
    expect(unknown, `slide source references unknown lab ids: ${unknown.join(', ')}`).toEqual([]);
  });
});
