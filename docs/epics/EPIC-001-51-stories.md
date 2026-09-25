# EPIC-001 / Issue #51 — Stories (dev and QA)

The [spec](EPIC-001-51-lab22-spec.md) is the plan: *what* changes and *why*. This file is
the sprint: *who* does each piece, in what order, and what must be true before a piece can
close. Section references (§) point into the spec unless marked "this file".

| Field | Value |
|---|---|
| Parent epic | [EPIC-001](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Story | #51 — *Lab 22 — centralized Spec Kit templates and org catalog (EPIC-001 U2)* |
| Plan | [EPIC-001-51-lab22-spec.md](EPIC-001-51-lab22-spec.md) |
| Stories | Five — two dev, three QA |
| Written | 2026-09-25 |
| Status | **Draft — awaiting John's approval of this file and the spec.** No story has started. Nothing is committed. |

---

## 1. The stories at a glance

| Story | Type | Owner | Title | Starts when | Closed by |
|---|---|---|---|---|---|
| 51.1 | Dev | Vasher | Re-pin Spec Kit and build the Lab 22 artifacts | John approves the spec and this file | 51.2 |
| 51.2 | QA | judge | Verify the pin and the artifacts against the pinned release | 51.1 is handed off. Runs in its own session (§2 rule 2, this file) | — (closes 51.1) |
| 51.3 | Dev | Vasher | Write `labs/lab22.md` | 51.2 has closed 51.1 | 51.4 |
| 51.4 | QA | judge | Verify the lab teaches only what the pinned release does | 51.3 is handed off | — (closes 51.3) |
| 51.5 | QA | judge | Accept #51 against its own acceptance criteria | 51.2 and 51.4 have closed | — (readies #51 for John) |

```text
51.1 Dev ──▶ 51.2 QA ──PASS──▶ 51.3 Dev ──▶ 51.4 QA ──PASS──▶ 51.5 QA ──PASS──▶ John: push / PR?
  ▲             │                ▲             │
  └── return ◀──┘                └── return ◀──┘
```

A 51.5 finding goes back to the dev story that owns it. That story re-passes its own QA
story before 51.5 runs again.

**Why the artifacts come before the lab.** The lab's steps walk the fixture files
line-by-line. Writing the prose first would mean writing it against imagined files and
reconciling later, and every reconciliation is a chance for the lab to describe something
the artifact does not do — the exact failure mode #51's body warns about.

---

## 2. How a story moves

**States:** `Ready` → `In dev` → `Ready for QA` → `In QA` → `Closed`, or
`In QA` → `Returned` → `In dev` and round again.

Rules 1–11 are carried unchanged from [#48's sprint](EPIC-001-48-stories.md) §2, which
worked: three rounds, zero regressions, one S2, no third-`BLOCK` escalation.

1. **A dev story is closed only by its QA story — never by its owner.** Vasher hands off;
   it does not self-certify.
2. **QA is independent, read-only and blind.** A QA story runs in its own session. That
   session takes a QA mindset and did not dispatch the dev work it reviews. The one
   exception: the session that dispatched the dev work may run a blind-review sub-agent,
   briefed as in rule 4, and close the story on its verdict. judge never did the dev work
   it reviews and never edits files. Every verdict is recorded in the §4 sprint log.
3. **QA derives its own criteria** from the spec and the diff. The checks listed under each
   QA story are the floor, not the ceiling.
4. **Each QA brief is blind.** It carries, by path: the spec, this file, #51's body, the
   epic's U2 section, and the commit range under review. From round 2 it also carries that
   QA story's own earlier verdicts. It does **not** carry the dev hand-off, the dev brief,
   or what the orchestrator expects to find. QA gathers its own evidence. The dev hand-off
   stays on file, for John and the orchestrator.
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
    (spec §6, departure D5).
11. **No remote writes during the sprint** — no push, PR, issue edit, comment, label or
    sub-issue.

**Rule 12, new for #51 — a claim about Spec Kit is verified against the source at the
pinned tag, or it is `UNVERIFIED`.** Not against training data, not against a web-search
summary, not against this spec's §1.3 table. Spec §1.3 is *what is under test*; it is not
evidence for itself. Every QA story below names the file and tag that settles each claim.
This rule exists because #51's whole risk is a lab that reads plausibly and teaches a dead
end — and because the repo's own weekly audit cannot currently check the pin (#57).

---

## 3. The stories

### 51.1 — Dev — Re-pin Spec Kit and build the Lab 22 artifacts

| | |
|---|---|
| Owner | Vasher |
| Starts when | John approves the spec and this file |
| Closed by | 51.2 |
| Plan | §1, §3.1, §3.3–§3.8, §4, §7 · §8 steps 1–3 |

**Story.** As the author of Lab 22, I want the registry pinned to the release I actually
verified, and the three artifacts the lab teaches built and correct against that release.
Then the lab's prose has something real to describe, and no version literal has to live in
a lab file.

**Acceptance criteria**

1. **The Spec Kit release is re-verified on the day of implementation**, against
   `GET repos/github/spec-kit/releases/latest`. Spec §1 gains a dated record if it has moved
   past `v1.0.11`; Records 1–3 stay as history. If it has moved, the release notes of every
   release after `1.0.11` are read and spec §1.1 records any change to the `specify` command
   list or the Copilot integration layout — and §1.2's five constraints are re-checked
   against the new tag before anything else proceeds.
2. `docs/_meta/registry.yaml` carries `spec_kit_version` and
   `spec_kit_version_last_verified` set to the version and date **actually verified**, with
   the §3.1 comment block. Both stay top-level scalars in their current position. The
   `RE-VERIFICATION OBLIGATION` header and the generic lead paragraph above it are
   **preserved**, not replaced (§3.1).
3. `docs/_meta/registry.yaml` still parses as YAML, and its diff contains **only** that
   comment block and those two values.
4. The fixture tree exists exactly as §3 rows 3–10 lists it, under `labs/fixtures/lab22/`.
5. `preset.yml` matches §3.3 and demonstrates **all three** behaviours: `replace` (with
   `replaces:`), `wrap` (with `strategy: "wrap"`), `append` (with `strategy: "append"`).
6. `templates/plan-template.md` contains the literal **`{CORE_TEMPLATE}`** placeholder.
   `spec-template.md` and `tasks-governance.md` contain **no** placeholder.
7. `bundle.yml` matches §3.4 and declares `provides.presets`, `provides.extensions` and
   `provides.workflows`.
8. `preset-catalogs.yml` matches §3.5: org catalog `install_allowed: true`, community
   **re-declared** with `install_allowed: false`, and the first-match-wins warning comment.
   The key name is `install_allowed`, **never** `install_policy` (§1.3).
9. `catalog.json` matches §3.6 and is valid JSON.
10. `labs/fixtures/lab22/README.md` explains each artifact, names the lab step that uses it,
    and states that the `contoso` URLs are illustrative and unreachable.
11. Nothing on §3's "not touched" list is touched — in particular `README.md`,
    `labs/setup.md`, `labs/lab18.md`, and `weekly-content-audit.lock.yml`.
12. The gate is green: `npx vitest run tests/lab-structure tests/meta tests/content-currency`.
    The count is recorded; if it is not **13 files / 213 tests**, the difference is explained
    before the hand-off (§5.1).
13. The `%TEMP%` spec-kit clone used for verification is not committed.

**Hand-off.** Local commits, one per concern, each `<type>: <description>`, with files added
individually (`git add <path>` — `git add .` and `git add -A` are forbidden by `AGENTS.md`
and would sweep in John's four uncommitted files, §7.3). The orchestrator records the SHAs
in the §1 Status row. The hand-off stays on file and is **not** given to 51.2 (§2 rule 4).

### 51.2 — QA — Verify the pin and the artifacts against the pinned release

| | |
|---|---|
| Owner | judge |
| Starts when | 51.1 is handed off. Runs in its own session, with a blind brief (§2 rules 2 and 4, this file) |
| Closes | 51.1 |

**Story.** As the epic owner, I want the pin and every artifact checked against the Spec Kit
source itself, so the arc never ships a manifest that Spec Kit would reject or a pin whose
`last_verified` date claims a check that did not happen.

**Minimum checks**

1. **The pin is re-derived independently.** Re-open
   `GET repos/github/spec-kit/releases/latest`. Spec §1's Record 3 is what is under test, not
   evidence (§2 rule 12). A release that shipped *after* 51.1's verification date is **noted,
   not a defect** — a dated pin that was true on its date is the intended state.
2. **The registry diff is exactly two values and a comment**, and the file still parses.
3. **Every manifest is checked against the source at the pinned tag**, not against the
   spec's tables:
   - `preset.yml` keys and strategies against `presets/scaffold/preset.yml` and the strategy
     handling in `src/specify_cli/presets/`;
   - `bundle.yml` against `src/specify_cli/bundles/manifest.py` — **confirm `COMPONENT_KINDS`
     still contains `presets`**, and that `priority` on a preset ref is accepted;
   - `preset-catalogs.yml` against `src/specify_cli/presets/catalog/command_add.py` — the
     five persisted keys, and `install_allowed` as the key name;
   - `catalog.json` against `presets/catalog.json`.
4. **Attack the catalog claim.** Re-read `get_active_catalogs` in
   `src/specify_cli/presets/__init__.py` and confirm for yourself whether a project-level
   `preset-catalogs.yml` **replaces** or **merges with** the built-in stack. Spec §1.3 says
   it replaces, and the whole of step 5 in the lab depends on it. If it merges, that is an
   **S1** against the spec, not a nit.
5. **Attack the `install_allowed` / `install_policy` distinction.** Confirm these are two
   different files with two different schemas, and that the fixture uses the preset one.
6. `catalog.json` parses as JSON; every YAML fixture parses as YAML.
7. The gate is re-run and shows 13 files / 213 tests, or the difference is explained
   (51.1 AC 12).
8. **No version literal check:** `Select-String -Path labs\fixtures\lab22\* -Recurse
   -Pattern '\b1\.0\.\d+\b'` — hits are allowed **only** as Contoso artifact versions
   (`version: "1.0.0"`) or `>=` floors, never as the pinned Spec Kit release (§4 rule 3).
9. 51.1's diff touches only the files §3's table assigns to it, and only where planned.
   **John's four uncommitted files are still uncommitted and unmodified** (§7.3).
10. Relative links in the edited spec still resolve — `docs/epics/` is not gated.

### 51.3 — Dev — Write `labs/lab22.md`

| | |
|---|---|
| Owner | Vasher |
| Starts when | 51.2 has closed 51.1 |
| Closed by | 51.4 |
| Plan | §2.3, §2.4, §3.2, §4 · §8 steps 4–7 |

**Story.** As a learner, I want Lab 22 to teach me how to distribute org templates the way
Spec Kit actually supports, so that I leave able to do it — and do not leave having learned
a flag that was removed or a path that is empty.

**Acceptance criteria**

1. **Frontmatter is byte-identical to the stub's.** Only the body below the closing `---`
   changes. `title`, `lab_number`, and both `pace` values are untouched, and still match
   `labs.lab22` in the registry character-for-character (§2.4).
2. The body follows §3.2's thirteen-section order.
3. All nine of the epic's U2 acceptance criteria are satisfied in the prose —
   registry pin, `--integration copilot` with `--ai` named as removed, skills-by-default
   with the hyphenated invocation and the `--commands` opt-in, the org preset with a
   non-`replace` strategy, `bundle.yml`, the org catalog with community as discovery-only,
   the resolution stack with `specify preset resolve`, the `--preset` URL warning, the
   constitution path, and the anti-fork argument.
4. **`specify preset resolve` is always shown with a _template_ name** (§1.2, §6/D2). The
   string `preset resolve contoso-sdd` appears nowhere.
5. **The `--preset` URL trap shows the actual behaviour** — the `Warning: Preset '…' not
   found in catalog. Skipping.` text and the fact that init continues and exits 0 (§6/D3).
6. **The catalog replacement rule is stated explicitly** in step 5 (§1.3, §6/D4).
7. **No version literal** anywhere in the file: `Select-String -Path labs\lab22.md -Pattern
   '\b1\.0\.\d+\b'` returns nothing (§4 rule 4).
8. The literal `docs/_meta/registry.yaml` is **retained** (§4 rule 2) — `registry-consumed`
   counts labs containing it.
9. Fixture artifacts are referenced as **inline code paths in backticks**, never as markdown
   links (§2.3). Markdown links point only to `lab18.md`, `lab21.md` and
   `../docs/_meta/registry.yaml`, all of which exist.
10. **No individual community preset is named** (§1.1, §6/D8).
11. Every `specify` invocation in the lab is one verified in spec §1.2 or §1.3.
12. The bundle's unshipped components are called out as Lab 23 / Lab 24 work (§3.4, §7.2).
13. The gate is green at **13 files / 213 tests**. The actual count is recorded, and any
    difference is explained (§5.1).

**Hand-off.** One local `docs:` commit, files added individually. 51.4 receives the commit
SHA and the gate output.

### 51.4 — QA — Verify the lab teaches only what the pinned release does

| | |
|---|---|
| Owner | judge |
| Starts when | 51.3 is handed off |
| Prep — may run while 51.3 is in dev | Record the gate result on 51.3's base commit, as the baseline |
| Closes | 51.3 |

**Story.** As the epic owner, I want every instruction in the lab traced to the Spec Kit
source at the pinned tag, so a learner who follows it end-to-end never hits a dead end.

**Minimum checks**

1. The gate is re-run, and its count matches 51.3's (213 expected) and the prep baseline.
2. **Every `specify` command in the lab is executed-or-traced against the pinned tag**
   (§2 rule 12). For each: the command group exists, the flag exists, and the flag does what
   the lab says. A command that cannot be traced is `UNVERIFIED` — which is never a pass.
3. **Spec §5.3's manual checks M1–M12**, each run independently rather than accepted.
4. **Attack the skills claim.** Confirm from
   `integrations/copilot/__init__.py` that skills are the default, that the invocation is
   `/speckit-<cmd>` with a **hyphen**, and that `--commands` scaffolds **both**
   `.github/agents/*.agent.md` and `.github/prompts/*.prompt.md`. A lab that sends a learner
   to `.github/prompts/` by default is an **S1**.
5. **Attack the `--ai` claim.** Grep the pinned `command_init.py` option list. If `--ai`
   exists at the pinned tag, the lab's central framing is wrong — **S1**.
6. **Mutation probe, in a throwaway `git worktree` — never the live tree.** Confirm the gate
   actually enforces what 51.3 relies on: change `lab_number`, and confirm
   `labs-have-frontmatter` fails; convert one fixture code-path reference into a markdown
   link to a non-existent file, and confirm `links-resolve` fails; change the frontmatter
   `title`, and confirm `enumeration-parity` fails. Restore; `git status` empty after each.
   A gate that does **not** fail is the finding.
7. **Cross-check the lab against the fixtures it describes.** Every path, key and value the
   prose quotes must exist in the file it names. A lab that describes a `wrap` on
   `plan-template` while the manifest appends to it is an **S1**.
8. 51.3's diff touches `labs/lab22.md` and nothing else.
9. **John's four uncommitted files are still uncommitted and unmodified** (§7.3).

### 51.5 — QA — Accept #51 against its own acceptance criteria

| | |
|---|---|
| Owner | judge |
| Starts when | 51.2 and 51.4 have closed |
| Closes | — (readies #51 for John) |

**Story.** As John, I want one independent pass over the whole of #51 before I am asked to
push anything, judged against #51's body and the epic's U2 criteria rather than against the
spec that was written to satisfy them.

**Minimum checks**

1. **Every checkbox in #51's body** — the five verified constraints and the five tasks — is
   satisfied or accounted for by a §6 departure row that judge **verifies independently**
   rather than accepts.
2. **Every one of the epic's nine U2 acceptance criteria** is satisfied, reading U2 directly
   from the epic (lines 230–249), not from the spec's restatement.
3. **The full diff reconciles.** Every file in the branch range maps to a spec section, a
   story AC, or a §6 row. Zero strays.
4. **Full-suite delta sweep** at both ends of the range, in throwaway worktrees: the failing
   test *identities* must be identical, proving zero new failures anywhere in the repo, not
   merely an unchanged count.
5. Commit messages conform to `<type>: <description>`; no secrets; **nothing pushed**.
6. The §4 sprint log is complete — every round that ran has a row (this is the S2 that
   #48's 51.5-equivalent raised; do not repeat it).
7. **The pin is still honest on the day of acceptance.** If Spec Kit has moved again since
   51.1, that is **noted, not a defect** — but `spec_kit_version_last_verified` must state
   the date the check actually happened.

---

## 4. Sprint log

Filled in by the orchestrating session after every QA round. Each entry is committed on its
own (`docs: log <story> round <n>`), so the log never mixes with a dev story's diff.

| Round | Story | Commit reviewed | Verdict | Findings (S1 / S2 / S3) | Disposition |
|---|---|---|---|---|---|
| — | — | — | — | — | *No round has run. 51.1 has not started; the spec and this file await John's approval.* |

**Out-of-scope observations.** Logged here as they are found, never fixed inside #51
(§2 rule 10).

- **O1 — `labs/lab18.md:44-45` teaches the older 5-command flow** (`/constitution`,
  `/specify`, `/plan`, `/tasks`, `/implement`), which collides with the hyphenated
  `/speckit-<command>` skills invocation Lab 22 teaches. Confirmed present 2026-09-25.
  #51's body assigns it to the separate retest/fix sweep. → **Not #51's.**
- **O2 — the weekly content audit has never run** (#57, `COPILOT_GITHUB_TOKEN`), so #48's
  checks 8 and 9 are not re-checking `spec_kit_version`. This is why §1's re-verification
  had to be done by hand, and why §8 step 1 makes the implementing session repeat it. →
  **John / repo admin.**
- **O3 — every agentic workflow is broken** (#63, model `auto` has no AI-credits pricing).
  The Copilot Code Review check on a #51 PR will **fail without reviewing anything**, and
  pushing a new `feature/*` branch auto-files a duplicate `[aw]` issue. **Neither is a
  signal about this work.** → **John / repo admin.**
