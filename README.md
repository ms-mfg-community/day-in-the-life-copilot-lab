# Everything GitHub Copilot — Hands-On Lab

**A comprehensive hands-on lab teaching the FULL GitHub Copilot agentic development experience.**

Learn to build, configure, and orchestrate AI agents using GitHub Copilot's complete feature set — agents, skills, instructions, prompts, hooks, MCP servers, and GitHub Agentic Workflows — all while working on a real .NET application.

---

## What You'll Learn

| Feature | Description | Lab |
|---------|-------------|-----|
| **Agents** | Custom `.agent.md` profiles with specialized roles | Lab 01, 03 |
| **Skills** | `SKILL.md` files with progressive disclosure | Lab 01, 04 |
| **Instructions** | `copilot-instructions.md` + `.instructions.md` | Lab 02 |
| **AGENTS.md** | Repository-level context document | Lab 02 |
| **Prompts** | `.prompt.md` reusable prompt templates | Lab 04 |
| **Hooks** | Pre/post tool-use automation | Lab 06 |
| **MCP Servers** | External tool integrations (context7, memory, LSP) | Lab 05 |
| **Orchestration** | Multi-agent coordination workflows | Lab 07 |
| **Agentic Workflows** | `gh-aw` CI/CD automation with AI agents | Lab 08, 09 |
| **Session Management** | Cross-session persistence with Memory MCP | Lab 10 |

---

## Prerequisites

- GitHub account with Copilot license (Individual, Business, or Enterprise)
- [VS Code](https://code.visualstudio.com/) with [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) (`gh copilot`)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [GitHub CLI](https://cli.github.com/) (`gh`) with `gh aw` extension for agentic workflows
- Git

---

## Lab Modules

| # | Module | Duration | Focus |
|---|--------|----------|-------|
| [Setup](labs/setup.md) | Fork, Prerequisites, Overview | 10 min | Fork repo, enable Actions, install tools |
| [Lab 01](labs/lab01.md) | Exploring Copilot Configuration | 15 min | Discover agents, skills, instructions, prompts |
| [Lab 02](labs/lab02.md) | Custom Instructions & AGENTS.md | 20 min | Instruction hierarchy, modify, extend |
| [Lab 03](labs/lab03.md) | Creating a .NET Agent | 20 min | Build `dotnet-dev.agent.md` |
| [Lab 04](labs/lab04.md) | Skills & Prompts | 20 min | Create skill, write prompt template |
| [Lab 05](labs/lab05.md) | MCP Server Configuration | 20 min | Configure context7, memory, C# LSP |
| [Lab 06](labs/lab06.md) | Hooks | 15 min | Pre/post tool hooks, build checks |
| [Lab 07](labs/lab07.md) | Multi-Agent Orchestration | 25 min | Orchestrator → dev → QA → review |
| [Lab 08](labs/lab08.md) | gh-aw: PRD Generation | 20 min | Branch creation triggers PM agent |
| [Lab 09](labs/lab09.md) | Copilot Code Review | 20 min | Built-in AI-powered pull request reviews |
| [Lab 10](labs/lab10.md) | Session Management & Memory | 15 min | Memory MCP, continuous learning, session handoffs |

**Total Duration: ~3 hours**

---

## Repository Structure

```
everything-copilot/
├── .github/
│   ├── agents/                    # 30 custom agent profiles (.agent.md)
│   ├── skills/                    # 29 agent skills (SKILL.md)
│   ├── prompts/                   # 36 prompt templates (.prompt.md)
│   ├── hooks/                     # Hook configuration (default.json)
│   ├── instructions/              # 6 path-specific instructions (.instructions.md)
│   ├── copilot-instructions.md    # Repository-wide instructions
│   └── workflows/                 # GitHub Agentic Workflows (.md + .lock.yml)
├── .copilot/
│   └── mcp-config.json            # MCP server configuration (5 servers)
├── ContosoUniversity.sln          # .NET solution file
├── ContosoUniversity.Core/        # Domain models and interfaces
├── ContosoUniversity.Infrastructure/  # Data access and services
├── ContosoUniversity.Web/         # ASP.NET MVC web application
├── ContosoUniversity.Tests/       # xUnit unit and integration tests
├── ContosoUniversity.PlaywrightTests/ # Playwright E2E tests
├── labs/                          # Hands-on lab modules
├── solutions/                     # Reference solutions for each lab
├── docs/                          # Research and reference documentation
├── scripts/hooks/                 # Hook shell scripts
├── mcp-configs/                   # MCP server reference configurations
├── AGENTS.md                      # Repository-level agent context
├── CONTRIBUTING.md                # Contribution guidelines
└── README.md                      # This file
```

---

## The Brownfield Project: ContosoUniversity

The lab uses **ContosoUniversity**, a .NET 8 web application with clean architecture:

- **ContosoUniversity.Core** — Domain models (Student, Course, Instructor, Department, Enrollment)
- **ContosoUniversity.Infrastructure** — Entity Framework Core, repositories, external services
- **ContosoUniversity.Web** — ASP.NET MVC controllers, views, dependency injection
- **ContosoUniversity.Tests** — xUnit tests with WebApplicationFactory
- **ContosoUniversity.PlaywrightTests** — End-to-end browser tests

---

## Pre-Configured Copilot Features

This repo ships with a rich set of configurations for you to explore and extend:

### Agents (30)
Specialized profiles including: `dev`, `qa`, `pm`, `orchestrator`, `code-reviewer`, `planner`, `architect`, `tdd-guide`, `security-reviewer`, `doc-writer`, and 20 more.

### Skills (29)
Auto-activating knowledge bases: `coding-standards`, `tdd-workflow`, `security-review`, `verification-loop`, `frontend-patterns`, `backend-patterns`, `golang-patterns`, and more.

### Prompts (36)
Reusable templates: `/plan`, `/commit`, `/code-review`, `/tdd`, `/handoff`, `/create-agent`, `/create-test`, and more.

### Hooks (12)
Automation scripts for: secret scanning, code formatting, type checking, documentation blocking, continuous learning observation, and error logging.

### MCP Servers (5)
Pre-configured: Context7 (library docs), Memory (knowledge graph), Sequential Thinking (reasoning), WorkIQ (Microsoft 365), Microsoft Learn (Azure docs).

---

## Quick Start

```bash
# 1. Fork this repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/everything-copilot.git
cd everything-copilot

# 3. Verify .NET project builds
dotnet build ContosoUniversity.sln

# 4. Open in VS Code
code .

# 5. Start the first lab
# Open labs/setup.md and follow the instructions
```

---

## GitHub Agentic Workflows

This lab uses [GitHub Agentic Workflows](https://github.com/github/gh-aw) (gh-aw) — a new way to author GitHub Actions using Markdown with YAML frontmatter. Two workflows are included:

1. **PRD Generation** (`.github/workflows/generate-prd.md`) — Triggers on feature branch creation, runs a PM agent to generate a Product Requirements Document.
2. **Automated Code Review** (`.github/workflows/code-review.md`) — Triggers on pull requests, runs a code review agent to provide feedback.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding agents, skills, prompts, and other configurations.

## License

[MIT](LICENSE)
