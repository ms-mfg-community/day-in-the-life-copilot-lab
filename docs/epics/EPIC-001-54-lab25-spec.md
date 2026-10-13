# EPIC-001 / Issue #54 — Telemetry, Log Analytics and the improvement loop (Lab 25)

**Implementation plan and as-built record.**

| Field | Value |
|---|---|
| Parent epic | [EPIC-001 — Enterprise Agentic SDLC Harness](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Child issue | #54 — *Lab 25 — telemetry, Log Analytics and the improvement loop (EPIC-001 U5)* |
| Decomposition item | 7 of 9 — joins #53 (Lab 24) on the correlation key and the approval of record |
| Spec authored | 2026-10-12 |
| Branch | `cody-carlson-lab25-telemetry-improvement-loop`, PR base `feature/epic-enterprise-harness` (**never `main`**) |
| Stories | [EPIC-001-54-stories.md](EPIC-001-54-stories.md) |
| Status | Built. Two open questions recorded (§6) |

> **Scope of #54.** Replace the `labs/lab25.md` stub and ship what it teaches: the
> `labs/fixtures/lab25/` engine, data, KQL pack, Bicep, collector and managed-settings delta;
> the `lab25-improvement-review` gh-aw workflow; four `azure_monitor` registry keys; and
> `tests/lab25/`. Out of scope, owned by #55: README lab rows and totals, `labs/setup.md`,
> Lab 20 chaining, Cost Budget sidebars, and the cost-sidebars test list. #54 doesn't edit
> `labs/lab24.md` or `labs/lab26.md`.

---

## 1. Re-verification — 2026-10-12

| Claim | Epic says | Verified 2026-10-12 | Source |
|---|---|---|---|
| OTel env vars and defaults | A.3 item 2 | **Holds.** `COPILOT_OTEL_ENABLED`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `COPILOT_OTEL_FILE_EXPORTER_PATH`; protocol `http/json`; service name `github-copilot` | CLI reference, `#opentelemetry-monitoring` |
| Span tree | `invoke_agent` root, `chat`, `execute_tool`; no `execute_hook` | **Holds**, plus: subagents also emit `invoke_agent` (kind INTERNAL), so "root" needs an empty parent; `permission` spans are also parentless, so "root" also needs the `invoke_agent` name | CLI reference; live file-exporter run with CLI 1.0.95 |
| Cost attributes | `cost` is a multiplier; `nano_aiu` on root only | **Holds.** Live run: root 3.346875 AIU, chat child identical, all-spans sum 6.69375 | Live run |
| Capture switch | `captureContent` | **Changed.** A `capture` object with six classes (identity, prompts, responses, toolArguments, toolOutput, policyDetail) supersedes it; `captureContent` is legacy | OpenTelemetry concept page |
| Supported clients | CLI and VS Code; the app emits no OTel | **Changed.** Capture controls are listed for Copilot CLI, the GitHub Copilot app, and VS Code with Agent Host. Same span tree from the app is unconfirmed | OpenTelemetry concept page |
| Managed precedence | Managed can't be overridden | **Holds.** Managed values take precedence over env vars | OpenTelemetry concept page |
| Tool names | `gen_ai.tool.name` always present | **Ambiguous.** CLI reference lists it as an ordinary attribute; the concept page puts tool identifiers under the Tool arguments capture class | Both pages |
| Azure Monitor API versions | Registry | Workspaces and tables `2026-03-01`, scheduled query rules `2026-03-01`, workbooks `2023-06-01`, role assignments `2022-04-01`, DCR `2024-03-11` (existing key) | Microsoft Learn ARM template references; recorded in `docs/_meta/registry.yaml` |
| Ingestion timestamp window | — | **New.** `TimeGenerated` older than two days, or more than a day ahead, is replaced by receipt time | Logs Ingestion API docs |
| Azure MCP Server Log Analytics | "KQL tools" | **Holds.** "Log Analytics: Query workspace logs" accepts a custom KQL query | Microsoft Learn, Azure MCP Server Azure Monitor tools |

Everything else (Analytics plan restrictions, ingestion limits, HTTP Data Collector end of
support, metrics/billing/audit-log facts, Usage Records gating) is restated from Appendix
A.2 with its 2026-09-17 date.

## 2. Acceptance criteria → where they're met

| U5 criterion | Lab section | Artifact | Test |
|---|---|---|---|
| OTel centerpiece; managed `telemetry` keys; CLI and VS Code | 25.1, 25.3 | `managed-settings.telemetry.json` | `lab25-content`, `lab25-governance` |
| Data goes to your collector | 25.1 | — | `lab25-content` |
| Capture is a governance decision with a named approver, paired with the lock | 25.3 | managed settings (all false, locked) | `lab25-governance` |
| Span tree, GenAI attributes, no `execute_hook` | 25.1 | `lib/ingest.mjs` | `lab25-engine` (OTLP adapter, root test) |
| Cost multiplier; root-only `nano_aiu` | 25.2 | `kql/cost-*.kql`, `lib/queries.mjs` | `lab25-engine` (exact 2× overcount) |
| Correlation key and bundle version as resource attributes; Q1 tested before encoding | 25.4 | `schema.json`, `ingest.mjs` | `lab25-content` (Q1 recorded open) |
| Stage and rework events, *You build this*; rejects from approvals of record | 25.5 | `data/stage-events/`, `data/approvals/`, `data/specify/` | `lab25-engine` (provenance) |
| Outcome queries, baseline and before/after; activity labelled | 25.6 | `kql/reject-rate`, `rework-rate`, `stage-dwell`, `escalations`, `before-after`, `activity` | `lab25-engine` (report numbers) |
| Cost per task p50/p95 with a scheduled-query alert | 25.6, 25.7 | `kql/cost-per-task`, `kql/alert-cost-p95`, Bicep | `lab25-azure` |
| Offline path, no subscription | 25.1, 25.6 | `lab25.mjs` | whole `tests/lab25` suite runs offline |
| Bicep with registry API versions | 25.7 | `bicep/main.bicep` | `lab25-azure` (literal = registry) |
| Logs Ingestion API, Direct DCR; HTTP Data Collector warning | 25.7 | `lib/forward.mjs` | `lab25-forward`, `lab25-content` |
| Monitoring Metrics Publisher on the DCR | 25.7 | Bicep role assignment | `lab25-azure` |
| Stream name = `streamDeclarations` key | 25.7 | `forward.mjs`, Bicep | `lab25-forward` |
| Analytics plan mandated | 25.7 | Bicep tables | `lab25-azure` |
| 1 MB, 64 KB, no schema drift handling | 25.7 | `forward.mjs` | `lab25-forward` |
| Complementary sources and dead ends | 25.8 | — | `lab25-content` |
| Workbook GA; Grafana preview; legacy alert API retired | 25.7 | Bicep workbook | `lab25-content` |
| KQL first, agent second; Azure MCP; not NL→KQL; chains to Labs 19, 20 | 25.9 | — | `lab25-content` |
| Recommendations name a target, an owner, a re-measurement | 25.9 | `report.mjs` (`gateOwners`, `MEASURED_BY`), workflow prompt | `lab25-engine`, `lab25-workflow` |
| Agent gets aggregates; text is untrusted | 25.6, 25.9 | `report.mjs` sanitizer; workflow pre-agent step | `lab25-engine`, `lab25-workflow` |
| Recurring review mechanism | 25.9 | `.github/workflows/lab25-improvement-review.md` + lock | `lab25-workflow`, `tests/workflows` |

## 3. The join contract with Lab 24

Agreed with the #53 session and used exactly:

- **Correlation key** `<feature>/<stage>/<task>/<run>`; `-` for stage-level work; `run` is
  Spec Kit's 8-character `run_id`. Carried on spans as resource attribute
  `contoso.correlation_key`.
- **Stage signal** at repo root `stage-events/<feature>.jsonl` (not under `specs/`, which
  would bump Spec Kit's feature number). Fields: `correlation_key, feature, stage, task,
  run_id, from_stage, transition (advance|rework), actor, at, artifact, artifact_sha,
  classification`. `artifact_sha` is the git blob SHA (`git hash-object`).
- **Approval of record** for gates `review-epic, review-spec, review-plan, review-tasks,
  review-qa`, with `source` `comment | pr-review | qa-review.md`. It counts only if
  `approver` equals the comment or review author and that login owns the gate in
  `roles.json`; a PR review's state agrees with its verdict.
- **Rework**: `spec-scope` sets `escalated_to` to the review-spec/review-plan owner;
  `implementation` resumes at `qa-review`.

The fixture reuses Lab 24's IDs: feature `001-enrollment-cap`, run `3f9a2c1e`, its QA
reject, and owners `avery-pm`, `blake-lead`, `casey-qa`, `dana-dev`.

## 4. Files

| Path | Purpose |
|---|---|
| `labs/lab25.md` | The lab |
| `labs/fixtures/lab25/schema.json` | Ingestion contract, four tables |
| `labs/fixtures/lab25/lib/{ingest,queries,forward,report}.mjs` | Engine; no npm dependencies |
| `labs/fixtures/lab25/lab25.mjs`, `generate-fixture.mjs` | CLI and deterministic generator (seed 25) |
| `labs/fixtures/lab25/data/**` | Generated dataset; real artifacts for feature 001 |
| `labs/fixtures/lab25/kql/*.kql` | Ten queries plus the alert query |
| `labs/fixtures/lab25/bicep/main.bicep` | Workspace, tables, DCR, role, alert, workbook |
| `labs/fixtures/lab25/otel-collector.yaml` | Optional collector to an OTLP/JSON file |
| `labs/fixtures/lab25/managed-settings.telemetry.json` | Delta to Lab 21 |
| `.github/workflows/lab25-improvement-review.{md,lock.yml}` | Weekly, read-only, one issue |
| `docs/_meta/registry.yaml` | Four `azure_monitor` API version keys |
| `.github/workflows/weekly-content-audit.{md,lock.yml}` | Check 9 audits the new keys |
| `tests/lab25/*.test.ts` | The oracles in §2 |

## 5. Departures from the issue and the epic

| # | Departure | Why |
|---|---|---|
| D1 | Teaches `capture` (six classes) and names `captureContent` as legacy | The docs changed after the epic was written (§1) |
| D2 | States the Copilot app is listed for capture controls, hedged | Same; the span tree from the app is unconfirmed |
| D3 | `forward --restamp` | The ingestion timestamp window would otherwise flatten the before/after split |
| D4 | Tool-name caveat | Docs disagree on whether tool identifiers are a capture class |
| D5 | The offline path runs a semantic mirror, not KQL | No offline KQL engine without a dependency; the mirror is tested against the same rows, and percentile differences are disclosed |
| D6 | Bicep repeats registry versions as literals | Bicep can't read YAML; `lab25-azure` enforces equality |

## 6. Open questions

- **Q1 (#66).** Does a per-session `OTEL_RESOURCE_ATTRIBUTES` survive managed
  `resourceAttributes`? Untested: deploying file-based managed settings needs admin
  rights. With env vars only, both attributes land on the resource. The lab gives the test
  procedure and the fallback (join on `gen_ai.conversation.id`).
- **Collector capture.** The OTLP/JSON adapter follows the OTLP spec and is unit tested,
  but no live collector file was captured.
