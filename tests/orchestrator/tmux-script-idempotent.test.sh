#!/usr/bin/env bash
# Test harness for scripts/orchestrator/tmux-start.sh idempotency.
#
# Runs tmux-start.sh twice against a unique throwaway session name and
# asserts the pane count is unchanged the second time (i.e. the second
# invocation re-uses the existing session instead of double-spawning).
#
# Exits 0 on pass, non-zero on failure. Skips (exit 0 with note) if the
# `tmux` binary is not on PATH so CI without tmux still passes.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRIPT="${REPO_ROOT}/scripts/orchestrator/tmux-start.sh"

if ! command -v tmux >/dev/null 2>&1; then
  echo "SKIP: tmux not installed in this environment" >&2
  exit 0
fi

if [[ ! -x "$SCRIPT" ]]; then
  echo "FAIL: ${SCRIPT} is missing or not executable" >&2
  exit 1
fi

SESSION="copilot-orch-test-$$-$RANDOM"

cleanup() {
  tmux kill-session -t "$SESSION" 2>/dev/null || true
}
trap cleanup EXIT

count_panes() {
  tmux list-panes -s -t "$SESSION" 2>/dev/null | wc -l | tr -d '[:space:]'
}

# First invocation — should create the session.
"$SCRIPT" --session "$SESSION" --no-attach >/dev/null
PANES_1="$(count_panes)"

if [[ "$PANES_1" -lt 2 ]]; then
  echo "FAIL: first invocation produced ${PANES_1} pane(s); expected ≥ 2" >&2
  exit 1
fi

# Second invocation — must NOT create a new session and must NOT add panes.
"$SCRIPT" --session "$SESSION" --no-attach >/dev/null
PANES_2="$(count_panes)"

if [[ "$PANES_1" != "$PANES_2" ]]; then
  echo "FAIL: pane count changed on second run (${PANES_1} → ${PANES_2})" >&2
  exit 1
fi

# Confirm only one tmux session with this name exists.
SESSIONS="$(tmux list-sessions -F '#S' 2>/dev/null | grep -c "^${SESSION}$" || true)"
if [[ "$SESSIONS" != "1" ]]; then
  echo "FAIL: expected exactly 1 session named ${SESSION}, found ${SESSIONS}" >&2
  exit 1
fi

echo "PASS: tmux-start.sh is idempotent (panes=${PANES_1})"
