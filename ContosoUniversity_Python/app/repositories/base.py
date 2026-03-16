"""Generic repository — mirrors ContosoUniversity.Infrastructure.Repositories.Repository<T>."""

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
    """Generic repository pattern — mirrors .NET IRepository<T>.

    Provides standard CRUD operations for any SQLAlchemy model.
    """

    def __init__(self, model_class: type[T]) -> None:
        self._model_class = model_class

    def get_all(self) -> Sequence[T]:
        """Get all entities — mirrors GetAllAsync."""
        return db.session.execute(
            select(self._model_class)
        ).scalars().all()

    def get_by_id(self, entity_id: int) -> T | None:
        """Get entity by primary key — mirrors GetByIdAsync."""
        return db.session.get(self._model_class, entity_id)

    def find(self, **filters: object) -> Sequence[T]:
        """Find entities matching filters — simplified version of FindAsync."""
        stmt = select(self._model_class).filter_by(**filters)
        return db.session.execute(stmt).scalars().all()

    def add(self, entity: T) -> T:
        """Add a new entity — mirrors AddAsync."""
        db.session.add(entity)
        db.session.flush()
        return entity

    def update(self, entity: T) -> None:
        """Update an entity — mirrors UpdateAsync.

        Note: In SQLAlchemy, tracked objects are auto-flushed.
        This method exists for API parity with .NET.
        """
        db.session.merge(entity)

    def delete(self, entity: T) -> None:
        """Delete an entity — mirrors DeleteAsync."""
        db.session.delete(entity)

    def save_changes(self) -> None:
        """Commit the transaction — mirrors SaveChangesAsync."""
        db.session.commit()

    def get_queryable(self):
        """Get a query object for the model — mirrors GetQueryable."""
        return select(self._model_class)
