---
name: orchestrator-rubric
description: |
  Rubric the orchestrator pane uses to judge each worker hand-off
  before approving the next phase. Pair with `scripts/orchestrator/`
  and Lab 14 (Orchestrator + tmux Pattern Deep-Dive).
applies_to: ["orchestrator", "qa", "code-reviewer"]
---

# Orchestrator Judging Rubric

You are the **orchestrator pane** in the Lab 14 tmux pattern. A worker
pane has just sent you a hand-off doc produced by
`scripts/orchestrator/handoff.sh`. Your job is to grade that hand-off
against this rubric **before** clearing the worker context and starting
the next phase.

Score each dimension `pass | partial | fail`. Decide:

- **PROMOTE** — all dimensions `pass` (or `partial` with explicit
  carry-forward note). Clear the worker, start the next phase.
- **BOUNCE** — at least one dimension is `fail`. Send the worker back
  with a targeted instruction; do **not** clear the worker context yet.
- **STOP-AND-ASK** — schema is intact but a stop-and-ask trigger from
  Lab 14 §14.6 fired. Surface to the human in the orchestrator pane.

## 1. Schema integrity

The hand-off doc MUST contain all five Lab 13 §B.2 sections:

- `phase` (frontmatter)
- `## inputs`
- `## outputs`
- `## open_questions`
- `## acceptance`

Empty bullets are allowed (rendered as `- _none_`); missing sections
are not. A missing section is an automatic `fail` — bounce.

## 2. Acceptance evidence

- Each `## acceptance` bullet must be testable. "Tests pass" is
  acceptable only if the doc names the test command actually run
  (e.g. `make test-all`, `npm test --silent -- --run`).
- If the worker claims tests pass, the hand-off must include the
  final summary line (e.g. `Tests 173 passed (173)`).
- A claim without evidence is `partial` at best.

## 3. Open-question discipline

- Every `## open_questions` bullet must either be answered in the
  next phase's `## inputs`, or explicitly carried forward in the
  orchestrator's plan.
- Unanswered questions accumulating across phases is the canonical
  signal for **STOP-AND-ASK**.

## 4. Scope hygiene

- Outputs must match the phase's planned scope. Drift (extra files,
  unrelated refactors, scope creep) is `fail` even if the work is
  good — bounce with "scope: trim to plan".
- Pre-existing-issue carry-forwards are allowed if logged in
  `## open_questions` with the lead `carry-forward:`.

## 5. TDD trail

- For any phase that ships code, the commit history visible to the
  orchestrator must show a RED commit (failing tests) **before** the
  GREEN implementation commit. A single squashed commit collapsing
  RED + GREEN is `partial` — note for next phase.

## 6. Token discipline (cross-ref `strategic-compact` skill)

- The hand-off doc itself should be ≤ ~120 lines. Anything larger is
  a signal the worker is doing the orchestrator's bookkeeping for it.
- If the worker pane reports approaching its context window, the
  orchestrator MUST clear it after promotion (do not skip
  `clear-context.sh` to "save a turn").

## Output shape

Reply in the orchestrator pane with:

```yaml
verdict: PROMOTE | BOUNCE | STOP-AND-ASK
scores:
  schema_integrity: pass | partial | fail
  acceptance_evidence: pass | partial | fail
  open_question_discipline: pass | partial | fail
  scope_hygiene: pass | partial | fail
  tdd_trail: pass | partial | fail
  token_discipline: pass | partial | fail
next_action: <one sentence — what the next pane should do>
carry_forward: [<bullet>, ...]   # may be empty
```

Then, and only then, run `scripts/orchestrator/clear-context.sh`
against the worker pane (or skip it if BOUNCE).
