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
set -euo pipefail

if [[ "${TOOL_NAME:-}" != "edit" && "${TOOL_NAME:-}" != "create" ]]; then
  exit 0
fi
case "${FILE_PATH:-}" in
  *.cs|*.csproj|*.cshtml)
    echo "🔨 dotnet build (triggered by edit to $FILE_PATH)"
    dotnet build dotnet/ContosoUniversity.sln --nologo --verbosity quiet
    ;;
esac
```

## `scripts/hooks/post-tool-use-dotnet-build.ps1`

```powershell
if ($env:TOOL_NAME -ne 'edit' -and $env:TOOL_NAME -ne 'create') { exit 0 }
if ($env:FILE_PATH -match '\.(cs|csproj|cshtml)$') {
  Write-Host "🔨 dotnet build (triggered by edit to $($env:FILE_PATH))"
  dotnet build dotnet/ContosoUniversity.sln --nologo --verbosity quiet
}
```

## Register the hook

Add an entry under `postToolUse` in your hook registration JSON pointing at the script above. Reference solution: [`solutions/lab06-hooks/hook-registration.json`](../../../solutions/lab06-hooks/hook-registration.json).

## Why this matters for the .NET track

A failed `dotnet build` produces no actionable test signal — every downstream xUnit run also fails. Catching the build break at `postToolUse` keeps the inner-loop tight (single file edit → single build → fast feedback) instead of waiting for the next `dotnet test` invocation.
