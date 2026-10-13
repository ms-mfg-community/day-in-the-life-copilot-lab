# Lab spec — `labs/lab08.md`

| | |
|---|---|
| **Lab** | `labs/lab08.md` (30.3 KB) — "GitHub Agentic Workflows: PRD Generation" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13, batch lab05/08/09/11/12) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 08 is the curriculum's crossing point from the local station to the platform: it teaches
that a gh-aw workflow is a **Markdown file whose body is an AI prompt and whose frontmatter is
Actions configuration**, that it compiles to a `.lock.yml` which must live on the default
branch for a `create` trigger to fire, and that writes happen through `safe-outputs` rather
than through an agent holding write permissions.

After the refresh the lab teaches the same thing with **every command a learner is told to
paste actually runnable and internally consistent**: one tool for managing the secret rather
than two, a branch-push command whose Bash and PowerShell forms agree, no invented Action
name in the illustrative compiled output, the gh-aw version pin sourced from
`docs/_meta/registry.yaml`, and a declared duration that accounts for the PAT-minting and
org-settings detour the lab actually requires. No section is added or renamed.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — §8.1–§8.3 are terminal/file reading; §8.4–§8.7 are substantially `github.com` GUI (PAT creation, repo secret, Actions settings toggle, Issues enablement, branch creation, PR review). |
| **Tier** | `advanced` |
| **Presenter minutes** | 5 (unchanged — the lab already instructs the presenter to pre-create the branch so the Actions run is complete before the session) |
| **Self-paced minutes** | **15 → 45.** See D7. Minting a fine-grained PAT alone is a six-step GUI detour; the Actions run is self-declared at 1–3 minutes of pure waiting. 15 is not reachable by anyone. |
| **Prerequisites** | **Lab 02** (§8.2's PRD agent is said to read `.github/copilot-instructions.md`) and a **fork you own with Actions enabled** — §8.4–§8.6 cannot be done against the upstream repo. State the fork requirement in the lab; it is currently assumed. |
| **Write steps** | **Yes, extensively, and most of them are irreversible-ish GitHub writes.** §8.4 mints a **live fine-grained PAT with `Copilot Requests: Read`** and stores it as a repo secret; §8.4 flips **Settings → Actions → "Allow GitHub Actions to create and approve pull requests"**; §8.5 enables Issues on the fork and creates issues via `gh issue create`; §8.6 **pushes a branch to `origin`**; §8.7 reviews the PR the agent opens. §8.3 `gh aw compile` **rewrites `.lock.yml` files in the working tree**. |

> **`lab-forge` verdict: `run with §7 fenced`.** The edit this spec commissions is entirely
> textual — command corrections, a registry link, frontmatter. None of it requires executing
> the lab. The run gate must report every §7 item UNVERIFIED and execute **none**; in
> particular it must never run `gh aw compile` (it rewrites four committed lock files) and
> never run `gh issue create`, `gh secret set`, or `git push`.

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | The lab still names all five current CLI capabilities and still references the registry | `npx vitest run tests/content-currency/cli-commands-current` |
| AC5 | The Bash and PowerShell branch-push commands push the **same** source ref; the string `lab/day-in-the-life-copilot-lab` appears nowhere | `npx vitest run tests/lab-structure/lab08-contract` |
| ~~AC6~~ | **Withdrawn in place 2026-10-13, never reused.** It required one tool for `COPILOT_GITHUB_TOKEN`. That was wrong — see C1. Both commands the lab uses are correct, and `gh aw secrets` has no `delete`, so the lab *must* use two tools. |
| AC7 | No ordered-list item in §8.6 begins on the line immediately after a closing code fence | `npx vitest run tests/lab-structure/lab08-contract` |
| AC8 | The illustrative compiled YAML in §8.3 names no `uses:` action that appears in no committed `.github/workflows/*.lock.yml` | `npx vitest run tests/lab-structure/lab08-contract` |
| AC9 | §8.3 names `gh_aw_schema_version` and links `docs/_meta/registry.yaml`, so a learner recompiling pins the same compiler the committed locks were built with | `npx vitest run tests/lab-structure/lab08-contract` |
| AC10 | §8.4–§8.6 declare the fork requirement before the first GitHub write | `npx vitest run tests/lab-structure/lab08-contract` |
| AC11 | Frontmatter `pace.self_paced_minutes` equals registry `labs.lab08.pace_self_minutes`, and the inline `⏱️` callout states the same number | `npx vitest run tests/lab-structure/lab08-contract` |
| AC12 | The §8.0 currency block is byte-identical to `docs/_partials/currency.md`'s body — no inline drift | `npx vitest run tests/lab-structure/lab08-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | `gh aw secrets set COPILOT_GITHUB_TOKEN --value "<your-token>"` sets the secret (L230), while §8.10 removes it with `gh secret delete COPILOT_GITHUB_TOKEN` (L475) | `free-check` → **both correct, no defect** | Verified against the installed extension: `gh aw secrets --help` documents exactly `gh aw secrets set MY_SECRET --value "secret123"`, and its only subcommands are `set` and `bootstrap` — **there is no `gh aw secrets delete`**. So the lab is right twice and the two-tool split is forced, not sloppy. An earlier draft of this spec called it an inconsistency and commissioned a fix; that was an error, and AC6 is withdrawn because of it. **Optional clarity only, not an AC:** one sentence saying gh-aw sets the secret and `gh secret` removes it would stop the next reader filing the same false defect. |
| C2 | The compiled output `uses: github/agentic-workflow-action@v1` (L192) | `free-check` | `Select-String -Path .github/workflows/*.lock.yml -Pattern 'agentic-workflow-action'` → **0 matches**. Four real compiled locks are committed in this repo; none uses that action. The block is labelled "simplified", but inventing an action name teaches a learner something false. Replace the invented step with an excerpt from a real committed lock, or drop the `uses:` line. |
| C3 | gh-aw compiles `.md` → `.lock.yml`; the lock is read by Actions (§8.3) | `free-check` | `.github/workflows/generate-prd.lock.yml` exists and is committed. Consistent. Keep. |
| C4 | A `create` event resolves workflows from the **default branch**, which is why this works uncompiled (L203–207) | `free-check` | Consistent with the committed lock being on `main`. This is the lab's best insight — keep it verbatim. |
| C5 | gh-aw "currently requires a PAT for Copilot engine authentication"; GitHub App auth is not yet supported for `COPILOT_GITHUB_TOKEN` (L210) | `cite` + `free-check` | The lab already links the gh-aw auth reference for this exact claim and frames it as current-at-refresh. The *version* this is true of is settleable: `docs/_meta/registry.yaml` `gh_aw_schema_version: "0.86.2"`. Scope the sentence to that pin rather than to all time. |
| C6 | Recompiling rewrites the committed locks (implied by §8.3, stated in §8.10) | `free-check` | `docs/_meta/registry.yaml` `gh_aw_schema_version` comment: "Recompiling with a different version rewrites the locks, so pin the extension to match before running `gh aw compile`: `gh extension install github/gh-aw --pin v0.86.2`". §8.3 currently tells the learner to compile **without** mentioning the pin. This is D5. |
| C7 | MCP tool allowlist syntax is `mcp__<server-name>__<tool>` (L138) | `free-check` | Matches `.github/workflows/weekly-content-audit.md`'s own `mcp-servers:` handling and the Step 0 fix recorded in the plan (§4), which moved `microsoft-learn`/`context7` out of `tools:`. Consistent. Keep. |
| C8 | Fine-grained PAT flow: Public repositories access is required for the **Copilot Requests** permission to appear (L221–226) | `cut` the *mechanism* claim, keep the steps | This is a GUI-shape claim about a settings page, with no source and no free check. It is incidental to the teaching idea. Keep the numbered steps (they are how you do it) and delete the parenthetical causal explanation. |

**Research required: none.** C5 and C8 are the only claims about outside behaviour that a
free check cannot fully settle, and both are disposed of by scoping or cutting rather than by
a `spec-forge` run.

## 5. Non-goals

- **Do not edit `docs/_partials/currency.md`.** §8.0 is an `@include` of it; 10 labs share it.
  It still carries the superseded `Shift+Tab` / `<tier-or-id>` wording that `lab01` and `lab07`
  have already corrected. That is a separate repo-wide sync pass. AC12 exists to stop the
  editing stage "fixing" it inline, which would be re-synced away.
- Do not rewrite `.github/workflows/generate-prd.md` or any `.lock.yml`. The lab *reads* them.
- Do not convert the lab to a GitHub App flow. C5 records that gh-aw needs the PAT at the
  pinned version; the lab already points at the App pattern for production.
- Do not drop §8.5/§8.6 just because they are GitHub writes. The issue → branch → PRD chain is
  the lab, and Lab 09 depends on the learner having seen it.
- Do not change `pace_presenter_minutes` or `pace_workshop_minutes` — only `pace_self_minutes`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | `labs/lab08.md:374` | PowerShell push reads `git push origin lab/day-in-the-life-copilot-lab:feature/add-course-prerequisites` while the Bash form three lines above pushes `main:feature/...`. The two "equivalent" commands push **different source refs**, and `lab/day-in-the-life-copilot-lab` is not a branch in this repo. A PowerShell learner gets `src refspec ... does not match any`. |
| D2 | `labs/lab08.md:376` | `6. Go to the **Actions** tab` begins on the line *immediately after* a closing code fence, inside the "Alternatively, from your terminal" block. Steps 6–8 belong to the main procedure but render as part of the alternative. The learner on the GUI path never sees them. |
| ~~D3~~ | ~~`labs/lab08.md:230` vs `:475`~~ | **Not a defect. Withdrawn 2026-10-13 after checking the installed extension** — `gh aw secrets` has only `set` and `bootstrap`, so removing the secret *requires* `gh secret delete`. Both commands are correct as written. Recorded here rather than deleted because the "two tools, one secret" shape looks like a defect and will be re-reported otherwise. |
| D4 | `labs/lab08.md:192` | `uses: github/agentic-workflow-action@v1` appears in zero committed lock files. Invented action name presented as the compiled output. |
| D5 | `labs/lab08.md:143–160` (§8.3) | Tells the learner to run `gh aw compile` with no mention of pinning the compiler, while the registry explicitly warns that compiling with a different version rewrites the locks and gives the pin command. The lab's own §8.10 then has to tell them how to revert the churn it caused. Name `gh_aw_schema_version` and give the pin **before** the compile step. |
| D6 | §8.4–§8.6 | The lab never says "do this in your fork" before the first GitHub write, yet §8.5 is titled "Enable Issues on **Your Fork**" and §8.6 pushes to `origin`. A learner working in a clone of the upstream repo discovers the problem at `git push`. |
| D7 | frontmatter + `⏱️` callout + registry `labs.lab08.pace_self_minutes` | Declared 15 self-paced minutes. Derived: read workflow + frontmatter table (4–6) + optional compile (3) + **mint a fine-grained PAT, 6 GUI steps** (5–8) + add repo secret (2) + **flip the org/repo Actions PR setting** (2–4) + enable Issues and seed the backlog (4–6) + create the branch (2) + **wait 1–3 min for the run, self-declared** (3) + review the PRD PR (5–8) = **30–45**. Set 45; this lab is the batch's worst pacing claim. |
| D8 | `labs/lab08.md:221–226` | The "Public repositories … required for the Copilot Requests permission to appear" aside is an unsourced claim about a settings page. See C8 — keep the steps, cut the explanation. |

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED rather than executing them. Several are
irreversible or mutate committed files:

- §8.3 — `gh aw compile .github/workflows/generate-prd.md`. **Rewrites committed `.lock.yml` files in the working tree.** Never execute.
- §8.4 — creating a fine-grained PAT; `gh aw secrets set` / `gh secret set COPILOT_GITHUB_TOKEN`; the **Settings → Actions → Workflow permissions** toggle; `gh secret delete`.
- §8.5 — enabling Issues on the fork; `gh issue create` (any variant, including the four in `docs/sample-issues.md`).
- §8.6 — `git push origin main:feature/add-course-prerequisites` and the GitHub "Create a branch" flow. **A GitHub write.**
- §8.7 — reviewing/merging the agent's PR.
- §8.10 — `gh pr close <num> --delete-branch`, `git checkout -- '.github/workflows/*.lock.yml'`, PAT revocation.
- The `act` and `gh aw run --dry-run` suggestions at L176–180: both spawn runtimes and one reaches the network.
