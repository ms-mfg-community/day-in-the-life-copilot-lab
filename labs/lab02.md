---
title: "Custom Instructions & AGENTS.md"
lab_number: 2
pace:
  presenter_minutes: 4
  self_paced_minutes: 15
registry: docs/_meta/registry.yaml
---

# 2 — Custom Instructions & AGENTS.md

In this lab you will modify custom instructions and AGENTS.md to customize Copilot behavior.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

**Prerequisite:** finish [Setup](setup.md) first — `copilot --version` prints a version number, and you are signed in to GitHub Copilot.

References:
- [Adding custom instructions for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions)
- [Adding custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
- [How to write a great AGENTS.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/abs/2602.11988) — Evidence on what is worth putting in a context file

## 2.1 Modify copilot-instructions.md

The repository-wide instructions file is **loaded automatically** when Copilot CLI starts a session, so adding a rule here is the fastest way to change Copilot's behavior across the whole repository.

🖥️ **In your terminal:**

1. Open the instructions file in your preferred editor:

**WSL/Bash:**
```bash
"${EDITOR:-code}" .github/copilot-instructions.md
```

**PowerShell:**
```powershell
& ($env:EDITOR ?? 'code') .github/copilot-instructions.md
```

> 💡 `${EDITOR:-code}` falls back to `code` (VS Code) when `$EDITOR` is unset, so users on `vim`, `nvim`, `nano`, etc. get their own editor without modifying the lab.

2. Add the following section at the end:

```markdown
## ContosoUniversity Conventions

- All controller actions must be async and return `Task<IActionResult>`.
- Use the repository pattern via `IRepository<T>` — never access `SchoolContext` directly from controllers.
- Student names are displayed as "LastName, FirstMidName" throughout the UI.
- Course IDs are department-assigned integers (not auto-generated). Validate they are in the range 1000-9999.
```

> 🔄 **Restart required after editing config files — do this before step 3**
>
> Copilot CLI and the VS Code Copilot extension load instructions, `AGENTS.md`, MCP configs, agent definitions, and skill files **once at session start** — they are **not** hot-reloaded on save. The only exception is the CLI extensions subsystem, which exposes an explicit `extensions_reload` tool.
>
> So after **any** edit in this lab (and labs 3–7):
>
> 1. Exit your current Copilot CLI session: type `exit` (or press <kbd>Ctrl</kbd>+<kbd>D</kbd>).
> 2. Restart it: `copilot` for a fresh session, or `copilot --continue` to resume your most recent one. (From inside a running session, `/new` also starts a fresh session.)
> 3. If you also use the VS Code Copilot extension, run **Developer: Reload Window** from the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) so the extension re-reads `.github/`. Terminal-only? Skip this item.
>
> Skip the restart and you'll be debugging stale config — and blaming Copilot for following yesterday's rules.

3. In your restarted session, test the change in Copilot CLI:
```
What patterns should I follow when creating a new controller in ContosoUniversity?
```

Copilot should reference your new conventions (async actions, repository pattern, name format).

> 💡 **Why this matters:** Once a new session picks up the file (see the restart note above), Copilot's chat and agent answers follow these conventions across the whole repository — one file change, repo-wide effect. Inline suggestions as you type in an editor are the exception: custom instructions are not used for them.

## 2.2 Create a Path-Specific Instruction

Path-specific instructions apply rules only to certain file types. Each one is a Markdown file that begins with a short settings header between two `---` lines, called *YAML frontmatter*. Its `applyTo` line selects the files the rules apply to, using a *glob* (a file-name pattern): `**/*.cshtml` matches every file whose name ends in `.cshtml`, in any folder.

🖥️ **In your terminal:**

1. Create a Razor view instruction:

**WSL/Bash:**
```bash
cat > .github/instructions/razor-views.instructions.md << 'EOF'
---
description: "Razor view conventions for ContosoUniversity"
applyTo: '**/*.cshtml'
---

# Razor View Guidelines

- Use Tag Helpers (`asp-for`, `asp-action`) instead of HTML helpers (`@Html.`).
- Always include `asp-validation-for` next to form inputs.
- Use `asp-validation-summary="ModelOnly"` at the top of forms.
- Display student names as "LastName, FirstMidName" using `@($"{item.LastName}, {item.FirstMidName}")`.
- Include `@section Scripts { @{await Html.RenderPartialAsync("_ValidationScriptsPartial");} }` in form pages.
- Use Bootstrap 5 CSS classes for layout and styling.
EOF
```

<details>
<summary><strong>PowerShell alternative</strong></summary>

```powershell
@'
---
description: "Razor view conventions for ContosoUniversity"
applyTo: '**/*.cshtml'
---

# Razor View Guidelines

- Use Tag Helpers (`asp-for`, `asp-action`) instead of HTML helpers (`@Html.`).
- Always include `asp-validation-for` next to form inputs.
- Use `asp-validation-summary="ModelOnly"` at the top of forms.
- Display student names as "LastName, FirstMidName" using `@($"{item.LastName}, {item.FirstMidName}")`.
- Include `@section Scripts { @{await Html.RenderPartialAsync("_ValidationScriptsPartial");} }` in form pages.
- Use Bootstrap 5 CSS classes for layout and styling.
'@ | Out-File -FilePath .github/instructions/razor-views.instructions.md -Encoding utf8
```

</details>

2. Verify the `applyTo` glob:

**WSL/Bash:**
```bash
head -4 .github/instructions/razor-views.instructions.md
```

**PowerShell:**
```powershell
Get-Content .github/instructions/razor-views.instructions.md -Head 4
```

Those four lines are the frontmatter you just wrote. The `applyTo: '**/*.cshtml'` line is why this instruction only loads when Razor files (`.cshtml`) are in context — not for C# files, not for tests, only views. The rules below the header are sample content for practice, not a description of this app — the Bootstrap line in particular may not match the version the app's layout loads. In a real repository, write only rules your code actually follows.

> 💡 **Instructions combine.** When editing a `.cshtml` file, Copilot loads: `copilot-instructions.md` + `AGENTS.md` + `razor-views.instructions.md`. All three apply simultaneously — Copilot combines them and defines no precedence order between them, so don't write rules that contradict each other.

> **🚫 Spot the Anti-Pattern: Bloated Domain Instructions**
>
> Set the six short rules you just wrote beside the prompt many teams paste into a `**/*.cs` instruction file:
>
> - ✅ **Stack-matched, about 40 lines** — this repo's [`.github/instructions/dotnet.instructions.md`](../.github/instructions/dotnet.instructions.md) states the conventions the app really uses (ASP.NET Core 8 MVC, EF Core, xUnit) and nothing else.
> - ❌ **Copy-pasted, about 230 lines** — a "DDD for financial systems" compliance prompt: PCI-DSS and SOX attestations, currency value objects, saga patterns and a mandatory planning ritual before every edit, for a university CRUD app that takes no payments.
>
> `applyTo` decides *when* a file loads, not what it costs. Every line of a matching file spends context tokens on every file match and steers the model toward rules your code never follows. Before you add a rule, ask whether a reviewer would actually enforce it in this repository.

### 2.2.3 Verify Copilot picked up the new instruction file

After the restart (see the 🔄 callout above), confirm the new path-specific instruction is actually live before moving on. This is the single most common source of "it's not working" frustration in labs 3–7.

**Step 1 — Sanity-check the file on disk:**

**WSL/Bash:**
```bash
ls -1 .github/instructions/*.instructions.md
head -4 .github/instructions/razor-views.instructions.md
```

**PowerShell:**
```powershell
Get-ChildItem .github/instructions/*.instructions.md | Select-Object -ExpandProperty Name
Get-Content .github/instructions/razor-views.instructions.md -Head 4
```

You should see `razor-views.instructions.md` listed and the YAML frontmatter (`description:` + `applyTo: '**/*.cshtml'`) at the top.

**Step 2 — Behavioral confirmation: ask Copilot CLI about the rule:**

In your restarted `copilot` session (started from the repository root), ask about one view by its path. Path-specific rules load only when Copilot is working with a matching file, so the prompt names the file for it to read. `Edit.cshtml` is a good choice because it still uses the older `@Html.ValidationSummary` helper, which your rule says to replace with a Tag Helper:

```
Read dotnet/ContosoUniversity.Web/Views/Students/Edit.cshtml, then tell me what pattern I should use for its form validation summary.
```

A correctly loaded instruction should surface `asp-validation-summary="ModelOnly"` and Tag Helpers (`asp-for`, `asp-action`) — verbatim from your new file. If Copilot answers generically (or recommends `@Html.` helpers), the instruction may not have loaded — or the model simply didn't mention it. Run `/instructions` (below) to check for certain, then re-check the filename ends in `.instructions.md`, the `applyTo` glob matches, and that you fully restarted the session.

> 💡 **Deterministic check — `/instructions`:** In your restarted `copilot` session, type `/instructions`. It lists the instruction files Copilot CLI discovered for the session — `razor-views.instructions.md` should be among them — and lets you toggle each one on or off (a file you switch off is not included). `/env` shows everything the session loaded: instructions, MCP servers, skills, agents, and more. Unlike the model probe above, these commands report what Copilot found rather than asking a model to describe it.

## 2.3 Edit AGENTS.md

`AGENTS.md` gives Copilot project context it **cannot work out by reading the repository** — how the project runs, what is generated, what not to touch. Use it for that operational context; use `copilot-instructions.md` for the *rules*.

> 💡 Open AGENTS.md first to see the current structure before adding your section:
> - **WSL/Bash:** `head -50 AGENTS.md`
> - **PowerShell:** `Get-Content AGENTS.md -Head 50`

> **🚫 Spot the Anti-Pattern: What Does NOT Belong in AGENTS.md**
>
> The most common first entry in an `AGENTS.md` is an Architecture Decision Record (ADR). Read the one below and mark every line Copilot could learn without it — because [§2.1](#21-modify-copilot-instructionsmd) already put it in `copilot-instructions.md`, or because Copilot can read it straight from the repository. Then do **not** add it.

**❌ Do not add this:**

```markdown
## Architecture Decisions

### ADR-001: Repository Pattern for Data Access

**Status**: Accepted

**Context**: Controllers need database access but should not depend directly on Entity Framework's `SchoolContext`.

**Decision**: All data access goes through `IRepository<T>` defined in `dotnet/ContosoUniversity.Core`. Implementations live in `dotnet/ContosoUniversity.Infrastructure`.

**Consequences**:
- Controllers are testable with mock repositories
- Database technology can be swapped without changing controllers
- All queries go through a single abstraction layer
```

Why every part of it fails:

| Part of ADR-001 | Why it does not belong in `AGENTS.md` |
|---|---|
| "All data access goes through `IRepository<T>`" | **Duplicated.** The rule you added to `copilot-instructions.md` in §2.1 already says "never access `SchoolContext` directly". Two always-loaded files now state the same thing, so Copilot reads it twice. |
| "defined in `dotnet/ContosoUniversity.Core` … Implementations live in `dotnet/ContosoUniversity.Infrastructure`" | **Discoverable.** Where the projects and folders are is a repository overview, and Copilot learns it by listing the solution. |
| Status, Context, Consequences | **History for people.** Nothing here changes what the agent does next. |

This is the pattern *Evaluating AGENTS.md* ([arXiv:2602.11988](https://arxiv.org/abs/2602.11988)) measured: repository overviews did not help, and context files raised inference cost by over 20% on average (see the 📊 note at the end of this section). Lines Copilot already has, or can find itself, add cost without adding information.

**✅ Add this instead** — operational context Copilot cannot discover by reading files, and would otherwise learn by failing:

🖥️ **In your terminal:**

1. Open `AGENTS.md` in your editor (as in §2.1) and add these notes at the end:

```markdown
## Operational Notes

- **Dev database.** Development runs on SQLite (`ContosoUniversity.db`, git-ignored); production uses SQL Server. At startup the app creates the schema and seeds sample data only when the `Students` table is empty, so a restart keeps your edits. To get fresh seed data, stop the app and delete `ContosoUniversity.db`.
- **Ports.** `dotnet run` serves https://localhost:52379 and http://localhost:52380. The Playwright tests default to the https URL.
- **Never hand-edit generated files.** `.github/workflows/*.lock.yml` is compiled from the matching `.md` — edit the `.md`, then run `gh aw compile`. `lab-studio/lab-sources.json` is written only by `npm run drift:accept`.
```

2. After saving `AGENTS.md`, restart your session so it re-reads the file (see the 🔄 note in 2.1). In the restarted session, type `/instructions` and check that `AGENTS.md` is listed and enabled, then ask:
```
What URL does the ContosoUniversity app listen on in development, and how do I reset its sample data?
```

With the notes loaded, expect `https://localhost:52379` (or `http://localhost:52380`) and advice to stop the app and delete `ContosoUniversity.db`, because seeding only runs when the `Students` table is empty. Copilot can also find the ports in `launchSettings.json`, so treat the answer as a hint and the `/instructions` listing as the proof that `AGENTS.md` loaded. The notes describe this repository as it stands today: if the ports or the seeding change, update them in the same commit.

> 💡 **AGENTS.md vs copilot-instructions.md:** Use `copilot-instructions.md` for **rules** ("always use async"). Use `AGENTS.md` for **context the agent can't discover** ("the dev database seeds only when empty; never hand-edit generated files"). Copilot CLI discovers both automatically and combines them.

> 📊 **What research says:** A recent study (*Evaluating AGENTS.md*, linked in References) found that context files do not generally improve task success rates, while raising inference cost by over 20% on average — and that held for developer-committed files as well as LLM-generated ones. Agents do follow the instructions in a context file, but repository overviews, although popular and recommended by model providers, were not helpful. Context files earn their keep on non-standard practices (for example, "use `uv` not `pip`" or "never modify files in `src/gen/`"). **Keep AGENTS.md short: only things the agent can't discover on its own.**

## 2.4 Final

<details>
<summary>Key Takeaways</summary>

| Concept | File | Purpose |
|---------|------|---------|
| **Repo-wide instructions** | `.github/copilot-instructions.md` | Repo-wide rules, loaded automatically |
| **Path-specific instructions** | `.github/instructions/*.instructions.md` | Rules for specific file types via `applyTo` |
| **Project context** | `AGENTS.md` | Operational facts the agent can't discover (runtime behavior, generated files, don't-touch rules) |

**Best practices:**
- Keep `copilot-instructions.md` focused on coding rules and conventions
- Keep `AGENTS.md` **minimal** — only include things the agent can't discover on its own
- Don't duplicate your README or add codebase overviews — agents can navigate repos themselves
- Don't repeat a rule in two always-loaded files — state it once, in `copilot-instructions.md`
- Review auto-generated context files before committing them — short and specific beats comprehensive
- Create path-specific instructions for language/framework-specific rules
- Use descriptive `applyTo` globs to target the right files
- Every instruction has a cost — be ruthless about what you include

</details>

**Next:** [Lab 03 — Creating a .NET Agent](lab03.md)
