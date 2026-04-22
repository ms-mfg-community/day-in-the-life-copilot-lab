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
set -euo pipefail

# Re-run the Node workspace build/tests after any tool that edits files in node/.
TOOL_NAME="${COPILOT_TOOL_NAME:-unknown}"
EDITED_PATH="${COPILOT_TOOL_PATH:-}"

case "$EDITED_PATH" in
  node/*) ;;
  *) exit 0 ;;
esac

case "$TOOL_NAME" in
  edit|create|str_replace_editor) ;;
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
$ErrorActionPreference = "Stop"

$tool = $env:COPILOT_TOOL_NAME
$path = $env:COPILOT_TOOL_PATH

if (-not $path -or -not $path.StartsWith("node/")) { exit 0 }
if ($tool -notin @("edit","create","str_replace_editor")) { exit 0 }

Write-Host "[post-tool-use] Node file edited; running pnpm -C node test..."
pnpm -C node test --run
'@ | Out-File -FilePath .github/hooks/post-tool-use-node-build.ps1 -Encoding utf8
````

## C. Wire it up

Register the hook in `.github/copilot-config.json` (or your tool's hooks file) under the
`post_tool_use` array, pointing at the platform-appropriate script.

## D. Verify

After editing any file under `node/`, you should see `pnpm -C node test` run automatically before Copilot continues.
