---
title: "Agent Memory: Personalities, Lessons, and Consolidation"
lab_number: 10
pace:
  presenter_minutes: 5
  self_paced_minutes: 20
registry: docs/_meta/registry.yaml
---

# 10 — Agent Memory: Personalities, Lessons, and Consolidation

This is the capstone for the local Copilot CLI surface. It teaches **how
Copilot remembers things across sessions — without a knowledge-graph
server, without embeddings, without anything that isn't already plain
markdown in git.**

Andrej Karpathy observed that LLMs compound knowledge dramatically better
when they maintain **their own notes** instead of re-deriving context on
every session via retrieval. The model already knows how to read and
write markdown; give it a wiki and memory becomes a file you can `cat`,
diff, revert, and commit — not a database you have to host. This lab
teaches that pattern in three layers:

| Layer | Name | Surface | Lifetime |
|-------|------|---------|----------|
| 1 | **Raw sources** | `plan.md`, SQL todos, session transcripts | This session |
| 2 | **The Wiki** | `.copilot/lessons/` (project) + `~/.copilot/lessons/` (global) | Across sessions, in markdown |
| 3 | **The Schema** | `AGENTS.md`, `.github/instructions/*.md`, agent personalities | Forever, binding |

Layer 1 is raw signal. Layer 2 is the curated wiki the agent writes *to
itself*. Layer 3 is the rulebook that governs how Layer 2 gets written.
Promotion goes upward: raw → wiki → schema. Nothing lives in two layers
at once.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 20 minutes

> 💰 **Cost Budget** — ~15k in / ~5k out across the three layers.
> Markdown round-trips are cheap; no knowledge-graph server chews tokens
> on every turn. Run Layer 1 and Layer 2 on `claude-haiku-4.5` or
> `gpt-5-mini` (mechanical edits); stay on `auto` or upshift to
> `claude-opus-4.7` only for the §10.4 consolidation pass. `/clear`
> between §10.3 and §10.4. Full guidance:
> [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md).
>
> **Tier picker for this lab:**
>
> | Tier | Model | When to use it here | Rough cost vs. Opus 4.7 |
> |------|-------|--------------------|-------------------------|
> | Cheap | `claude-haiku-4.5` / `gpt-5-mini` | §10.1–10.3 schema + log appends, file reads | ≈ 1/15× |
> | Standard | `claude-sonnet-4.6` / `gpt-5.4` | Mid-complexity edits, schema drafting | ≈ 1/5× |
> | Premium (prior gen) | `claude-opus-4.6` | `task`-tool sub-agent dispatches per repo policy — pin here, not 4.7 | ≈ 0.7× |
> | Premium (current) | `claude-opus-4.7` | §10.4 interactive consolidation pass only | 1.0× (baseline) |
>
> Opus 4.7 is roughly 30–40 % more expensive per token than 4.6 and noticeably better at multi-document reconciliation; Haiku 4.5 is the new low-tier default and ~15× cheaper than 4.7 for the routine append/read loops in §10.1–10.3. Sub-agents launched via the `task` tool stay pinned to `claude-opus-4.6` (see repo `copilot-instructions.md`); the upshift to 4.7 applies only to your interactive pane during §10.4.

References:
- [Repository indexing](https://docs.github.com/en/copilot/concepts/context/repository-indexing)
- [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
- [`.copilot/lessons/README.md`](../.copilot/lessons/README.md) — the pattern, in-repo
- [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md) — the schema
- [`.github/prompts/consolidate-lessons.prompt.md`](../.github/prompts/consolidate-lessons.prompt.md) — the command

## 10.0 Copilot CLI surface check (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh. Versions, model tiers, and MCP server pins live in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — labs reference
> the registry rather than hardcoding values, so a single registry update
> propagates everywhere.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `Shift+Tab` toggles plan mode; autopilot mode is the default | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. |
| **Local tool discovery** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | Discovering which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Note: `extensions_manage` is an MCP tool, **not** a slash command — invoke it via the MCP surface, not via `/extensions_manage`. |
<!-- @end-include docs/_partials/currency.md -->

## 10.1 Layer 1 — Raw sources (session-scoped)

**Lifetime:** this session only.
**Surfaces:** `~/.copilot/session-state/<id>/plan.md`, the per-session SQL
`todos`/`todo_deps` tables, session transcripts, scratch files in `files/`.

Use this layer for the **work-in-flight**: the plan you are executing right
now, the todos you have not finished, the half-formed scratchpad. None of
it is meant to outlive the task. You've seen this layer in every earlier
lab — we just name it explicitly here so the promotion story is clear.

🖥️ **Try it — todo tracking via the session SQL store:**

```
Create a small plan for adding a "Department dashboard" page. Track 3
todos in the session database with id, title, description.
```

The agent calls the `sql` tool against the per-session SQLite database
and inserts rows into the default `todos` table. Follow up:

```
Show me the in-progress todo and mark the first one done.
```

🖥️ **Try it — the persistent plan.md:**

```
Write a 5-line plan.md to my session folder describing this lab.
```

That file is real on disk — inspect it:

**WSL/Bash:**
```bash
cat ~/.copilot/session-state/*/plan.md 2>/dev/null | head -60
```

**PowerShell:**
```powershell
Get-Content $HOME/.copilot/session-state/*/plan.md -ErrorAction SilentlyContinue | Select-Object -First 60
```

> 💡 **Rule of thumb:** if a teammate joining tomorrow would need this
> information, it does *not* belong in Layer 1. Raw sources feed the wiki —
> they are not the wiki themselves. Before `/clear`, ask the agent to
> graduate anything durable into Layer 2.

## 10.2 Layer 2 — The Wiki (LLM-maintained markdown)

**Lifetime:** across sessions, in git.
**Surfaces:** [`.copilot/lessons/`](../.copilot/lessons/) (project scope)
and `~/.copilot/lessons/` (global / per-workstation).

This is the new layer. It is a directory of plain markdown files the agent
writes to itself: a catalog (`index.md`), an append-only journal
(`log.md`), and one topic file per durable lesson. The shape is enforced
by [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md);
Copilot reads that schema automatically on every edit.

🖥️ **Inspect what ships with the repo:**

**WSL/Bash:**
```bash
ls .copilot/lessons/
head -30 .copilot/lessons/README.md
head -30 .copilot/lessons/example-lesson.md
```

**PowerShell:**
```powershell
Get-ChildItem .copilot/lessons
Get-Content .copilot/lessons/README.md | Select-Object -First 30
Get-Content .copilot/lessons/example-lesson.md | Select-Object -First 30
```

You should see:

| File | Role |
|------|------|
| `README.md` | Human-facing pattern explanation. |
| `index.md` | Hand-curated catalog grouped by topic heading. |
| `log.md` | Dated, append-only journal of newly-learned lessons. |
| `example-lesson.md` | One realistic worked lesson with full front-matter. |

### 10.2a Append a lesson to `log.md`

Learning something new mid-session is the trigger for a `log.md` entry.
The schema is short — a level-2 heading and a bullet list with
`Context`, `Lesson`, `Evidence`, `Action for future sessions`, and
`Promoted to`. Ask the agent to record a lesson without editing the
file yourself:

```
I just discovered that `dotnet test` on the Tests/ project alone misses
Web-only breakages in ContosoUniversity.Web. Append a lesson to
.copilot/lessons/log.md following the schema in
.github/instructions/lessons.instructions.md. Leave "Promoted to" blank.
```

🖥️ **Verify the append:**

**WSL/Bash:**
```bash
head -40 .copilot/lessons/log.md
```

**PowerShell:**
```powershell
Get-Content .copilot/lessons/log.md | Select-Object -First 40
```

The new entry should sit at the top (newest first), cite evidence, and
leave `Promoted to:` blank — that gets filled in by `/consolidate-lessons`
in §10.4.

### 10.2b Recall from a fresh session

This is the payoff. Close your current session (`/exit`) and start a new
one, then ask:

```
What have we learned about verifying .NET changes in this repo? Check
.copilot/lessons/ before answering.
```

The agent reads `index.md`, opens `example-lesson.md`, and answers from
the wiki — even though you never told *this* session anything. No
knowledge-graph server, no embeddings; just markdown the agent wrote to
itself last time.

### 10.2c Project vs. global lessons

- **Project lessons** live in `.copilot/lessons/` and ship with the repo
  (things that are true *here*: "run the full ContosoUniversity solution
  build").
- **Global lessons** live in `~/.copilot/lessons/` on each workstation
  (things true *across repos*: "always cite evidence in review comments").

Agents consult both. On conflict, global wins unless the project lesson
carries `scope: project-override` in its front-matter — that flag means
the author deliberately disagrees with the global rule, and consolidation
(§10.4) never auto-reconciles an override.

🖥️ **Scaffold your global wiki (first-run only):**

**WSL/Bash:**
```bash
mkdir -p ~/.copilot/lessons
[ -f ~/.copilot/lessons/index.md ] || printf '# Lessons — Global Index\n\n' > ~/.copilot/lessons/index.md
[ -f ~/.copilot/lessons/log.md ]   || printf '# Lessons — Global Log\n\n'   > ~/.copilot/lessons/log.md
ls ~/.copilot/lessons/
```

**PowerShell:**
```powershell
$lessons = Join-Path $HOME ".copilot/lessons"
New-Item -ItemType Directory -Force -Path $lessons | Out-Null
if (-not (Test-Path "$lessons/index.md")) { "# Lessons — Global Index`n" | Set-Content "$lessons/index.md" -Encoding UTF8 }
if (-not (Test-Path "$lessons/log.md"))   { "# Lessons — Global Log`n"   | Set-Content "$lessons/log.md"   -Encoding UTF8 }
Get-ChildItem $lessons
```

`~/.copilot/lessons/` is personal and is never committed from this repo.

> 💡 **Rule of thumb:** if the lesson is *useful recall* (a pattern, a
> gotcha, a decision) it belongs in Layer 2. If it's a *binding rule*
> every task must obey, it belongs in Layer 3.

## 10.3 Layer 3 — The Schema (how the wiki gets written)

**Lifetime:** forever, in git.
**Surfaces:** [`AGENTS.md`](../AGENTS.md), [`.github/instructions/*.md`](../.github/instructions/),
`.github/copilot-instructions.md`, and the agent personalities in
[`.github/agents/*.agent.md`](../.github/agents/).

Layer 3 is the rulebook the agent follows when it writes to Layer 2. It
is not itself a memory of *what happened*; it is a memory of *how to
behave*. That distinction is what keeps the wiki consistent across
sessions and across contributors.

🖥️ **Inspect the schema in place:**

**WSL/Bash:**
```bash
ls .github/instructions/
head -60 AGENTS.md
head -60 .github/instructions/lessons.instructions.md
```

**PowerShell:**
```powershell
Get-ChildItem .github/instructions
Get-Content AGENTS.md | Select-Object -First 60
Get-Content .github/instructions/lessons.instructions.md | Select-Object -First 60
```

You should see scoped instruction files (e.g. `dotnet.instructions.md`,
`testing.instructions.md`, `lessons.instructions.md`) plus the project's
`AGENTS.md`. Copilot pulls all three into every session in this repo
without you asking.

### 10.3a Extend the schema

Schema changes are binding on every future session. Keep them tight:

```
Append to .github/instructions/testing.instructions.md:
"Every new repository class must have a corresponding xUnit fixture in
dotnet/ContosoUniversity.Tests/Fixtures/."
```

Now open a fresh session and ask the agent to scaffold a repository — it
will follow the rule because Layer 3 is loaded automatically.

### 10.3b Agent personalities — the stewardship story

`AGENTS.md` and `.github/instructions/` apply to *all* agents. But this
repo also ships agent **personalities** — role-specialized agents with
their own voice and tool scope. Each has a different relationship with
the Layer 2 wiki.

🖥️ **Compare two personalities:**

**WSL/Bash:**
```bash
head -30 .github/agents/planner.agent.md
head -30 .github/agents/code-reviewer.agent.md
```

**PowerShell:**
```powershell
Get-Content .github/agents/planner.agent.md | Select-Object -First 30
Get-Content .github/agents/code-reviewer.agent.md | Select-Object -First 30
```

| Agent | Voice | Tools | Relationship to the wiki |
|-------|-------|-------|---------------------------|
| `planner` | Decomposes, assesses risks, never implements. | `read`, `search`, `agent` | **Reads** lessons to avoid planning around solved problems. |
| `code-reviewer` | High signal-to-noise, surfaces only real issues. | `read`, `search` | **Writes** lessons when review uncovers a durable pitfall. |

Different personalities produce different kinds of lessons — a planner's
entry is about *architecture*, a reviewer's about *pitfalls*. The wiki
gets richer when each role contributes from its vantage point, and the
schema keeps their entries shaped the same way.

> 💡 **Rule of thumb:** if a rule must apply on every task, put it in
> Layer 3. If a pattern should only surface *when relevant*, put it in
> Layer 2. Lessons are advisory; schema is binding.

## 10.4 Consolidation — promoting the wiki

The wiki accumulates entropy. Over a few weeks you get duplicate topic
files, stale lessons, and project-scoped entries that actually apply
globally. The `/consolidate-lessons` prompt is the **only** supported
way to reshape the wiki — manual reorganization is a footgun because
agents rely on stable file paths.

🖥️ **Read the command before you run it:**

**WSL/Bash:**
```bash
head -40 .github/prompts/consolidate-lessons.prompt.md
```

**PowerShell:**
```powershell
Get-Content .github/prompts/consolidate-lessons.prompt.md | Select-Object -First 40
```

### 10.4a Dry run first

Always start with `--dry-run` so you can see what would change.
`/consolidate-lessons` is an **inner-Copilot slash command** — type it
**in the Copilot prompt** (not in your shell):

```text
/consolidate-lessons --dry-run --scope both
```

The agent will enumerate the wiki, decide which `log.md` entries are
ready for promotion, flag duplicates, suggest project→global moves, and
print a summary — without writing anything. Read the summary. If it
proposes to merge two files you wanted to keep separate, fix the
front-matter (`tags`, `scope`) and re-run the dry run.

### 10.4b Live consolidation

When the dry-run looks right, run for real — again, **in the Copilot
prompt**, not in your shell:

```text
/consolidate-lessons --scope both
```

Expected diff, given the seed wiki this repo ships:

- The `log.md` entry you added in §10.2a gets a `Promoted to:` value and
  either a new topic file appears or it merges into `example-lesson.md`
  with a Revision log bullet.
- A new bullet lands in `index.md` under the matching topic heading.
- If the lesson looks globally applicable, a copy moves to
  `~/.copilot/lessons/` with `scope: global` and the project file
  becomes a stub.
- Any contradiction between a project and global lesson is **flagged**,
  not auto-resolved, under `CONTRADICTION` in the summary.

🖥️ **Review the diff before staging anything:**

**WSL/Bash:**
```bash
git status .copilot/lessons/
git --no-pager diff --stat .copilot/lessons/
```

**PowerShell:**
```powershell
git status .copilot/lessons/
git --no-pager diff --stat .copilot/lessons/
```

Per `AGENTS.md`: stage files individually with `git add <path>` — never
`git add .` or `git add -A`.

### 10.4c Graduating a lesson into Layer 3

If a topic file keeps getting cited across every review and every
planning pass, promote it out of Layer 2 and into Layer 3 — append a
rule to `AGENTS.md` or a targeted `.github/instructions/*.md` file and
delete the lesson (keep the `log.md` history). The wiki stays a
*library*; the schema stays a *constitution*. Don't let them blur.

### 10.4d Autopilot — one paragraph, not a feature

If you want consolidation to run on a cadence, add a cron/launchd/Task
Scheduler entry that launches a non-interactive Copilot session and
sends the slash command as the prompt — for example:

```bash
copilot --prompt '/consolidate-lessons --scope both' --allow-all-tools
```

(Slash commands are inner-Copilot, so they reach the runtime via
`--prompt`, not as bare shell arguments.) This repo does not ship a
schedule — cadences are environment-specific and belong in your
personal setup.

---

## 10.5 Wrap — the loop, drawn

```
 Layer 1                   Layer 2                    Layer 3
 Raw sources  ───────────► The Wiki  ────────────►   The Schema
 (plan.md,                (.copilot/lessons/,         (AGENTS.md,
  SQL todos)              ~/.copilot/lessons/)        instructions,
                                                      agent personalities)

   session        /consolidate-lessons       hardens into a rule
  only dies       promotes log → topic       when it must apply
   at /clear      and project → global       on every task
```

Three layers, one direction of promotion, zero servers to operate.
Your checklist for the next real task:

1. **Open the session (L1):** `/checkpoint create "<task>"`, write a short
   plan.md, insert todos into the SQL store.
2. **Consult the wiki (L2):** ask the agent to check
   `.copilot/lessons/index.md` and `~/.copilot/lessons/index.md` before
   starting.
3. **Append when you learn (L2):** any finding that will matter next
   time goes into `log.md` with evidence cited.
4. **Harden into schema (L3):** if a rule should apply on every task,
   propose it during consolidation — not mid-feature.
5. **Consolidate weekly:** `/consolidate-lessons --dry-run` first; commit
   the live run when the diff is clean.

🖥️ **End-of-lab handoff drill:** in the Copilot prompt (not your
shell), type the slash command `/handoff_prompt` with work description
"Completed Lab 10 — three-layer agent memory" and stop reason "Lab
complete". The output is itself a Layer 1 artefact — it dies with the
next session unless you graduate durable findings into Layer 2 or 3.

<details>
<summary>Key Takeaways</summary>

| Concept | Layer | Lifetime |
|---------|------:|----------|
| `plan.md`, SQL todos, `/checkpoint`, session-state | 1 | This session |
| `.copilot/lessons/`, `~/.copilot/lessons/` | 2 | Across sessions, in markdown |
| `AGENTS.md`, `.github/instructions/`, agent personalities | 3 | Forever, binding |
| Reindex / LSP | — | Automatic; reads code, stores nothing |

Promotion: L1 → L2 when durable; L2 project → L2 global when cross-repo;
L2 → L3 when binding on every task. Nothing lives in two layers at once.
Markdown round-trips are cheap — a weekly consolidation touches a handful
of files and costs pennies.

</details>

<details>
<summary>Solution: lab10-session-management reference materials</summary>

See [`solutions/lab10-session-management/`](../solutions/lab10-session-management/) — in particular [`README.md`](../solutions/lab10-session-management/README.md), [`sample-handoff.md`](../solutions/lab10-session-management/sample-handoff.md), and [`sample-checkpoint-log.txt`](../solutions/lab10-session-management/sample-checkpoint-log.txt) — for the complete reference implementation.

</details>

## Lab Complete 🎉

You've now mapped every memory surface the local Copilot CLI exposes:

- ✅ **Lab 01–09** — agents, skills, hooks, MCP, orchestration, gh-aw,
  Coding Agent, Code Review.
- ✅ **Lab 10** — three-layer agent memory: raw sources, the wiki, the
  schema, and the consolidation loop that keeps them clean.
- ⏭ **Lab 11** — building and distributing a Copilot plugin
  (enterprise marketplace pattern) so the lessons and schema you curated
  above ship to other teams.

### What's next?

- **Customize:** seed `.copilot/lessons/` in your own repo with one
  real lesson. Most teams over-rely on Layer 1 and never start Layer 2.
- **Audit:** run `extensions_manage` operation `list` and confirm
  Layer 3 in your repo is the minimum viable set, not a junk drawer.
- **Share:** commit your wiki. A PR that adds a lesson is as valuable
  as a PR that fixes a bug — it teaches every future session at once.

**Return to:** [README](../README.md)

## 10.6 Cleanup

### Lab 10–specific: prune the global lessons folder

`~/.copilot/lessons/` is a per-workstation Layer 2 surface. Across many
lab runs it accumulates topic files, `log.md` entries, and stub
indexes that other sessions wrote. Before moving on, decide whether to
**keep** the global wiki you've curated or **reset** it to a clean
state for the next learner on this workstation.

> ⚠️ Only delete files **you** created in this lab. If you share the
> workstation, list contents first and remove individual paths — never
> blanket-delete the directory.

🖥️ **Inspect, then prune:**

**WSL/Bash:**
```bash
# 1. List what's there:
ls -la ~/.copilot/lessons/ 2>/dev/null

# 2. Remove individual files this lab created (example):
rm -f ~/.copilot/lessons/<topic-file-you-added>.md

# 3. Full reset (only if this is your personal workstation and you
#    want to start the global wiki over):
rm -rf ~/.copilot/lessons
```

**PowerShell:**
```powershell
$lessons = Join-Path $HOME ".copilot/lessons"

# 1. List what's there:
Get-ChildItem $lessons -Force -ErrorAction SilentlyContinue

# 2. Remove individual files this lab created (example):
Remove-Item (Join-Path $lessons "<topic-file-you-added>.md") -ErrorAction SilentlyContinue

# 3. Full reset (only if this is your personal workstation and you
#    want to start the global wiki over):
Remove-Item $lessons -Recurse -Force -ErrorAction SilentlyContinue
```

The project-scoped `.copilot/lessons/` directory is committed to the
repo — leave it alone unless you also revert the corresponding edits
via `git restore`.

<!-- @include docs/_partials/cleanup.md — do not edit inline; edit the partial and re-sync. -->
> 🧹 **Cleanup — leave the machine the way you found it.**
> Run this checklist before moving to the next lab. Per-lab specifics (named
> agent / hook / extension files this lab created) should already have been
> reverted in the steps above; this is the generic sweep that catches the
> long-tail.

🖥️ **In your terminal:**

1. **Stop background processes.** Anything you started in the foreground with
   `&` or in another tmux pane (dev servers, watchers, `gh aw` long-runs,
   tail-follows). If you used the bash tool in async mode, make sure those
   shells are stopped.

   **WSL/Bash:**
   ```bash
   jobs -l                       # any background jobs in this shell?
   # kill them by PID — never `pkill`/`killall`
   ```

   **PowerShell:**
   ```powershell
   Get-Job                       # any background jobs?
   Get-Job | Stop-Job; Get-Job | Remove-Job
   ```

2. **Restore Copilot CLI config if you mutated it.** Some labs ask you to
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json`. If you stashed the original, restore it now.
   If you edited in place without backing up, check `git status` in the lab
   repo (workspace configs) and revert anything you didn't mean to keep.

   **WSL/Bash:**
   ```bash
   # If you saved a backup like ~/.copilot/config.json.bak:
   [ -f ~/.copilot/config.json.bak ] && mv ~/.copilot/config.json.bak ~/.copilot/config.json
   ```

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** These directories accumulate
   across labs and are safe to clean once you've finished:

   ```bash
   # Per-session scratch (safe to inspect; delete only what this lab created):
   ls ~/.copilot/lessons/        2>/dev/null
   ls node/.a2a/                  2>/dev/null
   ls node/.a2a-transcript-*.md   2>/dev/null
   ls .git/CLAB_SUMMARY.md        2>/dev/null
   ```

   Delete only files that this lab created. Do not blanket-delete
   `~/.copilot/lessons/` if other sessions wrote to it.

5. **Revert any `core.hooksPath` or other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise.

   ```bash
   git config --get core.hooksPath
   # if set to a lab path, unset:
   git config --unset core.hooksPath
   ```

6. **Confirm working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Any unexpected files (untracked agents, hooks, extensions, scratch
   notebooks) should be removed or moved out of the repo before continuing.

7. **Verify build is still green.** Optional but recommended after labs that
   touched hooks, agents, or skills:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept) and the build is clean, you're ready for the next lab.
<!-- @end-include docs/_partials/cleanup.md -->
