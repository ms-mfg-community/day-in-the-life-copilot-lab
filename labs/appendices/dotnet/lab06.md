---
title: ".NET Appendix — Lab 06 (Hooks)"
lab_number: 6
track: dotnet
parent_lab: lab06.md
---

# .NET Appendix — Lab 06

This appendix shows the **.NET-flavored** post-tool-use hook referenced by [Lab 06 — Hooks](../../lab06.md): a hook that runs `dotnet build` after any `.cs` edit so the build never silently breaks.

> Pair with: [`labs/appendices/node/lab06.md`](../node/lab06.md) for the Node-track equivalent.

## `scripts/hooks/post-tool-use-dotnet-build.sh`

```bash
#!/usr/bin/env bash
# Post-tool-use hook: rebuild after a .cs edit.
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for hooks." >&2
  exit 1
fi

INPUT="$(cat)"
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
FILE_PATH=$(echo "$INPUT" | jq -r '.toolArgs.file_path // .toolArgs.path // ""')

if [[ "$TOOL_NAME" != "edit" && "$TOOL_NAME" != "create" && "$TOOL_NAME" != "write" ]]; then
  exit 0
fi
case "$FILE_PATH" in
  *.cs|*.csproj|*.cshtml)
    echo "🔨 dotnet build (triggered by edit to $FILE_PATH)"
    dotnet build dotnet/ContosoUniversity.sln --nologo --verbosity quiet
    ;;
esac
```

## `scripts/hooks/post-tool-use-dotnet-build.ps1`

```powershell
# Post-tool-use hook: rebuild after a .cs edit.
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).
$ErrorActionPreference = "Stop"

$Event    = ($input | Out-String) | ConvertFrom-Json
$ToolName = if ($Event.toolName) { $Event.toolName } else { "" }
$FilePath = ""
if ($Event.toolArgs) {
    if     ($Event.toolArgs.file_path) { $FilePath = $Event.toolArgs.file_path }
    elseif ($Event.toolArgs.path)      { $FilePath = $Event.toolArgs.path }
}

if ($ToolName -ne 'edit' -and $ToolName -ne 'create' -and $ToolName -ne 'write') { exit 0 }
if ($FilePath -match '\.(cs|csproj|cshtml)$') {
  Write-Host "🔨 dotnet build (triggered by edit to $FilePath)"
  dotnet build dotnet/ContosoUniversity.sln --nologo --verbosity quiet
}
```

> ⚠️ **Outdated guidance trap:** if you see a hook that reads `$TOOL_NAME` / `$env:TOOL_NAME` / `$FILE_PATH` from the environment, it is broken against current Copilot CLI — those vars are never exported. Use the stdin-JSON pattern above (camelCase `toolName` / `toolArgs`).

## Register the hook

Add an entry under `postToolUse` in your hook registration JSON pointing at the script above. Reference solution: [`solutions/lab06-hooks/hook-registration.json`](../../../solutions/lab06-hooks/hook-registration.json).

## Why this matters for the .NET track

A failed `dotnet build` produces no actionable test signal — every downstream xUnit run also fails. Catching the build break at `postToolUse` keeps the inner-loop tight (single file edit → single build → fast feedback) instead of waiting for the next `dotnet test` invocation.
