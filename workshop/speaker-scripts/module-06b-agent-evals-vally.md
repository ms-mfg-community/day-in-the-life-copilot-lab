---
module: M6b
title: "Evaluating Agents, Skills & Models — speaker script"
slide_source: workshop/slides/65-module-6b-agent-evals-vally.md
minutes: 15
phase: 3c
---

# M6b — Speaker script (evaluation capstone)

Target audience: senior engineers and platform leads who have already built custom agents (`.github/agents/`), skills (`.github/skills/`), hooks (`.github/hooks/default.json`), and OpenTelemetry pipelines (`labs/lab25.md`) and now need deterministic and multi-trial evaluation gates before merging agentic changes.

## 1. Open with the advanced problem

Open on slide 65 (`## The advanced problem`) and adjust the `#m6b-eval-cost-chart` sliders once to show how live multi-trial stimuli scale token and AIU consumption compared with the free Tier 0–1 checks, which cost nothing however often you run them.

**Verbatim hook (~90 seconds):**

> "In Lab 19 we built `.github/workflows/self-improving-agents.md` to scan `.github/agents/` and `.github/skills/` for qualitative drift and open a human-reviewed draft PR. And in `.github/skills/eval-harness/SKILL.md` we have markdown templates for `[CAPABILITY EVAL]` and `[REGRESSION EVAL]` with `pass@k` and `pass^k` formulas — but no executable runner.
>
> The moment someone edits `code-reviewer`, `dotnet-testing`, or `.github/hooks/default.json`, markdown prose cannot tell you whether the agent still dispatches the right reviewer, whether a `preToolUse` guard actually blocked `git push`, or whether a new model doubled your AIU burn. In M6b we close that loop with Vally, the declarative AgentEvals `EVAL.yaml` format, and OpenTelemetry `gen_ai.evaluation.result` events."

Anchor labs: `labs/lab27.md` and `labs/lab19.md`. Harness fixtures: `labs/fixtures/lab27/`.

## 2. Demo script

**Copilot CLI only.** All files exist in the repo under `labs/fixtures/lab27/`.

**Say the tiers exactly as Lab 27 §27.0 defines them (the tier-boundary screen, about 1.5 min).** Tier 0 is `self-check.cjs` and `eval-cost.cjs`: Node.js 18 or newer, nothing to install. Tier 1 adds `vally lint`, `vally grade` and a `mock`-executor `vally eval`: Node.js `>=22.15.0` and the Vally CLI at the registry's pinned `vally_cli_version`. Both are free, with 0 model calls and 0 AIU. Tier 2 is a live `vally eval` through `run-evals.sh` or `run-evals.ps1` (the built-in `copilot-sdk` executor, one isolated trial workspace per stimulus and trial): it needs a signed-in Copilot account and spends AIU. So "free" always means Tier 0 or 1 and "billable" always means Tier 2. Then walk the diagram top band to bottom: Tiers 0–1 run on every edit and pull request, and Tier 2 runs when prompts, models or guard hooks change.

### Demo A (Tier 0) — Zero-model-cost grader self-check (~3 min)

Show learners that custom `program` graders (`tool-calls-issued.cjs`, `guarded-commands.cjs`, `eval-cost.cjs`) are deterministic code with their own zero-AIU unit test suite (`self-check.cjs`). Run from the repository root:

```text
node labs/fixtures/lab27/evals/graders/self-check.cjs
```

Point out two details while the output is on screen:
- `tool-calls-issued.cjs` grades `tool_call` and `skill_activation` events in `Trajectory.events` when issued rather than waiting for `tool_result`, so a subagent dispatch (`code-reviewer`, `planner`) or a skill trigger (`dotnet-testing`, `eval-harness`) that hits a duration cap is still caught accurately.
- Every check runs offline with `0` model calls and `0` AIU. The last line reads `self-check: 5/5 checks passed (0 model calls, 0 AIU)`.

### Demo B (Tier 1) — Offline trajectory re-grading with `vally grade` (~4 min)

Walk the evaluation pipeline & tier boundary diagram from slide 65 (`Stimulus -> Executor -> Trajectory -> Graders -> Score`). Then re-grade the frozen trajectory `labs/fixtures/lab27/evals/fixtures/recorded-results.jsonl` against `evals/hermetic/reviewer-routing/eval.yaml` from `labs/fixtures/lab27`:

```text
cd labs/fixtures/lab27
vally grade --eval-spec evals/hermetic/reviewer-routing/eval.yaml --workspace . --require-pass < evals/fixtures/recorded-results.jsonl
cd ../../..
```

Say what you will see before it appears: three `━━━` blocks, each ending `Score: 100.0% | PASSED (threshold: 100.0%)`. Then highlight the two flags:
- `--workspace .` points file-based graders at a real folder and overrides the workspace path recorded in every trajectory (`/workspace/contoso-university`). Vally prints `Warning: --workspace applied to all 3 input trajectories` because it applies that one folder to all three; the warning is expected here. These program graders read only the trajectory, so they would pass without the flag too.
- Without `--require-pass`, a `FAILED` verdict still exits `0` (errors always exit non-zero). `--require-pass` makes a failing verdict exit `1`, which is what a CI gate needs.

The fixture is synthesized and illustrative, run through Vally's `mock` executor; say so out loud.

### Demo C (Tier 0) — Root-only AIU cost & OTel trace evaluation (~3.5 min)

Run the offline cost script from the repository root against the recorded trajectory fixture:

```text
node labs/fixtures/lab27/evals/graders/eval-cost.cjs labs/fixtures/lab27/evals/fixtures/recorded-results.jsonl
```

The last line is `Total root-only AIU: 2.93 AIU | Budget status: PASS`; the figures are illustrative, not a benchmark. Connect the output back to `labs/lab25.md` and `labs/fixtures/lab27/evals/agentevals/EVAL.yaml`:
- In Lab 25's Copilot CLI OpenTelemetry span tree, every `chat <model>` child span carries `github.copilot.nano_aiu` (`1 AIU = 1e9 nano AIU`) that the root `invoke_agent` span already totals — summing every span double-counts AIU by `2×`, so `eval-cost.cjs` sums root `invoke_agent` spans only. The script prints the naive figure next to the real one.
- Contrast Vally's `eval.yaml` with `labs/fixtures/lab27/evals/agentevals/EVAL.yaml` (`agentevals.io` v1.0 declarative format using top-level `assert:` and `tests:`) and `agentevals-dev/agentevals` (`pip install agentevals-cli`), which scores recorded OTLP traces and emits `gen_ai.evaluation.result` log events (`gen_ai.evaluation.name`, `gen_ai.evaluation.score.value`, `gen_ai.evaluation.score.label`, `gen_ai.response.id`) attached to the evaluated turn's span. Nothing in Lab 27 runs `EVAL.yaml` or emits those events; the lab shows the bridge, so say "can attach", never "does attach".

## 3. Timing cues

<!-- total: 15 min -->

- 0:00 — Hook + problem statement + interactive `#m6b-eval-cost-chart` parameter chart on slide 65. (1.5 min)
- 1:30 — Slide: the evaluation pipeline & tier boundary diagram from slide 65. (1.5 min)
- 3:00 — **Demo A** — run `node labs/fixtures/lab27/evals/graders/self-check.cjs` to verify issued-call and guard graders at 0 AIU. (3 min)
- 6:00 — **Demo B** — run `vally grade --eval-spec evals/hermetic/reviewer-routing/eval.yaml --workspace . --require-pass < evals/fixtures/recorded-results.jsonl` from `labs/fixtures/lab27`. (4 min)
- 10:00 — **Demo C** — run `node labs/fixtures/lab27/evals/graders/eval-cost.cjs labs/fixtures/lab27/evals/fixtures/recorded-results.jsonl` and walk Vally vs AgentEvals vs OTel on slide 65. (3.5 min)
- 13:30 — Slide: four rules to remember & takeaway. Put the free Tier 0–1 graders ahead of any live Tier 2 gate. (1.5 min, closes at 15:00)

## 4. Expected pitfalls

- **Treating `--workspace .` as what makes `vally grade` work:** the flag is documented for file-based graders and overrides every input trajectory's recorded workspace. The program graders in this fixture read only the trajectory and pass without it; add it the moment a grader reads files. Expect the `Warning: --workspace applied to all 3 input trajectories` line, and do not mistake it for a failure.
- **Confusing the three `AgentEvals` projects (`agentevals.io`, `EntityProcess/agentv`, `agentevals-dev/agentevals`):** `agentevals.io` is the declarative `EVAL.yaml` v1.0 specification (7 headline evaluator types — `code_judge`, `llm_judge`, `rubric`, `composite`, `tool_trajectory`, `field_accuracy`, `execution_metrics` — 12 in the Evaluators Reference, no OpenTelemetry mapping, and HTTP 404 on `https://agentevals.io/schema/eval.schema.json`); `EntityProcess/agentv` was archived read-only on `2026-10-16` at `v5.3.3` with a notice pointing to Promptfoo; and `agentevals-dev/agentevals` (`aevals.ai`, `pip install agentevals-cli`) is a separate OTel-native Python tool that emits `gen_ai.evaluation.result` log events. Say that this was checked on `2026-11-24` and moves quickly.
- **Giving a tier a different number than the lab does:** `vally lint` and `vally grade` are Tier 1, not Tier 0, and a live `vally eval` is Tier 2, not "Tier 1". An attendee who leaves for Lab 27 §27.0 must find the same free and billable split you said out loud.
- **Assuming `.github/hooks/default.json` blocks `git push`, or that a hook leaves an `execute_hook` OTel span:** the README claims the shipped hooks provide "secret/doc/force-push blocking, build/format verification". The secret scan and documentation blocker are real handlers, but `.github/hooks/default.json` registers nothing for `git push` or build verification, no script under `scripts/hooks/` mentions `push`, and Lab 25 showed there is no `execute_hook` span. So guard evaluations stage a deterministic `preToolUse` hook in the trial workspace and grade its audit line. Be candid that whether the live executor loads that staged hook file is not yet verified.
- **Summing `github.copilot.nano_aiu` across all spans instead of root `invoke_agent` only:** each `chat <model>` child span reports AIU that its root `invoke_agent` span already totals, producing a `2×` overcount if all spans are summed.

## 5. Q&A prompts

Seed these if the room is quiet:

- "When should a pull request gate use `pass@k` versus `pass^k`, and why does Lab 27 set `scoring.threshold: 1.0` on routing and guard suites?"
- "Why does `tool-calls-issued.cjs` inspect `tool_call` and `skill_activation` events when issued instead of waiting for `tool_result`?"
- "How do we verify that a `preToolUse` hook denied `git push` if Copilot CLI's OpenTelemetry trace has no `execute_hook` span?"
- "How does Lab 19's `self-improving-agents.md` workflow complement Lab 27's Vally suites and Lab 25's KQL outcome queries?"
- "If our observability pipeline already ingests Copilot OTLP traces from Lab 25, how do `gen_ai.evaluation.result` log events attach scores back to a turn without re-running the agent?"

## 6. Advanced-tip callouts

Drop these between slides as time permits. Each is ~20 seconds.

- **Keep grader files separate from the agent environment:** Place custom `program` graders in `grading_environment.files` rather than `agent_environment.files`, so the agent can never read or edit the code that judges it; `vally lint` rejects a grader staged where the agent can see it.
- **Escape literal shell variables in `eval.yaml`:** Vally resolves `${KEY}` placeholders with precedence `--param KEY=value`, then the eval's own `eval.params.yaml`, then `.vally.yaml` `params:`, with an inline `${KEY=fallback}` used only when none of them sets the key; double the dollar sign (`$${HOME}`) whenever an eval prompt or command needs a literal `${...}` string.
- **Keep `gen_ai.evaluation.explanation` off by default in production OTel:** In `agentevals-dev/agentevals`, `gen_ai.evaluation.result` events never contain prompts, responses, or tool arguments unless `AGENTEVALS_EVALUATION_EVENTS_EXPLANATION=true` is enabled — mirroring Lab 25's governance rule that content capture stays off without written privacy sign-off.
- **Pin the Vally CLI in the registry, never on a slide:** `@microsoft/vally-cli` (which depends on `@microsoft/vally`) declares Node.js `>=22.15.0`, and Lab 27 reads the release from `vally_cli_version` in `docs/_meta/registry.yaml`. Specs are found through `labs/fixtures/lab27/.vally.yaml`, and the `tier0` scripts skip the CLI steps when the installed version differs, because the same `eval.yaml` can lint differently on another release.
- **Say what `pass@k` and `pass^k` mean before you rely on them:** `pass@k` asks whether at least one of `k` trials passed (does the capability exist at all?); `pass^k` asks whether every one of them did (does the regression stay fixed?). Vally also reports flaky results across trials. Routing and guard gates set `scoring.threshold: 1.0`, so one failed trial fails the gate.

---

## Takeaway

Run the free tiers on every change: Tier 0 (`self-check.cjs`, plus root-only AIU from `eval-cost.cjs`) and Tier 1 (`vally lint`, offline `vally grade`, a `mock` `vally eval`). Spend AIU on Tier 2, the multi-trial Vally suites, only when prompts, models or guard hooks change; that is how you prove your agents, skills, and hooks behave as claimed. Read AgentEvals `EVAL.yaml` and OTel `gen_ai.evaluation.result` events as the bridge to portable specs and to your traces: the lab shows both and runs neither.
