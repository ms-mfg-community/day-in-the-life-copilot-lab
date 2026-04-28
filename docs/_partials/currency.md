<!--
Shared "Copilot CLI currency" reference block. Single source of truth for the
five capabilities that each post-lab06 lab opens with. Labs include this body
verbatim between `<!-- @include docs/_partials/currency.md -->` and
`<!-- @end-include docs/_partials/currency.md -->` markers; do not paraphrase
in-lab — edit this file and re-sync.

Versions, model tiers, and MCP pins live in
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). When the weekly
content-audit workflow detects drift, it updates the registry — this partial
points at it rather than hardcoding the numbers.
-->

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
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to toggle plan/autopilot modes. |
