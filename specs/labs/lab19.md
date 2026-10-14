# Lab spec — `labs/lab19.md`

| | |
|---|---|
| **Lab** | `labs/lab19.md` (148 lines, 8.0 KB) — "Self-Improving Agents & Skills (gh-aw Template)" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 19 teaches a bounded self-improvement pattern: a scheduled gh-aw workflow scans the
repo's own agents, skills and prompts for drift, proposes only mechanical fixes as a draft
PR, escalates anything design-level to a human through the report attached to that PR, and
is forbidden from editing itself. The
teaching idea is that **"self-improving" is a safe pattern only because of what it is not
allowed to do** — and the lab is already admirably loud that this is a DIY pattern, not a
GitHub product.

After the refresh the lab teaches the same thing with its internal references pointing at
the right places, its one genuinely remote step flagged as such, and a short teardown for
the draft PR and regenerated lock file it leaves behind. No section is added or reordered;
this is the smallest lab in the batch and the lightest pass.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `mixed` — a terminal for `gh aw compile` and `node`, a Copilot CLI session for the dry-run scan, and `github.com` for the triggered Actions run and the draft PR it opens. |
| **Tier** | `advanced` |
| **Presenter minutes** | 7 (unchanged) |
| **Self-paced minutes** | 25 (unchanged) |
| **Prerequisites** | Lab 08 (gh-aw fundamentals — the lab says so itself and `gh aw compile` is step one) and Lab 11 (the plugin-template conventions §19.6's bundle is built on). Labs 04 and 07 are useful background. `gh aw` must be installed. |
| **Write steps** | **Yes — three, of which one is remote.** (a) §19.2 `gh aw compile self-improving-agents` **regenerates `.github/workflows/self-improving-agents.lock.yml`, a committed file**. (b) §19.4 `gh workflow run self-improving-agents.lock.yml` triggers a real Actions run that opens a draft PR — a GitHub write, and the teardown that follows it closes that PR and deletes its branch. (c) §19.4's fork checklist offers `gh repo set-default`, which **writes repository-local git config** — the same write `specs/labs/lab09.md` §7 fences. §19.6's `node modernization-bundle/scripts/install.mjs` is **not** a write step: it is a read-only dry-run simulator (`readFileSync`/`existsSync` only). See §7. |
| **`lab-forge` verdict** | **`run with §7 fenced`.** Only the two items above are fenced. Notably `node modernization-bundle/scripts/install.mjs` is **outside** §7 and the run gate **may and should** execute it — AC7 depends on it. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | Every `##` section heading is numbered `19.<n>`, uniquely | `npx vitest run tests/lab-structure/lab19-contract` |
| AC5 | Every `§19.x` cross-reference names a section that exists, and the "Portability config" block is attributed to the workflow file rather than to a lab section | `npx vitest run tests/lab-structure/lab19-contract` |
| AC6 | Every backticked repo-relative path in the lab resolves on disk | `npx vitest run tests/lab-structure/lab19-contract` |
| AC7 | The shipped workflow compiles and the bundle's entrypoints resolve | `gh aw compile self-improving-agents` and `node modernization-bundle/scripts/install.mjs` (also covered by `npx vitest run tests/workflows/all-workflows-compile`) |
| AC8 | §19.2 says `gh aw compile` rewrites the committed `.lock.yml` | `npx vitest run tests/lab-structure/lab19-contract` |
| AC9 | §19.4 is marked as a step that writes to GitHub, and the lab says how to clean up the draft PR it opens | `npx vitest run tests/lab-structure/lab19-contract` |
| AC10 | Every model identifier in the lab appears in the `models:` block of the registry | `npx vitest run tests/lab-structure/lab19-contract` |
| AC11 | Frontmatter, registry and the inline `⏱️` callout state the same pacing numbers | `npx vitest run tests/lab-structure/lab19-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | "there is no GitHub product called 'self-improving agents'" | **keep verbatim** | This is the lab's most valuable sentence and it is a *negative* claim the lab is right to make loudly. Do not soften, do not hedge, do not delete. |
| C2 | `.github/workflows/self-improving-agents.md` is "already added to this repo" | `free-check` — **correct** | The file exists. `AGENTS.md` documents it. No change. |
| C3 | `gh aw compile self-improving-agents` prints `✓ Compiled 1 workflow: 1 succeeded, 0 warnings` | `free-check` | `tests/workflows/all-workflows-compile.test.ts` asserts bare `gh aw compile` exits 0 from the repo root, and it passes. The exact success string is cosmetic; if the installed `gh aw` words it differently, relax the lab's wording rather than asserting a string the tool may not print. |
| C4 | `.github/skills/eval-harness/SKILL.md`, `modernization-bundle/`, `docs/_meta/registry.yaml`, `.github/workflows/generate-prd.md` | `free-check` — **all resolve** | Verified on disk. No change. |
| C5 | `node modernization-bundle/scripts/install.mjs` → "expect ok=true" | `free-check` — **correct and safe** | The script's own header: "lightweight `copilot plugin install --dry-run` simulator… Resolves every entrypoint declared in the plugin manifest against the filesystem and returns a structured report." Imports are `readFileSync, existsSync` — it writes nothing. It is already covered by `tests/plugin-template/install-dry-run.test.ts`. |
| C6 | "Labs 07–09 (agents), Lab 04 (skills), and Lab 08 (gh-aw)" | `free-check` — **correct** | `labs/lab04.md` frontmatter title is "Skills & Prompts"; `lab07` "Multi-Agent Orchestration"; `lab08` "GitHub Agentic Workflows: PRD Generation"; `lab09` "Copilot Coding Agent & Code Review". The attributions hold. No change. |
| C7 | "**Next:** Lab 20 — Enterprise Token Optimization & Reporting" | `free-check` — **correct** | `labs/lab20.md` title matches exactly. No change. |
| C8 | `gh_aw_schema_version` in the registry governs compile-time schema drift | `free-check` | Present in `docs/_meta/registry.yaml` and already linked from the lab's References. No change. |
| C9 | The workflow "escalates anything non-mechanical to a human-reviewed **issue**" (lab §19.1 item 3, §19.7, §19.8 table) | `free-check` — **the lab was wrong; corrected 2026-10-14** | The workflow's `safe-outputs:` block configures **only** `create-pull-request` (`.github/workflows/self-improving-agents.md` lines 22–30) and the job holds `issues: read` (line 11). It has no mechanism to open an issue. Its own prompt body still says "open an **issue**" (lines 97, 109) — a real contradiction inside the workflow, which the lab had been faithfully repeating. Per §5, when lab and workflow disagree the **lab** is wrong, so the lab now says the finding is flagged in the report attached to the draft PR. **Do not revert this to "issue" without first re-reading `safe-outputs:`.** The workflow itself is out of scope to fix here (§5); that contradiction is a defect in the workflow, recorded for a later pass. |

> No `research` disposition. Every claim resolved to a file in this repo or a test that
> already runs. **Do not commission a `spec-forge` run for this lab.**

## 5. Non-goals

- Do not soften the "this is not a GitHub product" framing (C1), the self-exclusion rule,
  or the draft-only constraint. They are the lab's teaching content, not boilerplate.
- Do not edit `.github/workflows/self-improving-agents.md`, its `.lock.yml`, or anything
  under `modernization-bundle/`. The lab describes them; if they disagree, the **lab** is
  wrong. (The workflow is also, by its own design, the one file it may never edit — a pass
  that edited it from the lab's spec would be a small joke at the curriculum's expense.)
- Do not expand §19.6 into a plugin-authoring walkthrough. Lab 11 owns that.
- Do not change the declared pacing (7 / 25).
- Do not add the cleanup partial. AC9 wants one or two lines about the draft PR and the
  regenerated lock file, not a full local-state sweep.
- `docs/_partials/currency.md` is **not** included by this lab; §19.0 is its own two-line
  stub. Leave it alone.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | §19.5, first line | "Because the 'Portability config' block **in §19.1** is the only repo-specific part…". The block is not in §19.1 — it is in `.github/workflows/self-improving-agents.md`, which §19.1 merely tells the learner to `cat`. A learner scrolling back to §19.1 to edit a config block finds prose. Attribute it to the workflow file. |
| D2 | §19.2 | `gh aw compile self-improving-agents` "regenerate[s] `.github/workflows/self-improving-agents.lock.yml`" — a **committed** file. The lab states the regeneration as an expected outcome but never flags that it dirties the working tree, and never tells the learner whether to commit or discard it. Say which. |
| D3 | §19.4 | `gh workflow run self-improving-agents.lock.yml` triggers a real Actions run that opens a draft PR on the learner's repository. This is the lab's only remote write and it carries no marker — no ⚠️, no "this writes to GitHub", no note that a fork is required. Every other write-heavy lab in the suite flags its writes. |
| D4 | §19.4, second code block | The block beginning "Watch the triggered run and report back…" is an unlabelled bare fence immediately after a `bash` block, with no 🖥️ marker saying it is a Copilot CLI prompt rather than a shell command. §19.3 labels its equivalent block correctly ("🖥️ **In Copilot CLI:**"); this one does not. |
| D5 | whole lab | No teardown. The lab leaves a draft PR open, possibly a modified `.lock.yml`, and a workflow that will now run on its cron schedule in the learner's fork. Two or three lines: close the draft PR, restore or commit the lock file, disable the schedule if the fork is not meant to keep running it. |
| D6 | §19.0 | Two-line currency stub rather than the shared partial. Not wrong — it names no command and does link the registry — and **out of scope here** (see §5). Recorded only so a later consistency pass can decide whether Labs 18/19/20's stubs should adopt `docs/_partials/currency.md`. |

> This is the lightest spec in the batch on purpose. Lab 19 is 148 lines, it is internally
> consistent, its paths resolve, its model-free prose cannot go stale, and its framing is
> already better than most of the suite's. D1–D5 are the whole worklist; resist adding to
> it.

> **Status (2026-10-14).** D1–D5 are closed. One change landed outside the worklist: the
> C9 correction above, which was sanctioned by §5's own "if they disagree, the lab is
> wrong" rule rather than by a defect row. D6 remains open and deliberately deferred.

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED and execute none:

- `gh workflow run self-improving-agents.lock.yml` — triggers a real Actions run on the
  remote and opens a draft pull request.
- Any step that merges, closes or comments on the PR that run produces — including the
  §19.4 teardown's `gh pr close <number> --delete-branch`. (`gh pr list --label
  self-improving-agents`, which finds it, is read-only and may be run.)
- `gh aw compile self-improving-agents` **as a lab step**, because it rewrites the
  committed `.github/workflows/self-improving-agents.lock.yml`.
- `gh repo set-default` from §19.4's fork checklist — **both forms, including `--view`.**
  The bare form writes repository-local git config, which `specs/labs/README.md` defines as
  a write step. `--view` is genuinely read-only, but fence it anyway: `lab-forge`'s
  post-hoc detector matches on a `gh` command's verb against a fixed read-only set
  (`list`, `view`, `status`, `diff`, `checks` — see `loop.mjs`), and `set-default` is not
  in it. A gate that runs `--view` therefore gets recorded as having run a forbidden
  command and **escalates the whole loop**, which is exactly what happened on the first
  run of this spec. Fencing both forms costs nothing — AC9 is a prose assertion the
  contract test already covers — and is the only thing that prevents the false escalation,
  since the detector is hardcoded and does not read this spec. `specs/labs/lab09.md` §7
  permits `--view`; that is the weaker precedent and this supersedes it.

> `npx vitest run tests/workflows/all-workflows-compile` already proves the workflow
> compiles, from the repo root, without the lab's targeted invocation and without leaving a
> modified lock file staged. Use it for AC7's compile half.

**Explicitly safe to execute — do not fence these:**

- `node modernization-bundle/scripts/install.mjs` (read-only dry-run simulator; AC7
  depends on it).
- The §19.3 local dry-run scan prompt, which is explicitly instructed to make no edits —
  though it does spend AI credits, so a run gate may decline it on cost grounds rather than
  safety.
- `cat .github/workflows/self-improving-agents.md`, `npm test`, `npx vitest run …`, and any
  read of a repo file.
