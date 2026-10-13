---
title: "Telemetry, Log Analytics & the Improvement Loop"
lab_number: 25
pace:
  presenter_minutes: 8
  self_paced_minutes: 45
registry: docs/_meta/registry.yaml
---

# 25 — Telemetry, Log Analytics & the Improvement Loop

Labs 21–24 built the harness: a governed bundle, templates, stages and gates, and a
durable record of who approved what. None of that tells you whether the harness is
**working**. Is QA rejecting less since the last bundle change? Which stage do tasks
wait in? What does a task cost, honestly counted?

In this lab you'll export Copilot's OpenTelemetry, join it to the stage and approval
records Lab 24 writes, and query the result with KQL. Then you'll close the loop: a
scheduled agent reads the findings and proposes **one** owned, measurable change to the
bundle. A human decides; the next run measures it.

Everything runs offline. Azure is optional.

> ⏱️ Presenter pace: 8 minutes | Self-paced: 45 minutes

**Part of:** Labs 21–26, the enterprise agentic SDLC harness arc — builds on
[Lab 24](lab24.md), and chains forward to [Lab 26](lab26.md).

> ⚠️ **Telemetry surfaces move fast.** Every capability claim below carries the date it
> was verified against the primary source. API versions come from
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) (the `azure_monitor` block),
> never from this page. Re-verify anything older than a quarter before you teach it.

References:

- [EPIC-001, unit U5](../docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md) — the acceptance criteria this lab satisfies
- [Lab 25 spec](../docs/epics/EPIC-001-54-lab25-spec.md) and [stories](../docs/epics/EPIC-001-54-stories.md)
- [`labs/fixtures/lab25/README.md`](fixtures/lab25/README.md) — commands, layout and the field-classification table
- [Lab 19](lab19.md) (self-improving agents) and [Lab 20](lab20.md) (org-level usage monitoring) — the two labs this one connects
- GitHub Docs: [OpenTelemetry for Copilot](https://docs.github.com/en/copilot/concepts/enterprise/opentelemetry) and the [CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference#opentelemetry-monitoring)
- *The Agentic SDLC Handbook* (Daniel Meppiel) — <https://danielmeppiel.github.io/agentic-sdlc-handbook/>:
  "The Business Case", "Planning the Transition" (Metrics That Matter), "The
  Deterministic/Probabilistic Boundary", "Anti-Patterns and Failure Modes" (missing policy
  encoding; prompt injection via dependencies), "The Instrumented Codebase" (The Feedback
  Loop) and "The Agentic SDLC Bill"

## 25.0 Prerequisites and currency

You need Node 20+ and git. That's the whole offline path. For the optional Azure path
you also need the Azure CLI, the Bicep CLI, and a resource group you can deploy to.

Do [Lab 21](lab21.md) (managed settings) and [Lab 24](lab24.md) (stage events and
approvals of record) first if you can. This lab ships a synthetic dataset shaped exactly
like their output, so you can do it standalone.

🖥️ **In your terminal (from the repository root):**

```shell
node --version
node labs/fixtures/lab25/lab25.mjs report
```

If the report prints a table of outcomes, you're ready.

## 25.1 What Copilot actually emits

_Verified 2026-10-12 against the CLI reference and the OpenTelemetry concept page._

Copilot CLI exports OpenTelemetry traces when any one of these is set:
`COPILOT_OTEL_ENABLED=true`, `OTEL_EXPORTER_OTLP_ENDPOINT`, or
`COPILOT_OTEL_FILE_EXPORTER_PATH` (JSON lines to a local file). The OTLP protocol
defaults to `http/json`, and `OTEL_SERVICE_NAME` defaults to `github-copilot`.

**The data goes to your collector. GitHub doesn't receive or store it.** That's the point:
your telemetry, your retention, your access controls.

Each agent turn is a span tree:

```text
invoke_agent                  ← root (empty parent). Carries the turn's total AIU.
├── chat <model>              ← one per model call. Tokens and AIU for that call.
├── execute_tool <tool>       ← one per tool call. Errors land here.
└── invoke_agent              ← subagent (kind INTERNAL, has a parent)
```

There is **no `execute_hook` span**. Hooks don't appear as their own spans.

The attributes this lab uses:

| Attribute | On | Meaning |
| --- | --- | --- |
| `gen_ai.conversation.id` | all | The session. |
| `gen_ai.agent.id` / `gen_ai.agent.name` | `invoke_agent` | The custom agent (`--agent`). A native stage proxy, not a stage. |
| `gen_ai.request.model` / `gen_ai.response.model` | `chat` | The model asked for, and the one that answered. |
| `gen_ai.usage.input_tokens` / `output_tokens` | `chat`, root | Tokens. |
| `github.copilot.nano_aiu` | `chat`, root | AI Credits in nano units: 1 AIU = 1e9 nano AIU. |
| `github.copilot.cost` | `chat` | A **multiplier**, not currency. Never sum it as money. |
| `gen_ai.tool.name` | `execute_tool` | The tool. See the caveat in 25.3. |
| `error.type` | `execute_tool`, others | Set when the span failed. |

`gen_ai.agent.version` falls back to the CLI's runtime version when the agent doesn't set
one, so it can't tell you which **bundle** produced a span. Stamp that yourself with a
resource attribute: `contoso.bundle.version` (25.3).

### See it for yourself

🖥️ **In your terminal:** run one short CLI session with the file exporter on, then read it.

```powershell
$env:COPILOT_OTEL_FILE_EXPORTER_PATH = "$env:TEMP\lab25-otel.jsonl"
$env:OTEL_RESOURCE_ATTRIBUTES = "contoso.correlation_key=FEAT-001/implement/T014/run-1,contoso.bundle.version=1.2.0"
copilot -p "Say hello in one word."
node labs/fixtures/lab25/lab25.mjs inspect "$env:TEMP\lab25-otel.jsonl"
```

```bash
export COPILOT_OTEL_FILE_EXPORTER_PATH=/tmp/lab25-otel.jsonl
export OTEL_RESOURCE_ATTRIBUTES="contoso.correlation_key=FEAT-001/implement/T014/run-1,contoso.bundle.version=1.2.0"
copilot -p "Say hello in one word."
node labs/fixtures/lab25/lab25.mjs inspect /tmp/lab25-otel.jsonl
```

A real run on 2026-10-12 printed this (abridged):

```text
| SpanName | Kind | Root | ParentSpanId | NanoAiu | CorrelationKey | BundleVersion |
| permission | 0 |  | — | 0 | FEAT-001/implement/T014/run-1 | 1.2.0 |
| chat claude-haiku-4.5 | 2 |  | 7570861e06387e1b | 3346875000 | FEAT-001/implement/T014/run-1 | 1.2.0 |
| invoke_agent | 0 | yes | — | 3346875000 | FEAT-001/implement/T014/run-1 | 1.2.0 |

Root-only AIU: 3.346875   Summing every span: 6.69375  <- the double count
```

Two things to notice. The `chat` span and the root carry the **same** AIU. And
`permission` spans also have an empty parent, so "root" means `invoke_agent` **and** an
empty parent, never just an empty parent.

> 🧭 **Not using the CLI?** If you'd rather run a collector, start
> [`otel-collector.yaml`](fixtures/lab25/otel-collector.yaml) (the docker line is in its
> header), point `OTEL_EXPORTER_OTLP_ENDPOINT` at `http://localhost:4318`, and `inspect`
> reads the collector's OTLP/JSON file too.

## 25.2 The cost trap

Sum AIU over every span and you'll report roughly **double** the real cost: each `chat`
child carries AIU that its root already totals. Sum the **root `invoke_agent` span only**.

```shell
node labs/fixtures/lab25/lab25.mjs query cost-double-count
```

On the fixture, root-only is **113.2** AIU (baseline) and **139.8** (after); all spans is
**226.4** and **279.7**. The overcount is exactly 2×. Every cost query in
[`kql/`](fixtures/lab25/kql/cost-per-task.kql) filters
`SpanName == "invoke_agent" and isempty(ParentSpanId)` for this reason.

> ⚠️ AIU is a usage unit, not a bill. For money, use the billing API (25.8).

## 25.3 Governance: the `telemetry` block in managed settings

Lab 21 authored `copilot/managed-settings.json`. You change **only** its `telemetry`
object. The delta is [`managed-settings.telemetry.json`](fixtures/lab25/managed-settings.telemetry.json):

```json
"telemetry": {
  "enabled": true,
  "endpoint": "https://otel.contoso.example",
  "protocol": "http/protobuf",
  "capture": {
    "identity": false, "prompts": false, "responses": false,
    "toolArguments": false, "toolOutput": false, "policyDetail": false
  },
  "captureContent": false,
  "lockCaptureContent": true,
  "serviceName": "copilot-enterprise",
  "resourceAttributes": {
    "deployment.environment": "production",
    "contoso.bundle.version": "1.3.0"
  },
  "headers": {}
}
```

The keys are `enabled`, `endpoint`, `protocol`, `capture` (or the legacy `captureContent`),
`lockCaptureContent`, `serviceName`, `resourceAttributes` and `headers`. Put collector
credentials in `headers` from your secret store at deploy time, never in the repo.

_Verified 2026-10-12:_ the managed `telemetry` key applies to Copilot CLI and VS Code
(the concept page now also lists the Copilot app — see the deviation note below). Managed
values take precedence over environment variables. The `capture` object, with its six
classes, supersedes the legacy `captureContent` boolean, which was the single switch for
prompts and responses. `lockCaptureContent` stops users turning capture back on.

**Capture is a governance decision, not a tuning knob.** Every class stays `false` until a
named privacy or security approver signs off, in writing, on which class, why, for how
long, and who can read it. Record that decision in the bundle's change log. Prompts and
responses contain source code and customer data; identity is personal data. If you do
capture identity, prefer a pseudonymous ID (`enduser.pseudo.id`) over a login, and set
workspace retention and table-level access before the first byte lands.

> ⚠️ **Tool-name caveat (unresolved, 2026-10-12).** The CLI reference lists
> `gen_ai.tool.name` as an ordinary `execute_tool` attribute. The concept page lists
> "identifiers for tools, MCP servers, plugins, and hooks" under the **Tool arguments**
> capture class. With capture off, you may lose tool names. Test in your tenant before you
> build a dashboard on them. The `errors` query degrades gracefully when they're missing.

> 📝 **Capture deviation from the epic (verified 2026-10-13).** The epic named
> `captureContent`; `capture.*` is current for fine-grained controls. For content,
> VS Code's local harness honours only the legacy all-or-nothing `captureContent`
> setting, not the five independent content classes (identity capture is supported).
> The managed delta also sets `"captureContent": false` for legacy-only clients;
> keep it alongside the six disabled classes and `lockCaptureContent`.

> 📝 **Deviation from the epic.** EPIC-001 says the Copilot app emits no OTel. On
> 2026-10-12 the concept page lists capture controls for Copilot CLI, the GitHub Copilot
> app, and VS Code with Agent Host. Whether the app emits the same span tree is
> **unconfirmed**. Either way, epic and feature-spec history still comes from durable
> artifacts (Lab 24), not from spans.

## 25.4 The correlation key

Spans alone can't tell you which feature, stage or task they belong to. Lab 24 defines a
key that every record in this lab carries:

```text
<feature>/<stage>/<task>/<run>
001-enrollment-cap/implement/T013/3f9a2c1e
001-enrollment-cap/qa-review/-/3f9a2c1e      ← "-" means stage-level work
```

`run` is Spec Kit's 8-character `run_id`. The Spec Kit step that launches the CLI sets it
per session:

```shell
OTEL_RESOURCE_ATTRIBUTES="contoso.correlation_key=001-enrollment-cap/implement/T013/3f9a2c1e"
```

The bundle version comes from managed settings, so one is per-session and one is per-org.

> ❓ **Open question Q1 (untested).** Does a per-session `OTEL_RESOURCE_ATTRIBUTES` **merge
> with** managed `resourceAttributes`, or does the managed block replace it? With
> environment variables only, both attributes landed on the resource (25.1). Testing the
> managed case needs admin rights to deploy file-based managed settings, which this lab's
> authors didn't have on 2026-10-12. **To test it:** deploy the managed delta above with a
> file exporter, set `OTEL_RESOURCE_ATTRIBUTES` in the session, run one prompt, and
> `inspect` the file. If `CorrelationKey` is empty, the required key did not survive;
> don't infer a feature from the session ID or assume an unsupported span-injection API.
> Without a per-session key, the join degrades to **unjoined session telemetry**:
> `gen_ai.conversation.id` groups spans within a session, but Lab 24's stage events and
> approvals have no `ConversationId`, so it cannot join those records. Root-session
> usage and errors remain available; cost per task and span-to-stage provenance are
> unavailable for those sessions. Stage transitions, approval-based rejects/rework and
> step-log dwell still work from their durable records. Keep the offline fixture for
> the complete join until the managed-setting test confirms per-session keys survive.

## 25.5 Stages, rework and approvals: *you build this*

Copilot doesn't emit stage events, and Spec Kit's run state can't be trusted for
outcomes. These come from Lab 24's durable records:

| Source | Gives you | Table |
| --- | --- | --- |
| `stage-events/<feature>.jsonl` (repo root, append-only) | Every `advance` and `rework` transition, with `actor`, `artifact` and its git blob SHA, and `classification` on rework | `SdlcStageEvents_CL` |
| Spec Kit `log.jsonl` | `step_started` / `step_completed` per step, which gives dwell time | `SdlcStepLog_CL` |
| Approvals of record (comments carrying `<!-- contoso-approval {json} -->`, PR reviews, `qa-review.md`) | Gate verdicts, approver, `escalated_to` | `SdlcApprovals_CL` |

Three rules keep the numbers honest:

1. **Rejects come from the approval of record, not run state.** With `on_reject: retry`,
   Spec Kit logs `paused` for a reject **and** a pause, and `state.json` overwrites
   `choice` every time. You can't count rejects from either.
2. **An approval counts only if it's authentic:** its `approver` equals the comment or
   review author **and** that login owns the gate in Lab 24's `roles.json`. A PR review's
   state must agree with its verdict (`APPROVED` = approve, `CHANGES_REQUESTED` = reject).
   Lab 24 enforces this; the fixture only contains records that pass.
3. **Rework is classified.** `implementation` rework resumes at `qa-review`; `spec-scope`
   rework is escalated to the `review-spec`/`review-plan` owner (`escalated_to`).

Trace one feature end to end, with SHA verification against the real artifacts:

```shell
node labs/fixtures/lab25/lab25.mjs provenance 001-enrollment-cap
```

You'll see the epic, spec, plan and tasks each advance and get approved by their owners,
four implement sessions, a QA **reject** on run `3f9a2c1e`, an `implementation` rework of
`T013`, and the QA approval. The first `qa-review.md` SHA reports *earlier revision*: the
artifact changed after the reject, which is what a durable record should show.

## 25.6 The offline path: KQL semantics, no workspace

The query pack lives in [`kql/`](fixtures/lab25/kql/cost-per-task.kql). Each file's header
names its tables, columns and offline mirror in
[`lib/queries.mjs`](fixtures/lab25/lib/queries.mjs). The mirror is **not a KQL engine**; it
reproduces each query's semantics over the same rows.

```shell
node labs/fixtures/lab25/lab25.mjs report
```

The fixture has eight features and a bundle change on 2026-09-15. The report compares the
windows either side of it:

| Outcome | Baseline | After | Direction |
| --- | --- | --- | --- |
| QA reject rate | 0.556 (n=9) | 0.200 (n=5) | improved |
| Rework rate | 1.00 | 0.25 (n=4) | **insufficient-sample** |
| Escalations per task | 0.125 | 0 | improved |
| `review-qa` dwell p50 (min) | 199.4 | 168.3 | improved |
| Cost p50 (AIU/task) | 4.81 | 5.90 | regressed |
| Cost p95 (AIU/task) | 8.60 | 21.4 | regressed (one outlier: `007`/`T013`) |

Read it with care:

- **It's observational.** The bundle changed, and so did the features. Nothing here
  proves the bundle caused the change.
- **Small samples are flagged, not hidden.** Any window with fewer than 5 observations
  reports `insufficient-sample`, whatever the arithmetic says.
- **Percentiles differ slightly.** KQL's `percentile()` is an estimate; the mirror uses
  nearest-rank. Compare directions, not decimals.
- **Activity isn't outcome.** The report prints sessions and spans under a separate
  *Activity* heading. More sessions says people used it, not that it worked.

Cost per task (p50 and p95) is also an alert: the Azure path deploys
[`alert-cost-p95.kql`](fixtures/lab25/kql/alert-cost-p95.kql) as a `scheduledQueryRules`
log alert.

Also try `query errors` (one real `bash` tool failure, plus a hostile tool name that the
report redacts — identifiers from telemetry are untrusted input) and `query activity`.

## 25.7 The Azure path (optional)

_API versions are in the registry's `azure_monitor` block, verified 2026-10-12; the Bicep
repeats them as literals and `tests/lab25/lab25-azure.test.ts` fails if they drift._

[`bicep/main.bicep`](fixtures/lab25/bicep/main.bicep) deploys a workspace, four custom
tables on the **Analytics** plan, a `Direct` data collection rule (DCR), an optional role
assignment, a p95 cost alert and a Workbook with one panel per query.

```shell
az deployment group create -g <rg> -f labs/fixtures/lab25/bicep/main.bicep \
  -p principalId=$(az ad signed-in-user show --query id -o tsv)
```

Then forward the fixture using the deployment outputs:

```shell
export LAB25_DCE_ENDPOINT=<logsIngestionEndpoint>
export LAB25_DCR_IMMUTABLE_ID=<dcrImmutableId>
export LAB25_MONITOR_TOKEN=$(az account get-access-token --resource https://monitor.azure.com --query accessToken -o tsv)
node labs/fixtures/lab25/lab25.mjs forward --dry-run
node labs/fixtures/lab25/lab25.mjs forward --restamp
```

Why `--restamp`: Azure Monitor replaces a `TimeGenerated` more than two days old (or more
than a day in the future) with the receipt time, which would flatten the before/after
split. `--restamp` shifts the dataset into the last two days, keeping order and the
split. Without it, `forward` refuses stale rows.

**Set the comparison boundary before reading the Workbook.** Save the `changeAt =
datetime(...)` timestamp that `forward --restamp` prints. Open the Workbook in **Edit**
mode. In each panel whose query contains `let changeAt = datetime(2026-09-15)`, replace
that declaration with the change point the CLI prints, then run the query. Update all
eight windowed panels (cost, double-count, rejects, rework, dwell, escalations,
before/after and activity) and save the Workbook. Errors and provenance have no change
boundary. When pasting a `.kql` file into Logs, make the same replacement.

Use a query time range of at least the **last 2 days** (the deployed Workbook defaults
to 90 days). After ingestion is visible, check **AI Credits per task**: both `baseline`
and `after` must have nonzero `Tasks` (16 each for this fixture). Check the before/after
panel has nonzero `NBaseline` and `NAfter` too. If not, fix the query boundary/time
range or wait for ingestion before interpreting results. The September boundary baked
into the query files is only for the original offline fixture; leaving it unchanged
after restamping puts every row into "after" and gives no baseline. Re-forwarding with
`--restamp` produces a new boundary; repeat these edits, and use a clean dataset/window
to avoid counting duplicate uploads.

### The constraints that bite

_Restated from EPIC-001 Appendix A.2 (verified 2026-09-17)._

- **Use the Analytics plan.** Basic and Auxiliary plans forbid `join`, `search`, `find`,
  `externaldata` and user-defined functions; Basic queries cover 30 days; Auxiliary has
  no alerts; and neither is visible to Power BI. The provenance and before/after queries
  join, so this pack **requires** Analytics.
- **Retention under 31 days saves no money.** Analytics ingestion includes 31 days of
  retention. `main.bicep` keeps the service's 30-day default for the workspace and
  tables (`@minValue(30)` is this template's workspace bound, not the table API's
  minimum); it is **not** a cost optimization. Shorter retention can serve privacy
  requirements, but it doesn't reduce the included ingestion price.
- **Deleting a table does not stop its retention charges.** For these Analytics custom
  tables, deletion does not delete their data; interactive and long-term retention
  charges continue to apply under the applicable retention policy. Review workspace,
  table and total retention before cleanup, rather than treating deletion as a billing
  switch. These two caveats were re-verified 2026-10-13 against Microsoft Learn's
  [retention guidance](https://learn.microsoft.com/azure/azure-monitor/logs/data-retention-configure)
  and [retention billing](https://learn.microsoft.com/azure/azure-monitor/logs/cost-logs#log-data-retention).
- **Ingestion limits.** 1 MB per call, and 64 KB per field — longer fields are
  **silently truncated**. The forwarder batches under 1 MB and rejects any field over
  64 KB rather than lose data quietly.
- **No schema drift handling.** A new column isn't added automatically. Change
  [`schema.json`](fixtures/lab25/schema.json), redeploy, then forward.
- **Stream names.** The URL uses the `streamDeclarations` key (`Custom-CopilotSpans`),
  not the `outputStream` (`Custom-CopilotSpans_CL`).
- **Roles.** Monitoring Metrics Publisher goes on the **DCR** — yes, for logs. You need a
  data collection endpoint only for private link or an older DCR.
- **Not the HTTP Data Collector API.** Microsoft ended support for it on 2026-09-14. That
  wasn't an ingestion shutdown: TLS 1.2+ clients still ingest, but the API gets critical
  security fixes only and has no SLA, and since 2026-03-01 it rejects clients that can't
  negotiate TLS 1.2. Any tutorial using `ods.opinsights.azure.com` or
  `Authorization: SharedKey` is obsolete. Use the Logs Ingestion API, as this lab does.
- **Alerts** use `scheduledQueryRules`; the legacy alert API retired 2025-10-01. The
  Workbook is GA; Grafana dashboards are preview.

## 25.8 Dead ends and complementary sources

_From EPIC-001 Appendix A.2 (verified 2026-09-17)._ Know what each source can't do before
you promise a dashboard on it:

| Source | Use it for | It can't |
| --- | --- | --- |
| Copilot metrics reports API | Org adoption and usage, in aggregate (see [Lab 20](lab20.md)). Returns NDJSON **download links**, not inline metrics; data from 2025-10-10; one-year retention. | Join to a task or a stage. The legacy metrics APIs sunset 2026-04-02. |
| Billing API | Per-model money, filterable by `model`, 24-month window. | Attribute cost to a task. |
| Enterprise audit log | Policy and lifecycle events only. | Show prompts, models, tokens or cost. Azure Monitor isn't a supported streaming target: stream to Event Hubs or Blob, write your own forwarder, and dedupe on `_document_id` because delivery is at-least-once. |
| Copilot Usage Records streaming | Per-request records, including prompts. | Help a standard GHEC tenant: it's preview and gated to EMU or GHEC with data residency. Its `event_id` isn't the audit log's `_document_id`; don't cross-apply them. |
| GitHub Actions | Workflow runs. | Emit OTel. Synthesize spans from the jobs API if you need them. |
| Natural-language KQL over `_CL` tables | — | Unverified. Write the KQL. |

## 25.9 The improvement loop: KQL first, agent second

The agent never invents a metric. The **deterministic** part — every number — comes from
the query pack. The **probabilistic** part — reading those numbers and drafting a
proposal — comes from an agent, and stops at a human. The lab is complete without the
agent step: `report` already gives you every finding. And it doesn't rely on an agent
writing KQL from natural language over your `_CL` tables; that's unverified.

Two ways in:

- **Interactively**, use the Azure MCP Server's **Log Analytics: Query workspace logs**
  tool (_verified 2026-10-12_), handing it a query from the pack. Ask it to explain, not
  to compute.
- **On a schedule**, use the gh-aw workflow
  [`lab25-improvement-review.md`](../.github/workflows/lab25-improvement-review.md). Every
  Monday it runs `lab25.mjs report --json` **before** the agent starts, so the agent reads
  findings, not raw telemetry. Its permissions are read-only, and its only write is one
  `[improvement-review]` issue through safe outputs, closing the previous one.

Every recommendation it opens must name:

| Field | Example |
| --- | --- |
| **Target** | The `review-qa` checklist template in the bundle |
| **Owner** | `casey-qa`, the `review-qa` gate owner from `roles.json` (report field `gateOwners`) |
| **Re-measure** | Query `reject-rate`, target below 0.20 after the next bundle version |
| **Evidence** | The finding it rests on, with any `insufficient-sample` or caveat quoted verbatim |

A target is something in the harness you can change: a spec template, an agent, a prompt,
a skill, an instruction file or `AGENTS.md`, the constitution, memory, a gate or
deterministic control (a hook, required check, safe-output allowlist or managed setting),
a model-tier binding, or a training topic. "Developers should be more careful" isn't a
target. If a finding keeps recurring, encode it as a policy rather than another reminder.

The owner decides. If they accept, the change ships in the next bundle version, and that
version's `contoso.bundle.version` becomes the next before/after split. A recommendation
closes only when that re-measurement says it worked. That's the loop.

Prompt injection lives here too. Tool names, agent names and file paths in telemetry are
attacker-influenced. The report redacts identifiers that don't match a safe pattern, and
the workflow's prompt tells the agent to treat every string as data.

### How this connects to Labs 19 and 20

- [Lab 19](lab19.md)'s self-improving workflow finds **drift in the files** — stale
  references, duplicated agents. This lab finds **drift in outcomes**. Same draft-only,
  human-merges discipline; different evidence.
- [Lab 20](lab20.md) section 20.2 monitors **org-level usage** from the metrics API. This
  lab drills from "how much" down to "which feature, stage and task, and did it work".

## 25.10 Verify

```shell
node labs/fixtures/lab25/lab25.mjs report
node labs/fixtures/lab25/lab25.mjs query cost-double-count
node labs/fixtures/lab25/lab25.mjs provenance 001-enrollment-cap
node labs/fixtures/lab25/lab25.mjs forward --dry-run
npx vitest run tests/lab25
```

You're done when:

- [ ] `inspect` shows your own session's root `invoke_agent` span, and you can explain why
      its AIU equals its `chat` child's.
- [ ] You can say which number is the cost and which is double counted.
- [ ] `provenance` shows the QA reject on `3f9a2c1e` and the `implementation` rework.
- [ ] You can name the one outcome the report refuses to judge, and why.
- [ ] You can name the approver who must sign off before any `capture` flag turns on.
- [ ] (Azure) the Workbook's provenance panel shows feature `001-enrollment-cap`.

## What you built

- A telemetry delta to Lab 21's managed settings, with capture off and locked.
- An ingestion contract ([`schema.json`](fixtures/lab25/schema.json)) joining Copilot
  spans to Lab 24's stage events, step log and approvals on one correlation key.
- A KQL pack with an offline semantic mirror, and an outcome report that flags small
  samples.
- Optional Azure infrastructure: Analytics-plan tables, a DCR, an alert and a Workbook.
- A scheduled, read-only agent that proposes one owned, re-measurable change at a time.

## Key takeaways

- **Sum AIU on the root `invoke_agent` span only.** Everything else double counts.
- **Outcomes come from durable records, not run state** — and only authentic approvals count.
- **Capture is a governance decision** with a named approver, not a default.
- **KQL first, agent second.** The agent reads findings; it never computes them.
- **Observational before/after isn't proof.** Flag small samples; re-measure every change.

## Versions and pins

This lab reads every version it depends on from the content registry at
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). No version string
is hardcoded in this file. See the registry's re-verification obligations
before running this lab with a cohort.
