---
title: "Agent Memory: Copilot Memory, Lessons, and Custom Memory Services"
lab_number: 10
pace:
  presenter_minutes: 5
  self_paced_minutes: 115
prerequisites:
  - lab02
  - lab04
registry: docs/_meta/registry.yaml
---

# 10 — Agent Memory: Copilot Memory, Lessons, and Custom Memory Services

This is the capstone for the local Copilot CLI surface. It teaches **how
Copilot remembers things across sessions**, as a spectrum of three
options, and the one idea underneath all of them: **memory is advisory,
and instruction files are binding.**

An agent compounds knowledge far better when it keeps **notes** than when
it re-derives the same context from scratch on every session. There are
three ways to give it notes, and none of them is the only right answer.
**GitHub Copilot Memory** is the native one: Copilot stores a fact or a
preference on GitHub for you, and you delete it in settings. A **markdown
wiki in git** is the do-it-yourself one: a file you can `cat`, diff,
revert, and commit, with nothing to host. A **custom memory service** that
you run yourself, such as SCNS, is the heavier one, for when neither of the
others fits. This lab teaches all three against the same three layers:

| Layer | Name | Surface | Lifetime |
|-------|------|---------|----------|
| 1 | **Raw sources** | `plan.md`, SQL todos, session transcripts | One task — kept on disk, but not curated or shared |
| 2 | **Recall** (advisory) — native | **GitHub Copilot Memory** (generally available): repository-level facts and user-level preferences; plus **Copilot Dreaming**, an optional curation pass that is still in public preview | Across sessions and Copilot surfaces, hosted by GitHub; a memory expires unless Copilot reinforces it |
| 2 | **Recall** (advisory) — DIY | **The wiki**: `.copilot/lessons/` (project) + `~/.copilot/lessons/` (global) | Across sessions, in markdown and in git |
| 2 | **Recall** (advisory) — custom | **A memory service you run**, with [SCNS](https://github.com/johnhain-msft/scns) as the worked example | Whatever the service's own rules allow |
| 3 | **The Schema** (binding) | `AGENTS.md`, `.github/instructions/*.md`, agent personalities | Forever, binding |

Layer 1 is raw signal. Layer 2, **Recall**, is whatever lets a later
session remember what an earlier one learned. It comes in the three
flavours above, and every one of them is **advisory**: the agent may use a
memory or may not. Layer 3 is the rulebook, and it **binds**: it is
how you make a rule hold every time. Promotion goes upward: raw → recall →
schema. Nothing lives in two layers at once, and no Layer 2 option
replaces Layer 3.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 115 minutes

> 📋 **Before you start.** This lab is for the **local Copilot CLI** and is
> an advanced-tier lab: it cannot be completed from VS Code alone, because
> the session steps rely on CLI-only commands and flags (§10.0 lists them), and
> §10.8 deletes the memories you store by using your github.com settings
> pages in a browser. Seven things to know up front:
>
> - **Time.** Plan on about **115 minutes** (100–130 with questions and one
>   recovery) for the required path, §10.8 cleanup included: roughly 16 for
>   the start and §10.0–§10.1, 21 for §10.2, 10 for §10.3, 14 for §10.4,
>   21 for §10.5, 8 for §10.6, 9 for §10.7 and 16 for §10.8. These are
>   planning estimates, not measurements, and they assume you only skim
>   §10.0 and skip everything marked **Optional**: the global wiki in
>   §10.3c, §10.4b, §10.5d, the primary-source pages linked from §10.5e and
>   §10.6, the `checkpoint` note in §10.7 and the build check at the end of
>   §10.8. Doing all of them adds about 20 minutes. In a workshop the
>   presenter's 5–7 minutes show only the layer table above, the read-only
>   `/memory` status check in §10.2, the read-only look at
>   `.copilot/lessons/` in §10.3 and the §10.7 diagram; the rest is
>   self-paced.
> - **Prerequisites.** Finish [Lab 02 — Custom Instructions & AGENTS.md](lab02.md)
>   (§10.4 edits an instruction file, and the lab's point is that
>   instruction files are the binding layer) and
>   [Lab 04 — Skills & Prompts](lab04.md) (§10.5 and §10.7 run command
>   skills) first. Your CLI must meet
>   `copilot_cli_version_floor` in
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). You also need
>   `git`, and the .NET SDK for the optional build check at the end of §10.8,
>   which is the only `dotnet` command the lab runs. Running the project's tests
>   would also need the ASP.NET Core 8 runtime, which a machine with only a
>   newer runtime does not have (`dotnet --list-runtimes` shows what you have),
>   so the lab never asks you to. It never runs the Node track either: §10.2c
>   only has Copilot remember where that track lives, so you need neither Node
>   nor pnpm.
> - **A fork you can write to.** §10.2 stores a *repository-level fact*, and
>   Copilot only lets someone with write access to a repository create one.
>   Use your own fork of this repository. A fact stored on the upstream
>   repository would be used by everyone who can read it, and it is not
>   yours to put there. Forking does not copy memories, so your fork starts
>   with none and what you store there stays there.
> - **A plan with Copilot Memory — or the read-along.** Copilot Memory is
>   generally available on paid Copilot plans. User-level preferences are on
>   by default on Copilot Pro, Pro+ and Max, and stay off on Business and
>   Enterprise until an administrator enables the policy. Repository-level
>   facts have their own setting, which is allowed unless a policy restricts
>   it. §10.2a shows the CLI's side of the check, and the two lists you open
>   there show yours. If your plan or policy leaves Memory off, or either list
>   will not open, follow §10.2 as a **read-along** instead: read the prompts
>   and the results they should produce, skip §10.2b to §10.2e, and still run
>   the `/memory` check and the dry-run import in §10.2f, which store nothing.
>   You then store nothing, so there is nothing to delete in §10.8. If you do
>   store something, the two stores are independent: Copilot may store one and
>   decline the other, §10.2e records which, and §10.8 still deletes each memory
>   that was stored.
> - **§10.2 writes to your GitHub account.** Everything else the lab asks you
>   to do writes to your checkout or your home folder. When you approve the two
>   store prompts in §10.2, Copilot may save a user-level preference and a
>   repository-level fact to your GitHub account, and it may save one without
>   the other. Whatever it saves stays there, and Copilot may use it in other
>   sessions, until §10.8 deletes it in settings. §10.2a has you note what
>   your account already holds first, so that §10.8 removes only what this lab
>   added. Copilot can also capture a memory of its own from something you tell
>   it, such as the findings in §10.3a and §10.4a. Those prompts ask it not to,
>   and §10.8 deletes only the exercise memories, so look at your lists
>   yourself. Do not stop before §10.8.
> - **Use a clean, disposable checkout.** §10.3a, §10.4a and §10.5 edit
>   tracked files, and §10.8 puts them back with `git restore`, which can
>   only return a file to your last commit. Check and record your starting
>   point below before you change anything; a fresh clone or a throwaway
>   `git worktree` is the easy way to get a clean one.
> - **Writing outside the repository is opt-in.** Apart from your GitHub
>   account (the memories described above) and the CLI's own session folder
>   (`~/.copilot/session-state/`, where §10.1 has the agent write a
>   `plan.md` and §10.7 a handoff), the core path writes only inside this
>   checkout. §10.3c offers an optional extension that also creates
>   `~/.copilot/lessons/` in your home directory. It runs only if the
>   baseline below says that folder does not exist yet, and §10.8 removes
>   it again. Skip it and nothing else in your home folder changes; every
>   consolidation run then uses `--scope project`.

🐚 **In your OS Terminal — record your starting point** before you change anything:

**WSL/Bash:**
```bash
git status --short   # must print nothing; if it lists files, commit or stash them first
git rev-parse HEAD   # note this SHA — §10.8 checks that it has not moved
git remote get-url origin   # must name YOUR fork (github.com/<you>/...), not the upstream ms-mfg-community/day-in-the-life-copilot-lab
if [ -d ~/.copilot/lessons ]; then echo "global wiki: present"; else echo "global wiki: absent"; fi
```

**PowerShell:**
```powershell
git status --short   # must print nothing; if it lists files, commit or stash them first
git rev-parse HEAD   # note this SHA — §10.8 checks that it has not moved
git remote get-url origin   # must name YOUR fork (github.com/<you>/...), not the upstream ms-mfg-community/day-in-the-life-copilot-lab
if (Test-Path "$HOME/.copilot/lessons") { "global wiki: present" } else { "global wiki: absent" }
```

The remote URL decides where §10.2 stores the repository-level fact:
Copilot works out the repository from your checkout, and the approval
prompt in §10.2c names it. If the URL names
`ms-mfg-community/day-in-the-life-copilot-lab`, you are on the upstream
repository. Fork it on GitHub, clone your fork and do the lab there, or
follow §10.2 as a read-along.

If the last line says `present`, you already keep a global wiki of your
own. Skip the optional §10.3c extension and leave it untouched; everything
else in the lab still works. WSL and Windows have separate home folders,
so run this check, the §10.3c extension and the §10.8 cleanup from the
same shell.

> 💰 **Cost Budget** — ~15k in / ~5k out for the wiki path (§10.1 and
> §10.3–§10.5), an unmeasured planning estimate rather than a benchmark.
> Markdown round-trips are ordinary session usage, and nothing runs
> between sessions. Copilot Memory adds whatever memories it sends with a
> prompt to your token use, and Copilot Dreaming, which this lab only
> explains, bills AI credits on every run (§10.5e). Run Layer 1 and the
> mechanical steps on a `models.cheap` entry; stay on `auto` or upshift to
> `models.premium` only for the §10.5 consolidation pass. `/clear` between
> §10.4 and §10.5. Full guidance:
> [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md).
>
> **Tier picker for this lab.** The tiers below are the ones defined in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — look the
> concrete model ids up there rather than copying one from this page, and
> run `/model` to see what your own account can serve today.
>
> | Registry tier | When to use it here |
> |---------------|---------------------|
> | `models.cheap` | §10.1–10.4 the memory prompts, schema + log appends, file reads |
> | `models.standard` | Mid-complexity edits, schema drafting |
> | `models.premium` | §10.5 interactive consolidation pass only |
>
> What matters is the ordering, not a price ratio: the append/read loops
> in §10.1–10.4 are mechanical and belong at the bottom of the table,
> while the multi-document reconciliation in §10.5 is the one step that
> earns the top. This lab names no model id. The ids live in the
> registry's `models:` block, so when the lineup moves, that is where you
> read the change.

References:
- [About GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory) — repository-level facts and user-level preferences (§10.2)
- [Manually creating memories for GitHub Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/create-memories) — scoping phrases, the approval prompt, bulk import (§10.2)
- [Managing Copilot Memory for your personal account](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-for-yourself) and [for an enterprise, organization, or repository](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/copilot-memory/manage-as-administrator) — where memories are viewed and deleted (§10.2, §10.8)
- [About GitHub Copilot Dreaming](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-dreaming) — the optional curation pass, in public preview (§10.5)
- [SCNS](https://github.com/johnhain-msft/scns) — an alpha, local-first memory service, the worked example of a custom service (§10.6)
- [`docs/memory-decision-tree.md`](../docs/memory-decision-tree.md) — a one-page way to pick a Layer 2 flavour
- [Repository indexing](https://docs.github.com/en/copilot/concepts/context/repository-indexing)
- [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
- [`.copilot/lessons/README.md`](../.copilot/lessons/README.md) — the pattern, in-repo
- [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md) — the schema
- [`.github/skills/consolidate-lessons/SKILL.md`](../.github/skills/consolidate-lessons/SKILL.md) — the skill that promotes lessons

## 10.0 Copilot CLI surface check (2026 refresh)

> ➕ **Reference — skim it in about 2 minutes.** Nothing in §10.0 is a step,
> and no later section depends on it. It lists the CLI features as they stand
> today; come back to it when you need one of them.

<!-- §10.0 is intentionally lab-local. It was detached from docs/_partials/currency.md
because that shared partial has not yet caught up with the current CLI on two
points: the scope of extensions_manage, and whether language-server management
has a slash command. (The partial now says correctly that autopilot is not the
default mode, so that point is no longer a reason to keep this copy.) Re-attach
this section once the partial is corrected. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry. This lab names the registry key and leaves the value
> there, so look a value up rather than copying it from a page; when a page and
> the registry disagree, the registry wins.

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
| **Mid-session model switch** | `/model MODEL-ID`, or `/model auto TIER` to pick an Auto routing tier (`efficiency`, `balance` or `intelligence`); a bare `/model` lets you choose from what your account offers | Upshift to a `models.premium` model (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to a `models.cheap` one for tool-heavy loops. The tier names are registry keys, not `/model` arguments: read a model id from the registry and pass that. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. |
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

🤖 **In Copilot CLI (`copilot>`) — try it: todo tracking via the session SQL store:**

```
Create a small plan for adding a "Department dashboard" page. Track 3
todos in the session database with id, title, description.
```

The agent calls the `sql` tool against the per-session SQLite database
and inserts rows into the default `todos` table. Follow up:

```
Show me the in-progress todo and mark the first one done.
```

🤖 **In Copilot CLI (`copilot>`) — try it: the plan.md file:**

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

🐚 **In your OS Terminal:**

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
> information, it does *not* belong in Layer 1. Raw sources feed Layer 2 —
> they are not Recall themselves. Before you `/clear` or start a fresh
> conversation, ask the agent to graduate anything durable into Layer 2.

## 10.2 Layer 2, native — Copilot Memory

**Lifetime:** across sessions and across Copilot surfaces, hosted by GitHub.
**Surfaces:** `/memory` in the CLI, the prompts you give Copilot, and your
github.com settings pages.

Layer 2 is **Recall**, and it comes in three flavours. This is the first:
[GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory),
which is generally available on paid Copilot plans. Copilot stores small,
durable notes on GitHub, in two kinds that are stored, shared and deleted
differently. It creates memories on its own as a byproduct of your work, and
you can also ask it to store one, which is what you do below. Because the
memories live on GitHub, other Copilot surfaces can use them too: a
repository-level fact the CLI learns can reach Copilot cloud agent and
Copilot code review.

| | **Repository-level fact** | **User-level preference** |
|---|---|---|
| **What it holds** | A fact about one codebase: a convention, a build or test command, an architectural decision. | How *you* like to work, across projects: how answers should look, when Copilot should ask first. |
| **Where it applies** | Only in that repository: not shared with the organization's other repositories, and not copied when the repository is forked. | In your Copilot sessions across all your repositories, a fork included. |
| **Who can create it** | Someone with write access to that repository, when Memory is enabled for them and for the repository. | You, from your own sessions. |
| **Who can use it** | Anyone with read access to the repository who has Copilot Memory on. | You. On Copilot Business and Enterprise it belongs to your billing entity, whose administrators can view, export and delete it. |
| **Where you delete it** | The repository's settings. | Your personal settings. |

Four things set it apart from the wiki in §10.3:

- **It is advisory.** Copilot decides whether to store a memory and whether
  to use it. GitHub's own guidance: "To provide instructions consistently,
  use custom instructions rather than relying on Copilot Memory." That is
  Layer 3 (§10.4).
- **Your words choose the scope.** Copilot files a memory by who it applies
  to, not by who said it. Say "In this repository, …" for a repository-level
  fact and "In all my projects, …" for a user-level preference, and do not
  rely on "always" or "going forward" to imply a scope. If the scope is
  unclear, Copilot asks. Being asked is not a promise that it will store
  anything.
- **It forgets on a clock, not on request.** A memory expires if Copilot
  does not reinforce it: 90 days by default, restarted only when Copilot
  upvotes it. An organization or enterprise can change the period for
  repository-level facts. Asking Copilot to forget something only
  **downvotes** it: Copilot cannot delete a memory in response to a prompt,
  so deleting happens in settings (§10.8).
- **It does not store what it should not.** Memories are scanned for secrets
  and rejected if one is found, and Copilot is told not to store sensitive
  information or short-lived, task-specific instructions. In the CLI, only
  the root agent stores memories and votes on them; subagents can use them
  but cannot change the store.

> 🧭 **Where Microsoft's pages and GitHub's disagree.** As of 2026-11-02, a
> VS Code documentation page differs from GitHub's pages on a few Copilot
> Memory details: the default expiry, whether VS Code's own memory setting is
> on by default, and the permission needed to delete repository-level facts.
> This lab follows GitHub's documentation, which describes the service itself.

> 📖 **No Copilot Memory, or a settings list that will not open?** Follow this
> section as a read-along. Read each prompt and the result it should produce,
> but do not run §10.2b to §10.2e, which store, recall and look at memories you
> do not have, and skip the settings step in §10.8, which then has nothing to
> delete. The `/memory` check in §10.2a and the dry run in §10.2f still work,
> because neither one stores anything. The read-along is for a learner who
> stores **nothing**: if Copilot stores one of the two memories and declines the
> other, that one still has to be found in §10.2e and deleted in §10.8.

### 10.2a Check the status and take a baseline

Open a Copilot session in your checkout if you do not have one, and ask for
the memory status. This is a read-only check.

🤖 **In Copilot CLI (`copilot>`)** (not your shell):

```text
/memory
```

It shows the CLI's local Copilot Memory setting and a link to manage the
memories stored on your GitHub account. "On" here is only the CLI's side: it
does not mean that your plan, your organization and the repository all allow
both kinds of memory. If you are on Business or Enterprise and your
administrator has not enabled the policy, user-level preferences stay off
however the CLI is set, and §10.2b has nothing to store into.

The same command also takes an argument that switches memory on or off for
every later interactive session on this machine, and it writes your CLI
settings. This lab never uses it, so leave the setting as you found it.

**Take a baseline before you store anything.** Your account may already hold
memories: Copilot creates them on its own as you work, and you may have entries
left by an earlier run of this lab. §10.8 has to delete only what this lab
adds, and the store prompts cannot tell you what that is, because Copilot can
decline a store, or reinforce a matching memory you already have instead of
creating a new one. So look first. 🌐 **Open both lists in a browser** and, for
each one, write down how many entries it holds and the opening words of any
entry that resembles what you are about to store: one about explaining a change
before applying it, one about the Node track, or one that begins "Lab 10
exercise:". Delete nothing now, and do not skip this: §10.8 relies on it.

- **Your user-level preferences:** [github.com/settings/copilot/memory](https://github.com/settings/copilot/memory)
  (profile picture → **Copilot settings** → **Memory**).
- **Your fork's repository-level facts:** open your fork on GitHub, then
  **Settings** → **Copilot** (under "Code, planning, and automation") →
  **Memory**. You can open this page only with write access to the repository
  and user-level preferences enabled for your account.

Settings ranks memories by usefulness, and Copilot's votes move them up and down
the list, so a new entry need not appear at the top: compare entries by their
text, not by position. An empty list is a fine baseline. If either page will not
open for your account, follow all of §10.2 as a read-along (skip §10.2b to
§10.2e): you could not delete what you store, and because Copilot chooses the
scope itself, an entry you ask for can land in either list.

### 10.2b Store a user-level preference

A user-level preference is about **you**, so say so.

🤖 **In Copilot CLI (`copilot>`) — type this into the Copilot prompt:**

```text
In all my projects, I prefer that you explain a change before applying it. Please store that as a memory, and begin the memory text with "Lab 10 exercise:" so I can find it again.
```

Depending on your permission settings, Copilot now asks you to approve the
store. The approval prompt shows the memory and who can see it; for a
user-level preference it says the memory is for you. You get three choices:
approve the update **once**, **reject** it (with optional feedback), or allow
future memory updates without asking, for the current repository, directory
or session, as the option states. **Choose approve once.** The third choice
can save a standing permission on this machine, which this lab does not set up;
§10.8 says what to do if you chose it by mistake.

If Copilot asks whether the memory is for you or for the repository, answer in
words: "for me, across all my projects". Neither an approval prompt nor the lack
of one tells you what happened. Without a prompt, your permission settings may
already allow memory updates, so Copilot may have stored the memory directly.
With or without one, Copilot may also decline, or recognize a matching
preference you already have and reinforce that one instead of creating a new
entry. Declining and reinforcing are both the advisory nature of memory, not a
mistake in the lab. Carry on to §10.2c whatever happened: the two stores are
independent, and §10.2e compares the list with your baseline to show whether a
new entry exists. Until you delete a new preference in §10.8, Copilot may apply
it in every session you open, in any repository: expect it to explain a change
before it makes one, and to ask you to approve a *vote* on a memory it used.
Either answer to a vote prompt is fine.

### 10.2c Store a repository-level fact

A repository-level fact is about the codebase and is shared with everyone who
works in it, so say **this repository**.

🤖 **In Copilot CLI (`copilot>`) — type this into the same session:**

```text
In this repository, the Node track lives in node/, with its Vitest tests in node/tests/ and its Playwright tests in node/e2e/. Please store that as a memory, and begin the memory text with "Lab 10 exercise:" so I can find it again.
```

The fact is about the Node track on purpose: §10.3 stores a .NET finding in the
wiki, and you want to be able to tell the two flavours apart later. It is a
plain statement about where files are, true of this checkout, and Copilot only
remembers it: nothing in this lab installs or runs the Node track.

**Read the approval prompt before you answer.** For a repository-level fact it
names the repository (`owner/repo`) and says the memory is shared with
repository collaborators. That name must be your fork. If it names
`ms-mfg-community/day-in-the-life-copilot-lab`, choose **reject** and go back to
"Record your starting point": a fact stored there would be used by everyone who
can read the upstream repository. If it names your fork, approve once. If no
prompt appears, the fact goes to the repository Copilot works out from your
checkout, which your starting-point check showed is your fork. As in §10.2b,
neither a prompt nor its absence shows whether a new entry exists: §10.2e does.

### 10.2d Recall it in a new session

Memory is for the next session. Close this one (`/exit`) and start `copilot`
again in the same checkout.

🤖 **In Copilot CLI (`copilot>`) — ask:**

```text
Which memories do you have about me and about this repository? List each one and say whether it is a user-level preference or a repository-level fact.
```

You should see each entry Copilot stored, beginning "Lab 10 exercise:". An entry
Copilot declined to store will not be there, and §10.2e tells you which. If an
entry it did store does not come back, that is the lesson, not a failure:
Copilot chooses which memories to send with a prompt (upvoted ones are more
likely), and it is not guaranteed to use a stored memory in every session. A
memory is a hint. A rule that has to hold every time belongs in Layer 3.

### 10.2e Look at where they live, and record what is new

🌐 **Open the same two lists again** (the links are in §10.2a) and compare each
with your baseline. Whatever Copilot stored is on GitHub, in one of two
different lists. You only **look** in this step; you delete in §10.8.

For each list, look for an entry that is **not in your baseline** and either
begins "Lab 10 exercise:" or, if Copilot reworded it, says what you asked it to
store. (Without a baseline you cannot tell old entries from new, and §10.8 will
not guess.) The two stores succeed or fail independently, so record one outcome
for each thing you asked Copilot to store, and note which list holds it: Copilot
chooses the scope itself, so an entry can turn up in the other list than the one
you expected, and it still counts.

- **New entry.** Copilot created it, so it is the lab's, and §10.8 deletes it
  from the list where you found it.
- **Nothing new.** No entry in either list is both new and what you asked it to
  store: Copilot declined, or it reinforced a memory you already had instead of
  creating another. Whatever is in your baseline is yours: §10.8 never deletes
  it, and for this one you carry on as a read-along.

Write the two outcomes down in a note outside your checkout, as "preference: new
entry in the personal list" or "preference: nothing new", and "fact: new entry in
the fork's list" or "fact: nothing new". §10.8 works from them. An entry that
begins "Lab 10 exercise:" but was already in your baseline is not new: an
earlier run left it, and this run does not delete it (you can delete it yourself
in settings if you want it gone).

Each row shows the memory text, its subject, the agent that stored it and the
model. It does not show the citations Copilot stored, the reason it gave or the
votes. There is no button to add or edit a memory, because you cannot create or
edit one in settings; you can only delete it. Compare that with the wiki you
meet next, where every change is a diff in git.

### 10.2f Validate a bulk import — without submitting it

Copilot CLI can also import prepared memories in bulk from a JSONL file, one
JSON record per line. Importing counts as your approval, so Copilot does not ask
about each record, and a repository-level fact you import is shared with the
repository's collaborators. That is why this lab only ever **validates** an
import. The repository ships a two-record sample,
[`solutions/lab10-session-management/sample-memories.jsonl`](../solutions/lab10-session-management/sample-memories.jsonl):
one user-level preference and one repository-level fact, each tagged
"Lab 10 sample" so a stray import is easy to find and delete. Bulk import is a
recent CLI feature, so first check that your CLI has it: `copilot memories --help`
should list `import`. If it reports an unknown command, run `copilot update` and
try again, or read this step along. Then, from the repository root, in your 🐚 OS Terminal
(open a second terminal, or `/exit` the Copilot session first):

**WSL/Bash:**
```bash
copilot memories import solutions/lab10-session-management/sample-memories.jsonl --dry-run
```

**PowerShell:**
```powershell
copilot memories import solutions/lab10-session-management/sample-memories.jsonl --dry-run
```

`--dry-run` validates the whole file without authenticating or submitting
anything. Expect `Memory JSONL is valid; no records were submitted.` and an exit
status of 0. It checks the file's format, not whether your account may store the
memories, and a malformed record, such as an empty `reason`, fails with a message
for that line, exits non-zero and submits nothing.

Open the file and read its two records against the two prompts you just used.
The `scope` of a preference is `{"type":"user"}`; the `scope` of a fact names a
repository's `owner` and `name`, where `YOUR-GITHUB-USER` stands in for your own
account. Every record needs `type`, `version`, `scope`, `subject`, `fact`,
`reason` and `citations`.

**This lab never runs the import without `--dry-run`.** Without it, the records
are submitted one at a time, so a failure part-way leaves a partial import, and
repeating the whole import can create duplicates. A real import would also store
whatever the file says: replace the placeholder owner and review every record
first.

Everything in this section is advisory. When a rule has to hold every time, it
goes in Layer 3 (§10.4). First, the do-it-yourself flavour.

## 10.3 Layer 2, DIY — the wiki (LLM-maintained markdown)

**Lifetime:** across sessions, in git.
**Surfaces:** [`.copilot/lessons/`](../.copilot/lessons/) (project scope)
and `~/.copilot/lessons/` (global / per-workstation).

This is the do-it-yourself flavour of Recall, and the one this repository
ships. It is a directory of plain markdown files the agent writes to itself: a
catalog (`index.md`), an append-only journal (`log.md`), and one topic file per
durable lesson. The shape is enforced by
[`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md);
its `applyTo` glob targets `.copilot/lessons/`, so Copilot applies that schema
when it edits files there.

Set against Copilot Memory (§10.2), the wiki trades convenience for control.
There is nothing to host, and every lesson is a file you can `cat`, diff, review
in a pull request and revert. In return you do the curating (§10.5), and a
session reads the wiki only when you tell it to: `.copilot/lessons/` is not
among the places Copilot CLI loads automatically, which is why the recall prompt
in §10.3b names it.

> 🆕 **This is an application-layer convention, not protocol-level MCP
> memory.** `.copilot/lessons/` is plain markdown that this repo's own
> instructions govern — it was never backed by the MCP protocol, and that's
> even more true after the breaking MCP spec revision that
> `mcp_protocol_spec_version` in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml)
> pins ([Lab 05](lab05.md) links its changelog), which removed protocol-level
> sessions entirely — no `Mcp-Session-Id`, no stateful `initialize` handshake.
> Any cross-call state an MCP server needs today is an explicit, server-minted
> handle passed back as an ordinary tool argument, never an implicit session. So
> the `memory` MCP server (a generic knowledge-graph *primitive*, see
> [Lab 05 §5.3](lab05.md#53-cross-session-persistence--markdown-lessons-not-a-server))
> and this wiki solve different problems: MCP gives you live tools *within* a
> call; the wiki is this repo's do-it-yourself way to persist *across* calls and
> sessions, in git, with nothing implicit. Copilot Memory (§10.2) is the native
> way, and a custom service (§10.6) is the heavier one.

🐚 **In your OS Terminal — inspect what ships with the repo:**

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

### 10.3a Append a lesson to `log.md`

Learning something new mid-session is the trigger for a `log.md` entry.
The schema is short — a level-2 heading and a bullet list with
`Context`, `Lesson`, `Evidence`, `Action for future sessions`, and
`Promoted to`. Ask the agent to record a lesson without editing the
file yourself.

🐚 **In your OS Terminal:** the inspect step above ran in your shell, so start
a Copilot session from the repository root with `copilot`. Skip this if a
Copilot session is still open in another terminal.

🤖 **In Copilot CLI (`copilot>`) — ask the agent to record the lesson:**

```
I just discovered that building only the test project, with
`dotnet build dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj`,
never builds the ContosoUniversity.PlaywrightTests project, so a breakage
there only shows up in a solution-level `dotnet build dotnet/ContosoUniversity.sln`.
Append a lesson to .copilot/lessons/log.md following the schema in
.github/instructions/lessons.instructions.md. Leave "Promoted to" blank.
Write it to the wiki only; do not store it as a Copilot memory.
```

The last sentence keeps this finding in the wiki, so the two flavours stay
apart (the same reason §10.2c is about the Node track). Copilot can still
capture a clearly stated fact on its own, and §10.8 tells you where to look.

The repo can back that claim up, which gives the lesson real `Evidence`:
`ContosoUniversity.Tests.csproj` has a `ProjectReference` to the Core,
Infrastructure and Web projects and to nothing else, while
`ContosoUniversity.sln` also lists the PlaywrightTests project.

🐚 **In your OS Terminal — verify the append:**

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
`/consolidate-lessons` skill in §10.5.

### 10.3b Recall from a fresh session

This is the payoff. Close your current session (`/exit`), then
🐚 **in your OS Terminal** start a new one with `copilot` from the repository root.

🤖 **In Copilot CLI (`copilot>`) — in the new session, ask:**

```
What have we learned about verifying .NET changes in this repo? Check
.copilot/lessons/, including log.md, before answering.
```

The agent reads `index.md`, opens `example-lesson.md` and `log.md`, and
answers from the wiki — even though you never told *this* session
anything. Nothing here needed a server or an embedding index; it is just
markdown on disk, which is what makes this the do-it-yourself flavour.

Read the answer carefully, because only half of it is yours. `index.md`
and `example-lesson.md` **shipped with this repo** — the seed wiki
already carries a build-verification lesson, so an answer citing only
those two files proves the agent can read a file, nothing more. The
`log.md` entry is the one *you* had the agent write in §10.3a. The agent
should cite both, and it is that `log.md` entry surviving `/exit` that
actually demonstrates the layer. With Copilot Memory on, the agent may also
mention a memory from §10.2; what matters here is that it names the wiki
files it opened.

### 10.3c Project vs. global lessons

- **Project lessons** live in `.copilot/lessons/` and ship with the repo
  (things that are true *here*: "run the full ContosoUniversity solution
  build").
- **Global lessons** live in `~/.copilot/lessons/` on each workstation
  (things true *across repos*: "always cite evidence in review comments").

Agents consult both. On conflict, global wins unless the project lesson
carries `scope: project-override` in its front-matter — that flag means
the author deliberately disagrees with the global rule, and consolidation
(§10.5) never auto-reconciles an override.

🐚 **In your OS Terminal — optional extension: scaffold a global wiki** (about 3 minutes, not
counted in the 115). The core path does not need one: every step from here on
works with the project wiki alone. Run
this only if your starting-point check said `global wiki: absent`. It
stops by itself when `~/.copilot/lessons` already exists, so it cannot
touch a wiki you keep. It also writes an empty marker file,
`.created-by-lab10`, which is how §10.8 tells a folder this lab made from
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

## 10.4 Layer 3 — The Schema (the binding layer)

**Lifetime:** forever, in git.
**Surfaces:** [`AGENTS.md`](../AGENTS.md), [`.github/instructions/*.md`](../.github/instructions/),
`.github/copilot-instructions.md`, and the agent personalities in
[`.github/agents/*.agent.md`](../.github/agents/).

Layer 3 is the rulebook the agent follows, including when it writes to
Layer 2. It is not itself a memory of *what happened*; it is a memory of
*how to behave*. That distinction keeps the wiki consistent across
sessions and across contributors, and it is why Layer 3 is the one layer
that binds. An instruction file is loaded whenever its scope matches; a
memory is used only when Copilot judges it relevant, which is why GitHub's
own guidance is to "use custom instructions rather than relying on Copilot
Memory" when you need consistent behaviour. No Layer 2 option — hosted, DIY
or custom — replaces this layer.

🐚 **In your OS Terminal — inspect the schema in place:**

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

### 10.4a Extend the schema

Schema changes are binding on the work they apply to — and an instruction
file only applies where its `applyTo` glob matches. So a new rule goes in
the file whose glob covers the task. A rule about *repository classes*
belongs in `dotnet.instructions.md`, whose `applyTo` includes `**/*.cs`. It
does **not** belong in `testing.instructions.md`: that file only matches
test paths (`**/*.test.*`, `**/tests/**` and similar), and neither
`DepartmentRepository.cs` nor
`dotnet/ContosoUniversity.Tests/Infrastructure/DepartmentRepositoryTests.cs`
falls under those globs.

🤖 **In Copilot CLI (`copilot>`):** keep the rule tight. Type this into the Copilot prompt:

```
Append to .github/instructions/dotnet.instructions.md:
"Every new repository class must have a corresponding xUnit test class in
dotnet/ContosoUniversity.Tests/Infrastructure/."
Edit that file only; do not store the rule as a Copilot memory.
```

This edits a tracked file; §10.8 shows how to revert it. Now open a fresh
session and ask the agent to scaffold a new **repository class** — a DDD
data-access class, not a git repository. Keep the request small, because the
only thing you are looking for is whether the rule fires: one class with one
method, and nothing built or run.

```
Scaffold a minimal DepartmentRepository class for the ContosoUniversity data layer, with a single method. Do not edit existing files, and do not build or run anything. Then list the files you created.
```

**What to watch for:** the agent's list should include a matching xUnit test
class under `dotnet/ContosoUniversity.Tests/Infrastructure/` **that you did not
ask for**. That unrequested test class is the observable —
it is Layer 3 firing, because the files the agent is working on are `.cs`
files that match the `applyTo` glob of the file you appended to. An agent
may still skip a rule, so treat a miss as a prompt to investigate rather
than proof. The list is the agent's own account, so confirm it on disk. The new
`.cs` files show as `??`, with a brand-new folder collapsed to one line, and the
rule you appended shows as `M`:

🐚 **In your OS Terminal:**

**WSL/Bash:**
```bash
git status --short
```

**PowerShell:**
```powershell
git status --short
```

If you only get the repository class, re-check that the append
landed in
[`.github/instructions/dotnet.instructions.md`](../.github/instructions/dotnet.instructions.md),
and run `copilot instruction list` to confirm Copilot discovers that file.
That command lists the instruction files Copilot found; it does not show
which ones applied to a given task.

The scaffold writes new files into your working tree. Leave them for now;
§10.8 shows how to discard them.

### 10.4b Agent personalities — the stewardship story

> ➕ **Optional — about 3 minutes, not counted in the 115.** Skip it if you
> are short on time; nothing later depends on it.

`AGENTS.md` and `.github/instructions/` apply to *all* agents. But this
repo also ships agent **personalities** — role-specialized agents with
their own voice and tool scope. What each one can do with the Layer 2
wiki follows from that tool scope.

🐚 **In your OS Terminal — compare two personalities:**

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
> Layer 2. Recall is advisory; schema is binding.

## 10.5 Consolidation and curation — promoting the wiki, and what Dreaming would do

The wiki accumulates entropy. Over a few weeks you get duplicate topic
files, stale lessons, and project-scoped entries that actually apply
globally. This repo's way to reshape the wiki is the `/consolidate-lessons`
command skill — manual reorganization is a footgun because agents rely on
stable file paths. Copilot Memory has curation of its own: Copilot votes
memories up and down as it works, and a memory nobody reinforces expires.
Copilot Dreaming (§10.5e) is the optional hosted pass that goes further.

> ℹ️ **A repository skill, not a built-in command.** `consolidate-lessons`
> — like `checkpoint` and `handoff` in §10.7 — ships as a skill in
> [`.github/skills/`](../.github/skills/) with `disable-model-invocation: true`,
> so Copilot never loads it on its own: you run it by typing
> `/consolidate-lessons` in the Copilot prompt, options after the name.
> Copilot CLI's built-in list (`copilot help commands`) does not show it;
> `/skills list` does.

🐚 **In your OS Terminal — read the skill before you use it:**

**WSL/Bash:**
```bash
head -40 .github/skills/consolidate-lessons/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/consolidate-lessons/SKILL.md | Select-Object -First 40
```

### 10.5a Dry run first

Always start with a dry run so you can see what would change. The skill
takes two options — `--dry-run` and `--scope project|global|both` —
and tells the agent what each one means.

🤖 **In Copilot CLI (`copilot>`):** run the skill **in the Copilot prompt** (not in
your shell), with the options after the name:

```text
/consolidate-lessons --dry-run --scope project
Do not write any files.
```

`--scope project` keeps the run inside this repository's
`.copilot/lessons/`. The skill's own default is `both`, which also
writes to `~/.copilot/lessons/`; this lab only does that if you opt in
(see the note below).

The agent will enumerate the project wiki, decide which `log.md` entries
are ready for promotion, flag duplicates, and print a summary — without
writing anything. Read the summary and **keep it**: §10.5b asks you to
compare the real result against it. If it proposes to merge two files you
wanted to keep separate, fix the front-matter (`tags`, `scope`) and
re-run the dry run.

> 🌐 **Opt-in: both scopes.** If — and only if — the global wiki is the
> one §10.3c just created for you (your starting-point check said
> `absent`), you may use `--scope both` here, in §10.5b and in the
> §10.5d line instead. That also lets the skill propose project→global
> moves and `CONTRADICTION` flags, and it writes under
> `~/.copilot/lessons/`, which `git` cannot see — §10.5b says how to
> review that. Never use `both` against a global wiki you already kept:
> this lab cannot restore it.

### 10.5b Live consolidation

🤖 **In Copilot CLI (`copilot>`):** when the dry run looks right, run it for
real — again **in the Copilot prompt**, not in your shell:

```text
/consolidate-lessons --scope project
```

Expected result, given the seed wiki this repo ships:

- The `log.md` entry you added in §10.3a gets a `Promoted to:` value, and
  either a new topic file appears (untracked, so `git diff` will not show
  it) or the lesson merges into `example-lesson.md` with a Revision log
  bullet.
- A new bullet lands in `index.md` under the matching topic heading.
- Nothing is copied to `~/.copilot/lessons/`. Your §10.3a lesson names
  `dotnet/` paths, so even under `--scope both` it should stay in the
  project wiki.
- The summary ends with a **Files touched** list, and every path in it
  should sit under `.copilot/lessons/`.

🐚 **In your OS Terminal — review what the run changed: the content, not just the file
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

`git status --short` lists every changed path, including the §10.4a edit
to `dotnet.instructions.md` and anything the §10.4a scaffold left; the
lines under `.copilot/lessons/` are this step's. The `diff` command shows
the tracked wiki files, staged or not, and the last command prints each
new topic file in full. Now compare what you read with the §10.5a dry-run
summary:

- `log.md`'s `Promoted to:` line names the file the dry run said, and that
  file exists.
- That topic file carries the **Evidence** (the project-reference fact
  from §10.3a), a `scope:` line, a fresh `updated:` date and a Revision
  log bullet.
- `index.md` gained one bullet, under the heading the dry run proposed.
- Nothing else moved: no file deleted, and the older `log.md` entry
  ("Seed the wiki layer") is unchanged.

If the result differs from the dry run, or the lesson now says something
you did not mean, do not stage it — §10.8 puts the wiki back, and you can
re-run the dry run.

If you opted in to `--scope both`, `git` cannot see the global wiki, so
read it directly. 🐚 **In your OS Terminal:**

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

### 10.5c Graduating a lesson into Layer 3

If a topic file keeps getting cited across every review and every
planning pass, promote it out of Layer 2 and into Layer 3 — append a
rule to `AGENTS.md` or a targeted `.github/instructions/*.md` file and
delete the lesson (keep the `log.md` history). The wiki stays a
*library*; the schema stays a *constitution*. Don't let them blur. The
same goes for a Copilot Memory fact that turns out to bind everyone: put
the rule in an instruction file, not only in memory.

### 10.5d Autopilot — a cadence, not a feature

> ➕ **Optional — read-only, about 2 minutes, not counted in the 115.** Nothing
> later depends on it.

If you want consolidation to run on a cadence, add a cron/launchd/Task
Scheduler entry that launches a non-interactive Copilot session
(`-p`/`--prompt`) and names the skill in the request. An example to
read, **not a step in this lab** — nothing here runs it:

```text
copilot -p "/consolidate-lessons --scope project" --allow-all-tools
```

`--prompt` carries ordinary prompt text, and a `/skill-name` inside it is
how a skill is requested (§10.5). A non-interactive run cannot ask for
permission, so it denies any tool request that no allow rule approves.
`--allow-all-tools` approves everything, file writes included, but it is
optional blanket approval and not a requirement: prefer narrow
`--allow-tool` rules for just the tools the skill needs, or
`--assisted-approval`, whose safety judge the CLI help calls probabilistic
and not a security boundary. Use blanket approval only in a repository and
on a machine you trust; `--deny-tool` rules and managed policy still apply
either way. Rehearse the schedule with the skill's own `--dry-run` option
first. This repo does not ship a schedule — cadences are
environment-specific and belong in your personal setup.

Prompt mode also starts with Copilot Memory **off**. A scheduled run reads
and writes the wiki, not Copilot Memory, unless you pass `--enable-memory`;
account, repository and tool-permission restrictions still apply to that
flag.

### 10.5e Copilot Dreaming — hosted curation, explained but not enabled

`/consolidate-lessons` is you curating the wiki on demand. **Copilot
Dreaming** is GitHub's hosted version of the idea for Copilot Memory: an
optional background pass that keeps memories and repository guidance up to
date. It is opt-in and off by default. The primary source is
[About GitHub Copilot Dreaming](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-dreaming).
Reading it is **optional** (about 5 minutes, not counted in the 115), because
this section carries what the lab needs; read it before you decide anything
about turning Dreaming on. Dreaming is the one part of GitHub's
memory features that is still in **public preview**, so expect it to change;
Copilot Memory itself is generally available.

**This lab does not enable Dreaming, and no step in it turns on session sync
(`remoteExport`) or the "Store local sessions in the Cloud" policy.** Here is
what you would be deciding:

- **What it does.** It runs in the background on a schedule GitHub manages,
  so you do not need a conversation open, and you cannot start a run or
  change its schedule, prompts or model. It analyzes eligible previously
  synced Copilot sessions, memories, repository content and pull request
  review feedback. It corrects outdated guidance (it can propose an update
  when your instructions describe an obsolete test command) and removes
  duplicate memories. It updates Copilot's *context*, not the underlying
  model.
- **What it changes, and how.** Memories are added, updated and deleted
  **without your approval for each change**. Checked-in instruction and skill
  files change only through a **pull request** that a human merges, and
  GitHub warns that AI-generated guidance can be incorrect. Internal guidance
  for Copilot code review is updated with no pull request.
- **What it needs.** An eligible paid plan above Copilot Pro, a model that
  your policy allows (the concept page names it; this lab does not), and, for
    memory and instruction curation, session sync, which saves your local
    Copilot sessions to your GitHub
  account. On Business and Enterprise an administrator's policy must allow
  that. It is not available with GitHub Enterprise Cloud data residency.
- **What it costs.** Model usage is billed in **AI credits** as part of your
  existing Copilot usage, and **every run uses AI credits, including a run
  that changes nothing**. The concept page gives no per-run amount, so this
  lab quotes none. Administrators should review repository coverage and
  spending controls first, because an alert alone does not stop usage.
- **What turning it off does.** It stops future runs. It does **not** undo what
  earlier runs changed, close their pull requests or restore memories they
  deleted: you review and delete memories in settings and handle the pull
  requests yourself.

That is why the lab leaves it off. Every run costs credits whether or not it
finds anything, it needs your sessions synced to GitHub, it changes memories
without asking, and switching it off does not undo the changes. For most
learners it is also an administrator's decision, not a personal one.

Set against `/consolidate-lessons`, the trade is control for convenience. The
skill is manual, previews with `--dry-run`, and leaves every change as a diff
in git that you can revert; Dreaming is automatic and hosted. Do not expect
Dreaming to curate your wiki: the concept page's list of repository files it
reviews names instruction, agent and skill files, and has no `.copilot/` path.

## 10.6 Layer 2, custom — SCNS, and when a custom memory service pays off

**Lifetime:** whatever the service's own rules say.
**Surface:** a service you run yourself. This section is **read-and-compare**:
you read about one worked example and compare it with the two flavours you have
used. You install nothing and run nothing.

When Copilot Memory and the wiki do not fit, the third flavour of Recall is a
**custom memory service**: software you run that stores what your agent learns
and hands it back later. [SCNS](https://github.com/johnhain-msft/scns) ("Second
Central Nervous System") is the worked example. This lab teaches the trade-off,
not the product, and nothing here is a recommendation to install it.

**SCNS is alpha.** Its README says so at the top: parts of it are solid, parts
are young, and you should read which is which before you rely on it. Everything
below describes what its documentation says; this lab did not run it.

**What it is.** A local-first background service. A broker tracks your Copilot
sessions; each registered repository gets its own child broker, so two
repositories do not see each other's memory; and the memories live in a SQLite
vault with full-text and local-embedding search. For Copilot CLI, an extension
and hooks forward session events to the broker and, if you turn it on, add
relevant memories to your prompts. Everything runs on your own machine; it is
not a hosted product.

**What it is not.** Its README says so itself. It is **not a replacement for
instruction files**: `AGENTS.md` and `copilot-instructions.md` are still how you
set the rules, and SCNS is how the agent remembers what happened. It is not a
hosted product. And it is not magic retrieval: if you never store anything and
never enable context injection, it does approximately nothing. The same holds
for any custom service, and for Copilot Memory and the wiki too: Layer 2 is
advisory, and Layer 3 (§10.4) is where a rule binds.

🌐 **Read, don't run.** The [SCNS README](https://github.com/johnhain-msft/scns/blob/main/README.md)
is the primary source for everything above. Opening it is **optional** (about 5
minutes, not counted in the 115), because the table below carries the
comparison. If you do open it, you do not need to clone, install or run
anything: read the status note at the top, the "What SCNS is" section and its
list of what it is not. Then use the table to compare SCNS with the two flavours
you have used.

| | Copilot Memory (native) | The wiki (DIY) | SCNS (custom, alpha) |
|---|---|---|---|
| **Who runs it** | GitHub | You, with git: nothing to host | You: install, secure, restart and back it up. It is alpha |
| **Where it lives** | On GitHub: repository-level facts with the repository, user-level preferences with your account | Markdown in your repository (`.copilot/lessons/`) and in your home folder (`~/.copilot/lessons/`) | On your machine, in a local database, with a separate store for each registered repository |
| **Who can see it** | Repository-level facts: anyone with read access who has Memory on. User-level preferences: you (and anyone who can view a shared session where one appears) and, on Business and Enterprise, administrators | Project lessons: anyone who can read the repository. Global lessons: only you | Local to your machine: its README says nothing is uploaded, and by default its brokers listen only on loopback |
| **How you inspect it** | A settings page shows the text, subject, agent and model, but no citations, reasons or votes. You can delete a memory but not edit it | `cat`, `git diff`, pull-request review, `git revert` | Open its local database or markdown files; its prune and delete commands preview first. With context injection on, a hidden block in each prompt is not shown to you |
| **Who curates it** | Copilot (votes and expiry), and optionally Dreaming | You, with `/consolidate-lessons` | Its own scheduled jobs, and the prune and delete commands you run |
| **What it costs** | The memories sent with a prompt count toward token use; Dreaming bills AI credits on every run | Ordinary session usage, with no service running between sessions | No cloud or credit cost to run it locally, unless you switch on its optional agent-spawning tasks; injected memories add tokens to each prompt; you operate it |
| **Where it reaches** | Many Copilot surfaces, among them the CLI, cloud agent and code review (which uses repository-level facts only) | A session reads it only when told to, because `.copilot/lessons/` is not loaded automatically | Copilot CLI, through its extension and hooks |
| **Does it bind?** | No — advisory | No — advisory | No — advisory, and not a replacement for instruction files |

**When running your own service pays off.** First take away what the two simpler
options already give you, because a requirement they meet is not a reason to run
a service:

- **Keeping data on your own machine.** The global wiki already does that: it
  is markdown in your home folder (§10.3), with nothing hosted. The project
  wiki is committed, so once you push it, anyone who can read the repository
  can read it; keep a lesson in the global wiki when it must stay local.
- **Keeping repositories apart.** A native repository-level fact is already
  scoped to the one repository it was stored in (§10.2), and the project wiki
  lives inside its own repository, so isolation alone is not a reason.
- **A rule that must hold every time.** No memory option does that, a custom
  service included. That is Layer 3 (§10.4).

What a service adds is retrieval, retention or coordination that neither of the
other two gives you. Choose one when one of these is a requirement rather than a
preference, Copilot Memory and the wiki cannot meet it, and you will operate the
service:

- **Retrieval a markdown index cannot give you,** such as semantic search over a
  large store of notes, with the relevant ones added to a prompt for you.
- **Automated retention under your own rules,** such as scheduled jobs that
  consolidate and prune, with a preview before anything is deleted, where you
  would otherwise rely on Copilot's votes and expiry or on running
  `/consolidate-lessons` yourself.
- **Coordination,** where several agents or sessions work from one shared store
  and need messages, tasks or shared state around it (SCNS's documentation lists
  tools for these), or where one local service has to serve many repositories
  under one set of rules.

The price is that you install, secure, back up and upgrade it, and with an alpha
service you own its rough edges too. Stay with Copilot Memory or the wiki when
one of them already answers the need, when nobody will operate the service, or
when the real gap is a rule: a rule belongs in an instruction file.
[`docs/memory-decision-tree.md`](../docs/memory-decision-tree.md) turns this
comparison into a one-page flowchart with worked situations.

---

## 10.7 Wrap — the loop, drawn

```
 Layer 1                Layer 2 · Recall (advisory)                  Layer 3
 Raw sources  ────────► native   Copilot Memory (Dreaming: preview) ─► The Schema
 (plan.md,              DIY      .copilot/lessons/                    (AGENTS.md,
  SQL todos)                     ~/.copilot/lessons/                   instructions,
                        custom   a service such as SCNS (alpha)       agent personalities)

  one task              promoted when it proves durable:              hardens into a rule
  (kept on disk,        consolidate-lessons moves log → topic         when it must apply
   not curated)         and project → global; Copilot votes on        on every task
                        memories and lets unused ones expire
```

Three layers, one direction of promotion, and three ways to recall. Pick the
Layer 2 flavour by who should curate it and where it should live
([`docs/memory-decision-tree.md`](../docs/memory-decision-tree.md) has the
one-page version), and remember that every one of them is advisory: only
Layer 3 binds. Your checklist for the next real task:

1. **Open the session (L1):** write a short `plan.md` and insert todos
   into the SQL store.
2. **Consult Recall (L2):** ask the agent to check
   `.copilot/lessons/index.md` before starting, and
   `~/.copilot/lessons/index.md` as well if you keep a global wiki.
   Copilot Memory, if it is on for you, needs no prompt from you, though
   Copilot decides which memories to use.
3. **Append when you learn (L2):** any finding that will matter next
   time goes into `log.md` with evidence cited — or, if you chose Copilot
   Memory for it, into a memory scoped in your words ("in this
   repository…" or "in all my projects…").
4. **Harden into schema (L3):** if a rule should apply on every task,
   propose it during consolidation — not mid-feature. Do not leave a rule
   that must always hold only in a memory.
5. **Consolidate weekly:** run `/consolidate-lessons` with
   `--dry-run` first (§10.5a); commit the live run when the diff is clean.

> 🔖 **About `checkpoint` — a git-level safety net, not Layer 1.** ➕ *Optional
> reading, about 1 minute, not counted in the 115.*
> [`.github/skills/checkpoint/SKILL.md`](../.github/skills/checkpoint/SKILL.md)
> is the third command skill, with `create`, `verify` and `list` actions.
> `create` runs verification, makes a git stash or commit named for the
> checkpoint, and appends one `date | name | short SHA` line to
> `.github/checkpoints.log`, a file that is created on first use. It does
> **not** snapshot `plan.md`, your SQL todos or scratch files, so it is not
> a Layer 1 backup;
> [`sample-checkpoint-log.txt`](../solutions/lab10-session-management/sample-checkpoint-log.txt)
> shows the log format. Nothing in this lab uses it, and you should not run
> it mid-lab: its stash or commit would sweep up your §10.3a, §10.4a and
> §10.5b edits, and the §10.8 revert would no longer find them. Keep it for
> your own next task, run as `/checkpoint create <name>`.

🤖 **In Copilot CLI (`copilot>`) — end-of-lab handoff drill:** a handoff is how one task outlives one
conversation: a file a fresh conversation can pick up. In the Copilot
prompt (not your shell), run the
[`handoff`](../.github/skills/handoff/SKILL.md) skill. It asks for three
values and names no save location, so put the values *and* the location
in the request itself:

```text
/handoff Work description: "Completed Lab 10 — three-layer agent memory". Stop reason: "Lab 10 exercises finished; the §10.8 cleanup is still to do". Blocker: none. Save the handoff as lab10-handoff.md in the files folder of your session folder, outside the repository, and print its absolute path.
```

Note the path it prints. Now **resume from it**: open a fresh conversation
(`/new`, or `/exit` and run `copilot` again; `copilot --continue` would
reopen *this* session, which proves nothing) and send:

```text
Read <the path it printed>. From its Fresh Context Prompt section, tell me where we stopped and what the Immediate Next Step is. Do not run anything yet.
```

The CLI may ask permission to read a file outside the repository; approve
that one file. The fresh conversation should name the §10.8 cleanup, even
though nothing in its own history mentions it. That is the handoff doing
its job.

A handoff is a Layer 1 artefact, so the three questions from §10.1 apply
to it. *Intended lifetime:* one task, and nobody curates it. *On disk:* it
stays exactly where you saved it until you delete it. *Conversation
visibility:* a fresh conversation cannot see it until you point it there,
as you just did. Anything in it that will matter on the next task still has
to be promoted into Layer 2 or 3.

➡️ **Do not stop here.** The lab is not complete yet: §10.8 puts your
repository back to its starting state and deletes any memory this lab stored
on your GitHub account (even if only one of the two was stored), and the
completion message comes only after it.

<details>
<summary>Key Takeaways</summary>

| Concept | Layer | Lifetime |
|---------|------:|----------|
| `plan.md`, SQL todos, session-state | 1 | One task — on disk until deleted, not curated |
| Copilot Memory: repository-level facts and user-level preferences | 2 (native) | Across sessions, hosted by GitHub; expires if Copilot does not reinforce it; deleted in settings (asking Copilot to forget only downvotes) |
| `.copilot/lessons/`, `~/.copilot/lessons/` | 2 (DIY) | Across sessions, in markdown and in git |
| A custom memory service such as SCNS (alpha) | 2 (custom) | Whatever the service's own rules allow |
| `AGENTS.md`, `.github/instructions/`, agent personalities | 3 | Forever, binding |
| Reindex / LSP | — | Not memory: reads code, stores nothing (`/lsp` only manages the servers) |

Promotion: L1 → L2 when durable; L2 project → L2 global when cross-repo;
L2 → L3 when binding on every task. Nothing lives in two layers at once.
Every Layer 2 flavour is advisory; only Layer 3 binds. Copilot Dreaming, the
hosted curation pass, is in public preview and is explained here, not
enabled. Markdown round-trips are ordinary session usage — a weekly
consolidation touches a handful of files.

</details>

<details>
<summary>Solution: lab10-session-management reference materials</summary>

See [`solutions/lab10-session-management/`](../solutions/lab10-session-management/) — in particular [`README.md`](../solutions/lab10-session-management/README.md), [`sample-memories.jsonl`](../solutions/lab10-session-management/sample-memories.jsonl) (the file you validate in §10.2f), [`sample-handoff.md`](../solutions/lab10-session-management/sample-handoff.md), and [`sample-checkpoint-log.txt`](../solutions/lab10-session-management/sample-checkpoint-log.txt) — for sample artefacts to compare with yours. They show the shape of what the steps validate or produce; they are not a complete worked solution, because the changes this lab makes happen in your own checkout and GitHub account, and §10.8 reverts them.

</details>

## 10.8 Cleanup — required, and the lab is not finished without it

> ⏭️ **This is part of the lab, not an afterword.** Everything above left
> changes behind: a rule in an instruction file that binds every future
> session, lesson entries, new source files, possibly a global wiki and, if
> §10.2e recorded them, a user-level preference and a repository-level fact on
> your GitHub account (either one alone is enough to need the settings step).
> Put them back now, or Lab 11 and everything after it inherit them. The
> completion message at the end of this page comes only after the last check
> here.

### Lab 10–specific: put back what this lab changed

**1. The repository — everyone does this.** Revert the files this lab
changed before moving on, or Lab 11 and everything after it inherit a rule
and lessons you wrote here. If you ran every step, three tracked files
changed:

- `.github/instructions/dotnet.instructions.md` — the schema rule you
  appended in §10.4a.
- `.copilot/lessons/log.md` — your §10.3a entry, plus the `Promoted to:`
  field the §10.5b consolidation fills in.
- `.copilot/lessons/index.md` — the bullet the §10.5b consolidation adds.

A fourth, `.copilot/lessons/example-lesson.md`, changes only when the
consolidation merged your lesson into it instead of creating a new topic
file.

🐚 **In your OS Terminal — revert the tracked files, then see what is left:**

**WSL/Bash:**
```bash
# Has HEAD moved since "Before you start"? A different SHA means you
# committed; see the paragraph below these blocks.
git rev-parse HEAD

# Drop the §10.4a schema rule — it is binding on every future session:
git restore --source=HEAD --staged --worktree .github/instructions/dotnet.instructions.md

# Drop the §10.3a log entry and any §10.5b consolidation result,
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

# Drop the §10.4a schema rule — it is binding on every future session:
git restore --source=HEAD --staged --worktree .github/instructions/dotnet.instructions.md

# Drop the §10.3a log entry and any §10.5b consolidation result,
# unless you want to keep them:
git restore --source=HEAD --staged --worktree .copilot/lessons/

# What is still different from a clean checkout?
git status --short
```

Plain `git restore <path>` copies from the *index*, so it quietly keeps
anything you staged with `git add` in §10.5b. `--source=HEAD --staged
--worktree` resets both the index and your files to the last commit. It
leaves untracked files alone, so read what `git status --short` still
lists:

- **`M` in the first or second column** — a tracked file the §10.4a
  scaffold edited (a registration file, say). Check it with `git diff`,
  then revert only that file with the same restore command and its path.
- **`??`** — a new file this lab created: the scaffolded
  `DepartmentRepository` class and its test class, a new topic file under
  `.copilot/lessons/`, `lab10-handoff.md` if the agent saved the §10.7
  handoff inside the repository instead of its session folder, or
  `.github/checkpoints.log` if you ran `/checkpoint` despite the §10.7 warning. Delete
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

**2. Your GitHub account — each exercise memory that §10.2e recorded as new.**
A memory the exercise stored is on GitHub, so `git` cannot see it and nothing
above removes it. Asking Copilot to forget one only downvotes it, and a
downvoted memory can stay stored until it expires, so delete each one in
settings, in a browser. Settings lets you delete a memory but not edit one. Work
from the two outcomes you recorded in §10.2e: each one recorded as a new entry
needs deleting, from the list where you found it. If only one of them was a new
entry, only that one needs deleting, and it is still required. If neither was,
there is nothing to delete here, and you leave every entry in your baseline
alone.

1. **Your personal list of user-level preferences — only if §10.2e recorded a
   new entry in it.** Open
   [github.com/settings/copilot/memory](https://github.com/settings/copilot/memory)
   (profile picture → **Copilot settings** → **Memory**). Find each entry you
   recorded as new, click the trash icon next to it and confirm.
2. **Your fork's list of repository-level facts — only if §10.2e recorded a new
   entry in it.** Open your fork on GitHub, then **Settings** → **Copilot**
   (under "Code, planning, and automation") → **Memory**. Find each entry you
   recorded as new and delete it the same way. You need write access to the fork
   and user-level preferences enabled for your account to open this page.

Delete only entries that were not in your §10.2a baseline. A new entry should
begin "Lab 10 exercise:"; if Copilot reworded it, it is still a row that was not
in your baseline and says what you asked it to store. Do not pick a row by its
topic alone: a preference about explaining changes that was already in your
baseline is yours, and so is an entry that begins "Lab 10 exercise:" because an
earlier run left it. If you took no baseline, this step cannot tell a new entry
from an old one and will not guess: delete an entry only if you are certain this
run created it, and leave any you are unsure about, because an unreinforced
memory expires on its own (90 days by default) and you can delete it later.
Reload both pages: the entries you deleted should be gone and every entry from
your baseline should still be there.

While you are there, read the rest of each list. Copilot also stores memories on
its own as you work, and the settings pages show those too. One may even restate
the §10.3a finding or the §10.4a rule, although those prompts ask Copilot not to
store them. Those memories are yours to keep or delete, and this lab does not
touch them.

If you chose an "allow future" option at an approval prompt, that permission was
saved on your machine, not on GitHub. `/reset-allowed-tools` in a Copilot
session clears the saved approvals for the current location, all of them and not
just the memory one, so use it only if you set no others you want to keep.

**3. Your home folder — only if you ran the §10.3c extension.** The
`~/.copilot/lessons/` folder that extension created is outside the
repository, so `git` cannot see it and `git restore` cannot undo it. The
command below removes that folder only when the `.created-by-lab10` marker
is inside it, which is how it tells the folder this lab made from a global
wiki you keep. It deletes the whole folder, including anything a
`--scope both` run copied into it in §10.5, so copy out anything you want
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
you used for §10.3c, because WSL and Windows keep separate home folders.

**Left in place on purpose.** The session folder under
`~/.copilot/session-state/` holds your Layer 1 `plan.md` and, if you saved
it there, the §10.7 handoff. That is Copilot's own state, not something
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

🐚 **In your OS Terminal:**

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
   you at the read-only `copilot help config`, and §10.2a only reads the
   status with `/memory`), so it has nothing to restore
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
   if you ran the optional §10.3c extension, is `~/.copilot/lessons/`; the
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
   touched hooks, agents, or skills (about 2 minutes, not counted in the 115):

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept), and the build is clean if you ran it, the cleanup is done.

## Lab Complete 🎉

Your repository is back to its starting state and any exercise memory you
recorded as new in §10.2e is deleted, so Lab 10 is complete. You've now worked
through the three memory layers this lab teaches:

- ✅ **Lab 01–09** — agents, skills, hooks, MCP, orchestration, gh-aw,
  Coding Agent, Code Review.
- ✅ **Lab 10** — three-layer agent memory: raw sources, the three
  flavours of recall (Copilot Memory, the wiki, a custom service), the
  schema, and the curation that keeps them clean.
- ⏭ **Next in Track 2:** [Lab 12 — Fabric MCP](lab12.md) *(or [Lab 11 — Building & Distributing a Copilot Plugin](lab11.md) in Track 3 / numerical order, so the lessons and schema you curated above ship to other teams)*.

### What's next?

- **Customize:** seed `.copilot/lessons/` in your own repo with one
  real lesson. Most teams over-rely on Layer 1 and never start Layer 2.
- **Choose:** use [`docs/memory-decision-tree.md`](../docs/memory-decision-tree.md)
  to pick the Layer 2 flavour that fits your team, and keep any rule that
  must always hold in Layer 3.
- **Audit:** read `AGENTS.md`, `.github/instructions/` and
  `.github/agents/` in your repo and confirm Layer 3 is the minimum viable
  set, not a junk drawer. `/env` in a session shows what the CLI actually
  loaded from them.
- **Share:** commit your wiki. A PR that adds a lesson is as valuable
  as a PR that fixes a bug — it teaches every future session at once.

**Return to:** [README](../README.md)
