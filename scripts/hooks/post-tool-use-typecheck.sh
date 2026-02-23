#!/usr/bin/env bash
# post-tool-use-typecheck.sh — Run TypeScript type check after editing .ts/.tsx files
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

# Only check TypeScript files
if echo "$FILE_PATH" | grep -qiE '\.(ts|tsx)$'; then
  if command -v npx >/dev/null 2>&1 && [ -f "${CWD}/tsconfig.json" ]; then
    # Run tsc with --noEmit for type checking only
    npx --no-install tsc --noEmit 2>&1 | head -20 || true
  fi
fi

exit 0
