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

### Migration notes for existing forks

- The .NET solution moved from the repo root to `dotnet/`. Update CI scripts
  and IDE recent-projects lists to point at `dotnet/ContosoUniversity.sln`.
- `make test-all` is the new canonical entry point. `dotnet test` against the
  old root-level paths will fail; use `make test-dotnet` instead.
- The `node/` workspace requires Node 18+ and pnpm. `corepack enable` is the
  shortest path to a working pnpm.

[Unreleased]: https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/compare/v2.0.0-modernize...HEAD
[2.0.0-modernize]: https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/releases/tag/v2.0.0-modernize
