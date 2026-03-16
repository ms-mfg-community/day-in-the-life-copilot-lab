"""Shared test fixtures — mirrors .NET CustomWebApplicationFactory."""

from __future__ import annotations

from collections.abc import Iterator

import pytest

from app import create_app, db as _db
from flask import Flask
from flask.testing import FlaskClient


@pytest.fixture(scope="session")
def app() -> Iterator[Flask]:
    """Create application for testing — mirrors .NET WebApplicationFactory."""
    app = create_app("testing")
    yield app


@pytest.fixture()
def client(app: Flask) -> FlaskClient:
    """Flask test client — mirrors .NET HttpClient from WebApplicationFactory."""
    return app.test_client()


@pytest.fixture()
def authenticated_client(client: FlaskClient) -> FlaskClient:
    """Pre-authenticated client — mirrors .NET test client with auto-login."""
    client.get("/account/sign-in", follow_redirects=True)
    return client


@pytest.fixture()
def db(app: Flask) -> Iterator:
    """Database session with rollback — ensures test isolation."""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.rollback()

