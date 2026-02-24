# Hands-on Lab Setup

Complete this setup **before the session begins**. The labs assume your environment is ready.

> ⏱️ **Pre-work** — complete before the session

> 🎤 **Presenter note:** The session opens with a 1-minute video demo showing 4 terminals collaborating on a real feature via the session broker — an orchestrator decomposing work, a dev agent implementing, a QA agent testing, and a reviewer providing feedback, all coordinated in real time. Frame it with: *"This is what expert agentic coding looks like. Today we give you the building blocks to get there."* Acknowledge: *"I'll move quickly at the front. Follow along, or go at your own pace — the lab docs are self-contained with links you can explore later."*

References:
- [Fork a repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [GitHub Agentic Workflows](https://github.com/github/gh-aw)

## Prerequisites

Before starting the labs, ensure you have:

1. **GitHub Account** with a Copilot license (Individual, Business, or Enterprise)
2. **VS Code** with the [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
3. **GitHub CLI** (`gh`) — [Install guide](https://cli.github.com/)
4. **GitHub Copilot CLI** — Install via [one of the available methods](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli): `brew install copilot-cli` (macOS/Linux), `winget install GitHub.Copilot` (Windows), or `npm install -g @github/copilot`
5. **GitHub Agentic Workflows CLI** — Install with: `gh extension install github/gh-aw`
6. **.NET 8 SDK** — [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
7. **Git** — [Install guide](https://git-scm.com/downloads)

## S.1 Fork and Clone the Repository

🌐 **On GitHub:**

1. Fork this repository: [day-in-the-life-copilot-lab](https://github.com/YOUR-ORG/day-in-the-life-copilot-lab)
2. Go to your fork's **Settings** → **Actions** → **General** and ensure Actions are enabled
3. Go to **Actions** tab and click _"I understand my workflows, go ahead and enable them"_ if prompted

🖥️ **On your machine:**

4. Clone your fork:

**WSL/Bash:**
```bash
git clone https://github.com/YOUR-USERNAME/day-in-the-life-copilot-lab.git
cd day-in-the-life-copilot-lab
```

**PowerShell:**
```powershell
git clone https://github.com/YOUR-USERNAME/day-in-the-life-copilot-lab.git
Set-Location day-in-the-life-copilot-lab
```

5. Verify the .NET project builds:

**WSL/Bash:**
```bash
dotnet build ContosoUniversity.sln
```

**PowerShell:**
```powershell
dotnet build ContosoUniversity.sln
```

You should see something similar to:
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

## S.2 Verify Copilot CLI

🖥️ **On your machine:**

1. Verify GitHub CLI is authenticated:

**WSL/Bash:**
```bash
gh auth status
```

**PowerShell:**
```powershell
gh auth status
```

2. Verify Copilot CLI is installed:

**WSL/Bash:**
```bash
gh copilot --version
```

**PowerShell:**
```powershell
gh copilot --version
```

3. Verify Agentic Workflows CLI is installed:

**WSL/Bash:**
```bash
gh aw --version
```

**PowerShell:**
```powershell
gh aw --version
```

## S.3 Explore the Repository Structure

🖥️ **On your machine:**

1. Open the repository in VS Code:

**WSL/Bash:**
```bash
code .
```

**PowerShell:**
```powershell
code .
```

2. Take a moment to explore the key directories. This is what you'll be working with throughout the labs:

| Directory | Contents | Count |
|-----------|----------|-------|
| `.github/skills/` | Agent skills (`SKILL.md`) | 10 |
| `.github/prompts/` | Prompt templates (`.prompt.md`) | 21 |
| `.github/hooks/` | Hook configuration | 1 |
| `.github/instructions/` | Path-specific instructions (`.instructions.md`) | 3 |
| `.copilot/` | MCP server configuration | 1 |
| `scripts/hooks/` | Hook shell scripts | 17 |
| `ContosoUniversity.*` | .NET project files | 5 projects |

3. Read the repository context document:

**WSL/Bash:**
```bash
cat AGENTS.md
```

**PowerShell:**
```powershell
Get-Content AGENTS.md
```

4. _(Optional)_ Create a tracking issue in your fork:

🌐 **On GitHub:**

- Title: `Lab Progress — Everything GitHub Copilot`
- Body:
```markdown
### Lab Progress
- [x] Setup
- [ ] Lab 01: Exploring Copilot Configuration
- [ ] Lab 02: Custom Instructions & AGENTS.md
- [ ] Lab 03: Creating a .NET Agent
- [ ] Lab 04: Skills & Prompts
- [ ] Lab 05: MCP Server Configuration
- [ ] Lab 06: Hooks
- [ ] Lab 07: Multi-Agent Orchestration
- [ ] Lab 08: gh-aw: PRD Generation
- [ ] Lab 09: Copilot Coding Agent & Code Review
- [ ] Lab 10: Session Management & Memory
```

## Setup Complete ✅

You now have:
- A forked repository with all Copilot configurations
- A building .NET project (ContosoUniversity)
- Copilot CLI and gh-aw CLI installed
- An understanding of the repository structure

## Opening: The Art of the Possible (for presenter)

Before Lab 01, the session opens with a **1-minute video** showing the session broker — a multi-agent coordination platform built entirely with the building blocks covered in these labs:

- **Terminal 1 (Orchestrator):** Receives a feature request, decomposes it into tasks, assigns work to team members via MCP tools
- **Terminal 2 (Dev Agent):** Picks up the implementation task, declares file intents, writes code, signals completion through the broker
- **Terminal 3 (QA Agent):** Detects implementation is done via broker events, writes tests, runs them, reports results
- **Terminal 4 (Reviewer):** Automatically reviews the changes, posts findings back through the broker

**Framing (2 minutes):**

> *"What you just saw was 4 AI agents collaborating on a real feature — coordinated through a custom MCP server we built using exactly the building blocks you're about to learn. Agents, skills, hooks, MCP servers, instructions — those are the primitives. Your job as a developer is changing: from writing every line yourself to orchestrating AI agents that work together. We've slowed things down in this lab to give you the building blocks. By the end, you'll have the full map."*
>
> *"I'll be moving through the labs quickly at the front. You're encouraged to follow along, but you can also go at your own pace — these lab docs are self-contained with reference links. Some of you will fly through the early labs; others will want to spend more time exploring. Both are fine."*

**Next:** [Lab 01 — Exploring Copilot Configuration](lab01.md)
