---
title: "Multi-Agent Orchestration"
lab_number: 7
pace:
  presenter_minutes: 4
  self_paced_minutes: 20
registry: docs/_meta/registry.yaml
---

# 7 — Multi-Agent Orchestration

In this lab you will create an orchestrator agent that coordinates a development workflow.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 20 minutes

**Prerequisite:** finish [Setup](setup.md) and [Lab 03](lab03.md) first — §7.1 builds on the `dotnet-dev` agent that Lab 03's .NET track creates in `.github/agents/`.

> 💰 **Cost Budget**
> - Expected token footprint: ~30k in / ~10k out for the full lab.
>   Most of the spend is the orchestrator agent re-reading agent
>   definitions on every delegation.
> - Cheaper alternative: keep the top-level chat on `auto` (the
>   registry default), but pin any `task` tool sub-agent dispatches in
>   §7.4 to a `models.cheap` model for the simple delegations and
>   reserve a `models.premium` model only for the planner / reviewer
>   roles. Read the current ids from
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) instead
>   of hardcoding one.
> - Compaction trigger: after §7.3 (orchestrator built and tested),
>   run `/clear` before §7.4's multi-agent rehearsal so you don't
>   re-send the agent-definition diffs every turn.
> - See [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md).

References:
- [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Tool aliases — the `agent` tool that lets one agent call another](https://docs.github.com/en/copilot/reference/custom-agents-configuration#tool-aliases)

## 7.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling a packaged multi-agent plugin (e.g. dev + QA + reviewer bundle). |
| **Parallel subagents** | `/fleet` | Running dev and QA agents in parallel when tasks are independent. |
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | The orchestrator runs in plan mode; worker agents often run in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto` to let Copilot choose) | Pick an id from the registry's `models.premium` for the orchestrator; keep workers on an id from `models.cheap` to save tokens. The tier names are registry keys, not `/model` arguments. |
| **Local tool discovery** | `/agent` to browse and select custom agents; `extensions_manage` operation `list` for extensions (a model-side tool call, **not** a slash command) | Use `/agent` to see which custom agents are available before wiring a delegation. `extensions_manage` lists extensions, not agents. |

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

The filter above looks for four agents, but they do not all exist yet. On a fresh checkout it lists only `code-reviewer.agent.md`; once you have finished Lab 03 it also lists `dotnet-dev.agent.md`. Here is where each of the four comes from:

- `dotnet-dev.agent.md` — implements code; created in **Lab 03** (the prerequisite above)
- `dotnet-qa.agent.md` — writes tests; created **later, in §7.5** (it is labelled a bonus, but see the note below)
- `code-reviewer.agent.md` — reviews code; **ships with the starter repo** in `.github/agents/`
- `lab-orchestrator.agent.md` — the orchestrator; you create it in **§7.2**

> 💡 The orchestrator you build in §7.2 always delegates testing to `dotnet-qa` (its Phase 3) before it reviews, so it needs all three worker agents — `dotnet-dev`, `dotnet-qa` and `code-reviewer`. It has no two-worker fallback, so create `dotnet-qa` in §7.5 before you run the delegation test in §7.4: jump ahead to §7.5, then come back.

2. The orchestration flow has five phases — the same five that the orchestrator's agent body in §7.2 defines (Planning, Implementation, Testing, Review, Summary):

```
User Request
    │
    ▼
lab-orchestrator (coordinates)
    │
    ├──→ Phase 1: Planning (tasks, affected files, acceptance criteria)
    │         │
    │         ▼ (plan ready)
    │
    ├──→ Phase 2: @dotnet-dev (implement feature)
    │         │
    │         ▼ (implementation complete)
    │
    ├──→ Phase 3: @dotnet-qa (write tests)
    │         │
    │         ▼ (tests passing)
    │
    ├──→ Phase 4: @code-reviewer (review code)
    │         │
    │         ▼ (feedback provided)
    │
    └──→ Phase 5: Summary returned to user
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
````bash
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
````

<details>
<summary><strong>PowerShell alternative</strong></summary>

````powershell
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
````

</details>

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

Let's test the orchestrator with a small feature request. It delegates to three worker agents — `dotnet-dev`, `dotnet-qa` and `code-reviewer` — so before you start, make sure `dotnet-qa.agent.md` exists: §7.5 has the check and the instructions for creating it. If it is missing, do §7.5 first, then come back here.

🖥️ **In your terminal:**

1. Start Copilot CLI. If `copilot` was already open when you created the agent files in §7.2 or §7.5, exit it (type `/exit`) and start it again — as in Lab 03, agent files are read when a session starts:
```bash
copilot
```

2. Select the orchestrator, then give it a feature request. In Copilot CLI, `@` adds a file to the context — it does not pick an agent — so choose the agent with the `/agent` command:
```
/agent lab-orchestrator
```
   (Alternatively, start the session in step 1 with `copilot --agent lab-orchestrator` instead of plain `copilot`, and skip the `/agent` command.) Then type the request:
```
The Student model already has a FullName property (inherited from Person) that returns "LastName, FirstMidName". Update the Students/Index view to use it.
```

3. Observe the orchestrator's behavior — these are the five phases from the diagram in §7.1:
   - **Phase 1**: It should analyze the request and identify files to change
   - **Phase 2**: It should delegate to `dotnet-dev` to update the view
   - **Phase 3**: It should delegate to `dotnet-qa` to write tests for the change
   - **Phase 4**: It should delegate to `code-reviewer` to review the changes
   - **Phase 5**: It should return a summary of what was done

   Seeing those names is not the test. An orchestrator can write "Delegating to `dotnet-dev`…" in its own text without dispatching anything, so **phase narration alone is not a completed delegation test**. A real delegation leaves a *dispatch entry*: a separate tool-call item in the response timeline (it may be labelled as a task or a sub-agent) that names the worker. When the run finishes, look for those entries:
   - press `Ctrl+O` with the prompt empty to expand the recent timeline entries ([timeline shortcuts](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#timeline-shortcuts-in-the-interactive-interface)); or
   - type `/tasks` to list the sub-agents and shell commands the session ran — press `f` to include finished ones, `Enter` to open one, and `Esc` to close the list ([tasks dialog](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#tasks-dialog-shortcuts)).

   Then work down this checklist. Check off a box only when **all three** of its parts are true:

   - [ ] **`dotnet-dev` (Phase 2)** — a dispatch entry names `dotnet-dev`; you can read the result it sent back (the file or files it changed); and the request sent on to `dotnet-qa` mentions what it changed.
   - [ ] **`dotnet-qa` (Phase 3)** — a dispatch entry names `dotnet-qa`; you can read the result it sent back (the tests it wrote); and the request sent on to `code-reviewer` mentions the change or those tests.
   - [ ] **`code-reviewer` (Phase 4)** — a dispatch entry names `code-reviewer`; you can read the review it sent back; and the Phase 5 summary repeats at least one point from that review.

   If a box stays unchecked, treat that phase as narrated, not delegated — the delegation test is not complete. One likely cause is that the worker agent was not loaded: check that `/agent` lists it (create `dotnet-qa` in §7.5 if it is missing), restart `copilot`, and run the request again.

4. If time permits, try a second request. Students/Index already pages its results (10 per page, with Previous and Next controls in the view), so ask for something that builds on that:
```
Add a "Page X of Y" label to the Students/Index view, using the PageIndex and TotalPages values that PaginatedList already provides. Leave the existing paging (10 per page, Previous and Next) unchanged.
```

> 💡 **What you should see:** The orchestrator plans, then hands work to `dotnet-dev`, then `dotnet-qa`, then `code-reviewer` — each as its own dispatch entry, not just a name in its text — and finishes with a summary built from what those workers returned. The first request counts as a delegation test only when every box in step 3 is checked off; apply the same check to the optional request in step 4. The testing phase relies on the `dotnet-qa` agent from §7.5. The full cycle may take a few minutes.

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

> 💡 **Going further: Parallel sessions with Git worktrees.** The orchestration pattern in this lab is sequential — one agent finishes before the next starts, all within a single Copilot CLI session. But real-world development often benefits from true parallelism: one session implementing a feature while another writes tests or fixes a separate bug.
>
> The challenge is that two Copilot CLI sessions sharing the same working directory will step on each other — competing for the same files and git index. [Git worktrees](https://git-scm.com/docs/git-worktree) solve this by creating isolated checkouts that share history but have their own working directory:
>
> ```bash
> # From your repo root, create a worktree for a second session
> git worktree add ../contoso-tests -b feature/add-tests
>
> # Open a new terminal, cd into the worktree, and start Copilot CLI
> cd ../contoso-tests
> copilot
>
> # When finished, merge from your main working directory
> cd ../day-in-the-life-copilot-lab
> git merge feature/add-tests
>
> # Clean up the worktree
> git worktree remove ../contoso-tests
> ```
>
> You're the orchestrator in this pattern — you open the terminals, create the worktrees, and decide when to merge. Copilot CLI helps at every step: ask it to create the worktree, do the work in each session independently, and then use it to merge branches and resolve any conflicts. This scales naturally: three features in flight means three worktrees and three terminal tabs, each with its own Copilot session working in isolation.

<details>
<summary>Solution: lab-orchestrator.agent.md</summary>

See [`solutions/lab07-orchestrator/lab-orchestrator.agent.md`](../solutions/lab07-orchestrator/lab-orchestrator.agent.md) for the complete reference implementation.

</details>

**Next:** [Lab 08 — gh-aw: PRD Generation](lab08.md)
