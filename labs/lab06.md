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

References:
- [Copilot hooks](https://docs.github.com/en/copilot/using-github-copilot/using-hooks)

> 🧭 **Track appendices** — the post-tool-use build hook recipe per stack lives in
> [`labs/appendices/dotnet/lab06.md`](appendices/dotnet/lab06.md) and
> [`labs/appendices/node/lab06.md`](appendices/node/lab06.md).

## Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
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
| **Local tool discovery** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | Discovering which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Note: `extensions_manage` is an MCP tool, **not** a slash command — invoke it via the MCP surface, not via `/extensions_manage`. |
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

2. The configuration defines hooks for these lifecycle events:

| Event | When It Fires |
|-------|--------------|
| `sessionStart` | When a Copilot session begins |
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

## 6.2 Read Existing Hooks

This repository ships with several hooks. Let's understand what they do.

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

> 💡 **preToolUse vs postToolUse**: Pre-hooks block actions by **exiting `0` and writing a JSON decision to stdout** (e.g. `{"permissionDecision":"deny","permissionDecisionReason":"…"}`) — see `scripts/hooks/pre-tool-use-secret-scan.sh` for a working example. A non-zero exit from any hook is logged and **silently ignored** by the runtime; only the stdout JSON contract blocks. Post-hooks report only — their stdout is debug-logged but cannot rewrite or veto the tool call.

### 6.2.1 The hook IPC contract (Copilot CLI 1.0.37)

Hooks for the GitHub Copilot CLI receive their event payload **as a JSON object on stdin** — they do **not** receive `TOOL_NAME` or `FILE_PATH` environment variables. This is a common trap: blog posts written for older shapes show env-var reads, and those scripts silently no-op against current Copilot CLI because the vars are never set.

**What the runtime actually sets:**

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

**Read it like this:**

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

```bash
echo '{"toolName":"Bash","toolArgs":{"command":"ls"},"cwd":"."}' \
  | bash scripts/hooks/post-tool-use-dotnet-build.sh && echo "(early-return OK)"
```

4. In a real Copilot session, this hook fires automatically every time Copilot edits a `.cs` file. If the build breaks, Copilot sees the error output and can fix it.

> 💡 **Expected output:** You should see `✅ Build succeeded` in the Copilot output after editing a .cs file. If you see `⚠️ BUILD FAILED`, check the build errors. If you see nothing, verify permissions: `ls -la scripts/hooks/post-tool-use-dotnet-build.sh`.

> 💡 **Verifying hooks in VS Code:** To confirm whether a hook fired and see its output, open the **Output** panel (`Cmd+Shift+U` / `Ctrl+Shift+U`), then select **"GitHub Copilot Chat Hooks"** from the dropdown menu. This shows execution logs for all hooks, including exit codes and any stdout/stderr output.

## 6.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Config file** | `.github/hooks/default.json` |
| **Script location** | `scripts/hooks/` (bash + PowerShell) |
| **Lifecycle events** | `sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred` |
| **Blocking** | Pre-hooks block by `exit 0` + stdout JSON `{"permissionDecision":"deny",…}`. Non-zero exits are silently ignored. Post-hooks report only. |
| **IPC** | Event payload arrives as **JSON on stdin**. Only `COPILOT_PROJECT_DIR` and `CLAUDE_PROJECT_DIR` env vars are set; `TOOL_NAME`/`FILE_PATH` are **not** exported. Parse stdin with `jq` (bash) or `ConvertFrom-Json` (PowerShell). |

**Hooks in this repository:**

| Hook | Type | Purpose |
|------|------|---------|
| secret-scan | preToolUse | Block commits with hardcoded secrets |
| doc-blocker | preToolUse | Prevent unnecessary documentation files |
| long-running | preToolUse | Warn about long-running commands |
| format | postToolUse | Auto-format files after edit |
| typecheck | postToolUse | TypeScript type check after edit |
| console-warn | postToolUse | Warn about console.log statements |
| dotnet-build | postToolUse | Verify .NET build after C# edit (you created this!) |

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
