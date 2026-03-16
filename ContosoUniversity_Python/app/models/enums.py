"""Enums — mirrors ContosoUniversity.Core.Models enums."""

from __future__ import annotations

import enum


class EntityOperation(enum.Enum):
    """Entity operation enum — mirrors .NET EntityOperation."""

    CREATE = "Create"
    READ = "Read"
    UPDATE = "Update"
    DELETE = "Delete"


class StudentSortOption(enum.Enum):
    """Student sort options — mirrors .NET StudentSortOption."""

    LAST_NAME_ASC = "last_name_asc"
    LAST_NAME_DESC = "last_name_desc"
    ENROLLMENT_DATE_ASC = "enrollment_date_asc"
    ENROLLMENT_DATE_DESC = "enrollment_date_desc"
