# PRD: Everything GitHub Copilot — Hands-On Lab

## Overview

A comprehensive hands-on lab that teaches the **complete** GitHub Copilot agentic development experience. Learners work with a brownfield .NET application (ContosoUniversity) and a rich set of pre-configured Copilot agents, skills, prompts, hooks, and MCP servers — then extend them to implement a real feature using multi-agent orchestration and GitHub Agentic Workflows.

## Target Audience

- Developers familiar with GitHub and VS Code
- Some experience with GitHub Copilot (chat/completions)
- No prior experience required with: agents, skills, prompts, hooks, MCP, or agentic workflows
- .NET experience helpful but not required (the lab's focus is Copilot configuration, not .NET coding)

## What the Learner Gets

After completing this lab, participants will:

1. **Understand** the full GitHub Copilot agent configuration surface (agents, skills, instructions, prompts, hooks, MCP, AGENTS.md)
2. **Create** custom agents specialized for specific tasks (.NET development, QA, code review)
3. **Build** an orchestrator agent that coordinates multi-agent workflows
4. **Configure** MCP servers for enhanced AI capabilities (context7, memory, C# LSP)
5. **Author** GitHub Agentic Workflows (gh-aw) for CI/CD automation
6. **Use** session management and Memory MCP for cross-session persistence

## Repository Contents (Pre-Lab)

The lab repo ships with a rich starting configuration:

| Category | Count | Location |
|----------|-------|----------|
| Custom Agents | 30 | `.github/agents/` |
| Skills | 29 | `.github/skills/` |
| Prompts | 36 | `.github/prompts/` |
| Hooks | 12 | `scripts/hooks/` + `.github/hooks/` |
| Custom Instructions | 6 | `.github/instructions/` |
| MCP Configs | 5 servers | `.copilot/mcp-config.json` |
| .NET Project | 5 projects | `ContosoUniversity.*` |

## Lab Flow (Learner's Journey)

```
Fork Repo ──→ Create Branch ──→ gh-aw triggers PM Agent ──→ PRD Generated
     │                                                           │
     └── Clone Locally ── Open in VS Code + Copilot CLI ────────┘
                              │
                     Read PRD ── Discover Need for Config
                              │
                     ┌────────┴────────┐
                     │  Create:        │
                     │  • .NET Agent   │
                     │  • New Skill    │
                     │  • MCP Config   │
                     │  • Instructions │
                     │  • Hooks        │
                     └────────┬────────┘
                              │
                     Build Orchestrator Agent
                     (dev → QA → code review)
                              │
                     Session Management + Memory MCP
                              │
                     Commit → Push → PR
                              │
                     gh-aw triggers Automated Code Review
```

## Lab Modules

### Setup — Fork, Prerequisites, Overview (10 min)
- Fork the repository on GitHub
- Enable GitHub Actions
- Install prerequisites: VS Code, Copilot CLI (`gh copilot`), .NET 8 SDK
- Overview of what's in the repo and what each directory does

### Lab 01 — Exploring Copilot Configuration (15 min)
- 🖥️ Open the repo in VS Code with Copilot CLI
- Discover the 30 agents in `.github/agents/` — understand agent anatomy
- Explore skills in `.github/skills/` — progressive disclosure model
- Read `AGENTS.md` and `copilot-instructions.md` — how Copilot reads them
- Try using an existing agent (e.g., `@planner`) and prompt (e.g., `/plan`)

### Lab 02 — Custom Instructions & AGENTS.md (20 min)
- 🖥️ Understand the instruction hierarchy: copilot-instructions.md → .instructions.md → AGENTS.md
- Read the existing `.github/instructions/` files (security, testing, typescript, dotnet)
- Modify `copilot-instructions.md` to add a project-specific rule
- Observe how the change affects Copilot's behavior
- Edit `AGENTS.md` to document a new architectural decision

### Lab 03 — Creating a .NET Development Agent (20 min)
- 🖥️ Create `dotnet-dev.agent.md` — a specialized agent for ContosoUniversity
- Configure tools: `edit`, `read`, `execute`, `search`
- Add MCP server reference for C# language intelligence
- Define the agent's expertise: clean architecture, Entity Framework, xUnit
- Test the agent by asking it to analyze the ContosoUniversity codebase

### Lab 04 — Skills & Prompts (20 min)
- 🖥️ Create a new skill: `dotnet-testing/SKILL.md`
- Understand SKILL.md frontmatter (name, description) and how skills auto-activate
- Create a prompt: `create-dotnet-test.prompt.md`
- Understand prompt frontmatter (tools, description, mode)
- Test: use the prompt to generate a test for a ContosoUniversity controller

### Lab 05 — MCP Server Configuration (20 min)
- 🖥️ Examine `.copilot/mcp-config.json` — the 5 configured servers
- Understand server types: local (stdio), http
- Add a new MCP server configuration (C# LSP bridge or custom)
- Use Context7 to look up .NET documentation
- Use Memory MCP to store a fact about the codebase

### Lab 06 — Hooks (15 min)
- 🖥️ Examine `.github/hooks/default.json` — the hook lifecycle
- Understand hook types: preToolUse, postToolUse, userPromptSubmitted, errorOccurred
- Read existing hooks: secret-scan, format, typecheck, doc-blocker
- Create a new hook: post-tool-use build check for .NET
- Test: make a code change and observe the hook fire

### Lab 07 — Multi-Agent Orchestration (25 min)
- 🖥️ Create an orchestrator agent that coordinates a development workflow
- Define the flow: dotnet-dev → QA (testing) → code-reviewer
- Use the existing `dev.agent.md`, `qa.agent.md`, `code-reviewer.agent.md` as inspiration
- Test: ask the orchestrator to implement a small feature and observe delegation

### Lab 08 — GitHub Agentic Workflows: PRD Generation (20 min)
- 🌐 Examine `.github/workflows/generate-prd.md` — the gh-aw workflow
- Understand: YAML frontmatter (triggers, permissions, tools) + Markdown body (instructions)
- 🌐 Create a feature branch → observe the workflow trigger
- Review the auto-generated PRD document
- Understand safe-outputs and security constraints

### Lab 09 — GitHub Agentic Workflows: Code Review (20 min)
- 🌐 Examine `.github/workflows/code-review.md` — the gh-aw workflow
- Open a PR with your changes → observe automated review
- Understand how the agentic workflow reads your code and provides feedback
- Review the workflow run in GitHub Actions
- Iterate: push a fix based on the review feedback

### Lab 10 — Session Management & Memory (15 min)
- 🖥️ Use Memory MCP to persist decisions across sessions
- Create entities and relations in the knowledge graph
- Practice session handoff: create a handoff prompt
- Use the `checkpoint` prompt to save session state
- Review: how all the pieces fit together for real-world development

## GitHub Agentic Workflows (gh-aw)

### Workflow 1: Generate PRD on Branch Creation

**File**: `.github/workflows/generate-prd.md`

```markdown
---
on:
  create:
    branches:
      - 'feature/**'
      - 'story/**'
permissions:
  contents: write
  issues: read
tools:
  github:
    toolsets: [repos, issues]
  edit:
  bash: ["dotnet"]
runtimes:
  dotnet:
    version: "8.0"
---
## Generate PRD for Feature Branch

Read the branch name and extract the feature/story description.
Generate a Product Requirements Document (PRD) at `docs/prd/PRD-{branch-name}.md`.

The PRD should include:
1. Feature overview derived from the branch name
2. Acceptance criteria
3. Technical considerations for the ContosoUniversity .NET project
4. Testing requirements
5. Out of scope items

Use the ContosoUniversity codebase context to make the PRD specific and actionable.
```

### Workflow 2: Automated Code Review on PR

**File**: `.github/workflows/code-review.md`

```markdown
---
on:
  pull_request:
    types: [opened, synchronize]
permissions:
  contents: read
  pull-requests: write
tools:
  github:
    toolsets: [pull_requests, repos]
  bash: ["dotnet"]
runtimes:
  dotnet:
    version: "8.0"
safe-outputs:
  add-pr-comment:
    labels: [ai-review]
---
## Automated Code Review

Review the pull request changes focusing on:
1. .NET/C# best practices and clean architecture compliance
2. ContosoUniversity-specific patterns (repository pattern, DI, EF Core)
3. Security: no hardcoded secrets, proper input validation
4. Testing: are there tests for new code?
5. Documentation: is AGENTS.md or instructions updated if needed?

Provide constructive feedback as a PR comment. Be specific with file and line references.
Do NOT approve or request changes — only comment with suggestions.
```

## New Agents (Created During Lab)

### dotnet-dev.agent.md
- **Purpose**: Specialized .NET development agent for ContosoUniversity
- **Tools**: edit, read, execute, search
- **MCP**: C# language intelligence (if available)
- **Expertise**: Clean architecture, EF Core, ASP.NET MVC, dependency injection

### dotnet-qa.agent.md
- **Purpose**: .NET testing specialist
- **Tools**: edit, read, execute, search
- **Expertise**: xUnit, Moq, Playwright, test infrastructure, ContosoUniversity test patterns

### lab-orchestrator.agent.md
- **Purpose**: Coordinates dev → QA → review workflow
- **Tools**: agent (delegates to other agents)
- **Pattern**: Sequential delegation with context passing

## New Skills (Created During Lab)

### dotnet-testing/SKILL.md
- xUnit patterns, test naming conventions, ContosoUniversity test infrastructure
- Mocking with Moq, integration test setup with WebApplicationFactory

## New Instructions (Created During Lab)

### dotnet.instructions.md (already added)
- DDD/SOLID/.NET guidelines from ContosoUniversity
- Applies to: `**/*.cs, **/*.csproj, **/Program.cs, **/*.razor`

## Solutions Directory

Complete reference implementations for all lab exercises:

```
solutions/
├── lab03-dotnet-dev-agent/
│   └── dotnet-dev.agent.md
├── lab04-skill-and-prompt/
│   ├── dotnet-testing/SKILL.md
│   └── create-dotnet-test.prompt.md
├── lab05-mcp-config/
│   └── mcp-config.json
├── lab06-hooks/
│   └── post-tool-use-dotnet-build.sh
├── lab07-orchestrator/
│   └── lab-orchestrator.agent.md
├── lab08-gh-aw-prd/
│   └── generate-prd.md
└── lab09-gh-aw-review/
    └── code-review.md
```

## Session Plan

| Session | Focus | Deliverables |
|---------|-------|-------------|
| 1 (current) | Planning, cleanup, .NET project, PRD | Branch, cleaned repo, PRD |
| 2 | Labs setup-03, gh-aw workflows, new agents | First 4 lab modules, workflow stubs |
| 3 | Labs 04-07, skills, hooks | Middle lab modules, new skills |
| 4 | Labs 08-10, solutions, README, polish | Final labs, solutions dir, README |

## Technical Requirements

### Prerequisites for Learners
- GitHub account with Copilot license (Individual, Business, or Enterprise)
- VS Code with GitHub Copilot extension (or Copilot CLI)
- .NET 8 SDK
- `gh` CLI with `gh copilot` extension
- `gh aw` CLI extension (for agentic workflows labs)
- Git

### Repository Requirements
- GitHub Actions enabled
- Branch protection optional (recommended for code review workflow)
- No secrets required (all tools are local or use public APIs)

## Success Criteria

1. All 10 lab modules can be completed sequentially in ~3 hours
2. Each module is self-contained with clear start/end states
3. Solutions directory provides reference implementations for every exercise
4. gh-aw workflows compile and run successfully
5. The lab teaches ALL major Copilot features (agents, skills, instructions, prompts, hooks, MCP, AGENTS.md, gh-aw)
