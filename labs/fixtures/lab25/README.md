# Lab 25 fixtures: telemetry, Log Analytics and the improvement loop

Everything [Lab 25](../../lab25.md) needs, with no Azure subscription required.
Node 20+ and git are the only prerequisites. Nothing here has npm dependencies.

## Commands

Run these from the repo root:

```shell
node labs/fixtures/lab25/lab25.mjs report                  # findings: outcomes, the cost trap, activity, errors
node labs/fixtures/lab25/lab25.mjs report --json           # the same findings as JSON (the review workflow's input)
node labs/fixtures/lab25/lab25.mjs query cost-double-count # one query; ids match kql/*.kql
node labs/fixtures/lab25/lab25.mjs provenance 001-enrollment-cap
node labs/fixtures/lab25/lab25.mjs inspect <your-otel.jsonl>  # read your own CLI or collector export
node labs/fixtures/lab25/lab25.mjs forward --dry-run       # rows and batches per table, no network
node labs/fixtures/lab25/generate-fixture.mjs              # regenerate data/ (deterministic, seed 25)
```

Global flags are `--data DIR` (default `data/`) and `--change-at ISO`, the bundle-change
date that splits the baseline window from the after window (default `2026-09-15T00:00:00Z`).

`forward` without `--dry-run` posts to the Logs Ingestion API. It reads three environment
variables: `LAB25_DCE_ENDPOINT` (Bicep output `logsIngestionEndpoint`),
`LAB25_DCR_IMMUTABLE_ID` (output `dcrImmutableId`) and `LAB25_MONITOR_TOKEN` (for example
`az account get-access-token --resource https://monitor.azure.com --query accessToken -o tsv`).
Azure Monitor replaces a `TimeGenerated` more than two days old with the ingestion time.
Forward the dated fixture with `--restamp`, which shifts it into the last two days while
keeping the order and the bundle-change split. Without `--restamp`, `forward` refuses stale rows.

## Layout

| Path | What it is |
| --- | --- |
| `schema.json` | The ingestion contract: four tables and their columns. Bicep, the forwarder and the KQL headers all read it. |
| `kql/*.kql` | The canonical query pack. The header names each file's id, tables and columns, and its offline mirror. |
| `lib/queries.mjs` | The offline semantic mirror of the KQL. It is not a KQL engine: `percentile` here is nearest-rank, while KQL's is an estimate. |
| `lib/ingest.mjs` | Parses CLI file-exporter lines and OTLP/JSON `resourceSpans`, and shapes every record to `schema.json`. |
| `lib/forward.mjs` | Logs Ingestion API client: schema check, 1 MB batches, 64 KB field limit, freshness guard, restamp. |
| `lib/report.mjs` | Findings, before/after direction (sample-size gated), identifier sanitizing, provenance SHA checks. |
| `bicep/main.bicep` | Workspace, Analytics-plan tables, Direct DCR, optional ingestion role, p95 cost alert, workbook. |
| `otel-collector.yaml` | An optional OTel Collector that writes OTLP/JSON to a file. |
| `managed-settings.telemetry.json` | The `telemetry` delta to Lab 21's managed settings, with capture off and locked. |
| `data/` | A synthetic, deterministic dataset of eight features, a bundle change on 2026-09-15, and real artifacts for feature 001. |

## Where each field comes from

The field classification below was dated 2026-10-12. Re-check it against the
[Copilot CLI OpenTelemetry reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#opentelemetry-monitoring)
and [OpenTelemetry for agent monitoring](https://docs.github.com/en/copilot/concepts/enterprise/opentelemetry)
before relying on a field.

| Column(s) | Source attribute | Class |
| --- | --- | --- |
| `SpanName`, `TraceId`, `SpanId`, `ParentSpanId`, `SpanKind`, `StatusCode`, `DurationMs` | span envelope | observed |
| `ConversationId` | `gen_ai.conversation.id` | observed |
| `Model` | `gen_ai.request.model` (falls back to `gen_ai.response.model`) | observed on `chat` spans, absent on the root |
| `InputTokens`, `OutputTokens` | `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens` | observed |
| `NanoAiu`, `CostMultiplier` | `github.copilot.nano_aiu`, `github.copilot.cost` | observed |
| `ServiceVersion` | resource `service.version` | observed |
| `ToolName` | `gen_ai.tool.name` on `execute_tool` spans | documented, not seen in the probe |
| `ErrorType` | `error.type` | documented, not seen in the probe |
| `AgentName` | `gen_ai.agent.name` | documented, absent on the probed root span |
| `CorrelationKey`, `Feature`, `Stage`, `Task`, `RunId` | resource `contoso.correlation_key` = `<feature>/<stage>/<task>/<run>` | org-emitted |
| `BundleVersion` | resource `contoso.bundle.version` | org-emitted |
| `SdlcStageEvents` | `stage-events/<feature>.jsonl` (Lab 24's stage signal) | org-emitted |
| `SdlcStepLog` | `.specify/workflows/runs/<run_id>/log.jsonl` | Spec Kit run log |
| `SdlcApprovals` | `approvals-of-record.json` (Lab 24's approval of record) | org-emitted |

"Observed" means the field appeared in a real Copilot CLI 1.0.95 file-exporter capture on
2026-10-12. Every value in `data/` is synthetic: the span tree follows that capture, and the
numbers come from a seeded generator. Two spans are planted on purpose. 002/T012 has a
`bash` error, and 006/T014 has a tool name that carries a prompt injection, which the report
redacts.

One caveat is unresolved as of 2026-10-12. The CLI reference lists `gen_ai.tool.name` as a
plain `execute_tool` attribute. The concept page, however, puts "identifiers for tools, MCP
servers, plugins, and hooks" in the **Tool arguments** capture class, which this lab keeps off.
If your clients withhold tool names while that class is off, `ToolName` arrives empty and
`errors` groups by `SpanName` and `ErrorType` alone. Check one real export with `inspect`
before you build a tool-level dashboard.
