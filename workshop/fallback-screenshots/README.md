# Fallback Screenshots

Static screenshot fallbacks for live demos. Used when a backup-plan
trigger in [`../rehearsal-checklist.md`](../rehearsal-checklist.md)
fires during the workshop.

## When to use

Pivot to the matching fallback the moment a trigger condition in
`## Backup-plan triggers` of the rehearsal checklist is hit. Narrate
the screenshot, summarise the expected outcome (see
[`../a11y-notes.md`](../a11y-notes.md) — **Caption guidance for
demos**), and keep the session moving. Deep-dive on what went wrong
belongs in Q&A or the post-workshop retro, not on the clock.

## Naming convention

`<module-id>-<short-slug>.png`

- Lowercase module id (`m1` … `m6`).
- Short descriptive slug indicating the demo step.
- `.png` at release. Stubs are tracked here as
  `<name>.png.placeholder` files and replaced with real PNGs before
  the live session. Real PNGs MUST arrive with alt text documented
  in this README (see [`../a11y-notes.md`](../a11y-notes.md) —
  **Alt-text policy**).

## Stubs (one per module)

Each entry below is a committed stub. Replace with a real screenshot
before delivery; keep the filename stable so speaker-script and
checklist references do not break.

### M1 — Extensibility architecture

- **File:** `m1-primary-demo.png.placeholder`
- **What it should show:** Copilot CLI session with `copilot --help`
  output plus a custom skill invocation (e.g. `/plan`) producing
  structured output, demonstrating the extensibility surface without
  requiring a live CLI session.
- **Trigger:** Copilot CLI auth fails on stage, or the skill does not
  resolve within ~45 s.

### M2 — Multi-server MCP composition

- **File:** `m2-primary-demo.png.placeholder`
- **What it should show:** `copilot --additional-mcp-config @mcp-configs/copilot-cli/individual/{context7,microsoft-learn,memory}.json` terminal output with three
  MCP servers healthy, followed by a `/mcp` listing inside Copilot
  CLI showing all three registered.
- **Trigger:** Container runtime fails to start, or `/mcp` does not
  list all three servers within ~90 s.

### M3 — Multi-agent parallel dispatch

- **File:** `m3-primary-demo.png.placeholder`
- **What it should show:** A sub-agent fan-out trace (three agents
  running concurrently) and the final budget-summary output, so
  attendees see the orchestration shape even if the live run hangs.
- **Trigger:** Parallel dispatch hangs > 90 s, or budget summary does
  not render.

### M4 — GitHub Agentic Workflows (gh-aw)

- **File:** `m4-primary-demo.png.placeholder`
- **What it should show:** `gh aw compile` success followed by a
  triggered workflow run page on GitHub (run id visible), so the
  authoring-to-execution loop is intelligible without a live run.
- **Trigger:** gh-aw run blocked on approvals, rate-limited, or the
  compiled workflow fails to dispatch.

### M5 — Enterprise plugin marketplace

- **File:** `m5-primary-demo.png.placeholder`
- **What it should show:** `/plugins` listing inside Copilot CLI
  showing at least one marketplace plugin installed, plus the
  plugin's top-level command surface.
- **Trigger:** Marketplace fetch fails, or `/plugins` does not list
  the expected plugin.

### M6 — A2A/ACP + tmux-orchestrator meta-loop

- **File:** `m6-primary-demo.png.placeholder`
- **What it should show:** tmux-orchestrator pane with the dev/QA
  handshake visible, plus the A2A/ACP message log segment that
  closed the loop.
- **Trigger:** tmux-orchestrator loops diverge, or the A2A/ACP
  handshake does not settle within ~2 min.

## Replacement workflow

1. Capture the real screenshot during rehearsal when the demo works.
2. Save as `<module-id>-<slug>.png` alongside (replacing) the
   matching `.placeholder` stub.
3. Update the stub's entry above with any clarifications captured
   during rehearsal (e.g. which frame is most informative).
4. Re-run `npm test -- tests/workshop` to confirm the fallback index
   still parses.
