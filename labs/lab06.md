# 6 — Hooks

In this lab you will explore the hook system and create a new hook for .NET build verification.

> ⏱️ Presenter pace: 3 minutes | Self-paced: 10 minutes

References:
- [Copilot hooks](https://docs.github.com/en/copilot/using-github-copilot/using-hooks)

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

> 💡 **preToolUse vs postToolUse**: Pre-hooks can block actions (return non-zero to prevent the tool from executing). Post-hooks run after the action completes and cannot block it.

## 6.3 Create a .NET Build Hook

Let's create a `postToolUse` hook that automatically verifies the .NET build after Copilot edits a C# file.

🖥️ **In your terminal:**

1. Create the bash script:

**WSL/Bash:**
```bash
cat > scripts/hooks/post-tool-use-dotnet-build.sh << 'HOOK'
#!/usr/bin/env bash
# Post-tool-use hook: Verify .NET build after editing C# files
# Fires after: edit tool completes on .cs files

set -euo pipefail

# Only run after file edits
TOOL_NAME="${TOOL_NAME:-}"
FILE_PATH="${FILE_PATH:-}"

if [[ "$TOOL_NAME" != "edit" && "$TOOL_NAME" != "create" ]]; then
  exit 0
fi

# Only check C# files
if [[ "$FILE_PATH" != *.cs ]]; then
  exit 0
fi

# Run dotnet build and capture output
BUILD_OUTPUT=$(dotnet build ContosoUniversity.sln --nologo --verbosity quiet 2>&1) || {
  echo "⚠️  BUILD FAILED after editing $FILE_PATH"
  echo ""
  echo "$BUILD_OUTPUT" | tail -20
  echo ""
  echo "Fix the build errors before continuing."
  exit 1
}

echo "✅ Build succeeded after editing $FILE_PATH"
HOOK
chmod +x scripts/hooks/post-tool-use-dotnet-build.sh
```

**PowerShell:**
```powershell
@'
#!/usr/bin/env bash
# Post-tool-use hook: Verify .NET build after editing C# files
# Fires after: edit tool completes on .cs files

set -euo pipefail

# Only run after file edits
TOOL_NAME="${TOOL_NAME:-}"
FILE_PATH="${FILE_PATH:-}"

if [[ "$TOOL_NAME" != "edit" && "$TOOL_NAME" != "create" ]]; then
  exit 0
fi

# Only check C# files
if [[ "$FILE_PATH" != *.cs ]]; then
  exit 0
fi

# Run dotnet build and capture output
BUILD_OUTPUT=$(dotnet build ContosoUniversity.sln --nologo --verbosity quiet 2>&1) || {
  echo "⚠️  BUILD FAILED after editing $FILE_PATH"
  echo ""
  echo "$BUILD_OUTPUT" | tail -20
  echo ""
  echo "Fix the build errors before continuing."
  exit 1
}

echo "✅ Build succeeded after editing $FILE_PATH"
'@ | Out-File -FilePath scripts/hooks/post-tool-use-dotnet-build.sh -Encoding utf8
```

> ⚠️ **Don't skip this step** — without execute permissions, the hook won't run and you'll see no output.

2. Create the PowerShell equivalent:

**WSL/Bash:**
```bash
cat > scripts/hooks/post-tool-use-dotnet-build.ps1 << 'HOOK'
# Post-tool-use hook: Verify .NET build after editing C# files

$toolName = $env:TOOL_NAME
$filePath = $env:FILE_PATH

if ($toolName -ne "edit" -and $toolName -ne "create") { exit 0 }
if ($filePath -notlike "*.cs") { exit 0 }

$output = dotnet build ContosoUniversity.sln --nologo --verbosity quiet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  BUILD FAILED after editing $filePath"
    Write-Host ""
    $output | Select-Object -Last 20 | Write-Host
    Write-Host ""
    Write-Host "Fix the build errors before continuing."
    exit 1
}

Write-Host "✅ Build succeeded after editing $filePath"
HOOK
```

**PowerShell:**
```powershell
@'
# Post-tool-use hook: Verify .NET build after editing C# files

$toolName = $env:TOOL_NAME
$filePath = $env:FILE_PATH

if ($toolName -ne "edit" -and $toolName -ne "create") { exit 0 }
if ($filePath -notlike "*.cs") { exit 0 }

$output = dotnet build ContosoUniversity.sln --nologo --verbosity quiet 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  BUILD FAILED after editing $filePath"
    Write-Host ""
    $output | Select-Object -Last 20 | Write-Host
    Write-Host ""
    Write-Host "Fix the build errors before continuing."
    exit 1
}

Write-Host "✅ Build succeeded after editing $filePath"
'@ | Out-File -FilePath scripts/hooks/post-tool-use-dotnet-build.ps1 -Encoding utf8
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

To test the hook manually:

🖥️ **In your terminal:**

1. Simulate what the hook does by running it directly:

**WSL/Bash:**
```bash
export TOOL_NAME="edit"
export FILE_PATH="ContosoUniversity.Web/Controllers/StudentsController.cs"
bash scripts/hooks/post-tool-use-dotnet-build.sh
```

**PowerShell:**
```powershell
$env:TOOL_NAME = "edit"
$env:FILE_PATH = "ContosoUniversity.Web/Controllers/StudentsController.cs"
.\scripts\hooks\post-tool-use-dotnet-build.ps1
```

2. You should see `✅ Build succeeded` if the project builds cleanly.

3. In a real Copilot session, this hook fires automatically every time Copilot edits a `.cs` file. If the build breaks, Copilot sees the error output and can fix it.

> 💡 **Expected output:** You should see `✅ Build succeeded` in the Copilot output after editing a .cs file. If you see `⚠️ BUILD FAILED`, check the build errors. If you see nothing, verify permissions: `ls -la scripts/hooks/post-tool-use-dotnet-build.sh`.

## 6.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Config file** | `.github/hooks/default.json` |
| **Script location** | `scripts/hooks/` (bash + PowerShell) |
| **Lifecycle events** | `sessionStart`, `userPromptSubmitted`, `preToolUse`, `postToolUse`, `errorOccurred` |
| **Blocking** | Pre-hooks can block (non-zero exit). Post-hooks report only. |
| **Environment** | Hooks receive `TOOL_NAME`, `FILE_PATH`, and other context via environment variables |

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
