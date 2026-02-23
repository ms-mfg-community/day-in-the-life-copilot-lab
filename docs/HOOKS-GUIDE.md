# Copilot CLI Hooks Guide

This guide explains how to use the everything-copilot hooks for multi-session coordination with GitHub Copilot CLI.

---

## Overview

The hook system provides two key capabilities:

1. **File Conflict Detection** (preToolUse) - Warns when multiple sessions try to edit the same file
2. **Activity Reporting** (postToolUse) - Logs tool usage for monitoring and debugging

These hooks integrate with the session broker to enable safe multi-session development.

---

## Prerequisites

### Required

- **GitHub Copilot CLI v0.0.396+** - Hooks API requires this version or later
- **Session Broker Running** - Start with `npm run broker` or use the auto-start skill
- **curl** (Linux/macOS/WSL) or **PowerShell 5.1+** (Windows)

### Check Your Copilot CLI Version

```bash
# Check version
copilot --version

# Should show v0.0.396 or higher
```

### Start the Session Broker

```bash
# From the everything-copilot directory
npm run broker

# Or start in background
npm run broker &

# Verify it's running
curl http://localhost:3456/health
```

---

## Installation

### 1. Copy Hook Configuration

The hooks are configured in `.github/hooks/default.json`. When you clone or update everything-copilot, the configuration is already in place.

### 2. Copy Hook Scripts

Ensure the hook scripts exist in `scripts/hooks/`:

```bash
ls scripts/hooks/pre-tool-use-file-intent.sh
ls scripts/hooks/post-tool-use-activity-report.sh
```

### 3. Make Scripts Executable (Linux/macOS/WSL)

```bash
chmod +x scripts/hooks/*.sh
```

### 4. Verify Hooks Load

Start a new Copilot CLI session from the project directory:

```bash
cd /path/to/your/project
copilot
```

The hooks should load automatically from `.github/hooks/default.json`.

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_BROKER_URL` | `http://localhost:3456` | Session broker URL |
| `COPILOT_HOOK_DEBUG` | `false` | Enable verbose debug output |
| `COPILOT_DISABLE_FILE_INTENT` | `false` | Disable conflict checking |
| `COPILOT_DISABLE_ACTIVITY_LOGGING` | `false` | Disable activity logging |
| `COPILOT_BLOCK_ON_CONFLICT` | `false` | Block edits on conflict (vs warn) |

### Example: Enable Debug Mode

```bash
# Bash
export COPILOT_HOOK_DEBUG=true
copilot

# PowerShell
$env:COPILOT_HOOK_DEBUG = "true"
copilot
```

### Example: Block on Conflicts

By default, conflicts show a warning but allow the edit. To block edits when conflicts are detected:

```bash
export COPILOT_BLOCK_ON_CONFLICT=true
```

---

## How It Works

### File Conflict Detection (preToolUse)

When you use the `edit`, `write`, or `create` tools:

1. Hook reads the target file path
2. Hook calls `/api/declare_intent` on the session broker
3. Broker checks if another session has declared intent on the same file
4. If conflict: Warning displayed with conflicting session info
5. If no conflict: Silent success

**Example Warning:**
```
============================================
  FILE CONFLICT DETECTED
============================================

  File: /project/src/auth.ts

  Another session is working on this file:

    - Session: session-abc123
      Purpose: Implementing login feature
      Since: 2026-02-04T10:25:00Z

============================================

  Proceeding anyway (set COPILOT_BLOCK_ON_CONFLICT=true to block)
```

### Activity Reporting (postToolUse)

After any tool completes:

1. Hook captures tool name and any modified files
2. Hook calls `/api/report_activity` on the session broker
3. Activity is logged for monitoring (silent, no output)

This enables:
- Dashboard activity views
- Session activity timelines
- Debugging multi-session interactions

---

## Testing

### Test 1: Verify Hooks Execute

Enable debug mode and trigger a file edit:

```bash
export COPILOT_HOOK_DEBUG=true
copilot
# In Copilot: "Create a file called test.txt with hello world"
```

You should see debug output like:
```
DEBUG: Checking intent for /project/test.txt
DEBUG: POST http://localhost:3456/api/declare_intent
```

### Test 2: Conflict Detection

1. Start Session A:
```bash
# Terminal 1
copilot
# Edit src/file.ts
```

2. Start Session B:
```bash
# Terminal 2
copilot
# Try to edit the same src/file.ts
```

Session B should show a conflict warning.

### Test 3: Graceful Degradation

1. Stop the session broker
2. Try editing a file in Copilot CLI
3. Hook should fail silently (no blocking, debug message only)

---

## Troubleshooting

### Hooks Not Loading

**Symptom:** No warnings or debug output

**Check:**
1. Are you in a directory with `.github/hooks/default.json`?
2. Is the JSON valid? `python3 -c "import json; json.load(open('.github/hooks/default.json'))"`
3. Is Copilot CLI version 0.0.396 or later?

### Connection Refused

**Symptom:** Debug shows "Failed to connect to session broker"

**Fix:**
1. Start the session broker: `npm run broker`
2. Check it's running: `curl http://localhost:3456/health`
3. Check the URL: Is `SESSION_BROKER_URL` set correctly?

### No Session ID

**Symptom:** Debug shows "No session ID file, using temp ID"

**Cause:** Session wasn't registered with the broker at start.

**Fix:**
1. Ensure `session-start.sh` hook is configured and running
2. Check `.github/.session` file exists after starting Copilot
3. Manually register: Use the session broker MCP tools

### Permission Denied (Linux/macOS)

**Symptom:** Hook fails with permission error

**Fix:**
```bash
chmod +x scripts/hooks/*.sh
```

### PowerShell Execution Policy (Windows)

**Symptom:** PowerShell scripts won't run

**Fix:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## Platform Notes

### Linux / macOS

- Hooks use `curl` for HTTP requests
- Scripts require bash and standard Unix tools
- Make scripts executable with `chmod +x`

### Windows (PowerShell)

- Hooks use `Invoke-WebRequest` for HTTP requests
- Requires PowerShell 5.1 or later
- May need execution policy adjustment

### WSL (Windows Subsystem for Linux)

- Use the Bash versions of hooks
- Ensure curl is installed: `sudo apt install curl`
- Session broker can run in WSL or Windows (use correct URL)

---

## Advanced Configuration

### Custom Broker URL

If running the broker on a different port or host:

```bash
export SESSION_BROKER_URL=http://192.168.1.100:3456
```

### Disable Specific Hooks

To disable conflict checking but keep activity logging:

```bash
export COPILOT_DISABLE_FILE_INTENT=true
```

To disable activity logging but keep conflict checking:

```bash
export COPILOT_DISABLE_ACTIVITY_LOGGING=true
```

### Custom Timeout

Edit `.github/hooks/default.json` to adjust timeouts:

```json
{
  "type": "command",
  "bash": "./scripts/hooks/pre-tool-use-file-intent.sh",
  "timeoutSec": 15,  // Increase from default 10
  "comment": "..."
}
```

---

## Integration with Dashboard

When the GUI dashboard (Stream 3) is running, hook activity appears in:

- **Sessions View** - Shows registered sessions
- **Conflicts View** - Shows file conflict alerts
- **Activity Log** - Shows tool usage timeline

Start the dashboard:
```bash
cd src/dashboard
npm run dev
# Open http://localhost:3000
```

---

## API Reference

### /api/declare_intent

Declare intent to modify a file.

**Request:**
```json
POST /api/declare_intent
{
  "session_id": "session-abc123",
  "file": "/path/to/file.ts",
  "operation": "write"
}
```

**Response:**
```json
{
  "conflict": true,
  "conflicting_sessions": [
    {
      "session_id": "session-xyz789",
      "purpose": "Feature implementation",
      "declared_at": "2026-02-04T10:25:00Z"
    }
  ]
}
```

### /api/report_activity

Report tool activity (fire-and-forget).

**Request:**
```json
POST /api/report_activity
{
  "session_id": "session-abc123",
  "tool": "edit",
  "files_modified": ["/path/to/file.ts"],
  "timestamp": "2026-02-04T10:30:00Z"
}
```

**Response:**
```json
{
  "logged": true
}
```

---

## Related Documentation

- [HOOKS-DESIGN.md](./HOOKS-DESIGN.md) - Technical design document
- [MANUAL-TESTING.md](./MANUAL-TESTING.md) - Testing scenarios
- [EPIC-005](./epics/EPIC-005-production-ready.md) - Production-ready enhancement epic

---

## Changelog

| Date | Change |
|------|--------|
| 2026-02-04 | Initial documentation for Stream 4 |
