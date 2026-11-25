#!/usr/bin/env bash
# Lab 27 offline checks: Tier 0, plus the Tier 1 Vally checks when the pinned CLI is installed.
# None needs a model call, credentials or a global install.
#
#   Step 1  node evals/graders/self-check.cjs                      (Demo A)
#   Step 2  node evals/graders/eval-cost.cjs <recorded results>    (Demo C)
#   Step 3  vally lint + vally grade (Demo B), ONLY when the installed vally is the
#           version pinned by vally_cli_version in docs/_meta/registry.yaml. Any other
#           version, or no vally at all, skips this step with a note and still exits 0:
#           eval specs are version-specific (the pinned release rejects an unknown
#           stimulus field and requires lowercase kebab-case grader names), so a lint
#           result from the wrong CLI would mislead more than it would help.
#
# It does not run Demo D, the mock-executor `vally eval` and its --require-pass exit-code
# check: Lab 27 section 27.6 runs those by hand.
#
# Nothing here calls a model, so it spends 0 AIU. Run from anywhere:
#
#   bash labs/fixtures/lab27/scripts/tier0.sh

set -euo pipefail

# Vally's CLI usage telemetry is separate from evaluation tracing; opt out of it for scripted runs.
export VALLY_TELEMETRY_OPTOUT=1

LAB27_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$LAB27_DIR/../../.." && pwd)"
REGISTRY="$REPO_ROOT/docs/_meta/registry.yaml"

fail() {
  echo "tier0: FAILED - $1" >&2
  exit "${2:-1}"
}

command -v node >/dev/null 2>&1 || fail "node was not found on PATH (Tier 0 needs Node 18 or newer)."

cd "$LAB27_DIR"

echo "== Tier 0, step 1 of 3: grader self-check (Demo A) =="
node evals/graders/self-check.cjs || fail "self-check.cjs failed." "$?"

echo
echo "== Tier 0, step 2 of 3: root-only AIU on the recorded fixture (Demo C) =="
node evals/graders/eval-cost.cjs evals/fixtures/recorded-results.jsonl || fail "eval-cost.cjs failed." "$?"

echo
echo "== Tier 1 (free), step 3 of 3: Vally CLI checks (only for the pinned version) =="
PINNED=""
if [ -f "$REGISTRY" ]; then
  PINNED="$(sed -n -E 's/^vally_cli_version:[[:space:]]*"([^"]+)".*/\1/p' "$REGISTRY" | head -n 1)"
fi
[ -n "$PINNED" ] || fail "vally_cli_version was not found in docs/_meta/registry.yaml."

if ! command -v vally >/dev/null 2>&1; then
  echo "SKIP: vally is not on PATH. To run lint and Demo B: npm install -g @microsoft/vally-cli@$PINNED (Node 22.15 or newer), then run this script again."
else
  # A vally on PATH that cannot run (for example a Windows shim seen from WSL) must
  # not abort the gate: treat "no version reported" as a mismatch and skip.
  INSTALLED="$(vally --version 2>/dev/null | head -n 1 | tr -d '[:space:]' || true)"
  if [ "$INSTALLED" != "$PINNED" ]; then
    echo "SKIP: the vally on PATH reports '${INSTALLED:-no version}' but docs/_meta/registry.yaml pins $PINNED. Install the pinned version to run lint and Demo B: npm install -g @microsoft/vally-cli@$PINNED"
  else
    for spec in \
      evals/hermetic/reviewer-routing/eval.yaml \
      evals/hermetic/skill-triggers/eval.yaml \
      evals/guards/no-unapproved-push/eval.yaml \
      evals/guards/secret-scan-guard/eval.yaml; do
      vally lint -e "$spec" --strict || fail "vally lint --strict rejected $spec." "$?"
    done

    echo
    echo "Demo B: re-grade the recorded trajectories offline (the --workspace warning is expected: all 3 are graded against the same directory)"
    vally grade --eval-spec evals/hermetic/reviewer-routing/eval.yaml --workspace . --require-pass \
      < evals/fixtures/recorded-results.jsonl || fail "vally grade --require-pass failed." "$?"
  fi
fi

echo
echo "tier0: OK (0 model calls, 0 AIU)"
