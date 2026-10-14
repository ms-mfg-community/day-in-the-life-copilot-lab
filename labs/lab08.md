---
title: "GitHub Agentic Workflows: PRD Generation"
lab_number: 8
pace:
  presenter_minutes: 5
  self_paced_minutes: 75
registry: docs/_meta/registry.yaml
---

# 8 — GitHub Agentic Workflows: PRD Generation

In this lab you will explore how GitHub Agentic Workflows (gh-aw) automate document generation. You'll examine a workflow that generates a Product Requirements Document (PRD) when a feature branch is created.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 75 minutes

**Prerequisite:** finish [Lab 02](lab02.md) first, and work in a **fork you own** with GitHub Actions enabled (a new fork starts with workflows switched off — enable them from the fork's **Actions** tab). §8.4–§8.6 write to GitHub — a repository secret, an Actions setting, issues, a branch and a pull request — and you typically won't have permission to do that on the upstream repository.

> 🎤 **Presenter prep:** Before the session, create the `feature/add-course-prerequisites` branch in your fork — with the issue's **Create a branch** button (§8.6), so the branch is linked to the issue — so the Actions run is already complete when you present. This avoids the 1-3 minute wait during the live demo.

> 💡 **Enterprise context:** Everything up to now has been local — your agents, skills, hooks, and MCP servers on your dev machine. This lab crosses into the **platform layer**. GitHub Agentic Workflows run in GitHub Actions — they're CI/CD pipelines where the runner is an AI agent. This is where the GitHub ecosystem extends beyond your local station: PRD generation, code review, deployment automation, all triggered by standard GitHub events and governed by enterprise policies. Most of this is out-of-the-box.

References:
- [GitHub Agentic Workflows](https://github.com/github/gh-aw)
- [Workflow structure](https://github.github.io/gh-aw/reference/workflow-structure/)
- [Frontmatter reference](https://github.github.io/gh-aw/reference/frontmatter/)

## 8.0 Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (confirmed GA, ~Aug 2026):** `/plugin`, `/mcp`, and
> `/skills` are real interactive commands backed by an in-terminal dashboard —
> you can discover, install, and configure plugins, MCP servers, and skills
> without hand-editing config files. The terminal also gained tabs for
> browsing issues/PRs/gists. Config-file editing still works and is what the
> underlying `extensions_manage` MCP tool inspects, but the dashboard is now
> the primary interactive path for a human at the prompt.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` (or the `/plugin` dashboard) | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `Shift+Tab` toggles plan mode; autopilot mode is the default | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to toggle plan/autopilot modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

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

> 🧭 **The big picture — read this first.** You write and edit the **`.md`** file: YAML frontmatter (the settings) plus the instructions you are about to read. `gh aw compile` turns it into a **`.lock.yml`** file, which is an ordinary GitHub Actions workflow. **GitHub Actions runs the `.lock.yml`** — that is the workflow GitHub actually sees, and it is what passes your instructions to the agent. This repository commits both files, so the lab works without compiling anything. §8.3 shows you the lock file and what to look for in it.

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

> 💡 The `create` event fires on any branch or tag creation, but the `if:` condition filters to only `feature/**` and `story/**` branches. Other branch names like `bugfix/` will skip the workflow. (§8.3 shows where the compiler puts this condition in the lock file.)

3. Now read the Markdown body — the agent instructions:

**WSL/Bash:**
```bash
# Show only the Markdown body (after the second ---)
# The \r? also lets this work on a Windows (CRLF) checkout, such as a clone under /mnt/c in WSL
awk '/^---\r?$/{n++; next} n>=2' .github/workflows/generate-prd.md
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

> 🔐 **Least-privilege reminder.** Always declare `permissions:` explicitly (don't rely on the repo default) and start from `contents: read`, adding only what the agent provably needs. This workflow's agent has just `contents: read` and `issues: read`, so it cannot comment on an issue or open a pull request itself. It asks for those actions through `safe-outputs`, and a separate job that the compiler adds carries them out with the write permissions (§8.3 shows it).

> 💡 **Why `tools.bash: ["dotnet"]`?** The agent might need to inspect the project structure with `dotnet sln list` or check the build. Only explicitly listed tools are available.

<details>
<summary>Optional reference — auditing a run, and adding MCP servers</summary>

**Auditing a run.** `gh aw audit` is a post-run tool: it takes an Actions run ID or run URL and inspects that run's logs and artifacts. It does not accept a workflow `.md` file. To see what each compiled job is allowed to do before anything runs, read its `permissions:` block in the `.lock.yml` (§8.3).

**MCP servers and tool allowlists.** Custom MCP servers are not configured under `tools:`. Declare each one in a top-level `mcp-servers:` block, and use `mcp-servers.<server>.allowed` to filter which of that server's tools the agent can call — list the bare tool names (for example `microsoft_docs_search`), or use `["*"]` to allow every tool on the server. See the [gh-aw MCP guide](https://github.github.io/gh-aw/guides/mcps/). `.github/workflows/weekly-content-audit.md` in this repo shows the block with two servers (it lists them but doesn't set `allowed`).

</details>

## 8.3 Compile the Workflow (Optional)

gh-aw workflows in `.md` format need to be compiled to `.lock.yml` files for GitHub Actions to run them. This is done with the `gh aw` CLI extension.

**Compiling is optional; reading the committed lock file is not.** Steps 1–3 check your tooling and compile. Step 4 shows the lock file that GitHub Actions actually runs, and it applies to everyone — whether or not `gh aw` is installed, and whether or not you compile anything.

🖥️ **In your terminal:**

1. Check if the gh-aw CLI is available:

**WSL/Bash:**
```bash
gh aw --help 2>/dev/null && echo "gh-aw is installed" || echo "gh-aw not available - skip steps 2-3 and read step 4"
```

**PowerShell:**
```powershell
try { gh aw --help 2>$null; if ($?) { "gh-aw is installed" } else { "gh-aw not available - skip steps 2-3 and read step 4" } } catch { "gh-aw not available - skip steps 2-3 and read step 4" }
```

2. Check that your `gh aw` version matches the one the committed lock files were built with. The repository records that version as `gh_aw_schema_version` in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml), and recompiling with a different version rewrites the committed `.lock.yml` files:

**WSL/Bash:**
```bash
grep '^gh_aw_schema_version:' docs/_meta/registry.yaml
gh aw version
```

**PowerShell:**
```powershell
Select-String -Pattern '^gh_aw_schema_version:' -Path docs/_meta/registry.yaml
gh aw version
```

The registry shows the number without a leading `v` (`gh aw version` prints it with one); the two should otherwise match. If they differ, install the registry's version — these lines read it from the registry instead of hardcoding it:

**WSL/Bash:**
```bash
v=$(grep '^gh_aw_schema_version:' docs/_meta/registry.yaml | grep -o '[0-9][0-9.]*[0-9]')
gh extension install github/gh-aw --pin "v$v"
```

**PowerShell:**
```powershell
$v = (Select-String -Path docs/_meta/registry.yaml -Pattern '^gh_aw_schema_version:\s*"?([0-9][0-9.]*[0-9])').Matches[0].Groups[1].Value
gh extension install github/gh-aw --pin "v$v"
```

Then run `gh aw version` again to confirm. If the versions still differ, skip step 3 and read the committed lock file in step 4 instead — don't compile with a different version.

3. Optional: compile the workflow. This rewrites `.github/workflows/generate-prd.lock.yml` in your working tree, so skip it if you are only reading along (`git diff` shows what changed, and §8.10 shows how to revert it):

```shell
gh aw compile .github/workflows/generate-prd.md
```

This regenerates `.github/workflows/generate-prd.lock.yml` — a standard GitHub Actions YAML file that:
- Sets up the runner and runtimes
- Installs the AI agent toolchain
- Passes your Markdown instructions to the agent
- Manages tool access and permissions

4. **Read the committed lock file (required, whether or not you compiled).** This is the file GitHub Actions actually runs; the `.md` you read in §8.2 is its source. If `gh aw` is not available or you skipped step 3, nothing is lost — the compiled output is already committed as `.github/workflows/generate-prd.lock.yml`. Here is an abbreviated excerpt. `# ...` marks lines left out; every other line is copied from that file, except that the jobs are shown in the order they run (the file lists them alphabetically). The file on disk is the source of truth, and its pins change whenever it is recompiled:

```yaml
# ... (the committed file starts with a comment header)
name: "Generate Prd"
on:
  create:

permissions: {}

# ...

jobs:
  pre_activation:
    if: startsWith(github.ref, 'refs/heads/feature/') || startsWith(github.ref, 'refs/heads/story/')
    runs-on: ubuntu-slim
    # ...

  activation:
    needs: pre_activation
    if: >
      needs.pre_activation.outputs.activated == 'true' && (startsWith(github.ref, 'refs/heads/feature/') ||
      startsWith(github.ref, 'refs/heads/story/'))
    runs-on: ubuntu-slim
    # ...

  agent:
    needs: activation
    if: needs.activation.outputs.daily_ai_credits_exceeded != 'true'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
    # ...
    steps:
      - name: Setup Scripts
        id: setup
        uses: github/gh-aw-actions/setup@6aab9e5b5c91c615506061f09bedd81a23babe3c # v0.86.2
        # ...
      # ... (the "Set runtime paths" step is left out)
      - name: Checkout repository
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false
      - name: Setup .NET
        uses: actions/setup-dotnet@a98b56852c35b8e3190ac28c8c2271da59106c68 # v6.0.0
        with:
          dotnet-version: '8.0'
      # ...

  # ... (the conclusion and detection jobs are left out)

  safe_outputs:
    needs:
      - activation
      - agent
      - detection
    # ...
    runs-on: ubuntu-slim
    permissions:
      contents: write
      issues: write
      pull-requests: write
    # ...
```

What to notice:
- **One fence at the front.** The branch filter sits on `pre_activation` and `activation`, and the `agent` job declares `needs: activation`. On a non-matching branch such as `bugfix/`, the whole chain is skipped, with no per-step `if:` checks.
- **The agent's own `if:` is not a branch filter.** It is a daily-credit guard.
- **The agent only reads.** It holds `contents: read` and `issues: read`. The write permissions sit on later jobs the compiler adds (`safe_outputs`, which carries out the pull request, and the `conclusion` job left out above), never on the agent. Read each job's `permissions:` block to see what it gets.
- **Every action is pinned** to a full commit SHA, with its version in the trailing comment.

> 💡 **Lock files:** The `.lock.yml` is committed alongside the `.md` file. GitHub Actions reads the lock file; the `.md` file is the human-readable source. Think of it like `package.json` → `package-lock.json`.

> 🧪 **Catch frontmatter mistakes before you push.** After you change the frontmatter, recompile (step 3) and read the `git diff` of the `.lock.yml`: the guards, `permissions:` blocks and action pins you see there are what Actions will actually run. gh-aw's own `run` command can't exercise this workflow — it only works on workflows with a `workflow_dispatch` trigger, and this one has only `create`.

> ⚠️ **Why this works without compiling:** This repository ships with `generate-prd.lock.yml` already committed on `main`. For a `create` event (branch or tag creation), GitHub runs the workflow files from the ref being created — and a `feature/**` branch you create from `main` starts out as a copy of `main`, so it already contains the lock file. Creating the branch therefore triggers the workflow immediately. If you were writing a *new* gh-aw workflow from scratch, you'd compile it and commit the `.lock.yml` into the commit your new branch points to before the `create` trigger could fire.

## 8.4 Configure the `COPILOT_GITHUB_TOKEN` Secret

gh-aw workflows use the Copilot CLI as their AI engine, and the engine needs credentials. This repository's `generate-prd.md` authenticates it with a **fine-grained Personal Access Token (PAT)** stored as the `COPILOT_GITHUB_TOKEN` repository secret.

**Do this section — and the rest of the lab — in your fork.** Adding a secret, changing an Actions setting and pushing a branch are all writes to GitHub, and your fork is where you have permission to make them.

> ⚠️ **Security note — PATs in production.** GitHub [recommends GitHub Apps over PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#keeping-your-personal-access-tokens-secure) for production CI/CD workflows because Apps use short-lived, auto-revoked tokens scoped to specific installations. For the Copilot engine itself, the gh-aw [authentication reference](https://github.github.io/gh-aw/reference/auth/) recommends `permissions: copilot-requests: write` at the version this repository pins (§8.3): it uses the Actions token, needs no PAT, and requires an organization Copilot subscription with centralized billing. The alternative is `COPILOT_GITHUB_TOKEN`, which is a PAT, and GitHub App auth [does not cover that token](https://github.github.io/gh-aw/reference/auth/#using-a-github-app-for-authentication) — it does cover other gh-aw operations (tool access, safe outputs). This workflow doesn't declare `copilot-requests`, so the lab uses the PAT, and a fine-grained one for convenience. For production deployments, follow the best practices below and check the authentication reference for the route that fits your billing setup.

### Create the PAT

🌐 **On GitHub:**

1. Go to [**Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**](https://github.com/settings/personal-access-tokens/new)
2. Give it a name (e.g., `gh-aw-copilot-workshop`)
3. Set a **short expiration** (e.g., 7 days — enough for the workshop)
4. Under **Repository access**, select **Public repositories**
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

> 💡 **Why a PAT?** The `COPILOT_GITHUB_TOKEN` authenticates the Copilot CLI agent running inside GitHub Actions. The token owner's account must have an active Copilot license. This workflow takes the PAT route because it doesn't declare `permissions: copilot-requests`. See [gh-aw authentication docs](https://github.github.io/gh-aw/reference/auth/#copilot_github_token) for details.

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

**For production deployments**, the recommended approach is to use a **GitHub App** with scoped `pull-requests: write` permission in your workflow's [`safe-outputs.github-app:`](https://github.github.io/gh-aw/reference/auth/#using-a-github-app-for-authentication) block. This avoids the org-level toggle entirely, gives you short-lived tokens with per-repo scoping, and removes the dependency on org-wide settings.

### Security best practices for PATs

Because this lab's workflow authenticates with a PAT, you can minimize risk:

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

> 💡 **Why Issues?** The PRD workflow looks for an issue that is linked to, or matches, the branch and reads it for richer context. When you create the branch from the issue with **Create a branch** (§8.6), the issue is linked to the branch, and the generated PRD should draw on the issue's user stories, acceptance criteria, and description — not just the branch name. §8.7 shows how to check.

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

Now create a branch from your assigned issue to trigger the PRD workflow. Use the issue's own **Create a branch** button (steps 1–5): it is the route that links the branch to the issue, which then lists the branch under **Development**, and this lab's linked-issue demonstration depends on that link. A branch pushed from a terminal triggers the same workflow but is not linked to the issue (see the terminal alternative below).

🌐 **On GitHub (from your issue) — the route this lab expects:**

1. Open your assigned issue (e.g., "[Feature]: Add Course Prerequisites")
2. In the right sidebar, click **"Create a branch"** under "Development"
3. **Important:** Change the branch name to start with `feature/`:
   - Default: `1-feature-add-course-prerequisites`
   - Change to: `feature/add-course-prerequisites`
4. Select **"Checkout locally"** or **"Open in GitHub Desktop"** based on your preference
5. Click **Create branch**

**Terminal alternative — a branch-name-only demonstration.** If you can't use the button, you can create the branch from 🖥️ **your terminal** instead, in a clone of your fork so that `origin` is your fork and not the upstream repository. This fires the same workflow, but nothing links the branch to your issue: the agent starts from the branch name and the code, and picks up an issue only if its own keyword search happens to match one. Don't use this route to judge how well issue linking works. Choose one route, not both — the workflow triggers when the branch is created, and a branch can only be created once.

**WSL/Bash:**
```bash
git push origin main:feature/add-course-prerequisites
```

**PowerShell:**
```powershell
git push origin main:feature/add-course-prerequisites
```

Either way, 🌐 **on GitHub**, watch the run:

6. Go to the **Actions** tab in your repository
7. You should see a workflow run triggered by the branch creation
8. Click on the run to watch the agent work in real time

> ⏱️ The agent run typically takes 1-3 minutes. It reads the codebase and searches your issues for one that matches the branch. After the **Create a branch** button, expect a PRD that draws on your issue's user stories and acceptance criteria. After the terminal push, nothing links the issue, so the agent may or may not find it. §8.7 shows how to tell which one you got.

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

> 📖 **Terms in that table, in plain words** (you don't need to know them beforehand):
>
> - **Core** — `ContosoUniversity.Core`, the domain model: plain C# classes such as `Course`, `Student` and `Enrollment`.
> - **Infrastructure** — `ContosoUniversity.Infrastructure`, data access: the Entity Framework Core (**EF Core**) database context that saves Core's classes to the database.
> - **Web** — `ContosoUniversity.Web`, the ASP.NET Core site: the controllers and pages users see, such as the course edit page.
> - **Migration** — an EF Core script that changes the database schema when a model changes. This repository has no committed `Migrations` folder (it builds its database with `EnsureCreated()`), so a PRD that mentions a migration is proposing new work, not describing something that already exists.
> - **xUnit** and **WebApplicationFactory** — `ContosoUniversity.Tests` is written with xUnit, and WebApplicationFactory is the helper that starts the Web app in memory so a test can call it the way a browser would.
> - **Playwright** — `ContosoUniversity.PlaywrightTests` uses it to drive a real browser through the finished site.

4. **Check it against your issue (required).** A PRD can contain every heading in the table and still be generic, so compare it with something you control:
   - Under **Feature Overview**, find **Related Issues**. An issue number such as `#1` means the agent found your issue. `#N/A` means it wrote the PRD from the branch name and the code alone, which is likelier after the terminal push in §8.6 because nothing links that branch to your issue. Either result is fine to continue with; the point is to notice which one you got.
   - Put your issue's acceptance criteria beside the PRD's **Acceptance Criteria** section. There are three if you used §8.5 Option A (add prerequisites on the course edit page, show them on the course detail page, block enrollment until they are met) and five if you pasted the sample story. Mark each of yours as **covered**, **changed** or **missing** in the PRD, and note anything the PRD adds that your issue never asked for.
5. **Verify one reference (required).** Pick one model or project the PRD names, for example `Course`, and look it up in your fork. On the repository's **Code** tab, click **Go to file**, type `Course.cs`, and open the result under `ContosoUniversity.Core/Models/` (the full path is `dotnet/ContosoUniversity.Core/Models/Course.cs`). With a local clone, `git grep -n -w "class Course" -- dotnet` finds the same file. If you pick a project instead, such as `ContosoUniversity.Web`, look for its folder under `dotnet/`. A name the PRD presents as already existing that you cannot find was invented; a name it proposes as new, such as a prerequisite entity, should be labelled new.
6. **Optional — go deeper.** If you want more, ask whether the PRD puts each change in the right layer (entities in Core, database access in Infrastructure, pages in Web), whether the tests it proposes fit the test projects above, and whether it needs a migration at all. Nothing later in the lab depends on your answers.

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

## 8.10 Cleanup

> 🛠️ **Lab 08 specifics — revert before the generic sweep below.**
>
> If you ran `gh aw compile .github/workflows/generate-prd.md` in §8.3, gh-aw regenerated that one workflow's `.lock.yml`. (Run with no arguments, `gh aw compile` compiles every workflow source file in `.github/workflows/` and regenerates all of their `.lock.yml` siblings.) That's expected, but if your `git status` shows lock-file churn you didn't intend (e.g. timestamp-only drift, or a workflow you only opened to read), revert it with:
>
> ```bash
> git checkout -- '.github/workflows/*.lock.yml'
> ```
>
> Likewise, if §8.4–§8.6 created a feature branch on `origin`, an open PR, or a live PAT, revoke them now:
>
> - PAT: <https://github.com/settings/personal-access-tokens> → **Revoke**
> - PR + branch: `gh pr close <num> --delete-branch`
> - Repo secret: `gh secret delete COPILOT_GITHUB_TOKEN` — `gh aw secrets` can set a secret (§8.4) but has no delete subcommand, so removal goes through `gh secret`

<!-- The generic sweep below is intentionally lab-local. It was detached from
docs/_partials/cleanup.md because three of its commands misbehave when Lab 08
runs them: a listing of other labs' scratch paths and a git-config lookup
exit nonzero when their target is simply absent (one listed path sits inside
.git, which is a plain file in a git worktree), and the config-backup move
would copy any old config backup over the live config, which Lab 08 never
edited (a stale backup from an earlier lab or experiment is easy to have).
This copy keeps the git-config lookup, guarded, and turns the other two into
prose. Re-attach the shared partial only once it is corrected. -->
> 🧹 **Cleanup — leave the machine the way you found it.**
> Run this checklist before moving to the next lab. Per-lab specifics (named
> agent / hook / extension files this lab created) should already have been
> reverted in the steps above; this is the generic sweep that catches the
> long-tail.

🖥️ **In your terminal:**

1. **Stop background processes.** Anything you started in the foreground with
   `&` or in another tmux pane (dev servers, watchers, `gh aw` long-runs,
   tail-follows). If you used the bash tool in async mode, make sure those
   shells are stopped.

   **WSL/Bash:**
   ```bash
   jobs -l                       # any background jobs in this shell?
   # kill them by PID — never `pkill`/`killall`
   ```

   **PowerShell:**
   ```powershell
   Get-Job                       # any background jobs?
   Get-Job | Stop-Job; Get-Job | Remove-Job
   ```

2. **Leave the Copilot CLI config alone — Lab 08 did not change it.** Some
   labs edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json` and keep a backup so that their own cleanup
   can put the original back. Lab 08 edits none of them, so it has nothing
   to restore and this step runs no command. Do **not** move a
   `config.json.bak` you happen to find over `config.json` here: if it is
   left over from an earlier lab or an old experiment, that silently
   replaces your current settings with an older copy. If an earlier lab did
   leave one, that lab's cleanup is the place to restore it. Changes to
   workspace configs inside this repo show up in the `git status --short`
   check in step 6.

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** Other labs leave their own scratch
   behind: an agent-to-agent scratch folder and transcripts under `node/`, a
   lessons folder under `~/.copilot/`, and a summary file inside `.git/`.
   Lab 08 creates none of them, so this lab has nothing of theirs to
   inspect, and those labs' own cleanup sections cover them. What Lab 08
   itself leaves behind (possible lock-file churn on disk, and the token,
   secret, branch and pull request on GitHub) is covered in the Lab 08
   specifics above. Delete only what this lab created, and never
   blanket-delete a `~/.copilot/lessons/` that other sessions wrote to.

5. **Check `core.hooksPath` and other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise. Lab 08
   never sets one, so this is a look, not an undo:

   ```bash
   git config --default "(not set)" --get core.hooksPath
   ```

   The same command works in PowerShell. `(not set)` is the normal answer.
   A value of `.githooks` is the repository's own hook setup from
   `make setup-hooks`, which you chose to run, so leave it. Any other path
   was set by another lab, and that lab's cleanup is the place to undo it.

6. **Confirm working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Any unexpected files (untracked agents, hooks, extensions, scratch
   notebooks) should be removed or moved out of the repo before continuing.

7. **Verify build is still green.** Optional but recommended after labs that
   touched hooks, agents, or skills:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept), and the build is clean if you ran it, you're ready for the next lab.
