import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const students = sqliteTable('students', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstMidName: text('first_mid_name').notNull(),
  lastName: text('last_name').notNull(),
  enrollmentDate: integer('enrollment_date', { mode: 'timestamp_ms' }).notNull(),
});

export const courses = sqliteTable('courses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  credits: integer('credits').notNull(),
  departmentId: integer('department_id'),
});

export const instructors = sqliteTable('instructors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  firstMidName: text('first_mid_name').notNull(),
  lastName: text('last_name').notNull(),
  hireDate: integer('hire_date', { mode: 'timestamp_ms' }).notNull(),
});

export const enrollments = sqliteTable('enrollments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  studentId: integer('student_id').notNull().references(() => students.id),
  courseId: integer('course_id').notNull().references(() => courses.id),
  grade: text('grade'),
});

export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_mid_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    enrollment_date INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL,
    department_id INTEGER
  );
  CREATE TABLE IF NOT EXISTS instructors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_mid_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    hire_date INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id),
    course_id INTEGER NOT NULL REFERENCES courses(id),
    grade TEXT
  );
`;
