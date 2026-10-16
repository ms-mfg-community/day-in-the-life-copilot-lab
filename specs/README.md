# `specs/` — the contract layer for Curriculum v2

A spec is the thing that stands between *an idea about what a lab should say* and
*a lab that says it*. Nothing in the execution phase starts without one.

## The rule

There are **two** kinds of spec here, and conflating them is what stalled this effort once
already.

| | Research spec | Lab spec |
|---|---|---|
| Lives at | `001-research-sota/<topic>.md` | `labs/<lab-file-stem>.md` |
| Answers | "what is actually true about the outside world?" | "what must this lab become, and how do we observe it?" |
| Written by | a `spec-forge` run | a person, by hand, from `labs/_lab-template.md` |
| Costs | thousands of credits | minutes |
| Required? | **only when a lab depends on a claim nothing free can settle** | **always, before `lab-forge` touches the lab** |

> **A lab spec is mandatory.** `lab-forge` refuses to start without a `specPath`
> (`loop.mjs:650` — *"lab-forge applies a spec, it does not invent changes"*), and its
> editing, execution, teachability and judge stages each re-derive what "done" means from
> that file. Editing a lab without one does not skip ceremony; it skips the loop, and puts
> the work back into an unmanaged session.

> **A research spec is conditional.** Commission one only when a lab asserts something
> about current product behaviour that none of the free checks below can settle *and* the
> lab genuinely depends on it. If the claim is incidental, cut the sentence — that is free,
> and usually better teaching.

The free checks, in order, before any research is commissioned:

1. `npm test` — structure, currency, registry consumption, pacing.
2. Every path the lab references resolves on disk.
3. Every version matches `docs/_meta/registry.yaml`, and the lab links to the registry
   rather than hardcoding the value.
4. Every command names a tool that exists, with flags that exist.
5. Declared counts — agents, skills, prompts, labs — match reality.

### Why this replaced an absolute gate

The original rule was *"No lab is edited and no SPA code is written without a merged spec
that covers it."* It was aimed at a real risk — teaching 2026 practice from 2025 memory —
but it meant *research* spec, so it priced every lab edit at thousands of credits. Twelve
commits produced zero lab edits. A gate that nothing passes protects nothing. Separating
the cheap mandatory contract from the expensive conditional research keeps the
verification and drops the toll.

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
| `_template.md` | The **research**-spec section set. Copy it to start a research spec. |
| `labs/_lab-template.md` | The **lab**-spec section set. Copy it to start a lab spec. |
| `NNN-slug.md` | A research spec. Numbered in creation order; the number never changes. |
| `labs/<lab>.md` | A lab spec. Named for the lab file it governs, not numbered. |
| `labs/lab10.md` | The worked example. Read this before writing your first lab spec. |

### Withdrawn

| Spec | Why |
|---|---|
| `002-curriculum-architecture` | The retire-and-merge map is a set of hypotheses about overlapping labs. No published source can settle them; you find out by reading the two labs. Tracked as parked work, not research. |
| `003-lab-refresh-standard` | The standard is whatever the first refreshed lab turns out to need, lifted afterwards. Most of what it would specify is already enforced by `npm test`. |
| `004-memory-lab` | A spec for a single lab whose research (`001-research-sota/memory.md`) already exists and can be cited directly. Writing it is writing the lab twice. |

Numbers stay frozen: these are withdrawn in place and are never reused.

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
