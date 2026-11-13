import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
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
    // `rm -rf … && make slides` needed a POSIX shell and GNU make, which the
    // suite does not otherwise require; the `slides` target is only an echo
    // plus this exact node invocation.
    rmSync(join(REPO_ROOT, 'workshop', 'dist'), { recursive: true, force: true });
    execFileSync(process.execPath, ['scripts/workshop/build-slides.mjs'], {
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

describe('workshop slides — claims about the shipped .github surface stay true', () => {
  const SCRIPTS_DIR = join(REPO_ROOT, 'workshop', 'speaker-scripts');
  const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
  const m1Slide = (): string => read('workshop/slides/10-module-1.md');
  const m1Script = (): string => read('workshop/speaker-scripts/module-01-extensibility-architecture.md');
  const m4Slide = (): string => read('workshop/slides/40-module-4.md');

  /** Repo-relative paths that `ls`, `head`, `cat` or `tail` name at the start of a line in `dir`'s Markdown files. */
  function demoPathsThatDoNotExist(dir: string): string[] {
    const missing: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      readFileSync(join(dir, file), 'utf8')
        .replace(/\r\n/g, '\n')
        .split('\n')
        .forEach((line, i) => {
          const m = line.match(/^\s*(?:ls|head|cat|tail)\s+(.+?)\s*(?:[|#].*)?$/);
          if (!m) return;
          for (const arg of m[1].split(/\s+/)) {
            if (!arg.includes('/') || /^-|[<>$*~]/.test(arg)) continue;
            // `.git/` is the repository's own metadata: a demo can create files there (for example a
            // pre-commit hook), so a path under it is not a tracked file this check can resolve.
            if (arg.startsWith('.git/')) continue;
            if (!existsSync(join(REPO_ROOT, arg))) missing.push(`${file}:${i + 1} ${arg}`);
          }
        });
    }
    return missing;
  }

  it('every path a slide demo passes to ls/head/cat exists on disk', () => {
    expect(demoPathsThatDoNotExist(SLIDES_DIR)).toEqual([]);
  });

  it('every path a speaker-script demo passes to ls/head/cat exists on disk', () => {
    expect(demoPathsThatDoNotExist(SCRIPTS_DIR)).toEqual([]);
  });

  it('M1 teaches command skills, not a .github/prompts directory that was migrated to skills', () => {
    for (const [name, text] of [['slide', m1Slide()], ['speaker script', m1Script()]] as const) {
      expect(text, `M1 ${name} still names .github/prompts`).not.toContain('.github/prompts');
      expect(text, `M1 ${name} still names prompts/*.prompt.md`).not.toContain('prompts/*.prompt.md');
    }
    expect(m1Slide()).toContain('disable-model-invocation: true');
    expect(m1Slide()).toContain('.github/skills/<name>/SKILL.md');
    expect(m1Slide()).toMatch(/command skills?/i);
  });

  it('M1 live demo lists the surfaces that exist: agents, skills, instructions and hooks', () => {
    expect(m1Slide()).toContain('ls .github/agents .github/skills .github/instructions .github/hooks');
  });

  it('M1 says a skill can be run as /skill-name — it does not say "you do not invoke them"', () => {
    expect(m1Slide()).not.toMatch(/you do not invoke them/i);
    expect(m1Slide()).toMatch(/\/skill-name/);
  });

  it('M1 says instruction files are combined with no precedence — not that a narrower applyTo overrides a broader one', () => {
    expect(m1Slide()).not.toMatch(/narrower\s+`?applyTo`?\s+overrides\s+broader/i);
    expect(m1Slide()).toMatch(/no precedence/i);
  });

  it('M4 does not call weekly-content-audit the only gh-aw workflow, and its count matches the workflows on disk', () => {
    const onDisk = readdirSync(join(REPO_ROOT, '.github', 'workflows')).filter((f) => f.endsWith('.md'));
    expect(onDisk.length, 'the claim would be vacuous with fewer than two workflows').toBeGreaterThan(1);
    expect(m4Slide()).not.toMatch(/only gh-aw workflow/i);

    const words: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
    const claimed = m4Slide().match(/one of the (\w+) committed gh-aw workflows/i)?.[1]?.toLowerCase();
    expect(claimed, 'M4 does not say "one of the N committed gh-aw workflows"').toBeDefined();
    expect(words[claimed as string]).toBe(onDisk.length);
    for (const f of onDisk) expect(m4Slide(), `M4 never names ${f}`).toContain(f);
  });
});
