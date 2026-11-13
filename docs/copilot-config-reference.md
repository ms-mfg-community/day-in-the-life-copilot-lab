# Copilot CLI configuration reference

> **Compiled 2026-04-24 from docs.github.com. Reflects the configuration surface as of Copilot CLI 1.0.36. Re-verify against current docs before relying on any specific claim.**
>
> **§4 (Hooks) was re-verified on 2026-11-12** against the [GitHub hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference), the [VS Code agent hooks page](https://code.visualstudio.com/docs/agent-customization/hooks) and the Copilot CLI 1.0.110-3 built-in documentation. Other sections keep the compile date above unless they say otherwise.

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

> ⚠️ **`preToolUse` accepts `allow`, `deny`, and `ask` as `permissionDecision` values.** The [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#pretooluse-decision-control) documents all three as controlling whether the tool runs, and empty output uses default behavior (the normal permission flow). `ask` needs a person to answer, so it is treated as `deny` under the cloud agent and in Copilot CLI autopilot mode. The example hooks in this repo emit **only** `deny`: that is a deliberate default-deny, blast-radius design choice (a hook that only denies can only narrow what a session may do), not a runtime limitation. Whatever such a hook does not deny goes through the normal permission flow.

Hooks run in three places: **Copilot CLI**, the **Copilot cloud agent**, and the **Copilot harness in VS Code**. VS Code, the GitHub Copilot app and Copilot CLI share one harness and one hook format (in VS Code, choose **Copilot** as the Session Target; VS Code agent hooks are a preview feature). The configuration format and event payloads are shared. The execution environment and the set of events that fire are not, so every difference is called out below. The CLI loads hook configuration when it starts, so restart it after editing a hook file.

Hooks load from the sources below, **combined in this order: policy → user → project → plugins**. When the same event appears in more than one source, every entry from every source runs.

- **Policy** (Copilot CLI): machine-wide JSON files in `/etc/github-copilot/policy.d/*.json` (Linux and macOS) or `C:\ProgramData\GitHub\Copilot\policy.d\*.json` (Windows), or `Policy` values in subkeys of `HKLM\Software\Policies\GitHub\Copilot` (Windows registry). They load first, in alphabetical order, apply regardless of folder trust, always run on the host (even in sandboxed sessions), and cannot be turned off by `disableAllHooks` or the `disabledHooks` setting.
- **User**: `~/.copilot/hooks/*.json` (`%USERPROFILE%\.copilot\hooks\` on Windows; `$COPILOT_HOME/hooks/` when `COPILOT_HOME` is set), plus an optional inline `hooks` block at the top level of `~/.copilot/settings.json`.
- **Project**: `.github/hooks/*.json` in the repository root, which is the only source the cloud agent reads (the file must be on the default branch), plus an optional inline `hooks` block in `.github/copilot/settings.json` or `.github/copilot/settings.local.json`. The CLI also reads a repository's `.claude/settings.json` and `.claude/settings.local.json`.
- **Plugins**: the `hooks.json` (or `hooks/hooks.json`) that each installed plugin ships.
- **Agent-scoped**: a `hooks:` block in a custom agent's frontmatter runs only while that agent is selected, on top of everything above ([§4.8](#48-agent-scoped-hooks)).

> ⚠️ The CLI settings file is **`settings.json`**, not `config.json`. The legacy `config.json` filename is auto-migrated on startup. Lab material that still references `~/.copilot/config.json` should be updated.

### 4.1 Top-level JSON schema

```json
{
  "version": 1,
  "disableAllHooks": false,
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

- `version` must be `1`.
- `disableAllHooks` (optional): `true` skips every hook declared in that file without deleting it. At the top level of a repository's `settings.json` it skips every hook from every source for that repository, policy hooks excepted (Copilot CLI only; the cloud agent does not load `settings.json`).
- `<eventName>` is one of the 15 events in [§4.3](#43-event-catalogue). The casing of the name picks the payload format ([§4.7](#47-payload-formats-and-tool-names)).
- Each array entry is a hook object. Its `type` (`command`, `http` or `prompt`) decides which fields apply ([§4.2](#42-hook-object-fields)).
- A malformed hook item in a file loaded from a directory is dropped and logged while its valid siblings still load. Structural errors (invalid JSON, a bad `version`, a non-array event list) reject the whole file. Hooks declared inline in `settings.json` are stricter: one bad item rejects the whole `hooks` field. The CLI prints `! Invalid hook configuration in FILE: REASON` for each skipped file or entry.

### 4.2 Hook object fields

Every hook object has a `type`. There are three:

| `type` | What it does | Limits | Runs in |
|---|---|---|---|
| `command` (the default when `type` is omitted) | Runs a shell command or, with `exec`, an executable directly. The event JSON arrives on stdin; the hook may print one JSON decision on stdout. | None beyond the per-event rules in [§4.3](#43-event-catalogue). | Copilot CLI, the VS Code Copilot harness and the cloud agent. The cloud agent runs on Linux and honors only `bash` and `command` entries. |
| `http` | POSTs the event JSON to a URL; the JSON response body plays the role of stdout. | `https://` unless you opt out for local development (see the URL gates below). | Copilot CLI and the cloud agent, where the host must be allow-listed. |
| `prompt` | Auto-submits text, a prompt or a slash command, as if the user typed it. | `sessionStart` only, and only for new interactive sessions. | Copilot CLI. It does not fire on resume or in non-interactive `-p` mode, and a cloud agent job is non-interactive, so a `prompt` entry may not fire there. |

#### Command hooks (`"type": "command"`)

| Field | Type | Required | Behavior | Cite |
|---|---|---|---|---|
| `type` | `"command"` | No | Defaults to `"command"` when omitted. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `bash` | string | One of `bash`, `powershell` or `command`, unless `exec` is set | Shell command or script path for Unix. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `powershell` | string | One of `bash`, `powershell` or `command`, unless `exec` is set | Shell command or script path for Windows. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `command` | string | One of `bash`, `powershell` or `command`, unless `exec` is set | Cross-platform fallback, copied to both `bash` and `powershell` when those are absent. An explicit `bash` or `powershell` entry wins on its own platform. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `exec` | string | Instead of `bash`, `powershell` and `command` | Executable name or path, run directly **without a shell**. See the next subsection. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `args` | array of strings | No | Arguments passed straight to `exec`. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `cwd` | string | No | Working directory, relative to the repository root or absolute. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `env` | object | No | Extra environment variables (supports variable expansion). | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `timeoutSec` | number | No | Timeout in seconds. Default `30`. `timeout` is an alias, used only when `timeoutSec` is absent. | [command hooks](https://docs.github.com/en/copilot/reference/hooks-reference#command-hooks) |
| `matcher` | string (regex) | No | Filters which invocations fire the hook, on the events listed in [§4.6](#46-matchers). | [matcher filtering](https://docs.github.com/en/copilot/reference/hooks-reference#matcher-filtering) |

#### Shell-free `exec` + `args`

```json
{
  "type": "command",
  "exec": "node",
  "args": ["scripts/hooks/guard-env.mjs"],
  "timeoutSec": 5
}
```

- `exec` starts the executable **directly, without a shell**, and `args` are passed verbatim. Pipes, redirection, glob expansion and shell quoting do not apply, so there is no shell-quoting or injection surface and no `bash` versus `powershell` split. Do not combine `exec` with `bash`, `powershell` or `command`.
- `args` are command-line arguments, **not the event**: the event JSON still arrives on stdin ([VS Code agent hooks](https://code.visualstudio.com/docs/agent-customization/hooks#_configure-commands-and-event-data)).
- `exec` and `args` work in **Copilot CLI and in VS Code's Copilot harness**, which share one hook format. The cloud agent runs `bash` and `command` entries in its Linux sandbox and ignores `powershell` entries, so a hook file that must also run there needs a `command` or `bash` entry as well.
- `node` is the same command on every OS, which makes it the portable choice for `exec`. `python3` is often just `python` on Windows, so Python hooks usually need separate `bash` and `powershell` entries instead.

#### HTTP hooks (`"type": "http"`)

```json
{
  "version": 1,
  "hooks": {
    "postToolUse": [
      {
        "type": "http",
        "url": "https://hooks.example.com/copilot",
        "headers": { "X-Source": "copilot-cli" },
        "allowedEnvVars": ["GITHUB_TOKEN"],
        "timeoutSec": 30
      }
    ]
  }
}
```

| Field | Type | Required | Behavior | Cite |
|---|---|---|---|---|
| `type` | `"http"` | Yes | Must be `"http"`. | [HTTP hooks](https://docs.github.com/en/copilot/reference/hooks-reference#http-hooks) |
| `url` | string | Yes | Target URL, `http:` or `https:`. Only `https://` is accepted by default. For `preToolUse` and `permissionRequest` it must be `https://` because the response can grant tool permissions; the Copilot CLI documents the same rule for `preMcpToolCall`. | [HTTP hooks](https://docs.github.com/en/copilot/reference/hooks-reference#http-hooks) |
| `headers` | object | No | Request headers to include. | [HTTP hooks](https://docs.github.com/en/copilot/reference/hooks-reference#http-hooks) |
| `allowedEnvVars` | array of strings | No | Names of environment variables that may be expanded inside `headers` values, so a token can come from the environment instead of a committed file. When set, `url` must use `https://`. The reference shows the field but not a placeholder example: test the expansion against a throwaway endpoint before you trust it with a real token. | [HTTP hooks](https://docs.github.com/en/copilot/reference/hooks-reference#http-hooks) |
| `timeoutSec` | number | No | Timeout in seconds. Default `30`. `timeout` is an alias, used only when `timeoutSec` is absent. | [HTTP hooks](https://docs.github.com/en/copilot/reference/hooks-reference#http-hooks) |

Two environment variables, read by the Copilot CLI process, relax the URL rules. Use them for local development only, never in shared configuration:

| Variable | Effect |
|---|---|
| `COPILOT_HOOK_ALLOW_LOCALHOST=1` | Lets HTTP hooks post to `localhost` and other loopback addresses (`http://localhost`, `http://127.*`, `http://[::1]`), which are otherwise blocked. Plain `http://` is then also accepted for those addresses. |
| `COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1` | Lets `preToolUse`, `preMcpToolCall` and `permissionRequest` HTTP hooks use plain `http://` URLs. Without it those three events must use `https://`. |

- **Failure behavior.** HTTP `preToolUse` hooks are **fail-open**: a network error, a timeout or a non-2xx response falls through to the normal permission flow ([§4.4](#44-decisions-exit-codes-and-failure-semantics)).
- **Cloud agent.** A cloud agent job runs in an ephemeral Linux sandbox that is destroyed when the job ends, so files a hook writes are discarded. The cloud agent firewall reaches only GitHub and Copilot hosts by default, so any other destination needs an admin-configured allow rule. The reference's way to retain hook output is an `http` hook entry: treat `"type": "http"` as the **recommended built-in hook type** for persistent audit logs from ephemeral cloud agent jobs, once the destination host is admin-allowlisted. (A command hook that makes its own outbound request is subject to the same firewall.)

#### Prompt hooks (`"type": "prompt"`)

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [
      {
        "type": "prompt",
        "prompt": "YOUR_PROMPT_TEXT_OR_SLASH_COMMAND"
      }
    ]
  }
}
```

| Field | Type | Required | Behavior | Cite |
|---|---|---|---|---|
| `type` | `"prompt"` | Yes | Must be `"prompt"`. | [prompt hooks](https://docs.github.com/en/copilot/reference/hooks-reference#prompt-hooks) |
| `prompt` | string | Yes | Text to submit: a natural-language message or a slash command. | [prompt hooks](https://docs.github.com/en/copilot/reference/hooks-reference#prompt-hooks) |

A prompt hook is supported only on `sessionStart`, and only in Copilot CLI for **new interactive sessions**. It does not fire on resume or in non-interactive `-p` mode. Cloud agent jobs run non-interactively, so a `prompt` entry may not fire there; confirm in your environment before relying on it.

### 4.3 Event catalogue

Copilot defines **15** hook events: the 14 in the Hook events table of the [GitHub hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events), plus `preMcpToolCall`, which only the Copilot CLI's built-in documentation covers (`setting:hooks.preMcpToolCall`, listed under Capabilities > Hooks in `/config`). The first table says what each event is and what its output can do. The second says where each one fires and which source documents it. Rows run roughly in the order a session meets them.

![Illustrative diagram of the 15 hook events grouped by where they fire: Session (sessionStart, preCompact, notification, errorOccurred, sessionEnd), Turn and prompt (userPromptSubmitted, userPromptTransformed, agentStop), Subagent (subagentStart, subagentStop) and Tool execution (permissionRequest, preToolUse, preMcpToolCall, postToolUse, postToolUseFailure), with command and HTTP hook dispatch shown beside them.](./images/labs/hooks-lifecycle-15-events.svg)

*Figure: the grouping is this guide's teaching aid, not an official taxonomy. `preMcpToolCall` is marked as a CLI build setting because the hooks reference does not list it.*

| # | Event | PascalCase alias | Fires when | Input JSON payload (camelCase fields) | Output honored? |
|---|---|---|---|---|---|
| 1 | `sessionStart` | `SessionStart` | A new session begins or a saved session resumes. | `sessionId`, `timestamp`, `cwd`, `source` (`new` / `resume` / `startup`), `initialPrompt` | **Optional.** `additionalContext` is injected into the session; contributions from several hooks are joined with a blank line, bounded by the 10 MiB hook-output limit. A `"type": "prompt"` hook is also allowed on this event (§4.2). |
| 2 | `userPromptSubmitted` | `UserPromptSubmit` | The user submits a prompt. | `sessionId`, `timestamp`, `cwd`, `prompt` | **No** for command and HTTP hooks: their output, including `modifiedPrompt`, is dropped. `modifiedPrompt` is honored only by SDK programmatic hooks. |
| 3 | `userPromptTransformed` | none documented | After the runtime turns a submitted prompt into its model-facing content, just before that content is emitted and saved to history. Runs for the primary message and every preceding message of a batched submission; system notifications never trigger it. | `sessionId`, `timestamp`, `cwd`, `prompt`, `transformedPrompt` | **Yes, mutation only.** `modifiedTransformedPrompt` replaces the content the model receives; the timeline display is unchanged and the replacement is replayed on resume. It cannot block or handle the turn. |
| 4 | `permissionRequest` | `PermissionRequest` | Before the permission service runs: rules engine, session approvals, auto-allow and auto-deny, user prompting. Supports a `matcher` on `toolName`. | Not itemised in the reference. The matcher runs on `toolName`, and a request to escape the sandbox carries `requestSandboxBypass: true` in `toolInput`. | **Yes.** `behavior` (`allow` / `deny`), `message`, `interrupt`. Empty output or `{}` falls through to the normal permission flow; exit code `2` is a deny. An `allow` never pre-approves a sandbox-bypass request: only `deny` propagates. |
| 5 | `preToolUse` | `PreToolUse` | Before each tool executes. Supports a `matcher` on `toolName`. | `sessionId`, `timestamp`, `cwd`, `toolName`, `toolArgs` (typed `unknown`; this repo's hooks see a JSON-encoded string here and a parsed object in `postToolUse`, but a tool such as `apply_patch` sends its patch as plain text: see [§4.9](#49-writing-hooks-in-any-language)) | **Yes.** Emit `{"permissionDecision":"deny","permissionDecisionReason":"…"}` to block the call. `permissionDecision` also accepts `allow` and `ask`; empty output uses default behavior (the normal permission flow), and `ask` is treated as `deny` under the cloud agent and in CLI autopilot mode. `modifiedArgs` substitutes the tool arguments. Failure rules: §4.4. |
| 6 | `preMcpToolCall` | none documented | Before an MCP tool request is sent. | Not published: the event is not in the hooks reference. Log stdin with a throwaway hook before you rely on a field name. | Per the Copilot CLI documentation, a hook can adjust the request's metadata. HTTP hooks for this event must use `https://` unless `COPILOT_HOOK_ALLOW_HTTP_AUTH_HOOKS=1`. |
| 7 | `postToolUse` | `PostToolUse` | After each tool completes successfully. Supports a `matcher` on `toolName`. | `sessionId`, `timestamp`, `cwd`, `toolName`, `toolArgs`, `toolResult` (`resultType: "success"`, `textResultForLlm`) | **Yes.** `modifiedResult` (it must carry `resultType: "success"`) replaces the tool result; `additionalContext` is appended for the model (combined cap 10 KB). |
| 8 | `postToolUseFailure` | `PostToolUseFailure` | After a tool completes with a failure. | `sessionId`, `timestamp`, `cwd`, `toolName`, `toolArgs`, `error` | **Yes.** Recovery guidance through `additionalContext`; for a command hook, exit code `2` appends its stdout to the failure the agent sees. |
| 9 | `subagentStart` | none documented | A subagent is spawned, before it runs. The built-in `general-purpose` agent does not emit it. Supports a `matcher` on `agentName`. | `sessionId`, `timestamp`, `cwd`, `transcriptPath`, `agentName`, `agentDisplayName`, `agentDescription` | **Optional.** `additionalContext` is prepended to the subagent's first user message, accumulated the same way as for `sessionStart`. It cannot block creation. |
| 10 | `subagentStop` | `SubagentStop` | A subagent completes normally, before its result returns to the parent. The built-in `general-purpose` agent does not emit it. | `sessionId`, `timestamp`, `cwd`, `transcriptPath`, `agentId`, `agentType`, `agentName`, `agentDisplayName`, `response`, `stopReason` | **Yes.** `{"decision":"block","reason":"…"}` forces the subagent to continue; `modifiedResponse` rewrites or redacts what the parent sees. Subject to the 8-consecutive-block guard (§4.4). |
| 11 | `agentStop` | `Stop` | The main agent finishes a turn. | `sessionId`, `timestamp`, `cwd`, `transcriptPath`, `stopReason`, `stop_hook_active` | **Yes.** `{"decision":"block","reason":"…"}` forces another turn, with `reason` as the prompt. Subject to the 8-consecutive-block guard; `stop_hook_active` tells the hook this turn was already forced to continue (§4.4). |
| 12 | `preCompact` | `PreCompact` | Context compaction is about to begin, manual or automatic. Supports a `matcher` on `trigger`. | `sessionId`, `timestamp`, `cwd`, `transcriptPath`, `trigger` (`manual` / `auto`), `customInstructions` | **No.** A hook here only observes; it cannot block compaction. |
| 13 | `notification` | none documented | Asynchronously, when the CLI emits a system notification: `shell_completed`, `shell_detached_completed`, `agent_completed`, `agent_idle`, `permission_prompt` or `elicitation_dialog`. Fire-and-forget. Supports a `matcher` on `notification_type`. | `sessionId`, `timestamp`, `cwd`, `hook_event_name: "Notification"`, `message`, `title`, `notification_type` | **Optional.** `additionalContext` is injected as a user message and can start more agent work if the session is idle. It never blocks, and errors are logged and skipped. |
| 14 | `errorOccurred` | `ErrorOccurred` | An error occurs during execution. The reference lists four `errorContext` values (`model_call`, `tool_execution`, `system`, `user_input`); the Copilot CLI's own setting description says it runs when a model call fails. | `sessionId`, `timestamp`, `cwd`, `error` (`message`, `name`, `stack`), `errorContext`, `recoverable` | **No.** Logging and notification only. |
| 15 | `sessionEnd` | `SessionEnd` | The session terminates. `reason` is `complete`, `error`, `abort`, `timeout` or `user_exit`. In interactive mode `/clear` fires it for the old session with `user_exit`, dispatched detached so `/clear` returns immediately. | `sessionId`, `timestamp`, `cwd`, `reason` | **No.** Cleanup and logging only. |

Only 11 events document a PascalCase configuration alias: `SessionStart`, `UserPromptSubmit`, `PermissionRequest`, `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `SubagentStop`, `Stop` (for `agentStop`), `PreCompact`, `ErrorOccurred` and `SessionEnd`. `userPromptTransformed`, `preMcpToolCall`, `subagentStart` and `notification` have none. The `notification` payload still carries `hook_event_name: "Notification"`, but that is a payload value, not a configuration key.

| Event | Source | Copilot CLI | Cloud agent | VS Code (Copilot harness) |
|---|---|---|---|---|
| `sessionStart` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires once per job, as a new session (not a resume). | Named on the VS Code hooks page |
| `userPromptSubmitted` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires at most once per job, for the prompt the job was invoked with. | Named on the VS Code hooks page |
| `userPromptTransformed` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires. | Not named on that page; shared runtime, so verify |
| `permissionRequest` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Does not apply: tool calls are pre-approved, so it either does not fire or has no effect. Use `preToolUse` instead. | Not named on that page; shared runtime, so verify |
| `preToolUse` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires; a decision of `ask` is treated as `deny`. | Named on the VS Code hooks page |
| `preMcpToolCall` | Copilot CLI built-in docs: `setting:hooks.preMcpToolCall` and `topic:environment#environment-variables-4`. Not in the hooks reference table. | Yes | Not documented. | Not named on that page; shared runtime, so verify |
| `postToolUse` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires. | Named on the VS Code hooks page |
| `postToolUseFailure` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires. | Not named on that page; shared runtime, so verify |
| `subagentStart` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires. | Named on the VS Code hooks page |
| `subagentStop` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires. | Named on the VS Code hooks page |
| `agentStop` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires; `block` forces another turn, which still counts against the job's timeout. | Named on the VS Code hooks page |
| `preCompact` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires only with `trigger: "auto"`; there is no user to request a manual compaction. | Named on the VS Code hooks page |
| `notification` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Does not fire: the cloud agent surfaces no notifications to a user. | Not named on that page; shared runtime, so verify |
| `errorOccurred` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires. | Not named on that page; shared runtime, so verify |
| `sessionEnd` | [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) | Yes | Fires once per job; `reason` is typically `complete`, `error` or `timeout`. | Named on the VS Code hooks page |

The reference documents Copilot CLI and the cloud agent, and says every event it lists is supported by the CLI. The VS Code column records only what the [VS Code agent hooks page](https://code.visualstudio.com/docs/agent-customization/hooks#_events-and-payloads) names for the Copilot harness. The other events are not named there; the harness shares the CLI runtime, so confirm a hook fires in your session before relying on it.

> ⚠️ **Design implication.** An "approve-list" hook that emits `allow` for permitted tools and says nothing about the rest does not block the rest: empty output follows the normal permission flow, so an unlisted call gets a prompt, or runs unattended under `--allow-all-tools`. To block everything that is not explicitly permitted, emit `deny` for it (default-deny). Doing that with `deny` alone is a design choice — a hook that only denies can only narrow what a session may do — not a limitation of the runtime.

### 4.4 Decisions, exit codes and failure semantics

For most events a hook only observes: a non-zero exit (other than `2`) or a timeout is logged and skipped, and the session carries on. `preToolUse` is the exception, because a guard that cannot run must not silently approve work.

| Exit code | Meaning for a command hook |
|---|---|
| `0` | Success. Stdout is parsed as the hook output JSON if present. |
| `2` | A warning by default: stderr is shown and the run continues. For `preToolUse` and `permissionRequest`, exit `2` is a **deny**, even if stdout says `allow`. For `postToolUseFailure`, stdout is appended to the failure the agent sees. |
| Other non-zero | Logged as a hook failure and the run continues (fail-open), **except `preToolUse`, which is fail-closed**: the call is denied with `Denied by preToolUse hook (hook errored)`. |
| Timeout | The hook is killed after `timeoutSec`. Timeouts are **fail-open for every event**, including `preToolUse` and admin-deployed policy hooks: a warning is surfaced and processing continues as if the hook had not run. |

**`preToolUse`: command versus HTTP.** Pick the variant that matches your security requirement.

- **Command `preToolUse` hooks are fail-closed on non-zero exit codes.** A crash or any non-zero exit, including `2`, denies the tool call even if stdout printed `allow`. **Timeouts, and empty or unparseable stdout, fall through** (fail-open) to the normal permission flow.
- **HTTP `preToolUse` hooks fall through (fail-open)** to the normal permission flow on a network error, a timeout or a non-2xx response.

If an outage of a policy service must not silently allow everything, enforce the rule in a command hook, or in both.

Other rules:

- Several hooks on one event run in order. For `preToolUse`, if any hook returns `deny`, the tool call is blocked. All `permissionRequest` hooks run, and later outputs override earlier ones.
- When the model sends parallel tool calls, `preToolUse` hooks for different calls run concurrently. Hooks for a single call still run in order.
- **Stop hooks and the runaway guard.** Both `agentStop` and `subagentStop` accept `{"decision": "block", "reason": "…"}`: `block` forces another turn and uses `reason` as the prompt. After **8 consecutive** `block` continuations the CLI overrides the hook and ends the turn anyway, to prevent an unbounded loop. `stop_hook_active` is documented on the `agentStop` input: it is `true` when the turn was already forced to continue by a prior `block` from that hook, so a hook can self-limit before the cap. The shared-runtime `subagentStop` payload does not document `stop_hook_active` (VS Code's legacy Local harness does list it on its own `SubagentStop` payload).

### 4.5 Advanced outputs

A hook's output is one JSON object on stdout (or the HTTP response body). Unsupported fields are ignored, and output larger than 10 MiB per invocation is truncated. A wrong-typed override is ignored with a warning instead of corrupting the session: an empty-string override is rejected, and a `null` `additionalContext` is treated as absent.

| Event | Output fields | Effect |
|---|---|---|
| `preToolUse` | `permissionDecision` (`allow` / `deny` / `ask`), `permissionDecisionReason`, `modifiedArgs` | Decides whether the tool runs. `permissionDecisionReason` is required for `deny`. `modifiedArgs` substitutes the tool arguments. |
| `permissionRequest` | `behavior` (`allow` / `deny`), `message`, `interrupt` | Approves or denies before the permission service runs. `interrupt: true` with `deny` stops the agent entirely. |
| `postToolUse` | `modifiedResult`, `additionalContext` | `{"modifiedResult":{"resultType":"success","textResultForLlm":"…"}}` replaces the tool result. It is honored by SDK hooks and by command and HTTP config-file hooks, and `resultType` must be `success`. `additionalContext` is appended after the tool output on the same turn, joined with a blank line across hooks and **capped at 10 KB**. |
| `postToolUseFailure` | `additionalContext` | Recovery guidance for the agent. Command hooks can also use exit code `2`. |
| `sessionStart`, `subagentStart` | `additionalContext` | Accumulates across the matching hooks for that event, in execution order, joined by a blank line, up to the **10 MiB** hook-output limit. A contribution that would cross it is dropped and a warning is raised. |
| `notification` | `additionalContext` | Injected as a user message. Fire-and-forget. |
| `agentStop`, `subagentStop` | `decision`, `reason` | `{"decision":"block","reason":"…"}` forces another turn ([§4.4](#44-decisions-exit-codes-and-failure-semantics)). |
| `subagentStop` | `modifiedResponse` | Replaces the subagent's final response before the parent sees it, to redact or reformat it. A valid `block` wins over `modifiedResponse`. Rewrites do not chain: every hook sees the original `response`, and the last `modifiedResponse` wins. |
| `userPromptSubmitted` | `modifiedPrompt` | Honored only by SDK programmatic hooks; command and HTTP hooks have their output dropped. |
| `userPromptTransformed` | `modifiedTransformedPrompt` | Replaces the model-facing content. Mutation only. |

#### Live progress messages

A command hook can stream status lines to the CLI timeline while it works. Print a single-line JSON object with `"type": "progress"` before the final output:

```bash
echo '{"type": "progress", "message": "Checking policy...", "temporary": true}'
# ... do the work ...
echo '{"permissionDecision": "allow"}'
```

- `"temporary": true` makes the line transient: it replaces the previous transient line and clears when the assistant responds.
- Progress lines are display-only. The CLI removes every single-line `"type": "progress"` object from stdout, then parses whatever is left **once** as the hook output. Keep each progress object on its own line, and print exactly one final JSON object: two decision objects concatenate into invalid JSON, which falls through as "no output".

### 4.6 Matchers

Several events accept an optional `matcher` on the hook entry. It is a regular expression compiled as `^(?:PATTERN)$`, so it must match the **whole** value. An invalid regex skips the hook entry and the CLI prints `! Invalid hook configuration in FILE: REASON`. Omit `matcher` to match everything.

| Event | `matcher` is matched against |
|---|---|
| `preToolUse` | `toolName` |
| `postToolUse` | `toolName` |
| `permissionRequest` | `toolName` |
| `subagentStart` | `agentName` |
| `preCompact` | `trigger` (`manual` or `auto`) |
| `notification` | `notification_type` |

```json
{
  "type": "command",
  "matcher": "bash|edit",
  "bash": "./scripts/log-tool.sh"
}
```

Hooks configured with the PascalCase names `PreToolUse` and `PermissionRequest` use **Claude matcher semantics** instead: `*`, `**` or an empty `matcher` fires for every tool. A literal name or a `|`-separated list (`Bash`, `Edit|Write`) fires when any token equals the runtime tool name or its Claude tool name ([§4.7](#47-payload-formats-and-tool-names)). Any other value is a case-sensitive regex anchored as `^(?:PATTERN)$` and tested against the Claude tool name.

### 4.7 Payload formats and tool names

The **casing of the event name** in your configuration selects the payload your hook receives.

| Configured as | Field names | `timestamp` | Tool arguments |
|---|---|---|---|
| camelCase, for example `preToolUse` | camelCase: `sessionId`, `toolName`, `toolArgs` | Epoch milliseconds (a number) | `toolArgs` |
| PascalCase, for example `PreToolUse` | VS Code compatible snake_case plus `hook_event_name`: `session_id`, `tool_name`, `tool_input` | ISO 8601 string | `tool_input`, parsed from a JSON string when possible |

camelCase `preToolUse`:

```json
{ "sessionId": "abc", "timestamp": 1777341117296, "cwd": "/repo", "toolName": "bash", "toolArgs": "{\"command\":\"ls\"}" }
```

PascalCase `PreToolUse`:

```json
{ "hook_event_name": "PreToolUse", "session_id": "abc", "timestamp": "2026-11-12T19:16:32.336Z", "cwd": "/repo", "tool_name": "Bash", "tool_input": { "command": "ls" } }
```

Use a PascalCase name only for the 11 events that document an alias ([§4.3](#43-event-catalogue)). Payloads for PascalCase `PreToolUse` report Claude tool names, so `tool_name` is `Bash`, not `bash`:

| Runtime tool | Claude tool name |
|---|---|
| `bash`, `powershell` | `Bash` |
| `view` | `Read` |
| `create` | `Write` |
| `edit`, `str_replace_editor`, `apply_patch` | `Edit` |
| `grep`, `rg` | `Grep` |
| `glob` | `Glob` |
| `web_fetch` | `WebFetch` |
| `web_search` | `WebSearch` |
| `ask_user` | `AskUserQuestion` |
| `update_todo` | `TodoWrite` |
| `task` | `Agent` (the literal `Task` is also accepted) |

Tools with no Claude equivalent keep their runtime names. Hooks that fire inside a subagent carry three extra fields: `agentId`, `agentType` and `parentAgentId` (`agent_id`, `agent_type` and `parent_agent_id` in the snake_case format). The CLI also runs hooks written under Claude Code event names (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SessionStart`) and reads a repository's `.claude/settings.json` for them.

### 4.8 Agent-scoped hooks

Declare a `hooks` event map in a custom agent's frontmatter to run command or HTTP hooks **only while that agent is selected**. They run in addition to session, user, repository, plugin and policy hooks.

```yaml
---
name: formatter
description: Formats changed files
hooks:
  PostToolUse:
    - type: command
      command: ./scripts/format-changed-files.sh
      windows: ./scripts/format-changed-files.ps1
---
Format the files you change.
```

| Behavior | Details |
|---|---|
| Event names | Runtime names such as `postToolUse` and aliases such as `PostToolUse` are accepted. |
| Commands | `command` is the fallback; `windows`, `linux` and `osx` override it per platform. Paths resolve from the repository root. |
| Subagents | A subagent's scoped `Stop` (`agentStop`) hooks run at `SubagentStop`. After eight consecutive scoped blocks, further blocks are ignored. |
| Trust | Repository and inherited-agent hooks need workspace admission. Hook-disable settings, enterprise restrictions and timeouts still apply. |
| Not supported | Remote or organization-hosted agent definitions do not run scoped hooks. |
| Surfaces | The GitHub reference lists agent-scoped hooks under Copilot CLI. The VS Code page documents them for the Copilot harness too: VS Code keeps the `hooks` field when it converts custom agents for Copilot and validates its structure, but a clean validation does not prove the hooks ran, so test in a trusted session. |

### 4.9 Writing hooks in any language

The IPC contract is language-neutral: **JSON on stdin, at most one JSON object on stdout, and an exit code**. A hook can be Node.js, Python, Bash, PowerShell, Ruby, or a compiled Go or Rust binary. A shell-free `exec` entry ([§4.2](#42-hook-object-fields)) is the most portable way to launch an interpreter, and a Node script needs no `jq`. Treat tool arguments as untrusted input: validate them, and never interpolate them into a shell command, which is one more reason to prefer `exec` with `args`. Do not assume the shape of `toolArgs` either: the reference types it `unknown`, so it can be a JSON-encoded string of an object, an object that is already parsed, or plain text (`apply_patch` sends its patch itself, which is not JSON). Check the tool name first, parse defensively, and treat arguments you cannot read as "no opinion": a crash in a command `preToolUse` hook is a deny ([§4.4](#44-decisions-exit-codes-and-failure-semantics)). [Lab 06 §6.2.2](../labs/lab06.md#622-polyglot-hooks-shell-free-exec-and-calling-external-services-type-http) shows the same guard in Node.js, Python, Bash and PowerShell, plus an HTTP hook.

**Sources:** https://docs.github.com/en/copilot/reference/hooks-reference, https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks, https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks, https://code.visualstudio.com/docs/agent-customization/hooks, and the Copilot CLI built-in documentation (`setting:hooks.*`, `setting:disableAllHooks`, `setting:disabledHooks`, `topic:environment#environment-variables-4`, `topic:config#claude-code-plugins-skills-hooks-and-settings`)

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

**Two layers of `deny`, no implicit allow.** A tool call succeeds only if it is *exposed by layer 1* **and** *permitted by layer 2*. Removing a tool from either layer blocks the call. This is the deterministic-control story: scope at the MCP config for coarse, repo-wide boundaries; scope at the agent/skill frontmatter for fine, per-role boundaries; layer a default-deny `preToolUse` hook (§4) on top of both layers for additional defense-in-depth.

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
| 10 | `preToolUse` hooks support `allow` / `deny` / `ask` | ⚠️ Accurate, with caveats: all three are documented `permissionDecision` values, but `ask` is treated as `deny` under the cloud agent and in CLI autopilot mode, and empty output follows the normal permission flow. This repo's hooks emit only `deny` by design (a default-deny blast-radius choice), not because `allow` / `ask` are unsupported. | §4 |
| 11 | A non-zero exit from any hook is ignored | ❌ Command `preToolUse` hooks are fail-closed: a crash or non-zero exit (including `2`) denies the call, even if stdout said `allow`. Timeouts are fail-open. | §4.4 |
| 12 | Shell-free `exec` + `args` is a Copilot CLI-only form | ❌ It is part of the shared Copilot hook format, so it works in VS Code's Copilot harness as well as the CLI (even though the GitHub `hooks-reference` CLI-vs-Cloud field table says "Only supported in Copilot CLI", VS Code's Agent Hooks page explicitly supports it for the Copilot harness). The cloud agent runs `bash` / `command` entries instead. | §4.2 |
| 13 | An `http` hook is required to keep cloud agent hook logs | ⚠️ `"type": "http"` is the recommended built-in hook type, once the destination host is admin-allowlisted. A command hook that makes its own outbound request is subject to the same firewall. | §4.2 |
| 14 | Hooks fire on five events: `sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred` | ❌ There are 15 events. | §4.3 |
| 15 | Every hook event has a PascalCase alias | ⚠️ Only 11 document one. `userPromptTransformed`, `preMcpToolCall`, `subagentStart` and `notification` have none. | §4.3 |
| 16 | Command and HTTP `preToolUse` hooks fail the same way | ❌ Command hooks are fail-closed on a non-zero exit. HTTP hooks are fail-open on a network error, a timeout or a non-2xx response. | §4.4 |
| 17 | `stop_hook_active` is on every stop payload | ⚠️ It is documented on the `agentStop` input. The shared-runtime `subagentStop` payload does not list it. Both stop events share the 8-consecutive-block guard. | §4.4 |

**Sources:** https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference, https://docs.github.com/en/copilot/reference/customization-cheat-sheet, https://docs.github.com/en/copilot/reference/hooks-reference, https://code.visualstudio.com/docs/agent-customization/hooks
