---
module: M1
title: "Copilot CLI extensibility architecture"
anchor_labs: [lab01, lab02, lab03, lab04, lab06, lab10]
minutes: 35
phase: 3a
---

# M1 — Copilot CLI extensibility architecture

## The advanced problem

Five surfaces extend Copilot CLI: **AGENTS.md**, **custom agents**, **skills**, **prompts**, **hooks**, and **memory**. Fluent users already know each one. The advanced question is: **which one do you reach for when, and how do they compose into a single coherent project profile?**

Reach for the wrong surface and you pay twice — in tokens on every turn *and* in review overhead for coupling that doesn't belong.

---

## Five surfaces, one decision tree

- **AGENTS.md** — always loaded, project-wide behavior rules. Hot path. Every token counts.
- **Custom agents** (`.github/agents/*.agent.md`) — specialist personas the user opts into with `--agent` or `/agent`.
- **Skills** (`.github/skills/<name>/SKILL.md`) — knowledge packs that **auto-activate** by description match; you do not invoke them.
- **Prompts** (`.github/prompts/*.prompt.md`) — user-invoked slash commands; deterministic playbooks the human triggers.
- **Hooks** (`.github/hooks/default.json`) — lifecycle scripts: `sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `stop`, `notification`. Run every time.
- **Memory** — four distinct layers, covered in `labs/lab10.md`: session context, skill artifacts, Memory MCP knowledge graph, and session-store (`session_store_sql`).

---

## Decision rubric — reach for which?

- **Behavior that applies to every turn in every session?** → AGENTS.md. Keep it lean: every line is in every context window.
- **Self-contained specialist (reviewer, planner, QA)?** → Custom agent. Opt-in.
- **Domain knowledge the model should load on its own when a topic comes up?** → Skill. Its `description` is the activation key.
- **Playbook the *human* wants to invoke with a slash?** → Prompt file.
- **Cross-cutting side effect or guardrail (audit log, format check, build verification)?** → Hook.
- **Cross-turn state (decisions, entities, follow-ups)?** → Memory — pick one of the four layers from `labs/lab10.md`. Don't spread state across more than one layer.

---

## How they compose — one project profile

```
~/.copilot/mcp-config.json          # user-scope MCP
.mcp.json                           # workspace MCP
.github/
├── copilot-instructions.md         # repo-wide rules (AGENTS.md co-exists)
├── AGENTS.md                       # agent-oriented repo guidance
├── agents/                         # personas: planner, code-reviewer …
├── skills/<name>/SKILL.md          # auto-activating knowledge
├── prompts/*.prompt.md             # /slash playbooks
└── hooks/default.json              # lifecycle side effects
```

Each surface covers one job. When two surfaces overlap, the cheaper one wins: prompt over agent, skill over AGENTS.md bullet, hook over instruction.

---

## Cost, latency, reuse — the three-axis check

- **Cost.** AGENTS.md and every hook pay on *every* turn. Skills pay only when activated. Prompts pay only when invoked. Agents pay only when selected.
- **Latency.** Hooks block the turn (they have `timeoutSec` budgets — see `.github/hooks/default.json`). Skills load once. MCP servers start on session open.
- **Reuse.** Prompts are the highest-reuse surface across teams. Hooks are the hardest to reuse safely — they run everywhere.

When you cannot pick, ask: *"If this fires on every turn forever, am I happy with the cost?"* If no, move it out of AGENTS.md / hooks into a skill or a prompt.

---

## Loading order and precedence

`copilot` loads extensions in a specific order. You can inspect what's active with `/env` inside an interactive session.

- MCP config: **user** (`~/.copilot/mcp-config.json`) → **workspace** (`.mcp.json`) → **plugin** — later sources augment earlier ones.
- Skills activate by **description** match, not by filename. A tightly-scoped description prevents unwanted activations.
- Hooks run **top-to-bottom** in `.github/hooks/default.json` and a failure in one does not short-circuit subsequent hooks (they're independent).
- Custom instruction files (`AGENTS.md`, `copilot-instructions.md`, `**/*.instructions.md` with `applyTo`) are merged — narrower `applyTo` overrides broader.

Disable a misbehaving surface fast: `copilot --no-custom-instructions` or `/instructions`.

---

## Live demo — build one coherent profile

Anchor labs: `labs/lab01.md` (topology), `labs/lab02.md` (AGENTS.md), `labs/lab03.md` (custom agents), `labs/lab04.md` (skills + prompts), `labs/lab06.md` (hooks), `labs/lab10.md` (memory).

```bash
# See what's loaded right now.
copilot
> /env

# Inspect the ordered configuration surface.
ls .github/agents .github/skills .github/prompts .github/hooks
cat .github/hooks/default.json

# Run a scoped session with *only* one agent + zero instructions.
copilot --agent code-reviewer --no-custom-instructions -p "review the last commit"
```

---

## Anti-patterns to name out loud

- **"Just add it to AGENTS.md"** — 200 lines in AGENTS.md burn tokens every turn, everywhere. If it's situational, it's a skill.
- **Skill description too broad** — "general coding help" activates constantly. Narrow the description or it will double-load on every turn.
- **Hook doing real work** — hooks should be observability and guardrails, not business logic. They block the turn and have `timeoutSec` budgets.
- **Prompt that should be a skill** — if the model should load it *automatically* when a topic comes up, it's a skill. Prompts are for humans.
- **Memory layer sprawl** — pick one of the four layers from `labs/lab10.md` per kind of state. Do not duplicate.

---

## Takeaway

One surface, one job. Cost on every turn versus cost on the right turn is the whole game. Compose the five surfaces deliberately — then `/env` should show a *small* set of things, each earning its keep.
