import { describe, it, expect, beforeEach } from 'vitest';
import { createStudentRepo, type StudentRepo } from '../../infra/repos/student-repo.js';
import { createInMemoryDb } from '../../infra/db.js';

describe('StudentRepo (Drizzle, in-memory SQLite)', () => {
  let repo: StudentRepo;

  beforeEach(async () => {
    const db = await createInMemoryDb();
    repo = createStudentRepo(db);
  });

  it('creates and retrieves a student', async () => {
    const created = await repo.create({
      firstMidName: 'Ada',
      lastName: 'Lovelace',
      enrollmentDate: new Date('2024-09-01'),
    });
    expect(created.id).toBeGreaterThan(0);

    const got = await repo.getById(created.id);
    expect(got).not.toBeNull();
    expect(got!.firstMidName).toBe('Ada');
    expect(got!.lastName).toBe('Lovelace');
  });

  it('lists all students', async () => {
    await repo.create({ firstMidName: 'A', lastName: 'One', enrollmentDate: new Date() });
    await repo.create({ firstMidName: 'B', lastName: 'Two', enrollmentDate: new Date() });
    const all = await repo.list();
    expect(all.length).toBe(2);
  });

  it('updates a student immutably', async () => {
    const created = await repo.create({
      firstMidName: 'Grace',
      lastName: 'Hopper',
      enrollmentDate: new Date('2024-09-01'),
    });
    const updated = await repo.update(created.id, { lastName: 'Hopper-Murray' });
    expect(updated.lastName).toBe('Hopper-Murray');
    expect(updated.firstMidName).toBe('Grace');
  });

  it('deletes a student', async () => {
    const created = await repo.create({
      firstMidName: 'Alan',
      lastName: 'Turing',
      enrollmentDate: new Date(),
    });
    await repo.delete(created.id);
    const got = await repo.getById(created.id);
    expect(got).toBeNull();
  });

  it('returns null for missing student', async () => {
    expect(await repo.getById(9999)).toBeNull();
  });
});
