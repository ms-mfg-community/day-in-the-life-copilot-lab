# Tasks: deliberately invalid (Lab 24 validator demo)

Each task breaks one rule. `validate-tasks.mjs` must reject the file and name
every problem; it must not try to fix or re-prompt.

## Phase 1: Setup

- [ ] T001 [US1] A model name where a tier belongs

  ```yaml task-prompt
  objective: Show that a model string is rejected.
  deliverable: Nothing; this task exists to fail.
  sizing:
    self_sufficient: true
  context:
    - specs/002-invalid/tasks.md
  fresh_session: true
  constraints:
    - None.
  do_not_modify:
    - dotnet/
  owned_files:
    - docs/notes.md
  agent: task-executor
  tier: claude-sonnet-4.6
  fallback_tier: premium
  acceptance:
    command: echo ok
    expect: ok
  execution: agent
  escalation:
    ladder: [self-heal]
    retry_budget: 1
    stop_rule: Stop.
  correlation_key: 002-invalid/implement/T001/3f9a2c1e
  ```

- [ ] T002 [US1] An agent that is not in the bundle

  ```yaml task-prompt
  objective: Show that an unknown agent is rejected.
  deliverable: Nothing; this task exists to fail.
  sizing:
    self_sufficient: true
  context:
    - specs/002-invalid/tasks.md
  fresh_session: true
  constraints:
    - None.
  do_not_modify:
    - dotnet/
  owned_files:
    - docs/notes.md
  agent: yolo-agent
  tier: cheap
  fallback_tier: standard
  acceptance:
    command: echo ok
    expect: ok
  execution: agent
  escalation:
    ladder: [self-heal]
    retry_budget: 1
    stop_rule: Stop.
  correlation_key: 002-invalid/implement/T002/3f9a2c1e
  ```

- [ ] T003 [US1] A check with no expected result and a link that does not resolve

  ```yaml task-prompt
  objective: Show that an acceptance check needs an expected result.
  deliverable: Nothing; this task exists to fail.
  sizing:
    self_sufficient: true
  context:
    - specs/002-invalid/missing-plan.md
  fresh_session: true
  constraints:
    - None.
  do_not_modify:
    - dotnet/
  owned_files:
    - docs/notes.md
  agent: task-executor
  tier: cheap
  fallback_tier: standard
  acceptance:
    command: dotnet test
  execution: agent
  escalation:
    ladder: [self-heal]
    retry_budget: 1
    stop_rule: Stop.
  correlation_key: 002-invalid/implement/T003/3f9a2c1e
  ```

- [ ] T004 [US1] A split with no named override, too many files, and a ladder step that does not exist

  ```yaml task-prompt
  objective: Show the sizing and execution rules.
  deliverable: Nothing; this task exists to fail.
  sizing:
    self_sufficient: true
  context:
    - specs/002-invalid/tasks.md
  fresh_session: true
  constraints:
    - None.
  do_not_modify:
    - dotnet/
  owned_files:
    - docs/a.md
    - docs/b.md
    - docs/c.md
    - docs/d.md
  agent: task-executor
  tier: cheap
  fallback_tier: standard
  acceptance:
    command: echo ok
    expect: ok
  execution: split
  escalation:
    ladder: [self-heal, try-harder]
    retry_budget: 5
    stop_rule: Stop.
  correlation_key: 002-invalid/implement/T004/{run}
  ```

- [ ] T005 [US1] No task prompt at all in `docs/missing.md`

## Phase N: Governance (contoso-sdd)

- [ ] G001 Governance tasks have no prompt and are not an error
