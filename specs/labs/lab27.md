# Lab spec — `labs/lab27.md`

| | |
|---|---|
| **Lab** | `labs/lab27.md` — "Evaluating Agents, Skills, and Models with Vally and AgentEvals" |
| **Spec state** | `ready` |
| **Author** | Lab 27 authoring pass (Track 5, enterprise agentic SDLC harness arc) |
| **Last updated** | 2026-11-24 |

---

## 1. Target state

Lab 27 closes Track 5 with the one thing Labs 21–26 do not give a team: a gate that can fail.
After it, a learner can run ContosoUniversity's own agents, skills and a `preToolUse` guard hook
through Vally, grade the trajectories with small deterministic `program` graders they can read,
price a run in root-only AIU, and place the AgentEvals `EVAL.yaml` standard and OpenTelemetry
`gen_ai.evaluation.result` events beside it without mistaking the three things called "AgentEvals"
for one.

The single teaching idea: **a claim about an agent, a skill or a hook is only as good as the check
that can fail it.** The lab makes that concrete with the Hook Governance Gap: the README says the
hooks provide "force-push blocking", and no hook handles `git push` at all. Everything in the lab
runs offline and for free (Tier 0 and Tier 1); a live run (Tier 2) is an opt-in extra.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — the OS terminal (Node, the Vally CLI), one Copilot CLI prompt (§27.5), one VS Code edit (§27.6). No github.com step. |
| **Tier** | `advanced` |
| **Presenter minutes** | 8 |
| **Self-paced minutes** | 40 |
| **Prerequisites** | Lab 25 — §27.6 and §27.8 reuse its root-only AIU rule and its span tree (no hook span, `github.copilot.nano_aiu`). Lab 19 — §27.1 contrasts the qualitative drift scan with a deterministic gate. Lab 26 is arc continuity only, not a technical prerequisite. The `eval-harness` skill supplies the vocabulary (`[CAPABILITY EVAL]`, `pass@k`). |
| **Write steps** | See the list below. Every write is inside the repository working tree and git-ignored, except the two marked **outside the tree**. (1) `npm install -g @microsoft/vally-cli@<vally_cli_version>` — a global install, **outside the tree**. (2) The Vally CLI's first-run telemetry notice writes a sentinel under the home folder, **outside the tree**, unless the learner opts out with `VALLY_TELEMETRY_OPTOUT=1`, which the lab does before any `vally` command. (3) `vally eval --executor mock` writes `labs/fixtures/lab27/vally-results/`. (4) `scripts/run-evals.{sh,ps1}` runs a **live** `vally eval`: a real model call that spends AIU and needs a signed-in Copilot account, and writes the same folder. (5) Firing `pre-tool-guard.cjs` by hand appends `.vally-guard-audit.jsonl` in the folder it runs from. (6) The §27.6 exercise copies `eval.yaml` to `eval.broken.yaml` beside it. (7) The §27.5 prompt asks a live Copilot CLI session a question, which is a model call. Nothing writes to GitHub, and nothing edits tracked files. |
| **`lab-forge` verdict** | **`run with §7 fenced`** — write steps exist, every one is enumerated in §7, and the run gate reports them UNVERIFIED and executes none. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The lab obeys the three-surfaces contract: every step names its surface, sample output fences use `console`, no `🖥️`, no ambiguous "In your terminal" header, and `lab27` is in the governed lab set | `npx vitest run tests/lab-structure/three-surfaces-contract` |
| AC5 | Declared pacing agrees in three places: frontmatter `pace`, the inline `⏱️` callout, and `docs/_meta/registry.yaml` `labs.lab27` | `npx vitest run tests/lab-structure/lab27-contract` |
| AC6 | Every model identifier the lab names appears in the `models:` block of `docs/_meta/registry.yaml`, and the lab hardcodes no Vally version (it reads `vally_cli_version` from the registry) | `npx vitest run tests/lab-structure/lab27-contract` |
| AC7 | Every backticked repository path in the lab and in this spec resolves on disk | `npx vitest run tests/lab-structure/lab27-contract` |
| AC8 | The fixture runs offline with zero model calls: `self-check.cjs` exits `0` ending `self-check: 5/5 checks passed (0 model calls, 0 AIU)`, and `eval-cost.cjs` exits `0` on the recorded fixture with `Budget status: PASS` | `node labs/fixtures/lab27/evals/graders/self-check.cjs` and `node labs/fixtures/lab27/evals/graders/eval-cost.cjs labs/fixtures/lab27/evals/fixtures/recorded-results.jsonl` |
| AC9 | `.vally.yaml` and the four `eval.yaml` files carry the required keys, suites and graders, and every relative path in them resolves from the folder that governs it (the project file for `paths`/`params`; each `eval.yaml` for `files[].src` and `skills[]`) | `npx vitest run tests/lab-structure/lab27-contract`; with the pinned CLI installed, also `vally lint -e <spec> --strict` for each spec |
| AC10 | The guard hook denies `git push` and a hardcoded secret, stays silent otherwise, and writes its audit line; the repository's own hook configuration and scripts are untouched | `node labs/fixtures/lab27/evals/graders/self-check.cjs` and `git diff --exit-code .github/hooks/default.json scripts/hooks/` |
| AC11 | The AgentEvals bridge file uses top-level `assert:` (never `execution.evaluators`), demonstrates all seven headline evaluator types, and is excluded from Vally discovery by its case-sensitive filename | `npx vitest run tests/lab-structure/lab27-contract` |
| AC12 | The Track 5 range reads `Labs 21–27` in Labs 20–26, the blueprint and the README; Lab 26 links forward to Lab 27; the README table, counts and totals agree with the registry | `npx vitest run tests/lab-structure/lab27-contract tests/labs/lab-tracks` |
| AC13 | No host path, user name or personal agent name appears in the lab, this spec or the fixtures | `npx vitest run tests/lab-structure/lab27-contract` |
| AC14 | Tier 0 passes in one command, offline, in either shell | `powershell -NoProfile -ExecutionPolicy Bypass -File labs/fixtures/lab27/scripts/tier0.ps1` |

> AC5 asserts **agreement between the three places**, never that a particular number is correct.
> Per `specs/labs/README.md`, a pacing number may change without ceremony; only internal
> consistency has teeth.

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | The Vally CLI requires Node.js `>=22.15.0` | `free-check` | `npm view @microsoft/vally-cli engines`; the comment above `vally_cli_version` in `docs/_meta/registry.yaml` records it |
| C2 | The pinned release is the current `latest` | `free-check` | `npm view @microsoft/vally-cli dist-tags`, recorded with its date as `vally_cli_version_last_verified` in `docs/_meta/registry.yaml` |
| C3 | The pinned release rejects an unknown stimulus field and requires lowercase kebab-case grader names, so a spec that lints clean on one release can fail on another | `free-check` | `vally lint -e <spec>` with the pinned CLI on a copy of a spec that adds a stimulus field `foo` reports `[eval-load-error] ... unknown field 'foo'`, and on a copy whose grader is named in capitals reports `[invalid-grader-name]` |
| C4 | The lint rules `grading-file-src-agent-visible` and `regression-without-baseline` exist and behave as described | `free-check` | `vally lint -e labs/fixtures/lab27/evals/guards/no-unapproved-push/eval.yaml --strict` with the pinned CLI; the rule names are in the installed `@microsoft/vally` package |
| C5 | A `program` grader receives `EVALUATE_WORKSPACE` and `EVALUATE_GRADER_INPUT`, accepts only six `config` keys, reserves `EVALUATE_*`, and answers with one line of `GraderResult` JSON | `free-check` | `self-check.cjs` check 2 runs `tool-calls-issued.cjs` as a real program; Demo B (`vally grade`) grades it through Vally itself |
| C6 | `vally eval` exits `0` on failed verdicts unless `--require-pass` is passed | `free-check` | Demo D: `vally eval --suite pr-gate --executor mock`, then the same command with `--require-pass` |
| C7 | A suite's `filter` selects stimuli by merged eval and stimulus tags, so `pr-gate` runs five of six stimuli | `free-check` | Demo D prints `Running 2 of 3 stimuli (1 filtered by tags)` |
| C8 | Vally resolves `paths.*` from the project file and environment `files[].src` from the governing `eval.yaml`; parameter precedence is `--param`, then `eval.params.yaml`, then `.vally.yaml` | `free-check` | Demo B, Demo D and the lint commands all resolve the fixtures' relative paths; precedence is in the installed `@microsoft/vally` package, in its parameter resolver |
| C9 | The README claims "force-push blocking" and no hook handles `git push` | `free-check` | `grep -rniwE "push\|force-push" .github/hooks scripts/hooks`, as printed in §27.5 |
| C10 | A `preToolUse` hook reads `{ timestamp, cwd, toolName, toolArgs }` on stdin and denies with `{"permissionDecision":"deny","permissionDecisionReason":"..."}` | `free-check` | The repository's own `scripts/hooks/pre-tool-use-doc-blocker.sh` and `scripts/hooks/pre-tool-use-secret-scan.sh` use the same decision shape; `pre-tool-guard.cjs` is tested against it by `self-check.cjs` |
| C11 | Whether the live `copilot-sdk` executor loads a hook file staged in a trial workspace | `research` | **Unverified, and the lab says so.** Needs one authenticated live run of a guard eval. Fenced in §7. Until then the hook and grader are proven offline only. |
| C12 | AgentEvals: seven headline evaluator types and twelve in the reference; `assert:` supersedes `execution.evaluators`; no tagged release; the schema URL returns 404; `EntityProcess/agentv` archived 2026-10-16; `agentevals-dev/agentevals` is an unrelated OpenTelemetry-native Python tool | `research` | Public pages (https://agentevals.io, https://github.com/agentevals-dev/agentevals, https://github.com/EntityProcess/agentv), checked 2026-11-24 and dated in the header of `labs/fixtures/lab27/evals/agentevals/EVAL.yaml`. This is the least settled claim in the lab; re-check before a cohort. |
| C13 | `gen_ai.evaluation.result` carries `gen_ai.evaluation.name`, `gen_ai.evaluation.score.value`, `gen_ai.evaluation.score.label`, `gen_ai.response.id` and `error.type`; the explanation is off by default | `research` | Same public sources and date as C12. The lab marks §27.8 as a design bridge, not a runnable step. |
| C14 | Lab 25's span tree has a root `invoke_agent` carrying the turn's AIU, `chat` children, no hook span, and `1 AIU = 1e9 nano-AIU` | `free-check` | `labs/lab25.md` (span tree and attribute table); `eval-cost.cjs` computes the same conversion |
| C15 | The Vally CLI collects pseudonymous usage telemetry and the opt-out variables are `VALLY_TELEMETRY_OPTOUT` and `DO_NOT_TRACK` | `free-check` | The first-run notice the pinned CLI prints on stderr names both variables |
| C16 | `recorded-results.jsonl` is synthesized and illustrative | `free-check` | Its `metadata.executor` is `mock`; `eval-cost.cjs` prints a NOTE saying so |

## 5. Non-goals

- Do not change the repository's own `.github/hooks/default.json` or `scripts/hooks/*`. The lab
  **proves** the gap and ships a self-contained guard hook under `labs/fixtures/lab27/`; closing
  the gap in the repository's own hooks is a separate change.
- Do not make AgentEvals a runnable gate, add a Python dependency, or fetch its JSON Schema.
  `EVAL.yaml` is a reading-and-comparing bridge.
- Do not put a live (Tier 2) run on any default test, CI or `npm test` path. It is opt-in.
- Do not add a model identifier that is not in the registry's `models:` block, and do not hardcode
  the Vally version in lab prose. Read `vally_cli_version`.
- Do not use any personal agent, user name or host path anywhere. Every example targets
  ContosoUniversity's own `.github/agents/`, `.github/skills/` and `.github/hooks/`.
- Do not add a §27.11, renumber §27.0–§27.10, or add image files under `docs/images/labs/`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab26.md`, closing paragraph | Declared the arc complete at Lab 26 with no forward link. Fixed by this change: the Track 5 range is now 21–27 and the file ends with a `**Next:**` link to Lab 27. |
| D2 | `README.md`, the Hooks row of the repository-contents table | Claims "force-push blocking" and "build/format verification". No hook handles `git push`, and none runs a build. **Not fixed by this lab, by design:** Lab 27 documents and proves it (§27.5). |
| D3 | `labs/fixtures/lab27/evals/guards/hooks/pre-tool-guard.cjs` | The second secret pattern also denies a harmless `password = Environment.GetEnvironmentVariable(...)`. Accepted and documented in the hook header and in §27.5; tune before real use. |
| D4 | `labs/fixtures/lab27/evals/guards/*/eval.yaml` | `defaults.baseline` exists only to satisfy `vally lint --strict` for a `type: regression` eval; nothing reads it. Documented in the eval header and in §27.5. |

## 7. Out of scope for `lab-forge`

The run gate reports every item below as UNVERIFIED and executes none of them:

- `npm install -g @microsoft/vally-cli@<vally_cli_version>` — a global install, and the CLI's
  home-folder telemetry sentinel when the learner has not opted out.
- Any `vally eval` that does not pass `--executor mock`, and both
  `labs/fixtures/lab27/scripts/run-evals.sh` and `labs/fixtures/lab27/scripts/run-evals.ps1` — a
  real model call, AIU spend, and a signed-in Copilot account.
- The §27.5 Copilot CLI prompt — a live session and a model call.
- The §27.6 VS Code edit of `eval.broken.yaml` — a GUI step.
- Installing or running `agentevals-dev/agentevals` (`pip install agentevals-cli`) — not part of
  any step, and not run.
- The live-executor hook-loading question (C11).

What the run gate **can** execute, because it needs no credentials and no network: Tier 0
(`labs/fixtures/lab27/scripts/tier0.sh` or `labs/fixtures/lab27/scripts/tier0.ps1`), the
hook-by-hand commands in §27.5, and the contract test. Diff every file after the run, including
the root hook configuration and test files, so scope does not leak.
