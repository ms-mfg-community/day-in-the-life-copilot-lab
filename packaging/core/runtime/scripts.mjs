import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { assertPlainPath, sha256 } from './io.mjs';

export function planScriptCompatibility(workspace, release, mayNormalize) {
  return Object.entries(release.scriptLineEndings ?? {}).flatMap(([relative, expected]) => {
    const path = assertPlainPath(workspace, relative);
    if (!existsSync(path)) return [];
    const original = readFileSync(path);
    if (!original.includes(Buffer.from('\r\n'))) return [];
    if (!mayNormalize || sha256(original) !== expected.original) {
      throw new Error(`Unix executable needs LF line endings: ${relative}; refusing to rewrite modified or resumed attendee source`);
    }
    const linux = Buffer.from(original.toString('utf8').replace(/\r\n/g, '\n'));
    if (sha256(linux) !== expected.linux) throw new Error(`Executable compatibility checksum mismatch: ${relative}`);
    return [{ path, original: expected.original, linux }];
  });
}

export function normalizePristineScripts(repairs) {
  for (const repair of repairs) {
    if (sha256(readFileSync(repair.path)) !== repair.original) {
      throw new Error('Executable source changed during initialization; refusing to overwrite attendee work');
    }
    const temporary = `${repair.path}.lab-lf-${randomUUID()}`;
    try {
      writeFileSync(temporary, repair.linux, { mode: statSync(repair.path).mode & 0o777, flag: 'wx' });
      renameSync(temporary, repair.path);
    } finally {
      if (existsSync(temporary)) unlinkSync(temporary);
    }
  }
}
