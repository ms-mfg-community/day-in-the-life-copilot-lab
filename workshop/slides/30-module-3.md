---
module: M3
title: "Multi-agent orchestration"
anchor_labs: [lab07]
minutes: 30
phase: 3b
---

# M3 — Multi-agent orchestration

## The advanced problem

You already know how to run one Copilot CLI session. The advanced question is: **when you need five roles on one task — planner, implementer, reviewer, QA, security — do you run them serially in one context, dispatch them as sub-agents, or fork whole sessions?** The wrong shape burns context, drops state between handoffs, and makes the resulting PR impossible to review.

Three things bite you at scale: **context bleed** (one agent's scratch work poisons the next), **token cost** (every handoff re-sends the world), and **loss of reversibility** (parallel workers edit the same files and you can't tell who did what).

Anchor lab: `labs/lab07.md`.

---

## Four composition shapes — pick one on purpose

- **Single session, single agent.** Plain `copilot`. One persona, full context. Cheap; no handoffs; high context bleed on long sessions.
- **Single session, agent-of-agents.** One orchestrator uses the `agent` tool to delegate to other agents in the **same** session — they share the conversation. Good for tight hand-offs; bad when workers need isolation.
- **Parallel sub-agents via `/fleet`.** One conversation dispatches independent workers in parallel. Each sub-agent has its **own** context window. Payoff: latency and isolation. Cost: tokens scale with worker count.
- **Forked background tasks.** `/tasks` runs background sub-agents (and shell sessions) that report back later. Right shape for long-running work you don't want to block on.

If two shapes would work, pick the cheaper one. "Orchestrator-of-orchestrators" is almost always a design smell — flatten it.

---

## The context-isolation decision

A sub-agent starts with a **fresh context window**. That's the feature, not the bug.

- **Isolate when** workers don't need each other's chain-of-thought — independent review lanes, per-file analysis, fanned-out lookups.
- **Share context when** the work is sequential and each step depends on the last step's reasoning — plan → implement → self-review.

`/fleet` and `/tasks` give you isolation. The `agent` tool inside a custom agent gives you shared context. Don't mix them without intent.

---

## Budget control — the three knobs

Multi-agent work is where token bills explode. The three knobs that actually matter:

- **Model tier per worker.** Cheap workers on `claude-haiku-4.5` / `gpt-5-mini`; reserve `claude-opus-4.7` / `gpt-5.3-codex` for hard reasoning. Switch mid-session with `/model`. See `docs/token-and-model-guide.md`.
- **Context reset between phases.** `/clear` abandons the session; `/compact` summarizes in place. Use `/compact` between phases of the same task; use `/clear` between tasks.
- **Reasoning effort.** `--effort low|medium|high|xhigh` — orchestrator at `high`, bulk workers at `low`. The default is almost never optimal for a multi-agent run.

Inspect before you ship a run: `/context` shows the window; `/usage` shows session stats.

---

## Real sub-agent dispatch — the Copilot CLI surface

The commands that actually exist (verify on your machine with `copilot help commands`):

- `/fleet` — **Enable fleet mode for parallel subagent execution.**
- `/tasks` — **View and manage background tasks (subagents and shell sessions).**
- `/agent` — browse and select an agent for **this** session.
- `/delegate` — hand the session off to GitHub (Copilot creates a PR remotely).
- `/model` — switch model mid-session.
- `/context`, `/usage`, `/compact`, `/clear`, `/rewind` — the budget + recovery toolkit.

And from the CLI, per-session scoping that matters for orchestration:

- `--agent <name>` — single-agent runs for clean review lanes.
- `--mode plan|autopilot|interactive` — orchestrator in `plan`, workers in `autopilot`.
- `--max-autopilot-continues <count>` — ceiling on worker loops when autopiloting.
- `--allow-all-tools` + `-p "…"` — one-shot worker invocation, scriptable.

---

## Custom agents as orchestration primitives

The orchestration pattern from `labs/lab07.md`: a `lab-orchestrator.agent.md` declares `tools: ["read", "search", "agent"]` and delegates to `dotnet-dev`, `dotnet-qa`, and `code-reviewer`. Key shape:

```yaml
---
name: "lab-orchestrator"
description: "Coordinates .NET workflow: delegates to dotnet-dev, dotnet-qa, code-reviewer."
tools: ["read", "search", "agent"]
---
```

The `agent` tool is what promotes a persona into a dispatcher. Without it, the agent can only *describe* a hand-off; it cannot actually invoke another agent.

`.github/agents/` in this repo ships `code-reviewer.agent.md`, `planner.agent.md`, and `agentic-workflows.agent.md` — use those as the reference shape; don't re-invent.

---

## Parallel dispatch with `/fleet`

`/fleet` is the performance multiplier when workers are independent. Think "run three reviewers at once on the same diff" — security, perf, style — not "write a feature then review it" (that's sequential and wants the agent-of-agents shape).

Rules of thumb:

- **Good `/fleet` work:** independent lookups, independent reviews, independent file analyses.
- **Bad `/fleet` work:** anything that needs worker B to see worker A's output mid-flight.
- **Budget rule:** N workers ≈ N × cheapest-context cost. Pin workers to `claude-haiku-4.5` unless they're doing real reasoning.

Watch `/tasks` while `/fleet` is running — that's where you see the workers and stop the ones that are spinning.

---

## Live demo — orchestrator + fleet on one PR

Anchor lab: `labs/lab07.md` (full orchestrator build).

```bash
# See what orchestration primitives ship in this repo.
ls .github/agents/
head -20 .github/agents/planner.agent.md

# Start a scoped orchestration session.
copilot --agent planner --mode plan --add-dir .
```

Inside the session:

```
/fleet
"Review the last commit — one pass for security, one for performance, one for style."
/tasks
/context
```

Narrate what you see at each step: the `plan` mode opening, the three fleet workers, the `/tasks` list, the context-window cost before vs after.

Fallback path — when `/fleet` is cost-gated or the room has no network: run the same three reviews as sequential `--agent code-reviewer -p "…"` one-shots. You lose parallelism, not the teaching.

---

## Expected failure modes

- **Context bleed in shared-context orchestration.** Worker B inherits worker A's hallucination. Fix: split into `/fleet` or separate `--agent` invocations, not "just one more turn."
- **Fleet worker that refuses to finish.** Stop it from `/tasks`; do **not** `/clear` the whole session — you'll lose the orchestrator's plan.
- **Token bill shock from default model on workers.** Every worker on `claude-opus-4.7` by default. Always pin worker model explicitly.
- **Stale `agent` tool permission.** A custom agent without `agent` in its `tools:` list silently cannot delegate — it will describe delegation instead. Check the agent file, not the prompt.
- **`/delegate` confusion.** `/delegate` sends the whole session to GitHub for a PR — it is **not** the same as delegating to a sub-agent locally. Know which one you want.

---

## Takeaway

Pick the orchestration shape before you write the orchestrator. Single session, agent-of-agents, `/fleet`, or `/tasks` — each has a different cost and isolation profile. Budget with `/model` + `/compact` + `--effort`, inspect with `/context` + `/tasks`, and prefer **flat** orchestration over nested when both would work.
