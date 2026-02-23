# Feature Differences: Claude Code vs GitHub Copilot

A detailed comparison of capabilities between Claude Code (via `everything-claude-code`) and GitHub Copilot (via `everything-copilot`). For migration steps, see [MIGRATION.md](MIGRATION.md).

---

## Overview

| Feature | Claude Code | Copilot VS Code | Copilot CLI | Migration Effort |
|---------|:-----------:|:---------------:|:-----------:|:----------------:|
| Custom instructions | Yes | Yes | Yes (AGENTS.md) | Low |
| Agent skills (SKILL.md) | Yes | Yes | Yes | Very Low |
| Custom agents | Yes | Yes | Yes (@agent-name) | Medium |
| Slash commands | Yes (/command) | Yes (/prompt) | Built-in only | High (CLI gap) |
| Hooks (pre/post tool) | Yes | Yes | Yes (from CWD) | Medium |
| Per-agent model selection | Yes | No | No | Cannot migrate |
| MCP servers | Yes | Yes | Limited | Medium |
| Path-specific instructions | No | Yes | No | N/A (Copilot-only) |

---

## 1. Custom Instructions

### Claude Code
- **`CLAUDE.md`** at project root — single file read for all interactions
- **`~/.claude/rules/*.md`** — personal rules applied to all projects
- No path-scoping; all rules are global

### Copilot
- **`AGENTS.md`** at project root — global context for all agents
- **`.github/copilot-instructions.md`** — repo-wide instructions, always loaded
- **`.github/instructions/*.instructions.md`** — path-specific with `applyTo` globs
- **Priority:** Personal > Repository > Organization > Enterprise

### Differences

| Aspect | Claude Code | Copilot |
|--------|-------------|---------|
| Scope control | Global only | Global + path-specific |
| File count | 1 (CLAUDE.md) + N rules | 1 (AGENTS.md) + 1 (copilot-instructions) + N instructions |
| Path filtering | Not supported | `applyTo` glob patterns |
| Hierarchy levels | 2 (project, personal) | 4 (enterprise, org, repo, personal) |
| Enforcement | Guidance (non-deterministic) | Guidance (non-deterministic) |

### Copilot Advantage

Path-specific instructions let you scope frontend rules to `**/*.tsx` and backend rules to `**/*.ts` without them leaking into each other. Claude Code applies all rules globally.

---

## 2. Skills (SKILL.md)

### Shared Format

SKILL.md is an **open standard** used by both Claude Code and Copilot. The file format is identical:

```yaml
---
name: skill-name
description: What this skill does and when to use it
---

# Skill content here
```

### Differences

| Aspect | Claude Code | Copilot |
|--------|-------------|---------|
| Repo location | `.claude/skills/` | `.github/skills/` |
| Personal location | `~/.claude/skills/` | `~/.copilot/skills/` |
| Cross-compat reading | N/A | `~/.copilot/skills/` only in CLI; `~/.claude/skills/` may work in VS Code only |
| Activation | Description matching + explicit | Description matching (automatic) |
| VS Code stable | N/A | Coming soon (Insiders only, Jan 2026) |

### Migration Impact: Very Low

Copy directories, update descriptions for Copilot's matching, remove Claude-specific terminology.

---

## 3. Hooks

### Claude Code
- **Configuration:** `hooks.json` with PascalCase event names
- **Events:** `PreToolUse`, `PostToolUse`, `Stop`, `PreCompact`
- **PostToolUse:** Can modify tool output

### Copilot
- **Configuration:** `.github/hooks/*.json` with `version` field, camelCase events
- **Events:** `preToolUse`, `postToolUse`, `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `errorOccurred`
- **PostToolUse:** Observational only — cannot modify output

### Differences

| Aspect | Claude Code | Copilot |
|--------|-------------|---------|
| Config format | `hooks.json` | `.github/hooks/*.json` with `version: 1` |
| Event naming | PascalCase | camelCase |
| PostToolUse modify | Yes | No (observational only) |
| PreCompact | Supported | No equivalent |
| sessionStart | No equivalent | Supported |
| userPromptSubmitted | No equivalent | Supported |
| errorOccurred | No equivalent | Supported |
| Script input | Varies | JSON via stdin (standardized) |
| Default timeout | Varies | 30 seconds |
| Permission control | Approve/deny | Deny + modify arguments (preToolUse, v0.0.396+) |

### Gaps

- **PostToolUse modification** is the largest gap. Claude Code hooks can auto-format code after edits or inject additional context. Copilot hooks can only observe and log.
- **PreCompact** has no equivalent. If you use this to preserve context before compaction, there is no workaround in Copilot.

### Copilot Advantages

- **`sessionStart`/`sessionEnd`** hooks enable session lifecycle management (setup/teardown).
- **`userPromptSubmitted`** allows prompt logging and analysis.
- **`errorOccurred`** provides structured error handling.

---

## 4. Custom Agents

### Claude Code
- **Location:** `agents/*.md` or `~/.claude/agents/*.md`
- **Frontmatter:** `tools`, `model`, description
- **Invocation:** Via Task tool subagent dispatch
- **Model selection:** Per-agent model assignment

### Copilot
- **Location:** `.github/agents/*.agent.md`
- **Frontmatter:** `name`, `description`, `tools`, `infer`, `metadata`
- **Invocation:** `@agent-name` in chat
- **Model selection:** Not supported (Copilot selects automatically)

### Differences

| Aspect | Claude Code | Copilot |
|--------|-------------|---------|
| File extension | `.md` | `.agent.md` |
| Location | `agents/` (root or `~/.claude/`) | `.github/agents/` |
| Model selection | Per-agent | Not supported |
| Tool declaration | Tool names | Tool names + aliases (`execute`, `read`, `edit`, `search`, `agent`) |
| MCP in agents | Supported | Repo-level: inherited only; org/enterprise: can embed |
| Max prompt | No documented limit | 30,000 characters |
| Auto-inference | Not applicable | `infer: true/false` (auto-select based on prompt) |
| Invocation | Task tool dispatch | `@agent-name` |

### Gaps

- **Per-agent model selection** cannot be migrated. If you assign specific models (e.g., Haiku for lightweight tasks, Opus for architecture), Copilot will use its own model selection.
- **MCP per agent** is restricted at repo level. Only org/enterprise agents can embed MCP configs.

### Copilot Advantages

- **Tool aliases** simplify tool declarations (`execute` instead of listing `shell`, `bash`, `powershell`).
- **`infer` property** allows agents to be auto-selected based on prompt content.

---

## 5. Commands / Prompt Files

### Claude Code
- **Location:** `commands/*.md`
- **Invocation:** `/command-name` in both CLI and chat
- **Works in:** CLI and all interfaces

### Copilot
- **Location:** `.github/prompts/*.prompt.md`
- **Invocation:** `/prompt-name` in VS Code Copilot Chat
- **Works in:** VS Code only — **not supported in Copilot CLI**

### Differences

| Aspect | Claude Code | Copilot |
|--------|-------------|---------|
| Location | `commands/` | `.github/prompts/` |
| Extension | `.md` | `.prompt.md` |
| CLI support | Yes | No (open feature request) |
| VS Code support | N/A | Yes |
| Frontmatter | Varies | `description`, `mode` |

### Gaps

This is the **largest migration gap**. Claude Code's custom slash commands work everywhere. Copilot's prompt files only work in VS Code. CLI users must use `@agent-name` or natural language as a workaround.

---

## 6. MCP Servers

### Claude Code
- **Configuration:** Single `.claude/settings.json` with `mcpServers` key
- **Format:** Unified across all interfaces

### Copilot
- **VS Code:** `.vscode/mcp.json` with `"servers"` root key, `"type": "stdio"`
- **CLI:** `.copilot/mcp-config.json` with `"mcpServers"` root key, `"type": "local"`
- **Formats are incompatible** — separate files required

### Differences

| Aspect | Claude Code | Copilot VS Code | Copilot CLI |
|--------|-------------|----------------|-------------|
| Config file | `.claude/settings.json` | `.vscode/mcp.json` | `.copilot/mcp-config.json` |
| Root key | `mcpServers` | `servers` | `mcpServers` |
| Type field | `stdio` | `stdio` | `local` |
| Tools field | N/A | N/A | `"tools": ["*"]` |
| Input prompts | N/A | `"inputs": []` | Not supported |
| Enterprise policy | N/A | Configurable restrictions | Configurable restrictions |

### Gaps

- **Two config files** instead of one. VS Code and CLI formats are incompatible.
- **Enterprise policy** can restrict which MCP servers are allowed (disabled by default).
- **Repo-level agents** cannot embed MCP — they inherit from repo settings.

---

## 7. Features Unique to Each Tool

### Claude Code Only

| Feature | Description |
|---------|-------------|
| Per-agent model selection | Assign Haiku, Sonnet, or Opus to specific agents |
| PostToolUse modification | Hooks can alter tool output |
| PreCompact hooks | Intercept context compaction |
| CLI custom commands | `/command` works in terminal |
| Q protocol (CLAUDE.md) | Explicit reasoning framework |

### Copilot Only

| Feature | Description |
|---------|-------------|
| Path-specific instructions | `applyTo` globs in `.instructions.md` files |
| 4-level config hierarchy | Enterprise > Org > Repo > Personal |
| sessionStart/sessionEnd hooks | Session lifecycle management |
| userPromptSubmitted hook | Prompt logging and analysis |
| errorOccurred hook | Structured error handling |
| Tool aliases in agents | `execute`, `read`, `edit`, `search`, `agent` |
| Agent auto-inference | `infer: true` for automatic agent selection |
| MCP enterprise policy | Organization-level MCP access control |

---

## 8. CLI-Specific Limitations

The Copilot CLI has additional constraints beyond the VS Code experience:

| Limitation | Details | Workaround |
|-----------|---------|------------|
| No custom slash commands | `.prompt.md` files only work in VS Code | Use `@agent-name` or natural language |
| No global hooks directory | No `~/.copilot/hooks/` — hooks are per-project only (`.github/hooks/` relative to CWD) | Must run CLI from repo root |
| Skills require restart | Skills only load at CLI startup; changes require restart | Restart CLI after adding/modifying skills |
| No `~/.claude/skills/` reading | CLI only reads from `~/.copilot/skills/` | Copy skills to `~/.copilot/skills/` |
| No model selection | CLI selects model automatically; `model` property in agents is ignored | N/A |
| No `handoffs` property | Agent `handoffs` is VS Code only | N/A |
| No prompt `inputs` | MCP config `inputs` field not supported | Hardcode values or use environment variables |

### Built-in CLI Agents

The CLI includes 4 built-in agents not available in VS Code that are delegated to automatically:

| Agent | Purpose |
|-------|---------|
| Explore | Fast codebase analysis without cluttering main context |
| Task | Runs commands (tests, builds) |
| Plan | Creates structured implementation plans |
| Code-review | Reviews changes with high signal-to-noise ratio |

### CLI-Specific Features

| Feature | Description |
|---------|-------------|
| Auto-compaction | Triggers at 95% token limit |
| `/context` | Token usage breakdown |
| `/compact` | Manual context compaction |
| `--resume` | Resume previous sessions |
| `-p` / `--prompt` | Pipeline/scripting mode |
| `--allow-all` / `--yolo` | Auto-approve all permissions |
| Plan mode (Shift+Tab) | Structured planning workflow |

---

## Summary

The migration from Claude Code to Copilot preserves most functionality. The main gaps are:

1. **Per-agent model selection** — no workaround
2. **CLI custom commands** — use `@agent-name` instead
3. **PostToolUse modification** — observational only
4. **PreCompact hooks** — no equivalent

Copilot adds capabilities not available in Claude Code, particularly path-specific instructions and a richer hook event model. The SKILL.md format is shared, making skill migration trivial.
