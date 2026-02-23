# Research Findings: GitHub Copilot Capabilities (January 2026)

This document captures verified research on GitHub Copilot's current feature set as it relates to migrating components from `everything-claude-code`. Each section documents what was assumed, what was verified, sources used, and corrections made.

---

## Configuration Hierarchy

GitHub Copilot supports four distinct configuration levels. This project targets **repository-level** and **local/personal-level** for use with GitHub Copilot CLI and VS Code.

| Level | Scope | Example Location |
|-------|-------|-----------------|
| **Enterprise** | All orgs in enterprise | `.github-private` repo |
| **Organization** | All repos in org | `.github-private` repo |
| **Repository** | Single repo | `.github/` directory |
| **Local/Personal** | Single user, cross-project | `~/.copilot/` directory |

**Precedence:** Personal > Repository > Organization > Enterprise (lowest level wins for deduplication by filename).

**Source:** [GitHub Docs - Custom Agents Configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)

---

## 1. Custom Instructions

### Findings

**Repository-wide instructions:** `.github/copilot-instructions.md`
- Markdown file, loaded automatically for all chat requests within the workspace
- Should contain short, self-contained statements that add context
- Always-on passive guidance — coding standards, architecture notes, build/test/deploy commands

**Path-specific instructions:** `.github/instructions/*.instructions.md`
- Each file has YAML frontmatter with `applyTo` glob pattern
- Loaded only when matching files are in context (e.g., frontend rules don't leak into backend)
- Supported in VS Code, Visual Studio, and Copilot coding agent

**AGENTS.md (cross-ecosystem):**
- Root-level `AGENTS.md` serves as global instructions for all agents
- Open format compatible across tools (Codex, Cursor, Copilot, etc.)
- Supports nesting: place `AGENTS.md` in subdirectories for scoped instructions
- Copilot reads it alongside `.github/copilot-instructions.md`

**Priority order:** Personal instructions > Repository instructions > Organization instructions. All relevant instruction sets are provided to Copilot; avoid conflicts.

**Limitations:** Instructions are guidance, not hard constraints. Non-deterministic — Copilot may not always follow them identically.

### Sources
- [GitHub Docs - Adding Repository Custom Instructions](https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot)
- [VS Code - Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
- [GitHub Blog - How to Write a Great agents.md](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [GitHub Changelog - AGENTS.md Support](https://github.blog/changelog/2025-08-28-copilot-coding-agent-now-supports-agents-md-custom-instructions/)

### Mapping from Claude Code
| Claude Code | Copilot Equivalent |
|-------------|-------------------|
| `~/.claude/rules/*.md` | `AGENTS.md` (root) + `.github/copilot-instructions.md` |
| Project `CLAUDE.md` | `AGENTS.md` (root) + `.github/copilot-instructions.md` |
| N/A | `.github/instructions/*.instructions.md` (path-specific, new capability) |

---

## 2. Agent Skills (SKILL.md)

### Findings

**Format:** Folders containing a `SKILL.md` file with YAML frontmatter.

**Required frontmatter:**
- `name` (string, lowercase, hyphens for spaces) — unique identifier
- `description` (string) — what it does and when Copilot should use it

**Optional frontmatter:**
- `license` — license description

**Storage locations:**
- Project skills: `.github/skills/<skill-name>/SKILL.md`
- Personal skills: `~/.copilot/skills/<skill-name>/SKILL.md`
- ~~Also reads from `~/.claude/skills/`~~ **CORRECTED (Phase 2):** CLI does NOT read from `~/.claude/skills/`. Only `~/.copilot/skills/` works in Copilot CLI. The `~/.claude/skills/` path may work in VS Code only.

**Activation:** Automatic based on prompt-to-description matching. Copilot loads `SKILL.md` body into context only when relevant. Many skills can be installed; only relevant ones activate.

**Bundled resources:** Skills can include scripts, examples, and other resources in their directory alongside SKILL.md.

**Availability:**
- Copilot coding agent: GA (Pro, Pro+, Business, Enterprise)
- VS Code stable: Coming soon (currently Insiders only as of Jan 2026)
- Copilot CLI: Supported
- Organization/enterprise-level skills: Coming soon

**Announced:** December 18, 2025 (GitHub Changelog)

### Sources
- [GitHub Docs - About Agent Skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)
- [VS Code - Agent Skills](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [GitHub Changelog - Agent Skills](https://github.blog/changelog/2025-12-18-github-copilot-now-supports-agent-skills/)
- [awesome-copilot Skills Docs](https://github.com/github/awesome-copilot/blob/main/docs/README.skills.md)

### Mapping from Claude Code
| Claude Code | Copilot Equivalent |
|-------------|-------------------|
| `~/.claude/skills/<name>/SKILL.md` | `~/.copilot/skills/<name>/SKILL.md` (personal) |
| Project `.claude/skills/<name>/SKILL.md` | `.github/skills/<name>/SKILL.md` (repo) |

**Direct 1:1 mapping.** SKILL.md is a shared open standard used by both Claude Code and Copilot. Migration requires minimal changes — primarily updating descriptions for Copilot's activation matching and removing Claude-specific terminology.

---

## 3. Hooks

### Findings

**Configuration:** JSON files at `.github/hooks/*.json` (repo-level) or loaded from CWD (CLI).

**Schema:**
```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [...],
    "sessionEnd": [...],
    "userPromptSubmitted": [...],
    "preToolUse": [...],
    "postToolUse": [...],
    "errorOccurred": [...]
  }
}
```

**Hook entry format:**
```json
{
  "type": "command",
  "bash": "./script.sh",
  "powershell": "./script.ps1",
  "cwd": "optional/path",
  "timeoutSec": 30
}
```

**Hook types:**
| Hook | Purpose | Can Modify? |
|------|---------|-------------|
| `sessionStart` | Session begins/resumes | No |
| `sessionEnd` | Session completes/terminates | No |
| `userPromptSubmitted` | User submits prompt | No |
| `preToolUse` | Before tool execution | Yes (approve/deny + modify args in v0.0.396+) |
| `postToolUse` | After tool execution | No (observational only) |
| `errorOccurred` | Agent errors | No |

**preToolUse output format (permission control):**
```json
{
  "permissionDecision": "deny",
  "permissionDecisionReason": "explanation"
}
```
**Updated (Phase 2):** `preToolUse` hooks can both deny tool execution AND modify tool arguments (CLI v0.0.396+). Earlier versions only processed deny decisions.

**All hooks receive JSON via stdin** with common fields: `timestamp` (Unix ms), `cwd`, plus hook-specific properties.

**Limitations:**
- `postToolUse` cannot modify tool output (observational only, open feature request)
- Prompt modification not supported in hooks
- Default timeout: 30 seconds
- Multiple hooks per event execute sequentially

### Sources
- [GitHub Docs - About Hooks](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-hooks)
- [GitHub Docs - Using Hooks](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
- [GitHub Docs - Hooks Configuration Reference](https://docs.github.com/en/copilot/reference/hooks-configuration)

### Mapping from Claude Code
| Claude Code | Copilot Equivalent |
|-------------|-------------------|
| `PreToolUse` | `preToolUse` (direct) |
| `PostToolUse` | `postToolUse` (direct, but observational only) |
| `Stop` | `sessionEnd` (close equivalent) |
| `PreCompact` | No equivalent found |
| N/A | `sessionStart` (new) |
| N/A | `userPromptSubmitted` (new) |
| N/A | `errorOccurred` (new) |

**Best practices for Session 3:**
- Hook scripts should be in `scripts/hooks/` with both bash and powershell variants
- Keep timeouts conservative (30s default is fine)
- `preToolUse` is the most powerful hook — use it for security enforcement
- Test hooks in both CLI and VS Code — behavior may differ

---

## 4. Custom Agents

### Findings

**File format:** `.agent.md` (or just `.md`) files with YAML frontmatter + Markdown body.

**Storage:**
- Repository: `.github/agents/<agent-name>.agent.md`
- Organization: `.github-private/agents/<agent-name>.md`
- Enterprise: `.github-private/agents/<agent-name>.md`

**Frontmatter properties:**
| Property | Required | Description |
|----------|----------|-------------|
| `description` | Yes | Agent purpose and capabilities |
| `name` | No | Display name |
| `tools` | No | Tool list (omit = all tools). Supports `["*"]`, specific names, or `[]` |
| `infer` | No | Auto-select based on prompt (default: `true`) |
| `mcp-servers` | No | Additional MCP servers (org/enterprise only for repo agents) |
| `metadata` | No | Key-value annotations |

**Tool aliases:**
| Alias | Includes | Purpose |
|-------|----------|---------|
| `execute` | shell, bash, powershell | Command execution |
| `read` | Read, NotebookRead | File viewing |
| `edit` | Edit, Write, MultiEdit | File editing |
| `search` | Grep, Glob | Text/file searching |
| `agent` | custom-agent, Task | Invoke other agents |

**Invocation:** Via `@agent-name` in chat. Available in VS Code, CLI, and GitHub.com.

**Max prompt:** 30,000 characters.

**NOT supported on Copilot coding agent (GitHub.com):** `model`, `argument-hint`, `handoffs` (VS Code only properties).

**MCP in agents:** Repo-level agents CANNOT configure MCP servers directly in profiles. They inherit from repo settings. Only org/enterprise agents can embed MCP configs.

**AGENTS.md vs .agent.md:**
| File | Purpose |
|------|---------|
| `AGENTS.md` (root) | Global instructions for ALL agents — like a README for agents |
| `.github/agents/*.agent.md` | Individual specialist agent profiles with tools/behavior |

### Sources
- [GitHub Docs - Creating Custom Agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [GitHub Docs - About Custom Agents](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-custom-agents)
- [GitHub Docs - Custom Agents Configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [GitHub Blog - Custom Agents Introduction](https://github.blog/news-insights/product-news/your-stack-your-rules-introducing-custom-agents-in-github-copilot-for-observability-iac-and-security/)
- [awesome-copilot Agents Docs](https://github.com/github/awesome-copilot/blob/main/docs/README.agents.md)

### Mapping from Claude Code
| Claude Code | Copilot Equivalent |
|-------------|-------------------|
| `~/.claude/agents/<name>.md` | `.github/agents/<name>.agent.md` (repo) |
| Agent `tools:` frontmatter | `tools:` frontmatter (supported!) |
| Agent `model:` frontmatter | NOT supported (Copilot selects model) |
| Task tool subagent invocation | `@agent-name` invocation |

### Corrections from Initial Assumptions
- **CORRECTED:** Agents CAN declare `tools:` in frontmatter (was initially assumed NO)
- **CLARIFIED:** `AGENTS.md` is global instructions, NOT individual agent definitions
- **NOTED:** `model` selection not available — Copilot chooses the model

**Best practices for Session 4:**
- Use clear, specific `description` for each agent (not vague "helpful assistant")
- Declare explicit `tools:` lists to scope agent capabilities
- Use three-tier boundaries (always do / ask first / never do)
- Include executable commands early in the prompt body
- Keep agent prompts focused — one specialist per file
- Test invocation with `@agent-name` in both CLI and VS Code

---

## 5. MCP Server Support

### Findings

**Configuration:** JSON format with `mcpServers` object. Supports both remote and local servers.

**IDE support:**
- VS Code: GA since v1.102
- Visual Studio: 2022 v17.14+ and 2026
- JetBrains: Supported

**Discovery:** GitHub MCP Registry for finding and installing servers.

**Copilot coding agent:** Supports remote MCP servers. Tools only (not resources or prompts).

**Enterprise/Org controls:**
- `MCP servers in Copilot` policy (disabled by default)
- Can restrict to: All servers, Registry only, or specific servers
- MCP registry URL configurable at org level

**Repo-level agents:** Cannot embed MCP server configs. Must use repo settings.
**Org/Enterprise agents:** Can configure MCP servers directly in agent profiles.

### Sources
- [GitHub Docs - Extending Copilot with MCP](https://docs.github.com/copilot/customizing-copilot/using-model-context-protocol/extending-copilot-chat-with-mcp)
- [GitHub Docs - Configure MCP Server Access](https://docs.github.com/en/copilot/how-tos/administer-copilot/configure-mcp-server-access)
- [VS Code - MCP Servers](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [GitHub Changelog - Remote MCP Support](https://github.blog/changelog/2025-07-09-copilot-coding-agent-now-supports-remote-mcp-servers/)

### Mapping from Claude Code
| Claude Code | Copilot Equivalent |
|-------------|-------------------|
| `.claude/settings.json` mcpServers | VS Code `settings.json` / `.vscode/mcp.json` |
| MCP tool access in agents | Inherited from repo/org settings (not per-agent at repo level) |

---

## 6. Copilot CLI

### Findings

**Built-in slash commands:** `/usage`, `/delegate`, `/login`, `/model`, `/compact`, `/clear`, `/context`, `/review`, `/resume`, and others. These control session state and do not invoke the AI model. **Added (Phase 2):** `/context` (token usage breakdown), `/review` (code review), `/mcp add` (interactive MCP server setup), `/resume` (resume previous sessions), Plan mode (Shift+Tab).

**Custom slash commands from `.github/prompts/`:** NOT supported in CLI. This is an open feature request (github/copilot-cli#618). `.prompt.md` files work in VS Code only.

**Custom agents in CLI:** YES — agents defined in `.github/agents/` are available in CLI via `@agent-name`.

**Built-in CLI agents (Phase 2):** The CLI includes 4 built-in agents that are delegated to automatically and can run in parallel:

| Agent | Purpose |
|-------|---------|
| Explore | Fast codebase analysis without cluttering main context |
| Task | Runs commands (tests, builds) |
| Plan | Creates structured implementation plans |
| Code-review | Reviews changes with high signal-to-noise ratio |

**Default model:** Claude Sonnet 4.5.

**Recent features (Jan 2026):**
- Auto-compaction at 95% token limit
- `web_fetch` tool for URL content retrieval
- Enhanced agent support
- Session resume via `--resume` flag
- Pipeline/scripting mode via `-p`/`--prompt` flag
- Permission shortcuts (`--allow-all`, `--yolo`, `--allow-tool <name>`)
- Context visualization via `/context`

**Config location:** `~/.copilot/config.json` (override via `XDG_CONFIG_HOME` or `--config-dir`)

### Sources
- [GitHub Docs - Using Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
- [GitHub Blog - Copilot CLI Slash Commands Cheat Sheet](https://github.blog/ai-and-ml/github-copilot/a-cheat-sheet-to-slash-commands-in-github-copilot-cli/)
- [GitHub Changelog - CLI Enhanced Agents (Jan 2026)](https://github.blog/changelog/2026-01-14-github-copilot-cli-enhanced-agents-context-management-and-new-ways-to-install/)
- [github/copilot-cli#618 - Custom Slash Commands Feature Request](https://github.com/github/copilot-cli/issues/618)

### Mapping from Claude Code
| Claude Code | Copilot Equivalent |
|-------------|-------------------|
| `/command-name` (custom commands) | `.github/prompts/*.prompt.md` (VS Code only) |
| `/command-name` in CLI | NOT supported — use `@agent-name` instead |

**Best practices for Session 3:**
- Convert Claude Code commands to `.prompt.md` files for VS Code usage
- For CLI, document that users should invoke via `@agent-name` or natural language
- `.prompt.md` files support YAML frontmatter with `description` and `mode` fields

---

## 7. Prompt Files (.prompt.md)

### Findings

Prompt files are reusable prompt templates stored in `.github/prompts/`.

**Format:**
```markdown
---
description: "What this prompt does"
mode: "agent"
---

Prompt instructions here...
```

**Invocation:** In VS Code, type `/` in Copilot Chat to see available prompts. Select by name (filename minus `.prompt.md`).

**NOT available in CLI** — only VS Code.

**Best practices for Session 3:**
- Use descriptive filenames matching the command purpose
- Set `mode: "agent"` for prompts that need tool access
- Keep descriptions concise for quick selection in VS Code

---

## 8. Answers to Known Research Questions

| # | Question | Answer | Confidence |
|---|----------|--------|------------|
| 1 | Can agents declare allowed tools in frontmatter? | **YES** — `tools:` property with aliases | Verified |
| 2 | Does Copilot CLI support custom slash commands? | **NO** — open feature request, use `@agent-name` instead | Verified |
| 3 | Are hook scripts executed with same env as Claude Code? | **Similar** — JSON via stdin, bash/powershell scripts, 30s timeout | Verified |
| 4 | What triggers skill activation? | Automatic prompt-to-description matching | Verified |
| 5 | Does Copilot read AGENTS.md? | **YES** — as global agent instructions (not individual agents) | Verified |
| 6 | MCP server restrictions? | Enterprise policy can restrict; repo agents can't embed MCP | Verified |
| 7 | Does `applyTo` work in instructions? | **YES** — glob patterns in `.instructions.md` frontmatter | Verified |
| 8 | Can VS Code extensions add Copilot slash commands? | Possible via Chat Participant API but prompts/.agent.md are simpler | Partially verified |

---

## Feature Compatibility Summary

| Feature | Claude Code | Copilot (VS Code) | Copilot (CLI) | Migration Effort |
|---------|-------------|-------------------|---------------|-----------------|
| Custom instructions | CLAUDE.md + rules/ | copilot-instructions.md + AGENTS.md + .instructions.md | AGENTS.md | Low |
| Skills (SKILL.md) | Full support | GA (Insiders), coming to stable | Supported | Very Low (shared format) |
| Hooks | PreToolUse, PostToolUse, Stop | preToolUse, postToolUse, sessionStart/End, errorOccurred | From CWD | Medium |
| Custom agents | agents/*.md with tools/model | .github/agents/*.agent.md with tools (no model) | @agent-name | Medium |
| Slash commands | /command-name | /prompt-name (from .prompt.md) | Built-in only | High (CLI gap) |
| MCP servers | settings.json | VS Code settings / repo config | Limited | Medium |
| Per-agent model | Supported | NOT supported | NOT supported | Cannot migrate |

---

## Best Practices for Next Sessions

### Session 2: Skills & Instructions Migration
1. Skills are a shared format — copy directories, update descriptions for Copilot matching
2. Remove Claude-specific terminology (`Claude Code`, `claude`, references to CLAUDE.md)
3. Test activation in VS Code Insiders (stable support coming soon)
4. For instructions: consolidate 8 rules files into `copilot-instructions.md` + path-specific `.instructions.md`
5. Create `AGENTS.md` at root as global agent context (tech stack, project structure, boundaries)

### Session 3: Prompts & Hooks Migration
1. Commands → `.prompt.md` files with `mode: "agent"` frontmatter
2. Document CLI limitation clearly — prompts only work in VS Code
3. Hooks: create `.github/hooks/default.json` with camelCase event names
4. Port hook scripts to `scripts/hooks/` with both bash and powershell
5. No `PreCompact` equivalent exists — document as limitation

### Session 4: Agents Migration
1. Use `.agent.md` extension in `.github/agents/`
2. Map Claude Code `tools:` lists to Copilot tool aliases
3. Drop `model:` declarations — Copilot selects model
4. Write AGENTS.md as global instructions file (not individual agents)
5. Test `@agent-name` invocation in both CLI and VS Code
6. Follow three-tier boundaries pattern from GitHub's best practices

---

*Research conducted: January 28, 2026*
*Next review: Before Session 2 implementation*
