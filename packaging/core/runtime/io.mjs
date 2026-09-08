import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync, lstatSync, mkdirSync, readFileSync, renameSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';

export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

export function safePath(root, path) {
  if (typeof path !== 'string' || !path || /(^[/\\]|^[a-z]:|(^|[/\\])\.\.([/\\]|$))/i.test(path)) {
    throw new Error(`Invalid relative content path: ${path}`);
  }
  const destination = resolve(root, path);
  const rel = relative(resolve(root), destination);
  if (isAbsolute(rel) || rel.startsWith('..')) throw new Error(`Content path escapes its root: ${path}`);
  return destination;
}

export function assertPlainPath(root, path) {
  const destination = safePath(root, path);
  const segments = relative(resolve(root), destination).split(/[/\\]/);
  let current = resolve(root);
  for (const segment of segments) {
    current = join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) {
      throw new Error(`Managed path must not be a symlink: ${path}`);
    }
  }
  return destination;
}

export function inputHash(path) {
  const bytes = readFileSync(path);
  const content = /\.(json|ya?ml|csproj|props|targets|sln|txt)$/.test(path)
    ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes;
  return sha256(content);
}

export function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read JSON content at ${path}: ${error.code || 'invalid JSON'}`, { cause: error });
  }
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  renameSync(temporary, path);
}
