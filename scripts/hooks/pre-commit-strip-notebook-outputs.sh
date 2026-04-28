#!/usr/bin/env bash
# pre-commit-strip-notebook-outputs.sh
#
# Strip outputs[] and reset execution_count for every code cell in the given
# Jupyter notebook(s). Designed to be wired up as a Git pre-commit hook so
# committed .ipynb files never contain rendered outputs (which can leak
# secrets, balloon diffs, and break notebook git-merge tools).
#
# Usage:
#   pre-commit-strip-notebook-outputs.sh path/to/notebook.ipynb [more.ipynb ...]
#
# As a pre-commit hook, install with:
#   git config core.hooksPath .githooks
#   ln -s ../scripts/hooks/pre-commit-strip-notebook-outputs.sh .githooks/pre-commit
# (or invoke from your existing .git/hooks/pre-commit script — see lab12).
#
# Idempotent: rewrites the file in place atomically; running twice is a no-op.

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required by pre-commit-strip-notebook-outputs.sh" >&2
  echo "       Install jq (e.g. apt-get install jq, brew install jq)." >&2
  exit 2
fi

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 path/to/notebook.ipynb [more.ipynb ...]" >&2
  exit 64
fi

strip_one() {
  local nb="$1"
  if [ ! -f "$nb" ]; then
    echo "WARN: not a file, skipping: $nb" >&2
    return 0
  fi
  case "$nb" in
    *.ipynb) ;;
    *)
      echo "WARN: not a .ipynb file, skipping: $nb" >&2
      return 0
      ;;
  esac

  local tmp
  tmp="$(mktemp "${nb}.stripXXXXXX")"
  # For every code cell: outputs := [], execution_count := null. Leave markdown
  # and raw cells untouched. Indentation 1 keeps diffs minimal vs. nbformat's
  # canonical layout.
  jq --indent 1 '
    .cells |= map(
      if .cell_type == "code" then
        .outputs = [] | .execution_count = null
      else
        .
      end
    )
  ' "$nb" >"$tmp"

  # Replace atomically so a partial write can never corrupt the notebook.
  mv -- "$tmp" "$nb"
}

for nb in "$@"; do
  strip_one "$nb"
done
