---
title: "LSP & Code Intelligence in Copilot CLI"
lab_number: 15
pace:
  presenter_minutes: 5
  self_paced_minutes: 20
registry: docs/_meta/registry.yaml
---

# 15 — LSP & Code Intelligence in Copilot CLI

In this lab you will learn how Copilot CLI uses **Language Server Protocol
(LSP) servers** to get precise, compiler-grade understanding of your code —
and why that beats grep/text-search for navigation and refactoring tasks.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 20 minutes

> 💡 **Why this matters:** every lab before this one has relied on Copilot
> reading files and pattern-matching to understand code structure. That
> works, but it's imprecise — a text match for `GetStudent` might be a
> comment, a string literal, or an unrelated method with the same name.
> LSP servers give Copilot the same view of your code that your IDE's
> "go to definition" has: grounded in the language's actual compiler/analyzer,
> not text patterns.

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

> 🆕 **Terminal UX refresh (confirmed GA, ~Aug 2026):** `/plugin`, `/mcp`, and
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
| **Plan mode vs autopilot mode** | `Shift+Tab` toggles plan mode; autopilot mode is the default | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to toggle plan/autopilot modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. This lab is where you configure and observe it. |
<!-- @end-include docs/_partials/currency.md -->

## 15.1 What LSP Gives Copilot CLI

The Language Server Protocol is the open standard editors use to talk to a
language server — a background process that understands your code the way a
compiler does. When Copilot CLI has an LSP server available for your
language, **it uses it automatically**. You don't request this explicitly;
Copilot prefers the language server over text-based search whenever it can.

Supported operations (confirmed from the official docs):

| Operation | What it does |
|-----------|--------------|
| Go to definition | Jumps to where a symbol (function, class, variable) is actually defined |
| Find references | Finds every real usage of a symbol across the project |
| Hover | Retrieves type information and documentation for a symbol |
| Rename | Renames a symbol project-wide, updating every reference |
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
> - **Safe refactoring** — a rename updates every real reference across the
>   project; a grep-and-replace can silently miss or over-match.
> - **Speed** — language servers index your project in the background, so
>   responses are near-instant once indexing completes.

## 15.2 Verify an LSP Server Is Available

🖥️ **In your terminal:**

This repo's .NET track (`dotnet/ContosoUniversity.sln`) and Node track
(`node/`) both have language servers you can wire up: `omnisharp`/`csharp-ls`
(via the .NET SDK toolchain) for C#, and `typescript-language-server` for
Node/TypeScript.

1. Check whether a language server is already configured for this session:

   ```
   What LSP servers are configured for this workspace, and which
   programming languages do they cover?
   ```

2. If none is configured yet, install one for whichever track you're on:

   **`.NET track` — WSL/Bash or PowerShell:**
   ```bash
   dotnet tool install -g csharp-ls
   ```

   **`Node track` — WSL/Bash or PowerShell:**
   ```bash
   npm install -g typescript-language-server typescript
   ```

3. Configure it for Copilot CLI (consult `copilot lsp --help` or ask
   Copilot directly — the exact config surface is versioned with your CLI
   build):

   ```
   Configure an LSP server for this workspace using csharp-ls (or
   typescript-language-server for the node/ track). Then confirm it's
   active.
   ```

> 💡 **What you should see:** Copilot confirms the server is running and
> indexing. Indexing a repo this size takes a few seconds to a couple of
> minutes depending on machine and language.

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

3. Try a **safe rename** — this is the operation where LSP's advantage is
   most visible, because a naive text replace risks false positives:

   ```
   Using the LSP rename operation, rename the Student model's
   FirstMidName property to FirstName across the entire dotnet/ solution,
   including all references, views, and DTOs.
   ```

   Compare this to how you'd have done the same rename in earlier labs with
   grep + edit: you'd have had to manually verify every match wasn't a false
   positive (a similarly-named property on a different type, a string
   literal, a comment). LSP rename does not have that failure mode.

4. Ask for a **call hierarchy** (incoming/outgoing calls) — useful before a
   refactor, to understand blast radius:

   ```
   Show me the call hierarchy for CourseRepository.GetByIdAsync: who calls
   it, and what does it call?
   ```

> 💡 **What you should see:** each answer is grounded in actual symbol
> resolution — Copilot's response should reference exact file:line
> locations that resolve to real definitions, not merely "here's a place
> that looks related."

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

🖥️ **Try it:**

```
Find every place in the repo — code AND documentation — that mentions
"EnrollmentDate". Note which results came from code (LSP-backed) versus
prose (text-search).
```

## 15.5 Check your work

✅ You configured (or confirmed) an LSP server for at least one language
track in this repo.

✅ You ran at least one go-to-definition, one find-references, and one
rename query and confirmed the results were symbol-accurate (not just
text matches).

✅ You can explain, in one sentence, when Copilot CLI still falls back to
grep/glob even with an LSP server configured.

## 15.6 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Automatic preference** | Copilot CLI prefers a configured LSP server over text search — no slash command needed |
| **Operations** | go-to-def, find-refs, hover, rename, document symbols, workspace symbol search, go-to-implementation, incoming/outgoing calls |
| **Biggest win** | Safe, project-wide rename — eliminates the false-positive risk of grep-and-replace |
| **Fallback** | Non-code content, cross-language references, and languages without a configured server still use text search |

</details>

**Next:** [Lab 16 — Enterprise Marketplace & Plugin Governance](lab16.md)
