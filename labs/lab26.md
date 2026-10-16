---
title: "Copilot App Canvases for Applied SDLC Operations"
lab_number: 26
pace:
  presenter_minutes: 7
  self_paced_minutes: 35
registry: docs/_meta/registry.yaml
---

# 26 — Copilot App Canvases for Applied SDLC Operations

Every earlier lab drove Copilot from a terminal or an editor chat pane.
This lab drives it from a **canvas** — an interactive side-panel surface the
GitHub Copilot App can render inside a session, backed by a small HTTP
server the extension hosts itself. You'll install a project-scoped canvas
extension, open three canvases that visualize this repo's own EPIC-001
tracking issues and the ContosoUniversity `.sln`, and make a real, checkable
change to one of them.

> ⏱️ Presenter pace: 7 minutes | Self-paced: 35 minutes

> 💡 **Why canvases, not just chat:** a chat reply is read once and
> discarded. A canvas stays open, re-renders as state changes, and lets a
> learner (or a reviewer) keep a board, a dependency map, or a draft
> document visible *while* the agent keeps working — the same reason a
> human SDLC dashboard is a persistent tab, not a Slack message.

References:
- [EPIC-001 — Enterprise Agentic SDLC Harness](../docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md) — the shared architecture and Provenance contract
- [Lab 23 — Custom SDLC Stages, Gates & the Rework Loop](lab23.md) — stage and gate semantics
- [Lab 24 — The Notification Funnel & Executable Tasks](lab24.md) — task-as-prompt and issue projection
- [Lab 25 — Telemetry, Log Analytics & the Improvement Loop](lab25.md) — telemetry and correlation-key propagation
- [`.github/extensions/enterprise-sdlc-workbench/README.md`](../.github/extensions/enterprise-sdlc-workbench/README.md) — the extension's own trust-boundary and scope doc
- [`tests/extensions/enterprise-sdlc-workbench.test.ts`](../tests/extensions/enterprise-sdlc-workbench.test.ts) — the no-SDK-required test suite you'll run in §26.7
- EPIC-001 tracking issues this lab visualizes (real, frozen fixture snapshot — see §26.3): [#47](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/47) (epic), [#53](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/53), [#55](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/55), [#59](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/59) (this lab's own issue), [#66](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/66)
- [Lab 09 — Copilot Coding Agent & Code Review](lab09.md) — the issue → PR flow this lab's dispatch action feeds into
- [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md) — applies if you extend the canvas's exec probes

**Part of:** Labs 21–26, the enterprise agentic SDLC harness arc. This lab
is the operator surface for the stages and gates from Lab 23, the executable
tasks from Lab 24, and the correlation/telemetry path from Lab 25.

## 26.0 Prerequisites

- The **GitHub Copilot App**, installed through the official
  [GitHub Copilot App quickstart and download path](https://docs.github.com/en/copilot/get-started/quickstart-copilot-app).
- A GitHub or GitHub Enterprise account with Copilot access and a Copilot
  App/CLI version whose canvas picker is available.
- A local clone of this repository and permission to load its
  project-scoped `.github/extensions/` content.
- Node.js 18+ (already required by the repo's preflight).
- No `gh` authentication is required for this lab — every canvas defaults
  to **fixture mode**, reading a frozen, labeled JSON snapshot instead of
  calling `gh`. Live mode is covered as an explicit opt-in in §26.6.

**No canvas support?** If your client can't render canvases, you can still
complete this lab's substance from a terminal:

```bash
# Inspect what the extension declares without opening a canvas
cat .github/extensions/enterprise-sdlc-workbench/README.md

# Run the same tests a canvas-capable learner validates against
npx vitest run tests/extensions/enterprise-sdlc-workbench.test.ts
```

## 26.1 Install and Open the Extension

Complete the official quickstart before inspecting the extension:

1. Follow the
   [GitHub Copilot App quickstart](https://docs.github.com/en/copilot/get-started/quickstart-copilot-app)
   to download and install the app for your operating system.
2. Open the app and sign in to GitHub.com or your GitHub Enterprise host.
   Confirm the signed-in account has Copilot access.
3. Connect/open your local clone of
   `ms-mfg-community/day-in-the-life-copilot-lab` as the project.
4. Start a project session and confirm its canvas picker is present. If
   canvases are absent, use the non-UI fallback in §26.0.
5. Confirm your organization/repository policy allows project-scoped
   extensions. A policy denial must be resolved by an administrator; don't
   copy the extension to a user-scoped directory to bypass it.

The extension already lives in this repo at
`.github/extensions/enterprise-sdlc-workbench/` — project-scoped extensions
load automatically for sessions connected to this repo. Confirm it's
visible, then open its canvases:

```
/extensions          # confirm "enterprise-sdlc-workbench" is listed and loaded
```

Open each of the three canvases it declares (exact invocation depends on
your client — look for a canvas picker or ask the agent to "open the SDLC
board canvas"):

| Canvas | Purpose |
|--------|---------|
| `sdlc-board` | EPIC-001 issues — state, labels, dependencies, readiness |
| `code-map` | `dotnet/ContosoUniversity.sln` projects/tests + prerequisite tiles |
| `release-composer` | Drafts a handoff doc from completed issues — save-only, never auto-publishes |

## 26.2 Trust Boundary: What the Canvas Can and Can't Do

Before touching any action, know the boundary this extension enforces —
it's the same boundary any canvas you build later must respect:

- **The iframe is read-only HTML.** It never holds a `gh` token or runs a
  shell command; it only displays what the extension host process
  rendered. All `gh`/`dotnet` calls happen in `lib/*.mjs`, inside the
  extension host — never inside the rendered page.
- **Mutating actions require a capability token.** Each canvas instance
  gets a random token embedded in its own rendered HTML
  (`window.CAPABILITY_TOKEN`); actions that change state (`dispatch`,
  `save_draft`, `publish`) reject any call that doesn't present it. An
  agent acting on stale or forged context can't mutate a canvas it didn't
  open.
- **Untrusted text is always escaped.** Issue titles and labels are
  attacker-controllable (anyone can open an issue with a hostile title).
  `lib/render.mjs`'s `escapeHtml()` runs on every piece of display text
  before it reaches the HTML string — see
  [`fixtures/adversarial-board.json`](../.github/extensions/enterprise-sdlc-workbench/fixtures/adversarial-board.json)
  for the exact hostile-title case the test suite exercises.
- **Dry-run is the default, not an afterthought.** `dispatch()` defaults
  to `dryRun: true` and returns the comment it *would* post without
  calling `gh`. Saving a release draft and publishing it are two separate,
  separately-confirmed actions — a draft save never implies a publish.
- **Fixture vs. live is always visibly labeled.** Every canvas renders a
  Fixture/Live mode badge; fixture data carries its own `capturedAt` /
  `sourceRepo` / `schemaVersion` metadata so you never mistake a frozen
  snapshot for current state.

🖥️ **Discuss/answer:**

```
The release-composer canvas can "save a draft" and "publish" as two
separate actions. Why not collapse them into one "publish draft" action
that saves and publishes in a single step?
```

> 💡 **Expected answer:** saving is a safe, reversible, local filesystem
> write under `docs/releases/`; publishing is an irreversible, externally
> visible action (a real GitHub Release or posted comment). Keeping them
> separate means a learner (or an agent) can iterate on a draft freely
> without ever risking an accidental publish — the same reason `git commit`
> and `git push` aren't one command.

## 26.3 The SDLC Board: Fixture-Grounded, Not Invented

Open the `sdlc-board` canvas. The issues, titles, states, and labels you see
are a **real, frozen snapshot** of this repo's own EPIC-001 issues (fetched
via `gh issue view` while building this lab) —
[`fixtures/epic-001-board.json`](../.github/extensions/enterprise-sdlc-workbench/fixtures/epic-001-board.json).
Linked PRs, check runs, and workflow runs in the fixture are synthetic
illustrations (the `note` field says so) — the issue graph itself is not
invented.

The board computes **readiness**: an issue is "ready" only if it is itself
open *and* every issue it depends on is closed. Find an issue in the board
whose dependencies are all closed but which is itself still open — that's
your next actionable item in a real sprint.

## 26.4 Code Map: The .NET Solution, Live

Open the `code-map` canvas. Unlike the board, this one *does* read live
from disk every time: it parses `dotnet/ContosoUniversity.sln` and lists
its five projects (`.Web`, `.Core`, `.Infrastructure`, `.Tests`,
`.PlaywrightTests`), flagging the test projects. A **prerequisite tile**
row shows whether `dotnet`, `docker`, and `gh` (plus `gh auth status`) are
available — each probe is bounded (timeout + output cap) so a missing or
hung tool degrades that one tile instead of breaking the canvas.

Run `check_prerequisites` and confirm the tiles match what your own
preflight (`scripts/preflight.sh`) already told you.

## 26.5 Dry-Run Dispatch and the Correlation Key

The board's `dispatch` action assigns a correlation key to an issue in the
form `feature/stage/task/run` (e.g. `epic-001/lab26/dispatch/01`) and
posts (or, in dry-run, *would* post) a hidden-marker audit comment —
`<!-- enterprise-sdlc-workbench:dispatch:v1:<hash> -->` — so a second
dispatch with the same key **updates** the existing comment instead of
duplicating it.

> 📌 This is the shared EPIC-001
> [Provenance](../docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md#provenance--one-key-durable-approvals)
> key: one value names the feature, stage, task, and run. Lab 24 carries it
> on task/stage artifacts, Lab 25 carries it into telemetry, and this lab
> records it in the dispatch audit comment.

Run `dispatch` against any fixture issue now. Confirm the result is the
markdown comment text, not a live `gh` call — dry-run is the default and
nothing in this step touches a real GitHub issue. Supply an agent preset
(for example `repo/dev`), its preset or bundle version, and execution
location (`local`, `cloud`, or `remote`); the resulting audit comment also
records an ISO timestamp.

## 26.6 Opt-In Live Mode

Everything above runs against the fixture with zero `gh` calls. If you want
to see live mode:

1. Confirm `gh auth status` succeeds (the code-map canvas's prerequisite
   tile already told you this).
2. Switch the board canvas to live mode and point it at an issue number in
   **this** repo you're comfortable commenting on, or a disposable test
   repo.
3. Re-run `dispatch` with `dryRun: false` explicitly. Live mode never
   hardcodes the EPIC-001 issue numbers — it queries whatever repo/issue
   the canvas is actually pointed at.

You don't have to do this to complete the lab; fixture mode exercises the
same code paths that live mode does.

## 26.7 Hands-On Exercise: Add a Board Filter

The `sdlc-board` canvas already ships a `filter_by_label` action in
[`lib/board.mjs`](../.github/extensions/enterprise-sdlc-workbench/lib/board.mjs).
Your task: extend it.

1. Open `lib/board.mjs` and find `filterByLabel`.
2. Add a second filter — e.g. `filterByState(issues, state)` — that
   returns only issues matching a given `state` ("open" or "closed").
3. Wire it into `lib/canvases/sdlcBoardCanvas.mjs` as a new action
   (`filter_by_state`), following the same shape as the existing
   `filter_by_label` action (input schema, handler, re-render).
4. Add a test case to
   [`tests/extensions/enterprise-sdlc-workbench.test.ts`](../tests/extensions/enterprise-sdlc-workbench.test.ts)
   asserting it returns the expected subset of the real fixture.
5. Re-run the suite (next section) and confirm it's green.

## 26.8 Validation

✅ `/extensions` lists `enterprise-sdlc-workbench` as loaded.

✅ Ask the agent to run these model-side extension tools (they are tool
calls, **not** slash commands):

```text
extensions_manage({ operation: "inspect", name: "enterprise-sdlc-workbench" })
```

Expected: the extension is `running`, and its declaration lists
`sdlc-board`, `code-map`, and `release-composer`. This is the runtime
manifest/schema check: the SDK accepted each canvas/action declaration and
its JSON Schema.

✅ All three canvases open and render without a stale/blank iframe.

✅ `dispatch` in fixture mode returns comment markdown without any live
`gh` call.

✅ Your `filter_by_state` addition (§26.7) has a passing test:

```bash
npx vitest run tests/extensions/enterprise-sdlc-workbench.test.ts
```

Expected: all tests pass, including the one you added.

The test suite also validates the fixture against
`fixtures/epic-001-board.schema.json`.

**If discovery, schema registration, or opening a canvas fails:**

1. Ask the agent to call `extensions_reload({})`.
2. Re-run
   `extensions_manage({ operation: "inspect", name: "enterprise-sdlc-workbench" })`.
3. Read the log tail returned by `inspect`; fix the first syntax/schema
   error, reload once, and inspect again.
4. If the extension was added after the current session started and still
   does not appear, end and reopen the project session so discovery runs
   from a clean registry.

## 26.9 Back at Work

Map this lab to your own team's adoption curve, per the same
inventory → pilot → expand → scale phases issue
[#66](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/66)
asks every lab to address:

- **Inventory:** which of your team's SDLC surfaces (a board, a dependency
  graph, a release draft) are currently chat-only and would benefit from
  staying visible as a canvas?
- **Pilot:** build one project-scoped canvas, fixture-mode only, for a
  single real workflow your team already does by hand.
- **Expand:** add a bounded, dry-run-default mutating action (like this
  lab's `dispatch`) once the read-only view is trusted.
- **Scale:** only then add live mode, gated on the same prerequisite and
  capability-token checks this lab's extension uses.

## 26.10 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Canvas vs. chat** | A canvas persists and re-renders; a chat reply is read once |
| **Trust boundary** | Shell/`gh` calls live in the extension host, never in the iframe |
| **Capability tokens** | Per-instance random token required on every mutating action |
| **Dry-run default** | `dispatch()` defaults to `dryRun: true`; save and publish are separate confirmed actions |
| **Fixture honesty** | Real issue numbers/titles/states; synthetic PR/check data clearly labeled; visible Fixture/Live badge |
| **Correlation key** | The EPIC-001 Provenance key follows `feature/stage/task/run` across tasks, telemetry, and dispatch audit comments |

</details>

You have completed the Labs 21–26 enterprise agentic SDLC harness arc.
Return to the [README](../README.md) for the full lab index, or revisit
[Lab 21](lab21.md) to review the arc from its governance starting point.
