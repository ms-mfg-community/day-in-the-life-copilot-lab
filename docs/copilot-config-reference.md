# Copilot CLI configuration reference

> **Compiled 2026-04-24 from docs.github.com. Reflects the configuration surface as of Copilot CLI 1.0.36. Re-verify against current docs before relying on any specific claim.**

This is the canonical, fact-checked parameter reference for the Copilot CLI customization surface: skills, custom agents, MCP servers, hooks, and the two-layer tool gating model. The IDE-only prompt-file surface is included for completeness with a loud banner.

Out of scope for this document: `gh-aw` (GitHub Agentic Workflows) — see `labs/lab-gh-extensions.md`.

Accuracy convention used throughout:

- A **claim cited to docs.github.com** is taken as documented behavior.
- A claim that we could not locate on docs.github.com is labeled **"not documented on docs.github.com — verify against current build"** rather than "not supported." The CLI ships faster than its docs; absence of documentation is not proof of absence of behavior.
- `> ⚠️` callouts flag claims that cli-research.md §C identified as commonly-taught-but-inaccurate.

---

## 1. SKILL.md frontmatter

Skills are instruction bundles that Copilot auto-loads based on `description` matching. The skill file **must** be named `SKILL.md` (uppercase) and live in a lowercase-hyphenated directory under one of the documented skill roots (precedence: project > personal):

- Project: `.github/skills/<name>/SKILL.md`, `.claude/skills/<name>/SKILL.md`, or `.agents/skills/<name>/SKILL.md`
- Personal: `~/.copilot/skills/<name>/SKILL.md`, `~/.claude/skills/<name>/SKILL.md`, or `~/.agents/skills/<name>/SKILL.md`

### 1.1 Documented frontmatter fields

| Field | Type | Required | Behavior | Cite |
|---|---|---|---|---|
| `name` | string (lowercase, hyphens) | Yes | Unique identifier; typically matches the directory name. | [add-skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) |
| `description` | string | Yes | Tells the model when to load the skill. Used by Copilot's auto-selection logic. | [add-skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) |
| `license` | string | No | Informational only. | [add-skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) |
| `allowed-tools` | string or list of strings | No | Pre-approves tool use so the user is not prompted each call. Documented example: `allowed-tools: shell`. Omit to force per-call approval. | [add-skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills) |

> ⚠️ **Do not teach `model:` as a SKILL.md field.** A `model` frontmatter field is **not documented on docs.github.com** for skills. `model` is documented only for **custom agents** (see §2). Treat any `model:` key in a SKILL.md as unsupported until verified against a current CLI build.

### 1.2 `allowed-tools` — MCP-prefix scoping

The skills docs show only bare tool names (e.g. `shell`) as `allowed-tools` values. The MCP-prefix forms (`server/tool`, `server/*`) are documented **only for custom agents** (see §2.2), not for skills.

> ⚠️ The `server/tool` MCP-prefix syntax in `allowed-tools` is **not documented on docs.github.com for skills — documented for custom agents only — verify against current build.** Do not teach it as a guaranteed skills feature.

### 1.3 Skill body and companion files

The `SKILL.md` body is the instructions the model sees when the skill loads. Sibling files in the same directory are auto-discoverable so the body can reference them (e.g. `./convert-svg-to-png.sh`). This is documented in the add-skills § "Enabling a skill to run a script."

### 1.4 CLI management

`/skills list`, `/skills info <name>`, `/skills add`, `/skills reload`, `/skills remove <dir>`. Invoke explicitly with `/<skill-name>` in a prompt.

**Sources:** https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills

---

## 2. Custom-agent frontmatter (`.agent.md`)

Custom agents are first-class subagents you define as markdown files. When the main CLI agent delegates, a custom agent is materialized as a subagent with its own context window. Locations (project overrides personal for same filename):

- Project: `.github/agents/<name>.agent.md` *(CLI form)* or `.github/agents/<name>.md` *(cloud-agent form is also accepted)*
- Personal: `~/.copilot/agents/<name>.agent.md`
- Org/enterprise: `/agents/<name>.md` in a `.github-private` repo

### 2.1 Full frontmatter property list

| Field | Type | Required | Behavior | Cite |
|---|---|---|---|---|
| `name` | string | No | Display name. If omitted, the filename minus `.md` / `.agent.md` is used. | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `description` | string | **Yes** | Used by the main agent to decide when to delegate to this agent. | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `target` | string (`vscode` \| `github-copilot`) | No | Restricts which environment loads this agent. Default: both. | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `tools` | list of strings, or comma-separated string | No | Allow-list. Grammar in §2.2. Default = all tools. | [custom-agents-configuration § Tools](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `model` | string | No | Overrides the session model for this agent's turns. Defaults to the session model. Legal values = whatever the CLI's `/model` picker offers at the time. | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `disable-model-invocation` | boolean | No | If `true`, the main agent cannot auto-delegate to this agent; it must be chosen explicitly. Replaces retired `infer: false`. | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `user-invocable` | boolean | No | If `false`, the agent is not offered in the `/agent` UI and is only reachable programmatically. Default `true`. | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `infer` | boolean | No | **Retired.** Use `disable-model-invocation` + `user-invocable`. | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `mcp-servers` | object | No | Extra MCP servers to mount for this agent (CLI / cloud-agent only; ignored in IDEs). | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |
| `metadata` | object (`name` / `value` string pairs) | No | Free-form annotations (CLI / cloud-agent only). | [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) |

> ⚠️ **`infer:` is retired.** Any lab or skill that teaches `infer: true` / `infer: false` as the way to control auto-delegation is out of date. Use `disable-model-invocation` (blocks auto-delegation) and `user-invocable` (hides from the `/agent` picker).

**Markdown body cap:** 30,000 characters. Source: [custom-agents-configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration).

### 2.2 `tools` allow-list grammar

The `tools` field is an allow-list. Unknown tool names are silently ignored so profiles stay portable across environments.

| Value | Meaning |
|---|---|
| omitted, or `tools: ["*"]` | All tools available to the session. |
| `tools: ["read", "edit", "search"]` | Specific built-in tools via **aliases** (case-insensitive). Primary aliases: `execute` / `shell` / `Bash` / `powershell`, `read`, `edit`, `search`, `agent`, `web`. |
| `tools: ["some-mcp-server/some-tool"]` | A specific tool from a specific MCP server. |
| `tools: ["some-mcp-server/*"]` | All tools from one MCP server. |
| `tools: ["azure.some-extension/some-tool"]` | A VS Code extension proxy tool (Azure extension family uses the `azure.<vsix>/<tool>` form). |
| `tools: []` | Empty list disables all tool calls for this agent. |

Alias matching is case-insensitive; MCP and VS Code extension names are matched as written.

### 2.3 Invocation

- `/agent` picker inside the CLI (unless `user-invocable: false`).
- Natural-language mention (unless `disable-model-invocation: true`).
- Programmatic: `copilot --agent=<name> --prompt "…"`.

**Sources:** https://docs.github.com/en/copilot/reference/custom-agents-configuration

---

## 3. MCP server configuration

MCP server configuration lives in JSON, not markdown. Files (precedence: **project overrides user** for same server name):

- User-level: `~/.copilot/mcp-config.json`
- Project-level: `.mcp.json` or `.github/mcp.json` in the repo

The GitHub MCP server is built in — no config required.

### 3.1 Top-level shape

```json
{
  "mcpServers": {
    "<server-name>": {
      "type": "local",
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "env": {},
      "tools": ["*"]
    }
  }
}
```

### 3.2 Server type values

| `type` | Transport | Required fields | Notes | Cite |
|---|---|---|---|---|
| `local` | stdio (local subprocess) | `command`, `args`, optional `env` | Identical behavior to `stdio`. | [add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| `stdio` | stdio (local subprocess) | `command`, `args`, optional `env` | Preferred spelling for cross-client portability (VS Code, cloud agent). | [add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| `http` | Streamable HTTP | `url`, optional `headers` | Preferred for remote servers. | [add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| `sse` | HTTP + Server-Sent Events | `url`, optional `headers` | Accepted for backward compat. | [add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |

> ⚠️ **`sse` is deprecated in the MCP spec** and should be treated as legacy. New servers should declare `type: http` (Streamable HTTP). Existing `sse` entries still work but should be migrated when convenient.

### 3.3 Per-server `tools` exposure

Each server may declare a `tools` field that restricts which of the server's tools are even exposed to the client:

- `"*"` — expose all tools (default when omitted).
- Comma-separated string or JSON array — expose only those named tools.

This is the **server-side gate** (§6).

### 3.4 Environment variables

Only `PATH` is automatically inherited from the parent process. All other environment variables required by an MCP server must be declared in the server's `env` field. This is deliberate: it keeps server processes hermetic and prevents accidental secret leakage.

### 3.5 Layered precedence

Project MCP config wins over user MCP config for the same server name. This lets a repo pin an MCP configuration (versions, URLs, headers) without disturbing a user's global list.

### 3.6 Management slash-commands

`/mcp show`, `/mcp show <name>`, `/mcp add`, `/mcp edit <name>`, `/mcp delete <name>`, `/mcp disable <name>`, `/mcp enable <name>`.

**Sources:** https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers, https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference

---

## 4. Hooks

> ⚠️ **`preToolUse` only acts on `deny`. Outputs of `allow` and `ask` are accepted but ignored by the current CLI.** Do not design hook logic whose correctness depends on `allow` or `ask` being honored — write your rules as "deny everything that is not explicitly permitted" and let absence-of-deny be the allow. This is the single most frequently misunderstood hook semantic.

Hooks apply to both the Copilot cloud agent and Copilot CLI. Locations:

- Project: `.github/hooks/*.json`
- User: `~/.copilot/hooks/` (scripts) plus optional inline `hooks` key in `~/.copilot/settings.json`

> ⚠️ The CLI settings file is **`settings.json`**, not `config.json`. The legacy `config.json` filename is auto-migrated on startup. Lab material that still references `~/.copilot/config.json` should be updated.

### 4.1 Top-level JSON schema

```json
{
  "version": 1,
  "hooks": {
    "<eventName>": [
      {
        "type": "command",
        "bash": "…",
        "powershell": "…",
        "cwd": "…",
        "env": { "KEY": "value" },
        "timeoutSec": 30
      }
    ]
  }
}
```

### 4.2 Hook object fields

| Field | Type | Required | Behavior | Cite |
|---|---|---|---|---|
| `type` | string | Yes | Must be `"command"`. | [hooks-configuration](https://docs.github.com/en/copilot/reference/hooks-configuration) |
| `bash` | string | Yes on Unix | Path to a script, or an inline bash command. | [hooks-configuration](https://docs.github.com/en/copilot/reference/hooks-configuration) |
| `powershell` | string | Yes on Windows | Path to a script, or an inline PowerShell command. | [hooks-configuration](https://docs.github.com/en/copilot/reference/hooks-configuration) |
| `cwd` | string | No | Working directory, relative to repo root. | [hooks-configuration](https://docs.github.com/en/copilot/reference/hooks-configuration) |
| `env` | object | No | Extra env vars merged with the process env. | [hooks-configuration](https://docs.github.com/en/copilot/reference/hooks-configuration) |
| `timeoutSec` | integer | No | Defaults to 30. | [hooks-configuration](https://docs.github.com/en/copilot/reference/hooks-configuration) |

### 4.3 Event catalogue

| Event | Fires when | Input JSON payload | Output honored? |
|---|---|---|---|
| `sessionStart` | A new session begins or a saved session resumes. | `timestamp`, `cwd`, `source` (`new` / `resume` / `startup`), `initialPrompt` | No |
| `sessionEnd` | Session terminates. | `timestamp`, `cwd`, `reason` (`complete` / `error` / `abort` / `timeout` / `user_exit`) | No |
| `userPromptSubmitted` | Each prompt the user submits. | `timestamp`, `cwd`, `prompt` | No (prompt mutation is not supported) |
| `preToolUse` | Before any tool call is executed. | `timestamp`, `cwd`, `toolName`, `toolArgs` (JSON string) | **Partial.** Emit `{"permissionDecision":"deny","permissionDecisionReason":"…"}` to block the call. **Only `deny` is currently acted on; `allow` / `ask` outputs are accepted but ignored.** |
| `postToolUse` | After a tool call finishes. | Documented on the hooks-configuration reference page. | No |
| `agentStop` | Main agent finishes responding. | — | No |
| `subagentStop` | A subagent finishes. | — | No |
| `errorOccurred` | An error occurs during agent execution. | — | No |

> ⚠️ **Design implication.** Because `preToolUse` is effectively deny-only, write hooks so that any non-denied tool call is allowed by default. "Approve-list" hooks that emit `allow` for permitted tools and expect everything else to be blocked will silently permit everything — the `allow` is a no-op, and there is no deny.

**Sources:** https://docs.github.com/en/copilot/reference/hooks-configuration, https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks

---

## 5. Prompt files (IDE-only)

> ⚠️ **Prompt files are not a Copilot CLI feature.** The docs explicitly scope `.prompt.md` to **VS Code, Visual Studio, and JetBrains IDEs**. Copilot CLI `/help` does not expose a `/prompt <name>` slash command. Treat prompt files as IDE-only unless a future CLI release documents otherwise.

Prompt files are templates the user *manually invokes* inside an IDE chat. They take input variables at invocation time. They are different from skills, which are *instruction bundles the model auto-loads* based on description matching.

### 5.1 Documented frontmatter fields

| Field | Type | Required | Behavior | Cite |
|---|---|---|---|---|
| `agent` | string | No | Picks the agent / chat mode in the IDE. Tutorial example: `agent: 'agent'`. | [your-first-prompt-file](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |
| `description` | string | No | Shown in the IDE UI. | [your-first-prompt-file](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file) |

> ⚠️ `mode:`, `model:`, and `tools:` keys are widely seen in community examples but are **not shown in the docs.github.com prompt-file tutorial**. Treat them as **VS Code community convention, not docs.github.com spec.** Verify against the current IDE build before teaching them.

### 5.2 Argument templating

Official syntax: `${input:<name>:<prompt-text>}`. The `<prompt-text>` is the hint shown to the user at invocation.

Example:

```markdown
Explain the following code:

${input:code:Paste your code here}
```

At invocation, the IDE prompts the user with `Paste your code here` and substitutes the result into the template before sending.

**Sources:** https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file, https://docs.github.com/en/copilot/reference/customization-cheat-sheet

---

## 6. Two-layer tool gating

Every tool call in Copilot CLI passes through **two independent allow-lists**. Both must permit the call. There is **no implicit allow** at either layer — each layer enforces its own allow-list, and a call denied at either layer is blocked.

### 6.1 Diagram

```
 ┌────────────────────────────────────────────────────────────────────┐
 │ Agent turn wants to call:  server=foo  tool=bar                    │
 └──────────────────────────────┬─────────────────────────────────────┘
                                │
              ┌─────────────────▼─────────────────┐
              │ Layer 1 — MCP server-side gate    │
              │ (mcp-config.json → servers.foo    │
              │  .tools)                          │
              │                                   │
              │  "*"            → bar exposed     │
              │  ["bar","baz"]  → bar exposed     │
              │  ["baz"]        → bar NOT exposed │
              └─────────────────┬─────────────────┘
                                │  (pass)
              ┌─────────────────▼─────────────────┐
              │ Layer 2 — agent/skill client-side │
              │ allow-list                        │
              │                                   │
              │  agent.tools (custom agent)       │
              │    "*"          → allowed         │
              │    "foo/*"      → allowed         │
              │    "foo/bar"    → allowed         │
              │    "foo/baz"    → denied          │
              │    []           → denied          │
              │                                   │
              │  skill.allowed-tools (skills)     │
              │    shell         → bare names     │
              │    (server/tool  → see §1.2 flag) │
              └─────────────────┬─────────────────┘
                                │  (pass)
                                ▼
                       Tool call executes
```

### 6.2 Plain-prose rule

- **Layer 1 — MCP config `tools` (server-side exposure):** what the MCP server even exposes to the CLI client. Declared per-server in `mcp-config.json` / `.mcp.json`. If a tool is not in this list, the client never sees it.
- **Layer 2 — Agent/skill `tools` / `allowed-tools` (client-side allow-list):** what *this particular agent or skill* is allowed to invoke out of what layer 1 exposed. Declared in the agent frontmatter or the skill frontmatter.

**Two layers of `deny`, no implicit allow.** A tool call succeeds only if it is *exposed by layer 1* **and** *permitted by layer 2*. Removing a tool from either layer blocks the call. This is the deterministic-control story: scope at the MCP config for coarse, repo-wide boundaries; scope at the agent/skill frontmatter for fine, per-role boundaries; layer a deny-only `preToolUse` hook (§4) on top for defense-in-depth.

Source attribution:

- Layer 1 semantics: [add-mcp-servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).
- Layer 2 semantics: [custom-agents-configuration § Tools](https://docs.github.com/en/copilot/reference/custom-agents-configuration) and [add-skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills).

**Sources:** https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers, https://docs.github.com/en/copilot/reference/custom-agents-configuration, https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills

---

## Appendix — Accuracy flags at a glance

| # | Common claim | Status | Reference section |
|---|---|---|---|
| 1 | SKILL.md supports a `model:` field | ❌ Not documented on docs.github.com. Documented only for custom agents. | §1.1 |
| 2 | SKILL.md `allowed-tools` accepts `server/tool` MCP-prefix syntax | ⚠️ Not documented on docs.github.com for skills — documented for custom agents only — verify against current build. | §1.2 |
| 3 | `.prompt.md` works in Copilot CLI | ❌ Docs scope prompt files to VS Code / VS / JetBrains. | §5 |
| 4 | `mode:` / `model:` / `tools:` are official prompt-file frontmatter | ⚠️ VS Code community convention, not docs.github.com spec. | §5.1 |
| 7 | `infer:` is the current way to control auto-delegation | ❌ Retired. Use `disable-model-invocation` + `user-invocable`. | §2.1 |
| 8 | `~/.copilot/config.json` is the CLI settings file | ⚠️ Renamed to `settings.json`; legacy file auto-migrated. | §4 |
| 9 | MCP `type: sse` is current | ⚠️ Deprecated in the MCP spec; prefer `http`. | §3.2 |
| 10 | `preToolUse` hooks support `allow` / `deny` / `ask` | ⚠️ Only `deny` is acted on; `allow` / `ask` are accepted but ignored. | §4 |

**Sources:** https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference, https://docs.github.com/en/copilot/reference/customization-cheat-sheet
