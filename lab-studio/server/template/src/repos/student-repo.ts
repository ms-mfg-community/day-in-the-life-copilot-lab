import type { NewStudent, Student } from "../entities/student.js";

export interface StudentRepo {
  list(): Promise<readonly Student[]>;
  getById(id: number): Promise<Student | null>;
  create(input: NewStudent): Promise<Student>;
  delete(id: number): Promise<void>;
}
