import type { StudentRepo } from "../repos/student-repo.js";
import { displayName } from "../entities/student.js";

export interface HttpResponse {
  status: number;
  body: unknown;
}

/** GET /api/students — list students, optionally filtered by name. */
export async function listStudents(
  repo: StudentRepo,
  query: { search?: string },
): Promise<HttpResponse> {
  const students = await repo.list();
  const filtered = query.search
    ? students.filter((s) =>
        displayName(s).toLowerCase().includes(query.search!.toLowerCase()),
      )
    : students;
  return {
    status: 200,
    body: {
      success: true,
      data: filtered.map((s) => ({ ...s, displayName: displayName(s) })),
    },
  };
}

/** GET /api/students/:id */
export async function getStudent(
  repo: StudentRepo,
  id: number,
): Promise<HttpResponse> {
  if (!Number.isInteger(id) || id <= 0) {
    return {
      status: 400,
      body: { success: false, error: "id must be a positive integer" },
    };
  }
  const student = await repo.getById(id);
  if (!student) {
    return {
      status: 404,
      body: { success: false, error: `Student ${id} not found` },
    };
  }
  return { status: 200, body: { success: true, data: student } };
}
