---
topic: build-verification
scope: project
updated: 2026-09-18
tags: [testing, vitest]
---

# Lesson: run the whole test suite, not one file

**Context**: A route-handler change passed its own test file but broke a
repository test that only `vitest run` (no file filter) executes.

**Lesson**: Verifying a change with a single test file misses breakage in
dependents. Always finish with a full `vitest run`.

**Evidence**: `src/routes/students.ts` imports `displayName()` from
`src/entities/student.ts`; renaming that helper passed
`tests/student-repo.test.ts` but broke the routes.

## Revision log

- 2026-09-18 — seeded with the workspace.
