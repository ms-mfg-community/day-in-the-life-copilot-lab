---
title: "Advanced Copilot CLI Workshop — Curriculum"
arc: workshop-materials
phase: 1
registry: docs/_meta/registry.yaml
audience: "Advanced Copilot CLI users (no primer content)"
duration_minutes: 240
---

# Advanced Copilot CLI Workshop — Curriculum

> **Source of truth.** This file defines the module list, per-module
> advanced outcomes, anchor-lab mapping, and the 4-hour time budget for
> the live in-person workshop. Slide decks, speaker scripts, and the
> facilitator guide (Phases 2–4) derive from this document.
>
> **Framing.** Attendees are assumed fluent in Copilot CLI basics
> (`copilot` interactive + `-p`/`--prompt`, `AGENTS.md`, a handful of
> skills and prompts). Every module opens with an *advanced problem*,
> not with a primer.
>
> **Demo surface.** Live demos are **Copilot CLI only**. Labs may
> reference VS Code flows; the workshop does not.

## Time budget

Total clock: **240 minutes (4 hours)**. Breakdown must sum to exactly
240, and contingency must be ≥ 15% (≥ 36 min). Both invariants are
enforced by `tests/workshop/time-budget.test.ts`.

| Bucket | Minutes | Notes |
|---|---|---|
| Content (6 modules) | 160 | See module table below |
| Opening + readiness check | 5 | Top-of-day smoke test, not a module |
| Breaks (2 × 10 min) | 20 | Mid-morning, mid-afternoon |
| Q&A (closing) | 15 | One consolidated block |
| Contingency | 40 | 16.67% — absorbs demo recovery, run-long drift |
| **Total** | **240** | |

"Drop-first if running long" governs which modules shrink first — the
ordered list lives in `workshop/timing-plan.md` (Phase 4). Contingency
is the *floor*, not the buffer of first resort.

<!-- time-budget:start -->
```yaml
total_minutes: 240
contingency_minimum_pct: 15
modules:
  - id: M1
    title: "Copilot CLI extensibility architecture"
    minutes: 35
    anchor_labs: [lab01, lab02, lab03, lab04, lab06, lab10]
  - id: M2
    title: "MCP servers in anger — multi-server composition and debugging"
    minutes: 30
    anchor_labs: [lab05, lab12]
  - id: M3
    title: "Multi-agent orchestration — sub-agents, parallel dispatch, budget control"
    minutes: 25
    anchor_labs: [lab07]
  - id: M4
    title: "GitHub Agentic Workflows (gh-aw) — authoring and CI agent patterns"
    minutes: 25
    anchor_labs: [lab08, lab09]
  - id: M5
    title: "Enterprise plugin marketplace"
    minutes: 20
    anchor_labs: [lab11]
  - id: M6
    title: "A2A / ACP + tmux orchestrator meta-loop (flagship)"
    minutes: 25
    anchor_labs: [lab13, lab14]
overhead:
  opening_min: 5
  break_min: 20
  qa_min: 15
  contingency_min: 40
```
<!-- time-budget:end -->

## Modules

Each module entry below carries:

- **Advanced outcome** — what a *fluent* Copilot CLI user can do after
  the module that they could not (or did not) do before. Not a
  beginner objective.
- **Anchor labs** — existing labs in `labs/` that contain the
  authoritative self-paced material. The workshop demo is a curated
  slice; attendees complete the anchor labs after the session.
- **Workshop minutes** — matches the `time-budget` block above and
  matches the sum of `pace_workshop_minutes` for the anchor labs in
  `docs/_meta/registry.yaml`.

### M1 — Copilot CLI extensibility architecture (35 min)

**Advanced outcome.** Given a fresh machine and a business goal, an
attendee can decide *which* extension surface (AGENTS.md vs. custom
agents vs. skills vs. prompts vs. hooks vs. memory) to reach for,
justify that choice on cost / latency / reuse grounds, and wire the
surfaces together into one coherent project profile — not just add
every surface available.

**Anchor labs.** `lab01` (Copilot configuration topology),
`lab02` (AGENTS.md + custom instructions), `lab03` (custom agents),
`lab04` (skills and prompts), `lab06` (hooks), `lab10` (memory and
context lifecycle).

**Registry check.** 6 + 6 + 6 + 6 + 4 + 7 = **35 min**
(`pace_workshop_minutes` for labs 01, 02, 03, 04, 06, 10).

### M2 — MCP servers in anger (30 min)

**Advanced outcome.** An attendee can compose multiple MCP servers in
a single Copilot CLI session (e.g. `context7` + `microsoft-learn` +
a domain server like Fabric MCP), reason about tool-namespace
collisions, and debug a server that is silently returning empty
results using `copilot --additional-mcp-config` for per-session
overrides.

**Anchor labs.** `lab05` (MCP server configuration),
`lab12` (Fabric MCP with Copilot CLI and VS Code — includes an
offline Parquet fallback path for restricted-network delivery).

**Registry check.** 10 + 20 = **30 min**.

### M3 — Multi-agent orchestration (25 min)

**Advanced outcome.** An attendee can decompose a non-trivial task
into parallel sub-agent dispatches, pass complete context to each
(they are stateless across invocations), budget them appropriately —
cheap models for mechanical sweeps, premium for judgment — and
reason about when *not* to spawn a sub-agent.

**Anchor labs.** `lab07` (multi-agent orchestration, `task` tool,
model routing, dev/QA/reviewer patterns).

**Registry check.** 25 min for `lab07` standalone.

### M4 — GitHub Agentic Workflows (gh-aw) (25 min)

**Advanced outcome.** An attendee can read an existing
`.github/workflows/*.md` gh-aw workflow, understand its trigger
surface and tool grants, author a new PRD-generation or code-review
agent workflow using the current schema version pinned in
`docs/_meta/registry.yaml` (`gh_aw_schema_version`), and debug a run
through its generated GitHub Actions log.

**Anchor labs.** `lab08` (PRD-generation agent workflow),
`lab09` (Copilot coding agent + code-review agent workflow).

**Registry check.** 12 + 13 = **25 min**.

### M5 — Enterprise plugin marketplace (20 min)

**Advanced outcome.** An attendee can package a team's Copilot CLI
configuration (agents, skills, prompts, hooks) as a plugin, publish
it to an internal marketplace, and reason about versioning,
org-scoped discovery, and the blast-radius implications of
publishing a hook that runs in every consumer session.

**Anchor labs.** `lab11` (building and distributing a Copilot
plugin — enterprise marketplace pattern).

**Registry check.** 20 min for `lab11` standalone.

### M6 — A2A / ACP + tmux orchestrator meta-loop (25 min, flagship)

**Advanced outcome.** An attendee can stand up the tmux orchestrator
pattern — one long-lived orchestrator pane, short-lived worker
panes, `plan → implement → handoff → clear → qa → clear → next`
cycle — and knows how to run a Copilot CLI session as an ACP server
(`copilot --acp`) to integrate with a second agent. They can also
recite the Lab 14 compatibility matrix from memory (native
macOS/Linux supported, WSL2-on-Linux-fs recommended for Windows,
`/mnt/c/` degraded, Windows-PS-only unsupported for live delivery).

**Anchor labs.** `lab13` (A2A concepts and ACP handshake),
`lab14` (orchestrator + tmux deep-dive; carries the compatibility
matrix shipped in Phase 0).

**Registry check.** 10 + 15 = **25 min**.

## What's not a module

The following lab topics are **not** live modules in this 4-hour
workshop. They appear in `workshop/attendee-handout.md` (Phase 4)
as self-paced follow-up paths back to their lab READMEs:

- Environment and CLI foundations — collapsed into the 5-min
  opening readiness check (preflight already ran the day before).
- Any beginner/primer content for Copilot CLI itself — the workshop
  is explicitly advanced.
- VS Code flows — Copilot CLI only in live demos.

## Phase-1 change log

- Finalized the 6-module list drafted in `.orchestrator/plan.md`
  without splitting into a "core 4 + 2 optional" variant: workshop
  content stays at 160 min (plan ceiling is 165 min), leaving 80 min
  of overhead — above the plan's 75-min minimum for breaks /
  Q&A / contingency.
- Added `pace_workshop_minutes` alongside `pace_presenter_minutes`
  in `docs/_meta/registry.yaml`. Existing `pace_presenter_minutes`
  retains its fly-by semantic (referenced by the inline
  "⏱️ Presenter pace: X minutes" callout in every lab and by the
  existing `tests/lab-structure/*` frontmatter assertions); the new
  `pace_workshop_minutes` reflects realistic live-workshop pacing
  and is the number the curriculum's anchor-lab mapping sums to.
- Added `tests/workshop/time-budget.test.ts` enforcing the 240-min
  ceiling, ≥15% contingency floor, 5–6 module count, and
  anchor-lab ↔ registry consistency.
