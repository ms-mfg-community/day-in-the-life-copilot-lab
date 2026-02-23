---
description: "Sequential agent workflow for complex tasks: feature, bugfix, refactor, or security pipelines"
agent: "agent"
argument-hint: "feature|bugfix|refactor|security [task-description]"
---

# Orchestrate Command

Sequential agent workflow for complex tasks.

## Workflow Types

### feature
Full feature implementation workflow:
```
planner -> tdd-guide -> code-reviewer -> security-reviewer
```

### bugfix
Bug investigation and fix workflow:
```
explorer -> tdd-guide -> code-reviewer
```

### refactor
Safe refactoring workflow:
```
architect -> code-reviewer -> tdd-guide
```

### security
Security-focused review:
```
security-reviewer -> code-reviewer -> architect
```

## Execution Pattern

For each agent in the workflow:

1. **Invoke agent** with context from previous agent
2. **Collect output** as structured handoff document
3. **Pass to next agent** in chain
4. **Aggregate results** into final report

## Handoff Document Format

Between agents, create handoff document:

```markdown
## HANDOFF: [previous-agent] -> [next-agent]

### Context
[Summary of what was done]

### Findings
[Key discoveries or decisions]

### Files Modified
[List of files touched]

### Open Questions
[Unresolved items for next agent]
```

## Final Report Format

```
ORCHESTRATION REPORT
====================
Workflow: [type]
Task: [description]

SUMMARY: [One paragraph]

AGENT OUTPUTS:
- [Agent 1]: [summary]
- [Agent 2]: [summary]

FILES CHANGED: [list]
TEST RESULTS: [pass/fail summary]
SECURITY STATUS: [findings]

RECOMMENDATION: [SHIP / NEEDS WORK / BLOCKED]
```

## Custom Workflow

Specify custom agent sequences:
```
orchestrate custom "architect,tdd-guide,code-reviewer" "Redesign caching layer"
```

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, use `@agent-name` to invoke agents directly.
