#!/usr/bin/env bash
# Post-tool-use hook: Verify .NET build after editing C# files
# Fires after: edit tool completes on .cs files

set -euo pipefail

# Only run after file edits
TOOL_NAME="${TOOL_NAME:-}"
FILE_PATH="${FILE_PATH:-}"

if [[ "$TOOL_NAME" != "edit" && "$TOOL_NAME" != "create" ]]; then
  exit 0
fi

# Only check C# files
if [[ "$FILE_PATH" != *.cs ]]; then
  exit 0
fi

# Run dotnet build and capture output
BUILD_OUTPUT=$(dotnet build ContosoUniversity.sln --nologo --verbosity quiet 2>&1) || {
  echo "⚠️  BUILD FAILED after editing $FILE_PATH"
  echo ""
  echo "$BUILD_OUTPUT" | tail -20
  echo ""
  echo "Fix the build errors before continuing."
  exit 1
}

echo "✅ Build succeeded after editing $FILE_PATH"
