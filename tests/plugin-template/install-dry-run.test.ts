import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const ROOT = process.cwd();
const TEMPLATE_DIR = join(ROOT, 'plugin-template');
const INSTALL_MODULE = join(TEMPLATE_DIR, 'scripts', 'install.mjs');
const RELEASE_WORKFLOW = join(TEMPLATE_DIR, '.github', 'workflows', 'release.yml');

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

  it('dryRun() rejects absolute entrypoint paths', async () => {
    const mod = await import(pathToFileURL(INSTALL_MODULE).href);
    const result = await mod.dryRun(TEMPLATE_DIR, {
      manifestOverride: {
        name: 'broken',
        version: '0.0.1',
        description: 'x',
        minimum_cli_version: '1.0.0',
        entrypoints: { agents: [join(TEMPLATE_DIR, 'agents', 'example.agent.md')] },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringMatching(/must be relative/));
  });

  it('dryRun() rejects entrypoints that escape the template root', async () => {
    const mod = await import(pathToFileURL(INSTALL_MODULE).href);
    const result = await mod.dryRun(TEMPLATE_DIR, {
      manifestOverride: {
        name: 'broken',
        version: '0.0.1',
        description: 'x',
        minimum_cli_version: '1.0.0',
        entrypoints: { agents: ['../README.md'] },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContainEqual(expect.stringMatching(/escapes (?:template|bundle) root/));
  });

  it.runIf(process.platform === 'win32')(
    'dryRun() rejects a drive-relative entrypoint that resolves to another drive',
    async () => {
      const mod = await import(pathToFileURL(INSTALL_MODULE).href);
      const otherDrive = TEMPLATE_DIR[0].toUpperCase() === 'Z' ? 'Y' : 'Z';
      const result = await mod.dryRun(TEMPLATE_DIR, {
        manifestOverride: {
          name: 'broken',
          version: '0.0.1',
          description: 'x',
          minimum_cli_version: '1.0.0',
          entrypoints: { agents: [`${otherDrive}:agents/example.agent.md`] },
        },
      });
      expect(result.ok).toBe(false);
      expect(result.errors).toContainEqual(expect.stringMatching(/escapes (?:template|bundle) root/));
    },
  );

  it('pins every release.yml action to a full 40-char commit SHA with a version comment', () => {
    const raw = readFileSync(RELEASE_WORKFLOW, 'utf8');
    const doc = yaml.load(raw) as {
      jobs?: Record<string, { steps?: Array<{ uses?: string }> }>;
    };
    const steps = doc.jobs?.release?.steps ?? [];
    const usesSteps = steps.filter((s) => typeof s.uses === 'string');
    expect(usesSteps.length).toBeGreaterThanOrEqual(4);
    for (const step of usesSteps) {
      expect(step.uses).toMatch(/^[^@]+@[0-9a-f]{40}$/);
    }
    const usesLines = raw
      .split(/\r?\n/)
      .filter((l) => /^\s*-?\s*uses:\s+/.test(l));
    for (const line of usesLines) {
      expect(line).toMatch(/@[0-9a-f]{40}\s+#\s*v\d+/);
    }
  });

  it('modernization-bundle also enforces relative/contained entrypoints and SHA-pinned release actions', async () => {
    const modBundleDir = join(ROOT, 'modernization-bundle');
    const modInstall = await import(
      pathToFileURL(join(modBundleDir, 'scripts', 'install.mjs')).href
    );
    const okResult = await modInstall.dryRun(modBundleDir);
    expect(okResult.ok, JSON.stringify(okResult.errors)).toBe(true);

    const escapeResult = await modInstall.dryRun(modBundleDir, {
      manifestOverride: {
        name: 'broken',
        version: '0.0.1',
        minimum_cli_version: '1.0.0',
        entrypoints: { agents: ['../README.md'] },
      },
    });
    expect(escapeResult.ok).toBe(false);
    expect(escapeResult.errors).toContainEqual(
      expect.stringMatching(/escapes (?:template|bundle) root/),
    );

    const rawRelease = readFileSync(
      join(modBundleDir, '.github', 'workflows', 'release.yml'),
      'utf8',
    );
    const usesLines = rawRelease
      .split(/\r?\n/)
      .filter((l) => /^\s*-?\s*uses:\s+/.test(l));
    expect(usesLines.length).toBeGreaterThanOrEqual(4);
    for (const line of usesLines) {
      expect(line).toMatch(/@[0-9a-f]{40}\s+#\s*v\d+/);
    }
  });
});
