# NNN — <title>

| | |
|---|---|
| **State** | `draft` \| `researched` \| `verified` \| `reviewed` \| `merged` \| `executing` \| `done` |
| **Created** | YYYY-MM-DD |
| **Last updated** | YYYY-MM-DD |
| **Milestone** | Curriculum v2 — Labs Refresh & Teaching SPA |
| **Depends on** | spec numbers that must be `merged` before this one starts, or `none` |
| **Executed by** | `spec-forge` \| `lab-forge` \| `dev-qa-judge` |

---

## 1. Objective and non-goals

### Objective
<One paragraph. What target state does this spec describe, and why does it matter to a
learner or a presenter? Written so someone with no other context can act on it.>

### Non-goals
<Explicit. What this spec deliberately does not cover, so scope cannot drift into it later.
Carry forward any standing exclusion that applies — for example, the
`feature/epic-enterprise-harness` arc (Labs 21–26) being out of scope.>

---

## 2. Acceptance criteria

Each criterion is **observable**: checkable by a named command or a named artifact.
A criterion no one can run is a wish, not a criterion.

| # | Criterion | How it is observed |
|---|---|---|
| AC1 | | `<command>` or `<artifact path>` |
| AC2 | | |

---

## 3. Verified facts

Every factual claim this spec relies on. **Mandatory** — a spec with no factual claims
states that explicitly rather than omitting the table.

A search-engine summary is a lead, not a source. The verifier opens the primary page.

| # | Claim | Primary source URL | Published | Verdict |
|---|---|---|---|---|
| F1 | | | YYYY-MM-DD | `VERIFIED` |
| F2 | | | | `UNVERIFIED` |

Verdicts: `VERIFIED` / `UNVERIFIED` / `CONTRADICTED` / `NO-SOURCE`.
Only `VERIFIED` claims may appear in the spec body. Everything else lives in §4.

---

## 4. Open questions

Anything `UNVERIFIED`, `CONTRADICTED`, or `NO-SOURCE`, carried visibly rather than resolved
by assertion. "No published guidance exists" is a finding and belongs here as one.

| # | Question | Why it is still open | Blocks |
|---|---|---|---|
| Q1 | | | AC_ / nothing |

---

## 5. Execution

| Stage | Agent | Contract — what it is given, what it must return |
|---|---|---|
| 1 | | |
| 2 | | |

**Loop:** `<name>`  **maxRounds:** `<n>`  **Escalates to:** John

---

## 6. Model assignment

Assignment is by **stage property**, not stage prestige.

| Stage | Model | Rationale |
|---|---|---|
| | `auto` | Divergent breadth, high volume, cheap to be wrong, output immediately checkable downstream |
| | `claude-opus-5` | Adversarial judgment, load-bearing, must hold large context, wrongness is expensive **and invisible** |

> Workflow-owned subagents are **not** subject to the `task`-tool sub-agent model gate —
> see `_decisions.md` D-2026-10-08-01. Per-stage model assignment inside a loop is free.

---

## 7. Child issues

The issues this spec generates. Created under the milestone **after** the spec is `reviewed`.
Scope comes from this list and nowhere else; anything added mid-flight needs a spec amendment.

| # | Title | Labels | Depends on |
|---|---|---|---|
| 1 | | | |

---

## Changelog

| Date | Change |
|---|---|
| YYYY-MM-DD | Created |
