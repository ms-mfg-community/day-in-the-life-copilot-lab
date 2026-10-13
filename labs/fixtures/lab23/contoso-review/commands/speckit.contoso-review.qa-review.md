---
description: "Review an implemented feature against its spec and record a verdict"
# Added in Lab 24. A tools list limits what QA can see; it does not approve
# anything, and under Spec Kit's default `--yolo` it is the only limit (Lab 21, Q8).
tools: ['read', 'search', 'execute', 'edit']
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

2. **Read the artifacts** in `FEATURE_DIR`: `spec.md`, `tasks.md`, and the diff
   (`git diff` against the feature's base branch). Those three are QA's only inputs.
   Do **not** read the implementer's summary, chat transcript or PR description: QA
   that starts from the implementer's account of the work tends to confirm it.
   Read the spec **last-to-first against the implementation**, not the
   other way round — you are checking whether what was built matches what was
   specified, not whether what was specified is plausible.

3. **Check each acceptance criterion in the spec** and mark it `met`, `partial` or
   `unmet`, with the evidence that settles it. The kind of evidence depends on the
   criterion:

   - A **structural** criterion (a file, field, route or setting exists) is settled by
     the file and line.
   - A **behavioural** criterion (something happens when the code runs) is settled only
     by a command you actually ran plus the output you observed, or by a test that
     asserts that behaviour and that you ran, with its result. A file and line proves the
     code (or the test) exists, not that it works.

   A criterion you cannot trace to evidence of the right kind is `unverified`, which is
   **not** the same as `met`.

4. **Check the task list** — every task marked complete should have a corresponding
   change. A completed task with no evidence is a finding.

5. **Write the verdict** into `<FEATURE_DIR>/qa-review.md` using the
   `qa-review-template`. The verdict is one of:

   - **`approve`** — every criterion is met or has a written, accepted deviation.
   - **`reject`** — at least one criterion is unmet, or at least one is unverified.

   On `reject`, also record a **classification** (Lab 24 routes on it):

   - **`implementation`** — the fix fits inside the current spec and plan.
   - **`spec-scope`** — the fix needs the spec, plan or scope to change.

6. **Report** the verdict, the counts, and the path — then stop. The human gate that
   follows this step is what actually decides; this command produces the evidence it
   decides on.

## Notes

- **Do not fix what you find.** This command is read-only with respect to source. It
  records findings so the gate has something to act on; the rework happens after the
  gate, not inside this command.
- A `reject` verdict is not a failure of the workflow — it is the workflow working.
