# EPIC-001 / Issue #48 — Registry and scaffolding for the enterprise-harness arc

**Implementation plan (spec only — no implementation in this document).**

| Field | Value |
|---|---|
| Parent epic | [EPIC-001 — Enterprise Agentic SDLC Harness](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Child issue | #48 — *Registry and scaffolding for the enterprise-harness arc* |
| Decomposition item | 1 of 9 — the only child with **no dependencies**; items 2, 3, 4 and 7 block on it |
| Spec authored | 2026-09-22 |
| Branch this spec was written on | `feature/harness-registry-scaffolding` |
| Open decisions | **None.** All three resolved 2026-09-22 — see §7. |
| Status | **Awaiting approval to execute.** Nothing in this plan has been executed. |

This document is written so that a cold-start session can execute it file-by-file without
re-deriving anything. Every YAML and frontmatter block below is literal and pasteable.

> **Scope of #48.** Groundwork only: pin versions in `docs/_meta/registry.yaml` and create
> lab stubs, so that every later lab in the arc satisfies the CI gates from its first
> commit. #48 does **not** write lab content. Labs 21–26 are authored by decomposition
> items 3–8.

---

## 1. Version re-verification — performed 2026-09-22

The epic's Appendix A.3 imposes a standing obligation to re-verify these values at
implementation time rather than carrying the 2026-09-17 numbers forward. That
re-verification was performed on **2026-09-22** against primary sources. **Two of the five
values have moved.**

| Claim | 2026-09-17 value | **Verified 2026-09-22** | Result | Primary source |
|---|---|---|---|---|
| Spec Kit latest release | `v1.0.8` | **`v1.0.9`** | ⚠️ **MOVED** | `GET repos/github/spec-kit/releases/latest` → `v1.0.9`, published `2026-09-21T15:44:26Z` |
| `Microsoft.Insights/dataCollectionRules` | `2024-03-11` | `2024-03-11` | ✅ unchanged | ARM/Bicep reference for `Microsoft.Insights/dataCollectionRules` — newest dated version listed is `2024-03-11` |
| `Microsoft.Insights/dataCollectionEndpoints` | `2024-03-11` | `2024-03-11` | ✅ unchanged | ARM/Bicep reference for `Microsoft.Insights/dataCollectionEndpoints` — "Latest" resource format emits `apiVersion: '2024-03-11'` |
| `Microsoft.OperationalInsights/workspaces/tables` | `2025-07-01` | **`2026-03-01`** | ⚠️ **MOVED** | ARM/Bicep reference for `workspaces/tables` — version list is `2026-03-01`, `2025-07-01`, `2025-02-01`, …; the "Latest" page's resource format emits `apiVersion: "2026-03-01"` |
| Logs Ingestion data-plane POST | `api-version=2023-01-01` | `api-version=2023-01-01` | ✅ unchanged | *Logs Ingestion API in Azure Monitor* — every documented URI example uses `?api-version=2023-01-01` |

### 1.1 Consequences of the two movements

**Spec Kit v1.0.8 → v1.0.9.** R1 in the epic predicted exactly this ("9 releases in the 4
weeks to 2026-09-17"). A tenth release landed on 2026-09-21, one day before this spec.
The registry therefore pins **`1.0.9`**, not the `1.0.8` written into #48's body and into
the epic's U2 acceptance criterion. Two documents now carry a stale literal:

- #48 body — *"pinned to the then-current release (v1.0.8 as of 2026-09-17 — re-check at
  implementation time)"*. The re-check was performed as instructed; `1.0.9` is the result.
  **The instruction was followed; the parenthetical example is simply out of date.**
- Epic U2 acceptance criterion — *"Lab pins **Spec Kit v1.0.8** via `docs/_meta/registry.yaml`
  (`spec_kit_version`), not a hardcoded string."* The **binding** half of that criterion is
  "via the registry, not a hardcoded string", and this plan satisfies it. The literal
  `v1.0.8` in that line should be read as the then-current example, not as the pin.

> ⚠️ **Do not "correct" the pin back to 1.0.8** on the strength of the epic text. The epic
> requires the *then-current* release; on 2026-09-22 that is `1.0.9`.

**Workspace tables `2025-07-01` → `2026-03-01`.** A newer **stable** (non-preview) API
version now exists. `2025-07-01` is not retired and would still deploy, so this is a
currency choice, not a break.

**Decided 2026-09-22 — pin `2026-03-01`, and record `2025-07-01` alongside it.** Rationale: the
registry exists so that labs track current guidance without editing prose, the weekly
content-audit workflow will flag the lag anyway, and Lab 25's Bicep should teach the
current stable surface. Recording the superseded value in a comment preserves the audit
trail and gives a fallback if `2026-03-01` turns out to carry a property change that
breaks the lab's Bicep.

> 🔹 **Rejected alternative.** Holding at `2025-07-01` — the version the epic's research
> validated end-to-end — and letting the weekly audit workflow propose the bump on its own
> schedule. Defensible, but it would ship Lab 25 teaching a superseded API surface on day
> one. If `2026-03-01` later proves to carry a property change that breaks the lab's Bicep,
> the previous value recorded in §3.2 is the documented fallback.

### 1.2 Standing re-verification obligation to carry into the registry

Both blocks must carry `last_verified: "2026-09-22"` **and** a comment stating the
obligation, so a future reader knows the value is dated rather than permanent. Spec Kit's
cadence — 10 releases between 2026-08-21 and 2026-09-21 — means the pin is expected to be
stale within days, and that is acceptable *as long as it is dated*. The failure mode this
guards against is an undated version string that a learner assumes is current.

### 1.3 Evidence base consulted

Per the epic's Handoff section, the archived research was consulted before touching any
Appendix A claim. Located on this machine at
`C:\Users\johnhain\.copilot\session-state\93364f27-bcfa-45c4-bf98-9d319425375d\files\`:

- `research-speckit-v1.0.8-2026-09-17.md` — backs `spec_kit_version`; records `v1.0.8` at
  `main @ 5e95214`, and itself advises "Pin the version… or your lab will drift mid-cohort."
- `research-copilot-telemetry-azure-2026-09-17.md` — backs the Azure Monitor versions;
  its resource table carries DCE `2024-03-11`, DCR `2024-03-11`, custom table `2025-07-01`,
  and the data-plane `?api-version=2023-01-01`.
- `EPIC-001-issue-drafts.md` — the drafts that became issues #48–#59.

**Appendix A supersedes these reports where they disagree** (epic lines 697–710). Two
corrections from the 2026-09-17 pass must not be walked backwards by any later work in
this arc:

1. The audit log dedupes on **`_document_id`**, not `event_id` (`event_id` belongs to the
   separate Copilot Usage Records Streaming schema).
2. There is **no `execute_hook` span**. The span tree is `invoke_agent → chat → execute_tool`.

Neither claim is touched by #48, but both are restated here because this spec is the entry
point for items 2, 3, 4 and 7.

---

## 2. Gate analysis — what actually has to be true

This is the part #48's body under-specifies, and it is the main reason this spec exists.

### 2.1 The three gate suites and their scan roots

Verified by reading each test file on 2026-09-22.

| Test file | Scans | Applies to new labs? |
|---|---|---|
| `tests/lab-structure/labs-have-frontmatter.test.ts` | every `labs/lab\d+.md` | ✅ **yes** |
| `tests/lab-structure/links-resolve.test.ts` | every `labs/*.md` | ✅ **yes** |
| `tests/lab-structure/labs-language-agnostic.test.ts` | labs 03–06 only | ❌ no |
| `tests/lab-structure/appendices-parity.test.ts` | `labs/appendices/{dotnet,node}` | ❌ no |
| `tests/lab-structure/lab12-*`, `lab13-*`, `lab14-*`, `gitattributes-*` | fixed targets | ❌ no |
| `tests/meta/enumeration-parity.test.ts` | `labs/`, `docs/_meta/registry.yaml`, `README.md`, `labs/setup.md` | ✅ **yes — three-way** |
| `tests/meta/coverage-threshold.test.ts` | `tests/**`, `node/coverage/` | ❌ no |
| `tests/content-currency/registry-consumed.test.ts` | `docs/_meta/registry.yaml`, `labs/` | ✅ **yes** |
| `tests/content-currency/cli-commands-current.test.ts` | labs 01, 05, 07, 08, 09, 10 | ❌ no |

### 2.2 Is `docs/epics/` scanned by the gate suites?

**No.** Adding this spec file (or any Markdown file) under `docs/epics/` is invisible to
`tests/lab-structure`, `tests/meta`, and `tests/content-currency`.

Established three ways:

1. A repo-wide search of `tests/` for `epics` returns zero matches.
2. Each suite's scan root is an explicit constant — `labs/`, `labs/appendices/`,
   `docs/_meta/registry.yaml`, `README.md`, `labs/setup.md`, `tests/`, `node/coverage/`.
   None of them is `docs/` or a recursive walk from the repo root.
3. The epic already documents this, at its CI-gate table: *"it scans `labs/` only, so links
   in this epic doc and anywhere under `docs/` are **ungated** and must be checked by hand."*

**Consequence — the placement is safe, and it carries an obligation.** Markdown links in
this spec are **not** machine-checked. Every relative link in this document was resolved by
hand against the working tree at authoring time. Any future edit to this file must re-check
its links manually; CI will not catch a broken one.

### 2.3 ⚠️ The gate hazard #48's body misses

> **Creating `labs/lab21.md`–`labs/lab26.md` turns `tests/meta/enumeration-parity.test.ts`
> RED unless `README.md` and `labs/setup.md` are updated in the same commit.**

`enumeration-parity` asserts that **every** lab file discovered in `labs/` appears in
**three** enumeration sources, not one:

```text
docs/_meta/registry.yaml  labs: block   ← #48's body covers this
README.md                               ← #48's body does NOT mention this
labs/setup.md                           ← #48's body does NOT mention this
```

Its `ALLOWLIST` exempts labs 01–11 from `setup.md` only. `registry` and `readme` allowlists
are **empty sets**, and no allowlist exists for labs 21–26 anywhere.

Verified 2026-09-22: a repo-wide search for `Lab 2[1-6]` / `lab2[1-6].md` matches **only**
`docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md`. Neither `README.md` nor
`labs/setup.md` mentions any of the six labs today.

The epic assigns README/`setup.md` wiring to decomposition **item 9**, which depends on
items 2–8. Taken literally, that ordering leaves the suite red from #48's first commit
until item 9 lands. That contradicts #48's own stated purpose — *"so the labs satisfy
existing CI gates from the first commit"* — and its acceptance criterion that the three
suites are green.

**Resolution adopted by this plan: #48 adds the minimal README and `setup.md` enumeration
entries needed to keep the gate green.** Item 9 still owns the *substantive* integration
(the learning-path narrative, the total-hours line, Lab 20 → Lab 21 chaining, Lab 25 → Lab 26
chaining). #48 adds only enumeration rows. See §3.4 and §3.5 for the exact minimal edits and
the boundary between the two.

The matcher is permissive — `fileMentionsLab` passes on either a link
(`(labs/lab21.md)` / `(lab21.md)`) or a bare heading (`Lab 21`) — so the minimal edit really
is minimal.

### 2.4 What a stub must contain to pass

| Requirement | Enforced by | How the stub satisfies it |
|---|---|---|
| YAML frontmatter block present | `labs-have-frontmatter` | leading `---` block |
| Frontmatter keys `title`, `lab_number`, `pace` | `labs-have-frontmatter` | all three present |
| `lab_number` **equals** the number in the filename | `labs-have-frontmatter` | `lab21.md` → `lab_number: 21` |
| Every internal markdown link resolves on disk | `links-resolve` | links restricted to files that exist **after this commit** |
| Lab ID present in `registry.yaml` `labs:` | `enumeration-parity` | §3.3 |
| Lab ID referenced in `README.md` | `enumeration-parity` | §3.4 |
| Lab ID referenced in `labs/setup.md` | `enumeration-parity` | §3.5 |
| ≥ 3 labs contain the literal `docs/_meta/registry.yaml` | `registry-consumed` | each stub carries `registry: docs/_meta/registry.yaml` in frontmatter |
| `pace_workshop_minutes` present and > 0, for **every** registry lab | `tests/workshop/time-budget.test.ts` | §3.3 |
| `pace_workshop_minutes >= pace_presenter_minutes` | `tests/workshop/time-budget.test.ts` | §3.3, verified per row |

> 🚫 **Link trap — the single most likely way to turn this commit red.** `links-resolve`
> resolves every non-`http`/`mailto`/anchor markdown link against the filesystem. A stub
> that forward-references an artifact the arc has not built yet — `enterprise-harness-bundle/`,
> `.github/extensions/enterprise-sdlc-workbench/`, a `specs/` directory, a Bicep file —
> **fails immediately**. Name such artifacts in **backticks**, never as a markdown link.
> Frontmatter (`registry: docs/_meta/registry.yaml`) is not a markdown link and is not
> scanned, so it is safe and simultaneously satisfies `registry-consumed`.

### 2.5 Two pace shapes — they are not the same shape

This trips people up, so it is stated explicitly.

**Registry** (`docs/_meta/registry.yaml`) — three **flat** keys under `labs:` → `labXX:`:

```yaml
labs:
  lab20:
    title: "Enterprise Token Optimization & Reporting"
    pace_presenter_minutes: 6
    pace_workshop_minutes: 10
    pace_self_minutes: 25
```

**Lab file frontmatter** (`labs/labXX.md`) — a **nested** `pace:` block with **two** keys,
and different key names:

```yaml
---
title: "Enterprise Token Optimization & Reporting"
lab_number: 20
pace:
  presenter_minutes: 6
  self_paced_minutes: 25
registry: docs/_meta/registry.yaml
---
```

Differences to respect: the registry is flat and prefixed (`pace_*_minutes`), frontmatter is
nested and unprefixed; the registry has **three** pace values, frontmatter has **two**;
`pace_self_minutes` (registry) is `self_paced_minutes` (frontmatter); and
`pace_workshop_minutes` **has no frontmatter counterpart at all**.

### 2.6 `pace_workshop_minutes` has no self-paced exemption

The epic declares the Labs 21–26 arc **self-paced only**, kept out of the 4-hour workshop
curriculum — five (now six) new labs cannot enter a 240-minute budget without displacing
existing modules.

That declaration does **not** exempt them from `pace_workshop_minutes`.
`tests/workshop/time-budget.test.ts` contains a `registry workshop-pace audit` describe
block that iterates `Object.entries(registry.labs)` — **every** entry, with no filter for
workshop participation — and asserts:

```ts
expect(lab.pace_workshop_minutes).toBeTypeOf('number');
expect(lab.pace_workshop_minutes!).toBeGreaterThan(0);
expect(lab.pace_workshop_minutes!).toBeGreaterThanOrEqual(lab.pace_presenter_minutes);
```

So all six entries need a positive `pace_workshop_minutes` that is **≥** their
`pace_presenter_minutes`, even though none of them will ever be presented in the workshop.
Omitting the key, or setting it below the presenter value, is a new failure.

Adding registry entries does **not** otherwise perturb the workshop suite: the curriculum's
`anchor_labs` check is a *subset* assertion (every anchor must exist in the registry), so
adding unanchored labs is inert, and the 5–6 module-count and 240-minute assertions read
`curriculum.md`, which #48 does not touch.

---

## 3. File-by-file implementation

Six files changed, six files created.

| # | File | Action |
|---|---|---|
| 3.1 | `docs/_meta/registry.yaml` | add `spec_kit_version` |
| 3.2 | `docs/_meta/registry.yaml` | add `azure_monitor` block |
| 3.3 | `docs/_meta/registry.yaml` | add `lab21`–`lab26` under `labs:` |
| 3.4 | `README.md` | add six enumeration rows |
| 3.5 | `labs/setup.md` | add one enumeration sentence |
| 3.6 | `labs/lab21.md` … `labs/lab26.md` | create six stubs |

### 3.1 `docs/_meta/registry.yaml` — `spec_kit_version`

**Placement.** Top-level scalar, immediately after `gh_aw_schema_version` and before
`mcp_protocol_spec_version`. This keeps the file's existing "version floors first,
then protocol/servers, then models, then labs" ordering. Top-level placement matters:
`registry-consumed` asserts a fixed list of required top-level keys, and the weekly
content-audit workflow matches on stable key names.

```yaml
# GitHub Spec Kit (`github/spec-kit`) release the enterprise-harness arc
# (Labs 21-26) is authored and tested against. Labs MUST reference this key
# rather than hardcoding a version — the install command is
# `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v<version>`.
#
# RE-VERIFICATION OBLIGATION (epic EPIC-001 Appendix A.3, item 1):
# Spec Kit releases roughly weekly — 10 releases between 2026-08-21 and
# 2026-09-21. Re-check the pinned version, the command list, and the Copilot
# integration layout before any cohort. Verified 2026-09-22 via
# `gh api repos/github/spec-kit/releases/latest`: v1.0.9, published
# 2026-09-21T15:44:26Z. This SUPERSEDES the v1.0.8 value recorded on
# 2026-09-17 in EPIC-001 and in issue #48's body.
spec_kit_version: "1.0.9"
spec_kit_version_last_verified: "2026-09-22"
```

> **Why a sibling `*_last_verified` scalar rather than a nested map?** The existing
> top-level version keys (`copilot_cli_version_floor`, `gh_aw_schema_version`) are plain
> strings; `last_verified` appears only inside list items such as `mcp_servers[]`. Turning
> `spec_kit_version` into a map would make it the only top-level version key that is not a
> string, which risks the audit workflow's key matching. A flat sibling scalar preserves
> both the convention and the date. *(If the audit workflow is later taught a nested shape,
> converge then — not in #48.)*

### 3.2 `docs/_meta/registry.yaml` — `azure_monitor` block

**Placement.** Top-level, after `mcp_servers` and before `models`. Grouping the API
versions in one mapping keeps Lab 25's Bicep parameterised from a single source.

```yaml
# Azure Monitor / Log Analytics resource API versions for Lab 25 (EPIC-001 U5).
# Labs and Bicep MUST read these rather than hardcoding an apiVersion.
#
# RE-VERIFICATION OBLIGATION (epic EPIC-001 Appendix A.3, item 3): re-confirm
# against the ARM/Bicep template reference before any cohort. Verified
# 2026-09-22 against learn.microsoft.com/azure/templates/*.
azure_monitor:
  # Microsoft.Insights/dataCollectionRules — newest dated version in the
  # reference version list. Unchanged since 2026-09-17.
  data_collection_rules_api_version: "2024-03-11"

  # Microsoft.Insights/dataCollectionEndpoints — "Latest" resource format
  # emits apiVersion '2024-03-11'. Unchanged since 2026-09-17.
  data_collection_endpoints_api_version: "2024-03-11"

  # Microsoft.OperationalInsights/workspaces/tables.
  # CHANGED 2026-09-22: a newer STABLE version (2026-03-01) has shipped and is
  # now what the "Latest" reference page emits. The previously-recorded
  # 2025-07-01 (EPIC-001, 2026-09-17) is superseded but NOT retired — it still
  # deploys. If 2026-03-01 introduces a property change that breaks Lab 25's
  # Bicep, fall back to 2025-07-01 and record why here.
  workspaces_tables_api_version: "2026-03-01"
  workspaces_tables_api_version_previous: "2025-07-01"

  # Logs Ingestion API data-plane POST:
  #   {Endpoint}/dataCollectionRules/{DCR-Immutable-ID}/streams/{Stream-Name}?api-version=...
  # This is a DATA-PLANE version and is NOT the same as the ARM versions above.
  # Unchanged since 2026-09-17.
  logs_ingestion_data_plane_api_version: "2023-01-01"

  last_verified: "2026-09-22"
```

**Companion facts that belong in Lab 25's prose, not in the registry** (restated here so
item 7 does not re-derive them): the DCR needs `"kind": "Direct"` and a DCE is required only
for private link or for an older DCR created without a logs-ingestion endpoint; the role is
**`Monitoring Metrics Publisher` on the DCR** (not the workspace, not the DCE); the stream
name in the POST URL must match the **`streamDeclarations` key**, not `outputStream`; the
HTTP Data Collector API's 2026-09-14 date ended **support**, not ingestion.

### 3.3 `docs/_meta/registry.yaml` — six `labs:` entries

**Placement.** Append after the existing `lab20:` entry, preserving two-space indentation
under `labs:` and ascending lab order.

```yaml
  # Labs 21-26 — EPIC-001 enterprise-harness arc. SELF-PACED ONLY: these labs
  # are deliberately NOT in workshop/curriculum.md (the 4-hour / 240-minute
  # budget has no room without displacing M1-M6). pace_workshop_minutes is
  # still REQUIRED and must be >= pace_presenter_minutes — the registry
  # workshop-pace audit in tests/workshop/time-budget.test.ts iterates EVERY
  # registry lab with no workshop-participation filter.
  lab21:
    title: "The Tech Lead's Plugin & Marketplace Lockdown"
    pace_presenter_minutes: 6
    pace_workshop_minutes: 10
    pace_self_minutes: 30
  lab22:
    title: "Centralized Spec Kit Templates & the Org Catalog"
    pace_presenter_minutes: 7
    pace_workshop_minutes: 12
    pace_self_minutes: 35
  lab23:
    title: "Custom SDLC Stages, Gates & the Rework Loop"
    pace_presenter_minutes: 7
    pace_workshop_minutes: 12
    pace_self_minutes: 35
  lab24:
    title: "The Notification Funnel & Executable Tasks"
    pace_presenter_minutes: 6
    pace_workshop_minutes: 10
    pace_self_minutes: 30
  lab25:
    title: "Telemetry, Log Analytics & the Improvement Loop"
    pace_presenter_minutes: 8
    pace_workshop_minutes: 14
    pace_self_minutes: 45
  lab26:
    title: "Copilot App Canvases for Applied SDLC Operations"
    pace_presenter_minutes: 7
    pace_workshop_minutes: 12
    pace_self_minutes: 35
```

#### 3.3.1 Justification for the minute values

These are derived from each unit's acceptance-criteria load in the epic and calibrated
against the existing registry, **not** asserted. Reference points from the current file:
Lab 16 (`managed-settings.json` governance) is `6 / 10 / 25`; Lab 19 (gh-aw template) is
`7 / 12 / 25`; **Lab 18 is the current maximum at `8 / 14 / 30`**.

| Lab | Unit | Value | Reasoning |
|---|---|---|---|
| 21 | U1 | `6 / 10 / 30` | Calibrated to **Lab 16** (`6/10/25`), which it directly extends, plus 5 self-paced minutes for authoring `enterprise-harness-bundle/` on top of `plugin-template/` conventions and running the `install.mjs` dry-run. The `managed-settings.json` lockdown material is reused from Lab 16 rather than retaught. |
| 22 | U2 | `7 / 12 / 35` | Above Lab 18 (`8/14/30`) on self-paced time because it is the only lab requiring a **third-party CLI install** (`uv tool install specify-cli`) before any exercise, then `specify init`, an org preset customizing three templates, a `bundle.yml`, and a `preset-catalogs.yml`. Presenter time stays at 7 because a demo skips the install. |
| 23 | U3 | `7 / 12 / 35` | Same shape as Lab 22 and depends on it. Authoring `extension.yml` plus a workflow overlay with `insert_after` and `type: gate`, then exercising `specify workflow run` / `status --json` / `resume`, is comparable authoring volume — the second-belt `check-prerequisites` and rework-loop material adds prose, not setup. |
| 24 | U4 | `6 / 10 / 30` | Lighter than 22/23: it composes existing repo patterns (`generate-prd.md`, `weekly-content-audit.md` safe-outputs) rather than introducing a toolchain. `taskstoissues` needs an `origin` remote and the GitHub MCP server already configured, so setup is short. Matches Lab 16's presenter shape. |
| 25 | U5 | `8 / 14 / 45` | **The largest in the arc, and the only one above the current registry maximum.** It is the only lab shipping **two complete paths** — an offline file-exporter path that must finish with no Azure subscription, and an Azure path with Bicep for workspace + DCR + custom tables. Add the OTel managed-settings key, a KQL pack, a Workbook, and the longest caveat list in the epic. Presenter `8` and workshop `14` match Lab 18's ceiling; self-paced `45` exceeds it by 15 because the offline path alone is a full exercise. |
| 26 | U6 | `7 / 12 / 35` | Matches Lab 19 (`7/12/25`) plus 10 self-paced minutes for a **prerequisite the other labs do not have**: downloading, installing, and signing into the GitHub Copilot App, connecting a local clone, and confirming project-scoped extension loading — all before the three canvases and the dry-run. A documented read-only fallback keeps it from going higher. |

**Invariant check — `pace_workshop_minutes >= pace_presenter_minutes` (§2.6):**

| | 21 | 22 | 23 | 24 | 25 | 26 |
|---|---|---|---|---|---|---|
| presenter | 6 | 7 | 7 | 6 | 8 | 7 |
| workshop | 10 | 12 | 12 | 10 | 14 | 12 |
| holds? | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Every workshop value is strictly greater than its presenter value, so the assertion passes
with margin rather than sitting on the boundary.

#### 3.3.2 ⚠️ Curriculum-total side effect — a number for item 9, not a rounding tweak

`pace_self_minutes` for the six new labs sums to **210 minutes (3.5 h)**:
`30 + 35 + 35 + 30 + 45 + 35`.

The epic records the existing 20 labs at **440 minutes (~7.3 h)**, verified 2026-09-17.

```text
440  existing
+210  Labs 21-26 (this plan)
────
 650 minutes ≈ 10.8 hours
```

The epic estimated **~620 minutes (~10.5 h)** from a placeholder of "roughly 25–40 self-paced
minutes each". This plan's scope-derived values land **30 minutes higher**.

README currently says **"Total: ~7 hours (20 labs …)"**. The corrected figure is
**"~10.8 hours (26 labs …)"**, not ~10.5.

> **#48 does not change the total-hours line.** That line is decomposition item 9's, and
> changing it is a curriculum statement, not scaffolding. It is flagged here so item 9 uses
> the arithmetic above rather than re-quoting the epic's superseded ~10.5 h estimate. This
> is R9 in the epic's risk table.

### 3.4 `README.md` — minimal enumeration rows (required by `enumeration-parity`)

Append six rows to the **Lab Modules** table, immediately after the existing `Lab 20` row
(currently line 564) and **before** the `**Total: ~7 hours**` line (currently line 566).
Match the existing `| [Lab NN](labs/labNN.md) | Title | Summary |` shape exactly.

```markdown
| [Lab 21](labs/lab21.md) | The Tech Lead's Plugin & Marketplace Lockdown | Org-mandated agents and skills as one installable plugin, deny-by-default marketplace lockdown |
| [Lab 22](labs/lab22.md) | Centralized Spec Kit Templates & the Org Catalog | Org preset for spec/plan/tasks templates, `bundle.yml`, discovery-vs-install catalog control |
| [Lab 23](labs/lab23.md) | Custom SDLC Stages, Gates & the Rework Loop | Custom epic and QA-review phases, workflow overlays with approval gates, first-class rework |
| [Lab 24](labs/lab24.md) | The Notification Funnel & Executable Tasks | Stage-transition notification routing, tasks projected to issues, task-as-prompt format |
| [Lab 25](labs/lab25.md) | Telemetry, Log Analytics & the Improvement Loop | Copilot OpenTelemetry export, offline file-exporter path, Logs Ingestion API, KQL pack and Workbook |
| [Lab 26](labs/lab26.md) | Copilot App Canvases for Applied SDLC Operations | Project-scoped canvas extension, SDLC board, code-aware workbench, dry-run release composer |
```

**Boundary — what #48 deliberately does NOT change in `README.md`:**

- the `**Total: ~7 hours** (20 labs …)` line (item 9 — see §3.3.2);
- the 🧭 **Learning path** note (item 9 — it is narrative sequencing);
- the repository-structure tree (items 3 and 8 add `enterprise-harness-bundle/` and
  `.github/extensions/enterprise-sdlc-workbench/` when those directories actually exist).

Rationale: #48 adds only what the gate requires. Everything above is substantive curriculum
framing that belongs with the content it describes.

### 3.5 `labs/setup.md` — minimal enumeration sentence (required by `enumeration-parity`)

`setup.md` is an intentionally-grouped narrative redirect page, and its allowlist exempts
labs 01–11 only. Labs 12–20 are individually linked in a single trailing paragraph
(currently lines ~31–36). Append one sentence to that paragraph, after the Lab 20 clause:

```markdown
> Labs 21–26 are the **enterprise agentic SDLC harness** arc (self-paced):
> [Lab 21](lab21.md) the tech lead's plugin and marketplace lockdown,
> [Lab 22](lab22.md) centralized Spec Kit templates and the org catalog,
> [Lab 23](lab23.md) custom SDLC stages, gates and the rework loop,
> [Lab 24](lab24.md) the notification funnel and executable tasks,
> [Lab 25](lab25.md) telemetry, Log Analytics and the improvement loop, and
> [Lab 26](lab26.md) Copilot App canvases for applied SDLC operations.
```

Keep the `>` blockquote prefix — the surrounding paragraph is a blockquote. The links are
repo-relative from `labs/` (`lab21.md`, not `labs/lab21.md`), matching the existing
Lab 12–20 links on that page; both forms satisfy `fileMentionsLab`, but consistency wins.

> `labs/setup.md` **is** scanned by `links-resolve` (it lives in `labs/` and ends in `.md`).
> All six targets are created in the same commit, so the links resolve. Do not land this
> edit without the stubs.

### 3.6 `labs/lab21.md` … `labs/lab26.md` — six stubs

A stub exists to hold the gate open for later content. It must be honest about being a stub
— a learner who opens `labs/lab25.md` before item 7 lands should be told immediately that
the content is not written yet, and where the specification lives.

**Invariants for all six** (from §2.4):

1. Frontmatter carries `title`, `lab_number`, `pace` (nested — §2.5), and
   `registry: docs/_meta/registry.yaml`.
2. `lab_number` is an **integer** matching the filename.
3. `title` matches the registry `labs.labXX.title` string exactly.
4. `pace.presenter_minutes` / `pace.self_paced_minutes` match the registry's
   `pace_presenter_minutes` / `pace_self_minutes`. There is **no** frontmatter counterpart
   to `pace_workshop_minutes` — do not invent one.
5. Markdown links point **only** at files that exist after this commit:
   `../docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md`,
   `../docs/_meta/registry.yaml`, and sibling `labNN.md` files. Everything the arc has yet
   to build is named in **backticks**, never linked.
6. No version string appears in the body (§4).

#### Template

Substitute the per-lab values from the table below.

```markdown
---
title: "<TITLE>"
lab_number: <NN>
pace:
  presenter_minutes: <P>
  self_paced_minutes: <S>
registry: docs/_meta/registry.yaml
---

# <NN> — <TITLE>

> 🚧 **Stub.** This lab is scaffolding for the enterprise agentic SDLC harness
> arc (EPIC-001). The content is specified but not yet written — see
> [EPIC-001](../docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md),
> unit **<UNIT>**, for the user stories and acceptance criteria this lab must
> satisfy.

> ⏱️ Presenter pace: <P> minutes | Self-paced: <S> minutes

**Part of:** Labs 21–26, the enterprise agentic SDLC harness arc — <ARC_POSITION>

## What this lab will cover

<BULLETS>

## Prerequisites

<PREREQS>

## Versions and pins

This lab reads every version it depends on from the content registry at
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). No version string
is hardcoded in this file. See the registry's re-verification obligations
before running this lab with a cohort.

## Status

Not yet authored. Tracked by EPIC-001 decomposition item <ITEM>.
```

#### Per-lab substitutions

| File | `<NN>` | `<TITLE>` | `<P>` | `<S>` | `<UNIT>` | `<ITEM>` |
|---|---|---|---|---|---|---|
| `labs/lab21.md` | 21 | The Tech Lead's Plugin & Marketplace Lockdown | 6 | 30 | U1 | 3 |
| `labs/lab22.md` | 22 | Centralized Spec Kit Templates & the Org Catalog | 7 | 35 | U2 | 4 |
| `labs/lab23.md` | 23 | Custom SDLC Stages, Gates & the Rework Loop | 7 | 35 | U3 | 5 |
| `labs/lab24.md` | 24 | The Notification Funnel & Executable Tasks | 6 | 30 | U4 | 6 |
| `labs/lab25.md` | 25 | Telemetry, Log Analytics & the Improvement Loop | 8 | 45 | U5 | 7 |
| `labs/lab26.md` | 26 | Copilot App Canvases for Applied SDLC Operations | 7 | 35 | U6 | 8 |

`<ARC_POSITION>`, `<BULLETS>` and `<PREREQS>` are short and derived from the epic's unit
sections; suggested content below.

> **Reading the prerequisite targets.** Cross-lab targets are written in backticks here,
> as `[Lab NN](labNN.md)` — the form that is correct **inside a lab file**, because
> `links-resolve` resolves relative to the containing file's directory (`labs/`). They are
> deliberately not live links in this spec, which lives in `docs/epics/`; from here the
> same path would not resolve. Paste the backticked form into the stub, not a rewritten one.

- **Lab 21** — *first lab in the arc.* Covers: packaging mandated agents and skills as one
  installable plugin following `plugin-template/` conventions; `managed-settings.json`
  marketplace lockdown via `extraKnownMarketplaces`, `enabledPlugins` and
  `strictKnownMarketplaces`. Prerequisites: `[Lab 11](lab11.md)`, `[Lab 16](lab16.md)`.
- **Lab 22** — *builds on Lab 21.* Covers: an org preset customizing the spec, plan and
  tasks templates; `bundle.yml` as one versioned install; the org catalog with
  discovery-only vs install-allowed sources; the resolution stack. Prerequisites:
  `[Lab 18](lab18.md)`; the Spec Kit CLI at the registry-pinned version.
- **Lab 23** — *builds on Lab 22.* Covers: custom epic and QA-review phases via
  `extension.yml`; a workflow overlay using `insert_after` and `type: gate`; the rework
  loop; the honest caveat that chat-time stage ordering is convention, not enforcement.
  Prerequisites: `[Lab 22](lab22.md)`.
- **Lab 24** — *builds on Lab 23.* Covers: notification routing on stage transition;
  projecting tasks into GitHub Issues; the task-as-prompt format, labelled DIY because
  per-task agent/model metadata is not native. Prerequisites: `[Lab 08](lab08.md)`,
  `[Lab 23](lab23.md)`.
- **Lab 25** — *builds on Lab 24; chains forward to Lab 26.* Covers: the Copilot
  OpenTelemetry export and the managed-settings `telemetry` key; `captureContent` as a
  governance decision; an **offline path** that completes with no Azure subscription; the
  Azure path via the Logs Ingestion API; a KQL pack and Workbook. Prerequisites:
  `[Lab 19](lab19.md)`, `[Lab 20](lab20.md)`. Azure is **optional**.
- **Lab 26** — *final lab in the arc.* Covers: a project-scoped Copilot App canvas
  extension; an SDLC board, a code-aware workbench, and a dry-run release/handoff composer.
  Prerequisites: `[Lab 23](lab23.md)`, `[Lab 24](lab24.md)`, `[Lab 25](lab25.md)`, and the
  GitHub Copilot App with canvas support.

> **Link check.** Every `labNN.md` named above (08, 11, 16, 18, 19, 20, and siblings 21–26)
> exists on disk after this commit — verified 2026-09-22 against the working tree. Adding
> any other link — to a bundle, an extension directory, a Bicep file, or an external doc
> path that is not `http(s)` — will fail `links-resolve`.

---

## 4. "No hardcoded versions" — explicit statement

> **No version string that belongs in `docs/_meta/registry.yaml` appears hardcoded in any
> lab file created or modified by #48.**

This satisfies #48's second acceptance criterion and the epic's final success criterion.
Concretely, in the six stubs:

- **no** Spec Kit version literal (`1.0.9`, `v1.0.8`, `@v1.0.x`) — Lab 22 and Lab 23 read
  `spec_kit_version`;
- **no** Azure API version literal (`2024-03-11`, `2026-03-01`, `2025-07-01`,
  `2023-01-01`) — Lab 25's Bicep reads the `azure_monitor` block;
- **no** Copilot CLI version literal — `copilot_cli_version_floor` already exists;
- **no** gh-aw version literal — `gh_aw_schema_version` already exists.

The `<P>` / `<S>` pace integers in frontmatter are **not** an exception: they are duplicated
from the registry by design, because `labs-have-frontmatter` requires a `pace` key in the
file itself and the existing 20 labs all carry it (see `labs/lab20.md`). They are pacing
metadata, not product versions. The invariant to maintain is that they match the registry;
§3.6 invariant 4 states that.

Each stub carries the literal `docs/_meta/registry.yaml` in frontmatter, which also keeps
`tests/content-currency/registry-consumed.test.ts` comfortably above its floor of 3
registry-referencing labs.

---

## 5. Acceptance gate

### 5.1 Pre-change baseline — measured 2026-09-22

Run from the repo root on `feature/harness-registry-scaffolding`, working tree clean:

```shell
npx vitest run tests/lab-structure tests/meta tests/content-currency
```

**Observed:**

```text
Test Files  13 passed (13)
     Tests  183 passed (183)
```

This matches #48's stated baseline of 13 files / 183 tests exactly. One non-fatal
`stderr` warning is emitted and is expected: `coverage-threshold.test.ts` logs
`[D.3] SKIPPING node coverage floor assertion` because `node/coverage/coverage-summary.json`
does not exist on a cold run. That is a designed loud-skip, not a failure — the suite still
reports 183 passed.

### 5.2 Post-change expectation

```shell
npx vitest run tests/lab-structure tests/meta tests/content-currency
```

**Must be green.** Test counts **will increase** — several suites are parameterised per lab
file via `it.each`, so adding six labs adds tests. Expected deltas:

| Suite | Per-lab tests added | × 6 labs |
|---|---|---|
| `labs-have-frontmatter` | 1 | +6 |
| `links-resolve` | 1 | +6 |
| `enumeration-parity` | 3 (registry + README + setup.md) | +18 |
| **Total** | | **+30** |

So the expected post-change result is **13 files, 213 tests, all passing**.

> The file count stays at 13 — #48 adds no test files. The 183 → 213 change is the gate
> *growing*, which is the intended outcome. **Record the actual number when the work is
> done**; if it is not 213, something is enumerated differently than modelled here and it
> needs explaining before the commit is trusted.

### 5.3 Recommended supplementary check

Not part of #48's acceptance criteria, but cheap and it catches the §2.6 invariant directly:

```shell
npx vitest run tests/workshop/time-budget.test.ts
```

The `registry workshop-pace audit` describe block must not gain new failures. Its two
assertions iterate every registry lab, so the six new entries are exercised immediately.

> ⚠️ **`tests/workshop` is already RED on `main`** — 12 pre-existing failures in workshop
> slide front-matter and curriculum parity, unrelated to this epic. **This is out of scope
> for #48 and must not be "fixed" here.** Read the result as a delta: the two
> `registry workshop-pace audit` assertions must pass. Do not read a green/red summary for
> the whole file as a verdict on this work.

### 5.4 Manual checks CI cannot perform

Because `docs/epics/` is ungated (§2.2) and some invariants are cross-file:

1. Relative links in this spec resolve by hand.
2. Each stub's `title` matches its registry `title` character-for-character.
3. Each stub's `pace.presenter_minutes` / `pace.self_paced_minutes` match the registry's
   `pace_presenter_minutes` / `pace_self_minutes`.
4. `docs/_meta/registry.yaml` still parses as YAML after three separate insertions
   (`js-yaml` parses it in three different tests, so a syntax error surfaces as a confusing
   multi-suite failure rather than a clean message).
5. No stub links to an artifact the arc has not built yet.

---

## 6. Departures from issue #48's body

Recorded explicitly so the difference between this plan and the issue text is deliberate
and reviewable, not drift.

| # | #48's body says | This plan does | Why |
|---|---|---|---|
| 1 | Task list covers **`lab21`–`lab25`** (five labs), in both the registry task and the stub task | Covers **`lab21`–`lab26`** (six labs) | **#48's checklist is stale.** The epic was extended to Labs 21–26 by commit `b4b0e45` (U6 — Copilot App canvases, tracked as issue #59) **after** #48 was written. The epic's decomposition table (lines 583–593) lists nine items including *"8 \| Lab 26 …"*. John's decision: fold Lab 26 into #48 so there is **one** registry edit and **one** CI pass instead of #59 reopening the same file. **#48's body is not being edited** — this table is the record. |
| 2 | Pin `spec_kit_version` to **`v1.0.8`** *("as of 2026-09-17 — re-check at implementation time")* | Pins **`1.0.9`** | The re-check was performed on 2026-09-22 as the issue instructs. `v1.0.9` shipped 2026-09-21. See §1. The issue's instruction is followed; only its example literal is stale. |
| 3 | Azure Monitor workspace tables at **`2025-07-01`** *("Re-verify at implementation time")* | Pins **`2026-03-01`**, recording `2025-07-01` as `*_previous` | The re-verification found a newer stable version. `2025-07-01` is superseded, not retired. §1.1 carries the rationale and a documented fallback. **Decided by John 2026-09-22 (§7.2).** |
| 4 | Acceptance: *"13 files, 183 tests"* | Expects **13 files, 213 tests** | 183 is the **pre-change** baseline (confirmed §5.1). `it.each`-parameterised suites grow by 30 tests when six labs are added. The issue quotes the baseline as if it were invariant. Green is the real criterion; §5.2 shows the arithmetic. |
| 5 | Lists four tasks, none mentioning **`README.md`** or **`labs/setup.md`** | Also edits both, minimally | `enumeration-parity` requires **three-way** enumeration. Creating the stubs without these two edits turns the gate red immediately, contradicting #48's own acceptance criterion. §2.3. Substantive integration stays with item 9. |
| 6 | Silent on the epic's **canvas-support version floor** registry key | **Does not add it.** Deferred to #59 | See §7.1. Adding it would require inventing an unverifiable version number. |
| 7 | Silent on the **curriculum total-hours** consequence | Computes it (**~10.8 h**, not the epic's ~10.5 h) and hands it to item 9 | §3.3.2. Recorded rather than acted on, because the README total-hours line is item 9's. |

---

## 7. Decisions — resolved 2026-09-22

All three questions were put to John on 2026-09-22 and each was resolved in favour of the
recommendation. They are recorded here with their reasoning **and the rejected
alternative**, so a later reader can see the trade that was made instead of re-opening it.
Sections 1–5 above already reflect these outcomes; nothing in the plan is contingent.

### 7.1 The canvas-support version floor — deferred to #59

The epic calls for one more registry key: *"New canvas registry key: a Copilot App / Copilot
CLI canvas-support version floor, so Lab 26 does not hardcode an extension API expectation"*
(epic line ~522), and R10's mitigation repeats it.

Since Lab 26 is being folded into #48, it is fair to ask whether this key lands here too.

**Decision: no — defer the key to #59 (Lab 26 implementation).**

Reasoning: `copilot_cli_version_floor` is a *verified* fact — the existing comment cites
`npm view @github/copilot versions` and a publication date. There is no equivalent published
statement establishing a minimum Copilot App or CLI version for canvas support. Writing a
number into the registry today would produce an **undated, vendor-attributed version claim
with no primary source** — precisely the failure mode the registry exists to prevent, and it
would be stamped with a `last_verified` date implying verification that did not happen.

Appendix A.3 item 5 already places this obligation at Lab 26's implementation time:
*"before implementing Lab 26, re-check the current project-scoped extension manifest shape,
canvas open/action schemas, reload and inspect workflow, and any documented local
extension-host trust-boundary requirements."* That is the right moment to establish the
floor — against the surface actually exercised.

The cost of deferring is one extra registry edit in #59. The cost of not deferring is a
fabricated version number. **The trade favours deferring.**

> **Rejected alternative.** Reserving the key now as a commented-out placeholder with no
> value and no `last_verified` — honest, in that it asserts nothing false, but it buys
> nothing that #59 cannot do in the same edit that establishes the real floor.

### 7.2 Workspace tables API version — `2026-03-01` confirmed

§1.1. **Decision: pin `2026-03-01`** (current stable), with `2025-07-01` recorded as the
previous value in §3.2. Rejected alternative: holding at `2025-07-01`, which the epic's
research validated end-to-end, and letting the weekly content-audit workflow propose the
bump on its own schedule. Both were defensible; currency won, and recording the superseded
value preserves both the audit trail and the fallback.

### 7.3 The README / `setup.md` boundary — confirmed

§2.3 and §3.4. **Decision: #48 adds enumeration rows only**, leaving the total-hours line,
the learning-path note, and the repository-structure tree to item 9. Rejected alternative:
allowlisting labs 21–26 in `enumeration-parity.test.ts` until item 9 lands — rejected
because the allowlist requires a written justification per entry, and *"the content is not
written yet"* is exactly the kind of gap the gate was built to catch. Weakening a test to
accommodate a stub is the wrong direction.

---

## 8. Execution checklist

Ordered so the tree is never in a state where the gate is red for a reason other than
incomplete work.

- [ ] 1. `docs/_meta/registry.yaml` — add `spec_kit_version` + `spec_kit_version_last_verified` (§3.1)
- [ ] 2. `docs/_meta/registry.yaml` — add the `azure_monitor` block (§3.2)
- [ ] 3. `docs/_meta/registry.yaml` — add `lab21`–`lab26` under `labs:` (§3.3)
- [ ] 4. Confirm the registry still parses (§5.4 item 4)
- [ ] 5. Create `labs/lab21.md` … `labs/lab26.md` (§3.6) — **all six**, before running any test
- [ ] 6. `README.md` — add the six Lab Modules rows (§3.4)
- [ ] 7. `labs/setup.md` — add the Labs 21–26 sentence (§3.5)
- [ ] 8. Run the acceptance gate (§5.2); expect **13 files, 213 tests, green**; record the actual number
- [ ] 9. Run the supplementary workshop check (§5.3); confirm no new `registry workshop-pace audit` failures
- [ ] 10. Perform the manual checks in §5.4
- [ ] 11. `git add` each path **individually** — never `git add .` or `git add -A`
- [ ] 12. Commit; **do not push**. Remote writes require separate, explicit per-action approval.

**Out of scope for this issue — do not do these:**

- writing any Lab 21–26 content (items 3–8);
- `docs/enterprise-harness-blueprint.md` (item 2);
- creating `enterprise-harness-bundle/` or `.github/extensions/enterprise-sdlc-workbench/`;
- the README total-hours line, learning-path note, or structure tree (item 9);
- Lab 20 → Lab 21 and Lab 25 → Lab 26 chaining (item 9);
- fixing the pre-existing red `tests/workshop` suite (§5.3);
- any GitHub write — no push, no PR, no issue or issue-body edit, no sub-issues.
