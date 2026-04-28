import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const LABS_DIR = join(ROOT, 'labs');
const REGISTRY_PATH = join(ROOT, 'docs', '_meta', 'registry.yaml');
const README_PATH = join(ROOT, 'README.md');
const SETUP_PATH = join(ROOT, 'labs', 'setup.md');

/**
 * Allowlist of lab IDs deliberately omitted from a given enumeration source.
 * Each entry MUST include a comment justifying the exemption. Phase A ships
 * with an EMPTY allowlist on purpose — the test is RED at end of Phase A and
 * Phase B closes the gaps. If Phase B decides a particular omission is
 * intentional (e.g., setup.md grouping convention), add an entry here with
 * justification.
 */
const ALLOWLIST: Record<'registry' | 'readme' | 'setup', Set<string>> = {
  registry: new Set<string>(),
  readme: new Set<string>(),
  // labs/setup.md is an intentionally-grouped narrative redirect page, not a
  // per-lab manifest: labs 01-10 are summarised as "the core agentic surface"
  // and lab11 is named-but-not-hyperlinked per the same grouping convention.
  // The authoritative per-lab index lives in README.md's Lab Modules table
  // (already asserted by the README block above). Labs 12-14 ARE individually
  // linked from setup.md because they are post-core standalones and stay
  // outside this allowlist so any future regression (e.g., a removed link)
  // still fails the parity check.
  setup: new Set<string>([
    'lab01',
    'lab02',
    'lab03',
    'lab04',
    'lab05',
    'lab06',
    'lab07',
    'lab08',
    'lab09',
    'lab10',
    'lab11',
  ]),
};

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

  describe('labs/setup.md catalogue', () => {
    it.each(labs)('%s is referenced in labs/setup.md', (labId) => {
      if (ALLOWLIST.setup.has(labId)) return;
      expect(
        fileMentionsLab(SETUP_PATH, labId),
        `${labId} is missing from labs/setup.md`,
      ).toBe(true);
    });
  });
});
