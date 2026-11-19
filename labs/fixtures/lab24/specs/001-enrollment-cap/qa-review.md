# QA review: 001-enrollment-cap

**Verdict:** reject
**Classification:** implementation
**Correlation key:** `001-enrollment-cap/qa-review/-/3f9a2c1e`

## Inputs

QA read only the spec, the diff and `tasks.md`. It did not read the implementer's
summary.

- `specs/001-enrollment-cap/spec.md`
- the PR #42 diff
- `specs/001-enrollment-cap/tasks.md`

## Findings

1. **FR-002 not met (T014).** `CanEnroll` uses `currentEnrollments <= Capacity`,
   so a course with capacity 2 and 2 enrollments accepts a third student. The
   spec's first acceptance scenario fails.
2. The tests in T015 cover the null-capacity case and the under-capacity case,
   but not the at-capacity boundary, which is why the suite was green.

## Routing

The fix stays inside the plan and the spec, so this is an **implementation**
rejection. Rework goes to the implementer as a new task (T016, superseding T014)
and resumes at QA. No spec or scope change, so no review-spec re-review.
