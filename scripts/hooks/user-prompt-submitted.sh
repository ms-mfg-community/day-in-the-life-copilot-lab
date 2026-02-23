#!/usr/bin/env bash
# user-prompt-submitted.sh — Log user prompts for audit trail
# Input: JSON via stdin with { timestamp, cwd, prompt }

set -euo pipefail

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required for hooks. Run: scripts/setup.sh" >&2
  exit 1
fi

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
PROMPT=$(echo "$INPUT" | jq -r '.prompt // ""')

LOG_DIR="${CWD}/.github/logs"
mkdir -p "$LOG_DIR"

# Log prompt (truncated to 200 chars for privacy)
TRUNCATED="${PROMPT:0:200}"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Prompt: ${TRUNCATED}" >> "$LOG_DIR/prompts.log"
