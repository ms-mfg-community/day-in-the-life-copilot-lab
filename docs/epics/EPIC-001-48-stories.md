# EPIC-001 / Issue #48 — Stories (dev and QA)

The [spec](EPIC-001-48-registry-scaffolding-spec.md) is the plan: *what* changes and *why*.
This file is the sprint: *who* does each piece, in what order, and what must be true before
a piece can close. Section references (§) point into the spec.

| Field | Value |
|---|---|
| Parent epic | [EPIC-001](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Story | #48 — *Registry and scaffolding for the enterprise-harness arc* |
| Plan | [EPIC-001-48-registry-scaffolding-spec.md](EPIC-001-48-registry-scaffolding-spec.md) |
| Stories | Five — two dev, three QA |
| Written | 2026-09-23 |
| Status | **In progress.** 48.1 and 48.2 are `Closed`. 48.2 round 1 returned `PASS` (0 / 0 / 0, no `UNVERIFIED` check) on `a09a2ca`, `0f70977` and `5c8ee48` — §4. Every other commit on the branch touches only this file. 48.3 is next and has not started. |

---

## 1. The stories at a glance

| Story | Type | Owner | Title | Starts when | Closed by |
|---|---|---|---|---|---|
| 48.1 | Dev | Vasher | Pin the Spec Kit and Azure Monitor versions, and have the weekly audit re-check them | John approves | 48.2 |
| 48.2 | QA | judge | Verify the version pins and the audit checks | 48.1 is handed off. Runs in its own session (§2 rule 2) | — (closes 48.1) |
| 48.3 | Dev | Vasher | Scaffold Labs 21–26 so they pass CI from the first commit | 48.2 has closed 48.1 | 48.4 |
| 48.4 | QA | judge | Verify the Labs 21–26 scaffolding | 48.3 is handed off | — (closes 48.3) |
| 48.5 | QA | judge | Accept #48 against its own acceptance criteria | 48.2 and 48.4 have closed | — (readies #48 for John) |

```text
48.1 Dev ──▶ 48.2 QA ──PASS──▶ 48.3 Dev ──▶ 48.4 QA ──PASS──▶ 48.5 QA ──PASS──▶ John: push / PR?
  ▲             │                ▲             │
  └── return ◀──┘                └── return ◀──┘
```

A 48.5 finding goes back to the dev story that owns it. That story re-passes its own QA
story before 48.5 runs again.

---

## 2. How a story moves

**States:** `Ready` → `In dev` → `Ready for QA` → `In QA` → `Closed`, or
`In QA` → `Returned` → `In dev` and round again.

1. **A dev story is closed only by its QA story — never by its owner.** Vasher hands off;
   it does not self-certify.
2. **QA is independent, read-only and blind.** A QA story runs in its own session. That
   session takes a QA mindset and did not dispatch the dev work it reviews. The one
   exception: the session that dispatched the dev work may run a blind-review sub-agent,
   briefed as in rule 4, and close the story on its verdict. judge never did the dev work it
   reviews and never edits files. Every verdict is recorded in the §4 sprint log.
   *(John, 2026-09-23.)*
3. **QA derives its own criteria** from the spec and the diff. The checks listed under each
   QA story are the floor, not the ceiling.
4. **Each QA brief is blind.** It carries, by path: the spec, this file, #48's body, and the
   commit range under review. From round 2 it also carries that QA story's own earlier
   verdicts. It does **not** carry the dev hand-off, the dev brief, or what the orchestrator
   expects to find. QA gathers its evidence itself. The dev hand-off stays on file, for John
   and the orchestrator.
5. **Verdict → state:**

   | judge verdict | What happens |
   |---|---|
   | `PASS` | The QA story closes, and so does its dev story. |
   | `ACCEPT WITH FINDINGS` | Closes once every **S2** is either fixed (story returned) or deferred by John in writing. An S2 that belongs to a later story — such as item 9's README total-hours line — is logged against that story instead. **S3** nits are batched into the next dev round or dropped; they never trigger a QA round on their own. |
   | `BLOCK` (any **S1**) | The dev story returns to `In dev`. |
   | Any check marked `UNVERIFIED` | Never a pass. The story stays in QA and goes to John. |

6. **A return is written down:** the failed check, a reproduction command, and expected vs
   observed.
7. **Fixes are new commits — never amend or rebase** — so every round is auditable and QA
   can diff from the last commit it reviewed.
8. **Re-review is delta-only:** what changed, plus whether prior findings are genuinely
   fixed. The mechanical gate is still re-run in full every round.
9. **Three QA rounds per story at most.** A third `BLOCK` stops the loop and goes to John.
10. **Out-of-scope discoveries are logged, not fixed.** The pre-existing red
    `tests/workshop` suite (§5.3) never returns a story.
11. **No remote writes during the sprint** — no push, PR, issue edit or sub-issue.

---

## 3. The stories

### 48.1 — Dev — Pin the Spec Kit and Azure Monitor versions, and have the weekly audit re-check them

| | |
|---|---|
| Owner | Vasher |
| Starts when | John approves |
| Closed by | 48.2 |
| Plan | §1, §3.1, §3.2, §3.7, §4, §6 · §8 steps 1, 2, 4 and 4a |

**Story.** As the author of Labs 22, 23 and 25, I want the Spec Kit release and the Azure
Monitor API versions pinned in `docs/_meta/registry.yaml`. Then no lab hardcodes a version,
every pin says when it was last checked, and the weekly audit re-checks each pin.

**Acceptance criteria**

1. All five values in §1 are re-verified against their primary sources **on the day of
   implementation**. §1 gains a new dated record; the 2026-09-22 record stays as history.
   *As of 2026-09-23 the latest Spec Kit release is `v1.0.10` (published
   2026-09-22T19:21:48Z), so the spec's `1.0.9` literal is already stale.*
2. The release notes of every Spec Kit release after `v1.0.8`, up to the one pinned, are
   read. Any change to the `specify` command list or the Copilot integration layout is
   recorded in §1.1 for #51–#53.
3. `spec_kit_version` and `spec_kit_version_last_verified` are top-level scalars placed per
   §3.1, and the comment names the version and date actually verified.
4. The `azure_monitor` block is placed per §3.2, with `last_verified` set to the date
   actually verified and `workspaces_tables_api_version_previous` kept.
5. `docs/_meta/registry.yaml` still parses as YAML, and its diff contains only those two
   additions.
6. The gate is green:
   `npx vitest run tests/lab-structure tests/meta tests/content-currency`. The count is
   recorded; if it is not 13 files / 183 tests, the difference is explained.
7. §3.1, §3.2, §4 and §6 rows 2–3 of the spec show the same values and dates as the
   registry.
8. **The weekly content audit re-checks both new keys** (John, 2026-09-23).
   `.github/workflows/weekly-content-audit.md` gains two checks: check 8 for
   `spec_kit_version`, and check 9 for every `azure_monitor.*_api_version`. Each check
   names its primary source. Each is **report-only**: it flags drift as needs-review and
   never edits the key. The checks name keys, not version literals (§4).
9. **The scheduled audit still passes its lock check, with no recompile.** The workflow's
   frontmatter is byte-identical, and no added line contains `${{`. gh-aw v0.50.1's own
   `computeFrontmatterHash` must give the edited file the hash stored in
   `weekly-content-audit.lock.yml`:
   `d1d2a6712f5160dd646bad8901a1ca229395fb551939fba9b7242ac3a553ee03`. Otherwise the lock's
   "Check workflow file timestamps" step fails the run. The lock is not recompiled.
10. **Every place that lists the audit's checks says nine:**
    - `docs/_meta/audit-report.template.md` — its Summary rows and its `### 8.` / `### 9.`
      sections;
    - `tests/workflows/audit-report-format.test.ts`;
    - the check list in `tests/workflows/weekly-audit-dry-run.test.ts`;
    - `README.md`'s Weekly Content Audit row;
    - `AGENTS.md`.

    `npx vitest run tests/workflows` fails only its four pre-existing `gh aw compile` tests
    (logged in this file's §4).
11. **The spec records the change:** a §3.7 section, rows in the §3 table for the files in
    AC 8–10, a §6 departure row, and §8 step 4a. What §1.1 and §7.2 say about the audit
    matches what it now does.

Round 2 also carries F1, F2 and the cadence fix (this file's §4, "Carried into 48.1
round 2").

**Hand-off.** Local commits, one per concern, each `<type>: <description>`, with files
added individually. The orchestrator records the SHAs in the Status row. The hand-off stays
on file and is not given to 48.2 (§2 rule 4).

### 48.2 — QA — Verify the version pins and the audit checks

| | |
|---|---|
| Owner | judge |
| Starts when | 48.1 is handed off. Runs in its own session, with a blind brief (§2 rules 2 and 4) |
| Closes | 48.1 |

**Story.** As the epic owner, I want each pin checked independently against its primary
source. Then the arc never ships a version whose `last_verified` date claims a check that
did not happen, and the weekly audit keeps each pin honest from then on.

**Minimum checks**

1. Every pinned value and date is confirmed by **re-opening its primary source**. What 48.1
   recorded in spec §1 (Record 2) and §1.1 is what is under test; it is not evidence. A
   release that shipped *after* 48.1's verification date is noted, not a defect: a dated pin
   that was true on its date is the intended state (§1.2).
2. The gate is re-run. It shows 13 files / 183 tests, or the difference is explained
   (48.1 AC 6).
3. 48.1's diff touches only the spec and the files that §3's table assigns to 48.1 (§3.1,
   §3.2, §3.7), and only where planned.
4. The spec and the registry agree on every value and date.
5. Relative links in the edited spec still resolve — `docs/epics/` is not gated (§2.2).
6. **Attack:** grep `labs/` and `README.md` for each newly pinned literal. None matched on
   2026-09-23. A hit in a file #48 did not touch is logged as out of scope — §4 limits the
   rule to files #48 creates or modifies.
7. **The audit checks hold up** (48.1 AC 8–10).
   - Checks 8 and 9 name the right keys and primary sources, and are report-only.
   - The frontmatter is byte-identical to `b4b0e45`'s.
   - Recompute the frontmatter hash yourself with gh-aw v0.50.1's own
     `frontmatter_hash_pure.cjs`, and compare it with the hash stored in the lock.
   - Every file AC 10 lists says nine.
   - `tests/workflows` fails only its four pre-existing compile tests.

   **Attack:** try to make the scheduled run fail its lock check. The lock's "Check workflow
   file timestamps" step fails the run if the hashes differ, or if the hash cannot be
   computed (gh-aw v0.50.1 `check_workflow_timestamp_api.cjs`).

### 48.3 — Dev — Scaffold Labs 21–26 so they pass CI from the first commit

| | |
|---|---|
| Owner | Vasher |
| Starts when | 48.2 has closed 48.1 |
| Closed by | 48.4 |
| Plan | §2.3–§2.6, §3.3–§3.6, §4 · §8 steps 3 and 5–7 |

**Story.** As the author of any lab in the arc, I want Labs 21–26 to exist as honest stubs
that already pass every gate, so that each later story starts green and adds only content.

**Acceptance criteria**

1. Six `labs:` entries, `lab21`–`lab26`, are appended after `lab20` exactly as in §3.3,
   each with all three pace fields and `pace_workshop_minutes` ≥ `pace_presenter_minutes`.
2. Six stubs, `labs/lab21.md`–`labs/lab26.md`, follow the §3.6 template: `title` matches
   the registry character for character, `lab_number` is the integer in the filename,
   `pace` matches the registry, and `registry: docs/_meta/registry.yaml` is present.
3. Stubs link only to files that exist; anything the arc has not built yet is named in
   backticks (§3.6, invariant 5).
4. `README.md` gains exactly the six Lab Modules rows in §3.4. The total-hours line, the
   learning-path note and the structure tree are untouched.
5. `labs/setup.md` gains exactly the one blockquote sentence in §3.5.
6. No stub contains a version literal (§4).
7. All of it lands in **one commit** — `enumeration-parity` requires `labs/`, the registry,
   `README.md` and `labs/setup.md` to agree in the same commit (§2.3).
8. The gate is green, with 13 files / 213 tests expected (§5.2). The actual count is
   recorded, and any difference is explained.
9. Nothing on §8's out-of-scope list is touched.

**Hand-off.** One local `docs:` commit, files added individually. 48.4 receives the commit
SHA and the gate output.

### 48.4 — QA — Verify the Labs 21–26 scaffolding

| | |
|---|---|
| Owner | judge |
| Starts when | 48.3 is handed off |
| Prep — may run while 48.3 is in dev | Record the `tests/workshop/time-budget.test.ts` result on 48.3's base commit, as the baseline |
| Closes | 48.3 |

**Story.** As the epic owner, I want the scaffolding checked across files, so that the
stubs, the registry, `README.md` and `labs/setup.md` agree — and the gate is shown to
enforce it.

**Minimum checks**

1. The gate is re-run, and its count matches 48.3's (213 expected).
2. `npx vitest run tests/workshop/time-budget.test.ts`: both `registry workshop-pace audit`
   assertions pass, and nothing fails beyond the prep baseline.
3. The spec's §5.4 manual checks, items 2–5.
4. **Mutation probe**, in a throwaway `git worktree` — never the live tree: delete one
   `README.md` row and confirm `enumeration-parity` fails, then remove the worktree. If
   the gate stays green, escalate to John: the acceptance evidence is hollow, and that is
   not a 48.3 defect.
5. The diff touches only the files in §3.3–§3.6 and nothing on §8's out-of-scope list.

### 48.5 — QA — Accept #48 against its own acceptance criteria

| | |
|---|---|
| Owner | judge — a fresh dispatch whose brief includes #48's body and the 48.2 and 48.4 verdicts, so settled ground is not re-opened |
| Starts when | 48.2 and 48.4 have closed |
| Closes | #48 locally — ready for John's push and PR decision |

**Story.** As the product owner, I want the whole branch checked against #48's own
acceptance criteria and the spec's departures, so that I approve a push knowing exactly
where the delivered work differs from the issue text, and why.

**Minimum checks**

1. A fresh gate run on the branch tip, with its count recorded. Also run
   `npx vitest run tests/workflows`: only its four pre-existing `gh aw compile` tests may
   fail (logged in this file's §4).
2. Each of #48's six checklist items is met, or its departure is recorded in §6 with a
   reason.
3. `git diff --stat b4b0e45..HEAD` lists only the planned files: the §3 table, the spec
   and this file.
4. Commit messages follow `<type>: <description>`, no secrets are present, and nothing has
   been pushed.
5. Every dev story was closed by its QA story, each QA verdict came from a blind brief
   (§2 rules 2 and 4), and every round is in the §4 sprint log.

**On PASS:** stop. John decides the push, the PR and its base branch, and whether these
stories become sub-issues under #48. #48 itself closes when that PR merges.

---

## 4. Sprint log

Filled in by the orchestrating session after every QA round. Each entry is committed on
its own (`docs: log <story> round <n>`), so the log never mixes with a dev story's diff.

| Round | Story | Commit reviewed | Verdict | Findings (S1 / S2 / S3) | Disposition |
|---|---|---|---|---|---|
| — | 48.1 — pre-review, **not 48.2** | `a09a2ca` | `ACCEPT WITH FINDINGS` | 0 / 0 / 2 | **Void as a QA round** (John, 2026-09-23). The session that dispatched the dev work also ran this review, and it briefed the reviewer with the dev hand-off, the dev brief and its own expected results, so the review was not blind. 48.1 stays open, and 48.2 round 1 has still to run, in its own session. The findings stand as input: see "Carried into 48.1 round 2" below. |
| 1 | 48.2 | `a09a2ca`, `0f70977`, `5c8ee48`, each against its parent | `PASS` | 0 / 0 / 0 | **48.2 closes, and so does 48.1** (§2 rule 5). 48.3 may start. Blind brief per §2 rule 4 — the spec, this file, #48's body and the three commits; no dev hand-off, no dev brief, no orchestrator expectations. No check came back `UNVERIFIED`. judge gathered its own evidence: re-opened all five primary sources (Spec Kit releases via `gh api`; the four Azure Monitor versions via Microsoft Learn), re-ran the gate itself at **13 files / 183 tests**, recomputed the frontmatter hash with gh-aw v0.50.1's own `computeFrontmatterHash` — `d1d2a67…` on both `b4b0e45` and HEAD, matching the lock, with three negative controls proving the function is not constant — and measured the `tests/workflows` baseline itself in a throwaway worktree at `b4b0e45` (4 failed / 12 passed, identical at HEAD, so 48.1 added no failure). Full verdict, kept for a later round's brief: `~/.copilot/session-state/7384743d-3725-47ad-a0fd-fb51d35af237/files/48.2-verdict-round-1.md`. New out-of-scope observations below: O1, O5, O6. |

**Carried into 48.1 round 2.** Per John, 2026-09-23: add the keys to the audit, and put spec
fixes where they are most relevant. 48.1 owns §1.1 and §3.1.

- **Audit keys** — the spec gives the weekly content-audit workflow as a reason for the
  2026-03-01 pin. It says the workflow "will flag the lag anyway" (§1.1, from `f2b8526`) and
  would "propose the bump on its own schedule" (§1.1's rejected alternative and §7.2, from
  `48d8f75`). But at `b4b0e45` its seven checks (`.github/workflows/weekly-content-audit.md`
  L59–65) covered neither `spec_kit_version` nor `azure_monitor`. **Decision: add the keys.** 48.1
  gains acceptance criteria for this (§3).
- **F1** — §1.1: "The seven refactor entries…" leaves out an eighth,
  `chore: refactor event domain layout` (github/spec-kit#4683, `v1.0.10`), which moved
  `specify event run`. The conclusion stands. Fix: "eight … and `event`", or drop the count.
- **F2** — the ⚠️ box in §1.1: "on 2026-09-22 that was `1.0.9`". But `v1.0.10` shipped later
  that same day, at 19:21:48Z. Fix: "at the 2026-09-22 pass that was `1.0.9`".
- **Cadence** — "Spec Kit releases roughly weekly" (epic A.3's wording, carried into the
  §3.1 block and the registry comment) understates the pace. The count right beside it is 11
  releases in about 33 days. Fix the wording in both places, keeping them text-identical.
  The epic itself is not edited.

**Out-of-scope discoveries — logged, not fixed (§2 rule 10).**

- **For John: the weekly audit has never run successfully.** It has run once, on schedule on
  `main` on 2026-09-20 (Actions run `35491126278`). That run failed in `Execute GitHub
  Copilot CLI` with `Error: Authentication failed` and the message *"Your GitHub token may be
  invalid, expired, or lacking the required permissions."* That is the `COPILOT_GITHUB_TOKEN`
  Actions secret. Until the secret is fixed, no audit check runs, including the two that
  48.1 round 2 adds.
- **`tests/workflows` was red before this sprint.** Baseline at `afa70e6`: 4 failed / 12
  passed. The four failures are its `gh aw compile` tests. gh-aw v0.86.2 rejects
  `microsoft-learn` and `context7` as `tools:` entries in the workflow's frontmatter
  (`Unknown properties`), and the committed lock was compiled with v0.50.1. 48.1 round 2
  must add no failure here, and must not recompile the lock. If the lock is ever
  recompiled, re-check the tool names in audit check 8 (spec §3.7): recompiling changes the
  GitHub MCP server image the lock pins.
- **Two pre-existing gaps in the audit, found in 48.1 round 2.**
  - Check 1 tells the agent to use `web-search`, but the workflow grants `web-fetch`.
  - `tests/workflows/audit-report-format.test.ts` counts the Summary table's rows but not
    their labels.
- **Found in 48.2 round 1** (blind; none is a 48.1 defect).
  - **O1** — Spec Kit **`v1.0.11`** shipped `2026-09-24T01:35:37Z`, superseding the `1.0.10`
    pin one day after its `2026-09-23` verification. Not a defect: a dated pin that was true
    on its date is the intended state (spec §1.2), and audit check 8 is the designed catch.
    Re-pin at the next cohort, not now.
  - **O5** — spec §3.6's "Link check" note says every `labNN.md` it names — *including
    21–26* — exists on disk "after this commit". Splitting #48 into two dev commits made
    that ambiguous: 21–26 exist only after 48.3. §3.6 is 48.3's section. → **48.3 / 48.4.**
  - **O6** — `CHANGELOG.md`'s `[Unreleased]` section records neither the audit going from
    seven checks to nine nor the two new report-only registry keys. No acceptance criterion
    requires it, and a single entry covering #48 whole reads better once 48.3 lands. → **48.5.**
- For information only:
  - `converge.md` changed in Spec Kit `v1.0.9` (github/spec-kit#4621). This matters for
    #51–#53.
  - The Microsoft Learn Bicep and Terraform samples still use `@2022-*` API versions, so
    Lab 25 (#54) must read the registry, not the samples.
  - The `1.0.8` grep hits in `labs/lab06.md:154` and `labs/appendices/node/lab06.md:71` are
    the substring of Copilot CLI `1.0.83`. Neither is a pin.
