---
description: "Diagnose GitHub Copilot CLI hooks: config validation, script status, and log output"
agent: "agent"
---

# Hooks Diagnostic Check

Verify GitHub Copilot CLI hooks are configured and running in this project.

## Instructions

Execute these checks in order:

1. **Config Check**
   - Check if `.github/hooks/` directory exists
   - List any JSON config files found
   - If no hooks directory, check for `~/.copilot/hooks/` as fallback

2. **JSON Validation**
   - Validate each JSON config with `jq . <file>`
   - Report any syntax errors

3. **Script Verification**
   - Parse hook config for referenced scripts (bash/powershell paths)
   - Verify each script exists
   - Check if scripts are executable (`ls -la`)

4. **Log Analysis**
   - Check for log output in:
     - `.github/logs/`
     - `./logs/`
     - Any `LOG_DIR` paths referenced in hook scripts
   - Show recent log entries if found (last 10 lines)

5. **Hook Inventory**
   - List all configured hook events:
     - sessionStart
     - sessionEnd
     - userPromptSubmitted
     - preToolUse
     - postToolUse
     - errorOccurred
   - Count handlers per event

## Output

Produce a concise hooks status report:

```
HOOKS STATUS: [CONFIGURED/NOT FOUND]

Config:   [OK/NOT FOUND] - path
JSON:     [VALID/INVALID]
Scripts:  [X/Y exist, Z executable]
Logs:     [ACTIVE/NONE FOUND] - last activity

Hook Events Configured:
- sessionStart:        [X handlers]
- sessionEnd:          [X handlers]
- userPromptSubmitted: [X handlers]
- preToolUse:          [X handlers]
- postToolUse:         [X handlers]
- errorOccurred:       [X handlers]

Likely Running: [YES/NO]
Issues Found:   [NONE/list issues]
```

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, type `#prompt:hooks-check` or describe the task directly.
