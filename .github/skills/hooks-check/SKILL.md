---
name: hooks-check
description: "Diagnose GitHub Copilot CLI hooks: config validation, script status, and log output"
disable-model-invocation: true
---
# Hooks Diagnostic Check

Verify GitHub Copilot CLI hooks are configured and running in this project.

## Instructions

Execute these checks in order:

1. **Config Check**
   - Check if `.github/hooks/` directory exists
   - List any JSON config files found
   - Also check `~/.copilot/hooks/` and any inline `hooks` block in `.github/copilot/settings.json` or `~/.copilot/settings.json`. Hooks from every source are combined, so these are not fallbacks

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
   - List all configured hook events (Copilot CLI supports these 15):
     - sessionStart
     - sessionEnd
     - userPromptSubmitted
     - userPromptTransformed
     - permissionRequest
     - preToolUse
     - preMcpToolCall
     - postToolUse
     - postToolUseFailure
     - subagentStart
     - subagentStop
     - agentStop
     - preCompact
     - notification
     - errorOccurred
   - Count handlers per event, across every config source
   - Count PascalCase aliases (for example `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SessionStart`) under the matching camelCase event
   - Flag any event name that is neither one of these nor a known alias as a likely typo

## Output

Produce a concise hooks status report:

```
HOOKS STATUS: [CONFIGURED/NOT FOUND]

Config:   [OK/NOT FOUND] - path
JSON:     [VALID/INVALID]
Scripts:  [X/Y exist, Z executable]
Logs:     [ACTIVE/NONE FOUND] - last activity

Hook Events Configured:
- sessionStart:          [X handlers]
- sessionEnd:            [X handlers]
- userPromptSubmitted:   [X handlers]
- userPromptTransformed: [X handlers]
- permissionRequest:     [X handlers]
- preToolUse:            [X handlers]
- preMcpToolCall:        [X handlers]
- postToolUse:           [X handlers]
- postToolUseFailure:    [X handlers]
- subagentStart:         [X handlers]
- subagentStop:          [X handlers]
- agentStop:             [X handlers]
- preCompact:            [X handlers]
- notification:          [X handlers]
- errorOccurred:         [X handlers]

Likely Running: [YES/NO]
Issues Found:   [NONE/list issues]
```

> **Note:** In Copilot CLI, run this command skill as `/hooks-check`, or describe the task directly.
