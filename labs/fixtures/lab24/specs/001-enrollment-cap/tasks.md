# Tasks: Course enrollment cap

**Input**: Design documents from `/specs/001-enrollment-cap/`
**Prerequisites**: plan.md, spec.md

## Format: `[ID] [P?] [Story] Description`

Every `T` task carries a `yaml task-prompt` block (the Lab 24 `contoso-tasks`
preset). The `G` tasks come from Lab 22's `contoso-sdd` preset and are checked
by people, not by the task-prompt validator.

## Phase 1: Setup

- [x] T001 [US1] Add a nullable `Capacity` property to `dotnet/ContosoUniversity.Core/Models/Course.cs`

  ```yaml task-prompt
  objective: Let a course declare an optional maximum number of enrollments.
  deliverable: A nullable int Capacity property on Course.
  sizing:
    self_sufficient: true
  context:
    - specs/001-enrollment-cap/spec.md#requirements
    - specs/001-enrollment-cap/plan.md
  fresh_session: true
  constraints:
    - Nullable, no default value; existing courses stay uncapped.
  do_not_modify:
    - dotnet/ContosoUniversity.Infrastructure/
  owned_files:
    - dotnet/ContosoUniversity.Core/Models/Course.cs
  agent: task-executor
  tier: cheap
  fallback_tier: standard
  acceptance:
    command: dotnet build dotnet/ContosoUniversity.sln
    expect: exit 0
  execution: agent
  escalation:
    ladder: [self-heal, redispatch, stage-owner]
    retry_budget: 2
    stop_rule: Stop after two failed builds and hand back to the stage owner.
  correlation_key: 001-enrollment-cap/implement/T001/3f9a2c1e
  ```

**Checkpoint**: the solution builds and `Course.Capacity` exists.

## Phase 3: User Story 1 - Enrollment stops at capacity (Priority: P1)

- [x] T014 [US1] Create the capacity rule in `dotnet/ContosoUniversity.Core/Services/EnrollmentCapPolicy.cs`

  ```yaml task-prompt
  objective: Decide whether one more enrollment fits in a course.
  deliverable: EnrollmentCapPolicy.CanEnroll(course, currentEnrollments) returning bool.
  sizing:
    self_sufficient: true
  context:
    - specs/001-enrollment-cap/spec.md#requirements
    - specs/001-enrollment-cap/plan.md
  fresh_session: true
  constraints:
    - Pure function. No database, no HttpContext.
    - A null Capacity means unlimited (FR-003).
  do_not_modify:
    - dotnet/ContosoUniversity.Core/Models/Course.cs
  owned_files:
    - dotnet/ContosoUniversity.Core/Services/EnrollmentCapPolicy.cs
  agent: task-executor
  tier: standard
  fallback_tier: premium
  acceptance:
    command: dotnet test dotnet/ContosoUniversity.sln --filter EnrollmentCapPolicy
    expect: exit 0
  execution: agent
  escalation:
    ladder: [self-heal, redispatch, stage-owner, scope-change]
    retry_budget: 2
    stop_rule: Stop when the acceptance command fails twice or the spec looks wrong.
  correlation_key: 001-enrollment-cap/implement/T014/3f9a2c1e
  ```

- [x] T015 [P] [US1] Write the policy tests in `dotnet/ContosoUniversity.Tests/EnrollmentCapPolicyTests.cs`

  ```yaml task-prompt
  objective: Prove the capacity rule against every acceptance scenario in the spec.
  deliverable: An xUnit test class covering FR-001 to FR-003.
  sizing:
    self_sufficient: true
  context:
    - specs/001-enrollment-cap/spec.md#user-scenarios--testing
  fresh_session: true
  constraints:
    - Arrange-Act-Assert. One behaviour per test.
  do_not_modify:
    - dotnet/ContosoUniversity.Core/
  owned_files:
    - dotnet/ContosoUniversity.Tests/EnrollmentCapPolicyTests.cs
  agent: task-executor
  tier: cheap
  fallback_tier: standard
  acceptance:
    command: dotnet test dotnet/ContosoUniversity.sln --filter EnrollmentCapPolicy
    expect: exit 0, at least 3 tests run
  execution: split
  override:
    by: blake-lead
    reason: The agent writes the tests; a person checks they match the scenarios word for word.
  escalation:
    ladder: [self-heal, stage-owner]
    retry_budget: 1
    stop_rule: Stop if a scenario cannot be expressed as a test.
  correlation_key: 001-enrollment-cap/implement/T015/3f9a2c1e
  ```

**Checkpoint**: User Story 1 is complete and testable on its own.

## Phase 4: Rework

QA rejected T014 (see `qa-review.md`): a course at capacity accepted one more
student. T016 rewrites T014 under a new ID because `taskstoissues` skips any ID
already used in an issue title, open or closed.

- [ ] T016 [US1] Fix the boundary in `dotnet/ContosoUniversity.Core/Services/EnrollmentCapPolicy.cs`

  ```yaml task-prompt
  objective: Refuse the enrollment that would make enrollments exceed capacity.
  deliverable: CanEnroll returns false when currentEnrollments equals Capacity.
  sizing:
    self_sufficient: true
  context:
    - specs/001-enrollment-cap/spec.md#requirements
    - specs/001-enrollment-cap/qa-review.md
  fresh_session: true
  constraints:
    - Change the comparison only. Do not touch the tests to make them pass.
  do_not_modify:
    - dotnet/ContosoUniversity.Tests/
  owned_files:
    - dotnet/ContosoUniversity.Core/Services/EnrollmentCapPolicy.cs
  agent: task-executor
  tier: standard
  fallback_tier: premium
  acceptance:
    command: dotnet test dotnet/ContosoUniversity.sln --filter EnrollmentCapPolicy
    expect: exit 0
  execution: agent
  escalation:
    ladder: [self-heal, stage-owner]
    retry_budget: 1
    stop_rule: Round 2 of 2. If QA rejects again, escalate to the review-spec owner.
  supersedes: T014
  correlation_key: 001-enrollment-cap/rework/T016/3f9a2c1e
  ```

## Phase N: Governance (contoso-sdd)

- [ ] G001 Confirm no secrets or connection strings were added
- [ ] G002 Confirm the new column has a migration note in the PR description
