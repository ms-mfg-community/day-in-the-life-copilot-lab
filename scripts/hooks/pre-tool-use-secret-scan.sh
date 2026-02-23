#!/usr/bin/env bash
# pre-tool-use-secret-scan.sh — Block commits containing hardcoded secrets
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs }
# Output: JSON with permissionDecision to deny if secrets found

set -euo pipefail

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required for hooks. Run: scripts/setup.sh" >&2
  exit 1
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs // ""')

# Only check file write/create operations
if [ "$TOOL_NAME" != "create" ] && [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "write" ]; then
  exit 0
fi

# Extract content to scan
CONTENT=$(echo "$TOOL_ARGS" | jq -r '.content // .new_string // ""' 2>/dev/null || echo "")

if [ -z "$CONTENT" ]; then
  exit 0
fi

# Scan for common secret patterns
SECRET_PATTERNS='(sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----|password\s*=\s*["\x27][^"\x27]{8,}|api[_-]?key\s*=\s*["\x27][^"\x27]{8,})'

if echo "$CONTENT" | grep -qiE "$SECRET_PATTERNS"; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Potential secret or credential detected in file content. Use environment variables instead of hardcoded secrets."}'
  exit 0
fi

exit 0
