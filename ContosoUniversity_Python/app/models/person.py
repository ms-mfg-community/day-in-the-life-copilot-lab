"""Person base model using SQLAlchemy single-table inheritance."""
# .NET equivalent: ContosoUniversity.Core.Models.Person

from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app import db


class Person(db.Model):
    """Base class for Student and Instructor using single-table (TPH) inheritance."""

    __tablename__ = "person"

    id: Mapped[int] = mapped_column(primary_key=True)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    first_name: Mapped[str] = mapped_column("FirstName", String(50), nullable=False)
    type: Mapped[str] = mapped_column("Discriminator", String(50))

    __mapper_args__ = {
        "polymorphic_on": "type",
        "polymorphic_identity": "Person",
    }

    @property
    def full_name(self) -> str:
        """Return formatted full name as 'LastName, FirstName'."""
        return f"{self.last_name}, {self.first_name}"
