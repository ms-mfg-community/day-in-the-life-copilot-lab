import type { DbHandle } from './db.js';
import { createStudentRepo } from './repos/student-repo.js';
import { createCourseRepo } from './repos/course-repo.js';
import { createInstructorRepo } from './repos/instructor-repo.js';

// Mirrors the .NET ContosoUniversity seed data so both tracks stay parallel.
export async function seed(handle: DbHandle): Promise<void> {
  const students = createStudentRepo(handle);
  const courses = createCourseRepo(handle);
  const instructors = createInstructorRepo(handle);

  await students.create({ firstMidName: 'Carson', lastName: 'Alexander', enrollmentDate: new Date('2019-09-01') });
  await students.create({ firstMidName: 'Meredith', lastName: 'Alonso', enrollmentDate: new Date('2017-09-01') });
  await students.create({ firstMidName: 'Arturo', lastName: 'Anand', enrollmentDate: new Date('2018-09-01') });
  await students.create({ firstMidName: 'Gytis', lastName: 'Barzdukas', enrollmentDate: new Date('2017-09-01') });
  await students.create({ firstMidName: 'Yan', lastName: 'Li', enrollmentDate: new Date('2017-09-01') });
  await students.create({ firstMidName: 'Peggy', lastName: 'Justice', enrollmentDate: new Date('2016-09-01') });
  await students.create({ firstMidName: 'Laura', lastName: 'Norman', enrollmentDate: new Date('2018-09-01') });
  await students.create({ firstMidName: 'Nino', lastName: 'Olivetto', enrollmentDate: new Date('2019-09-01') });

  await courses.create({ title: 'Chemistry', credits: 3 });
  await courses.create({ title: 'Microeconomics', credits: 3 });
  await courses.create({ title: 'Macroeconomics', credits: 3 });
  await courses.create({ title: 'Calculus', credits: 4 });
  await courses.create({ title: 'Trigonometry', credits: 4 });
  await courses.create({ title: 'Composition', credits: 3 });
  await courses.create({ title: 'Literature', credits: 4 });

  await instructors.create({ firstMidName: 'Kim', lastName: 'Abercrombie', hireDate: new Date('1995-03-11') });
  await instructors.create({ firstMidName: 'Fadi', lastName: 'Fakhouri', hireDate: new Date('2002-07-06') });
  await instructors.create({ firstMidName: 'Roger', lastName: 'Harui', hireDate: new Date('1998-07-01') });
  await instructors.create({ firstMidName: 'Candace', lastName: 'Kapoor', hireDate: new Date('2001-01-15') });
  await instructors.create({ firstMidName: 'Roger', lastName: 'Zheng', hireDate: new Date('2004-02-12') });
}
