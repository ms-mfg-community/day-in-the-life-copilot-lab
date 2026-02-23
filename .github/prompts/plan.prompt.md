---
description: "Restate requirements, assess risks, and create step-by-step implementation plan. WAIT for user confirmation before writing code."
agent: "agent"
---

# Plan Command

Create a comprehensive implementation plan before writing any code.

## What This Prompt Does

1. **Restate Requirements** - Clarify what needs to be built
2. **Identify Risks** - Surface potential issues and blockers
3. **Create Step Plan** - Break down implementation into phases
4. **Wait for Confirmation** - MUST receive user approval before proceeding

## How It Works

1. **Analyze the request** and restate requirements in clear terms
2. **Break down into phases** with specific, actionable steps
3. **Identify dependencies** between components
4. **Assess risks** and potential blockers
5. **Estimate complexity** (High/Medium/Low)
6. **Present the plan** and WAIT for explicit confirmation

## When to Use

- Starting a new feature
- Making significant architectural changes
- Working on complex refactoring
- Multiple files/components will be affected
- Requirements are unclear or ambiguous

## Important Notes

**CRITICAL**: Do NOT write any code until the user explicitly confirms the plan with "yes", "proceed", or similar affirmative response.

If the user wants changes, they can respond with:
- "modify: [changes]"
- "different approach: [alternative]"
- "skip phase 2 and do phase 3 first"

## Integration

After planning:
- Use `/tdd` to implement with test-driven development
- Use `/build-fix` if build errors occur
- Use `/code-review` to review completed implementation

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, describe the task directly.
