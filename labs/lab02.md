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

References:
- [Adding custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [How to write a great AGENTS.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Research: Do context files actually help?](https://www.arxiv.org/abs/2506.17056) — Evidence-based guidance on what to include

## 2.1 Modify copilot-instructions.md

The repository-wide instructions file is **always loaded** for every Copilot interaction. Adding a rule here is the fastest way to change Copilot's behavior across the board.

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

3. Test the change in Copilot CLI:
```
What patterns should I follow when creating a new controller in ContosoUniversity?
```

Copilot should reference your new conventions (async actions, repository pattern, name format).

> 💡 **Why this matters:** Every Copilot interaction — chat, completions, agents — now respects these conventions. One file change, universal effect.

> 🔄 **Restart required after editing config files**
>
> Copilot CLI and the VS Code Copilot extension load instructions, `AGENTS.md`, MCP configs, agent definitions, and skill files **once at session start** — they are **not** hot-reloaded on save. The only exception is the CLI extensions subsystem, which exposes an explicit `extensions_reload` tool.
>
> So after **any** edit in this lab (and labs 3–7):
>
> 1. Exit your current Copilot CLI session: type `exit` (or press <kbd>Ctrl</kbd>+<kbd>D</kbd>).
> 2. Restart it: `copilot`.
> 3. In VS Code, run **Developer: Reload Window** from the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) so the extension re-reads `.github/`.
>
> Skip the restart and you'll be debugging stale config — and blaming Copilot for following yesterday's rules.

## 2.2 Create a Path-Specific Instruction

Path-specific instructions apply rules only to certain file types via the `applyTo` glob.

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

This instruction only loads when Razor files (`.cshtml`) are in context — not for C# files, not for tests, only views.

> 💡 **Instructions cascade.** When editing a `.cshtml` file, Copilot loads: `copilot-instructions.md` + `AGENTS.md` + `razor-views.instructions.md`. All three apply simultaneously.

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

**Step 2 — Probe Copilot CLI for the rule:**

After restarting `copilot`, open any `.cshtml` file in the workspace (e.g., `dotnet/ContosoUniversity.Web/Views/Students/Index.cshtml`) and ask:

```
What pattern should I use for form validation summaries in this view?
```

A correctly loaded instruction will surface `asp-validation-summary="ModelOnly"` and Tag Helpers (`asp-for`, `asp-action`) — verbatim from your new file. If Copilot answers generically (or recommends `@Html.` helpers), the instruction did not load: re-check the filename ends in `.instructions.md`, the `applyTo` glob matches, and that you fully restarted the session.

> 💡 **Optional CLI sanity check:** `extensions_manage operation: list` shows installed CLI extensions (a different subsystem). Instructions files don't appear there — the functional probe above is the authoritative test for instruction loading.

## 2.3 Edit AGENTS.md

`AGENTS.md` provides project context — architecture, decisions, domain knowledge. Use it for the *what* and *why*; use `copilot-instructions.md` for the *rules*.

> 💡 Open AGENTS.md first to see the current structure before adding your section:
> - **WSL/Bash:** `head -50 AGENTS.md`
> - **PowerShell:** `Get-Content AGENTS.md -Head 50`

🖥️ **In your terminal:**

1. Open AGENTS.md and add an Architecture Decision Record:

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

2. Test it:
```
Where should I put database query logic in ContosoUniversity?
```

> 💡 **AGENTS.md vs copilot-instructions.md:** Use `copilot-instructions.md` for **rules** ("always use async"). Use `AGENTS.md` for **context** ("here's our architecture and why"). Both are always loaded.

> 📊 **What research says:** A recent study found that less is more with context files. Auto-generated context files (via `/init` commands) make agent performance *worse* on average — they're nearly 100% redundant with existing documentation. Hand-written files that include only non-obvious constraints (like "use `uv` not `pip`" or "never modify files in `src/gen/`") consistently outperform comprehensive ones. Every instruction you add costs 14-22% more reasoning tokens, even when irrelevant to the task. **Keep AGENTS.md short: only things the agent can't discover on its own.**

## 2.4 Final

<details>
<summary>Key Takeaways</summary>

| Concept | File | Purpose |
|---------|------|---------|
| **Repo-wide instructions** | `.github/copilot-instructions.md` | Always-on rules for all interactions |
| **Path-specific instructions** | `.github/instructions/*.instructions.md` | Rules for specific file types via `applyTo` |
| **Project context** | `AGENTS.md` | Architecture, decisions, domain knowledge |

**Best practices:**
- Keep `copilot-instructions.md` focused on coding rules and conventions
- Keep `AGENTS.md` **minimal** — only include things the agent can't discover on its own
- Don't duplicate your README or add codebase overviews — agents can navigate repos themselves
- Never auto-generate context files; hand-written and short beats comprehensive every time
- Create path-specific instructions for language/framework-specific rules
- Use descriptive `applyTo` globs to target the right files
- Every instruction has a cost — be ruthless about what you include

</details>

**Next:** [Lab 03 — Creating a .NET Agent](lab03.md)
