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
requests**, with **Copilot Code Review** (Lab 09) automatically reviewing
every layer before the next one is built on top of it.

> ⏱️ Presenter pace: 8 minutes | Self-paced: 30 minutes

> 💡 **Why this lab exists:** Labs 08 and 09 taught PRD generation and
> code review as isolated capabilities. In practice, a well-specified
> feature often touches many files — a busy PR is hard to review well, and
> a reviewer (human or Copilot) does a better job on five focused 200-line
> PRs than one 2,000-line PR. This lab shows the pattern for keeping
> spec-driven work reviewable at scale.

References:
- [GitHub Spec Kit](https://github.com/github/spec-kit) — official spec-driven development toolkit
- [About Copilot Coding Agent](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-coding-agent)
- [About Copilot Code Review](https://docs.github.com/en/copilot/concepts/agents/code-review)
- [Lab 08 — GitHub Agentic Workflows: PRD Generation](lab08.md)
- [Lab 09 — Copilot Coding Agent & Code Review](lab09.md)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — `gh_aw_schema_version`

## 18.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

## 18.1 Write a Spec, Not Just an Issue

**GitHub Spec Kit** is the official toolkit for spec-driven development: it
gives you a repeatable structure (`/constitution`, `/specify`, `/plan`,
`/tasks`, `/implement` slash commands in supported agent CLIs) for turning
an idea into an unambiguous, testable specification *before* any code gets
written — the opposite of "open an issue and hope the agent infers the
details."

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

Lab 08's `generate-prd.md` gh-aw workflow already turns a feature-branch
push into a PRD issue. Feed it your spec instead of a one-line branch name
so the generated PRD inherits your acceptance criteria verbatim rather than
inferring them:

🖥️ **In your terminal:**

```bash
git checkout -b feature/course-prerequisites
git add docs/specs/course-prerequisites.md
git commit -m "docs: add course-prerequisites spec"
git push -u origin feature/course-prerequisites
```

The `generate-prd` workflow picks up the branch push and opens a PRD issue.
Because your spec already has explicit acceptance criteria, the generated
PRD should be materially more precise than the Lab 08 walkthrough's
one-line branch name — compare the two if you still have your Lab 08 PRD.

> 💡 If your gh-aw setup gains `safe-outputs.steer` in a future schema
> revision (a mechanism for the workflow to open a feedback issue *before*
> creating a PR, so a human can redirect scope early), that's the natural
> place to catch a spec/PRD mismatch before any code gets written. Check
> `.github/workflows/generate-prd.md`'s current `safe-outputs:` block to
> see what's live in this repo today.

## 18.3 When One Spec Produces Too Much Change for One PR

The course-prerequisites spec above touches at minimum: the `Course` model
(new `Prerequisites` collection), a migration, `CourseRepository` (cycle
detection), `EnrollmentService` (validation), the enrollment view (error
messaging), and tests for all of the above. That's a lot of surface for one
PR to land safely and for one reviewer — human or Copilot — to review well.

**Stacked pull requests** solve this: instead of one PR with every change,
you build a **bottom-to-top chain of small, ordered PRs**, where each PR
targets the branch immediately below it (not `main`), and the bottom PR
targets your real base. GitHub's native Stacks feature then gives you:

- **Stack navigation** in the PR UI — jump between layers, see the whole
  chain.
- **Cascading merge** — merging the bottom PR automatically retargets the
  PR above it onto the real base.
- **Server-side rebase** — a "Rebase Stack" action that rebases every
  upper layer after a lower one changes, without you doing it by hand.

A layering for the course-prerequisites spec:

| Layer | Branch | Scope |
|-------|--------|-------|
| 1 (bottom) | `feature/course-prereqs-model` | `Course.Prerequisites` model + EF migration only |
| 2 | `feature/course-prereqs-cycle-detection` | `CourseRepository` cycle-detection logic, built on layer 1 |
| 3 | `feature/course-prereqs-validation` | `EnrollmentService` validation + error messaging, built on layer 2 |
| 4 (top) | `feature/course-prereqs-tests` | Full test suite covering layers 1-3 together |

Each layer is small enough to review in a few minutes, and each depends
only on the layer directly below it — not on later layers.

🖥️ **In your terminal — build the chain:**

```bash
# Layer 1: bottom of the stack, targets your real base
git checkout -b feature/course-prereqs-model main
# ... implement the model + migration ...
git add dotnet/ContosoUniversity/Models/Course.cs
git commit -m "feat: add Course.Prerequisites model and migration"
git push -u origin feature/course-prereqs-model
gh pr create --base main --head feature/course-prereqs-model \
  --title "Course prerequisites: model + migration"

# Layer 2: targets layer 1's branch, NOT main
git checkout -b feature/course-prereqs-cycle-detection feature/course-prereqs-model
# ... implement cycle detection ...
git add dotnet/ContosoUniversity/Data/CourseRepository.cs
git commit -m "feat: add prerequisite cycle detection"
git push -u origin feature/course-prereqs-cycle-detection
gh pr create --base feature/course-prereqs-model \
  --head feature/course-prereqs-cycle-detection \
  --title "Course prerequisites: cycle detection"

# ...repeat for layers 3 and 4, each based on the layer below...
```

> 💡 **Register the stack** (optional but recommended once every layer's PR
> is open) so GitHub's UI shows the chain and enables cascading merge:
>
> ```bash
> gh api --method POST 'repos/{owner}/{repo}/stacks' \
>   -F 'pull_requests[]=<layer-1-pr-number>' \
>   -F 'pull_requests[]=<layer-2-pr-number>' \
>   -F 'pull_requests[]=<layer-3-pr-number>' \
>   -F 'pull_requests[]=<layer-4-pr-number>'
> ```

> ⚠️ **Rules of thumb for stacking:**
> - Only stack when the work is *genuinely* dependent — layer 2 must not
>   compile/pass without layer 1. If two changes are independent, open two
>   ordinary PRs instead; don't force a stack.
> - Keep git mutations (rebase, force-push) inside the session/branch that
>   owns that layer. Never rebase a layer you don't own from elsewhere —
>   you'll race whoever is actively working on it.
> - After a lower layer changes (review feedback, a rebase), use GitHub's
>   **Rebase Stack** action (or rebase upper branches bottom-to-top
>   yourself) before continuing — don't let layers silently drift out of
>   sync with what's below them.

## 18.4 Copilot Code Review on Every Layer

This is the piece that closes the loop with Lab 09: **each PR in the
stack gets its own automatic Copilot Code Review**, exactly as in Lab 09,
because each stack layer is an ordinary PR — Code Review doesn't know or
care that it's part of a stack.

The payoff is bigger than in a single-PR flow:

- **Layer 1's review is a fast, focused pass** on just the model + migration
  — a reviewer (human or Copilot) isn't distracted by validation logic three
  layers up that hasn't even been reviewed yet.
- **A concern caught in layer 1's review is fixed before layer 2 is even
  built on top of it** — you're not discovering "actually the model shape
  is wrong" after three more layers of code already assume the old shape.
- **The stack's cascading merge only proceeds through layers that passed
  review** — you get a natural gate: don't build layer 3 until layer 2's
  Code Review feedback is addressed and merged (or at minimum, approved).

🖥️ **In your terminal — observe/rehearse:**

```
For each of the four course-prerequisites stack layers, once its PR is
open, wait for Copilot Code Review to complete, then summarize:
what did it flag (if anything), and did addressing that feedback change
what the next layer up needed to do?
```

> 💡 **What you should see:** Code Review's findings on layer 1 (e.g. "this
> migration doesn't handle a null Prerequisites collection on existing
> rows") are the kind of thing you want caught before layer 2's cycle-
> detection code is written against an assumed shape. This is the concrete
> reason "review per layer" beats "review the whole 2,000-line PR at the
> end" — earlier, smaller feedback loops.

## 18.5 Check your work

✅ You wrote a spec with explicit acceptance criteria before writing any
implementation code.

✅ You fed that spec into the Lab 08 PRD-generation workflow and compared
the resulting PRD's precision to a spec-less run.

✅ You built at least a 2-layer PR stack where the upper layer's base is
the lower layer's branch, not `main`.

✅ You confirmed Copilot Code Review ran independently on each layer, and
can name one piece of feedback that would have been harder to act on if
all layers had been one giant PR.

## 18.6 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Spec-first** | Explicit acceptance criteria before any code, using GitHub Spec Kit conventions |
| **Spec → PRD** | Feed the spec into Lab 08's `generate-prd` workflow for a precise, non-inferred PRD |
| **Stacked PRs** | Bottom-to-top chain of small PRs; each targets the branch below it, not the ultimate base |
| **Cascading merge** | Merging a lower layer automatically retargets the layer above it |
| **Code Review per layer** | Each stack layer is an ordinary PR — Copilot Code Review runs on every one independently |
| **Why it matters** | Catches problems in early layers before later layers are built on a wrong assumption |

</details>

**Next:** [Lab 19 — Self-Improving Agents & Skills (gh-aw Template)](lab19.md)
