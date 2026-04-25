---
title: "Authoring a Copilot CLI Extension and Triggering It from a Hook"
lab_number: "cli-extensions"
pace:
  presenter_minutes: 12
  self_paced_minutes: 35
registry: docs/_meta/registry.yaml
---

# Lab — Authoring a Copilot CLI Extension and Triggering It from a Hook

> ⏱️ Presenter pace: 12 minutes | Self-paced: 35 minutes

In this lab you will author a **Copilot CLI extension** — a JS module that runs inside the CLI's runtime and registers a custom tool — and then wire two **hooks** around it: one that deterministically denies oversize inputs *before* the LLM is called, and one that detects a deterministic trigger pattern. The point is to feel the seam where deterministic gates meet probabilistic LLM-backed bodies.

> 🧭 **Track appendices** — track-specific completion variants live at
> [`labs/appendices/dotnet/lab-copilot-cli-extensions.md`](appendices/dotnet/lab-copilot-cli-extensions.md) and
> [`labs/appendices/node/lab-copilot-cli-extensions.md`](appendices/node/lab-copilot-cli-extensions.md).

> 📦 **Solution scaffold** — runnable reference at [`solutions/lab-copilot-cli-extensions/`](../solutions/lab-copilot-cli-extensions/).

References (read for canonical contracts):

- Runtime authoring guide (saved during this workshop's session): `~/.copilot/session-state/<id>/files/copilot-cli-extensions-authoring-guide.md` — output of `extensions_manage operation: "guide"` against your locally installed `copilot` build. **This is the source of truth for every extension code line in this lab.**
- [Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)
- [About hooks](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks)

---

## 1. Two extension worlds, one workshop

Three things are called "extensions" or "tools" in the GitHub/Copilot world. They are **not interchangeable** and learners conflate them constantly. Read this once, slowly, before doing anything else.

| | `gh extension` | **Copilot CLI extension** *(this lab)* | MCP server |
|---|---|---|---|
| **Where it runs** | External binary or interpreter, invoked by the `gh` CLI | **In-process child of the Copilot CLI**, forked as a Node.js subprocess of `copilot` | Out-of-process server (stdio or HTTP), bridged via the Model Context Protocol |
| **What it exposes** | A new `gh <verb>` subcommand to your shell | **Tools (and lifecycle hooks) registered with the agent** via `joinSession()` | Tools, resources, prompts via MCP JSON-RPC |
| **Who calls it** | A human at the shell, or scripts | **The Copilot agent**, mid-turn, as part of its tool loop | The Copilot agent (or any MCP client), mid-turn |
| **Discovery** | `gh extension install owner/repo` | `.github/extensions/<name>/extension.mjs` (project) or user-level extensions dir | `.copilot/mcp-config.json` or `~/.copilot/mcp-config.json` |
| **Sibling lab** | `lab-gh-extensions.md` (Workstream A1) | **this lab** | `labs/lab05.md` |

`gh extension` is a *shell* extension surface; the user types `gh foo`. **Copilot CLI extensions are a runtime extension surface**; the agent (not the user) decides to call the tool, in the middle of a turn, based on the tool description you wrote. MCP servers are a *protocol* extension surface; same client-side experience as a Copilot CLI extension tool, but the implementation lives behind a JSON-RPC boundary in a different process.

The rest of this lab is about the **middle column**.

---

## 2. Authoring fundamentals from the runtime guide

> ⚠️ **Read this section out of the saved authoring guide, not out of memory.** The guide was emitted by `extensions_manage operation: "guide"` for the `copilot` build you have installed today. Some fields it documents are not yet on docs.github.com — see §7.

The guide opens with the discovery contract (verbatim):

> 1. **Discovery**: The CLI scans `.github/extensions/` (project) and the user's copilot config extensions directory for subdirectories containing `extension.mjs`.
> 2. **Launch**: Each extension is forked as a child process with `@github/copilot-sdk` available via an automatic module resolver.
> 3. **Connection**: The extension calls `joinSession()` which establishes a JSON-RPC connection over stdio to the CLI and attaches to the user's current foreground session.
> 4. **Registration**: Tools and hooks declared in the session options are registered with the CLI and become available to the agent.
> 5. **Lifecycle**: Extensions are reloaded on `/clear` (or if the foreground session is replaced) and stopped on CLI exit (SIGTERM, then SIGKILL after 5s).

And the file shape (verbatim):

> Only `.mjs` files are supported (ES modules). The file must be named `extension.mjs`.
> Each extension lives in its own subdirectory.
> The `@github/copilot-sdk` import is resolved automatically — you don't install it.

The minimal skeleton (verbatim from the guide):

```js
import { joinSession } from "@github/copilot-sdk/extension";

await joinSession({
    tools: [],   // Optional — custom tools
    hooks: {},   // Optional — lifecycle hooks
});
```

The guide further pins three things you must internalize:

- **Tool names are globally unique** across all loaded extensions; a collision causes the second extension to *fail to load*.
- **stdout is reserved for JSON-RPC.** Use `session.log()`; never `console.log()`.
- **Authentication and the model surface come from the session.** The extension does **not** mint its own GitHub token, it does **not** open its own HTTPS connection to a model endpoint. It calls `session.sendAndWait({ prompt })` and the runtime routes through the user's already-authenticated `copilot` session.

The reload contract (verbatim):

> ```
> extensions_reload({})
> ```
> This stops all running extensions and re-discovers/re-launches them. New tools are available immediately in the same turn (mid-turn refresh).

This is what makes the inner edit-loop livable: you save `extension.mjs`, run `extensions_reload({})`, and the agent sees the new tool on its next call.

---

## 3. Hands-on part 1 — author and load `clab-summarize`

You will build a single-tool extension named **`clab-summarize`** whose tool, **`clab_summarize`**, asks the runtime model to bullet-summarize an arbitrary blob of text.

### 3.1 Scaffold

🖥️ **Inside `copilot` (recommended path from the guide):**

```text
extensions_manage({ operation: "scaffold", name: "clab-summarize" })
```

This creates `.github/extensions/clab-summarize/extension.mjs` with a working skeleton. (For a personal install, add `location: "user"` and the file lands under your user-level extensions directory instead.)

### 3.2 Replace the body

Open `.github/extensions/clab-summarize/extension.mjs` and replace its body with the file in [`solutions/lab-copilot-cli-extensions/.github/extensions/clab-summarize/extension.mjs`](../solutions/lab-copilot-cli-extensions/.github/extensions/clab-summarize/extension.mjs). The salient bits, all authored from the guide:

- **Import:** `import { joinSession } from "@github/copilot-sdk/extension";` — the only import path the guide documents for extension entry points.
- **Tool registration shape** — `{ name, description, parameters, handler }` — exactly as shown in the guide's "Registering Tools" section.
- **Handler contract** — return either a string or `{ textResultForLlm, resultType }` where `resultType` is one of `"success" | "failure" | "rejected" | "denied"`. The guide is explicit about this surface.
- **Model surface** — the handler calls `session.sendAndWait({ prompt })` to drive the model. Per the guide, this "Send[s] and block[s] until the agent finishes (resolves on `session.idle`)" and `response?.data.content` is the agent's reply. **No hand-rolled `fetch()` to a model endpoint** — that is exactly the antipattern the guide's authentication note rules out.

> 🧠 **Why `session.sendAndWait` and not a custom HTTP call?** Because the extension already has a session — it is the agent's session. The runtime owns the auth token, the model selection (`/model`), the rate limits, and the cost accounting. Re-using the session means the user's `/model` choice is honored automatically and the call shows up in the same telemetry stream as every other turn. Bypassing it is how you ship a security incident.

### 3.3 Reload and inspect

```text
extensions_reload({})
extensions_manage({ operation: "list" })
extensions_manage({ operation: "inspect", name: "clab-summarize" })
```

`list` should include `clab-summarize` with status `loaded` (or whatever the guide's current vocabulary calls "not failed"); `inspect` should show one tool: `clab_summarize`.

### 3.4 Invoke

In the same `copilot` session, type a natural prompt:

> *"Summarize the README of this repository using clab_summarize."*

The agent will pick the new tool out of its catalog (because the description matches the request), call it with `text` = the README contents, and return the bullet summary the runtime model produced.

✅ **Checkpoint:** you have a project-committed extension, the agent discovered its tool, and the tool body delegated back to the runtime model. That last step is the "probabilistic body" half of the synergy.

---

## 4. Hands-on part 2 — gate it with a deterministic `preToolUse` hook

The probabilistic body is powerful, and that is also why it is dangerous. Every call costs tokens. Every call could be a 200 KB paste. The deterministic surface you want in front of it is a **`preToolUse` hook** that rejects the call before the model is ever consulted.

### 4.1 Drop-in the hook config

Copy [`solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json`](../solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json) into your repo's `.github/hooks/` directory.

The shape (per [Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)):

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "type": "command",
        "bash":      "...inline bash that reads stdin and emits permissionDecision...",
        "powershell": "...inline PowerShell with the same contract...",
        "timeoutSec": 5,
        "comment":    "Caps clab_summarize input at 10000 bytes."
      }
    ]
  }
}
```

The hook reads the event JSON from stdin (the runtime passes `{toolName, toolArgs, timestamp, cwd}`) and prints either nothing (call proceeds) or this exact shape (call is denied):

```json
{"permissionDecision":"deny","permissionDecisionReason":"<human-readable>"}
```

### 4.2 The deny-only banner — read this carefully

> 🚨 **`preToolUse` honors `deny` only.** The runtime accepts `"allow"` and `"ask"` permissionDecision values today but **does not act on them** — see [Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration). The mental model the docs reinforce: *the hook is a veto, not a permission grant*. **Absence of `deny` is allow.** A hook that emits `"allow"` is a no-op; one that emits `"ask"` is also a no-op.
>
> Do not internalize an `allow`/`ask` decision model from prior tooling — the hardening lab (`labs/lab-hardening.md`, delivered by Workstream B) re-states this banner verbatim.

### 4.3 Verify the gate fires

1. Reload hooks (drops in on next turn — no `extensions_reload` needed for hook configs; hook configs are re-read on each event).
2. Try a small input: agent calls `clab_summarize`, summary returns. ✅
3. Try an input > 10 KB: the hook prints the deny JSON, the runtime blocks the tool call, the agent receives the rejection reason and explains it back to you. **The model was never called.** That is the cost saving.

### 4.4 Why this matters

Two surfaces, two failure modes:

- **Probabilistic body fails** — wrong summary, hallucinated content, retry needed. Cost: tokens + time.
- **Deterministic gate fails** — call slips through, runs anyway. Cost: tokens + time *and* policy hole.

The `preToolUse` hook is microseconds and certain. The extension body is seconds and approximate. Putting the certain thing in front of the approximate thing is the production pattern this lab teaches.

---

## 5. Hands-on part 3 — trigger it from a deterministic `userPromptSubmitted` hook

The reverse synergy: a **deterministic** pattern in the user's prompt should reliably end up calling the **probabilistic** tool. Concretely, any prompt prefixed `summarize:` should result in a `clab_summarize` call.

### 5.1 Drop-in the hook config

Copy [`solutions/lab-copilot-cli-extensions/.github/hooks/userpromptsubmitted-auto-summarize.json`](../solutions/lab-copilot-cli-extensions/.github/hooks/userpromptsubmitted-auto-summarize.json) into `.github/hooks/`.

It detects `^summarize:` and writes a single audit/telemetry line to stderr.

### 5.2 The honest limitation

> ⚠️ **`userPromptSubmitted` output is not honored by the runtime today** ([Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)): the docs label it as **prompt mutation not supported**. So the hook **cannot** rewrite the prompt to inject a tool call, and the config-file hook surface **cannot** itself call the extension.
>
> What the hook *can* do is **detect** the deterministic trigger — reliably, before the agent reasons over the prompt — and emit telemetry. The actual tool call is then driven by the convention you taught the agent: when a user prompt starts with `summarize:`, the agent should call `clab_summarize` on the rest of the prompt. That convention can be reinforced in the agent's system prompt, in a SKILL.md, or in the tool description itself (the description in `clab-summarize` says "Summarize an arbitrary block of text…", which is enough for most agent reasoning).
>
> **If you read the saved authoring guide and discover an SDK-side `onUserPromptSubmitted` hook that *does* support tool invocation** (e.g. via `setTimeout(() => session.send(...), 0)` to inject a follow-up message), prefer that pattern: the guide documents `session.send()` and `session.sendAndWait()` as the way to programmatically inject messages from inside the extension process. The config-file hook surface is more constrained than the SDK-side hook surface.

The guide is explicit on the SDK-side pattern (verbatim):

> ```js
> hooks: {
>     onUserPromptSubmitted: async (input) => {
>         if (/\\burgent\\b/i.test(input.prompt)) {
>             // Fire-and-forget a follow-up message
>             setTimeout(() => session.send({ prompt: "Please prioritize this." }), 0);
>         }
>     },
> }
> ```
> > **Tip:** Guard against infinite loops if your follow-up message could re-trigger the same hook.

So the production pattern is: **detect the trigger from the JSON hook (deterministic, audited), and *also* register an SDK-side `onUserPromptSubmitted` inside the extension if you want the trigger to actually invoke the tool**. Two surfaces, one trigger, defense in depth.

### 5.3 Verify

1. Type `summarize: the meaning of life is 42 and lots of other stuff…`
2. The JSON hook fires; you see its `[clab-auto-summarize] trigger detected …` line in the timeline.
3. The agent reads the prompt, recognizes the convention, calls `clab_summarize`, returns a summary.

✅ **Checkpoint:** you have a deterministic trigger detector wired around a probabilistic-body tool, and you can honestly explain to a stakeholder what the runtime does and does not enforce today.

---

## 6. Production hygiene

Three operational decisions, made explicit:

- **Project-scope vs user-scope.** Files in `.github/extensions/` are **committed**, reviewed under CODEOWNERS, and shared with the team — that is where `clab-summarize` belongs once the team has agreed it is useful. The user-level extensions directory is **personal** — that is where to keep your idiosyncratic dev-loop extensions (auto-format-on-save, your private summarizer with a sharper prompt, etc.). The guide states: *"Project extensions shadow user extensions on name collision."*
- **Token-cost framing.** Every call to a Copilot CLI extension whose body invokes the model **is** an LLM call. There is no free-tier path. The cheapest cost control you have is the deterministic `preToolUse` gate from §4 — it is microseconds and certain. The next-cheapest is a tight tool description that discourages the agent from calling the tool when it does not need to. The most expensive is fixing it at the model layer with retries.
- **Forward-compat.** Tool allow-lists at the agent and MCP layer compose with the `preToolUse` deny pattern in this lab — see the upcoming `labs/lab-hardening.md` (Workstream B of the materials-gap branch) for the deterministic-control reference and the hardened `code-reviewer` agent that uses it.

---

## 7. Accuracy callouts

### 7.1 `gh extension` vs. Copilot CLI extension vs. MCP server *(restated)*

| | `gh extension` | **Copilot CLI extension** | MCP server |
|---|---|---|---|
| Process | external binary invoked by `gh` | **in-process Node child of `copilot`** | out-of-process server, JSON-RPC |
| Trigger | human typing `gh <verb>` | **agent decides mid-turn** | agent decides mid-turn |
| Discovery | `gh extension install` | `.github/extensions/<name>/extension.mjs` | mcp-config.json |
| Auth | the binary's own | **inherited from the `copilot` session** | the server's own (or delegated) |
| Out-of-scope here | yes | **focus of this lab** | yes (covered in `lab05.md`) |

If you remember nothing else: **the agent is what calls a Copilot CLI extension's tool**, and the runtime is what brokered the call. The user typed the prompt, not the verb.

### 7.2 Documented vs. runtime-only

The runtime authoring guide (`extensions_manage operation: "guide"`) documents fields and APIs that may not yet appear on docs.github.com. Treat these as **runtime-documented; verify against your current build:**

- `joinSession({ tools, hooks, onPermissionRequest, onUserInputRequest })` — the SDK's session-construction shape.
- `session.sendAndWait({ prompt })` — programmatic model invocation from inside an extension; relevant for `clab_summarize`.
- `session.workspacePath`, `session.rpc`, `session.on(eventType, handler)` — session-object surfaces for plan/workspace introspection and event subscription.
- `tool.handler` return shape `{ textResultForLlm, resultType: "success" | "failure" | "rejected" | "denied" }` — the structured result type vs. raw string return.
- The SDK-side hook surface (`onUserPromptSubmitted`, `onPreToolUse`, `onPostToolUse`, `onSessionStart`, `onSessionEnd`, `onErrorOccurred`) inside `joinSession({ hooks: ... })` — distinct from the JSON-config hook surface in `.github/hooks/*.json` documented at [Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration). The two surfaces overlap but are not identical; **prefer the JSON-config surface for things you want auditable in code review, prefer the SDK-side surface for things that require access to `session.send()` / `session.on()`**.

If your local guide disagrees with this lab on any of the above, **trust the guide** — it was emitted by the runtime you actually have installed. Open a PR against this lab to update the wording.

---

## What to commit

After the hands-on, your repo should have:

```
.github/extensions/clab-summarize/extension.mjs
.github/hooks/pretooluse-deny-large-input.json
.github/hooks/userpromptsubmitted-auto-summarize.json
```

The reference copies live at [`solutions/lab-copilot-cli-extensions/`](../solutions/lab-copilot-cli-extensions/).
