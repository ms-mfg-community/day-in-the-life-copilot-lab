# EPIC-001 / Issue #54 — Stories (dev and QA)

The [spec](EPIC-001-54-lab25-spec.md) is the plan and the as-built record. This file breaks
it into stories and records what closed each one.

| Field | Value |
|---|---|
| Parent epic | [EPIC-001](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Story | #54 — *Lab 25 — telemetry, Log Analytics and the improvement loop (EPIC-001 U5)* |
| Plan | [EPIC-001-54-lab25-spec.md](EPIC-001-54-lab25-spec.md) |
| Stories | Six — four dev, two QA |
| Written | 2026-10-12 |
| Status | Dev stories built; QA closes on CI green for the PR into `feature/epic-enterprise-harness` |

## 1. The stories at a glance

| Story | Type | Title | Closed by |
|---|---|---|---|
| 54.1 | Dev | Engine, schema and deterministic dataset | 54.5 |
| 54.2 | Dev | KQL pack, Bicep and registry keys | 54.5 |
| 54.3 | Dev | Governance delta, collector and the review workflow | 54.5 |
| 54.4 | Dev | Write `labs/lab25.md` | 54.6 |
| 54.5 | QA | Verify the artifacts | — |
| 54.6 | QA | Accept #54 against U5 | — |

```text
54.1 ─┐
54.2 ─┼──▶ 54.5 QA ──▶ 54.4 Dev ──▶ 54.6 QA ──▶ PR (base feature/epic-enterprise-harness)
54.3 ─┘
```

The artifacts come before the lab so the lab quotes real output, not imagined output.

## 2. The stories

### 54.1 — Dev — Engine, schema and deterministic dataset

**Done when:**

- `schema.json` defines `CopilotSpans`, `SdlcStageEvents`, `SdlcStepLog`, `SdlcApprovals`.
- `ingest.mjs` reads both the CLI file-exporter lines and OTLP/JSON `resourceSpans`, and a
  root is `invoke_agent` with an empty parent.
- `generate-fixture.mjs` is deterministic, and `data/` matches its output.
- Stage events, approvals and rework use Lab 24's shapes exactly (spec §3).
- Feature 001's artifacts exist, and `provenance` verifies their git blob SHAs.
- Identifiers from telemetry are sanitized before they reach a report.

### 54.2 — Dev — KQL pack, Bicep and registry keys

**Done when:**

- Every `kql/*.kql` header names an id in `QUERY_IDS` (or the alert) and only columns in
  `schema.json`.
- Every cost query sums the root `invoke_agent` span only.
- `bicep build` and `bicep lint` pass with zero warnings.
- Tables are on the Analytics plan; the DCR is `Direct`; the role is Monitoring Metrics
  Publisher on the DCR; the alert is a `scheduledQueryRules` log alert.
- The four new API versions are in the registry, and Bicep's literals equal them.
- Weekly content audit check 9 covers the new keys, and its lock recompiles.

### 54.3 — Dev — Governance delta, collector and the review workflow

**Done when:**

- `managed-settings.telemetry.json` has every capture class `false` and
  `lockCaptureContent: true`, and is a delta to Lab 21, not a copy.
- `otel-collector.yaml` writes OTLP/JSON that `inspect` reads.
- `lab25-improvement-review` compiles with gh-aw at the registry pin, has read-only
  permissions, computes findings in a pre-agent step, and opens at most one issue,
  closing older ones.

### 54.4 — Dev — Write `labs/lab25.md`

**Done when:**

- Every U5 criterion maps to a section (spec §2).
- Every capability claim carries a verification date; departures D1–D4 are stated.
- Q1 is recorded as untested, with its procedure.
- All quoted output is real output from the CLI and the fixture.
- Internal links resolve; no version string is hardcoded.

### 54.5 — QA — Verify the artifacts

**Checks:** `npx vitest run tests/lab25 tests/workflows`; `bicep build`; `forward --dry-run`
batches under 1 MB; `report` numbers match the spec.

### 54.6 — QA — Accept #54 against U5

**Checks:** `npx vitest run tests/lab25 tests/lab-structure tests/meta tests/content-currency`,
then the full suite; CI green on the PR (Vitest, Node and .NET); no file owned by #53, #55
or #56 changed.

## 3. Sprint log

- **2026-10-12.** Correction from #53 adopted: the stage signal moved to repo-root
  `stage-events/<feature>.jsonl`, gained `artifact` and `classification`, and approvals
  gained the author-equals-approver and owner checks.
- **2026-10-12.** A live CLI run confirmed the span tree, the identical root and chat AIU,
  and that parentless `permission` spans exist — so the root test checks the name too.
- **2026-10-12.** Docs re-verification found `capture` superseding `captureContent` and the
  Copilot app listed for capture controls (spec §5, D1 and D2).
