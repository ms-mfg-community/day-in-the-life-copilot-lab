#!/usr/bin/env bash
# scripts/orchestrator/clear-context.sh
#
# Safe context reset for a worker pane between phases. The orchestrator
# pane is intentionally NEVER cleared (it holds the cross-phase plan).
#
# Default: send `/clear` to the named worker pane in the orchestrator
# tmux session. Use --dry-run to print the command instead of sending.
#
# Flags:
#   --session NAME    tmux session name (default: copilot-orch)
#   --pane NAME       worker pane title to target: worker | qa
#                       (default: worker)
#   --dry-run         print the command that would be sent; do not send
#   --send TEXT       command to send instead of "/clear" (advanced)
#
# Exit codes:
#   0  cleared (or printed in dry-run)
#   1  invalid usage
#   2  tmux not installed (real run only)
#   3  session or pane not found (real run only)

set -euo pipefail

SESSION="copilot-orch"
PANE="worker"
DRY_RUN=0
SEND="/clear"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session) SESSION="${2:?--session needs a value}"; shift 2;;
    --pane)    PANE="${2:?--pane needs a value}"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    --send)    SEND="${2:?--send needs a value}"; shift 2;;
    -h|--help) sed -n '2,25p' "$0" >&2; exit 0;;
    *)         echo "unknown flag: $1" >&2; exit 1;;
  esac
done

case "$PANE" in
  worker) PANE_INDEX=0;;
  qa)     PANE_INDEX=1;;
  *)      echo "unknown pane: $PANE (expected: worker|qa)" >&2; exit 1;;
esac

TARGET="${SESSION}:work.${PANE_INDEX}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  cat <<EOF
[dry-run] would send to ${TARGET}:
  ${SEND}
[dry-run] (orchestrator pane in session '${SESSION}' is intentionally NOT cleared)
EOF
  exit 0
fi

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is not installed; install tmux >= 3.0 (Lab 14 §14.1)" >&2
  exit 2
fi

if ! tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "tmux session not found: $SESSION (run scripts/orchestrator/tmux-start.sh first)" >&2
  exit 3
fi

if ! tmux list-panes -t "${SESSION}:work" -F '#{pane_index}' 2>/dev/null | grep -q "^${PANE_INDEX}$"; then
  echo "pane ${PANE_INDEX} not found in ${SESSION}:work" >&2
  exit 3
fi

tmux send-keys -t "$TARGET" "$SEND" C-m
echo "sent '${SEND}' to ${TARGET}" >&2
