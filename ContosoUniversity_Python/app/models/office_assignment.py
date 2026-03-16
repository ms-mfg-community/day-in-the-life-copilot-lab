"""OfficeAssignment model — one-to-one relationship with Instructor."""
# .NET equivalent: ContosoUniversity.Core.Models.OfficeAssignment

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app import db

if TYPE_CHECKING:
    from app.models.instructor import Instructor


class OfficeAssignment(db.Model):
    """Office assignment with a shared primary key (instructor_id) for one-to-one mapping."""

    __tablename__ = "office_assignment"

    instructor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("person.id"), primary_key=True
    )
    location: Mapped[str] = mapped_column(String(50), nullable=False, default="")

    instructor: Mapped[Instructor] = relationship(back_populates="office_assignment")
