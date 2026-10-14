# Lab spec — `labs/lab18.md`

| | |
|---|---|
| **Lab** | `labs/lab18.md` (201 lines, 11.4 KB) — "Spec-Driven Design, Stacked PRs & Code Review in the Loop" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 18 closes the modernization arc: write a real spec, feed it to Lab 08's PRD workflow,
then split the resulting work into a bottom-to-top stack of small ordered PRs so Copilot
Code Review (Lab 09) can review each layer before the next is built on it. The teaching
idea is that **reviewability is a function of PR size, and stacking is how you keep a
large spec reviewable**.

After the refresh the lab teaches the same thing, with its GitHub Stacks claims **cited to
GitHub's own documentation** and described the way that documentation describes them — in
particular the cascading-merge semantics, which the lab currently gets wrong. Every
ContosoUniversity path it tells a learner to `git add` resolves. No section is added or
reordered.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — a terminal for `git`/`gh`, and `github.com` for the PR UI, stack navigation, cascading merge and Copilot Code Review. |
| **Tier** | `advanced` |
| **Presenter minutes** | 8 (unchanged) |
| **Self-paced minutes** | 30 (unchanged) |
| **Prerequisites** | Lab 08 (the `generate-prd` gh-aw workflow §18.2 feeds) and Lab 09 (Copilot Code Review, which §18.4 depends on entirely). Both are load-bearing, not courtesy references — the lab's own subtitles say "Extends Lab 08" and "closes the loop with Lab 09". A fork the learner can push branches to is also required. |
| **Write steps** | **Yes — this is the most write-heavy lab in the batch, and every write is GitHub-side.** (a) `git checkout -b` ×5, `git commit` ×5. (b) `git push -u origin` ×5 — creates remote branches. (c) `gh pr create` ×4 — opens four pull requests. (d) `gh api --method POST .../stacks` — creates a PR stack. (e) Triggers the `generate-prd` workflow, which opens an issue. (f) Triggers Copilot Code Review on four PRs. See §7. |
| **`lab-forge` verdict** | **`run with §7 fenced`.** The edit is prose, citations and paths; none of it requires pushing a branch or opening a PR. **Every command in §7 is a remote write and the run gate must execute none of them.** Reads (`npm test`, `npx vitest`, `gh --version`, `gh pr --help`, file reads) are outside §7 and may be executed. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | Every `##` section heading is numbered `18.<n>`, uniquely | `npx vitest run tests/lab-structure/lab18-contract` |
| AC5 | Every backticked `dotnet/`, `node/`, `docs/` or `.github/` path in the lab resolves on disk | `npx vitest run tests/lab-structure/lab18-contract` |
| AC6 | §18.3 cites GitHub's stacked-pull-request documentation by URL | `npx vitest run tests/lab-structure/lab18-contract` |
| AC7 | The cascading-merge description matches the cited source — merging a stacked PR merges every PR **up to and including** the one requested, atomically — and does **not** claim merging the bottom PR "retargets" the PR above it | `npx vitest run tests/lab-structure/lab18-contract` |
| AC8 | The lab notes that merging a stack via the API requires the asynchronous merge endpoint | `npx vitest run tests/lab-structure/lab18-contract` |
| AC9 | The lab invents no `gh` stack subcommand — no `gh pr stack`, `gh stack` | `npx vitest run tests/lab-structure/lab18-contract` |
| AC10 | The lab names the GitHub-side artifacts it creates and tells the learner how to clean them up | `npx vitest run tests/lab-structure/lab18-contract` |
| AC11 | Frontmatter, registry and the inline `⏱️` callout state the same pacing numbers | `npx vitest run tests/lab-structure/lab18-contract` |

## 4. Outside-world claims

> §18.3 is the one place in this batch where a lab asserts product behaviour that **no file
> in this repo can settle**. It was checked against GitHub's own documentation directly —
> not against a search summary — before any criterion above was written.

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | "GitHub's native Stacks feature" exists | **verified against primary source** | `https://docs.github.com/en/pull-requests/reference/stacked-pull-requests-apis-and-webhooks` — "The GitHub REST and GraphQL APIs both expose stacked pull requests… The Stacks API. A dedicated set of endpoints to list, read, create, extend, and dissolve stacks." Claim stands; it is **uncited in the lab**, which is the defect (D1). |
| C2 | `POST /repos/{owner}/{repo}/stacks` with `pull_requests[]` body | **verified against primary source** | `https://docs.github.com/en/rest/pulls/stacks` — "Create a pull request stack … `POST /repos/{owner}/{repo}/stacks` … Creates a stack from an ordered list of pull request numbers. Provide the pull request numbers from the bottom of the stack to the top. Each pull request's base ref must match the previous pull request's head ref." Body parameter is `pull_requests` (array of integers), required. The lab's `gh api --method POST … -F 'pull_requests[]=<n>'` is correct. **Leave the command alone.** |
| C3 | "**Cascading merge** — merging the bottom PR automatically retargets the PR above it onto the real base" | **CONTRADICTED by primary source** | The cited reference says something materially different: "When you merge a stacked pull request, every pull request in the stack **up to and including the one you request** is merged or queued to merge into the base branch… A stack merge request is atomic, meaning either the whole group of pull requests merges, or is added to the merge queue, or none of it is." That is a cascade *of merges*, not a *retarget*. Rewrite the bullet. See D2. |
| C4 | "**Server-side rebase** — a 'Rebase Stack' action that rebases every upper layer" | `free-check` against the cited docs — **keep, but do not over-claim** | The stacked-PR reference documents REST/GraphQL/webhook surfaces and the merge semantics; it does not describe a "Rebase Stack" button in the text verified here. The behaviour is plausible and the lab does not depend on it. Either cite the GitHub docs page that states it, or soften to the stack-aware rebase the lab actually needs. **Do not assert a named UI button without a source.** |
| C5 | "**Stack navigation** in the PR UI" | `free-check` — incidental | Harmless and not load-bearing. Keep or cut; do not research. |
| C6 | `gh api` is the right tool to register a stack | `free-check` — **correct for the installed `gh`** | `gh --version` → 2.83.1. `gh pr --help` lists **no** `stack` subcommand and `gh stack` returns `unknown command "stack" for "gh"`. The raw `gh api` call is therefore the only way to do this from `gh` today. **Do not "modernize" it into a `gh pr stack` command that does not exist.** |
| C7 | GitHub Spec Kit provides `/constitution`, `/specify`, `/plan`, `/tasks`, `/implement` | `free-check` — incidental, already hedged | The lab already says "or your own acceptance-criteria-first template if Spec Kit isn't installed", so nothing depends on the command list. Leave it. |
| C8 | `dotnet/ContosoUniversity/Models/Course.cs`, `dotnet/ContosoUniversity/Data/CourseRepository.cs` | `free-check` — **neither exists** | Real paths: `dotnet/ContosoUniversity.Core/Models/Course.cs`; there is **no** `CourseRepository` — the solution has `dotnet/ContosoUniversity.Core/Interfaces/IRepository.cs` and `dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs`. The projects are `ContosoUniversity.Core` / `.Infrastructure` / `.Web`, not a single `ContosoUniversity`. |
| C9 | `safe-outputs.steer` "in a future schema revision" (§18.2) | **keep as written** | Explicitly framed as hypothetical and conditional, and it points the learner at `.github/workflows/generate-prd.md` to check what is actually live. That is the correct way to write about an unshipped feature. Do not remove it and do not promote it to fact. |

> No `research` disposition. C1–C3 were resolved by opening GitHub's documentation
> directly, which costs one fetch, not a `spec-forge` run.
> **Do not commission a `spec-forge` run for this lab.**

## 5. Non-goals

- Do not replace the `gh api` stack-registration command with a `gh` subcommand. See C6 —
  `gh` 2.83.1 has none, and inventing one would break the lab for every learner.
- Do not turn §18.3 into a GitHub Stacks API reference. The lab needs enough to build and
  register a four-layer stack and a citation for the rest.
- Do not expand the course-prerequisites spec, the layer table, or the worked example.
- Do not change the declared pacing (8 / 30).
- Do not edit `.github/workflows/generate-prd.md` or anything in Lab 08 / Lab 09.
- Do not add the cleanup partial. AC10 wants a short, specific note about the branches,
  PRs, stack and PRD issue this lab creates on GitHub — `docs/_partials/cleanup.md` sweeps
  *local* state and would not address any of them.
- `docs/_partials/currency.md` is **not** included by this lab; the §18.0 stub is the lab's
  own. Leave it alone.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §18.3 (L~128–160) | The entire native-Stacks section — the feature, the UI affordances and a REST endpoint — is asserted with **no citation at all**. The claims happen to be true (verified: C1, C2), which makes this more dangerous, not less: a learner has no way to check, and the one sentence that is wrong (D2) sits among correct ones. Add the two doc links to the References block and/or inline in §18.3. |
| D2 | §18.3, "Cascading merge" bullet | **Factually wrong.** The lab says merging the bottom PR "automatically retargets the PR above it onto the real base". GitHub's documentation says merging a stacked PR merges *every* PR in the stack up to and including the requested one, atomically — all merge, or all queue, or none. Retargeting and cascade-merging are different behaviours and a learner planning a merge order on the lab's version will be surprised. Rewrite to match the source. |
| D3 | §18.3 code block | `git add dotnet/ContosoUniversity/Models/Course.cs` and `git add dotnet/ContosoUniversity/Data/CourseRepository.cs` — **neither path exists.** The solution is split into `ContosoUniversity.Core` / `.Infrastructure` / `.Web`. `Course.cs` lives at `dotnet/ContosoUniversity.Core/Models/Course.cs`; there is no `CourseRepository` at all. A learner copy-pasting gets `fatal: pathspec … did not match any files` on the first layer of the stack. Use real paths, and pick a real repository type for layer 2's scope. |
| D4 | §18.3 / §18.4 | The lab never mentions that merging a stack through the API requires the **asynchronous** merge endpoint. The cited source flags this as an `[!IMPORTANT]`: "If you merge via the API and want to use stacked pull requests, you must use the new asynchronous merge API… A stack cannot be merged with the legacy synchronous merge endpoints or mutations." The lab teaches API-driven stack creation and then merging, so this belongs in it. One sentence. |
| D5 | §18.3, "Server-side rebase" bullet | Names a "**Rebase Stack**" action as an existing UI affordance with no source. Either cite the page that documents it or soften it. See C4 — an uncited named button is the same defect class as D1, just smaller. |
| D6 | whole lab | No cleanup. The lab leaves five remote branches, four open PRs, a registered stack and a generated PRD issue on the learner's fork, and never says so. Add a short teardown listing them (close the PRs, delete the branches, dissolve the stack, close the PRD issue). Keep it brief — see §5. |
| D7 | §18.0 | The currency block is a two-line stub, not the shared partial and not a table, unlike the ten labs that include `docs/_partials/currency.md`. It is **not wrong** — it names no command, so it cannot contradict the partial, and it does link the registry. Recorded so a later consistency pass can decide; **out of scope here** (see §5). |

## 7. Out of scope for `lab-forge`

Every item below writes to GitHub. The run gate must report each UNVERIFIED and execute
none:

- `git push -u origin feature/course-prerequisites` and the four
  `git push -u origin feature/course-prereqs-*` commands.
- All four `gh pr create …` invocations.
- `gh api --method POST 'repos/{owner}/{repo}/stacks' …` and any other `gh api` call with
  `--method POST`/`PATCH`/`PUT`/`DELETE`.
- Anything that triggers the `generate-prd` workflow or Copilot Code Review.
- Any merge, cascading or otherwise, of a stack layer.
- The local `git checkout -b` / `git add` / `git commit` sequences in §18.2 and §18.3 — they
  are harmless in isolation but exist only to feed the pushes above, and running them
  leaves five branches and five commits in the working repository.
- Creating `docs/specs/course-prerequisites.md` (the directory does not exist; the learner
  creates it).

Safe to execute: `gh --version`, `gh pr --help`, `gh api --method GET …`, `npm test`,
`npx vitest run …`, and any read of a repo file.

> **Standing rule, restated for this lab.** No push, PR, issue or comment without John's
> explicit approval in the session that makes it. This lab's content is *about* those
> actions; editing it must not perform any of them.
