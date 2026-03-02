# Hands-on Lab Setup

Complete this setup **before the session begins**. The labs assume your environment is ready.

> ⏱️ **Pre-work** — complete before the session

> 🎤 **Presenter note:** The session opens with a 1-minute video demo showing 4 terminals collaborating on a real feature via the session broker — an orchestrator decomposing work, a dev agent implementing, a QA agent testing, and a reviewer providing feedback, all coordinated in real time. Frame it with: *"This is what expert agentic coding looks like. Today we give you the building blocks to get there."* Acknowledge: *"I'll move quickly at the front. Follow along, or go at your own pace — the lab docs are self-contained with links you can explore later."*

References:
- [Fork a repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo)
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js](https://nodejs.org/) (required for Copilot CLI and MCP servers)
- [GitHub CLI](https://cli.github.com/)
- [GitHub Agentic Workflows](https://github.com/github/gh-aw)

## Quick Start: Dev Container (Recommended)

The fastest way to get a fully working environment is to use the included **Dev Container**, which pre-installs all tools and dependencies automatically.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) VS Code extension
2. Fork and clone this repository (see [S.1](#s1-fork-and-clone-the-repository))
3. Open the repo folder in VS Code
4. When prompted _"Reopen in Container"_, click **Yes** — or run **Dev Containers: Reopen in Container** from the Command Palette (`Ctrl+Shift+P`)
5. Wait for the container to build (first time takes a few minutes)
6. Once open, authenticate: `copilot login` and `gh auth login`

The container includes: .NET 8 + 9 SDKs, Node.js, GitHub CLI, Copilot CLI, gh-aw, jq, and all recommended VS Code extensions.

> **Codespaces:** This Dev Container also works with [GitHub Codespaces](https://github.com/features/codespaces) — click **Code → Codespaces → New codespace** on your fork for a fully cloud-hosted environment.

If you prefer to install tools locally, continue with the manual prerequisites below.

---

## Prerequisites (Manual Install)

Before starting the labs, ensure you have:

1. **GitHub Account** with a Copilot license (Individual, Business, or Enterprise)
2. **VS Code** with the [GitHub Copilot extension](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot)
3. **Git** — [Install guide](https://git-scm.com/downloads) — verify with `git --version`
4. **GitHub CLI** (`gh`) — [Install guide](https://cli.github.com/) — verify with `gh --version`
5. **Node.js** (v18+) — [Download](https://nodejs.org/) — verify with `node --version`. Required for Copilot CLI installation (`npm`) and MCP servers (`npx`).
6. **GitHub Copilot CLI** — Install the [Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli): `npm install -g @github/copilot` — verify with `copilot --version`
7. **GitHub Agentic Workflows CLI** — Install with: `gh extension install github/gh-aw` — verify with `gh aw version`
8. **.NET 8 SDK** — [Download](https://dotnet.microsoft.com/download/dotnet/8.0) — verify with `dotnet --version`

### Platform-Specific Installation Notes

<details>
<summary><strong>🐧 Linux</strong></summary>

- **.NET 8 SDK**: Follow the [Install .NET on Linux](https://learn.microsoft.com/dotnet/core/install/linux) guide for your distribution (Ubuntu, Fedora, RHEL, etc.).
- **GitHub CLI**: Install via package manager — see [Installing gh on Linux](https://github.com/cli/cli/blob/trunk/docs/install_linux.md) (apt, dnf, or Homebrew).
- **Node.js**: Install via your package manager or [NodeSource](https://github.com/nodesource/distributions). Alternatively, use [nvm](https://github.com/nvm-sh/nvm).
- **VS Code**: Download the `.deb` or `.rpm` package from [code.visualstudio.com](https://code.visualstudio.com/), or install via Snap: `sudo snap install code --classic`.

</details>

<details>
<summary><strong>🍎 macOS</strong></summary>

- **.NET 8 SDK**: Download the installer from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0) or install via Homebrew: `brew install dotnet-sdk`.
- **GitHub CLI**: Install via Homebrew: `brew install gh`.
- **Node.js**: Install via Homebrew: `brew install node`, or use [nvm](https://github.com/nvm-sh/nvm).
- **VS Code**: Download from [code.visualstudio.com](https://code.visualstudio.com/) or install via Homebrew: `brew install --cask visual-studio-code`.

</details>

<details>
<summary><strong>🪟 Windows</strong></summary>

- **.NET 8 SDK**: Download the installer from [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0) or install via `winget install Microsoft.DotNet.SDK.8`.
- **GitHub CLI**: Install via `winget install GitHub.cli` or the [MSI installer](https://cli.github.com/).
- **Node.js**: Download the installer from [nodejs.org](https://nodejs.org/) or install via `winget install OpenJS.NodeJS.LTS`.
- **VS Code**: Download from [code.visualstudio.com](https://code.visualstudio.com/) or install via `winget install Microsoft.VisualStudioCode`.

</details>

## S.1 Fork and Clone the Repository

> **GitHub EMU users:** If your organization uses a [GitHub Enterprise Managed Users (EMU)](https://docs.github.com/en/enterprise-cloud@latest/admin/identity-and-access-management/understanding-iam-for-enterprises/about-enterprise-managed-users) license and you **cannot fork** external repositories, skip to **[S.1b](#s1b-clone-into-your-own-namespace-github-emu-users)** below.

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

```shell
dotnet build ContosoUniversity.sln
```

You should see something similar to:
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

6. _(Optional)_ Run the application:

```shell
dotnet run --project ContosoUniversity.Web
```

The app starts at **https://localhost:52379** (or http://localhost:52380). On first run, the database is automatically created and seeded with sample data.

> **Note:** The Development configuration uses SQLite, which works on all platforms (Windows, macOS, Linux). The database file (`ContosoUniversity.db`) is created automatically. Production uses SQL Server.

Press `Ctrl+C` to stop the application.

## S.1b Clone into Your Own Namespace (GitHub EMU Users)

> **Who is this for?** If your organization uses a [GitHub Enterprise Managed Users (EMU)](https://docs.github.com/en/enterprise-cloud@latest/admin/identity-and-access-management/understanding-iam-for-enterprises/about-enterprise-managed-users) license, you **cannot fork** repositories that live outside your enterprise. Follow the steps below to create a copy of this repository in your own GitHub namespace instead.

🌐 **On GitHub:**

1. Navigate to [github.com/new](https://github.com/new) to create a new repository
2. Set the **Owner** to your EMU account (e.g., `YOUR-USERNAME_ENTERPRISE`)
3. Name the repository `day-in-the-life-copilot-lab`
4. Set visibility to **Private** (or Internal, per your organization's policy)
5. **Do not** initialize the repository with a README, `.gitignore`, or license
6. Click **Create repository**
7. After you have pushed the lab content from your local clone to this repository (see the **On your machine** steps below), go to your repository's **Settings** → **Actions** → **General** and ensure Actions are enabled, then go to the **Actions** tab and click _"I understand my workflows, go ahead and enable them"_ if prompted

🖥️ **On your machine:**

1. Clone the source repository:

**WSL/Bash:**
```bash
git clone https://github.com/YOUR-ORG/day-in-the-life-copilot-lab.git
cd day-in-the-life-copilot-lab
```

**PowerShell:**
```powershell
git clone https://github.com/YOUR-ORG/day-in-the-life-copilot-lab.git
Set-Location day-in-the-life-copilot-lab
```

2. Change the remote `origin` to point to **your** new repository:

**WSL/Bash:**
```bash
git remote set-url origin https://github.com/YOUR-USERNAME_ENTERPRISE/day-in-the-life-copilot-lab.git
```

**PowerShell:**
```powershell
git remote set-url origin https://github.com/YOUR-USERNAME_ENTERPRISE/day-in-the-life-copilot-lab.git
```

3. Push all branches and tags to your new repository:

**WSL/Bash:**
```bash
git push --all origin
git push --tags origin
```

**PowerShell:**
```powershell
git push --all origin
git push --tags origin
```

4. Verify the .NET project builds:

```shell
dotnet build ContosoUniversity.sln
```

You should see something similar to:
```
Build succeeded.
    0 Warning(s)
    0 Error(s)
```

5. _(Optional)_ Run the application:

```shell
dotnet run --project ContosoUniversity.Web
```

The app starts at **https://localhost:52379** (or http://localhost:52380). Press `Ctrl+C` to stop.

> **Tip:** If you want to keep your copy in sync with the original source repository, you can add it as an `upstream` remote:
>
> ```shell
> git remote add upstream https://github.com/YOUR-ORG/day-in-the-life-copilot-lab.git
> git fetch upstream
> git merge upstream/main
> ```

Once complete, continue with **S.2** below. The remaining labs work identically whether you forked or cloned.

---

## S.2 Verify Copilot CLI

🖥️ **On your machine:**

1. Verify Copilot CLI is installed:

```shell
copilot --version
```

2. Authenticate the Copilot CLI:

```shell
copilot login
```

> **Note:** The Copilot CLI has its own authentication — it does **not** use `gh auth`. Running `copilot login` opens a browser-based device code flow. Alternatively, you can set a `GH_TOKEN` environment variable with a fine-grained PAT that has the **Copilot Requests** permission.

3. Verify Copilot CLI is authenticated by sending a test prompt:

```shell
copilot -p "hello"
```

If authenticated, you'll receive a response. If not, the CLI will prompt you to log in.

4. Verify Agentic Workflows CLI is installed:

```shell
gh aw version
```

> **Note:** The `gh aw` extension relies on `gh auth` for GitHub API access (via the GitHub CLI). Run `gh auth status` if you need to verify your GitHub CLI authentication separately.

## S.3 Explore the Repository Structure

🖥️ **On your machine:**

1. Open the repository in VS Code:

```shell
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
- A building .NET project (ContosoUniversity) — optionally verified running at https://localhost:52379
- Copilot CLI authenticated and gh-aw CLI installed
- An understanding of the repository structure

## Opening: The Art of the Possible (for presenter)

*Optional:* Before Lab 01, the session opens with a **1-minute video** showing the session broker — a multi-agent coordination platform built entirely with the building blocks covered in these labs:

- **Terminal 1 (Orchestrator):** Receives a feature request, decomposes it into tasks, assigns work to team members via MCP tools
- **Terminal 2 (Dev Agent):** Picks up the implementation task, declares file intents, writes code, signals completion through the broker
- **Terminal 3 (QA Agent):** Detects implementation is done via broker events, writes tests, runs them, reports results
- **Terminal 4 (Reviewer):** Automatically reviews the changes, posts findings back through the broker

**Framing (2 minutes):**

> *"What you just saw was 4 AI agents collaborating on a real feature — coordinated through a custom MCP server we built using exactly the building blocks you're about to learn. Agents, skills, hooks, MCP servers, instructions — those are the primitives. Your job as a developer is changing: from writing every line yourself to orchestrating AI agents that work together. We've slowed things down in this lab to give you the building blocks. By the end, you'll have the full map."*
>
> *"I'll be moving through the labs quickly at the front. You're encouraged to follow along, but you can also go at your own pace — these lab docs are self-contained with reference links. Some of you will fly through the early labs; others will want to spend more time exploring. Both are fine."*

**Next:** [Lab 01 — Exploring Copilot Configuration](lab01.md)
