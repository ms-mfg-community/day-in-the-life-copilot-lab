import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { readJson, sha256, writeJson } from '../runtime/io.mjs';

function expectedTools(registry) {
  const selected = registry.prepared_core.local_mcp.map((name) => {
    const server = registry.mcp_servers.find((candidate) => candidate.name === name);
    if (!server?.npm_package || !/^\d+\.\d+\.\d+$/.test(server.pin)) throw new Error(`Unpinned local MCP: ${name}`);
    return [server.npm_package, server.pin];
  });
  return {
    ...registry.prepared_core.npm_tools,
    '@github/copilot': registry.copilot_cli_version_floor,
    ...Object.fromEntries(selected),
  };
}

export function resolveInputs(source) {
  const registry = yaml.load(readFileSync(join(source, 'docs/_meta/registry.yaml'), 'utf8'));
  const core = registry.prepared_core;
  if (core?.platform !== 'linux/amd64' || !/^\d{8}T\d{6}Z$/.test(core.debian_snapshot)) {
    throw new Error('Invalid prepared core platform or Debian snapshot');
  }
  for (const image of Object.values(core.images)) {
    if (!/^[a-z0-9./:-]+@sha256:[a-f0-9]{64}$/.test(image)) throw new Error('Every base image must have a real immutable digest');
  }
  const tools = expectedTools(registry);
  const manifest = readJson(join(source, 'packaging/core/tools/package.json'));
  const lock = readJson(join(source, 'packaging/core/tools/package-lock.json'));
  for (const [name, version] of Object.entries(tools)) {
    if (manifest.dependencies[name] !== version || lock.packages[`node_modules/${name}`]?.version !== version) {
      throw new Error(`Tool manifest/lock drift from registry: ${name}`);
    }
  }
  if (Object.keys(manifest.dependencies).length !== Object.keys(tools).length) throw new Error('Unregistered tool dependency');
  return { ...core, tools, gh_aw_version: registry.gh_aw_schema_version };
}

export function archiveSource(repository, revision, destination) {
  if (existsSync(destination)) throw new Error('Build context already exists; refusing to overwrite it');
  const commit = execFileSync('git', ['-C', repository, 'rev-parse', '--verify', `${revision}^{commit}`], { encoding: 'utf8' }).trim();
  mkdirSync(join(destination, '.lab-build'), { recursive: true });
  const archive = join(destination, '.lab-build/source.tar');
  execFileSync('git', ['-C', repository, 'archive', '--format=tar', `--output=${archive}`, commit]);
  execFileSync('tar', ['-xf', archive, '-C', destination]);
  const record = { commit, archiveSha256: sha256(readFileSync(archive)) };
  writeJson(join(destination, '.lab-build/source.json'), record);
  return record;
}
