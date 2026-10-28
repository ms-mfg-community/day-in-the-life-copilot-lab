import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const GUIDE = join(ROOT, 'docs/token-and-model-guide.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');

/**
 * The guide must document every model the registry actually offers.
 *
 * This list is DERIVED from `docs/_meta/registry.yaml` rather than
 * hardcoded. A hardcoded copy used to pin ids the registry had
 * deliberately dropped (`claude-sonnet-4.6`, `claude-opus-4.7`,
 * `gpt-5.2`), which forced the guide to keep advertising models the
 * installed CLI no longer serves — the repo asserted both "unservable"
 * and "must be documented as a pick" at the same time, and the gate
 * stayed green through the contradiction. The registry is the single
 * source of truth for model ids (see tests/lab-structure/lab10-contract.test.ts);
 * this test now follows it.
 */
function registryModels(): string[] {
  const doc = yaml.load(readFileSync(REGISTRY, 'utf8')) as {
    models?: Record<string, unknown>;
  };
  const out = new Set<string>();
  for (const value of Object.values(doc.models ?? {})) {
    if (typeof value === 'string') out.add(value);
    else if (Array.isArray(value)) for (const v of value) if (typeof v === 'string') out.add(v);
  }
  return [...out].sort();
}

const REQUIRED_SECTIONS = [
  /^##\s+Model selection/m,
  /^##\s+Batching/m,
  /^##\s+Context hygiene/m,
  /^##\s+Prompt shape/m,
  /^##\s+Measuring/m,
];

describe('docs/token-and-model-guide.md', () => {
  it('exists', () => {
    expect(existsSync(GUIDE), `expected ${GUIDE} to exist`).toBe(true);
  });

  it('mentions every model the registry offers', () => {
    const body = readFileSync(GUIDE, 'utf8');
    const missing = registryModels().filter((id) => !body.includes(id));
    expect(
      missing,
      `guide is missing models the registry lists: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('keeps retired ids quarantined under a "Retired" heading', () => {
    // Ids the registry dropped may still be NAMED (so a learner can
    // recognise an old pin) but must not be presented as a live tier
    // choice. Guard the boundary: everything after the Retired heading
    // is allowed to name them; the tier lists above it are not.
    const body = readFileSync(GUIDE, 'utf8');
    const retiredHeading = body.search(/^###\s+Retired/m);
    expect(retiredHeading, 'guide needs a "### Retired" subsection').toBeGreaterThan(-1);

    const known = new Set(registryModels());
    const tierLists = body.slice(0, retiredHeading);
    const named = new Set(
      (tierLists.match(/\b(?:claude|gpt|gemini|grok)-[a-z0-9.]+(?:-[a-z0-9.]+)*\b/gi) ?? []).map(
        (m) => m.toLowerCase(),
      ),
    );
    const leaked = [...named].filter((m) => !known.has(m));
    expect(
      leaked,
      `guide presents retired/unknown model id(s) as a live pick: ${leaked.join(', ')}. ` +
        `Move them under "### Retired — do not pin" or add them to the registry.`,
    ).toEqual([]);
  });

  it('has the five required sections', () => {
    const body = readFileSync(GUIDE, 'utf8');
    for (const re of REQUIRED_SECTIONS) {
      expect(body, `missing section matching ${re}`).toMatch(re);
    }
  });

  it('cross-references /clear, view_range, and strategic-compact', () => {
    const body = readFileSync(GUIDE, 'utf8');
    expect(body).toMatch(/\/clear/);
    expect(body).toMatch(/view_range/);
    expect(body).toMatch(/strategic-compact/);
  });
});
