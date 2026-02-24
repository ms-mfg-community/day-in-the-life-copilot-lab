# 9 — Copilot Code Review

In this lab you will use GitHub's built-in Copilot Code Review to get AI-powered feedback on pull requests. You'll enable automatic reviews, open a PR, and iterate on the feedback — all without writing a single workflow file.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

> 🎤 **Presenter prep:** Before the session, open a PR with a small code change (e.g., add `MaxEnrollment` to Course model) and assign Copilot as a reviewer. When presenting, show the completed review comments — no waiting.

> 💡 **Enterprise context:** Copilot Code Review is a **platform feature** — zero workflow configuration, zero CI setup. Toggle a ruleset and every PR gets AI-reviewed against your `copilot-instructions.md`. Organization owners can enable it across **all repositories** from Copilot policy settings. It integrates CodeQL, ESLint, and PMD for static analysis. This is the enterprise scale story: your local instructions automatically improve platform-level reviews.

References:
- [About Copilot Code Review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Configuring automatic code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/configure-automatic-review)
- [Using Copilot code review](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review)

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
4. Under **Target branches**, add `lab/day-in-the-life-copilot-lab` (or your default branch)
5. Under **Branch rules**, check **Require a pull request before merging**
6. Check **Request pull request review from Copilot**
7. Optionally enable:
   - **Review new pushes** — re-reviews on each push to the PR branch
   - **Review draft pull requests** — reviews even before the PR is marked "Open"
8. Click **Create**

> 💡 **No ruleset?** You can also manually request a review by assigning **Copilot** as a reviewer on any individual PR. The ruleset just automates it for every PR.

### Organization-level configuration

Organization owners can enable automatic reviews across **all repositories** from the organization's Copilot policy settings. This is ideal for teams who want consistent AI review without per-repo setup.

## 9.3 Open a Pull Request

Now let's trigger a review by opening a PR with some changes.

🖥️ **In your terminal:**

1. Make sure you're on a feature branch (from Lab 08, or create one):

**WSL/Bash:**
```bash
git checkout -b feature/add-course-prerequisites 2>/dev/null || git checkout feature/add-course-prerequisites
```

**PowerShell:**
```powershell
git checkout -b feature/add-course-prerequisites 2>$null; if (-not $?) { git checkout feature/add-course-prerequisites }
```

2. Make a small code change. For example, add a property to the Course model:

**WSL/Bash:**
```bash
# View the current Course model
cat ContosoUniversity.Core/Models/Course.cs
```

**PowerShell:**
```powershell
# View the current Course model
Get-Content ContosoUniversity.Core/Models/Course.cs
```

3. Add a `MaxEnrollment` property (a simple, realistic change):

Open the file in your editor and add:
```csharp
public int MaxEnrollment { get; set; } = 30;
```

4. Commit and push:

**WSL/Bash:**
```bash
git add ContosoUniversity.Core/Models/Course.cs
git commit -m "feat: add MaxEnrollment property to Course model"
git push origin feature/add-course-prerequisites
```

**PowerShell:**
```powershell
git add ContosoUniversity.Core/Models/Course.cs
git commit -m "feat: add MaxEnrollment property to Course model"
git push origin feature/add-course-prerequisites
```

5. Open a PR:

**WSL/Bash:**
```bash
gh pr create \
  --base lab/day-in-the-life-copilot-lab \
  --title "feat: add course prerequisites and enrollment cap" \
  --body "Adds MaxEnrollment property to Course model. Part of the course prerequisites feature."
```

**PowerShell:**
```powershell
gh pr create `
  --base lab/day-in-the-life-copilot-lab `
  --title "feat: add course prerequisites and enrollment cap" `
  --body "Adds MaxEnrollment property to Course model. Part of the course prerequisites feature."
```

Or use the GitHub web UI: **Compare & pull request** → set base to `lab/day-in-the-life-copilot-lab` → **Create pull request**.

> 💡 Copilot code review typically takes 2–5 minutes. If no review appears after 5 minutes, click the re-request button next to Copilot's name on the PR page.

## 9.4 Review the Automated Feedback

If you configured the ruleset in 9.2, Copilot automatically reviews the PR. Otherwise, manually assign **Copilot** as a reviewer on the PR.

🌐 **On GitHub:**

1. Go to your PR — you'll see **Copilot** listed under Reviewers
2. Wait for the review (typically 1-2 minutes)
3. Copilot posts review comments directly on the changed files:

| Feedback type | What You'll See |
|--------------|----------------|
| ✅ **Positive** | "Clean property addition with sensible default" |
| ⚠️ **Suggestion** | "Consider adding validation for MaxEnrollment range" (with a suggested fix) |
| 🔒 **Security** | May flag missing input validation or authorization gaps |
| 🧪 **Testing** | May note missing unit tests for the new property |

4. Many suggestions include **Apply suggestion** buttons — click to accept fixes directly

> 💡 **What review comments look like:** Copilot posts inline comments on specific changed lines — similar to human reviews. Example: "Consider adding range validation for MaxEnrollment to prevent negative values."

> 💡 **Comment only:** Copilot never approves or requests changes on a PR. It only comments. This keeps humans in control of the merge decision while providing AI-assisted first-pass review.

## 9.5 Iterate Based on Feedback

Let's practice the feedback loop: read the review, make fixes, push, and get re-reviewed.

🖥️ **In your terminal:**

1. Read Copilot's review comments on your PR

2. Address a suggestion. For example, add an XML comment:
```csharp
/// <summary>
/// Maximum number of students that can enroll in this course.
/// </summary>
public int MaxEnrollment { get; set; } = 30;
```

3. Commit and push:

**WSL/Bash:**
```bash
git add ContosoUniversity.Core/Models/Course.cs
git commit -m "docs: add XML documentation for MaxEnrollment"
git push origin feature/add-course-prerequisites
```

**PowerShell:**
```powershell
git add ContosoUniversity.Core/Models/Course.cs
git commit -m "docs: add XML documentation for MaxEnrollment"
git push origin feature/add-course-prerequisites
```

4. If "Review new pushes" is enabled, Copilot automatically re-reviews. Otherwise, click the 🔄 button next to Copilot's name in the Reviewers panel to request a re-review.

5. Check the PR for updated review comments

> 💡 **Rapid feedback loop:** Push code → get AI review → fix → push → get re-review. Copilot handles the first-pass review, freeing human reviewers for higher-level design and architecture feedback.

## 9.6 How Custom Instructions Enhance Reviews

Copilot Code Review automatically reads your `copilot-instructions.md` — the same file we explored in Lab 02.

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

...Copilot's reviews are **contextually aware** of our project's standards. It doesn't just apply generic best practices — it checks against *our* conventions.

> 💡 **This is the power of the configuration ecosystem.** The instructions you wrote in Lab 02 automatically improve the quality of Copilot's code reviews, agent responses, and completions — everywhere.

## 9.7 Compare: Traditional vs AI Code Review

| Aspect | Traditional CI (linters) | Copilot Code Review |
|--------|-------------------------|---------------------|
| **Type** | Rule-based (ESLint, StyleCop) | AI-powered reasoning |
| **Feedback** | "Line 42: unused variable" | "This property should have range validation to prevent negative enrollment caps" |
| **Context** | Per-file analysis | Understands full project architecture |
| **Custom rules** | Config files (`.eslintrc`) | Natural language (`copilot-instructions.md`) |
| **Static analysis** | Separate tools | CodeQL, ESLint, PMD integrated |
| **Setup** | Install + configure per tool | Toggle a ruleset |

## 9.8 Going Further: Custom Reviews with gh-aw

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

## 9.9 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Copilot Code Review** | Built-in AI reviewer for pull requests |
| **Setup** | Repository rulesets or manual `@copilot` assignment |
| **Output** | Review comments only — never approves or blocks |
| **Context** | Reads `copilot-instructions.md` and full project context |
| **Static analysis** | CodeQL, ESLint, PMD integrated |
| **Re-review** | Automatic on push (if configured) or manual re-request |
| **gh-aw alternative** | For custom checklists, labeled outputs, and advanced control |

**Built-in vs Custom review:**

| Feature | Built-in Copilot Review | gh-aw Custom Workflow |
|---------|------------------------|-----------------------|
| Setup | Toggle in repo settings | Write workflow `.md`, compile with `gh aw` |
| Custom instructions | `copilot-instructions.md` | Markdown body in workflow |
| Static analysis | CodeQL, ESLint, PMD built-in | Script your own |
| Output labels | N/A | `safe-outputs` with custom labels |
| Permission model | Platform-managed | Explicit `permissions` block |
| Re-review trigger | Ruleset config | `on: pull_request [synchronize]` |

</details>

**Next:** [Lab 10 — Session Management & Memory](lab10.md)
