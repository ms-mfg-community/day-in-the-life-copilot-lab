"""CourseAssignment model — mirrors ContosoUniversity.Core.Models.CourseAssignment."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app import db

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.instructor import Instructor


class CourseAssignment(db.Model):
    """Many-to-many join between Instructor and Course.

    Mirrors .NET CourseAssignment with composite primary key.
    """

    __tablename__ = "course_assignment"

    instructor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("person.id"), primary_key=True
    )
    course_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("course.CourseID"), primary_key=True
    )

    instructor: Mapped[Instructor] = relationship(back_populates="course_assignments")
    course: Mapped[Course] = relationship(back_populates="course_assignments")
