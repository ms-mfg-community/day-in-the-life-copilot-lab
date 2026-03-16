"""Course model — mirrors ContosoUniversity.Core.Models.Course."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app import db

if TYPE_CHECKING:
    from app.models.course_assignment import CourseAssignment
    from app.models.department import Department
    from app.models.enrollment import Enrollment


class Course(db.Model):
    """Course entity with user-supplied primary key.

    Note: CourseID is NOT auto-generated — mirrors .NET DatabaseGenerated(None).
    """

    __tablename__ = "course"

    course_id: Mapped[int] = mapped_column(
        "CourseID", Integer, primary_key=True, autoincrement=False
    )
    title: Mapped[str] = mapped_column(String(50), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, nullable=False)
    department_id: Mapped[int] = mapped_column(
        ForeignKey("department.DepartmentID"), nullable=False
    )
    teaching_material_image_path: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    department: Mapped[Department] = relationship(back_populates="courses")
    enrollments: Mapped[list[Enrollment]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    course_assignments: Mapped[list[CourseAssignment]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
