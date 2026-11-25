---
module: M6b
title: "Evaluating Agents, Skills & Models — Vally, AgentEvals & OTel"
anchor_labs: ["lab27", "lab19"]
minutes: 15
phase: 3c
---

# M6b — Evaluating Agents, Skills & Models (Vally × AgentEvals × OTel)

## The advanced problem

`labs/lab19.md` scans `.github/agents/` and `.github/skills/` for qualitative file drift, and `.github/skills/eval-harness/SKILL.md` defines `[CAPABILITY EVAL]` and `[REGRESSION EVAL]` markdown checklists without an automated runner. Neither proves whether an edit to an agent prompt or hook actually routes to `code-reviewer`, activates `dotnet-testing`, blocks an unapproved `git push`, or stays inside token and AIU budgets across multi-trial runs (`pass@k` vs `pass^k`).

Anchor labs: [`labs/lab27.md`](../../labs/lab27.md) · [`labs/lab19.md`](../../labs/lab19.md). Harness fixtures: `labs/fixtures/lab27/`.

---

## The evaluation pipeline & tier boundary

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIER 0: DETERMINISTIC & OFFLINE (0 MODEL CALLS · 0 AIU)                 │
│                                                                         │
│  ┌────────────────────────────────────┐   ┌──────────────────────────┐  │
│  │ Stimulus -> Executor -> Trajectory │   │ Issued-call & guard code │  │
│  │ eval.yaml + EVAL.yaml specs        │──▶│ graders (vally grade)    │  │
│  └────────────────────────────────────┘   └─────────────┬────────────┘  │
│                                                         ▼               │
│  ┌────────────────────────────────────┐   ┌──────────────────────────┐  │
│  │ OTel gen_ai.evaluation.result      │◀──│ Score & veto threshold   │  │
│  │ root invoke_agent AIU (no 2x sum)  │   │ threshold: 1.0 · pass^k  │  │
│  └────────────────────────────────────┘   └──────────────────────────┘  │
├─────────────────────────────────────────────────────────▲───────────────┤
│ TIER 1+: LIVE HERMETIC, GUARD & JUDGE (BILLABLE AIU)    │ results.jsonl │
│                                                         │               │
│  ┌──────────────────────┐  preToolUse   ┌───────────────┴────────────┐  │
│  │ Copilot SDK executor │──────────────▶│ Trial preToolUse guard     │  │
│  │ vally eval --suite   │               │ & recorded trajectory JSONL│  │
│  └──────────────────────┘               └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

Run Tier 0 (`vally lint`, `self-check.cjs`, `vally grade` over `labs/fixtures/lab27/evals/fixtures/recorded-results.jsonl`, and `eval-cost.cjs`) on every edit and pull request at zero model cost; run Tier 1+ (`vally eval` via the built-in `copilot-sdk` executor across isolated trial workspaces) when prompts, models, or guard hooks change.

---

## Vally vs AgentEvals vs OTel trace evaluation

- **Vally (`@microsoft/vally-cli` & `@microsoft/vally`, pinned as `vally_cli_version` in `docs/_meta/registry.yaml`; Node.js `>=22.15.0`):** Discovers `eval.yaml` via `labs/fixtures/lab27/.vally.yaml`, stages hidden `program` graders via `grading_environment`, runs `vally lint` / `vally eval` / `vally grade`, and reports multi-trial `pass@k`, `pass^k`, and flaky results.
- **AgentEvals declarative specification (`EVAL.yaml` v1.0 at `agentevals.io`):** Portable `EVAL.yaml` specification (`labs/fixtures/lab27/evals/agentevals/EVAL.yaml` with top-level `assert:` and `tests:`) defining 7 headline evaluator types (`code_judge`, `llm_judge`, `rubric`, `composite`, `tool_trajectory`, `field_accuracy`, `execution_metrics`; 12 in the Evaluators Reference). Note the ecosystem split: `agentevals.io` has no OpenTelemetry mapping and its advertised `eval.schema.json` URL returns HTTP 404, while `EntityProcess/agentv` was archived read-only on `2026-10-16` at `v5.3.3`.
- **OpenTelemetry GenAI evaluation events (`agentevals-dev/agentevals` & `labs/lab25.md`):** A separate OTel-native Python package (`pip install agentevals-cli`) that scores recorded OTLP traces without re-running the agent and emits `gen_ai.evaluation.result` log events (`gen_ai.evaluation.name`, `gen_ai.evaluation.score.value`, `gen_ai.evaluation.score.label`, `gen_ai.response.id`) parented to Lab 25's `invoke_agent` / `chat` spans.

---

## Four rules to remember

- **Grade `tool_call` and `skill_activation` at issuance, not only at `tool_result`:** `labs/fixtures/lab27/evals/graders/tool-calls-issued.cjs` inspects `tool_call` and `skill_activation` events as soon as they are issued, so a subagent dispatch (`code-reviewer`, `planner`) or skill trigger (`dotnet-testing`, `eval-harness`) is verified even if the trial hits a duration cap.
- **Verify guardrails with executable trials, not `README.md` prose:** `README.md` claims the 7 shipped hooks block force-push and verify builds, whereas `.github/hooks/default.json` registers no `git push` or build-verification handler and Copilot OTel emits no `execute_hook` span — stage a deterministic `preToolUse` hook into the trial workspace and grade its audit log with `labs/fixtures/lab27/evals/graders/guarded-commands.cjs`.
- **Require `scoring.threshold: 1.0` on routing and guard gates, and read `pass^k` across trials:** `pass@k` (at least one passing trial in `k` runs) measures capability discovery; `pass^k` (all `k` trials passing) and `threshold: 1.0` veto any regression on positive or negative stimuli.
- **Sum AIU on the root `invoke_agent` span only:** each `chat <model>` child span carries `github.copilot.nano_aiu` (`1 AIU = 1e9 nano AIU`) that its root `invoke_agent` span already totals, so summing every span overcounts AIU by `2×` (`labs/fixtures/lab27/evals/graders/eval-cost.cjs`).

---

## Takeaway

`labs/lab19.md` catches drift in configuration files, `labs/lab25.md` catches drift in production OTel outcomes, and `labs/lab27.md` turns both into reproducible Tier 0 offline graders and Tier 1+ multi-trial Vally + AgentEvals gates over ContosoUniversity's `.github/agents/`, `.github/skills/`, and `.github/hooks/default.json` surfaces.
