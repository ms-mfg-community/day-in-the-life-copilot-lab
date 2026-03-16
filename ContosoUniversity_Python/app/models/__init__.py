"""Domain models — mirrors ContosoUniversity.Core.Models."""

from __future__ import annotations


def import_all_models() -> None:
    """Import all models to ensure they are registered with SQLAlchemy."""
    from app.models import person  # noqa: F401
    from app.models import student  # noqa: F401
    from app.models import instructor  # noqa: F401
    from app.models import course  # noqa: F401
    from app.models import enrollment  # noqa: F401
    from app.models import department  # noqa: F401
    from app.models import office_assignment  # noqa: F401
    from app.models import course_assignment  # noqa: F401
    from app.models import notification  # noqa: F401
