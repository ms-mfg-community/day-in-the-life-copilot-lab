---
phase: A
role: dev
status: complete
arc: post-modernize-cleanup
session: orch-cln-7558
branch: feature/modernize
head_at_audit: 59c4924
total_findings: 14
high_severity: 2
med_severity: 4
low_severity: 8
categories:
  - enumeration-gaps
  - shipped-but-unwired
  - tdd-debt
  - documentation-drift
  - cross-references
---

# Phase A — Investigation Findings

**Repo:** `day-in-the-life-copilot-lab`
**Branch:** `feature/modernize`
**Audit head:** `59c4924` (tag `v2.0.0-modernize`)
**Sweep tool:** explore sub-agent (claude-opus-4.6) parallel grep + view
**Lab inventory verified:** `labs/lab01.md` through `labs/lab14.md` (14 files)

This is a read-only investigation. Output drives Phases B–D. Two HIGH-severity items were
material enough to expand Phase B/C scope — see "Plan revisions" at the bottom.

---

## Category 1 — Enumeration gaps

| # | Severity | Evidence-path | Description | Proposed fix | Phase |
|---|----------|---------------|-------------|--------------|-------|
| 1.1 | **HIGH** | `docs/_meta/registry.yaml:49-66` | The `labs:` block contains only **4 of 14 labs** (lab01, lab05, lab10, lab11). Labs 02-04, 06-09, 12-14 are entirely absent. The weekly-content-audit workflow's pacing check (`.github/workflows/weekly-content-audit.md:65`) reads `pace_*` minutes from this block, so 10 labs are invisible to the audit. This is the released-behavior bug Finding #7 originally identified for Lab 12-14 — actual blast radius is larger. | Add 10 missing entries with `title` and `pace_presenter_minutes` / `pace_self_minutes` derived from each lab's frontmatter. | B |
| 1.2 | LOW | `labs/setup.md:17-29` | Setup-page lab catalogue groups Labs 01-10 as "core agentic surface" (no individual links) and explicitly hyperlinks only Labs 12-14. Lab 11 is mentioned by name but **not hyperlinked**. Result: a strict per-lab parity check fails on setup.md for 11 labs (01-11). | Either (a) hyperlink Lab 11 + add a per-lab list, or (b) document the grouping convention in the parity test allowlist. Decision deferred to Phase B. | B |
| 1.3 | LOW | `.github/ISSUE_TEMPLATE/config.yml:4` | Issue template hardcodes a link to `labs/lab08.md` only. Not strictly an enumeration gap (the link is purposeful), but flagged for visibility. | None — keep as-is. |
| — | — | `.github/CODEOWNERS:10` | Uses `/labs/` glob — covers all 14 labs without per-lab enumeration. **No drift risk.** | None. | — |
| — | — | `README.md:490-503` | All 14 labs present in the Lab Modules table. **No gap.** | None. | — |
| — | — | `scripts/`, `prompts/`, `agents/` | No script/prompt/agent enumerates labs. **No gap.** | None. | — |
| — | — | `.github/workflows/weekly-content-audit.md:51` | Uses `labs/lab*.md` glob. **No gap.** | None. | — |

**Category 1 totals:** 3 findings (1 HIGH, 2 LOW).

---

## Category 2 — Shipped-but-unwired machinery

| # | Severity | Evidence-path | Description | Proposed fix | Phase |
|---|----------|---------------|-------------|--------------|-------|
| 2.1 | MED | `scripts/hooks/pre-commit-strip-notebook-outputs.sh` | Script exists and works. Installation instructions exist **only inside `labs/lab12.md:376-389`** (manual `git config core.hooksPath`). Nothing in `.devcontainer/`, `Makefile`, `README.md`, or any setup script auto-installs it. A learner who skips Lab 12 never gets the hook. | Add `git config core.hooksPath .githooks` to devcontainer `postCreateCommand` (or Makefile `setup` target) and ship a `.githooks/pre-commit` wrapper. RED test: `tests/hooks/strip-outputs-installable.test.ts`. | C |
| 2.2 | **HIGH** | `labs/lab12.md:100,195,204,213,354` | Lab 12 instructs learners to `pd.read_parquet('labs/fixtures/lab12/sales.parquet')` in 5+ code blocks. **Directory `labs/fixtures/` does not exist on disk** (`ls labs/fixtures/` → "No such file or directory"). The "offline simulator fallback" advertised in Lab 12 frontmatter, `README.md:501`, and `labs/setup.md:20` is completely broken. | Add `scripts/generate-lab12-fixture.py` that writes `labs/fixtures/lab12/sales.parquet` with synthetic data; commit the generated fixture; add RED test asserting fixture exists and is parquet-readable. Phase A's existing `tests/lab-structure/lab12-exists-and-linked.test.ts` only checks the **word** "parquet" appears in the lab — it does not check the file. | C |
| 2.3 | LOW | `plugin-template/scripts/install.mjs`, `plugin-template/scripts/policy.mjs` | Both files exist on disk. `plugin-template/README.md:44,96-97` install instructions reference real, committed files. The `copilot plugin install` CLI command itself is documented as simulated (no real CLI subcommand exists today), so the dry-run path is `node plugin-template/scripts/install.mjs`. Structurally sound but never executed in CI. | Add `tests/plugin-template/install-runs.test.ts` that spawns the install script in a tempdir and asserts exit-0 + expected side effects. | C |
| 2.4 | MED | `.github/workflows/weekly-content-audit.md` + `weekly-content-audit.lock.yml` | Workflow is a gh-aw markdown spec; lock file is generated. **No documented dry-run mechanism** — `gh aw` has no `--dry-run` flag in this repo's docs. Only validation today is `gh aw compile` (syntax-only). No integration test, no fixture-driven harness. | Document `gh aw compile .github/workflows/weekly-content-audit.md` as the validation step in `README` § Useful Commands and as a `make lint-workflows` target. Add `tests/workflows/weekly-audit-compiles.test.ts` (shells out to `gh aw compile` if available; skips with reason if not). | C |

**Category 2 totals:** 4 findings (1 HIGH, 2 MED, 1 LOW).

---

## Category 3 — TDD debt

**Phase 8 RED commit:** `4987f44` — `test(phase8): RED — meta tests for phase coverage and CHANGELOG/Node coverage floors`
**Files added:** 2 (`tests/meta/all-phases-have-tests.test.ts`, `tests/meta/coverage-threshold.test.ts`).

The brief stated "10 of 12 assertions are regression guards." Inspection of the actual commit shows **only 2 test files with ~7 distinct assertions**, so the "10 of 12" framing was misremembered — actual TDD debt is small.

| # | Severity | Evidence-path | Description | Proposed fix | Phase |
|---|----------|---------------|-------------|--------------|-------|
| 3.1 | LOW | `tests/meta/all-phases-have-tests.test.ts:72-75` | Phase 8 is special-cased to assert only that `tests/meta/` has ≥2 files — strictly weaker contract than Phases 0-7, which map to specific implementation directories. Not a redundancy, but an asymmetry that future readers may copy. | Add Phase 8 to `PHASE_TEST_DIRS` mapping (`tests/docs`, `tests/meta`) for consistency. | D |
| — | — | `tests/meta/all-phases-have-tests.test.ts:77-84` | CHANGELOG existence + Phase 0-8 reference assertions. **Genuinely new-failing** at commit time (CHANGELOG entry didn't exist). No duplication. | None — clean TDD. | — |
| — | — | `tests/meta/coverage-threshold.test.ts:50-67` | Node ≥80% line-coverage assertion + ≥25 test-file floor. **Genuinely new-failing** at commit time (48.81% coverage). Unique. | None — clean TDD. | — |

**Category 3 totals:** 1 finding (1 LOW). Note: phase-8 RED commit is **substantially cleaner than the brief implied** — no load-bearing redundancy to remove.

---

## Category 4 — Documentation drift

| # | Severity | Evidence-path | Description | Proposed fix | Phase |
|---|----------|---------------|-------------|--------------|-------|
| 4.1 | LOW | `CHANGELOG.md:149` | Node test counts written as "28 / 5 (10 baseline tests in 2 files, plus 18 new tests in 3 new integration files)". The "28 / 5" notation parses as "28 out of 5" which is confusing. Arithmetic (2 baseline files + 3 new = 5; 10 + 18 = 28) is correct but format is opaque. | Rewrite as "28 tests across 5 files (2 baseline files / 10 tests + 3 new integration files / 18 tests)". | E (CHANGELOG cleanup pass) |
| — | — | `CHANGELOG.md:64-65` | Fabric MCP path claim verified — both `mcp-configs/copilot-cli/individual/fabric.json` and `mcp-configs/vscode/individual/fabric.json` exist on disk. **Accurate.** | None. | — |
| — | — | `CHANGELOG.md:32,43` | Phase 5 attribution for Lab 12 is correct in both summary table and Added section. **Accurate.** | None. | — |
| — | — | `README.md:505,616` | Both say "14 labs". `AGENTS.md` does not contain a stale count. **No drift.** | None. | — |
| — | — | `git log --oneline -20` | All 20 recent commits spot-checked; no broken path refs. Commit `9976a28` already fixed three rubber-duck-flagged path bugs in TROUBLESHOOTING. **Clean.** | None. | — |

**Category 4 totals:** 1 finding (1 LOW).

---

## Category 5 — Cross-references

| # | Severity | Evidence-path | Description | Proposed fix | Phase |
|---|----------|---------------|-------------|--------------|-------|
| 5.1 | LOW | `labs/lab11.md:194-196` | Lab 11 has a forward-bridge paragraph that names Labs 12, 13, 14 in prose but **none are hyperlinked**. | Convert to `[Lab 12](lab12.md)`, `[Lab 13](lab13.md)`, `[Lab 14](lab14.md)`. | D |
| 5.2 | MED | `labs/lab12.md:61-69` | Lab 12 Prerequisites table has no mention of Lab 11. No backward narrative bridge to the plugin/distribution pattern Lab 11 introduced. | Add a "Builds on" note: "Lab 11 introduced the plugin-distribution mindset this lab extends to the data plane." | D |
| 5.3 | MED | `labs/lab13.md:99-107` | Lab 13 Prerequisites table references "Lab 01 setup" but has no mention of Lab 11 or Lab 12 as background. | Add backward-context line: "Labs 11-12 are not prerequisites but provide useful background on plugin distribution and Fabric MCP." | D |
| 5.4 | LOW | `labs/lab14.md:12,51` | Lab 14 has strong backward link to Lab 13 (acceptable — Lab 14 is Lab 13's direct sequel) but no link to Lab 11/12. Cross-references section at end lists Labs 07, 10, 13 only. | Optional: add Labs 11/12 to the cross-references section. | D (optional) |
| 5.5 | LOW | `README.md:483-505,616` | Lab Modules table + counts are correct (14 labs). However, no explicit guidance on the 01-10 → 11 → 12 → 13 → 14 progression (which labs are sequential vs. standalone). | Add a one-line learning-path note below the table: "Labs 01-10 are the core sequence; 11 standalone; 12 standalone (Fabric); 13 → 14 sequential (A2A → orchestrator)." | D |

**Category 5 totals:** 5 findings (2 MED, 3 LOW).

---

## Summary dashboard

| Category | Findings | High | Med | Low |
|----------|----------|------|-----|-----|
| 1 — Enumeration Gaps | 3 | 1 | 0 | 2 |
| 2 — Shipped-but-Unwired | 4 | 1 | 2 | 1 |
| 3 — TDD Debt | 1 | 0 | 0 | 1 |
| 4 — Documentation Drift | 1 | 0 | 0 | 1 |
| 5 — Cross-References | 5 | 0 | 2 | 3 |
| **Total** | **14** | **2** | **4** | **8** |

### Top 2 HIGH-severity items requiring immediate Phase B/C action

1. **Finding 1.1** — `docs/_meta/registry.yaml` enumerates only 4 of 14 labs. Weekly-audit pacing check is blind to 10 labs (including all of 12/13/14). Original Finding #7 from the modernize arc covered 12-14 only; actual blast radius is broader. **Phase B fix.**
2. **Finding 2.2** — `labs/fixtures/lab12/sales.parquet` does not exist; `labs/fixtures/` directory is missing entirely. Lab 12's offline simulator path (advertised in 3+ places) is broken. **Phase C fix.**

---

## Plan revisions (impact on Phases B–D)

The findings substantially confirm the plan's structure but expand two scope items:

- **Phase B scope grew:** original brief implied Finding #7 was about Labs 12-14 only. Actual gap is 10 labs (02-04, 06-09, 12-14). Phase B must add 10 registry entries, not 3.
- **Phase C scope confirmed but with concrete artifacts:**
  - `scripts/generate-lab12-fixture.py` is a new committed deliverable (Finding 2.2).
  - `.githooks/pre-commit` wrapper + devcontainer wiring is a new deliverable (Finding 2.1).
  - `tests/plugin-template/install-runs.test.ts` and `tests/workflows/weekly-audit-compiles.test.ts` are new RED-then-GREEN tests (Findings 2.3, 2.4).
- **Phase D scope confirmed:** Findings 3.1, 5.1-5.5 line up with Phase D's "remaining deferred findings" mandate.
- **Setup.md grouping convention** (Finding 1.2) needs an early Phase-B decision: either expand setup.md to list every lab (and update the parity test to require it) or codify the grouping convention as an allowlist in the parity test. Recommend the latter — `setup.md` is intentionally a grouped narrative, not a manifest.

`plan.md` itself does not need structural rewrites; the phase boundaries hold. Concrete work items are reflected here in the "Phase" column and will be pulled into Phase B/C/D todos by the orchestrator.

---

## Methodology notes

- Sweep delegated to a single explore sub-agent (claude-opus-4.6) running parallel grep/view across registry, CODEOWNERS, README, setup, scripts, prompts, agents, workflows, lab cross-refs.
- All path:line references manually spot-checked by the dev role before commit.
- Two RED-first meta tests committed alongside this report:
  - `tests/meta/phase-a-findings-schema.test.ts` — GREEN (asserts this report's structure)
  - `tests/meta/enumeration-parity.test.ts` — **RED** (asserts every lab appears in registry + README + setup; flips GREEN in Phase B)
