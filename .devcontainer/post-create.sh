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

# ── .NET Setup ──
echo ""
echo "=== Setting up .NET application ==="
dotnet restore ContosoUniversity.sln
dotnet build ContosoUniversity.sln --no-restore

# ── Python Setup ──
echo ""
echo "=== Setting up Python application ==="
cd ContosoUniversity_Python
pip install --quiet -r requirements.txt
pip install --quiet -r requirements-dev.txt
echo "Python dependencies installed."

# Verify Python app can start
python -c "from app import create_app; app = create_app('testing'); print('Python app factory: OK')"
cd ..

echo ""
echo "=== Setup complete ==="
echo ""
echo "Verify your tools:"
echo "  dotnet --version          → .NET SDK"
echo "  python --version          → Python"
echo "  node --version            → Node.js"
echo "  gh --version              → GitHub CLI"
echo "  copilot --version         → Copilot CLI"
echo "  gh aw version             → Agentic Workflows"
echo "  jq --version              → JSON processor"
echo ""
echo "Run the apps:"
echo "  .NET:   dotnet run --project ContosoUniversity.Web"
echo "  Python: cd ContosoUniversity_Python && python run.py"
echo ""
echo "Run the tests:"
echo "  .NET:   dotnet test ContosoUniversity.Tests"
echo "  Python: cd ContosoUniversity_Python && python -m pytest tests/ -v"
echo ""
echo "Next steps:"
echo "  1. Run 'copilot login' to authenticate the Copilot CLI"
echo "  2. Run 'gh auth login' to authenticate the GitHub CLI"
echo "  3. Open labs/setup.md and continue from S.2"
