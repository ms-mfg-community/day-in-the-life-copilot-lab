# EPIC-001 / Issue #52 — Stories (dev and QA)

The [spec](EPIC-001-52-lab23-spec.md) is the plan: *what* changes and *why*. This file is
the sprint: *who* does each piece, in what order, and what must be true before a piece can
close. Section references (§) point into the spec unless marked "this file".

| Field | Value |
|---|---|
| Parent epic | [EPIC-001](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Story | #52 — *Lab 23 — custom SDLC stages, gates and the rework loop (EPIC-001 U3)* |
| Plan | [EPIC-001-52-lab23-spec.md](EPIC-001-52-lab23-spec.md) |
| Stories | Five — two dev, three QA |
| Written | 2026-09-28 |
| Status | **Approved 2026-09-28.** 52.1 `Closed` by 52.2. 52.3 returned once by 52.4 round 1 (`BLOCK`, 1 S1) and re-passed at round 2 (`ACCEPT WITH FINDINGS`, 0 S1). **Every S1 and S2 raised in the sprint is fixed — none deferred.** Round-2's two findings are fixed and awaiting a delta re-review; **52.5 has not run.** |

---

## 1. The stories at a glance

| Story | Type | Owner | Title | Starts when | Closed by |
|---|---|---|---|---|---|
| 52.1 | Dev | Vasher | Refresh the pin record and build the Lab 23 artifacts | John approves the spec, this file, and §7.5–§7.7 | 52.2 |
| 52.2 | QA | judge | Verify the artifacts against the pinned release | 52.1 is handed off. Runs in its own session (§2 rule 2, this file) | — (closes 52.1) |
| 52.3 | Dev | Vasher | Write `labs/lab23.md` | 52.2 has closed 52.1 | 52.4 |
| 52.4 | QA | judge | Verify the lab teaches only what the pinned release does | 52.3 is handed off | — (closes 52.3) |
| 52.5 | QA | judge | Accept #52 against its own acceptance criteria | 52.2 and 52.4 have closed | — (readies #52 for John) |

```text
52.1 Dev ──▶ 52.2 QA ──PASS──▶ 52.3 Dev ──▶ 52.4 QA ──PASS──▶ 52.5 QA ──PASS──▶ John: push / PR?
  ▲             │                ▲             │
  └── return ◀──┘                └── return ◀──┘
```

A 52.5 finding goes back to the dev story that owns it. That story re-passes its own QA
story before 52.5 runs again.

**Why the artifacts come before the lab.** Same reason as #51: the lab's steps walk the
fixture files line-by-line. Writing the prose first means writing it against imagined files
and reconciling later, and every reconciliation is a chance for the lab to describe
something the artifact does not do. **#52 has a sharper version of this risk than #51 did**
— two of its central claims (§8 steps 2 and 3) are *behavioural* and cannot be settled by
reading the manifest at all.

---

## 2. How a story moves

**States:** `Ready` → `In dev` → `Ready for QA` → `In QA` → `Closed`, or
`In QA` → `Returned` → `In dev` and round again.

Rules 1–12 are carried unchanged from [#51's sprint](EPIC-001-51-stories.md) §2, which
worked: five rounds, zero regressions, every S1 and S2 fixed, none deferred.

1. **A dev story is closed only by its QA story — never by its owner.** Vasher hands off;
   it does not self-certify.
2. **QA is independent, read-only and blind.** A QA story runs in its own session. That
   session takes a QA mindset and did not dispatch the dev work it reviews. The one
   exception: the session that dispatched the dev work may run a blind-review sub-agent,
   briefed as in rule 4, and close the story on its verdict. judge never did the dev work
   it reviews and never edits files. Every verdict is recorded in the §4 sprint log.
3. **QA derives its own criteria** from the spec and the diff. The checks listed under each
   QA story are the floor, not the ceiling.
4. **Each QA brief is blind.** It carries, by path: the spec, this file, #52's body, the
   epic's U3 section, and the commit range under review. From round 2 it also carries that
   QA story's own earlier verdicts. It does **not** carry the dev hand-off, the dev brief,
   or what the orchestrator expects to find. QA gathers its own evidence.
5. **Verdict → state:**

   | judge verdict | What happens |
   |---|---|
   | `PASS` | The QA story closes, and so does its dev story. |
   | `ACCEPT WITH FINDINGS` | Closes once every **S2** is either fixed (story returned) or deferred by John in writing. An S2 that belongs to a later story is logged against that story instead. **S3** nits are batched into the next dev round or dropped; they never trigger a QA round on their own. |
   | `BLOCK` (any **S1**) | The dev story returns to `In dev`. |
   | Any check marked `UNVERIFIED` | Never a pass. The story stays in QA and goes to John. |

6. **A return is written down:** the failed check, a reproduction command, and expected vs
   observed.
7. **Fixes are new commits — never amend or rebase** — so every round is auditable and QA
   can diff from the last commit it reviewed.
8. **Re-review is delta-only:** what changed, plus whether prior findings are genuinely
   fixed. The mechanical gate is still re-run in full every round.
9. **Three QA rounds per story at most.** A third `BLOCK` stops the loop and goes to John.
10. **Out-of-scope discoveries are logged, not fixed.** The pre-existing red suites (spec
    §9) never return a story. Neither does the `labs/lab18.md` command-flow collision
    (spec §6/D5), nor anything in Lab 22 (spec §7.2 — log it against #55).
11. **No remote writes during the sprint** — no push, PR, issue edit, comment, label or
    sub-issue.
12. **A claim about Spec Kit is verified against the source at the pinned tag, or it is
    `UNVERIFIED`.** Not against training data, not against a web-search summary, and **not
    against this spec's §1.2 or §1.3 tables** — those are *what is under test*, not
    evidence for themselves. Every QA story below names the file and tag that settles each
    claim.

**Rule 13, new for #52 — a _behavioural_ claim is settled by running it, never by reading
the manifest.** #52 turns on two questions that no amount of schema-reading answers:
whether `insert_after` resolves against a step the same overlay just inserted (spec §3.4,
M15), and what happens to `tasks.md` when a spec changes (spec §1.3). A manifest that
validates proves the manifest is well-formed; it proves nothing about what the engine does
with it. **Both must be executed against a real `specify` install at the pinned tag**, and
the observed output recorded in the §4 log. An asserted answer to either is `UNVERIFIED`.

**Rule 14, new for #52 — the fixture must _install_, not merely validate.** #51's round 1
shipped a `bundle.yml` that carried every required key and was still rejected by
`specify bundle validate`. #52's equivalent trap is one layer deeper: the extension
namespace check (spec §1.2 criterion 1) fires at **install** time, not at manifest-parse
time. So `specify extension add --dev` must actually succeed, and the anti-vacuity control
(M13) must prove the check bites — rename a command to `speckit.contoso.epic` on a
throwaway copy and confirm the install *fails*.

---

## 3. The stories

### 52.1 — Dev — Refresh the pin record and build the Lab 23 artifacts

| | |
|---|---|
| Owner | Vasher |
| Starts when | John approves the spec, this file, and the three open decisions (§7.5, §7.6, §7.7) |
| Closed by | 52.2 |
| Plan | §1, §3.1, §3.3–§3.6, §4, §7 · §8 steps 1–7 |

**Story.** As the author of Lab 23, I want the extension and the overlay built and proven
to install against the pinned release, so the lab's prose has something real to describe
and Lab 22's already-published bundle promise is honoured.

**Acceptance criteria**

1. **The Spec Kit release is re-verified on the day of implementation**, against
   `gh api "repos/github/spec-kit/releases?per_page=10"`. Spec §1 gains a dated record if
   it has moved past `v1.0.12`; Records 1–5 stay as history. If it has moved, the release
   notes of every newer release are read and §1.1 records any change to the gate step, the
   overlay schema, the extension namespace check, or the `specify workflow` command list —
   and §1.2's eight criteria are re-checked against the new tag **before anything else
   proceeds**.
2. `docs/_meta/registry.yaml` carries `spec_kit_version_last_verified` set to the date
   **actually verified**, with the §3.1 comment addition. **`spec_kit_version` changes only
   if the release actually moved.** The `RE-VERIFICATION OBLIGATION` header, the generic
   lead paragraph, and every existing dated sentence are **preserved**, not replaced.
3. `docs/_meta/registry.yaml` still parses as YAML, and its diff contains **only** that
   comment addition and that one date (or the pin too, if it moved).
4. The fixture tree exists exactly as §3's table rows 3–11 lists it, under
   `labs/fixtures/lab23/`.
5. `extension.yml` matches §3.3. `extension.id` is `contoso-review`; **both command names
   use that exact namespace** (`speckit.contoso-review.epic`,
   `speckit.contoso-review.qa-review`); `provides.templates` and `provides.scripts` entries
   carry **unnamespaced** `^[a-z0-9-]+$` names; **no entry carries `strategy`**; no `hooks:`
   block names a non-core event.
6. **The extension installs clean** — `specify extension add --dev
   ../labs/fixtures/lab23/contoso-review` exits 0 against a real `specify` at the pinned
   tag (rule 14, this file).
6a. **Anti-vacuity control (M13):** on a throwaway copy, rename a command to
   `speckit.contoso.epic` and confirm the install **fails** with *"must use extension
   namespace 'contoso-review'"*. A validator that accepts everything has verified nothing.
7. `overlays/contoso-stages.yml` matches §3.4. `id` and `extends` contain **no dots**; no
   step `id` contains `:`; every edit uses the shorthand form and **none mixes** shorthand
   with explicit `operation:`/`anchor:`; every gate declares `message` and an `options` list
   containing `reject`; every `on_reject` is one of `abort` / `skip` / `retry`.
8. **The overlay validates and adds** — `validate_overlay_yaml` returns `[]`, and
   `specify workflow overlay add ../labs/fixtures/lab23/overlays/contoso-stages.yml`
   places it at `.specify/workflows/overlays/speckit/contoso-stages.yml` (spec §1.2
   criterion 3). The **observed on-disk path** is recorded.
9. **§8 step 3 is executed, not assumed (rule 13, M15):** the overlay is actually run, and
   whether `insert_after: epic` resolves against the step this same overlay inserted is
   **observed**. If it does not, the edits are restructured and **spec §3.4 is updated in
   the same commit**.
10. **§8 step 2 is executed, not assumed (rule 13):** the `tasks.md`-on-spec-change
    behaviour is observed against a real run, and the finding is recorded in the §4 log for
    52.3 to write up. An asserted answer is `UNVERIFIED`.
11. **The M14 Lab 22 cross-check is run** (§3.5): with the extension installed, the online
    `specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle` reports
    **only** `workflow:contoso-sdlc@1.0.0` as unresolved. The actual output is recorded.
    ⚠️ If `extension:contoso-review` is still reported unresolved, that is an **S1 against
    this story**, not a Lab 22 defect.
12. `labs/fixtures/lab23/README.md` explains each artifact, names the lab section that uses
    it, states that the `contoso` URLs are illustrative and unreachable, and states that
    the overlay's on-disk home differs from its source path.
13. Nothing on §3's "not touched" list is touched — in particular `README.md`,
    `labs/setup.md`, `labs/lab18.md`, `labs/lab22.md`, `labs/fixtures/lab22/**`, and
    `weekly-content-audit.lock.yml`.
14. The gate is green: `npx vitest run tests/lab-structure tests/meta tests/content-currency`.
    The count is recorded; if it is not **13 files / 213 tests**, the difference is
    explained before the hand-off (§5.1).
15. The `%TEMP%` spec-kit clone and every demo project used for verification are **not**
    committed.

**Hand-off.** Local commits, one per concern, each `<type>: <description>`, with files
added individually (`git add <path>` — `git add .` and `git add -A` are forbidden by
`AGENTS.md` and would sweep in John's four uncommitted files, §7.4). The orchestrator
records the SHAs in the §1 Status row. The hand-off stays on file and is **not** given to
52.2 (§2 rule 4).

### 52.2 — QA — Verify the artifacts against the pinned release

| | |
|---|---|
| Owner | judge |
| Starts when | 52.1 is handed off. Runs in its own session, with a blind brief (§2 rules 2 and 4, this file) |
| Closes | 52.1 |

**Story.** As the epic owner, I want every artifact checked against the Spec Kit source
itself, so the arc never ships a manifest Spec Kit would reject at install or an overlay
that silently does nothing.

**Minimum checks**

1. **The pin is re-derived independently.** Re-open
   `gh api "repos/github/spec-kit/releases?per_page=10"`. Spec §1's Record 5 is what is
   under test, not evidence (§2 rule 12). A release that shipped *after* 52.1's
   verification date is **noted, not a defect** — a dated pin that was true on its date is
   the intended state. A `last_verified` date with no corresponding check **is** a defect.
2. **The registry diff is exactly the comment addition and the date**, and the file still
   parses.
3. **Attack the namespace claim — this is the single highest-value check in the story.**
   Find the install-time check yourself. **Grep the whole `src/` tree rather than trusting
   spec §1.2's line numbers** — refactor #4747 already moved `get_active_catalogs` out of
   `presets/__init__.py` during #51, and the extensions module may move the same way.
   Confirm for yourself whether the command's middle segment **must** equal `extension.id`.
   If it need not, spec §6/D1 is wrong and the fixture is carrying an unnecessary
   constraint — an **S2**. If it must, confirm the fixture obeys it.
4. **Run Spec Kit's own validators, in a venv built from the pinned tag**, with the
   **anti-vacuity control** (§2 rule 14):
   - `extension.yml` — accepted by `ExtensionManifest`, **and** `specify extension add
     --dev` exits 0. Then break a copy (bad namespace, a `strategy` key on a template, a
     dotted template name) and confirm each is **rejected**.
   - `contoso-stages.yml` — `validate_overlay_yaml` returns `[]`. Then break a copy (a dot
     in `id`, a mixed shorthand/explicit edit, a step id containing `:`, an `on_reject:
     rework`) and confirm each is **rejected**.
5. **Attack the `on_reject` claim.** Read `step/gate/__init__.py` at the pinned tag and
   confirm for yourself that the accepted set is exactly `{abort, skip, retry}` and that
   **no backward-jump form exists**. Spec §1.2 and §6/D4 rest entirely on this, and so does
   the whole of lab section 23.6. If a jump form exists, that is an **S1** against the
   spec.
6. **Attack the overlay-path claim.** Confirm from `overlay/layer_sources.py` and
   `overlay/operations.py` whether the directory under `overlays/` is keyed by the
   **extended workflow's** id or the overlay's own. Spec §6/D2 says the former. **Verify by
   running `specify workflow overlay add` and looking at the resulting path**, not only by
   reading (§2 rule 13).
7. **Verify the M15 anchor-order finding independently** (§2 rule 13). 52.1 claims an
   observed result for `insert_after: epic`. Re-run it. An anchor order that only works in
   the dev session is not a result.
8. **Verify the M14 Lab 22 cross-check independently** (§3.5). Install the extension and
   run the online `bundle validate` yourself. Confirm `extension:contoso-review@1.0.0` is
   no longer reported unresolved **and** that `workflow:contoso-sdlc@1.0.0` still is —
   both halves matter. A lab that claimed the overlay resolved the workflow reference would
   be an **S1**.
9. **Attack the hook-event claim.** Confirm from the extension manifest validator that an
   unknown hook event name is **not** rejected (spec §6/D3). If it *is* rejected, the
   spec's central honest-caveat is wrong — **S2**, and lab section 23.8 must change.
10. Every YAML fixture parses as YAML; every declared `file:` path exists on disk.
11. The gate is re-run and shows 13 files / 213 tests, or the difference is explained
    (52.1 AC 14).
12. **No version literal check:** `Select-String -Path labs\fixtures\lab23\* -Recurse
    -Pattern '\b\d+\.\d+\.\d+\b'` — hits are allowed **only** as Contoso artifact versions
    (`version: "1.0.0"`) or `>=` floors, never as the pinned Spec Kit release (§4 rule 3).
13. 52.1's diff touches only the files §3's table assigns to it, and only where planned.
    **John's four uncommitted files are still uncommitted and unmodified** (§7.4).
14. **Nothing under `labs/fixtures/lab22/` or in `labs/lab22.md` was modified** (§7.2).
15. Relative links in the edited spec still resolve — `docs/epics/` is not gated.

### 52.3 — Dev — Write `labs/lab23.md`

| | |
|---|---|
| Owner | Vasher |
| Starts when | 52.2 has closed 52.1 |
| Closed by | 52.4 |
| Plan | §2.3, §2.4, §3.2, §4 · §8 steps 8–11 |

**Story.** As a learner, I want Lab 23 to teach me how to add my org's stages and gates to
the Spec Kit SDLC, so I leave able to do it — and, just as importantly, knowing exactly
which parts of it the tool does **not** enforce.

**Acceptance criteria**

1. **Frontmatter is byte-identical to the stub's.** Only the body below the closing `---`
   changes. `title`, `lab_number`, and both `pace` values are untouched, and still match
   `labs.lab23` in the registry character-for-character (§2.4).
2. The body follows §3.2's section order.
3. All **eight** of the epic's U3 acceptance criteria are satisfied in the prose, **as
   corrected by §6's departures** — the two-command extension with its template and script,
   the overlay with `extends`/`insert_after`/`type: gate`/`on_reject`, the overlay's real
   on-disk location, `run`/`status --json`/`resume` with the run-state path, the
   chat-ordering caveat with `check-prerequisites` as the second belt, the hook-event
   caveat, the `feature.json` caveat, and the rework loop.
4. **All five honest caveats from §3.2 appear, and none is softened.** In particular the
   lab states that `on_reject` has **no** backward-jump form, that an unknown hook event
   **installs clean and silently never fires**, and that **validation is staged** — a `✓`
   from `overlay add` does not mean the overlay will run.
5. **The command namespace rule is explained, not just obeyed** (§6/D1) — the lab says why
   `speckit.contoso.epic` is rejected when the extension id is `contoso-review`.
6. **The overlay location is stated as the _extended workflow's_ id** (§6/D2) —
   `.specify/workflows/overlays/speckit/`, never `.../overlays/contoso-stages/`.
7. **The rework loop is written from the observed behaviour recorded in the §4 log** (52.1
   AC 9 and AC 10), at the depth John chose in §7.6. Nothing about `tasks.md` is asserted
   beyond what was actually run.
8. **Step `type` keys are exact** — `do-while`, `if`, `while`, `fan-in`, `fan-out` (§1.3).
   The module names `do_while`, `if_then`, `while_loop` appear nowhere as YAML values.
9. **No Spec Kit release literal** anywhere in the file. Binding check (§4 rule 4):
   `Select-String -Path labs\lab23.md -Pattern '\b\d+\.\d+\.\d+\b'` — every hit must be a
   Contoso artifact version or a `>=` floor, and each is classified. ⚠️ If the base
   workflow is quoted, **its `steps:` only** — not its `workflow:` or `requires:` blocks
   (§4, the #52 wrinkle).
10. The literal `docs/_meta/registry.yaml` is **retained** (§4 rule 2).
11. Fixture artifacts are referenced as **inline code paths in backticks**, never as
    markdown links (§2.3). Markdown links point only to targets that exist — and the stub's
    `../docs/epics/...` banner link is **removed with the stub**, not carried forward
    unchecked (§2.3 warning).
12. **Lab 23 does not contradict Lab 22** (M16) — in particular Lab 22's "built later" note
    and its CLI-vs-VS-Code framing (§6/D10). The lab does **not** claim the overlay
    resolves the bundle's `workflow:contoso-sdlc` reference.
13. Every `specify` invocation in the lab is one verified in spec §1.2 or §1.3.
14. The gate is green at **13 files / 213 tests**. The actual count is recorded, and any
    difference is explained (§5.1).

**Hand-off.** One local `docs:` commit, files added individually. 52.4 receives the commit
SHA and the gate output.

### 52.4 — QA — Verify the lab teaches only what the pinned release does

| | |
|---|---|
| Owner | judge |
| Starts when | 52.3 is handed off |
| Prep — may run while 52.3 is in dev | Record the gate result on 52.3's base commit, as the baseline |
| Closes | 52.3 |

**Story.** As the epic owner, I want every instruction in the lab traced to the Spec Kit
source at the pinned tag, so a learner who follows it end-to-end never hits a dead end —
and never believes a gate is enforcing something it is not.

**Minimum checks**

1. The gate is re-run, and its count matches 52.3's (213 expected) and the prep baseline.
2. **Every `specify` command in the lab is executed-or-traced against the pinned tag**
   (§2 rule 12). For each: the command group exists, the flag exists, and the flag does
   what the lab says. A command that cannot be traced is `UNVERIFIED` — never a pass.
3. **Spec §5.3's manual checks M1–M16**, each run independently rather than accepted.
4. **Walk the lab as a learner would, end to end, in a throwaway project.** This is the
   check that catches a lab which is true sentence-by-sentence and still does not work: run
   `specify init`, install the extension, add the overlay, run the workflow, reject a gate,
   resume, and confirm each observed result matches what the lab says will happen. Any
   divergence is at least an **S2**; a step that cannot be completed as written is an
   **S1**.
5. **Attack the gate-enforcement framing.** Confirm for yourself that typing a command in
   chat is genuinely not blocked, and that the lab says so plainly. A lab that implies the
   workflow engine constrains chat is an **S1** — it is the exact over-claim U3's
   honest-caveat requirement exists to prevent.
6. **Mutation probe, in a throwaway `git worktree` — never the live tree.** Confirm the
   gate enforces what 52.3 relies on: change `lab_number`, and confirm
   `labs-have-frontmatter` fails; convert one fixture code-path reference into a markdown
   link to a non-existent file, and confirm `links-resolve` fails. Restore; `git status`
   empty after each. A gate that does **not** fail is the finding.
   > ⚠️ **Do not expect the frontmatter `title` mutation to fail.** #51's round-4 probe
   > proved it does **not** — `enumeration-parity` asserts lab **ID** presence only, and
   > the full gate stays green at 13/213 with a drifted title. That is precisely why the
   > title agreement is manual check **M10**. A QA round that reports the title mutation as
   > a gate failure has mis-measured.
7. **Cross-check the lab against the fixtures it describes.** Every path, key and value the
   prose quotes must exist in the file it names. A lab that describes an `on_reject: retry`
   while the overlay ships `abort` is an **S1**.
8. **Re-verify the rework-loop prose against observed behaviour** (§2 rule 13). The lab's
   claims about what rejection does, and about `tasks.md`, must match what actually
   happens — not what the schema permits.
9. 52.3's diff touches `labs/lab23.md` and nothing else.
10. **John's four uncommitted files are still uncommitted and unmodified** (§7.4).

### 52.5 — QA — Accept #52 against its own acceptance criteria

| | |
|---|---|
| Owner | judge |
| Starts when | 52.2 and 52.4 have closed |
| Closes | — (readies #52 for John's push and PR decision) |

**Story.** As John, I want one independent pass over the whole of #52 before anything is
proposed for push, so that what reaches a PR is judged against the issue and the epic —
not against the sprint's own checklists.

**Minimum checks**

1. **Acceptance criteria are re-derived from #52's body and the epic's U3**, not from this
   file. Each of U3's eight criteria is marked satisfied / departed-with-cause / unmet.
   Every departure must be findable in spec §6 with a stated reason; an **undocumented**
   departure is a finding.
2. **The three user stories are checked as outcomes, not as checkboxes.** US-3.1 (custom
   stages), US-3.2 (work stops at a gate), US-3.3 (rework is first-class). ⚠️ **US-3.3
   deserves the hardest look** — spec §6/D4 concedes that Spec Kit has no backward jump, so
   the question is whether the lab's answer is genuinely useful to a tech lead or whether
   it quietly under-delivers the story. That judgement is this story's to make.
3. **The whole branch diff is reviewed**, not just #52's commits — the branch carries #51's
   22 unpushed commits too, and #52 sits on top of them.
4. **Full-suite delta**, not absolutes: `npx vitest run` compared against the recorded
   baseline of 45 failed / 437 passed, with the failing-test **identities** compared, not
   only the counts (§5.2).
5. **The content gate is re-run** and reported: expected 13 files / 213 tests.
6. **John's four uncommitted files are still uncommitted and unmodified** (§7.4), and no
   remote write has occurred (§2 rule 11).
7. **The hand-off is checked for honesty.** Anything recorded as verified must have a
   reproduction. Anything not verified must be labelled so. A confident summary over an
   unverified claim is itself a finding.

---

## 4. Sprint log

Every QA round is recorded here: story, round, verdict, severity counts, findings, and the
commit range reviewed.

| Round | Story | Verdict | S1 / S2 / S3 | Commit range | Notes |
|---|---|---|---|---|---|
| 1 | 52.2 | **ACCEPT WITH FINDINGS** | 0 / 2 / 3 | `b25bda6~1..71fe1ad` | Plus 1 S2 logged against 52.5. All 15 minimum checks `VERIFIED`, **none `UNVERIFIED`**. judge rebuilt its own `v1.0.12` venv, re-ran every F1–F10 observation, and additionally ran the composed workflow end-to-end — the `epic` command wrote `.specify/epics/test-feature/epic.md`, the gate fired with the fixture's message, and the run paused at `review-epic`. All four anti-vacuity mutations bit. Gate re-run green at 13/213. Read-only confirmed; HEAD unchanged |
| 1 | 52.4 | **BLOCK** | 1 / 3 / 3 | `bc4c1b1..2d6ceb4` | Plus **2 `UNVERIFIED`**. judge rebuilt its own `v1.0.12` environment and walked the lab end to end as a learner. Gate green at 13/213 both times; mutation probe behaved (and correctly did **not** report the title mutation). Six anti-vacuity mutations bit. **Returned 52.3 to `In dev`.** |
| 2 | 52.4 | **ACCEPT WITH FINDINGS** | 0 / 1 / 1 | `2d6ceb4..ea9e77c` | **All eight round-1 findings independently re-verified as `GENUINELY FIXED`** — judge rebuilt its environment and re-ran each, including observing `workflow run` end to end this time (the agent wrote `.specify/epics/widget-audit-trail/epic.md`, then the run paused at `review-epic`). Gate green at 13/213 twice. One new S2 and one S3 introduced by the round-1 delta |
| 3 | 52.4 | *pending* | — | `ea9e77c..HEAD` | Round-2 fixes recorded below, awaiting re-review |

**Disposition of 52.2 round 1 — both S2s fixed, all three S3s fixed, none deferred.**

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| F-1 | S2 | The fixture README's M14 proof is not reproducible from its own commands — it silently assumes the Lab 22 preset is installed, so a clean project reports **two** unresolved references, not one. F9 in this log omitted the precondition too, so 52.3 would have inherited it | **Fixed.** Precondition added to `labs/fixtures/lab23/README.md` and to F9 below; new manual check **M18** binds it for 52.3/52.4 |
| F-2 | S2 | Spec §1.3 prose said "**Four** module names differ from their YAML `type` keys"; five do (`do_while`, `fan_in`, `fan_out`, `if_then`, `while_loop`). The adjacent table and 52.3 AC 8 were already correct | **Fixed.** Prose corrected to five and each one named inline |
| F-3 | S3 | `registry.yaml` recorded the weaker `releases/latest` command; `releases/latest` excludes prereleases and cannot establish "nothing newer" alone. The *conclusion* was independently re-derived as correct | **Fixed.** Comment now records the `?per_page=10` form and says why it is preferred |
| F-4 | S3 | The `qa-review` command offered bash and PowerShell blocks with no "pick your platform" line, and only one script set ships per init | **Fixed** in both command files |
| F-5 | S3 | `.gitattributes` guards `scripts/hooks/**/*.sh` and `packaging/core/**/*.sh` with `eol=lf` but not `labs/fixtures/**/*.sh`. The committed blob is clean (0 CRLF), so not a defect in the commit — but **this work ships the first `.sh` under `labs/fixtures/`**, and a Windows learner with `core.autocrlf=true` would hit `/usr/bin/env: 'bash\r'` | **Fixed.** `labs/fixtures/**/*.sh text eol=lf` added. Tightly coupled to this change, so in scope |
| Obs A | — | `on_reject` is validated only at `specify workflow run` — a bad value passes `validate_overlay_yaml`, `overlay add` **and** `resolve` silently. The M15 anchor error is the mirror image, passing `overlay add` and failing at `resolve` | **Promoted to spec §3.2 honest-caveat 5 and manual check M17.** Validation is staged; a ✓ from one stage does not clear the next |
| — | S2 | #52's body sketches `constitution → epic → feature-spec → …`, but the overlay inserts no `constitution` stage — `constitution` is a core *command*, not a base workflow step, so there is no anchor to insert around. U3 does not require it | **Logged against 52.5**, per §2 rule 10, and **documented as departure D11** so it is no longer an undocumented omission. Acceptance-scope call is John's/52.5's |

**Disposition of 52.4 round 1 — the S1, all three S2s and all three S3s fixed; both `UNVERIFIED` items addressed. None deferred.**

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| S1-1 | **S1** | §23.9's `specify workflow overlay list` exits 2 — *"Missing argument 'workflow_id'"*. The **Verify** section dead-ended | **Fixed.** Now `specify workflow overlay list speckit`, with a note explaining that overlays are stored per workflow. Confirmed at source: `overlay/command_list.py` declares `workflow_id: str = typer.Argument(...)` — required |
| S2-1 | S2 | §23.1 attributed the six-step list to `specify workflow list`, which prints only the workflow's name and summary | **Fixed.** Now `specify workflow info speckit` — `command_info.py`'s docstring is *"Show workflow details and step graph"*. The YAML itself was already accurate |
| S2-2 | S2 | §23.3's "prove the namespace rule" step produced *"already installed"*, not the namespace error, because the extension was installed two steps earlier. A learner would see the right exit code from the wrong check | **Fixed.** Step now uses `--force` and says why. Same class as round 1's F-1 — a proof that silently depended on prior state |
| S2-3 | S2 | §23.8 caveat 2 listed **nine** hook-event commands; core defines **ten**. `converge` has a full `before_`/`after_` pair | **Fixed** in the lab **and** in spec §1.2 criterion 6, §3.2 caveat 2 and M8. ⚠️ **Root cause worth keeping:** the first draft trusted `extensions/EXTENSION-API-REFERENCE.md:616-638`, which is **stale at this tag**. I re-derived it independently: `Select-String -Path templates\commands\*.md -Pattern 'hooks\.(before\|after)_'` returns twenty events including `hooks.before_converge` (`converge.md:22`) and `hooks.after_converge` (`:246`). **The command templates are ground truth; the reference doc is not.** M8 now says so |
| S3-1 | S3 | §23.7's run-state listing omitted `workflow.yml` | **Fixed**, with the reason it matters — the run keeps its own copy of the composed workflow, so editing an overlay mid-run does not retarget a run in flight |
| S3-2 | S3 | §23.2's manifest excerpt showed one template; the fixture ships two | **Fixed** — `qa-review-template` added to the excerpt |
| S3-3 | S3 | §23.2 said the `git` extension does "exactly this" while noting it declares no `provides.scripts` — internally loose | **Fixed.** Now distinguishes the shared per-runtime *layout* from the optional *declaration* |
| U-1 | UNVERIFIED | §23.9's `workflow run speckit # the epic gate renders and waits` could not be observed end to end — the `epic` step dispatches to a Copilot CLI agent absent from the QA environment, so the run failed at step 0 | **Addressed.** The annotation was also misleading even with an agent present: the epic **command** runs before the gate. §23.7 now says the run dispatches `speckit.contoso-review.epic` to the agent first and stops at the gate afterwards, and §23.9's comment matches. Gate rendering, the non-TTY pause and `resume` were each verified independently by judge |
| U-2 | UNVERIFIED | §23.0's `uv tool install … @v<version>` was traced, not executed | **Addressed in round 2** — judge executed it there. See the round-2 table below |

**Disposition of 52.4 round 2 — both findings fixed, none deferred.**

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| R2-1 | S2 | The round-1 fix for S2-3 added a *"check the list yourself"* tip pointing at `.specify/templates/commands/*.md` — **which does not exist in a learner's project.** That is the *source-repo* path with a `.specify/` prefix. A learner following the lab's own remedy for S2-3 gets a path error, or zero results they read as "no hooks" | **Fixed.** Re-verified by running `specify init … --integration-options="--commands"` at the pinned tag: `.specify/templates/` holds only the five bare templates and has **no `commands/` subdirectory**. The command bodies are at `.github/agents/speckit.*.agent.md` on the `--commands` layout this lab uses, and `.github/skills/speckit-*/SKILL.md` on the default skills layout. **Both were confirmed to return the same twenty events over ten commands, `converge` included.** The tip now names the `--commands` path first, the skills path second, and spec M8 distinguishes clone-path from project-path |
| R2-2 | S3 | The lab quoted the error as *"Missing argument 'workflow_id'"*; the CLI prints `WORKFLOW_ID` | **Fixed** — case corrected |
| U-2 | — | Round 1 left the `uv tool install` line `UNVERIFIED`, and my round-1 disposition accepted it on the grounds that it already ships in Lab 22 and *"passed #51's five QA rounds"*. judge rightly called that **an appeal to prior review, not evidence**, and then settled it by **execution**: the exact form resolved `v1.0.12`, built, and reached dependency resolution, failing only on a TLS-intercepted PyPI on that host | **Noted, no change to the lab.** The correction to my reasoning is accepted and recorded: the line stands because it was executed, not because #51 blessed it |

### Logged for 52.5 (not returned to 52.3)

- **Issue #52 task 6** — how an epic relates to the specs beneath it — is satisfied in the
  **fixture** (`epic-template.md`'s "Specs under this epic" table) but never mentioned in
  the lab prose, and §6 records no departure. §3.2's required section order does not ask
  for it. Acceptance-scope call.
- **U3's honest-caveat text writes `/speckit-plan`** (hyphen). The `--commands` layout this
  arc uses installs **dotted** agents, so the lab's `/speckit.plan` is correct and **the
  epic carries the error** — the same class as O4, and another remote write for John.

### 52.1 — observed behaviour (rule 13)

Recorded during implementation on **2026-09-28**, against `specify 1.0.12` installed from a
`v1.0.12` clone into a throwaway venv, driving a throwaway project outside the repo. These
are **observations, not assertions** — 52.2 re-runs each independently, and 52.3 writes the
lab from them.

| # | Question | Observed | Consequence |
|---|---|---|---|
| F1 | Where does `workflow overlay add` put an overlay? | `.specify/workflows/overlays/**speckit**/contoso-stages.yml` — the directory is the **extended workflow's** id | Confirms spec §6/D2. Story AC 8 ✅ |
| F2 | Can an edit anchor on a step the same overlay inserted? | **No.** `insert_after: epic` → *"Edit 1: anchor 'epic' does not match any base step id."* Edit indices are **0-based** | Fixture restructured to base-only anchors; spec §3.4 corrected. Story AC 9 ✅ (M15) |
| F3 | How do sibling edits sharing one anchor order themselves? | **Authoring order**, not reversed. Two `insert_before: specify` → `epic`, then `review-epic` | This is what places each gate after its stage. Worth a line in the lab |
| F4 | Does the composed workflow match U3's intent? | `epic → review-epic → specify → review-spec → plan → review-plan → tasks → implement → qa-review → review-qa` | An addition to the base workflow, not a replacement |
| F5 | Does the extension install? | ✅ `specify extension add --dev` exits 0, both commands registered | Story AC 6 ✅ |
| F6 | Does the namespace rule actually bite? | ✅ `speckit.contoso.epic` → *"Validation Error: Command 'speckit.contoso.epic' must use extension namespace 'contoso-review'"*, exit 1 | Proves spec §6/D1. Story AC 6a ✅ |
| F7 | Is `strategy` rejected on an extension template? | ✅ *"Invalid template entry 'epic-template': 'strategy' is not authorable…"*, exit 1 | Anti-vacuity control |
| F8 | Is a dotted template name rejected? | ✅ *"Invalid template name 'epic.template': must be lowercase…"*, exit 1 | Anti-vacuity control |
| F9 | **M14** — does shipping the extension resolve Lab 22's bundle reference? | ✅ With `contoso-review` installed, online `bundle validate` reports **only** `workflow:contoso-sdlc@1.0.0` unresolved. ⚠️ **Precondition:** the Lab 22 preset must also be installed (`specify preset add --dev ../labs/fixtures/lab22/contoso-sdd`, Lab 22 §22.4) — without it `preset:contoso-sdd@1.0.0` is reported unresolved too and the output has **two** lines, not one | Lab 22's committed promise honoured; the overlay correctly does **not** satisfy the workflow ref. Story AC 11 ✅. **52.3 must carry the precondition into the lab's prose** — Lab 22 §22.7 states it; this fixture must not drop it |
| F10 | What happens to `tasks.md` when the spec changes? | `setup-tasks` **never writes** the file — it emits `TASKS_TEMPLATE_CONTENT` as JSON. `templates/commands/tasks.md` step 4 says *"Generate tasks.md: Use TASKS_TEMPLATE_CONTENT … as the structure"*, and every emitted task carries an unchecked `- [ ]`. **Nothing reads, preserves or merges an existing `tasks.md`** | Story AC 10 ✅. ⚠️ **Scope limit:** what is verified is the *instruction the agent is given*, not what every agent will do. Spec §1.3 states it at exactly that strength; 52.3 must not strengthen it |
