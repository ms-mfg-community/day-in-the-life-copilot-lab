# Lab 10 Solutions — Agent Memory: Personalities, Lessons, and Consolidation

Reference artefacts for [Lab 10](../../labs/lab10.md). Lab 10 teaches
**three-layer agent memory** built on plain markdown the agent
maintains itself — no knowledge-graph server, no embeddings, no
cross-session database.

| Layer | Surface | Lifetime |
|-------|---------|----------|
| 1 — Raw sources | `plan.md`, SQL todos, session transcripts | One task — kept on disk, but not curated or shared |
| 2 — The Wiki | `.copilot/lessons/` (project) + `~/.copilot/lessons/` (global) | Across sessions, in markdown |
| 3 — The Schema | `AGENTS.md`, `.github/instructions/*.md`, agent personalities | Forever, binding |

## Files in this directory

| File | Lab section | Purpose |
|------|-------------|---------|
| `sample-checkpoint-log.txt` | §10.5 callout | Example of the line the `checkpoint` prompt file's `create` action appends to `.github/checkpoints.log` — a git-level safety net, not a Layer 1 snapshot. |
| `sample-handoff.md` | §10.5 handoff drill | Example of the handoff document the `handoff` prompt file produces. In the drill you save your own copy as `lab10-handoff.md` in the session's `files/` folder, outside the repository, and a fresh conversation reads it back and continues from its Fresh Context Prompt section. The sample also shows that prompt sending the fresh conversation to the in-repo wiki (`.copilot/lessons/`) instead of a memory server. |

`checkpoint`, `handoff` and `consolidate-lessons` are **prompt files** under
[`.github/prompts/`](../../.github/prompts/), not registered Copilot CLI slash
commands — `copilot help commands` does not list them. In the CLI you ask
the agent to follow the file by path, as Lab 10 §10.4a shows.

## Where the actual wiki lives

The wiki itself is **not** in this solutions folder — it ships in the
repo root so every session can read it:

- [`.copilot/lessons/README.md`](../../.copilot/lessons/README.md) — pattern explanation
- [`.copilot/lessons/index.md`](../../.copilot/lessons/index.md) — hand-curated catalog
- [`.copilot/lessons/log.md`](../../.copilot/lessons/log.md) — append-only journal
- [`.copilot/lessons/example-lesson.md`](../../.copilot/lessons/example-lesson.md) — a worked lesson

The schema that governs how the agent writes lessons:

- [`.github/instructions/lessons.instructions.md`](../../.github/instructions/lessons.instructions.md)

The prompt file that promotes lessons (Layer 2 → Layer 2-global, or
flagged for Layer 3):

- [`.github/skills/consolidate-lessons/SKILL.md`](../../.github/skills/consolidate-lessons/SKILL.md)

## Key concepts

- **Reindex** automatically understands code already in git — structure,
  types, relationships. You don't manage it. Anything answerable from
  the code itself does **not** belong in the wiki.
- **The wiki (Layer 2)** is for durable findings the code can't tell
  you on its own: gotchas, conventions, decisions, pitfalls. It's
  plain markdown, diffable in PRs, revertable, and committed.
- **The schema (Layer 3)** is binding rules that apply on every task:
  `AGENTS.md`, `.github/instructions/*.md`, and the agent
  personalities in `.github/agents/*.agent.md`.
- **Consolidation** goes through the `consolidate-lessons` prompt file,
  not by hand. Ask the agent to follow it with `--dry-run` first; never
  reorganize the wiki by hand because agents rely on stable file paths.
- **Handoff** (the `handoff` prompt file) produces a Layer 1 artefact: one
  task's context, written to a file so a fresh conversation can pick the
  task up. Save it outside the repository (Lab 10 §10.5 uses
  `lab10-handoff.md` in the session's `files/` folder), then open a fresh
  conversation and have it read that file and continue from its Fresh
  Context Prompt section. Nothing curates it, it stays on disk where you
  saved it until you delete it, and a fresh conversation cannot see it
  until you point it there; Lab 10 §10.1 separates those three questions.
  Promote durable findings into Layer 2 (`log.md`) so the next task finds
  them without being pointed at a file.
