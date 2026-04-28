---
title: "Copilot Coding Agent & Code Review"
lab_number: 9
pace:
  presenter_minutes: 5
  self_paced_minutes: 20
registry: docs/_meta/registry.yaml
---

# 9 — Copilot Coding Agent & Code Review

In this lab you will chain two platform-level agentic features: the **Copilot Coding Agent** to implement a feature from a GitHub Issue, and **Copilot Code Review** to automatically review the resulting pull request. You won't write a single line of code — you'll write an issue, and two AI agents handle the rest.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 20 minutes

> 🎤 **Presenter prep:** Before the session, create an issue, assign Copilot, and let the coding agent open a PR that gets auto-reviewed. When presenting, walk through the completed issue → PR → review chain — no waiting.

> 💡 **Enterprise context:** This lab showcases two **platform features** that require zero local tooling. The Coding Agent turns issues into pull requests. Code Review automatically reviews every PR against your `copilot-instructions.md`. Organization owners can enable both across **all repositories** from Copilot policy settings. This is the enterprise scale story: issue → implementation → review, all AI-assisted, all governed by org policies.

References:
- [About Copilot Coding Agent](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-coding-agent)
- [About Copilot Code Review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Configuring automatic code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/configure-automatic-review)
- [Using Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review)

## 9.0 Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh. Versions, model tiers, and MCP server pins live in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — labs reference
> the registry rather than hardcoding values, so a single registry update
> propagates everywhere.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `Shift+Tab` toggles plan mode; autopilot mode is the default | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. |
| **Local tool discovery** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | Discovering which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Note: `extensions_manage` is an MCP tool, **not** a slash command — invoke it via the MCP surface, not via `/extensions_manage`. |
<!-- @end-include docs/_partials/currency.md -->

## 9.1 Understand Copilot Code Review

GitHub Copilot includes a **built-in code reviewer** that can automatically review pull requests. No workflow files, no CI configuration — it's a native platform feature.

Key characteristics:

| Feature | Details |
|---------|---------|
| **Trigger** | Automatic (via rulesets) or manual (assign `@copilot` as reviewer) |
| **Output** | Review comments — never approves or blocks merging |
| **Context** | Reads your `copilot-instructions.md` and repository code for context |
| **Static analysis** | Integrates CodeQL, ESLint, and PMD for high-signal findings |
| **Plans** | Available on Copilot Pro, Pro+, Business, and Enterprise |
| **Platforms** | GitHub.com, VS Code, Visual Studio, JetBrains, Xcode |

> 💡 **Why built-in?** Copilot Code Review is the easiest path to AI-powered reviews. It already knows your repository's custom instructions, understands full project context, and requires zero workflow configuration.

## 9.2 Configure Automatic Reviews

You can configure Copilot to automatically review every pull request using **repository rulesets**.

🌐 **On GitHub:**

1. Go to your repository → **Settings** → **Rules** → **Rulesets**
2. Click **New ruleset** → **New branch ruleset**
3. Name it: `copilot-code-review`
4. Under **Target branches**, add your default branch (`main` for upstream, or whatever the repo's "Default branch" setting shows under **Settings → General**)
5. Under **Branch rules**, check **Require a pull request before merging**
6. Check **Request pull request review from Copilot**
7. Optionally enable:
   - **Review new pushes** — re-reviews on each push to the PR branch
   - **Review draft pull requests** — reviews even before the PR is marked "Open"
8. Click **Create**

> 💡 **No ruleset?** You can also manually request a review by assigning **Copilot** as a reviewer on any individual PR. The ruleset just automates it for every PR.

### Organization-level configuration

Organization owners can enable automatic reviews across **all repositories** from the organization's Copilot policy settings. This is ideal for teams who want consistent AI review without per-repo setup.

## 9.3 Meet the Copilot Coding Agent

The **Copilot Coding Agent** is a platform-level feature that turns GitHub Issues into pull requests. You describe what you want in an issue, assign Copilot, and the agent:

1. **Creates a branch** from your default branch
2. **Reads your codebase** — including `copilot-instructions.md`, `AGENTS.md`, and all your custom instructions
3. **Implements the change** — writes code, adds tests, updates documentation
4. **Opens a pull request** — with a description of what it did and why

Key characteristics:

| Feature | Details |
|---------|---------|
| **Trigger** | Assign `copilot` to an issue, or mention `@copilot` in an issue comment |
| **Environment** | Runs in a secure cloud environment (GitHub-hosted) |
| **Context** | Reads your full repository, custom instructions, and `AGENTS.md` |
| **Output** | A pull request with code changes, ready for review |
| **Iteration** | Responds to PR review comments — push back and it will revise |
| **Plans** | Available on Copilot Pro+, Business, and Enterprise |

> 💡 **Why the Coding Agent?** It bridges the gap between "I know what I want" and "here's the code." Combined with Code Review, you get a full loop: describe → implement → review — without writing code yourself.

### Enable the Coding Agent

🌐 **On GitHub:**

1. Go to your repository → **Settings** → **Copilot** → **Coding agent**
2. Ensure the coding agent is **enabled**
3. If you're in an organization, the org owner may need to enable it from **Organization settings** → **Copilot** → **Policies**

> 💡 **Firewall rules:** If your organization uses a GitHub App allowlist or IP restrictions, ensure the Copilot Coding Agent's GitHub App is permitted. See [GitHub's documentation](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-coding-agent) for details.

## 9.4 Create a GitHub Issue

Instead of making changes locally, let's describe the feature we want in a GitHub Issue and let the Coding Agent implement it.

🌐 **On GitHub** (or use the CLI):

1. Create a new issue in your repository:

**WSL/Bash:**

```bash
gh issue create \
  --title "feat: add MaxEnrollment property to Course model" \
  --body "## Description

Add a \`MaxEnrollment\` property to the \`Course\` model to support enrollment caps.

## Requirements

- Add a \`MaxEnrollment\` property (int) to \`dotnet/ContosoUniversity.Core/Models/Course.cs\`
- Default value should be 30
- Add XML documentation for the new property
- Add a unit test verifying the default value

## Context

This is part of the course prerequisites feature. The property will be used to limit the number of students that can enroll in a course."
```

**PowerShell:**

```powershell
$body = @'
## Description

Add a `MaxEnrollment` property to the `Course` model to support enrollment caps.

## Requirements

- Add a `MaxEnrollment` property (int) to `dotnet/ContosoUniversity.Core/Models/Course.cs`
- Default value should be 30
- Add XML documentation for the new property
- Add a unit test verifying the default value

## Context

This is part of the course prerequisites feature. The property will be used to limit the number of students that can enroll in a course.
'@
gh issue create `
  --title "feat: add MaxEnrollment property to Course model" `
  --body $body
```

> 💡 **Issue quality matters.** The more specific your issue description, the better the Coding Agent's implementation. Include requirements, file paths, and context — just like you would for a human developer.

## 9.5 Assign the Coding Agent

Now assign Copilot to the issue and watch it work.

🌐 **On GitHub:**

1. Open the issue you just created
2. In the **Assignees** panel on the right, click the gear icon
3. Select **Copilot** from the list of assignees
4. Copilot will begin working on the issue

Or use the CLI:

**WSL/Bash:**
```bash
# Replace <ISSUE_NUMBER> with your issue number
gh issue edit <ISSUE_NUMBER> --add-assignee @copilot
```

**PowerShell:**
```powershell
# Replace <ISSUE_NUMBER> with your issue number
gh issue edit <ISSUE_NUMBER> --add-assignee '@copilot'
```

### What happens next

The Coding Agent will:

1. **Start a session** — you'll see a status indicator on the issue showing Copilot is working
2. **Read your codebase** — it examines the project structure, existing models, and your custom instructions
3. **Create a branch** — named something like `copilot/fix-{issue-number}`
4. **Make the changes** — implements the requirements from the issue
5. **Open a pull request** — linked back to the issue, with a description of the changes

This typically takes **2–5 minutes**.

> 💡 **Watch it work.** While the Coding Agent runs, you can see its progress on the issue page. It posts status updates as it reads code, plans changes, and implements the solution.

🌐 **On GitHub:**

1. Refresh the issue page to see status updates
2. Once the PR is created, you'll see a link on the issue
3. Click through to the PR — if you configured the ruleset in 9.2, **Code Review has already started automatically**

> 💡 **Two agents, one flow.** The Coding Agent opened the PR, which triggered the Code Review ruleset. You didn't write code, you didn't push, you didn't manually request a review — the platform handled everything.

## 9.6 Review the Automated Feedback

Your PR now has two types of AI activity:
- The **Coding Agent** created the PR with its implementation
- **Code Review** automatically reviewed those changes

🌐 **On GitHub:**

1. Go to your PR — you'll see **Copilot** listed under Reviewers
2. Examine the code changes the Coding Agent made in the **Files changed** tab
3. Read the Code Review comments posted on the changed files:

| Feedback type | What You'll See |
|--------------|----------------|
| ✅ **Positive** | "Clean property addition with sensible default" |
| ⚠️ **Suggestion** | "Consider adding validation for MaxEnrollment range" (with a suggested fix) |
| 🔒 **Security** | May flag missing input validation or authorization gaps |
| 🧪 **Testing** | May note missing unit tests for the new property |

4. Many suggestions include **Apply suggestion** buttons — click to accept fixes directly

> 💡 **Comment only:** Copilot Code Review never approves or requests changes on a PR. It only comments. This keeps humans in control of the merge decision while providing AI-assisted first-pass review.

## 9.7 Iterate Based on Feedback

Here's where it gets powerful: you can ask the Coding Agent to address the Code Review feedback — creating a fully automated feedback loop.

🌐 **On GitHub:**

1. Read the Code Review comments on your PR
2. Leave a comment on the PR tagging `@copilot` with instructions to address the feedback:

```markdown
@copilot Please address the review feedback:
- Add range validation for MaxEnrollment (must be > 0)
- Add XML documentation if missing
```

3. The Coding Agent will push additional commits to the PR addressing the feedback
4. If "Review new pushes" is enabled, Code Review will automatically re-review the new commits

> 💡 **The feedback loop:** Issue → Coding Agent → PR → Code Review → feedback comment → Coding Agent iterates → Code Review re-reviews. Humans stay in the loop as reviewers and decision-makers, while AI handles the implementation cycles.

Alternatively, you can apply suggestions directly:

1. Click **Apply suggestion** on a Code Review comment to accept a fix inline
2. Or check out the branch locally to make manual adjustments:

```bash
gh pr checkout <PR_NUMBER>
# Make your changes
git add dotnet/ContosoUniversity.Core/Models/Course.cs
git commit -m "fix: address review feedback for MaxEnrollment"
git push
```

## 9.8 How Custom Instructions Enhance Both Agents

Both the Coding Agent and Code Review automatically read your `copilot-instructions.md` — the same file we explored in Lab 02.

🖥️ **In your terminal:**

**WSL/Bash:**
```bash
head -30 .github/copilot-instructions.md
```

**PowerShell:**
```powershell
Get-Content .github/copilot-instructions.md | Select-Object -First 30
```

Because our repository has custom instructions covering:
- Clean architecture boundaries
- Repository pattern requirements
- Test naming conventions (`MethodName_Condition_ExpectedResult`)
- Security rules (no hardcoded secrets, parameterized queries)

...both agents are **contextually aware** of our project's standards:

| Agent | How Instructions Help |
|-------|-----------------------|
| **Coding Agent** | Implements code that follows your conventions from the start |
| **Code Review** | Checks changes against your project-specific rules, not just generic best practices |

> 💡 **This is the power of the configuration ecosystem.** The instructions you wrote in Lab 02 automatically improve the quality of the Coding Agent's implementations, Code Review's feedback, local agent responses, and completions — everywhere.

## 9.9 The Agentic Chain

Step back and look at what just happened:

```
┌──────────────┐     ┌──────────────────┐     ┌───────────────┐     ┌──────────────┐
│  You write   │ ──► │  Coding Agent    │ ──► │  Code Review  │ ──► │  You review  │
│  an Issue    │     │  implements +    │     │  checks the   │     │  and merge   │
│              │     │  opens a PR      │     │  PR changes   │     │              │
└──────────────┘     └──────────────────┘     └───────────────┘     └──────────────┘
```

**Three platform features, zero local tooling:**

1. **GitHub Issues** — you describe the work
2. **Copilot Coding Agent** — AI implements it
3. **Copilot Code Review** — AI reviews it

The human stays in control: you write the requirements, you review the output, you decide to merge. The AI handles the implementation and first-pass review.

> 💡 **Connect the labs.** Remember Lab 08? The gh-aw workflow generated a PRD from a feature branch. Imagine the full chain: PRD generation (Lab 08) → issue creation → Coding Agent implements → Code Review validates. Each piece is a building block you can compose into your own workflow.

### Compare: Traditional vs Agentic Development

| Aspect | Traditional Workflow | Agentic Workflow (this lab) |
|--------|---------------------|-----------------------------|
| **Implementation** | Developer writes code locally | Coding Agent writes code from issue description |
| **Code review** | Human reviewer (hours/days) | AI review in minutes + human final review |
| **Feedback loop** | Push → wait → fix → push | Comment `@copilot` → agent iterates → auto re-review |
| **Context** | Reviewer reads PR diff | AI reads full project + custom instructions |
| **Setup** | IDE, local env, branch, push | Write an issue, assign Copilot |

## 9.10 Going Further: Custom Reviews with gh-aw

The built-in Copilot Code Review covers most use cases. But if you need **full customization** — a specific review checklist, custom output labels, controlled permissions, or integration with specific tools — GitHub Agentic Workflows (gh-aw) give you that power.

This repository includes a custom gh-aw code review workflow:

🖥️ **In your terminal:**

**WSL/Bash:**
```bash
cat .github/workflows/code-review.md
```

**PowerShell:**
```powershell
Get-Content .github/workflows/code-review.md
```

This workflow demonstrates:
- **Custom review checklist** — five specific categories (architecture, C#, security, testing, docs)
- **`safe-outputs`** — labels AI comments with `ai-review` for auditability
- **Permission scoping** — `contents: read`, `pull-requests: write`
- **Tool selection** — only `pull_requests` and `repos` toolsets

See the [reference solution](../solutions/lab09-gh-aw-review/code-review.md) for the complete workflow.

> 💡 **When to use which?** Use built-in Copilot Code Review for everyday reviews. Use gh-aw when you need a custom review pipeline — domain-specific checklists, labeled outputs, strict permission models, or integration with custom tools.

## 9.11 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Copilot Coding Agent** | Turns GitHub Issues into pull requests with working code |
| **Copilot Code Review** | Built-in AI reviewer for pull requests |
| **The agentic chain** | Issue → Coding Agent → PR → Code Review → human merge |
| **Custom instructions** | Both agents read `copilot-instructions.md` and `AGENTS.md` |
| **Iteration** | Comment `@copilot` on PRs to request changes; Code Review auto-re-reviews on push |
| **Coding Agent setup** | Enable in repo settings → Copilot → Coding agent |
| **Code Review setup** | Repository rulesets or manual `@copilot` reviewer assignment |
| **gh-aw alternative** | For custom review checklists, labeled outputs, and advanced control |

**The three review layers:**

| Layer | Tool | When to Use |
|-------|------|-------------|
| **Built-in** | Copilot Code Review | Everyday reviews — toggle a ruleset |
| **Custom** | gh-aw Code Review workflow | Domain-specific checklists, labeled outputs, strict permissions |
| **Human** | Your team | Architecture decisions, business logic, final merge approval |

</details>

**Next:** [Lab 10 — Agent Memory: Personalities, Lessons, and Consolidation](lab10.md)

## 9.12 Cleanup

<!-- @include docs/_partials/cleanup.md — do not edit inline; edit the partial and re-sync. -->
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

2. **Restore Copilot CLI config if you mutated it.** Some labs ask you to
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json`. If you stashed the original, restore it now.
   If you edited in place without backing up, check `git status` in the lab
   repo (workspace configs) and revert anything you didn't mean to keep.

   **WSL/Bash:**
   ```bash
   # If you saved a backup like ~/.copilot/config.json.bak:
   [ -f ~/.copilot/config.json.bak ] && mv ~/.copilot/config.json.bak ~/.copilot/config.json
   ```

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** These directories accumulate
   across labs and are safe to clean once you've finished:

   ```bash
   # Per-session scratch (safe to inspect; delete only what this lab created):
   ls ~/.copilot/lessons/        2>/dev/null
   ls node/.a2a/                  2>/dev/null
   ls node/.a2a-transcript-*.md   2>/dev/null
   ls .git/CLAB_SUMMARY.md        2>/dev/null
   ```

   Delete only files that this lab created. Do not blanket-delete
   `~/.copilot/lessons/` if other sessions wrote to it.

5. **Revert any `core.hooksPath` or other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise.

   ```bash
   git config --get core.hooksPath
   # if set to a lab path, unset:
   git config --unset core.hooksPath
   ```

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
> kept) and the build is clean, you're ready for the next lab.
<!-- @end-include docs/_partials/cleanup.md -->
