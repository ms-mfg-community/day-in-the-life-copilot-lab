---
module: M1
title: "Copilot CLI extensibility architecture — speaker script"
slide_source: workshop/slides/10-module-1.md
minutes: 35
phase: 3a
---

# M1 — Speaker script

Target audience: fluent Copilot CLI users. No primer content. The whole
module is the decision question — *which surface, when, and how do
they compose?*

## 1. Open with the advanced problem

Do **not** start with "AGENTS.md is a markdown file that…". The room
knows. Start with the decision.

**Verbatim hook (~60 seconds):**

> "You all know what AGENTS.md is. You've written skills. You've
> probably got a hook or two. The question I want to answer in the
> next 35 minutes is: when a real request lands — build a PRD
> generator, enforce a test-coverage rule across a monorepo, stand
> up a Fabric-MCP-backed analyst agent — **which of the five
> extension surfaces do you reach for, and why not the other four?**
> Reach for the wrong one and you pay twice: tokens on every turn,
> and review overhead for coupling that doesn't belong."

Name the five up front: AGENTS.md, custom agents, skills, prompts,
hooks, memory. (Yes, six including memory as its own axis — point
this out; it's the one fluent users under-use.)

## 2. Demo script

**Copilot CLI only. No VS Code.** Every command runs in the workshop
repo.

### Demo A — "what's loaded right now?" (~4 min)

```bash
cd ~/Coding_Projects/day-in-the-life-copilot-lab
copilot
```

Inside the session:

```
/env
```

Read the output out loud. Point at:

- Custom instruction files (AGENTS.md + `copilot-instructions.md` + any `*.instructions.md` with `applyTo`)
- Skills (auto-activating)
- Agents (opt-in)
- MCP servers (user + workspace + plugin)
- Hooks (from `.github/hooks/default.json`)

Emphasize: *this is the ground truth — the config on disk is just the recipe.*

### Demo B — surface-by-surface in 30 seconds each (~6 min)

```bash
# AGENTS.md / copilot-instructions.md
head -40 .github/copilot-instructions.md

# A custom agent
head -20 .github/agents/code-reviewer.agent.md

# A skill — the description drives activation
head -5 .github/skills/coding-standards/SKILL.md

# A prompt — human-invoked
head -10 .github/prompts/verify.prompt.md

# Hooks — every turn, every session
cat .github/hooks/default.json | head -30

# Memory — three Karpathy layers, one lab
head -40 labs/lab10.md
```

Do **not** edit any of these live. The point is to point at each surface and name its job, then move on.

### Demo C — disable and scope (~4 min)

```bash
# Run a scoped session: one agent, no repo instructions, no ask_user.
copilot --agent code-reviewer --no-custom-instructions --no-ask-user \
  -p "review the last commit for obvious issues" --allow-all-tools
```

Narrate: *"I've just cut the context window by everything in
AGENTS.md and every `*.instructions.md` file. Same CLI, same model,
different surface loadout."* This is the mental model — surfaces are
switchable per session.

### Demo D — the three-axis check on a real decision (~4 min)

Pick one real rule — e.g. "always run `dotnet format` before
committing." Ask the room: AGENTS.md bullet, a hook, or a prompt?

- AGENTS.md bullet → every turn pays for it; model may or may not obey.
- Hook (`postToolUse` on write) → deterministic, runs every time, blocks the turn.
- Prompt (`/format-and-commit`) → deterministic, but the human has to invoke.

Walk the axes out loud: cost, latency, reuse. Land on: for a
must-run-every-time rule, a hook is right; for a sometimes-run rule,
it's a prompt. AGENTS.md is almost never the right home for a
mechanical rule.

## 3. Timing cues

<!-- total: 35 min -->

- 0:00 — Open with the advanced problem. Name the five surfaces + memory. (2 min)
- 2:00 — Slide: "Five surfaces, one decision tree." Read each one-liner. (3 min)
- 5:00 — Slide: "Decision rubric — reach for which?" Ask the room one concrete scenario. (3 min)
- 8:00 — Slide: "How they compose — one project profile." Show the tree. (2 min)
- 10:00 — **Demo A** — `/env` in the repo. Ground truth vs recipe. (4 min)
- 14:00 — Slide: "Cost, latency, reuse — the three-axis check." (3 min)
- 17:00 — **Demo B** — tour the five surfaces on disk, 30 seconds each. (6 min)
- 23:00 — Slide: "Loading order and precedence." (2 min)
- 25:00 — **Demo C** — `--agent code-reviewer --no-custom-instructions`. (4 min)
- 29:00 — **Demo D** — decision walk-through on the `dotnet format` example. (4 min)
- 33:00 — Slide: "Anti-patterns." Read them; invite one from the room; land on the takeaway. (2 min, closes at 35:00)

## 4. Expected pitfalls

- **Attendee wants to rewrite AGENTS.md live.** Don't. Every second you spend editing is a second not spent on the decision framework. Park: "great instinct — do it during the break against your own repo."
- **`/env` output is overwhelming on this repo.** It is — this repo has ~10 skills, 3 agents, 23 prompts, 7 hook scripts. That *is* the teaching moment: "here's why the decision rubric matters; look how much there is to pay for."
- **Someone asks 'AGENTS.md vs copilot-instructions.md'.** Both load; AGENTS.md is agent-oriented guidance, `copilot-instructions.md` is Copilot-specific. Cite the repo's own `copilot-instructions.md` as the canonical example. Don't let this eat 5 minutes.
- **'Why not just put everything in a skill?'** Skills are auto-activated by description — a skill with a broad description activates on every turn and burns tokens like a hook, but silently. Narrow descriptions or it's worse than AGENTS.md.
- **Memory layer confusion.** If someone asks "which memory layer?", point to `labs/lab10.md` and the `docs/memory-decision-tree.md` flowchart — three Karpathy layers (Raw sources → Wiki → Schema), promotion only ever goes upward. Call out the disambiguation section: reindex, knowledge-graph servers, and instinct loops are *not* memory layers. Don't re-teach lab 10 inside this module — 5 minutes, tops.
- **Live demo fails — session won't start.** Fallback: `copilot --no-custom-instructions` to rule out a broken instruction file; `copilot --log-level debug --log-dir /tmp/copilot-logs` and tail the log. Worst case: show the screenshot in `workshop/fallback-screenshots/` (Phase 5 artifact — refer out).

## 5. Q&A prompts

Seed these if the room is quiet:

- "What's in your team's AGENTS.md today that shouldn't be there — that is, what costs on every turn but only matters sometimes?"
- "When have you had a hook that should have been a prompt? Or vice versa?"
- "Anyone running `--agent` flags routinely? What's your shortlist?"
- "Has anyone hit the skill-description-too-broad problem? What was the activation signal?"
- "If you had to cut your extension surface in half, which half survives?"

## 6. Advanced-tip callouts

Drop these between slides as time permits. Each is ~30 seconds.

- **`/env` is underused.** It's the only place to see the *resolved* loadout. Config-on-disk lies; `/env` doesn't.
- **`--no-custom-instructions` is a debug superpower.** When a session is behaving oddly, run it with instructions disabled and see if the behavior follows. Fastest way to isolate a rogue rule.
- **Skill descriptions are the activation contract.** Write them like regexes against *future prompts*, not like docstrings for the skill itself.
- **Hooks have `timeoutSec` budgets** — see `.github/hooks/default.json`. A hook that tries to run a full test suite will time out and be silently skipped. Keep hooks mechanical: log, check, refuse — not "do work."
- **Custom agents inherit from `AGENTS.md` by default.** Opting into an agent does not opt out of repo instructions unless you also pass `--no-custom-instructions`. Combine them deliberately.
- **The `mcp-index` skill in this repo is the meta-tip** — it tells Copilot to check which MCP tools are available *before* complex reasoning. That's the shape of a good skill: cheap, declarative, self-scoped.
