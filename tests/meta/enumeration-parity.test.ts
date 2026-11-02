import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const LABS_DIR = join(ROOT, 'labs');
const REGISTRY_PATH = join(ROOT, 'docs', '_meta', 'registry.yaml');
const README_PATH = join(ROOT, 'README.md');

/**
 * Allowlist of lab IDs deliberately omitted from a given enumeration source.
 * Each entry MUST include a comment justifying the exemption. Phase A ships
 * with an EMPTY allowlist on purpose — the test is RED at end of Phase A and
 * Phase B closes the gaps. If Phase B decides a particular omission is
 * intentional (e.g., a lab deliberately absent from the registry), add an
 * entry here with justification.
 */
const ALLOWLIST: Record<'registry' | 'readme', Set<string>> = {
  registry: new Set<string>(),
  readme: new Set<string>(),
};

// labs/setup.md is deliberately NOT an enumeration source: it is a grouped
// narrative, not a manifest (docs/archive/phase-A-findings.md:136;
// specs/labs/setup.md AC4 forbids it from enumerating the lab catalogue).
// README.md's Lab Modules table is the single authoritative per-lab index.

function listLabIds(): string[] {
  if (!existsSync(LABS_DIR)) return [];
  return readdirSync(LABS_DIR)
    .filter((f) => /^lab\d+\.md$/.test(f))
    .map((f) => f.replace(/\.md$/, ''))
    .sort();
}

function registryLabIds(): Set<string> {
  if (!existsSync(REGISTRY_PATH)) return new Set();
  const data = yaml.load(readFileSync(REGISTRY_PATH, 'utf8')) as { labs?: Record<string, unknown> };
  return new Set(Object.keys(data?.labs ?? {}));
}

function fileMentionsLab(path: string, labId: string): boolean {
  if (!existsSync(path)) return false;
  const content = readFileSync(path, 'utf8');
  // Match either a markdown link to labs/labNN.md or labNN.md, or an explicit
  // "Lab NN" heading that uniquely identifies the lab.
  const num = labId.replace(/^lab/, '');
  const linkRe = new RegExp(`\\(\\s*(?:labs/)?${labId}\\.md(?:#|\\))`, 'i');
  const headingRe = new RegExp(`\\bLab\\s+0?${Number(num)}\\b`);
  return linkRe.test(content) || headingRe.test(content);
}

describe('meta: enumeration parity (every lab listed in every canonical enumeration source)', () => {
  const labs = listLabIds();

  it('discovers lab files', () => {
    expect(labs.length).toBeGreaterThan(0);
    expect(labs[0]).toMatch(/^lab\d+$/);
  });

  describe('docs/_meta/registry.yaml `labs:` block', () => {
    const inRegistry = registryLabIds();
    it.each(labs)('%s is present in registry.yaml labs block', (labId) => {
      if (ALLOWLIST.registry.has(labId)) return;
      expect(
        inRegistry.has(labId),
        `${labId} is missing from docs/_meta/registry.yaml labs: block`,
      ).toBe(true);
    });
  });

  describe('README.md module table', () => {
    it.each(labs)('%s is referenced in README.md', (labId) => {
      if (ALLOWLIST.readme.has(labId)) return;
      expect(
        fileMentionsLab(README_PATH, labId),
        `${labId} is missing from README.md`,
      ).toBe(true);
    });
  });
});
