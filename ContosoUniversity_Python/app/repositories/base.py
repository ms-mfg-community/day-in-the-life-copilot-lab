"""Generic repository providing standard CRUD operations for SQLAlchemy models."""
# .NET equivalent: ContosoUniversity.Infrastructure.Repositories.Repository<T>

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import TypeVar

from sqlalchemy import select
from flask_sqlalchemy import SQLAlchemy

from app import db

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=db.Model)


class Repository:
    """Generic repository pattern for SQLAlchemy models.

    Provides standard CRUD operations for any model class.
    """

    def __init__(self, model_class: type[T]) -> None:
        self._model_class = model_class

    def get_all(self) -> Sequence[T]:
        """Retrieve all entities of this type."""
        return db.session.execute(
            select(self._model_class)
        ).scalars().all()

    def get_by_id(self, entity_id: int) -> T | None:
        """Retrieve an entity by its primary key."""
        return db.session.get(self._model_class, entity_id)

    def find(self, **filters: object) -> Sequence[T]:
        """Find entities matching the given keyword filters."""
        stmt = select(self._model_class).filter_by(**filters)
        return db.session.execute(stmt).scalars().all()

    def add(self, entity: T) -> T:
        """Add a new entity to the session and flush to assign its ID."""
        db.session.add(entity)
        db.session.flush()
        return entity

    def update(self, entity: T) -> None:
        """Merge an entity into the session.

        Note: In SQLAlchemy, tracked objects are auto-flushed on commit.
        """
        db.session.merge(entity)

    def delete(self, entity: T) -> None:
        """Mark an entity for deletion."""
        db.session.delete(entity)

    def save_changes(self) -> None:
        """Commit the current transaction."""
        db.session.commit()

    def get_queryable(self):
        """Return a SQLAlchemy select statement for the model."""
        return select(self._model_class)
