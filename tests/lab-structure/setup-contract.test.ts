import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Setup contract — the mechanical definition of done for `specs/labs/setup.md`.
 * Each describe block maps to a numbered acceptance criterion in that spec.
 */

const ROOT = process.cwd();
const SETUP = join(ROOT, 'labs/setup.md');
const README = join(ROOT, 'README.md');
const MAKEFILE = join(ROOT, 'Makefile');
const SPEC = join(ROOT, 'specs/labs/setup.md');

const read = (p: string): string => readFileSync(p, 'utf8');

/** GitHub's heading-to-anchor slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function readmeAnchors(): Set<string> {
  const headings = [...read(README).matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1]);
  return new Set(headings.map(slug));
}

describe('setup contract: the spec exists and governs', () => {
  it('specs/labs/setup.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('setup contract: AC4 — no lab catalogue in the stub', () => {
  it('labs/setup.md does not enumerate labs; README Lab Modules is the single source', () => {
    const hits = read(SETUP).match(/\bLabs?\s+\d{2}(?:\s*[–-]\s*\d{2})?/g) ?? [];
    expect(hits, `labs/setup.md enumerates labs: ${hits.join(' | ')}`).toEqual([]);
  });
});

describe('setup contract: AC5 — named make targets exist', () => {
  it('every `make <target>` in setup.md or README is defined in Makefile', () => {
    const defined = new Set(
      [...read(MAKEFILE).matchAll(/^([A-Za-z0-9_.-]+):/gm)].map((m) => m[1]),
    );
    const used = [SETUP, README].flatMap((p) =>
      [...read(p).matchAll(/\bmake\s+([a-z][a-z0-9-]*)/g)].map((m) => m[1]),
    );
    const missing = [...new Set(used)].filter((t) => !defined.has(t));
    expect(missing, `make target(s) not in Makefile: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('setup contract: AC6 — setup.md anchors resolve in the README', () => {
  it('every ../README.md#anchor linked from setup.md is a real README heading', () => {
    const anchors = readmeAnchors();
    const linked = [...read(SETUP).matchAll(/\.\.\/README\.md#([^)\s]+)/g)].map((m) => m[1]);
    expect(linked.length, 'setup.md should link at least one README anchor').toBeGreaterThan(0);
    const broken = linked.filter((a) => !anchors.has(a));
    expect(broken, `unresolved README anchor(s): ${broken.join(', ')}`).toEqual([]);
  });
});

describe('setup contract: AC7 — Node floor matches the Copilot CLI install docs', () => {
  const NODE = (v: number) => new RegExp(`Node(?:\\.js)?\\*{0,2}\\s*\\(?v?${v}\\b`, 'i');

  it('README no longer says Node 18', () => {
    expect(read(README)).not.toMatch(NODE(18));
  });

  it('README states Node 22 for the npm install path', () => {
    expect(read(README)).toMatch(NODE(22));
  });
});

describe('setup contract: AC8 — troubleshooting names the right login', () => {
  it('"Copilot CLI not authenticated" row says `copilot login`, not `gh auth login`', () => {
    const row = read(README)
      .split('\n')
      .find((l) => /\|\s*Copilot CLI not authenticated/i.test(l));
    expect(row, 'Troubleshooting row for Copilot CLI authentication not found').toBeDefined();
    expect(row).toContain('copilot login');
    expect(row).not.toContain('gh auth login');
  });
});
