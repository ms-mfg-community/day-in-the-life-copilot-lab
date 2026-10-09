---
name: qa-review
description: Review approved work against its specification, tasks, diff, and executed evidence, then emit a pass or reject verdict.
---

# QA Review

Use this skill from the independent QA reviewer role. It binds to the
organization-owned `speckit.contoso-review.qa-review` stage planned for Labs 22
and 23 without copying that stage's rubric.

## Contract

- Inputs: approved specification, task list, current diff, and commands with
  their actual output.
- Output: a `pass` or `reject` verdict plus evidence-backed findings.
- Run evidence commands, such as the project's tests, with `execute`. Never use
  it to create, change, or delete a file.
- Write the verdict only through `qa-boundary/write_verdict`, which writes
  `qa-review.md`; do not edit source files.

Keep a clean distinction between agent analysis, deterministic test results,
and the human decision to accept or merge the change. Do not modify the
implementation under review.
