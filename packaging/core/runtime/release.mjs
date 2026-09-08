import Ajv from 'ajv';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inputHash, readJson, safePath, sha256 } from './io.mjs';

const hash = { type: 'string', pattern: '^[a-f0-9]{64}$' };
const strings = { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string', minLength: 1 } };
const schema = {
  type: 'object', additionalProperties: false,
  required: ['schemaVersion', 'releaseId', 'source', 'platform', 'inputs', 'bundles', 'requiredPaths', 'capabilities'],
  properties: {
    schemaVersion: { const: 1 }, releaseId: hash,
    source: {
      type: 'object', additionalProperties: false, required: ['commit', 'archiveSha256'],
      properties: { commit: { type: 'string', pattern: '^[a-f0-9]{40}$' }, archiveSha256: hash },
    },
    platform: {
      type: 'object', additionalProperties: false, required: ['os', 'arch', 'nodeMajor', 'nodeAbi'],
      properties: {
        os: { type: 'string' }, arch: { type: 'string' },
        nodeMajor: { type: 'integer', minimum: 20 }, nodeAbi: { type: 'string', pattern: '^\\d+$' },
      },
    },
    inputs: { type: 'object', minProperties: 1, additionalProperties: hash },
    bundles: {
      type: 'array', minItems: 3, items: {
        type: 'object', additionalProperties: false, required: ['name', 'target', 'archive', 'sha256'],
        properties: {
          name: { enum: ['root', 'node', 'nuget', 'materials'] },
          target: { enum: ['node_modules', 'node/node_modules', '.lab-state/nuget', 'workshop/dist'] },
          archive: { type: 'string' }, sha256: hash,
        },
      },
    },
    requiredPaths: strings,
    capabilities: {
      type: 'object', additionalProperties: false, required: ['included', 'excluded'],
      properties: { included: strings, excluded: strings },
    },
  },
};
const validate = new Ajv({ allErrors: true }).compile(schema);
const targets = { root: 'node_modules', node: 'node/node_modules', nuget: '.lab-state/nuget', materials: 'workshop/dist' };

export function sealRelease(content) {
  return { ...content, releaseId: sha256(JSON.stringify(content)) };
}

export function loadRelease(runtime) {
  const release = readJson(join(runtime, 'release.json'));
  if (!validate(release)) throw new Error(`Invalid release schema: ${JSON.stringify(validate.errors)}`);
  const { releaseId, ...content } = release;
  if (sealRelease(content).releaseId !== releaseId) throw new Error('Release identity checksum mismatch');
  const names = release.bundles.map((bundle) => bundle.name);
  if (new Set(names).size !== names.length || ['root', 'node', 'nuget'].some((name) => !names.includes(name))) {
    throw new Error('Release must contain unique root, Node, and NuGet bundles');
  }
  for (const bundle of release.bundles) {
    if (targets[bundle.name] !== bundle.target) throw new Error('Invalid release bundle target');
    safePath(runtime, bundle.archive);
  }
  for (const path of [...Object.keys(release.inputs), ...release.requiredPaths]) safePath(runtime, path);
  return release;
}

export function assertCompatible(release, actual = {
  os: process.platform, arch: process.arch,
  nodeMajor: Number(process.versions.node.split('.')[0]), nodeAbi: process.versions.modules,
}) {
  for (const key of ['os', 'arch', 'nodeMajor', 'nodeAbi']) {
    if (release.platform[key] !== actual[key]) {
      throw new Error(`Runtime platform/ABI mismatch (${key}); use the matching prepared image, not host dependencies`);
    }
  }
}

export function verifyInputs(workspace, release) {
  for (const [path, expected] of Object.entries(release.inputs)) {
    const file = safePath(workspace, path);
    if (!existsSync(file) || inputHash(file) !== expected) {
      throw new Error(`Dependency input drift: ${path}. Prepare a new release; attendee content was not changed.`);
    }
  }
}

export function verifyRuntime(runtime, release) {
  for (const bundle of release.bundles) {
    const path = safePath(runtime, bundle.archive);
    if (!existsSync(path)) throw new Error(`Missing bundled content: ${bundle.name}. No package-download fallback.`);
    if (sha256(readFileSync(path)) !== bundle.sha256) throw new Error(`Bundle checksum mismatch: ${bundle.name}`);
  }
  for (const path of release.requiredPaths) {
    if (!existsSync(safePath(runtime, path))) throw new Error(`Missing prepared runtime content: ${path}`);
  }
}
