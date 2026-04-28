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

**WSL/Bash:**
```bash
cat .github/workflows/generate-prd.md
```

**PowerShell:**
```powershell
Get-Content .github/workflows/generate-prd.md
```

2. Let's break down each frontmatter field:

| Field | Value | Purpose |
|-------|-------|---------|
| `on.create` | (no filter) | Triggers on any branch or tag creation |
| `if` | `startsWith(...)` | Only runs for `feature/**` and `story/**` branches |
| `permissions.contents` | `read` | Agent can read files in the repo |
| `permissions.issues` | `read` | Agent can read issues for context |
| `tools.github.toolsets` | `[repos, issues]` | GitHub API tools: read repo contents and issues |
| `tools.edit` | (enabled) | Agent can create and edit files |
| `tools.bash` | `["dotnet", "mkdir"]` | Agent can run bash commands with dotnet and mkdir available |
| `runtimes.dotnet` | `8.0` | .NET 8 SDK installed in the runner |
| `safe-outputs.create-pull-request` | (configured) | Agent creates a PR with the generated PRD |
| `description` | (text) | Shown in the GitHub Actions UI |

> 💡 The `create` event fires on any branch or tag creation, but the `if:` condition filters to only `feature/**` and `story/**` branches. Other branch names like `bugfix/` will skip the workflow.

3. Now read the Markdown body — the agent instructions:

**WSL/Bash:**
```bash
# Show only the Markdown body (after the second ---)
sed -n '/^---$/,/^---$/d;p' .github/workflows/generate-prd.md
```

**PowerShell:**
```powershell
# Show only the Markdown body (after the second ---)
$content = Get-Content .github/workflows/generate-prd.md -Raw
if ($content -match '(?s)^---.*?---\s*(.*)') { $matches[1] }
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

**WSL/Bash:**
```bash
gh aw --help 2>/dev/null && echo "gh-aw is installed" || echo "gh-aw not available — skip this section"
```

**PowerShell:**
```powershell
try { gh aw --help 2>$null; if ($?) { "gh-aw is installed" } else { "gh-aw not available — skip this section" } } catch { "gh-aw not available — skip this section" }
```

2. If `gh aw` is installed, compile the workflow:

```shell
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
permissions:
  contents: read
  issues: read
jobs:
  agent:
    if: startsWith(github.ref, 'refs/heads/feature/') || startsWith(github.ref, 'refs/heads/story/')
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

> ⚠️ **Why this works without compiling:** This repository ships with `generate-prd.lock.yml` already committed on `main`. For `create` events (branch/tag creation), GitHub Actions looks for workflow files **on the default branch**, not the branch being created. Since the lock file is already on `main`, creating a `feature/**` branch triggers the workflow immediately. If you were writing a *new* gh-aw workflow from scratch, you'd need to compile it and merge the `.lock.yml` to your default branch before the `create` trigger would fire.

## 8.4 Configure the `COPILOT_GITHUB_TOKEN` Secret

gh-aw workflows use the Copilot CLI as their AI engine. To authenticate, you need a **fine-grained Personal Access Token (PAT)** stored as a repository secret.

> ⚠️ **Security note — PATs in production.** GitHub [recommends GitHub Apps over PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#keeping-your-personal-access-tokens-secure) for production CI/CD workflows because Apps use short-lived, auto-revoked tokens scoped to specific installations. However, **gh-aw currently requires a PAT for Copilot engine authentication** — GitHub App auth is supported for other gh-aw operations (tool access, safe outputs) but [not yet for `COPILOT_GITHUB_TOKEN`](https://github.github.io/gh-aw/reference/auth/#using-a-github-app-for-authentication). We use a fine-grained PAT in this workshop for convenience. For production deployments, follow the best practices below and monitor gh-aw releases for GitHub App support.

### Create the PAT

🌐 **On GitHub:**

1. Go to [**Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**](https://github.com/settings/personal-access-tokens/new)
2. Give it a name (e.g., `gh-aw-copilot-workshop`)
3. Set a **short expiration** (e.g., 7 days — enough for the workshop)
4. Under **Repository access**, select **Public repositories** (required for the Copilot Requests permission to appear — this works for private repos too)
5. Click **Permissions** → **Account permissions** → find **Copilot Requests** → set to **Read**
6. Click **Generate token** and copy the value

### Add the secret to your repository

🖥️ **In your terminal** (fastest):

```bash
gh aw secrets set COPILOT_GITHUB_TOKEN --value "<your-token>"
```

Or 🌐 **on GitHub:**

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `COPILOT_GITHUB_TOKEN`
4. Value: paste your PAT
5. Click **Add secret**

> 💡 **Why a PAT?** The `COPILOT_GITHUB_TOKEN` authenticates the Copilot CLI agent running inside GitHub Actions. The token owner's account must have an active Copilot license. See [gh-aw authentication docs](https://github.github.io/gh-aw/reference/auth/#copilot_github_token) for details.

> ⚠️ **Organization-owned repos:** If your repository belongs to an organization, ensure the PAT has access to the repository. Go to **Organization settings** → **Personal access tokens** → **Pending requests** to approve if needed.

### Allow workflows to create pull requests

The gh-aw safe-outputs pipeline creates PRs using the `GITHUB_TOKEN`. By default, GitHub blocks this — you need to opt in.

🌐 **On GitHub:**

1. Go to your repository → **Settings** → **Actions** → **General**
2. Scroll down to **Workflow permissions**
3. Check ✅ **"Allow GitHub Actions to create and approve pull requests"**
4. Click **Save**

> 💡 **Why is this off by default?** This is a security guardrail — it prevents workflows from creating PRs that could bypass branch protection rules. For this workshop it's safe to enable. In production, gh-aw's safe-outputs architecture provides additional protection: the agent runs read-only, and the PR creation happens in a separate, auditable job.

> ⚠️ **Setting greyed out?** If the checkbox is disabled, this is controlled at the **organization level** and requires an org admin to change it. Go to `github.com/organizations/<YOUR-ORG>/settings/actions` → **Workflow permissions** → enable **"Allow GitHub Actions to create and approve pull requests"**. If you can't reach an org admin, don't worry — the workflow still runs successfully and the agent generates the PRD. It just can't auto-create the PR. You'll create it manually instead:
>
> ```bash
> # The safe-outputs branch name is in the Actions run log (Safe Output Handler step)
> gh pr create \
>   --base <your-feature-branch> \
>   --head <your-feature-branch>-<hash> \
>   --title "[prd] docs: Add PRD for feature" \
>   --body "PRD generated by gh-aw workflow."
> ```

**For production deployments**, the recommended approach is to use a **GitHub App** with scoped `pull-requests: write` permission in your workflow's [`safe-outputs.app:`](https://github.github.io/gh-aw/reference/auth/#using-a-github-app-for-authentication) block. This avoids the org-level toggle entirely, gives you short-lived tokens with per-repo scoping, and removes the dependency on org-wide settings.

### Security best practices for PATs

Even though gh-aw requires a PAT for now, you can minimize risk:

| Practice | Why |
|----------|-----|
| **Use fine-grained PATs** (not classic) | Scoped to specific permissions — only `Copilot Requests: Read` is needed |
| **Set short expiration** | Limit the blast radius if the token leaks; rotate after workshops |
| **Store as GitHub Actions secret** | Encrypted at rest, masked in logs, never exposed in workflow output |
| **One token per repository** | Don't reuse tokens across repos; revoke when no longer needed |
| **Revoke after the workshop** | Go to [**Settings** → **Developer settings** → **Fine-grained tokens**](https://github.com/settings/tokens?type=beta) and delete it |

gh-aw also provides **defense-in-depth mitigations** even when using a PAT:
- The agent runs with **read-only permissions** — writes go through the [safe-outputs](https://github.github.io/gh-aw/reference/safe-outputs/) pipeline
- An **API proxy** holds the auth token outside the agent container, preventing exfiltration via prompt injection
- **Secret redaction** automatically strips tokens from agent output
- A **network firewall** restricts agent egress to an explicit domain allowlist
- **Output sanitization** scans for leaked secrets before any write action executes

## 8.5 Set Up Your Issue Backlog

In a real development workflow, features come from **issues** — not thin air. This repository includes issue form templates and sample stories so you can practice the full issue → branch → PRD pipeline.

> 💡 **Why Issues?** The PRD workflow reads linked issues for richer context. When you create a branch from an issue, the generated PRD includes the issue's user stories, acceptance criteria, and description — not just the branch name.

### Enable Issues on Your Fork

If you forked this repository, Issues may be disabled by default.

🌐 **On GitHub:**

1. Navigate to your fork's **Settings** tab
2. Scroll down to the **Features** section  
3. Check the **Issues** checkbox to enable it
4. The **Issues** tab now appears in your repository navigation

### Seed Your Backlog

Choose one of these approaches to add feature stories to your Issues:

**Option A — Use the GitHub CLI (fastest):**

```bash
# Run all 4 commands from docs/sample-issues.md
# Or create a single issue to start:
gh issue create \
  --title "[Feature]: Add Course Prerequisites" \
  --body "$(cat << 'EOF'
## Feature Description
Allow courses to define prerequisite courses that students must complete before enrolling.

## User Stories
- As an **administrator**, I want to define prerequisite courses for any course
- As a **student**, I want to see prerequisite courses on the course detail page
- As the **enrollment system**, I want to validate prerequisites before enrollment

## Acceptance Criteria
- [ ] Administrators can add prerequisites through the course edit page
- [ ] Course detail page displays prerequisite courses
- [ ] Enrollment blocked when prerequisites not met
EOF
)" \
  --label "feature,story"
```

**Option B — Copy/paste from sample issues:**

1. Open [`docs/sample-issues.md`](../docs/sample-issues.md) for 4 ready-to-use stories
2. Go to your fork's **Issues** tab → **New Issue** → select **🚀 Feature Story**
3. Copy/paste the title and fields from the sample doc

> 💡 The issue form template guides you with a Domain Area dropdown, structured fields, and branch naming instructions.

### Pick Up a Story

1. Go to the **Issues** tab in your fork
2. Find a feature story (e.g., "Add Course Prerequisites")
3. **Assign it to yourself** by clicking "Assignees" on the right sidebar
4. This is your story — you'll create a branch for it in the next section

## 8.6 Create a Feature Branch

Now create a branch from your assigned issue to trigger the PRD workflow.

🌐 **On GitHub (from your issue):**

1. Open your assigned issue (e.g., "[Feature]: Add Course Prerequisites")
2. In the right sidebar, click **"Create a branch"** under "Development"
3. **Important:** Change the branch name to start with `feature/`:
   - Default: `1-feature-add-course-prerequisites`
   - Change to: `feature/add-course-prerequisites`
4. Select **"Checkout locally"** or **"Open in GitHub Desktop"** based on your preference
5. Click **Create branch**

Alternatively, 🖥️ **from your terminal:**

**WSL/Bash:**
```bash
git push origin main:feature/add-course-prerequisites
```

**PowerShell:**
```powershell
git push origin lab/day-in-the-life-copilot-lab:feature/add-course-prerequisites
```
6. Go to the **Actions** tab in your repository
7. You should see a workflow run triggered by the branch creation
8. Click on the run to watch the agent work in real time

> ⏱️ The agent run typically takes 1-3 minutes. It reads the codebase, finds the linked issue, and generates the PRD with enriched context from your issue's user stories and acceptance criteria.

## 8.7 Review the Generated PRD

After the workflow completes, the agent creates a **pull request** containing the PRD file.

🌐 **On GitHub:**

1. Go to the **Pull Requests** tab in your repository
2. Look for a PR with the `[prd]` prefix and the `prd`, `ai-generated` labels
3. Open the PR and review the generated PRD in `docs/prd/` — the agent should have:

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

> 💡 **Expected content:** A pull request containing a structured PRD with sections for Feature Overview, User Stories, Acceptance Criteria, Technical Considerations, and Dependencies. If the PR was not created or the PRD is empty, the workflow may have timed out.

> 💡 **Real-world use:** In production, this workflow replaces the manual PRD writing step. Teams create a branch, and the AI agent generates a first-draft PRD that the PM reviews and refines.

## 8.8 Key Frontmatter Fields

Before moving on, let's solidify the frontmatter concepts:

| Field | Required | Purpose |
|-------|----------|---------|
| `on` | Yes | GitHub event triggers (same syntax as Actions) |
| `permissions` | Yes | GitHub token scopes (use read-only with `safe-outputs`) |
| `tools` | Yes | What the agent can do: `github`, `edit`, `bash`, `web` |
| `runtimes` | No | Language runtimes to install (`dotnet`, `node`, `python`) |
| `safe-outputs` | No | Named output actions the agent can perform (e.g., `create-pull-request`) |
| `description` | No | Shown in the Actions UI |

## 8.9 Final

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
| **This workflow** | Triggers on `feature/**` or `story/**` branch creation, creates a PR with the PRD |

**What makes gh-aw different from traditional Actions:**

| Traditional Actions | Agentic Workflows |
|-------------------|--------------------|
| YAML steps executed sequentially | Markdown prompt interpreted by AI |
| Deterministic — same input, same output | Non-deterministic — AI reasons about the task |
| Must specify every command | Agent decides which tools to use |
| Fails on unexpected input | Adapts to context |
| `.yml` files | `.md` files compiled to `.lock.yml` |

**The enterprise picture:** gh-aw workflows run in GitHub Actions with full enterprise governance — permissions, audit logs, environment protections, OIDC for cloud deployments. The `safe-outputs` pattern enforces least-privilege by running agents with read-only permissions while explicitly declaring allowed mutations (like creating a PR). Your local agents handle the dev loop; gh-aw handles the platform automation. Together they cover the full software lifecycle.

</details>

<details>
<summary>Solution: generate-prd.md</summary>

See [`solutions/lab08-gh-aw-prd/generate-prd.md`](../solutions/lab08-gh-aw-prd/generate-prd.md)

</details>

**Next:** [Lab 09 — Copilot Code Review](lab09.md)
