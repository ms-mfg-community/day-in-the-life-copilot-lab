# EPIC-001: Enterprise Agentic SDLC Harness

**Status:** Draft
**Created:** 2026-09-17
**Owner:** TBD
**Target:** Labs 21–26 + executive blueprint
**Capability baseline verified:** 2026-09-17; independently **re-verified against primary
sources 2026-09-17** (see [Appendix A](#appendix-a--verified-capability-baseline))
**Revised:** 2026-10-01 against *The Agentic SDLC Handbook* v0.11.0 (#66); the product facts
verified that day are in [A.4](#a4-additions-verified-2026-10-01)

> **Citing the book.** A *Book:* note cites Daniel Meppiel,
> [*The Agentic SDLC Handbook*](https://danielmeppiel.github.io/agentic-sdlc-handbook/)
> v0.11.0, by chapter title and section, because chapter numbers drift between versions.
> The epic adopts the book's ideas, not its figures: most are the author's single-run
> heuristics, so no book figure appears in an acceptance criterion.

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

This epic builds that blueprint: one executive-facing document plus a six-lab arc
(Labs 21–26) that walks a company through standing up the full harness and then
operating it through practical Copilot App canvas surfaces.

**Business Value**

| Stakeholder | What they get |
|---|---|
| **Enterprise leader** | A fundable, phased rollout plan with an honest ledger of what is product versus what must be built, plus the cost and licensing prerequisites |
| **Tech lead / platform team** | A golden path they can actually ship — one plugin install, one spec-kit bundle, one workflow |
| **PM / scrum master** | An SDLC where stage ownership and hand-off are explicit and notified, not tribal |
| **Individual contributor** | Tasks that arrive as executable prompts with the agent and model already chosen |
| **QA** | A real review stage with a rework loop, not a rubber stamp at the end |
| **Security / compliance** | Deny-by-default plugin sourcing, enforced managed settings, and an audit trail |
| **Engineering management** | Telemetry, read against a pre-rollout baseline, that turns prompts, successes, and failures into owned, re-measured improvements to specs, agents, prompts, skills, instruction files, the constitution, memory, gates and deterministic controls, model-tier bindings, and training |

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
  │      over the same repo artifacts learners just created                │
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

Copilot Code Review is optional at `qa-review`: the shipped stage doesn't call it, and it
isn't a managed-settings client (A.4).

### Provenance — one key, durable approvals

Every unit carries one **correlation key** naming the feature, stage, task and run. It travels
in the task-as-prompt and the gh-aw stage events (U4), the OTel resource attributes (U5) and
the U6 audit comment, riding on the stage signal U4 already plans. This epic states the
requirement, not the mechanism; feature-spec and plan choose the mechanism.

- Each gate's **approval of record** is a durable GitHub artifact, such as a `CODEOWNERS` PR
  review or a comment carrying the run ID, verdict, approver and artifact SHA. Spec Kit's gate
  is a local pause that records no approver (A.4).
- The `epic` and `feature-spec` stages run in the GitHub Copilot app, which emits no client
  OTel, so their history comes from durable artifacts, not spans.
- The test is a success criterion: one feature's stage history, approvals and versions can be
  reconstructed from durable artifacts without re-running anything.

*Book: Architectural Patterns: A Rosetta Stone (Recovery and observability layer: the Lockfile,
Agent Stack Trace and Audit Trail "travel together"); Primitives as Code; The Reference
Architecture, Earned.*

---

## Scope

**In scope**

- `docs/enterprise-harness-blueprint.md` — the executive-facing blueprint (U0)
- Labs 21–26 (`labs/lab21.md` … `labs/lab26.md`) — the hands-on arc (U1–U6)
- A runnable enterprise plugin bundle following the `plugin-template/` conventions
- A runnable Spec Kit preset + extension + workflow overlay + bundle
- gh-aw workflows for the notification funnel
- An OpenTelemetry collector configuration, deployable Bicep for the Azure sink, **and**
  an offline simulator path requiring no Azure subscription
- A KQL query pack and Workbook definition for the reporting surface
- A project-scoped GitHub Copilot App canvas extension that makes the harness actionable
  against this repository's issues, PRs, checks, and ContosoUniversity code structure
- Registry, README, and `labs/setup.md` wiring so the new labs satisfy existing CI gates

**Out of scope**

- Deploying anything into a live customer tenant or subscription
- Replacing Labs 11, 16, 17, 18, 19, or 20 — this arc *builds on* them and links back
- A production-grade OTel collector deployment (the lab ships a reference config, not an SRE-owned service)
- Any first-party GitHub→Azure connector (none exists; see Appendix A)
- Non-Azure observability backends (Datadog, Splunk, etc. are named as alternatives only)
- Teaching new ContosoUniversity product features — the arc is about the *harness*. Lab 26
  may inspect the ContosoUniversity solution and tests as realistic canvas data, but it
  must not turn into an application-feature lab.

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
- [ ] **Rollout on two axes.** *Unit order* maps U1–U6 with the dependency order. *Adoption
      cohorts* run phase 0 (inventory, a repo instrumentation audit, the baseline), then a
      pilot with one or two *representative* teams, then expand, then scale. Each phase names
      its exit evidence (measured against the baseline), its rollback triggers and who calls
      the gate, and the programme has a kill criterion. States plainly that lab order is not
      rollout order, and names a minimum viable harness.
      *Book: Planning the Transition; The Business Case; The Agentic SDLC Reference
      Architecture; What Comes Next.*
- [ ] **Pilots the lockdown per enterprise team.** With a server-managed deployment,
      `strictKnownMarketplaces`, `extraKnownMarketplaces`, `model`, `autoTier`, the
      `permissions.*` keys, the MCP allow/deny lists and `sandbox` can be marked `overridable`
      and set in `copilot/teams/*.json`, and `enabledPlugins` is additive per team. States the
      limits: a user in several teams gets the least restrictive value, `telemetry` can't vary
      per team, and other deployment methods have no team overrides (A.4).
- [ ] **Measuring value.** Commits to success criteria before the pilot and takes two
      baselines. PR history and the metrics reports API baseline delivery before agents;
      switching on client OTel first (U5 depends only on the registry scaffolding) baselines
      agent use before the rest of the harness lands. No headcount framing: telemetry is aimed
      at artifacts, not people, and because spans carry `enduser.pseudo.id` (A.4), the
      blueprint says how reports avoid per-person views.
      *Book: The Business Case; Planning the Transition.*
- [ ] **Cost.** A cost-driver section covering Copilot premium requests/AI credits, Log
      Analytics ingestion and retention, and the table-plan decision, plus people time and
      upkeep, described qualitatively. Maps the levers (model tier, token use, harness choice),
      names a budget owner, an alert and a review cadence, and gives each workflow a cost card.
      States that the blueprint does not establish ROI.
      *Book: The Agentic SDLC Bill; The Business Case; What Comes Next.*
- [ ] Names the two requirements that are **not** natively supported (per-task agent/model
      binding; hard stage-order enforcement in chat) and shows the DIY shape for each. The
      stage-order shape is a merge-time ruleset — a required check plus QA code-owner
      approval — and the blueprint says plainly that it enforces completeness at merge, not
      order in chat. A **gate matrix** gives, for each gate, the failure mode it catches and
      the one it misses.
      *Book: The Deterministic/Probabilistic Boundary; Governance for AI-Assisted Delivery.*
- [ ] **Workload triage.** Defines a full path, a sanctioned light lane and a no-agent path,
      and evaluates Spec Kit's `bugfix` workflow as the light lane. That workflow runs assess →
      review gate → fix → test, for defects only, with no QA gate, and `qa-review` won't run
      on it unmodified because it needs a feature's `tasks.md` (A.4). Whether it fits is a
      design call. *Book: What Comes Next (When NOT to Use Agentic Workflows); Anti-Patterns
      and Failure Modes (Team-Level Anti-Patterns: cargo-culting complexity).*
- [ ] **Boundaries.** Lifecycle coverage is Intent → Review plus a dry-run Release; Deploy
      and Operate are out of scope. The governance perimeter is stated per surface (A.4):
      plugin and marketplace keys apply on Copilot CLI, VS Code, the Copilot app, cloud agent
      and JetBrains, `telemetry` on CLI and VS Code, and Copilot Code Review isn't a
      managed-settings client. Portability: `SKILL.md` files and Spec Kit artifacts are
      portable; the marketplace and managed settings are GitHub-specific.
- [ ] **Owners.** An asset → owner table, a short-lived enablement role, a skill-atrophy risk,
      and a fallback for when an agent or model is unavailable.
      *Book: Team Structures for AI-Augmented Delivery; Governance for AI-Assisted Delivery.*
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
**So that** a new developer gets our mandated agents and skills with one install, not a wiki page.

> *— corrected by #66. The original "productive on our golden path with one install"
> over-promised: repo-specific knowledge (repo instructions, AGENTS.md) stays repo-owned and
> doesn't travel in the plugin.*

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
- [ ] **Least privilege.** Every bundled agent declares a `tools:` list with no wildcards
      (omitting `tools:` grants every tool; A.4), and a test asserts it. The QA agent keeps the
      shell it needs for behavioural evidence; its only write is its verdict file, enforced
      mechanically rather than by prose.
      *Book: The PROSE Constraints (S — Safety Boundaries); Anti-Patterns and Failure Modes
      (The Unbounded Agent).*
- [ ] **Lockdown vs Spec Kit dispatch.** Spec Kit's `--commands` dispatch runs every workflow
      step with `--yolo` unless `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0` (A.4). The lab mandates
      `permissions.disableBypassPermissionsMode` only after a test shows that dispatch
      survives it (A.3 item 7).
- [ ] **Pilot path.** Teaches per-team overrides as the way to pilot the lockdown, including
      the least-restrictive merge (U0; A.4).
- [ ] **Supply chain.** Bundled MCP servers are pinned (`plugin-template/manifest.yaml` ships
      `pin: latest`), `release.yml` scans for invisible and bidirectional Unicode, and the lab
      explains the lockdown in the book's terms: installing a primitive is executing it.
      *Book: Anti-Patterns and Failure Modes (File Presence Is Execution).*
- [ ] **Load modes.** A table gives each bundled primitive's load mode: eager preload, lazy
      on-demand (skills) or dispatcher-mediated (agents). Rules that must always apply don't go
      in auto-activated skills. A binding check runs, and the bundle stays small enough to read
      in an afternoon. *Book: The Load Lifecycle; What Comes Next (The Starter Shape).*
- [ ] **Channel ownership.** Spec Kit owns the stage commands and templates (U2, U3). The
      bundle's agents reference them rather than restating the QA rubric.
- [ ] **Behavioural eval** for at least the QA agent, reusing the repo's `eval-harness`
      conventions; manifest and dry-run tests only prove shape.
      *Book: The Reference Architecture, Earned (What makes the recursion governable).*
- [ ] **Per-surface table** for Copilot CLI, VS Code, the Copilot app, cloud agent and
      JetBrains: which governed primitives load and which managed-settings keys apply (A.4).
      Lab 11's "VS Code and Copilot CLI today" line and its five-key list are corrected to
      match Lab 16 and the registry.
- [ ] **What the plugin can't carry.** Repo-specific knowledge stays repo-owned; the lab links
      Labs 2 and 10, after checking whether a plugin can carry instructions at all (the CLI
      command reference mentions "plugin-contributed instructions"). What's in use is
      inventoried before the lockdown, and new requests arrive as a PR to the marketplace
      repo, reviewed through `CODEOWNERS`.
- [ ] **Overrides, versioning, rollback.** States that same-name repo agents and skills can
      shadow mandated ones, once the documented precedence is checked. Rewording an agent's or
      skill's description is a major version, a bad mandated release has a rollback path, and
      the bundle version is stamped where U5 and U6 can read it.
      *Book: Primitives as Code (Versioning: the description is the API).*

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
- [ ] Lab pins the Spec Kit release via `docs/_meta/registry.yaml` (`spec_kit_version`), not a
      hardcoded string — the registry is the single source of truth, and it currently reads
      **`1.0.12`** (`spec_kit_version_last_verified: 2026-09-28`).
      *— corrected by #51, re-verified by #52: this criterion hardcoded `v1.0.8`, four releases
      behind, in the very line that forbids hardcoding. See `docs/_meta/registry.yaml`.*
- [ ] Uses `specify init <project> --integration copilot` — **never** the removed `--ai` flag.
- [ ] Correctly tells learners that Copilot gets **skills** by default
      (`.github/skills/speckit-<command>/SKILL.md`), and presents the invocation **by surface**
      rather than asserting one universal form: on the **skills** layout `/speckit-<command>`
      (hyphen) is a **VS Code chat** command and does not exist in Copilot CLI, where skills are
      model-invoked; on the **`--commands`** layout (`.github/agents/speckit.<command>.agent.md`
      + `.github/prompts/speckit.<command>.prompt.md`) there is **no slash form at all** —
      dispatch is `--agent speckit.<command>`. Both layouts register `requires_cli: False`.
      Because this arc's learners are in Copilot CLI, the lab **steers them to `--commands`**
      instead of casting it as a mere opt-in.
      *— corrected by #51 and #52; see `EPIC-001-52-lab23-spec.md` §6/D10, verified at
      `integrations/copilot/__init__.py` L335, L342, L360 @ `v1.0.12`.*
- [ ] Ships an **org preset** customizing `spec-template.md`, `plan-template.md`, and
      `tasks-template.md`, demonstrating at least one non-`replace` composition strategy
      (`wrap` with `{CORE_TEMPLATE}`, `prepend`, or `append`).
- [ ] Ships a **`bundle.yml`** pinning preset + extension + workflow as one versioned install.
- [ ] Demonstrates the **org catalog**: `.specify/preset-catalogs.yml` with
      `install_allowed: true` for the org catalog, and shows the community catalog as
      **discovery-only** — framed as a deliberate supply-chain control, not an obstacle.
- [ ] Documents the resolution stack (overrides → presets → extensions → core, each file
      resolving independently) and shows `specify preset resolve <name>` for debugging.
      States that a preset is a default, not enforcement: a project-local override wins, so CI
      detects overrides with `specify preset resolve`. *— added by #66.*
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

> *— qualified by #66. Spec Kit's gate is a **local pause** that records no approver identity:
> its output records the gate's `message`, `options`, `on_reject` and `show_file` and the
> `choice` made, but nothing about who made it (A.4). "The right person" is established by
> U4's durable approval of record.*

**US-3.3**
**As any** stage owner
**I want** a rejected artifact to stop the run at the gate and resume cleanly once it is fixed
**So that** rework is an explicit, visible state rather than something patched around.

> *— corrected by #52. The original wording — "rework to be a **first-class path**" —
> overstates the tool. `on_reject` is `abort` | `skip` | `retry`, and **no backward jump
> exists**: `retry` pauses **on the gate**, it does not re-run the upstream stage. The real
> mechanism is pause-and-resume. See `EPIC-001-52-lab23-spec.md` §6/D4 and §1.3.*

**Acceptance Criteria**
- [ ] An `extension.yml` declares `speckit.<org>.epic` and `speckit.<org>.qa-review` under
      `provides.commands`, each shipping its own template, and a script **where the command
      genuinely needs one** — `epic` ships `create-epic`; `qa-review` ships none, because it
      locates the feature with core's `check-prerequisites`.
      *— corrected by #52; see `EPIC-001-52-lab23-spec.md` §6/D12. Inventing a `qa-review`
      script so the count matched would ship a wrapper that adds nothing.*
- [ ] A **workflow overlay** (`extends:` the base `speckit` workflow) uses `insert_after`
      to place the custom stages and `type: gate` steps with `on_reject` to enforce approval.
- [ ] The overlay lives under `.specify/workflows/overlays/<workflow_id>/` — where
      `<workflow_id>` is the **extended** workflow's id (`speckit`), **not the overlay's own** —
      so it survives `specify workflow add` and `bundle update`.
      *— corrected by #52; see `EPIC-001-52-lab23-spec.md` §6/D2. `ProjectOverlaySource` scans
      `overlays/<workflow_id>/` and raises if `overlay.extends != workflow_id`; read the other
      way, the overlay lands in a directory Spec Kit never scans and silently never loads.*
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
- [ ] Lab states that the gate is a local pause with no approver identity and points to
      Lab 24's durable approval of record. *— added by #66.*
- [ ] Lab §23.6 cautions that spec edits made out of band after a QA reject don't re-pass
      `review-spec` or `review-plan`. *— added by #66.*
- [ ] `qa-review` accepts a file and line only for *structural* criteria. A *behavioural*
      criterion needs a command that ran plus its observed output, or a test that asserts the
      behaviour; otherwise it is `unverified`. *— added by #66. Book: case study "The APM
      Auth + Logging Overhaul".*
- [ ] The epic template and the `epic` command say each Acceptance signal flows into the
      acceptance criteria of the spec that delivers it. `qa-review` reads the spec, never the
      epic: it rejects on any unmet or unverified criterion, so epic-level signals would reject
      every partial feature. *— added by #66.*

---

### U4 — The funnel and executable tasks (Lab 24)

**Artifacts:** `labs/lab24.md`, gh-aw notification workflows, a task-prompt preset, and the
`contoso-sdlc` workflow that Labs 22 and 23 say Lab 24 ships

**US-4.1**
**As a** stakeholder
**I want** to be notified when it is my turn
**So that** work does not stall waiting for someone who does not know they are up.

**US-4.2**
**As an** individual contributor
**I want** my task to arrive as an executable prompt with the agent and model already chosen
**So that** my job is reviewing the result and handling escalations, not deciding how to prompt.

> *— corrected by #66. "Keeping the work on the rails" implied steering mid-session, which the
> book treats as a sign the task was mis-scoped. Book: The PROSE Constraints (R — Reduced
> Scope).*

**US-4.3**
**As a** business user
**I want** to author a spec conversationally in the GitHub Copilot app
**So that** I can contribute to the SDLC without a local dev environment.

**Acceptance Criteria**
- [ ] Uses Spec Kit's `taskstoissues` to project tasks into GitHub Issues, and documents its
      prerequisites (an `origin` remote and the GitHub MCP server).
- [ ] Chooses a durable, cross-machine **stage signal** for the funnel to trigger on (Spec Kit
      state is machine-local and gitignored, so it can't be the trigger), and carries the
      correlation key on it (Provenance). *— caught up with #53 by #66.*
- [ ] gh-aw workflow(s) route notification on stage transition — assignment, `CODEOWNERS`
      review request, and Project status — following the existing `generate-prd.md` and
      `weekly-content-audit.md` safe-outputs patterns in this repo. Routing is computed from
      the role table plus `CODEOWNERS`, not chosen by the agent; every write is a safe-output
      with `allowed:`/`max:`, and the workshop path runs with `staged: true` (A.4; confirm
      against the pinned gh-aw, A.3 item 8). *Book: The Deterministic/Probabilistic Boundary.*
- [ ] Defines the **task-as-prompt** format: an objective with a single deliverable that passes
      a sizing test; context passed as files or links, run in a fresh session; constraints and
      a do-not-modify list; owned files; the agent, which must exist in the U1 manifest; a
      registry model tier (`models:`) plus a fallback, never a model string; a **runnable**
      acceptance check (command plus expected result); `execution: agent | split | human`;
      an escalation ladder with a retry budget and a stop rule; and the correlation key
      (Provenance).
      *Book: The PROSE Constraints (R — Reduced Scope; S — Safety Boundaries); Multi-Agent
      Orchestration (Concrete Dispatch; The Escalation Protocol); The Execution Meta-Process
      (The Self-Sufficiency Test).*
- [ ] A deterministic **validator** runs in CI on the PR that changes `tasks.md`, before
      `taskstoissues`: fields present, agent exists, tier valid, links resolve. On failure it
      rejects; it doesn't re-prompt.
- [ ] **Honest-caveat requirement:** the lab states that **per-task agent/model metadata is
      not native to Spec Kit** — there is no such field in the task template or format spec.
      The lab ships this as an org preset extending the task template, and labels it DIY.
- [ ] Preserves the native task format (`[ID] [P] [Story]`, phase grouping, checkpoints) so
      the org extension composes with core rather than replacing it.
- [ ] Documents the rework routing: which stage owner is notified when QA rejects, and how
      the task is rewritten rather than silently re-run. Each rejection is classified:
      implementation-only issues resume at QA, and spec or scope changes go back through
      `review-spec`/`review-plan`, with a cap on rounds. A rewritten task gets a new task ID
      and supersedes the old issue, because `taskstoissues` skips any ID already in an open
      **or closed** issue title (A.4).
- [ ] Records a durable **approval of record** for each gate and counts rejects from it,
      because Spec Kit's run state can't (A.4). Ships a seeded fixture in which QA **rejects**.
- [ ] **QA independence.** Teaches that workflow steps already run as fresh
      `copilot -p --agent` processes, and that invoking QA directly in chat loses this. QA's
      inputs are spec + diff + tasks, never the implementer's summary. Adds a `tools:` list to
      `qa-review` once U1's lockdown test (A.3 item 7) shows how it interacts with `--yolo`.
      *Book: case study "The APM Auth + Logging Overhaul"; Anti-Patterns and Failure Modes
      (The Trust Fall; Hallucinated Edits).*
- [ ] Ships the `contoso-sdlc` workflow that Labs 22 and 23 reference, with an optional
      `review-tasks` gate before implement. *Book: The Execution Meta-Process.*
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
**So that** we can decide what to improve — a spec template, an agent, a prompt, a skill, an
instruction file, the constitution, memory, a gate, a model-tier binding, or training — and
confirm that it improved.

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
- [ ] **Correlation key and versions.** The correlation key (Provenance) and the bundle or
      preset version travel as resource attributes. Managed OTel settings can't be
      overridden, and no page says whether a per-session `OTEL_RESOURCE_ATTRIBUTES` survives
      the managed `resourceAttributes`, so the lab tests that with the file exporter before
      encoding a per-session key (A.3 item 6). Spans already carry `gen_ai.agent.name` and
      `gen_ai.agent.version`, a native stage proxy for steps dispatched with `--agent` (A.4).
- [ ] **Stage and rework events** — what delivers the diagram's "stage transitions". Stage
      dwell time comes from Spec Kit's `log.jsonl`, whose `step_started`/`step_completed`
      entries are timestamped. Rejects are counted from U4's approval of record (or a
      committed `qa-review.md` per round), not from Spec Kit run state (A.4). These are
      org-emitted events, labelled *You build this*. *— caught up with #54 by #66.*
- [ ] **Outcome queries.** The KQL pack includes QA reject/rework rate, stage dwell time and
      escalations per task, with a baseline window and a before/after view. Activity metrics
      are labelled as activity, not outcome. *Book: The Business Case; Planning the Transition.*
- [ ] **Cost per task** at p50 and p95, with a `ScheduledQueryRules` alert.
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
- [ ] Recommendations must name a target — a spec template, an agent, a prompt, a skill, an
      instruction file or AGENTS.md, the constitution, memory, a gate or deterministic control
      (hook, required check, safe-output allowlist, managed setting), a model-tier binding, or
      a training topic — closing back to U1–U4. Each names an owner and closes only when it is
      re-measured.
      *Book: The Deterministic/Probabilistic Boundary; Anti-Patterns and Failure Modes
      (Team-Level Anti-Patterns: missing policy encoding); The Instrumented Codebase (The
      Feedback Loop).*
- [ ] The interpreting agent receives KQL aggregates. If it must read captured prompt text,
      that text is treated as untrusted input.
      *Book: Anti-Patterns and Failure Modes (Prompt Injection via Dependencies).*
- [ ] A **recurring review mechanism** (a scheduled gh-aw workflow) makes the "regular report"
      in US-5.2 a mechanism, not an aspiration. *— caught up with #54 by #66.*

---

### U6 — GitHub Copilot App canvases for applied SDLC operations (Lab 26)

**Artifacts:** `labs/lab26.md`, `.github/extensions/enterprise-sdlc-workbench/`

The practical operator surface for the harness: an SDLC board, code-aware workbench, and
release/handoff composer implemented around this repository's own artifacts.

**US-6.1**
**As a** tech lead or scrum master
**I want** a GitHub Copilot App canvas that shows the epic, child issues, task status, linked
PRs, checks, and handoff state
**So that** I can drive the SDLC from the same governed artifacts that agents act on.

**US-6.2**
**As a** developer
**I want** the canvas to connect a selected issue or task to the relevant
ContosoUniversity projects, tests, and repo-local agent presets
**So that** assignment is grounded in real code context instead of a generic prompt.

**US-6.3**
**As a** release or enablement lead
**I want** the canvas to compose a reviewable lab-release or handoff note from completed
issues and merged PRs
**So that** the final artifact is explainable before anything is published or announced.

**Acceptance Criteria**
- [ ] Lab is explicitly a **GitHub Copilot App canvas** lab and states the prerequisite:
      learners need the GitHub Copilot App installed, an authenticated GitHub account with
      Copilot access, a connected local clone of this repository, a Copilot App/CLI version
      with canvas support, and permission to load project-scoped extensions.
- [ ] Lab links to the official Copilot App quickstart / download path
      (`https://docs.github.com/en/copilot/get-started/quickstart-copilot-app`) and walks
      learners through downloading, installing, opening the app, signing in to GitHub or
      GitHub Enterprise, connecting this repository, and confirming the app can load project
      extensions before starting the canvas exercise.
- [ ] Lab names the fallback for learners without Copilot App canvas support: read the
      extension contract and run the non-UI validation only.
- [ ] Ships one project-scoped extension under `.github/extensions/enterprise-sdlc-workbench/`
      with a primary SDLC board view. Additional code-map and release-composer views may be
      prebuilt reference views, but the learner builds or modifies one end-to-end canvas path.
- [ ] SDLC board uses GitHub Issues as the source of truth, including the EPIC-001 parent
      issue, child issues, labels/status, dependencies, linked PRs, check status, and recent
      workflow runs. It must support fixture or dry-run mode so workshop learners do not
      spam shared repo issues.
- [ ] Assignment/dispatch is **dry-run by default**. When enabled against a real issue, it
      writes an idempotent audit comment with the shared correlation key (Provenance), the
      selected repo-local or enterprise agent preset and its preset or bundle version,
      execution location, and timestamp; it does **not** create the project session itself.
- [ ] Code-aware view is based on this repository's actual .NET solution structure
      (`dotnet/ContosoUniversity.sln`, projects, tests, and recent validation output), not a
      copied NestJS/React sample. Missing local prerequisites (`dotnet`, Docker, `gh`, auth)
      produce clear degraded-state tiles instead of canvas failure.
- [ ] Release/handoff composer drafts markdown from completed issues and merged PRs and saves
      a reviewable artifact under `docs/releases/` or a lab-specific handoff path. Publishing
      a GitHub Release, posting comments, or mutating issue state is an explicit opt-in step,
      never the default lab path.
- [ ] The lab explains the canvas trust boundary: `gh`, `git`, and `dotnet` calls run in the
      extension host; credentials and tokens never enter the iframe; all repo/issue data shown
      in the iframe is treated as untrusted display data.
- [ ] Includes validation: extension manifest/schema checks, a dry-run data fixture, and
      `extensions_manage inspect` / reload troubleshooting guidance. Existing tests must be
      extended so the canvas extension does not silently rot.
- [ ] Lab 26 cross-links to Lab 23 for stage/gate semantics, Lab 24 for task-as-prompt and
      issue projection, and Lab 25 for telemetry and the shared correlation key.
- [ ] The lab ends with a "back at work" checklist mapped to U0's adoption phases.
      *— added by #66.*

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

- `labs/lab20.md` currently ends **"Lab series complete."** — must chain to Lab 21, and
  Lab 25 must chain forward to Lab 26.
- `README.md` Lab Modules table needs six new rows; the **"Total: ~7 hours (20 labs…)"**
  line and the learning-path note both need updating.
- `labs/setup.md` needs the new arc described alongside the existing 15–20 modernization track.
- New registry keys: **`spec_kit_version`** (read the value from `docs/_meta/registry.yaml`;
  this line pinned `"1.0.8"` until #66) and an Azure Monitor block carrying resource API
  versions, so no lab hardcodes a version.
- New canvas registry key: a Copilot App / Copilot CLI canvas-support version floor, so Lab 26
  does not hardcode an extension API expectation.
- Pacing: six labs at roughly 25–40 self-paced minutes each adds about 3 hours. Verified
  2026-09-17: the registry's 20 `pace_self_minutes` values sum to **440 minutes (~7.3 h)**, so
  the arc lands the suite at roughly **620 minutes (~10.5 hours)**. README's "~7 hours" becomes
  **"~10.5 hours"**, not a rounding tweak. This is a deliberate curriculum decision to record,
  not a number to let drift.
- **Workshop ceiling (not yet addressed by this epic — needs a decision).**
  `tests/workshop/time-budget.test.ts` asserts `total_minutes = 240` across modules **M1–M6**,
  checked against `workshop/curriculum.md`. Six new labs cannot enter the 4-hour workshop
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
| R1 | **Spec Kit release velocity** — 9 releases in the 4 weeks to 2026-09-17; v1.0.8 shipped the day this epic was researched | Lab drifts mid-cohort | Pin `spec_kit_version` in the registry; add a re-verification obligation; the weekly content audit's check 8 already compares the pin with the latest release (report-only) |
| R2 | **Preview gating is narrower than "GHEC"** — prompt-carrying usage records require EMU or data residency | A standard GHEC tenant cannot complete that path | Lead with OTel `captureContent`, which has no such gate; present usage records as the alternative with its gating stated up front |
| R3 | **`captureContent` sends prompts and responses to your sink** | Source code and prompts leave the client; data-residency and privacy exposure | Treat as a governance decision with a named approver; pair with `lockCaptureContent`; make the default-off behavior explicit |
| R4 | **Log Analytics cost and table-plan traps** | A cheap plan silently breaks the reporting module | Mandate the Analytics plan for the query pack; document that sub-31-day retention saves nothing and that deleting a table does not stop retention charges |
| R5 | **No first-party GitHub→Azure connector exists** | Every path needs glue the org writes | Budget for the collector/forwarder explicitly in U0; do not imply a wizard exists |
| R6 | **Two brief requirements are not native** (per-task agent/model binding; chat-time order enforcement) | Credibility loss if oversold | Ship both as labelled DIY extensions with the caveat stated in the lab body and the blueprint ledger |
| R7 | **No official GitHub docs for Spec Kit** (0 hits on docs.github.com) | Enterprise reviewers may question maturity | Cite `github.github.com/spec-kit` and the repo; state the documentation position honestly |
| R8 | **Azure regional and cloud limits** — Azure Copilot unavailable in Gov/21Vianet; SRE Agent in three regions | Blueprint may not apply to sovereign-cloud customers | Record constraints in U0; keep the AI-review step backend-agnostic (KQL first, agent second) |
| R9 | **Arc length pushes the suite past its "~7 hours" framing** | Curriculum and workshop timing drift | Treat as an explicit decision; update README and pacing in the same PR |
| R10 | **Copilot App canvas APIs and local extension host behavior are still moving** | Lab 26 can rot faster than markdown-only labs | Pin a canvas-support version floor in the registry, validate extension shape in tests, include `extensions_manage inspect` troubleshooting, and keep mutating actions dry-run by default |

**Dependencies:** Labs 11, 16, 17, 18, 19, 20 (built on and linked); `plugin-template/`;
`modernization-bundle/`; `docs/_meta/registry.yaml`; the existing gh-aw workflow patterns;
and the project-scoped canvas extension surface.

---

## Success criteria

- [ ] `docs/enterprise-harness-blueprint.md` exists and carries a dated, cited native-vs-DIY ledger.
- [ ] Labs 21–26 exist, are wired into the registry, README, and `labs/setup.md`, and Lab 20 chains forward.
- [ ] `npm test` (or `make test`) is green, including all lab-structure, enumeration-parity, and link-resolution gates.
- [ ] `node enterprise-harness-bundle/scripts/install.mjs` reports `ok=true`.
- [ ] The Spec Kit bundle installs and `specify workflow run` executes the custom stage
      sequence including at least one gate.
- [ ] Lab 25 completes end-to-end **without an Azure subscription** via the offline path.
- [ ] Lab 26 completes its dry-run canvas path without mutating shared GitHub issue or release state.
- [ ] The Bicep deploys cleanly for learners who do have a subscription.
- [ ] Every honest caveat in U0–U6 appears in the shipped content — a reviewer can find each
      one by searching the lab text.
- [ ] No lab hardcodes a version that belongs in `docs/_meta/registry.yaml`.
- [ ] One feature's full stage history — its stages, approvals of record, and agent, skill and
      bundle versions — can be reconstructed from durable artifacts without re-running
      anything. *— added by #66.*
- [ ] Lab 25's offline fixture shows at least one outcome metric (for example QA reject rate or
      stage dwell time) before and after a change. *— added by #66.*
- [ ] Every bundled agent declares a least-privilege `tools:` list, and the QA agent has a
      behavioural eval. *— added by #66.*

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
| 8 | Lab 26 — GitHub Copilot App canvases for applied SDLC operations (U6) | 6 | `labs/lab26.md`, `.github/extensions/enterprise-sdlc-workbench/` |
| 9 | Integration — README, setup.md, Lab 20/Lab 25 chaining, full suite green | 2–8 | Wiring + passing CI |

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

Kept as the 2026-09-17 record. The registry now pins a later release; facts read from the
v1.0.12 source on 2026-10-01 are in [A.4](#a4-additions-verified-2026-10-01).

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
| Copilot client OpenTelemetry export | **Supported product (GA)** | The real answer; CLI + VS Code. *2026-10-01: the docs' support table also ticks JetBrains for `telemetry`, while the key's own text names CLI and VS Code (A.4)* |
| Client OTel for the **GitHub Copilot app** | **Not covered by managed settings** | The `telemetry` key is documented as supported for **Copilot CLI and VS Code** only. The `epic` and `feature-spec` stages run in the Copilot app, so those two stages emit **no client OTel**. State the gap; do not imply full coverage. *2026-10-01: the app is a managed-settings client for the plugin and marketplace keys, but not for `telemetry`, so this gap stands (A.4)* |
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
5. **Copilot App canvas extension surface** — before implementing Lab 26, re-check the
   current project-scoped extension manifest shape, canvas open/action schemas, reload and
   inspect workflow, and any documented local extension-host trust-boundary requirements.
6. **Per-session resource attributes under managed OTel — open (#66 Q1).** Managed OTel
   settings "cannot be overridden", and the CLI command reference lists
   `OTEL_RESOURCE_ATTRIBUTES` as "Extra resource attributes"; neither page says how the two
   merge. Test it with file-based managed settings, the file exporter and the env var, then
   inspect the JSON-lines, before U5 encodes a per-session key. Tracked in #54.
7. **`permissions.disableBypassPermissionsMode` vs Spec Kit's `--yolo` dispatch — open
   (#66 Q8).** Test whether the managed key breaks `specify workflow run` before U1 mandates
   it. Tracked in #50; U4's `tools:` change to `qa-review` waits on the result.
8. **gh-aw safe-outputs at the pinned version.** `staged: true` and `allowed:`/`max:` on
   `assign-to-user` were read in the current gh-aw docs on 2026-10-01, not checked against
   the registry's pinned `gh_aw_schema_version`. Confirm them before U4 relies on them;
   tracked in #53.

### A.4 Additions verified 2026-10-01

Verified for #66. Spec Kit rows come from reading the v1.0.12 source by tag, not from running
it; the docs pages were read on 2026-10-01. A.1–A.3 stay as the 2026-09-17 record.

| Capability | Status | Source and note |
|---|---|---|
| Approver identity at a Spec Kit gate | **Does not exist** | The gate's output records its `message`, `options`, `on_reject` and `show_file`, the `choice` made, and an `aborted` flag when an `abort` rejection fails the run — nothing about who chose (`src/specify_cli/workflows/step/gate/__init__.py`). A verdict can also be bound from a workflow input, still without identity. The gate is a local pause; the approval of record is a durable GitHub artifact (see Provenance) |
| Stage timing from Spec Kit run state | **Supported product** | Every `log.jsonl` entry is timestamped, with `step_started` and `step_completed` per step (`src/specify_cli/workflows/engine.py`) |
| Counting QA rejects from Spec Kit run state | **Not possible** | A reject-and-retry and a pause both log `paused`, and the gate's `choice` lives only in `state.json`, overwritten on each run (`src/specify_cli/workflows/engine.py`) |
| Permissions in `--commands` dispatch | **Supported product, permissive by default** | Each step runs `copilot -p … --agent speckit.<stem> --yolo` unless `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0` (`src/specify_cli/integrations/copilot/__init__.py`). Interaction with `disableBypassPermissionsMode`: A.3 item 7 |
| `tools:` in generated `--commands` agents | **Supported product** | Frontmatter `tools:` survives into the generated agent, and core `templates/commands/taskstoissues.md` already ships one. Its interaction with `--yolo` is untested |
| `taskstoissues` duplicate check | **Supported product, weak-form** | Skips a task whose ID matches `\bT\d{3,}\b` in an open **or closed** issue title; the agent applies the check by following the prompt (`templates/commands/taskstoissues.md`) |
| `bugfix` workflow | **Supported product** | assess → review gate → fix → test; defects only; no QA gate (`workflows/bugfix/workflow.yml`) |
| Custom agent `tools:` | **Supported product** | Omitting `tools:` grants every tool; `tools: []` disables all ([Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)) |
| Managed-settings clients | **Supported product, per key** | Plugin and marketplace keys: Copilot CLI, VS Code, the Copilot app, cloud agent, JetBrains. `telemetry`: CLI and VS Code per the key's own text; the support table also ticks JetBrains. Copilot Code Review isn't a managed-settings client ([Enterprise managed settings](https://docs.github.com/en/enterprise-cloud@latest/copilot/reference/enterprise-administrators/enterprise-managed-settings)) |
| Per-team overrides of managed settings | **Supported product, server-managed only** | Keys marked `overridable` — `model`, `autoTier`, the `permissions.*` keys, `allowedMcpServers`, `deniedMcpServers`, `extraKnownMarketplaces`, `strictKnownMarketplaces`, `sandbox` — can be set per enterprise team in `copilot/teams/*.json`, mapped by `copilot/team-mappings.json`; `enabledPlugins` is additive. A user in several teams gets the least restrictive value; `telemetry` isn't overridable; other deployment methods have no team overrides ([Overriding enterprise-managed settings for teams](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/manage-for-enterprise/use-managed-settings/override-settings-for-teams)) |
| Agent and user identity on spans | **Supported product** | `gen_ai.agent.name` ("when available"), `gen_ai.agent.version` ("when known") and `enduser.pseudo.id`, a pseudonymous user ID ("when available") ([CLI command reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)) |
| gh-aw staged safe-outputs and assignment limits | **Documented; unchecked at the pinned version** | `staged: true` globally or per output type; `assign-to-user` takes `allowed:` and `max:` ([Safe Outputs](https://github.github.com/gh-aw/reference/safe-outputs/)). See A.3 item 8 |

---

## Handoff

Implementation of U0–U6 is **not** part of this epic's authoring task. The next session
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

> **2026-10-01 revision (#66).** Criteria added or corrected against *The Agentic SDLC
> Handbook* v0.11.0 carry a *Book:* note or a "#66" marker. The product facts verified that
> day are in A.4, and the questions still open are A.3 items 6–8. #66 records the review
> behind them.
