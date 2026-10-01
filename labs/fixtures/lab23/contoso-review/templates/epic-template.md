# Epic: [EPIC NAME]

**Slug:** `[slug]`
**Owner:** [name or role]
**Created:** [YYYY-MM-DD]
**Status:** Draft | Approved | Closed

## Why

[Two or three sentences. What business or engineering outcome does this epic exist to
produce? If this section could be pasted under a different epic without editing, it is
not specific enough.]

## What "done" looks like

[A short paragraph describing the end state, in the present tense, as if it already
shipped.]

## Acceptance signals

Observable outcomes, not activities. Each signal flows into the acceptance criteria of the
spec that delivers it, and that is where `qa-review` checks it: QA reads a feature's spec,
never this epic. A signal that no spec carries is checked by no one, so check the whole
table once more before you close the epic.

| # | Signal | How we observe it |
|---|---|---|
| 1 | [outcome] | [the command, dashboard, or artifact that settles it] |
| 2 | [outcome] | [...] |
| 3 | [outcome] | [...] |

## Out of scope

Name at least two things this epic is deliberately **not** doing. This is the section
that stops the specs underneath it from growing sideways.

- [non-goal]
- [non-goal]

## Specs under this epic

| Spec | Feature directory | Status |
|---|---|---|
| [name] | `specs/[nnn-slug]/` | Not started |

## Open questions

[Anything that must be answered before a spec is written. An epic with unanswered
blocking questions should not pass its review gate.]

- [ ] [question]

## Decision log

| Date | Decision | Why |
|---|---|---|
| [YYYY-MM-DD] | [what was decided] | [what it rules out] |
