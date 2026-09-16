import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const digest = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex');

export function put(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'lab-core-test-'));
  const runtime = join(root, 'runtime');
  const workspace = join(root, 'a renamed checkout');
  const inputs = ['package.json', 'package-lock.json', 'node/package.json', 'node/pnpm-lock.yaml'];
  for (const file of inputs) put(join(workspace, file), '{}\n');
  put(join(workspace, 'node/web/example.ts'), 'export const answer = 1;\n');
  put(join(runtime, 'tools/copilot'), 'real-tool-placeholder-for-hydration-test');

  const bundles = [
    { name: 'root', target: 'node_modules' },
    { name: 'node', target: 'node/node_modules' },
    { name: 'nuget', target: '.lab-state/nuget' },
  ].map(({ name, target }) => {
    const payload = join(root, `payload-${name}`);
    put(join(payload, 'content.txt'), `${name} sealed dependencies\n`);
    const archive = `bundles/${name}.tar.gz`;
    mkdirSync(dirname(join(runtime, archive)), { recursive: true });
    execFileSync('tar', ['-czf', join(runtime, archive), '-C', payload, '.']);
    const catalog = `inventories/${name}.json`;
    put(join(runtime, catalog), JSON.stringify({
      schemaVersion: 1,
      entries: [{ path: 'content.txt', kind: 'file', sha256: digest(`${name} sealed dependencies\n`), executable: false }],
    }));
    return { name, target, archive, sha256: digest(readFileSync(join(runtime, archive))),
      catalog, catalogSha256: digest(readFileSync(join(runtime, catalog))) };
  });

  const content = {
    schemaVersion: 1 as const,
    source: { commit: 'a'.repeat(40), archiveSha256: 'b'.repeat(64) },
    platform: {
      os: process.platform, arch: process.arch,
      nodeMajor: Number(process.versions.node.split('.')[0]), nodeAbi: process.versions.modules,
    },
    inputs: Object.fromEntries(inputs.map((file) => [file, digest('{}\n')])),
    bundles,
    requiredPaths: ['tools/copilot'],
    capabilities: {
      included: ['source-edit-build-test'],
      excluded: ['browser-delivery', 'connected-services', 'copilot-authorization'],
    },
  };
  const release = { ...content, releaseId: digest(JSON.stringify(content)) };
  put(join(runtime, 'release.json'), JSON.stringify(release));
  return { root, runtime, workspace, release };
}
