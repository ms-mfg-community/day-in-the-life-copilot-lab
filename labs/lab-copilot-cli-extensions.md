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

In this lab you will author a **Copilot CLI extension** — a Node.js module that the CLI launches as its own process and that registers a custom tool — and then wire two **hooks** around it: one that deterministically denies oversize inputs *before the extension's own model call is made*, and one that detects a deterministic trigger pattern. The point is to feel the seam where deterministic gates meet probabilistic LLM-backed bodies.

> 🧭 **Track appendices** — track-specific completion variants live at
> [`labs/appendices/dotnet/lab-copilot-cli-extensions.md`](appendices/dotnet/lab-copilot-cli-extensions.md) and
> [`labs/appendices/node/lab-copilot-cli-extensions.md`](appendices/node/lab-copilot-cli-extensions.md).

> 📦 **Solution scaffold** — runnable reference at [`solutions/lab-copilot-cli-extensions/`](../solutions/lab-copilot-cli-extensions/).

> 📋 **Before you start.** This is an **advanced**-tier lab on the **`cli`**
> surface. It assumes the background below and does not re-teach it.
>
> - **You already know:** where Copilot configuration lives, including the
>   `.github/` layout ([Lab 01](lab01.md)); what an MCP server is, because the
>   §1 comparison relies on it ([Lab 05](lab05.md)); and how a hook receives
>   JSON on stdin and answers on stdout ([Lab 06](lab06.md)) — or you have
>   equivalent experience. You can read ES-module JavaScript with
>   `async`/`await`. `lab-gh-extensions.md` is a sibling lab, **not** a
>   prerequisite.
> - **You have:** an authenticated `copilot` session at or above
>   `copilot_cli_version_floor` in
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) (read the number
>   there; this lab does not repeat it), and a repository where you can create
>   files under `.github/`. If your hooks run the `bash` command (macOS, Linux,
>   WSL) you also need `jq` on your `PATH`; §4.1 checks it before you install
>   anything. On Windows the `powershell` command runs instead and needs no `jq`.
> - **Timed route.** Both pace figures above are planning estimates for this
>   route; reading every note takes longer. Prepare first: be signed in, and
>   run `extensions_manage({ operation: "guide" })` once to get the paths of
>   your two installed guide files (see References). Then read only these guide
>   headings: `extensions.md` → *How Extensions Work*; `agent-author.md` →
>   *Workflow*, *Registering Tools*, *Registering Hooks* (the `onPreToolUse`
>   and `onUserPromptSubmitted` entries), *Session Object* (the
>   `session.sendAndWait` entry) and *Gotchas*. Your build may word its
>   headings a little differently. Work through §1–§5 in order, read §7.2's
>   caveat, then do §8. **Reference-only — skim or skip on this route:** the
>   *Copilot CLI currency* block and its correction note, the 🔗 hook-stacking
>   note in §4.2, the optional SDK follow-up in §5.2, §6, and §7.1 (a
>   restatement of §1). If you are presenting, stage the three artifacts
>   beforehand and demonstrate the three checkpoints (§3.4, §4.3, §5.3) rather
>   than reading code aloud.

References (read for canonical contracts):

- Runtime authoring guide (installed with your `copilot` build): in your own `copilot` session, call `extensions_manage({ operation: "guide" })`. It does not hand back a saved file — it returns the paths of the extension documentation that shipped with your CLI (an `extensions.md` and an `agent-author.md`). Open those two files (on the timed route above, read only the headings it names). **They are the source of truth for every extension code line in this lab**; if they disagree with this lab, trust them.
- [Hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference)
- [About hooks](https://docs.github.com/en/copilot/concepts/agents/hooks) — covers both Copilot CLI and Copilot cloud agent

---

## Copilot CLI currency (2026 refresh)

*Reference-only on the timed route — skim or skip.*

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (GA June 23, 2026):** `/plugin`, `/mcp`, and
> `/skills` are real interactive commands backed by an in-terminal dashboard —
> you can discover, install, and configure plugins, MCP servers, and skills
> without hand-editing config files. The terminal also gained tabs for
> browsing issues/PRs/gists. Config-file editing still works and is what the
> underlying `extensions_manage` MCP tool inspects, but the dashboard is now
> the primary interactive path for a human at the prompt.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` (or the `/plugin` dashboard) | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto` to let Copilot choose) | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. The tier names are registry keys, not `/model` arguments. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to switch modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

> ⚠️ **Lab-local correction to the block above.** `extensions_manage` covers
> extension discovery, metadata, status, logs, and authoring (`scaffold` and
> `guide`). It does **not** enumerate agents or skills, and it does not inspect
> configuration files. For the environment-wide overview — instructions, MCP
> servers, skills, agents, plugins, and loaded extensions — run `/env` at the
> prompt. The block above is synced from `docs/_partials/currency.md`, so this
> lab corrects it here rather than editing the include.

## 1. Two extension worlds, one workshop

Three things are called "extensions" or "tools" in the GitHub/Copilot world. They are **not interchangeable** and learners conflate them constantly. Read this once, slowly, before doing anything else.

| | `gh extension` | **Copilot CLI extension** *(this lab)* | MCP server |
|---|---|---|---|
| **Where it runs** | External binary or interpreter, invoked by the `gh` CLI | **A separate Node.js process that the Copilot CLI launches**, talking to the CLI over JSON-RPC via stdio | Out-of-process server (stdio or HTTP), bridged via the Model Context Protocol |
| **What it exposes** | A new `gh <verb>` subcommand to your shell | **Tools (and lifecycle hooks) registered with the agent** via `joinSession()` | Tools, resources, prompts via MCP JSON-RPC |
| **Who calls it** | A human at the shell, or scripts | **The Copilot agent**, mid-turn, as part of its tool loop | The Copilot agent (or any MCP client), mid-turn |
| **Discovery** | `gh extension install owner/repo` | `.github/extensions/<name>/extension.mjs` (project) or user-level extensions dir | `<workspace>/.mcp.json` (project) or `~/.copilot/mcp-config.json` (user) |
| **Sibling lab** | `lab-gh-extensions.md` | **this lab** | `labs/lab05.md` |

`gh extension` is a *shell* extension surface; the user types `gh foo`. **Copilot CLI extensions are a runtime extension surface**; the agent (not the user) decides to call the tool, in the middle of a turn, based on the tool description you wrote. MCP servers are a *protocol* extension surface: a generic server that any MCP client can talk to. A Copilot CLI extension also runs as its own process, so process isolation is **not** what sets it apart — what sets it apart is that it is specific to Copilot CLI and attaches to your live `copilot` session through `joinSession()`, which is how it can register lifecycle hooks and send prompts into that session.

The rest of this lab is about the **middle column**.

---

## 2. Authoring fundamentals from the runtime guide

> ⚠️ **Read this section against the authoring guide installed with your build, not out of memory.** Run `extensions_manage({ operation: "guide" })` in your own `copilot` session to get the paths of the extension documentation that shipped with the `copilot` build you have today. Some fields it documents are not yet on docs.github.com — see §7.

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

> ⚠️ **Re-entrancy caution — `session.sendAndWait` inside a tool handler (unverified; see §7.2).** The guide describes `sendAndWait` as "Send and block until the agent finishes (resolves on `session.idle`)". It shows that call on its own, never from inside a tool handler, and states no rule either way — so the guide cannot confirm that the `clab_summarize` handler in §3.2, which does exactly that, is safe on your build. Be cautious because, while your handler runs, the agent turn that called it is still open and the call waits for idle; the SDK typings note that other queued work "may delay session.idle", which is the mechanism by which an open calling turn can stall `sendAndWait` (not a guaranteed deadlock). The SDK typings give that wait a 60-second default and say it throws when it runs out; the shipped handler catches the error and returns a `failure` result, and §3.4 is where you find out what happens on your build. For injecting a follow-up message the guide's own pattern is fire-and-forget: `session.send()`, deferred with `setTimeout(() => session.send(...), 0)` inside `onUserPromptSubmitted` (its *Gotchas* say not to call `session.send()` synchronously there).

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
- **Model surface** — the handler calls `session.sendAndWait({ prompt })` to drive the model. Per the guide, this "Send[s] and block[s] until the agent finishes (resolves on `session.idle`)" and `response?.data.content` is the agent's reply. **No hand-rolled `fetch()` to a model endpoint** — that is exactly the antipattern the guide's authentication note rules out. This is the call the §2 re-entrancy caution is about; read it before §3.4.

> 🧠 **Why `session.sendAndWait` and not a custom HTTP call?** Because the extension already has a session — it is the agent's session. The runtime owns the auth token, the model selection (`/model`), the rate limits, and the cost accounting. Re-using the session means the user's `/model` choice is honored automatically and the call shows up in the same telemetry stream as every other turn. Bypassing it is how you ship a security incident.

### 3.3 Reload and inspect

```text
extensions_reload({})
extensions_manage({ operation: "list" })
extensions_manage({ operation: "inspect", name: "clab-summarize" })
```

`list` should include `clab-summarize` with status `loaded` (or whatever the guide's current vocabulary calls "not failed"); `inspect` should show one tool: `clab_summarize`.

> ⚠️ **`extensions_manage operation: "list"` can under-report.** The `list` snapshot is taken from the runtime's in-memory extension registry, which is populated at session start and refreshed only on `extensions_reload({})` or `/clear`. Extensions whose source dir was added to `.github/extensions/` **after** the current `copilot` session started will not appear in `list` until you call `extensions_reload({})` (mid-turn refresh) or restart `copilot`. If a teammate just `cp`'d a new extension into your worktree and you don't see it in `list`, run `extensions_reload({})` first and re-check — do not assume the file is broken.

### 3.4 Invoke

In the same `copilot` session, type a natural prompt:

> *"Summarize the README of this repository using clab_summarize."*

The agent will pick the new tool out of its catalog (because the description matches the request), call it with `text` = the README contents, and return the bullet summary the runtime model produced.

**This step is also the test of the §2 caution.** The expected result is a short bullet summary. If you instead see `clab_summarize failed: …` or `model returned no content` in the agent's reply, or the call stalls (the SDK's default wait is 60 seconds), the caution applied on your build: note the exact message and tell your presenter or the lab owner — it is not a slip in how you followed the steps.

✅ **Checkpoint:** if you got the summary, you have a project-scoped extension, the agent discovered its tool, and the tool body delegated back to the runtime model — the "probabilistic body" half of the synergy. If you got a failure message, you have still shown that the extension loads and that the agent calls it, plus a precise observation about `sendAndWait` inside a tool handler. The §4 and §5 checkpoints are judged on whether the tool call is allowed, denied, or invoked — not on summary content.

---

## 4. Hands-on part 2 — gate it with a deterministic `preToolUse` hook

The probabilistic body is powerful, and that is also why it is dangerous. Every call costs tokens. Every call could be a 200 KB paste. The deterministic surface you want in front of it is a **`preToolUse` hook** that rejects the call before the extension body runs.

Keep the order of events straight, because the cost claim depends on it: your prompt → the agent reasons and **proposes** the tool call → **the `preToolUse` hook decides** → only if the call is allowed, the extension body runs and asks the model to summarize (its `sendAndWait`). The agent's own turn happens either way, so a denial saves the body's *additional* model work, not all model activity.

### 4.1 Drop-in the hook config

**Preflight — `jq`.** The `bash` command in this hook parses the event JSON with `jq`. Without it the hook exits 0 with nothing on stdout, so it makes no decision and the gate silently never fires — and you would not find out until §4.3. Check now:

**WSL/Bash:**
```bash
command -v jq >/dev/null 2>&1 && echo "jq: found" || echo "jq: MISSING - install jq before copying the hook (the bash hook needs it)"
```

**PowerShell:**
```powershell
if (Get-Command jq -ErrorAction SilentlyContinue) { 'jq: found' } else { 'jq: not found - fine if your hooks run the powershell command; install jq if they run bash' }
```

- **macOS, Linux or WSL (the `bash` command runs):** if it prints `MISSING`, **stop here**. Install `jq` with your package manager, run the check again, and copy the hook only after it prints `found`.
- **Windows (the `powershell` command runs):** `not found` is fine — that branch does not use `jq`. Go on.

Now copy [`solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json`](../solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json) into your repo's `.github/hooks/` directory.

The shape (per the [Hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference)):

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
        "comment":    "Caps clab_summarize input at about 10 KB."
      }
    ]
  }
}
```

The hook reads the event JSON from stdin (the runtime passes `{toolName, toolArgs, timestamp, cwd}`) and prints either nothing (this hook makes no decision, so the default permission flow runs) or this exact shape (call is denied):

```json
{"permissionDecision":"deny","permissionDecisionReason":"<human-readable>"}
```

### 4.2 What `preToolUse` can decide — and why this hook only vetoes

> 🚨 **`preToolUse` has three decisions, and this lab's hook uses only one.** `permissionDecision` accepts `"allow"`, `"deny"`, or `"ask"` (a `deny` must also carry a `permissionDecisionReason`), and a hook can also rewrite the call's arguments with `modifiedArgs` — see the [Hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#pretooluse-decision-control). Emitting **nothing** is not an `allow`: with empty output the hook makes no decision and the default permission flow applies. An `ask` is denied in CLI autopilot mode and under cloud agent.
>
> Veto-only is this lab's design choice, not a limit of the platform: a gate that only ever emits `deny` never has to ask anyone anything, which makes it the easiest kind to reason about. The hardening lab ([`labs/lab-hardening.md`](lab-hardening.md)) applies the same deterministic-gate idea to tool allow-lists.

> 📏 **Bytes vs. characters — the cap is about 10 KB, counted in bytes.** The bash hook uses `wc -c`, which counts **bytes**, not characters (`wc -m` is the character counter, and it depends on the current locale). The PowerShell branch uses `[System.Text.Encoding]::UTF8.GetByteCount($args.text)`, which is also a byte count. This matters when the input contains multi-byte UTF-8 (emoji, CJK, accented Latin): a 5000-character paste of CJK is ~15000 bytes and **will** trip the deny gate, which is the intent — token cost scales with bytes-on-the-wire, not glyphs-on-screen.
>
> **The two branches do not agree to the last byte.** The bash branch pulls the text out with `jq -r`, which appends a trailing newline, and `wc -c` then counts that newline — so for the same input bash sees one byte more than PowerShell does. An input of exactly 10000 ASCII bytes is therefore denied by the bash branch and allowed by the PowerShell branch. The PowerShell branch has a second quirk with non-ASCII text: it reads the hook's input through the console's input encoding, so on a Windows console that is not set to UTF-8 it can count a multi-byte character at two to three times its real width. Treat the cap as "about 10 KB": check the gate with plain-ASCII input that is clearly small and one that is clearly large, not one sitting right on the line. If you re-tune the threshold, change both branches together and expect those differences. (The bash branch also needs `jq` on your `PATH`; without it the hook exits 0 with nothing on stdout, so no decision is made and the gate never fires.)

> 🔗 **Hook stacking — same event, multiple sources.** *(Reference-only on the timed route.)* Hook config files are not read from just one place. The [Hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#hooks-locations) says they are loaded in this order — **policy, then user, then project, then plugins** — and combined. When the same event appears in more than one source, **every** matching hook entry from every source runs. So hooks in your user-level `~/.copilot/hooks/` directory load *ahead of* the ones you copied into the repo's `.github/hooks/`, not after them, and the gate in this lab is never "the only handler" — it is "one of N handlers." Design for that: keep each gate cheap and self-contained, put a cheap deny gate (a byte cap) ahead of an expensive one (one that shells out to a regex evaluator) as a habit rather than a guarantee, and do not rely on one hook's `deny` to stop the others from running. This holds for every event (`preToolUse`, `userPromptSubmitted`, and the rest).

### 4.3 Verify the gate fires

1. Reload hooks (drops in on next turn — no `extensions_reload` needed for hook configs; hook configs are re-read on each event).
2. Try a small input: agent calls `clab_summarize`, summary returns. ✅ — or, if §3.4 returned `clab_summarize failed: …`, the same failure again; either way the call was allowed through. Step 3 does not depend on a working summary.
3. Try an input > 10 KB: the hook prints the deny JSON, the runtime blocks the tool call, and the agent — which still ran its own turn to propose the call — receives the rejection reason and explains it back to you. **The extension body never ran, so its extra model call (`sendAndWait`) was never made.** That is the cost saving: a denial avoids the body's additional model work, not the agent's own turn.

### 4.4 Why this matters

Two surfaces, two failure modes:

- **Probabilistic body fails** — wrong summary, hallucinated content, retry needed. Cost: tokens + time.
- **Deterministic gate fails** — call slips through, runs anyway. Cost: tokens + time *and* policy hole.

The `preToolUse` hook is microseconds and certain. The extension body is seconds and approximate. Putting the certain thing in front of the approximate thing is the production pattern this lab teaches.

---

## 5. Hands-on part 3 — trigger it from a deterministic `userPromptSubmitted` hook

The reverse synergy: a **deterministic** pattern in the user's prompt (a `summarize:` prefix) should lead to the **probabilistic** tool being called. Set the expectation before you install anything: **the JSON hook in §5.1 only detects the prefix and logs it — it does not call `clab_summarize`.** Whether the agent calls the tool is the agent's own decision, shaped by an instruction you give it in §5.3. That is observed cooperation, not deterministic enforcement.

### 5.1 Drop-in the hook config

Copy [`solutions/lab-copilot-cli-extensions/.github/hooks/userpromptsubmitted-auto-summarize.json`](../solutions/lab-copilot-cli-extensions/.github/hooks/userpromptsubmitted-auto-summarize.json) into `.github/hooks/`.

It detects `^summarize:` and writes a single audit/telemetry line to stderr — that is all it does (detector only). Its `bash` command uses `jq` too, so the §4.1 preflight covers it as well.

### 5.2 The honest limitation

> ⚠️ **A `userPromptSubmitted` hook defined in a config file cannot rewrite the prompt.** The [Hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#userpromptsubmitted--userpromptsubmit) documents a `modifiedPrompt` output that replaces the prompt for the rest of the turn, but it applies only to SDK programmatic hooks — the kind an extension registers. For command and HTTP hooks defined in a config file, the output (`modifiedPrompt` included) is dropped. So the limitation belongs to the **config-file hook surface**, not to the runtime as a whole: the JSON hook **cannot** rewrite the prompt to inject a tool call, and it **cannot** itself call the extension.
>
> What the hook *can* do is **detect** the deterministic trigger — reliably, before the agent reasons over the prompt — and emit telemetry. The actual tool call is then driven by a convention you give the agent in §5.3: when a user prompt starts with `summarize:`, the agent should call `clab_summarize` on the rest of the prompt. That convention can be stated in the conversation (as §5.3 does), reinforced in the agent's system prompt or in a SKILL.md, or hinted at in the tool description. The description in `clab-summarize` ("Summarize an arbitrary block of text…") is generic — it says what the tool does, not that a `summarize:` prefix should trigger it — so it does not establish the convention on its own.
>
> **Optional follow-up — not a step in this lab, and nothing in the solution files changes for it.** **If the runtime authoring guide (see §7.2) documents an SDK-side `onUserPromptSubmitted` hook that *does* support tool invocation** (e.g. via `setTimeout(() => session.send(...), 0)` to inject a follow-up message), prefer that pattern: the guide documents `session.send()` and `session.sendAndWait()` as the way to programmatically inject messages from inside the extension process. The reference above already points at the right surface — `modifiedPrompt` is for SDK programmatic hooks — and the config-file hook surface is more constrained than the SDK-side hook surface.

The runtime guide is explicit on the SDK-side pattern (verbatim; this is a §7.2 runtime-documented item, so verify it against your build):

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

If you take that follow-up later, the pattern is: **detect the trigger from the JSON hook (deterministic, audited), and *also* register an SDK-side `onUserPromptSubmitted` inside the extension if you want a follow-up message injected when the trigger fires**. Two surfaces, one trigger, defense in depth. Note what the guide's example shows: it injects a follow-up *message* with `session.send()`; the agent still decides whether to call a tool in response, so this narrows the gap rather than making the tool call deterministic.

### 5.3 Verify

1. **Give the agent the convention.** The hook only detects the prefix, so tell the agent what to do with it. In the same `copilot` session, type:

   > *"For the rest of this session: when a message of mine starts with `summarize:`, call `clab_summarize` with everything after the colon as `text`."*

2. Type `summarize: the meaning of life is 42 and lots of other stuff…`
3. **The deterministic part.** The JSON hook runs and writes its `[clab-auto-summarize] trigger detected …` line to stderr. The Hooks reference documents stderr being surfaced to you for exit code 2, and this hook exits 0, so your CLI may not show the line — that is not a failure, and nothing below depends on it.
4. **The observed part.** Watch what the agent does. If it calls `clab_summarize` and returns a summary — or gets the §3.4 `clab_summarize failed: …` result, which still means the convention worked because the tool call happened (the failure is the §2 `sendAndWait` caution, not part 3) — that is the agent following the instruction from step 1 — the hook did not cause it, and different wording or a different model can change the outcome. If it answers in prose instead, the convention did not take: restate it and try again. Either outcome is an honest result.

✅ **Checkpoint:** you can say which part is enforced (the hook detects and logs the `summarize:` prefix whenever a prompt starts with it) and which is only observed (the agent choosing to call the tool), and explain that difference to a stakeholder.

---

## 6. Production hygiene

*Reference-only on the timed route.*

Three operational decisions, made explicit:

- **Project-scope vs user-scope.** Files in `.github/extensions/` are **committed**, reviewed under CODEOWNERS, and shared with the team — that is where `clab-summarize` belongs once the team has agreed it is useful. The user-level extensions directory is **personal** — that is where to keep your idiosyncratic dev-loop extensions (auto-format-on-save, your private summarizer with a sharper prompt, etc.). The guide states: *"Project extensions shadow user extensions on name collision."*
- **Token-cost framing.** Every call to a Copilot CLI extension whose body invokes the model adds an LLM call on top of the agent turn that proposed it. There is no free-tier path. The cheapest cost control you have is the deterministic `preToolUse` gate from §4 — it is microseconds and certain, and it prevents the body's additional model call (the agent's own turn still happens). The next-cheapest is a tight tool description that discourages the agent from calling the tool when it does not need to. The most expensive is fixing it at the model layer with retries.
- **Forward-compat.** Tool allow-lists at the agent and MCP layer compose with the `preToolUse` deny pattern in this lab — see [`labs/lab-hardening.md`](lab-hardening.md) for the deterministic-control reference and the locked-down `tight-reviewer` agent that pairs with it.

---

## 7. Accuracy callouts

### 7.1 `gh extension` vs. Copilot CLI extension vs. MCP server *(restated)*

*Reference-only on the timed route — this repeats the §1 table.*

| | `gh extension` | **Copilot CLI extension** | MCP server |
|---|---|---|---|
| Process | external binary invoked by `gh` | **a separate Node.js process launched by `copilot`**, JSON-RPC over stdio | out-of-process server, JSON-RPC |
| Trigger | human typing `gh <verb>` | **agent decides mid-turn** | agent decides mid-turn |
| Discovery | `gh extension install` | `.github/extensions/<name>/extension.mjs` | mcp-config.json |
| Auth | the binary's own | **inherited from the `copilot` session** | the server's own (or delegated) |
| Out-of-scope here | yes | **focus of this lab** | yes (covered in `lab05.md`) |

If you remember nothing else: **the agent is what calls a Copilot CLI extension's tool**, and the runtime is what brokered the call. The user typed the prompt, not the verb.

### 7.2 Documented vs. runtime-only

The runtime authoring guide — the installed documentation whose paths `extensions_manage({ operation: "guide" })` returns — documents fields and APIs that may not yet appear on docs.github.com. Treat these as **runtime-documented; verify against your current build:**

- `joinSession({ tools, hooks, onPermissionRequest, onUserInputRequest })` — the SDK's session-construction shape.
- `session.sendAndWait({ prompt })` — programmatic model invocation from inside an extension; relevant for `clab_summarize`. The guide shows it as a standalone call, not from inside a tool handler — see the §2 caution.
- `session.workspacePath`, `session.rpc`, `session.on(eventType, handler)` — session-object surfaces for plan/workspace introspection and event subscription.
- `tool.handler` return shape `{ textResultForLlm, resultType: "success" | "failure" | "rejected" | "denied" }` — the structured result type vs. raw string return.
- The SDK-side hook surface (for example `onUserPromptSubmitted`, `onPreToolUse`, `onPostToolUse`, `onSessionStart`, `onSessionEnd`, `onErrorOccurred` — an illustrative list, not an exhaustive one; the runtime guide documents more) inside `joinSession({ hooks: ... })` — distinct from the JSON-config hook surface in `.github/hooks/*.json` documented at the [Hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference). The two surfaces overlap but are not identical; **prefer the JSON-config surface for things you want auditable in code review, prefer the SDK-side surface for things that require access to `session.send()` / `session.on()`**.

If your local guide disagrees with this lab on any of the above, **trust the guide** — it ships with the runtime you actually have installed. Open a PR against this lab to update the wording.

---

## What to commit

After the hands-on, your repo should have:

```
.github/extensions/clab-summarize/extension.mjs
.github/hooks/pretooluse-deny-large-input.json
.github/hooks/userpromptsubmitted-auto-summarize.json
```

The reference copies live at [`solutions/lab-copilot-cli-extensions/`](../solutions/lab-copilot-cli-extensions/).

## 8. Cleanup

This lab changes two things that the generic sweep (below) does **not** touch automatically: the **extension registry** (the set of extensions your session has launched) and the **hook config** (the `.github/hooks/*.json` files your session reads). The runtime authoring guide describes `extensions_reload({})` as stopping all running extensions and re-discovering and re-launching them, and says extensions are reloaded on `/clear` and stopped on CLI exit — *runtime-documented; verify against your current build*. Whatever your build does, the surest way to know both match the filesystem is to fully exit `copilot` and re-launch, so that is what the recipe below has you do.

🖥️ **Lab-specific recipe — run before the generic sweep:**

1. **Inside the running `copilot` session,** type `exit` (or send `Ctrl-D`) to end the session cleanly. Prefer this over `/clear` or `extensions_reload({})`: the runtime guide documents extensions as stopped on CLI exit (*runtime-documented; verify against your current build*), and a fresh process is the only way to see exactly what the next session will load.

   **WSL/Bash and PowerShell:**
   ```text
   exit
   ```

2. **From your shell,** confirm the `copilot` process is gone:

   **WSL/Bash:**
   ```bash
   pgrep -af '^copilot( |$)' || echo 'no copilot process — clean'
   ```

   **PowerShell:**
   ```powershell
   Get-Process -Name copilot -ErrorAction SilentlyContinue
   ```

3. **Remove the lab artifacts** (or stash them for review). The three files listed under **What to commit** above are:

   ```text
   .github/extensions/clab-summarize/extension.mjs
   .github/hooks/pretooluse-deny-large-input.json
   .github/hooks/userpromptsubmitted-auto-summarize.json
   ```

   If you want the next lab to start from a clean slate, **delete** them, from your repo root — and do not reach for `git checkout -- <path>` to do it. A path checkout restores files *from the index*: it never removes a file, and it cannot bring back one that git does not track. The commands below remove the files whether or not you ever committed them: `git rm` deletes the ones git tracks (it stages the deletion and discards any uncommitted edits to them), the plain delete removes any that git never tracked, and the last line removes the extension folder, but only if it is now empty:

   **WSL/Bash:**
   ```bash
   paths=(
     .github/extensions/clab-summarize/extension.mjs
     .github/hooks/pretooluse-deny-large-input.json
     .github/hooks/userpromptsubmitted-auto-summarize.json
   )
   git rm -q -f --ignore-unmatch -- "${paths[@]}"
   rm -f "${paths[@]}"
   rmdir .github/extensions/clab-summarize 2>/dev/null || true   # only removes the folder if it is now empty
   ```

   **PowerShell:**
   ```powershell
   $paths = @(
       '.github/extensions/clab-summarize/extension.mjs'
       '.github/hooks/pretooluse-deny-large-input.json'
       '.github/hooks/userpromptsubmitted-auto-summarize.json'
   )
   git rm -q -f --ignore-unmatch -- $paths
   Remove-Item -Force -ErrorAction SilentlyContinue $paths
   $ext = '.github/extensions/clab-summarize'
   if ((Test-Path $ext) -and -not (Get-ChildItem $ext -Force)) { Remove-Item $ext }   # only if the folder is now empty
   ```

   If `git status --short` then shows staged deletions (`D`), you had committed the files — commit the removal like any other change. If you want to keep them, leave them — they will simply re-register on the next `copilot` launch.

4. **Re-launch `copilot`.** The fresh process re-scans `.github/extensions/` and re-reads `.github/hooks/*.json` from disk, so whatever state you chose in step 3 is the state the new session sees:

   **WSL/Bash and PowerShell:**
   ```text
   copilot
   ```

5. **Verify the registry matches the filesystem:**

   ```text
   extensions_manage({ operation: "list" })
   ```

   If the listing matches your step-3 decision (either `clab-summarize` is present, or it is gone), the cleanup worked. If not, you have a stale registry — re-run step 1 and step 4.

Then run the generic sweep below.

> ⚠️ **A caveat on the sweep's step 3.** The shared checklist below says `extensions_reload` does **not** clear an extension whose source dir was deleted. The runtime authoring guide describes `extensions_reload` differently: it stops all running extensions and re-discovers and re-launches them, with no stated exception for deleted directories (*runtime-documented; verify against your current build*). Treat that one sentence as unsettled rather than as fact, and rely on the full exit and restart in steps 1 and 4 above — it gives the right answer whichever of the two is correct.

<!-- @include docs/_partials/cleanup.md — do not edit inline; edit the partial and re-sync. -->
> 🧹 **Cleanup — leave the machine the way you found it.**
> Run this checklist before moving to the next lab. Per-lab specifics (named
> agent / hook / extension files this lab created) should already have been
> reverted in the steps above; this is the generic sweep that catches the
> long-tail.

🖥️ **In your terminal:**

1. **Stop background processes.** Anything you started in the foreground with
   `&` or in another tmux pane (dev servers, watchers, `gh aw` long-runs,
   tail-follows). If you used the bash tool in async mode, make sure those
   shells are stopped.

   **WSL/Bash:**
   ```bash
   jobs -l                       # any background jobs in this shell?
   # kill them by PID — never `pkill`/`killall`
   ```

   **PowerShell:**
   ```powershell
   Get-Job                       # any background jobs?
   Get-Job | Stop-Job; Get-Job | Remove-Job
   ```

2. **Restore Copilot CLI config if you mutated it.** Some labs ask you to
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json`. If you stashed the original, restore it now.
   If you edited in place without backing up, check `git status` in the lab
   repo (workspace configs) and revert anything you didn't mean to keep.

   **WSL/Bash:**
   ```bash
   # If you saved a backup like ~/.copilot/config.json.bak:
   [ -f ~/.copilot/config.json.bak ] && mv ~/.copilot/config.json.bak ~/.copilot/config.json
   ```

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** These directories accumulate
   across labs and are safe to clean once you've finished:

   ```bash
   # Per-session scratch (safe to inspect; delete only what this lab created):
   ls ~/.copilot/lessons/        2>/dev/null
   ls node/.a2a/                  2>/dev/null
   ls node/.a2a-transcript-*.md   2>/dev/null
   ls .git/CLAB_SUMMARY.md        2>/dev/null
   ```

   Delete only files that this lab created. Do not blanket-delete
   `~/.copilot/lessons/` if other sessions wrote to it.

5. **Revert any `core.hooksPath` or other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise.

   ```bash
   git config --get core.hooksPath
   # if set to a lab path, unset:
   git config --unset core.hooksPath
   ```

6. **Confirm working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Any unexpected files (untracked agents, hooks, extensions, scratch
   notebooks) should be removed or moved out of the repo before continuing.

7. **Verify build is still green.** Optional but recommended after labs that
   touched hooks, agents, or skills:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept) and the build is clean, you're ready for the next lab.
<!-- @end-include docs/_partials/cleanup.md -->
