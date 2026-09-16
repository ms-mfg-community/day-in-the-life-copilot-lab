import type { NewStudent, Student, StudentPatch } from '../entities/student.js';

export interface IStudentRepo {
  list(): Promise<readonly Student[]>;
  getById(id: number): Promise<Student | null>;
  create(input: NewStudent): Promise<Student>;
  update(id: number, patch: StudentPatch): Promise<Student>;
  delete(id: number): Promise<void>;
}
