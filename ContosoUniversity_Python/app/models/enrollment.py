"""Enrollment model linking students to courses with optional grade."""
# .NET equivalent: ContosoUniversity.Core.Models.Enrollment

from __future__ import annotations

import enum
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app import db

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.student import Student


class Grade(enum.IntEnum):
    """Grade enum with integer values (A=0, B=1, C=2, D=3, F=4)."""

    A = 0
    B = 1
    C = 2
    D = 3
    F = 4


class Enrollment(db.Model):
    """Enrollment entity linking a student to a course with an optional grade."""

    __tablename__ = "enrollment"

    enrollment_id: Mapped[int] = mapped_column(
        "EnrollmentID", Integer, primary_key=True, autoincrement=True
    )
    course_id: Mapped[int] = mapped_column(
        ForeignKey("course.CourseID"), nullable=False
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("person.id"), nullable=False
    )
    grade: Mapped[Grade | None] = mapped_column(Enum(Grade), nullable=True)

    course: Mapped[Course] = relationship(back_populates="enrollments")
    student: Mapped[Student] = relationship(back_populates="enrollments")
