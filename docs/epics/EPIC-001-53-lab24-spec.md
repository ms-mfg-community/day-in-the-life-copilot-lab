# EPIC-001 / Issue #53 — The notification funnel and executable tasks (Lab 24)

| Field | Value |
|---|---|
| Parent epic | [EPIC-001 — Enterprise Agentic SDLC Harness](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Child issue | #53 — *Lab 24 — notification funnel and executable tasks (EPIC-001 U4)* |
| Depends on | #50 (Lab 21, lockdown test), #51 (Lab 22, bundle), #52 (Lab 23, `contoso-review` extension and stage IDs) |
| Consumed by | #54 (Lab 25 joins on the correlation key, stage events and approvals of record) |
| Branch | PR into `feature/epic-enterprise-harness`, never `main` |
| Stories | [EPIC-001-53-stories.md](EPIC-001-53-stories.md) |

> **Scope of #53.** Replace the `labs/lab24.md` stub with the full lab, and ship what it
> teaches: the gh-aw funnel, the task-as-prompt preset and its validator, the
> `contoso-sdlc` Spec Kit workflow, and a seeded fixture in which QA rejects. Suite
> integration (README rows and totals, `labs/setup.md`, Lab 20 chaining, Cost Budget
> sidebars) stays with #55.

---

## 1. Pins

Versions come from [`docs/_meta/registry.yaml`](../_meta/registry.yaml), not from this
document or the lab. Spec Kit stays on the pin #51 recorded. gh-aw compiles at the
registry's pinned release. Models are read from `registry.models` by tier at dispatch time,
so no model string is written into a task.

## 2. Acceptance criteria → artifacts

| # | Acceptance criterion (U4) | Where it is met |
|---|---|---|
| 1 | `taskstoissues` projects tasks; prerequisites documented | `labs/lab24.md` §24.6; `contoso-tasks/commands/speckit.taskstoissues.md` (append fragment) |
| 2 | Durable, cross-machine stage signal that carries the correlation key | `stage-events/<feature>.jsonl`, committed to the PR branch by `contoso-sdlc/scripts/record-stage.mjs`; lab §24.2 |
| 3 | gh-aw routes on stage transition; routing deterministic; every write a capped safe-output; workshop path `staged: true` | `.github/workflows/sdlc-funnel.md` (+ `.lock.yml`); `scripts/route.mjs` + `roles.json` + `CODEOWNERS`; lab §24.3 |
| 4 | Task-as-prompt format | `contoso-tasks/templates/tasks-task-prompt.md`; lab §24.4 field table; `specs/001-enrollment-cap/tasks.md` |
| 5 | Deterministic validator in CI on the PR that changes `tasks.md`, rejects without re-prompting | `contoso-sdlc/scripts/validate-tasks.mjs`; `.github/workflows/validate-task-prompts.yml`; `invalid/specs/002-invalid/tasks.md` (10 errors) |
| 6 | Caveat: per-task agent/model metadata is not native to Spec Kit; shipped as a DIY org preset | `contoso-tasks/preset.yml`; lab §24.4 and §24.11 |
| 7 | Native task format preserved | Preset strategy `append`; task lines keep `[ID] [P] [Story]`, phases and checkpoints; the prompt block sits under the line |
| 8 | Rework routing, classification, round cap, new task ID supersedes the old issue | lab §24.9; `qa-review.md` fixture (`classification: implementation`); T014 → T016 `supersedes: T014`; `contoso-tasks` taskstoissues fragment |
| 9 | Approval of record per gate, rejects counted from it; seeded QA reject | `scripts/approvals.mjs`; `approvals/pr-comments.json` → `approvals/approvals-of-record.json`; lab §24.8 |
| 10 | QA independence; `tools:` on `qa-review` | Lab 23 `speckit.contoso-review.qa-review.md` gains a provisional `tools:` list and spec/diff/tasks-only inputs; enforcement awaits A.3 item 7 / Q8 (#50); lab §24.10 |
| 11 | Ships `contoso-sdlc` with an optional `review-tasks` gate | `contoso-sdlc/workflow.yml` (19 top-level steps, `review-tasks` inside an `if`) |
| 12 | Stage → owner's surface | `roles.json`; lab §24.1 table |

All fixture paths are under `labs/fixtures/lab24/`.

## 3. Shared contract with Lab 25

Agreed with the #54 session, using the epic's Provenance definition.

- **Correlation key** `<feature>/<stage>/<task>/<run>`, e.g.
  `001-enrollment-cap/implement/T014/3f9a2c1e`. `task` is `-` for stage-level work; `run`
  is the eight-character lowercase hexadecimal Spec Kit run ID. All three scripts use
  Lab 25's exact regex:
  `^[0-9]{3}-[a-z0-9-]+\/[a-z-]+\/(-|T\d{3})\/[0-9a-f]{8}$`.
- **Stage event** (one JSON line in `stage-events/<feature>.jsonl`): `correlation_key`,
  `feature`, `stage`, `task`, `run_id`, `from_stage`, `transition`, `actor`, `at`,
  `artifact`, `artifact_sha` (git blob SHA, or null), `classification` (on rework), plus
  optional `issue` and `pr`.
- **Approval of record**: `correlation_key`, `gate`, `run_id`, `verdict`
  (`approve|reject`), `approver`, `artifact_sha`, `source` (`pr-review|comment`), `at`,
  optional `escalated_to`. A marker counts only if its key names the gate's stage with task
  `-` and the same run, the platform author of the comment or review is the `approver` and
  owns the gate in `roles.json`, `artifact_sha` is a blob SHA or null, and a PR review's
  state agrees with the verdict. The platform's author and timestamp win over the marker.
  The same decision posted twice (same key, gate, verdict, approver and `artifact_sha`)
  counts once, at its earliest time.
  `approvals-of-record.json` is a bare array of these records, exported by
  `approvals.mjs --count <input> --out <file>`. Invalid markers, counts and round-cap
  fields are printed separately on stdout.

## 4. Design decisions

1. **The trigger is a committed file, not Spec Kit state.** `.specify/workflows/runs/` is
   local and gitignored. A `push` on `stage-events/**` reaches every machine and every
   reviewer.
2. **Routing is a script, the agent only writes.** The funnel's pre-agent step runs
   `route.mjs` against the latest event and writes the result; the agent may only perform
   the writes that output names, under `max:` caps. A `--check` guard fails the job unless
   the agent's planned writes are exactly that set: one assignment, one project status, one
   comment that mentions only the routed user (or the escalation owner), and the exact
   reviewer set; a single `noop` when there is no target.
3. **The validator never calls a model.** It parses YAML, checks the registry and the
   bundle's agents, and resolves relative links. A failure blocks the PR. CI excludes the
   intentional Lab 24 invalid fixture and Lab 25's evidence stubs, not real task lists.
4. **Runs are stamped, not guessed.** Task prompts carry `{run}` until the workflow's
   `validate-tasks` step runs `--stamp-run`. An unstamped key is a validation error.
5. **`--dispatch` emits a plan, not a session.** It prints agent, tier, model and fallback
   from the registry; `human` tasks are refused.

## 5. Deviations and open questions

**Deviations from the epic's wording (deliberate):**

- The funnel routes on the **latest** event in the pushed file, not on every event in the
  push. A push carrying several events notifies once, for the current stage.
- `https://` context links are reported as warnings, not resolved. CI has no network
  contract for arbitrary hosts.
- `source: qa-review.md` is never emitted: QA's file is evidence, not an approval. The
  `review-qa` owner's PR review is the record.
- Stage events add `issue` and `pr` fields (additive; Lab 25 was told).
- The Lab 23 `qa-review` command is edited (provisional `tools:` and input restriction).
  The tools list's enforcement is not claimed verified while #50 / Q8 is open.
- A CI workflow, `validate-task-prompts.yml`, is added so "runs in CI" is literal.

**Open questions:**

- Spec Kit has releases newer than the pin. #53 does not move the pin; the weekly audit
  owns that.
- Q8 / A.3 item 7: whether `--yolo` overrides a managed tool allowlist (#50 is still open).
  The lab sets `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0` and presents both interim paths from
  Lab 21: managed `permissions.allow`, or explicit `--allow-tool` through
  `SPECKIT_INTEGRATION_COPILOT_EXTRA_ARGS`. Neither is claimed to resolve Q8.
- The `specify` CLI was not run live against `contoso-sdlc`; the workflow is checked
  structurally by tests and against the pinned engine source.
- A gate nested in an `if` is read from the engine source, not observed.
- Workflow inputs are quoted in the `shell` steps and `record-stage.mjs` validates the
  feature and task IDs, but Spec Kit substitutes `{{ inputs.* }}` textually. The operator
  supplies them locally, so this is their own trust boundary.
