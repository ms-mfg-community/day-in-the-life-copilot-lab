# Which Memory Do I Use?

A 1-page decision tree for the Day-in-the-Life Copilot Lab. When you reach
for "memory", you are almost always picking one of **four layers**, and they
do not overlap. Use this page to decide, then jump to the lab section that
teaches it hands-on.

> 🧭 **TL;DR:** start at the top of the flowchart, take the first branch
> whose question you answer "yes" to, and stop there.

---

## The flowchart

```
                       ┌──────────────────────────┐
                       │  I need to remember…     │
                       └────────────┬─────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                       │
        ▼                                                       ▼
"…something for the      ┌─────────────────────────┐  "…something the
 next 5 minutes /        │ Q1: scope of memory?    │   *whole repo* needs
 this single task"       └─────────────────────────┘   to know forever"
        │                                                       │
        ▼                                                       ▼
┌────────────────────┐                              ┌────────────────────────┐
│ LAYER 1            │                              │ LAYER 2                │
│ Session context    │                              │ Project memory         │
│ • plan.md          │                              │ • AGENTS.md            │
│ • SQL todos table  │                              │ • .github/             │
│ • /checkpoint      │                              │   instructions/*.md    │
│ • ~/.copilot/      │                              │ • .github/             │
│   session-state/   │                              │   copilot-instructions │
└────────────────────┘                              └────────────────────────┘
                                                                │
                                                                ▼
                                              "…something I want to recall
                                               *across sessions* but only
                                               on this machine / for this
                                               team"
                                                                │
                                                                ▼
                                              ┌─────────────────────────────┐
                                              │ LAYER 3                     │
                                              │ Cross-session memory        │
                                              │ (Memory MCP knowledge graph)│
                                              │ • online: server-memory     │
                                              │ • offline / regulated:      │
                                              │   memory-offline variant    │
                                              │   (mcp-configs/copilot-cli/ │
                                              │    individual/              │
                                              │    memory-offline.json)     │
                                              └─────────────────────────────┘
                                                                │
                                                                ▼
                                              "…a *behaviour* I want Copilot
                                               to repeat automatically next
                                               time the same trigger fires"
                                                                │
                                                                ▼
                                              ┌─────────────────────────────┐
                                              │ LAYER 4                     │
                                              │ Instinct / learning loop    │
                                              │ continuous-learning-v2      │
                                              │ → /learn → instinct-status  │
                                              │ → /evolve → instinct-export │
                                              └─────────────────────────────┘
```

---

## Layer-by-layer cheat sheet

| Layer | Surface | Lifetime | Where it lives | Use when |
|------:|---------|----------|----------------|----------|
| 1 | **Session context** — `plan.md`, SQL `todos`/`todo_deps`, `/checkpoint`, `~/.copilot/session-state/<id>/` | This session only | Per-session workspace | You need todo tracking, a step-by-step plan, or a scratchpad that should *not* outlive the task |
| 2 | **Project memory** — `AGENTS.md`, `.github/instructions/*.md`, `.github/copilot-instructions.md` | Forever (in git) | Repo root + `.github/` | Conventions every contributor and every agent must follow (commit hygiene, language idioms, security rules) |
| 3 | **Cross-session memory** — Memory MCP knowledge graph (`@modelcontextprotocol/server-memory`) | Across sessions, per machine/team | `~/.copilot/mcp-config.json` → `memory` server. Use `memory-offline` MCP variant for air-gapped/regulated environments | Decisions, gotchas, architectural rationale, deployment notes — anything *not* in the code that a future session must recall |
| 4 | **Instinct / learning loop** — `continuous-learning-v2` skill + `/learn`, `instinct-status`, `/evolve`, `/instinct-export`, `/instinct-import` | Across sessions; promoted to skills/commands/agents over time | `~/.copilot/homunculus/instincts/` | A behaviour fires repeatedly (e.g. "always run `npm test` before commit"). Capture as an atomic instinct, watch its confidence climb, then `/evolve` it into a skill |

---

## Which one *isn't* the answer?

These exist for legacy reasons. Read them only to understand the v1 → v2
evolution; do not enable them alongside the canonical surface.

- **`continuous-learning`** (v1) — sessionEnd hook that emitted full skills
  in one shot. Replaced by `continuous-learning-v2`.
- **`iterative-retrieval`** — ad-hoc context refinement loop for subagents.
  Folded into the v2 instinct loop.
- **`strategic-compact`** — manual `/compact` reminder. Now expressed as an
  instinct ("compact before phase change") inside v2.

All three carry `deprecated: true` + `redirect:` frontmatter and live under
`.github/skills/` for teaching purposes.

---

## Worked decision examples

| Situation | Layer | Why |
|-----------|------:|-----|
| "Track the 5 todos for this PR" | 1 | Disposable; dies with the session |
| "Always use `git add` per file in this repo" | 2 | Project rule, every contributor needs it — `AGENTS.md` |
| "Remember why we picked Drizzle over Prisma" | 3 | Architectural rationale that future sessions must recall — Memory MCP |
| "Air-gapped customer; same as above" | 3 (offline variant) | Same intent, but `memory-offline` MCP keeps the graph on local disk only |
| "I keep forgetting to run `dotnet test` before commits" | 4 | Behaviour with a clear trigger — capture via `/learn`, promote with `/evolve` |
| "Share the above with the rest of the team" | 4 | `/instinct-export` → teammate `/instinct-import` (round-trip preserves confidence — see `tests/memory/instinct-roundtrip.test.ts`) |

---

## How the layers connect

```
Layer 1 (session) ──┐
                    ├── promotes durable findings ──▶ Layer 2 (project rules)
Layer 4 (instinct) ─┘                                   │
                                                        │
Layer 3 (Memory MCP) ◀── stores rationale + decisions ──┘
```

- A **finding from Layer 1** ("this test fixture has a footgun") that proves
  durable graduates into Layer 2 (`.github/instructions/`) or Layer 3
  (Memory MCP entity).
- A **Layer 4 instinct** with confidence ≥ 0.9 graduates via `/evolve` into a
  Layer 2 skill, command, or agent.
- **Layer 3 (Memory MCP)** is read-on-demand by agents; it is the only
  layer that is queryable as a graph.

---

## Related references

- [`labs/lab10.md`](../labs/lab10.md) — hands-on walkthrough of all four
  layers against this repo.
- [`.github/skills/continuous-learning-v2/SKILL.md`](../.github/skills/continuous-learning-v2/SKILL.md) — canonical instinct loop.
- [`mcp-configs/copilot-cli/individual/memory.json`](../mcp-configs/copilot-cli/individual/memory.json) — online Memory MCP config.
- [`mcp-configs/copilot-cli/individual/memory-offline.json`](../mcp-configs/copilot-cli/individual/memory-offline.json) — offline / regulated-environment variant.
- [`scripts/memory/instinct-roundtrip.ts`](../scripts/memory/instinct-roundtrip.ts) — kernel of `/instinct-export` ↔ `/instinct-import`.
