# 8 — GitHub Agentic Workflows: PRD Generation

In this lab you will explore how GitHub Agentic Workflows (gh-aw) automate document generation. You'll examine a workflow that generates a Product Requirements Document (PRD) when a feature branch is created.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 15 minutes

> 🎤 **Presenter prep:** Before the session, create the `feature/add-course-prerequisites` branch in your fork so the Actions run is already complete when you present. This avoids the 1-3 minute wait during the live demo.

> 💡 **Enterprise context:** Everything up to now has been local — your agents, skills, hooks, and MCP servers on your dev machine. This lab crosses into the **platform layer**. GitHub Agentic Workflows run in GitHub Actions — they're CI/CD pipelines where the runner is an AI agent. This is where the GitHub ecosystem extends beyond your local station: PRD generation, code review, deployment automation, all triggered by standard GitHub events and governed by enterprise policies. Most of this is out-of-the-box.

References:
- [GitHub Agentic Workflows](https://github.com/github/gh-aw)
- [Workflow structure](https://github.github.io/gh-aw/reference/workflow-structure/)
- [Frontmatter reference](https://github.github.io/gh-aw/reference/frontmatter/)

## 8.1 Understand gh-aw Workflow Format

GitHub Agentic Workflows are a new way to define AI-powered automation in GitHub Actions. Unlike traditional YAML workflows, gh-aw workflows are **Markdown files with YAML frontmatter**.

The format has two parts:

1. **YAML frontmatter** — defines triggers, permissions, tools, and runtimes (the "how")
2. **Markdown body** — contains the AI agent's instructions (the "what")

```
---
on: ...          # GitHub event triggers
permissions: ... # GitHub token permissions
tools: ...       # Tools the agent can use
runtimes: ...    # Language runtimes available
strict: ...      # Whether to enforce safe-outputs
safe-outputs: ...# Allowed mutation actions
description: ... # Human-readable description
---

## Agent Instructions

Markdown instructions that tell the AI agent what to do
when the workflow triggers.
```

> 💡 **Key insight:** The Markdown body is an AI prompt, not a script. The agent reasons about what to do based on these instructions — it doesn't execute them line by line.

## 8.2 Examine the PRD Workflow

This repository includes a workflow that generates a PRD when you create a `feature/**` or `story/**` branch.

🖥️ **In your terminal:**

1. Read the workflow file:
```bash
cat .github/workflows/generate-prd.md
```

2. Let's break down each frontmatter field:

| Field | Value | Purpose |
|-------|-------|---------|
| `on.create.branches` | `feature/**`, `story/**` | Triggers on branch creation matching these patterns |
| `permissions.contents` | `write` | Agent can create/modify files in the repo |
| `permissions.issues` | `read` | Agent can read issues for context |
| `tools.github.toolsets` | `[repos, issues]` | GitHub API tools: read repo contents and issues |
| `tools.edit` | (enabled) | Agent can create and edit files |
| `tools.bash` | `["dotnet"]` | Agent can run bash commands with dotnet available |
| `runtimes.dotnet` | `8.0` | .NET 8 SDK installed in the runner |
| `strict` | `false` | Agent can perform any output action |
| `description` | (text) | Shown in the GitHub Actions UI |

3. Now read the Markdown body — the agent instructions:
```bash
# Show only the Markdown body (after the second ---)
sed -n '/^---$/,/^---$/d;p' .github/workflows/generate-prd.md
```

The agent is instructed to:
- Extract the feature description from the branch name
- Analyze the ContosoUniversity codebase
- Generate a PRD at `docs/prd/PRD-{branch-name}.md`
- Include sections: overview, user stories, acceptance criteria, technical considerations, testing requirements, out of scope, dependencies

> 💡 **Why `tools.bash: ["dotnet"]`?** The agent might need to inspect the project structure with `dotnet sln list` or check the build. Only explicitly listed tools are available.

## 8.3 Compile the Workflow (Optional)

gh-aw workflows in `.md` format need to be compiled to `.lock.yml` files for GitHub Actions to run them. This is done with the `gh aw` CLI extension.

🖥️ **In your terminal:**

1. Check if the gh-aw CLI is available:
```bash
gh aw --help 2>/dev/null && echo "gh-aw is installed" || echo "gh-aw not available — skip this section"
```

2. If `gh aw` is installed, compile the workflow:
```bash
gh aw compile .github/workflows/generate-prd.md
```

This generates `.github/workflows/generate-prd.lock.yml` — a standard GitHub Actions YAML file that:
- Sets up the runner and runtimes
- Installs the AI agent toolchain
- Passes your Markdown instructions to the agent
- Manages tool access and permissions

3. If `gh aw` is not available, that's fine — examine what the compiled output would look like:

```yaml
# Compiled output structure (simplified):
name: Generate PRD for Feature Branch
on:
  create:
    branches: ['feature/**', 'story/**']
permissions:
  contents: write
  issues: read
jobs:
  agent:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0'
      - uses: github/agentic-workflow-action@v1
        with:
          instructions: |
            [Your Markdown body here]
          tools: repos,issues,edit,bash
```

> 💡 **Lock files:** The `.lock.yml` is committed alongside the `.md` file. GitHub Actions reads the lock file; the `.md` file is the human-readable source. Think of it like `package.json` → `package-lock.json`.

## 8.4 Create a Feature Branch

Let's trigger the workflow by creating a feature branch.

🌐 **On GitHub:**

1. Navigate to your forked repository on GitHub
2. Click the branch dropdown on the repo's main code page
3. Type `feature/add-course-prerequisites` in the branch name field
4. Click **Create branch: feature/add-course-prerequisites from lab/everything-copilot**

Alternatively, 🖥️ **from your terminal:**

```bash
git push origin lab/everything-copilot:feature/add-course-prerequisites
```

5. Go to the **Actions** tab in your repository
6. You should see a workflow run triggered by the branch creation
7. Click on the run to watch the agent work in real time

> ⏱️ The agent run typically takes 1-3 minutes. It reads the codebase, reasons about the feature, and generates the PRD.

## 8.5 Review the Generated PRD

After the workflow completes:

🌐 **On GitHub:**

1. Navigate to `docs/prd/` in the `feature/add-course-prerequisites` branch
2. Open the generated PRD file
3. Review the content — the agent should have:

| Section | What to Look For |
|---------|-----------------|
| **Feature Overview** | Description derived from "add-course-prerequisites" |
| **User Stories** | Stories about managing course prerequisites |
| **Acceptance Criteria** | Measurable criteria for each story |
| **Technical Considerations** | References to Core, Infrastructure, Web projects |
| **Testing Requirements** | xUnit, WebApplicationFactory, Playwright |
| **Out of Scope** | Clear boundaries on what's NOT included |

4. Notice how the agent used domain knowledge from the ContosoUniversity codebase:
   - Referenced specific models (Course, Student, Enrollment)
   - Identified affected projects (Core for entities, Infrastructure for EF migrations)
   - Suggested appropriate testing patterns

> 💡 **Real-world use:** In production, this workflow replaces the manual PRD writing step. Teams create a branch, and the AI agent generates a first-draft PRD that the PM reviews and refines.

## 8.6 Key Frontmatter Fields

Before moving on, let's solidify the frontmatter concepts:

| Field | Required | Purpose |
|-------|----------|---------|
| `on` | Yes | GitHub event triggers (same syntax as Actions) |
| `permissions` | Yes | GitHub token scopes |
| `tools` | Yes | What the agent can do: `github`, `edit`, `bash`, `web` |
| `runtimes` | No | Language runtimes to install (`dotnet`, `node`, `python`) |
| `strict` | No | If `true`, only `safe-outputs` actions are allowed |
| `safe-outputs` | No | Named output actions the agent can perform |
| `description` | No | Shown in the Actions UI |

## 8.7 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **File format** | Markdown (`.md`) with YAML frontmatter in `.github/workflows/` |
| **Two parts** | Frontmatter = config + body = AI prompt |
| **Compilation** | `gh aw compile` generates `.lock.yml` for Actions |
| **Triggers** | Same `on:` syntax as GitHub Actions |
| **Tools** | `github` (API), `edit` (files), `bash` (commands), `web` (search) |
| **Runtimes** | Optional: `dotnet`, `node`, `python` installed on the runner |
| **This workflow** | Triggers on `feature/**` or `story/**` branch creation |

**What makes gh-aw different from traditional Actions:**

| Traditional Actions | Agentic Workflows |
|-------------------|--------------------|
| YAML steps executed sequentially | Markdown prompt interpreted by AI |
| Deterministic — same input, same output | Non-deterministic — AI reasons about the task |
| Must specify every command | Agent decides which tools to use |
| Fails on unexpected input | Adapts to context |
| `.yml` files | `.md` files compiled to `.lock.yml` |

**The enterprise picture:** gh-aw workflows run in GitHub Actions with full enterprise governance — permissions, audit logs, environment protections, OIDC for cloud deployments. Your local agents handle the dev loop; gh-aw handles the platform automation. Together they cover the full software lifecycle.

</details>

<details>
<summary>Solution: generate-prd.md</summary>

See [`solutions/lab08-gh-aw-prd/generate-prd.md`](../solutions/lab08-gh-aw-prd/generate-prd.md)

</details>

**Next:** [Lab 09 — Copilot Code Review](lab09.md)
