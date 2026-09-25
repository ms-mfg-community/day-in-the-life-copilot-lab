# EPIC-001 / Issue #51 — Centralized Spec Kit templates and the org catalog (Lab 22)

**Implementation plan (spec only — no implementation in this document).**

| Field | Value |
|---|---|
| Parent epic | [EPIC-001 — Enterprise Agentic SDLC Harness](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Child issue | #51 — *Lab 22 — centralized Spec Kit templates and org catalog (EPIC-001 U2)* |
| Decomposition item | 4 of 9 — depends only on item 1 (#48, **closed**). The only unblocked issue on the critical path `#51 → #52 → #53 → #59` |
| Spec authored | 2026-09-25 |
| Branch | `feature/epic-enterprise-harness` (base is **not** `main` — see #48 spec §7.3) |
| Open decisions | **None.** Three resolved 2026-09-25 — see §7 |
| Status | **Draft — awaiting John's approval.** No implementation until approved |
| Stories | [EPIC-001-51-stories.md](EPIC-001-51-stories.md) — the dev and QA breakdown of this plan |

This document is written so that a cold-start session can execute it file-by-file without
re-deriving anything. Every YAML, JSON and frontmatter block below is literal and pasteable.

> **Scope of #51.** Author `labs/lab22.md` and ship the three artifacts it teaches: an org
> preset, a `bundle.yml`, and an org catalog. #51 does **not** touch Labs 21 or 23–26, and
> does **not** fix the `labs/lab18.md` command-flow collision (§6, departure D5).

---

## 1. Version re-verification — performed 2026-09-25

The epic's Appendix A.3 imposes a standing obligation to re-verify pinned versions **at
implementation time** rather than carrying an earlier number forward. #48 pinned
`spec_kit_version: "1.0.10"` with `spec_kit_version_last_verified: "2026-09-23"`. That
re-verification was repeated on **2026-09-25**, the day this spec was written, against the
primary source. **The pin has moved again.**

**Record 3 — 2026-09-25, #51 spec authoring (current).**

| Claim | 2026-09-23 value | **Verified 2026-09-25** | Result | Primary source |
|---|---|---|---|---|
| Spec Kit latest release | `v1.0.10` | **`v1.0.11`** | ⚠️ **MOVED** | `GET repos/github/spec-kit/releases/latest` → `v1.0.11`, published `2026-09-24T01:35:37Z`, `prerelease=false`. `GET repos/github/spec-kit/releases?per_page=12` shows nothing newer |

Twelve releases now exist between `v1.0.0` (2026-08-21) and `v1.0.11` (2026-09-24) — a
release roughly every three days. **R1 in the epic holds: this pin decays faster than the
lab does.** That cadence is itself a teaching point for the lab (§3.2, the anti-fork
argument) and the reason the registry exists.

> ⚠️ **Do not "correct" the pin back to `1.0.8`** on the strength of the epic's U2
> acceptance criterion, nor to `1.0.10` on the strength of #48's registry comment. The
> epic requires the *then-current* release. On 2026-09-25 that is **`1.0.11`**.

### 1.1 What changed in `v1.0.11`, and what it means for Lab 22

The `v1.0.11` release notes were read in full (`gh release view v1.0.11 --repo
github/spec-kit`) and checked against the source at that tag. Only `v1.0.11` post-dates
#48's `1.0.10` pin, so this is the complete delta.

- **`specify` command list — no additions, removals or renames.** `chore: refactor root
  command adapters (#4687)` moves code only; the Typer command registrations under
  `src/specify_cli/` are unchanged in name and shape from `v1.0.10`. The `preset`,
  `bundle`, `extension`, `workflow` and `integration` command groups Lab 22 uses are all
  present and unchanged.
- **Copilot integration layout — unchanged.** `src/specify_cli/integrations/copilot/__init__.py`
  still defaults to the skills layout and still gates the commands layout behind
  `--integration-options="--commands"` (§1.2, constraint 2).
- **⚠️ Directly relevant — `feat: make catalog add idempotent across all catalog families
  (#4543)`.** `specify preset catalog add` now **returns silently** when an identical entry
  (same `name`, `url`, `priority`, `install_allowed`, `description`) already exists, instead
  of erroring. A non-identical entry with the same `name` still errors and tells the learner
  to `remove` first. **This makes the lab's catalog step safely re-runnable**, which matters
  because learners re-run steps. Verified at
  `src/specify_cli/presets/catalog/command_add.py`, the duplicate-name branch.
- **⚠️ Relevant to the supply-chain framing — `fix: restore community archive validation and
  compare submitted checksums (#4689)`.** Community catalog submissions are checksum-validated
  again. Supports §3.2's framing that discovery-only is one control in a layered chain, not
  the only one.
- **Community catalog grew** by four entries (`ThreatSpec`, `Spec Kit Design System`,
  `Database Standards`, `NIEM Information Exchanges`, plus a `Project Statistics Governance`
  preset). **The lab must not name a specific community preset** — that list changes every
  release. Refer to the community catalog as a whole.
- **Not relevant to Lab 22:** the Forge dispatch fixes (#4714, #4667, #4668), the
  `platformdirs` drop (#4675), `SPECIFY_FEATURE_NO_PERSIST` (#4129), the Japanese README.
- **Carried forward, for #53 not #51.** The `v1.0.11` notes repeat the standing
  deprecation: *"The core /speckit.taskstoissues command is planned to move out of Spec Kit
  core in a future release."* Lab 24 (#53) uses `taskstoissues`. **Re-check before writing
  #53** — unchanged advice from #48 spec §1.1.

### 1.2 Constraint re-verification — #51's five "get these right" items

#51's body carries five constraints with a standing note that they decay. Each was
re-verified against the **`v1.0.11`** source tree (`git clone --depth 1 --branch v1.0.11`,
resolving to commit `8147943512404afb9d99c6252cb9bf84369fd0b0`). All five hold. **Two need
sharpening** before they go into a lab.

| # | Constraint as #51 states it | Verdict at `v1.0.11` | Evidence |
|---|---|---|---|
| 1 | `specify init <project> --integration copilot`; **`--ai` was removed** | ✅ **Confirmed** | `src/specify_cli/command_init.py` — the full option list is `--script`, `--ignore-agent-tools`, `--here`, `--force`, `--non-interactive`, `--preset`, `--integration`, `--integration-options`, `--extension`, `--trust-extension-urls`, plus four hidden no-op deprecations. **No `--ai`.** The docstring's own examples all use `--integration` |
| 2 | Copilot gets **skills** by default at `.github/skills/speckit-<command>/SKILL.md`, invoked `/speckit-specify` (hyphen); `--integration-options="--commands"` opts into `.github/agents/` + `.github/prompts/` | ✅ **Confirmed** | `integrations/copilot/__init__.py`: `_skills_mode: bool = True`; skills dir `.github/skills`, commands dir `.github/agents`; `build_command_invocation` emits `"/speckit-" + stem.replace(".", "-")`; the `--skills` / `--commands` options are declared mutually exclusive and error if both are passed. Commands mode scaffolds `.github/agents/speckit.<cmd>.agent.md` **plus** a companion `.github/prompts/speckit.<cmd>.prompt.md` |
| 3 | Constitution is at **`.specify/memory/constitution.md`** | ✅ **Confirmed** | `command_init.py:224` — `project_path / ".specify" / "memory" / "constitution.md"`. Same path in `presets/__init__.py` at three call sites |
| 4 | **`specify init --preset` does not accept a URL** — ID, bundled name, or local dir only; use `specify preset add --from <url>` after init | ⚠️ **Confirmed, but the failure is worse than "does not accept"** — see below | `command_init.py`, the `if preset:` block. Three branches only: local dir containing `preset.yml` → bundled preset name → catalog preset ID |
| 5 | Forking Spec Kit is an anti-pattern given release cadence — teach the resolution stack | ✅ **Confirmed, and strengthened** | Twelve releases in 34 days (§1). The resolution stack exists precisely so an org customizes *above* core without editing core — `docs/reference/presets.md` §"File Resolution" |

**Sharpening constraint 4 — this is a silent failure, not a rejection.** `specify init
--preset <url>` does **not** error. The URL is not a local directory and not a bundled
preset, so it falls through to a catalog ID lookup, misses, and prints:

```text
Warning: Preset '<url>' not found in catalog. Skipping.
```

`init` then **continues and exits 0**, leaving a project with no preset installed. A learner
who passes a URL gets a green-looking run and a silently unconfigured repo. **The lab must
show the warning text**, not merely say "URL not accepted" — the whole hazard is that it
looks like success. (§3.2, step 4.)

**Sharpening the resolution-stack constraint — `preset resolve` takes a _template_ name.**
#51's body and the epic both write `specify preset resolve <name>`, which reads as a preset
id. It is not. `presets/command_resolve.py` declares
`template_name: str = typer.Argument(..., help="Template name to resolve (e.g.,
spec-template)")`. **`specify preset resolve contoso-sdd` fails; `specify preset resolve
spec-template` is correct.** The lab must use a template name in every example. (§6,
departure D2.)

### 1.3 The verified surface Lab 22 teaches

Everything below was read from the `v1.0.11` source, not from memory or from a search
summary. These are the load-bearing facts the lab asserts.

**Composition strategies** (`presets/scaffold/preset.yml`, and `docs/reference/presets.md`
§"File Resolution"):

| Strategy | Behaviour | Applies to |
|---|---|---|
| `replace` | **Default.** First match in the priority stack wins and is used entirely | templates, commands, scripts |
| `prepend` | This content goes **before** the lower-priority content | templates, commands |
| `append` | This content goes **after** the lower-priority content | templates, commands |
| `wrap` | This content contains `{CORE_TEMPLATE}`, replaced with the lower-priority content | templates, commands |
| `wrap` (scripts) | Placeholder is **`$CORE_SCRIPT`**, not `{CORE_TEMPLATE}` | scripts only |

> Scripts support **only** `replace` and `wrap`. `prepend` and `append` are templates and
> commands only.

**The resolution stack**, highest to lowest precedence (`docs/reference/presets.md`
§"File Resolution"):

1. **Project-local overrides** — `.specify/templates/overrides/`
2. **Installed presets** — `.specify/presets/<id>/`, sorted by priority (lower number first)
3. **Installed extensions** — `.specify/extensions/<id>/`, sorted by priority
4. **Spec Kit core** — `.specify/templates/`

Each file name is evaluated **independently** against that stack, so a `spec-template` may
come from a preset while `plan-template` comes from core. Preset priority defaults to `10`;
lower = higher precedence; ties break alphabetically by preset id.

**Catalog resolution order** — `presets/__init__.py::get_active_catalogs`:

1. `SPECKIT_PRESET_CATALOG_URL` env var — a single catalog replacing all defaults
2. Project config — `.specify/preset-catalogs.yml`
3. User config — `~/.specify/preset-catalogs.yml`
4. Built-in default stack — `default` (priority 1, `install_allowed=True`) **and**
   `community` (priority 2, `install_allowed=False`, described in-code as
   *"Community-contributed presets (discovery only)"*)

> ⚠️ **First match wins — the layers do not merge.** `get_active_catalogs` returns the
> project config *if it exists at all*, and never reaches the built-in stack. **The moment
> `.specify/preset-catalogs.yml` exists, the built-in `default` and `community` catalogs are
> gone** unless the file re-declares them. This is the single most important mechanical fact
> in the lab: the org catalog file is an **allowlist that replaces the defaults**, not an
> addition to them. A learner who runs `specify preset catalog add` once and then wonders why
> `specify preset search` stopped finding community presets has hit exactly this. **§3.2
> step 5 must teach it, and the shipped `preset-catalogs.yml` must re-declare community
> explicitly.**

**Enforcement of `install_allowed`** — `presets/__init__.py`, the install path:

```python
if not pack_info.get("_install_allowed", True):
    raise PresetError(
        f"Preset '{pack_id}' is from the '{catalog_name}' catalog which does not allow installation. "
        ...
    )
```

The refusal message names the `--from` form to use instead, so discovery-only is a
**redirect**, not a dead end — which is exactly the epic's US-2.2 framing.

**Preset catalog entry shape** — `presets/catalog/command_add.py` persists exactly five
keys per entry: `name`, `url`, `priority`, `install_allowed`, `description`.

> ⚠️ **Do not confuse preset catalogs with bundle catalogs.** `.specify/preset-catalogs.yml`
> uses **`install_allowed: true|false`**. `.specify/bundle-catalogs.yml` is a *different
> file with a different schema* using **`install_policy`**
> (`src/specify_cli/bundles/catalog_config.py`). #51's body is correct for presets. A lab
> that writes `install_policy` into a preset catalog teaches a dead end.

**`bundle.yml` `provides` keys** — `bundles/manifest.py`:

```python
COMPONENT_KINDS = ("extensions", "presets", "steps", "workflows")
```

Preset refs additionally accept `priority` and `strategy`. **`provides.presets` is
supported**, so #51's "pinning preset + extension + workflow as one versioned install" is
valid — even though neither shipped example (`bundles/bugfix`, `bundles/assess`) happens to
declare a preset. The lab's bundle is a legitimate superset of the shipped examples.

**`specify preset add` sources** — `presets/command_add.py`: positional `preset_id` (via
catalog), `--from <url>` (`.zip`, `.tar.gz` or `.tgz`), `--dev <path>` (local dir),
`--priority <N>` (default `10`).

### 1.4 Evidence base consulted

| Source | What it settled |
|---|---|
| `GET repos/github/spec-kit/releases/latest` and `?per_page=12` | The pin: `v1.0.11`, `2026-09-24T01:35:37Z` |
| `gh release view v1.0.11 --repo github/spec-kit` | The full `v1.0.10 → v1.0.11` delta (§1.1) |
| `github/spec-kit` @ `v1.0.11` (commit `8147943`) — `src/specify_cli/command_init.py` | Constraints 1, 3, 4 |
| …`src/specify_cli/integrations/copilot/__init__.py` | Constraint 2 |
| …`src/specify_cli/presets/__init__.py`, `presets/command_add.py`, `presets/catalog/command_add.py`, `presets/command_resolve.py` | Catalog stack, `install_allowed` enforcement, `preset resolve` signature |
| …`src/specify_cli/bundles/manifest.py`, `bundles/catalog_config.py` | `provides.presets`; the `install_policy` / `install_allowed` distinction |
| …`presets/scaffold/preset.yml`, `presets/self-test/preset.yml`, `presets/constitution-sync/preset.yml` | `preset.yml` schema and every composition strategy |
| …`bundles/bugfix/bundle.yml`, `bundles/assess/bundle.yml` | `bundle.yml` schema |
| …`presets/catalog.json`, `presets/catalog.community.json` | Org catalog JSON shape |
| …`docs/reference/presets.md` | Resolution stack and catalog order, as documented |

> The clone is a scratch checkout under `%TEMP%`. It is **not** committed, and is deleted
> at the end of the implementing session.

---

## 2. Gate analysis — what actually has to be true

### 2.1 Baseline — measured 2026-09-25

```powershell
npx vitest run tests/lab-structure tests/meta tests/content-currency
# 13 files | 213 tests | all passing
```

Matches the count #48 handed over. The four uncommitted files in the working tree
(`README.md`, `labs/lab11.md`, `labs/lab14.md`, `labs/setup.md` — John's, §7.3) are present
and the gate is green with them.

### 2.2 Which suites actually read `labs/lab22.md`

| Suite | Reads lab22? | What it asserts | Risk for #51 |
|---|---|---|---|
| `lab-structure/labs-have-frontmatter` | **Yes** | `title`, `lab_number`, `pace` present; `lab_number` equals the filename number | Low — keep frontmatter intact |
| `lab-structure/links-resolve` | **Yes** | Every internal markdown link resolves on disk | ⚠️ **The live hazard** — §2.3 |
| `meta/enumeration-parity` | **Yes (indirectly)** | Registry ↔ `README.md` ↔ `labs/setup.md` agreement | ⚠️ Title/pace must stay in lockstep — §2.4 |
| `content-currency/registry-consumed` | **Yes (as a set)** | ≥ 3 labs contain the literal `docs/_meta/registry.yaml` | Low — lab22 already contains it; **must not lose it** |
| `content-currency/cli-commands-current` | **No** | Targets labs 01, 05, 07–10 only | None |
| `lab-structure/labs-language-agnostic` | **No** | Targets labs 03–06 only | None |
| `lab-structure/appendices-parity` | **No** | Appendix pairs for labs 03–06 | None |

### 2.3 ⚠️ The gate hazard — `links-resolve` and the new artifacts

`links-resolve` globs `labs/*.md` **non-recursively** (`readdirSync(LABS_DIR).filter(f =>
f.endsWith('.md'))`) and requires every `[text](target)` internal link to exist on disk. Two
consequences:

1. **Files under `labs/fixtures/lab22/` are not themselves scanned.** Only `labs/*.md` at
   the top level is. Putting the artifacts in `labs/fixtures/lab22/` keeps the suite at its
   current file count.
2. **A link from `labs/lab22.md` to an artifact is only safe once that artifact exists.**
   Since #51 *creates* the artifacts, links to them would resolve — but the established
   repo convention (Lab 12, the only precedent) references fixture files as **inline code
   paths in backticks**, never as markdown links. §3 follows Lab 12.

**Test-count arithmetic.** `links-resolve` emits 1 discovery test + 1 per `labs/*.md` file
= 31 today (30 files). `labs-have-frontmatter` emits 1 + 1 per `lab\d+.md` = 27 today (26
labs). **#51 adds no file to `labs/` top level, so both counts are unchanged.** The expected
post-change gate is therefore **13 files / 213 tests**, identical to baseline. *If the count
moves, stop and understand why before trusting the commit.*

### 2.4 Frontmatter and registry must move together

`labs/lab22.md` frontmatter and `docs/_meta/registry.yaml` `labs.lab22` are checked against
each other by `enumeration-parity`:

| Frontmatter key | Registry key | Current value |
|---|---|---|
| `title` | `labs.lab22.title` | `Centralized Spec Kit Templates & the Org Catalog` |
| `pace.presenter_minutes` | `pace_presenter_minutes` | `7` |
| `pace.self_paced_minutes` | `pace_self_minutes` | `35` |
| *(none — do not invent one)* | `pace_workshop_minutes` | `12` |

**#51 changes none of these.** The title stays character-for-character identical, including
the `&`. The pace values stay as scaffolded. If a later decision changes one, both files
change in the same commit.

---

## 3. File-by-file implementation

| # | File | Action | Why |
|---|---|---|---|
| 1 | `docs/_meta/registry.yaml` | **Edit** — re-pin `spec_kit_version` `1.0.10` → `1.0.11`, `spec_kit_version_last_verified` `2026-09-23` → `2026-09-25`, and refresh the comment | §1 — the pin moved. Standing Appendix A.3 obligation |
| 2 | `labs/lab22.md` | **Replace** stub body; keep frontmatter byte-identical | The lab itself (§3.2) |
| 3 | `labs/fixtures/lab22/contoso-sdd/preset.yml` | **Create** | Org preset manifest — three templates, one non-`replace` strategy |
| 4 | `labs/fixtures/lab22/contoso-sdd/templates/spec-template.md` | **Create** | `replace` strategy example |
| 5 | `labs/fixtures/lab22/contoso-sdd/templates/plan-template.md` | **Create** | `wrap` strategy example — contains `{CORE_TEMPLATE}` |
| 6 | `labs/fixtures/lab22/contoso-sdd/templates/tasks-governance.md` | **Create** | `append` strategy example |
| 7 | `labs/fixtures/lab22/contoso-sdd-bundle/bundle.yml` | **Create** | Pins preset + extension + workflow as one versioned install |
| 8 | `labs/fixtures/lab22/preset-catalogs.yml` | **Create** | The org catalog config — `install_allowed: true` for org, community re-declared discovery-only |
| 9 | `labs/fixtures/lab22/catalog.json` | **Create** | The org catalog the config points at |
| 10 | `labs/fixtures/lab22/README.md` | **Create** | What each artifact is and how the lab uses it (Lab 12 fixture convention) |
| 11 | `CHANGELOG.md` | **Edit** | Record #51, per the #48 precedent |

> **Not touched:** `README.md`, `labs/setup.md` (enumeration rows already exist from #48,
> and the uncommitted README edits are John's — §7.3); `labs/lab18.md` (departure D5);
> `.github/workflows/weekly-content-audit.lock.yml` (never recompile — #48 spec §3.7).

### 3.1 `docs/_meta/registry.yaml` — re-pin Spec Kit

The existing comment has two parts: a generic lead paragraph (the "labs MUST reference this
key" rule and the install-command shape) and a **`RE-VERIFICATION OBLIGATION`** block. The
lead paragraph is unchanged. **The obligation header is preserved** — it is the mechanism
that caught this drift, and dropping it would weaken the very control the registry exists
to provide. Only the dated verification sentences inside it, and the two scalars, change.

Replace from the `RE-VERIFICATION OBLIGATION` line through
`spec_kit_version_last_verified` (currently lines 35–44) with:

```yaml
# RE-VERIFICATION OBLIGATION (epic EPIC-001 Appendix A.3, item 1):
# Spec Kit releases every few days — 12 releases between 2026-08-21 and
# 2026-09-24, roughly one every three days. Re-check the pinned version, the
# command list, and the Copilot integration layout before any cohort, and at
# the start of any work that consumes this key — do not trust
# last_verified without re-checking. Verified 2026-09-25 via
# `gh api repos/github/spec-kit/releases/latest`: v1.0.11, published
# 2026-09-24T01:35:37Z, not a prerelease. This SUPERSEDES v1.0.10 (recorded
# 2026-09-23 by EPIC-001 #48), v1.0.9 (found 2026-09-22 while the #48 spec
# was written) and the v1.0.8 value recorded on 2026-09-17 in EPIC-001 and
# in issue #48's body.
spec_kit_version: "1.0.11"
spec_kit_version_last_verified: "2026-09-25"
```

**Constraints.** The lead paragraph above the obligation block is **not** touched. Both keys
stay top-level scalars in their current position. The file must still parse as YAML. The
diff must contain **only** this comment block and these two values — nothing else in the
registry changes.

### 3.2 `labs/lab22.md` — the lab

**Frontmatter is preserved byte-for-byte.** Only the body below the `---` is replaced.

**Required section order** (matching the house shape used by Labs 11–20):

1. **Title + pace line** — `> ⏱️ Presenter pace: 7 minutes | Self-paced: 35 minutes`
2. **Part-of line** — `**Part of:** Labs 21–26 … builds on Lab 21.`
3. **The problem** — every team copy-pastes the same spec template, they drift, and the
   obvious fix (fork Spec Kit) is wrong. States the anti-fork case with the §1 cadence
   number: *twelve releases in thirty-four days*; a fork is a merge conflict generator, and
   the resolution stack exists so you never need one.
4. **Prerequisites** — a link to Lab 18 written lab-relative as `[Lab 18](lab18.md)`, and
   the Spec Kit CLI at the registry-pinned version, installed via the command shape in
   `docs/_meta/registry.yaml`. **No version literal** (§4).
5. **Step 1 — initialize with the Copilot integration.**
   `specify init contoso-sdd-demo --integration copilot`. States plainly that **`--ai` was
   removed** and shows what Copilot actually gets: `.github/skills/speckit-<command>/SKILL.md`,
   invoked **`/speckit-specify`** with a hyphen. Shows
   `--integration-options="--commands"` as the *opt-in* path to
   `.github/agents/speckit.<cmd>.agent.md` plus companion
   `.github/prompts/speckit.<cmd>.prompt.md`, and notes the two modes are mutually
   exclusive. Names the constitution at **`.specify/memory/constitution.md`**.
   > Callout: *a lab that sends you to `.github/prompts/` by default shows you an empty
   > folder.*
6. **Step 2 — the resolution stack.** The four-layer table from §1.3, each file resolving
   independently, priority semantics (default `10`, lower wins, ties alphabetical). Ends
   with `specify preset resolve spec-template` as the debugging move — **a template name,
   never a preset id** (§1.2).
7. **Step 3 — build the org preset.** Walks `labs/fixtures/lab22/contoso-sdd/preset.yml`
   (§3.3) and the three strategies it demonstrates: `replace` for `spec-template`, **`wrap`
   with `{CORE_TEMPLATE}`** for `plan-template`, `append` for `tasks-template`. States that
   scripts support only `replace` and `wrap`, and that a script wrapper uses **`$CORE_SCRIPT`**.
   Install with `specify preset add --dev labs/fixtures/lab22/contoso-sdd`.
8. **Step 4 — ⚠️ the `--preset` URL trap.** `specify init --preset` takes an **ID, a bundled
   name, or a local directory — never a URL**. Shows the actual failure, verbatim:
   ```text
   Warning: Preset 'https://…' not found in catalog. Skipping.
   ```
   and states that init **continues and exits 0**, leaving the preset uninstalled. The
   correct form is `specify preset add --from <url>` *after* init (`.zip`, `.tar.gz`, `.tgz`).
9. **Step 5 — the org catalog as a supply-chain control.** Ships
   `labs/fixtures/lab22/preset-catalogs.yml` (§3.5). Teaches:
   - the org catalog with `install_allowed: true`;
   - the community catalog re-declared with `install_allowed: false` — **discovery-only**;
   - what refusal looks like, and that it **redirects** to `--from` rather than dead-ending;
   - ⚠️ **the replacement rule from §1.3** — first match wins, the project file **replaces**
     the built-in `default` + `community` stack, so anything you still want must be
     re-declared. This is the step most likely to bite a learner.
   - that `specify preset catalog add` is idempotent as of the pinned release (§1.1), so
     re-running the step is safe.

   Framed per epic US-2.2: developers *discover* freely, install only what was reviewed.
10. **Step 6 — one versioned install with `bundle.yml`.** Walks
    `labs/fixtures/lab22/contoso-sdd-bundle/bundle.yml` (§3.4): preset + extension +
    workflow pinned together, installed as one unit, upgraded as one unit.
11. **Verification** — a short checklist a learner can actually run: `specify preset list`
    shows the preset in precedence order; `specify preset resolve spec-template` shows the
    composition chain; `specify preset resolve plan-template` shows the `wrap` chain; a
    community-catalog install attempt is refused with the redirect.
12. **What you built / Key takeaways.**
13. **Versions and pins** — retains the stub's existing paragraph and its
    `docs/_meta/registry.yaml` link **verbatim** (required by `registry-consumed`, §2.2).

**Hard content rules.**

- **No version literal anywhere** (§4). Install commands show
  `…spec-kit.git@v<version>` and point at the registry.
- **Reference fixture artifacts as inline code paths in backticks** —
  `` `labs/fixtures/lab22/contoso-sdd/preset.yml` `` — **never** as markdown links (§2.3,
  Lab 12 convention).
- **Name no individual community preset** (§1.1) — that list changes every release.
- Links permitted: `lab18.md`, `lab21.md`, `../docs/_meta/registry.yaml` — all exist today.
- Every `specify` invocation in the lab must be one verified in §1.2/§1.3. If a command is
  not in that evidence set, it does not go in the lab.

### 3.3 `labs/fixtures/lab22/contoso-sdd/preset.yml`

Schema per `presets/scaffold/preset.yml` at `v1.0.11`. Demonstrates all three required
composition behaviours.

```yaml
schema_version: "1.0"

preset:
  id: "contoso-sdd"
  name: "Contoso SDD Standards"
  version: "1.0.0"
  description: "Contoso's org-wide spec, plan and tasks templates — one source, no forks."
  author: "Contoso Platform Engineering"
  repository: "https://github.com/contoso/spec-kit-preset-contoso-sdd"
  license: "MIT"

requires:
  speckit_version: ">=1.0.0"

provides:
  templates:
    # replace — Contoso's spec template fully supersedes core's.
    - type: "template"
      name: "spec-template"
      file: "templates/spec-template.md"
      description: "Contoso feature specification, with the mandatory risk section"
      replaces: "spec-template"

    # wrap — keeps core's plan template and surrounds it. The wrapper file
    # must contain the {CORE_TEMPLATE} placeholder.
    - type: "template"
      name: "plan-template"
      file: "templates/plan-template.md"
      description: "Wrap the core plan with Contoso architecture-review gates"
      strategy: "wrap"

    # append — Contoso governance tasks are added after core's task list.
    - type: "template"
      name: "tasks-template"
      file: "templates/tasks-governance.md"
      description: "Append Contoso's governance and sign-off tasks"
      strategy: "append"

tags:
  - "contoso"
  - "governance"
  - "standards"
```

> `replaces:` names the core file being superseded and is used with the default `replace`
> strategy. `strategy:` selects a composition behaviour, and `name:` identifies which
> template to compose with. `file:` may differ from the conventional path — which is why
> the `append` entry can live in `tasks-governance.md` while composing onto `tasks-template`.

### 3.4 `labs/fixtures/lab22/contoso-sdd-bundle/bundle.yml`

Schema per `bundles/bugfix/bundle.yml`, extended with `provides.presets` — valid per
`COMPONENT_KINDS` (§1.3).

```yaml
schema_version: "1.0"

bundle:
  id: "contoso-sdd"
  name: "Contoso SDD Standards"
  version: "1.0.0"
  role: "developer"
  description: "Contoso's spec templates, review extension and release workflow as one versioned install."
  author: "Contoso Platform Engineering"
  license: "MIT"

requires:
  speckit_version: ">=1.0.0"
  tools: []
  mcp: []

provides:
  presets:
    - id: "contoso-sdd"
      version: "1.0.0"
      priority: 5
  extensions:
    - id: "contoso-review"
      version: "1.0.0"
  workflows:
    - id: "contoso-sdlc"
      version: "1.0.0"

tags: ["contoso", "standards", "governance", "sdlc"]
```

> The `contoso-review` extension and `contoso-sdlc` workflow are **referenced, not shipped**
> — Labs 23 and 24 build them (epic units U3 and U4). The lab says so explicitly, so a
> learner does not go looking for them. The bundle is the *packaging* lesson; the components
> arrive later in the arc.

### 3.5 `labs/fixtures/lab22/preset-catalogs.yml`

The org catalog config, written to `.specify/preset-catalogs.yml` in a learner's project.
Key order and key names match what `specify preset catalog add` itself persists (§1.3).

```yaml
# Copied to .specify/preset-catalogs.yml.
#
# ⚠️ First match wins, and the layers DO NOT merge. Once this file exists,
# Spec Kit stops falling back to its built-in default + community catalogs
# entirely. Anything you still want must be declared here — which is why the
# community catalog is re-declared below rather than inherited.
catalogs:
  - name: "contoso-approved"
    url: "https://raw.githubusercontent.com/contoso/spec-kit-catalog/main/catalog.json"
    priority: 1
    install_allowed: true
    description: "Contoso-reviewed presets. Installable."

  - name: "community"
    url: "https://raw.githubusercontent.com/github/spec-kit/main/presets/catalog.community.json"
    priority: 2
    install_allowed: false
    description: "Community-contributed presets. Discovery only — install via review."
```

### 3.6 `labs/fixtures/lab22/catalog.json`

The org catalog the config points at. Shape per `presets/catalog.json` at `v1.0.11`.

```json
{
  "schema_version": "1.0",
  "updated_at": "2026-09-25T00:00:00Z",
  "catalog_url": "https://raw.githubusercontent.com/contoso/spec-kit-catalog/main/catalog.json",
  "presets": {
    "contoso-sdd": {
      "name": "Contoso SDD Standards",
      "id": "contoso-sdd",
      "version": "1.0.0",
      "description": "Contoso's org-wide spec, plan and tasks templates — one source, no forks.",
      "author": "Contoso Platform Engineering",
      "repository": "https://github.com/contoso/spec-kit-preset-contoso-sdd",
      "download_url": "https://github.com/contoso/spec-kit-preset-contoso-sdd/archive/refs/tags/v1.0.0.zip",
      "license": "MIT",
      "requires": {
        "speckit_version": ">=1.0.0"
      },
      "provides": {
        "templates": 3,
        "commands": 0
      },
      "tags": ["contoso", "governance", "standards"]
    }
  }
}
```

> The `contoso.com` / `github.com/contoso` URLs are **illustrative and unreachable by
> design** — the lab says so. Nothing in the lab fetches them; the preset is installed with
> `--dev` from the local fixture directory.

### 3.7 Template fixture files

| File | Strategy it demonstrates | Must contain |
|---|---|---|
| `templates/spec-template.md` | `replace` | A complete, self-contained Contoso spec template. **No placeholder** |
| `templates/plan-template.md` | `wrap` | The literal **`{CORE_TEMPLATE}`** placeholder, with Contoso preamble above and architecture-review sign-off below |
| `templates/tasks-governance.md` | `append` | Governance tasks only — the fragment added *after* core's task list. **No placeholder** |

Each is short (20–40 lines) and obviously Contoso-flavoured, so a learner running
`specify preset resolve` can see at a glance which layer won.

### 3.8 `labs/fixtures/lab22/README.md` and `CHANGELOG.md`

The fixture README follows the Lab 12 precedent: what each file is, which lab step uses it,
and the warning that the URLs are illustrative. The `CHANGELOG.md` entry follows #48's
(`8edbf46`): one entry naming #51, the lab, the artifacts, and the registry re-pin.

---

## 4. "No hardcoded versions" — explicit statement

`tests/content-currency/registry-consumed.test.ts` and the epic's U2 criterion require labs
to read versions from `docs/_meta/registry.yaml`. #48 was verified at **zero** version
literals across every lab file, and #51 must keep it there.

**Rules.**

1. `labs/lab22.md` contains **no** Spec Kit version literal — not `1.0.11`, not `v1.0.11`,
   not `1.0.10`. Install commands render the placeholder form
   `git+https://github.com/github/spec-kit.git@v<version>` and point at the registry.
2. `labs/lab22.md` **retains** the literal string `docs/_meta/registry.yaml`
   (`registry-consumed` counts labs containing it).
3. The fixture files are **not** lab prose and legitimately carry versions — but only
   *Contoso artifact* versions (`version: "1.0.0"`) and **range constraints**
   (`speckit_version: ">=1.0.0"`), never the pinned release. A `>=` floor is a compatibility
   statement, not a pin, and does not decay when the registry moves.
4. **Verification command** (must return no hits in `labs/lab22.md`):
   ```powershell
   Select-String -Path labs\lab22.md -Pattern '\b1\.0\.\d+\b'
   ```

---

## 5. Acceptance gate

### 5.1 Expected post-change result

```powershell
npx vitest run tests/lab-structure tests/meta tests/content-currency
```

**Expected: 13 files / 213 tests, all passing — identical to the §2.1 baseline.** #51 adds
no file to `labs/` top level (§2.3), so no count moves. **A changed count is a stop signal**,
not something to rationalize.

### 5.2 Regression surface

The full suite is **pre-existing red and not #51's to fix**: `tests/workflows` 4 failed / 12
passed, `tests/workshop` 12 failed / 59 passed, and a wider 15-files / 45-tests red across
`tests/extensions`, `tests/hooks`, `tests/orchestrator`, `tests/plugin-template` and
`tests/scripts`. **Read every result as a delta against that baseline, never as an
absolute.** A suite that was red before and is red now is not a #51 finding (stories §2
rule 10).

### 5.3 Manual checks CI cannot perform

CI checks structure, not truth. These are the checks that catch a lab which passes the gate
and still teaches a dead end.

| # | Check | How |
|---|---|---|
| M1 | Every `specify` command in the lab exists at the pinned release | Cross-read against §1.2/§1.3. Anything not in that evidence set is removed |
| M2 | `--ai` appears nowhere except as an explicit "this was removed" warning | `Select-String -Path labs\lab22.md -Pattern '\-\-ai\b'` |
| M3 | The skills path and hyphenated invocation are exact | Lab says `.github/skills/speckit-<command>/SKILL.md` and `/speckit-specify`; **not** `/speckit.specify` in skills mode |
| M4 | `preset resolve` examples use a **template** name | No `specify preset resolve contoso-sdd` anywhere |
| M5 | `install_allowed` — not `install_policy` — in the preset catalog | `preset-catalogs.yml` and the lab prose both |
| M6 | The catalog **replacement** rule is stated, not implied | §1.3's first-match-wins warning appears in step 5 |
| M7 | The `--preset` URL trap shows the **warning text and the exit-0 behaviour** | Not merely "URLs are not accepted" |
| M8 | `plan-template.md` contains a literal `{CORE_TEMPLATE}` | `Select-String` the fixture |
| M9 | No version literal in `labs/lab22.md` | §4, rule 4 |
| M10 | Frontmatter and registry still agree | §2.4 table, all four rows |
| M11 | Fixture artifacts are referenced as code paths, not markdown links | §2.3 |
| M12 | The bundle's unshipped components are called out as Labs 23/24 work | §3.4 |

---

## 6. Departures from issue #51's body

| # | #51 says | This plan does | Why |
|---|---|---|---|
| D1 | *(implicitly)* pin is `1.0.10` from #48 | Re-pins to **`1.0.11`**, verified 2026-09-25 | §1. The registry's own comment carries a standing re-verification obligation; the release moved on 2026-09-24 |
| D2 | `specify preset resolve <name>` | Uses `specify preset resolve spec-template` — a **template** name | §1.2. The argument is `template_name`. A preset id fails |
| D3 | *"`specify init --preset` does not accept a URL"* | Teaches it as a **silent skip with a warning and exit 0** | §1.2. It does not reject; it looks like success. The softer truth is the more dangerous one |
| D4 | *"Org catalog via `.specify/preset-catalogs.yml` with `install_allowed: true`"* | Same, **plus** the first-match-wins replacement rule and an explicit community re-declaration | §1.3. Adding a catalog silently drops the built-in stack — the most likely learner failure |
| D5 | `labs/lab18.md:44-45` teaches the older 5-command flow | **Logged, not fixed** | #51's body assigns it to the separate retest/fix sweep. Confirmed present at lab18 lines 44–45; out of scope here |
| D6 | *"`bundle.yml` pinning preset + extension + workflow"* | Same, and records that **neither shipped example declares a preset** | §1.3. `provides.presets` is valid per `COMPONENT_KINDS`; the lab's bundle is a superset of the shipped ones, so a reader comparing against `bundles/bugfix` is told why they differ |
| D7 | — | Artifacts live in `labs/fixtures/lab22/`, referenced as code paths | §2.3. The only precedent in the repo (Lab 12) does exactly this, and it keeps the gate count stable |
| D8 | — | The lab names **no individual community preset** | §1.1. Four were added in `v1.0.11` alone |

---

## 7. Decisions — resolved 2026-09-25

### 7.1 Artifact location — `labs/fixtures/lab22/`

**Decided: `labs/fixtures/lab22/`.** The repo has exactly one precedent for lab-owned asset
files — `labs/fixtures/lab12/sales.parquet` — and Lab 12 references it as an inline code
path. Following it keeps `links-resolve` and `labs-have-frontmatter` counts unchanged (§2.3)
and needs no new convention.

> 🔹 **Rejected:** inlining every artifact as fenced code in the lab. It keeps the gate
> equally stable but gives the learner nothing to install with `--dev`, and step 3 depends
> on a real directory containing a real `preset.yml`.

> 🔹 **Rejected:** a top-level `examples/` directory. A second asset convention for one lab,
> with no precedent, and `enumeration-parity`'s behaviour against a new top-level directory
> is unverified.

### 7.2 The extension and workflow in `bundle.yml` are referenced, not built

**Decided: reference them.** #51's task list asks for a bundle pinning *preset + extension +
workflow*; the epic assigns the extension to U3 (#52, Lab 23) and the workflow to U4 (#53,
Lab 24). Building them here would duplicate later labs and pre-empt their teaching. The
bundle pins all three and the lab states plainly that two arrive later in the arc (§3.4).

### 7.3 The four uncommitted files stay untouched

**Confirmed, unchanged from #48's hand-off.** `README.md`, `labs/lab11.md`, `labs/lab14.md`
and `labs/setup.md` carry John's uncommitted edits (total-hours, lab count, and
`operationalises`→`operationalizes`). They are **not** #51's. Every file is staged
individually with `git add <path>`; `git add .` and `git add -A` are forbidden by
`AGENTS.md`. The README curriculum counts belong to #55.

---

## 8. Execution checklist

1. **Re-verify the Spec Kit release one more time** at the start of implementation. If it
   has moved past `v1.0.11`, re-run §1.1's delta read and update §1, §3.1 and §6/D1 before
   writing anything. *(Twelve releases in thirty-four days — assume it moved.)*
2. Re-pin `docs/_meta/registry.yaml` (§3.1). Verify it still parses; verify the diff is
   only the comment and the two values.
3. Create the fixture tree (§3.3–§3.8, files 3–10).
4. Write `labs/lab22.md` (§3.2), frontmatter untouched.
5. Run the gate (§5.1). Expect **13 files / 213 tests**. Investigate any movement.
6. Run the §4 no-literal check and the §5.3 manual checks M1–M12.
7. `CHANGELOG.md` entry (§3.8).
8. Commit per concern, `<type>: <description>`, **files added individually**. Never amend or
   rebase — every QA round must be able to diff from the commit it last reviewed.
9. Delete the `%TEMP%` spec-kit clone.
10. **Stop. No push, no PR, no issue edit** without John's explicit per-action approval.

---

## 9. Known-broken repo state — not #51's to fix

Carried from #48's hand-off and re-confirmed 2026-09-25. None of this blocks #51; all of it
will produce noise that is **not a signal about this work**.

| Item | Effect on #51 | Owner |
|---|---|---|
| **#63** — AWF model `auto` has no AI-credits pricing; every agentic workflow rejects with HTTP 400 | The Copilot Code Review check on any PR **fails without reviewing anything** (`Changes +0 -0`). Pushing a new `feature/*` branch **auto-files a duplicate `[aw]` issue** (Generate PRD fires on `create`) | John / repo admin |
| **#57** — `COPILOT_GITHUB_TOKEN` auth failure | The weekly content audit has never run, so #48's checks 8 and 9 **are not actually re-checking the pins**. This is why §1's re-verification had to be done by hand, and why §8 step 1 repeats it | John / repo admin |
| `tests/workflows` `gh aw compile` failures (4) | Pre-existing red. Never returns a story | — |
| `tests/workshop` (12 failed / 59 passed) and the wider 15-file red surface | Pre-existing red. Never returns a story | — |
| `weekly-content-audit.lock.yml` pinned to gh-aw v0.50.1 while the toolchain is v0.86.2 | **Do not recompile.** Recompiling changes the GitHub MCP server image the lock pins | — |
| There is **no test CI on pull requests** | The gate will not catch a mistake. **Run it locally, every round** | — |
