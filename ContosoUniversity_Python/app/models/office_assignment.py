"""OfficeAssignment model — mirrors ContosoUniversity.Core.Models.OfficeAssignment."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app import db

if TYPE_CHECKING:
    from app.models.instructor import Instructor


class OfficeAssignment(db.Model):
    """Office assignment — one-to-one with Instructor (shared PK).

    Mirrors .NET OfficeAssignment with InstructorID as primary key.
    """

    __tablename__ = "office_assignment"

    instructor_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("person.id"), primary_key=True
    )
    location: Mapped[str] = mapped_column(String(50), nullable=False, default="")

    instructor: Mapped[Instructor] = relationship(back_populates="office_assignment")
