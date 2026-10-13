# Enterprise Agentic SDLC Harness — Executive Blueprint

**Audience:** the engineering executive who decides whether to fund the work. Executive decision document; the hands-on implementation is Labs 21–26.
**Tracks:** EPIC-001, unit U0 ([#49](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/49),
part of [#47](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/47))
**Capability facts verified:** 2026-09-17 and 2026-10-01 against primary sources; every link in
this document re-resolved on 2026-10-12. Each ledger row carries its own date.

> **Citing the book.** A *Book:* note cites Daniel Meppiel,
> [*The Agentic SDLC Handbook*](https://danielmeppiel.github.io/agentic-sdlc-handbook/) v0.11.0,
> by chapter title and section, because chapter numbers drift between versions. This blueprint
> adopts the book's ideas, not its figures: no number from the book appears here.

> **Link checking.** CI's link gate scans `labs/` only, so the links in this document are not
> checked by CI. Re-check them by hand when you change a claim.

---

## 1. The decision in one page

The goal is to go from *"developers install whatever they want and prompt however they like"*
to a **governed, measurable, auditable AI-assisted SDLC**. Most of the parts are now supported
product. What you build is the glue between them.

| You **buy** (supported product) | You **build** (labelled DIY) |
|---|---|
| A private plugin marketplace plus a managed-settings lockdown | A notification funnel on stage transitions (gh-aw workflows) |
| Spec Kit presets, extensions, workflows, gates and org catalogs | Per-task agent and model binding (a task-template extension and a validator) |
| Copilot client OpenTelemetry export, enforced by enterprise managed settings | Stage-order enforcement at merge (a required check and a ruleset) |
| Azure Monitor Logs Ingestion API, Workbooks and scheduled query alerts | The OTel collector or forwarder, stage events, the KQL pack and the improvement loop |
| Rulesets, `CODEOWNERS` and the Copilot usage metrics and billing APIs | Durable approvals of record, because a Spec Kit gate records no approver |

**This blueprint does not establish ROI.** It names the baselines to take and the outcomes to
measure so that the pilot can find out ([§9](#9-measuring-value)).

---

## 2. Harness architecture

```
                   ┌─────────────────────────────────────────────┐
                   │  U1  Tech-lead plugin (private marketplace) │
                   │      mandated agents + skills, enforced by  │
                   │      managed-settings marketplace lockdown  │
                   └───────────────────────┬─────────────────────┘
                                           │ every dev, same tools
                                           ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  U2  Central Spec Kit bundle — org preset + extension + workflow       │
  │      distributed from an org-hosted catalog                            │
  └───────────────────────┬────────────────────────────────────────────────┘
                          │ every repo, same templates
                          ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  U3  The SDLC as an enforced workflow, with gates                      │
  │                                                                        │
  │  constitution → epic → feature-spec → plan → story-tasks →            │
  │                 implement → qa-review                                  │
  │                          ▲                     │                       │
  │                          └──── rework loop ────┘                       │
  └───────────────────────┬────────────────────────────────────────────────┘
                          │
                          ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  U4  The funnel — who is notified when it is their turn                │
  │      business user → tech lead + PM → IC → QA → (rework)               │
  │      tasks arrive as executable prompts, agent + model pre-bound       │
  └───────────────────────┬────────────────────────────────────────────────┘
                          │ CLI/IDE emit client OTel; DIY events cover app + Actions
                          ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  U5  OpenTelemetry → collector → Azure Log Analytics                   │
  │      prompts (opt-in), tokens, tools, errors, stage transitions        │
  │      → Workbooks + KQL → AI-assisted review → owned, re-measured       │
  │        fixes to specs, agents, prompts, skills, instructions, the      │
  │        constitution, memory, gates, model-tier bindings, and training  │
  └───────────────────────┬────────────────────────────────────────────────┘
                          │
                          ├──────────► feeds back into U1–U4
                          │
                          ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  U6  GitHub Copilot App canvases for applied SDLC operations           │
  │      issue/task board, code-aware workbench, release/handoff composer  │
  │      over the same repo artifacts                                      │
  └────────────────────────────────────────────────────────────────────────┘
```

### Role → stage → artifact → surface

| Stage | Owner | Surface they work in | Artifact produced |
|---|---|---|---|
| `constitution` | Platform / tech leads | Copilot CLI or IDE | `.specify/memory/constitution.md` |
| `epic` | Product + business stakeholder | **GitHub Copilot app** | `specs/NNN-*/epic.md` *(custom stage)* |
| `feature-spec` | Business user + BA | GitHub Copilot app | `specs/NNN-*/spec.md` |
| `plan` | Tech lead / senior | IDE or CLI | `specs/NNN-*/plan.md` |
| `story-tasks` | Tech lead + PM / scrum master | IDE or CLI | `specs/NNN-*/tasks.md` |
| `implement` | Individual contributor | IDE or CLI, agent-driven | Code + PR |
| `qa-review` | QA | PR; Copilot Code Review optional | Review verdict *(custom stage)* |
| *rework* | Any prior owner | — | Updated artifact, re-entering the loop |

**Provenance.** One correlation key names the feature, stage, task and run. It travels in the
task-as-prompt, the stage events, the OTel resource attributes and the audit comments. Each
gate's **approval of record** is a durable GitHub artifact, such as a `CODEOWNERS` PR review
or a comment carrying the run ID, verdict, approver and artifact SHA. The `epic` and
`feature-spec` stages run in the Copilot app, which emits no client OTel, so their history
comes from those artifacts, not from spans.

---

## 3. Native-vs-DIY ledger

Every row has exactly one of three statuses: **Supported product** (buy it), **Preview** (buy
it, with the gating stated), or **You build this** (DIY, budgeted). Anything that is missing,
unreliable or unverified natively is classified **You build this**, and the caveat follows the
dash. *Verified* is the date the claim was read against the source.

### 3.1 Distribution and governance (U1)

| Capability | Status | Source | Verified |
|---|---|---|---|
| Private plugin marketplace (`marketplace.json` in a repo) | Supported product | [Creating a plugin marketplace](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace) | 2026-10-12 |
| Marketplace lockdown: `strictKnownMarketplaces`, `extraKnownMarketplaces`, `enabledPlugins` | Supported product | [Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings) | 2026-10-01 |
| Plugin and marketplace keys on CLI, VS Code, Copilot app, cloud agent and JetBrains | Supported product | [Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings) | 2026-10-01 |
| Per-team overrides of `overridable` keys (server-managed deployment only) | Supported product | [Overriding managed settings for teams](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/manage-for-enterprise/use-managed-settings/override-settings-for-teams) | 2026-10-01 |
| Plugin-contributed instructions (org-wide rules in the plugin) | Supported product (CLI) | [CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) | 2026-10-01 |
| Least-privilege agents via `tools:` (omitting it grants every tool) | Supported product | [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration) | 2026-10-01 |
| `permissions.disableBypassPermissionsMode` coexisting with Spec Kit's `--yolo` dispatch | **You build this** — coexistence is unverified; test it before mandating | [CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference); [github/copilot-cli#4528](https://github.com/github/copilot-cli/issues/4528) | 2026-10-01 |
| Copilot Code Review as a managed-settings client | **You build this** — Code Review is not a managed-settings client; govern it with rulesets | [Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings) | 2026-10-01 |

### 3.2 Templates, stages and gates (U2, U3)

| Capability | Status | Source | Verified |
|---|---|---|---|
| Spec Kit extension / preset / bundle / workflow system | Supported product | [github/spec-kit](https://github.com/github/spec-kit) | 2026-09-17 |
| Org-hosted preset catalogs, with `install_allowed` separating discovery from install | Supported product | [Spec Kit docs](https://github.github.com/spec-kit/) | 2026-09-17 |
| Custom stages (`provides.commands`) inserted with workflow overlays (`insert_after`) | Supported product | [Spec Kit docs](https://github.github.com/spec-kit/) | 2026-09-17 |
| Approval gates (`type: gate`, `on_reject`) | Supported product | [`gate/__init__.py` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/src/specify_cli/workflows/step/gate/__init__.py) | 2026-10-01 |
| Approver identity at a Spec Kit gate | **You build this** — the gate records no approver; build the approval of record | [`gate/__init__.py` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/src/specify_cli/workflows/step/gate/__init__.py) | 2026-10-01 |
| Stage timing from run state (`log.jsonl` `step_started` / `step_completed`) | Supported product | [`engine.py` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/src/specify_cli/workflows/engine.py) | 2026-10-01 |
| Counting QA rejects from Spec Kit run state | **You build this** — run state is not reliable; count from approvals of record | [`engine.py` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/src/specify_cli/workflows/engine.py) | 2026-10-01 |
| `bugfix` workflow (assess → review gate → fix → test) | Supported product | [`workflows/bugfix/workflow.yml` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/workflows/bugfix/workflow.yml) | 2026-10-01 |
| `specify init --preset <URL>` | **You build this** — URLs are not accepted (ID, bundled name or local directory only); distribute the preset as a local directory | [Spec Kit docs](https://github.github.com/spec-kit/) | 2026-09-17 |
| **Hard stage-order enforcement in chat** | **You build this** — see [§5.2](#52-stage-order-enforcement) | [Spec Kit docs](https://github.github.com/spec-kit/) | 2026-09-17 |
| Merge-time required checks and code-owner approval | Supported product | [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets); [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) | 2026-10-12 |
| Official Spec Kit docs | Supported product — published at `github.github.com/spec-kit`, not docs.github.com | [Spec Kit docs](https://github.github.com/spec-kit/) | 2026-09-17 |

### 3.3 Funnel and executable tasks (U4)

| Capability | Status | Source | Verified |
|---|---|---|---|
| `taskstoissues` projection of tasks to Issues (weak-form duplicate check) | Supported product | [`taskstoissues.md` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/templates/commands/taskstoissues.md) | 2026-10-01 |
| gh-aw safe outputs (`staged: true`, `assign-to-user` with `allowed:` / `max:`) | Supported product; unchecked at the repo's pinned gh-aw version | [gh-aw safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/) | 2026-10-01 |
| Notification routing on stage transition | **You build this** (gh-aw workflows on a durable stage signal) | [gh-aw](https://github.github.com/gh-aw/) | 2026-10-01 |
| **Per-task agent and model binding** | **You build this** — see [§5.1](#51-per-task-agent-and-model-binding) | [`tasks-template.md` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/templates/tasks-template.md) | 2026-10-01 |

### 3.4 Telemetry and reporting (U5)

| Capability | Status | Source | Verified |
|---|---|---|---|
| Copilot client OpenTelemetry export under the managed `telemetry` key (CLI and VS Code per the key's text; the docs' support table also ticks JetBrains) | Supported product | [OpenTelemetry for Copilot](https://docs.github.com/en/copilot/concepts/enterprise/opentelemetry); [Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings) | 2026-10-01 |
| `captureContent` (prompts and responses to *your* collector), off by default | Supported product — governance decision | [OpenTelemetry for Copilot](https://docs.github.com/en/copilot/concepts/enterprise/opentelemetry) | 2026-09-17 |
| Client OTel from the GitHub Copilot app (`epic`, `feature-spec` stages) | **You build this** — the app emits no client OTel; cover these stages with DIY stage events | [Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings) | 2026-10-01 |
| Agent and pseudonymous user identity on spans (`gen_ai.agent.*`, `enduser.pseudo.id`) | Supported product | [CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) | 2026-10-01 |
| Per-session `OTEL_RESOURCE_ATTRIBUTES` surviving managed `resourceAttributes` | **You build this** — unverified; test before relying on it, and fall back to a per-event `task.id` attribute | [CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference) | 2026-10-01 |
| Copilot usage metrics reports API (NDJSON download links) | Supported product | [Copilot usage metrics API](https://docs.github.com/en/rest/copilot/copilot-usage-metrics) | 2026-09-17 |
| Legacy `/copilot/metrics` and `/copilot/usage` APIs | **You build this** on the replacement metrics APIs — the legacy APIs closed 2026-04-02 | [Closing-down notice (changelog, 2026-01-29)](https://github.blog/changelog/2026-01-29-closing-down-notice-of-legacy-copilot-metrics-apis/) | 2026-10-12 |
| Per-model billing and premium-request usage | Supported product | [Billing usage API](https://docs.github.com/en/rest/billing/usage); [Copilot requests](https://docs.github.com/en/copilot/concepts/billing/copilot-requests) | 2026-09-17 |
| Copilot Usage Records Streaming and Usage Records API (carry prompts, responses, tool calls) | **Preview** — Enterprise Managed Users **or** GHEC with data residency | [Changelog, 2026-07-02](https://github.blog/changelog/2026-07-02-copilot-agent-session-streaming-is-now-in-public-preview/) | 2026-10-12 |
| Prompts in the audit log | **You build this** — the audit log has policy and lifecycle events only; prompts come from client OTel | [Audit log streaming](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/streaming-the-audit-log-for-your-enterprise) | 2026-09-17 |
| Azure Monitor as an audit-log streaming target | **You build this** — stream to Event Hubs or Blob, then build the forwarder | [Audit log streaming](https://docs.github.com/en/enterprise-cloud@latest/admin/monitoring-activity-in-your-enterprise/reviewing-audit-logs-for-your-enterprise/streaming-the-audit-log-for-your-enterprise) | 2026-09-17 |
| OpenTelemetry from GitHub Actions | **You build this** — no native OTel; build spans from the jobs API | [Workflow jobs API](https://docs.github.com/en/rest/actions/workflow-jobs) | 2026-09-17 |
| OTel collector / forwarder into Log Analytics | **You build this** (no first-party GitHub→Azure connector) | [Logs Ingestion API](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview) | 2026-09-17 |
| Azure Logs Ingestion API (DCR-based) | Supported product | [Logs Ingestion API](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview) | 2026-09-17 |
| Azure HTTP Data Collector API | **You build this** on the Logs Ingestion API — Data Collector support ended 2026-09-14 | [HTTP Data Collector API](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-collector-api) | 2026-09-17 |
| Azure Workbooks | Supported product | [Workbooks overview](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview) | 2026-09-17 |
| Grafana-backed Azure Monitor dashboards | Preview | [Grafana dashboards in Azure Monitor](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/visualize-use-grafana-dashboards) | 2026-09-17 |
| Legacy Log Analytics Alert API | Supported product via `ScheduledQueryRules` — the legacy API retired 2025-10-01 | [Alert API switch](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-log-api-switch) | 2026-09-17 |
| Azure MCP Server (Log Analytics KQL tools) for the AI review step | Supported product | [Azure MCP Server](https://learn.microsoft.com/en-us/azure/developer/azure-mcp-server/) | 2026-09-17 |
| Natural-language → KQL over an arbitrary custom `_CL` table | **You build this** — native support is unverified; ship the KQL pack and do not promise NL→KQL | [Log queries overview](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/log-query-overview) | 2026-10-12 |
| Stage and rework events, KQL pack and the improvement loop | **You build this** | [Workbooks overview](https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/workbooks-overview) | 2026-10-01 |

### 3.5 Operator surface (U6)

| Capability | Status | Source | Verified |
|---|---|---|---|
| GitHub Copilot app | Supported product | [Copilot app quickstart](https://docs.github.com/en/copilot/get-started/quickstart-copilot-app) | 2026-10-12 |
| Project-scoped canvas extensions over repo issues, PRs and checks | **You build this** — the extension surface is still moving; re-verify before Lab 26 ships | [Copilot app quickstart](https://docs.github.com/en/copilot/get-started/quickstart-copilot-app) | 2026-10-12 |

---

## 4. Licensing and tenancy prerequisites

| Prerequisite | Needed for | Source |
|---|---|---|
| **GitHub Enterprise Cloud** with Copilot Business or Enterprise | Enterprise managed settings, marketplace lockdown, the metrics and billing APIs | [Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings) |
| **Server-managed** managed-settings deployment | Per-team overrides; other deployment methods have none | [Overriding managed settings for teams](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/manage-for-enterprise/use-managed-settings/override-settings-for-teams) |
| **Enterprise Managed Users** or **GHEC with data residency** (ghe.com) | The two prompt-carrying capabilities: **Copilot Usage Records Streaming** and the **Copilot Usage Records API**, both preview | [Changelog, 2026-07-02](https://github.blog/changelog/2026-07-02-copilot-agent-session-streaming-is-now-in-public-preview/); [About EMU](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/understanding-iam-for-enterprises/about-enterprise-managed-users); [About data residency](https://docs.github.com/en/enterprise-cloud@latest/admin/data-residency/about-github-enterprise-cloud-with-data-residency) |
| An Azure subscription with a Log Analytics workspace | The U5 Azure path (the lab also has an offline path) | [Logs Ingestion API](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview) |

A standard GHEC tenant with neither EMU nor data residency **cannot** use the Usage Records path. It does not need to:
client OTel with `captureContent` carries prompts to your own collector without that gate.
Turning `captureContent` on is a privacy and data-residency decision. Name an approver for it
and pair it with `lockCaptureContent`.

---

## 5. The two requirements that are not native

### 5.1 Per-task agent and model binding

Spec Kit's task template and format specification have no agent or model field
([`tasks-template.md` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/templates/tasks-template.md)).
**DIY shape:**

1. An **org preset** extends the task template. It does not replace it, so the native
   `[ID] [P] [Story]` format still composes with core. Each task records its agent, which must
   exist in the U1 plugin manifest, a **model tier** plus a fallback (never a model string), a
   runnable acceptance check, and `execution: agent | split | human`.
2. A deterministic **validator** runs as a required check on any PR that changes `tasks.md`.
   It verifies the fields, that the agent exists and the tier is valid. On failure it rejects;
   it doesn't re-prompt.

### 5.2 Stage-order enforcement

Typing a later stage's command in chat is **not blocked**. Ordering is enforced only when work
runs through `specify workflow run`. **DIY shape:** a **merge-time ruleset** on the default
branch with:

- a **required status check** that `spec.md`, `plan.md`, `tasks.md` and an `approve`
  `qa-review` verdict exist for the feature the PR delivers, and
- **QA code-owner approval** on the PR through `CODEOWNERS`
  ([About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets);
  [About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)).

**Be plain about the limit:** this enforces **completeness at merge, not order in chat**. A
team can write the plan before the spec and still pass, provided all artifacts and the QA
approval exist when the PR merges.

### 5.3 Gate matrix

| Gate | Kind | Catches | Misses |
|---|---|---|---|
| Spec Kit `type: gate` in `specify workflow run` | Local pause | Skipping a stage inside a workflow run | Work done outside the run; who approved (no identity recorded) |
| `check-prerequisites` scripts | Deterministic | A stage invoked before its input artifact exists | An input artifact that exists but is wrong |
| Task-format validator (§5.1) | Deterministic, required check | Missing agent, tier, acceptance check or invalid agent | A task that is well-formed but mis-scoped |
| `qa-review` verdict | Probabilistic (agent), recorded | Unmet or unverified acceptance criteria against the spec | Criteria the spec never stated; the agent being wrong |
| Merge ruleset: required check (§5.2) | Deterministic | Merging with a missing stage artifact or no `approve` verdict | Order of authorship; artifact quality |
| QA code-owner approval | Human, durable | An unreviewed merge; it gives the approval of record an identity | Reviewer fatigue and rubber-stamping |
| Managed-settings marketplace lockdown | Deterministic, client-side | Installing unapproved plugins on governed clients | Ungoverned surfaces and repo-local files that shadow mandated agents |

*Book: The Deterministic/Probabilistic Boundary (The Four Kinds of Quality Gate); Governance for
AI-Assisted Delivery.*

---

## 6. Workload triage

Not every change belongs on the full path. Route **all** intake through one recorded triage
step so the light lane is visible in telemetry rather than becoming a bypass.

| Lane | When | Path | QA gate |
|---|---|---|---|
| **Full path** | New features and changes in scope or behaviour | `constitution → epic → feature-spec → plan → story-tasks → implement → qa-review` | Yes |
| **Sanctioned light lane** | Defects with a known expected behaviour | Candidate: Spec Kit's `bugfix` workflow — assess → review gate → fix → test | **No QA gate as shipped** |
| **No-agent path** | Trivial edits, sensitive code the agent should not touch, or when agents are unavailable | Normal PR flow, still recorded at intake | Normal review |

**Evaluating `bugfix` as the light lane is a design call.** It handles defects only and has no
QA gate. `qa-review` needs a feature's `tasks.md`, so it won't run on a `bugfix` run unmodified
([`workflows/bugfix/workflow.yml` @ v1.0.12](https://github.com/github/spec-kit/blob/v1.0.12/workflows/bugfix/workflow.yml)).
Either accept the reviewer gate plus normal PR review as sufficient for defects, or extend the
workflow. Pick before the pilot.

*Book: What Comes Next (When NOT to Use Agentic Workflows); Anti-Patterns and Failure Modes
(Team-Level Anti-Patterns: cargo-culting complexity).*

---

## 7. Phased rollout on two axes

**Lab order is not rollout order.** The labs teach the units in the order that is easiest to
learn. You roll out in the order that produces evidence soonest.

### 7.1 Axis 1 — unit order and dependencies

```
#48 registry ─┬─► U1 plugin + lockdown
              ├─► U2 Spec Kit bundle ─► U3 stages + gates ─► U4 funnel + tasks ─► U6 canvases
              └─► U5 telemetry  (depends only on #48 — switch it on first)
```

| Unit | Depends on | Delivers |
|---|---|---|
| U1 — tech-lead plugin + marketplace lockdown | Registry scaffolding | Same mandated agents and skills everywhere; deny-by-default sourcing |
| U2 — centralized Spec Kit templates + org catalog | Registry scaffolding | Same templates in every repo from one org source |
| U3 — custom stages, gates, rework loop | U2 | `epic` and `qa-review` stages, gates, pause-and-resume rework |
| U4 — notification funnel + executable tasks | U3 | Stage-owner notification, task-as-prompt, approvals of record |
| U5 — telemetry → Log Analytics → improvement loop | Registry scaffolding | Baseline and outcome measurement |
| U6 — Copilot app canvases | U4 | An operator surface over the same artifacts |

**Minimum viable harness:** U5's client OTel export (as a baseline), U1's plugin and lockdown,
and the merge-time ruleset from §5.2. That gives you consistent tools, a baseline and a
completeness check at merge before you invest in custom stages and the funnel.

*Book: The Agentic SDLC Reference Architecture (Start Anywhere, Expand Deliberately); What Comes
Next (The Starter Shape).*

### 7.2 Axis 2 — adoption cohorts

Set every threshold below **before** phase 1 starts, in writing, signed by the gate caller.

| Phase | Scope | Exit evidence (against the baseline) | Rollback triggers | Gate caller |
|---|---|---|---|---|
| **0 — Inventory and baseline** | Whole enterprise, read-only | Inventory of plugins, agents and MCP servers in use; a repo instrumentation audit; delivery baseline from PR history and the metrics reports API; client OTel on for the pilot candidates | Stop before phase 1 if the inventory is incomplete, the instrumentation audit fails, or the `captureContent` privacy approval is missing | Platform lead |
| **1 — Pilot** | A few **representative** teams (not only enthusiasts), lockdown via per-team overrides (§8) | Agreed outcome metrics no worse than baseline; cost per task within the budget alert; no unresolved blocking issue in the lockdown | A security finding in the bundle; outcome metrics worse than baseline for two review cycles; spend over the alert threshold | Executive sponsor + platform lead |
| **2 — Expand** | Additional teams by cohort | Pilot results reproduced in the new cohort; owners in place (§12) | Same as pilot, per cohort | Executive sponsor |
| **3 — Scale** | Enterprise default; lockdown moves from team overrides to the enterprise baseline | The agreed outcome metrics improved over the phase-0 baseline by the pre-set threshold across the expanded cohorts; cost per task at or under budget; review cadence and improvement loop running | Same, enterprise-wide | Executive sponsor + CISO |

**Kill criterion.** If, after the pilot and one expansion cohort, the agreed outcome metrics
show no improvement over the baseline and cost per task stays above budget, stop expanding.
Keep the lockdown and telemetry, and roll the rest back to the minimum viable harness.

*Book: Planning the Transition (Phased Adoption); The Business Case (The Adoption Timeline).*

---

## 8. Piloting the lockdown per enterprise team

With a **server-managed** deployment, these keys can be marked `overridable` and set per
enterprise team in `copilot/teams/*.json`, mapped by `copilot/team-mappings.json`:
`strictKnownMarketplaces`, `extraKnownMarketplaces`, `model`, `autoTier`, the `permissions.*`
keys, `allowedMcpServers`/`deniedMcpServers` and `sandbox`. `enabledPlugins` is **additive**
per team ([Overriding managed settings for teams](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/manage-for-enterprise/use-managed-settings/override-settings-for-teams)).

**Limits to plan around:**

- A user in several teams gets the **least restrictive** value, so pilot membership must be
  clean.
- `telemetry` **can't vary per team**. Telemetry decisions are enterprise-wide.
- Other deployment methods have **no** team overrides.
- No first-party-marketplace exemption is documented, so list GitHub's own marketplace
  explicitly if you want it.
- Don't mandate `permissions.disableBypassPermissionsMode` until a test shows Spec Kit's
  workflow steps still run under it (ledger §3.1).

---

## 9. Measuring value

**Commit to success criteria before the pilot**, then take two baselines:

1. **Delivery baseline (before agents).** PR history and the
   [Copilot usage metrics reports API](https://docs.github.com/en/rest/copilot/copilot-usage-metrics)
   give delivery and adoption as they are today.
2. **Agent-use baseline (before the rest of the harness).** Switch on client OTel first. U5
   depends only on the registry scaffolding, so it can run before U1–U4 land and show agent
   use before governance changes it.

**Outcome over activity.** Measure QA reject and rework rate, stage dwell time, escalations per
task and cost per task. Label sessions and token counts as **activity**, not outcome.

**No headcount framing.** Telemetry is aimed at **artifacts** (specs, agents, prompts,
skills, gates), not people. Spans carry `enduser.pseudo.id`
([CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)),
so reports must avoid per-person views:

- aggregate by team, stage, agent or artifact, never by user;
- suppress any group below a minimum size agreed with HR and works councils;
- restrict raw span access to the platform team, under the same approver as `captureContent`.

*Book: The Business Case (Building Your Business Case; The Honest Version); Planning the
Transition (Metrics That Matter).*

---

## 10. Cost

**This blueprint does not establish ROI.** To find out, measure cost per task (p50 and p95)
against the outcome metrics in §9, before and after, over the same cohorts.

### 10.1 Cost drivers

| Driver | What drives it | Source |
|---|---|---|
| **Copilot premium requests / AI credits** | Model tier × requests; agent sessions and workflow runs multiply requests | [Copilot requests](https://docs.github.com/en/copilot/concepts/billing/copilot-requests); [Billing usage API](https://docs.github.com/en/rest/billing/usage) |
| **Log Analytics ingestion** | GB ingested; `captureContent` greatly increases volume | [Azure Monitor Logs cost](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cost-logs); [Azure Monitor pricing](https://azure.microsoft.com/en-us/pricing/details/monitor/) |
| **Log Analytics retention** | Days retained beyond the included period. The Analytics plan includes 31 days at no extra cost (verified 2026-10-12), so a shorter retention saves nothing | [Azure Monitor Logs cost](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cost-logs); [Configure retention](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure) |
| **Table-plan decision** | Basic and Auxiliary cost less to ingest but forbid `join`, `search`, `find`, `externaldata` and user-defined functions, so the query pack **requires the Analytics plan** | [Table plans](https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-table-plans) |
| **People time and upkeep** | Authoring and maintaining primitives and presets; reviewer and gate time; coaching; platform upkeep, including tracking Spec Kit releases | Qualitative — measure it in the pilot |

### 10.2 Levers, owner and cadence

- **Levers:** model tier per task (the tier binding in §5.1), token use (scope and context
  size), and harness choice (full path vs light lane vs no-agent, §6).
- **Budget owner:** one named person, usually the platform lead, accountable to the sponsor.
- **Alert:** a `ScheduledQueryRules` alert on cost per task and daily spend
  ([Alert API switch](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-log-api-switch)),
  plus the GitHub billing budget.
- **Review cadence:** monthly during the pilot and expansion, quarterly at scale.

### 10.3 Cost card (one per workflow)

Every agentic workflow ships with a card. These are the starting cards for the workflows this
blueprint proposes. Owners are roles until §12 names people, and each tier comes from the
`models:` tiers (`cheap`, `standard`, `premium`) in `docs/_meta/registry.yaml`.

| Workflow | Engine / model tier | Stop condition | Owner | Off-switch |
|---|---|---|---|---|
| Full lifecycle (Spec Kit stages, U3) | Copilot CLI; per-task tier from the §5.1 binding, default `standard`, `premium` only for planning | Retry budget of 2 per gate, then escalate to the stage owner | Engineering leads (U3 owners, §12) | Remove the plugin from `enabledPlugins` |
| Light lane (`bugfix`) | Copilot CLI; `standard`, fallback `cheap` | One fix attempt per review gate, then route to the full path | Engineering manager of the pilot team | Remove `bugfix` from the team's enabled workflows |
| gh-aw notification funnel (U4) | gh-aw with the Copilot engine; `cheap` | One run per stage-transition event; `max:` on `assign-to-user` | Platform team | Disable the workflow, or set `staged: true` |
| Scheduled improvement review (U5) | gh-aw with the Copilot engine; `standard` | One run per schedule; draft output only, never auto-merged | Improvement-loop triage owner (§12) | Disable the workflow schedule |

*Book: The Agentic SDLC Bill (Three Variables You Already Control; The Leader's Playbook); The
Business Case (What It Actually Costs); What Comes Next (What the Author Probably Got Wrong).*

---

## 11. Boundaries

- **Lifecycle coverage:** Intent → Review, plus a dry-run Release. **Deploy and Operate are out
  of scope.**
- **Governance perimeter by surface**
  ([Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings)):

  | Surface | Plugin and marketplace keys | `telemetry` key |
  |---|---|---|
  | Copilot CLI | Yes | Yes |
  | VS Code | Yes | Yes |
  | GitHub Copilot app | Yes | **No** — the `epic` and `feature-spec` stages emit no client OTel |
  | Copilot cloud agent | Yes | No |
  | JetBrains | Yes | The key's text names CLI and VS Code only; the support table also ticks JetBrains. Treat it as unconfirmed |
  | Copilot Code Review | **Not a managed-settings client** | No |

- **Portability:** `SKILL.md` files and Spec Kit artifacts are portable across tools. The
  plugin marketplace and managed settings are GitHub-specific.
- **Sovereign clouds:** confirm the availability of each Azure service in your cloud before
  committing to the U5 Azure path. The offline path needs no Azure subscription.

*Book: The Agentic SDLC Reference Architecture (Mapping the Layers Across the Lifecycle).*

---

## 12. Owners

| Asset | Owner |
|---|---|
| Tech-lead plugin and marketplace repo (U1) | Platform team; changes by PR through `CODEOWNERS` |
| Spec Kit preset, extension and org catalog (U2) | Platform team with engineering leads |
| Workflow overlay, stages and gates (U3) | Engineering leads with QA lead |
| Funnel workflows and task-format validator (U4) | Platform team |
| Telemetry, collector, Log Analytics and cost (U5) | Platform team; budget owner as named in §10.2 |
| Improvement-loop triage | Rotating engineering lead; each finding names an owner and closes only when re-measured |
| Training and coaching | Enablement lead |

- **Short-lived enablement role.** An enablement lead coaches pilot and expansion cohorts,
  with an end date set at the start. Ownership then moves to the teams.
- **Skill-atrophy risk.** Developers who stop reading the code agents write lose the ability
  to review it. Owner: engineering leads. Mitigations: the no-agent path stays open, `qa-review`
  demands evidence rather than summaries, and reviews of agent output are rotated.
- **Fallback when an agent or model is unavailable.** Every task has a fallback tier (§5.1),
  and the no-agent path (§6) is always valid. The ruleset in §5.2 checks artifacts, not which
  agent produced them, so delivery continues without agents.

*Book: Team Structures for AI-Augmented Delivery (Ownership Across the Five-Layer Reference
Architecture); Governance for AI-Assisted Delivery; Planning the Transition (Common Transition
Pitfalls).*

---

## 13. Re-verification

Spec Kit ships frequently ([releases](https://github.com/github/spec-kit/releases)), and
several rows above are preview. Before funding each
phase, re-open every ledger source, update the *Verified* date, and change any status that has
moved. Open questions to resolve before they become requirements:

1. Whether a per-session `OTEL_RESOURCE_ATTRIBUTES` survives the managed `resourceAttributes`
   (§3.4; tracked in [#54](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/54)).
2. Which pre-approval path keeps `specify workflow run` working under
   `permissions.disableBypassPermissionsMode` (§3.1; tracked in
   [#50](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/50)).
3. Whether gh-aw `staged: true` and the `assign-to-user` limits behave as documented at the
   repo's pinned gh-aw version (§3.3; tracked in
   [#53](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/53)).
