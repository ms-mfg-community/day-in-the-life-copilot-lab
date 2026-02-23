# Copilot CLI Hook Integration Design

**Status:** Draft
**Created:** 2026-02-04
**Stream:** EPIC-005 Stream 4
**Author:** everything-copilot contributors

---

## Overview

This document specifies the design for integrating GitHub Copilot CLI hooks with the everything-copilot session broker. The hooks enable automatic file conflict detection and activity reporting for multi-session coordination.

**Scope:** GitHub Copilot CLI v0.0.396+ ONLY (not Claude Code)

**Goals:**
- Detect file conflicts before writes occur
- Log session activity for monitoring and debugging
- Never block user workflow on errors
- Support both Bash (Linux/macOS/WSL) and PowerShell (Windows)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Copilot CLI                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │ preToolUse  │───▶│  Tool Exec  │───▶│ postToolUse │         │
│  │   Hook      │    │ (Edit/Write)│    │    Hook     │         │
│  └──────┬──────┘    └─────────────┘    └──────┬──────┘         │
│         │                                      │                │
└─────────┼──────────────────────────────────────┼────────────────┘
          │                                      │
          ▼                                      ▼
┌─────────────────────┐                ┌─────────────────────┐
│  /api/declare_intent│                │ /api/report_activity│
│  (conflict check)   │                │ (activity logging)  │
└──────────┬──────────┘                └──────────┬──────────┘
           │                                      │
           ▼                                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Session Broker (port 3456)                   │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐  │
│  │  file_intents  │  │    sessions    │  │    activities    │  │
│  │    (SQLite)    │  │    (SQLite)    │  │    (SQLite)      │  │
│  └────────────────┘  └────────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Hook Input/Output Format

### preToolUse Hook

**Input (stdin JSON):**
```json
{
  "timestamp": "2026-02-04T10:30:00.000Z",
  "cwd": "/path/to/project",
  "toolName": "edit",
  "toolArgs": {
    "file_path": "/path/to/project/src/file.ts",
    "old_string": "...",
    "new_string": "..."
  }
}
```

**Output (stdout JSON, optional):**
```json
{
  "permissionDecision": "deny",
  "message": "File conflict detected with session abc123"
}
```

**Behavior:**
- Exit 0: Allow tool execution (default)
- Output JSON with `permissionDecision: "deny"`: Block tool execution

### postToolUse Hook

**Input (stdin JSON):**
```json
{
  "timestamp": "2026-02-04T10:30:05.000Z",
  "cwd": "/path/to/project",
  "toolName": "edit",
  "toolArgs": { "file_path": "/path/to/project/src/file.ts" },
  "toolResult": { "success": true }
}
```

**Output:** None (silent logging)

---

## API Contracts

### POST /api/declare_intent

Declares intent to modify a file before the operation occurs.

**Request:**
```json
{
  "session_id": "session-abc123",
  "file": "/path/to/project/src/file.ts",
  "operation": "write"
}
```

**Response (200 OK):**
```json
{
  "conflict": false,
  "conflicting_sessions": []
}
```

**Response with conflict (200 OK):**
```json
{
  "conflict": true,
  "conflicting_sessions": [
    {
      "session_id": "session-xyz789",
      "purpose": "Implementing authentication feature",
      "declared_at": "2026-02-04T10:25:00.000Z"
    }
  ]
}
```

**Error Response (500):**
```json
{
  "error": "Database connection failed"
}
```

### POST /api/report_activity

Reports tool activity after completion (observational, no response needed).

**Request:**
```json
{
  "session_id": "session-abc123",
  "tool": "edit",
  "files_modified": ["/path/to/project/src/file.ts"],
  "timestamp": "2026-02-04T10:30:05.000Z"
}
```

**Response (200 OK):**
```json
{
  "logged": true
}
```

---

## Session ID Strategy

### Problem

Copilot CLI hook input doesn't include a session identifier. We need a way to correlate hook calls with registered sessions.

### Solution: File-Based Session ID

1. **Session Registration:** When a session starts, it registers with the broker and receives a session_id. The `sessionStart` hook stores this ID in `.copilot-session-id` file in CWD.

2. **Hook Execution:** preToolUse and postToolUse hooks read session_id from `.copilot-session-id`.

3. **Fallback:** If file doesn't exist, generate a temporary UUID and log a warning suggesting the user register their session.

### Session ID File Format

**File:** `.copilot-session-id` (in project root)

```
session-abc123-def456
```

Single line, no newline at end, plain text session ID.

### Integration with sessionStart Hook

```bash
# In session-start.sh
# After registering with broker:
RESPONSE=$(curl -s -X POST http://localhost:3456/api/register_session ...)
SESSION_ID=$(echo "$RESPONSE" | jq -r '.session_id')
echo -n "$SESSION_ID" > .copilot-session-id
```

---

## Error Handling Strategy

### Principles

1. **Never block user workflow** on broker errors
2. **Fail silently** with stderr logging
3. **Timeout aggressively** (5s for preToolUse, 3s for postToolUse)
4. **Degrade gracefully** when dependencies unavailable

### Error Scenarios

| Scenario | preToolUse Behavior | postToolUse Behavior |
|----------|---------------------|----------------------|
| Broker not running | Log warning, exit 0 | Silent exit 0 |
| Connection timeout | Log warning, exit 0 | Silent exit 0 |
| Invalid response JSON | Log warning, exit 0 | Silent exit 0 |
| Missing session ID file | Generate temp ID, warn | Generate temp ID, silent |
| HTTP 500 error | Log warning, exit 0 | Silent exit 0 |
| Tool not edit/write | Skip hook (exit 0) | Report activity anyway |

### Timeout Configuration

```bash
# preToolUse: More critical, slightly longer timeout
TIMEOUT=5  # seconds

# postToolUse: Less critical, shorter timeout
TIMEOUT=3  # seconds
```

---

## Hook Scripts

### File Locations

Following existing hook pattern:
- **Config:** `.github/hooks/default.json`
- **Scripts:** `scripts/hooks/`

### New Files

| File | Purpose |
|------|---------|
| `scripts/hooks/pre-tool-use-file-intent.sh` | Bash preToolUse hook |
| `scripts/hooks/pre-tool-use-file-intent.ps1` | PowerShell preToolUse hook |
| `scripts/hooks/post-tool-use-activity-report.sh` | Bash postToolUse hook |
| `scripts/hooks/post-tool-use-activity-report.ps1` | PowerShell postToolUse hook |

### preToolUse Hook Flow

```
┌────────────────────────────────────────────┐
│               START                        │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  Read JSON from stdin                      │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  toolName == "edit" or "write"?            │
│  ┌─────────┐                               │
│  │   NO    │──────────────▶ EXIT 0         │
│  └─────────┘                               │
│  ┌─────────┐                               │
│  │   YES   │                               │
│  └────┬────┘                               │
└───────┼────────────────────────────────────┘
        ▼
┌────────────────────────────────────────────┐
│  Extract file_path from toolArgs           │
│  (handle both "file_path" and "path")      │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  Read session_id from .copilot-session-id  │
│  (or generate temp UUID if missing)        │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  POST /api/declare_intent                  │
│  { session_id, file, operation: "write" }  │
│  Timeout: 5 seconds                        │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  Parse response                            │
│  ┌─────────────────────┐                   │
│  │ Error or timeout    │──▶ Log stderr     │
│  └─────────────────────┘    EXIT 0         │
│  ┌─────────────────────┐                   │
│  │ conflict: true      │──▶ Warn stderr    │
│  └─────────────────────┘    EXIT 0         │
│  ┌─────────────────────┐                   │
│  │ conflict: false     │──▶ EXIT 0         │
│  └─────────────────────┘                   │
└────────────────────────────────────────────┘
```

### postToolUse Hook Flow

```
┌────────────────────────────────────────────┐
│               START                        │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  Read JSON from stdin                      │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  Extract toolName, toolArgs, toolResult    │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  Determine files_modified                  │
│  - For edit/write: extract file_path       │
│  - For others: empty array                 │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  Read session_id from .copilot-session-id  │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  POST /api/report_activity                 │
│  { session_id, tool, files_modified, ts }  │
│  Timeout: 3 seconds                        │
│  (Silent, no output)                       │
└────────────────┬───────────────────────────┘
                 ▼
┌────────────────────────────────────────────┐
│  EXIT 0 (always)                           │
└────────────────────────────────────────────┘
```

---

## Platform Differences

### Bash (Linux/macOS/WSL)

```bash
#!/usr/bin/env bash
set -euo pipefail

# HTTP requests
curl -s -X POST \
  --connect-timeout 5 \
  -H "Content-Type: application/json" \
  -d "$JSON_BODY" \
  http://localhost:3456/api/declare_intent

# JSON parsing
FILE_PATH=$(echo "$INPUT" | jq -r '.toolArgs.file_path // .toolArgs.path // ""')

# Timeout wrapper
timeout 5 curl ...
```

### PowerShell (Windows)

```powershell
# HTTP requests
$response = Invoke-WebRequest -Uri "http://localhost:3456/api/declare_intent" `
  -Method POST `
  -ContentType "application/json" `
  -Body $jsonBody `
  -TimeoutSec 5 `
  -UseBasicParsing

# JSON parsing
$input = $input | ConvertFrom-Json
$filePath = $input.toolArgs.file_path
if (-not $filePath) { $filePath = $input.toolArgs.path }

# No explicit timeout wrapper needed (TimeoutSec parameter)
```

### Differences Summary

| Feature | Bash | PowerShell |
|---------|------|------------|
| HTTP client | `curl` | `Invoke-WebRequest` |
| JSON parsing | `jq` | `ConvertFrom-Json` |
| Timeout | `timeout` cmd or `--connect-timeout` | `-TimeoutSec` parameter |
| Env vars | `$VAR` | `$env:VAR` |
| File read | `cat file` | `Get-Content file` |
| Null coalescing | `${VAR:-default}` | `$var ?? 'default'` |

---

## Security Considerations

### Current Security Model

For local development use, the current implementation uses a trust-based model:

1. **No authentication:** API calls don't require tokens
2. **No encryption:** HTTP on localhost (not HTTPS)
3. **No session validation:** Any session_id accepted

This is acceptable because:
- All parties run on the same machine
- Session broker is localhost-only
- No sensitive data transmitted (file paths, tool names)

### Future Security Enhancements

If production use is required:

1. **Token-based auth:** Session registration returns token, hooks pass token in header
2. **TLS:** Use HTTPS even on localhost
3. **Session validation:** Broker verifies session_id matches active session
4. **File path validation:** Broker rejects paths outside project directory

### Data Exposure

Activity logging exposes:
- File paths being edited
- Tool names and arguments
- Session IDs

This is intentional for debugging and coordination. If privacy is a concern, add opt-out via environment variable:

```bash
if [ "${COPILOT_DISABLE_ACTIVITY_LOGGING:-false}" = "true" ]; then
  exit 0
fi
```

---

## Configuration

### Hook Configuration Entry

Add to `.github/hooks/default.json`:

```json
{
  "hooks": {
    "preToolUse": [
      // ... existing hooks ...
      {
        "type": "command",
        "bash": "./scripts/hooks/pre-tool-use-file-intent.sh",
        "powershell": "./scripts/hooks/pre-tool-use-file-intent.ps1",
        "timeoutSec": 10,
        "comment": "Declare file intent to session broker, warn on conflicts"
      }
    ],
    "postToolUse": [
      // ... existing hooks ...
      {
        "type": "command",
        "bash": "./scripts/hooks/post-tool-use-activity-report.sh",
        "powershell": "./scripts/hooks/post-tool-use-activity-report.ps1",
        "timeoutSec": 5,
        "comment": "Report tool activity to session broker for monitoring"
      }
    ]
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COPILOT_SESSION_BROKER_URL` | `http://localhost:3456` | Broker base URL |
| `COPILOT_DISABLE_FILE_INTENT` | `false` | Disable preToolUse conflict checking |
| `COPILOT_DISABLE_ACTIVITY_LOGGING` | `false` | Disable postToolUse activity logging |
| `COPILOT_HOOK_DEBUG` | `false` | Enable verbose logging to stderr |

---

## Testing Strategy

### Unit Testing

1. **Hook script syntax:** `bash -n script.sh` / PowerShell syntax check
2. **JSON parsing:** Test with sample inputs
3. **Error handling:** Test with unreachable broker

### Integration Testing

1. **With running broker:**
   - Register session
   - Trigger edit tool
   - Verify declare_intent called
   - Verify activity logged

2. **Conflict detection:**
   - Register session A, declare intent on file X
   - Register session B, trigger edit on file X
   - Verify warning displayed

3. **Graceful degradation:**
   - Stop broker
   - Trigger edit tool
   - Verify hook doesn't block

### Manual Testing Checklist

- [ ] Hook executes without errors on Linux
- [ ] Hook executes without errors on Windows
- [ ] Hook executes without errors on macOS
- [ ] Conflict warning displays correctly
- [ ] Activity appears in broker logs
- [ ] Hook doesn't block when broker is down
- [ ] Hook timeout works correctly

---

## Dependencies

### Required

- **Session Broker:** Running on port 3456
- **jq:** For JSON parsing in Bash scripts (fallback to grep/sed if unavailable)

### Optional

- **curl:** Required for Bash hooks (usually pre-installed)
- **PowerShell 5.1+:** Required for Windows hooks

### Stream Dependencies

| Dependency | Stream | Task | Status |
|------------|--------|------|--------|
| `/api/declare_intent` | Stream 1 | Task 1.3 | Required for Task 4.2 |
| `/api/report_activity` | Stream 1 | NEW | Required for Task 4.3 |
| Session registration | Stream 1 | Existing | Required for session ID |

**Note:** If `/api/report_activity` endpoint doesn't exist in Stream 1 specification, it needs to be added or the postToolUse hook will be a no-op until implemented.

---

## Open Questions

### Resolved

1. **Q: Should preToolUse hook block on conflicts?**
   - A: No, warn only. Blocking disrupts workflow. Users can modify if desired.

2. **Q: Where should hook scripts live?**
   - A: `scripts/hooks/` following existing pattern.

3. **Q: What timeout values?**
   - A: 5s for preToolUse, 3s for postToolUse.

### Unresolved

1. **Q: Exact Copilot CLI hook argument format?**
   - Research needed: Test empirically or check documentation
   - Impact: May need to adjust toolArgs parsing

2. **Q: Does sessionStart hook already write .copilot-session-id?**
   - Check: Read existing session-start.sh
   - Impact: May need to modify session registration flow

---

## Appendix: Sample Hook Scripts

### pre-tool-use-file-intent.sh (Draft)

```bash
#!/usr/bin/env bash
# pre-tool-use-file-intent.sh — Declare file intent to session broker
# Input: JSON via stdin with { timestamp, cwd, toolName, toolArgs }
# Output: Warning to stderr on conflict

set -euo pipefail

# Configuration
BROKER_URL="${COPILOT_SESSION_BROKER_URL:-http://localhost:3456}"
TIMEOUT=5
DEBUG="${COPILOT_HOOK_DEBUG:-false}"

# Read input
INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName // ""')

# Only check edit/write tools
if [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "write" ]; then
  exit 0
fi

# Extract file path
FILE_PATH=$(echo "$INPUT" | jq -r '.toolArgs.file_path // .toolArgs.path // ""')
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Get session ID
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
SESSION_ID_FILE="${CWD}/.copilot-session-id"

if [ -f "$SESSION_ID_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_ID_FILE")
else
  SESSION_ID="temp-$(uuidgen 2>/dev/null || echo $$-$(date +%s))"
  [ "$DEBUG" = "true" ] && echo "WARN: No session ID file found, using temp ID" >&2
fi

# Call broker
RESPONSE=$(curl -s --connect-timeout "$TIMEOUT" \
  -X POST "${BROKER_URL}/api/declare_intent" \
  -H "Content-Type: application/json" \
  -d "{\"session_id\":\"$SESSION_ID\",\"file\":\"$FILE_PATH\",\"operation\":\"write\"}" \
  2>/dev/null) || {
    [ "$DEBUG" = "true" ] && echo "WARN: Failed to connect to session broker" >&2
    exit 0
  }

# Check for conflict
if echo "$RESPONSE" | jq -e '.conflict == true' >/dev/null 2>&1; then
  CONFLICTS=$(echo "$RESPONSE" | jq -r '.conflicting_sessions[] | "  - \(.session_id): \(.purpose // "unknown purpose")"')
  echo "⚠️  FILE CONFLICT DETECTED: $FILE_PATH" >&2
  echo "Another session is working on this file:" >&2
  echo "$CONFLICTS" >&2
fi

exit 0
```

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-04 | Contributor | Initial design document |
