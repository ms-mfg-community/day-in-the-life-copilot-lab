---
module: M6b
title: "Evaluating Agents, Skills & Models — Vally, AgentEvals & OTel"
anchor_labs: ["lab27", "lab19"]
minutes: 15
phase: 3c
---

# M6b — Evaluating Agents, Skills & Models (Vally × AgentEvals × OTel)

## The advanced problem

`labs/lab19.md` scans `.github/agents/` and `.github/skills/` for qualitative file drift, and `.github/skills/eval-harness/SKILL.md` defines `[CAPABILITY EVAL]` and `[REGRESSION EVAL]` checklists without a runner. Neither proves whether an edit still routes to `code-reviewer`, activates `dotnet-testing`, blocks `git push`, or stays inside AIU budgets across trials (`pass@k` vs `pass^k`).

Anchor labs: [`labs/lab27.md`](../../labs/lab27.md) · [`labs/lab19.md`](../../labs/lab19.md). Harness fixtures: `labs/fixtures/lab27/`.

---

## The evaluation pipeline & tier boundary

```
┌─────────────────────────────────────────────────────────────────────────┐
│ TIERS 0–1: FREE & OFFLINE (0 MODEL CALLS · 0 AIU)                       │
│  [Stimulus -> Executor -> Trajectory] ──▶ [Program Graders: vally grade]│
│  (eval.yaml + EVAL.yaml specs)            ──▶ [Score: threshold 1.0]    │
│                                           ··▶ [OTel bridge (external)]  │
├─────────────────────────────────────────────────────────▲───────────────┤
│ TIER 2: LIVE HERMETIC & GUARD TRIALS (BILLABLE AIU)     │ results.jsonl │
│  [Copilot SDK: vally eval] ──preToolUse──▶ [Guard Hook & Trajectory Log]│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Vally vs AgentEvals vs OTel trace evaluation

- **Vally** runs your `eval.yaml` trials and grades each one with a program you can read.
- **AgentEvals** is a portable `EVAL.yaml` spec. Nothing in this lab runs it.
- **OpenTelemetry** `gen_ai.evaluation.result` events can attach a score to a Lab 25 span.

---

## Four rules to remember

1. **Grade at issuance.** A dispatch counts even if the trial times out.
2. **Prove guards with a trial.** Grade the hook's audit log, not the README.
3. **Gate on `scoring.threshold: 1.0`.** Read `pass^k`, not just `pass@k`.
4. **Count AIU at the root.** Summing child spans doubles the figure.

---

## Takeaway

`labs/lab19.md` catches drift in files and `labs/lab25.md` in production traces. `labs/lab27.md` adds the gate that proves `.github/agents/`, `.github/skills/` and `.github/hooks/default.json` still behave: free Tiers 0–1 on every change, live Tier 2 when prompts, models or hooks change.
