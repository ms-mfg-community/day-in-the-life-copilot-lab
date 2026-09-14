import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Lockfiles are declared release inputs: `verifyInputs` gates every `lab-core`
// command on their bytes, and they feed the release SBOM. A corporate npm proxy
// (for example `packagefeedproxy.microsoft.io`, which resolves to an Azure
// Artifacts shard) rewrites `resolved` to a maintainer-specific mirror and
// records the upstream `dist.shasum` (SHA-1) instead of `dist.integrity`
// (SHA-512). Both make the "reproducible core" unreproducible, so regeneration
// must happen against the canonical registry.
const REPOSITORY_ROOT = join(__dirname, '..', '..');
const CANONICAL_REGISTRY_HOST = 'registry.npmjs.org';
const STRONG_INTEGRITY_PREFIX = 'sha512-';
const NPM_LOCKFILES = ['package-lock.json', 'packaging/core/tools/package-lock.json'];
const PNPM_LOCKFILE = 'node/pnpm-lock.yaml';
const REGENERATION_HINT =
  'regenerate with `npm install --registry https://registry.npmjs.org/` on a host that can reach npmjs';

interface LockfileEntry {
  readonly resolved?: string;
  readonly integrity?: string;
}

function readNpmLockfile(relativePath: string): ReadonlyArray<readonly [string, LockfileEntry]> {
  const raw = readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8');
  const parsed = JSON.parse(raw) as { packages?: Record<string, LockfileEntry> };
  return Object.entries(parsed.packages ?? {}).filter(([, entry]) => entry.resolved && entry.integrity);
}

function describeViolations(
  relativePath: string,
  entries: ReadonlyArray<readonly [string, LockfileEntry]>,
): readonly string[] {
  return entries.map(([name, entry]) => `${relativePath} :: ${name || '<root>'} -> ${entry.resolved} (${entry.integrity})`);
}

describe('lockfile provenance', () => {
  it.each(NPM_LOCKFILES)('%s resolves every package from the canonical npm registry', (relativePath) => {
    const offRegistry = readNpmLockfile(relativePath).filter(
      ([, entry]) => new URL(entry.resolved!).host !== CANONICAL_REGISTRY_HOST,
    );

    expect(
      describeViolations(relativePath, offRegistry),
      `${offRegistry.length} entries resolve off ${CANONICAL_REGISTRY_HOST}; ${REGENERATION_HINT}`,
    ).toEqual([]);
  });

  it.each(NPM_LOCKFILES)('%s records SHA-512 integrity rather than a downgraded hash', (relativePath) => {
    const weakIntegrity = readNpmLockfile(relativePath).filter(
      ([, entry]) => !entry.integrity!.startsWith(STRONG_INTEGRITY_PREFIX),
    );

    expect(
      describeViolations(relativePath, weakIntegrity),
      `${weakIntegrity.length} entries carry non-SHA-512 integrity; ${REGENERATION_HINT}`,
    ).toEqual([]);
  });

  it('node/pnpm-lock.yaml records neither a downgraded hash nor an off-registry tarball', () => {
    const raw = readFileSync(join(REPOSITORY_ROOT, PNPM_LOCKFILE), 'utf8');
    const weakIntegrity = raw.match(/integrity:\s*(?!sha512-)[a-z0-9]+-/gi) ?? [];
    const offRegistryTarballs = (raw.match(/tarball:\s*(\S+)/g) ?? []).filter(
      (line) => !line.includes(CANONICAL_REGISTRY_HOST),
    );

    expect([...weakIntegrity, ...offRegistryTarballs], REGENERATION_HINT).toEqual([]);
  });
});
