#!/usr/bin/env bash
# start-observer.sh — Background observer for continuous-learning-v2
# Analyzes observations.jsonl and detects patterns including token inefficiencies
# Usage: ./start-observer.sh [--once]

set -euo pipefail

HOMUNCULUS_DIR="$HOME/.copilot/homunculus"
OBSERVATIONS_FILE="$HOMUNCULUS_DIR/observations.jsonl"
INSTINCTS_DIR="$HOMUNCULUS_DIR/instincts/personal"
PROCESSED_MARKER="$HOMUNCULUS_DIR/.last_processed_line"

# Ensure directories exist
mkdir -p "$INSTINCTS_DIR"

# Check dependencies
if ! command -v jq &> /dev/null; then
  echo "Error: jq required for observation analysis"
  exit 1
fi

# Get last processed line count
LAST_PROCESSED=0
if [ -f "$PROCESSED_MARKER" ]; then
  LAST_PROCESSED=$(cat "$PROCESSED_MARKER")
fi

analyze_observations() {
  local observations_file="$1"
  
  if [ ! -f "$observations_file" ]; then
    echo "No observations to analyze"
    return
  fi
  
  local total_lines=$(wc -l < "$observations_file")
  if [ "$total_lines" -le "$LAST_PROCESSED" ]; then
    echo "No new observations since last analysis"
    return
  fi
  
  echo "Analyzing observations $((LAST_PROCESSED + 1)) to $total_lines..."
  
  # Extract new observations
  local new_obs=$(tail -n +$((LAST_PROCESSED + 1)) "$observations_file")
  
  # === TOKEN EFFICIENCY PATTERNS ===
  
  # Pattern 1: Repeated tool calls (same tool+input)
  echo ""
  echo "=== Token Efficiency Analysis ==="
  
  local repeated=$(echo "$new_obs" | jq -s '
    [.[] | {tool, input: (.input | tostring)}] |
    group_by(.tool + .input) |
    map(select(length > 1)) | length
  ' 2>/dev/null || echo "0")
  
  if [ "$repeated" -gt 0 ]; then
    echo "⚠️  Repeated identical tool calls: $repeated (token waste)"
  fi
  
  # Pattern 2: Sequential view/grep calls (could be parallel)
  local seq_reads=$(echo "$new_obs" | jq -s '
    [range(length - 1) as $i | 
     if (.[$i].tool == "view" or .[$i].tool == "grep") and 
        (.[$i + 1].tool == "view" or .[$i + 1].tool == "grep")
     then 1 else 0 end] | add // 0
  ' 2>/dev/null || echo "0")
  
  if [ "$seq_reads" -gt 2 ]; then
    echo "💡 Sequential read operations: $seq_reads (consider parallel calls)"
  fi
  
  # Pattern 3: Verbose bash commands (no output limiting)
  local verbose_count=$(echo "$new_obs" | jq -r '
    select(.tool == "bash") |
    select(.input.command != null) |
    select(.input.command | test("--quiet|--silent|\\| head|\\| tail|--no-pager|-q") | not) |
    .input.command
  ' 2>/dev/null | wc -l || echo "0")
  
  if [ "$verbose_count" -gt 3 ]; then
    echo "💡 Verbose commands without output limiting: $verbose_count"
  fi
  
  # Pattern 4: Failed operations (learn from failures)
  local failures=$(echo "$new_obs" | jq -s '
    [.[] | select(.type == "post") | 
     select(.result.error != null or .result.exitCode != null and .result.exitCode != 0)] | length
  ' 2>/dev/null || echo "0")
  
  if [ "$failures" -gt 0 ]; then
    echo "📊 Failed operations: $failures (review for better approaches)"
  fi
  
  # === WORKFLOW PATTERNS ===
  
  echo ""
  echo "=== Tool Usage Summary ==="
  echo "$new_obs" | jq -r '.tool' 2>/dev/null | sort | uniq -c | sort -rn | head -5
  
  # === GENERATE EFFICIENCY INSTINCT IF PATTERNS FOUND ===
  
  if [ "$repeated" -gt 2 ] || [ "$seq_reads" -gt 3 ]; then
    local instinct_file="$INSTINCTS_DIR/reduce-redundant-calls.md"
    if [ ! -f "$instinct_file" ]; then
      cat > "$instinct_file" << 'EOF'
---
id: reduce-redundant-calls
trigger: "when making multiple similar tool calls"
confidence: 0.6
domain: "token-efficiency"
source: "observer-detected"
---

# Reduce Redundant Tool Calls

## Action
Before making a tool call, check if you already have the needed information.
Use parallel tool calls when operations are independent.

## Evidence
- Observer detected repeated identical tool calls
- Sequential read operations that could be parallelized
EOF
      echo "✨ Created instinct: reduce-redundant-calls.md"
    fi
  fi
  
  # Update processed marker
  echo "$total_lines" > "$PROCESSED_MARKER"
  echo ""
  echo "✅ Analyzed $((total_lines - LAST_PROCESSED)) new observations"
}

# Main
if [ "${1:-}" = "--once" ]; then
  analyze_observations "$OBSERVATIONS_FILE"
else
  echo "Starting continuous observer (Ctrl+C to stop)..."
  echo "Checking every 5 minutes for new observations..."
  while true; do
    analyze_observations "$OBSERVATIONS_FILE"
    sleep 300
  done
fi
