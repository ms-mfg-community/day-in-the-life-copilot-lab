import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

/**
 * Lab 10 contract — the mechanical definition of done for `specs/labs/lab10.md`.
 *
 * Follows the per-lab pattern already used by lab12/13/14, and exists so that
 * "the lab is current" is a command's verdict rather than a reviewer's opinion.
 * Each test below maps to a numbered acceptance criterion in the spec.
 */

const ROOT = process.cwd();
const LAB10 = join(ROOT, 'labs/lab10.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');
const SPEC = join(ROOT, 'specs/labs/lab10.md');

function labBody(): string {
  return readFileSync(LAB10, 'utf8');
}

/** Every model id named in the registry's `models:` block, flattened across tiers. */
function registryModels(): Set<string> {
  const doc = yaml.load(readFileSync(REGISTRY, 'utf8')) as {
    models?: Record<string, unknown>;
  };
  const models = doc.models ?? {};
  const out = new Set<string>();
  for (const value of Object.values(models)) {
    if (typeof value === 'string') out.add(value);
    else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') out.add(v);
  }
  return out;
}

// Vendor model identifiers, e.g. claude-opus-4.7 / gpt-5.4 / claude-haiku-4.5.
// Deliberately narrow: it matches an id shape, not any mention of a vendor.
const MODEL_ID = /\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi;

describe('lab10 contract: the spec exists and governs', () => {
  it('specs/labs/lab10.md exists — lab-forge refuses to run without it', () => {
    expect(existsSync(SPEC), `expected a lab spec at ${SPEC}`).toBe(true);
  });
});

describe('lab10 contract: AC5 — model names come from the registry', () => {
  it('every model identifier in lab10 appears in registry models:', () => {
    const known = registryModels();
    const found = new Set((labBody().match(MODEL_ID) ?? []).map((m) => m.toLowerCase()));
    const unknown = [...found].filter((m) => !known.has(m));
    expect(
      unknown,
      `lab10 names model(s) absent from docs/_meta/registry.yaml models:: ${unknown.join(', ')}. ` +
        `Either add them to the registry or have the lab reference the registry tier instead of ` +
        `hardcoding an id. Registry currently knows: ${[...known].sort().join(', ')}`,
    ).toEqual([]);
  });
});

describe('lab10 contract: AC6 — no unsourced relative-cost claims', () => {
  // These were asserted with no citation. Pricing moves and the lab cannot
  // carry a vendor-attributed number it does not source.
  const COST_CLAIMS: RegExp[] = [
    /\d+\s*\/\s*\d+\s*×/,
    /≈\s*\d+(?:\.\d+)?\s*\/\s*\d+\s*×/,
    /\d+\s*[–-]\s*\d+\s*%\s*more expensive/i,
    /\bcheaper than\b.*\b\d+\s*×/i,
  ];

  it('contains no hardcoded cost multiplier or relative-price claim', () => {
    const body = labBody();
    const hits = COST_CLAIMS.flatMap((re) => body.match(re) ?? []);
    expect(
      hits,
      `lab10 states a relative cost with no cited source: ${hits.join(' | ')}. ` +
        `Keep the cheap/standard/premium ordering, drop the multiplier.`,
    ).toEqual([]);
  });
});

describe('lab10 contract: AC7 — cited paths resolve', () => {
  it('every backticked repo path in lab10 exists on disk', () => {
    const body = labBody();
    // Backticked tokens that look like a repo-relative file path. Excludes
    // globs, home-relative paths and session-state placeholders, which are
    // illustrative rather than checkable.
    const candidates = [...body.matchAll(/`([A-Za-z0-9_./-]+\.(?:md|json|yaml|yml|sh|mjs|ts))`/g)]
      .map((m) => m[1])
      .filter((p) => !p.includes('*') && !p.startsWith('~') && !p.includes('<'));

    const missing = [...new Set(candidates)].filter((rel) => {
      // A bare filename (README.md, log.md) is a reference to a file discussed
      // in prose, not necessarily a repo-root path; only check real paths.
      if (!rel.includes('/')) return false;
      return !existsSync(join(ROOT, rel));
    });

    expect(missing, `lab10 cites path(s) that do not exist: ${missing.join(', ')}`).toEqual([]);
  });
});
