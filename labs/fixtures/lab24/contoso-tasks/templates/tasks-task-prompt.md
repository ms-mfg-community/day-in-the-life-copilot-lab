## Task prompts (contoso-tasks)

Every `T` task is an executable prompt. Directly under each `- [ ] T### ...` line,
indented two spaces, add one fenced block whose info string is `yaml task-prompt`.
Do not add a block to `G` tasks; people check those.

A task passes the sizing test when one fresh session can finish it from the listed
context alone, with one deliverable and no more than three owned files. If it does
not pass, split it into more tasks before writing the block.

  ```yaml task-prompt
  objective: One sentence: what changes and why.
  deliverable: The single thing that exists when the task is done.
  sizing:
    self_sufficient: true
  context:
    - specs/[###-feature-name]/spec.md#requirements
    - specs/[###-feature-name]/plan.md
  fresh_session: true
  constraints:
    - What the agent must not do while doing it.
  do_not_modify:
    - path/or/directory/
  owned_files:
    - the/file/named/on/the/task/line.cs
  agent: task-executor
  tier: standard
  fallback_tier: premium
  acceptance:
    command: the command that proves it
    expect: what the command must show
  execution: agent
  escalation:
    ladder: [self-heal, redispatch, stage-owner, scope-change]
    retry_budget: 2
    stop_rule: When to stop trying and hand back.
  correlation_key: [###-feature-name]/implement/T###/{run}
  ```

Rules the validator enforces (it rejects, it never re-prompts):

- `agent` is one of the bundle manifest's agents.
- `tier` and `fallback_tier` are registry tiers (`cheap`, `standard`, `premium`),
  never a model name, and they differ.
- Every `context` path resolves. Every path in backticks on the task line is in
  `owned_files`. No owned file is also in `do_not_modify`.
- `execution` is `agent`, `split` or `human`. Anything but `agent` needs
  `override: {by: <login>, reason: <why>}`.
- `retry_budget` is 0 to 3.
- Leave `{run}` in `correlation_key`. The workflow stamps the Spec Kit run id.
- A rework task gets a new ID and `supersedes: T###`. Never reuse an ID.
