---
description: "Review an implemented feature against its spec and record a verdict"
---

# QA Review

Review an implemented feature **against its own spec** and record a verdict that a
human gate can act on. This runs after `speckit.implement`, which the base workflow
otherwise ends on with no review at all.

The output is a single file at `<FEATURE_DIR>/qa-review.md`.

## User Input

```text
$ARGUMENTS
```

## Steps

1. **Locate the feature.** Run the prerequisite check for **your platform** — `specify init`
   installs the script set matching your shell, so only one of these two will exist:

   ```bash
   .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
   ```

   ```powershell
   .specify\scripts\powershell\check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks
   ```

   This resolves `FEATURE_DIR` and `AVAILABLE_DOCS`, and **fails when `tasks.md` does
   not exist** — which is the point: there is nothing to QA before implementation has
   a task list. The feature comes from `.specify/feature.json`, not from the checked-out
   Git branch.

2. **Read the artifacts** in `FEATURE_DIR`: `spec.md`, `plan.md`, `tasks.md`, and any
   checklists. Read the spec **last-to-first against the implementation**, not the
   other way round — you are checking whether what was built matches what was
   specified, not whether what was specified is plausible.

3. **Check each acceptance criterion in the spec** and mark it `met`, `partial` or
   `unmet`, with the file and line that settles it. A criterion you cannot trace to
   evidence is `unverified`, which is **not** the same as `met`.

4. **Check the task list** — every task marked complete should have a corresponding
   change. A completed task with no evidence is a finding.

5. **Write the verdict** into `<FEATURE_DIR>/qa-review.md` using the
   `qa-review-template`. The verdict is one of:

   - **`approve`** — every criterion is met or has a written, accepted deviation.
   - **`reject`** — at least one criterion is unmet, or at least one is unverified.

6. **Report** the verdict, the counts, and the path — then stop. The human gate that
   follows this step is what actually decides; this command produces the evidence it
   decides on.

## Notes

- **Do not fix what you find.** This command is read-only with respect to source. It
  records findings so the gate has something to act on; the rework happens after the
  gate, not inside this command.
- A `reject` verdict is not a failure of the workflow — it is the workflow working.
