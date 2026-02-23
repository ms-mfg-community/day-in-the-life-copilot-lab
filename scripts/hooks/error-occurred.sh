#!/usr/bin/env bash
# error-occurred.sh — Log errors with context for debugging
# Input: JSON via stdin with { timestamp, cwd, error: { message, name, stack } }

set -euo pipefail

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is required for hooks. Run: scripts/setup.sh" >&2
  exit 1
fi

INPUT=$(cat)
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
ERROR_MSG=$(echo "$INPUT" | jq -r '.error.message // "unknown error"')
ERROR_NAME=$(echo "$INPUT" | jq -r '.error.name // "Error"')

LOG_DIR="${CWD}/.github/logs"
mkdir -p "$LOG_DIR"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ${ERROR_NAME}: ${ERROR_MSG}" >> "$LOG_DIR/errors.log"
