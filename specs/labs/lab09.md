# Lab spec — `labs/lab09.md`

| | |
|---|---|
| **Lab** | `labs/lab09.md` (25.0 KB) — "Copilot Coding Agent & Code Review" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13, batch lab05/08/09/11/12) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 09 chains two platform features that need no local tooling: the **Coding Agent** turns an
issue into a pull request, and **Code Review** reviews that pull request. The teaching idea is
that the custom instructions written back in Lab 02 are what make both of them
project-specific — the same configuration surface reaches the cloud agents, not just the
local ones.

After the refresh the lab teaches the same chain, but **it stops asserting product facts it
does not source** (plan availability, the static-analysis engine list, the generated branch
name), it **tells the learner how to undo the four GitHub objects it creates** — a ruleset, an
issue, a branch and a PR — and its declared duration accounts for the two agent round-trips it
asks the learner to sit through. No section is added or renamed.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `github.com` — §9.2 through §9.7 are entirely browser or `gh` work against a real repository. The only terminal steps are two `head -30` reads in §9.8. |
| **Tier** | `advanced` |
| **Presenter minutes** | 5 (unchanged — the lab already instructs the presenter to pre-run the issue → PR → review chain) |
| **Self-paced minutes** | **55** (was 20). A guideline, never a floor or a gate — see D6 and `specs/labs/README.md`: a pacing number is an estimate, may be changed at any time by anyone, and is never a reason to fail or return a lab. The contract test asserts only that frontmatter, registry and the inline callout agree with each other. |
| **Prerequisites** | **Lab 02** — §9.8 is *about* `.github/copilot-instructions.md` and the lab's thesis collapses without it. **Lab 08** — §9.9 explicitly builds on the gh-aw chain and §9.10 reads `.github/workflows/code-review.md`. Also: **a fork you own**, because §9.2 creates a repository ruleset and §9.3 flips a repo setting — both are Settings work. State all three; the lab currently states none. |
| **Write steps** | **Yes — four GitHub objects, all created and none cleaned up.** §9.2 creates a **repository ruleset**; §9.3 toggles the **Coding agent** repo setting; §9.4 `gh issue create`, and the ⚠️ callout above it offers `gh repo set-default`, which **writes repository-local git config**; §9.5 `gh issue edit --add-assignee @copilot`, which causes the agent to **create a branch and open a PR**; §9.7 comments `@copilot` on the PR, causing **more commits**; §9.7 optionally `gh pr checkout` + `git commit` + `git push`. |

> **`lab-forge` verdict: `run with §7 fenced`.** The commissioned edit is prose, a cleanup
> block and frontmatter — no execution needed. The run gate must report every §7 item
> UNVERIFIED and execute **none**. `gh issue create` and `gh issue edit --add-assignee
> @copilot` are the dangerous pair: the second one spends Copilot Coding Agent quota and opens
> a real pull request on a real repository.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The lab still names all five current CLI capabilities and still references the registry | `npx vitest run tests/content-currency/cli-commands-current` |
| AC5 | The lab contains a Lab 09-specific cleanup block that names the **ruleset**, the **issue**, the **branch** and the **pull request** | `npx vitest run tests/lab-structure/lab09-contract` |
| AC6 | No unsourced plan-tier enumeration ("Available on Copilot Pro, Pro+, Business, and Enterprise") remains; availability is deferred to the linked docs | `npx vitest run tests/lab-structure/lab09-contract` |
| AC7 | No unsourced static-analysis engine list ("CodeQL, ESLint, and PMD") is asserted as fact | `npx vitest run tests/lab-structure/lab09-contract` |
| AC8 | The generated branch-name claim `copilot/fix-{issue-number}` is gone or hedged — the lab does not tell a learner to expect a specific branch name | `npx vitest run tests/lab-structure/lab09-contract` |
| AC9 | Prerequisites (Lab 02, Lab 08, a fork you own) are stated before the first `##` section | `npx vitest run tests/lab-structure/lab09-contract` |
| AC10 | Frontmatter `pace.self_paced_minutes` equals registry `labs.lab09.pace_self_minutes`, and the inline `⏱️` callout states the same number | `npx vitest run tests/lab-structure/lab09-contract` |
| AC11 | The §9.0 currency block is byte-identical to `docs/_partials/currency.md`'s body — no inline drift | `npx vitest run tests/lab-structure/lab09-contract` |
| AC12 | Every backticked repo-relative path in the lab resolves on disk | `npx vitest run tests/lab-structure/lab09-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | Code Review is "Available on Copilot Pro, Pro+, Business, and Enterprise" (L66) | `cut` | A per-SKU availability matrix with no source in the file, in a product area where SKU boundaries move. The lab already links four official docs pages at the top; one of them is the authority. Replace the row's value with a pointer to the linked docs. This is the Lab 10 C2 move — the unsourced vendor-attributed specific goes, the shape stays. |
| C2 | Coding Agent is "Available on Copilot Pro+, Business, and Enterprise" (L112) | `cut` | Same class as C1, same disposition. Note the two rows already disagree about Pro, which is the tell. |
| C3 | Code Review "Integrates CodeQL, ESLint, and PMD for high-signal findings" (L65) | `cut` | Three named third-party engines, no source, and the list is language-shaped (no C# analyzer named) in a .NET repo — so even if true it misleads here. Delete the engine names; keep "integrates static analysis". |
| C4 | The Coding Agent creates a branch "named something like `copilot/fix-{issue-number}`" (L212) | `cut` or hedge | An implementation detail the learner is told to expect and will match against reality. "something like" is already a hedge; make it unambiguously illustrative or remove the shape. Nothing downstream in the lab depends on the name. |
| C5 | Code Review "never approves or requests changes — it only comments" (L65, L249) | `free-check` → keep | This is load-bearing (it is the lab's human-in-control argument) **and** it is settled inside the repo: `.github/workflows/code-review.md` exists and the repo's own review posture is comment-only. The lab also links the official "About Copilot code review" page for it. Keep; no change. |
| C6 | Both agents read `copilot-instructions.md` and `AGENTS.md` (§9.8, §9.11) | `free-check` | `.github/copilot-instructions.md` and `AGENTS.md` both exist and both carry exactly the conventions §9.8 enumerates (clean-architecture boundaries, repository pattern, `MethodName_Condition_ExpectedResult`, no hardcoded secrets, parameterized queries). Consistent. Keep. |
| C7 | The custom gh-aw review workflow demonstrates five review categories, `safe-outputs` labelling with `ai-review`, `contents: read` + `pull-requests: write`, and the `pull_requests`/`repos` toolsets (§9.10) | `free-check` | Read `.github/workflows/code-review.md` and `solutions/lab09-gh-aw-review/code-review.md` — both exist. Verify each of the four sub-claims against the file and correct any that drifted. |
| C8 | Org owners can enable automatic review across all repositories from org Copilot policy settings (§9.2) | `cite` | `docs/_meta/registry.yaml` `model_default_availability_policy` and `enterprise_managed_settings` establish that org/enterprise Copilot policy is the governing layer this curriculum teaches, and **Lab 17** covers that surface. Link Lab 17 rather than describing the settings page. |

**Research required: none.** Every claim is either settled in-repo or disposed of by cutting
the unsourced specific — the cheapest correct move, and better teaching.

## 5. Non-goals

- **Do not edit `docs/_partials/currency.md`.** §9.0 includes it; 10 labs share it. AC11 exists
  to stop an inline "fix" that would be re-synced away. The partial's stale
  `Shift+Tab`/`<tier-or-id>` wording is a separate repo-wide pass.
- Do not rewrite `.github/workflows/code-review.md` or `solutions/lab09-gh-aw-review/`. §9.10
  reads them; C7 only requires the lab's description to match what is on disk.
- Do not merge Lab 09 into Lab 08. They are adjacent but the plan records the orchestration
  merge hypotheses as foreclosed; treat this lab as standalone.
- Do not replace the GUI steps with CLI equivalents to make the lab runnable. Ruleset creation
  is genuinely a browser task and the lab is honestly tiered `advanced`/`github.com` for it.
- Do not add `@include docs/_partials/cleanup.md`. AC5 wants a **targeted** block naming the
  four objects this lab creates; the generic sweep names none of them.
- Do not change `pace_presenter_minutes` or `pace_workshop_minutes` — only `pace_self_minutes`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab09.md:410` (§9.12) | Cleanup is the **generic partial only**. The lab creates a repository ruleset, enables a repo setting, opens an issue, causes a branch and a PR, and then pushes more commits to that PR — and the cleanup block mentions none of them. It talks about `~/.copilot/lessons/`, `core.hooksPath` and `node/.a2a/`, none of which this lab touches. A learner finishes with a live ruleset forcing Copilot review on every future PR in their fork. |
| D2 | `labs/lab09.md:65–66` and `:112` | Three unsourced vendor claims in two tables: the static-analysis engine list, and two plan-availability rows **that contradict each other about Pro**. |
| D3 | `labs/lab09.md:212` | `copilot/fix-{issue-number}` — a branch-name shape presented as what to expect. |
| D4 | top of file (before `## 9.0`) | No prerequisites declared, though §9.8's entire argument depends on Lab 02 and §9.9/§9.10 depend on Lab 08. §9.2 and §9.3 are both **repository Settings** work, so the lab must say "do this in a fork you own" — the same fence Lab 08 needs. **An earlier draft of this spec required the lab to state an "admin rights" requirement; that is withdrawn.** No published statement of the permission needed to create a repository ruleset was located in three documentation fetches (the ruleset creation page, the rulesets concept page, and the REST reference), and asserting an unsourced permission claim is exactly what §4 C1–C3 cut elsewhere in this lab. "A fork you own" is actionable, achieves the same thing, and needs no source. |
| D5 | `labs/lab09.md:71–92` (§9.2) | The ruleset is created but never scoped as "for this exercise" and never removed (see D1). It also silently requires "Require a pull request before merging" on the default branch, which changes the learner's own workflow for every later lab in the curriculum. Say so. |
| D6 | frontmatter + `⏱️` callout + registry `labs.lab09.pace_self_minutes` | **Resolved: 55.** Declared 20, which no reading of the lab supports. This spec's own derivation gave ≈27–38 and suggested ≈40; the teachability gate re-derived ≈55 (45–65) after the refresh added a completion checkpoint and a second-cycle branch. 55 is the more considered guess, so it is what shipped — **not because the gate's number wins.** Every one of these figures is an estimate produced by reading the material, and the project rule (`specs/labs/README.md`) is that pacing may be changed at any time, by anyone, and is never a finding, never blocking, and never a reason to return a lab. Only `pace_self_minutes` moved; presenter and workshop are untouched. |
| D7 | `labs/lab09.md:347–372` (§9.10) | Claims about `.github/workflows/code-review.md` — five categories, `ai-review` label, the two permissions, the two toolsets — are asserted in prose and must be re-verified against the file. See C7. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them. Everything in §9.2–§9.7
is a GitHub write against a real repository:

- §9.2 — creating the `copilot-code-review` repository ruleset (changes merge requirements on the default branch).
- §9.3 — toggling **Settings → Copilot → Coding agent**.
- §9.4 — `gh issue create` (both the Bash and PowerShell forms).
- §9.4 — `gh repo set-default` (the non-`--view` form). It **changes repository-local git
  config**, which `specs/labs/README.md` defines as a write step. `--view` is read-only and
  may be run. This fence was added after the first `lab-forge` run: the run gate declined the
  mutating form on its own judgement, which is luck, not a control.
- §9.5 — `gh issue edit <n> --add-assignee @copilot`. **Spends Coding Agent quota and opens a pull request.**
- §9.6/§9.7 — "Apply suggestion", commenting `@copilot` on the PR, `gh pr checkout`, `git commit`, `git push`.
- §9.12 — anything in the cleanup block that deletes a GitHub object.
