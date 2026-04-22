---
title: "Context, Memory & Learning — The Four Layers"
lab_number: 10
pace:
  presenter_minutes: 5
  self_paced_minutes: 20
registry: docs/_meta/registry.yaml
---

# 10 — Context, Memory & Learning: The Four Layers

This is the capstone for the local Copilot CLI surface. By now you have
seen agents, skills, hooks, MCP servers, and orchestration. This lab puts
the last load-bearing piece into place: **how Copilot remembers things**.

There are exactly four memory layers in this repo. They do not overlap.
Pick the right one and your sessions stay focused; pick the wrong one and
either context bloats or knowledge evaporates.

> 📍 **Companion reference:** [`docs/memory-decision-tree.md`](../docs/memory-decision-tree.md)
> is a 1-page flowchart for choosing a layer. Keep it open in a second pane
> while you work through this lab.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 20 minutes

> 💰 **Cost Budget**
> - Expected token footprint: ~25k in / ~8k out across the four
>   memory layers. Layer 3 (Memory MCP) dominates because the
>   knowledge-graph round-trips are tool-heavy.
> - Cheaper alternative: drive Layer 1 (session context) and
>   Layer 2 (project memory) exercises on `claude-haiku-4.5` —
>   they're mechanical file edits. Stay on `auto` (or upshift to
>   `claude-opus-4.6`) only for the Layer 4 instinct-evolution
>   discussion in §10.4.
> - Compaction trigger: after §10.2 (project memory done), the
>   AGENTS.md / instructions diffs are re-read every turn — run
>   `strategic-compact` before starting §10.3 so Layer 3 begins
>   with a clean slate.
> - See [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md).

References:
- [Repository indexing](https://docs.github.com/en/copilot/concepts/context/repository-indexing)
- [Memory MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
- [MCP specification](https://modelcontextprotocol.io/specification)
- [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)

## 10.0 Copilot CLI surface check (2026 refresh)

> 💡 Commands and tiers below are pinned in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). If the registry
> moves, this lab follows; you should not see hardcoded versions in the
> body.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling a memory- or session-management plugin (e.g. continuous-learning bundles). |
| **Parallel subagents** | `/fleet` | Running many short-lived workers under one long-lived orchestrator (Lab 14 deep-dives the tmux pattern). |
| **Plan mode vs autopilot mode** | `Shift+Tab` cycles interactive → plan mode → autopilot mode | Plan mode while building up session memory; autopilot mode for handoff rituals. |
| **Mid-session model switch** | `/model <tier-or-id>` | Switch between `models.cheap`, `models.standard`, and `models.premium` tiers in the registry without restarting the session. |
| **Local tool discovery** | `extensions_manage` operation `list` / `inspect` | The local analogue of a marketplace — shows every skill, agent, and hook contributing context right now. |

## 10.0a Reindex: the layer that *doesn't* count

Before we count to four, get one thing straight: **reindex is not a memory
layer**. It is automatic semantic indexing of code that already exists in
the repo. You don't manage it, you don't decide what to put in it, and it
never persists anything that isn't already in source control.

🖥️ **Try it:**

```
How does the repository pattern work in ContosoUniversity?
What happens when a student enrolls in a course? Trace controller → DB.
```

Copilot answers by searching semantically — it knows "enrolls" relates to
the `Enrollment` entity, the controller, and the repository methods even
when the word "enroll" doesn't appear in those files. That's reindex doing
its job.

If your question can be answered by reading the code, **stop here**. The
four layers below are for everything else.

---

## 10.1 Layer 1 — Session context

**Lifetime:** this session only.
**Surfaces:** `~/.copilot/session-state/<id>/plan.md`, the per-session SQL
`todos`/`todo_deps` tables, `/checkpoint`, scratch files in `files/`.

Use this layer for the **work-in-flight**: the plan you are executing right
now, the todos you have not finished, the half-formed scratchpad. None of
it is meant to outlive the task.

🖥️ **Try it — todo tracking via the session SQL store:**

```
Create a small plan for adding a "Department dashboard" page. Track 3
todos in the session database with id, title, description.
```

The agent calls the `sql` tool against the per-session SQLite database and
inserts rows into the default `todos` table. Ask:

```
Show me the in-progress todo and mark the first one done.
```

🖥️ **Try it — the persistent plan.md:**

```
Write a 5-line plan.md to my session folder describing this lab.
```

The agent writes to `~/.copilot/session-state/<id>/plan.md`. That file is
real on disk — `cat` it:

**WSL/Bash:**
```bash
cat ~/.copilot/session-state/*/plan.md 2>/dev/null | head -20
```

**PowerShell:**
```powershell
Get-Content $HOME/.copilot/session-state/*/plan.md -ErrorAction SilentlyContinue | Select-Object -First 20
```

> 💡 **Rule of thumb:** if a teammate joining tomorrow would need this
> information, it does *not* belong in Layer 1. Promote it to Layer 2 or
> Layer 3 before you `/clear`.

## 10.2 Layer 2 — Project memory

**Lifetime:** forever (it lives in git).
**Surfaces:** `AGENTS.md`, `.github/instructions/*.md`,
`.github/copilot-instructions.md`, repo-local `.copilot/` conventions.

Use this layer for **rules every contributor and every agent must obey**:
language idioms, commit hygiene, security policy, architectural style.
Anything you would put in a CONTRIBUTING.md belongs here too — but
expressed in a form Copilot reads automatically.

🖥️ **Inspect what's already in place:**

**WSL/Bash:**
```bash
ls .github/instructions/ && head -20 AGENTS.md
```

**PowerShell:**
```powershell
Get-ChildItem .github/instructions; Get-Content AGENTS.md | Select-Object -First 20
```

You should see scoped instruction files (e.g. `dotnet.instructions.md`,
`testing.instructions.md`) plus the project's `AGENTS.md`. Copilot pulls
all three into every session in this repo without you asking.

🖥️ **Try it — extend Layer 2:**

Add a one-line rule:

```
Append to .github/instructions/testing.instructions.md:
"Every new repository class must have a corresponding xUnit fixture in
dotnet/ContosoUniversity.Tests/Fixtures/."
```

Now open a fresh session and ask the agent to scaffold a repository — it
will follow the rule because Layer 2 is loaded automatically.

> 💡 **Rule of thumb:** if a rule should still be true a year from now and
> applies to *everyone*, write it once into Layer 2 and stop repeating it
> in prompts.

## 10.3 Layer 3 — Cross-session memory (Memory MCP)

**Lifetime:** across sessions, per machine or per team.
**Surface:** the Memory MCP knowledge graph — entities, observations,
relations.

Use this layer for **decisions and rationale that aren't in the code**:
why you picked one library over another, what the on-call rotation
discovered last quarter, where the bodies are buried.

🖥️ **Verify the server is wired up:**

**WSL/Bash:**
```bash
cat mcp-configs/copilot-cli/individual/memory.json
```

**PowerShell:**
```powershell
Get-Content mcp-configs/copilot-cli/individual/memory.json
```

You should see the standard `@modelcontextprotocol/server-memory`
invocation. The server exposes:

| Tool | Purpose |
|------|---------|
| `create_entities` | New nodes in the knowledge graph |
| `create_relations` | Edges between entities |
| `add_observations` | Facts attached to an entity |
| `search_nodes` / `open_nodes` | Lookups |
| `read_graph` | Dump the whole graph |
| `delete_*` | Targeted removal |

🖥️ **Store a decision:**

```
In Memory MCP, create an entity:
  name: ContosoUniversity-Decisions
  type: decisions
  observations:
    - "Repository pattern over direct DbContext for testability"
    - "SQL Server in prod, SQLite via WebApplicationFactory in tests"
    - "gh-aw PRD workflow does NOT trigger on hotfixes — feature/** only"
```

🖥️ **Recall it from a fresh session:**

```
What testing decisions are recorded for ContosoUniversity?
```

The agent calls `search_nodes` and answers from Layer 3 — even though you
never told *this* session anything.

### 10.3a Offline / regulated-environment variant

If you operate in an air-gapped or regulated environment, the default
`npx -y @modelcontextprotocol/server-memory` invocation is blocked
(no registry egress) and the shared graph may not be acceptable. This
repo ships an offline variant:

**WSL/Bash:**
```bash
cat mcp-configs/copilot-cli/individual/memory-offline.json
```

**PowerShell:**
```powershell
Get-Content mcp-configs/copilot-cli/individual/memory-offline.json
```

Key differences:

- Runs from `./vendor/mcp-server-memory/` (vendor the package once via
  `npm pack` and unpack into the repo).
- Persists the graph to `./.copilot/memory/knowledge-graph.json` — a
  single auditable JSON file you control.
- Sets `MCP_MEMORY_OFFLINE=1` so the mode is grep-able from process logs.
- Mutually exclusive with the online `memory` server: pick one.

> ⚠️ Do not enable both `memory` and the offline variant — graphs will
> diverge silently and recall will become non-deterministic.

> 💡 **Rule of thumb:** if it's a *fact* that survives the session and
> isn't already in the code, Layer 3.

## 10.4 Layer 4 — The instinct & learning loop

**Lifetime:** across sessions, promoted into skills/commands/agents over
time.
**Surfaces:** [`continuous-learning-v2`](../.github/skills/continuous-learning-v2/SKILL.md),
`/learn`, `instinct-status`, `/evolve`, `/instinct-export`,
`/instinct-import`. Storage at `~/.copilot/homunculus/instincts/`.

Use this layer when a **behaviour** keeps repeating and you want Copilot
to do it without being asked next time. The unit is the *instinct* — a
small, atomic learned behaviour with a confidence score.

### The flow

```
observe (every tool call)
   │
   ▼
atomic instinct created  (confidence 0.3 — tentative)
   │
   │  fires again, user doesn't correct
   ▼
confidence climbs        (0.6 → 0.9)
   │
   ▼
/evolve clusters related instincts
   │
   ▼
promoted to a skill / command / agent (Layer 2!)
   │
   ▼
/instinct-export → teammate /instinct-import
```

Notice the loop: **Layer 4 graduates findings into Layer 2.** That's the
whole point of v2 over v1 — instead of guessing what to extract at
session end, the system observes continuously, builds confidence, and
only promotes when the evidence is solid.

🖥️ **Inspect existing instincts on this machine:**

**WSL/Bash:**
```bash
ls ~/.copilot/homunculus/instincts/personal/ 2>/dev/null | head
head -10 ~/.copilot/homunculus/instincts/personal/*.md 2>/dev/null | head -40
```

**PowerShell:**
```powershell
Get-ChildItem $HOME/.copilot/homunculus/instincts/personal -ErrorAction SilentlyContinue | Select-Object -First 10
```

Each instinct is a markdown file with frontmatter (`id`, `trigger`,
`confidence`, `domain`). The kernel of `/instinct-export` ↔
`/instinct-import` is exercised by
[`scripts/memory/instinct-roundtrip.ts`](../scripts/memory/instinct-roundtrip.ts);
its tests prove that confidence survives a round-trip exactly.

🖥️ **Try the loop hands-on:**

```
/learn — capture an instinct from this session: "always run npm test
before committing changes to tests/"
```

```
/instinct-status — show me everything captured today with confidence > 0.5
```

```
/evolve — cluster any related instincts about commit hygiene into a single
skill candidate
```

### Why these v1 surfaces are deprecated

The repo intentionally keeps three older skills on disk so you can see the
evolution:

| Skill | Status | Replacement |
|-------|--------|-------------|
| [`continuous-learning`](../.github/skills/continuous-learning/SKILL.md) | `deprecated: true` | `continuous-learning-v2` |
| [`iterative-retrieval`](../.github/skills/iterative-retrieval/SKILL.md) | `deprecated: true` | folded into v2 instinct loop |
| [`strategic-compact`](../.github/skills/strategic-compact/SKILL.md) | `deprecated: true` | expressed as a v2 instinct ("compact before phase change") |

Each carries `deprecated: true` + `redirect:` in its YAML frontmatter and
a banner in the body. The
[`tests/memory/skills-consolidation.test.ts`](../tests/memory/skills-consolidation.test.ts)
suite enforces that.

> 💡 **Rule of thumb:** if you are typing the same correction to Copilot
> for the third time, it belongs in Layer 4. Capture the instinct, watch
> it climb, then `/evolve` it into a Layer 2 rule that nobody has to
> remember.

---

## 10.5 Putting the four layers together

Run through this checklist on your next real task:

1. **Layer 1 — open the session.** `/checkpoint create "<task>"`, write a
   short plan.md, insert todos into the SQL store.
2. **Layer 2 — load the rules.** Confirm with `extensions_manage` that
   the right instructions and skills are active for this repo.
3. **Layer 3 — recall decisions.** `read_graph` (or a targeted
   `search_nodes`) before you start changing things, so you don't
   re-litigate a settled architectural call.
4. **Layer 4 — capture the lesson.** When something surprises you,
   `/learn`. When the instinct fires three times, `/evolve`.
5. **Handoff.** `/handoff_prompt` overwrites the session document so the
   next role (or the next you) walks in with full context.

🖥️ **End-of-lab handoff drill:**

```
/handoff_prompt
```

Provide:
- **Work description:** "Completed Lab 10 — four memory layers"
- **Stop reason:** "Lab complete"

The output is a structured document the next session can paste back in.
That document is itself a Layer 1 artefact — it dies with the next
session unless you graduate any persistent findings into Layer 2 or 3.

## 10.6 Lightweight reference: advanced surface

The four layers are the load-bearing concepts. The CLI also exposes
context-management tooling that helps you keep each layer healthy:

| Command | Purpose | Layer it serves |
|---------|---------|-----------------|
| `/compact` | Summarize conversation history | Layer 1 |
| `/context` | Visualize token usage | Layer 1 |
| `/clear` | Reset between phases | Layer 1 |
| `/lsp` | Configure language servers (semantic code reads) | reindex (not a layer) |
| `/share` | Export session to markdown / gist | Layer 1 → external |
| `/fleet` | Spawn parallel sub-agents | Orchestration (Lab 14) |

> 💡 LSP gives Copilot semantic code understanding; it is the "verb" form
> of reindex. Neither is a memory layer — they read code, they don't store
> knowledge.

## 10.7 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Layer | Lifetime |
|---------|------:|----------|
| `plan.md`, SQL todos, `/checkpoint`, session-state | 1 | This session |
| `AGENTS.md`, `.github/instructions/`, `copilot-instructions.md` | 2 | Forever (in git) |
| Memory MCP knowledge graph (online or offline variant) | 3 | Across sessions |
| Continuous-learning-v2 instinct loop, `/evolve`, instinct export/import | 4 | Across sessions; graduates into Layer 2 |
| Reindex / LSP | — | Automatic; reads code, stores nothing |

**Promotion rules**

- Layer 1 → Layer 2 when a finding is durable and applies to everyone.
- Layer 1 → Layer 3 when a finding is durable and rationale-shaped.
- Layer 4 → Layer 2 via `/evolve` when an instinct's confidence is high
  and it cleanly maps to a skill, command, or agent.
- Nothing belongs in two layers at once.

</details>

## Lab Complete 🎉

You've now mapped every memory and learning surface the local Copilot CLI
exposes:

- ✅ **Lab 01–09** — agents, skills, hooks, MCP, orchestration, gh-aw,
  Coding Agent, Code Review.
- ✅ **Lab 10** — the four memory layers and the loop that promotes
  instincts into rules.
- ⏭ **Lab 11** — building and distributing a Copilot plugin (enterprise
  marketplace pattern) so the rules you discovered above ship to other
  teams.

### What's next?

- **Customize:** apply the four-layer model to your own repo. Most teams
  over-rely on Layer 1 and starve Layers 2–4.
- **Audit:** run `extensions_manage` operation `list` and confirm Layer 2
  in your repo is the minimum viable set, not a junk drawer.
- **Share:** `/instinct-export` your strongest instincts and have a
  teammate `/instinct-import` them — confidence transfers exactly.

**Return to:** [README](../README.md)
