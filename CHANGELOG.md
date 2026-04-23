# Changelog

All notable changes to the **Day-in-the-Life Copilot Lab** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/) at the
content-release level (lab arc + tooling, not the underlying ContosoUniversity
demo app).

## [Unreleased]

_Nothing yet._

---

## [2.0.0-modernize] — 2026 modernization arc (Phases 0–8)

This release modernizes the lab from a 10-lab .NET-only demo into a 14-lab,
two-track (`.NET` + `Node`) hands-on experience covering the full GitHub
Copilot agentic surface circa 2026 — plugin marketplaces, Fabric MCP, A2A/ACP
orchestration, tmux-driven multi-pane workflows, weekly content auditing,
token-conscious model selection, and a complete TDD/meta-test discipline.

### Phase summary

| Phase | Theme | Outcome |
|------:|-------|---------|
| Phase 0 | Foundations & guardrails | Registry (`docs/_meta/registry.yaml`), devcontainer hardening, lab-structure tests. |
| Phase 1 | Currency refresh + plugin marketplace lab | New Lab 11 + `plugin-template/`. |
| Phase 2 | Memory & learning for local environments | Memory MCP wiring, instinct lifecycle, hooks. |
| Phase 3 | .NET consolidation + Node parity track | Move .NET under `dotnet/`, add `node/` Fastify+Drizzle stack, `make test-all`. |
| Phase 4 | Weekly staleness audit | gh-aw `weekly-content-audit` workflow + audit-report template. |
| Phase 5 | Fabric MCP + Fabric notebooks | New Lab 12 with offline Parquet simulator fallback. |
| Phase 6 | A2A/ACP orchestration + tmux pattern | New Labs 13 & 14, `scripts/orchestrator/` scripts, orchestrator-rubric prompt. |
| Phase 7 | Token optimization & model selection | `docs/token-and-model-guide.md`, `/cost-check` prompt, Cost Budget sidebars. |
| Phase 8 | Integration, polish, release | README/TROUBLESHOOTING/CHANGELOG, registry CLI bump, meta-tests, release tag. |

### Added

- **Labs 11–14.**
  - Lab 11 — *Building & Distributing a Copilot Plugin* (Phase 1): enterprise
    marketplace, private registry, SBOM, allowlist policy. Ships
    `plugin-template/` scaffold with manifest schema + tests.
  - Lab 12 — *Fabric MCP with Copilot CLI & VS Code* (Phase 5): lakehouse
    enumeration, inline-chat & agent-mode notebook editing, **offline Parquet
    simulator fallback** for Codespaces learners without Fabric auth, notebook
    hygiene hook (`strip-notebook-outputs`).
  - Lab 13 — *A2A Concepts with Copilot CLI ACP* (Phase 6a): two-agent
    (implementer + critic) walkthrough on the Node app, `task` /
    `write_agent` / `read_agent` primitives, three failure modes with
    mitigations.
  - Lab 14 — *Orchestrator + tmux Pattern (Deep-Dive)* (Phase 6b): long-lived
    orchestrator pane + short-lived worker panes, prescribed
    `plan → implement → handoff → clear → qa → clear` cycle,
    `scripts/orchestrator/{tmux-start,handoff,clear-context}.sh`,
    `orchestrator-rubric` prompt, worked example on Node `/api/courses`.
- **Node track (Phase 3):** complete `node/` workspace (Fastify 5 + Drizzle ORM
  + Vitest + Playwright) with parity domain (Student / Course / Instructor),
  in-memory SQLite via `better-sqlite3`, SSR pages, and integration tests
  reaching ≥80% line coverage (validated by `tests/meta/coverage-threshold.test.ts`).
- **Per-track appendices** under `labs/appendices/dotnet/` and
  `labs/appendices/node/` — labs themselves stay language-agnostic.
- **Top-level `Makefile`** with `test-all`, `test-dotnet`, `test-node`,
  `lint-labs`, plus E2E variants.
- **Fabric MCP config** at `mcp-configs/copilot-cli/individual/fabric.json` and
  `mcp-configs/vscode/individual/fabric.json` with offline-fixture fallback
  (no MCP-side env-var toggle — the offline path skips the MCP entirely and
  reads a local Parquet fixture; see Lab 12 §12.2).
- **Plugin registry tooling**: `plugin-template/` scaffold, manifest JSON
  schema, dry-run install test, allowlist-policy test (Phase 1).
- **`docs/_meta/registry.yaml`** as the single source of truth for CLI floor,
  gh-aw schema, MCP pins, model tiers, and lab pacing — consumed by ≥3 labs
  (`tests/content-currency/registry-consumed.test.ts`).
- **Weekly content audit** (Phase 4): `.github/workflows/weekly-content-audit.md`
  gh-aw workflow runs Sundays 05:00 UTC + manual dispatch, opens one PR with
  generated `docs/_meta/audit-report.md`, auto-labeled and reviewer-assigned
  via CODEOWNERS, drafted when changes exceed
  `audit.draft_pr_if_changes_exceed`.
- **Memory & learning surface (Phase 2):** continuous-learning instinct
  roundtrip tests, skills consolidation tests, decision-tree coverage
  test, `strip-notebook-outputs` hook.
- **Orchestrator scripts** (`scripts/orchestrator/`) — Bash entrypoints used
  by Lab 14 and the orchestrator pattern itself.
- **Token-and-model guide** (`docs/token-and-model-guide.md`) covering all
  registered model IDs with cost/quality/latency guidance (Phase 7).
- **`/cost-check` prompt** (`.github/prompts/cost-check.prompt.md`) — on-demand
  session-footprint advisor (Phase 7).
- **Cost Budget sidebars** added to Labs 07, 10, 13, 14 with order-of-magnitude
  token estimates per pattern.
- **Meta tests** (`tests/meta/`):
  - `all-phases-have-tests.test.ts` — every plan phase 0–8 has at least one
    test file in its canonical directory; `CHANGELOG.md` references each
    phase by name.
  - `coverage-threshold.test.ts` — Node line coverage ≥ 80%; root vitest
    suite ≥ 25 test files.
- **CHANGELOG.md** (this file) at the repo root.

### Changed

- **.NET solution consolidation:** `ContosoUniversity.sln` and all five
  projects moved under `dotnet/` (Phase 3). Solution-path test
  (`tests/build/solution-paths.test.ts`) enforces the new layout.
- **README.md:** Lab Modules table grew from 10 → 14 entries; Repository
  Structure now reflects `dotnet/`, `node/`, `plugin-template/`,
  `scripts/orchestrator/`, `docs/_meta/`, `docs/token-and-model-guide.md`,
  `tests/`, `Makefile`, and `CHANGELOG.md`; Useful Commands now leads with
  `make test-all` and per-track targets.
- **TROUBLESHOOTING.md:** added per-lab/per-track sections for the Node path,
  Lab 11 plugin registry auth, Lab 12 Fabric MCP auth (incl. offline
  fallback), Lab 14 tmux pitfalls, and the `/cost-check` "session store
  empty" carry-forward; surfaced a Known Limitations table for cross-phase
  carry-forwards rather than silently fixing them in Phase 8.
- **AGENTS.md:** added a Token discipline block (Phase 7) summarizing default
  model selection, batched tool calls, and pointers to
  `docs/token-and-model-guide.md` + `/cost-check`.
- **`docs/_meta/registry.yaml`:** `copilot_cli_version_floor` bumped to
  `1.0.35-4` (latest npm prerelease as of release).
- **Vitest config:** `node/vitest.config.ts` now wires `@vitest/coverage-v8`
  with app-only `include`/`exclude` (Phase 8).

### Deprecated

- **Older `continuous-learning` skill** — superseded by the
  `continuous-learning-v2` instinct-based system in Phase 2. The legacy skill
  remains in-repo for back-compat with existing forks but should not be used
  for new instinct authoring.

### Removed

- Nothing user-facing. The Phase 3 .NET move was a relocation, not a deletion;
  legacy paths under the repo root no longer exist after consolidation.

### Fixed

- No load-bearing fixes in this release. Several non-blocking carry-forward
  items (workflow typo, CODEOWNERS placeholder, unpinned `nbdime`) are
  documented under TROUBLESHOOTING § Known Limitations and slated for the
  Phase 4 weekly audit to surface.

### TDD discipline

Every phase landed via a separate **RED commit** containing only failing
test files, followed by GREEN implementation commits one concern at a time.
Per-file `git add` only; conventional commit prefixes throughout
(`test:`, `feat:`, `chore:`, `docs:`, `fix:`); every commit carries the
`Co-authored-by: Copilot` trailer. Final test surface entering release:

- Root vitest: ≥ 203 tests across ≥ 31 files.
- .NET (`dotnet test`): 56 / 56.
- Node (`pnpm -C node test`): 28 / 5 (10 baseline tests in 2 files, plus 18
  new tests in 3 new integration files added in Phase 8 to lift line coverage
  to 92.94%).
- Node line coverage: ≥ 80% (Phase 8 floor).

### Cleanup (post-tag)

Post-release validation + deferred-findings sweep landed on
`feature/modernize` after the `v2.0.0-modernize` tag was cut. No
caller-visible behavior changes; the release contract is unchanged.
Test surface grew from **290 tests across 37 files** to **302 tests
across 40 files** as deferred-test debt and enumeration gaps were
closed. Annotated tag was re-pointed at the cleanup HEAD; see the
`v2.0.0-modernize` tag message for the force-move details.

- **Phase B — enumeration parity.** `docs/_meta/registry.yaml` `labs:`
  block previously enumerated only 4 of 14 labs (01, 05, 10, 11),
  leaving labs 02–04, 06–09, and 12–14 invisible to the weekly-audit
  pacing check. Added the 10 missing entries with `title` +
  `pace_presenter_minutes` / `pace_self_minutes` pulled from each
  lab's frontmatter. `tests/meta/enumeration-parity.test.ts` (RED in
  Phase A) flipped GREEN; a narrow allowlist codifies that
  `labs/setup.md` is a grouped narrative redirect stub and not a
  per-lab manifest (the authoritative index is the README Lab Modules
  table).

- **Phase C — shipped-but-unwired machinery validated end-to-end.**
  Four pieces of code that landed in the modernize arc but were never
  exercised in CI got install paths, fixtures, and proof tests:
  - **Lab 12 offline Parquet fallback** — generated and committed
    `labs/fixtures/lab12/sales.parquet` plus
    `scripts/generate-lab12-fixture.py`. Lab 12's offline-simulator
    story had been advertised in 3+ places but the fixture directory
    did not exist on disk.
  - **Notebook `strip-outputs` hook** — wired into a repo-managed
    `.githooks/pre-commit` installed by the devcontainer
    `postCreateCommand` via `git config core.hooksPath`. Previously
    documented only inside Lab 12 as an optional manual step.
  - **`plugin-template/` install path** — gave `install.mjs` a real
    CLI entry point. Fixed a real defect: the script previously
    exited 0 even on a broken manifest, so the `# expect ok=true`
    assertion in the template README was false-advertising. Now
    validates name, version, minimum_cli_version, and entrypoints
    with 0 / 1 / 2 exit-code discipline.
  - **Weekly-audit gh-aw workflow** —
    `tests/workflows/weekly-audit-compiles.test.ts` shells out to
    `gh aw compile` against a sandboxed copy of `.github/` and
    asserts exit-0; a `make lint-workflows` target was added for
    local validation.

- **Phase D — deferred findings #6/#8/#9 + gh-aw schema migration.**
  - **Finding #6 (lab14 parity):** added
    `tests/lab-structure/lab14-exists-and-linked.test.ts` for symmetry
    with labs 11–13 and upgraded the `labs/lab13.md` § Next steps
    forward bridge to a live `[Lab 14](lab14.md)` hyperlink.
  - **Finding #8 (cross-lab connective tissue):** Lab 11's "What's
    next" now hyperlinks Labs 12/13/14; Lab 12 carries a "Builds on
    Lab 11" prereq callout; Lab 13 has a background callout linking
    Labs 11 & 12; Lab 14's cross-references include Labs 11 & 12; the
    README Lab Modules table carries a one-line learning-path note
    (`01–10 core sequence / 11 standalone / 12 standalone (Fabric) /
    13 → 14 sequential`).
  - **Finding #9 (coverage-threshold refactor):**
    `tests/meta/coverage-threshold.test.ts` now reads
    `node/coverage/coverage-summary.json` directly and skips with a
    warning if the summary is absent, instead of spawning a nested
    vitest invocation. Points developers at `make test-node`.
  - **gh-aw schema migration:** `make lint-workflows` was broadened
    to bare `gh aw compile` (all workflows, not just weekly-audit).
    `.github/workflows/code-review.md` was migrated to the gh-aw
    v0.50.1 schema: the deprecated `add-pr-comment` sub-key was split
    into `add-comment` + a separate `add-labels: allowed: [ai-review]`
    safe-output, and frontmatter `pull-requests: write` was dropped to
    `read` (write-level frontmatter perms are rejected by v0.50.1 —
    writes must route through safe-outputs). The workflow's
    `code-review.lock.yml` was compiled for the first time (the file
    did not previously exist), functionally enabling the code-review
    workflow to run in GitHub Actions. `gh aw compile` also
    deterministically drops an auto-generated dispatcher descriptor
    at `.github/agents/agentic-workflows.agent.md`; it is committed so
    subsequent `make lint-workflows` runs do not dirty the tree.
  - **Agent prompt preservation:** the code-review workflow prompt
    was updated to explicitly instruct the agent to invoke
    `add-labels` after commenting, preserving the old single-output
    auto-labeling behavior under the new split safe-output schema.

Final test surface entering the re-annotated `v2.0.0-modernize` tag:

- Root vitest: **302 / 302** across **40 files** (was 290 / 37).
- `make test-all`: 56 .NET + 28 node + 302 root, all GREEN.
- Node line coverage: **92.94%** (floor 80%, unchanged).
- `gh aw compile`: **3 workflows** compile cleanly (was 1 —
  `weekly-content-audit.md` only); 1 non-blocking fuzzy-schedule
  warning on `weekly-content-audit.md` preserved.

Cleanup arc: 22 commits `44d38d4..d815281`, all conventional-prefixed
with per-file `git add` and the `Co-authored-by: Copilot` trailer.

### Migration notes for existing forks

- The .NET solution moved from the repo root to `dotnet/`. Update CI scripts
  and IDE recent-projects lists to point at `dotnet/ContosoUniversity.sln`.
- `make test-all` is the new canonical entry point. `dotnet test` against the
  old root-level paths will fail; use `make test-dotnet` instead.
- The `node/` workspace requires Node 18+ and pnpm. `corepack enable` is the
  shortest path to a working pnpm.

[Unreleased]: https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/compare/v2.0.0-modernize...HEAD
[2.0.0-modernize]: https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/releases/tag/v2.0.0-modernize
