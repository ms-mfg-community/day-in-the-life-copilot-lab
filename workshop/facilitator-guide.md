---
title: "Advanced Copilot CLI Workshop — Facilitator Guide"
arc: workshop-materials
phase: 4
audience: "Workshop presenter / facilitator"
---

# Advanced Copilot CLI Workshop — Facilitator Guide

> **Playbook for the presenter.** Not attendee-facing. This guide
> stitches together the six speaker scripts with stage-direction glue
> (room setup, demo safety-nets, fallback paths). It does not
> duplicate the speaker-script content — treat each script as the
> authoritative source for its module's live-demo commands and
> timing cues.
>
> Pacing is governed by `workshop/timing-plan.md`. Per-module
> advanced outcomes live in `workshop/curriculum.md`.

## Pre-flight — the day before

1. Run `scripts/preflight.sh` (macOS/Linux) or `scripts/preflight.ps1`
   (Windows/WSL2) on the presenter machine. All checks must be GREEN.
2. Open six terminal tabs, one per module, with the repo cloned at
   the release tag. Keep one spare pane for demo recovery.
3. Skim `TROUBLESHOOTING.md` — the patterns there match what attendees
   will hit first.
4. Do a smoke run of M5's `plugin-template/` and M6's tmux orchestrator
   start script. Those two have the narrowest error windows.

## Speaker script references (authoritative per-module content)

Open each in a side pane during delivery; cues (timing markers) are
inside the scripts, not reproduced here.

| Module | Minutes | Speaker script |
|---|---|---|
| M1 — Extensibility architecture | 35 | `workshop/speaker-scripts/module-01-extensibility-architecture.md` |
| M2 — MCP servers in anger | 30 | `workshop/speaker-scripts/module-02-mcp.md` |
| M3 — Multi-agent orchestration | 25 | `workshop/speaker-scripts/module-03-multi-agent.md` |
| M4 — GitHub Agentic Workflows | 25 | `workshop/speaker-scripts/module-04-gh-aw.md` |
| M5 — Enterprise plugin marketplace | 20 | `workshop/speaker-scripts/module-05-marketplace.md` |
| M6 — A2A / ACP + tmux orchestrator | 25 | `workshop/speaker-scripts/module-06-a2a-tmux.md` |

## Cue summary

Condensed one-line version of the cue ladders inside each speaker
script. Use this column in your notes; expand from the script when
you need the exact framing.

### M1 — Extensibility architecture (35 min)
- `Advanced problem` (2) · `AGENTS.md tour` (4) · `Custom agents` (6)
  · `Skills vs. prompts` (6) · `Hooks walkthrough` (6) · `Memory lifecycle` (7)
  · `Choose the surface` recap (4)

### M2 — MCP servers in anger (30 min)
- `Advanced problem` (2) · `Multi-server config` (5) · `Namespace collision
  demo` (6) · `Debugging an empty-return server` (7) · `--additional-mcp-config
  per-session override` (5) · `Fabric MCP offline path` (5)

### M3 — Multi-agent orchestration (25 min)
- `Advanced problem` (2) · `Stateless sub-agent rule` (3) · `Parallel
  dispatch demo` (7) · `Model routing for budget` (6) · `When NOT to
  spawn a sub-agent` (4) · `Recap` (3)

### M4 — GitHub Agentic Workflows (25 min)
- `Advanced problem` (2) · `Reading an existing workflow` (5) · `Authoring
  a PRD-gen workflow` (8) · `Debugging through Actions log` (6) · `Extras`
  (4 — droppable per timing-plan)

### M5 — Enterprise plugin marketplace (20 min)
- Demos A–E covering `plugin-template/` manifest, org-policy,
  CODEOWNERS gating, release workflow, consumer install. Full cue
  ladder 2+1+3+2+3+1+2+1+3+1+1 = 20.

### M6 — A2A / ACP + tmux orchestrator (25 min, flagship)
- Demos A–F covering `copilot --acp`, tmux-start script, handoff
  prompt, clear-context script, QA loop, Lab 14 compatibility matrix
  recite. Full cue ladder 2+2+2+1+2+3+1+3+4+1+2+1+1 = 25.

## Contingency

Three categories of contingency, ordered from cheapest to most
disruptive. Use the `workshop/timing-plan.md` drop-first list as your
canonical order when minutes are lost.

### Running long (clock drift)
- Apply the drop-first list in `workshop/timing-plan.md` in order.
  Never cut M3, M5, or M6 — those are load-bearing.
- The 40-minute contingency budget is a *floor*, not a first buffer.
  Dipping into it signals the arc is slipping; communicate to the room.

### Demo fails live
- **M1** — If a custom agent fails to load, fall back to the
  `AGENTS.md` narrated tour; the surface comparison still lands.
- **M2** — If an MCP server hangs, terminate it from the spare pane,
  switch to the offline Parquet path (documented in `labs/lab12.md`),
  and continue. Do not debug live past 90 seconds.
- **M3** — If a sub-agent dispatch stalls, cancel and narrate the
  planned output from the speaker script. The teaching point is the
  decomposition, not the tokens.
- **M4** — If `gh aw compile` fails, open the pre-compiled artifact
  committed at the release tag and walk through the generated YAML.
- **M5** — If publish-to-marketplace errors, show the manifest and
  `release.yml` and narrate the publish step. Org marketplaces are
  environment-bound; this is an expected failure surface.
- **M6** — If `copilot --acp` or tmux-start fails, switch to a
  terminal-only narration using the handoff-prompt flow. The
  flagship teaching point is the *pattern*, not the live session.

### Room-side issues
- AV failure: move to `workshop/dist/` locally rendered slides on a
  second machine; the deck is static HTML, no server required.
- Network outage: all demos except M2 (`--additional-mcp-config` live
  fetch) and M4 (`gh aw compile` online schema check) have local
  fallbacks. Reorder to front-load local-only demos if connectivity
  is unstable.

## Troubleshooting appendix

Primary reference: `TROUBLESHOOTING.md` at the repo root. Patterns
attendees will hit and their fixes are catalogued there. For
environment-specific issues (Windows/WSL2/`/mnt/c/`), see the Lab 14
compatibility matrix in `labs/lab14.md` and the preflight output.

## After the workshop

- Point attendees at `workshop/attendee-handout.md` for take-home
  references and the anchor labs for self-paced depth.
- Capture run-long drift and any failed demos in
  `workshop/rehearsal-log.md` (Phase 5) so the drop-first list can
  be re-tuned before the next delivery.
