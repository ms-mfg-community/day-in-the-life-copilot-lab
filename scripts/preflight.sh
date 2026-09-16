#!/usr/bin/env bash
# preflight.sh — Advanced Copilot CLI Workshop readiness check.
#
# Verifies that the machine running this script meets the prerequisites
# for the live workshop and (optionally, with --lab14) for the Lab 14
# tmux-orchestrator pattern.
#
# Classification contract:
#   FAIL — workshop cannot proceed here; remediation required.
#   WARN — degraded but workable; note the caveat.
#   PASS — ready.
#
# Exit code is 1 if any check is FAIL, else 0. Human output is printed
# to stdout/stderr; `--json` emits a single JSON object to stdout for
# tooling (and the test suite).
#
# Test hooks (intentional; documented for CI + the vitest suite):
#   PREFLIGHT_OS        linux|darwin|wsl2|wsl1|windows — overrides OS detection.
#   PREFLIGHT_REPO_PATH absolute path used for the "repo on /mnt/c/" check.
#
set -uo pipefail

LAB14=0
JSON=0
for arg in "$@"; do
  case "$arg" in
    --lab14) LAB14=1 ;;
    --json)  JSON=1 ;;
    -h|--help)
      printf '%s\n' \
        'preflight.sh — Advanced Copilot CLI Workshop readiness check' \
        '' \
        'Usage:' \
        '  scripts/preflight.sh [--lab14] [--json]' \
        '' \
        'Options:' \
        '  --lab14   Enable Lab 14 (tmux-orchestrator) strict checks: tmux' \
        '            becomes required; WSL1 and Windows PowerShell-only' \
        '            configurations are classified as FAIL instead of WARN.' \
        '  --json    Emit a machine-readable JSON report on stdout instead of' \
        '            the human-readable summary.' \
        '  -h, --help  Show this message.' \
        '' \
        'Exit codes:' \
        '  0  No FAIL checks (warnings may be present).' \
        '  1  At least one FAIL check.'
      exit 0
      ;;
    *)
      echo "preflight: unknown argument: $arg" >&2
      echo "Run 'scripts/preflight.sh --help' for usage." >&2
      exit 2
      ;;
  esac
done

# ----- accumulators ---------------------------------------------------------

CHECK_IDS=()
CHECK_STATUSES=()
CHECK_MESSAGES=()
CHECK_REMEDIATIONS=()

record() {
  # record <id> <status> <message> <remediation>
  CHECK_IDS+=("$1")
  CHECK_STATUSES+=("$2")
  CHECK_MESSAGES+=("$3")
  CHECK_REMEDIATIONS+=("$4")
}

# ----- OS detection ---------------------------------------------------------

detect_os() {
  if [ -n "${PREFLIGHT_OS:-}" ]; then
    echo "$PREFLIGHT_OS"
    return
  fi
  # Fall back to uname only when no override is given; guard against
  # uname being absent from a minimal PATH.
  local uname_s=""
  if command -v uname >/dev/null 2>&1; then
    uname_s=$(uname -s 2>/dev/null || echo unknown)
  fi
  case "$uname_s" in
    Darwin) echo darwin ;;
    Linux)
      local proc_version=""
      if [ -r /proc/version ]; then
        proc_version=$(< /proc/version)
      fi
      if [[ "$proc_version" == *icrosoft* || "$proc_version" == *WSL* ]]; then
        if [[ "$proc_version" == *microsoft-standard* ]] \
           || [ -n "${WSL_INTEROP:-}" ] \
           || [ -n "${WSL_DISTRO_NAME:-}" ]; then
          echo wsl2
        else
          echo wsl1
        fi
      else
        echo linux
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*) echo windows ;;
    *) echo "${uname_s:-unknown}" ;;
  esac
}

OS=$(detect_os)
REPO_PATH="${PREFLIGHT_REPO_PATH:-$(pwd)}"

# ----- tool checks ----------------------------------------------------------

have() { command -v "$1" >/dev/null 2>&1; }

check_tool_required() {
  # check_tool_required <id> <cmd> <message_present> <remediation_missing>
  local id="$1" cmd="$2" ok_msg="$3" fix="$4"
  if have "$cmd"; then
    record "$id" pass "$ok_msg" ""
  else
    record "$id" fail "$cmd not found on PATH" "$fix"
  fi
}

check_tool_required git     git     "git on PATH" \
  "Install git: https://git-scm.com/downloads"
check_tool_required gh      gh      "GitHub CLI on PATH" \
  "Install GitHub CLI: https://cli.github.com/ (then 'gh auth login')"
check_tool_required copilot copilot "Copilot CLI on PATH" \
  "Install Copilot CLI: npm install -g @github/copilot (see https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)"
check_tool_required node    node    "Node.js on PATH" \
  "Install Node.js 18+ from https://nodejs.org/"

# tmux — FAIL under --lab14, WARN otherwise.
if have tmux; then
  record tmux pass "tmux on PATH" ""
else
  if [ "$LAB14" -eq 1 ]; then
    record tmux fail "tmux not found on PATH (required for Lab 14)" \
      "Install tmux — Linux: 'sudo apt-get install -y tmux'; macOS: 'brew install tmux'; Windows: run the workshop inside WSL2 and install tmux there."
  else
    record tmux warn "tmux not found on PATH (required for Lab 14, optional elsewhere)" \
      "Install tmux before Lab 14 — Linux: 'sudo apt-get install -y tmux'; macOS: 'brew install tmux'."
  fi
fi

# container runtime — WARN if neither docker nor podman is available.
if have docker || have podman; then
  if have docker; then
    record container-runtime pass "docker on PATH" ""
  else
    record container-runtime pass "podman on PATH" ""
  fi
else
  record container-runtime warn \
    "No container runtime (docker or podman) detected" \
    "Install Docker Desktop, Podman Desktop, or use GitHub Codespaces for the devcontainer path."
fi

# gh-aw extension — WARN if missing (used by Labs 08–09 only).
if have gh; then
  gh_ext_out=""
  if gh_ext_out=$(gh extension list 2>/dev/null); then :; fi
  if [[ "$gh_ext_out" == *gh-aw* ]]; then
    record gh-aw pass "gh-aw extension installed" ""
  else
    record gh-aw warn "gh-aw extension not installed (needed for Labs 08–09)" \
      "Run: gh extension install github/gh-aw"
  fi
else
  # If gh itself is missing we already FAIL'd above; don't double-report.
  record gh-aw warn "skipped — gh CLI is missing" \
    "Install gh first (see above), then: gh extension install github/gh-aw"
fi

# ----- OS classification ----------------------------------------------------

os_check() {
  case "$OS" in
    darwin|linux)
      record os pass "native $OS — fully supported" ""
      ;;
    wsl2)
      case "$REPO_PATH" in
        /mnt/c/*|/mnt/C/*|/mnt/d/*|/mnt/D/*)
          record os warn \
            "WSL2 with repo under $REPO_PATH — degraded (slow file I/O, file-watcher flakiness)" \
            "Move the repo onto the Linux filesystem (e.g. ~/repos/<name> under \$HOME) before the workshop. See labs/lab14.md compatibility matrix."
          ;;
        *)
          record os pass "WSL2 with repo on Linux filesystem — recommended Windows config" ""
          ;;
      esac
      ;;
    wsl1)
      if [ "$LAB14" -eq 1 ]; then
        record os fail \
          "WSL1 is not supported for Lab 14 (no working tmux/interop guarantees)" \
          "Upgrade to WSL2: 'wsl --set-version <distro> 2' (Windows 10 2004+/Windows 11). See labs/lab14.md compatibility matrix."
      else
        record os warn \
          "WSL1 is not tested for this workshop" \
          "Prefer WSL2 — 'wsl --set-version <distro> 2'."
      fi
      ;;
    windows)
      if [ "$LAB14" -eq 1 ]; then
        record os fail \
          "Windows PowerShell-only is unsupported for Lab 14 (tmux-orchestrator requires a Unix environment)" \
          "Run the workshop inside WSL2 with the repo on the Linux filesystem, or use GitHub Codespaces. See labs/lab14.md compatibility matrix."
      else
        record os warn \
          "Windows native shell — some labs (Lab 14 in particular) require a Unix environment" \
          "Use WSL2 or GitHub Codespaces for full coverage."
      fi
      ;;
    *)
      record os warn "Unknown OS: $OS" \
        "If this is not macOS / Linux / WSL2, see labs/lab14.md compatibility matrix before the workshop."
      ;;
  esac
}
os_check

# ----- emit -----------------------------------------------------------------

FAILS=0
WARNS=0
for s in "${CHECK_STATUSES[@]}"; do
  case "$s" in
    fail) FAILS=$((FAILS + 1)) ;;
    warn) WARNS=$((WARNS + 1)) ;;
  esac
done

json_escape() {
  # Minimal JSON string escape: backslash, double-quote, newline, tab, CR.
  local s="$1"
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

emit_json() {
  printf '{"os":"%s","lab14":%s,"fails":%d,"warns":%d,"checks":[' \
    "$(json_escape "$OS")" "$([ "$LAB14" -eq 1 ] && echo true || echo false)" "$FAILS" "$WARNS"
  local i
  for i in "${!CHECK_IDS[@]}"; do
    [ "$i" -gt 0 ] && printf ','
    printf '{"id":"%s","status":"%s","message":"%s","remediation":"%s"}' \
      "$(json_escape "${CHECK_IDS[$i]}")" \
      "$(json_escape "${CHECK_STATUSES[$i]}")" \
      "$(json_escape "${CHECK_MESSAGES[$i]}")" \
      "$(json_escape "${CHECK_REMEDIATIONS[$i]}")"
  done
  printf ']}\n'
}

emit_human() {
  echo "Advanced Copilot CLI Workshop — preflight"
  echo "OS: $OS  |  Lab 14 strict: $([ "$LAB14" -eq 1 ] && echo on || echo off)"
  echo
  local i status icon
  for i in "${!CHECK_IDS[@]}"; do
    status="${CHECK_STATUSES[$i]}"
    case "$status" in
      pass) icon="✅" ;;
      warn) icon="⚠️ " ;;
      fail) icon="❌" ;;
    esac
    printf '  %s %-20s %s\n' "$icon" "${CHECK_IDS[$i]}" "${CHECK_MESSAGES[$i]}"
    if [ "$status" != "pass" ] && [ -n "${CHECK_REMEDIATIONS[$i]}" ]; then
      printf '        → %s\n' "${CHECK_REMEDIATIONS[$i]}"
    fi
  done
  echo
  echo "Summary: $FAILS FAIL, $WARNS WARN"
  if [ "$FAILS" -gt 0 ]; then
    echo "Result: NOT READY — address FAIL items above before the workshop."
  elif [ "$WARNS" -gt 0 ]; then
    echo "Result: READY (with warnings) — review WARN items before the workshop."
  else
    echo "Result: READY ✅"
  fi
}

if [ "$JSON" -eq 1 ]; then
  emit_json
else
  emit_human
fi

[ "$FAILS" -gt 0 ] && exit 1
exit 0
