import { eq } from 'drizzle-orm';
import type { DbHandle } from '../db.js';
import { students } from '../schema.js';
import type { IStudentRepo } from '../../core/repos/student-repo.js';
import type { NewStudent, Student, StudentPatch } from '../../core/entities/student.js';

export type StudentRepo = IStudentRepo;

function toEntity(row: typeof students.$inferSelect): Student {
  return {
    id: row.id,
    firstMidName: row.firstMidName,
    lastName: row.lastName,
    enrollmentDate: row.enrollmentDate,
  };
}

export function createStudentRepo(handle: DbHandle): StudentRepo {
  const { db } = handle;

  return {
    async list() {
      const rows = await db.select().from(students).all();
      return rows.map(toEntity);
    },
    async getById(id) {
      const rows = await db.select().from(students).where(eq(students.id, id)).all();
      return rows.length > 0 ? toEntity(rows[0]!) : null;
    },
    async create(input: NewStudent) {
      const inserted = await db
        .insert(students)
        .values({
          firstMidName: input.firstMidName,
          lastName: input.lastName,
          enrollmentDate: input.enrollmentDate,
        })
        .returning()
        .all();
      return toEntity(inserted[0]!);
    },
    async update(id, patch: StudentPatch) {
      const existing = await db.select().from(students).where(eq(students.id, id)).all();
      if (existing.length === 0) {
        throw new Error(`Student ${id} not found`);
      }
      const current = existing[0]!;
      const next = {
        firstMidName: patch.firstMidName ?? current.firstMidName,
        lastName: patch.lastName ?? current.lastName,
        enrollmentDate: patch.enrollmentDate ?? current.enrollmentDate,
      };
      const updated = await db
        .update(students)
        .set(next)
        .where(eq(students.id, id))
        .returning()
        .all();
      return toEntity(updated[0]!);
    },
    async delete(id) {
      await db.delete(students).where(eq(students.id, id)).run();
    },
  };
}
