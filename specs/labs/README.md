# `specs/labs/` — the per-lab working agreement

One lab at a time. Each lab is **two stories that close together**: a dev story that
changes the lab, and a QA story that proves it. The dev story cannot close until the QA
story closes it, the same way a sprint works.

## The artifacts a lab needs

| # | Artifact | Who writes it | Cost |
|---|---|---|---|
| 1 | `specs/labs/<lab>.md` | a person, from `_lab-template.md` | minutes |
| 2 | `tests/lab-structure/<lab>-contract.test.ts` | a person, from the lab10/12/13/14 pattern | minutes |
| 3 | the lab edit itself | `lab-forge`, one call | measured per run |

Read `specs/labs/lab10.md` and `tests/lab-structure/lab10-contract.test.ts` before writing
your first pair. They are the worked example, and they are deliberately small.

## The dev story

> **As the curriculum owner, I want `labs/<lab>.md` to be current and teachable, so that a
> learner following it in 2026 succeeds without a correction from the presenter.**
>
> **Done when:** `npx vitest run tests/lab-structure/<lab>-contract` is green, `npm test`
> is green, and `git status` shows only the lab, its spec, its contract test and any
> registry/AGENTS.md change the spec's §6 required.

Steps:

1. Write the spec from `_lab-template.md`. Its §3 acceptance criteria must each name the
   command that observes them, and its §4 must dispose of every outside-world claim as
   `free-check`, `cite F-nn`, `research`, or `cut`.
2. Write the contract test. **It must fail before the edit.** A test written after the
   edit proves nothing — it was fitted to what you already did.
3. Triage §4. Only a claim that is load-bearing *and* unsettleable by a free check earns a
   `spec-forge` run (`maxRounds: 2`). Most claims are `free-check` or `cut`.
4. One `lab-forge` call: `labPath`, `specPath`, `maxRounds: 2`, absolute paths with forward
   slashes, and a `scope` that restates the spec's §5 non-goals and §7 execution boundary.
   Skip this and run the edit by hand **only** if the spec's §2 declares write steps.

## The QA story

> **As the curriculum owner, I want an independent check that `labs/<lab>.md` actually
> changed what the spec said it would, so that a green test is not mistaken for a correct
> lab.**
>
> **Done when:** QA has re-derived the verdict from the spec rather than from the dev
> story's summary, and has either accepted or returned it with reproductions.

QA does not read the implementer's report first. It checks:

1. Every §3 acceptance criterion, by running the command named in the row — not by reading
   the diff.
2. Every §6 known defect, by looking at the location named and confirming it is gone.
3. That nothing in §5 non-goals moved.
4. That the contract test **would have failed** before the change — `git stash` the lab,
   run the test, confirm red, restore. A contract test that passes against the old lab is
   not a contract.
5. That `git status` is confined to the files the spec's scope allows.

QA closes the dev story. The dev story does not close itself.

## Roles

| Role | Model | Why |
|---|---|---|
| Spec + contract test author | a reasoning model | This is the judgement step: deciding what is `free-check` versus `research` is where money is saved or wasted. |
| Implementer | `claude-sonnet-5.5` / `gpt-6.1-sol` | The spec and the red test remove the ambiguity, so the work is mechanical. |
| QA | `lab-forge`'s own gate (Wayne + Hoid), then a person | Executable evidence, not opinion. |
| Judge | a reasoning model | Re-derives criteria from the spec; never sees the implementer's summary. |

## Stopping rules

- **One lab at a time.** Report credits and the verdict after each; wait for the go.
- **A `lab-forge` run carries `limits.maxAiCredits`.** A limit hit is resumable by raising
  it; an unbounded run is not recoverable money.
- **New ideas go to the plan's parked list.** They never reorder or enlarge the lab in hand.
- **If a stage fails twice for the same reason, stop and report.** Do not re-run hoping.

## Labs that `lab-forge` must not run

A lab whose spec §2 declares write steps — GitHub writes, global installs, GUI steps, or
**anything that mutates state outside the repository working tree**. Lab 10 is the warning:
a regex that looked only for GitHub writes and global installs called it safe, but it
creates, fills and deletes `~/.copilot/lessons/` in the maintainer's home directory. Read
the lab's commands; do not trust a keyword count.
