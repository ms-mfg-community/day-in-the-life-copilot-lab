# AGENTS.md
<!-- Keep this file minimal: only include things agents can't discover on their own. -->

## Project Overview

This is the **Everything GitHub Copilot Hands-On Lab** — a comprehensive training experience that teaches the full GitHub Copilot agentic development surface. It contains a brownfield .NET application (ContosoUniversity) plus a rich set of Copilot configurations (agents, skills, prompts, hooks, MCP servers) that learners explore, modify, and extend.

## Technology Stack

- **Application**: ASP.NET Core 8 MVC with Entity Framework Core (ContosoUniversity)
- **Architecture**: Clean architecture — Core (domain), Infrastructure (data), Web (MVC), Tests (xUnit), PlaywrightTests (E2E)
- **Copilot Config**: 2 agents, 10 skills, 21 prompts, 7 hooks, 3 instructions, 5 MCP servers
- **CI/CD**: GitHub Agentic Workflows (gh-aw) for PRD generation and code review

## Build & Test

```shell
dotnet build dotnet/ContosoUniversity.sln
dotnet test
```

## Agent Suite

### Azure Specialists

| Agent | Codename | Domain |
|-------|----------|--------|
| Infrastructure Architect | **Stratus** | Bicep IaC, Landing Zones, WAF |
| Agent Development | **Nexus** | Agent Framework SDK, MCP |
| Fabric Data Architect | **Prism** | OneLake, medallion patterns |
| Foundry Platform Engineer | **Forge** | Model catalog, Prompt Flow |
| SDET & Quality Engineer | **Sentinel** | Testing, chaos engineering |
| Suite Orchestrator | **Conductor** | Task decomposition, coordination |

### Development Agents

| Agent | Purpose |
|-------|---------|
| `dev` | General development with full tool access |
| `qa` | Testing specialist |
| `pm` | Product manager — requirements and acceptance criteria |
| `orchestrator` | Multi-agent workflow coordination |
| `code-reviewer` | Code review with high signal-to-noise ratio |
| `planner` | Feature planning and architecture |
| `architect` | System design and technical decisions |
| `tdd-guide` | Test-driven development enforcement |
| `security-reviewer` | Security vulnerability detection |

## MCP Servers

| Server | Type | Use For |
|--------|------|---------|
| `context7` | stdio | Third-party library docs, SDKs, frameworks |
| `memory` | stdio | Knowledge graph for persisting entities across sessions |
| `sequential-thinking` | stdio | Structured chain-of-thought reasoning |
| `workiq` | stdio | Microsoft Work IQ for productivity |
| `microsoft-learn` | http | Azure services, Bicep, WAF, Microsoft products |

## ContosoUniversity Domain

The .NET project models a university system with these entities:
- **Student** — enrolled in courses, has enrollment date
- **Course** — has credits, belongs to department, has enrollments
- **Instructor** — teaches courses, has office assignment
- **Department** — manages courses, has administrator (instructor)
- **Enrollment** — links students to courses with optional grade

## Code Style

- Markdown: ATX headings, YAML frontmatter with lowercase keys
- Skills: lowercase with hyphens (`backend-patterns`)
- Shell scripts: both Bash and PowerShell variants
- JSON: 2-space indentation
- C#: follow DDD/SOLID patterns per `dotnet.instructions.md`

## Git Workflow

- Commit format: `<type>: <description>` (feat, fix, docs, chore)
- Add files individually — never `git add .` or `git add -A`
- Feature branches for multi-session work

## Boundaries

### Always Do
- Validate SKILL.md files have `name` and `description` frontmatter
- Test configurations in VS Code or Copilot CLI before marking complete
- Write session handoff documents at session end

### Never Do
- Hardcode secrets or API keys in any configuration file
- Use `git add .` or `git add -A`
- Create unnecessary documentation files
