# 2 — Custom Instructions & AGENTS.md

In this lab you will modify custom instructions and AGENTS.md to customize Copilot behavior.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

References:
- [Adding custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [How to write a great AGENTS.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)

## 2.1 Modify copilot-instructions.md

The repository-wide instructions file is **always loaded** for every Copilot interaction. Adding a rule here is the fastest way to change Copilot's behavior across the board.

🖥️ **In your terminal:**

1. Open the instructions file:
```bash
code .github/copilot-instructions.md
```

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

> 💡 **Verify:** After modifying instructions, restart your Copilot session (`exit` then `copilot`) to ensure changes are loaded. Ask a test question and check that the response reflects your new rules.

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
- Display student names as "LastName, FirstMidName" using `@($"{item.LastName}, {item.FirstMidName}")`.
- Use Bootstrap 5 CSS classes for layout and styling.
EOF
```

**PowerShell:**
```powershell
@'
---
description: "Razor view conventions for ContosoUniversity"
applyTo: '**/*.cshtml'
---

# Razor View Guidelines

- Use Tag Helpers (`asp-for`, `asp-action`) instead of HTML helpers (`@Html.`).
- Always include `asp-validation-for` next to form inputs.
- Display student names as "LastName, FirstMidName" using `@($"{item.LastName}, {item.FirstMidName}")`.
- Use Bootstrap 5 CSS classes for layout and styling.
'@ | Out-File -FilePath .github/instructions/razor-views.instructions.md -Encoding utf8
```

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

**Decision**: All data access goes through `IRepository<T>` defined in `ContosoUniversity.Core`. Implementations live in `ContosoUniversity.Infrastructure`.

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
- Use `AGENTS.md` for project architecture and domain context
- Create path-specific instructions for language/framework-specific rules
- Use descriptive `applyTo` globs to target the right files

</details>

**Next:** [Lab 03 — Creating a .NET Agent](lab03.md)
