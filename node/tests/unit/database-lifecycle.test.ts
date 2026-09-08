import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApplicationDb } from '../../infra/application-db.js';
import { createStudentRepo } from '../../infra/repos/student-repo.js';
import type { DbHandle } from '../../infra/db.js';

const directories: string[] = [];
const handles: DbHandle[] = [];
function databasePath() {
  const path = mkdtempSync(join(tmpdir(), 'contoso-lifecycle-'));
  directories.push(path);
  return join(path, 'attendee.db');
}
async function open(path?: string) {
  const handle = await openApplicationDb(path);
  handles.push(handle);
  return handle;
}
afterEach(() => {
  for (const handle of handles.splice(0)) if (handle.raw.open) handle.raw.close();
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});

describe('application database lifecycle', () => {
  it('keeps the existing in-memory default isolated', async () => {
    const first = await open();
    await createStudentRepo(first).create({
      firstMidName: 'Attendee', lastName: 'Local', enrollmentDate: new Date('2026-09-08'),
    });
    const second = await open();
    expect((await createStudentRepo(second).list()).some((student) => student.lastName === 'Local')).toBe(false);
  });

  it('seeds a persistent database only once and preserves edits on resume', async () => {
    const path = databasePath();
    const first = await open(path);
    const students = createStudentRepo(first);
    const original = await students.list();
    await students.update(original[0].id, { lastName: 'AttendeeEdit' });
    first.raw.close();
    const resumed = createStudentRepo(await open(path));
    expect(await resumed.list()).toHaveLength(original.length);
    expect((await resumed.getById(original[0].id))?.lastName).toBe('AttendeeEdit');
  });

  it('does not reseed when the attendee deliberately deletes all rows', async () => {
    const path = databasePath();
    const first = await open(path);
    first.raw.exec('DELETE FROM enrollments; DELETE FROM students; DELETE FROM courses; DELETE FROM instructors;');
    first.raw.close();
    expect(await createStudentRepo(await open(path)).list()).toEqual([]);
  });

  it('retains data when its checkout and database path are renamed', async () => {
    const path = databasePath();
    const first = await open(path);
    const created = await createStudentRepo(first).create({
      firstMidName: 'Portable', lastName: 'Work', enrollmentDate: new Date('2026-09-08'),
    });
    first.raw.close();
    const moved = `${path}.renamed`;
    renameSync(path, moved);
    expect((await createStudentRepo(await open(moved)).getById(created.id))?.lastName).toBe('Work');
  });

  it('rejects an empty configured path instead of silently using memory', async () => {
    await expect(open('')).rejects.toThrow();
  });

  it('surfaces an inaccessible configured path instead of losing data in a fallback database', async () => {
    await expect(open(join(databasePath(), 'missing', 'database.db'))).rejects.toThrow();
  });
});
