---
title: "Spec-Driven Design, Stacked PRs & Code Review in the Loop"
lab_number: 18
pace:
  presenter_minutes: 8
  self_paced_minutes: 30
registry: docs/_meta/registry.yaml
---

# 18 — Spec-Driven Design, Stacked PRs & Code Review in the Loop

This lab closes the modernization arc: you'll write a **spec** (not a
vague issue), turn it into a gh-aw-driven PRD (extending Lab 08), then —
because a real spec usually produces more change than fits comfortably in
one PR — split the implementation into a **stack of small, ordered pull
requests**, with **Copilot Code Review** (Lab 09) reviewing each layer, on
request, before the next one is built on top of it.

**Prerequisites:** finish [Lab 08](lab08.md) and [Lab 09](lab09.md) first,
and work in a **fork you own** with GitHub Actions enabled. §18.2 relies on
Lab 08's workflow, and a stack has to live in a single repository
(cross-fork stacks aren't supported), so every branch and pull request in
this lab stays inside your fork. §18.2–§18.4 write to GitHub — branches,
pull requests, a stack, a workflow run and review requests — so §18.5 ends
with a **Clean up** step that removes them.

> ⏱️ Presenter pace: 8 minutes | Self-paced: 30 minutes

> 💡 **Why this lab exists:** Labs 08 and 09 taught PRD generation and
> code review as isolated capabilities. In practice, a well-specified
> feature often touches many files — a busy PR is hard to review well, and
> a reviewer (human or Copilot) does a better job on five focused 200-line
> PRs than one 2,000-line PR. This lab shows the pattern for keeping
> spec-driven work reviewable at scale.

References:
- [GitHub Spec Kit](https://github.com/github/spec-kit) — official spec-driven development toolkit
- [Spec Kit integrations reference](https://github.github.io/spec-kit/reference/integrations.html) — the `/speckit-*` command names for Copilot
- [GitHub Copilot on GitHub.com](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github) — Copilot on GitHub.com, including the cloud (coding) agent
- [About Copilot Code Review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [About stacked pull requests](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs)
- [Stacked pull requests: APIs and webhooks](https://docs.github.com/en/pull-requests/reference/stacked-pull-requests-apis-and-webhooks)
- [REST API endpoints for stacked pull requests](https://docs.github.com/en/rest/pulls/stacks)
- [Lab 08 — GitHub Agentic Workflows: PRD Generation](lab08.md)
- [Lab 09 — Copilot Coding Agent & Code Review](lab09.md)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — `gh_aw_schema_version`

## 18.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

## 18.1 Write a Spec, Not Just an Issue

**GitHub Spec Kit** is the official toolkit for spec-driven development: it
gives you a repeatable structure (`/speckit-constitution`,
`/speckit-specify`, `/speckit-plan`, `/speckit-tasks` and
`/speckit-implement`) for turning an idea into an unambiguous, testable
specification *before* any code gets written — the opposite of "open an
issue and hope the agent infers the details."

Those are the command names in GitHub Copilot's default (skills) mode, and
you invoke them inside your coding agent's chat, not in a shell. Don't
confuse them with Copilot CLI's own `/plan` and `/tasks` commands, which
are separate. Spec Kit's
[integrations reference](https://github.github.io/spec-kit/reference/integrations.html)
also writes the commands in dotted form (for example `/speckit.specify`).

A good spec for this exercise, added to ContosoUniversity:

```markdown
## Spec: Course Prerequisite Enforcement

### Problem
Students can enroll in courses without meeting prerequisite requirements.

### Acceptance Criteria
- A Course can declare zero or more prerequisite Courses.
- Enrollment is blocked (with a clear validation error) if the student
  has not completed all prerequisites.
- Existing enrollments are unaffected (no retroactive validation).
- Prerequisite chains must not allow cycles (Course A requires B requires A).

### Out of scope
- Prerequisite override/waiver workflow (future spec).
- Cross-department prerequisite equivalency mapping.
```

🖥️ **In your terminal:**

```
Using GitHub Spec Kit conventions (or your own acceptance-criteria-first
template if Spec Kit isn't installed), write a spec for course
prerequisite enforcement in ContosoUniversity. Save it to
docs/specs/course-prerequisites.md.
```

## 18.2 Spec → PRD Pipeline (Extends Lab 08)

Lab 08's `.github/workflows/generate-prd.md` gh-aw workflow fires when a
**new** `feature/` or `story/` branch is created (not on every push) and
opens a PRD **pull request** — title prefix `[prd]`, labels `prd` and
`ai-generated` — containing a `PRD-{branch-name}.md` document under
`docs/prd/`. Create a branch that carries your spec and see what the
workflow makes of it:

🖥️ **In your terminal:**

```bash
git checkout -b feature/course-prerequisites
git add docs/specs/course-prerequisites.md
git commit -m "docs: add course-prerequisites spec"
git push -u origin feature/course-prerequisites
```

The `generate-prd` workflow picks up the new branch and opens a `[prd]`
pull request. (If none appears, check the run in your fork's **Actions**
tab — as in Lab 08, the fork needs **Allow GitHub Actions to create and
approve pull requests** turned on for the workflow to open the PR.)

Be clear about what the workflow reads: the **branch name**, the body of
any open issue that matches it, and its own analysis of the codebase. It
does **not** read your spec file, so your acceptance criteria are not
copied into the PRD — its criteria are the workflow's own synthesis. That
makes the PRD an independent check on your spec: put your spec's
acceptance criteria next to the PRD's **Acceptance Criteria** and mark each
one **covered**, **changed** or **missing**, and note anything the PRD adds
that your spec never asked for. (For your criteria to reach the workflow
they would have to be in the body of an open issue that matches the branch
name.)

> 💡 If your gh-aw setup gains `safe-outputs.steer` in a future schema
> revision (a mechanism for the workflow to open a feedback issue *before*
> creating a PR, so a human can redirect scope early), that's the natural
> place to catch a spec/PRD mismatch before any code gets written. Check
> `.github/workflows/generate-prd.md`'s current `safe-outputs:` block to
> see what's live in this repo today — right now it configures
> `create-pull-request`, which is why the PRD arrives as a pull request.

## 18.3 When One Spec Produces Too Much Change for One PR

The course-prerequisites spec above touches at minimum: the `Course` model
(new `Prerequisites` collection) and its schema, prerequisite cycle
detection, enrollment validation with clear error messaging, and tests for
all of the above. That's a lot of surface for one PR to land safely and for
one reviewer — human or Copilot — to review well.

**Stacked pull requests** solve this: instead of one PR with every change,
you build a **bottom-to-top chain of small, ordered PRs**, where each PR
targets the branch immediately below it (not `main`), and the bottom PR
targets your real base. GitHub's native
[stacked pull requests](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs)
feature then gives you:

- **Stack navigation** in the PR UI — a layer number at the top of each
  pull request and a stack map in the merge box that shows every layer and
  its status.
- **Cascading merge** — merging a stacked PR merges every PR below it as
  well, up to and including the one you request, atomically (all of them or
  none, per the
  [APIs and webhooks reference](https://docs.github.com/en/pull-requests/reference/stacked-pull-requests-apis-and-webhooks)).
  PRs above it stay open and re-target the stack's base branch, and merging
  the top PR lands the whole stack at once.
- **Server-side rebase** — you can trigger a server-side cascading rebase
  from the pull request instead of rebasing every upper layer by hand, and
  when the bottom PR merges, GitHub rebases the remaining branches so the
  next PR targets the default base.

Merging through the API works differently: a stack can't be merged with the
legacy synchronous merge endpoints, so use the asynchronous one ("Merge a
pull request asynchronously" in the
[REST reference](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request-asynchronously)).

A layering for the course-prerequisites spec:

| Layer | Branch | Scope |
|-------|--------|-------|
| 1 (bottom) | `feature/course-prereqs-model` | `Course.Prerequisites` model + schema change only |
| 2 | `feature/course-prereqs-cycle-detection` | Prerequisite cycle-detection logic, built on layer 1 |
| 3 | `feature/course-prereqs-validation` | Enrollment validation + error messaging, built on layer 2 |
| 4 (top) | `feature/course-prereqs-tests` | Full test suite covering layers 1-3 together |

Each layer is small enough to review in a few minutes, and each depends
only on the layer directly below it — not on later layers.

There is no per-entity course repository for layer 2 to extend:
`CoursesController` works through the generic `IRepository<Course>`,
implemented by `Repository<T>` in
`dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs`, so that is
where layer 2 starts.

Keep every branch and pull request inside your fork — stacks can't span
forks. A clone of a fork can leave `gh` pointed at the original repository,
so run `gh repo set-default --view` first (the Lab 09 §9.4 tip) and check
that it shows your fork before you run `gh pr create` or `gh api` below.

Expect extra pull requests while you build: Lab 08's workflow fires on
every new `feature/` branch, so each layer branch you push below can also
make it open its own `[prd]` pull request, just as the spec branch did.
Those aren't layers of your stack — you'll close them in **Clean up**.

🖥️ **In your terminal — build the chain:**

```bash
# Layer 1: bottom of the stack, targets your real base
git checkout -b feature/course-prereqs-model main
# ... implement the model + schema change ...
git add dotnet/ContosoUniversity.Core/Models/Course.cs   # plus any other file you changed
git commit -m "feat: add Course.Prerequisites model and schema change"
git push -u origin feature/course-prereqs-model
gh pr create --base main --head feature/course-prereqs-model \
  --title "Course prerequisites: model + schema change" \
  --body "Layer 1 of the course-prerequisites stack."

# STOP: review layer 1 now (§18.4) and address what comes back, before layer 2
# exists to assume its shape. Building a layer on an unreviewed one below it is
# the mistake this lab exists to prevent.

# Layer 2: targets layer 1's branch, NOT main
git checkout -b feature/course-prereqs-cycle-detection feature/course-prereqs-model
# ... implement cycle detection ...
git add dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs   # plus any other file you changed
git commit -m "feat: add prerequisite cycle detection"
git push -u origin feature/course-prereqs-cycle-detection
gh pr create --base feature/course-prereqs-model \
  --head feature/course-prereqs-cycle-detection \
  --title "Course prerequisites: cycle detection" \
  --body "Layer 2 of the course-prerequisites stack."

# Review layer 2 the same way before going any further. Two layers is enough to
# see the pattern; layers 3 and 4 repeat these same steps, each based on the
# layer below, if you want the full stack.
```

> 💡 **Register the stack** (optional but recommended once every layer's PR
> is open) so GitHub treats the PRs as one stack — the navigation, stack
> map and cascading merge described above. List them bottom to top
> (`gh pr list` shows the numbers — the layer PRs are the ones without the
> `[prd]` prefix); the call only succeeds if each PR's base branch is the
> previous PR's head branch, which is how the chain above was built:
>
> ```bash
> gh api --method POST 'repos/{owner}/{repo}/stacks' \
>   -F 'pull_requests[]=<layer-1-pr-number>' \
>   -F 'pull_requests[]=<layer-2-pr-number>'
> # ...plus one -F line per further layer, if you built layers 3 and 4
> ```

> ⚠️ **Rules of thumb for stacking:**
> - Only stack when the work is *genuinely* dependent — layer 2 must not
>   compile/pass without layer 1. If two changes are independent, open two
>   ordinary PRs instead; don't force a stack.
> - Keep git mutations (rebase, force-push) inside the session/branch that
>   owns that layer. Never rebase a layer you don't own from elsewhere —
>   you'll race whoever is actively working on it.
> - After a lower layer changes (review feedback, a rebase), trigger a
>   server-side cascading rebase from the pull request (or rebase upper
>   branches bottom-to-top yourself) before continuing — don't let layers
>   silently drift out of sync with what's below them.

## 18.4 Copilot Code Review on Every Layer

This is the piece that closes the loop with Lab 09: **each PR in the
stack can get its own Copilot Code Review**, because each stack layer is
an ordinary PR — Code Review doesn't know or care that it's part of a
stack.

Copilot only reviews a pull request when it is asked to — by an
automatic-review setting (like the ruleset you created in Lab 09 §9.2) or
by you. Lab 09's §9.12 clean-up deletes or disables that ruleset, so
unless you left it on, reviews won't appear on their own here.

🌐 **On GitHub:** on each layer's pull request, open **Reviewers** in the
right sidebar and click **Request** next to **Copilot** — the manual route
from [Lab 09](lab09.md). Copilot won't re-review commits you push later on
its own; click the circular-arrow **Re-request review** button next to
Copilot's name in the same menu.

(You can turn automatic review back on instead — the
[configure code review how-to](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review)
walks through it, including the **Review new pushes** option — but a
ruleset only covers the branches it targets, and layers 2–4 target feature
branches rather than your default branch, so it may not cover them. If you
re-create the ruleset, delete or disable it again in **Clean up**.)

The payoff is bigger than in a single-PR flow:

- **Layer 1's review is a fast, focused pass** on just the model + schema
  change — a reviewer (human or Copilot) isn't distracted by validation
  logic three layers up that hasn't even been reviewed yet.
- **A concern caught in layer 1's review is fixed before layer 2 is even
  built on top of it** — you're not discovering "actually the model shape
  is wrong" after three more layers of code already assume the old shape.
- **Your branch's merge requirements are the gate, not Copilot's review** —
  a stack enforces the base branch's merge requirements (such as required
  approvals) on every PR in it, even mid-stack, and CI runs on all of them
  ([rules and CI enforcement](https://docs.github.com/en/pull-requests/get-started/about-stacked-prs#rules-and-ci-enforcement)).
  By default Copilot's reviews
  [don't count toward required approvals](https://docs.github.com/en/copilot/concepts/agents/code-review#copilot-approvals),
  so treat its review as advice and require a human approval if you want a
  real gate: don't build layer 3 until layer 2's feedback is addressed and
  its PR is approved.

🖥️ **In your terminal — observe/rehearse:**

```
For each course-prerequisites stack layer you built, once its PR is
open and I've requested Copilot as a reviewer on it, wait for Copilot
Code Review to complete, then summarize: what did it flag (if anything),
and did addressing that feedback change what the next layer up needed to
do?
```

> 💡 **What you should see:** Code Review's findings on layer 1 (e.g. "this
> schema change doesn't say what happens to existing courses that have no
> prerequisites") are the kind of thing you want caught before layer 2's
> cycle-detection code is written against an assumed shape. This is the
> concrete reason "review per layer" beats "review the whole 2,000-line PR
> at the end" — earlier, smaller feedback loops.

## 18.5 Check your work

✅ You wrote a spec with explicit acceptance criteria before writing any
implementation code.

✅ You created a new branch carrying that spec, let the Lab 08
PRD-generation workflow open its `[prd]` pull request, and compared the
PRD's acceptance criteria with your spec's — each one covered, changed or
missing.

✅ You built at least a 2-layer PR stack where the upper layer's base is
the lower layer's branch, not `main`.

✅ You requested Copilot Code Review on each layer you built, saw it run
independently on each one, and can either name one piece of feedback that
would have been harder to act on if all layers had been one giant PR, or —
if a review came back clean — say which risk the smaller layer made easier
to inspect.

### Clean up

§18.2–§18.4 left these on your fork; remove them before you move on:

- the spec branch `feature/course-prerequisites` (it has no pull request)
- each layer branch and its open pull request
- every `[prd]` pull request the workflow opened — it runs for each new
  `feature/` branch, so pushing the layer branches can open more than one
- the stack, if you registered it
- the Lab 09 ruleset, if you turned automatic review back on

🖥️ **In your terminal:**

```bash
git checkout main

# Find your stack's number and dissolve it (skip these two commands if you
# never registered a stack)
gh api 'repos/{owner}/{repo}/stacks' --jq '.[].number'
gh api --method POST 'repos/{owner}/{repo}/stacks/<STACK_NUMBER>/unstack'

# List your open pull requests to get their numbers
gh pr list

# Close each layer's PR, top layer first, deleting its branch too
gh pr close <PR_NUMBER> --delete-branch

# Close every [prd] PR the same way
gh pr close <PRD_PR_NUMBER> --delete-branch

# The spec branch has no PR, so delete its remote branch directly
git push origin --delete feature/course-prerequisites
```

Close the layer pull requests top layer first, so you never delete a branch
that another open pull request is still based on. `--delete-branch` removes
a pull request's branch from your fork and any local copy of it, which is
why the block starts on `main`. The spec branch's local copy — and the spec
on it — stays until you delete it yourself. If you re-created Lab 09's
ruleset, delete or disable it again the way [Lab 09](lab09.md)'s clean-up
does.

## 18.6 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Spec-first** | Explicit acceptance criteria before any code, using GitHub Spec Kit conventions |
| **Spec → PRD** | A new branch triggers Lab 08's `generate-prd` workflow, which opens a PRD pull request from the branch name, any matching issue and its own codebase analysis — not from your spec file — so it works as an independent check on your acceptance criteria |
| **Stacked PRs** | Bottom-to-top chain of small PRs; each targets the branch below it, not the ultimate base |
| **Cascading merge** | Merging a stacked PR merges every PR below it, up to and including the one you request, atomically; the PRs above stay open and re-target the stack's base branch |
| **Code Review per layer** | Each layer is an ordinary PR, so request Copilot Code Review on each one (or turn automatic review back on); it's advice — branch protection with human approvals is the real gate |
| **Why it matters** | Catches problems in early layers before later layers are built on a wrong assumption |

</details>

**Next:** [Lab 19 — Self-Improving Agents & Skills (gh-aw Template)](lab19.md)
