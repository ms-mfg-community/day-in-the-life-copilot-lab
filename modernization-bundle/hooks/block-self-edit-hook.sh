#!/usr/bin/env bash
# block-self-edit-hook.sh — pre-tool-use guardrail bundled with the
# modernization-bundle plugin.
#
# Copilot invokes hooks with a JSON payload on stdin before a tool call.
# This hook blocks any edit/write tool call whose target path falls inside
# this plugin's own manifest, release workflow, or CODEOWNERS — the same
# self-exclusion rule documented in .github/workflows/self-improving-agents.md
# and the modernization-auditor agent's guardrails. Exit non-zero to block
# the tool call; exit 0 to allow it.

set -euo pipefail

payload="$(cat || true)"
tool_path="$(printf '%s' "$payload" | grep -oE '"path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"([^"]+)"$/\1/')"

case "${tool_path:-}" in
  *modernization-bundle/manifest.yaml|*modernization-bundle/.github/workflows/release.yml|*modernization-bundle/CODEOWNERS)
    echo "[modernization-bundle] blocked: this plugin cannot edit its own manifest/release-workflow/CODEOWNERS" >&2
    exit 1
    ;;
esac

exit 0
