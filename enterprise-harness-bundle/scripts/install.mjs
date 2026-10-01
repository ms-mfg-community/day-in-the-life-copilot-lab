// Lightweight plugin-install dry-run simulator.
//
// Resolves every entrypoint declared in the manifest against the filesystem.
// Callable from CI or locally before publishing the bundle.
//
// CLI usage:
//   node enterprise-harness-bundle/scripts/install.mjs [bundleDir]
//     bundleDir defaults to the directory containing this script's parent.
//     Exits 0 on ok=true, 1 on ok=false, 2 on unexpected errors.

import { readFileSync, existsSync } from "node:fs";
import { join, isAbsolute, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import yaml from "js-yaml";

const ENTRYPOINT_KINDS = ["agents", "skills", "hooks", "prompts"];

function loadManifest(bundleDir) {
  const manifestPath = join(bundleDir, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.yaml not found at ${manifestPath}`);
  }
  return yaml.load(readFileSync(manifestPath, "utf8"));
}

export async function dryRun(bundleDir, { manifestOverride } = {}) {
  const manifest = manifestOverride ?? loadManifest(bundleDir);
  const errors = [];
  const resolved = { agents: [], skills: [], hooks: [], prompts: [] };

  const entrypoints = manifest?.entrypoints ?? {};
  for (const kind of ENTRYPOINT_KINDS) {
    const declared = Array.isArray(entrypoints[kind]) ? entrypoints[kind] : [];
    for (const rel of declared) {
      const abs = isAbsolute(rel) ? rel : join(bundleDir, rel);
      if (!existsSync(abs)) {
        errors.push(`missing ${kind} entrypoint: ${rel}`);
        continue;
      }
      resolved[kind].push(rel);
    }
  }

  if (!manifest?.name) errors.push("manifest.name is required");
  if (!manifest?.version) errors.push("manifest.version is required");
  if (!manifest?.minimum_cli_version) {
    errors.push("manifest.minimum_cli_version is required");
  }

  return { ok: errors.length === 0, errors, resolved, manifest };
}

function defaultBundleDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..");
}

async function main(argv) {
  const explicit = argv[2];
  const bundleDir = explicit ? resolve(explicit) : defaultBundleDir();

  let result;
  try {
    result = await dryRun(bundleDir);
  } catch (err) {
    console.error(`install.mjs: unexpected error: ${err.message}`);
    return 2;
  }

  const name = result.manifest?.name ?? "<unknown>";
  const version = result.manifest?.version ?? "<unknown>";
  console.log(
    `enterprise-harness-bundle dry-run: ${name}@${version} ok=${result.ok}`,
  );
  for (const error of result.errors) {
    console.log(`  - ${error}`);
  }
  console.log(
    JSON.stringify({
      ok: result.ok,
      errors: result.errors,
      resolved: result.resolved,
    }),
  );

  return result.ok ? 0 : 1;
}

const invokedDirectly = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  main(process.argv).then((code) => process.exit(code));
}
