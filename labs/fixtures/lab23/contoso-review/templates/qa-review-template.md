# QA Review: [FEATURE NAME]

**Feature directory:** `[FEATURE_DIR]`
**Reviewed:** [YYYY-MM-DD]
**Reviewer:** [name, role, or agent]

## Verdict

**[approve | reject]**

> The gate that follows this review accepts only `approve` or `reject`. Rejection is
> matched on those words exactly — do not invent a third verdict such as "rework" or
> "changes requested". A gate configured with `on_reject` would read anything other
> than `reject`/`abort` as **approval** and let the run continue.

| Result | Count |
|---|---|
| Met | [n] |
| Partial | [n] |
| Unmet | [n] |
| Unverified | [n] |

**Any `unmet` or `unverified` makes the verdict `reject`.** "Unverified" is not a
softer "met" — it means nobody has evidence either way.

## Acceptance criteria

Structural criteria cite a file and line. Behavioural criteria cite a command that was
actually run and its observed output, or a test that asserts the behaviour, with the result
of running it.

| # | Criterion (from `spec.md`) | Result | Evidence |
|---|---|---|---|
| 1 | [structural criterion] | met / partial / unmet / unverified | `path/to/file.ts:42` |
| 2 | [behavioural criterion] | [...] | `[command]` → [observed output], or `[test command]` → passed (`path/to/file.test.ts:17`) |

## Task list check

Every task marked complete in `tasks.md` should have a corresponding change.

| Task ID | Marked | Evidence found | Note |
|---|---|---|---|
| [T001] | complete | yes / **no** | [...] |

## Findings

| # | Severity | Finding | Where | Suggested owner |
|---|---|---|---|---|
| 1 | blocking / should-fix / nit | [what is wrong] | `path:line` | [stage owner] |

## Rework routing

If the verdict is `reject`, name the stage the work returns to and what changes there.

- **Returns to:** [epic | specify | plan | tasks | implement]
- **What changes:** [the artifact that must be edited before the run resumes]
- **Re-run needed:** [which commands must be re-run, and what that regenerates]

> ⚠️ Rejecting the gate **pauses the run on the gate** — it does not rewind the
> workflow to an earlier stage. Make the change named above, then
> `specify workflow resume <run-id>` and answer the gate again.

> ⚠️ If the work returns to `epic`, `specify` or `plan`, resuming skips that stage's
> review gate. Get the changed artifact reviewed before you resume.
