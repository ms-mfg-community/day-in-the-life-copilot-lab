#!/usr/bin/env bash
# block-self-edit-hook.sh — pre-tool-use guardrail bundled with the
# modernization-bundle plugin.
#
# Copilot invokes hooks with a JSON payload on stdin before a tool call.
# This hook blocks any edit/write tool call whose target path falls inside
# this plugin's own guardrail surface — its manifest, release workflow,
# CODEOWNERS, the drift-scanning agent, this hook itself, and the bundled
# scripts — the same self-exclusion rule documented in
# .github/workflows/self-improving-agents.md.
#
# BLOCKING CONTRACT (see labs/lab06.md §6.2): a preToolUse hook blocks by
# exiting 0 and writing a JSON decision to stdout. A non-zero exit is
# logged and SILENTLY IGNORED by the runtime, so `exit 1` can never deny.
# The working reference is scripts/hooks/pre-tool-use-secret-scan.sh.
#
# Note: no `-e`. A non-matching grep/jq must not abort the script, or
# benign edits would exit non-zero and be logged as hook errors.
set -uo pipefail

INPUT="$(cat || true)"

# Fail open, loudly: an inactive guard is better than a hook that errors on
# every tool call (an erroring preToolUse hook can wedge the whole session).
if ! command -v jq >/dev/null 2>&1; then
  echo "[modernization-bundle] WARN: jq not found — self-edit guard inactive." >&2
  exit 0
fi

TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.toolName // ""' 2>/dev/null \
  | tr '[:upper:]' '[:lower:]')"

# Lowercased above: the runtime's casing is not guaranteed (lab06.md shows
# both "edit" and "Bash"), and a case-sensitive match would silently render
# this guard inert.
case "$TOOL_NAME" in
  create|edit|write|multi_edit|multiedit|str_replace_editor) ;;
  *) exit 0 ;;
esac

# Asymmetry (lab06.md §6.2.1): in preToolUse, .toolArgs is a JSON-ENCODED
# STRING; in postToolUse it is already an object. `jq -r` yields re-parsable
# JSON text either way, so parse twice — same shape as the secret-scan hook.
ARGS="$(printf '%s' "$INPUT" | jq -r '.toolArgs // empty' 2>/dev/null || echo "")"
[ -n "$ARGS" ] || exit 0

# Collect EVERY file_path/path in the payload, at any depth, so multi-edit
# batches can't smuggle a protected path past a `head -1`.
PATHS="$(printf '%s' "$ARGS" \
  | jq -r '[.. | objects | (.file_path?, .path?)] | .[] | select(type == "string")' \
  2>/dev/null || echo "")"
[ -n "$PATHS" ] || exit 0

# Suffixes are lowercase and slash-normalised; compared against a canonical
# absolute path so ./, ../, //, \ and case variants can't slip through.
PROTECTED="\
modernization-bundle/manifest.yaml
modernization-bundle/.github/workflows/release.yml
modernization-bundle/codeowners
modernization-bundle/hooks/block-self-edit-hook.sh
modernization-bundle/agents/modernization-auditor.agent.md"

deny() {
  jq -cn --arg reason "$1" \
    '{permissionDecision: "deny", permissionDecisionReason: $reason}'
  exit 0
}

while IFS= read -r raw; do
  [ -n "$raw" ] || continue

  candidate="${raw//\\//}"                                    # \ -> /
  candidate="$(realpath -m -- "$candidate" 2>/dev/null || printf '%s' "$candidate")"
  candidate="$(printf '%s' "$candidate" | tr '[:upper:]' '[:lower:]')"
  candidate="$(printf '%s' "$candidate" | sed 's#//*#/#g')"   # collapse //
  # Win32 silently strips trailing spaces and dots, so "manifest.yaml." and
  # "manifest.yaml " both open the protected file. Strip them before matching.
  candidate="$(printf '%s' "$candidate" | sed 's#[ .]*$##')"

  while IFS= read -r pat; do
    [ -n "$pat" ] || continue
    case "$candidate" in
      "$pat"|*"/$pat")
        deny "[modernization-bundle] This plugin cannot edit its own guardrail surface (${pat}). Blocked to prevent the drift-scanner from removing the guard and then editing what it protects."
        ;;
    esac
  done <<< "$PROTECTED"

  # Bundled scripts: any .mjs under the plugin's scripts/ directory.
  case "$candidate" in
    *"/modernization-bundle/scripts/"*.mjs|"modernization-bundle/scripts/"*.mjs)
      deny "[modernization-bundle] This plugin cannot edit its own bundled scripts (modernization-bundle/scripts/*.mjs)."
      ;;
  esac
done <<< "$PATHS"

exit 0

