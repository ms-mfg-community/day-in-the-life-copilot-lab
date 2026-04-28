#!/usr/bin/env bash
# observe.sh — Continuous-learning-v2 observation hook
# Captures tool usage for instinct-based learning
# Usage: observe.sh <pre|post>
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs, toolResult? }

set -euo pipefail

OBSERVE_TYPE="${1:-pre}"
HOMUNCULUS_DIR="$HOME/.copilot/homunculus"
OBSERVATIONS_FILE="$HOMUNCULUS_DIR/observations.jsonl"

# Create directory if needed
mkdir -p "$HOMUNCULUS_DIR"

# Check for jq dependency
if ! command -v jq &> /dev/null; then
  exit 0  # Silent exit if jq unavailable - don't break workflow
fi

# Read input from stdin
INPUT=$(cat)

# Extract fields from hook input
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
TOOL_ARGS=$(echo "$INPUT" | jq -rc '.toolArgs // {}')
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Skip if no tool name
if [ -z "$TOOL_NAME" ]; then
  exit 0
fi

# Build observation JSON
if [ "$OBSERVE_TYPE" = "post" ]; then
  TOOL_RESULT=$(echo "$INPUT" | jq -rc '.toolResult // null')
  OBSERVATION=$(jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg type "$OBSERVE_TYPE" \
    --arg tool "$TOOL_NAME" \
    --argjson input "$TOOL_ARGS" \
    --argjson result "$TOOL_RESULT" \
    '{timestamp: $ts, type: $type, tool: $tool, input: $input, result: $result}')
else
  OBSERVATION=$(jq -nc \
    --arg ts "$TIMESTAMP" \
    --arg type "$OBSERVE_TYPE" \
    --arg tool "$TOOL_NAME" \
    --argjson input "$TOOL_ARGS" \
    '{timestamp: $ts, type: $type, tool: $tool, input: $input}')
fi

# Append to observations file
echo "$OBSERVATION" >> "$OBSERVATIONS_FILE"

exit 0
