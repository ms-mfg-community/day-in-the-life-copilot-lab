"""Database seed data — mirrors ContosoUniversity.Infrastructure.Data.DbInitializer."""

from __future__ import annotations

import logging
from datetime import date

from flask_sqlalchemy import SQLAlchemy

logger = logging.getLogger(__name__)


def seed_database(db: SQLAlchemy) -> None:
    """Seed the database with initial data if empty.

    Mirrors .NET DbInitializer.InitializeAsync — exact same data values.
    Only seeds if no students exist (same check as .NET version).
    """
    from app.models.student import Student
    from app.models.instructor import Instructor
    from app.models.department import Department
    from app.models.course import Course
    from app.models.enrollment import Enrollment, Grade
    from app.models.office_assignment import OfficeAssignment
    from app.models.course_assignment import CourseAssignment

    # Check if already seeded — mirrors: if (await context.Students.AnyAsync()) return;
    if db.session.query(Student).first() is not None:
        logger.info("Database already contains data — skipping seeding")
        return

    logger.info("Starting database seeding...")

    # Students — EXACT match to .NET seed data
    students = [
        Student(first_name="Carson", last_name="Alexander", enrollment_date=date(2010, 9, 1)),
        Student(first_name="Meredith", last_name="Alonso", enrollment_date=date(2012, 9, 1)),
        Student(first_name="Arturo", last_name="Anand", enrollment_date=date(2013, 9, 1)),
        Student(first_name="Gytis", last_name="Barzdukas", enrollment_date=date(2012, 9, 1)),
        Student(first_name="Yan", last_name="Li", enrollment_date=date(2012, 9, 1)),
        Student(first_name="Peggy", last_name="Justice", enrollment_date=date(2011, 9, 1)),
        Student(first_name="Laura", last_name="Norman", enrollment_date=date(2013, 9, 1)),
        Student(first_name="Nino", last_name="Olivetto", enrollment_date=date(2005, 9, 1)),
    ]
    db.session.add_all(students)
    db.session.flush()  # Get IDs assigned
    logger.info("Added %d students", len(students))

    # Instructors — EXACT match
    instructors = [
        Instructor(first_name="Kim", last_name="Abercrombie", hire_date=date(1995, 3, 11)),
        Instructor(first_name="Fadi", last_name="Fakhouri", hire_date=date(2002, 7, 6)),
        Instructor(first_name="Roger", last_name="Harui", hire_date=date(1998, 7, 1)),
        Instructor(first_name="Candace", last_name="Kapoor", hire_date=date(2001, 1, 15)),
        Instructor(first_name="Roger", last_name="Zheng", hire_date=date(2004, 2, 12)),
    ]
    db.session.add_all(instructors)
    db.session.flush()
    logger.info("Added %d instructors", len(instructors))

    # Helper to find by last name
    def find_instructor(last_name: str) -> Instructor:
        return next(i for i in instructors if i.last_name == last_name)

    def find_student(last_name: str) -> Student:
        return next(s for s in students if s.last_name == last_name)

    # Departments — EXACT match
    departments = [
        Department(
            name="English", budget=350000,
            start_date=date(2007, 9, 1),
            instructor_id=find_instructor("Abercrombie").id,
        ),
        Department(
            name="Mathematics", budget=100000,
            start_date=date(2007, 9, 1),
            instructor_id=find_instructor("Fakhouri").id,
        ),
        Department(
            name="Engineering", budget=350000,
            start_date=date(2007, 9, 1),
            instructor_id=find_instructor("Harui").id,
        ),
        Department(
            name="Economics", budget=100000,
            start_date=date(2007, 9, 1),
            instructor_id=find_instructor("Kapoor").id,
        ),
    ]
    db.session.add_all(departments)
    db.session.flush()
    logger.info("Added %d departments", len(departments))

    def find_department(name: str) -> Department:
        return next(d for d in departments if d.name == name)

    # Courses — EXACT match (note: CourseID is user-supplied, NOT auto-generated)
    courses = [
        Course(course_id=1050, title="Chemistry", credits=3, department_id=find_department("Engineering").department_id),
        Course(course_id=4022, title="Microeconomics", credits=3, department_id=find_department("Economics").department_id),
        Course(course_id=4041, title="Macroeconomics", credits=3, department_id=find_department("Economics").department_id),
        Course(course_id=1045, title="Calculus", credits=4, department_id=find_department("Mathematics").department_id),
        Course(course_id=3141, title="Trigonometry", credits=4, department_id=find_department("Mathematics").department_id),
        Course(course_id=2021, title="Composition", credits=3, department_id=find_department("English").department_id),
        Course(course_id=2042, title="Literature", credits=4, department_id=find_department("English").department_id),
    ]
    db.session.add_all(courses)
    db.session.flush()
    logger.info("Added %d courses", len(courses))

    def find_course(title: str) -> Course:
        return next(c for c in courses if c.title == title)

    # Office Assignments — EXACT match
    office_assignments = [
        OfficeAssignment(instructor_id=find_instructor("Fakhouri").id, location="Smith 17"),
        OfficeAssignment(instructor_id=find_instructor("Harui").id, location="Gowan 27"),
        OfficeAssignment(instructor_id=find_instructor("Kapoor").id, location="Thompson 304"),
    ]
    db.session.add_all(office_assignments)
    db.session.flush()
    logger.info("Added %d office assignments", len(office_assignments))

    # Course Assignments (Instructor ↔ Course) — EXACT match
    course_assignments = [
        CourseAssignment(course_id=find_course("Chemistry").course_id, instructor_id=find_instructor("Kapoor").id),
        CourseAssignment(course_id=find_course("Chemistry").course_id, instructor_id=find_instructor("Harui").id),
        CourseAssignment(course_id=find_course("Microeconomics").course_id, instructor_id=find_instructor("Zheng").id),
        CourseAssignment(course_id=find_course("Macroeconomics").course_id, instructor_id=find_instructor("Zheng").id),
        CourseAssignment(course_id=find_course("Calculus").course_id, instructor_id=find_instructor("Fakhouri").id),
        CourseAssignment(course_id=find_course("Trigonometry").course_id, instructor_id=find_instructor("Harui").id),
        CourseAssignment(course_id=find_course("Composition").course_id, instructor_id=find_instructor("Abercrombie").id),
        CourseAssignment(course_id=find_course("Literature").course_id, instructor_id=find_instructor("Abercrombie").id),
    ]
    db.session.add_all(course_assignments)
    db.session.flush()
    logger.info("Added %d course assignments", len(course_assignments))

    # Enrollments — EXACT match (note: some have Grade=None)
    enrollments = [
        Enrollment(student_id=find_student("Alexander").id, course_id=find_course("Chemistry").course_id, grade=Grade.A),
        Enrollment(student_id=find_student("Alexander").id, course_id=find_course("Microeconomics").course_id, grade=Grade.C),
        Enrollment(student_id=find_student("Alexander").id, course_id=find_course("Macroeconomics").course_id, grade=Grade.B),
        Enrollment(student_id=find_student("Alonso").id, course_id=find_course("Calculus").course_id, grade=Grade.B),
        Enrollment(student_id=find_student("Alonso").id, course_id=find_course("Trigonometry").course_id, grade=Grade.B),
        Enrollment(student_id=find_student("Alonso").id, course_id=find_course("Composition").course_id, grade=Grade.B),
        Enrollment(student_id=find_student("Anand").id, course_id=find_course("Chemistry").course_id, grade=None),
        Enrollment(student_id=find_student("Anand").id, course_id=find_course("Microeconomics").course_id, grade=Grade.B),
        Enrollment(student_id=find_student("Barzdukas").id, course_id=find_course("Chemistry").course_id, grade=Grade.B),
        Enrollment(student_id=find_student("Li").id, course_id=find_course("Composition").course_id, grade=Grade.B),
        Enrollment(student_id=find_student("Justice").id, course_id=find_course("Literature").course_id, grade=Grade.B),
    ]
    db.session.add_all(enrollments)

    db.session.commit()
    logger.info("Database seeding completed successfully")
