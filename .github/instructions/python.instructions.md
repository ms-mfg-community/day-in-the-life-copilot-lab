---
description: "Python architecture guidelines and best practices"
applyTo: '**/*.py,**/pyproject.toml,**/requirements*.txt'
---

# Python Development Guidelines

You are an AI assistant specialized in modern Python development with Flask, SQLAlchemy, and pytest. Follow these guidelines for the ContosoUniversity Python application.

## Project Structure

```
ContosoUniversity_Python/
├── app/              # Flask application package
│   ├── __init__.py   # App factory (create_app)
│   ├── models/       # SQLAlchemy models
│   ├── routes/       # Flask blueprints
│   ├── forms/        # WTForms validation
│   ├── services/     # Business logic
│   └── templates/    # Jinja2 templates
├── tests/            # pytest test suite
├── config.py         # Configuration classes
└── run.py            # Entry point
```

## Code Standards

- **Python 3.11+** — Use modern features: `match/case`, `X | Y` unions, `from __future__ import annotations`
- **Type hints** on all public functions — target `mypy --strict` compatibility
- **SQLAlchemy 2.0** style — Use `Mapped[]`, `mapped_column()`, `select()` API
- **Docstrings** — Google style with Args/Returns/Raises sections
- **Imports** — stdlib → third-party → local, absolute imports only
- **Line length** — 88 characters (ruff/Black default)

## Flask Patterns

- Use the **app factory** pattern (`create_app()`)
- Routes go in **blueprints** under `app/routes/`
- Use **`@login_required`** for protected routes
- Use **Flask-WTF** for CSRF protection and form validation
- Use **`flash()`** for user-facing messages
- Use **`abort(404)`** for missing resources

## SQLAlchemy Patterns

- Models use **`Mapped[]` type annotations** for all columns
- Use **`db.session.get(Model, id)`** for primary key lookups
- Use **`select()`** for queries (not legacy `Query` API)
- Use **`relationship(back_populates=...)`** for bidirectional relationships
- **Commit explicitly** — don't rely on auto-commit

## Testing Patterns

- Use **pytest** with fixtures (not unittest)
- Test naming: `test_<unit>_<scenario>_<expected>`
- Use **Flask test client** for integration tests
- Use **`app.test_client()`** with session-scoped app fixture
- Use **in-memory SQLite** for test isolation
- Follow **Arrange-Act-Assert** pattern

## Security

- **Never** use `eval()`, `exec()`, or raw SQL strings
- **Always** use WTForms CSRF protection
- **Validate** all user input with WTForms validators
- **Use** `secrets` module for tokens, not `random`
- **Never** hardcode secrets — use environment variables

## Error Handling

- Use **`try/except` with specific exceptions** — no bare `except:`
- Use **`db.session.rollback()`** on database errors
- Use **`logger.error()`** with context — no silent failures
- Return appropriate HTTP status codes (400, 404, 500)
