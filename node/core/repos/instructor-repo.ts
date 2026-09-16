import type { Instructor, NewInstructor } from '../entities/instructor.js';

export interface IInstructorRepo {
  list(): Promise<readonly Instructor[]>;
  getById(id: number): Promise<Instructor | null>;
  create(input: NewInstructor): Promise<Instructor>;
}
