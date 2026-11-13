# Debugging and observability for GitHub Copilot

> **Verified 2026-11-12** against the VS Code pages [Debug chat interactions](https://code.visualstudio.com/docs/agents/agent-troubleshooting/chat-debug-view), [Troubleshoot AI in VS Code](https://code.visualstudio.com/docs/agents/agent-troubleshooting/troubleshooting) and [Agent hooks](https://code.visualstudio.com/docs/agent-customization/hooks), the VS Code 1.111 release notes, and the Copilot CLI built-in documentation (build 1.0.110-3). [Section 8](#8-sources-and-verification) lists every source and marks what was **observed** on a running CLI instead of read from documentation. The Agent Debug Logs panel in VS Code is in Preview, so re-check a menu name or a setting there before you rely on it.

When Copilot does something you did not expect, look at what it received and what it did before you rewrite a prompt. This guide covers four ways to look:

1. **VS Code**: the Agent Debug Logs panel and the Chat Debug view ([section 2](#2-vs-code-agent-debug-logs-and-the-chat-debug-view)).
2. **Copilot CLI session data**: the files each session leaves on disk, and the process logs ([section 3](#3-copilot-cli-session-data-and-logs)).
3. **Copilot itself**: `/diagnose`, `/collect-debug-logs` and the `session_store_sql` tool ([section 4](#4-use-copilot-to-understand-a-session)).
4. **OpenTelemetry**: traces and metrics from the CLI ([section 5](#5-opentelemetry)).

Labs 01 to 07 each carry a short **🔍 Debug It** callout that points here. The hands-on walkthrough is in [Lab 06, section 6.4.1](../labs/lab06.md#641-debugging-and-observability-see-what-copilot-did).

## 1. Pick the right tool

Three questions look alike and need different tools: was the file **discovered**, was its text **included** in the request, and did the model **follow** it? Answer them in that order, because each one rules out a cause.

| Question | In VS Code | In Copilot CLI |
|---|---|---|
| What happened, and in what order? | Logs view in the Agent Debug Logs panel ([2.2](#22-open-the-agent-debug-logs-panel)) | `events.jsonl` in the session folder ([3.2](#32-read-eventsjsonl)); `/tasks` for subagents and background shells |
| Did my instruction, agent, skill, hook or MCP server load? | **Chat: Open Customizations** and the Discovery events ([2.2](#22-open-the-agent-debug-logs-panel), [2.5](#25-output-channels-and-other-checks)) | `/env`, `/instructions`, `/skills list` and `/mcp list` ([3.4](#34-inspect-a-live-session)) |
| What did the model actually receive? | Chat Debug view: **System prompt**, **Context**, **Tool responses** ([2.3](#23-open-the-chat-debug-view)) | `/context` for the size of each part; OpenTelemetry content capture for the text itself ([5.3](#53-capture-prompts-and-tool-arguments)) |
| How many tokens did it use, and how long did it take? | Summary view ([2.2](#22-open-the-agent-debug-logs-panel)) | `/usage` and `/context`; OpenTelemetry metrics ([5](#5-opentelemetry)) |
| Which agent delegated to which? | Agent Flow Chart ([2.2](#22-open-the-agent-debug-logs-panel)) | `/tasks`; the span tree ([5.2](#52-read-the-file)) |
| Why was I asked to approve that? | none documented | `/diagnose` ([4.1](#41-diagnose)) |
| Can Copilot explain what happened? | `#debugEventsSnapshot` or `/troubleshoot` ([2.4](#24-ask-copilot-about-the-captured-events)) | `/diagnose`, or ask it to query `session_store_sql` ([4](#4-use-copilot-to-understand-a-session)) |
| I have to send evidence to someone | **Export** an OTLP JSON file ([2.2](#22-open-the-agent-debug-logs-panel)) | `/collect-debug-logs` ([4.2](#42-collect-debug-logs)) |

## 2. VS Code: Agent Debug Logs and the Chat Debug view

### 2.1 Turn capture on before you reproduce

Capture is not retroactive, so turn it on first and then repeat the activity you want to inspect. The setting you need depends on the harness the session uses. In the editor, the active harness is shown as a prefix in the chat title.

| Session type | Setting | What else to do |
|---|---|---|
| Sessions managed by the Agent Host, which is how the **Copilot harness** runs, in the Chat view or the Agents window | `chat.agentHost.agentDebugLog.enabled` | Enable it **before** the activity you want to inspect |
| **Local harness** sessions | `github.copilot.chat.agentDebugLog.fileLogging.enabled` | Reload the editor window before you use `/troubleshoot` |

Both settings are experimental. Set them in the Settings editor, or in `settings.json`:

```jsonc
{
  "chat.agentHost.agentDebugLog.enabled": true,
  // Only if you still use the Local harness:
  "github.copilot.chat.agentDebugLog.fileLogging.enabled": true
}
```

VS Code documents the Local harness as deprecated, with removal planned by February 2027, so a new setup usually needs only the first setting.

> ⚠️ Debug views and exported logs can contain prompts, source code, file paths and tool inputs and outputs. Read [section 7](#7-before-you-share-anything) before you share any of it.

### 2.2 Open the Agent Debug Logs panel

Open the panel from the Chat view's **...** menu with **Show Agent Debug Logs**, or run **Developer: Open Agent Debug Logs** from the Command Palette. It lists current and past sessions, and persisted logs are stored locally.

| View | Use it to | How to open it |
|---|---|---|
| **Logs view** | See what happened and in what order. Each event has a timestamp, a type and a summary. Expand one to read the system prompt of a model request, or the input and output of a tool call. Switch between a flat list and a tree grouped by subagent. Filters cover model requests, tool calls, **Discovery** (was a customization loaded, skipped or rejected) and errors | It opens with the panel |
| **Summary view** | Read tool calls, token usage, errors and total duration, then decide where to look next | Select the session description in the breadcrumb at the top of the panel. From the Summary view you can open **View Logs**, **Agent Flow Chart** or **Cache Explorer** |
| **Agent Flow Chart** | See the sequence of interactions between agents and subagents: which agent delegated an action, and where the workflow stopped. Pan, zoom, and select a node to inspect its event | Summary view, then **Agent Flow Chart** |
| **Cache Explorer** | Compare consecutive model requests and find the first point where they differ. Use it only after the Summary view reports low cache reuse together with unexpected duration or input token usage | Summary view, then **Cache Explorer** |

To keep a session, select the **Export** icon in the upper-right toolbar and save an OpenTelemetry JSON file in OTLP format. The **Import** icon opens a saved file in the Summary and Logs views. This is a separate path from the CLI's OpenTelemetry exporter in [section 5](#5-opentelemetry). Review an exported file before you share it.

### 2.3 Open the Chat Debug view

Open it from the Chat view's overflow menu with **Show Chat Debug View**, or run **Developer: Show Chat Debug View**. It shows the request and the response for each model interaction, so you can check which instructions, context, messages and tool definitions reached the model.

| Section | What it shows | What to check |
|---|---|---|
| **System prompt** | The instructions that define the model's behavior, capabilities and constraints | Expected custom instructions and agent definitions appear. Where request details are available, this is the place to look for instruction text |
| **User prompt** | The prompt sent to the model | The prompt text and resolved references are present |
| **Context** | Files, symbols and other attached context | The context the task needs is present and relevant |
| **Response** | The response returned by the model | Whether the model returned complete content or an error |
| **Tool responses** | Inputs and outputs for tools invoked during the request | Each tool received the expected input and returned a usable result |

Three scenarios from the VS Code page show how the views fit together:

- **The AI ignores workspace files.** Open **Context** for that request. If the file is missing, add it as explicit chat context, repeat the request, and look again.
- **An MCP tool is not being invoked.** Run **MCP: List Servers** and confirm the server is running. Then check whether the tool appears in the tool definitions in the Chat Debug view. If it does, look for tool calls and errors in the Agent Debug Logs, and name the tool in your prompt.
- **Instructions or a prompt file are not applied.** Check discovery first, then inclusion, then adherence. Open the **Discovery** events to see whether the file was loaded, skipped or rejected. Then look for its text in the **System prompt** or **User prompt**. If the text reached the model and the result still ignores it, look for conflicting or unclear guidance.

**Verify the diagnosis.** Change one condition, repeat a comparable request, inspect the same event or section, and confirm that both the evidence and the result changed. If the evidence does not change, restore the old configuration and try the next likely cause.

### 2.4 Ask Copilot about the captured events

You can hand the captured events to chat and ask a focused question about token usage, loaded customizations, tool calls, errors or duration.

1. **Sparkle icon.** In the Logs view of the session, select the sparkle icon in the upper-right corner of the Agent Debug Logs panel. It attaches a snapshot of the current session events to the chat composer.
2. **`#debugEventsSnapshot`.** Type `#debugEventsSnapshot` in the chat input to attach the same snapshot yourself, then add the question, for example `#debugEventsSnapshot which customization files were loaded?`. The variable was added in VS Code 1.111.
3. **`/troubleshoot <question>`.** Enter `/troubleshoot` followed by a question, for example `/troubleshoot Which customizations were loaded, and did any fail?`. For a session in the Agents window, enter `/troubleshoot #session`, select the session, and then add your question.

For Local harness sessions, reload the editor window after you enable the file logging setting and before you use `/troubleshoot`.

### 2.5 Output channels and other checks

- **GitHub Copilot Chat** is the general Output channel for the extension: connection failures, extension errors and other runtime information. Open the Output panel with `Ctrl+Shift+U` on Windows, `Cmd+Shift+U` on macOS or `Ctrl+K Ctrl+H` on Linux, and switch channels with the dropdown on the right. **GitHub Copilot** is the neighbouring channel. To see more detail, run **Developer: Set Log Level**, set both Copilot extensions to **Trace**, reproduce the problem, and then set the levels back.
- **GitHub Copilot Chat Hooks** belongs to the legacy Local hook setup. It shows that setup's command errors, and **Chat: Configure Hooks** lists its files. For hooks in a Copilot harness session, use the Agent Debug Logs.
- **MCP: List Servers** shows each server's status. Select a server, then **Show Output** to read its errors or **Restart Server** to try again.
- **Chat: Open Customizations** lists customizations by type. Select **Instructions** to see each file's source, its location and any error VS Code reported.
- **GitHub Copilot: Chat Diagnostics** runs connectivity checks when Copilot cannot connect or sign in.

## 3. Copilot CLI: session data and logs

### 3.1 Where a session lives

Every local session is a folder at `~/.copilot/session-state/<session-id>/`, or under `$COPILOT_HOME` when that variable is set.

| Path | What it holds |
|---|---|
| `events.jsonl` | The session's chronological event log |
| `workspace.yaml` | Session metadata, such as `id`, `cwd`, `repository`, `branch`, `created_at` and `updated_at` |
| `plan.md` | The session plan. It is created when the session uses plans |
| `session.db` | The SQLite database behind the agent's `sql` tool: the `todos` and `todo_deps` tables, plus any tables the agent adds. It is created when the session uses the `sql` tool |
| `checkpoints/` and `files/` | The session's checkpoints and files. List them with `/session checkpoints` and `/session files` |

`~/.copilot/session-store.db` is not inside a session folder. It is an index of local sessions that the CLI uses to search and list them. Its `sessions` table holds each session's `summary`; `summary` is not in `workspace.yaml`.

These files are not encrypted. `--secret-env-vars` keeps variables out of shells, but a value that reaches a tool result is saved in the history.

To find the folder for the session you are in, type `/session id` inside a running `copilot` session: it shows and copies the current session ID, and `/session info` shows the session's details. Without a session open, the most recently modified folder is usually the one you want, unless several sessions are running. Sessions are kept until you delete them (`/session cleanup`, `/session prune --older-than <days>` and `/session delete <id> --yes`).

### 3.2 Read events.jsonl

The CLI documentation names this file but does not publish its schema, so what follows is **observed** on the builds this guide was checked against ([section 8](#8-sources-and-verification)). Every line was one JSON object with `type`, `data`, `id`, `timestamp` and `parentId`. Field names can change between releases, so use this as a guide, not a contract.

| `type` | What it records | `data` fields seen |
|---|---|---|
| `session.start`, `session.shutdown` | The session's start and end | `sessionId`; usage totals on shutdown |
| `user.message` | A prompt you sent | `content` |
| `assistant.message` | A model reply | `content`, `model`, `toolRequests` |
| `tool.execution_start`, `tool.execution_complete` | A tool call and its outcome | `toolName`, `arguments`; `success`, `result` |
| `hook.start`, `hook.end` | A hook starting and finishing | `hookType`, `input`; `hookType`, `success` |
| `subagent.selected` | An agent chosen to run | `agentName`, `tools` |
| `session.usage_record` | Usage accounting | `usage` |

Count a session's records by type:

```powershell
# Count the records in a session by type (point $events at your session folder)
$events = Join-Path $HOME '.copilot/session-state/<session-id>/events.jsonl'
Get-Content $events | ForEach-Object { ($_ | ConvertFrom-Json).type } | Group-Object | Sort-Object Count -Descending | Select-Object Count, Name
```

```bash
# Count the records in a session by type (point EVENTS at your session folder)
EVENTS=~/.copilot/session-state/<session-id>/events.jsonl
jq -r '.type' "$EVENTS" | sort | uniq -c | sort -rn
```

List the hooks that ended unsuccessfully:

```powershell
# Which hooks failed (point $events at your session folder)
$events = Join-Path $HOME '.copilot/session-state/<session-id>/events.jsonl'
Get-Content $events | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.type -eq 'hook.end' -and $_.data.success -eq $false } | ForEach-Object { $_.data.hookType }
```

```bash
# Which hooks failed (point EVENTS at your session folder)
EVENTS=~/.copilot/session-state/<session-id>/events.jsonl
jq -r 'select(.type=="hook.end" and .data.success==false) | .data.hookType' "$EVENTS"
```

Lines in this file can be very long and hold full prompts and tool output. Read what you are about to share ([section 7](#7-before-you-share-anything)).

### 3.3 Process logs

Process logs are separate from the session folder. By default each run writes `~/.copilot/logs/process-<timestamp>-<pid>.log`, and the CLI deletes logs older than 7 days and all but the newest 50. `--log-dir` writes them somewhere else:

```bash
copilot --log-level debug --log-dir ./logs
```

This repository's `.gitignore` ignores `*.log`, which covers the process logs, so they are not committed by accident. It has no rule for the folder itself, so a file you save there under another name is not ignored.

| `--log-level` | What it logs |
|---|---|
| `none` | Nothing |
| `error` | Errors only |
| `warning` | Errors and warnings |
| `info` | Errors, warnings and info |
| `debug` | Everything, including debug messages |
| `all` | The same as `debug` |
| `default` | The same as `info` |

You can also set `logLevel` in `settings.json` (`all` gives debug logging) or under **Maintenance > Logging** in `/config`. This level is the CLI's own. OpenTelemetry has a separate `OTEL_LOG_LEVEL` ([5.4](#54-exporter-protocol-and-diagnostics)).

Observed: a local MCP server whose command could not be started was logged as a warning, `MCP server connection failed`, with the server's name and the reason, so it showed up at the default level and not only in a debug log.

### 3.4 Inspect a live session

Type these inside a running `copilot` session.

| Command | What it shows |
|---|---|
| `/env` | The environment the session loaded: instructions, MCP servers, skills, agents, hooks, plugins, LSPs and extensions |
| `/instructions` | The custom instruction files, which you can switch on and off |
| `/context` | Token use in the context window for the current model, split into System Prompt, Custom Instructions, System Tools, MCP Tools, Messages, Free Space and Buffer (room reserved for the reply and for compaction). Experimental mode adds usage per skill, subagent, MCP server, tool and plugin, and the largest messages |
| `/usage` | Session usage metrics and statistics |
| `/tasks` | Running subagents and background shell commands: their status, live transcript or recent output |
| `/mcp list`, `/mcp get <server-name>`, `/mcp reload` | Each server's status (connected, connecting, `failed: <reason>`, disabled, stopped or not connected); one server's details and tools; a re-read of the configuration with a restart of the servers |
| `/skills list` | The skills the session discovered |
| `/session id`, `/session info` | The current session ID, and the session's details |

**Experimental mode.** `/experimental` lists what it adds. Turn it on with `/settings experimental on`, or start `copilot --experimental`, which also saves it. It takes effect after a restart, and preview features can change or be removed.

At your shell prompt, `copilot mcp list` and `copilot mcp get <name>` show configuration, not live status. `--usage-output-file <path>` writes the final usage statistics as JSON when a session ends.

## 4. Use Copilot to understand a session

You do not have to read the logs yourself. Three tools let Copilot do it.

### 4.1 /diagnose

`/diagnose [prompt]` analyzes the current session's logs, including why a permission request needed approval, to help you troubleshoot. It is a built-in slash command, so type it inside a running `copilot` session. Run it alone for a general look, or add a question:

```text
/diagnose
/diagnose Why did the last edit ask me for approval?
```

The documentation describes it in one line, so compare its answer with the evidence in [3.2](#32-read-eventsjsonl) when the answer matters.

### 4.2 /collect-debug-logs

`/collect-debug-logs` collects debug logs to a local `.tgz` file, shares them with GitHub after you consent, or creates a secret GitHub gist. The documented usage is:

```text
/collect-debug-logs [file [path]|share [path]|session [file [path]|gist|share [path]|<path>]|gist|<path>]
```

Choose the local file when you only want to keep the evidence. This repository's `.gitignore` already ignores `*.tgz`. Debug logs can contain prompts, source code, file paths and tool output, so review a bundle before you send it anywhere ([section 7](#7-before-you-share-anything)).

`/feedback` is the related command for reporting a bug: it saves logs locally as `copilot-feedback-<session-id>.tgz`, with secrets redacted, and does not upload them. You attach the file yourself.

### 4.3 Query your history with session_store_sql

Copilot can query its own history with the `session_store_sql` tool. You do not call it yourself; ask in plain language:

- `Using session_store_sql, which tools failed in my sessions this week?`
- `Using session_store_sql, show my five most recent sessions with their summaries.`

The tool reads one of two stores, and they are not the same thing:

| Store | How to choose it | Tables or views |
|---|---|---|
| Cloud (the default) | Leave `source` out | The materialized views `sessions`, `turns`, `checkpoints`, `session_files`, `session_refs`, `session_usage`, `tool_executions` and `events` |
| Local SQLite | `source: "local"` | The tables `sessions`, `turns`, `checkpoints`, `session_files`, `session_refs` and `search_index`, in `~/.copilot/session-store.db` |

The local store has no `session_usage`, `tool_executions` or `events` table, so a question about token totals or tool failures has to go to the cloud store. The two stores also speak different SQL: the cloud store takes DuckDB, the local store SQLite. A DuckDB-only expression such as `INTERVAL '7 days'` fails against the local store with a syntax error. This is what the agent runs for the two examples above, so you can see what it is doing:

```sql
-- Cloud store (DuckDB): which tools failed in the last 7 days?
SELECT tool_name, error_code, COUNT(*) AS failures
FROM tool_executions
WHERE success = false AND started_at > now() - INTERVAL '7 days'
GROUP BY tool_name, error_code
ORDER BY failures DESC;
```

```sql
-- Local store (SQLite, source: "local"): recent sessions that mention hooks
SELECT s.id, s.summary, s.created_at
FROM sessions s
WHERE s.id IN (SELECT DISTINCT session_id FROM search_index WHERE search_index MATCH 'hook')
ORDER BY s.created_at DESC
LIMIT 5;
```

This repository's [`/cost-check` skill](../.github/skills/cost-check/SKILL.md) is another use of the tool. The CLI also has `/chronicle` ("Session history tools and insights") with the subcommands `standup`, `search`, `tips`, `cost-tips`, `improve` and `reindex`; this guide does not cover it.

## 5. OpenTelemetry

The Copilot CLI can export traces and metrics through OpenTelemetry (OTel): agent interactions, model calls, tool executions and token usage. Names follow the OTel GenAI semantic conventions, so the data works with any OTel-compatible backend, such as Jaeger, Grafana, Azure Monitor, Datadog, Honeycomb or Langfuse. OTel is off by default, and while it is off nothing is initialized.

### 5.1 Turn it on

OTel switches on when any one of these is set:

| Set | Effect |
|---|---|
| `COPILOT_OTEL_ENABLED=true` | Turns OTel on explicitly (the default is `false`). The exporter defaults to `otlp-http` |
| `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` | Turns OTel on and auto-enables the `otlp-http` exporter, which sends to a collector at that URL |
| `COPILOT_OTEL_FILE_EXPORTER_PATH=./copilot-otel.jsonl` | Turns OTel on and auto-enables the `file` exporter, which writes JSON-lines to that path. There is no collector to run |

The file exporter is the quickest way to try it:

```bash
# Bash: the variable applies to this one run of copilot
COPILOT_OTEL_FILE_EXPORTER_PATH=./copilot-otel.jsonl copilot
```

```powershell
# PowerShell: the variable lasts until you remove it
$env:COPILOT_OTEL_FILE_EXPORTER_PATH = './copilot-otel.jsonl'
copilot
Remove-Item Env:COPILOT_OTEL_FILE_EXPORTER_PATH
```

A relative path is relative to the folder you start `copilot` in. In this repository `copilot-otel.jsonl` is **not** git-ignored (the `.gitignore` has rules for `*.log` and `*.tgz`, not for `*.jsonl`), so a stray `git add .` would pick it up. Write the file outside the repository, as Lab 06 does, or delete it when you are done. With content capture on ([5.3](#53-capture-prompts-and-tool-arguments)) it can hold your prompts and code.

To send traces to a collector instead, set `OTEL_EXPORTER_OTLP_ENDPOINT` and run any OTLP/HTTP collector there. The CLI documentation names Jaeger as an example; this guide does not set one up.

### 5.2 Read the file

The CLI documents the span tree it writes for each agent interaction:

```text
invoke_agent                  Agent orchestration (all LLM calls and tool executions)
  plan                        Plan-mode task decomposition (plan mode only)
    chat <model>              LLM calls used to generate the plan
    execute_tool <tool>       Tool calls used while planning
  chat <model>                One LLM API call
  execute_tool <tool>         One tool invocation
```

Spans carry attributes such as the model name, token counts, durations, costs and error information. Subagent invocations are linked into the same trace through context propagation. The metrics include `gen_ai.client.operation.duration`, `gen_ai.client.inference.usage.input_tokens`, `gen_ai.client.inference.usage.output_tokens`, `gen_ai.invoke_agent.tool_calls` and `gen_ai.execute_tool.duration`.

The documentation does not describe the record format of the file, so this part is **observed** on the builds this guide was checked against:

- **The file.** Each line is one JSON object whose `type` is `span` or `metric`. A span record has `traceId`, `spanId`, `parentSpanId`, `name`, `startTime`, `endTime`, `attributes`, `events` and more. Spans are written as they finish, so a child comes before its parent; follow `parentSpanId` to rebuild the tree. A second run with the same path **appends** to the file instead of replacing it, so delete the file between runs when you want to read one run. Spans outside the tree above can appear too: a `permission` span was recorded as its own trace.
- **One tool call.** A prompt that used one shell command produced an `invoke_agent` span with two `chat <model>` children and one `execute_tool <tool>` child. The tool span's name also included the shell's executable.
- **Delegation.** A run that delegated to a subagent was a single trace: an `execute_tool task` span had a child `invoke_agent explore`, which held its own `chat <model>` and `execute_tool <tool>` spans. `explore` is a built-in agent; a custom agent was not tried.
- **Useful attributes.** `chat` spans carry `gen_ai.request.model`, `gen_ai.usage.input_tokens` and `gen_ai.usage.output_tokens`. `execute_tool` spans carry `gen_ai.tool.name`, and `process.exit.code` for shell commands. The `invoke_agent` span carries `github.copilot.context.skills`, `github.copilot.context.custom_agent_names` and `github.copilot.context.mcp_server_names`, each a string that lists names.
- **Hooks and MCP servers.** Hook activity is recorded as span events on `invoke_agent`: `github.copilot.hook.start` and `github.copilot.hook.end`, with `github.copilot.hook.type`, and on the end event `github.copilot.hook.decision` and `github.copilot.hook.duration`. MCP server start-up appears as `github.copilot.mcp.server.lifecycle`.

List the span names in file order:

```powershell
# Span names, in file order (point $otel at your file)
$otel = './copilot-otel.jsonl'
Get-Content $otel | ForEach-Object { $_ | ConvertFrom-Json } | Where-Object { $_.type -eq 'span' } | ForEach-Object { $_.name }
```

```bash
# Span names, in file order (point OTEL at your file)
OTEL=./copilot-otel.jsonl
jq -r 'select(.type=="span") | .name' "$OTEL"
```

[Lab 06, section 6.4.1](../labs/lab06.md#641-debugging-and-observability-see-what-copilot-did) adds a one-liner that counts hook events by type.

### 5.3 Capture prompts and tool arguments

By default OTel records metadata only: no prompt content, no responses and no tool arguments. Opt in with `OTEL_INSTRUMENTATION_GENAI_CAPTURE_CONTENT=SPAN_ONLY`. Content capture adds:

- full prompt and response messages;
- system instructions (tool definitions keep their own separate opt-in);
- tool call arguments and results;
- the effective sandbox filesystem rules: the workspace, user-profile and denied paths granted to sandboxed commands;
- sandbox decision commands, denied resources and executable basenames.

| Value | Effect |
|---|---|
| `NO_CONTENT` (the default) | Metadata only |
| `SPAN_ONLY` | Adds the content above to spans |
| `SPAN_AND_EVENT` | Also enables span content capture, because separate content events are not exported |
| `EVENT_ONLY` | Span content stays off |

Values are case-insensitive. `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` is a legacy boolean that applies only when the standard variable is empty or unset.

> ⚠️ Content capture may include sensitive information such as code, file contents and user prompts. Turn it on only in trusted environments, and treat the output file like a credential.

Observed: for the same one-tool prompt, `SPAN_ONLY` made the file about eight times larger (28 KB became 241 KB). It added `gen_ai.input.messages`, `gen_ai.output.messages` and `gen_ai.system_instructions` to the `chat` and `invoke_agent` spans, and `gen_ai.tool.call.arguments` and `gen_ai.tool.call.result` to the `execute_tool` span.

### 5.4 Exporter, protocol and diagnostics

| Variable | Values and default | Notes |
|---|---|---|
| `COPILOT_OTEL_EXPORTER_TYPE` | `otlp-http` (the default) or `file` | Auto-selects `file` when `COPILOT_OTEL_FILE_EXPORTER_PATH` is set |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/json` (the default) or `http/protobuf` | Applies to `otlp-http` only. `OTEL_EXPORTER_OTLP_TRACES_PROTOCOL` and `OTEL_EXPORTER_OTLP_METRICS_PROTOCOL` override it per signal. Unsupported values, including `grpc`, warn and fall back |
| `OTEL_LOG_LEVEL` | `NONE`, `ERROR`, `WARN`, `INFO`, `DEBUG`, `VERBOSE` or `ALL` | OpenTelemetry's own diagnostic log level. It is not the CLI's `--log-level` ([3.3](#33-process-logs)) |
| `COPILOT_OTEL_SOURCE_NAME` | `"github.copilot"` by default | The instrumentation scope name for the tracer and the meter |
| `OTEL_SERVICE_NAME` | `github-copilot` by default | The service name in resource attributes |
| `OTEL_RESOURCE_ATTRIBUTES` | Comma-separated `key=value` pairs | Extra resource attributes |
| `OTEL_EXPORTER_OTLP_HEADERS` | For example `Authorization=Bearer token` | Auth headers for the exporter. Prefer an env file or a secret manager to an inline token |

## 6. Triage by symptom

| Symptom | In Copilot CLI | In VS Code | Lab |
|---|---|---|---|
| Copilot ignores a rule I wrote | `/instructions` and `/env`, then `/context` for the Custom Instructions share | **Chat: Open Customizations**, Discovery events, then the System prompt | [Lab 01](../labs/lab01.md), [Lab 02](../labs/lab02.md) |
| My agent or skill is not offered | `/env`, `/agent` and `/skills list` | Discovery events in the Logs view | [Lab 03](../labs/lab03.md), [Lab 04](../labs/lab04.md) |
| An MCP tool is never called | `/mcp list` (look for `failed: <reason>`), then the process log ([3.3](#33-process-logs)) | **MCP: List Servers**, **Show Output**, then the tool definitions in the Chat Debug view | [Lab 05](../labs/lab05.md) |
| A hook did not run, or blocked something | `hook.start` and `hook.end` in `events.jsonl` ([3.2](#32-read-eventsjsonl)), `/env` and `/diagnose` | The Agent Debug Logs; for a legacy Local setup, the GitHub Copilot Chat Hooks channel | [Lab 06](../labs/lab06.md) |
| A subagent never ran | `/tasks`, and `invoke_agent` spans ([5.2](#52-read-the-file)) | Agent Flow Chart | [Lab 07](../labs/lab07.md) |
| I was asked to approve something | `/diagnose` | none documented | [Lab 06](../labs/lab06.md) |
| The session is slow or expensive | `/context`, `/usage` and `session_store_sql` ([4.3](#43-query-your-history-with-session_store_sql)) | Summary view, and Cache Explorer if cache reuse is low | [Lab 07](../labs/lab07.md) |

## 7. Before you share anything

- **Assume everything here contains your work.** Debug views, exported logs, `events.jsonl`, `/collect-debug-logs` bundles and OpenTelemetry files can hold prompts, source code, file paths, tool inputs and outputs, and secrets: a value that reaches a tool result is saved in the session history.
- **Content capture is the most sensitive.** With `SPAN_ONLY`, an OTel file contains the system prompt, your prompts and tool results. Keep it outside the repository, share it with nobody you would not share the code with, and delete it when you are done.
- **Read before you send.** Review the file or bundle, remove what should not leave your machine, and never include credentials. Prefer a local `.tgz` or file export to `share` or `gist`.
- **Keep hooks quiet.** The VS Code hooks page advises against logging complete prompts, arguments, results or environment variables from a hook.

## 8. Sources and verification

Read on 2026-11-12. "Observed" means the behavior was seen on a running CLI and is not in any published page, so it can change without notice.

| What | Source | How it was checked |
|---|---|---|
| VS Code capture settings, the Agent Debug Logs panel and its views, Export and Import, the Chat Debug view sections, `/troubleshoot`, and the MCP and customization scenarios | [Debug chat interactions](https://code.visualstudio.com/docs/agents/agent-troubleshooting/chat-debug-view) (page dated 11/11/2026) | Read in full |
| `#debugEventsSnapshot` | [VS Code 1.111 release notes](https://code.visualstudio.com/updates/v1_111) and [Debugging agent work](https://code.visualstudio.com/learn/foundations/debugging-and-whats-happening-behind-the-scenes). The debug-view page mentions the sparkle icon but not the variable name | Read |
| The GitHub Copilot and GitHub Copilot Chat Output channels, log levels, **MCP: List Servers**, **Chat: Open Customizations**, **GitHub Copilot: Chat Diagnostics** | [Troubleshoot AI in VS Code](https://code.visualstudio.com/docs/agents/agent-troubleshooting/troubleshooting) | Read in full |
| The GitHub Copilot Chat Hooks channel belongs to the legacy Local setup | [Agent hooks in VS Code](https://code.visualstudio.com/docs/agent-customization/hooks), "Troubleshoot hooks" | Read |
| Copilot and Local harnesses, the Local harness deprecation, the harness prefix in the chat title | [Choose an agent harness](https://code.visualstudio.com/docs/agents/run/agent-harnesses) | Read |
| Output panel shortcuts | VS Code source, `workbench.action.output.toggleOutput` in `src/vs/workbench/contrib/output/browser/output.contribution.ts` | Read |
| Session folder, files, `session-store.db`, `session.db`, retention | Copilot CLI built-in docs: `topic:sessions#where-sessions-are-stored`, `topic:sessions#the-session-database-session-db`, `topic:sessions#cleaning-up-and-retention`, `topic:config#files-and-directories` | Read (build 1.0.110-3); folder layout and `workspace.yaml` keys confirmed on local sessions |
| `/diagnose`, `/collect-debug-logs`, `/feedback`, `/context`, `/env`, `/instructions`, `/usage`, `/tasks`, `/mcp`, `/session`, `/experimental`, `/settings`, `/chronicle` | Copilot CLI built-in docs: `command:/diagnose`, `command:/collect-debug-logs`, `command:/feedback`, `command:/context`, `command:/env`, `command:/instructions`, `command:/usage`, `command:/tasks`, `command:/mcp`, `command:/session`, `command:/experimental`, `command:/settings`, `command:/chronicle`, and `topic:mcp#status-and-troubleshooting` | Read; descriptions compared with `copilot help commands` on build 1.0.111-0 |
| Log levels, `--log-level`, `--log-dir`, the process log name | `topic:logging`, `topic:logging#examples`, `flag:--log-level`, `flag:--log-dir`, `topic:config#files-and-directories` | Read; the log file name was observed |
| OpenTelemetry activation, variables, content capture, span tree and metrics | `topic:monitoring#activation`, `topic:monitoring#environment-variables`, `topic:monitoring#content-capture`, `topic:monitoring#what-gets-exported`, `topic:environment#environment-variables-12`, `topic:environment#environment-variables-13` | Read; compared with `copilot help monitoring` on build 1.0.111-0 |
| The `session_store_sql` stores and tables | The tool's own description inside a Copilot session (cloud views, local SQLite), and this repository's [`/cost-check` skill](../.github/skills/cost-check/SKILL.md), which already uses it | Both example queries were run: the cloud query returned no failures for the account used, the local query returned rows |
| **Observed**: the `events.jsonl` record types and fields; the OTel JSON-lines record shape and span attributes; the `github.copilot.hook.*` and MCP span events; `invoke_agent <name>` nested under `execute_tool task`; the effect of `SPAN_ONLY` on the file; the `MCP server connection failed` warning | Captured with `copilot -p` in scratch folders on build 1.0.111-0: a tool call, a delegated call, content capture, two runs on one file, and a deliberately broken MCP server | Not published and may change. Not checked: custom agents' span names, macOS and Linux, other builds |
