"""Shared test fixtures for Flask application testing."""

from __future__ import annotations

from collections.abc import Iterator

import pytest

from app import create_app, db as _db
from flask import Flask
from flask.testing import FlaskClient


@pytest.fixture(scope="session")
def app() -> Iterator[Flask]:
    """Create a Flask application configured for testing."""
    app = create_app("testing")
    yield app


@pytest.fixture()
def client(app: Flask) -> FlaskClient:
    """Provide a Flask test client for making HTTP requests."""
    return app.test_client()


@pytest.fixture()
def authenticated_client(client: FlaskClient) -> FlaskClient:
    """Provide a test client that is already signed in."""
    client.get("/account/sign-in", follow_redirects=True)
    return client


@pytest.fixture()
def db(app: Flask) -> Iterator:
    """Database session with rollback — ensures test isolation."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.rollback()

