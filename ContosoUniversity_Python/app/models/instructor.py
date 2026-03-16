"""Instructor model — mirrors ContosoUniversity.Core.Models.Instructor."""

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.person import Person

if TYPE_CHECKING:
    from app.models.course_assignment import CourseAssignment
    from app.models.office_assignment import OfficeAssignment


class Instructor(Person):
    """Instructor entity — inherits from Person via TPH.

    Mirrors .NET Instructor class with HireDate, CourseAssignments, and OfficeAssignment.
    """

    hire_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)

    course_assignments: Mapped[list[CourseAssignment]] = relationship(
        back_populates="instructor",
        cascade="all, delete-orphan",
    )
    office_assignment: Mapped[OfficeAssignment | None] = relationship(
        back_populates="instructor",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __mapper_args__ = {
        "polymorphic_identity": "Instructor",
    }
