import { eq } from 'drizzle-orm';
import type { DbHandle } from '../db.js';
import { courses } from '../schema.js';
import type { ICourseRepo } from '../../core/repos/course-repo.js';
import type { Course, NewCourse } from '../../core/entities/course.js';

function toEntity(row: typeof courses.$inferSelect): Course {
  return {
    id: row.id,
    title: row.title,
    credits: row.credits,
    departmentId: row.departmentId,
  };
}

export function createCourseRepo(handle: DbHandle): ICourseRepo {
  const { db } = handle;
  return {
    async list() {
      return (await db.select().from(courses).all()).map(toEntity);
    },
    async getById(id) {
      const rows = await db.select().from(courses).where(eq(courses.id, id)).all();
      return rows.length > 0 ? toEntity(rows[0]!) : null;
    },
    async create(input: NewCourse) {
      const inserted = await db
        .insert(courses)
        .values({
          title: input.title,
          credits: input.credits,
          departmentId: input.departmentId ?? null,
        })
        .returning()
        .all();
      return toEntity(inserted[0]!);
    },
  };
}
