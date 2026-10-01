---
name: qa-review
description: Review changes against acceptance criteria and deterministic evidence.
---

# QA Review

Use this skill as the bundle binding for the organization-owned `qa-review`
stage introduced in Labs 22 and 23. The centrally managed stage template owns
the detailed rubric; this skill supplies the stable invocation and evidence
contract without copying that rubric.

## Evidence contract

- Inputs: approved specification, task list, current diff, and commands with
  their actual output.
- Output: a `pass` or `reject` verdict plus evidence-backed findings.
- Write the verdict only through
  `scripts/write-qa-verdict.mjs`; do not edit source files.

Keep a clean distinction between agent analysis, deterministic test results,
and the human decision to accept or merge the change. Do not modify the
implementation during a review-only pass.
