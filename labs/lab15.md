---
title: "LSP & Code Intelligence in Copilot CLI"
lab_number: 15
pace:
  presenter_minutes: 5
  self_paced_minutes: 20
prerequisites:
  - lab01
registry: docs/_meta/registry.yaml
---

# 15 — LSP & Code Intelligence in Copilot CLI

In this lab you will learn how Copilot CLI uses **Language Server Protocol
(LSP) servers** to get precise, compiler-grade understanding of your code —
and why that beats grep/text-search for navigation and refactoring tasks.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 20 minutes

> 🕒 **What the clock covers.** The 20 timed minutes (and the presenter's 5)
> cover the exercises only: §15.3 steps 1–3, the §15.4 *Try it* and the
> §15.5 check. Installing, configuring and indexing a language server
> (§15.2) is **untimed preparation** — do it before the session, or allow
> extra time — and so is the §15.7 cleanup. The §15.1 operations table and
> §15.3 step 4 (call hierarchy) are **reference and extension material**:
> skip them when you are short on time. The presenter's five minutes, with
> the server already running, are §15.3 step 1 and then step 3 (guard,
> rename, look at one changed line and two leftovers, undo).

**Prerequisite:** finish [Setup](setup.md) first — `copilot --version`
prints a version number, you are signed in to GitHub Copilot, and you are
working from a clone of this repo. [Lab 01](lab01.md) is the only lab this
one builds on; nothing from Labs 02–14 is required, and that is deliberate,
not an omission.

**What you need for the exercises.** Every exercise in §15.3 and §15.4
works on the C# solution under `dotnet/`, so they **require the .NET SDK
and a running C# language server** (`csharp-ls`, installed in §15.2) —
whichever language track you usually work in. `dotnet --version` should
print a version number. The Node track's `typescript-language-server` is an
optional configuration comparison only: it cannot answer questions about
C# code, so it does not complete this lab on its own. You should be
comfortable reading C# (properties, inheritance, attributes such as
`[Bind]`) and running a few basic Git commands (`status`, `diff`, `stash`,
`restore`); each one is explained briefly where it first appears.

> 💡 **Why this matters:** most of the labs before this one lean on Copilot
> reading files and searching text to understand code structure. That
> works, but it's imprecise — a text match for `GetStudent` might be a
> comment, a string literal, or an unrelated method with the same name.
> [Lab 01](lab01.md) §1.3 introduced the other layers — semantic indexing,
> LSP integration and GitHub MCP search — and [Lab 13](lab13.md) lets its
> critic use the `lsp` tool. This is the lab where you set a language server
> up yourself and watch Copilot use it: the same view of your code that
> your IDE's "go to definition" has, grounded in the language's actual
> compiler/analyzer, not text patterns.

References:
- [Using LSP servers with GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers) — official docs, confirmed GA
- [GitHub blog: give Copilot CLI real code intelligence with language servers](https://github.blog/ai-and-ml/github-copilot/give-github-copilot-cli-real-code-intelligence-with-language-servers/)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — CLI version floor

## 15.0 Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (GA June 23, 2026):** `/plugin`, `/mcp`, and
> `/skills` are real interactive commands backed by an in-terminal dashboard —
> you can discover, install, and configure plugins, MCP servers, and skills
> without hand-editing config files. The terminal also gained tabs for
> browsing issues/PRs/gists. Config-file editing still works and is what the
> underlying `extensions_manage` MCP tool inspects, but the dashboard is now
> the primary interactive path for a human at the prompt.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` (or the `/plugin` dashboard) | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto` to let Copilot choose) | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. The tier names are registry keys, not `/model` arguments. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to switch modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

## 15.1 What LSP Gives Copilot CLI

The Language Server Protocol is the open standard editors use to talk to a
language server — a background process that understands your code the way a
compiler does. When Copilot CLI has an LSP server available for your
language, **it uses it automatically**. You don't request this explicitly;
Copilot prefers the language server over text-based search whenever it can.

Supported operations (confirmed from the official docs). This table is
**reference material** — you do not need to try every row. §15.3 exercises
go to definition, find references and rename, and its optional step 4 adds
call hierarchy:

| Operation | What it does |
|-----------|--------------|
| Go to definition | Jumps to where a symbol (function, class, variable) is actually defined |
| Find references | Finds every real usage of a symbol across the project |
| Hover | Retrieves type information and documentation for a symbol |
| Rename | Renames a symbol project-wide, updating its code references |
| Document symbols | Lists all symbols defined in a file |
| Workspace symbol search | Searches for symbols by name across the whole project |
| Go to implementation | Finds implementations of an interface or abstract method |
| Incoming calls | Shows which functions call a given function (call hierarchy) |
| Outgoing calls | Shows which functions a given function calls (call hierarchy) |

> 💡 **Why this beats grep for these tasks:**
> - **Accuracy** — results come from the language's own analyzer, so "go to
>   definition" finds the actual definition, not a text match that merely
>   looks similar.
> - **Token efficiency** — "list all symbols" or "find references" return
>   compact structured results instead of the agent reading whole files into
>   context.
> - **Safer refactoring** — a rename follows real symbol references, so it
>   won't touch an unrelated member that merely shares the name, which a
>   grep-and-replace would. It only rewrites what the server understands,
>   though — see §15.3 step 3.
> - **Speed** — language servers index your project in the background, so
>   responses are near-instant once indexing completes.

## 15.2 Verify an LSP Server Is Available

> ⏳ **Untimed preparation.** Installing, configuring, reloading and waiting
> for a language server to index are not part of the 20 minutes. Do this
> section first — ideally before the session — and do not start §15.3 until
> the checkpoint at the end of this section passes.

🖥️ **In your terminal:**

The exercises in §15.3 and §15.4 work on the C# solution
(`dotnet/ContosoUniversity.sln`), so the server you need is a **C# language
server**: `csharp-ls`, installed with the .NET SDK's `dotnet tool` command.
That is the required path for everyone, whichever track you normally use.
The Node track (`node/`) has its own server, `typescript-language-server`;
step 2 shows how to add it as an optional comparison, but it only
understands TypeScript and JavaScript, so it cannot answer any C# question
in §15.3.

1. Check whether a language server is already configured. From your
   terminal, `copilot lsp list` prints the servers the CLI has configured
   (read-only, safe to run any time) — look for one that covers `.cs`
   files:

   ```bash
   copilot lsp list
   ```

   Or, from inside a Copilot CLI session, run `/lsp` or ask:

   ```
   What LSP servers are configured for this workspace, and which
   programming languages do they cover?
   ```

2. If no server covering `.cs` is configured yet, install the C# one.

   > ⚠️ **These installs are global.** `dotnet tool install -g` and
   > `npm install -g` put the server on your machine, outside this repo —
   > `git status` won't show it, and it stays after the lab ends. On a
   > shared or corporate machine that is a new global tool you own until
   > you remove it. §15.7 gives the matching uninstall commands; run them
   > when you finish.

   **Required — the C# server (needs the .NET SDK) — WSL/Bash or PowerShell:**
   ```bash
   dotnet tool install -g csharp-ls
   ```

   If the command reports that `csharp-ls` is already installed, that is
   fine — it is already on your machine, so go on to step 3.

   **Optional comparison only — the Node server, not needed for §15.3 —
   WSL/Bash or PowerShell:**
   ```bash
   npm install -g typescript-language-server typescript
   ```

3. Configure it for Copilot CLI. The CLI has two LSP surfaces: `/lsp`
   inside a session (it shows server status, and `/lsp reload` re-reads
   the configuration) and `copilot lsp` in your terminal (run
   `copilot lsp --help` to see its subcommands). Ask Copilot to set the
   server up:

   ```
   Configure csharp-ls as the LSP server for the C# files in this repo,
   pointed at the solution dotnet/ContosoUniversity.sln. Then confirm it's
   active.
   ```

   The server definition lives in an LSP config file: your personal
   `~/.copilot/lsp-config.json`, or a project-level `lsp.json` in this
   repo's `.github/` folder (see [Lab 01](lab01.md) §1.3). Note which one
   Copilot used, because §15.7 removes the entry. Then run `/lsp reload` in
   your session to load it, and confirm from your terminal:

   ```bash
   copilot lsp list
   ```

   *Optional comparison:* if you installed the Node server in step 2, ask
   Copilot to configure `typescript-language-server` for the `node/`
   folder the same way. It will appear in `copilot lsp list` beside the C#
   server, which shows that servers are configured per language — but it
   plays no part in §15.3.

> 🔎 **How to tell an LSP answer from a text search.** The answer alone
> cannot tell you — a text search prints `file:line` results too. Look at
> the tool calls Copilot made instead (press `Ctrl+O` to expand the
> timeline if they are collapsed):
> - an **`lsp`** call naming an operation (for example `goToDefinition`,
>   `findReferences`, `rename` or `documentSymbol`) **that came back with a
>   result for the symbol you asked about** is a language-server answer;
> - calls to `grep`, `glob`, `view` or a shell command are a text search.
>   The language server was not used, even if the answer looks right.
> - an `lsp` call that **failed** — an error such as *"the language server
>   command for X was not found"*, or an empty result — and is then
>   followed by `grep`/`view` calls is **also a text search**. Copilot
>   tried the server, it did not answer, and Copilot fell back silently.
>
> The tool name alone is not the evidence; the tool name plus a real result
> is. A failed call means the exercise did not demonstrate anything: go back
> to the checkpoint above, get the server running, and run the step again.
> Check this for every exercise in §15.3 and §15.4 — it is the skill this
> lab teaches. The exact wording of the timeline varies by CLI version;
> look for the tool name `lsp`.

> ✅ **Checkpoint — start §15.3 only when all three are true:**
> 1. `copilot lsp list` lists a server that covers `.cs` files.
> 2. `/lsp` in your session shows that server running, not failed or
>    stopped. If it will not start, run `dotnet tool list -g`: when
>    `csharp-ls` is listed, open a new terminal so the .NET tools folder is
>    on your PATH, then run `/lsp reload` again.
> 3. The server has finished indexing. Probe it: ask *"Using the language
>    server, list the symbols in
>    `dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs`."*
>    and look for an `lsp` call in the timeline. A slow answer, or one made
>    with text-search calls, means it is not ready yet — wait a minute and
>    ask again. Indexing a repo this size takes a few seconds to a couple of
>    minutes depending on the machine.
>
> If you skip this, nothing breaks — Copilot quietly falls back to text
> search, and you will not see what §15.3 is demonstrating.

## 15.3 Use LSP-Backed Navigation

🖥️ **In Copilot CLI:**

1. Ask a **go-to-definition** question that a grep-based search would answer
   ambiguously (e.g. a common name):

   ```
   Where is StudentsController.Index actually defined? Use go-to-definition,
   not a text search.
   ```

2. Ask for **find references** on a widely-used symbol:

   ```
   Find every reference to the Student entity's EnrollmentDate property
   across the whole solution.
   ```

3. Try a **symbol-aware rename** — this is the operation where LSP's
   advantage is most visible, because a naive text replace risks false
   positives. It is also the one step in this lab that **edits committed
   source**: `FirstMidName` is declared once, on the `Person` base class
   (`dotnet/ContosoUniversity.Core/Models/Person.cs`) that both `Student`
   and `Instructor` inherit, and it is used in dozens of places across
   `dotnet/` — the instructor code included. You will rename it, look at
   two things in what changed, and **undo it** before moving on.

   **Guard first — a gate, not a suggestion.** In a second terminal tab
   (leave your Copilot session open), from the repo root:

   ```bash
   git status --short dotnet/
   ```

   (These Git commands are the same in Bash and PowerShell. `git status
   --short` prints one line per changed file: `M` is a file Git tracks
   that has changes, `??` is a new file Git does not track yet.)

   > 🛑 **Do not start the rename until that command prints nothing.** The
   > undo below discards every uncommitted change to tracked files under
   > `dotnet/`, and any work of yours still in the tree would be mixed in
   > with the rename — you could not tell your changes from Copilot's.

   If it printed nothing, go straight to **Rename**. If it printed
   anything, set that work aside first, then run the guard again. The
   `--include-untracked` flag matters: a plain `git stash` leaves new
   (`??`) files where they are.

   ```bash
   git stash push --include-untracked -m lab15-preserve -- dotnet/
   git status --short dotnet/
   ```

   The second command must print nothing now. If it still prints anything,
   **do not rename** — stop and ask the presenter or a teammate. Your
   set-aside work is not lost: you bring it back at the end of this step.

   **Rename.** In Copilot CLI:

   ```
   Using the LSP rename operation, rename the FirstMidName property
   (declared on the Person base class that Student inherits) to FirstName
   across the entire dotnet/ solution.
   ```

   In the timeline, look for an `lsp` call whose operation is `rename`
   **and that succeeded** — that is the server doing the work. If you see
   only text-search and edit calls, or an `lsp` rename that errored and was
   followed by edit calls, Copilot did a text replace instead.

   Before asking again, check whether that fallback already edited the
   files: run `git status --short dotnet/`. If it lists anything, run
   `git restore dotnet/` first (safe — the guard above proved none of it is
   yours) and confirm the status prints nothing. Retrying on an
   already-replaced symbol asks the server to rename a `FirstMidName` that
   is no longer there, which fails for a second, unrelated reason.

   **Inspect — two things, then stop.** Back in the second terminal, first
   see what the rename changed. The diff marks every removed line with `-`
   and every added line with `+`:

   ```bash
   git --no-pager diff -- dotnet/
   ```

   It is long and you do not need to read all of it. If it prints nothing,
   no rename was applied — ask Copilot what the rename operation returned.
   Otherwise find **one changed C# reference**, for example the `Person`
   property declaration, or `student.FirstMidName` turned into
   `student.FirstName` in `StudentsController.cs`.

   Now look for what the rename did *not* touch. This search covers just
   the two files where the leftovers are easiest to see:

   ```bash
   git --no-pager grep -n FirstMidName -- dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs dotnet/ContosoUniversity.Web/Views/Students/Create.cshtml
   ```

   Note **two leftovers**: the `[Bind("LastName,FirstMidName,EnrollmentDate")]`
   string and one `asp-for="FirstMidName"` line from `Create.cshtml`. If
   the search prints nothing, Copilot already fixed those in a follow-up
   edit (`git grep` ends with status 1 when it finds nothing — that is "no
   matches", not an error): search all of `dotnet/` with
   `git --no-pager grep -n FirstMidName -- dotnet/` and use any hit that is
   left.

   Put your changed reference next to a leftover. The server rewrote the
   changed line because it resolved `FirstMidName` as the `Person` property
   — a real symbol. It left the leftovers because there the name is only
   text: a string the compiler never reads, and Razor markup the server
   does not rewrite by default. That difference is how you tell a
   language-server rename from a text replace, which would have rewritten
   the strings too (along with any unrelated look-alike name). It also
   means a manual pass is yours to do. ASP.NET Core reads the `[Bind]`
   string at run time to decide which form fields to bind, so it compiles
   without a warning and only misbehaves when someone submits the form.
   Razor views are compiled with the project, so a build is likely to flag
   the `asp-for` leftover. Stop inspecting here; you do not need to audit
   the rest.

   **Undo.** Put the tree back so later labs run against the committed
   code. Run this only now, after you have looked:

   ```bash
   # Safe only because the guard printed nothing before you renamed, so
   # everything uncommitted under dotnet/ now came from the rename. This
   # discards every uncommitted change to tracked files under dotnet/.
   git restore dotnet/
   git status --short dotnet/
   ```

   The second command must print nothing. `git restore` puts back files Git
   tracks, but it never deletes a new file. A line starting with `??` is a
   file that was not there when the guard printed nothing, so something
   created it since. Open Copilot's timeline (`Ctrl+O`) and delete **only a
   file you can see Copilot create**, in your editor or file explorer. If
   you cannot say where a `??` file came from, do not delete it and do not
   go on — ask the presenter or a teammate. Never use `git clean` here: it
   removes every untracked file at once, including ones that are not
   Copilot's. Run the status command again until it prints nothing.

   **Bring back your own work — only if you set some aside.** Once that
   status prints nothing, check the stash:

   ```bash
   git stash list
   ```

   If the first line (`stash@{0}`) ends with `lab15-preserve`, that is
   your work: `git stash pop` brings it back, and `git status --short
   dotnet/` should then list your own files again. If there is no
   `lab15-preserve` entry you had nothing to set aside, so skip this —
   running `git stash pop` then would apply an unrelated stash.

   > ✋ **Once you have done this, you are finished with the rename.** The
   > tree is dirty again on purpose: what it lists now is *your* work, not
   > the lab's. Skip the rename bullet in §15.7 entirely — running its
   > `git restore dotnet/` at this point would discard exactly the work you
   > just brought back, and the stash that held it is already gone.

4. **Extension — optional, and not part of the timed path.** Ask for a
   **call hierarchy** (incoming/outgoing calls) — useful before a
   refactor, to understand blast radius. The repository layer here is
   generic: `GetByIdAsync` is declared on `IRepository<T>`
   (`dotnet/ContosoUniversity.Core/Interfaces/IRepository.cs`) and
   implemented once by `Repository<T>`
   (`dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs`), so ask
   about both:

   ```
   Show me the call hierarchy for IRepository<T>.GetByIdAsync and its
   implementation Repository<T>.GetByIdAsync: who calls it, and what does
   the implementation call?
   ```

> 💡 **What you should see:** for steps 1–3, an `lsp` call in the timeline
> naming the operation (`goToDefinition`, `findReferences`, `rename` — the
> exact names vary by CLI version), not a run of `grep`, `glob` and `view`
> calls. That call is your evidence that the answer came from symbol
> resolution. The `file:line` locations in Copilot's reply are not: a text
> search returns those too.
>
> For step 4, you can check the answer against the code: controllers call
> `GetByIdAsync` through `IRepository<T>` (for example `CoursesController`,
> which injects `IRepository<Course>`), while `Repository<T>` just hands the
> lookup to EF Core's `FindAsync`.

## 15.4 When Copilot Still Falls Back to Text Search

LSP servers don't cover everything:

- **Non-code content** — markdown, YAML frontmatter, JSON config, comments,
  and prose are still searched with grep/glob, because LSP is a
  code-structure protocol, not a general text index.
- **Cross-language references** — if a JavaScript file calls a REST endpoint
  implemented in C#, LSP can't trace that link (no shared symbol table
  across languages/processes); Copilot falls back to text/context search
  for cross-boundary tracing.
- **No configured server for the language** — if you haven't installed/
  configured an LSP server for a given language, Copilot silently falls
  back to its existing text-based tools. Nothing breaks; you just lose the
  precision and token-efficiency benefits above.

🖥️ **Try it:** compare two answers about the same word. You already have
the first: Copilot's find-references answer for `EnrollmentDate` from
§15.3 step 2 (scroll back to it, or ask again) — the places that really
use the `Student` property, found by symbol. Now get the second one, a
plain text search.

First a baseline from Git: every file *outside* `dotnet/` that contains
the word. (`-l` prints file names only. `':!dotnet'` leaves the `dotnet/`
folder out; keep the quotes — they work the same in Bash and PowerShell.)

```bash
git --no-pager grep -l EnrollmentDate -- . ':!dotnet'
```

Expect Markdown files — skill and instruction files, and this lab itself.
No language server answers questions about prose.

Now ask Copilot for the text version:

```
Do a plain text search — not a symbol lookup — for every place in the
repo that mentions the text "EnrollmentDate": code, comments, string
literals, Razor views and Markdown docs.
```

Open the timeline (`Ctrl+O`): this time you should see text-search calls
(`grep`, `glob` or a shell command), not an `lsp` call.

Then put the two answers side by side. The text search returns more, and
much of the extra is not a use of the property: the comments that name it,
the `"EnrollmentDate"` strings passed to `ModelState.AddModelError` in
`StudentsController.cs`, the Razor views (the server does not read them by
default), the Markdown files above, and `EnrollmentDateGroup` — a
different class with its own `EnrollmentDate` property that merely shares
the name. Neither answer is wrong; they answer different questions ("who
uses this property?" and "where does this word appear?"). To know which
one you got, look at the tool Copilot called — not at whether a result
sits in a code file.

## 15.5 Check your work

✅ A C# language server is configured and running: `copilot lsp list`
shows it. (The Node server is an optional extra and does not count here.)

✅ You ran a go-to-definition, a find-references and a rename, and for each
one you saw an `lsp` call in the timeline **that returned a result** — not
just an answer with file and line numbers, which a text search can give you
too, and not an `lsp` call that errored before Copilot fell back to grep.

✅ You compared one reference the rename changed with two it left behind (a
`[Bind]` string and a Razor `asp-for`), and can say why the server
rewrote one and not the others.

✅ You undid the rename: `git status --short dotnet/` printed nothing —
before any `git stash pop` — and you know how to remove the global installs
and the LSP configuration (§15.7).

✅ You can explain, in one sentence, when Copilot CLI still falls back to
grep/glob even with an LSP server configured, and how to tell which of the
two answered.

## 15.6 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Automatic preference** | Copilot CLI prefers a configured LSP server over text search — no slash command needed to *use* it (`/lsp` and `copilot lsp` manage and inspect the configuration) |
| **Operations** | go-to-def, find-refs, hover, rename, document symbols, workspace symbol search, go-to-implementation, incoming/outgoing calls |
| **Biggest win** | Symbol-accurate, project-wide rename — skips the look-alike names grep-and-replace would rewrite; strings and Razor markup still need a manual pass |
| **Fallback** | Non-code content, cross-language references, and languages without a configured server still use text search |

</details>

**Next:** [Lab 16 — Enterprise Marketplace & Plugin Governance](lab16.md)

## 15.7 Cleanup

> 🛠️ **Lab 15 specifics — revert before the generic sweep below.**
>
> - **Rename (§15.3 step 3) — read the skip test first.** Skip this entire
>   bullet if **either** is true:
>   - you never ran the rename; or
>   - you finished §15.3 step 3 to its end — its `git restore dotnet/` left
>     `git status --short dotnet/` printing nothing, and you have already
>     brought back any work you set aside.
>
>   In both cases anything `git status --short dotnet/` lists **now is your
>   own work**. Leave it alone, and do **not** run `git restore dotnet/`
>   here: it would discard that work, and a `lab15-preserve` stash you have
>   already popped no longer exists to recover it from.
>
>   Only if you ran the rename and did **not** complete step 3's undo:
>   1. Run `git status --short dotnet/`. If it prints nothing, the rename
>      is already undone; go to part 4.
>   2. Run `git restore dotnet/`. It discards every uncommitted change to
>      tracked files under `dotnet/`, which is safe only because the guard
>      in §15.3 step 3 made sure none of that was your own work. If you
>      cannot confirm that — you are unsure whether the guard printed
>      nothing, or whether you already popped your stash — **stop and ask
>      the presenter or a teammate** rather than running it.
>   3. Run `git status --short dotnet/` again. It must print nothing.
>      `git restore` never deletes a new file, so a `??` line is a file it
>      left behind: delete it only if you can positively say Copilot
>      created it during the rename (`Ctrl+O` shows the timeline). If you
>      cannot, leave it and ask the presenter or a teammate. Never use
>      `git clean`, which removes every untracked file at once.
>   4. If the guard made you set work aside **and you have not popped it
>      yet**, run `git stash list` — but only once part 3 printed nothing.
>      When `stash@{0}` ends with `lab15-preserve`, `git stash pop` brings
>      that work back. With no `lab15-preserve` entry, skip this: either you
>      already popped it in §15.3, or a pop would apply an unrelated stash.
> - **C# server (§15.2 step 2):** if you ran that install,
>   `dotnet tool uninstall -g csharp-ls` removes it. Skip this if
>   `csharp-ls` was already on your machine before the lab (step 2 told
>   you so, or step 1 already listed a C# server).
> - **Node server (optional comparison, §15.2 step 2):** only if you ran
>   that install, `npm uninstall -g typescript-language-server typescript`
>   removes both packages. Skip this if you never installed them, or if
>   they were already on your machine before the lab.
> - **LSP configuration (§15.2 step 3):** open the config file you noted
>   and delete just the entry Copilot added — your personal
>   `~/.copilot/lsp-config.json`, or a project-level `lsp.json` in this
>   repo's `.github/` folder. If you watched Copilot create that project
>   file new in step 3, `git status --short` lists it as `??` and you can
>   delete the whole file. If the file was already there, remove only the
>   entry. Leave every other server alone, including any that were
>   configured before this lab. Then run `/lsp reload` in a session and
>   `copilot lsp list` in your terminal to confirm the C# entry is gone.

<!-- This cleanup is deliberately lab-local: Lab 15 does not @include
docs/_partials/cleanup.md. Running that partial's generic sweep here found three
problems. (a) Its listing of other labs' scratch paths and its git-config lookup
exit nonzero when the target is simply absent — one listed path sits inside
.git, which is a plain file in a git worktree. (b) Its config-backup move would
copy a stale config.json.bak over the live config, and Lab 15 never edits that
file, so any backup present came from an earlier lab or experiment. (c) The rest
of the sweep is about artifacts Lab 15 never creates. Lab 15's own residue —
two global tools, one LSP config entry, the rename — is handled above. Re-attach
the shared partial once it is corrected; the fixes belong to the partial's
owner, not to this lab. -->
> 🧹 **Cleanup — confirm the tree really is back.** The Lab 15 specifics
> above are the cleanup. These two checks confirm they worked.

🖥️ **In your terminal:**

1. **Confirm the working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Empty is the normal result. If it lists work of your own that you
   brought back from a `lab15-preserve` stash, that is expected and
   correct — leave it. Anything else should be removed or moved out of the
   repo before continuing.

2. **Verify the build is still green.** Recommended after this lab
   specifically: it edited source files under `dotnet/` and then reverted
   them, and a clean build is what proves the revert left the solution
   compiling. Warnings that were already in the repo are not yours:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only work you
> intentionally kept), and the build is clean if you ran it, you're ready
> for the next lab.
