---
module: M1
title: "Copilot CLI extensibility architecture"
anchor_labs: [lab01, lab02, lab03, lab04, lab06, lab10]
minutes: 35
phase: 3a
---

# M1 — Copilot CLI extensibility architecture

## The advanced problem

Six surfaces extend Copilot CLI: **AGENTS.md**, **custom agents**, **skills**, **command skills**, **hooks**, and **memory**. Fluent users already know each one. The advanced question is: **which one do you reach for when, and how do they compose into a single coherent project profile?**

Reach for the wrong surface and you pay twice — in tokens on every turn *and* in review overhead for coupling that doesn't belong.

---

## Six surfaces, one decision tree

- **AGENTS.md** — always loaded, project-wide behavior rules. Hot path. Every token counts.
- **Custom agents** (`.github/agents/*.agent.md`) — specialist personas the user opts into with `--agent` or `/agent`.
- **Skills** (`.github/skills/<name>/SKILL.md`) — knowledge packs that **auto-activate** by description match; you can also name one yourself as `/skill-name`.
- **Command skills** (`.github/skills/<name>/SKILL.md` with `disable-model-invocation: true`) — user-invoked `/skill-name` commands, the successor to prompt files; deterministic playbooks the human triggers and Copilot never loads on its own.
- **Hooks** (`.github/hooks/default.json`) — lifecycle scripts: `sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `stop`, `notification`. Run every time.
- **Memory** — three layers, covered in `labs/lab10.md`: **Layer 1 Raw sources** (`plan.md`, SQL todos, `~/.copilot/session-state/`), **Layer 2 Recall** (GitHub Copilot Memory, the `.copilot/lessons/` wiki, or a custom memory service), **Layer 3 The Schema** (`AGENTS.md`, `.github/instructions/*.md`, agent personalities). Promotion goes Raw → Recall → Schema.

---

## Memory — three layers, three ways to recall

Memory is not one feature. `labs/lab10.md` lays it out as three layers, and Layer 2 comes in three flavours.

```text
Layer 1  Raw sources   plan.md · SQL todos · ~/.copilot/session-state/
            │  promote what proves durable
            ▼
Layer 2  Recall        native   GitHub Copilot Memory
         (advisory)             repository-level facts · user-level preferences
                                Copilot Dreaming curates (preview, AI credits)
                       DIY      .copilot/lessons/ wiki · /consolidate-lessons
                       custom   your own service, e.g. SCNS (alpha)
            │  promote what must hold every time
            ▼
Layer 3  Schema        AGENTS.md · .github/instructions/*.md   (binding)
```

- **Native** — no setup. Copilot also stores memories on its own; delete them in settings. "Forget" only downvotes.
- **DIY** — memory you can `cat`, diff and revert, in git.
- **Custom** — for semantic retrieval, your own retention, or many agents and repos, if you will run it.
- Every flavour is **advisory**. A rule that must hold every time belongs in Layer 3.

---

## Decision rubric — reach for which?

- **Behavior that applies to every turn in every session?** → AGENTS.md. Keep it lean: every line is in every context window.
- **Self-contained specialist (reviewer, planner, QA)?** → Custom agent. Opt-in.
- **Domain knowledge the model should load on its own when a topic comes up?** → Skill. Its `description` is the activation key.
- **Playbook the *human* wants to invoke with a slash?** → Command skill.
- **Cross-cutting side effect or guardrail (audit log, format check, build verification)?** → Hook.
- **Cross-turn state (decisions, entities, follow-ups)?** → Memory. Pick a layer from `labs/lab10.md`; for Layer 2, pick a flavour with `docs/memory-decision-tree.md`. Don't keep the same fact in two layers; promote Raw → Recall → Schema instead.

---

## How they compose — one project profile

```
~/.copilot/mcp-config.json          # user-scope MCP
.mcp.json                           # workspace MCP
AGENTS.md                           # agent-oriented repo guidance
.github/
├── copilot-instructions.md         # repo-wide rules (AGENTS.md co-exists)
├── agents/                         # personas: planner, code-reviewer …
├── instructions/*.instructions.md  # path-scoped rules (applyTo)
├── skills/<name>/SKILL.md          # knowledge skills + /command skills
└── hooks/default.json              # lifecycle side effects
```

Each surface covers one job. When two surfaces overlap, the cheaper one wins: command skill over agent, skill over AGENTS.md bullet, hook over instruction.

---

## Cost, latency, reuse — the three-axis check

- **Cost.** AGENTS.md and every hook pay on *every* turn. Skills pay only when activated. Command skills pay only when invoked. Agents pay only when selected.
- **Latency.** Hooks block the turn (they have `timeoutSec` budgets — see `.github/hooks/default.json`). Skills load once. MCP servers start on session open.
- **Reuse.** Command skills are the highest-reuse surface across teams. Hooks are the hardest to reuse safely — they run everywhere.

When you cannot pick, ask: *"If this fires on every turn forever, am I happy with the cost?"* If no, move it out of AGENTS.md / hooks into a skill or a command skill.

---

## Loading order and precedence

`copilot` loads extensions in a specific order. You can inspect what's active with `/env` inside an interactive session.

- MCP config: **user** (`~/.copilot/mcp-config.json`) → **workspace** (`.mcp.json`) → **plugin** — later sources augment earlier ones.
- Skills activate by **description** match, not by filename. A tightly-scoped description prevents unwanted activations.
- Hooks run **top-to-bottom** in `.github/hooks/default.json` and a failure in one does not short-circuit subsequent hooks (they're independent).
- Custom instruction files (`AGENTS.md`, `copilot-instructions.md`, `**/*.instructions.md` with `applyTo`) are combined — Copilot defines no precedence order between them, so a narrower `applyTo` does not override a broader one. Don't write rules that contradict each other.

Disable a misbehaving surface fast: `copilot --no-custom-instructions` or `/instructions`.

---

## Live demo — build one coherent profile

Anchor labs: `labs/lab01.md` (topology), `labs/lab02.md` (AGENTS.md), `labs/lab03.md` (custom agents), `labs/lab04.md` (skills + command skills), `labs/lab06.md` (hooks), `labs/lab10.md` (agent memory: Raw sources → Recall → Schema).

```bash
# See what's loaded right now.
copilot
> /env

# Inspect the ordered configuration surface.
ls .github/agents .github/skills .github/instructions .github/hooks
cat .github/hooks/default.json

# Run a scoped session with *only* one agent + zero instructions.
copilot --agent code-reviewer --no-custom-instructions -p "review the last commit"
```

---

## Anti-patterns to name out loud

- **"Just add it to AGENTS.md"** — 200 lines in AGENTS.md burn tokens every turn, everywhere. If it's situational, it's a skill.
- **Skill description too broad** — "general coding help" activates constantly. Narrow the description or it will double-load on every turn.
- **Hook doing real work** — hooks should be observability and guardrails, not business logic. They block the turn and have `timeoutSec` budgets.
- **Command skill that should be a knowledge skill** — if the model should load it *automatically* when a topic comes up, drop `disable-model-invocation`. Command skills are for humans.
- **Memory layer sprawl** — keep each kind of state in one layer from `labs/lab10.md` (Raw sources, Recall, or Schema), and each fact in one Layer 2 flavour. Don't store the same rule in Copilot Memory *and* the wiki *and* AGENTS.md; promote it upward instead.

---

## Takeaway

One surface, one job. Cost on every turn versus cost on the right turn is the whole game. Compose the five surfaces deliberately — then `/env` should show a *small* set of things, each earning its keep.
