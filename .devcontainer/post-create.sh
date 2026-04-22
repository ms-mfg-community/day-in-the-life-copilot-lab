#!/usr/bin/env bash
set -euo pipefail

echo "=== Installing lab prerequisites ==="

# Copilot CLI
echo "Installing GitHub Copilot CLI..."
npm install -g @github/copilot

# GitHub Agentic Workflows extension
echo "Installing gh-aw extension..."
gh extension install github/gh-aw || true

# jq (used by hook scripts)
echo "Installing jq..."
sudo apt-get update -qq && sudo apt-get install -y -qq jq > /dev/null

# Restore .NET packages
echo "Restoring .NET packages..."
dotnet restore dotnet/ContosoUniversity.sln

# Build the solution to verify everything works
echo "Building solution..."
dotnet build dotnet/ContosoUniversity.sln --no-restore

# Node track: install workspace deps if pnpm is available
if command -v pnpm >/dev/null 2>&1; then
  echo "Installing Node track dependencies (pnpm -C node install)..."
  pnpm -C node install
else
  echo "pnpm not found on PATH; skipping Node workspace install."
  echo "  -> See .devcontainer/devcontainer.json (pnpm feature) or run 'npm i -g pnpm'."
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "Verify your tools:"
echo "  dotnet --version          → .NET SDK"
echo "  node --version            → Node.js (expect 20.x)"
echo "  pnpm --version            → pnpm"
echo "  gh --version              → GitHub CLI"
echo "  copilot --version         → Copilot CLI"
echo "  gh aw version             → Agentic Workflows"
echo "  jq --version              → JSON processor"
echo ""
echo "Next steps:"
echo "  1. Run 'copilot login' to authenticate the Copilot CLI"
echo "  2. Run 'gh auth login' to authenticate the GitHub CLI"
echo "  3. Pick a track:"
echo "       .NET   → make test-dotnet  (or: dotnet test dotnet/ContosoUniversity.sln)"
echo "       Node   → make test-node    (or: pnpm -C node test)"
echo "  4. Open README.md and continue from Verify Copilot CLI"
