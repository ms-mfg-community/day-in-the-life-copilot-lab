---
description: "Generate pytest tests for a ContosoUniversity Python module. Creates unit tests with fixtures following test_unit_scenario_expected naming. Covers happy paths, edge cases, and error scenarios."
mode: "agent"
tools: ["read", "edit", "execute", "search"]
---

# Create Python Test

Generate comprehensive pytest tests for a ContosoUniversity Python module.

## Instructions

1. **Read the source file** specified by the user (or the currently open file)
2. **Identify all public functions/methods** that need testing
3. **Check existing test patterns** in `ContosoUniversity_Python/tests/`
4. **Generate tests** following the project conventions

## Test Conventions

- **Framework**: pytest with fixtures
- **Naming**: `test_<function>_<scenario>_<expected_result>`
- **Pattern**: Arrange-Act-Assert (AAA)
- **Fixtures**: Use `conftest.py` fixtures (`app`, `client`, `authenticated_client`, `db`)
- **Location**: Unit tests in `tests/unit/`, integration tests in `tests/integration/`

## Test Template

```python
"""Tests for {module_name}."""

from __future__ import annotations

import pytest

from app.models.{model} import {Model}


class Test{Model}:
    """{Model} tests."""

    def test_{method}_{scenario}_{expected}(self, app) -> None:
        # Arrange
        ...

        # Act
        with app.app_context():
            result = ...

        # Assert
        assert result == expected
```

## Coverage Requirements

- All public methods must have at least one test
- Test happy paths AND error paths
- Test edge cases: None/empty inputs, boundary values
- For routes: test GET and POST, test auth required, test 404s
- For models: test computed properties, relationships, constraints

## Run Tests After Creating

```bash
cd ContosoUniversity_Python
python -m pytest tests/ -v --tb=short
```

Ensure all new AND existing tests pass before finishing.
