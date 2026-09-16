import Ajv from 'ajv';
import { accessSync, constants, existsSync, lstatSync, readdirSync, readlinkSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileHash, readJson, safePath } from './io.mjs';

const validate = new Ajv().compile({
  type: 'object', additionalProperties: false, required: ['schemaVersion', 'entries'],
  properties: {
    schemaVersion: { const: 1 },
    entries: {
      type: 'array', items: {
        type: 'object', additionalProperties: false, required: ['path', 'kind'],
        properties: {
          path: { type: 'string', minLength: 1 },
          kind: { enum: ['file', 'directory', 'symlink'] },
          sha256: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          target: { type: 'string' }, executable: { type: 'boolean' },
        },
        allOf: [
          { if: { properties: { kind: { const: 'file' } } }, then: { required: ['sha256', 'executable'] } },
          { if: { properties: { kind: { const: 'symlink' } } }, then: { required: ['target'] } },
        ],
      },
    },
  },
});

function entries(root, directory) {
  return readdirSync(directory).sort().flatMap((name) => {
    const file = join(directory, name);
    const path = relative(root, file).split('\\').join('/');
    const stat = lstatSync(file);
    if (stat.isSymbolicLink()) return [{ path, kind: 'symlink', target: readlinkSync(file) }];
    if (stat.isDirectory()) return [{ path, kind: 'directory' }, ...entries(root, file)];
    if (!stat.isFile()) throw new Error(`Unsupported dependency content type: ${path}`);
    return [{ path, kind: 'file', sha256: fileHash(file), executable: Boolean(stat.mode & 0o111) }];
  });
}

export function catalogDirectory(root) {
  return { schemaVersion: 1, entries: entries(root, root) };
}

function verifyExecutionAccess(file, path) {
  try {
    accessSync(file, constants.X_OK);
  } catch (error) {
    throw new Error(`Prepared dependency is not executable by the current user: ${path} (${error.code}); permissions were not changed`, { cause: error });
  }
}

export function verifyCatalog(root, catalog) {
  if (!validate(catalog)) throw new Error('Invalid sealed dependency catalog');
  for (const entry of catalog.entries) {
    const file = safePath(root, entry.path);
    if (!existsSync(file)) throw new Error(`Missing prepared dependency content: ${entry.path}; no reinstall was attempted`);
    const stat = lstatSync(file);
    const validType = entry.kind === 'directory' ? stat.isDirectory()
      : entry.kind === 'symlink' ? stat.isSymbolicLink() : stat.isFile();
    if (!validType) throw new Error(`Changed prepared dependency type: ${entry.path}`);
    if (entry.kind === 'symlink' && readlinkSync(file) !== entry.target) {
      throw new Error(`Changed prepared dependency link: ${entry.path}`);
    }
    if (entry.kind === 'file' && fileHash(file) !== entry.sha256) {
      throw new Error(`Changed prepared dependency content: ${entry.path}; attendee bytes were preserved`);
    }
    if (entry.kind === 'file' && entry.executable) verifyExecutionAccess(file, entry.path);
  }
}

export function verifyHydratedDependencies(workspace, runtime, release) {
  for (const bundle of release.bundles) {
    verifyCatalog(safePath(workspace, bundle.target), readJson(safePath(runtime, bundle.catalog)));
  }
}
