#!/usr/bin/env bash
# post-tool-use-format.sh — Auto-format JS/TS files after edit with Prettier
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs, toolResult }

set -euo pipefail

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required for hooks. Run: scripts/setup.sh" >&2
  exit 1
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')

# Only run after file edit/create operations
if [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "create" ] && [ "$TOOL_NAME" != "write" ]; then
  exit 0
fi

# Extract file path
FILE_PATH=$(echo "$TOOL_ARGS" | jq -r '.file_path // .path // ""' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format JS/TS files
if echo "$FILE_PATH" | grep -qiE '\.(js|jsx|ts|tsx|mjs|cjs)$'; then
  # Check if prettier is available
  if command -v npx >/dev/null 2>&1 && [ -f "${CWD}/node_modules/.bin/prettier" ]; then
    npx --no-install prettier --write "$FILE_PATH" 2>/dev/null || true
  fi
fi

exit 0
