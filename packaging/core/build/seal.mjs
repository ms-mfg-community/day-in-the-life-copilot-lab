import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileHash, inputHash, readJson, sha256, writeJson } from '../runtime/io.mjs';
import { loadRelease, sealRelease, verifyRuntime } from '../runtime/release.mjs';

const [source, runtime] = process.argv.slice(2);
const ignored = new Set(['node_modules', 'bin', 'obj', '.git', '.lab-build']);

function walk(directory, exclude = ignored) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (exclude.has(entry.name)) return [];
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path, exclude) : entry.isFile() ? [path] : [];
  });
}

function dependencyInputs() {
  const explicit = [
    'package.json', 'package-lock.json', 'node/package.json', 'node/pnpm-lock.yaml', 'node/.npmrc',
    'docs/_meta/registry.yaml', 'packaging/core/tools/package.json', 'packaging/core/tools/package-lock.json',
    'packaging/core/python/requirements.in', 'packaging/core/python/requirements.lock',
    'packaging/core/NuGet.Config',
  ];
  const dotnet = walk(join(source, 'dotnet')).filter((file) => /(\.csproj|packages\.lock\.json|global\.json|\.props|\.targets|\.sln)$/.test(file));
  const files = [...explicit, ...dotnet.map((file) => relative(source, file))].sort();
  return Object.fromEntries(files.map((path) => [path, inputHash(join(source, path))]));
}

function bundles() {
  return [
    { name: 'root', target: 'node_modules' },
    { name: 'node', target: 'node/node_modules' },
    { name: 'nuget', target: '.lab-state/nuget' },
  ].map((bundle) => {
    const archive = `bundles/${bundle.name}.tar.gz`;
    const catalog = `inventories/${bundle.name}.json`;
    return { ...bundle, archive, sha256: fileHash(join(runtime, archive)),
      catalog, catalogSha256: fileHash(join(runtime, catalog)) };
  });
}

function scriptLineEndings() {
  return Object.fromEntries(walk(source).flatMap((path) => {
    const bytes = readFileSync(path);
    const executable = path.endsWith('.sh') || bytes.subarray(0, 2).toString() === '#!';
    if (!executable || !bytes.includes(Buffer.from('\r\n')) || bytes.includes(0)) return [];
    return [[relative(source, path), {
      original: sha256(bytes), linux: sha256(bytes.toString('utf8').replace(/\r\n/g, '\n')),
    }]];
  }));
}

function requiredPaths() {
  const browsers = walk(join(runtime, 'browsers'), new Set())
    .filter((path) => /\/(chrome|headless_shell|chrome-headless-shell)$/.test(path))
    .map((path) => relative(runtime, path));
  if (browsers.length < 4) throw new Error('Both Node and .NET matching Chromium/headless revisions must be present');
  const feed = readdirSync(join(runtime, 'nuget-feed')).filter((file) => file.endsWith('.nupkg'));
  if (!feed.length) throw new Error('The sealed NuGet feed is empty');
  return [
    'bin/copilot', 'tools/node_modules/.bin/copilot', 'tools/node_modules/.bin/pnpm',
    'tools/node_modules/.bin/typescript-language-server',
    'tools/node_modules/.bin/mcp-server-memory', 'tools/node_modules/.bin/mcp-server-filesystem',
    'tools/node_modules/.bin/mcp-server-sequential-thinking',
    'dotnet-tools/csharp-ls', 'dotnet-tools/dotnet-ef', 'python/bin/python',
    'gh/bin/gh', 'gh-aw/gh-aw', 'NuGet.Config', 'source.tar', 'fixtures/lab12/sales.parquet',
    ...browsers, ...feed.map((file) => `nuget-feed/${file}`),
  ];
}

function inventory() {
  const run = (file, args, cwd = source) => execFileSync(file, args, {
    cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, PIP_DISABLE_PIP_VERSION_CHECK: '1' },
  });
  writeJson(join(runtime, 'root-sbom.cdx.json'), JSON.parse(run('npm', ['sbom', '--sbom-format=cyclonedx'])));
  writeJson(join(runtime, 'tools-sbom.cdx.json'), JSON.parse(run('npm', ['sbom', '--sbom-format=cyclonedx'], join(runtime, 'tools'))));
  return {
    buildInputs: readJson(join(runtime, 'inputs.json')),
    source: readJson(join(runtime, 'source.json')),
    node: process.versions.node, nodeAbi: process.versions.modules,
    dotnetSdks: run('dotnet', ['--list-sdks']).trim().split('\n'),
    dotnetRuntimes: run('dotnet', ['--list-runtimes']).trim().split('\n'),
    dotnetTools: run('dotnet', ['tool', 'list', '--tool-path', join(runtime, 'dotnet-tools')]),
    python: JSON.parse(run(join(runtime, 'python/bin/pip'), ['list', '--format=json'])),
    osPackages: run('dpkg-query', ['-W', '-f=${Package}\\t${Version}\\t${Architecture}\\n']).trim().split('\n'),
    nodeDependencies: JSON.parse(run('pnpm', ['-C', 'node', 'list', '--depth', 'Infinity', '--json'])),
    playwright: { node: readJson(join(runtime, 'node-browsers.json')), dotnet: readJson(join(runtime, 'dotnet-browsers.json')) },
    notices: ['source.tar:LICENSE', 'gh/', 'notices/gh-aw-LICENSE', '/usr/share/doc/*/copyright',
      'tools/node_modules/', 'bundles/', 'wheels/'],
  };
}

try {
  if (!source || !runtime || process.platform !== 'linux' || process.arch !== 'x64') throw new Error('Sealing requires Linux x64 build inputs');
  const sourceRecord = readJson(join(runtime, 'source.json'));
  if (sha256(readFileSync(join(runtime, 'source.tar'))) !== sourceRecord.archiveSha256) throw new Error('Source archive checksum mismatch');
  writeJson(join(runtime, 'inventory.json'), inventory());
  const release = sealRelease({
    schemaVersion: 1, source: sourceRecord,
    platform: { os: process.platform, arch: process.arch, nodeMajor: Number(process.versions.node.split('.')[0]), nodeAbi: process.versions.modules },
    inputs: dependencyInputs(), scriptLineEndings: scriptLineEndings(), bundles: bundles(), requiredPaths: requiredPaths(),
    capabilities: {
      included: ['real-copilot-cli-binary', 'dotnet-source-build-test', 'node-source-build-test', 'root-vitest',
        'matching-chromium-e2e', 'local-memory-filesystem-sequential-thinking', 'csharp-typescript-lsp',
        'python-parquet-fixture', 'bash-hooks', 'tmux', 'local-gh-aw-binary'],
      excluded: ['browser-delivery', 'copilot-authorization', 'github-hosted-workflows', 'connected-documentation',
        'tenant-services', 'enterprise-administration', 'acp-transport', 'curriculum-fallback-asset-completeness'],
    },
  });
  writeJson(join(runtime, 'release.json'), release);
  verifyRuntime(runtime, loadRelease(runtime));
  const sizes = Object.fromEntries(release.bundles.map((bundle) => [bundle.name, statSync(join(runtime, bundle.archive)).size]));
  process.stdout.write(`${JSON.stringify({ event: 'core.sealed', releaseId: release.releaseId, bundleBytes: sizes })}\n`);
} catch (error) {
  process.stderr.write(`${JSON.stringify({ event: 'core.seal.failed', error: error.message })}\n`);
  process.exitCode = 1;
}
