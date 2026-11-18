import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const SKILL = join(ROOT, '.github/skills/cost-check/SKILL.md');
const REGISTRY = join(ROOT, 'docs/_meta/registry.yaml');

/** Every model id the registry's `models:` block lists, lower-cased. */
function registryModels(): Set<string> {
  const doc = yaml.load(readFileSync(REGISTRY, 'utf8')) as { models?: Record<string, unknown> };
  const out = new Set<string>();
  for (const value of Object.values(doc.models ?? {})) {
    if (typeof value === 'string') out.add(value.toLowerCase());
    else if (Array.isArray(value)) {
      for (const v of value) if (typeof v === 'string') out.add(v.toLowerCase());
    }
  }
  return out;
}

const MODEL_ID =
  /\b(?:claude-(?:haiku|sonnet|opus)|gpt|gemini|grok)-\d[a-z0-9]*(?:[.-][a-z0-9]+)*\b/gi;

// The CLI no longer serves these; docs/_meta/registry.yaml dropped them from `models:`.
const RETIRED_MODELS = ['claude-sonnet-4.6', 'claude-opus-4.6', 'claude-opus-4.7'];

describe('.github/skills/cost-check/SKILL.md', () => {
  it('exists at the skill path', () => {
    expect(existsSync(SKILL), `expected ${SKILL} to exist`).toBe(true);
  });

  it('has frontmatter with name and description', () => {
    const raw = readFileSync(SKILL, 'utf8');
    const fm = matter(raw);
    expect(fm.data.name, 'frontmatter must include name').toBeDefined();
    expect(fm.data.description, 'frontmatter must include description').toBeDefined();
  });

  it('declares the three required sections', () => {
    const body = readFileSync(SKILL, 'utf8');
    expect(body).toMatch(/^##\s+Footprint estimate/m);
    expect(body).toMatch(/^##\s+Compaction opportunities/m);
    expect(body).toMatch(/^##\s+Model recommendation/m);
  });

  it('references the token-and-model guide', () => {
    const body = readFileSync(SKILL, 'utf8');
    expect(body).toMatch(/docs\/token-and-model-guide\.md/);
  });
});

describe('.github/skills/cost-check/SKILL.md: model guidance follows the registry tiers', () => {
  const modelSection = (): string => {
    const body = readFileSync(SKILL, 'utf8');
    const from = body.search(/^##\s+Model recommendation/m);
    expect(from, 'Model recommendation section must exist').toBeGreaterThanOrEqual(0);
    return body.slice(from);
  };

  it.each(['models.cheap', 'models.standard', 'models.premium'])(
    'recommends the %s tier by name',
    (tier) => {
      expect(modelSection()).toContain(tier);
    },
  );

  it('sends the reader to docs/_meta/registry.yaml for the concrete ids', () => {
    expect(modelSection()).toContain('docs/_meta/registry.yaml');
  });

  it.each(RETIRED_MODELS)('does not recommend the retired model %s', (id) => {
    expect(readFileSync(SKILL, 'utf8').toLowerCase()).not.toContain(id);
  });

  it('names no model id that the registry does not list', () => {
    const known = registryModels();
    const named = (readFileSync(SKILL, 'utf8').match(MODEL_ID) ?? []).map((m) => m.toLowerCase());
    expect(named.filter((m) => !known.has(m))).toEqual([]);
  });
});
