# AGENTS.md
<!-- Keep this file minimal: only include things agents can't discover on their own. -->

## Project Overview

This is the **Everything GitHub Copilot Hands-On Lab** — a comprehensive training experience that teaches the full GitHub Copilot agentic development surface. It contains a brownfield .NET application (ContosoUniversity) plus a rich set of Copilot configurations (agents, skills, prompts, hooks, MCP servers) that learners explore, modify, and extend.

## Technology Stack

- **Application**: ASP.NET Core 8 MVC with Entity Framework Core (ContosoUniversity)
- **Architecture**: Clean architecture — Core (domain), Infrastructure (data), Web (MVC), Tests (xUnit), PlaywrightTests (E2E)
- **Copilot Config**: 3 agents, 6 skills, 19 prompts, 4 hook events, 4 instructions, 4 MCP servers
- **CI/CD**: GitHub Agentic Workflows (gh-aw) for PRD generation and code review

## Build & Test

```shell
dotnet build dotnet/ContosoUniversity.sln
dotnet test
```

## Automated Content Audit

A weekly gh-aw workflow (`.github/workflows/weekly-content-audit.md`) runs every Sunday at 05:00 UTC. It reads `docs/_meta/registry.yaml`, runs the seven freshness checks (CLI, gh-aw, MCP, doc URLs, packages, models, lab pacing), and opens **one** PR on `automation/weekly-audit-YYYY-MM-DD` containing safe registry/lab updates plus a generated `docs/_meta/audit-report.md`. The PR is auto-labeled (`automated`, `content-audit`, `needs-review`), reviewers are assigned via `.github/CODEOWNERS`, and the PR is opened as a draft when changes exceed `audit.draft_pr_if_changes_exceed`. Future agents: update the registry instead of hardcoding versions in labs.

## Self-Improving Agents/Skills (Lab 19)

A separate, portable gh-aw workflow (`.github/workflows/self-improving-agents.md`) scans this repo's own `.github/agents/`, `.github/skills/`, and `.github/prompts/` for drift (stale references, contradicted instructions, underused files, duplicated responsibility) and opens a **draft-only** PR with mechanical fixes — never a design rewrite, never a deletion, and never an edit to its own workflow file. The same scan logic is also packaged as an installable plugin at `modernization-bundle/` (built on the `plugin-template/` conventions from Lab 11) so other repos can install it via `copilot plugin install` instead of copy-pasting the workflow. See [Lab 19](labs/lab19.md) for the full walkthrough.

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
- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Shortest working diff wins, but only once you understand the problem. The smallest change in the wrong place isn't lazy, it's a second bug.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size, lazy means less code, not the flimsier algorithm.
- Mark deliberate simplifications that cut a real corner with a known ceiling (global lock, O(n²) scan, naive heuristic) with a `ghcp-was-here:` comment naming the ceiling and upgrade path.
- Bug fix = root cause, not symptom: a report names a symptom. Grep every caller of the function you touch and fix the shared function once — one guard there is a smaller diff than one per caller, and patching only the path the ticket names leaves a sibling caller still broken.
- Before writing any code, stop at the first rung that holds:
1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that's already here, don't re-write it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

### Never Do
- Hardcode secrets or API keys in any configuration file
- Use `git add .` or `git add -A`
- Create unnecessary documentation files

Not lazy about: understanding the problem (read it fully and trace the real flow before picking a rung, a small diff you don't understand is just laziness dressed up as efficiency), input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs (the platform is never the spec ideal, a clock drifts, a sensor reads off), anything explicitly requested. Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.
