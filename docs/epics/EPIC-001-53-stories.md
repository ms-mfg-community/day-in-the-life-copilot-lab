# EPIC-001 / Issue #53 — Stories (dev and QA)

The [spec](EPIC-001-53-lab24-spec.md) says *what* ships and *why*. This file says who
builds each piece and what must be true before it closes.

| Field | Value |
|---|---|
| Parent epic | [EPIC-001](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Story | #53 — *Lab 24 — notification funnel and executable tasks (EPIC-001 U4)* |
| Plan | [EPIC-001-53-lab24-spec.md](EPIC-001-53-lab24-spec.md) |
| Stories | Four — two dev, two QA |

## 1. The stories

| Story | Type | Title | Closed by |
|---|---|---|---|
| 53.1 | Dev | Build the artifacts: router, funnel, preset, validator, `contoso-sdlc`, fixtures | 53.2 |
| 53.2 | QA | Verify the artifacts with `tests/lab24/` and the pinned sources | — (closes 53.1) |
| 53.3 | Dev | Write `labs/lab24.md` against the shipped artifacts | 53.4 |
| 53.4 | QA | Review the branch against the U4 acceptance criteria; CI green on the PR | — (closes 53.3) |

```text
53.1 Dev ──▶ 53.2 QA ──PASS──▶ 53.3 Dev ──▶ 53.4 QA ──PASS──▶ coordinator merges into feature/epic-enterprise-harness
```

The artifacts come before the lab so every command in the lab runs against a real file.

## 2. Definition of done

**53.1**

- `route.mjs` gives the same route for the fixture every time, and `--check` rejects any
  agent write that differs from it.
- `gh aw compile sdlc-funnel --strict` at the pinned gh-aw compiles cleanly; the lock is committed;
  no other lock or `actions-lock.json` churn.
- `validate-tasks.mjs` passes `specs/001-enrollment-cap/tasks.md` and fails
  `invalid/specs/002-invalid/tasks.md` with exactly ten errors, exit code 1, no model call.
- `approvals.mjs --count ... --out approvals/approvals-of-record.json` reproduces the
  bare array from `approvals/pr-comments.json`, including one QA reject. Counts, invalid
  markers and round-cap fields stay on stdout.
- Every `artifact_sha` in `stage-events/001-enrollment-cap.jsonl` equals
  `git hash-object` of its artifact.

**53.2** — `npx vitest run tests/lab24` green; the workflow's step and gate IDs match
Lab 23.

**53.3** — Every U4 acceptance criterion maps to a section (spec §2). The DIY caveat and the
honest caveats are stated. No Spec Kit or gh-aw version is hardcoded in prose.

**53.4** — `tests/lab-structure`, `tests/meta`, `tests/content-currency` and
`tests/workflows` green locally. CI's Vitest, Node and .NET jobs are green on the PR.

## 3. Out of scope

README lab rows and totals, `labs/setup.md`, Lab 20 chaining and Cost Budget sidebars (#55).
`labs/lab25.md` (#54). `labs/lab26.md` (#68/#69).
