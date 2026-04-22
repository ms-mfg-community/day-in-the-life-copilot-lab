#!/usr/bin/env bash
# example-hook.sh — starter pre-tool-use hook bundled with the Contoso plugin.
#
# Copilot invokes hooks with a JSON payload on stdin. This starter hook simply
# logs the tool name to stderr and exits 0. Replace with your own guardrails
# (secret scanning, path allowlist, build-fail prevention).

set -euo pipefail

payload="$(cat || true)"
tool_name="$(printf '%s' "$payload" | grep -oE '"tool"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"([^"]+)"$/\1/')"

if [ -n "${tool_name:-}" ]; then
  echo "[contoso-copilot-starter] hook observed tool=${tool_name}" >&2
fi

exit 0
