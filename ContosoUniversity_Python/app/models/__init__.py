"""SQLAlchemy domain models for the university system."""
# .NET equivalent: ContosoUniversity.Core.Models

from __future__ import annotations

from app.models.person import Person
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.enrollment import Enrollment, Grade
from app.models.department import Department
from app.models.office_assignment import OfficeAssignment
from app.models.course_assignment import CourseAssignment
from app.models.notification import Notification
from app.models.enums import EntityOperation, StudentSortOption

__all__ = [
    "Person",
    "Student",
    "Instructor",
    "Course",
    "Enrollment",
    "Grade",
    "Department",
    "OfficeAssignment",
    "CourseAssignment",
    "Notification",
    "EntityOperation",
    "StudentSortOption",
]


def import_all_models() -> None:
    """Import all models to ensure they are registered with SQLAlchemy.

    Call this before db.create_all() to ensure all tables are created.
    """
    pass  # Importing this module already imports all models above
