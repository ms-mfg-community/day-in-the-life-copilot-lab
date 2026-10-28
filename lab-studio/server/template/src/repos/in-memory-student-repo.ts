import type { NewStudent, Student } from "../entities/student.js";
import type { StudentRepo } from "./student-repo.js";

/** In-memory repository. Returns copies so callers never share state. */
export function createInMemoryStudentRepo(
  seed: readonly Student[] = [],
): StudentRepo {
  let students: readonly Student[] = [...seed];
  let nextId = students.reduce((max, s) => Math.max(max, s.id), 0) + 1;

  return {
    async list() {
      return students.map((s) => ({ ...s }));
    },
    async getById(id) {
      const found = students.find((s) => s.id === id);
      return found ? { ...found } : null;
    },
    async create(input: NewStudent) {
      const student: Student = { id: nextId++, ...input };
      students = [...students, student];
      return { ...student };
    },
    async delete(id) {
      if (!students.some((s) => s.id === id)) {
        throw new Error(`Student ${id} not found`);
      }
      students = students.filter((s) => s.id !== id);
    },
  };
}
