import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const TEMPLATE_DIR = join(ROOT, 'plugin-template');
const INSTALL_MODULE = join(TEMPLATE_DIR, 'scripts', 'install.mjs');

// Emulates `copilot plugin install --dry-run`: parses the manifest, resolves
// every declared entrypoint path, and returns a structured result. The test
// treats the helper as the authoritative dry-run surface for CI.
describe('plugin-template: install --dry-run succeeds against template', () => {
  it('dryRun() reports ok with no errors for the template', async () => {
    const mod = await import(pathToFileURL(INSTALL_MODULE).href);
    expect(typeof mod.dryRun).toBe('function');

    const result = await mod.dryRun(TEMPLATE_DIR);
    expect(result.ok, `dryRun errors: ${JSON.stringify(result.errors)}`).toBe(
      true,
    );
    expect(result.errors).toEqual([]);
    expect(result.resolved.agents.length).toBeGreaterThanOrEqual(1);
    expect(result.resolved.skills.length).toBeGreaterThanOrEqual(1);
    expect(result.resolved.hooks.length).toBeGreaterThanOrEqual(1);
  });

  it('dryRun() reports errors when an entrypoint file is missing', async () => {
    const mod = await import(pathToFileURL(INSTALL_MODULE).href);
    const result = await mod.dryRun(TEMPLATE_DIR, {
      manifestOverride: {
        name: 'broken',
        version: '0.0.1',
        description: 'x',
        minimum_cli_version: '1.0.0',
        entrypoints: { agents: ['agents/does-not-exist.md'] },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toMatch(/does-not-exist/);
  });
});
