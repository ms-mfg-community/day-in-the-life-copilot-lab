# EPIC-001: Enterprise Agentic SDLC Harness

**Status:** Draft
**Created:** 2026-09-17
**Owner:** TBD
**Target:** Labs 21–25 + executive blueprint
**Capability baseline verified:** 2026-09-17; independently **re-verified against primary
sources 2026-09-17** (see [Appendix A](#appendix-a--verified-capability-baseline))

---

## Overview

Enterprises adopting GitHub Copilot at scale hit the same wall. Individual developers get
faster, but the organization cannot answer basic questions: *Which agents are our developers
actually using? Did that feature follow our SDLC? Why did this task fail three times? Are our
prompts getting better or worse? What should we train people on next quarter?*

The components needed to answer those questions all exist today — private plugin
marketplaces, GitHub Spec Kit, GitHub Agentic Workflows, enterprise managed settings,
OpenTelemetry, Azure Monitor. What does not exist is an assembled, teachable blueprint that
takes a company from *"developers install whatever they want and prompt however they like"*
to a **governed, measurable, auditable AI-assisted SDLC**.

This epic builds that blueprint: one executive-facing document plus a five-lab arc
(Labs 21–25) that walks a company through standing up the full harness.

**Business Value**

| Stakeholder | What they get |
|---|---|
| **Enterprise leader** | A fundable, phased rollout plan with an honest ledger of what is product versus what must be built, plus the cost and licensing prerequisites |
| **Tech lead / platform team** | A golden path they can actually ship — one plugin install, one spec-kit bundle, one workflow |
| **PM / scrum master** | An SDLC where stage ownership and hand-off are explicit and notified, not tribal |
| **Individual contributor** | Tasks that arrive as executable prompts with the agent and model already chosen |
| **QA** | A real review stage with a rework loop, not a rubber stamp at the end |
| **Security / compliance** | Deny-by-default plugin sourcing, enforced managed settings, and an audit trail |
| **Engineering management** | Telemetry that turns prompts, successes, and failures into measurable improvement of specs, agents, prompts, skills, and training |

**Why this matters now:** the capability baseline verified for this epic (Appendix A) shows
that as of September 2026 the large majority of this harness is **supported product**, not
custom engineering. That is a recent change. Spec Kit gained a first-class extension and
org-catalog system; Copilot clients gained native OpenTelemetry export under enterprise
control. An organization planning this work from 2025-era blog posts will design the wrong
architecture and build glue it no longer needs.

---

## The shape of the harness

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
                          │ every action emits telemetry
                          ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │  U5  OpenTelemetry → collector → Azure Log Analytics                   │
  │      prompts (opt-in), tokens, tools, errors, stage transitions        │
  │      → Workbooks + KQL → AI-assisted review → improve specs, agents,   │
  │        prompts, skills, and training                                   │
  └───────────────────────┬────────────────────────────────────────────────┘
                          │
                          └──────────► feeds back into U1–U4
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
| `qa-review` | QA | PR + Copilot Code Review | Review verdict *(custom stage)* |
| *rework* | Any prior owner | — | Updated artifact, re-entering the loop |

---

## Scope

**In scope**

- `docs/enterprise-harness-blueprint.md` — the executive-facing blueprint (U0)
- Labs 21–25 (`labs/lab21.md` … `labs/lab25.md`) — the hands-on arc (U1–U5)
- A runnable enterprise plugin bundle following the `plugin-template/` conventions
- A runnable Spec Kit preset + extension + workflow overlay + bundle
- gh-aw workflows for the notification funnel
- An OpenTelemetry collector configuration, deployable Bicep for the Azure sink, **and**
  an offline simulator path requiring no Azure subscription
- A KQL query pack and Workbook definition for the reporting surface
- Registry, README, and `labs/setup.md` wiring so the new labs satisfy existing CI gates

**Out of scope**

- Deploying anything into a live customer tenant or subscription
- Replacing Labs 11, 16, 17, 18, 19, or 20 — this arc *builds on* them and links back
- A production-grade OTel collector deployment (the lab ships a reference config, not an SRE-owned service)
- Any first-party GitHub→Azure connector (none exists; see Appendix A)
- Non-Azure observability backends (Datadog, Splunk, etc. are named as alternatives only)
- The ContosoUniversity application domain — this arc is about the *harness*, not the app

---

## Units

### U0 — Executive blueprint

**Artifact:** `docs/enterprise-harness-blueprint.md`

The document an enterprise leader reads before funding the work. Not a lab.

**US-0.1**
**As an** engineering executive
**I want** a single document showing what the harness is, what it costs, and what is
product versus custom build
**So that** I can decide whether to fund it without being sold a demo that quietly does not hold.

**Acceptance Criteria**
- [ ] Contains the architecture diagram and the role→stage→artifact→surface table above.
- [ ] Contains a **native-vs-DIY ledger** — every capability marked *Supported product*,
      *Preview (with gating)*, or *You build this*, each with a primary-source URL and a
      verification date.
- [ ] States the licensing and tenancy prerequisites explicitly, including the two
      capabilities that require **Enterprise Managed Users or GHEC with data residency**.
- [ ] Contains a phased rollout sequence mapped to U1–U5, with the dependency order.
- [ ] Contains a cost-driver section covering Copilot premium requests/AI credits, Log
      Analytics ingestion and retention, and the table-plan decision.
- [ ] Names **every** capability Appendix A marks *You build this*, *Not supported*,
      *Not enforced*, *Unverified*, *Not a target*, *Not covered*, or *Does not exist* — as of
      the 2026-09-17 baseline that is **nine rows**, not two. The DIY shape is shown for the
      two the brief depends on most (per-task agent/model binding; hard stage-order
      enforcement in chat), and the ledger carries the rest. Do not quote a fixed count in
      prose; let the ledger be the count.
- [ ] Every external claim carries a source link; no undated vendor-attributed numbers.

---

### U1 — The tech lead's plugin (Lab 21)

**Artifacts:** `labs/lab21.md`, `enterprise-harness-bundle/`

Extends [Lab 11](../../labs/lab11.md) (`plugin-template/`) and
[Lab 16](../../labs/lab16.md) (`managed-settings.json`). The org's mandated agents and
skills become one installable plugin, and the marketplace is locked down so nothing else
can be installed.

**US-1.1**
**As a** tech lead
**I want** to publish the agents and skills my developers must use as a single plugin
**So that** a new developer is productive on our golden path with one install, not a wiki page.

**US-1.2**
**As a** security lead
**I want** plugin installation denied by default except from our own marketplace
**So that** unreviewed third-party agent code cannot reach a developer machine.

**Acceptance Criteria**
- [ ] `enterprise-harness-bundle/` follows `plugin-template/` conventions: `manifest.yaml`,
      `CODEOWNERS`, `org-policy.example.yaml`, `scripts/install.mjs`, `scripts/policy.mjs`,
      `.github/workflows/release.yml`.
- [ ] `manifest.yaml` `minimum_cli_version` matches `docs/_meta/registry.yaml`
      `copilot_cli_version_floor` (the existing `tests/plugin-template/` suite hardcodes
      `join(ROOT, 'plugin-template')`, so `enterprise-harness-bundle/` inherits **no**
      coverage — the new test below is what asserts it).
- [ ] Bundles at minimum: a spec-authoring agent, a task-execution agent, a QA-review agent,
      and the skills each depends on.
- [ ] `node enterprise-harness-bundle/scripts/install.mjs` reports `ok=true`.
- [ ] Lab shows the full `managed-settings.json` lockdown — `extraKnownMarketplaces` (named-object
      map), `enabledPlugins` (`NAME@MARKETPLACE` boolean map), and `strictKnownMarketplaces`
      (**array of marketplace objects**; `[]` is total lockdown) — reusing Lab 16's shape warnings.
- [ ] Lab states that no first-party-marketplace exemption is documented, so GitHub's own
      marketplace must be listed explicitly if it is wanted.
- [ ] A test asserts the bundle manifest schema and the install dry-run.

---

### U2 — Centralized Spec Kit templates (Lab 22)

**Artifacts:** `labs/lab22.md`, a Spec Kit preset + extension + `bundle.yml`, an org catalog example

The centralized spec-template repository, distributed the way Spec Kit actually supports.

**US-2.1**
**As a** platform engineer
**I want** our customized spec, plan, and task templates installed into every repo from one
org-hosted source
**So that** every team specifies work the same way without copy-pasting or forking.

**US-2.2**
**As a** compliance owner
**I want** our developers able to *discover* community presets but only *install* approved ones
**So that** unreviewed template code cannot enter our SDLC.

**Acceptance Criteria**
- [ ] Lab pins **Spec Kit v1.0.8** via `docs/_meta/registry.yaml` (`spec_kit_version`), not a hardcoded string.
- [ ] Uses `specify init <project> --integration copilot` — **never** the removed `--ai` flag.
- [ ] Correctly tells learners that Copilot gets **skills** by default
      (`.github/skills/speckit-<command>/SKILL.md`, invoked `/speckit-specify` with a hyphen),
      and shows `--integration-options="--commands"` as the opt-in path to
      `.github/agents/` + `.github/prompts/`.
- [ ] Ships an **org preset** customizing `spec-template.md`, `plan-template.md`, and
      `tasks-template.md`, demonstrating at least one non-`replace` composition strategy
      (`wrap` with `{CORE_TEMPLATE}`, `prepend`, or `append`).
- [ ] Ships a **`bundle.yml`** pinning preset + extension + workflow as one versioned install.
- [ ] Demonstrates the **org catalog**: `.specify/preset-catalogs.yml` with
      `install_allowed: true` for the org catalog, and shows the community catalog as
      **discovery-only** — framed as a deliberate supply-chain control, not an obstacle.
- [ ] Documents the resolution stack (overrides → presets → extensions → core, each file
      resolving independently) and shows `specify preset resolve <name>` for debugging.
- [ ] Explicitly warns that **`specify init --preset` does not accept a URL** — ID, bundled
      name, or local directory only; use `specify preset add --from <url>` after init.
- [ ] States that the constitution lives at **`.specify/memory/constitution.md`**.
- [ ] States that forking Spec Kit is an anti-pattern given its release cadence.

---

### U3 — The SDLC as an enforced workflow (Lab 23)

**Artifacts:** `labs/lab23.md`, a Spec Kit extension providing custom phases, a workflow overlay

The custom stage sequence, the gates between stages, and the rework loop.

**US-3.1**
**As a** tech lead
**I want** our SDLC to include an epic stage before spec and a QA-review stage after
implementation
**So that** the tool enforces our process instead of the default five-phase one.

**US-3.2**
**As a** scrum master
**I want** work to stop at a gate until the right person approves
**So that** a feature cannot silently skip review.

**US-3.3**
**As any** stage owner
**I want** rework to be a first-class path, not an exception
**So that** a rejected artifact re-enters the SDLC cleanly instead of being patched around.

**Acceptance Criteria**
- [ ] An `extension.yml` declares `speckit.<org>.epic` and `speckit.<org>.qa-review` under
      `provides.commands`, each shipping its own template and script.
- [ ] A **workflow overlay** (`extends:` the base `speckit` workflow) uses `insert_after`
      to place the custom stages and `type: gate` steps with `on_reject` to enforce approval.
- [ ] The overlay lives under `.specify/workflows/overlays/<id>/` so it survives
      `specify workflow add` and `bundle update`.
- [ ] Lab demonstrates `specify workflow run` / `status --json` / `resume`, and shows where
      run state is persisted.
- [ ] **Honest-caveat requirement:** the lab states plainly that typing `/speckit-plan` in
      chat will **not** be blocked — ordering is convention unless driven through
      `specify workflow run`, and shows `check-prerequisites` scripts as the second belt.
- [ ] Lab states that hook events are a **fixed lifecycle list** — there is no
      `before_epic`, because you cannot hook a phase core does not define.
- [ ] Lab states that feature state lives in **`.specify/feature.json`**, which is
      **gitignored**, and that `git checkout` alone does not switch features.
- [ ] The rework loop is modelled explicitly, including what happens to the existing
      `tasks.md` when a spec changes.

---

### U4 — The funnel and executable tasks (Lab 24)

**Artifacts:** `labs/lab24.md`, gh-aw notification workflows, a task-prompt preset

**US-4.1**
**As a** stakeholder
**I want** to be notified when it is my turn
**So that** work does not stall waiting for someone who does not know they are up.

**US-4.2**
**As an** individual contributor
**I want** my task to arrive as an executable prompt with the agent and model already chosen
**So that** my job is keeping the work on the rails, not deciding how to prompt.

**US-4.3**
**As a** business user
**I want** to author a spec conversationally in the GitHub Copilot app
**So that** I can contribute to the SDLC without a local dev environment.

**Acceptance Criteria**
- [ ] Uses Spec Kit's `taskstoissues` to project tasks into GitHub Issues, and documents its
      prerequisites (an `origin` remote and the GitHub MCP server).
- [ ] gh-aw workflow(s) route notification on stage transition — assignment, `CODEOWNERS`
      review request, and Project status — following the existing `generate-prd.md` and
      `weekly-content-audit.md` safe-outputs patterns in this repo.
- [ ] Defines the **task-as-prompt** format: objective, context links, the exact agent, the
      exact model, acceptance check, and escalation path.
- [ ] **Honest-caveat requirement:** the lab states that **per-task agent/model metadata is
      not native to Spec Kit** — there is no such field in the task template or format spec.
      The lab ships this as an org preset extending the task template, and labels it DIY.
- [ ] Preserves the native task format (`[ID] [P] [Story]`, phase grouping, checkpoints) so
      the org extension composes with core rather than replacing it.
- [ ] Documents the rework routing: which stage owner is notified when QA rejects, and how
      the task is rewritten rather than silently re-run.
- [ ] Maps each stage to the surface its owner actually uses (Copilot app, IDE, CLI, PR).

---

### U5 — Telemetry, Log Analytics, and the improvement loop (Lab 25)

**Artifacts:** `labs/lab25.md`, OTel collector config, Bicep, offline simulator, KQL pack, Workbook

The measurable, auditable payoff — and the unit most likely to be designed wrong from
stale sources.

**US-5.1**
**As a** platform owner
**I want** every agent session, model call, tool execution, and error exported to our own sink
**So that** we can measure the SDLC instead of guessing.

**US-5.2**
**As an** engineering manager
**I want** a regular report over that data
**So that** we can decide what to improve — a spec template, an agent, a prompt, a skill, or training.

**US-5.3**
**As a** developer without an Azure subscription
**I want** to complete this lab anyway
**So that** the workshop works in any room.

**Acceptance Criteria**
- [ ] **OpenTelemetry is the centerpiece.** Lab configures the managed-settings `telemetry`
      key (`enabled`, `endpoint`, `protocol`, `captureContent`, `lockCaptureContent`,
      `serviceName`, `resourceAttributes`, `headers`) and states it is supported for
      **Copilot CLI and VS Code**.
- [ ] States that **the data goes to your collector** — GitHub does not receive or store it.
- [ ] Frames **`captureContent`** as the switch that captures prompts and responses, off by
      default, and presents enabling it as a **governance decision with a named approver**,
      paired with `lockCaptureContent`.
- [ ] Documents the span tree — an `invoke_agent` root span with `chat` and `execute_tool`
      children — and the GenAI attributes the query pack depends on (`gen_ai.usage.*`,
      `gen_ai.request.model`, `gen_ai.conversation.id`, `gen_ai.tool.name`, `error.type`,
      `github.copilot.*`). There is **no `execute_hook` span**; hook execution is not a
      documented span type.
- [ ] Warns that **`github.copilot.cost` is a per-request model multiplier, not a currency
      value**, and that `github.copilot.nano_aiu` must be read from the **root `invoke_agent`
      span only** — it is also stamped on child `chat` spans, so summing it across every span
      double-counts. A cost report built on either mistake is wrong in the direction that
      embarrasses you in front of finance.
- [ ] **Offline path:** uses the CLI file exporter to land spans on local disk and runs the
      KQL pack against a fixture, so the lab completes with **no Azure subscription**.
- [ ] **Azure path:** Bicep provisions the workspace, the DCR, and the custom tables, using
      current resource types and API versions from the registry — not hardcoded.
- [ ] Uses the **Logs Ingestion API** (DCR `"kind": "Direct"`; a DCE is required only for
      private link, or for an older DCR created without the logs ingestion endpoint) and
      explicitly warns that **Microsoft ended support for the HTTP Data Collector API on
      2026-09-14** — any tutorial using `ods.opinsights.azure.com` or
      `Authorization: SharedKey` is obsolete. State the nuance accurately: that date was
      **not an ingestion shutdown**. Existing ingestion continues for TLS 1.2+ clients, but
      the API now receives only critical security fixes and carries no SLA. Since
      **2026-03-01** the endpoint also rejects clients that cannot negotiate TLS 1.2.
- [ ] Assigns **`Monitoring Metrics Publisher` on the DCR** — not the workspace, not the DCE —
      and calls out that the role name says "Metrics" but is the role for ingesting logs.
- [ ] Warns that the stream name in the POST URL must match the **`streamDeclarations` key**,
      not `outputStream`.
- [ ] Mandates the **Analytics** table plan for the query pack, and explains that Basic and
      Auxiliary forbid `join`, `search`, `find`, `externaldata`, and user-defined functions,
      cap Basic queries at 30 days, support no alerts on Auxiliary, and are invisible to Power BI.
- [ ] Covers the ingestion limits that shape the collector config (1 MB per call, 64 KB per
      field with silent truncation) and that the Logs Ingestion API **does not auto-adjust
      schema on drift** — a real risk as agent event shapes evolve.
- [ ] Documents the **complementary** sources and what each is actually for: the metrics
      reports API (aggregate; returns NDJSON **download links**, not inline metrics), the
      billing API (per-model cost; 24-month window), and the audit log (policy and
      lifecycle only).
- [ ] **Explicitly fences off the dead ends:** legacy Copilot metrics APIs sunset 2026-04-02;
      the audit log never carries prompts, models, tokens, or cost; **Azure Monitor is not a
      supported audit-streaming target** (Event Hubs or Blob, and you write the forwarder,
      deduping on `_document_id` because delivery is at-least-once — note this is the **audit
      log's** identifier; the separate **Copilot Usage Records Streaming** schema uses
      `event_id`, so do not cross-apply them); **Actions has no OpenTelemetry**.
- [ ] Notes that prompt-carrying **Copilot Usage Records Streaming is preview and gated to
      EMU or GHEC-with-data-residency** — a standard GHEC tenant cannot complete that path.
- [ ] Reporting surface: an Azure **Workbook** (GA) plus the KQL pack; notes Grafana-backed
      Azure Monitor dashboards are preview and that the legacy Log Analytics Alert API
      retired 2025-10-01 (use `ScheduledQueryRules`).
- [ ] **Closes the loop — KQL first, agent second** (matching R8's mitigation): the
      deterministic KQL pack produces the findings, and an agent then *interprets* them into
      recommendations. The lab must **not** be built on natural-language→KQL over an arbitrary
      custom `_CL` table — Appendix A marks that **unverified**, and the lab has to complete
      even if the agent step is skipped. The Azure MCP Server's Log Analytics KQL tools are
      shown as the agent's access path. Chains explicitly into
      [Lab 19](../../labs/lab19.md)'s self-improving-agents pattern and
      [Lab 20](../../labs/lab20.md)'s enterprise reporting.
- [ ] Recommendations must name a target: a spec template, an agent, a prompt, a skill, or a
      training topic — closing back to U1–U4.

---

## Repo integration constraints

The existing vitest suite will fail if the implementation misses any of these. Recorded here
so the implementing session does not rediscover them.

| Constraint | Enforced by |
|---|---|
| Each `labs/lab2N.md` needs frontmatter `title`, `lab_number`, `pace` | `tests/lab-structure/labs-have-frontmatter.test.ts` |
| Each lab needs a `docs/_meta/registry.yaml` `labs:` entry (**key presence only**) | `tests/meta/enumeration-parity.test.ts` — it does **not** read pace fields |
| `pace_presenter_minutes` and `pace_workshop_minutes` must be declared | `tests/workshop/time-budget.test.ts` |
| `pace_workshop_minutes >= pace_presenter_minutes` | `tests/workshop/time-budget.test.ts` |
| `pace_self_minutes` is **enforced by no test in the suite** | — (it carries the arc's "~2.5 hours" claim, so it must be reviewed by hand) |
| Each lab referenced in **both** `README.md` and `labs/setup.md` (new labs are not allowlisted) | `tests/meta/enumeration-parity.test.ts` |
| All internal markdown links **in `labs/`** resolve to files on disk | `tests/lab-structure/links-resolve.test.ts` — it scans `labs/` only, so links in this epic doc and anywhere under `docs/` are **ungated** and must be checked by hand |
| At least 3 labs reference `docs/_meta/registry.yaml` | `tests/content-currency/registry-consumed.test.ts` |

> ⚠️ **Baseline caveat, verified 2026-09-17:** `tests/lab-structure tests/meta
> tests/content-currency` is green (13 files, 183 tests). **`tests/workshop` is already red on
> `main`** — 12 failures in workshop slide front-matter / curriculum parity, unrelated to this
> epic. Any acceptance criterion that says "`tests/workshop` green" inherits that debt.

Additional wiring required:

- `labs/lab20.md` currently ends **"Lab series complete."** — must chain to Lab 21.
- `README.md` Lab Modules table needs five new rows; the **"Total: ~7 hours (20 labs…)"**
  line and the learning-path note both need updating.
- `labs/setup.md` needs the new arc described alongside the existing 15–20 modernization track.
- New registry keys: **`spec_kit_version: "1.0.8"`** and an Azure Monitor block carrying
  resource API versions, so no lab hardcodes a version.
- Pacing: five labs at roughly 25–35 self-paced minutes each adds about 2.5 hours. Verified
  2026-09-17: the registry's 20 `pace_self_minutes` values sum to **440 minutes (~7.3 h)**, so
  the arc lands the suite at roughly **590 minutes (~10 hours)**. README's "~7 hours" becomes
  **"~10 hours"**, not a rounding tweak. This is a deliberate curriculum decision to record,
  not a number to let drift.
- **Workshop ceiling (not yet addressed by this epic — needs a decision).**
  `tests/workshop/time-budget.test.ts` asserts `total_minutes = 240` across modules **M1–M6**,
  checked against `workshop/curriculum.md`. Five new labs cannot enter the 4-hour workshop
  without displacing existing modules. The arc therefore has to be declared **self-paced only**
  and kept out of the workshop enumeration — **note this does not exempt them from the pace
  fields**: `tests/workshop/time-budget.test.ts` iterates every `registry.labs` entry and
  requires a positive `pace_workshop_minutes` regardless of whether the lab is ever presented
  — or the curriculum has to be rebalanced. R9 tracks the README framing; this is the separate
  gate that has an actual test behind it.

---

## Risks and dependencies

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| R1 | **Spec Kit release velocity** — 9 releases in the 4 weeks to 2026-09-17; v1.0.8 shipped the day this epic was researched | Lab drifts mid-cohort | Pin `spec_kit_version` in the registry; add a re-verification obligation; consider adding spec-kit to the weekly content-audit checks |
| R2 | **Preview gating is narrower than "GHEC"** — prompt-carrying usage records require EMU or data residency | A standard GHEC tenant cannot complete that path | Lead with OTel `captureContent`, which has no such gate; present usage records as the alternative with its gating stated up front |
| R3 | **`captureContent` sends prompts and responses to your sink** | Source code and prompts leave the client; data-residency and privacy exposure | Treat as a governance decision with a named approver; pair with `lockCaptureContent`; make the default-off behavior explicit |
| R4 | **Log Analytics cost and table-plan traps** | A cheap plan silently breaks the reporting module | Mandate the Analytics plan for the query pack; document that sub-31-day retention saves nothing and that deleting a table does not stop retention charges |
| R5 | **No first-party GitHub→Azure connector exists** | Every path needs glue the org writes | Budget for the collector/forwarder explicitly in U0; do not imply a wizard exists |
| R6 | **Several brief requirements are not native** — Appendix A's ledger marks nine rows DIY, unsupported, unenforced, or unverified; the two the brief leans on hardest are per-task agent/model binding and chat-time order enforcement | Credibility loss if oversold | Ship the load-bearing two as labelled DIY extensions with the caveat in the lab body; carry the full ledger in the blueprint and never quote a count that the ledger contradicts |
| R7 | **No official GitHub docs for Spec Kit** (0 hits on docs.github.com) | Enterprise reviewers may question maturity | Cite `github.github.com/spec-kit` and the repo; state the documentation position honestly |
| R8 | **Azure regional and cloud limits** — Azure Copilot unavailable in Gov/21Vianet; SRE Agent in three regions | Blueprint may not apply to sovereign-cloud customers | Record constraints in U0; keep the AI-review step backend-agnostic (KQL first, agent second) |
| R9 | **Arc length pushes the suite past its "~7 hours" framing** | Curriculum and workshop timing drift | Treat as an explicit decision; update README and pacing in the same PR |

**Dependencies:** Labs 11, 16, 17, 18, 19, 20 (built on and linked); `plugin-template/`;
`modernization-bundle/`; `docs/_meta/registry.yaml`; the existing gh-aw workflow patterns.

---

## Success criteria

- [ ] `docs/enterprise-harness-blueprint.md` exists and carries a dated, cited native-vs-DIY ledger.
- [ ] Labs 21–25 exist, are wired into the registry, README, and `labs/setup.md`, and Lab 20 chains forward.
- [ ] `npm test` (or `make test`) is green, including all lab-structure, enumeration-parity, and link-resolution gates.
- [ ] `node enterprise-harness-bundle/scripts/install.mjs` reports `ok=true`.
- [ ] The Spec Kit bundle installs and `specify workflow run` executes the custom stage
      sequence including at least one gate.
- [ ] Lab 25 completes end-to-end **without an Azure subscription** via the offline path.
- [ ] The Bicep deploys cleanly for learners who do have a subscription.
- [ ] Every honest caveat in U0–U5 appears in the shipped content — a reviewer can find each
      one by searching the lab text.
- [ ] No lab hardcodes a version that belongs in `docs/_meta/registry.yaml`.

---

## Child issue decomposition

Dependency order; each becomes one GitHub issue under this epic.

| # | Title | Depends on | Primary output |
|---|---|---|---|
| 1 | Registry and scaffolding for the enterprise-harness arc | — | `spec_kit_version` + Azure Monitor keys, `labs:` entries, lab stubs |
| 2 | Executive blueprint (U0) | 1 | `docs/enterprise-harness-blueprint.md` |
| 3 | Lab 21 — tech-lead plugin and marketplace lockdown (U1) | 1 | `labs/lab21.md`, `enterprise-harness-bundle/` |
| 4 | Lab 22 — centralized Spec Kit templates and org catalog (U2) | 1 | `labs/lab22.md`, preset + `bundle.yml` + catalog example |
| 5 | Lab 23 — custom SDLC stages, gates, and rework loop (U3) | 4 | `labs/lab23.md`, `extension.yml`, workflow overlay |
| 6 | Lab 24 — notification funnel and executable tasks (U4) | 5 | `labs/lab24.md`, gh-aw workflows, task-prompt preset |
| 7 | Lab 25 — telemetry, Log Analytics, and the improvement loop (U5) | 1 | `labs/lab25.md`, collector config, Bicep, offline sim, KQL pack |
| 8 | Integration — README, setup.md, Lab 20 chaining, full suite green | 2–7 | Wiring + passing CI |

---

## Appendix A — Verified capability baseline

**Verified 2026-09-17 against primary sources.** This appendix exists so that future
sessions do not re-derive it, and — more importantly — do not reach for an API that has
been retired or invent a mechanism that does not exist. Full research reports are archived
in the session workspace.

**Re-verification pass, 2026-09-17 (independent, primary sources reopened).** Confirmed
unchanged: Spec Kit v1.0.8 is still the latest release; the managed-settings `telemetry`
sub-keys are exactly as listed and are documented for Copilot CLI and VS Code; the
`Monitoring Metrics Publisher`-on-the-DCR requirement; the `streamDeclarations`-key-vs-
`outputStream` trap; 1 MB per call and 64 KB per field with truncation; the Logs Ingestion
API not auto-adjusting schema on drift; the metrics reports API returning download links
with data from 2025-10-10 and 1-year retention; the Log Analytics Alert API retirement on
2025-10-01; and that Azure Monitor is absent from the audit-log streaming targets, which
are Amazon S3, Azure Blob Storage, Azure Event Hubs, Datadog, Google Cloud Storage, and
Splunk. **Corrected in this pass:** there is no `execute_hook` span; the audit-log dedupe
key is `_document_id`, not `event_id`; the HTTP Data Collector API's 2026-09-14 date ended
*support*, not ingestion; and Spec Kit shipped 9 releases in the preceding 4 weeks, not 8.

### A.1 Spec Kit — verified against `github/spec-kit` v1.0.8

| Capability | Status | Note |
|---|---|---|
| Extension / preset / bundle / workflow system | **Supported product** | First-class since ~v1.0 |
| Org-hosted catalogs | **Supported product** | `SPECKIT_PRESET_CATALOG_URL` → project → user → built-in |
| `install_allowed` discovery/install separation | **Supported product** | Deliberate supply-chain control |
| Register a new command/phase | **Supported product** | `extension.yml` → `provides.commands` |
| Insert a phase into a sequence | **Supported product** | Workflow overlays, `insert_after` |
| Approval gates | **Supported product** | `type: gate`, `on_reject: abort` |
| Fork to customize | **Anti-pattern** | Resolution stack replaces it |
| `specify init --preset <URL>` | **Not supported** | ID / bundled name / local dir only |
| Per-task agent or model metadata | **You build this** | No field in template or format spec |
| Order enforcement in chat | **Not enforced** | Only `specify workflow run` gates |
| Custom (non-lifecycle) hook events | **Unverified** | Fixed event list documented; no dispatcher found |
| Official docs on docs.github.com | **Does not exist** | 0 hits; use `github.github.com/spec-kit` |

**Corrections to widely-held assumptions:** `--ai` is gone (use `--integration`); the flow
is 9 commands not 5; Copilot gets skills not prompts by default; the constitution is at
`.specify/memory/constitution.md`; `.specify/feature.json` is the state pointer and is
gitignored; Git itself is an opt-in extension.

### A.2 Copilot telemetry and Azure

| Capability | Status | Note |
|---|---|---|
| Copilot client OpenTelemetry export | **Supported product (GA)** | The real answer; CLI + VS Code |
| Client OTel for the **GitHub Copilot app** | **Not covered by managed settings** | The `telemetry` key is documented as supported for **Copilot CLI and VS Code** only. The `epic` and `feature-spec` stages run in the Copilot app, so those two stages emit **no client OTel**. State the gap; do not imply full coverage |
| Copilot SDK OpenTelemetry instrumentation | **Documented separately** | A third surface, with its own guidance page — not governed by the managed-settings `telemetry` key |
| Managed-settings `telemetry` key | **Supported product** | Enterprise-enforced, cannot be overridden |
| `captureContent` (prompts + responses) | **Supported product, off by default** | Governance decision |
| Copilot usage metrics reports API | **GA, rearchitected** | Returns NDJSON **download links**; from 2025-10-10, 1-year retention |
| Token counts in metrics reports | **CLI and Copilot app only** | No IDE chat/completion tokens |
| Per-model billing / premium requests | **GA** | 24-month window; filterable by `model` |
| Legacy `/copilot/metrics` + `/copilot/usage` | **Sunset 2026-04-02** | Most blog posts and samples still teach these |
| Prompts in audit log | **Never present** | Policy and lifecycle events only |
| Audit streaming → Azure Monitor | **Not a target** | Event Hubs or Blob; you write the forwarder |
| Copilot Usage Records (carry prompts) | **Preview, EMU or data-residency only** | Narrower than "GHEC" |
| OpenTelemetry in Actions | **Does not exist** | Synthesize spans from the jobs API |
| Azure Logs Ingestion API (DCR) | **GA** | DCE optional with `"kind": "Direct"` |
| Azure HTTP Data Collector API | **Support ended 2026-09-14** | Not an ingestion shutdown — ingestion continues for TLS 1.2+ clients, but with critical security fixes only and no SLA. Pre-TLS 1.2 clients rejected since 2026-03-01. Do not teach `SharedKey` / `ods.opinsights.azure.com` |
| Azure Workbooks | **GA** | Recommended reporting surface |
| Grafana-backed Azure Monitor dashboards | **Preview** | Free, in-portal |
| Legacy Log Analytics Alert API | **Retired 2025-10-01** | Use `ScheduledQueryRules` |
| Basic / Auxiliary table plans | **GA, but restrict KQL** | No `join`, `search`, `find`, `externaldata`, UDFs |
| Azure MCP Server (Log Analytics KQL tools) | **Available** | Cleanest way to close the AI loop |
| NL→KQL over an arbitrary custom `_CL` table | **Unverified** | Do not promise it |

### A.3 Re-verification obligations

Before this epic's labs ship, and periodically after:

1. **Spec Kit version and command surface** — releases roughly weekly; re-check the pinned
   version, the command list, and the Copilot integration layout.
2. **Copilot CLI OTel environment-variable names — RESOLVED 2026-09-17.** The
   `cli-command-reference#opentelemetry-monitoring` section was read directly, closing the
   gap the first research pass flagged. Verified names: `COPILOT_OTEL_ENABLED`,
   `COPILOT_OTEL_EXPORTER_TYPE`, `COPILOT_OTEL_FILE_EXPORTER_PATH`,
   `COPILOT_OTEL_SOURCE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_PROTOCOL`
   (`http/json` default, or `http/protobuf`), `OTEL_EXPORTER_OTLP_HEADERS`,
   `OTEL_SERVICE_NAME` (default `github-copilot`), `OTEL_RESOURCE_ATTRIBUTES`,
   `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` (default `false`), `OTEL_LOG_LEVEL`.
   OTel is off by default and activates when any of `COPILOT_OTEL_ENABLED=true`,
   `OTEL_EXPORTER_OTLP_ENDPOINT`, or `COPILOT_OTEL_FILE_EXPORTER_PATH` is set. The file
   exporter writes all signals as **JSON-lines** — that is the offline path's mechanism.
   Concept page: `docs.github.com/en/copilot/concepts/enterprise/opentelemetry`.
3. **Azure resource API versions — verified 2026-09-17**, to be stored in the registry rather
   than hardcoded: `Microsoft.Insights/dataCollectionRules` **2024-03-11**,
   `Microsoft.Insights/dataCollectionEndpoints` **2024-03-11**,
   `Microsoft.OperationalInsights/workspaces/tables` **2025-07-01**. The Logs Ingestion
   data-plane POST uses `api-version=2023-01-01`. Re-confirm at implementation time.
4. **Preview→GA transitions** — Grafana-backed dashboards, Copilot Usage Records streaming,
   and Azure Copilot's observability capabilities were all preview or mid-rename at
   verification time.

---

## Handoff

Implementation of U0–U5 is **not** part of this epic's authoring task. The next session
picks up from the child-issue decomposition above. The archived research reports in the
session workspace are the evidence base for Appendix A and should be consulted before
changing any claim in it.

> ⚠️ **Appendix A supersedes the archived research where they disagree.** The 2026-09-17
> re-verification pass corrected four claims that the research reports still carry in their
> original form. Most importantly, the research says to dedupe the **audit log** on
> `event_id`; the audit log's documented per-event identifier is **`_document_id`**, and
> `event_id` belongs to the *separate* Copilot Usage Records Streaming schema. Do not walk
> that correction backwards. Likewise, the research's `invoke_agent → chat → execute_tool`
> span tree is correct and there is **no `execute_hook` span**.
