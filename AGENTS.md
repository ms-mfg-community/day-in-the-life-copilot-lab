# AGENTS.md
<!-- Keep this file minimal: only include things agents can't discover on their own. -->

## Project Overview

This is the **Everything GitHub Copilot Hands-On Lab** — a comprehensive training experience that teaches the full GitHub Copilot agentic development surface. It contains a brownfield .NET application (ContosoUniversity) plus a rich set of Copilot configurations (agents, skills, prompts, hooks, MCP servers) that learners explore, modify, and extend.

## Technology Stack

- **Application**: ASP.NET Core 8 MVC with Entity Framework Core (ContosoUniversity)
- **Architecture**: Clean architecture — Core (domain), Infrastructure (data), Web (MVC), Tests (xUnit), PlaywrightTests (E2E)
- **Copilot Config**: 3 agents, 10 skills, 23 prompts, 5 hook events, 3 instructions, 5 MCP servers
- **CI/CD**: GitHub Agentic Workflows (gh-aw) for PRD generation and code review

## Build & Test

```shell
dotnet build dotnet/ContosoUniversity.sln
dotnet test
```

## Automated Content Audit

A weekly gh-aw workflow (`.github/workflows/weekly-content-audit.md`) runs every Sunday at 05:00 UTC. It reads `docs/_meta/registry.yaml`, runs the seven freshness checks (CLI, gh-aw, MCP, doc URLs, packages, models, lab pacing), and opens **one** PR on `automation/weekly-audit-YYYY-MM-DD` containing safe registry/lab updates plus a generated `docs/_meta/audit-report.md`. The PR is auto-labeled (`automated`, `content-audit`, `needs-review`), reviewers are assigned via `.github/CODEOWNERS`, and the PR is opened as a draft when changes exceed `audit.draft_pr_if_changes_exceed`. Future agents: update the registry instead of hardcoding versions in labs.

## Agent Suite

### Azure Specialists

| Agent | Codename | Domain |
|-------|----------|--------|
| Infrastructure Architect | **Stratus** | Bicep IaC, Landing Zones, WAF |
| Agent Development | **Nexus** | Agent Framework SDK, MCP |
| Fabric Data Architect | **Prism** | OneLake, medallion patterns ([Lab 12](labs/lab12.md) — Fabric MCP + offline Parquet path) |
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

## Token discipline

- Default to `auto`. Reach for `claude-haiku-4.5` / `gpt-5-mini` for routine tool-heavy loops; reserve `claude-opus-4.7` / `gpt-5.3-codex` for hard reasoning. Pin `task`-tool sub-agent dispatches to `claude-opus-4.6` (per `copilot-instructions.md`).
- Batch related tool calls — reads, edits, and shell commands — into a single turn whenever the calls are independent.
- Keep context lean: prefer `view_range` over full-file reads, archive completed `plan.md` phases, and run `/clear` (or `scripts/orchestrator/clear-context.sh`) between worker-pane phases.
- Run `/cost-check` once per phase to estimate the session footprint and surface the top compaction opportunities.
- Full mental model: [`docs/token-and-model-guide.md`](docs/token-and-model-guide.md). On-demand audit prompt: [`.github/prompts/cost-check.prompt.md`](.github/prompts/cost-check.prompt.md).

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
