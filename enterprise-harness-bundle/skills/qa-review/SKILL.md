---
name: qa-review
description: Review approved work against its specification, tasks, diff, and executed evidence, then emit an approve or reject verdict.
---

# QA Review

Use this skill from the independent QA reviewer role. It binds to the
organization-owned `speckit.contoso-review.qa-review` stage planned for Labs 22
and 23 without copying that stage's rubric.

## Contract

- Inputs: approved specification, task list, current diff, and commands with
  their actual output.
- Output: a lowercase `approve` or `reject` verdict (matching Lab 23's
  `qa-review-template` gate contract) plus evidence-backed findings, the
  `qa-review-template` sections (`Verdict` count table, `Acceptance criteria`,
  `Task list check`, `Findings`, and `Rework routing`), and, on `reject`, a
  required `implementation` or `spec-scope` rework classification.
- Run evidence commands, such as the project's tests, with `execute`. Never use
  it to create, change, or delete a file.
- Write the verdict only through `qa-boundary/write_verdict`, which writes
  `<FEATURE_DIR>/qa-review.md` (validated to stay inside the repository root,
  resolving `<FEATURE_DIR>` from `featureDir`, `SPECIFY_FEATURE_DIRECTORY`,
  `.specify/feature.json`, or the repository root when `featureDir` is omitted);
  do not edit source files.

Keep a clean distinction between agent analysis, deterministic test results,
and the human decision to accept or merge the change. Do not modify the
implementation under review.
