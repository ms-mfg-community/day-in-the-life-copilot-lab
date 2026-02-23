---
description: "Manage eval-driven development: define, check, and report on capability and regression evals"
agent: "agent"
argument-hint: "define|check|report|list [feature-name]"
---

# Eval Command

Manage eval-driven development workflow.

## Define Evals

Create a new eval definition:

1. Create `.github/evals/feature-name.md` with template:

```markdown
## EVAL: feature-name
Created: $(date)

### Capability Evals
- [ ] [Description of capability 1]
- [ ] [Description of capability 2]

### Regression Evals
- [ ] [Existing behavior 1 still works]
- [ ] [Existing behavior 2 still works]

### Success Criteria
- pass@3 > 90% for capability evals
- pass^3 = 100% for regression evals
```

## Check Evals

Run evals for a feature:

1. Read eval definition from `.github/evals/feature-name.md`
2. For each capability eval: attempt to verify, record PASS/FAIL
3. For each regression eval: run relevant tests, compare against baseline
4. Report current status

## Report Evals

Generate comprehensive eval report:

```
EVAL REPORT: feature-name
=========================
CAPABILITY EVALS
[eval-1]: PASS (pass@1)
[eval-2]: PASS (pass@2) - required retry

REGRESSION EVALS
[test-1]: PASS

METRICS
Capability pass@1: 67%
Capability pass@3: 100%
Regression pass^3: 100%

RECOMMENDATION: [SHIP / NEEDS WORK / BLOCKED]
```

## List Evals

Show all eval definitions with status.

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, describe the task directly.
