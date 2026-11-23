---
name: task-execution
description: Implement approved tasks with traceability and deterministic verification.
---

# Task Execution

Use this skill to implement a bounded, approved change.

## Work pattern

1. Map each task to an acceptance criterion and its actual prerequisites.
2. Make small changes that follow repository instructions and existing patterns.
3. Add focused tests for expected behavior and relevant failure cases.
4. Run deterministic checks; record failures and environment blockers accurately.
5. Hand the diff and evidence to QA or a human reviewer.

Do not expand scope, claim a test passed when it was not run, or replace human
approval with agent output. Skip a stage when the existing issue, code, or test
evidence already supplies what is needed.
