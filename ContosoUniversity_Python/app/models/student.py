"""Student model with enrollment tracking."""
# .NET equivalent: ContosoUniversity.Core.Models.Student

from __future__ import annotations

import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.person import Person

if TYPE_CHECKING:
    from app.models.enrollment import Enrollment


class Student(Person):
    """Student entity inheriting from Person via TPH with enrollment date and enrollments."""

    enrollment_date: Mapped[datetime.date | None] = mapped_column(
        Date, nullable=True
    )

    enrollments: Mapped[list[Enrollment]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
    )

    __mapper_args__ = {
        "polymorphic_identity": "Student",
    }
