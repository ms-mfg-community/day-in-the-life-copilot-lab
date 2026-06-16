---
module: M5
title: "Copilot CLI extensions × hooks — deterministic gate, probabilistic body"
anchor_labs: ["lab-copilot-cli-extensions"]
minutes: 12
phase: 3c
---

# M5c — Copilot CLI extensions × hooks (synergy)

## The advanced problem

Two extension surfaces, one runtime. **Copilot CLI extensions** (in-process Node modules in `.github/extensions/<name>/extension.mjs`) register tools whose bodies call the LLM via `session.sendAndWait()` — that is the **probabilistic** half of the agent loop. **Hooks** (`.github/hooks/*.json`) fire before/after every tool call and lifecycle event — that is the **deterministic** half. The production pattern this module teaches is wiring them together so the certain thing always runs in front of the approximate thing.

Anchor lab: [`labs/lab-copilot-cli-extensions.md`](../../labs/lab-copilot-cli-extensions.md). Solution: `solutions/lab-copilot-cli-extensions/`. Authoring source-of-truth: `~/.copilot/session-state/<id>/files/copilot-cli-extensions-authoring-guide.md` (output of `extensions_manage operation: "guide"`).

---

## The synergy diagram

```
  ┌──────────────┐   ┌────────────────────────────┐   ┌──────────────────────┐
  │ user types   │──▶│ userPromptSubmitted hook   │──▶│ Copilot agent reasons│
  │ "summarize:" │   │ (deterministic detector)   │   │ over the prompt      │
  └──────────────┘   │ → emits audit/telemetry    │   └──────────┬───────────┘
                     │ ⚠ output not honored —     │              │
                     │ cannot itself call tool    │              │ tool catalog
                     └────────────────────────────┘              ▼
                                                       ┌──────────────────────┐
            ┌─────────────────────────────────────────▶│ agent calls          │
            │                                          │ clab_summarize(text) │
            │   ┌────────────────────────────┐         └──────────┬───────────┘
            │   │ preToolUse hook            │                    │
            └───│ (deterministic gate)       │◀───────────────────┘
                │ → emits permissionDecision │     runtime offers tool call
                │   "deny" if size>10KB      │     to all preToolUse hooks
                │ ⚠ deny-only; allow/ask     │
                │   accepted but ignored     │
                └────────────┬───────────────┘
                             │ no deny → call proceeds
                             ▼
                ┌──────────────────────────────┐
                │ extension.mjs handler        │   ◀── PROBABILISTIC BOUNDARY ──
                │ session.sendAndWait({prompt})│      (cost lives here)
                │ → returns model summary      │
                └──────────────────────────────┘
```

The dashed line is the deterministic ↔ probabilistic boundary. Everything above it is microseconds-fast, certain, and free; everything below it is seconds-slow, approximate, and billable. **The whole point of the synergy is that the boundary is at a place you control.**

---

## Three rules to remember

- **`gh extension` ≠ Copilot CLI extension ≠ MCP server.** Different processes, different triggers, different auth. Lab §1 has the table.
- **`preToolUse` is veto-only.** `deny` is honored; `allow`/`ask` are accepted but ignored. *Absence of `deny` is allow.* This is restated verbatim in `labs/lab-hardening.md`.
- **`userPromptSubmitted` cannot mutate the prompt.** The JSON-config hook surface is detection-only. If you need the trigger to actually invoke a tool, use the SDK-side `onUserPromptSubmitted` inside `joinSession({ hooks })` — that surface has access to `session.send()` and `session.sendAndWait()`. The runtime authoring guide documents both surfaces; defaulting to JSON for auditability and SDK-side for behavior is the working rule.

---

## Takeaway

A Copilot CLI extension gives the agent a new tool whose body calls the LLM. Hooks give you deterministic gates around it. Neither half is production-grade alone: an unguarded extension is an unbounded token bill, and a hook with no extension behind it has nothing meaningful to gate. **Stack them.** That stack is what `lab-copilot-cli-extensions.md` walks you through.
