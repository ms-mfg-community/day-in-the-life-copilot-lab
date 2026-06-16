#!/usr/bin/env bash
# pre-tool-use-doc-blocker.sh — Block creation of unnecessary documentation files
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs }
# Output: JSON with permissionDecision to deny file creation

set -euo pipefail

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required for hooks. Run: scripts/setup.sh" >&2
  exit 1
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs // ""')

# Only check file creation tools
if [ "$TOOL_NAME" != "create" ] && [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "write" ]; then
  exit 0
fi

# Check if creating a new .md or .txt file outside of allowed paths
FILE_PATH=$(echo "$TOOL_ARGS" | jq -r '.file_path // .path // ""' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Allow documentation in these paths
ALLOWED_PATTERNS="docs/|.github/|labs/|solutions/|plugin-template/|AGENTS.md|README.md|CHANGELOG.md|LICENSE|CONTRIBUTING.md|.copilot/session-state/|.orchestrator/"

if echo "$FILE_PATH" | grep -qiE '\.(md|txt)$'; then
  if ! echo "$FILE_PATH" | grep -qiE "$ALLOWED_PATTERNS"; then
    # Check if file already exists (editing existing is OK)
    if [ ! -f "$FILE_PATH" ]; then
      echo '{"permissionDecision":"deny","permissionDecisionReason":"Creating documentation files outside of docs/ or .github/ is blocked. Use an allowed path or discuss with the user first."}'
      exit 0
    fi
  fi
fi

exit 0
