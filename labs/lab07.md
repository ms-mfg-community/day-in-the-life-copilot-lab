# 7 — Multi-Agent Orchestration

In this lab you will create an orchestrator agent that coordinates a development workflow.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 20 minutes

References:
- [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Agent handoffs](https://docs.github.com/en/copilot/reference/custom-agents-configuration#handoffs)

## 7.1 Design the Orchestration Flow

Multi-agent orchestration lets one agent coordinate work across multiple specialized agents. Each agent has a focused role, and the orchestrator manages the pipeline.

🖥️ **In your terminal:**

1. Review the agents we have available:

**WSL/Bash:**
```bash
ls .github/agents/ | grep -E "dotnet|code-review|orchestrator"
```

**PowerShell:**
```powershell
Get-ChildItem .github/agents/ | Where-Object { $_.Name -match "dotnet|code-review|orchestrator" }
```

You should see:
- `dotnet-dev.agent.md` — implements code (created in Lab 03)
- `dotnet-qa.agent.md` — writes tests
- `code-reviewer.agent.md` — reviews code
- `lab-orchestrator.agent.md` — the orchestrator (we'll create this)

> 💡 `dotnet-qa.agent.md` is created later in section 7.5 as a bonus exercise. The orchestrator will work with just `dotnet-dev` and `code-reviewer` agents.

> This agent ships with the starter repo in `.github/agents/code-reviewer.agent.md`.

2. The orchestration flow is:

```
User Request
    │
    ▼
lab-orchestrator (coordinates)
    │
    ├──→ Phase 1: @dotnet-dev (implement feature)
    │         │
    │         ▼ (implementation complete)
    │
    ├──→ Phase 2: @dotnet-qa (write tests)
    │         │
    │         ▼ (tests passing)
    │
    └──→ Phase 3: @code-reviewer (review code)
              │
              ▼ (feedback provided)
    
    Summary returned to user
```

3. The key tool that enables this is `agent` — it allows one agent to invoke other agents:

```yaml
tools: ["read", "search", "agent"]  # 'agent' enables delegation
```

> 💡 **Why orchestrate?** Each agent has deep expertise in its domain. The orchestrator's job is coordination — it doesn't write code or tests itself.

## 7.2 Create the Orchestrator Agent

🖥️ **In your terminal:**

1. Create the orchestrator agent:

**WSL/Bash:**
```bash
cat > .github/agents/lab-orchestrator.agent.md << 'AGENT'
---
name: "lab-orchestrator"
description: "Orchestrates a .NET development workflow: delegates implementation to dotnet-dev, testing to dotnet-qa, and review to code-reviewer. Coordinates handoffs between agents."
tools: ["read", "search", "agent"]
---

# Lab Orchestrator Agent

You are a development workflow orchestrator for the ContosoUniversity project. You coordinate a sequential pipeline: **dotnet-dev → dotnet-qa → code-reviewer**.

You do NOT implement code yourself. You delegate to specialized agents and manage the handoff between them.

## Workflow

When given a feature request or task:

### Phase 1: Planning

1. Analyze the request and break it into implementation tasks
2. Identify which files will be affected
3. Determine the acceptance criteria

### Phase 2: Implementation (delegate to @dotnet-dev)

Delegate the implementation work:

```
@dotnet-dev Implement the following feature in ContosoUniversity:

**Task**: [description]
**Files to modify**: [list of files]
**Acceptance criteria**:
- [criterion 1]
- [criterion 2]
```

Wait for completion before proceeding.

### Phase 3: Testing (delegate to @dotnet-qa)

Once implementation is done, delegate testing:

```
@dotnet-qa Write tests for the changes just made:

**Code changed**: [summary]
**Test requirements**:
- Unit tests for new/modified methods
- Follow MethodName_Condition_ExpectedResult naming
- Cover edge cases: null inputs, invalid IDs, validation errors
```

### Phase 4: Review (delegate to @code-reviewer)

After tests pass, request a code review:

```
@code-reviewer Review the recent changes for:
- Clean architecture compliance
- Async/await usage
- Test coverage adequacy
- Security considerations
```

### Phase 5: Summary

Summarize what was done across all phases.

## Delegation Rules

- **Never write code yourself** — always delegate
- **Wait for completion** before moving to the next phase
- **Pass context forward** — each agent needs to know what the previous one did
AGENT
```

**PowerShell:**
```powershell
@'
---
name: "lab-orchestrator"
description: "Orchestrates a .NET development workflow: delegates implementation to dotnet-dev, testing to dotnet-qa, and review to code-reviewer. Coordinates handoffs between agents."
tools: ["read", "search", "agent"]
---

# Lab Orchestrator Agent

You are a development workflow orchestrator for the ContosoUniversity project. You coordinate a sequential pipeline: **dotnet-dev → dotnet-qa → code-reviewer**.

You do NOT implement code yourself. You delegate to specialized agents and manage the handoff between them.

## Workflow

When given a feature request or task:

### Phase 1: Planning

1. Analyze the request and break it into implementation tasks
2. Identify which files will be affected
3. Determine the acceptance criteria

### Phase 2: Implementation (delegate to @dotnet-dev)

Delegate the implementation work:

```
@dotnet-dev Implement the following feature in ContosoUniversity:

**Task**: [description]
**Files to modify**: [list of files]
**Acceptance criteria**:
- [criterion 1]
- [criterion 2]
```

Wait for completion before proceeding.

### Phase 3: Testing (delegate to @dotnet-qa)

Once implementation is done, delegate testing:

```
@dotnet-qa Write tests for the changes just made:

**Code changed**: [summary]
**Test requirements**:
- Unit tests for new/modified methods
- Follow MethodName_Condition_ExpectedResult naming
- Cover edge cases: null inputs, invalid IDs, validation errors
```

### Phase 4: Review (delegate to @code-reviewer)

After tests pass, request a code review:

```
@code-reviewer Review the recent changes for:
- Clean architecture compliance
- Async/await usage
- Test coverage adequacy
- Security considerations
```

### Phase 5: Summary

Summarize what was done across all phases.

## Delegation Rules

- **Never write code yourself** — always delegate
- **Wait for completion** before moving to the next phase
- **Pass context forward** — each agent needs to know what the previous one did
'@ | Out-File -FilePath .github/agents/lab-orchestrator.agent.md -Encoding utf8
```

2. Verify the agent:

**WSL/Bash:**
```bash
head -5 .github/agents/lab-orchestrator.agent.md
```

**PowerShell:**
```powershell
Get-Content .github/agents/lab-orchestrator.agent.md -Head 5
```

## 7.3 Understand Agent Delegation

The `agent` tool lets agents invoke other agents. Let's understand how it works.

🖥️ **In your terminal:**

1. Look at how existing agents reference each other:

**WSL/Bash:**
```bash
grep -l "invoke\|@dotnet\|delegate" .github/agents/*.agent.md
```

**PowerShell:**
```powershell
Get-ChildItem .github/agents/*.agent.md | Select-String -Pattern "invoke|@dotnet|delegate" | Select-Object -ExpandProperty Path -Unique
```

2. The delegation pattern:

```markdown
## In the orchestrator's system prompt:

### Phase 2: Implementation
Delegate to @dotnet-dev with a clear task description.

### Phase 3: Testing
Delegate to @dotnet-qa with context about what was implemented.
```

3. Key principles for effective delegation:
   - **Clear task description**: Tell the agent exactly what to do
   - **Context passing**: Include what previous agents did
   - **Acceptance criteria**: Define what "done" looks like
   - **Sequential handoff**: Wait for one agent to finish before invoking the next

> 💡 **Agent tool**: When an agent has `agent` in its tools list, Copilot can invoke other agents on its behalf. The orchestrator uses `@dotnet-dev`, `@dotnet-qa`, and `@code-reviewer` to delegate work.

## 7.4 Test Multi-Agent Delegation

Let's test the orchestrator with a small feature request.

🖥️ **In your terminal:**

1. Start Copilot CLI:
```bash
gh copilot
```

2. Invoke the orchestrator with a feature request:
```
@lab-orchestrator Add a "FullName" computed property to the Student model that returns "LastName, FirstMidName". Update the Students/Index view to use it.
```

3. Observe the orchestrator's behavior:
   - **Phase 1**: It should analyze the request and identify files to change
   - **Phase 2**: It should delegate to `@dotnet-dev` to add the property and update the view
   - **Phase 3**: It should delegate to `@dotnet-qa` to write tests for the new property
   - **Phase 4**: It should delegate to `@code-reviewer` to review the changes

4. If time permits, try a more complex request:
```
@lab-orchestrator Add pagination to the Students/Index page. Support page size of 10 with next/previous navigation.
```

> 💡 **What you should see:** The orchestrator analyzes the task, then delegates to @dotnet-dev (you'll see its name appear). After implementation, it delegates to @code-reviewer for feedback. The full cycle may take 1-2 minutes.

> 💡 **Real-world use**: In production, orchestration enables complex workflows — feature development, code review, deployment. Each agent is an expert in its domain, and the orchestrator ensures they work together.

## 7.5 Create a QA Agent (Bonus)

If you haven't already, create the `dotnet-qa.agent.md` agent that the orchestrator delegates to.

🖥️ **In your terminal:**

1. Check if it exists:

**WSL/Bash:**
```bash
ls .github/agents/dotnet-qa.agent.md 2>/dev/null && echo "Already exists" || echo "Need to create"
```

**PowerShell:**
```powershell
if (Test-Path .github/agents/dotnet-qa.agent.md) { "Already exists" } else { "Need to create" }
```

2. If it doesn't exist, create it following the same pattern as `dotnet-dev.agent.md` but focused on testing. Key differences:
   - Description focuses on xUnit, Moq, WebApplicationFactory
   - System prompt emphasizes test naming convention (`MethodName_Condition_ExpectedResult`)
   - Review checklist focuses on test coverage and quality

## 7.6 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Orchestrator pattern** | One agent coordinates, others implement |
| **Agent tool** | `tools: ["agent"]` enables delegation to other agents |
| **Sequential pipeline** | dev → QA → review, with context passed forward |
| **Delegation format** | Clear task + context + acceptance criteria |

**Agent delegation best practices:**
- Give the orchestrator `agent`, `read`, `search` tools — NOT `edit` or `execute`
- Keep agents focused: one domain per agent
- Pass context between phases: each agent needs to know what happened before
- Define clear acceptance criteria for each phase
- The orchestrator never implements — it only coordinates

**The agents you've created in this lab series:**

| Agent | Role | Created In |
|-------|------|-----------|
| `@dotnet-dev` | .NET implementation | Lab 03 |
| `@dotnet-qa` | .NET testing | Lab 07 |
| `@lab-orchestrator` | Workflow coordination | Lab 07 |

</details>

<details>
<summary>Solution: lab-orchestrator.agent.md</summary>

See [`solutions/lab07-orchestrator/lab-orchestrator.agent.md`](../solutions/lab07-orchestrator/lab-orchestrator.agent.md) for the complete reference implementation.

</details>

**Next:** [Lab 08 — gh-aw: PRD Generation](lab08.md)
