// install.mjs — lightweight `copilot plugin install --dry-run` simulator.
//
// Resolves every entrypoint declared in the plugin manifest against the
// filesystem and returns a structured report. Used by CI
// (tests/plugin-template/install-dry-run.test.ts and
// tests/plugin-template/install-runs.test.ts) and callable from local
// scripts when debugging a template before publishing.
//
// CLI usage:
//   node plugin-template/scripts/install.mjs [templateDir]
//     templateDir defaults to the directory containing this script's parent
//     (i.e. the plugin-template root). Exits 0 on ok=true, 1 on ok=false,
//     2 on unexpected errors.

import { readFileSync, existsSync } from 'node:fs';
import { join, isAbsolute, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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

function defaultTemplateDir() {
  // plugin-template/scripts/install.mjs → plugin-template/
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..');
}

async function main(argv) {
  const explicit = argv[2];
  const templateDir = explicit ? resolve(explicit) : defaultTemplateDir();

  let result;
  try {
    result = await dryRun(templateDir);
  } catch (err) {
    console.error(`install.mjs: unexpected error: ${err.message}`);
    return 2;
  }

  // Human-readable one-liner first, then a machine-parseable JSON payload.
  // README documents "expect ok=true" — emit that exact shape.
  const name = result.manifest?.name ?? '<unknown>';
  const version = result.manifest?.version ?? '<unknown>';
  console.log(`plugin-template dry-run: ${name}@${version} ok=${result.ok}`);
  for (const err of result.errors) {
    console.log(`  - ${err}`);
  }
  console.log(JSON.stringify({ ok: result.ok, errors: result.errors, resolved: result.resolved }));

  return result.ok ? 0 : 1;
}

// Run as CLI when invoked directly (node install.mjs ...), stay quiet when
// imported by another module (tests, callers).
const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? '').href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main(process.argv).then((code) => process.exit(code));
}
