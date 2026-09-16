import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const LABS_DIR = join(ROOT, 'labs');
const REGISTRY_PATH = join(ROOT, 'docs', '_meta', 'registry.yaml');

describe('content-currency: labs consume registry.yaml', () => {
  it('registry.yaml exists at docs/_meta/registry.yaml', () => {
    expect(existsSync(REGISTRY_PATH)).toBe(true);
  });

  it('registry.yaml parses and declares required top-level keys', () => {
    const raw = readFileSync(REGISTRY_PATH, 'utf8');
    const data = yaml.load(raw) as Record<string, unknown>;
    for (const key of [
      'copilot_cli_version_floor',
      'gh_aw_schema_version',
      'mcp_servers',
      'models',
      'labs',
    ]) {
      expect(data[key], `registry.yaml missing "${key}"`).toBeDefined();
    }
  });

  it('at least 3 labs reference the registry (not hardcoded versions)', () => {
    const labs = readdirSync(LABS_DIR).filter((f) => /^lab\d+\.md$/.test(f));
    const marker = 'docs/_meta/registry.yaml';
    const consumers = labs.filter((lab) =>
      readFileSync(join(LABS_DIR, lab), 'utf8').includes(marker),
    );
    expect(
      consumers.length,
      `only ${consumers.length} labs reference ${marker}: ${consumers.join(', ')}`,
    ).toBeGreaterThanOrEqual(3);
  });
});
