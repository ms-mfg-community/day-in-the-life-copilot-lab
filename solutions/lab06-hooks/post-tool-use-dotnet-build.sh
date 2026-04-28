#!/usr/bin/env bash
# post-tool-use-dotnet-build.sh — Verify .NET build after Copilot edits a C# file.
#
# Copilot CLI 1.0.37 hook IPC contract (per binary inspection of SJt/EJt):
#   - Event payload arrives as JSON on STDIN, NOT in env vars.
#   - Only COPILOT_PROJECT_DIR and CLAUDE_PROJECT_DIR are exported to the child.
#   - TOOL_NAME / FILE_PATH env vars are NEVER set — older docs are wrong.
#
# postToolUse payload shape:
#   { sessionId, timestamp, cwd, toolName, toolArgs (parsed object),
#     toolResult: { resultType, textResultForLlm } }

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for hooks. Install jq and retry." >&2
  exit 1
fi

INPUT="$(cat)"
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
FILE_PATH=$(echo "$INPUT" | jq -r '.toolArgs.file_path // .toolArgs.path // ""')

if [[ "$TOOL_NAME" != "edit" && "$TOOL_NAME" != "create" && "$TOOL_NAME" != "write" ]]; then
  exit 0
fi

if [[ "$FILE_PATH" != *.cs && "$FILE_PATH" != *.csproj && "$FILE_PATH" != *.cshtml ]]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-${COPILOT_PROJECT_DIR:-$CWD}}"
SOLUTION="$PROJECT_DIR/dotnet/ContosoUniversity.sln"

if BUILD_OUTPUT=$(dotnet build "$SOLUTION" --nologo --verbosity quiet 2>&1); then
  echo "✅ Build succeeded after editing $FILE_PATH"
  exit 0
fi

echo "⚠️  BUILD FAILED after editing $FILE_PATH"
echo ""
printf '%s\n' "$BUILD_OUTPUT" | tail -20
echo ""
echo "Fix the build errors before continuing."
exit 1
