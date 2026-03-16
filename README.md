# Everything GitHub Copilot — Hands-On Lab

A comprehensive, hands-on lab teaching the **full GitHub Copilot agentic development experience** — agents, skills, instructions, prompts, hooks, MCP servers, orchestration, and GitHub Agentic Workflows — all while working on a real web application.

> **Two versions available:** This lab includes both a **.NET 8** (ASP.NET Core MVC) and a **Python** (Flask) version of the ContosoUniversity application. Choose whichever matches your team's stack — the Copilot features work identically with both.

> **Start here** → [Lab Setup & Instructions](labs/setup.md)

---

## Prerequisites

| Requirement | Details |
|------------|---------|
| **GitHub account** | With Copilot license (Individual, Business, or Enterprise) |
| **VS Code** | Latest version with [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) extension |
| **GitHub CLI** | [Install `gh`](https://cli.github.com/) — verify with `gh --version` |
| **Copilot CLI** | [Install guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli) — install with `npm install -g @github/copilot`, verify with `copilot --version` |
| **Git** | [Install](https://git-scm.com/downloads) — configured with your GitHub credentials |
| **gh-aw extension** | `gh extension install github/gh-aw` (for Labs 08–09) |

**Choose one (or both):**

| Stack | Requirement | Verify |
|-------|------------|--------|
| **.NET** | [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0) | `dotnet --version` |
| **Python** | [Python 3.11+](https://www.python.org/downloads/) | `python --version` |

### Permissions & Licensing

Most labs (01–07, 10) work with **any Copilot license**. A few labs require specific plans or permissions:

| Lab | Feature | Required License | GitHub Permissions |
|-----|---------|-----------------|-------------------|
| **Lab 08** | GitHub Agentic Workflows (`gh-aw`) | Copilot Business or Enterprise | Actions enabled, `COPILOT_GITHUB_TOKEN` secret ([setup](labs/lab08.md#84-configure-the-copilot_github_token-secret)) |
| **Lab 09** | Copilot Coding Agent + Code Review | Copilot Pro+, Business, or Enterprise | Repo admin (to configure rulesets + enable coding agent) |
| All other labs | Agents, Skills, Instructions, Prompts, Hooks, MCP, Orchestration | Any Copilot license (Individual+) | Repo write access |

> **Note:** If your organization restricts Copilot features via policy, check with your admin that agent mode, MCP servers, and Copilot CLI are enabled.

---

## Quick Start

### 1. Fork & Clone

```bash
# Fork this repository on GitHub, then:
git clone https://github.com/YOUR-USERNAME/day-in-the-life-copilot-lab.git
cd day-in-the-life-copilot-lab
```

### 2. Build & Run

Choose your stack:

<details>
<summary><strong>🐍 Python (Flask)</strong></summary>

```bash
cd ContosoUniversity_Python
pip install -r requirements.txt
python run.py
```

The app starts at **http://localhost:5000**. On first run, the database is automatically created and seeded with sample data.

> **Note:** Uses SQLite (`contoso_university.db`), created automatically. No external database required.

</details>

<details>
<summary><strong>🔷 .NET (ASP.NET Core)</strong></summary>

```bash
dotnet build ContosoUniversity.sln
dotnet run --project ContosoUniversity.Web
```

The app starts at **https://localhost:52379** (or http://localhost:52380). On first run, the database is automatically created and seeded with sample data (students, courses, instructors, departments).

> **Note:** The Development configuration uses SQLite, which works on all platforms (Windows, macOS, Linux). The database file (`ContosoUniversity.db`) is created automatically in the web project directory. Production uses SQL Server.

</details>

Press `Ctrl+C` to stop the application.

### 3. Open in VS Code

```bash
code .
```

### 4. Verify

**Python:**

| Check | Command | Expected |
|-------|---------|----------|
| Python version | `python --version` | 3.11+ |
| App runs | `python run.py` (from `ContosoUniversity_Python/`) | Server at http://localhost:5000 |
| Tests pass | `python -m pytest tests/ -v` | 42 tests pass |
| Copilot CLI | `copilot --version` | Version number |
| Extensions | VS Code → Extensions panel | GitHub Copilot installed & signed in |

**.NET:**

| Check | Command | Expected |
|-------|---------|----------|
| .NET build | `dotnet build ContosoUniversity.sln` | `Build succeeded` |
| Tests pass | `dotnet test ContosoUniversity.Tests` | All tests pass |
| Copilot CLI | `copilot --version` | Version number |
| Extensions | VS Code → Extensions panel | GitHub Copilot installed & signed in |

### 5. Start the labs

Open [`labs/setup.md`](labs/setup.md) and follow the instructions.

---

## The Application

**ContosoUniversity** is a university management web application available in two stacks. Both versions are functionally equivalent — same domain models, same seed data, same CRUD operations, same UI.

| | .NET Version | Python Version |
|---|---|---|
| **Framework** | ASP.NET Core 8 MVC | Flask 3.0 |
| **ORM** | Entity Framework Core | SQLAlchemy 2.0 |
| **Database** | SQLite (dev) / SQL Server (prod) | SQLite |
| **Templates** | Razor (.cshtml) | Jinja2 (.html) |
| **Tests** | xUnit + WebApplicationFactory | pytest + Flask test client |
| **Directory** | Repository root | `ContosoUniversity_Python/` |

```mermaid
erDiagram
    Department ||--o{ Course : offers
    Department ||--o| Instructor : "administered by"
    Course ||--o{ Enrollment : has
    Student ||--o{ Enrollment : "enrolled in"
    Instructor }o--o{ Course : teaches
    Instructor ||--o| OfficeAssignment : has
    Enrollment }o--o| Grade : receives
```

| Project | Layer | Purpose |
|---------|-------|---------|
| **ContosoUniversity.Core** | Domain (.NET) | Models, interfaces, business rules |
| **ContosoUniversity.Infrastructure** | Data (.NET) | EF Core, repositories, services |
| **ContosoUniversity.Web** | Presentation (.NET) | MVC controllers, views, DI |
| **ContosoUniversity.Tests** | Testing (.NET) | xUnit + WebApplicationFactory |
| **ContosoUniversity.PlaywrightTests** | E2E (.NET) | Browser-based Playwright tests |
| **ContosoUniversity_Python/** | Full-stack (Python) | Flask app, SQLAlchemy models, Jinja2 templates, pytest |

---

## What You'll Learn

| Feature | What It Does | Lab |
|---------|-------------|-----|
| **Plugin Marketplace** | Browse and install community agents from the CLI marketplace | 01 |
| **Agents** | Custom `.agent.md` profiles with specialized AI roles | 01, 03 |
| **Skills** | `SKILL.md` auto-activating knowledge packs | 01, 04 |
| **Instructions** | `copilot-instructions.md` + path-scoped `.instructions.md` | 02 |
| **AGENTS.md** | Repository-level context — always loaded | 02 |
| **Prompts** | `.prompt.md` reusable command templates | 04 |
| **MCP Servers** | External tool integrations (Context7, Memory, Microsoft Learn) | 05 |
| **Hooks** | Pre/post tool-use lifecycle automation | 06 |
| **Orchestration** | Multi-agent coordination workflows | 07 |
| **Agentic Workflows** | `gh-aw` CI/CD automation with AI agents | 08, 09 |
| **Coding Agent** | Platform-level issue → PR implementation | 09 |
| **Code Review** | AI-powered pull request reviews | 09 |
| **Reindex** | Automatic semantic understanding of your codebase | 10 |
| **Session Management** | Memory MCP for decisions, handoffs, continuous learning | 10 |

---

## Lab Modules

> 💡 **Multi-Platform Support:** All lab command lines provide both **PowerShell** and **WSL/Bash** alternatives. Choose the commands that work best for your environment.

| Lab | Module | Focus |
|-----|--------|-------|
| [Setup](labs/setup.md) | Fork, Prerequisites, Overview | Fork repo, enable Actions, install tools |
| [Lab 01](labs/lab01.md) | Exploring Copilot Configuration | Plugin marketplace, agents, skills, instructions, prompts |
| [Lab 02](labs/lab02.md) | Custom Instructions & AGENTS.md | Instruction hierarchy, modify, extend |
| [Lab 03](labs/lab03.md) | Creating a Dev Agent | Build `dotnet-dev.agent.md` or a Python dev agent |
| [Lab 04](labs/lab04.md) | Skills & Prompts | Create a skill, write a prompt template |
| [Lab 05](labs/lab05.md) | MCP Server Configuration | Configure Context7, Memory, Sequential Thinking |
| [Lab 06](labs/lab06.md) | Hooks | Pre/post tool hooks, build checks |
| [Lab 07](labs/lab07.md) | Multi-Agent Orchestration | Orchestrator → dev → QA → review |
| [Lab 08](labs/lab08.md) | gh-aw: PRD Generation | Branch creation triggers PM agent |
| [Lab 09](labs/lab09.md) | Copilot Coding Agent & Code Review | Issue → Coding Agent → PR → AI review |
| [Lab 10](labs/lab10.md) | Reindex, Session Management & Memory | Reindex, Memory MCP, continuous learning, handoffs |

**Total: ~3 hours** (10 labs — self-paced or presenter-led)

---

## Pre-Configured Copilot Features

This repo ships with a rich set of configurations for you to explore and extend:

| Category | Count | Examples |
|----------|-------|---------|
| **Agents** | 2 (+ more you build!) | `planner`, `code-reviewer` — learners create more in Labs 03, 07 |
| **Skills** | 10 | `coding-standards`, `tdd-workflow`, `security-review`, `verification-loop`, `frontend-patterns` |
| **Prompts** | 23 | `/plan`, `/commit`, `/code-review`, `/tdd`, `/create-test`, `/create-python-test`, `/plan-python` |
| **Hooks** | 7 | Secret scanning, code formatting, type checking, continuous learning, error logging |
| **MCP Servers** | 5 | Context7 (library docs), Memory (knowledge graph), Sequential Thinking, WorkIQ, Microsoft Learn |
| **Instructions** | 4 | Path-specific rules for `.cs`, `.py`, test files, and security |

---

## Testing

The project has test suites for both stacks covering unit, integration, and end-to-end scenarios.

### Python Tests (pytest)

```bash
cd ContosoUniversity_Python
python -m pytest tests/ -v              # All tests
python -m pytest tests/unit/ -v         # Unit tests only
python -m pytest tests/integration/ -v  # Integration tests only
python -m pytest tests/ --cov=app       # With coverage
```

These tests use an **in-memory SQLite database** — no external dependencies required.

### .NET Tests (xUnit)

Run all xUnit tests (unit + integration):

```bash
dotnet test ContosoUniversity.Tests --nologo
```

These tests use an **in-memory SQLite database** — no external dependencies required. The test infrastructure includes `CustomWebApplicationFactory` for integration tests and `TestDataSeeder` for deterministic test data.

**Filter by test category:**

| Category | Command |
|----------|---------|
| All xUnit tests | `dotnet test ContosoUniversity.Tests` |
| Student search query service | `dotnet test ContosoUniversity.Tests --filter "FullyQualifiedName~StudentQueryService"` |
| Student controller | `dotnet test ContosoUniversity.Tests --filter "FullyQualifiedName~StudentsController"` |
| Student integration | `dotnet test ContosoUniversity.Tests --filter "FullyQualifiedName~StudentIntegration"` |
| Specific test by name | `dotnet test ContosoUniversity.Tests --filter "FullyQualifiedName~TestName"` |

### End-to-End Tests (Playwright)

Playwright tests run against a **live instance** of the application.

<details>
<summary><strong>🐍 Python E2E</strong></summary>

```bash
# Start the app
cd ContosoUniversity_Python && python run.py

# In a separate terminal, install browsers (first time only)
playwright install

# Run E2E tests
python -m pytest playwright_tests/ -v
```

</details>

<details>
<summary><strong>🔷 .NET E2E</strong></summary>

Playwright tests are in a separate project and are **not included** in `ContosoUniversity.sln`.

```bash
# Step 1 — Start the application
dotnet run --project ContosoUniversity.Web

# Step 2 — Install Playwright browsers (first time only)
pwsh ContosoUniversity.PlaywrightTests/bin/Debug/net9.0/playwright.ps1 install

# Step 3 — Run E2E tests (in a separate terminal)
dotnet test ContosoUniversity.PlaywrightTests --nologo
```

> **Note:** Playwright tests target `net9.0` and require the .NET 9 SDK.

</details>

---

## Useful Commands

| Task | .NET | Python |
|------|------|--------|
| Build/Install | `dotnet build ContosoUniversity.sln` | `pip install -r requirements.txt` |
| Run app | `dotnet run --project ContosoUniversity.Web` | `python run.py` |
| Run tests | `dotnet test ContosoUniversity.Tests` | `python -m pytest tests/ -v` |
| Run E2E tests | `dotnet test ContosoUniversity.PlaywrightTests` | *(coming soon)* |
| Check Copilot CLI | `copilot --version` | `copilot --version` |
| Install gh-aw | `gh extension install github/gh-aw` | `gh extension install github/gh-aw` |

---

## Repository Structure

```
day-in-the-life-copilot-lab/
├── .github/
│   ├── agents/                    # 2 agent profiles — more created during labs
│   ├── skills/                    # 10 agent skills (SKILL.md)
│   ├── prompts/                   # 23 prompt templates (.prompt.md) — .NET + Python
│   ├── hooks/                     # Hook configuration (default.json)
│   ├── instructions/              # 4 path-specific instructions (.cs, .py, tests, security)
│   ├── copilot-instructions.md    # Repository-wide instructions
│   └── workflows/                 # GitHub Agentic Workflows (.md + .lock.yml)
├── .copilot/
│   └── mcp-config.json            # MCP server configuration (5 servers)
│
├── # ── .NET Version ──
├── ContosoUniversity.sln          # .NET solution file
├── ContosoUniversity.Core/        # Domain models and interfaces
├── ContosoUniversity.Infrastructure/  # Data access and services
├── ContosoUniversity.Web/         # ASP.NET MVC web application
├── ContosoUniversity.Tests/       # xUnit unit and integration tests
├── ContosoUniversity.PlaywrightTests/ # Playwright E2E tests (.NET)
│
├── # ── Python Version ──
├── ContosoUniversity_Python/      # Flask app, SQLAlchemy, Jinja2, pytest
│
├── labs/                          # Hands-on lab modules (10 labs)
├── solutions/                     # Reference solutions for each lab
├── docs/                          # Research and reference documentation
├── scripts/hooks/                 # Hook shell scripts (Bash + PowerShell)
├── mcp-configs/                   # MCP server reference configurations
├── AGENTS.md                      # Repository-level agent context
└── TROUBLESHOOTING.md             # Common issues and fixes
```

---

## GitHub Agentic Workflows

This lab uses [GitHub Agentic Workflows](https://github.com/github/gh-aw) (gh-aw) — author GitHub Actions using Markdown with YAML frontmatter. Two workflows are included:

| Workflow | Trigger | What It Does |
|----------|---------|-------------|
| **PRD Generation** | Feature branch created | PM agent generates a Product Requirements Document |
| **Code Review** | Pull request opened | Code review agent provides automated feedback |

---

## Workshop Content

| Resource | Description |
|----------|-------------|
| [Setup Guide](labs/setup.md) | Fork, prerequisites, environment setup |
| [Lab Modules](labs/) | 10 hands-on labs — start here |
| [Reference Solutions](solutions/) | Completed solutions for each lab |
| [Python App README](ContosoUniversity_Python/README.md) | Python/Flask version setup and documentation |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and fixes |
| [AGENTS.md](AGENTS.md) | Full project context document |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Copilot CLI not authenticated | Run `gh auth login` and follow prompts |
| MCP servers not loading | Copy `.copilot/mcp-config.json` to `~/.copilot/`, restart VS Code |
| `dotnet build` fails | Verify .NET 8 SDK: `dotnet --version` — [download](https://dotnet.microsoft.com/download/dotnet/8.0) |
| Python `ModuleNotFoundError` | Run `pip install -r requirements.txt` from `ContosoUniversity_Python/` |
| Python DB not created | Delete `contoso_university.db` and restart — it will be recreated with seed data |
| Skills not activating | Reference the skill explicitly in your prompt, or check `SKILL.md` frontmatter |
| Copilot not responding | Verify the extension is signed in and enabled in VS Code |

For the full troubleshooting guide, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on adding agents, skills, prompts, and other configurations.

## License

[MIT](LICENSE)

---

*Built with GitHub Copilot.*
