#!/usr/bin/env bash
# scripts/orchestrator/tmux-start.sh
#
# Idempotently set up the orchestrator + tmux layout used by Lab 14.
#
# Layout:
#   window 0 = "orch"   — single pane that hosts the orchestrator copilot
#                          session. This pane stays alive across phases.
#   window 1 = "work"   — split into two short-lived worker panes:
#                            pane 0 = "worker"  (dev role)
#                            pane 1 = "qa"      (qa role)
#   Worker panes are /clear-ed between phases by clear-context.sh; the
#   orchestrator pane is never cleared so it retains the cross-phase plan.
#
# Idempotency contract: running this script against an existing session
# MUST NOT spawn a new session and MUST NOT add panes to the existing one.
# (tested by tests/orchestrator/tmux-script-idempotent.test.sh)
#
# Flags:
#   --session NAME   tmux session name (default: copilot-orch)
#   --no-attach      do not attach after setup (CI / test default)
#   --layout MODE    one of: 2pane (orch + worker) | 3pane (default; orch + worker + qa)
#
# Exit codes:
#   0  layout ready (created or re-used)
#   1  invalid arguments
#   2  tmux not installed

set -euo pipefail

SESSION="copilot-orch"
ATTACH=1
LAYOUT="3pane"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--session NAME] [--no-attach] [--layout 2pane|3pane]

Sets up the orchestrator + tmux layout for the Lab 14 deep-dive.

Idempotent: re-running against an existing session re-uses it.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --session)   SESSION="${2:?--session needs a value}"; shift 2;;
    --no-attach) ATTACH=0; shift;;
    --layout)    LAYOUT="${2:?--layout needs a value}"; shift 2;;
    -h|--help)   usage; exit 0;;
    *)           echo "unknown flag: $1" >&2; usage >&2; exit 1;;
  esac
done

if [[ "$LAYOUT" != "2pane" && "$LAYOUT" != "3pane" ]]; then
  echo "invalid --layout: $LAYOUT (expected 2pane|3pane)" >&2
  exit 1
fi

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is not installed; install tmux >= 3.0 (Lab 14 §14.1)" >&2
  exit 2
fi

# Idempotency check — re-use an existing session.
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "re-using existing tmux session: $SESSION" >&2
  if [[ "$ATTACH" -eq 1 && -t 1 ]]; then
    exec tmux attach-session -t "$SESSION"
  fi
  exit 0
fi

# Create the session detached so this script never blocks in CI.
tmux new-session -d -s "$SESSION" -n orch

# Window 1 = workers.
tmux new-window -t "${SESSION}:" -n work

# Pane 0 in `work` is the dev worker; identify it for clear-context.sh.
tmux select-pane -t "${SESSION}:work.0" -T worker

if [[ "$LAYOUT" == "3pane" ]]; then
  tmux split-window -h -t "${SESSION}:work"
  tmux select-pane -t "${SESSION}:work.1" -T qa
  tmux select-layout -t "${SESSION}:work" even-horizontal
fi

# Park the cursor on the orchestrator pane.
tmux select-window -t "${SESSION}:orch"

echo "created tmux session: $SESSION (layout=$LAYOUT)" >&2

if [[ "$ATTACH" -eq 1 && -t 1 ]]; then
  exec tmux attach-session -t "$SESSION"
fi
