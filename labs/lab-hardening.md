---
title: "Hardening Skills, Agents, and MCP for Deterministic Production Use"
lab_number: hardening
pace:
  presenter_minutes: 5
  self_paced_minutes: 20
registry: docs/_meta/registry.yaml
---

# Lab — Hardening Skills, Agents, and MCP for Deterministic Production Use

> ⚠️ **Read this first — default-deny is a blast-radius choice, not a runtime
> limitation.** A `preToolUse` hook returns a `permissionDecision` of `allow`,
> `deny`, or `ask`, and the
> [hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference#pretooluse-decision-control)
> documents all three as controlling whether the tool runs. `ask` needs a
> person to answer, so under cloud agent and in Copilot CLI autopilot mode it
> is treated as `deny`. Empty output is no approval either: it follows the
> normal permission flow. The hook in this lab still emits **only** `deny`, by
> design — a default-deny allow-list fails safe for tools added later, and a
> hook that only denies can only narrow what a session may do. **Absence of
> deny is allow** simply means the hook did not block the call.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 20 minutes — the callout above is
> the single highest-leverage takeaway of this lab: every guardrail we build
> below is default-deny because of the blast radius it leaves (the set of
> actions a compromised or misconfigured agent could perform), not because of a
> runtime limitation. The 20 minutes is the hands-on route in the next callout;
> the reading and setup are pre-work.

> 🎓 **Advanced-tier lab — Copilot CLI, in a terminal.** It builds on skills it
> does not teach (custom-agent frontmatter, the JSON a hook receives on stdin,
> basic Git), so finish the §0 pre-work and preflight *before* the clock
> starts. Commands run in a terminal; edit files in any editor. In this lab,
> §3.3 means step 3 of section 3, and so on.
>
> - **Self-paced (20 minutes):** §1.1 → §1.2 → §2.1 → §2.2 → §3.1 → §3.2 →
>   §3.3 → Cleanup. The three model runs in §3 are round-trips you do not
>   control, so treat 20 as a planning figure, not a target.
> - **Pre-work (outside the 20 minutes):** the reference reading below and the
>   §0 preflight.
> - **Optional — skip freely:** the §1.3 `/agent` picker check and standalone
>   review, and the `git stash` sidebar in §3.3. Nothing in §3 depends on them.
> - **Presenting (5 minutes):** run §1–§3 beforehand and present from that
>   run — about 1 minute on the takeaway above, 1 on the two gates (agent
>   allow-list, then hook), 1 on the §3.1 positive control, 1½ on the §3.3
>   independent-hook check, and ½ on "the hook stays armed — clean up".

This lab is the hands-on counterpart to
[`docs/copilot-config-reference.md`](../docs/copilot-config-reference.md) —
the canonical parameter reference for skills, custom agents, MCP servers, and
hooks. The reference doc is the *what*; this lab is the *how*. Before you
start, read §2 (custom agents), §4 (hooks), and §6 (two-layer tool gating) of
the reference — that reading is pre-work, outside the 20 minutes — and keep it
open for look-ups as you go.

You will build two production-ready guardrails. First, a custom agent
(`tight-reviewer`) whose frontmatter enumerates exactly the MCP tools it is
permitted to call — an explicit allow-list, no `shell`, no `edit`. Second, a
`preToolUse` hook (`deny-unlisted-tools.json`) that emits `deny` whenever a
tool call falls outside an allow-list, so even a misconfigured `tools:` line
on the agent frontmatter is caught before execution. Belt **and** braces.

> 📎 **Wildcards in `tools:` — supported, but use sparingly.** The frontmatter
> `tools:` field **does** accept wildcards: `*` for every tool, and
> `server/*` for every tool one MCP server exposes (e.g. `microsoft-learn/*`
> — see [config reference §2.2](../docs/copilot-config-reference.md#22-tools-allow-list-grammar)).
> The hardening posture below avoids them on purpose: an exact allow-list is
> the smallest blast-radius. Reach for a wildcard only when you genuinely
> need every tool under a namespace and you have reviewed what that
> namespace contains today **and** how it might grow tomorrow.

> 🪪 **The shell tool goes by several names.** The same shell-execution tool
> is spelled differently depending on where you look: agent frontmatter
> accepts `execute`, `shell`, `Bash`, and `powershell` (case-insensitive —
> [config reference §2.2](../docs/copilot-config-reference.md#22-tools-allow-list-grammar)),
> while a hook sees a concrete runtime name in `toolName`, such as `bash` or
> `powershell`. The agent allow-list and the hook in §2 are both
> default-deny via allow-list, so every spelling is blocked automatically. If
> you ever flip to a deny-list, enumerate **every** spelling or one will
> bypass the gate.

> 🧭 **Track appendices** — stack-specific completion notes live in
> [`labs/appendices/dotnet/lab-hardening.md`](appendices/dotnet/lab-hardening.md) and
> [`labs/appendices/node/lab-hardening.md`](appendices/node/lab-hardening.md).

Reference solution: [`solutions/lab-hardening/`](../solutions/lab-hardening/README.md).

## 0 — Prerequisites and pre-work

This is an **advanced-tier lab**: it builds on skills it does not re-teach, and
equivalent experience is fine. Finish this section — and the reference reading
named in the introduction — *before* the 20 minutes start.

**Skills you need:**

- Custom-agent files and their YAML frontmatter, especially the `tools:`
  allow-list — [Lab 03](lab03.md).
- How a hook receives its event as JSON on **stdin** (including the `toolName`
  field) and answers on stdout — [Lab 06](lab06.md).
- Wiring an MCP server into Copilot CLI — [Lab 05](lab05.md).
- Basic Git: creating a throwaway branch (§3.3) and — only for the optional
  sidebar there — `git stash`.

🖥️ **Before you start — preflight, in your terminal:**

- **A working, signed-in Copilot CLI.** `copilot --version` should print a
  version at or above `copilot_cli_version_floor` in
  [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). If you are not
  signed in yet, run `copilot login` once.
- **The repo root.** Run every command in this lab from the root of this
  repository's checkout: `ls solutions/lab-hardening` (the same in Bash and
  PowerShell) should list `tight-reviewer.agent.md` and
  `deny-unlisted-tools.json`. Use a checkout you can dedicate to the lab — §2
  installs a default-deny hook that applies to every Copilot session in that
  repo until Cleanup removes it.
- **`jq`, if your Copilot CLI runs on macOS, Linux, or WSL.** Those platforms
  run the hook's Bash branch, which reads the event with `jq`; check
  `jq --version` and install `jq` first if it is missing. **Without `jq` that
  branch denies nothing**, so the hook silently stops protecting you. Native
  Windows runs the hook's PowerShell branch, which needs no `jq`.
- **The `microsoft-learn` MCP server.** The verification steps in §3 call
  `microsoft-learn/microsoft_docs_search`, which is provided by that server.
  If it is not already wired into your Copilot CLI, install it via the catalog
  entry in
  [`mcp-configs/copilot-cli/CATALOG.json`](../mcp-configs/copilot-cli/CATALOG.json)
  (search the catalog for `microsoft-learn`) or follow the upstream guidance
  at [Adding MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).
  Without it, the positive-path probe in §3.1 will return "tool not
  available" rather than the success the lab expects.
- **An interactive terminal** — only for the optional `/agent` check in §1.3.

## Copilot CLI currency (2026 refresh)

For this lab, only the first callout below (`registry.yaml` for CLI version floor and `models.standard`) and the `/mcp` / `/autopilot` rows apply directly; the rest of the shared currency table is optional reference.

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (confirmed GA, ~Aug 2026):** `/plugin`, `/mcp`, and
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

## 1 — Build the `tight-reviewer` custom agent

The built-in `code-reviewer` subagent is broad by design. In production, a
reviewer that can `shell` or `edit` is a supply-chain risk. We will ship a
locked-down replacement named **`tight-reviewer`** (different name so it
cannot collide with the built-in) that can only read the working tree and
search Microsoft Learn.

Custom-agent frontmatter grammar is documented on
[Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
and compiled into
[`docs/copilot-config-reference.md` §2](../docs/copilot-config-reference.md#2-custom-agent-frontmatter-agentmd).

🖥️ **In your terminal:**

1. Copy the reference agent into your project:

   **WSL/Bash:**
   ```bash
   mkdir -p .github/agents
   cp solutions/lab-hardening/tight-reviewer.agent.md \
      .github/agents/tight-reviewer.agent.md
   ```

   **PowerShell:**
   ```powershell
   New-Item -ItemType Directory -Force .github/agents | Out-Null
   Copy-Item solutions/lab-hardening/tight-reviewer.agent.md `
             .github/agents/tight-reviewer.agent.md
   ```

2. Open the file and read the frontmatter. Every field is deliberate:

   | Field | Value | Why |
   |---|---|---|
   | `tools` | `["read", "microsoft-learn/microsoft_docs_search"]` | Exact allow-list. No `shell`/`edit`/`search`. (Wildcards such as `microsoft-learn/*` are *supported* by the frontmatter grammar but deliberately avoided here — see the wildcard callout above.) |
   | `model` | `claude-sonnet-5` (pinned from `models.standard` in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml)) | The reviewer must be reproducible across sessions. |
   | `disable-model-invocation` | `true` | Main agent cannot auto-delegate to it — you must pick it explicitly. |
   | `user-invocable` | `false` | Excluded from `/agent` picker. Programmatic-only via `copilot --agent=tight-reviewer`. |

   > 📌 **The pin is a static literal.** The `model:` line in agent
   > frontmatter is a plain string — it cannot read the registry dynamically, so
   > a later registry update does **not** automatically rewrite
   > `.github/agents/tight-reviewer.agent.md` (an exception to the currency
   > callout's "single registry update propagates everywhere" rule). The
   > reference template pins `claude-sonnet-5` from `models.standard` in
   > [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml); whenever that
   > tier changes in the registry, update the `model:` line in your copy to
   > match.

   Note: `infer:` is **retired** — use `disable-model-invocation` and
   `user-invocable` instead (config reference §2.1).

3. *(Optional — skip it if you are short on time; nothing in §3 depends on
   it.)* Verify the agent is *not* offered for auto-delegation. Slash commands
   like `/agent` are **interactive-only** — they will not execute under
   `copilot --prompt`. Open a fresh interactive `copilot` session, then
   type:

   ```text
   /agent
   ```

   Because `user-invocable: false`, `tight-reviewer` does **not** appear in
   the picker. Because `disable-model-invocation: true`, natural-language
   mentions (e.g. *"have the reviewer look at this"*) will **not** trigger
   it either. The only way in is from a non-interactive shell, where
   `--allow-all-tools` is required so the agent's tool calls are not
   blocked at the CLI layer. Close the interactive session first, then run
   this from a regular terminal — **WSL/Bash or PowerShell**, one line, paste
   it as is:

   ```bash
   copilot --allow-all-tools --agent=tight-reviewer --prompt "Review dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs"
   ```

   This first probe is **agent-only**: the independent hook is not installed
   until §2.1, so for now the agent's own `tools:` allow-list is the only gate
   in force. That is exactly why §2 adds a second one.

## 2 — Add the `deny-unlisted-tools` `preToolUse` hook

Agent-level `tools:` is a *client-side* allow-list — layer 2 of the two-layer
tool-gating model in config reference §6 (layer 1 is the MCP config's own
`tools` exposure). A `preToolUse` hook is not a third layer in that diagram;
it sits on top of both as an additional, independent runtime check — and
because hooks run in every session regardless of which agent is active, a
hook catches the case where `tools:` on the frontmatter is mistyped,
deleted, or overridden.

🖥️ **In your terminal:**

1. Copy the reference hook into your project:

   **WSL/Bash:**
   ```bash
   mkdir -p .github/hooks
   cp solutions/lab-hardening/deny-unlisted-tools.json \
      .github/hooks/deny-unlisted-tools.json
   ```

   **PowerShell:**
   ```powershell
   New-Item -ItemType Directory -Force .github/hooks | Out-Null
   Copy-Item solutions/lab-hardening/deny-unlisted-tools.json `
             .github/hooks/deny-unlisted-tools.json
   ```

2. Inspect the hook. Three properties matter:

   - It is a `preToolUse` hook: it runs before each tool call and decides
     whether the call proceeds (see the callout at the top of this lab).
     Other hook events process their output too — `postToolUse` can modify
     a tool's result, for instance — but `preToolUse` is the one that sits
     in front of execution.
   - Its bash and PowerShell branches both read the event JSON from stdin,
     parse `toolName`, and emit **only** `{"permissionDecision":"deny","permissionDecisionReason":"…"}`
     when the tool is not in the allow-list.
   - The allow-list is spelled out inline. It permits exactly the two
     capabilities the agent needs — read files, and search Microsoft Learn —
     but it enumerates the **concrete runtime tool names** a hook actually
     sees (see the namespace callout below): `view`/`glob`/`grep` for the
     read category, and `microsoft-learn-microsoft_docs_search` (hyphen) for
     the MCP tool. The agent-frontmatter spellings (`read`,
     `microsoft-learn/microsoft_docs_search`) are kept alongside them as
     belt-and-suspenders. Everything else — `shell`, `edit`, `search`, any
     other MCP server — produces a deny.

   > ⚠️ The JSON file has a `_comment` field at the top that explicitly
   > documents *why* no `allow` or `ask` branches exist: omitting them is a
   > design choice, not a runtime limitation. A hook that can only `deny` can
   > only narrow what a session may do, so it fails safe. This is a
   > defense-in-depth design, not an omission.

   > 🧩 **Two namespaces: frontmatter names vs runtime tool names.** The agent
   > `tools:` allow-list in §1 and this hook's allow-list look like they should
   > be byte-identical — they are not, because they live in **different
   > namespaces**. Agent frontmatter uses *categories* (`read`) and *slash*
   > MCP names (`microsoft-learn/microsoft_docs_search`). A `preToolUse` hook,
   > by contrast, sees the **concrete runtime tool name** in its `toolName`
   > payload: the `read` category surfaces as `view`, `glob`, or `grep`, and an
   > MCP tool surfaces **hyphen-joined** as `microsoft-learn-microsoft_docs_search`.
   > A hook allow-list must therefore enumerate those runtime names, or it will
   > deny the very tools the agent is permitted to call. **This does not widen
   > the blast radius:** we still permit exactly two capabilities (read files,
   > search Learn) — we are simply spelling each one in the vocabulary of the
   > layer doing the checking. The "smallest blast-radius" rule from §1 is
   > intact; only the spelling changes per layer. **Takeaway:** when you author
   > a hook allow-list, list runtime tool names, not frontmatter categories.

3. **Absence of deny is allow.** If the hook exits with no output, it has not
   blocked the call, so the normal permission flow decides what happens
   next — with `--allow-all-tools`, as in §3, the call proceeds. That is by
   design — the hook is a filter that only narrows, not a permission oracle.

## 3 — Verify end-to-end

With the agent and hook both in place, confirm defense-in-depth is working.

🖥️ **In your terminal:**

1. **Positive path (the control)** — the agent calls its permitted tools (read
   a file *and* search Microsoft Learn). **WSL/Bash or PowerShell** — one
   line, paste it as is:

   ```bash
   copilot --allow-all-tools --agent=tight-reviewer --prompt "Read .github/agents/tight-reviewer.agent.md, state its purpose in 2 bullets, then search Microsoft Learn for guidance on Copilot custom agents and cite one URL."
   ```

   Expected: **both** permitted capabilities succeed with no deny output from
   the hook — the file read (which the hook sees as `view`) and the Learn
   lookup (which the hook sees as `microsoft-learn-microsoft_docs_search`, the
   hyphen-joined runtime name — see the namespace callout in §2). If the hook
   had been written against the frontmatter spellings (`read`,
   `microsoft-learn/microsoft_docs_search`) instead of the runtime names, it
   would wrongly deny both of these — that is the exact trap the §2 callout
   warns about. (`--allow-all-tools` lifts the CLI-layer confirmation prompts;
   the agent's own `tools:` allow-list and the hook are still in force, which
   is the whole point of the lab.)

   This run is the lab's **positive control**. If it fails — the
   `microsoft-learn` server is missing, the model pin in your copy is not one
   the CLI serves, or the hook denies a tool it should allow — stop and fix
   that first: a denial in steps 2 and 3 proves nothing while the permitted
   path is also broken.

2. **Negative path (agent level)** — ask for something only a shell can do.
   One line again:

   ```bash
   copilot --allow-all-tools --agent=tight-reviewer --prompt "Run 'dotnet build' and tell me if it's green."
   ```

   Expect a prose refusal or a "no shell tool available" answer. The shell
   tool — whichever name it surfaces under (`shell`, `execute`, `bash`,
   `powershell`) — is not in the agent's `tools` allow-list, so the agent
   never gets it and never *attempts* the call. That is **gate 1**, the
   agent's own allow-list, doing its job. Because no call was attempted, the
   hook never ran, so do **not** expect the hook's `permissionDecisionReason`
   here (if the model does try the call anyway, the hook will deny it — but
   don't count on that), and a refusal in prose is **not** evidence that the
   hook works. Step 3 tests the hook.

3. **Belt-and-braces check (hook level)** — take gate 1 away and see whether
   gate 2 holds on its own. On a throwaway branch, open **your copy**,
   `.github/agents/tight-reviewer.agent.md` — never the reference file under
   `solutions/` — and change `tools:` to `["*"]`. The copied profile still
   tells the agent it has no shell capability, so ask it plainly to use one
   (**WSL/Bash or PowerShell**, one line):

   ```bash
   copilot --allow-all-tools --agent=tight-reviewer --prompt "Use your shell tool to run 'echo hook-check' and paste the exact output."
   ```

   Read the result as exactly one of these three:

   - **Pass — the hook denied a real attempt.** The output shows the agent
     *calling* the shell tool and the call being refused with the hook's
     reason, which contains `is not in the hardening allow-list`. (The reason
     is addressed to the agent, so it may reach you paraphrased: "that call was
     blocked by a hook" counts; "I don't have a shell" does not.) With gate 1
     out of the way, the **hook still blocks** — its allow-list is independent
     of the agent's.
   - **Inconclusive — the agent only refused in prose.** Nothing shows an
     attempted call, so the profile's own no-shell instruction is the likely
     cause, not the hook. Run the same command once more; if it still
     refuses, record the check as **inconclusive** — neither a pass nor a
     fail — and do **not** claim the hook is verified.
   - **Fail — the command ran.** The output shows the shell call running and
     `hook-check` coming back, with nothing denied, so the hook is **not** in
     force. Check that the file is at `.github/hooks/deny-unlisted-tools.json`
     under the repo root you launched from and, on macOS, Linux, or WSL, that
     `jq --version` works — without `jq` the Bash branch lets every call
     through.

   **Revert immediately — this was only a verification.** By hand, restore
   `tools:` in your copy to the two entries it started with — `read` and
   `microsoft-learn/microsoft_docs_search`: your copy is an untracked file, so
   leaving the throwaway branch does not undo the edit.

   > 💾 **Optional sidebar — `git stash` for hook-config experiments.** When
   > you swap between hook variants in the same session (e.g. comparing this
   > default-deny template against a different allow-list), stash the
   > working copy rather than `git checkout`-ing it away — checkout
   > silently discards uncommitted edits to tracked files, stash preserves
   > them. One catch: the hook you copied in §2 is a **new, untracked file**,
   > and a plain `git stash push` leaves untracked files behind, so add
   > `--include-untracked` to capture it. The stash also takes the hook file
   > off disk, so the default-deny hook is not in force until you pop it:
   > ```bash
   > git stash push --include-untracked -m "lab-hardening: hook variant" -- .github/hooks/
   > # try a different hook config…
   > git stash pop                       # restore the variant
   > ```

   > 💡 Teaching point: this is why we ship both. A single misconfigured
   > frontmatter should not be able to broaden the blast radius of a
   > compromised review agent.

## 4 — Where to go next

- [`docs/copilot-config-reference.md` §2](../docs/copilot-config-reference.md#2-custom-agent-frontmatter-agentmd) — full custom-agent frontmatter grammar including the `server/tool` and `server/*` MCP-prefix syntax.
- [`docs/copilot-config-reference.md` §4](../docs/copilot-config-reference.md#4-hooks) — the hook events it catalogues, with payload shapes and whether each one's output is honored.
- [`docs/copilot-config-reference.md` §6](../docs/copilot-config-reference.md#6-two-layer-tool-gating) — the two-layer gating diagram (layer 1: MCP-config `tools`; layer 2: agent/skill allow-list). The agent half of this lab is layer 2; the hook sits on top of both layers as defense-in-depth.
- [Hooks reference — hook events](https://docs.github.com/en/copilot/reference/hooks-reference#hook-events) — `permissionRequest` (CLI only) lets a hook approve or deny programmatically, which suits non-interactive runs like §3's `--prompt` probes and CI. This lab stays on `preToolUse`.

## References

- Custom agents configuration — <https://docs.github.com/en/copilot/reference/custom-agents-configuration>
- Hooks reference — <https://docs.github.com/en/copilot/reference/hooks-reference>
- About hooks — <https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks>
- Adding MCP servers — <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers>
- Copilot CLI config directory — <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference>

## Cleanup

🖥️ **First, remove what this lab copied in.** The hook from §2 stays armed
after the lab ends: in every later Copilot session you start in this repo, it
denies each tool call that is not on its allow-list. From the repo root, delete
it and the agent file from §1 (both commands do nothing if a file is already gone):

**WSL/Bash:**
```bash
rm -f .github/agents/tight-reviewer.agent.md .github/hooks/deny-unlisted-tools.json
```

**PowerShell:**
```powershell
foreach ($f in '.github/agents/tight-reviewer.agent.md', '.github/hooks/deny-unlisted-tools.json') { if (Test-Path $f) { Remove-Item $f } }
```

> 📝 **Two corrections to step 2 of the shared checklist below.** Your
> editable Copilot CLI settings live in `~/.copilot/settings.json`;
> `~/.copilot/config.json` holds app-managed state and settings left there are
> ignored, so restoring a `config.json.bak` does not restore your settings.
> And the CLI's project-level MCP configuration is `.mcp.json` or
> `.github/mcp.json`; `.copilot/mcp-config.json` is not one of its default
> project locations. Sources: the
> [Copilot CLI config directory reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference)
> and [Adding per-repository MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers#adding-per-repository-mcp-servers).

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
