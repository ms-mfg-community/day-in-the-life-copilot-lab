#!/usr/bin/env bash
# pre-tool-use-long-running.sh — Warn about long-running commands
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs }
# Output: JSON with permissionDecision if blocking

set -euo pipefail

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required for hooks. Run: scripts/setup.sh" >&2
  exit 1
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs // ""')

# Only check bash/shell tool calls
if [ "$TOOL_NAME" != "bash" ] && [ "$TOOL_NAME" != "shell" ]; then
  exit 0
fi

# Check for long-running commands
LONG_RUNNING_PATTERNS="npm install|npm ci|pnpm install|yarn install|bun install|cargo build|cargo test|docker build|docker compose|pip install|go build \./\.\.\.|go test \./\.\.\."

if echo "$TOOL_ARGS" | grep -qiE "$LONG_RUNNING_PATTERNS"; then
  echo "INFO: Long-running command detected. Consider running in a separate terminal or with a timeout." >&2
fi

# Don't block — just inform
exit 0
