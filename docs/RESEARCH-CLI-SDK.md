# Research Findings: Copilot CLI SDK & LSP Integration (February 2026)

This document captures verified research for Phase 2 Epics 1 (CLI Hardening) and 2 (LSP SDK Support). Each finding includes source attribution and confidence level.

---

## 1. Copilot CLI Configuration (`~/.copilot/config.json`)

### Findings

**Location:** `~/.copilot/config.json` by default. Override via `XDG_CONFIG_HOME` environment variable or `--config-dir` CLI flag.

**Known configuration keys:**

| Key | Type | Purpose |
|-----|------|---------|
| `trusted_folders` | array | Permanently trusted directories (bypasses trust prompts) |
| `banner` | string | Banner display behavior (`"always"`) |
| `allowed_urls` | array | URL allowlist patterns (applies to shell commands too) |
| `denied_urls` | array | URL denylist patterns |

**CLI config commands:**
- `copilot config view` — display current settings
- `copilot config set <key> <value>` — update a setting
- `copilot config reset` — restore defaults

**MCP config is separate:** `~/.copilot/mcp-config.json` (same directory, separate file). Add servers interactively with `/mcp add`.

**Important:** The full config.json schema is not publicly documented. The keys above are confirmed; additional undocumented keys may exist. Use `copilot --help` and `copilot config view` for the current list.

### Sources
- [GitHub Docs - Using Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)
- [GitHub Docs - About Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli)
- [GitHub Changelog - CLI Enhanced Agents (Jan 2026)](https://github.blog/changelog/2026-01-14-github-copilot-cli-enhanced-agents-context-management-and-new-ways-to-install/)

---

## 2. CLI Hook Loading Behavior

### Findings

**Loading location:** For Copilot CLI, hooks are loaded from the current working directory's `.github/hooks/*.json`. The `hooks.json` file must be present on the repository's default branch for the coding agent (GitHub.com), but CLI loads from CWD.

**Hook events supported:**

| Event | Purpose | Can Modify? |
|-------|---------|-------------|
| `sessionStart` | Session begins/resumes | No |
| `sessionEnd` | Session completes/terminates | No |
| `userPromptSubmitted` | User submits prompt | No |
| `preToolUse` | Before tool execution | Yes (deny + modify args) |
| `postToolUse` | After tool execution | No (observational only) |
| `errorOccurred` | Agent errors | No |

**Key behaviors:**
- `preToolUse` hooks can deny tool execution AND modify arguments (confirmed in CLI v0.0.396+)
- All hooks receive JSON via stdin with `timestamp`, `cwd`, and event-specific fields
- Multiple hooks per event execute sequentially
- Default timeout: 30 seconds
- Both `bash` and `powershell` script paths supported

**Implications for this repo:**
- `.github/hooks/` configs work for CLI when user runs from repo root
- No global hook directory (`~/.copilot/hooks/`) exists — hooks are always per-project
- `preToolUse` argument modification is a newer capability not documented in Phase 1 RESEARCH.md

### Sources
- [GitHub Docs - About Hooks](https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-hooks)
- [GitHub Docs - Using Hooks](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)
- [GitHub Docs - Hooks Configuration Reference](https://docs.github.com/en/copilot/reference/hooks-configuration)
- [Copilot CLI Changelog v0.0.396](https://github.com/github/copilot-cli/blob/main/changelog.md)

---

## 3. CLI Skill Loading

### Findings

**Loading paths (in order):**
1. `~/.copilot/skills/<skill-name>/SKILL.md` (personal/global)
2. `[repo-root]/.github/skills/<skill-name>/SKILL.md` (per-project)

**Key behaviors:**
- Skills only load at startup — restart CLI after adding/changing skills
- Folder must be directly under the skills path (no extra nesting)
- Skill folder name must match the `name` in SKILL.md frontmatter
- `~/.claude/skills/` is NOT detected by Copilot CLI (must use `~/.copilot/skills/`)

**Correction from Phase 1:**
- Phase 1 RESEARCH.md stated Copilot "also reads from `~/.claude/skills/`" — this appears to be cross-compatible only in VS Code, NOT in CLI. The community discussion confirms CLI requires `~/.copilot/skills/`.

### Sources
- [GitHub Community Discussion #183396 - Agent Skills in CLI](https://github.com/orgs/community/discussions/183396)
- [GitHub Docs - About Agent Skills](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)

---

## 4. CLI Agent Support

### Findings

**Built-in agents (4):**

| Agent | Purpose |
|-------|---------|
| Explore | Fast codebase analysis without cluttering main context |
| Task | Runs commands (tests, builds) |
| Plan | Creates structured implementation plans |
| Code-review | Reviews changes with high signal-to-noise ratio |

These are delegated to automatically by Copilot and can run in parallel.

**Custom agent loading paths:**
1. `~/.copilot/agents/<agent-name>.agent.md` (personal)
2. `[repo-root]/.github/agents/<agent-name>.agent.md` (per-project)
3. `.github-private/agents/<agent-name>.md` (organization/enterprise)

**`infer: true` support:** YES — confirmed via both Copilot SDK docs and CLI behavior. When `infer: true`, the agent is available for automatic selection based on prompt matching (same as VS Code behavior).

**Invocation:** Via `@agent-name` in CLI chat, or `copilot --agent=<name>` flag.

**Agent properties supported in CLI:**

| Property | Supported | Notes |
|----------|-----------|-------|
| `description` | Yes | Required |
| `name` | Yes | Display name |
| `tools` | Yes | Tool list with aliases |
| `infer` | Yes | Auto-select from prompt |
| `mcp-servers` | Org/Enterprise only | Repo agents inherit from repo settings |
| `metadata` | Yes | Key-value annotations |
| `model` | No | CLI selects model automatically |
| `handoffs` | No | VS Code only |

### Sources
- [GitHub Docs - Creating Custom Agents](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-custom-agents)
- [GitHub Docs - Custom Agents Configuration Reference](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Copilot SDK Docs (context7)](https://context7.com/github/copilot-sdk/llms.txt)

---

## 5. CLI MCP Server Support

### Findings

**Configuration file:** `~/.copilot/mcp-config.json` (personal) or `.copilot/mcp-config.json` (per-project)

**Per-session addition:** `--additional-mcp-config <path>` flag allows loading extra MCP configs for a single session.

**Interactive management:** `/mcp add` command within CLI session.

**Server types supported:**

| Type | Transport | Configuration |
|------|-----------|---------------|
| `local` / `stdio` | stdin/stdout | `command`, `args`, `env`, `cwd` |
| `http` | HTTP request/response | `url`, `headers` |
| `sse` | Server-Sent Events | `url` |

**Tool filtering:** Per-server `tools` property accepts `"*"` (all) or array of specific tool names.

**SDK-level MCP:** When using the Copilot SDK programmatically, MCP servers can be configured per-session via `createSession({ mcpServers: {...} })`.

### Sources
- [Copilot SDK Docs (context7)](https://context7.com/github/copilot-sdk/llms.txt)
- [GitHub Docs - Using Copilot CLI](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)

---

## 6. CLI-Specific Features (Not in Phase 1 Research)

### Context Management
- **Auto-compaction:** Triggers at 95% of token limit, compresses history automatically
- **Manual compaction:** `/compact` command
- **Context visualization:** `/context` command shows token usage breakdown
- **Session resume:** `--resume` flag cycles through local and remote coding agent sessions

### Pipeline / Scripting Mode
- `-p` / `--prompt` flag for single-prompt execution
- `--silent` for clean parseable output
- `--share [PATH]` exports transcript to markdown
- `--share-gist` creates shareable GitHub gist

### Permission Shortcuts
- `--allow-all` / `--yolo` — auto-approve all permissions
- `--allow-all-paths` — approve all file path access
- `--allow-all-urls` — approve all URL access
- `--allow-tool <name>` / `--deny-tool <name>` — granular tool control
- `--available-tools` / `--excluded-tools` — tool allowlisting/denylisting

### Experimental Features (via `--experimental` or `/experimental`)
- LSP tool for code intelligence (see Section 7)
- Autopilot mode for autonomous task completion
- Extended thinking for Claude models
- Theme picker (`/theme`)

### Other
- Copilot Memory: persistent learning about coding patterns
- AI-generated session names
- Sub-agent token consumption tracking in `/usage`
- UNIX keyboard bindings (Ctrl+A/E/W/U/K, Alt+arrows)
- `.claude/commands/` single-file commands as simpler alternatives to skills

### Sources
- [GitHub Changelog - CLI Enhanced Agents (Jan 2026)](https://github.blog/changelog/2026-01-14-github-copilot-cli-enhanced-agents-context-management-and-new-ways-to-install/)
- [Copilot CLI Changelog](https://github.com/github/copilot-cli/blob/main/changelog.md)

---

## 7. LSP Integration in Copilot CLI

### Findings

**Native CLI LSP tool:**
- Added in CLI v0.0.399
- Requires `--experimental` flag (or `/experimental` command in session)
- Provides code intelligence (type info, diagnostics, symbol resolution)
- NOT GA — currently requires experimental/staff flag
- Not configurable by end users (no way to specify which LSP server to use)

**This is NOT the same as `@github/copilot-language-server`:**
- `@github/copilot-language-server` is Copilot *itself* acting as an LSP server for IDE inline completions
- The CLI LSP tool is the reverse: it *consumes* LSP server intelligence for AI context

### Implications for Epic 2
The native LSP tool is experimental and not user-configurable. For a shipping solution, the recommended approach is **LSP-to-MCP bridges** — third-party tools that wrap existing LSP servers as MCP tool providers.

---

## 8. LSP-to-MCP Bridge Options

### Findings

Multiple mature projects exist for bridging LSP servers into the MCP ecosystem:

| Project | Language | Maturity | Key Feature |
|---------|----------|----------|-------------|
| [lsp-mcp-server](https://github.com/nzrsky/lsp-mcp-server) | Zig | Active | High performance, multi-language |
| [lsp-mcp](https://github.com/Tritlo/lsp-mcp) | Node.js | Active | Simple CLI usage: `npx tritlo/lsp-mcp <lang> /path/to/lsp` |
| [mcpls](https://github.com/bug-ops/mcpls) | Rust | Active | Universal bridge, config-driven |
| [mcp-lsp-bridge](https://github.com/rockerBOO/mcp-lsp-bridge) | - | Active | 20+ languages, project analysis |
| [Language Server tools for Copilot](https://marketplace.visualstudio.com/items?itemName=sehejjain.lsp-mcp-bridge) | VS Code ext | Active | VS Code only, bridges to MCP tools |

### Recommended LSP Servers per Language

**TypeScript:**
- `typescript-language-server` (wraps `tsserver`) — most widely used
- Provides: completions, diagnostics, go-to-definition, hover info, references

**Python:**
- `basedpyright` / `pyright` — best for type checking
- `ruff-lsp` — fast linting and autofix
- `pylsp` — plugin-based, supports multiple backends

### Architecture Recommendation for Epic 2

The recommended architecture is **MCP servers wrapping LSP bridges**, configured in `mcp-configs/`:

```
mcp-configs/
├── lsp-typescript.json    # MCP config for TypeScript LSP bridge
├── lsp-python.json        # MCP config for Python LSP bridge
└── all-servers.json       # Updated with LSP bridge entries
```

This approach:
- Works in both CLI and VS Code (via MCP)
- Doesn't depend on experimental CLI features
- Is cherry-pickable (users pick languages they need)
- Uses proven, maintained bridge projects
- Provides: diagnostics, type info, go-to-definition, hover, references

### Sources
- [Copilot CLI Changelog v0.0.399](https://github.com/github/copilot-cli/blob/main/changelog.md)
- [lsp-mcp by Tritlo](https://github.com/Tritlo/lsp-mcp)
- [mcpls](https://github.com/bug-ops/mcpls)
- [lsp-mcp-server (Zig)](https://github.com/nzrsky/lsp-mcp-server)
- [Language Server tools for Copilot (VS Code)](https://marketplace.visualstudio.com/items?itemName=sehejjain.lsp-mcp-bridge)

---

## 9. Copilot SDK Architecture

### Findings

**Package:** `@github/copilot-sdk` (npm), `github-copilot-sdk` (PyPI), `github.com/github/copilot-sdk/go` (Go), `GitHub.Copilot.SDK` (NuGet)

**Status:** Technical Preview (Jan 2026) — "functional and can be used for development and testing" but not production-approved.

**Architecture:** All SDKs communicate with the Copilot CLI via JSON-RPC. The SDK manages the CLI process lifecycle automatically.

**Session configuration (programmatic):**

```typescript
const session = await client.createSession({
    model: "gpt-5",              // or "claude-sonnet-4"
    customAgents: [...],          // Agent definitions
    mcpServers: {...},            // MCP server configs
    tools: [...],                 // Custom tool definitions
});
```

**BYOK support:** SDK supports Bring Your Own Key for custom LLM providers.

**Relevance to this repo:** The SDK is relevant for Epic 3 (inter-session communication) and Epic 5 (dashboard) more than Epics 1-2. For Epics 1-2, the focus is on CLI-native configuration files, not programmatic SDK usage.

### Sources
- [GitHub Copilot SDK Repository](https://github.com/github/copilot-sdk)
- [GitHub Blog - Copilot SDK Announcement](https://github.blog/news-insights/company-news/build-an-agent-into-any-app-with-the-github-copilot-sdk/)
- [Copilot SDK Docs (context7)](https://context7.com/github/copilot-sdk/llms.txt)

---

## 10. Answers to Phase 2 Research Questions

### Epic 1: CLI Hardening

| # | Question | Answer | Confidence |
|---|----------|--------|------------|
| 1 | What is the current state of `~/.copilot/config.json` options? | Contains `trusted_folders`, `banner`, `allowed_urls`, `denied_urls`. Full schema undocumented. | Verified (partial) |
| 2 | Can CLI load skills from `~/.copilot/skills/`? | **YES** — loads from `~/.copilot/skills/<name>/` and `.github/skills/<name>/` | Verified |
| 3 | What is the CLI hook loading behavior from CWD vs `.github/hooks/`? | CLI loads hooks from `.github/hooks/` relative to CWD. No global hook directory. | Verified |
| 4 | Does CLI support `infer: true` on agents? | **YES** — confirmed via SDK docs and configuration reference | Verified |

### Epic 2: LSP SDK Support

| # | Question | Answer | Confidence |
|---|----------|--------|------------|
| 1 | What is the Copilot CLI SDK's LSP integration surface? | Experimental LSP tool (v0.0.399+, `--experimental` flag). Not user-configurable. | Verified |
| 2 | Is `@anthropic/copilot-sdk` or `@github/copilot-sdk` the relevant package? | `@github/copilot-sdk` (Technical Preview, Jan 2026). No Anthropic equivalent. | Verified |
| 3 | Can LSP servers be registered as MCP servers? | **YES** — via third-party LSP-to-MCP bridges (lsp-mcp, mcpls, etc.) | Verified |
| 4 | What TypeScript/Python LSP servers are best suited? | TS: `typescript-language-server`. Python: `basedpyright`/`pyright` + `ruff-lsp` | Verified |
| 5 | How does this interact with VS Code's built-in language services? | LSP-to-MCP bridges run alongside VS Code's services. The VS Code extension bridges directly. | Verified |

---

## 11. Corrections to Phase 1 Research

| Finding | Phase 1 Stated | Corrected |
|---------|---------------|-----------|
| `~/.claude/skills/` cross-compat | "Also reads from `~/.claude/skills/`" | CLI does NOT read from `~/.claude/skills/`. Only `~/.copilot/skills/` works in CLI. May work in VS Code only. |
| `preToolUse` capabilities | "Only deny decisions are processed" | `preToolUse` can now also modify arguments (v0.0.396+) |
| Built-in CLI agents | Not documented | 4 built-in agents: Explore, Task, Plan, Code-review |
| CLI slash commands | Listed basic commands | Additional: `/context`, `/review`, `/mcp add`, `/resume`, Plan mode (Shift+Tab) |

---

## 12. LSP Bridge Implementation (Epic 2 Deliverable)

### Bridges Selected

| Language | Bridge | Package | Why |
|----------|--------|---------|-----|
| TypeScript | `ts-lsp-mcp` | `ts-lsp-mcp` v0.1.3 | Purpose-built for TypeScript. TS-specific tools: type tracing, monorepo detection, inline type checks. No separate LSP server needed — bundles its own TS analysis. |
| Python | `cclsp` + `basedpyright` | `cclsp` v0.7.0 | AI-optimized: handles LLM position miscalculations by trying multiple position combinations. Supports any LSP server. Interactive setup wizard. |

### Bridges Evaluated but Not Selected

| Bridge | Reason Not Selected |
|--------|-------------------|
| `Tritlo/lsp-mcp` | Generic bridge, no TS-specific tools. Good for languages without a specialized bridge. |
| `nzrsky/lsp-mcp-server` (Zig) | High performance but requires binary installation (brew/apt/nix), not npx-compatible. |
| `ProfessioneIT/lsp-mcp-server` | Most comprehensive (24 tools) but requires global install + absolute path to dist/index.js. |
| `@treedy/lsp-mcp` | Too new (published same day as research, Feb 2, 2026), insufficient documentation for recommendation. |

### Setup: TypeScript (`ts-lsp-mcp`)

**Prerequisites:** Node.js 18+, `tsconfig.json` in project root.

**Cherry-pick from `mcp-configs/lsp-typescript.json`, or add manually to `.copilot/mcp-config.json`:**
```json
{
  "lsp-typescript": {
    "type": "local",
    "command": "npx",
    "args": ["-y", "ts-lsp-mcp", "serve", "--stdio"],
    "tools": ["*"]
  }
}
```

**Tools available after connection:**
- `getTypeAtPosition` — resolve type at file:line:col
- `getDefinition` — jump to symbol definition
- `getReferences` — find all usages of a symbol
- `getHover` — extract hover documentation
- `getCompletions` — autocomplete suggestions
- `getDiagnostics` — surface type errors and warnings
- `traceType` — analyze type composition and origins
- `runTypeTests` — execute `@ts-lsp-mcp` inline type assertions
- `checkInlineCode` — validate TypeScript snippets without file creation

**Monorepo support:** Automatically detects multiple `tsconfig.json` files.

### Setup: Python (`cclsp` + `basedpyright`)

**Prerequisites:** Node.js 18+, `basedpyright` installed globally (`npm i -g basedpyright`).

**Step 1 — Create `cclsp.json` in project root:**
```json
{
  "servers": [
    {
      "extensions": ["py"],
      "command": ["basedpyright-langserver", "--stdio"],
      "rootDir": "."
    }
  ]
}
```

Or run `npx cclsp@latest setup` for interactive configuration.

**Step 2 — Cherry-pick from `mcp-configs/lsp-python.json`, or add manually to `.copilot/mcp-config.json`:**
```json
{
  "lsp-python": {
    "type": "local",
    "command": "npx",
    "args": ["-y", "cclsp@latest"],
    "tools": ["*"]
  }
}
```

**Tools available after connection:**
- `find_definition` — locate symbol definitions
- `find_references` — find all symbol usages
- `rename_symbol` — rename with workspace-wide updates
- `rename_symbol_strict` — precise rename using position data
- `get_diagnostics` — retrieve errors and warnings
- `restart_server` — restart the LSP server

**Known limitation:** `pylsp` (alternative to basedpyright) may become slow after extended use. If using `pylsp`, configure auto-restart intervals in `cclsp.json`.

### Config Files Created

| File | Purpose |
|------|---------|
| `mcp-configs/lsp-typescript.json` | Cherry-pickable TypeScript LSP config |
| `mcp-configs/lsp-python.json` | Cherry-pickable Python LSP config |
| `mcp-configs/all-servers.json` | Updated with `lsp-typescript` and `lsp-python` entries |

### Sources
- [ts-lsp-mcp (npm)](https://www.npmjs.com/package/ts-lsp-mcp) — v0.1.3
- [cclsp (npm)](https://www.npmjs.com/package/cclsp) — v0.7.0
- [basedpyright (npm)](https://www.npmjs.com/package/basedpyright) — v1.37.3
- [cclsp GitHub](https://github.com/ktnyt/cclsp)
- [ts-lsp-mcp GitHub](https://github.com/jaenster/ts-lsp-mcp)

---

*Research conducted: February 2, 2026*
*Sources: GitHub Docs, Copilot CLI changelog, Copilot SDK (context7), GitHub community discussions, npm registry*
*Next step: Implementation plan for Epic 1 (CLI Hardening)*
