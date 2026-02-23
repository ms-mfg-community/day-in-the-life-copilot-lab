# Session 2 Handoff — Everything GitHub Copilot Lab

**Date:** 2026-02-18
**Branch:** `lab/everything-copilot`
**Base:** `main`

## What Was Done

### 1. New Agents Created (3)

- **`dotnet-dev.agent.md`** — .NET development specialist for ContosoUniversity. Clean architecture, EF Core, async patterns, repository pattern, DI. Tools: read, edit, execute, search.
- **`dotnet-qa.agent.md`** — .NET testing specialist. xUnit, Moq, WebApplicationFactory, Playwright. MethodName_Condition_ExpectedResult naming. Tools: read, edit, execute, search.
- **`lab-orchestrator.agent.md`** — Development workflow orchestrator. Sequential pipeline: dotnet-dev → dotnet-qa → code-reviewer. Tools: read, search, agent.

### 2. New Skill Created (1)

- **`dotnet-testing/SKILL.md`** — .NET testing patterns skill. Covers xUnit unit tests, integration tests with WebApplicationFactory, mocking with Moq, test naming conventions, edge case checklists, Playwright E2E patterns.

### 3. New Prompt Created (1)

- **`create-dotnet-test.prompt.md`** — Generates xUnit tests for a ContosoUniversity class. Mode: agent. Creates mock setup, happy path, edge cases, and verification.

### 4. Labs 02-07 Written (Full Content)

- **Lab 02 — Custom Instructions & AGENTS.md**: Instruction hierarchy, modify copilot-instructions.md, create path-specific instruction (razor-views), edit AGENTS.md with ADR.
- **Lab 03 — Creating a .NET Agent**: Agent anatomy, create dotnet-dev.agent.md, configure tools and MCP, test the agent.
- **Lab 04 — Skills & Prompts**: Skill structure and auto-activation, create dotnet-testing skill, create create-dotnet-test prompt, test activation.
- **Lab 05 — MCP Server Configuration**: Examine 5 configured servers, use Context7 for docs, use Memory MCP for persistence, add fetch server.
- **Lab 06 — Hooks**: Hook lifecycle events, read existing hooks, create .NET build verification hook (bash + PowerShell), register in default.json.
- **Lab 07 — Multi-Agent Orchestration**: Design orchestration flow, create lab-orchestrator agent, agent delegation with the `agent` tool, test multi-agent pipeline.

### 5. Solutions Directory Built

Reference implementations for labs 02-07:

```
solutions/
├── lab02-instructions/
│   └── razor-views.instructions.md
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
├── lab08-gh-aw-prd/        (empty — Session 3)
└── lab09-gh-aw-review/     (empty — Session 3)
```

## Commits

1. `feat: add dotnet-dev, dotnet-qa, and lab-orchestrator agents`
2. `feat: add dotnet-testing skill and create-dotnet-test prompt`
3. `docs: write full content for labs 02-07`
4. `feat: build solutions directory for labs 02-07`
5. `docs: add Session 2 handoff document`

## What's Next (Session 3)

### Priority 1: Write Lab Content (Labs 08-10)
- **Lab 08** — GitHub Agentic Workflows: PRD Generation (full content)
- **Lab 09** — GitHub Agentic Workflows: Code Review (full content)
- **Lab 10** — Session Management & Memory (full content)

### Priority 2: Complete Solutions Directory
- `solutions/lab08-gh-aw-prd/generate-prd.md` — reference workflow
- `solutions/lab09-gh-aw-review/code-review.md` — reference workflow

### Priority 3: Compile gh-aw Workflows
- Run `gh aw compile` to generate `.lock.yml` files (if gh-aw CLI available)

### Priority 4: Final Polish
- Update `solutions/README.md` with labs 08-09 entries
- Final README.md review
- Push branch to remote

## Key Files Created/Modified

| File | Action |
|------|--------|
| `.github/agents/dotnet-dev.agent.md` | New — .NET dev agent |
| `.github/agents/dotnet-qa.agent.md` | New — .NET QA agent |
| `.github/agents/lab-orchestrator.agent.md` | New — orchestrator agent |
| `.github/skills/dotnet-testing/SKILL.md` | New — .NET testing skill |
| `.github/prompts/create-dotnet-test.prompt.md` | New — test generation prompt |
| `labs/lab02.md` | Rewritten — full content |
| `labs/lab03.md` | Rewritten — full content |
| `labs/lab04.md` | Rewritten — full content |
| `labs/lab05.md` | Rewritten — full content |
| `labs/lab06.md` | Rewritten — full content |
| `labs/lab07.md` | Rewritten — full content |
| `solutions/README.md` | Updated — added lab02, how to use |
| `solutions/lab02-instructions/` | New — razor-views solution |
| `solutions/lab03-dotnet-dev-agent/` | New — dotnet-dev solution |
| `solutions/lab04-skill-and-prompt/` | New — skill + prompt solutions |
| `solutions/lab05-mcp-config/` | New — mcp-config solution |
| `solutions/lab06-hooks/` | New — build hook solution |
| `solutions/lab07-orchestrator/` | New — orchestrator solution |

## Memory MCP Entities to Update

The `everything-copilot-lab` entity should be updated with:
- Session 2 complete status
- 3 new agents created (dotnet-dev, dotnet-qa, lab-orchestrator)
- 1 new skill created (dotnet-testing)
- 1 new prompt created (create-dotnet-test)
- Labs 02-07 have full content
- Solutions directory built for labs 02-07
- Remaining: Labs 08-10, solutions 08-09, gh-aw compile, final polish
