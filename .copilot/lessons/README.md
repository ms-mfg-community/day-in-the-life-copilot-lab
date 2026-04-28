# `.copilot/lessons/` — The Wiki Layer

This directory is **Layer 2** of the agent memory model taught in
[Lab 10](../../labs/lab10.md): an LLM-maintained markdown wiki that lets
agents compound knowledge across sessions without re-deriving it via RAG
or a knowledge-graph server.

Inspired by Andrej Karpathy's observation that LLMs get dramatically
more useful when they maintain their *own* notes, this wiki is:

- **Plain markdown.** No database, no MCP server, no embeddings.
- **Agent-authored, agent-read.** Copilot writes entries when it learns
  something; Copilot reads them when a fresh session starts.
- **Reviewable.** Everything is in git. You can diff, revert, squash.
- **Cheap.** A lesson is a few hundred tokens of markdown; round-trips
  cost pennies versus knowledge-graph upkeep.

## Layout

| File | Role |
| --- | --- |
| `index.md` | Hand-curated catalog — the table of contents agents consult first. |
| `log.md` | Append-only journal. Every new lesson gets a dated line here before being promoted into `index.md`. |
| `<topic>.md` | One file per durable lesson. Named with kebab-case (e.g. `example-lesson.md`). |

## Project vs. global

- **Project lessons** live here (`.copilot/lessons/`) and ship with the repo.
- **Global lessons** live in `~/.copilot/lessons/` on each workstation
  and follow the same shape. Agents consult both; global wins on
  conflict unless the project lesson is explicitly marked
  `scope: project-override`.

`.copilot/lessons/` is committed. `~/.copilot/lessons/` is personal and
is never committed from this repo.

## Writing rules

Authoring rules for agents live in
[`.github/instructions/lessons.instructions.md`](../../.github/instructions/lessons.instructions.md).
That file is the schema — the grammar agents follow when they add to
the wiki. Humans should read it once; agents read it on every edit.

## Consolidation

Over time the wiki accumulates duplicates, stale entries, and
project-scoped lessons that deserve promotion to global. Run the
consolidation command periodically:

```bash
# In Copilot CLI or VS Code Copilot Chat
/consolidate-lessons
```

The prompt lives at
[`.github/prompts/consolidate-lessons.prompt.md`](../../.github/prompts/consolidate-lessons.prompt.md).
It merges duplicates, promotes project→global, and flags contradictions
for human review. Lab 10 §10.4 walks through a live consolidation.

## When **not** to use this

- Secrets, credentials, customer data — these never go in lessons.
- Session-scoped scratch work — that belongs in `plan.md` (Layer 1).
- Structural rules that must apply to every task — that belongs in
  `AGENTS.md` or `.github/instructions/` (Layer 3).
