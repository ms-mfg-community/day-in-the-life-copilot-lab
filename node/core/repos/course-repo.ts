import type { Course, NewCourse } from '../entities/course.js';

export interface ICourseRepo {
  list(): Promise<readonly Course[]>;
  getById(id: number): Promise<Course | null>;
  create(input: NewCourse): Promise<Course>;
}
