"""Department model — mirrors ContosoUniversity.Core.Models.Department."""

from __future__ import annotations

import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app import db

if TYPE_CHECKING:
    from app.models.course import Course
    from app.models.instructor import Instructor


class Department(db.Model):
    """Department entity with concurrency control.

    Mirrors .NET Department class with RowVersion, custom validations, and
    self-referencing FK to Instructor as administrator.
    """

    __tablename__ = "department"

    department_id: Mapped[int] = mapped_column(
        "DepartmentID", Integer, primary_key=True, autoincrement=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    budget: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    start_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    instructor_id: Mapped[int | None] = mapped_column(
        ForeignKey("person.id"), nullable=True
    )
    row_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    department_type: Mapped[str | None] = mapped_column(
        String(50), nullable=True, default="Academic"
    )

    administrator: Mapped[Instructor | None] = relationship(
        foreign_keys=[instructor_id],
    )
    courses: Mapped[list[Course]] = relationship(
        back_populates="department",
        cascade="all, delete-orphan",
    )
