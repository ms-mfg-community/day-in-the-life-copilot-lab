"""Student query service — mirrors ContosoUniversity.Infrastructure.Services.StudentQueryService."""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import TYPE_CHECKING

from sqlalchemy import func, select

from app import db
from app.models.student import Student
from app.models.enums import StudentSortOption

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StudentSearchCriteria:
    """Search criteria — mirrors .NET StudentSearchCriteria."""

    search_text: str | None = None
    enrollment_date_from: object = None  # date | None
    enrollment_date_to: object = None  # date | None
    sort_option: StudentSortOption = StudentSortOption.LAST_NAME_ASC
    page_number: int = 1
    page_size: int = 10


@dataclass(frozen=True)
class PagedResult:
    """Paged result — mirrors .NET PagedResult<T>."""

    items: list
    total_count: int
    page_number: int
    page_size: int

    @property
    def total_pages(self) -> int:
        return math.ceil(self.total_count / self.page_size) if self.page_size > 0 else 0

    @property
    def has_previous_page(self) -> bool:
        return self.page_number > 1

    @property
    def has_next_page(self) -> bool:
        return self.page_number < self.total_pages


def search_students(criteria: StudentSearchCriteria) -> PagedResult:
    """Search students with filtering, sorting, and pagination.

    Mirrors .NET StudentQueryService.SearchStudentsAsync exactly:
    - LIKE search on LastName and FirstMidName
    - Date range filtering (from inclusive, to exclusive next day)
    - Sort by name or enrollment date, ascending or descending
    - Secondary sort by ID for stability
    - Pagination with skip/take
    """
    page_number = max(1, criteria.page_number)
    page_size = max(1, min(100, criteria.page_size))

    query = select(Student)

    # Text search — mirrors EF.Functions.Like
    if criteria.search_text and criteria.search_text.strip():
        pattern = f"%{criteria.search_text.strip()}%"
        query = query.where(
            Student.last_name.ilike(pattern) | Student.first_name.ilike(pattern)
        )

    # Date range — mirrors .NET date filtering
    if criteria.enrollment_date_from is not None:
        query = query.where(Student.enrollment_date >= criteria.enrollment_date_from)

    if criteria.enrollment_date_to is not None:
        from datetime import timedelta
        to_exclusive = criteria.enrollment_date_to + timedelta(days=1)
        query = query.where(Student.enrollment_date < to_exclusive)

    # Sorting — mirrors .NET switch expression with secondary sort by ID
    match criteria.sort_option:
        case StudentSortOption.LAST_NAME_DESC:
            query = query.order_by(Student.last_name.desc(), Student.id)
        case StudentSortOption.ENROLLMENT_DATE_ASC:
            query = query.order_by(Student.enrollment_date.asc(), Student.id)
        case StudentSortOption.ENROLLMENT_DATE_DESC:
            query = query.order_by(Student.enrollment_date.desc(), Student.id)
        case _:
            query = query.order_by(Student.last_name.asc(), Student.id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_count = db.session.execute(count_query).scalar() or 0

    # Paginate — mirrors .NET Skip/Take
    items = db.session.execute(
        query.offset((page_number - 1) * page_size).limit(page_size)
    ).scalars().all()

    return PagedResult(
        items=list(items),
        total_count=total_count,
        page_number=page_number,
        page_size=page_size,
    )
