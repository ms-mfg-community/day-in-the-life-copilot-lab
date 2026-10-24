---
name: coding-standards
description: Coding standards, best practices, and immutability patterns for TypeScript development in the ContosoUniversity project.
---

# Coding Standards & Best Practices

## Principles

1. **Readability first** — code is read far more often than it is written.
2. **Immutability** — return new objects; never mutate inputs or shared state.
3. **Explicit errors** — throw typed errors with actionable messages; never
   swallow exceptions silently.
4. **Small units** — functions under 50 lines, files under 300.

## TypeScript specifics

- `readonly` on every entity field; use `Readonly<T>` and `readonly T[]` at
  boundaries.
- Narrow types at system edges; validate external input before trusting it.
- Prefer union types over enums for closed sets.
