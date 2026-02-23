---
description: "Detect and configure preferred package manager (npm/pnpm/yarn/bun) for project or globally"
agent: "agent"
argument-hint: "--detect | --global <pm> | --project <pm> | --list"
---

# Package Manager Setup

Configure your preferred package manager for this project or globally.

## Usage

```bash
# Detect current package manager
node scripts/setup-package-manager.js --detect

# Set global preference
node scripts/setup-package-manager.js --global pnpm

# Set project preference
node scripts/setup-package-manager.js --project bun

# List available package managers
node scripts/setup-package-manager.js --list
```

## Detection Priority

1. **Environment variable**: `COPILOT_PACKAGE_MANAGER`
2. **Project config**: `.github/package-manager.json`
3. **package.json**: `packageManager` field
4. **Lock file**: Presence of package-lock.json, yarn.lock, pnpm-lock.yaml, or bun.lockb
5. **Global config**: `~/.copilot/package-manager.json`
6. **Fallback**: First available (pnpm > bun > yarn > npm)

## Configuration Files

### Global Configuration
```json
// ~/.copilot/package-manager.json
{
  "packageManager": "pnpm"
}
```

### Project Configuration
```json
// .github/package-manager.json
{
  "packageManager": "bun"
}
```

## Environment Variable

```bash
# macOS/Linux
export COPILOT_PACKAGE_MANAGER=pnpm

# Windows (PowerShell)
$env:COPILOT_PACKAGE_MANAGER = "pnpm"
```

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, describe the task directly.
