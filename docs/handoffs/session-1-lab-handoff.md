# Session 1 Handoff — Everything GitHub Copilot Lab

**Date:** 2026-02-18
**Branch:** `lab/everything-copilot`
**Base:** `main`

## What Was Done

### 1. Branch Created
- `lab/everything-copilot` branched from `main` (preserves all 30 agents, 29 skills, 36 prompts, 12 hooks, 6 instructions, 5 MCP servers)

### 2. Session Broker Code Removed
- Deleted: `src/`, `dashboard/`, Docker files, Node.js configs, tests, stress tests, examples
- Deleted: broker-specific docs (ARCHITECTURE, DEPLOYMENT, SCHEMA-DESIGN, epics, agentic_scrum, archive)
- Deleted: broker-specific hooks (session-start/end, file-intent, activity-report)
- Deleted: broker-specific scripts (spawn-agent, agent-monitor/status/stop, team-dashboard, tmux-status)
- Deleted: broker-manager skill, ux-ui-patterns.OLD skill
- Updated: `.copilot/mcp-config.json` (removed session-broker server)
- Updated: `.github/hooks/default.json` (removed references to deleted hooks)
- **Kept:** All Copilot agents, skills, prompts, remaining hooks, instructions, MCP configs, and relevant docs

### 3. ContosoUniversity .NET Project Added
- Copied from `../ghcp-contoso-university/ContosoUniversity/`
- Projects: Core, Infrastructure, Web, Tests, PlaywrightTests + solution file
- `.gitignore` updated with .NET patterns (bin/, obj/, packages/, etc.)

### 4. Config Merged
- Added `dotnet.instructions.md` (DDD/SOLID/.NET guidelines, applyTo: `**/*.cs`)
- Updated `copilot-instructions.md` with ContosoUniversity project context

### 5. PRD Created
- `docs/PRD-everything-copilot-lab.md` — Full product requirements document
- 10 lab modules defined with descriptions, durations, and flow
- gh-aw workflow specs for PRD generation and code review
- New agent specifications (dotnet-dev, dotnet-qa, lab-orchestrator)
- Solutions directory structure defined

### 6. Documentation Updated
- `README.md` — Complete rewrite for lab context (prerequisites, modules, repo structure)
- `AGENTS.md` — Updated with .NET tech stack, ContosoUniversity domain, agent suite
- `CLAUDE.md` — Updated to match lab context

### 7. Lab Scaffolding Created
- `labs/setup.md` — Full content (fork, prerequisites, verify, explore)
- `labs/lab01.md` — Full content (discover agents, skills, instructions, prompts)
- `labs/lab02.md` through `labs/lab10.md` — Placeholders with section structure
- `solutions/README.md` — Solution directory index

### 8. GitHub Agentic Workflows Created
- `.github/workflows/generate-prd.md` — Triggers on feature/story branch creation, generates PRD
- `.github/workflows/code-review.md` — Triggers on PR, provides automated code review

### 9. Doc-Blocker Hook Updated
- `scripts/hooks/pre-tool-use-doc-blocker.sh` and `.ps1` — Added `labs/` and `solutions/` to allowed paths

## Commits (6)

1. `chore: remove session-broker app code, dashboard, and broker-specific configs`
2. `feat: add ContosoUniversity .NET brownfield project`
3. `feat: merge ContosoUniversity .NET config into .github`
4. `docs: create PRD for Everything GitHub Copilot hands-on lab`
5. `docs: rewrite README, AGENTS.md, and CLAUDE.md for hands-on lab`
6. `feat: add lab scaffolding, gh-aw workflows, and solutions structure`

## What's Next (Session 2)

### Priority 1: Write Lab Content (Labs 02-03)
- **Lab 02** — Custom Instructions & AGENTS.md (full content)
- **Lab 03** — Creating a .NET Agent (full content + create dotnet-dev.agent.md)

### Priority 2: Create New Agents
- `dotnet-dev.agent.md` — .NET development specialist
- `dotnet-qa.agent.md` — .NET testing specialist

### Priority 3: Compile gh-aw Workflows
- Run `gh aw compile` to generate `.lock.yml` files
- Test workflows if possible

### Priority 4: Write Lab Content (Labs 04-07)
- Lab 04 — Skills & Prompts (create dotnet-testing skill)
- Lab 05 — MCP Server Configuration
- Lab 06 — Hooks
- Lab 07 — Multi-Agent Orchestration (create lab-orchestrator.agent.md)

## Session 3-4 Remaining Work

- Labs 08-10 (gh-aw labs, session management)
- Complete solutions directory
- Final polish and README updates
- Push branch to remote

## Key Files Modified

| File | Action |
|------|--------|
| `.copilot/mcp-config.json` | Removed session-broker |
| `.github/hooks/default.json` | Removed broker hook references |
| `.github/copilot-instructions.md` | Added .NET/ContosoUniversity context |
| `.github/instructions/dotnet.instructions.md` | New — DDD/SOLID/.NET |
| `.github/workflows/generate-prd.md` | New — gh-aw PRD generation |
| `.github/workflows/code-review.md` | New — gh-aw code review |
| `scripts/hooks/pre-tool-use-doc-blocker.sh` | Added labs/ and solutions/ to allowed paths |
| `scripts/hooks/pre-tool-use-doc-blocker.ps1` | Added labs/ and solutions/ to allowed paths |
| `README.md` | Complete rewrite |
| `AGENTS.md` | Complete rewrite |
| `CLAUDE.md` | Complete rewrite |
| `docs/PRD-everything-copilot-lab.md` | New — PRD |
| `labs/setup.md` | New — Full content |
| `labs/lab01.md` | New — Full content |
| `labs/lab02-10.md` | New — Placeholders |
| `solutions/README.md` | New — Directory index |

## Memory MCP Entities to Update

The `everything-copilot-lab` entity should be updated with:
- Session 1 complete status
- Branch name: `lab/everything-copilot`
- 6 commits made
- Labs setup + lab01 have full content
- gh-aw workflows created but not compiled
