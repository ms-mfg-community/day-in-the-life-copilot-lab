# `specs/` — the contract layer for Curriculum v2

A spec is the thing that stands between *an idea about what a lab should say* and
*a lab that says it*. Nothing in the execution phase starts without one.

## The rule

> **No lab is edited and no SPA code is written without a merged spec that covers it.**

This is not ceremony. The single biggest risk to this curriculum is teaching 2026 practice
from 2025 memory — agents, skills, prompt files, instruction precedence, CLI extensions,
plugins, MCP, gh-aw, memory and the model lineup have all moved. A spec is where a claim
has to survive a verifier before it can reach a learner.

## What a spec is

A spec is a **verified** description of a target state plus the observable criteria that
prove you reached it. Its load-bearing property is the verified-facts table: every factual
claim carries a primary-source URL, a publication date, and a verifier verdict.

A spec is **not** a plan, a task list, or a design document written from memory. If a claim
in a spec cannot be traced to a source, it belongs in **Open questions**, not in the body.

## Lifecycle

```
draft ──▶ researched ──▶ verified ──▶ reviewed ──▶ merged ──▶ executing ──▶ done
```

| State | Means | Gate to leave it |
|---|---|---|
| `draft` | Objective and non-goals written; no facts yet | Scope decomposed into researchable sub-questions |
| `researched` | Claims gathered, each with a URL and a date | Every claim has a candidate primary source |
| `verified` | Every claim graded by the verifier stage | No `UNVERIFIED` or `CONTRADICTED` claim remains in the body |
| `reviewed` | Adversarial review returned READY | Acceptance criteria re-derived from the objective, not from the author's checklist |
| `merged` | On the feature branch | Child-issue list populated |
| `executing` | Child issues open under the milestone | — |
| `done` | Every child issue closed, every acceptance criterion observed | — |

## Claim grades

The verifier stage assigns exactly one grade per claim. These are the only valid values.

| Grade | Meaning | May appear in a spec body? |
|---|---|---|
| `VERIFIED` | The cited primary source was opened and states the claim | Yes |
| `UNVERIFIED` | No primary source found, or the source could not be opened | **Open questions only** |
| `CONTRADICTED` | The primary source says something materially different | **Open questions only**, with the contradiction stated |
| `NO-SOURCE` | No published source exists on this point | **Open questions only** — and "no published guidance exists" is a finding, not a gap to fill |

A search-engine summary is a **lead, not a source**. The verifier opens the underlying page.

## Files

| File | Purpose |
|---|---|
| `_template.md` | The required section set. Copy it to start a spec. |
| `NNN-slug.md` | A spec. Numbered in creation order; the number never changes. |

## Naming

`NNN-slug.md`, zero-padded to three digits, lowercase hyphenated slug.
Numbers are allocated once and never reused, so a reference to `003` always means `003`.

## Non-negotiables

1. **Numbers are frozen.** A spec number, once allocated, is permanent — including for a
   spec that is later withdrawn. Withdraw it in place with a `Withdrawn` note; do not reuse.
2. **The verified-facts table is mandatory**, even when short. A spec with no factual claims
   says so explicitly rather than omitting the table.
3. **Acceptance criteria must be observable.** Each one is checkable by a named command or a
   named artifact. "The lab is clearer" is not a criterion; "`npm test` passes and every
   path referenced in `lab10.md` resolves on disk" is.
4. **Open questions are carried visibly.** A spec that resolves an open question by asserting
   an answer has failed at the only job that justifies its existence.
