import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApplicationDb } from '../../infra/application-db.js';
import { createStudentRepo } from '../../infra/repos/student-repo.js';
import type { DbHandle } from '../../infra/db.js';
import { createFileDb } from '../../infra/db.js';
import { createCourseRepo } from '../../infra/repos/course-repo.js';

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
    const student = original[0];
    if (!student) throw new Error('The initial sample student was not created');
    await students.update(student.id, { lastName: 'AttendeeEdit' });
    first.raw.close();
    const resumed = createStudentRepo(await open(path));
    expect(await resumed.list()).toHaveLength(original.length);
    expect((await resumed.getById(student.id))?.lastName).toBe('AttendeeEdit');
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

  it('keeps preexisting attendee rows without adding the sample dataset', async () => {
    const path = databasePath();
    const existing = await createFileDb(path);
    await createCourseRepo(existing).create({ title: 'Attendee Course', credits: 3 });
    existing.raw.close();
    const resumed = await open(path);
    expect(await createStudentRepo(resumed).list()).toEqual([]);
    expect(await createCourseRepo(resumed).list()).toHaveLength(1);
  });

  it('rolls back failed initialization and permits a later complete initialization', async () => {
    const path = databasePath();
    const existing = await createFileDb(path);
    existing.raw.exec("CREATE TRIGGER reject_seed BEFORE INSERT ON students BEGIN SELECT RAISE(ABORT, 'seed failure'); END;");
    existing.raw.close();
    await expect(open(path)).rejects.toThrow(/initialization failed/);
    const repaired = await createFileDb(path);
    expect(await createStudentRepo(repaired).list()).toEqual([]);
    repaired.raw.exec('DROP TRIGGER reject_seed');
    repaired.raw.close();
    expect(await createStudentRepo(await open(path)).list()).toHaveLength(8);
  });
});
