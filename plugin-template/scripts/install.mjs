// install.mjs — lightweight `copilot plugin install --dry-run` simulator.
//
// Resolves every entrypoint declared in the plugin manifest against the
// filesystem and returns a structured report. Used by CI
// (tests/plugin-template/install-dry-run.test.ts) and callable from local
// scripts when debugging a template before publishing.

import { readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import yaml from 'js-yaml';

const ENTRYPOINT_KINDS = ['agents', 'skills', 'hooks', 'prompts'];

function loadManifest(templateDir) {
  const manifestPath = join(templateDir, 'manifest.yaml');
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.yaml not found at ${manifestPath}`);
  }
  return yaml.load(readFileSync(manifestPath, 'utf8'));
}

export async function dryRun(templateDir, { manifestOverride } = {}) {
  const manifest = manifestOverride ?? loadManifest(templateDir);
  const errors = [];
  const resolved = { agents: [], skills: [], hooks: [], prompts: [] };

  const entrypoints = manifest?.entrypoints ?? {};
  for (const kind of ENTRYPOINT_KINDS) {
    const declared = Array.isArray(entrypoints[kind]) ? entrypoints[kind] : [];
    for (const rel of declared) {
      const abs = isAbsolute(rel) ? rel : join(templateDir, rel);
      if (!existsSync(abs)) {
        errors.push(`missing ${kind} entrypoint: ${rel}`);
        continue;
      }
      resolved[kind].push(rel);
    }
  }

  if (!manifest?.name) errors.push('manifest.name is required');
  if (!manifest?.version) errors.push('manifest.version is required');
  if (!manifest?.minimum_cli_version) {
    errors.push('manifest.minimum_cli_version is required');
  }

  return { ok: errors.length === 0, errors, resolved, manifest };
}
