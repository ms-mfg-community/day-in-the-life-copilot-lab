# Lab spec — `labs/lab14.md`

| | |
|---|---|
| **Lab** | `labs/lab14.md` (363 lines, 22.4 KB) — "Orchestrator + tmux Pattern (Deep-Dive)" |
| **Spec state** | `ready` |
| **Author** | John (authored 2026-10-13) |
| **Last updated** | 2026-10-13 |

---

## 1. Target state

Lab 14 takes Lab 13's two-agent idea to its production shape: one tmux session, one
long-lived orchestrator pane that is never cleared, short-lived worker panes that are
cleared between phases, and all inter-pane state passed through hand-off docs on disk. The
teaching idea is that **context discipline is a physical layout, not a prompting trick** —
separate the long-lived strategic context from the disposable tactical one and the token
curve stops compounding.

After the refresh the lab teaches exactly that, but: the enterprise model-policy callout
states the date its own cited source publishes, every path it points a learner at exists,
its cross-references into Lab 13 resolve against Lab 13's refreshed numbering, every model
id comes from `docs/_meta/registry.yaml`, and the lab tells a learner how to tear down the
tmux session and hand-off docs it created. No section is added, removed or reordered.

## 2. Declared surface

| | |
|---|---|
| **Surface** | `cli` — tmux panes, `send-keys`, shell scripts under `scripts/orchestrator/`, and multiple concurrent Copilot CLI sessions. Explicitly **not** runnable on Windows PowerShell without WSL2, which the lab's own compatibility matrix states. |
| **Tier** | `advanced` |
| **Presenter minutes** | 15 (unchanged) |
| **Self-paced minutes** | 45 (unchanged) |
| **Prerequisites** | Lab 13 (the A2A concepts and the hand-off schema this lab operationalises) and Lab 10 (the `.copilot/lessons/` wiki §14.5 depends on). Lab 07 is useful background. Also a hard **environment** prerequisite: a row in the lab's own compatibility matrix that is not ❌. |
| **Write steps** | **Yes.** (a) `tmux-start.sh` creates a tmux session (`copilot-orch`) — OS process state outside the working tree. (b) `sudo apt-get install -y tmux` / `brew install tmux` — global installs. (c) `handoff.sh` writes into `.copilot/orchestrator-handoffs/` (in-tree, untracked). (d) §14.4 edits `node/web/routes/courses-api.ts` and `node/tests/integration/courses-api.test.ts` — **committed** files — and commits them. (e) `clear-context.sh` sends `/clear` into live panes. See §7. |
| **`lab-forge` verdict** | **`run with §7 fenced`.** The edit is prose, dates, paths and cross-references; none of it requires standing up tmux. Report every §7 item UNVERIFIED and execute none. `--help` on the three scripts, `npm test` and `npx vitest` are outside §7 and may be executed. |

## 3. Acceptance criteria

| ID | Criterion | Observed by |
|---|---|---|
| AC1 | The repo's own gate passes | `npm test` |
| AC2 | Every internal link in the lab resolves on disk | `npx vitest run tests/lab-structure/links-resolve` |
| AC3 | Required frontmatter present and consistent with siblings | `npx vitest run tests/lab-structure/labs-have-frontmatter` |
| AC4 | Every `##` section heading is numbered `14.<n>`, uniquely | `npx vitest run tests/lab-structure/lab14-contract` |
| AC5 | The string `2026-09-01` does not appear in the lab | `npx vitest run tests/lab-structure/lab14-contract` |
| AC6 | The model-policy callout names `2026-08-26` as the effective date and links the changelog the registry cites | `npx vitest run tests/lab-structure/lab14-contract` |
| AC7 | Every model identifier in the lab appears in the `models:` block of the registry | `npx vitest run tests/lab-structure/lab14-contract` |
| AC8 | Every backticked repo-relative path in the lab resolves on disk | `npx vitest run tests/lab-structure/lab14-contract` |
| AC9 | No reference to `.orchestrator/` survives | `npx vitest run tests/lab-structure/lab14-contract` |
| AC10 | Cross-references into Lab 13 use the refreshed numbering (`§13.1` for trust boundaries, `§13.4.2` for the hand-off schema) and no `§B.n` form survives | `npx vitest run tests/lab-structure/lab14-contract` |
| AC11 | The lab carries a teardown step naming the tmux session and the hand-off output directory | `npx vitest run tests/lab-structure/lab14-contract` |
| AC12 | Frontmatter, registry and the inline `⏱️` callout state the same pacing numbers | `npx vitest run tests/lab-structure/lab14-contract` |

## 4. Outside-world claims

| # | Claim as the lab states it | Disposition | Evidence / command / row |
|---|---|---|---|
| C1 | "As of the org-wide rollout **completed 2026-09-01**, any newly-GA model an admin has not explicitly configured is available to users by default" (L44–L45) | `free-check` — **the date is false** | `docs/_meta/registry.yaml` records the finding verbatim against the primary source (`https://github.blog/changelog/2026-07-29-default-model-enablement-for-copilot-business-and-enterprise/`): announced **2026-07-29**, configurable-but-inert for 28 days, policy **took effect 2026-08-26** — "the ONLY date the changelog publishes". The registry comment names `labs/lab14.md:45` as a carrier and says it is "corrected in its own spec'd pass, not here". **This is that pass.** The *substance* of the callout is correct and stays; only the date and its framing change. |
| C2 | Model ids `claude-opus-4.6`, `claude-opus-4.7` (cost budget L28–L32, policy callout L50) | `free-check` — **not served** | Registry `models:` = cheap[`claude-haiku-4.5`, `gpt-5-mini`, `gpt-5.4-mini`], standard[`claude-sonnet-5`, `gpt-5.4`], premium[`claude-opus-5`, `gpt-5.3-codex`, `grok-4.6`]. The registry comment records `claude-opus-4.7` as dropped because the CLI no longer serves it. `claude-haiku-4.5`, `gpt-5-mini` and `auto` are fine. |
| C3 | `.orchestrator/session.md` holds "real artefacts from that build-out" (L62) | `free-check` — **does not exist** | Neither `.orchestrator/session.md` nor `.orchestrator/` exists in the repo. The real hand-off output directory is `.copilot/orchestrator-handoffs/` (`scripts/orchestrator/handoff.sh:41`). |
| C4 | "Save the plan to `.copilot/session-state/<id>/plan.md` (the session folder Copilot CLI exposes)" (L309) | `free-check` — **wrong path** | The repo's `.copilot/` contains only `lessons/` and `mcp-config.json`. The CLI's session folder is `~/.copilot/session-state/<id>/`, i.e. under `$HOME` (or `COPILOT_HOME`, per `copilot help environment`), not repo-relative. |
| C5 | `scripts/orchestrator/{tmux-start,handoff,clear-context}.sh` exist, honour `--help`, and are "exercised by `tests/orchestrator/*`" (L217–L229) | `free-check` — **all correct** | All three scripts exist; `tests/orchestrator/` contains `handoff-doc-schema.test.ts`, `pattern-dry-run.test.ts`, `tmux-script-idempotent.test.sh`, `tmux-script-idempotent.test.ts`. No change. |
| C6 | `scripts/preflight.sh --lab14` / `pwsh scripts/preflight.ps1 -Lab14` (L105) | `free-check` — **correct** | `scripts/preflight.sh:27` parses `--lab14`; `scripts/preflight.ps1:19` declares `[switch]$Lab14`. No change. |
| C7 | `node/web/routes/courses-api.ts`, `node/tests/integration/courses-api.test.ts`, `.github/skills/orchestrator-rubric/SKILL.md`, `.github/skills/cost-check/SKILL.md`, `docs/token-and-model-guide.md` | `free-check` — **all resolve** | Verified on disk. No change. |
| C8 | `tmux -V` "should report 3.0 or later" (L176) | `cut` or keep as-is | A floor the lab does not depend on and does not source. It is harmless and conventional; leave it unless the editing stage can cite it. **Do not** research it — it is incidental. |

> No `research` disposition. C1 — the only claim with real consequence — was already
> verified against its primary source and the finding is recorded in the registry.
> **Do not commission a `spec-forge` run for this lab.**

## 5. Non-goals

- Do not restructure the lab or reorder sections. The compatibility matrix stays where it
  is and keeps its content; it only gains a number.
- Do not soften or delete the compatibility matrix's ❌ rows. "The live workshop does not
  run on Windows PowerShell" is a deliberate, load-bearing statement.
- Do not rewrite or "improve" the three `scripts/orchestrator/*.sh` scripts, and do not
  touch `tests/orchestrator/*`. If the lab disagrees with a script, the **lab** is wrong.
- Do not change the declared pacing (15 / 45).
- **Do not edit `labs/lab13.md`.** Lab 13's numbering is fixed by its own pass; this pass
  only updates *this* lab's references to it, per §6 D5.
- Do not edit `docs/_partials/currency.md`. **Lab 14 does not include it** — it is not one
  of the ten consumers — so that fix (owned by `specs/labs/lab13.md`) is irrelevant here.
- Do not add the cleanup partial. AC11 asks for a short, specific teardown of what *this*
  lab creates, not adoption of `docs/_partials/cleanup.md`.

## 6. Known defects

| # | Location | Problem |
|---|---|---|
| D1 | L43–L45 | "As of the org-wide rollout completed **2026-09-01**" — a date that, per the registry's re-verification on 2026-10-12, "appears nowhere in the source". The changelog publishes exactly one date: the policy **took effect 2026-08-26** (announced 2026-07-29, inert for 28 days). Replace the date, state announced-vs-effective, and link the changelog URL the registry already carries. The rest of the callout's substance is correct and must survive. |
| D2 | L28–L32, L50 | Cost budget pins the orchestrator pane to `claude-opus-4.6` and reserves `claude-opus-4.7` "for the one-off architecture phase"; the policy callout repeats both. Neither id is in the registry and `claude-opus-4.7` is recorded as no longer served. Replace with registry tier references (`models.premium` / `models.cheap`) or listed ids, consistent with how Lab 10's pass resolved the same defect. |
| D3 | L62 | The 🪞 meta callout claims the hand-off contracts "under `.orchestrator/session.md` … are real artefacts from that build-out". **`.orchestrator/` does not exist.** This is the lab's credibility callout — it asserts the artefacts are real and then points at nothing. Either point at the real output directory (`.copilot/orchestrator-handoffs/`, written by `handoff.sh`) or drop the path claim. Do not invent a file. |
| D4 | L309 | "Save the plan to `.copilot/session-state/<id>/plan.md` (the session folder Copilot CLI exposes)" — repo-relative `.copilot/` has no `session-state/`. The CLI's session folder is `~/.copilot/session-state/<id>/`. A learner following this creates a stray directory in the repo. |
| D5 | L63, L68, L224 (`§B.2`) and L133 (`§13.2`) | **Four dangling cross-references into Lab 13.** L133 says "Lab 13 §13.2 calls **trust boundaries**" — Lab 13 has no §13.2 today, and after its refreshed numbering §13.2 is *Prerequisites*; trust boundaries are in **§13.1**. The three `§B.2` cites refer to the hand-off schema, which becomes **§13.4.2**. Use the map below — it is copied verbatim from `specs/labs/lab13.md` §6 D2 and the two specs must not drift. |
| D6 | L77 | `## Compatibility matrix` is the only unnumbered `##` heading; every other is `14.<n>`. Number it. Because it sits **before** `## 14.0 Why panes, why tmux, why now`, the house convention (`<n>.0` is the lab's first section) cannot be applied without renumbering the whole lab — so number it **`## 14.0 Compatibility matrix`** and shift the existing `14.0`–`14.7` down by one to `14.1`–`14.8`, updating `### Step`/sub-headings' parent numbers and any in-lab `§14.x` reference accordingly. |
| D7 | whole lab | No teardown. The lab starts a long-lived tmux session (`copilot-orch`), writes timestamped hand-off docs into `.copilot/orchestrator-handoffs/`, and commits to `node/`. A learner finishing Lab 14 is left with a detached tmux session still running. Add a short final teardown naming `tmux kill-session -t copilot-orch` and the hand-off directory. Keep it to a few lines — this is not an invitation to adopt the cleanup partial (see §5). |

### D5 — cross-reference map (identical to `specs/labs/lab13.md` §6 D2)

| Line | Old | New | Why |
|---|---|---|---|
| 133 | `Lab 13 §13.2 calls **trust boundaries**` | `Lab 13 §13.1 calls **trust boundaries**` | Trust boundaries are in Lab 13's "What is A2A — and what is ACP?", which becomes §13.1. |
| 63 | `(see Lab 13 §B.2 for the schema)` | `(see Lab 13 §13.4.2 for the schema)` | Lab 13's `B.2 Context drift` becomes `13.4.2`. |
| 68 | `[Lab 13 §B.2 — A2A hand-off schema](lab13.md)` | `[Lab 13 §13.4.2 — A2A hand-off schema](lab13.md)` | Same. |
| 224 | `Writes a Lab 13 §B.2 hand-off doc` | `Writes a Lab 13 §13.4.2 hand-off doc` | Same. |

> For reference, Lab 13's refreshed `##` sections are: `13.0` currency, `13.1` what is
> A2A/ACP, `13.2` prerequisites, `13.3` Part A, `13.4` Part B, `13.5` where this fits,
> `13.6` wrap-up, `13.7` cleanup.

### D6 — the renumbering map

| Old | New |
|---|---|
| `## Compatibility matrix` | `## 14.0 Compatibility matrix` |
| `## 14.0 Why panes, why tmux, why now` | `## 14.1 Why panes, why tmux, why now` |
| `## 14.1 tmux primer (5-minute version)` | `## 14.2 tmux primer (5-minute version)` |
| `## 14.2 The pattern, in one diagram` | `## 14.3 The pattern, in one diagram` |
| `## 14.3 The deliver scripts` | `## 14.4 The deliver scripts` |
| `## 14.4 Worked example — …` | `## 14.5 Worked example — …` |
| `## 14.5 Token discipline — …` | `## 14.6 Token discipline — …` |
| `## 14.6 Stop-and-ask triggers` | `## 14.7 Stop-and-ask triggers` |
| `## 14.7 Wrap-up & next steps` | `## 14.8 Wrap-up & next steps` |

The `### Bring up the layout` / `### Write a hand-off` / `### Clear a worker between
phases` and `### Step 0`–`### Step 6` sub-headings keep their text; renumber them only if
the editing stage gives them numeric prefixes, and if it does, they must match their new
parent. Any in-lab `§14.x` reference must be rewritten to match.

> **Ordering note:** D6 is the one defect in this spec that touches every heading. Apply
> D1–D5 and D7 first, then D6 last, so the line numbers in this table stay usable.

## 7. Out of scope for `lab-forge`

The run gate must report these UNVERIFIED and execute none:

- `./scripts/orchestrator/tmux-start.sh` (with or without `--no-attach`), `tmux attach`,
  `tmux new`, `tmux kill-session`, `tmux send-keys` — all create or mutate OS process state
  outside the working tree.
- `./scripts/orchestrator/clear-context.sh --pane worker` (the non-`--dry-run` form) —
  sends `/clear` into a live pane.
- `./scripts/orchestrator/handoff.sh …` — writes timestamped docs into
  `.copilot/orchestrator-handoffs/`.
- `sudo apt-get install -y tmux`, `brew install tmux` — global installs, and one needs root.
- Any edit to `node/web/routes/courses-api.ts` or
  `node/tests/integration/courses-api.test.ts`, and the `feat(node-api):` commit — both are
  **committed** files and changing them is the learner's exercise.
- `pnpm -C node test`, `make test-node`, `dotnet build`.
- `scripts/preflight.sh --lab14` / `preflight.ps1 -Lab14` — probes the host environment.
- Starting any Copilot CLI session in a pane.

Safe to execute: `--help` on the three orchestrator scripts, `tmux -V`, `npm test`,
`npx vitest run …`, `copilot --help`, and any read of a repo file.
