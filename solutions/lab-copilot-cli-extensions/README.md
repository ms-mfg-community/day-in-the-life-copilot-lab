# `lab-copilot-cli-extensions` — solution scaffold

Runnable scaffold for [`labs/lab-copilot-cli-extensions.md`](../../labs/lab-copilot-cli-extensions.md).

Three files, three deterministic-vs-probabilistic surfaces:

| File | Surface | Purpose |
|---|---|---|
| `.github/extensions/clab-summarize/extension.mjs` | **Probabilistic** (LLM body) | Single tool `clab_summarize` that calls the runtime model surface via `session.sendAndWait()` and returns a bullet summary. |
| `.github/hooks/pretooluse-deny-large-input.json` | **Deterministic** (gate) | `preToolUse` hook that emits `{"permissionDecision":"deny",…}` when `clab_summarize` is called with text > 10000 bytes. |
| `.github/hooks/userpromptsubmitted-auto-summarize.json` | **Deterministic** (trigger detection) | `userPromptSubmitted` hook that detects the `summarize:` prefix and logs the trigger. Does *not* auto-invoke the tool — see the limitation note in §5 of the lab. |

---

## Authoring source-of-truth

**Every line in `extension.mjs` is authored from the runtime authoring guide** captured by `extensions_manage operation: "guide"` and saved to the session workspace at `~/.copilot/session-state/<id>/files/copilot-cli-extensions-authoring-guide.md`. Do **not** edit the extension based on prior knowledge of Copilot CLI extensions — re-fetch the guide first if the runtime version has moved.

The guide states (verbatim):

> 1. **Discovery**: The CLI scans `.github/extensions/` (project) and the user's copilot config extensions directory for subdirectories containing `extension.mjs`.
> 2. **Launch**: Each extension is forked as a child process with `@github/copilot-sdk` available via an automatic module resolver.
> 3. **Connection**: The extension calls `joinSession()` which establishes a JSON-RPC connection over stdio to the CLI and attaches to the user's current foreground session.

and:

> Only `.mjs` files are supported (ES modules). The file must be named `extension.mjs`.
> Each extension lives in its own subdirectory.
> The `@github/copilot-sdk` import is resolved automatically — you don't install it.

This solution layout follows that contract exactly.

---

## Install (project scope)

You have two equivalent ways to install:

**Option A — scaffold via the runtime tool** (the guide's recommended path):

```text
extensions_manage({ operation: "scaffold", name: "clab-summarize" })
```

Then replace the generated `extension.mjs` body with the file in this directory.

**Option B — drop-in copy** (works because `.github/extensions/<name>/extension.mjs` is the discovery contract):

```bash
# from the repo root that contains your .github/ directory
mkdir -p .github/extensions/clab-summarize .github/hooks
cp solutions/lab-copilot-cli-extensions/.github/extensions/clab-summarize/extension.mjs \
   .github/extensions/clab-summarize/extension.mjs
cp solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json \
   .github/hooks/pretooluse-deny-large-input.json
cp solutions/lab-copilot-cli-extensions/.github/hooks/userpromptsubmitted-auto-summarize.json \
   .github/hooks/userpromptsubmitted-auto-summarize.json
```

```powershell
# PowerShell equivalent
New-Item -ItemType Directory -Force .github/extensions/clab-summarize, .github/hooks | Out-Null
Copy-Item solutions/lab-copilot-cli-extensions/.github/extensions/clab-summarize/extension.mjs `
          .github/extensions/clab-summarize/extension.mjs
Copy-Item solutions/lab-copilot-cli-extensions/.github/hooks/pretooluse-deny-large-input.json `
          .github/hooks/pretooluse-deny-large-input.json
Copy-Item solutions/lab-copilot-cli-extensions/.github/hooks/userpromptsubmitted-auto-summarize.json `
          .github/hooks/userpromptsubmitted-auto-summarize.json
```

> Note: hook configs in `.github/hooks/*.json` are merged by the runtime; if you already have a `default.json` with `preToolUse`/`userPromptSubmitted` arrays you can either keep both files (preferred — keeps the diff scannable) or merge the entries into one config.

---

## Reload and verify

The guide says (verbatim):

> ```
> extensions_reload({})
> ```
> This stops all running extensions and re-discovers/re-launches them. New tools are available immediately in the same turn (mid-turn refresh).
>
> ```
> extensions_manage({ operation: "list" })
> extensions_manage({ operation: "inspect", name: "my-extension" })
> ```
> Check that the extension loaded successfully and isn't marked as "failed".

So, in a `copilot` session:

```text
extensions_reload({})
extensions_manage({ operation: "list" })
extensions_manage({ operation: "inspect", name: "clab-summarize" })
```

The `inspect` output should show one tool: `clab_summarize`.

---

## User-scope alternative

To install for **your user only** (not committed, not shared with the team), use `location: "user"`:

```text
extensions_manage({ operation: "scaffold", name: "clab-summarize", location: "user" })
```

The guide notes:

> For user-scoped extensions (persist across all repos), add `location: "user"`.

Project-scope (`.github/extensions/`) shadows user-scope on name collision.

---

## Smoke test

In a `copilot` session, after `extensions_reload({})`:

1. Type a normal prompt: *"Summarize the contents of `README.md`."* — the agent should call `clab_summarize` and return a bullet summary.
2. Type a deterministic-trigger prompt: `summarize: <paste a paragraph>` — the `userPromptSubmitted` hook fires (you'll see its stderr line in the timeline). The agent then decides to call `clab_summarize` based on the prompt convention. **The hook itself does not invoke the tool** — see the lab's §5 honest-limitation note.
3. Paste an oversize input (>10 KB) into a summarize prompt — the `preToolUse` hook denies the call with a clear reason **before** the LLM body runs. This is the deterministic guardrail in front of the probabilistic body.

---

## Forward-link

For tool allow-lists that compose with the `preToolUse` deny pattern at the agent and MCP layer, see the upcoming `labs/lab-hardening.md` (delivered by Workstream B of this materials-gap branch).
