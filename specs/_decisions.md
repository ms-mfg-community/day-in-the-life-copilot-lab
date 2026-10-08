# Decision log — Curriculum v2

Append-only. Newest last. One entry per decision that constrains later work.
Never edit a past entry; supersede it with a new one that names what it replaces.

**ID format:** `D-YYYY-MM-DD-NN`, allocated in order on the day it is taken.

---

## D-2026-10-08-01 — Workflow-owned subagents bypass the sub-agent model gate

**Decision:** Loops may assign a model per stage freely. No stage needs to omit `model`,
and no loop-running session needs `COPILOT_ALLOW_SUBAGENT_MODEL=1`.

**Why this was in question.** `~/.copilot/hooks/scripts/pre-tool.sh` denies a `task`
dispatch that names any model other than `claude-opus-5` unless
`COPILOT_ALLOW_SUBAGENT_MODEL=1` is in the CLI's launch environment. The model strategy
deliberately assigns `auto` to several loop stages, so if a dynamic workflow's subagent
dispatch hit that same gate, every one of those stages would have failed. Plan §0.6
required this be determined empirically, not assumed.

**How it was determined.** Two independent lines of evidence, 2026-10-08, CLI 1.0.95-0.

*1 — Static.* The hook's guard is a `case "$TOOL"` whose model-gate arm matches the literal
tool name `task`. Unit-tested through Git bash against crafted payloads:

| Payload | Decision |
|---|---|
| `toolName:"task"` + `model:"claude-haiku-4.5"` | **deny** |
| `toolName:"task"` + `model:"claude-opus-5"` | allow |
| `toolName:"task"`, no `model` key | allow |
| `toolName:"run_dynamic_workflow"` + `model:"claude-haiku-4.5"` | allow |
| `toolName:"agent"` + `model:"claude-haiku-4.5"` | allow |
| no `toolName` + `model:"claude-haiku-4.5"` | allow |

*2 — Live.* A throwaway workflow `probe-model-gate`
(run `08274bae-5064-4807-9354-7f680d083167`, 4 subagents, 76 AI credits) dispatched four
subagents via `ctx.agent()` and required each to return a sentinel under a schema:

| Variant | `model` | Dispatched | Sentinel returned |
|---|---|---|---|
| control | *(omitted)* | yes | yes |
| pinned | `claude-opus-5` | yes | yes |
| non-pinned | `claude-haiku-4.5` | yes | yes |
| non-pinned | `gpt-5-mini` | yes | yes |

*3 — Mechanism.* `pre-tool.sh` was temporarily instrumented to append every tool name it
received to a trace file, gated on a flag file (the hook inherits the CLI's launch
environment, which cannot be altered mid-session, so an env-var toggle was not available).
Across the probe window the hook was invoked **7** times: 6 × `powershell` (this session's
own commands) and 1 × `run_dynamic_workflow` (the workflow launch). It was invoked
**zero** times for the four subagent dispatches.

So the gate does not fire because **`preToolUse` is never raised for a workflow-owned
subagent at all** — the dispatch does not traverse the tool-call path the hook observes.
This is structural, not a model-specific allowance.

The instrumentation was reverted and the file verified byte-identical to its original
(SHA-256 `313B9CFC4A8007030A4EFBBAB07EF240AC525E605AEC004BFA0745A077EA4D1B`); the hook's
own regression suite passed 108/108 while instrumented.

**Consequence.** Plan §0.6 outcome 2. Per-stage model assignment in `spec-forge` and
`lab-forge` is unconstrained. The `task`-tool gate remains fully active for ordinary
sub-agent dispatches and is unchanged.

**Open item for John — this is a gap in a control you rely on.** The `task` gate exists to
stop a session silently downgrading a sub-agent. A dispatch routed through a dynamic
workflow is not subject to it. That is fine for these loops, where the model choice is
deliberate and written down, but it means the gate is a guard on *one* dispatch path rather
than on sub-agent model selection as such. Worth a note in `~/.copilot/hooks/README.md`.
Not actioned here: editing that file was not in this session's scope.

---

## D-2026-10-08-02 — `feature/curriculum-v2` is cut from `origin/main`, not local `main`

**Decision:** The feature branch bases on `origin/main` (`beb1157`), per plan §0.1 and the
session brief.

**The wrinkle, surfaced rather than decided.** At branch time, local `main` was one commit
*ahead* of `origin/main`: `e0f9f6e docs: list only the development agents that exist`
(johnhain-msft, 2026-10-08 15:51 -0400), which corrects `AGENTS.md` from nine named agents
to the three that exist in `.github/agents/` and adds the missing `agentic-workflows`.

That commit is unpushed, in scope subject-wise (docs accuracy is exactly what this effort is
about), and authored by John — so it is not obviously covered by the "source of truth is
`origin/main` only" rule, whose purpose is excluding the `feature/epic-enterprise-harness`
arc (D2 in the plan), not excluding John's own unpushed work.

Followed the explicit instruction rather than reinterpreting it. **Flagged for John's call:**
rebase `feature/curriculum-v2` onto `e0f9f6e`, or leave it and let that commit arrive when
`main` is pushed. Either is a one-command fix now and gets more expensive later.

---

## D-2026-10-08-03 — `dev-qa-judge` is reused unchanged for the SPA track

**Decision:** No fourth loop. The SPA build track runs the existing `dev-qa-judge` workflow
as-is; the `slide-review` and `deck-standards` gates are supplied as **judge inputs**, not
rebuilt as a parallel loop.

**Rationale.** `dev-qa-judge` already enforces the property the SPA track needs — the QA and
judge stages never see the developer's summary or test claims, so a pass is only reported
when the workflow read it from the reviewer itself. Duplicating that to bolt on two deck
gates would copy the hard part to change the easy part.

---
