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
// A v1 lockfile keeps its tree under `dependencies`, so a reader that only walks
// `packages` would inspect nothing and report green over a fully downgraded file.
const SUPPORTED_LOCKFILE_VERSION = 3;
// Both lockfiles carry well over a hundred downloaded entries, so this floor
// trips only when the map is emptied, renamed or truncated, never on churn.
const MINIMUM_DOWNLOADED_ENTRIES = 50;
const REGENERATION_HINT =
  'regenerate with `npm install --registry https://registry.npmjs.org/` on a host that can reach npmjs';

interface LockfileEntry {
  readonly resolved?: string;
  readonly integrity?: string;
}

// Every downloaded entry stays in scope even when a field is absent: a `resolved`
// tarball with no `integrity` is the weakest state of all, so it has to surface as
// a violation rather than be filtered out of the sample.
function readNpmLockfile(relativePath: string): ReadonlyArray<readonly [string, LockfileEntry]> {
  const raw = readFileSync(join(REPOSITORY_ROOT, relativePath), 'utf8');
  const parsed = JSON.parse(raw) as { lockfileVersion?: number; packages?: Record<string, LockfileEntry> };
  if (parsed.lockfileVersion !== SUPPORTED_LOCKFILE_VERSION) {
    throw new Error(
      `${relativePath} is lockfileVersion ${parsed.lockfileVersion}, not ${SUPPORTED_LOCKFILE_VERSION}; ${REGENERATION_HINT}`,
    );
  }
  const downloaded = Object.entries(parsed.packages ?? {}).filter(
    ([, entry]) => Boolean(entry.resolved) || Boolean(entry.integrity),
  );
  if (downloaded.length < MINIMUM_DOWNLOADED_ENTRIES) {
    throw new Error(
      `${relativePath} exposed only ${downloaded.length} downloaded entries, so these guards would pass vacuously`,
    );
  }
  return downloaded;
}

function resolvedHost(resolved: string | undefined): string {
  if (!resolved) return '<no resolved URL>';
  try {
    return new URL(resolved).host;
  } catch {
    return `<unparseable ${resolved}>`;
  }
}

function describeViolations(
  relativePath: string,
  entries: ReadonlyArray<readonly [string, LockfileEntry]>,
): readonly string[] {
  return entries.map(
    ([name, entry]) =>
      `${relativePath} :: ${name || '<root>'} -> ${entry.resolved ?? '<no resolved URL>'} (${entry.integrity ?? '<no integrity>'})`,
  );
}

describe('lockfile provenance', () => {
  // Named explicitly so the invariant is reviewable on its own; `readNpmLockfile`
  // repeats it as a backstop, keeping the guards below from passing over nothing.
  it.each(NPM_LOCKFILES)('%s exposes the package map these guards inspect', (relativePath) => {
    expect(readNpmLockfile(relativePath).length).toBeGreaterThanOrEqual(MINIMUM_DOWNLOADED_ENTRIES);
  });

  it.each(NPM_LOCKFILES)('%s resolves every package from the canonical npm registry', (relativePath) => {
    const offRegistry = readNpmLockfile(relativePath).filter(
      ([, entry]) => resolvedHost(entry.resolved) !== CANONICAL_REGISTRY_HOST,
    );

    expect(
      describeViolations(relativePath, offRegistry),
      `${offRegistry.length} entries resolve off ${CANONICAL_REGISTRY_HOST}; ${REGENERATION_HINT}`,
    ).toEqual([]);
  });

  it.each(NPM_LOCKFILES)('%s records SHA-512 integrity rather than a downgraded or absent hash', (relativePath) => {
    const weakIntegrity = readNpmLockfile(relativePath).filter(
      ([, entry]) => !entry.integrity?.startsWith(STRONG_INTEGRITY_PREFIX),
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
