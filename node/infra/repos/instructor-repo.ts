import { eq } from 'drizzle-orm';
import type { DbHandle } from '../db.js';
import { instructors } from '../schema.js';
import type { IInstructorRepo } from '../../core/repos/instructor-repo.js';
import type { Instructor, NewInstructor } from '../../core/entities/instructor.js';

function toEntity(row: typeof instructors.$inferSelect): Instructor {
  return {
    id: row.id,
    firstMidName: row.firstMidName,
    lastName: row.lastName,
    hireDate: row.hireDate,
  };
}

export function createInstructorRepo(handle: DbHandle): IInstructorRepo {
  const { db } = handle;
  return {
    async list() {
      return (await db.select().from(instructors).all()).map(toEntity);
    },
    async getById(id) {
      const rows = await db.select().from(instructors).where(eq(instructors.id, id)).all();
      return rows.length > 0 ? toEntity(rows[0]!) : null;
    },
    async create(input: NewInstructor) {
      const inserted = await db
        .insert(instructors)
        .values({
          firstMidName: input.firstMidName,
          lastName: input.lastName,
          hireDate: input.hireDate,
        })
        .returning()
        .all();
      return toEntity(inserted[0]!);
    },
  };
}
