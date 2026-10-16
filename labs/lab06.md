---
title: "Hooks"
lab_number: 6
pace:
  presenter_minutes: 3
  self_paced_minutes: 10
registry: docs/_meta/registry.yaml
---

# 6 — Hooks

In this lab you will explore the hook system and create a new hook for .NET build verification.

> ⏱️ Presenter pace: 3 minutes | Self-paced: 10 minutes

> 📋 **Before you start.**
> - Finish [Lab 01](lab01.md) and [Setup](setup.md) first. §6.4 builds `dotnet/ContosoUniversity.sln`, so that solution must already build cleanly.
> - Open your terminal at the **repository root** (the folder that contains `scripts/` and `.github/`). Every path in this lab is relative to it.
> - Pick **one** shell and stay in it: the one your platform uses natively (PowerShell on Windows, Bash on macOS, Linux or WSL). **WSL/Bash** needs `jq`: the hook scripts use it to read the event and stop with an error if it is missing. **PowerShell** needs PowerShell 7 (the `pwsh` command, not Windows PowerShell 5.1), because §6.4 launches `pwsh`.

> ⏱️ **Timed route.** The timings above cover the core path in **one** shell: §6.1, the stdin-JSON idea (§6.2 and §6.2.1), §6.3, §6.4 and §6.6. Everything else is optional reference and is not timed: reading all three scripts in §6.2 steps 2–4 line by line (skim one), the other shell's blocks (such as the §6.3 script you are not using), and the Copilot CLI currency table.

References:
- [Using hooks with Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/use-hooks)
- [Hooks reference: events, payloads and exit codes](https://docs.github.com/en/copilot/reference/hooks-reference)

> 🧭 **Track appendices** — the post-tool-use build hook recipe per stack lives in
> [`labs/appendices/dotnet/lab06.md`](appendices/dotnet/lab06.md) and
> [`labs/appendices/node/lab06.md`](appendices/node/lab06.md).

## Copilot CLI currency (2026 refresh)

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
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto` to let Copilot choose) | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. The tier names are registry keys, not `/model` arguments. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to switch modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

## 6.1 Examine the Hook Configuration

Hooks are scripts that run automatically at specific points in the Copilot lifecycle. They provide guardrails and automation.

🖥️ **In your terminal:**

1. View the hook configuration:

**WSL/Bash:**
```bash
cat .github/hooks/default.json
```

**PowerShell:**
```powershell
Get-Content .github/hooks/default.json
```

2. This repository's `default.json` registers seven hooks on the four lifecycle events below. The table is **non-exhaustive**: Copilot supports more events (for example `sessionStart` and `sessionEnd`) — see the [full event catalogue](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events).

| Event | When It Fires |
|-------|--------------|
| `userPromptSubmitted` | After the user sends a message |
| `preToolUse` | Before Copilot executes a tool (edit, execute, etc.) |
| `postToolUse` | After Copilot executes a tool |
| `errorOccurred` | When an error happens |

3. Each hook entry has:
```json
{
  "type": "command",
  "bash": "./scripts/hooks/my-hook.sh",
  "powershell": "./scripts/hooks/my-hook.ps1",
  "timeoutSec": 10,
  "comment": "Description of what this hook does"
}
```

> 💡 Hooks run in both bash (Linux/Mac) and PowerShell (Windows). Always provide both for cross-platform support.

> 💡 **Where hooks load from:** `.github/hooks/*.json` is the project-level location this lab uses, but it is not the only one. Copilot CLI loads hooks from several sources, in this order: **policy hooks** (installed by an administrator and machine-wide; they load first and `disableAllHooks` cannot turn them off), **user hooks** in `~/.copilot/hooks/` (`%USERPROFILE%\.copilot\hooks\` on Windows), **project hooks** in `.github/hooks/*.json` (or an inline `hooks` block in `.github/copilot/settings.json`), then hooks contributed by **plugins**. They are combined: if the same event appears in more than one source, every entry from every source runs. Details: [hooks locations](https://docs.github.com/en/copilot/reference/hooks-reference#hooks-locations).

## 6.2 Read Existing Hooks

This repository ships with several hooks. Let's understand what they do.

Hooks for the GitHub Copilot CLI receive their event payload **as a JSON object on stdin** — they do **not** receive `TOOL_NAME` or `FILE_PATH` environment variables. This is a common trap: blog posts written for older shapes show env-var reads, and those scripts silently no-op against current Copilot CLI because the vars are never set.

> 💡 **Words you'll meet in the scripts.**
> - **IPC** (inter-process communication): how Copilot and a hook script talk to each other.
> - **stdin**: the input stream a script reads. Copilot writes the JSON event into it.
> - **stdout**: the output stream a script prints to. Copilot reads it, for example to get a JSON allow/deny decision.
> - **exit status**: the number a script ends with. `0` means success; anything else means failure.
> - **cwd**: the current working directory, the folder Copilot was working in when the event fired.

🖥️ **In your terminal:**

1. List the hook scripts:

**WSL/Bash:**
```bash
ls scripts/hooks/
```

**PowerShell:**
```powershell
Get-ChildItem scripts/hooks/
```

2. Examine the secret scanner (a `preToolUse` hook):

**WSL/Bash:**
```bash
cat scripts/hooks/pre-tool-use-secret-scan.sh
```

**PowerShell:**
```powershell
Get-Content scripts/hooks/pre-tool-use-secret-scan.sh
```

This hook runs before every tool use and blocks commits that contain hardcoded secrets (API keys, tokens, passwords).

3. Examine the doc blocker (another `preToolUse` hook):

**WSL/Bash:**
```bash
cat scripts/hooks/pre-tool-use-doc-blocker.sh
```

**PowerShell:**
```powershell
Get-Content scripts/hooks/pre-tool-use-doc-blocker.sh
```

This hook prevents Copilot from creating unnecessary documentation files (like `plan.md` or `notes.md` in the repo).

4. Examine the format hook (a `postToolUse` hook):

**WSL/Bash:**
```bash
cat scripts/hooks/post-tool-use-format.sh
```

**PowerShell:**
```powershell
Get-Content scripts/hooks/post-tool-use-format.sh
```

This hook auto-formats files after Copilot edits them.

> 💡 **preToolUse vs postToolUse**: Pre-hooks block actions by **exiting `0` and writing a JSON decision to stdout** (e.g. `{"permissionDecision":"deny","permissionDecisionReason":"…"}`) — see `scripts/hooks/pre-tool-use-secret-scan.sh` for a working example. Command `preToolUse` hooks are also **fail-closed**: if the script crashes or exits non-zero (including `exit 2`), Copilot denies the tool call even when the stdout JSON says `allow`, so a pre-hook that has no objection must `exit 0` — a non-zero exit is a denial, not a harmless skip. The one exception is a timeout, which is fail-open: Copilot surfaces a warning and lets the tool call proceed through the normal permission flow. Post-hooks run after the tool has finished, so they cannot stop it.

### 6.2.1 The hook IPC contract (Copilot CLI at or above the registry's `copilot_cli_version_floor`)

**What the runtime actually sets** (the idea from §6.2, written out as a contract):

| Surface | Value |
|---|---|
| `stdin` | JSON event payload (see schema below) |
| `env COPILOT_PROJECT_DIR` | Workspace cwd (set) |
| `env CLAUDE_PROJECT_DIR` | Workspace cwd (set, alias) |
| `env TOOL_NAME` | **NOT SET** — do not read |
| `env FILE_PATH` | **NOT SET** — do not read |

**`postToolUse` event JSON shape (delivered on stdin):**

```json
{
  "sessionId": "…",
  "timestamp": 1777341117296,
  "cwd": "/abs/path/to/workspace",
  "toolName": "edit",
  "toolArgs": { "file_path": "dotnet/.../StudentsController.cs", "old_string": "…", "new_string": "…" },
  "toolResult": { "resultType": "ok", "textResultForLlm": "…" }
}
```

Other events (`sessionStart`, `userPromptSubmitted`, `preToolUse`, `errorOccurred`, `agentStop`, `subagentStop`, `sessionEnd`) follow the same on-stdin pattern with event-specific keys. **Asymmetry to remember:** in `preToolUse`, `toolArgs` is a JSON-encoded string; in `postToolUse`, `toolArgs` is already a parsed object.

**Read it like this** — these are excerpts from *inside* a hook script. Read them; don't type them into a terminal (on its own, `INPUT="$(cat)"` just waits for input):

**WSL/Bash** (uses `jq`):
```bash
INPUT="$(cat)"
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.toolArgs.file_path // .toolArgs.path // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
# CLAUDE_PROJECT_DIR / COPILOT_PROJECT_DIR are also set by the runtime:
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${COPILOT_PROJECT_DIR:-$CWD}}"
```

**PowerShell:**
```powershell
$Event    = ($input | Out-String) | ConvertFrom-Json
$ToolName = $Event.toolName
$FilePath = $Event.toolArgs.file_path  # or $Event.toolArgs.path
$Cwd      = $Event.cwd
$ProjectDir = if ($env:CLAUDE_PROJECT_DIR)      { $env:CLAUDE_PROJECT_DIR }
              elseif ($env:COPILOT_PROJECT_DIR) { $env:COPILOT_PROJECT_DIR }
              else { $Cwd }
```

> ⚠️ **Outdated guidance trap:** if you see a hook that reads `$TOOL_NAME` / `$env:TOOL_NAME` from the environment, it is broken against current Copilot CLI — those vars are never exported. Rewrite to the stdin-JSON pattern above.

## 6.3 Create a .NET Build Hook

Let's create a `postToolUse` hook that automatically verifies the .NET build after Copilot edits a C# file.

> 💡 **PowerShell route.** The `cat > … << 'HOOK'` blocks below are Bash heredocs, so don't paste them into PowerShell. Instead, in VS Code create `scripts/hooks/post-tool-use-dotnet-build.ps1`, paste in only the script from step 2 (the lines between the `cat > …` line and the closing `HOOK` line, not those two lines themselves) and save it. Skip `chmod +x`: Windows has no execute bit. Step 1's `.sh` is optional on this route, because Windows runs the `powershell` entry. §6.4 step 3 has the PowerShell version of the non-matching test.

🖥️ **In your terminal:**

1. Create the bash script (reads the event JSON from stdin via `jq`):

**WSL/Bash:**
```bash
cat > scripts/hooks/post-tool-use-dotnet-build.sh << 'HOOK'
#!/usr/bin/env bash
# Post-tool-use hook: Verify .NET build after editing C# files.
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for hooks." >&2
  exit 1
fi

INPUT="$(cat)"
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
FILE_PATH=$(echo "$INPUT" | jq -r '.toolArgs.file_path // .toolArgs.path // ""')

# Only run after file edits/creates/writes
if [[ "$TOOL_NAME" != "edit" && "$TOOL_NAME" != "create" && "$TOOL_NAME" != "write" ]]; then
  exit 0
fi

# Only check C# / project / Razor files
if [[ "$FILE_PATH" != *.cs && "$FILE_PATH" != *.csproj && "$FILE_PATH" != *.cshtml ]]; then
  exit 0
fi

# Prefer runtime-provided project dir; fall back to event cwd.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${COPILOT_PROJECT_DIR:-$CWD}}"
SOLUTION="$PROJECT_DIR/dotnet/ContosoUniversity.sln"

if BUILD_OUTPUT=$(dotnet build "$SOLUTION" --nologo --verbosity quiet 2>&1); then
  echo "✅ Build succeeded after editing $FILE_PATH"
  exit 0
fi

echo "⚠️  BUILD FAILED after editing $FILE_PATH"
echo ""
printf '%s\n' "$BUILD_OUTPUT" | tail -20
echo ""
echo "Fix the build errors before continuing."
exit 1
HOOK
chmod +x scripts/hooks/post-tool-use-dotnet-build.sh
```

> ⚠️ **Don't skip the `chmod +x`** — without execute permissions, the hook won't run and you'll see no output.

2. Create the PowerShell equivalent:

**WSL/Bash** (heredoc — write the file from the bash shell):
```bash
cat > scripts/hooks/post-tool-use-dotnet-build.ps1 << 'HOOK'
# Post-tool-use hook: Verify .NET build after editing C# files.
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).

$ErrorActionPreference = "Stop"

$Event = ($input | Out-String) | ConvertFrom-Json

$ToolName = if ($Event.toolName) { $Event.toolName } else { "" }
$Cwd      = if ($Event.cwd)      { $Event.cwd }      else { "." }
$FilePath = ""
if ($Event.toolArgs) {
    if     ($Event.toolArgs.file_path) { $FilePath = $Event.toolArgs.file_path }
    elseif ($Event.toolArgs.path)      { $FilePath = $Event.toolArgs.path }
}

if ($ToolName -ne "edit" -and $ToolName -ne "create" -and $ToolName -ne "write") {
    exit 0
}

if ($FilePath -notmatch '\.(cs|csproj|cshtml)$') {
    exit 0
}

$ProjectDir = if ($env:CLAUDE_PROJECT_DIR)      { $env:CLAUDE_PROJECT_DIR }
              elseif ($env:COPILOT_PROJECT_DIR) { $env:COPILOT_PROJECT_DIR }
              else { $Cwd }
$Solution = Join-Path $ProjectDir "dotnet/ContosoUniversity.sln"

$Output = dotnet build $Solution --nologo --verbosity quiet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  BUILD FAILED after editing $FilePath"
    Write-Host ""
    $Output | Select-Object -Last 20 | Write-Host
    Write-Host ""
    Write-Host "Fix the build errors before continuing."
    exit 1
}

Write-Host "✅ Build succeeded after editing $FilePath"
HOOK
```

3. Register the hook in `default.json`. Open the file:
```bash
code .github/hooks/default.json
```

4. Add the new hook to the `postToolUse` array:
```json
{
  "type": "command",
  "bash": "./scripts/hooks/post-tool-use-dotnet-build.sh",
  "powershell": "./scripts/hooks/post-tool-use-dotnet-build.ps1",
  "timeoutSec": 30,
  "comment": "Verify .NET build after editing C# files"
}
```

5. Verify the hook is registered:

**WSL/Bash:**
```bash
cat .github/hooks/default.json | grep dotnet-build
```

**PowerShell:**
```powershell
Get-Content .github/hooks/default.json | Select-String dotnet-build
```

> 💡 **Nothing printed?** That means the step 4 entry isn't saved in `default.json` yet. `grep` exits with status `1` when it finds no match (`Select-String` just prints nothing), so read it as "not found", not as a crash.

> 💡 **Timeout**: Set `timeoutSec` to 30 for build hooks — `dotnet build` can take time. If the hook times out, it won't block Copilot but the result won't be reported.

## 6.4 Test the Hook

To test the hook manually, pipe a sample event JSON into it (matching the real `postToolUse` payload shape from §6.2.1):

🖥️ **In your terminal:**

1. Simulate a matching event (edit on a `.cs` file → should run `dotnet build`):

**WSL/Bash:**
```bash
echo '{"sessionId":"smoke","timestamp":1,"cwd":"'"$PWD"'","toolName":"edit","toolArgs":{"file_path":"dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs"},"toolResult":{"resultType":"ok","textResultForLlm":""}}' \
  | bash scripts/hooks/post-tool-use-dotnet-build.sh
```

**PowerShell:**
```powershell
$evt = @{
  sessionId  = "smoke"; timestamp = 1; cwd = (Get-Location).Path
  toolName   = "edit"
  toolArgs   = @{ file_path = "dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs" }
  toolResult = @{ resultType = "ok"; textResultForLlm = "" }
} | ConvertTo-Json -Compress -Depth 5
$evt | pwsh -NoProfile -File scripts/hooks/post-tool-use-dotnet-build.ps1
```

2. You should see `✅ Build succeeded` if the project builds cleanly.

3. Simulate a **non-matching** event (e.g. `toolName: "Bash"`, or an `.md` edit) and confirm the script exits `0` without running `dotnet build`:

**WSL/Bash:**
```bash
echo '{"toolName":"Bash","toolArgs":{"command":"ls"},"cwd":"."}' \
  | bash scripts/hooks/post-tool-use-dotnet-build.sh && echo "(early-return OK)"
```

**PowerShell:**
```powershell
$evt = @{ cwd = (Get-Location).Path; toolName = "Bash"; toolArgs = @{ command = "ls" } } | ConvertTo-Json -Compress -Depth 5
$evt | pwsh -NoProfile -File scripts/hooks/post-tool-use-dotnet-build.ps1
if ($LASTEXITCODE -eq 0) { Write-Host "(early-return OK)" }
```

If `(early-return OK)` doesn't appear, the check failed before the script could exit `0`. On the Bash route the usual cause is a missing `jq` (the script prints `ERROR: jq is required for hooks.`); on PowerShell it is usually that `pwsh` (PowerShell 7) isn't installed, as covered in **Before you start**.

4. In a real Copilot session, this hook fires automatically every time Copilot edits a `.cs` file. If the build breaks, Copilot sees the error output and can fix it.

> 💡 **Expected output:** You should see `✅ Build succeeded` in the Copilot output after editing a .cs file. If you see `⚠️ BUILD FAILED`, check the build errors. If you see nothing, verify permissions: `ls -la scripts/hooks/post-tool-use-dotnet-build.sh`.

> 💡 **Verifying hooks in VS Code:** To confirm whether a hook fired and see its output, open the **Output** panel (`Cmd+Shift+U` / `Ctrl+Shift+U`), then select **"GitHub Copilot Chat Hooks"** from the dropdown menu. This shows execution logs for all hooks, including exit codes and any stdout/stderr output.

## 6.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Config file** | `.github/hooks/default.json` (project level; hooks also load from policy, user and plugin sources) |
| **Script location** | `scripts/hooks/` (bash + PowerShell) |
| **Lifecycle events** | This repo registers `userPromptSubmitted`, `preToolUse`, `postToolUse` and `errorOccurred`. The list is non-exhaustive: see the [event catalogue](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events). |
| **Blocking** | Pre-hooks block by `exit 0` + stdout JSON `{"permissionDecision":"deny",…}`. Command `preToolUse` hooks are **fail-closed**: a crash or non-zero exit (including `2`) also denies the call, while a timeout is fail-open. Post-hooks run after the tool and cannot stop it. |
| **IPC** | Event payload arrives as **JSON on stdin**. Only `COPILOT_PROJECT_DIR` and `CLAUDE_PROJECT_DIR` env vars are set; `TOOL_NAME`/`FILE_PATH` are **not** exported. Parse stdin with `jq` (bash) or `ConvertFrom-Json` (PowerShell). |

**Hooks in this repository:**

| **Hook** | Type | Purpose |
|:-----|:-----|:--------|
| user-prompt-submitted | userPromptSubmitted | Log user prompts for an audit trail |
| secret-scan | preToolUse | Block commits with hardcoded secrets |
| doc-blocker | preToolUse | Prevent unnecessary documentation files |
| long-running | preToolUse | Warn about long-running commands |
| format | postToolUse | Auto-format files after edit |
| console-warn | postToolUse | Warn about console.log statements |
| error-occurred | errorOccurred | Log errors with context for debugging |
| dotnet-build | postToolUse | Verify .NET build after C# edit (you created this!) |

`scripts/hooks/` also contains `post-tool-use-typecheck` (bash and PowerShell), which ships with the repo but is not registered in `default.json`, so it does not run here, and `pre-commit-strip-notebook-outputs.sh`, a git pre-commit hook rather than a Copilot hook.

**Best practices:**
- Always provide both bash and PowerShell scripts
- Set appropriate timeouts (5s for quick checks, 30s for builds)
- Use pre-hooks for guardrails (block bad actions)
- Use post-hooks for verification (check results)
- Keep hooks fast — they run on every tool use

</details>

<details>
<summary>Solution: post-tool-use-dotnet-build.sh</summary>

See [`solutions/lab06-hooks/post-tool-use-dotnet-build.sh`](../solutions/lab06-hooks/post-tool-use-dotnet-build.sh)

</details>

**Next:** [Lab 07 — Multi-Agent Orchestration](lab07.md)

## 6.6 Cleanup

> 💡 **Reading this checklist after Lab 06.** This lab only writes the hook scripts and the `default.json` entry from §6.3. It creates nothing under `~/.copilot/lessons/`, `node/.a2a/` or `.git/`, it never sets `core.hooksPath`, and it starts no background jobs. So a clean result is mostly empty output:
> - The `ls … 2>/dev/null` sweep exits non-zero (`2` with Linux and WSL `ls`) when a path doesn't exist. That is expected here. It is Bash syntax, so skip it in PowerShell.
> - `git config --get core.hooksPath` exits `1` and prints nothing when the setting isn't set. This lab never sets it, so there is nothing to revert.
> - `git status --short` will list the hook script(s) and the edited `default.json` from §6.3. That is expected: the checklist's last line allows files you intentionally kept.
> - If a `git` line exits `128`, this shell's `git` can't use the checkout (for example WSL `git` on a folder that Windows `git` created). Run the `git` lines from the shell you cloned in.

<!-- @include docs/_partials/cleanup.md — do not edit inline; edit the partial and re-sync. -->
> 🧹 **Cleanup — leave the machine the way you found it.**
> Run this checklist before moving to the next lab. Per-lab specifics (named
> agent / hook / extension files this lab created) should already have been
> reverted in the steps above; this is the generic sweep that catches the
> long-tail.

🖥️ **In your terminal:**

1. **Stop background processes.** Anything you started in the foreground with
   `&` or in another tmux pane (dev servers, watchers, `gh aw` long-runs,
   tail-follows). If you used the bash tool in async mode, make sure those
   shells are stopped.

   **WSL/Bash:**
   ```bash
   jobs -l                       # any background jobs in this shell?
   # kill them by PID — never `pkill`/`killall`
   ```

   **PowerShell:**
   ```powershell
   Get-Job                       # any background jobs?
   Get-Job | Stop-Job; Get-Job | Remove-Job
   ```

2. **Restore Copilot CLI config if you mutated it.** Some labs ask you to
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json`. If you stashed the original, restore it now.
   If you edited in place without backing up, check `git status` in the lab
   repo (workspace configs) and revert anything you didn't mean to keep.

   **WSL/Bash:**
   ```bash
   # If you saved a backup like ~/.copilot/config.json.bak:
   [ -f ~/.copilot/config.json.bak ] && mv ~/.copilot/config.json.bak ~/.copilot/config.json
   ```

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** These directories accumulate
   across labs and are safe to clean once you've finished:

   ```bash
   # Per-session scratch (safe to inspect; delete only what this lab created):
   ls ~/.copilot/lessons/        2>/dev/null
   ls node/.a2a/                  2>/dev/null
   ls node/.a2a-transcript-*.md   2>/dev/null
   ls .git/CLAB_SUMMARY.md        2>/dev/null
   ```

   Delete only files that this lab created. Do not blanket-delete
   `~/.copilot/lessons/` if other sessions wrote to it.

5. **Revert any `core.hooksPath` or other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise.

   ```bash
   git config --get core.hooksPath
   # if set to a lab path, unset:
   git config --unset core.hooksPath
   ```

6. **Confirm working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Any unexpected files (untracked agents, hooks, extensions, scratch
   notebooks) should be removed or moved out of the repo before continuing.

7. **Verify build is still green.** Optional but recommended after labs that
   touched hooks, agents, or skills:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept) and the build is clean, you're ready for the next lab.
<!-- @end-include docs/_partials/cleanup.md -->
