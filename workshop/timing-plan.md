---
title: "Advanced Copilot CLI Workshop — Timing Plan"
arc: workshop-materials
phase: 4
authoritative_source: workshop/curriculum.md
duration_minutes: 240
---

# Advanced Copilot CLI Workshop — Timing Plan

> **Single source of truth** for the live 4-hour pacing. All per-module
> minutes are echoed from `workshop/curriculum.md` (guarded — do not
> edit curriculum here; edit it there, then echo). The
> `tests/workshop/phase-4-artifacts.test.ts` suite cross-checks every
> module minute value against curriculum and asserts the schedule sums
> to exactly 240.
>
> Breaks, Q&A, opening, and contingency are derived from the same
> `overhead:` block in curriculum.md. If you need to move minutes,
> change curriculum.md first; this file follows.

## At a glance

| Block | Duration | Running total |
|---|---|---|
| Opening + readiness check | 5 min | 0:05 |
| M1 — Extensibility architecture | 35 min | 0:40 |
| M2 — MCP servers in anger | 30 min | 1:10 |
| Break (mid-morning) | 10 min | 1:20 |
| M3 — Multi-agent orchestration | 25 min | 1:45 |
| M4 — GitHub Agentic Workflows | 25 min | 2:10 |
| Break (mid-afternoon) | 10 min | 2:20 |
| M5 — Enterprise plugin marketplace | 20 min | 2:40 |
| M6 — A2A / ACP + tmux orchestrator | 25 min | 3:05 |
| Q&A (consolidated) | 15 min | 3:20 |
| Contingency | 40 min | 4:00 |

## Drop-first list (if running long)

Contingency is the *floor*, not the first buffer. If the room is behind
at the 2-hour mark, shrink in this order — never touch M6 before
exhausting everything above it:

1. Trim the consolidated Q&A block to 10 min.
2. Skip the optional "extras" callouts at the end of M4 (see
   `workshop/speaker-scripts/module-04-gh-aw.md` cue "Extras").
3. Compress M2's multi-server composition demo to a single server.
4. Compress M1's memory/hooks interleave into a narrated sketch (no
   live demo) — cue "Hooks walkthrough".
5. Drop the second break entirely (announce it, keep energy up).

M3, M5, and M6 are load-bearing. Do not cut them.

## Machine-readable schedule

The block below is parsed by `tests/workshop/phase-4-artifacts.test.ts`.
Every `M*` entry must match `workshop/curriculum.md` exactly; the sum
must equal 240.

<!-- timing-plan:start -->
```yaml
total_minutes: 240
schedule:
  - id: opening
    label: "Opening + readiness check"
    minutes: 5
  - id: M1
    label: "Copilot CLI extensibility architecture"
    minutes: 35
  - id: M2
    label: "MCP servers in anger"
    minutes: 30
  - id: break
    label: "Mid-morning break"
    minutes: 10
  - id: M3
    label: "Multi-agent orchestration"
    minutes: 25
  - id: M4
    label: "GitHub Agentic Workflows (gh-aw)"
    minutes: 25
  - id: break
    label: "Mid-afternoon break"
    minutes: 10
  - id: M5
    label: "Enterprise plugin marketplace"
    minutes: 20
  - id: M6
    label: "A2A / ACP + tmux orchestrator"
    minutes: 25
  - id: qa
    label: "Consolidated Q&A"
    minutes: 15
  - id: contingency
    label: "Contingency (demo recovery, run-long drift)"
    minutes: 40
```
<!-- timing-plan:end -->

## Cross-references

- Per-module content and advanced outcomes: `workshop/curriculum.md`
- Presenter delivery playbook: `workshop/facilitator-guide.md`
- Before-the-workshop attendee setup: `workshop/attendee-preread.md`
- Mid-workshop / take-home reference card: `workshop/attendee-handout.md`
