# Migration Guide: Claude Code to GitHub Copilot

This guide walks through migrating from [everything-claude-code](https://github.com/affaan-m/everything-claude-code) to [everything-copilot](.). If you already have `everything-claude-code` set up, follow these steps to adopt the Copilot equivalents.

---

## Prerequisites

- GitHub Copilot subscription (Pro, Pro+, Business, or Enterprise)
- VS Code with GitHub Copilot extension (for prompt files and MCP)
- Copilot CLI installed (optional, for terminal usage)

---

## Step 1: Custom Instructions

### What Changes

| Claude Code | Copilot | Notes |
|-------------|---------|-------|
| `CLAUDE.md` (root) | `AGENTS.md` (root) + `.github/copilot-instructions.md` | Split into global agent context and repo-wide instructions |
| `~/.claude/rules/*.md` | `AGENTS.md` + `.github/instructions/*.instructions.md` | Path-specific instructions are a new Copilot capability |

### How to Migrate

1. Copy `AGENTS.md` to your project root:

```bash
cp AGENTS.md your-repo/
```

2. Copy the repository-wide instructions:

```bash
cp .github/copilot-instructions.md your-repo/.github/
```

3. Copy path-specific instructions:

```bash
cp -r .github/instructions/ your-repo/.github/instructions/
```

Path-specific instructions use `applyTo` glob patterns in YAML frontmatter. They activate only when matching files are in context — frontend rules stay out of backend code.

### Key Difference

Claude Code's `CLAUDE.md` is a single file read for all interactions. Copilot splits this into:
- **`AGENTS.md`** — global context for all agents (tech stack, boundaries, workflow)
- **`.github/copilot-instructions.md`** — repo-wide chat instructions (always loaded)
- **`.github/instructions/*.instructions.md`** — path-scoped rules (loaded per file match)

---

## Step 2: Skills

### What Changes

Skills use the **same SKILL.md format** across both tools. This is the easiest migration.

| Claude Code | Copilot |
|-------------|---------|
| `.claude/skills/<name>/SKILL.md` | `.github/skills/<name>/SKILL.md` (repo) |
| `~/.claude/skills/<name>/SKILL.md` | `~/.copilot/skills/<name>/SKILL.md` (personal) |

### How to Migrate

1. Copy skills to your repository:

```bash
cp -r .github/skills/ your-repo/.github/skills/
```

2. For personal (cross-project) skills:

```bash
cp -r .github/skills/* ~/.copilot/skills/
```

### Key Difference

Copilot activates skills automatically based on prompt-to-description matching. Write clear, specific descriptions in frontmatter so Copilot selects the right skill. Claude Code also uses description matching but allows explicit invocation.

---

## Step 3: Hooks

### What Changes

| Claude Code | Copilot | Notes |
|-------------|---------|-------|
| `PreToolUse` | `preToolUse` | Direct equivalent; can deny tool execution |
| `PostToolUse` | `postToolUse` | Copilot version is **observational only** — cannot modify output |
| `Stop` | `sessionEnd` | Close equivalent |
| `PreCompact` | No equivalent | Cannot intercept compaction |
| N/A | `sessionStart` | New in Copilot |
| N/A | `userPromptSubmitted` | New in Copilot |
| N/A | `errorOccurred` | New in Copilot |

### How to Migrate

1. Copy hook configuration:

```bash
cp -r .github/hooks/ your-repo/.github/hooks/
```

2. Copy hook scripts:

```bash
cp -r scripts/hooks/ your-repo/scripts/hooks/
cp -r scripts/lib/ your-repo/scripts/lib/
```

3. Make scripts executable:

```bash
chmod +x your-repo/scripts/hooks/*.sh
```

### Key Differences

- **Hook config format** differs: Copilot uses `.github/hooks/*.json` with a `version` field and camelCase event names. Claude Code uses `hooks.json` with PascalCase events.
- **`postToolUse` is read-only** in Copilot. If you rely on PostToolUse to modify tool output (e.g., auto-formatting), the Copilot hook can only observe and log — it cannot alter the result.
- **`preToolUse` can deny** tool execution by returning `{"permissionDecision": "deny"}`. This is the most powerful hook for security enforcement.
- **Scripts receive JSON via stdin** with `timestamp`, `cwd`, and hook-specific fields.

---

## Step 4: Agents

### What Changes

| Claude Code | Copilot | Notes |
|-------------|---------|-------|
| `agents/<name>.md` | `.github/agents/<name>.agent.md` | Different directory and extension |
| `tools:` frontmatter | `tools:` frontmatter | Supported with tool aliases |
| `model:` frontmatter | Not supported | Copilot selects the model |
| Task tool subagent | `@agent-name` invocation | Different invocation mechanism |

### How to Migrate

1. Copy agent profiles:

```bash
cp -r .github/agents/ your-repo/.github/agents/
```

2. Invoke agents with `@agent-name` in Copilot Chat (VS Code or CLI).

### Key Differences

- **No model selection.** Claude Code lets you assign specific models to agents. Copilot chooses the model automatically.
- **Tool aliases.** Copilot provides aliases like `execute` (shell, bash, powershell), `read` (Read, NotebookRead), `edit` (Edit, Write, MultiEdit), `search` (Grep, Glob), `agent` (custom-agent, Task).
- **MCP in agents.** Repository-level agents inherit MCP servers from repo settings. Only organization/enterprise agents can embed MCP configs directly.
- **Max prompt:** 30,000 characters per agent.

---

## Step 5: Commands → Prompt Files

### What Changes

| Claude Code | Copilot | Notes |
|-------------|---------|-------|
| `commands/*.md` | `.github/prompts/*.prompt.md` | VS Code only |
| `/command-name` in CLI | Not supported in Copilot CLI | Use `@agent-name` instead |

### How to Migrate

1. Copy prompt files:

```bash
cp -r .github/prompts/ your-repo/.github/prompts/
```

2. In VS Code, type `/` in Copilot Chat to see available prompts.

### Key Difference

**Copilot CLI does not support custom slash commands.** This is an open feature request. For CLI users, invoke functionality through `@agent-name` or natural language instead of `/command`.

---

## Step 6: MCP Servers

### What Changes

VS Code and Copilot CLI use **incompatible MCP config formats**. You need separate files.

| Property | VS Code (`.vscode/mcp.json`) | Copilot CLI (`.copilot/mcp-config.json`) |
|----------|------------------------------|------------------------------------------|
| Root key | `"servers"` | `"mcpServers"` |
| Type field | `"type": "stdio"` | `"type": "local"` |
| Tools field | Not used | `"tools": ["*"]` |
| Inputs | `"inputs": []` with `${input:id}` refs | Not supported |

### How to Migrate

1. For VS Code:

```bash
mkdir -p your-repo/.vscode
cp .vscode/mcp.json your-repo/.vscode/mcp.json
```

2. For Copilot CLI:

```bash
mkdir -p your-repo/.copilot
cp .copilot/mcp-config.json your-repo/.copilot/mcp-config.json
```

3. Cherry-pick additional servers from `mcp-configs/all-servers.json`.

### Key Difference

Claude Code uses a single `settings.json` for MCP configuration. Copilot requires two separate files for VS Code and CLI due to incompatible formats. Individual server reference files are provided in `mcp-configs/` with both formats documented.

---

## Step 7: Validate Your Setup

Run the validation tests to confirm all configs are well-formed:

```bash
bash tests/validate.sh
```

This checks:
- YAML frontmatter in skills, instructions, and agents
- JSON validity for hooks and MCP configs
- Shell script shebangs in hook scripts

---

## Features That Cannot Be Migrated

Some Claude Code features have no Copilot equivalent:

1. **Per-agent model selection** — Copilot selects the model automatically
2. **CLI custom slash commands** — Open feature request; use `@agent-name` instead
3. **The Q protocol** — Explicit reasoning patterns from `CLAUDE.md` are Claude-specific
4. **PostToolUse modification** — Copilot hooks can only observe, not modify tool output
5. **PreCompact hooks** — No equivalent in Copilot

See [DIFFERENCES.md](DIFFERENCES.md) for the full comparison.

---

## Quick Reference: File Location Mapping

| Claude Code Location | Copilot Location |
|---------------------|-----------------|
| `CLAUDE.md` | `AGENTS.md` + `.github/copilot-instructions.md` |
| `~/.claude/rules/*.md` | `.github/instructions/*.instructions.md` |
| `~/.claude/skills/` | `~/.copilot/skills/` |
| `skills/*/SKILL.md` | `.github/skills/*/SKILL.md` |
| `commands/*.md` | `.github/prompts/*.prompt.md` |
| `agents/*.md` | `.github/agents/*.agent.md` |
| `hooks.json` | `.github/hooks/*.json` |
| `.claude/settings.json` (MCP) | `.vscode/mcp.json` + `.copilot/mcp-config.json` |
