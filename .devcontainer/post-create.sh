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
dotnet restore ContosoUniversity.sln

# Build the solution to verify everything works
echo "Building solution..."
dotnet build ContosoUniversity.sln --no-restore

echo ""
echo "=== Setup complete ==="
echo ""
echo "Verify your tools:"
echo "  dotnet --version          → .NET SDK"
echo "  node --version            → Node.js"
echo "  gh --version              → GitHub CLI"
echo "  copilot --version         → Copilot CLI"
echo "  gh aw version             → Agentic Workflows"
echo "  jq --version              → JSON processor"
echo ""
echo "Next steps:"
echo "  1. Run 'copilot login' to authenticate the Copilot CLI"
echo "  2. Run 'gh auth login' to authenticate the GitHub CLI"
echo "  3. Open labs/setup.md and continue from S.2"
