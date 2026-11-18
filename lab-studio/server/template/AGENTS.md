# ContosoUniversity — Agent Context

ContosoUniversity is a small university administration app: students enroll in
courses, instructors teach them, enrollments carry grades.

## Layout

```
src/entities/   # Domain types: Student, Course, Instructor
src/repos/      # Repository interfaces + in-memory implementations
src/routes/     # HTTP route handlers (framework-agnostic)
tests/          # Vitest unit tests
```

## Non-obvious context

- Repositories return **immutable copies** — callers must never see shared state.
- IDs are assigned by the repository, not the caller.
- `enrollmentDate` is always stored as an ISO date string, never a `Date` object,
  because the original data import produced strings and the app round-trips them.
