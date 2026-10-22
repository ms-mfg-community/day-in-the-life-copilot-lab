---
title: "Agent Memory: Personalities, Lessons, and Consolidation"
lab_number: 10
pace:
  presenter_minutes: 5
  self_paced_minutes: 75
prerequisites:
  - lab02
  - lab04
registry: docs/_meta/registry.yaml
---

# 10 — Agent Memory: Personalities, Lessons, and Consolidation

This is the capstone for the local Copilot CLI surface. It teaches **how
Copilot remembers things across sessions — without a knowledge-graph
server, without embeddings, without anything that isn't already plain
markdown in git.**

An agent compounds knowledge far better when it maintains **its own
notes** than when it re-derives the same context from scratch on every
session. The model already knows how to read and write markdown; give it
a wiki and memory becomes a file you can `cat`, diff, revert, and commit
— not a database you have to host. This lab teaches that pattern in
three layers:

| Layer | Name | Surface | Lifetime |
|-------|------|---------|----------|
| 1 | **Raw sources** | `plan.md`, SQL todos, session transcripts | One task — kept on disk, but not curated or shared |
| 2 | **The Wiki** | `.copilot/lessons/` (project) + `~/.copilot/lessons/` (global) | Across sessions, in markdown |
| 3 | **The Schema** | `AGENTS.md`, `.github/instructions/*.md`, agent personalities | Forever, binding |

Layer 1 is raw signal. Layer 2 is the curated wiki the agent writes *to
itself*. Layer 3 is the rulebook that governs how Layer 2 gets written.
Promotion goes upward: raw → wiki → schema. Nothing lives in two layers
at once.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 75 minutes

> 📋 **Before you start.** This lab is for the **local Copilot CLI** and is
> an advanced-tier lab: it cannot be completed from VS Code alone, because
> §10.0 and the session steps rely on CLI-only commands and flags. Four
> things to know up front:
>
> - **Time.** Plan on about **75 minutes** (65–85 with questions and one
>   recovery) for the whole path, §10.6 cleanup included: roughly 15 for
>   the start and §10.0–§10.1, 12 for §10.2, 12 for §10.3, 17 for §10.4,
>   9 for §10.5 and 10 for §10.6. These are planning estimates, not
>   measurements. In a workshop the presenter's 5–7 minutes show only the
>   layer table above, the read-only look at `.copilot/lessons/` in §10.2
>   and the §10.5 diagram; the rest is self-paced.
> - **Prerequisites.** Finish [Lab 02 — Custom Instructions & AGENTS.md](lab02.md)
>   (§10.3 edits an instruction file) and [Lab 04 — Skills & Prompts](lab04.md)
>   (§10.4–§10.5 use prompt files) first. Your CLI must meet
>   `copilot_cli_version_floor` in
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). You also need
>   `git` and the .NET SDK. The lab runs only `dotnet build`: running that
>   project's tests would also need the ASP.NET Core 8 runtime, which a
>   machine with only a newer runtime does not have
>   (`dotnet --list-runtimes` shows what you have), so the lab never asks you to.
> - **Use a clean, disposable checkout.** §10.3a and §10.4 edit tracked
>   files, and §10.6 puts them back with `git restore`, which can only
>   return a file to your last commit. Check and record your starting point
>   below before you change anything; a fresh clone or a throwaway
>   `git worktree` is the easy way to get a clean one.
> - **Writing outside the repository is opt-in.** Apart from the CLI's own
>   session folder (`~/.copilot/session-state/`, where §10.1 has the agent
>   write a `plan.md` and §10.5 a handoff), the core path writes only
>   inside this checkout. §10.2c offers an optional extension that also
>   creates `~/.copilot/lessons/` in your home directory. It runs only if
>   the baseline below says that folder does not exist yet, and §10.6
>   removes it again. Skip it and nothing else outside the repository
>   changes; every consolidation run then uses `--scope project`.

🖥️ **Record your starting point** before you change anything:

**WSL/Bash:**
```bash
git status --short   # must print nothing; if it lists files, commit or stash them first
git rev-parse HEAD   # note this SHA — §10.6 checks that it has not moved
if [ -d ~/.copilot/lessons ]; then echo "global wiki: present"; else echo "global wiki: absent"; fi
```

**PowerShell:**
```powershell
git status --short   # must print nothing; if it lists files, commit or stash them first
git rev-parse HEAD   # note this SHA — §10.6 checks that it has not moved
if (Test-Path "$HOME/.copilot/lessons") { "global wiki: present" } else { "global wiki: absent" }
```

If the last line says `present`, you already keep a global wiki of your
own. Skip the optional §10.2c extension and leave it untouched; everything
else in the lab still works. WSL and Windows have separate home folders,
so run this check, the §10.2c extension and the §10.6 cleanup from the
same shell.

> 💰 **Cost Budget** — ~15k in / ~5k out across the three layers.
> Markdown round-trips are cheap; no knowledge-graph server chews tokens
> on every turn. Run Layer 1 and Layer 2 on a `models.cheap` entry
> (mechanical edits); stay on `auto` or upshift to `models.premium` only
> for the §10.4 consolidation pass. `/clear` between §10.3 and §10.4.
> Full guidance:
> [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md).
>
> **Tier picker for this lab.** The tiers below are the ones defined in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — look the
> concrete model ids up there rather than copying one from this page, and
> run `/model` to see what your own account can serve today.
>
> | Registry tier | When to use it here |
> |---------------|---------------------|
> | `models.cheap` | §10.1–10.3 schema + log appends, file reads |
> | `models.standard` | Mid-complexity edits, schema drafting |
> | `models.premium` | §10.4 interactive consolidation pass only |
>
> What matters is the ordering, not a price ratio: the append/read loops
> in §10.1–10.3 are mechanical and belong at the bottom of the table,
> while the multi-document reconciliation in §10.4 is the one step that
> earns the top. The registry is the only place this repo names a model
> id, so when the lineup moves you fix it once, there, and every lab
> follows.

References:
- [Repository indexing](https://docs.github.com/en/copilot/concepts/context/repository-indexing)
- [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
- [`.copilot/lessons/README.md`](../.copilot/lessons/README.md) — the pattern, in-repo
- [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md) — the schema
- [`.github/skills/consolidate-lessons/SKILL.md`](../.github/skills/consolidate-lessons/SKILL.md) — the skill that promotes lessons

## 10.0 Copilot CLI surface check (2026 refresh)

<!-- §10.0 is intentionally lab-local. It was detached from docs/_partials/currency.md
because that shared partial has not yet caught up with the current CLI on three
points: the default agent mode, the scope of extensions_manage, and whether
language-server management has a slash command. Re-attach this section once
the partial is corrected. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (GA June 23, 2026):** `/plugin`, `/mcp`, and
> `/skills` are real interactive commands backed by an in-terminal dashboard —
> you can discover, install, and configure plugins, MCP servers, and skills
> without hand-editing config files. The terminal also gained tabs for
> browsing issues/PRs/gists. Config-file editing still works, but the
> dashboard is now the primary interactive path for a human at the prompt.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` (or the `/plugin` dashboard) | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `Shift+Tab` cycles standard (interactive) → plan → autopilot; `/plan` and `/autopilot` are also available | A new interactive session starts in standard (interactive) mode, **not** autopilot. To start elsewhere, launch with `--plan` or `--autopilot`, or set `defaultMode` (see `copilot help config`). Plan-heavy work (design, decomposition) belongs in plan mode; use autopilot mode only for well-scoped execution you are comfortable letting run unattended. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. |
| **Local tool discovery (model-side)** | `extensions_manage` tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent managing **extensions**: listing, inspecting, or scaffolding them. It is **not** an inventory of agents, skills, hooks, or MCP servers; use `/env` (next row) for that. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Loaded environment (user-side)** | `/env` | The human checking what the session actually loaded — instructions, MCP servers, skills, agents, hooks, plugins, LSPs, and extensions — before wiring a handoff. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not**. |
| **LSP-backed code intelligence** | Automatic once a server is configured; `/lsp` manages language-server configuration | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy — you do not invoke it per query. Use `/lsp` to manage servers (starting, stopping, or reloading one needs a running session); `copilot lsp list` prints what is configured. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |

## 10.1 Layer 1 — Raw sources (task-scoped)

**Lifetime:** one task. The files stay on disk after it, but nothing
curates them and no other session is meant to read them.
**Surfaces:** `~/.copilot/session-state/<id>/plan.md`, the per-session SQL
`todos`/`todo_deps` tables, session transcripts, scratch files in `files/`.

Use this layer for the **work-in-flight**: the plan you are executing right
now, the todos you have not finished, the half-formed scratchpad. None of
it is meant to outlive the task. Layer 1's surfaces are mostly new here —
earlier labs used them implicitly; this section is where we name them.

The **session SQL store** is a small SQLite database Copilot opens for
each session (`session.db` in the session folder). It ships with a `todos`
table (plus `todo_deps` for prerequisites) and the agent reads and writes
it through the `sql` tool. Only that session uses it — which is precisely
what makes it Layer 1 rather than Layer 2.

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

🖥️ **Try it — the plan.md file:**

```
Write a 5-line plan.md to my session folder describing this lab. Make
the first line exactly "# Lab 10 plan", then tell me the full path of
the file you wrote.
```

That file is real on disk. Your machine keeps a folder for every session
you have ever run, and other sessions (or an earlier run of this lab) may
hold a `plan.md` with the same heading, so do not search for it: open the
exact path the agent just reported. Replace `<path>` below with that path,
using the shell for the environment where `copilot` runs: WSL and Windows
have separate home folders, so the other one cannot see the file.

**WSL/Bash:**
```bash
head -n 20 "<path>"
```

**PowerShell:**
```powershell
Get-Content "<path>" -TotalCount 20
```

If the agent gave a `~/...` path, use it as written in PowerShell; in Bash,
swap the leading `~` for `$HOME`, because Bash does not expand `~` inside
double quotes. Its first line should be `# Lab 10 plan`.
If the command says the file does not exist, you are in the wrong
environment or the agent wrote somewhere else; ask it for the path again.

> 🧭 **"How long does Layer 1 last?" is three questions, not one.** Keep
> them apart:
>
> | Question | Layer 1 |
> |----------|---------|
> | **Intended lifetime** — how long is it supposed to matter? | One task. Whatever is still worth having when the task ends has to be promoted to Layer 2 or 3. |
> | **Conversation visibility** — who can see it? | Only the session that wrote it. After `/clear` or `/new` the agent starts with an empty conversation and cannot see the old plan or todos unless you point it at them; `/resume` (or `copilot --continue`) reopens an earlier session. |
> | **On-disk retention** — is it deleted? | No. The session folder, `plan.md` included, stays in `~/.copilot/session-state/` and nothing in this lab removes it. |

> 💡 **Rule of thumb:** if a teammate joining tomorrow would need this
> information, it does *not* belong in Layer 1. Raw sources feed the wiki —
> they are not the wiki themselves. Before you `/clear` or start a fresh
> conversation, ask the agent to graduate anything durable into Layer 2.

## 10.2 Layer 2 — The Wiki (LLM-maintained markdown)

**Lifetime:** across sessions, in git.
**Surfaces:** [`.copilot/lessons/`](../.copilot/lessons/) (project scope)
and `~/.copilot/lessons/` (global / per-workstation).

This is the new layer. It is a directory of plain markdown files the agent
writes to itself: a catalog (`index.md`), an append-only journal
(`log.md`), and one topic file per durable lesson. The shape is enforced
by [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md);
its `applyTo` glob targets `.copilot/lessons/`, so Copilot applies that schema
when it edits files there.

> 🆕 **This is an application-layer convention, not protocol-level MCP
> memory.** `.copilot/lessons/` is plain markdown that this repo's own
> instructions govern — it was never backed by the MCP protocol, and that's
> even more true after the breaking [MCP spec revision of 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
> (`mcp_protocol_spec_version` in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml)),
> which removed protocol-level sessions entirely — no `Mcp-Session-Id`, no
> stateful `initialize` handshake. Any cross-call state an MCP server needs
> today is an explicit, server-minted handle passed back as an ordinary tool
> argument, never an implicit session. So the `memory` MCP server (a generic
> knowledge-graph *primitive*, see [Lab 05 §5.3](lab05.md#53-cross-session-persistence--markdown-lessons-not-a-server))
> and this wiki solve different problems: MCP gives you live tools *within*
> a call; the wiki is how this repo persists *across* calls and sessions,
> in git, with nothing implicit.

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
I just discovered that building only the test project, with
`dotnet build dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj`,
never builds the ContosoUniversity.PlaywrightTests project, so a breakage
there only shows up in a solution-level `dotnet build dotnet/ContosoUniversity.sln`.
Append a lesson to .copilot/lessons/log.md following the schema in
.github/instructions/lessons.instructions.md. Leave "Promoted to" blank.
```

The repo can back that claim up, which gives the lesson real `Evidence`:
`ContosoUniversity.Tests.csproj` has a `ProjectReference` to the Core,
Infrastructure and Web projects and to nothing else, while
`ContosoUniversity.sln` also lists the PlaywrightTests project.

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
leave `Promoted to:` blank — that gets filled in by the
`consolidate-lessons` prompt file in §10.4.

### 10.2b Recall from a fresh session

This is the payoff. Close your current session (`/exit`) and start a new
one, then ask:

```
What have we learned about verifying .NET changes in this repo? Check
.copilot/lessons/, including log.md, before answering.
```

The agent reads `index.md`, opens `example-lesson.md` and `log.md`, and
answers from the wiki — even though you never told *this* session
anything. No knowledge-graph server, no embeddings; just markdown on
disk.

Read the answer carefully, because only half of it is yours. `index.md`
and `example-lesson.md` **shipped with this repo** — the seed wiki
already carries a build-verification lesson, so an answer citing only
those two files proves the agent can read a file, nothing more. The
`log.md` entry is the one *you* had the agent write in §10.2a. The agent
should cite both, and it is that `log.md` entry surviving `/exit` that
actually demonstrates the layer.

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

🖥️ **Optional extension — scaffold a global wiki.** The core path does not
need one: every step from here on works with the project wiki alone. Run
this only if your starting-point check said `global wiki: absent`. It
stops by itself when `~/.copilot/lessons` already exists, so it cannot
touch a wiki you keep. It also writes an empty marker file,
`.created-by-lab10`, which is how §10.6 tells a folder this lab made from
one you made.

**WSL/Bash:**
```bash
if [ -d ~/.copilot/lessons ]; then
  echo "~/.copilot/lessons already exists - leaving it alone, skip this extension"
else
  mkdir -p ~/.copilot/lessons
  printf '# Lessons — Global Index\n\n' > ~/.copilot/lessons/index.md
  printf '# Lessons — Global Log\n\n'   > ~/.copilot/lessons/log.md
  : > ~/.copilot/lessons/.created-by-lab10
  ls -A ~/.copilot/lessons/
fi
```

**PowerShell:**
```powershell
$lessons = Join-Path $HOME ".copilot/lessons"
if (Test-Path $lessons) {
  "$lessons already exists - leaving it alone, skip this extension"
} else {
  New-Item -ItemType Directory -Path $lessons | Out-Null
  "# Lessons — Global Index`n" | Set-Content "$lessons/index.md" -Encoding UTF8
  "# Lessons — Global Log`n"   | Set-Content "$lessons/log.md"   -Encoding UTF8
  New-Item -ItemType File -Path "$lessons/.created-by-lab10" | Out-Null
  Get-ChildItem $lessons -Force
}
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

You should see four scoped instruction files — `dotnet.instructions.md`,
`lessons.instructions.md`, `security.instructions.md`, and
`testing.instructions.md`. Each one declares an `applyTo` glob in its
front-matter: `security.instructions.md` uses `**/*`, so it attaches to
every file in the repo, while the other three attach only to the paths
they name. Alongside them, the project's `AGENTS.md` and
`.github/copilot-instructions.md` load repo-wide. That is six schema
sources Copilot can pull into a session without you asking for any of
them.

### 10.3a Extend the schema

Schema changes are binding on the work they apply to — and an instruction
file only applies where its `applyTo` glob matches. So a new rule goes in
the file whose glob covers the task. A rule about *repository classes*
belongs in `dotnet.instructions.md`, whose `applyTo` includes `**/*.cs`. It
does **not** belong in `testing.instructions.md`: that file only matches
test paths (`**/*.test.*`, `**/tests/**` and similar), and neither
`DepartmentRepository.cs` nor
`dotnet/ContosoUniversity.Tests/Infrastructure/DepartmentRepositoryTests.cs`
falls under those globs.

Keep the rule tight. Type this into the Copilot prompt:

```
Append to .github/instructions/dotnet.instructions.md:
"Every new repository class must have a corresponding xUnit test class in
dotnet/ContosoUniversity.Tests/Infrastructure/."
```

This edits a tracked file; §10.6 shows how to revert it. Now open a fresh
session and ask the agent to scaffold a new **repository class** — a DDD
data-access class, not a git repository:

```
Scaffold a DepartmentRepository class for the ContosoUniversity data layer.
```

**What to watch for:** the agent should also create a matching xUnit test
class under `dotnet/ContosoUniversity.Tests/Infrastructure/` **without
being asked for one**. That unrequested test class is the observable —
it is Layer 3 firing, because the files the agent is working on are `.cs`
files that match the `applyTo` glob of the file you appended to. An agent
may still skip a rule, so treat a miss as a prompt to investigate rather
than proof. If you only get the repository class, re-check that the append
landed in
[`.github/instructions/dotnet.instructions.md`](../.github/instructions/dotnet.instructions.md),
and run `copilot instruction list` to confirm Copilot discovers that file.
That command lists the instruction files Copilot found; it does not show
which ones applied to a given task.

The scaffold writes new files into your working tree. Leave them for now;
§10.6 shows how to discard them.

### 10.3b Agent personalities — the stewardship story

`AGENTS.md` and `.github/instructions/` apply to *all* agents. But this
repo also ships agent **personalities** — role-specialized agents with
their own voice and tool scope. What each one can do with the Layer 2
wiki follows from that tool scope.

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
| `planner` | Decomposes, assesses risks, never implements. | `read`, `search`, `agent` | **Can read** lessons, so it can avoid planning around solved problems. No file-writing tool of its own. |
| `code-reviewer` | High signal-to-noise, surfaces only real issues. | `read`, `search` | **Can read** lessons. It has no file-writing tool, so it **surfaces** a durable pitfall in its review report instead of recording it. |

Tool scope decides what an agent can do with the wiki. Neither profile has
a file-writing tool of its own, so an entry is recorded by you, or by a
session or subagent that can write files, following the Layer 3 schema.
The roles still notice different kinds of lessons — a planner's are about
*architecture*, a reviewer's about *pitfalls* — and the schema keeps the
entries shaped the same way once someone records them.

> 💡 **Rule of thumb:** if a rule must apply on every task, put it in
> Layer 3. If a pattern should only surface *when relevant*, put it in
> Layer 2. Lessons are advisory; schema is binding.

## 10.4 Consolidation — promoting the wiki

The wiki accumulates entropy. Over a few weeks you get duplicate topic
files, stale lessons, and project-scoped entries that actually apply
globally. This repo's way to reshape the wiki is the `consolidate-lessons`
prompt file — manual reorganization is a footgun because agents rely on
stable file paths.

> ⚠️ **A prompt file, not a CLI slash command.** `consolidate-lessons`
> — like `checkpoint` and `handoff` in §10.5 — ships as a VS Code-style
> prompt file in [`.github/skills/`](../.github/skills/). Copilot CLI's
> built-in command list (`copilot help commands`) has no
> `/consolidate-lessons`, `/checkpoint` or `/handoff`, and this repo adds
> no CLI skill or wrapper that registers them. Do not rely on typing those
> names, in the prompt or through `--prompt`: in the CLI, ask the agent in
> plain English to follow the file.

🖥️ **Read the prompt file before you use it:**

**WSL/Bash:**
```bash
head -40 .github/skills/consolidate-lessons/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/consolidate-lessons/SKILL.md | Select-Object -First 40
```

### 10.4a Dry run first

Always start with a dry run so you can see what would change. The prompt
file takes two options — `--dry-run` and `--scope project|global|both` —
and tells the agent what each one means. Ask for it **in the Copilot
prompt** (not in your shell), naming the file and passing the options as
plain text:

```text
Follow .github/skills/consolidate-lessons/SKILL.md with --dry-run --scope project.
Do not write any files.
```

`--scope project` keeps the run inside this repository's
`.copilot/lessons/`. The prompt's own default is `both`, which also
writes to `~/.copilot/lessons/`; this lab only does that if you opt in
(see the note below).

The agent will enumerate the project wiki, decide which `log.md` entries
are ready for promotion, flag duplicates, and print a summary — without
writing anything. Read the summary and **keep it**: §10.4b asks you to
compare the real result against it. If it proposes to merge two files you
wanted to keep separate, fix the front-matter (`tags`, `scope`) and
re-run the dry run.

> 🌐 **Opt-in: both scopes.** If — and only if — the global wiki is the
> one §10.2c just created for you (your starting-point check said
> `absent`), you may use `--scope both` here, in §10.4b and in the
> §10.4d line instead. That also lets the prompt propose project→global
> moves and `CONTRADICTION` flags, and it writes under
> `~/.copilot/lessons/`, which `git` cannot see — §10.4b says how to
> review that. Never use `both` against a global wiki you already kept:
> this lab cannot restore it.

### 10.4b Live consolidation

When the dry run looks right, run it for real — again **in the Copilot
prompt**, not in your shell:

```text
Follow .github/skills/consolidate-lessons/SKILL.md with --scope project.
```

Expected result, given the seed wiki this repo ships:

- The `log.md` entry you added in §10.2a gets a `Promoted to:` value, and
  either a new topic file appears (untracked, so `git diff` will not show
  it) or the lesson merges into `example-lesson.md` with a Revision log
  bullet.
- A new bullet lands in `index.md` under the matching topic heading.
- Nothing is copied to `~/.copilot/lessons/`. Your §10.2a lesson names
  `dotnet/` paths, so even under `--scope both` it should stay in the
  project wiki.
- The summary ends with a **Files touched** list, and every path in it
  should sit under `.copilot/lessons/`.

🖥️ **Review what the run changed — the content, not just the file
list.** `git diff --stat` shows only paths and line counts, and it skips a
brand-new topic file entirely, so use all three commands:

**WSL/Bash:**
```bash
git status --short
git --no-pager diff HEAD -- .copilot/lessons/
git ls-files --others --exclude-standard .copilot/lessons/ | while read -r f; do echo "=== $f"; cat "$f"; done
```

**PowerShell:**
```powershell
git status --short
git --no-pager diff HEAD -- .copilot/lessons/
git ls-files --others --exclude-standard .copilot/lessons/ | ForEach-Object { "=== $_"; Get-Content $_ }
```

`git status --short` lists every changed path, including the §10.3a edit
to `dotnet.instructions.md` and anything the §10.3a scaffold left; the
lines under `.copilot/lessons/` are this step's. The `diff` command shows
the tracked wiki files, staged or not, and the last command prints each
new topic file in full. Now compare what you read with the §10.4a dry-run
summary:

- `log.md`'s `Promoted to:` line names the file the dry run said, and that
  file exists.
- That topic file carries the **Evidence** (the project-reference fact
  from §10.2a), a `scope:` line, a fresh `updated:` date and a Revision
  log bullet.
- `index.md` gained one bullet, under the heading the dry run proposed.
- Nothing else moved: no file deleted, and the older `log.md` entry
  ("Seed the wiki layer") is unchanged.

If the result differs from the dry run, or the lesson now says something
you did not mean, do not stage it — §10.6 puts the wiki back, and you can
re-run the dry run.

If you opted in to `--scope both`, `git` cannot see the global wiki, so
read it directly:

**WSL/Bash:**
```bash
if [ -d ~/.copilot/lessons ]; then
  for f in ~/.copilot/lessons/*.md; do [ -f "$f" ] || continue; echo "=== $f"; cat "$f"; done
else
  echo "no global wiki - nothing to review"
fi
```

**PowerShell:**
```powershell
$lessons = Join-Path $HOME ".copilot/lessons"
if (Test-Path $lessons) { Get-ChildItem $lessons -Filter *.md | ForEach-Object { "=== $($_.FullName)"; Get-Content $_.FullName } } else { "no global wiki - nothing to review" }
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
Scheduler entry that launches a non-interactive Copilot session
(`-p`/`--prompt`) and sends the request in plain English. An example to
read, **not a step in this lab** — nothing here runs it:

```text
copilot -p "Follow .github/skills/consolidate-lessons/SKILL.md with --scope project" --allow-all-tools
```

`--prompt` carries ordinary prompt text, which is why the request names the
prompt file rather than a slash command (§10.4). `copilot help` marks
`--allow-all-tools` as required for non-interactive runs; it pre-approves
every tool, file writes included, so use it only in a repository and on a
machine you trust, and rehearse the schedule with `--dry-run` first. This
repo does not ship a schedule — cadences are environment-specific and
belong in your personal setup.

---

## 10.5 Wrap — the loop, drawn

```
 Layer 1                   Layer 2                    Layer 3
 Raw sources  ───────────► The Wiki  ────────────►   The Schema
 (plan.md,                (.copilot/lessons/,         (AGENTS.md,
  SQL todos)              ~/.copilot/lessons/)        instructions,
                                                      agent personalities)

  one task        consolidate-lessons        hardens into a rule
  (kept on disk,  prompt file promotes       when it must apply
   not curated)   log → topic and            on every task
                  project → global
```

Three layers, one direction of promotion, zero servers to operate.
Your checklist for the next real task:

1. **Open the session (L1):** write a short `plan.md` and insert todos
   into the SQL store.
2. **Consult the wiki (L2):** ask the agent to check
   `.copilot/lessons/index.md` before starting, and
   `~/.copilot/lessons/index.md` as well if you keep a global wiki.
3. **Append when you learn (L2):** any finding that will matter next
   time goes into `log.md` with evidence cited.
4. **Harden into schema (L3):** if a rule should apply on every task,
   propose it during consolidation — not mid-feature.
5. **Consolidate weekly:** run the `consolidate-lessons` prompt file with
   `--dry-run` first (§10.4a); commit the live run when the diff is clean.

> 🔖 **About `checkpoint` — a git-level safety net, not Layer 1.**
> [`.github/skills/checkpoint/SKILL.md`](../.github/skills/checkpoint/SKILL.md)
> is the third prompt file, with `create`, `verify` and `list` actions.
> `create` runs verification, makes a git stash or commit named for the
> checkpoint, and appends one `date | name | short SHA` line to
> `.github/checkpoints.log`, a file that is created on first use. It does
> **not** snapshot `plan.md`, your SQL todos or scratch files, so it is not
> a Layer 1 backup;
> [`sample-checkpoint-log.txt`](../solutions/lab10-session-management/sample-checkpoint-log.txt)
> shows the log format. Nothing in this lab uses it, and you should not run
> it mid-lab: its stash or commit would sweep up your §10.3a and §10.4b
> edits, and the §10.6 revert would no longer find them. Keep it for your
> own next task, asked for in plain English the way §10.4a asks for
> consolidation.

🖥️ **End-of-lab handoff drill:** a handoff is how one task outlives one
conversation: a file a fresh conversation can pick up. In the Copilot
prompt (not your shell), ask the agent to follow
[`.github/skills/handoff/SKILL.md`](../.github/skills/handoff/SKILL.md).
Its `${input:…}` placeholders are VS Code prompt-file syntax, and the file
names no save location, so in the CLI put the three values *and* the
location in the request itself:

```text
Follow .github/skills/handoff/SKILL.md. Work description: "Completed Lab 10 — three-layer agent memory". Stop reason: "Lab 10 exercises finished; the §10.6 cleanup is still to do". Blocker: none. Save the handoff as lab10-handoff.md in the files folder of your session folder, outside the repository, and print its absolute path.
```

Note the path it prints. Now **resume from it**: open a fresh conversation
(`/new`, or `/exit` and run `copilot` again; `copilot --continue` would
reopen *this* session, which proves nothing) and send:

```text
Read <the path it printed>. From its Fresh Context Prompt section, tell me where we stopped and what the Immediate Next Step is. Do not run anything yet.
```

The CLI may ask permission to read a file outside the repository; approve
that one file. The fresh conversation should name the §10.6 cleanup, even
though nothing in its own history mentions it. That is the handoff doing
its job.

A handoff is a Layer 1 artefact, so the three questions from §10.1 apply
to it. *Intended lifetime:* one task, and nobody curates it. *On disk:* it
stays exactly where you saved it until you delete it. *Conversation
visibility:* a fresh conversation cannot see it until you point it there,
as you just did. Anything in it that will matter on the next task still has
to be promoted into Layer 2 or 3.

➡️ **Do not stop here.** The lab is not complete yet: §10.6 puts your
repository back to its starting state, and the completion message comes
only after it.

<details>
<summary>Key Takeaways</summary>

| Concept | Layer | Lifetime |
|---------|------:|----------|
| `plan.md`, SQL todos, session-state | 1 | One task — on disk until deleted, not curated |
| `.copilot/lessons/`, `~/.copilot/lessons/` | 2 | Across sessions, in markdown |
| `AGENTS.md`, `.github/instructions/`, agent personalities | 3 | Forever, binding |
| Reindex / LSP | — | Not memory: reads code, stores nothing (`/lsp` only manages the servers) |

Promotion: L1 → L2 when durable; L2 project → L2 global when cross-repo;
L2 → L3 when binding on every task. Nothing lives in two layers at once.
Markdown round-trips are cheap — a weekly consolidation touches a handful
of files and costs pennies.

</details>

<details>
<summary>Solution: lab10-session-management reference materials</summary>

See [`solutions/lab10-session-management/`](../solutions/lab10-session-management/) — in particular [`README.md`](../solutions/lab10-session-management/README.md), [`sample-handoff.md`](../solutions/lab10-session-management/sample-handoff.md), and [`sample-checkpoint-log.txt`](../solutions/lab10-session-management/sample-checkpoint-log.txt) — for the complete reference implementation.

</details>

## 10.6 Cleanup — required, and the lab is not finished without it

> ⏭️ **This is part of the lab, not an afterword.** Everything above left
> changes behind: a rule in an instruction file that binds every future
> session, lesson entries, new source files, and possibly a global wiki. Put
> them back now, or Lab 11 and everything after it inherit them. The
> completion message at the end of this page comes only after the last check
> here.

### Lab 10–specific: put back what this lab changed

**1. The repository — everyone does this.** Revert the files this lab
changed before moving on, or Lab 11 and everything after it inherit a rule
and lessons you wrote here. If you ran every step, three tracked files
changed:

- `.github/instructions/dotnet.instructions.md` — the schema rule you
  appended in §10.3a.
- `.copilot/lessons/log.md` — your §10.2a entry, plus the `Promoted to:`
  field the §10.4b consolidation fills in.
- `.copilot/lessons/index.md` — the bullet the §10.4b consolidation adds.

A fourth, `.copilot/lessons/example-lesson.md`, changes only when the
consolidation merged your lesson into it instead of creating a new topic
file.

🖥️ **Revert the tracked files, then see what is left:**

**WSL/Bash:**
```bash
# Has HEAD moved since "Before you start"? A different SHA means you
# committed; see the paragraph below these blocks.
git rev-parse HEAD

# Drop the §10.3a schema rule — it is binding on every future session:
git restore --source=HEAD --staged --worktree .github/instructions/dotnet.instructions.md

# Drop the §10.2a log entry and any §10.4b consolidation result,
# unless you want to keep them:
git restore --source=HEAD --staged --worktree .copilot/lessons/

# What is still different from a clean checkout?
git status --short
```

**PowerShell:**
```powershell
# Has HEAD moved since "Before you start"? A different SHA means you
# committed; see the paragraph below these blocks.
git rev-parse HEAD

# Drop the §10.3a schema rule — it is binding on every future session:
git restore --source=HEAD --staged --worktree .github/instructions/dotnet.instructions.md

# Drop the §10.2a log entry and any §10.4b consolidation result,
# unless you want to keep them:
git restore --source=HEAD --staged --worktree .copilot/lessons/

# What is still different from a clean checkout?
git status --short
```

Plain `git restore <path>` copies from the *index*, so it quietly keeps
anything you staged with `git add` in §10.4b. `--source=HEAD --staged
--worktree` resets both the index and your files to the last commit. It
leaves untracked files alone, so read what `git status --short` still
lists:

- **`M` in the first or second column** — a tracked file the §10.3a
  scaffold edited (a registration file, say). Check it with `git diff`,
  then revert only that file with the same restore command and its path.
- **`??`** — a new file this lab created: the scaffolded
  `DepartmentRepository` class and its test class, a new topic file under
  `.copilot/lessons/`, `lab10-handoff.md` if the agent saved the §10.5
  handoff inside the repository instead of its session folder, or
  `.github/checkpoints.log` if you ran the optional checkpoint. Delete
  each one by name, and look inside a `??` folder before you remove it.
  `dotnet/ContosoUniversity.Tests/Infrastructure/` already holds tracked
  files, so delete only the new test file in it, never the folder. Do not
  reach for `git clean`: it deletes every untracked file in the tree,
  including work that is not from this lab.

If you committed any of this, or ran the checkpoint prompt (it makes a
stash or a commit), your edits already live in that commit or stash and
`git restore` finds nothing to revert. Check `git log --oneline -3` and
`git stash list` first, then undo the commit (`git revert` followed by its
SHA) or drop the stash (`git stash drop`).

Once `git status --short` lists nothing you did not mean to keep, the
repository is done. The project-scoped `.copilot/lessons/` directory is
committed to the repo, so leaving a lesson in place is a deliberate choice
— just make it deliberately.

**2. Your home folder — only if you ran the §10.2c extension.** The
`~/.copilot/lessons/` folder that extension created is outside the
repository, so `git` cannot see it and `git restore` cannot undo it. The
command below removes that folder only when the `.created-by-lab10` marker
is inside it, which is how it tells the folder this lab made from a global
wiki you keep. It deletes the whole folder, including anything a
`--scope both` run copied into it in §10.4, so copy out anything you want
to keep first.

**WSL/Bash:**
```bash
if [ -f ~/.copilot/lessons/.created-by-lab10 ]; then
  rm -rf ~/.copilot/lessons && echo "removed the global wiki this lab created"
else
  echo "no lab-created global wiki here - nothing to remove"
fi
```

**PowerShell:**
```powershell
$lessons = Join-Path $HOME ".copilot/lessons"
if (Test-Path "$lessons/.created-by-lab10") {
  Remove-Item $lessons -Recurse -Force
  "removed the global wiki this lab created"
} else {
  "no lab-created global wiki here - nothing to remove"
}
```

If you skipped the extension, or your baseline said `present`, the command
prints the second message and touches nothing. Run it from the same shell
you used for §10.2c, because WSL and Windows keep separate home folders.

**Left in place on purpose.** The session folder under
`~/.copilot/session-state/` holds your Layer 1 `plan.md` and, if you saved
it there, the §10.5 handoff. That is Copilot's own state, not something
this lab created in your project. A fresh `copilot` start opens a new
session folder, so the next lab does not inherit it, and nothing here
deletes it. Remove it yourself if you want the history gone.

<!-- The generic sweep below is intentionally lab-local. It was detached from
docs/_partials/cleanup.md because three of its commands misbehave when Lab 10
runs them: a listing of other labs' scratch paths and a git-config lookup
exit nonzero when their target is simply absent, and the config-backup move
would copy any old config backup over the live config, which Lab 10 never
edited (a stale backup from an earlier lab or experiment is easy to have).
This copy keeps the git-config lookup, guarded, and turns the other two into
prose. Re-attach the shared partial only once it is corrected. -->
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

2. **Leave the Copilot CLI config alone — Lab 10 did not change it.** Some
   labs edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json` and keep a backup so that their own cleanup
   can put the original back. Lab 10 edits none of them (§10.0 only points
   you at the read-only `copilot help config`), so it has nothing to restore
   and this step runs no command. Do **not** move a `config.json.bak` you happen to find over
   `config.json` here: if it is left over from an earlier lab or an old
   experiment, that silently replaces your current settings with an older
   copy. If an earlier lab did leave one, that lab's cleanup is the place to
   restore it. Changes to workspace configs inside this repo show up in the
   `git status --short` check in step 6.

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** Other labs leave their own scratch
   behind: an agent-to-agent scratch folder and transcripts under `node/`,
   and a summary file inside `.git/`. Lab 10 creates none of them, so this
   lab has nothing of theirs to inspect, and those labs' own cleanup
   sections cover them. The one long-tail path Lab 10 can create, and only
   if you ran the optional §10.2c extension, is `~/.copilot/lessons/`; the
   home-folder step in the Lab 10–specific part above already handles it.
   Delete only what this lab created, and never blanket-delete a
   `~/.copilot/lessons/` that other sessions wrote to.

5. **Check `core.hooksPath` and other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise. Lab 10
   never sets one, so this is a look, not an undo:

   ```bash
   git config --default "(not set)" --get core.hooksPath
   ```

   The same command works in PowerShell. `(not set)` is the normal answer.
   A value of `.githooks` is the repository's own hook setup from
   `make setup-hooks`, which you chose to run, so leave it. Any other path
   was set by another lab, and that lab's cleanup is the place to undo it.

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
> kept), and the build is clean if you ran it, the cleanup is done.

## Lab Complete 🎉

Your repository is back to its starting state, so Lab 10 is complete.
You've now worked through the three memory layers this lab teaches:

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
- **Audit:** read `AGENTS.md`, `.github/instructions/` and
  `.github/agents/` in your repo and confirm Layer 3 is the minimum viable
  set, not a junk drawer. `/env` in a session shows what the CLI actually
  loaded from them.
- **Share:** commit your wiki. A PR that adds a lesson is as valuable
  as a PR that fixes a bug — it teaches every future session at once.

**Return to:** [README](../README.md)
