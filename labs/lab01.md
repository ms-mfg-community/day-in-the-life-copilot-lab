# 1 — Exploring Copilot Configuration

In this lab you will discover and understand the Copilot configuration files that ship with this repository.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 10 minutes

References:
- [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Agent skills](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-agent-skills)
- [Custom instructions](https://docs.github.com/en/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [Prompt files](https://docs.github.com/en/copilot/using-github-copilot/using-prompt-files)

## 1.1 The Configuration Ecosystem

This repository ships with a rich set of Copilot configurations. Here's the map — the rest of the labs fill it in:

| Directory | What | Count | Lab |
|-----------|------|-------|-----|
| `.github/agents/` | Specialized AI personas (`.agent.md`) | 30 | Lab 03 |
| `.github/skills/` | Auto-activating knowledge packs (`SKILL.md`) | 29 | Lab 04 |
| `.github/prompts/` | Reusable command templates (`.prompt.md`) | 36 | Lab 04 |
| `.github/instructions/` | Path-specific rules (`.instructions.md`) | 6 | Lab 02 |
| `.github/copilot-instructions.md` | Repository-wide rules (always loaded) | 1 | Lab 02 |
| `AGENTS.md` | Project context (always loaded) | 1 | Lab 02 |
| `.github/hooks/` | Lifecycle guardrails (`default.json`) | 1 | Lab 06 |
| `.copilot/mcp-config.json` | External tool integrations | 5 servers | Lab 05 |
| `.github/workflows/*.md` | Cloud-side AI automation (gh-aw) | 2 | Labs 08-09 |

🖥️ **Quick look — pick any one:**

```bash
# See the agents
ls .github/agents/

# Read one to see the anatomy (YAML frontmatter + markdown body)
cat .github/agents/planner.agent.md
```

## 1.2 The Instruction Hierarchy

Copilot loads configuration in a specific priority order. Understanding this is the single most important concept:

| Priority | Source | When Loaded |
|----------|--------|-------------|
| 1 | `.github/copilot-instructions.md` | **Always** — every interaction |
| 2 | `AGENTS.md` | **Always** — every interaction |
| 3 | `.github/instructions/*.instructions.md` | When `applyTo` glob matches files in context |
| 4 | `.github/skills/*/SKILL.md` | When description matches the conversation topic |
| 5 | Agent profile (`.agent.md`) | When explicitly invoked with `@agent-name` |
| 6 | Prompt (`.prompt.md`) | When invoked with `/prompt-name` |

> 💡 **Key insight:** Instructions cascade and stack. If `copilot-instructions.md` says "use immutable patterns" and `dotnet.instructions.md` says "use async/await", **both** apply when editing `.cs` files.

## 1.3 How Copilot Finds Your Code

Copilot doesn't just do keyword text search — it uses multiple layers of code intelligence:

| Layer | How It Works | Scope |
|-------|-------------|-------|
| **Semantic indexing** | Builds a meaning-based index of your codebase. Near-instant (seconds). Understands intent, not just keywords. | Local repo |
| **LSP integration** | Interfaces with language servers (TypeScript, C#, Python, etc.) for go-to-definition, hover, references, diagnostics. Use `/lsp` to configure. | Local repo |
| **ripgrep + glob** | Fast pattern-based search for exact matches across files | Local repo |
| **GitHub MCP** | Semantic code search across **any GitHub repo** you have access to — remotely. The agent can scan codebases it's never seen locally. | Remote (GitHub) |

> 💡 When you ask Copilot "how does authentication work in this project?", it's using semantic search — not `grep`. It understands meaning. And with the GitHub MCP server, it can do the same across remote repos.

## 1.4 Try It

🖥️ **In your terminal:**

```bash
# Start Copilot CLI
copilot
```

Then try:
```
@planner How should I add a student search feature to ContosoUniversity?
```

Notice how Copilot references the project's architecture, file structure, and conventions — all loaded from the configuration files we just explored.

> 💡 Copilot loads agents from `.github/agents/` in the current working directory. You can also place personal agents in `~/.copilot/agents/`.

## 1.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | File Location | Purpose |
|---------|--------------|---------|
| **Agents** | `.github/agents/*.agent.md` | Specialized AI personas with defined tools |
| **Skills** | `.github/skills/*/SKILL.md` | Auto-activating knowledge bases |
| **Instructions** | `.github/copilot-instructions.md` | Always-on repo-wide rules |
| **Path Instructions** | `.github/instructions/*.instructions.md` | Rules for specific file types |
| **AGENTS.md** | `AGENTS.md` (repo root) | Project context and architecture |
| **Prompts** | `.github/prompts/*.prompt.md` | Reusable prompt templates |
| **Hooks** | `.github/hooks/default.json` | Lifecycle guardrails |
| **MCP** | `.copilot/mcp-config.json` | External tool integrations |

</details>

**Next:** [Lab 02 — Custom Instructions & AGENTS.md](lab02.md)
