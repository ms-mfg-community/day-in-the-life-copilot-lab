---
title: "Advanced Copilot CLI Workshop — Attendee Pre-Read"
arc: workshop-materials
phase: 4
audience: "Workshop attendees (before the session)"
estimated_read_minutes: 12
---

# Advanced Copilot CLI Workshop — Attendee Pre-Read

> **Read this before the workshop.** 10–15 minute read. The workshop
> is 4 hours of advanced Copilot CLI content; showing up with a
> broken environment costs the whole room time. Complete the prework
> checklist at least one business day before the session.

## Prework

Your job between now and the workshop is to land in a **GREEN** state
on `scripts/preflight.sh` (macOS/Linux) or `scripts/preflight.ps1`
(Windows via WSL2). The full checklist lives at the top of
`README.md` — **"Pre-Workshop Setup Checklist"** — and is the
authoritative source for required tools and versions.

Minimum gates:

1. **GitHub Copilot CLI** installed and authenticated:
   `copilot --help` prints successfully.
2. **`gh` CLI** installed and authenticated to the workshop org.
3. **Repo cloned** at the release tag; you can run `make lint-labs`
   or the preflight script from the repo root.
4. **Container runtime** available if you plan to use the devcontainer
   path (Docker Desktop, Podman, or Rancher Desktop).
5. **Lab 14 environment check** — if you are on Windows, confirm you
   are using **WSL2 with the repo on a Linux filesystem**. The full
   compatibility matrix is in `labs/lab14.md`; `/mnt/c/` paths are
   allowed but degraded, and Windows-PowerShell-only is **not
   supported** for the live workshop.

Run preflight and fix anything it flags RED. Warnings are tolerable;
failures will hurt.

## Pace

The workshop is **240 minutes (4 hours)** in six modules plus
overhead. Pacing is authoritative in `workshop/curriculum.md` and
`workshop/timing-plan.md`; plan on:

| Block | Minutes |
|---|---|
| Opening + readiness check | 5 |
| M1 — Copilot CLI extensibility architecture | 35 |
| M2 — MCP servers in anger | 30 |
| Break | 10 |
| M3 — Multi-agent orchestration | 25 |
| M4 — GitHub Agentic Workflows (gh-aw) | 25 |
| Break | 10 |
| M5 — Enterprise plugin marketplace | 20 |
| M6 — A2A / ACP + tmux orchestrator | 25 |
| Q&A | 15 |
| Contingency | 40 |

The contingency block exists to absorb demo recovery and run-long
drift. Do not expect it to extend the day.

## Expectations

**Who this workshop is for.** Advanced Copilot CLI users. You are
already fluent with interactive `copilot`, `--prompt`/`-p`,
`AGENTS.md`, and a handful of skills and prompts. Every module
opens with an *advanced problem*, not a primer.

**Who this workshop is not for.** If `copilot --help` is new to you,
work through labs 01–04 first — this session will move past that
surface in the first ten minutes.

**Demo surface.** Live demos are **Copilot CLI only**. Labs may
reference VS Code flows; the workshop does not. Bring a terminal you
are comfortable using under time pressure.

**One laptop per attendee.** We do not pair in the live session. You
should be able to follow along with each demo, not drive it. The
anchor labs exist for post-workshop hands-on depth.

**Six modules, six advanced outcomes.** Not in-depth lab
walkthroughs. Each module trades depth for perspective — the promise
is that after the session you can reach for the right Copilot CLI
surface for the right problem, and you know which lab to open for
the hands-on version.

Module promises, one line each:

1. **M1** — Choose deliberately among AGENTS.md, custom agents,
   skills, prompts, hooks, and memory on cost/latency/reuse grounds.
2. **M2** — Compose multiple MCP servers in one session and debug a
   silently-empty server.
3. **M3** — Decompose a non-trivial task into parallel sub-agent
   dispatches with budget-appropriate model routing.
4. **M4** — Read, author, and debug a GitHub Agentic Workflow against
   the current schema version.
5. **M5** — Package and publish a team's Copilot CLI config as an
   internal marketplace plugin, with org-scoped discovery.
6. **M6** — Stand up the tmux orchestrator pattern and run a Copilot
   CLI session as an ACP server for agent-to-agent integration.

## During the workshop

- The consolidated Q&A block is at the end. Hold detailed questions;
  ask clarifying ones in-module.
- Mid-workshop reference card: `workshop/attendee-handout.md` — it
  has module cards, copy-pasteable commands, and a troubleshooting
  appendix you can keep open on a second monitor.
- If a demo fails on stage, the facilitator has a fallback path for
  every module. The teaching point lands either way.

## After the workshop

- The six **anchor labs** cited in each module are your self-paced
  follow-up: work through the one that mapped to the problem you
  actually have. Module → lab mapping is in `workshop/curriculum.md`.
- Keep `workshop/attendee-handout.md` nearby for the first week of
  post-workshop experimentation.
