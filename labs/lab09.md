---
title: "Copilot Coding Agent & Code Review"
lab_number: 9
pace:
  presenter_minutes: 5
  self_paced_minutes: 55
registry: docs/_meta/registry.yaml
---

# 9 — Copilot Coding Agent & Code Review

In this lab you will chain two platform-level agentic features: the **Copilot Coding Agent** to implement a feature from a GitHub Issue, and **Copilot Code Review** to automatically review the resulting pull request. You won't write a single line of code — you'll write an issue, and two AI agents handle the rest.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 55 minutes

> 📋 **Before you start.** This is an **advanced-tier lab**: it runs on GitHub.com rather than in an editor, and it assumes the repository context from Lab 02 and the platform workflow from Lab 08. The self-paced figure above is a planning estimate, not a target — two agent round-trips set the real pace and they vary, so finishing well either side of it is normal.

**Prerequisites:**

- Finish [Lab 02 — Custom Instructions & AGENTS.md](lab02.md). §9.8 is about the `.github/copilot-instructions.md` file you edited there. Both agents in this lab run on GitHub rather than on your machine, so they read what you have **committed and pushed** — not edits sitting in your working copy. Open `.github/copilot-instructions.md` in your fork on GitHub.com and check that it says what you expect. If your Lab 02 edits never got pushed, carry on: this repository ships its own instructions and the lab works the same way. Just don't credit the agents' behaviour to changes they can't see.
- Finish [Lab 08 — GitHub Agentic Workflows: PRD Generation](lab08.md). §9.9 and §9.10 build on it, and its §8.5 shows how to turn on Issues in a fork — §9.4 needs Issues turned on.
- Do this lab in **a fork you own**. §9.2 creates a repository ruleset and §9.3 changes a repository setting, so both changes should land in a repository that's yours.
- Use a Copilot plan that includes both the Coding Agent and Code Review — see [Copilot plans](https://docs.github.com/en/copilot/get-started/plans).

**Where you'll work:** mostly in your browser on GitHub.com. A few steps use a terminal in a clone of your fork — reading files in §9.8 and §9.10, plus the optional `gh` and `git` commands.

> 🎤 **Presenter prep:** Before the session, create an issue, assign Copilot, and let the coding agent open a PR that gets auto-reviewed. When presenting, walk through the completed issue → PR → review chain — no waiting.

> 💡 **Enterprise context:** This lab showcases two **platform features** that run on GitHub itself rather than on your machine. The Coding Agent turns issues into pull requests. Code Review reviews pull requests against your `.github/copilot-instructions.md` — automatically, once a ruleset like the one in §9.2 is in place. Organizations govern both features through policy; the admin controls are covered in [Lab 17 — GitHub Admin Controls for Copilot/AI](lab17.md). This is the enterprise scale story: issue → implementation → review, all AI-assisted, all governed by org policies.

References:
- [About Copilot on GitHub](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github)
- [Using the Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent)
- [About Copilot Code Review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Configuring automatic code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review)
- [Using Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-code-review)
- [Copilot plans](https://docs.github.com/en/copilot/get-started/plans)

## 9.0 Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (GA June 23, 2026):** `/plugin`, `/mcp`, and
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
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto` to let Copilot choose) | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. The tier names are registry keys, not `/model` arguments. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to switch modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

## 9.1 Understand Copilot Code Review

GitHub Copilot includes a **built-in code reviewer** that can automatically review pull requests. No workflow files, no CI configuration — it's a native platform feature.

Key characteristics:

| Feature | Details |
|---------|---------|
| **Trigger** | Automatic (via rulesets) or manual (request **Copilot** as a reviewer on a pull request) |
| **Output** | A **Comment** review — it doesn't block merging. Approving reviews are opt-in (public preview): see [Copilot approvals](https://docs.github.com/en/copilot/concepts/agents/code-review#copilot-approvals) |
| **Context** | Reads your `.github/copilot-instructions.md` and repository code for context |
| **Static analysis** | Integrates static analysis for high-signal findings |
| **Plans** | Depends on your Copilot plan — see [Copilot plans](https://docs.github.com/en/copilot/get-started/plans) for what each plan includes |
| **Platforms** | See [Availability](https://docs.github.com/en/copilot/concepts/agents/code-review#availability) in the Code Review docs for the supported platforms |

> 💡 **Why built-in?** Copilot Code Review is the easiest path to AI-powered reviews. It already knows your repository's custom instructions, understands full project context, and requires zero workflow configuration.

## 9.2 Configure Automatic Reviews

You can configure Copilot to automatically review every pull request using **repository rulesets**.

> ⚠️ **This ruleset is for this exercise.** It includes **Require a pull request before merging** on your fork's default branch, so while the ruleset is active, changes to that branch — yours too, in later labs — have to come in through a pull request. §9.12 removes the ruleset when you're done.

🌐 **On GitHub:**

1. Go to your fork → **Settings**. In the left sidebar, under **Code, planning, and automation**, click **Rulesets**, then click **Rulesets** again.
2. Click **New ruleset** → **New branch ruleset**
3. Name it: `copilot-code-review`
4. Set **Enforcement status** to **Active** — a ruleset only takes effect once it's active
5. Under **Target branches**, click **Add target** → **Include default branch**
6. Under **Branch rules**, check **Require a pull request before merging**
7. Check **Automatically request Copilot code review**, then choose its options:
   - **Review draft pull requests** — turn this on for this lab. The Coding Agent opens its pull request as a **draft** (§9.5), and without this option Copilot doesn't review a draft until it's marked ready for review.
   - **Review new pushes** — optional. Re-reviews each time someone pushes to the PR branch; without it, Copilot reviews the pull request once.
8. Click **Create**

> 💡 **No ruleset?** You can also request a review by hand on any individual pull request: under **Reviewers** in the right sidebar, click **Request** next to **Copilot**. The ruleset just automates it for every PR.

### Organization-level configuration

Teams that want consistent AI review without per-repository setup create the same kind of ruleset one level up: an **organization ruleset** (organization **Settings** → **Repository** → **Rulesets**) that targets repositories and turns on **Automatically request Copilot code review**. Enabling the Code Review policy on its own doesn't switch on automatic reviews. For the organization-level controls, see [Lab 17 — GitHub Admin Controls for Copilot/AI](lab17.md); for the ruleset steps, see [Configuring automatic code review](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review).

## 9.3 Meet the Copilot Coding Agent

The **Copilot Coding Agent** is a platform-level feature that turns GitHub Issues into pull requests. You describe what you want in an issue, assign Copilot, and the agent:

1. **Creates a branch** from your default branch
2. **Reads your codebase** — including `.github/copilot-instructions.md`, `AGENTS.md`, and all your custom instructions
3. **Implements the change** — writes code, adds tests, updates documentation
4. **Opens a draft pull request** — with a description of what it did and why, and requests your review when it's finished

Key characteristics:

| Feature | Details |
|---------|---------|
| **Trigger** | Assign `copilot` to an issue, or mention `@copilot` in an issue comment |
| **Environment** | Runs in a secure cloud environment (GitHub-hosted) |
| **Context** | Reads your full repository, custom instructions, and `AGENTS.md` |
| **Output** | A draft pull request with code changes, for you to review |
| **Iteration** | Responds to PR review comments — push back and it will revise |
| **Plans** | Depends on your Copilot plan and your organization's policy — see [Copilot plans](https://docs.github.com/en/copilot/get-started/plans) and [Managing access to GitHub Copilot cloud agent](https://docs.github.com/en/copilot/concepts/enterprise/cloud-agent-access) |

> 💡 **Why the Coding Agent?** It bridges the gap between "I know what I want" and "here's the code." Combined with Code Review, you get a full loop: describe → implement → review — without writing code yourself.

### Enable the Coding Agent

🌐 **On GitHub:**

1. Go to your fork → **Settings** → **Copilot** → **Cloud agent** (GitHub's docs and settings now call the Copilot Coding Agent the *cloud agent*)
2. Check that the cloud agent is available for your fork. Depending on your plan and any organization policy, it may already be on; if you have to switch something on, note it so you can undo it in §9.12
3. No **Copilot** or **Cloud agent** entry in Settings, or an organization setting is blocking it? Organization policy governs availability — see [Lab 17 — GitHub Admin Controls for Copilot/AI](lab17.md)

> 💡 **Firewall rules:** If your organization restricts network access, or the agent's built-in firewall blocks something it needs, the [Copilot cloud agent documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent) links to the firewall and network-access guides.

## 9.4 Create a GitHub Issue

Instead of making changes locally, let's describe the feature we want in a GitHub Issue and let the Coding Agent implement it.

🌐 **On GitHub** (or use the CLI):

1. Create a new issue in your fork. In the browser, open the **Issues** tab → **New issue**, set the title to `feat: add MaxEnrollment property to Course model`, paste in the body (the Markdown between `@'` and `'@` in the PowerShell example below), and click **Create**. No **Issues** tab? Issues may be off on a fork — [Lab 08](lab08.md) §8.5 shows how to turn them on. Prefer the terminal? Use the commands below.

> ⚠️ **Terminal users — check which repository `gh` will use.** A clone of a fork can leave `gh` pointed at the original repository, and `gh issue create` would then open the issue there. Run `gh repo set-default --view`; if it doesn't show your fork, run `gh repo set-default` and choose your fork.

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
2. In the right sidebar, click **Assignees**
3. Select **Copilot** from the list. If an optional prompt box or repository and branch dropdowns appear, leave the defaults and confirm the assignment
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
3. **Create a branch** — Copilot picks the branch name itself; you don't need to match it to anything
4. **Make the changes** — implements the requirements from the issue
5. **Open a draft pull request** — linked back to the issue, with a description of the changes — and request your review when it finishes

This typically takes **2–5 minutes**.

> 💡 **Watch it work.** While the Coding Agent runs, you can see its progress on the issue page. It posts status updates as it reads code, plans changes, and implements the solution.

🌐 **On GitHub:**

1. Refresh the issue page to see status updates
2. Once the PR is created, you'll see a link on the issue
3. Click through to the PR. If you turned on **Review draft pull requests** in the §9.2 ruleset, Code Review has already started on the draft. If you didn't, it starts when you mark the draft **Ready for review** — or you can start it now: under **Reviewers**, click **Request** next to **Copilot**
4. **Wait for both agents to finish before moving on.** The Coding Agent is done when it stops posting status updates and requests your review on the PR — a PR link appearing is not the same as the work being finished. Code Review is done when its comments are actually on the **Files changed** tab, or it reports it found nothing to comment on. Read an unfinished PR and you'll be reviewing a half-written change.

> ⚠️ **If it doesn't finish.** The Coding Agent can fail or stop and say so on the issue or the PR. If that happens, or nothing has moved for well past the 2–5 minutes above, open its session log from the PR to see where it stopped. You have three ways forward: comment on the PR telling it what to do differently, close the PR and re-assign the issue for a fresh attempt, or skip to §9.8 — the rest of the lab is reading and still works without a finished PR. Clean up whatever you did create using §9.12.

> 💡 **Two agents, one flow.** With **Review draft pull requests** on, the Coding Agent opens the draft PR and the ruleset you created in §9.2 asks Code Review to look at it. You didn't write code, you didn't push, and you didn't request the review by hand — the platform handled it.

## 9.6 Review the Automated Feedback

Your PR now has two types of AI activity:
- The **Coding Agent** created the PR with its implementation
- **Code Review** reviewed those changes — automatically through your ruleset, or because you requested it

🌐 **On GitHub:**

1. Go to your PR — you'll see **Copilot** listed under Reviewers
2. Examine the code changes the Coding Agent made in the **Files changed** tab
3. Read the Code Review comments posted on the changed files. The four kinds below are **examples of what a review can raise — not a checklist of what yours will say**:

| Feedback type | What it might look like |
|--------------|----------------|
| ✅ **Positive** | "Clean property addition with sensible default" |
| ⚠️ **Suggestion** | "Consider adding validation for MaxEnrollment range" (with a suggested fix) |
| 🔒 **Security** | May flag missing input validation or authorization gaps |
| 🧪 **Testing** | May note missing unit tests for the new property |

4. Many suggestions include **Apply suggestion** buttons — click to accept fixes directly

> 💡 **A clean review is a real result.** On a change this small, Code Review may finish with praise and nothing to fix. That is the feature working, not a step you missed — the agents wrote code that matched your instructions. §9.7 tells you what to do in either case.

> 💡 **Comment by default:** Copilot Code Review leaves a **Comment** review. It doesn't approve the pull request or request changes, and by default its review doesn't count toward required approvals or block merging, so humans stay in control of the merge decision while AI provides a first-pass review. (Opt-in Copilot approvals exist and are in public preview — see [About Copilot Code Review](https://docs.github.com/en/copilot/concepts/agents/code-review#copilot-approvals).)

## 9.7 Iterate Based on Feedback

Here's where it gets powerful: you can ask the Coding Agent to address the Code Review feedback — creating a fully automated feedback loop.

🌐 **On GitHub:**

1. Read the Code Review comments on your PR, and take whichever branch matches what you actually got
2. Leave a comment on the PR tagging `@copilot`:

   **If the review raised something**, ask it to address that — quote the review's own wording rather than the example below, which is only a template:

```markdown
@copilot Please address the review feedback:
- Add range validation for MaxEnrollment (must be > 0)
- Add XML documentation if missing
```

   **If the review came back clean**, you can still drive a second cycle by asking for something new. Say so plainly, because this is a new requirement you are adding — not feedback the review gave you:

```markdown
@copilot New requirement, not from the review: add range validation for
MaxEnrollment (must be > 0), with a unit test covering the invalid case.
```

3. The Coding Agent will push additional commits to the PR addressing the comment
4. If you turned on **Review new pushes** in the §9.2 ruleset, Code Review automatically re-reviews the new commits
5. Wait for the same two completion signals as in §9.5 — the agent requesting review again, and the re-review's comments actually appearing — before you judge the result

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

Both the Coding Agent and Code Review automatically read your repository's `.github/copilot-instructions.md` — the same file you worked with in [Lab 02](lab02.md).

🖥️ **In your terminal:**

Run this from the root of your clone of the fork. No clone handy? Open `.github/copilot-instructions.md` in your fork on GitHub.com instead.

**WSL/Bash:**
```bash
head -30 .github/copilot-instructions.md
```

**PowerShell:**
```powershell
Get-Content .github/copilot-instructions.md | Select-Object -First 30
```

That's only the top of the file, which opens with general coding style. Further down, and in `AGENTS.md` and the path-specific files in `.github/instructions/`, our repository's custom instructions cover:
- Clean architecture boundaries
- Repository pattern requirements
- Test naming conventions (`MethodName_Condition_ExpectedResult`)
- Security rules (no hardcoded secrets, parameterized queries)

...so both agents are **contextually aware** of our project's standards:

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

That last box is the production lifecycle, not this exercise. **You stop at the review** — §9.12 closes the pull request unmerged and deletes its branch, so your fork ends up the way it started. Merging is what you'd do on a real change you wanted to keep.

**Three platform features, all running on GitHub:**

1. **GitHub Issues** — you describe the work
2. **Copilot Coding Agent** — AI implements it
3. **Copilot Code Review** — AI reviews it

The human stays in control: you write the requirements, you review the output, and on a real change you'd decide whether to merge. The AI handles the implementation and first-pass review.

> 💡 **Connect the labs.** Remember Lab 08? The gh-aw workflow generated a PRD from a feature branch. Imagine the full chain: PRD generation (Lab 08) → issue creation → Coding Agent implements → Code Review validates. Each piece is a building block you can compose into your own workflow.

### Compare: Traditional vs Agentic Development

| Aspect | Traditional Workflow | Agentic Workflow (this lab) |
|--------|---------------------|-----------------------------|
| **Implementation** | Developer writes code locally | Coding Agent writes code from issue description |
| **Code review** | Human reviewer (hours/days) | AI review in minutes + human final review |
| **Feedback loop** | Push → wait → fix → push | Comment `@copilot` → agent iterates → re-review (automatic with **Review new pushes**) |
| **Context** | Reviewer reads PR diff | AI reads full project + custom instructions |
| **Setup** | IDE, local env, branch, push | Write an issue, assign Copilot |

## 9.10 Going Further: Custom Reviews with gh-aw

The built-in Copilot Code Review covers most use cases. But if you need **full customization** — a specific review checklist, custom output labels, controlled permissions, or integration with specific tools — GitHub Agentic Workflows (gh-aw) give you that power.

This repository includes a custom gh-aw code review workflow:

🖥️ **In your terminal:**

Run these from the root of your clone of the fork. No clone handy? Open `.github/workflows/code-review.md` in your fork on GitHub.com instead.

**WSL/Bash:**
```bash
cat .github/workflows/code-review.md
```

**PowerShell:**
```powershell
Get-Content .github/workflows/code-review.md
```

This workflow demonstrates:
- **Custom review checklist** — five specific categories (architecture compliance, .NET best practices, security, testing, documentation)
- **`safe-outputs`** — the agent itself runs read-only, so everything it writes back goes through `safe-outputs`: `add-comment` posts the review comment, and a separate `add-labels` puts the `ai-review` label on the pull request (it may add no other label) for auditability
- **Permission scoping** — `contents: read`, `pull-requests: read`
- **Tool selection** — the GitHub tool gets only the `pull_requests` and `repos` toolsets, and `bash` is limited to `dotnet`

The file above is the working version — it's the one wired into `.github/workflows/`, and the repo's own gate compiles it on every run. The [reference solution](../solutions/lab09-gh-aw-review/code-review.md) attaches the label through a single `add-pr-comment` safe output instead, and it isn't wired in or compiled by the gate. Read it for comparison, but don't copy it as-is.

> 💡 **When to use which?** Use built-in Copilot Code Review for everyday reviews. Use gh-aw when you need a custom review pipeline — domain-specific checklists, labeled outputs, strict permission models, or integration with custom tools.

## 9.11 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Copilot Coding Agent** | Turns GitHub Issues into pull requests with working code |
| **Copilot Code Review** | Built-in AI reviewer for pull requests |
| **The agentic chain** | Issue → Coding Agent → PR → Code Review → human merge |
| **Custom instructions** | Both agents read `.github/copilot-instructions.md` and `AGENTS.md` |
| **Iteration** | Comment `@copilot` on PRs to request changes; Code Review re-reviews new pushes when **Review new pushes** is on |
| **Coding Agent setup** | Repo **Settings** → **Copilot** → **Cloud agent**; your plan and org policy decide availability |
| **Code Review setup** | A ruleset with **Automatically request Copilot code review**, or request a review by hand under **Reviewers** |
| **gh-aw alternative** | For custom review checklists, labeled outputs, and advanced control |

**The three review layers:**

| Layer | Tool | When to Use |
|-------|------|-------------|
| **Built-in** | Copilot Code Review | Everyday reviews — toggle a ruleset |
| **Custom** | gh-aw Code Review workflow | Domain-specific checklists, labeled outputs, strict permissions |
| **Human** | Your team | Architecture decisions, business logic, final merge approval |

</details>

> 🆕 **Going further: Code Review at scale, across a stacked PR chain.**
> This lab treats Code Review as a single-PR concern — one issue, one PR,
> one review. When a spec produces enough change that it doesn't fit in
> one PR comfortably, [Lab 18](lab18.md) shows the same Code Review pattern
> applied to **every layer of a stacked pull request chain**, so each small
> layer gets reviewed before the next one is built on top of it.

**Next:** [Lab 10 — Agent Memory: Personalities, Lessons, and Consolidation](lab10.md)

## 9.12 Cleanup

> 🧹 **Cleanup — leave your fork the way you found it.**
> This lab left four things in your fork: the `copilot-code-review` **ruleset** (§9.2), the **issue** (§9.4), the **branch** the Coding Agent pushed, and the **pull request** it opened (§9.5). The ruleset matters most: while it's active, changes to your fork's default branch have to come in through a pull request, and Copilot is asked to review each one. Close all four out before the next lab.

🌐 **On GitHub** (in your fork):

1. **Close the pull request.** Go to **Pull requests**, open the Coding Agent's pull request, and click **Close pull request** below the comment box. Don't merge it — this lab never asks you to.
2. **Delete its branch.** Near the bottom of the closed pull request, click **Delete branch**. GitHub only shows the button once no pull request for that branch is open.
3. **Close the issue.** Go to **Issues**, open the issue from §9.4, and click **Close issue**. The arrow next to the button lets you pick a reason — *not planned* fits.
4. **Delete the ruleset.** Open **Settings** → **Rulesets** → **Rulesets** (where you created it in §9.2), click `copilot-code-review`, open the **⋯** menu next to its name, and click **Delete ruleset**. To keep it for later instead, set **Enforcement status** to **Disabled** — it stops requiring pull requests and Copilot reviews until you turn it back on.
5. **Undo the Coding Agent setting — only if you switched something on in §9.3.** Switch it back under **Settings** → **Copilot** → **Cloud agent**.

🖥️ **In your terminal:**

Optional — an alternative to steps 1–3. Run these from your clone of the fork, with `gh` pointed at your fork (see the tip in §9.4). They're the same in Bash and PowerShell; replace `<PR_NUMBER>` and `<ISSUE_NUMBER>` with your own numbers.

```bash
gh pr close <PR_NUMBER> --delete-branch
gh issue close <ISSUE_NUMBER> --reason "not planned"
```

`--delete-branch` removes the pull request's branch from your fork, and from your clone too (switching you to the default branch first if you had checked it out in §9.7). Pick one route, not both: if the pull request is already closed, `gh pr close` only prints a warning and deletes nothing — use **Delete branch** on GitHub instead. To check your work:

```bash
gh pr list --state open      # the Coding Agent's pull request should no longer be listed
gh issue list --state open   # ...and neither should the issue
git status --short           # prints nothing when your clone is clean
```

> ✅ Done when no pull request or issue from this lab is still open in your fork and **Rulesets** no longer lists `copilot-code-review` (or lists it as Disabled).
