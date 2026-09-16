---
module: M5c
title: "Copilot CLI extensions — speaker script"
slide_source: workshop/slides/56-module-5c-copilot-cli-extensions.md
minutes: 10
phase: 3c
---

# M5c — Speaker script (synergy capstone)

Target audience: presenters who already taught M5 (marketplace) and
M5b (gh extensions). They know the surfaces. This module is about
the **deterministic-hook × probabilistic-extension** pairing — the
production pattern that makes both halves useful together.

## 1. Open with the advanced problem

Do **not** re-explain what an extension is. The room knows. Start
with the seam the other two modules left open.

**Verbatim hook (~60 seconds):**

> "You have seen the marketplace. You have built a `gh` extension.
> Both extend deterministic CLI surfaces — a human types a verb, a
> binary runs. Copilot CLI extensions are different: they extend the
> **agent loop itself**. The agent decides mid-turn to call your
> tool, and your tool's body calls the LLM back through the session.
> That is the probabilistic half. Now pair it with hooks —
> `preToolUse` fires deterministically *before* every tool call,
> `userPromptSubmitted` fires deterministically *before* the agent
> reasons. Hooks are the OS; extensions are the apps. The real power
> is neither surface alone — it is the **deterministic gate in front
> of the probabilistic body**. That stack is what this module and
> `lab-copilot-cli-extensions.md` teach you to build."

Anchor lab: `labs/lab-copilot-cli-extensions.md`. Solution:
`solutions/lab-copilot-cli-extensions/`.

## 2. Demo script

**Copilot CLI only.** All files exist in the repo under `solutions/`.

### Demo A — Register the extension via `extensions_manage` (~3 min)

Start with the **`operation: "guide"` first-action contract**. This
is non-negotiable — the lab teaches it and the speaker must teach it.

```text
extensions_manage({ operation: "guide" })
```

Narrate: *"This is the source of truth. The guide is emitted by the
runtime you have installed today — not by docs.github.com, not by
memory. Every extension code line traces back to this output."*

Then show the before/after:

```text
extensions_manage({ operation: "list" })   # before — no clab-summarize
extensions_manage({ operation: "scaffold", name: "clab-summarize" })
extensions_reload({})
extensions_manage({ operation: "list" })   # after — clab-summarize loaded
extensions_manage({ operation: "inspect", name: "clab-summarize" })
```

`inspect` should show one tool: `clab_summarize`. Call out that the
extension file lives at `.github/extensions/clab-summarize/extension.mjs`
and imports from `@github/copilot-sdk/extension` — the only import
path the guide documents for extension entry points.

### Demo B — Deterministic-hook × probabilistic-extension synergy (~4 min)

Walk the synergy diagram from slide 56. Three actors, one flow:

1. **`userPromptSubmitted` hook** (`userpromptsubmitted-auto-summarize.json`) —
   detects the `summarize:` prefix, emits an audit line to stderr.
   Deterministic, microseconds, free. Output is **not honored** by
   the runtime — this hook cannot invoke the tool or mutate the prompt.

2. **`preToolUse` hook** (`pretooluse-deny-large-input.json`) — fires
   when the agent calls `clab_summarize`. Reads stdin
   (`{toolName, toolArgs, timestamp, cwd}`), checks byte size. If
   `text` > 10 000 bytes → emits
   `{"permissionDecision":"deny","permissionDecisionReason":"..."}`.
   **`preToolUse` is veto-only** — `deny` is honored; `allow`/`ask`
   are accepted but ignored. Absence of `deny` is allow.

3. **`clab_summarize` extension body** (`extension.mjs`) — calls
   `session.sendAndWait({ prompt })`. This is the **probabilistic
   boundary**: seconds-slow, approximate, billable. The deterministic
   gate ran first, for free.

Land the beat: *"Everything above the boundary is microseconds and
certain. Everything below it is seconds and approximate. The whole
point is that the boundary is at a place you control."*

### Demo C — Install / invoke / cleanup loop (~3 min)

Show the full lifecycle so demos don't pollute the next session:

```text
extensions_manage({ operation: "scaffold", name: "clab-summarize" })
extensions_reload({})
# invoke — "Summarize the README using clab_summarize."
# agent calls clab_summarize, returns bullet summary
```

Then cleanup:

```text
# delete .github/extensions/clab-summarize/
extensions_reload({})
extensions_manage({ operation: "list" })   # clab-summarize gone
```

Stress: *"Reload after every edit. Reload after every delete. The
runtime caches the extension list at launch; `extensions_reload({})`
is your cache-bust."*

## 3. Timing cues

<!-- total: 10 min -->

- 0:00 — Hook: deterministic × probabilistic pairing. (1.5 min)
- 1:30 — Slide: the synergy diagram from slide 56. (1 min)
- 2:30 — **Demo A** — `operation: "guide"` first, then scaffold + list + inspect. (3 min)
- 5:30 — **Demo B** — walk the three actors through the diagram. (3 min)
- 8:30 — **Demo C** — scaffold → invoke → cleanup. (1.5 min, tight)
- 10:00 — Slide: takeaway. Hooks are the OS, extensions are the apps. Stack them. (closes at 10:00)

## 4. Expected pitfalls

- **Forgetting `operation: "guide"` first.** The guide is the source of truth for every API shape. If a presenter skips it, every subsequent code line is ungrounded. Call it out before Demo A — *"guide first, always."*
- **Hook JSON schema violations causing silent skip.** A malformed `.github/hooks/*.json` file (missing `"version": 1`, wrong event key, `type` not `"command"`) does not error — the runtime silently ignores it. If the `preToolUse` hook is not firing, `cat` the JSON and validate the schema by hand.
- **`extensions_reload({})` not picking up edits.** The runtime discovers extensions at launch and on explicit reload. Saving `extension.mjs` alone does nothing — you must call `extensions_reload({})`. If someone says "my change isn't showing up," the answer is always reload first.
- **Hook ordering — `preToolUse` vs `userPromptSubmitted` vs `postToolUse`.** `userPromptSubmitted` fires before the agent reasons. `preToolUse` fires after the agent decides to call a tool but before the call executes. `postToolUse` fires after. Confusing these leads to hooks that "never trigger." Draw the timeline on a whiteboard if the room looks uncertain.

## 5. Q&A prompts

Seed these if the room is quiet:

- "When would you use a hook instead of an extension — and when do you need both?"
- "How would you share a project-scoped extension with your team? What does the code-review workflow look like for `.github/extensions/`?"
- "What is the security/sandboxing story for extension code? The extension runs as a child of `copilot` — what can it access?"
- "How does a Copilot CLI extension compare to an MCP server? When would you pick one over the other?"
- "Has anyone hit a tool-name collision across extensions? How did you debug it?"

## 6. Advanced-tip callouts

Drop these between slides as time permits. Each is ~20 seconds.

- **Compose multiple extensions in one prompt.** The agent sees every loaded extension's tools in a single catalog. A prompt like *"Summarize the README, then lint the result"* can chain `clab_summarize` with a second extension's tool in one turn — no orchestration needed.
- **Project-scoped extensions as team helpers.** Files in `.github/extensions/` are committed, reviewed under CODEOWNERS, and shared with the team. This is the production path: your project-specific summarizer, formatter, or policy checker lives next to the code it serves.
- **The `inspect` / `scaffold` / `guide` operations are a self-service authoring loop.** `guide` gives you the contract, `scaffold` gives you the skeleton, `inspect` confirms the tool registered. You never need to leave the CLI to author, test, or debug an extension.

---

## Takeaway

M5 gave you the marketplace — someone else's tools. M5b gave you `gh` extensions — your own deterministic CLI verbs. M5c gives you the synergy: **a deterministic hook in front of a probabilistic extension body is the smallest production-grade unit of agent customisation you can ship.**
