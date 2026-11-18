---
title: "Lab 06 — Node.js post-tool-use hook (track appendix)"
lab_number: 6
track: node
---

# Lab 06 — Node track appendix: post-tool-use build hook

This appendix gives you the Node.js variant of the post-tool-use build hook created in [`labs/lab06.md`](../../lab06.md).

## A. Create `.github/hooks/post-tool-use-node-build.sh`

💠 **In VS Code:** create `.github/hooks/post-tool-use-node-build.sh` in the Explorer, paste this content, and save. Setting the execute bit is a 🐚 OS Terminal step: `chmod +x .github/hooks/post-tool-use-node-build.sh` (skip it on Windows).

```bash
#!/usr/bin/env bash
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for hooks." >&2
  exit 1
fi

INPUT="$(cat)"
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName? // ""')
case "$TOOL_NAME" in
  edit|create|write|str_replace_editor|apply_patch) ;;
  *) exit 0 ;;
esac

CWD=$(echo "$INPUT" | jq -r '.cwd? // ""' | tr '\\' '/')
CWD="${CWD%/}"

PATHS=$(echo "$INPUT" | jq -r '
  (.toolArgs | . as $raw | try fromjson catch $raw) as $args
  | if ($args | type) == "string" then
      $args | split("\n")[]
      | capture("^\\*\\*\\* (?:Add File|Update File|Delete File|Move to):\\s*(?<path>.*\\S)\\s*$").path
    elif ($args | type) == "object" then
      ($args.file_path?, $args.path?) | strings
    else empty end')

# Re-run the Node workspace build/tests after any tool that edits files in node/.
MATCHED=0
while IFS= read -r RAW_PATH; do
  if [[ -z "$RAW_PATH" ]]; then continue; fi
  NORM_PATH=$(printf '%s' "$RAW_PATH" | tr '\\' '/')
  if [[ -n "$CWD" && "$NORM_PATH" == "$CWD/"* ]]; then
    REL_PATH="${NORM_PATH#"$CWD/"}"
  else
    REL_PATH="${NORM_PATH#./}"
  fi
  case "$REL_PATH" in
    node/*) MATCHED=1; break ;;
  esac
done <<< "$PATHS"

if [[ "$MATCHED" -ne 1 ]]; then exit 0; fi

echo "[post-tool-use] Node file edited; running pnpm -C node test..."
pnpm -C node test --run
```

<details>
<summary>🐚 Shell alternative (Bash / PowerShell heredoc)</summary>

**WSL/Bash:**

````bash
mkdir -p .github/hooks
cat > .github/hooks/post-tool-use-node-build.sh << 'HOOK'
#!/usr/bin/env bash
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).
set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for hooks." >&2
  exit 1
fi

INPUT="$(cat)"
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName? // ""')
case "$TOOL_NAME" in
  edit|create|write|str_replace_editor|apply_patch) ;;
  *) exit 0 ;;
esac

CWD=$(echo "$INPUT" | jq -r '.cwd? // ""' | tr '\\' '/')
CWD="${CWD%/}"

PATHS=$(echo "$INPUT" | jq -r '
  (.toolArgs | . as $raw | try fromjson catch $raw) as $args
  | if ($args | type) == "string" then
      $args | split("\n")[]
      | capture("^\\*\\*\\* (?:Add File|Update File|Delete File|Move to):\\s*(?<path>.*\\S)\\s*$").path
    elif ($args | type) == "object" then
      ($args.file_path?, $args.path?) | strings
    else empty end')

# Re-run the Node workspace build/tests after any tool that edits files in node/.
MATCHED=0
while IFS= read -r RAW_PATH; do
  if [[ -z "$RAW_PATH" ]]; then continue; fi
  NORM_PATH=$(printf '%s' "$RAW_PATH" | tr '\\' '/')
  if [[ -n "$CWD" && "$NORM_PATH" == "$CWD/"* ]]; then
    REL_PATH="${NORM_PATH#"$CWD/"}"
  else
    REL_PATH="${NORM_PATH#./}"
  fi
  case "$REL_PATH" in
    node/*) MATCHED=1; break ;;
  esac
done <<< "$PATHS"

if [[ "$MATCHED" -ne 1 ]]; then exit 0; fi

echo "[post-tool-use] Node file edited; running pnpm -C node test..."
pnpm -C node test --run
HOOK
chmod +x .github/hooks/post-tool-use-node-build.sh
````

</details>

## B. PowerShell variant

💠 **In VS Code:** create `.github/hooks/post-tool-use-node-build.ps1`, paste this content, and save:

```powershell
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).
$ErrorActionPreference = "Stop"

$Event = ($input | Out-String) | ConvertFrom-Json
if ($Event -isnot [System.Management.Automation.PSCustomObject]) { exit 0 }

$tool = if ($Event.toolName -is [string]) { $Event.toolName } else { "" }
if ($tool -cnotin @("edit","create","write","str_replace_editor","apply_patch")) { exit 0 }

$cwd = if ($Event.cwd -is [string]) { ($Event.cwd -replace '\\', '/').TrimEnd('/') } else { "" }

$toolArgs = $Event.toolArgs
if ($toolArgs -is [string]) {
    try { $toolArgs = $toolArgs | ConvertFrom-Json -NoEnumerate } catch { }
}

$paths = if ($toolArgs -is [string]) {
    $toolArgs -split "`r?`n" | ForEach-Object {
        if ($_ -cmatch '^\*\*\* (?:Add File|Update File|Delete File|Move to):\s*(.*\S)\s*$') { $Matches[1] }
    }
} elseif ($toolArgs -is [System.Management.Automation.PSCustomObject]) {
    $toolArgs.file_path, $toolArgs.path
}

$matched = $false
foreach ($rawPath in $paths) {
    if ($rawPath -isnot [string] -or -not $rawPath) { continue }
    $norm = $rawPath -replace '\\', '/'
    $rel  = if ($cwd -and $norm.StartsWith("$cwd/")) { $norm.Substring($cwd.Length + 1) } else { $norm -replace '^\./', '' }
    if ($rel.StartsWith("node/")) { $matched = $true; break }
}
if (-not $matched) { exit 0 }

Write-Host "[post-tool-use] Node file edited; running pnpm -C node test..."
pnpm -C node test --run
```

<details>
<summary>🐚 Shell alternative (Bash / PowerShell heredoc)</summary>

````powershell
@'
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).
$ErrorActionPreference = "Stop"

$Event = ($input | Out-String) | ConvertFrom-Json
if ($Event -isnot [System.Management.Automation.PSCustomObject]) { exit 0 }

$tool = if ($Event.toolName -is [string]) { $Event.toolName } else { "" }
if ($tool -cnotin @("edit","create","write","str_replace_editor","apply_patch")) { exit 0 }

$cwd = if ($Event.cwd -is [string]) { ($Event.cwd -replace '\\', '/').TrimEnd('/') } else { "" }

$toolArgs = $Event.toolArgs
if ($toolArgs -is [string]) {
    try { $toolArgs = $toolArgs | ConvertFrom-Json -NoEnumerate } catch { }
}

$paths = if ($toolArgs -is [string]) {
    $toolArgs -split "`r?`n" | ForEach-Object {
        if ($_ -cmatch '^\*\*\* (?:Add File|Update File|Delete File|Move to):\s*(.*\S)\s*$') { $Matches[1] }
    }
} elseif ($toolArgs -is [System.Management.Automation.PSCustomObject]) {
    $toolArgs.file_path, $toolArgs.path
}

$matched = $false
foreach ($rawPath in $paths) {
    if ($rawPath -isnot [string] -or -not $rawPath) { continue }
    $norm = $rawPath -replace '\\', '/'
    $rel  = if ($cwd -and $norm.StartsWith("$cwd/")) { $norm.Substring($cwd.Length + 1) } else { $norm -replace '^\./', '' }
    if ($rel.StartsWith("node/")) { $matched = $true; break }
}
if (-not $matched) { exit 0 }

Write-Host "[post-tool-use] Node file edited; running pnpm -C node test..."
pnpm -C node test --run
'@ | Out-File -FilePath .github/hooks/post-tool-use-node-build.ps1 -Encoding utf8
````

</details>

> ⚠️ **Outdated guidance trap:** if you see a hook that reads `$COPILOT_TOOL_NAME` / `$COPILOT_TOOL_PATH` / `$env:TOOL_NAME` from the environment, it is broken against current Copilot CLI — those vars are never exported. Hook events arrive as JSON on stdin with camelCase `toolName` / `toolArgs` fields (see the canonical pattern above).

## C. Wire it up

Add an entry under the `"postToolUse"` array in `.github/hooks/default.json` (or a separate `.github/hooks/*.json` file) with `"type": "command"`, `"bash": "bash .github/hooks/post-tool-use-node-build.sh"`, and `"powershell": "pwsh -NoProfile -File .github/hooks/post-tool-use-node-build.ps1"`. Reference solution: [`solutions/lab06-hooks/hook-registration.json`](../../../solutions/lab06-hooks/hook-registration.json).

## D. Verify

After editing any file under `node/`, you should see `pnpm -C node test` run automatically before Copilot continues.
