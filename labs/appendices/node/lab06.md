---
title: "Lab 06 — Node.js post-tool-use hook (track appendix)"
lab_number: 6
track: node
---

# Lab 06 — Node track appendix: post-tool-use build hook

This appendix gives you the Node.js variant of the post-tool-use build hook created in [`labs/lab06.md`](../../lab06.md).

## A. Create `.github/hooks/post-tool-use-node-build.sh`

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
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
EDITED_PATH=$(echo "$INPUT" | jq -r '.toolArgs.file_path // .toolArgs.path // ""')

# Re-run the Node workspace build/tests after any tool that edits files in node/.
case "$EDITED_PATH" in
  node/*) ;;
  *) exit 0 ;;
esac

case "$TOOL_NAME" in
  edit|create|write|str_replace_editor) ;;
  *) exit 0 ;;
esac

echo "[post-tool-use] Node file edited; running pnpm -C node test..."
pnpm -C node test --run
HOOK
chmod +x .github/hooks/post-tool-use-node-build.sh
````

## B. PowerShell variant

````powershell
@'
# Reads the Copilot CLI hook event as JSON on stdin (NOT env vars).
$ErrorActionPreference = "Stop"

$Event = ($input | Out-String) | ConvertFrom-Json
$tool  = if ($Event.toolName) { $Event.toolName } else { "" }
$path  = ""
if ($Event.toolArgs) {
    if     ($Event.toolArgs.file_path) { $path = $Event.toolArgs.file_path }
    elseif ($Event.toolArgs.path)      { $path = $Event.toolArgs.path }
}

if (-not $path -or -not $path.StartsWith("node/")) { exit 0 }
if ($tool -notin @("edit","create","write","str_replace_editor")) { exit 0 }

Write-Host "[post-tool-use] Node file edited; running pnpm -C node test..."
pnpm -C node test --run
'@ | Out-File -FilePath .github/hooks/post-tool-use-node-build.ps1 -Encoding utf8
````

> ⚠️ **Outdated guidance trap:** if you see a hook that reads `$COPILOT_TOOL_NAME` / `$COPILOT_TOOL_PATH` / `$env:TOOL_NAME` from the environment, it is broken against current Copilot CLI 1.0.37 — those vars are never exported. Hook events arrive as JSON on stdin with camelCase `toolName` / `toolArgs` fields (see the canonical pattern above).

## C. Wire it up

Register the hook in `.github/copilot-config.json` (or your tool's hooks file) under the
`post_tool_use` array, pointing at the platform-appropriate script.

## D. Verify

After editing any file under `node/`, you should see `pnpm -C node test` run automatically before Copilot continues.
