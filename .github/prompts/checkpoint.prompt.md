---
description: "Create, verify, or list workflow checkpoints using git stash/commit markers"
agent: "agent"
argument-hint: "create|verify|list [name]"
---

# Checkpoint Command

Create or verify a checkpoint in your workflow.

## Create Checkpoint

When creating a checkpoint:

1. Run verification to ensure current state is clean
2. Create a git stash or commit with checkpoint name
3. Log checkpoint to `.github/checkpoints.log`:

```bash
echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .github/checkpoints.log
```

4. Report checkpoint created

## Verify Checkpoint

When verifying against a checkpoint:

1. Read checkpoint from log
2. Compare current state to checkpoint:
   - Files added since checkpoint
   - Files modified since checkpoint
   - Test pass rate now vs then
   - Coverage now vs then

3. Report:
```
CHECKPOINT COMPARISON: $NAME
============================
Files changed: X
Tests: +Y passed / -Z failed
Coverage: +X% / -Y%
Build: [PASS/FAIL]
```

## List Checkpoints

Show all checkpoints with:
- Name
- Timestamp
- Git SHA
- Status (current, behind, ahead)

## Workflow

Typical checkpoint flow:

```
[Start] --> checkpoint create "feature-start"
   |
[Implement] --> checkpoint create "core-done"
   |
[Test] --> checkpoint verify "core-done"
   |
[Refactor] --> checkpoint create "refactor-done"
   |
[PR] --> checkpoint verify "feature-start"
```

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, describe the task directly.
