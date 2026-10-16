# Feature Specification: Course enrollment cap

**Feature Branch**: `001-enrollment-cap`
**Epic**: `.specify/epics/enrollment-cap/epic.md`

## User Scenarios & Testing

### User Story 1 - Enrollment stops at capacity (Priority: P1)

A registrar enrolls students in a course that has a capacity. The enrollment
that would exceed the capacity is refused with a clear message.

**Acceptance Scenarios**:

1. **Given** a course with capacity 2 and 2 enrollments, **When** a third
   student is enrolled, **Then** the enrollment is refused.
2. **Given** a course with no capacity set, **When** a student is enrolled,
   **Then** the enrollment succeeds.

## Requirements

- **FR-001**: A course MAY declare a capacity (a positive whole number).
- **FR-002**: The system MUST refuse an enrollment that would make the number
  of enrollments greater than the capacity.
- **FR-003**: A course with no capacity MUST accept enrollments as it does today.
