"""Shared enums for entity operations and sorting options."""
# .NET equivalent: ContosoUniversity.Core.Models enums

from __future__ import annotations

import enum


class EntityOperation(enum.Enum):
    """CRUD operation types for entity change tracking."""

    CREATE = "Create"
    READ = "Read"
    UPDATE = "Update"
    DELETE = "Delete"


class StudentSortOption(enum.Enum):
    """Sort options for student list queries."""

    LAST_NAME_ASC = "last_name_asc"
    LAST_NAME_DESC = "last_name_desc"
    ENROLLMENT_DATE_ASC = "enrollment_date_asc"
    ENROLLMENT_DATE_DESC = "enrollment_date_desc"
