---
title: "Self-Improving Agents & Skills (gh-aw Template)"
lab_number: 19
pace:
  presenter_minutes: 7
  self_paced_minutes: 25
registry: docs/_meta/registry.yaml
---

# 19 — Self-Improving Agents & Skills (gh-aw Template)

This lab is explicitly a **community/DIY pattern**, not an official GitHub
Copilot feature. You'll wire up `.github/workflows/self-improving-agents.md`
— a portable gh-aw workflow (already added to this repo) that scans this
repo's own agents, skills, and prompts for drift using
[`eval-harness`](../.github/skills/eval-harness/SKILL.md) conventions, and
opens a small, draft, human-reviewed refinement PR.

> ⏱️ Presenter pace: 7 minutes | Self-paced: 25 minutes

> ⚠️ **Set expectations correctly:** there is no GitHub product called
> "self-improving agents." This lab shows you how to *build one yourself*
> out of primitives you already know from Labs 07–09 (agents), Lab 04
> (skills), and Lab 08 (gh-aw). Don't present this as an official feature
> to your team — present it as a pattern you assembled.

References:
- [`.github/workflows/self-improving-agents.md`](../.github/workflows/self-improving-agents.md) — the workflow you'll run in this lab
- [`.github/skills/eval-harness/SKILL.md`](../.github/skills/eval-harness/SKILL.md) — the eval-driven-development conventions the workflow scores against
- [Lab 08 — GitHub Agentic Workflows: PRD Generation](lab08.md) — the gh-aw fundamentals this workflow builds on
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — `gh_aw_schema_version`

## 19.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

## 19.1 Why "Self-Improving" and Why It's Bounded

Agents, skills, and prompts are just files — and like any files, they drift
from reality: a referenced path moves, a convention changes, a skill nobody
invokes anymore quietly rots. The self-improving pattern here is:

1. **Detect drift automatically** (stale references, contradicted
   instructions, underused skills, duplicated responsibility) — on a
   schedule, using an agent.
2. **Propose only mechanical fixes** as a draft PR — never a design change.
3. **Escalate anything non-mechanical to a human** instead of editing the
   file — flag it in the report attached to the draft PR. The report is the
   only findings channel: `safe-outputs` configures `create-pull-request`
   and nothing else, so the workflow cannot open an issue even if it wanted
   to. (gh-aw's own failure handling can open a *diagnostic* issue when a
   run breaks — a separate mechanism, not a place for findings.)
4. **Never let the workflow touch itself** — it explicitly excludes its own
   workflow file (the `.md` source and its compiled `.lock.yml`) from any
   edit it's allowed to make, so it cannot expand its own permissions.

This is the same "detect → propose PR → human merges" shape as Lab 08's
`generate-prd.md` and the repo's own `weekly-content-audit.md` — applied to
the repo's AI configuration instead of its documentation.

🖥️ **In your terminal — read the workflow before running it:**

```bash
cat .github/workflows/self-improving-agents.md
```

Find the **"Portability config"** block near the top. This is what makes
the workflow reusable in *other* repos: five path variables
(`agents_dir`, `skills_dir`, `prompts_dir`, `eval_harness_dir`,
`lessons_dir`) plus a `drift_signal_sources` list. Adapting this workflow to
a different repo means editing that block — the rest of the prompt body is
generic.

## 19.2 Compile and Validate the Workflow

🖥️ **In your terminal:**

```bash
gh aw compile self-improving-agents
```

Compilation should finish without errors. It also **rewrites the committed**
`.github/workflows/self-improving-agents.lock.yml`, so it can leave your
working tree modified. You haven't edited the workflow's `.md` source, so
there is nothing to commit — check, then **discard** the change:

```bash
git status --short
git checkout -- .github/workflows/self-improving-agents.lock.yml
```

If `git status --short` also listed another modified file you didn't edit,
restore it the same way.

A changed lock file can mean your `gh aw` isn't the version the repo pins as
`gh_aw_schema_version` in
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml); [Lab 08](lab08.md)
§8.3 shows how to install the matching one. (If you do change the `.md`
itself, commit the regenerated lock file with it — the two travel as a pair.)

> 💡 **What you should see:** if compilation fails, check the error against
> `gh aw`'s schema docs — a common cause is a `tools:` key that doesn't
> exist in your installed `gh-aw` version (schema drift is exactly what
> Lab 08's `weekly-content-audit.md` checks for on the *labs*; here you're
> hitting the same class of drift on a *workflow file*).

## 19.3 Dry-Run the Drift Scan Locally

Rather than waiting for the schedule or pushing to Actions, rehearse the
same reasoning locally in Copilot CLI first:

🖥️ **In Copilot CLI:**

```
Acting as the drift evaluator described in
.github/workflows/self-improving-agents.md, scan .github/agents/,
.github/skills/, and .github/prompts/ for the five drift signals it
defines. Do NOT make any edits yet — just produce the report described
in the workflow's "Required output" section.
```

Review the report:
- Are the "stale references" real, or false positives?
- Does anything in "Consolidation Candidates" surprise you? (Two agents
  quietly covering the same ground is a common outcome of a fast-moving
  lab suite like this one.)
- Is anything flagged that should have gone to "Findings" but instead
  looks like a design opinion the workflow shouldn't be making unattended?

> 🧪 **Safe rehearsal — plant the drift in a throwaway checkout, never on `main`.** This repo's `.github/` files are kept clean on purpose, so a scan of your real checkout may find almost nothing. To see what drift looks like, plant three classic signals where they cannot reach `main`. A *worktree* is a second checkout on its own scratch branch: nothing you change there touches your working tree, and you never commit or push it.
>
> | Plant this | Signal | How you spot it |
> |---|---|---|
> | A step that reads a file under the removed `.github/prompts/` folder | **Stale path** | `grep` or `find` against the current tree — the workflow's first signal, "stale references" |
> | An instruction to start every commit message with `ADD:` | **Contradictory convention** | Compare it with the `<type>: <description>` rule in `AGENTS.md` |
> | A model id that `docs/_meta/registry.yaml` no longer lists | **Retired model ID** | Check each model id against the `models:` block of the registry; the comment at the top of that block names the ids it dropped |

🖥️ **In your terminal, from the repository root:**

```bash
git worktree add ../drift-rehearsal -b scratch/drift-rehearsal &&
  cd ../drift-rehearsal &&
  copilot
```

> ⚠️ **If this block stops with an error, stop.** Each `&&` runs the next command only if the one before it worked, so Copilot starts only after the worktree exists *and* you are standing in it. Don't type `copilot` to get past an error: your next prompt writes a file into whichever checkout Copilot starts in, and that must never be your real one. A `../drift-rehearsal` folder or `scratch/drift-rehearsal` branch left over from an earlier attempt is the usual cause. From the repository root, run `git worktree remove --force ../drift-rehearsal`, then `git branch -d scratch/drift-rehearsal`, and paste the block again.

🖥️ **In Copilot CLI** — in this scratch checkout only, plant the three defects, then scan:

```
Create .github/skills/drift-rehearsal/SKILL.md with a name, a one-line
description and a short body that (1) tells the reader to read
.github/prompts/verify.prompt.md first, (2) says to start every commit
message with "ADD:", and (3) says to run on a model id that the comment
at the top of models: in docs/_meta/registry.yaml lists as dropped. Then act as
the drift evaluator described in .github/workflows/self-improving-agents.md,
scan only that skill, and do NOT fix anything: report which defect matches
which drift signal, and whether the workflow's five signals would have
caught it.
```

If the report misses one of the three, that is the lesson. The workflow's five signals never mention the registry, so whether a scan notices a retired model id depends on how it reads "stale references" — and widening the signals is a design change for a human, not something to automate unattended. When you are done, `/exit` Copilot and discard the scratch checkout:

```bash
cd -                                             # back to your real checkout
git worktree remove --force ../drift-rehearsal   # delete the scratch checkout
git branch -d scratch/drift-rehearsal            # delete the scratch branch
```

## 19.4 Trigger the Real Workflow

> ⚠️ **This step writes to GitHub.** `gh workflow run` starts a real Actions
> run that opens a draft PR on your own repository when the scan finds
> something to fix. Before you run it:
>
> - Work in a **fork you own**, from a clone of that fork — not the upstream
>   repository.
> - Enable GitHub Actions on the fork: a new fork starts with workflows
>   switched off, so open its **Actions** tab and enable them.
> - Run `gh repo set-default --view`. If it doesn't show your fork, run
>   `gh repo set-default` and choose it.
> - Make sure the fork has the `COPILOT_GITHUB_TOKEN` secret and the
>   **Allow GitHub Actions to create and approve pull requests** setting
>   from [Lab 08](lab08.md) §8.4.
>
> Teardown is at the end of this section.

🖥️ **In your terminal:**

```bash
gh workflow run self-improving-agents.lock.yml
```

Or wait for the schedule (see the `on.schedule` cron in the workflow
frontmatter — adjust the cadence for your own repo's pace of change).

🖥️ **In Copilot CLI:**

```
Watch the triggered run and report back once safe-outputs opens (or
skips) a pull request.
```

> 💡 **What you should see:** at most one **draft** PR, labeled
> `automated`, `self-improving-agents`, `needs-review` — never an
> auto-merged change. If the scan found nothing actionable, no PR opens at
> all; that's success, not failure.

> 🧹 **Teardown.** When you've seen the result, undo what this section left
> behind:
>
> - Close the draft PR and delete its branch. Find it with
>   `gh pr list --label self-improving-agents`, then run
>   `gh pr close <number> --delete-branch`.
> - If `git status --short` still shows the lock file modified, restore it as
>   in §19.2.
> - The workflow keeps running on its cron schedule in your fork. If you
>   don't want that, open the fork's **Actions** tab, select the workflow and
>   choose **⋯ → Disable workflow**.

## 19.5 Adapt It to Another Repo

Because the "Portability config" block in
`.github/workflows/self-improving-agents.md` is the only repo-specific
part, porting this workflow is mechanical:

🖥️ **Discuss/rehearse:**

```
If we wanted to install this same self-improving-agents workflow in a
different repo that keeps its custom agents in agents/ (not
.github/agents/) and has no eval-harness skill at all, what exactly
would we change, and what would the workflow do differently as a
result?
```

> 💡 **Expected answer:** update `agents_dir: agents/` in the portability
> config; since `eval_harness_dir` wouldn't resolve to anything, the
> workflow's §4 "contradicts eval-harness conventions" check should record
> that limitation in the report (per the workflow's own "Hard constraints"
> section) instead of failing or fabricating a rubric.

## 19.6 Package It as an Installable Plugin

The workflow above lives directly in this repo's `.github/workflows/`. If
you want the same drift-scanning logic available as an **installable
plugin** in any repo — with an interactive `/modernization-scan` prompt,
not just a scheduled workflow — see
[`modernization-bundle/`](../modernization-bundle/), which packages the
same scan logic (as a bundled agent + skill) using the Lab 11 plugin
template conventions.

```sh
node modernization-bundle/scripts/install.mjs   # expect ok=true
```

## 19.7 Check your work

✅ `gh aw compile self-improving-agents` finishes without errors, and you
checked `git status --short` afterwards so a regenerated lock file doesn't
linger in your working tree.

✅ You ran a local dry-run scan in Copilot CLI and reviewed its report
before triggering the real workflow.

✅ You rehearsed the scan against three planted drift signals in a throwaway
worktree — never on `main` — and then removed the worktree and its scratch
branch.

✅ You can name the two files this workflow is explicitly forbidden from
editing — `.github/workflows/self-improving-agents.md` and its compiled
`.lock.yml` — and explain why (self-privilege-escalation risk).

✅ You can name the three things a real run of this workflow is allowed to
do (apply a mechanical fix in the draft PR, flag a design-level finding in
the report, log a limitation) and the two things it must never do (delete an
agent/skill, edit itself).

## 19.8 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Not an official feature** | This is a DIY gh-aw pattern you assemble from agents + skills + gh-aw, not a GitHub product |
| **Bounded scope** | Mechanical fixes only; anything design-level is flagged in the report for a human, not edited |
| **Self-exclusion** | The workflow can never edit its own `.md`/`.lock.yml` — prevents privilege escalation |
| **Portability** | One "Portability config" block at the top makes it reusable across repos |
| **Draft-only PRs** | Never auto-merges; always requires human review |

</details>

**Next:** [Lab 20 — Enterprise Token Optimization & Reporting](lab20.md)
