---
name: orchestrate
description: "Sequential agent workflow for complex tasks: feature, bugfix, refactor, or security pipelines"
disable-model-invocation: true
argument-hint: "feature|bugfix|refactor|security [task-description]"
---
# Orchestrate Command

Sequential agent workflow for complex tasks, built from the agents in this repo.

## Available Agents

| Agent | Track | Role | Where it comes from |
|-------|-------|------|---------------------|
| `planner` | Both | Plans the work (read-only) | Ships in `.github/agents/` |
| `dotnet-dev` | .NET | Implements on the .NET track | Created in Lab 03 |
| `dotnet-qa` | .NET | Writes and runs xUnit tests | Created in Lab 07 (section 7.5) |
| `code-reviewer` | .NET | Reviews changes for bugs and security against an ASP.NET Core MVC and EF Core checklist | Ships in `.github/agents/` |
| `node-dev` | Node | Implements on the Node track and writes its Vitest tests | Created in Lab 03 |

Choose the track from the code the task changes: `dotnet/` is the .NET track and `node/` is the Node track. Check `/agent` first: if a lab-created agent does not exist yet, say so and either create it (see the lab) or let the main agent do that step.

## Node Track

`dotnet-qa` and `code-reviewer` are .NET-only: `dotnet-qa` writes xUnit tests, and `code-reviewer` checks `[ValidateAntiForgeryToken]`, `Html.Raw`, `[Bind]` and EF Core usage. This repo ships no Node test agent and no Node review agent, so never send Node work to either of them. On the Node track:

- `node-dev` takes `dotnet-dev`'s place and `dotnet-qa`'s job. When you delegate to it, ask for the Vitest tests under `node/tests/` first (a failing test for a bug or a feature, pinning tests for a refactor), then the change.
- The main agent does the review itself, as a `main agent` stage. Say in the final report that no Node review agent exists.

## Workflow Types

Each workflow has one pipeline per track. Use the one for the track you are working on.

### feature
Full feature implementation workflow:
```
.NET:  planner -> dotnet-dev -> dotnet-qa -> code-reviewer
Node:  planner -> node-dev -> main agent
```

### bugfix
Bug investigation and fix workflow (a failing test first, then the fix):
```
.NET:  dotnet-qa -> dotnet-dev -> code-reviewer
Node:  node-dev -> main agent
```

### refactor
Safe refactoring workflow (pin the behavior with tests before changing it):
```
.NET:  planner -> dotnet-qa -> dotnet-dev -> code-reviewer
Node:  planner -> node-dev -> main agent
```

### security
Security-focused review (on the .NET track the `code-reviewer` checklist covers input validation, auth, CSRF and secrets; on the Node track the main agent reviews input validation, auth and secrets itself):
```
.NET:  code-reviewer -> dotnet-dev -> code-reviewer
Node:  main agent -> node-dev -> main agent
```

## Execution Pattern

For each agent in the workflow:

1. **Delegate to the agent** with the `task` tool (agent type = the agent's name), passing the context from the previous agent
2. **Collect output** as structured handoff document
3. **Pass to next agent** in chain
4. **Aggregate results** into final report

A `main agent` stage is not delegated: do that step yourself in this session, then pass your findings on as the handoff document.

To work with one agent directly instead, select it with `/agent <name>` inside a Copilot CLI session, or start the session with `copilot --agent <name>`.

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
/orchestrate custom "planner,dotnet-dev,code-reviewer" "Redesign caching layer"
```

Keep a custom sequence on one track: use only agents whose Track in the table above is the track of the code being changed, or `Both`.

> **Note:** In Copilot CLI this is a command skill: run it as `/orchestrate feature <task>`. In the CLI, `@` mentions a file and does not select an agent; use `/agent <name>` or `copilot --agent <name>` for that.
