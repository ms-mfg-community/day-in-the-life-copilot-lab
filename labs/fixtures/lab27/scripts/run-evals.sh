#!/usr/bin/env bash
# Lab 27 live run: run one named Vally suite against a real model, then price the run.
#
#   bash labs/fixtures/lab27/scripts/run-evals.sh [--suite <name>] [--model <model>]
#
#   --suite   pr-gate | full | pr-gate-guards | full-guards   (default: pr-gate)
#   --model   a model ID to evaluate instead of the one each eval spec pins
#
# THIS IS A LIVE RUN. It calls a real model through the Copilot SDK and spends AIU.
# Everything that needs no model lives in tier0.sh; run that first.
#
# What it does
#   1. Refuses to run unless the vally on PATH is the version pinned by vally_cli_version in
#      docs/_meta/registry.yaml (eval specs are version-specific, so a different CLI would
#      judge them by different rules).
#   2. Runs   vally eval --suite <suite> --require-pass
#                        --output-dir "$LAB27_DIR/vally-results"
#                        --param "RUN_DIR=$LAB27_DIR/vally-results"
#      Vally creates a <timestamp> directory inside --output-dir for the run. Program graders
#      execute with their working directory inside a disposable copy of the workspace, so they
#      cannot find that directory unless it is handed to them: RUN_DIR is the absolute path that
#      guarded-commands.cjs walks (newest <timestamp> only) to find events.jsonl.
#   3. Finds the newest <timestamp> directory and runs eval-cost.cjs on its results.jsonl, so
#      the run's root-only AIU is checked against the budget ceiling.
#   4. Exits non-zero if the eval verdict OR the cost check failed.

set -uo pipefail

# Vally's CLI usage telemetry is separate from evaluation tracing; opt out of it for scripted runs.
export VALLY_TELEMETRY_OPTOUT=1

SUITE="pr-gate"
MODEL=""

usage() {
  echo "Usage: run-evals.sh [--suite <pr-gate|full|pr-gate-guards|full-guards>] [--model <model>]"
  echo "  --suite   named suite from .vally.yaml (default: pr-gate)"
  echo "  --model   model ID to evaluate instead of the one each eval spec pins"
  echo "This is a LIVE run: it calls a real model and spends AIU. tier0.sh spends none."
}

fail() {
  echo "run-evals: FAILED - $1" >&2
  exit "${2:-1}"
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --suite)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      SUITE="$2"
      shift 2
      ;;
    --model)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      MODEL="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "run-evals: unknown argument '$1'" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$SUITE" in
  pr-gate|full|pr-gate-guards|full-guards) ;;
  *) echo "run-evals: unknown suite '$SUITE' (expected pr-gate, full, pr-gate-guards or full-guards)" >&2; exit 2 ;;
esac

# Resolve paths from the script location so the caller's working directory does not matter.
# Under Git Bash on Windows, `pwd -W` yields the native form (a drive letter and forward slashes)
# that a Windows Node program understands; everywhere else it is unavailable and the plain path is used.
LAB27_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && { pwd -W 2>/dev/null || pwd; })"
REPO_ROOT="$(cd "$LAB27_DIR/../../.." && pwd)"
REGISTRY="$REPO_ROOT/docs/_meta/registry.yaml"
RESULTS_DIR="$LAB27_DIR/vally-results"

command -v node >/dev/null 2>&1 || fail "node was not found on PATH (Vally needs Node 22.15 or newer)."

PINNED=""
if [ -f "$REGISTRY" ]; then
  PINNED="$(sed -n -E 's/^vally_cli_version:[[:space:]]*"([^"]+)".*/\1/p' "$REGISTRY" | head -n 1)"
fi
[ -n "$PINNED" ] || fail "vally_cli_version was not found in docs/_meta/registry.yaml."

command -v vally >/dev/null 2>&1 || fail "vally is not on PATH. Install the pinned version: npm install -g @microsoft/vally-cli@$PINNED (Node 22.15 or newer)."
INSTALLED="$(vally --version 2>/dev/null | head -n 1 | tr -d '[:space:]' || true)"
if [ "$INSTALLED" != "$PINNED" ]; then
  fail "the vally on PATH reports '${INSTALLED:-no version}' but docs/_meta/registry.yaml pins $PINNED. Install the pinned version: npm install -g @microsoft/vally-cli@$PINNED"
fi

echo "run-evals: LIVE run of suite '$SUITE'${MODEL:+ on model '$MODEL'} - this calls a real model and spends AIU."
echo "run-evals: results go to $RESULTS_DIR"
mkdir -p "$RESULTS_DIR"

# Vally names each run directory with an ISO-like timestamp, so the lexically greatest name is the newest.
newest_run_dir() {
  ls -1 "$RESULTS_DIR" 2>/dev/null | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' | sort | tail -n 1 || true
}

# Remember the newest directory from an earlier run: if vally dies before writing a new one, an old
# run must not be priced and reported as this run's result.
BEFORE="$(newest_run_dir)"

cd "$LAB27_DIR" || fail "cannot enter $LAB27_DIR."

vally eval --suite "$SUITE" --require-pass \
  --output-dir "$RESULTS_DIR" \
  --param "RUN_DIR=$RESULTS_DIR" \
  ${MODEL:+--model "$MODEL"}
EVAL_RC=$?

NEWEST="$(newest_run_dir)"

COST_RC=0
if [ -n "$NEWEST" ] && [ "$NEWEST" != "$BEFORE" ] && [ -f "$RESULTS_DIR/$NEWEST/results.jsonl" ]; then
  echo
  echo "== Root-only AIU for $NEWEST =="
  node evals/graders/eval-cost.cjs "$RESULTS_DIR/$NEWEST/results.jsonl"
  COST_RC=$?
else
  echo "run-evals: this run wrote no new <timestamp>/results.jsonl under $RESULTS_DIR, so the cost check could not run (older runs are never priced as this one)." >&2
  COST_RC=1
fi

echo
if [ "$EVAL_RC" -ne 0 ]; then
  echo "run-evals: FAILED - vally eval exited with code $EVAL_RC (cost check exit code: $COST_RC)." >&2
  exit "$EVAL_RC"
fi
if [ "$COST_RC" -ne 0 ]; then
  echo "run-evals: FAILED - the eval verdict passed but the cost check exited with code $COST_RC." >&2
  exit "$COST_RC"
fi
echo "run-evals: OK - suite '$SUITE' passed and the run is within the AIU budget."
