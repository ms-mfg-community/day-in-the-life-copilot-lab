# ContosoUniversity Python Port

This is a Python/Flask port of the ContosoUniversity .NET application, created as part of the GitHub Copilot hands-on labs.

## Project Structure

```
ContosoUniversity_Python/
├── config.py                # Flask configuration (mirrors appsettings.json)
├── pyproject.toml           # Project metadata and dependencies
├── requirements.txt         # Pinned production dependencies
├── requirements-dev.txt     # Development dependencies
├── .env.example             # Environment variable template
├── .python-version          # Python version (3.11)
│
├── app/                     # Main application package
│   ├── __init__.py          # Flask app factory
│   ├── models/              # Domain models (mirrors Core.Models)
│   ├── repositories/        # Data access (mirrors Infrastructure.Repositories)
│   ├── services/            # Business logic (mirrors Infrastructure.Services)
│   ├── routes/              # Route blueprints (mirrors Web.Controllers)
│   ├── forms/               # WTForms (mirrors ViewModels/Data Annotations)
│   ├── templates/           # Jinja2 templates (mirrors Razor views)
│   ├── static/              # CSS, JS, uploads
│   └── utils/               # Utility functions
│
├── tests/
│   ├── conftest.py          # Shared fixtures
│   ├── unit/                # Unit tests
│   └── integration/         # Integration tests
│
└── playwright_tests/        # E2E tests
```

## Technology Stack

- **Python 3.11+**
- **Flask 3.0** — Web framework (mirrors ASP.NET Core)
- **SQLAlchemy 2.0** — ORM (mirrors Entity Framework Core)
- **Flask-Login** — Authentication (mirrors ASP.NET Core Identity)
- **Flask-WTF** — Forms and CSRF protection (mirrors Data Annotations)
- **WTForms** — Form validation (mirrors ViewModels)
- **pytest** — Testing framework (mirrors xUnit)
- **Playwright** — E2E testing (mirrors Playwright in .NET)

## Setup Instructions

### 1. Install Dependencies

```bash
# Using pip
pip install -r requirements-dev.txt

# Or using uv (recommended)
uv pip install -r requirements-dev.txt
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your settings
```

### 3. Initialize Database

The database will be automatically initialized when you first run the app (mirrors `DbInitializer.InitializeAsync`).

### 4. Run the Application

```bash
# Development server
flask --app app run --debug

# Or using Python
python -m flask --app app run --debug
```

The app will be available at `http://127.0.0.1:5000`

## Development Workflow

### Running Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=app --cov-report=html

# Unit tests only
pytest tests/unit

# Integration tests only
pytest tests/integration
```

### Linting and Type Checking

```bash
# Run Ruff linter
ruff check app tests

# Auto-fix issues
ruff check --fix app tests

# Type checking with mypy
mypy app
```

### E2E Tests with Playwright

```bash
# Install Playwright browsers (first time only)
playwright install

# Run E2E tests
pytest playwright_tests
```

## Architecture Notes

This Python port mirrors the .NET ContosoUniversity architecture:

- **Repository Pattern**: Data access abstraction (like .NET repositories)
- **Service Layer**: Business logic separation (like .NET services)
- **Blueprints**: Flask's equivalent to .NET Controllers
- **SQLAlchemy ORM**: Declarative models like EF Core entities
- **Flask-Login**: User authentication like ASP.NET Core Identity
- **WTForms**: Server-side validation like Data Annotations

## Configuration Environments

The `config.py` file defines three environments (mirrors .NET appsettings):

- **Development**: SQLite database, debug mode, auto-login enabled
- **Testing**: In-memory SQLite, CSRF disabled for tests
- **Production**: PostgreSQL/MySQL, debug disabled, secure settings

Set the environment with: `FLASK_ENV=development|testing|production`

## Status

All components are implemented and tested:

| Component | Python | .NET Equivalent |
|-----------|--------|-----------------|
| Domain Models (9) | SQLAlchemy 2.0 + TPH inheritance | EF Core + Data Annotations |
| Seed Data | Exact match (8 students, 5 instructors, 4 depts, 7 courses, 11 enrollments) | DbInitializer |
| Repository Pattern | Generic `Repository` class | `IRepository<T>` / `Repository<T>` |
| Student Search | `search_students()` with LIKE, date range, sort, pagination | `StudentQueryService` |
| Notification Service | In-memory local service | `LocalNotificationService` |
| File Storage | Local filesystem uploads | `LocalFileStorageService` |
| CRUD Routes (5 entities) | Flask Blueprints with `@login_required` | ASP.NET MVC Controllers with `[Authorize]` |
| Form Validation | WTForms + custom validators | Data Annotations + custom attributes |
| Templates (25) | Jinja2 with Bootstrap 5 | Razor (.cshtml) |
| Auth | Flask-Login with dev auto-login | Cookie auth with `LocalSignInAsync` |
| Tests (42) | pytest (unit + integration) | xUnit + WebApplicationFactory |

## License

MIT (same as original ContosoUniversity)
