#!/usr/bin/env bash
# post-tool-use-console-warn.sh — Warn about console.log in edited files
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

# Only run after file edit/create operations
if [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "create" ] && [ "$TOOL_NAME" != "write" ]; then
  exit 0
fi

# Extract file path
FILE_PATH=$(echo "$TOOL_ARGS" | jq -r '.file_path // .path // ""' 2>/dev/null || echo "")

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check JS/TS files
if echo "$FILE_PATH" | grep -qiE '\.(js|jsx|ts|tsx|mjs|cjs)$'; then
  if [ -f "$FILE_PATH" ]; then
    CONSOLE_COUNT=$(grep -c 'console\.log' "$FILE_PATH" 2>/dev/null || echo "0")
    if [ "$CONSOLE_COUNT" -gt 0 ]; then
      echo "WARNING: ${CONSOLE_COUNT} console.log statement(s) found in ${FILE_PATH}. Remove before committing." >&2
    fi
  fi
fi

exit 0
