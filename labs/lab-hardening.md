---
title: "Hardening Skills, Agents, and MCP for Deterministic Production Use"
lab_number: hardening
pace:
  presenter_minutes: 5
  self_paced_minutes: 20
registry: docs/_meta/registry.yaml
---

# Lab — Hardening Skills, Agents, and MCP for Deterministic Production Use

> ⚠️ **Read this first — `preToolUse` is deny-only.**
> `preToolUse` only acts on `deny`. `allow` and `ask` outputs are accepted by
> the runtime today but are **NOT** honored. Design hooks as
> deny-on-violation, not allow-list-via-output. In other words: **absence of
> deny is allow.** Source:
> [Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration).

> ⏱️ Presenter pace: 5 minutes | Self-paced: 20 minutes — the deny-only
> callout above is the single highest-leverage takeaway of this lab; every
> guardrail we build below is designed around it.

This lab is the hands-on counterpart to
[`docs/copilot-config-reference.md`](../docs/copilot-config-reference.md) —
the canonical parameter reference for skills, custom agents, MCP servers, and
hooks. The reference doc is the *what*; this lab is the *how*. Read §2
(custom agents), §4 (hooks), and §6 (two-layer tool gating) of the reference
alongside the steps below.

You will build two production-ready guardrails. First, a custom agent
(`tight-reviewer`) whose frontmatter enumerates exactly the MCP tools it is
permitted to call — an explicit allow-list, no `shell`, no `edit`. Second, a
`preToolUse` hook (`deny-unlisted-tools.json`) that emits `deny` whenever a
tool call falls outside an allow-list, so even a misconfigured `tools:` line
on the agent frontmatter is caught before execution. Belt **and** braces.

> 📎 **Wildcards in `tools:` — supported, but use sparingly.** The frontmatter
> `tools:` field **does** accept tool-name globs (e.g. `shell:*` to match
> every variant of the shell tool, or `mcp:microsoft-learn:*` to allow every
> tool a server exposes). The hardening posture below avoids them on
> purpose: an exact allow-list is the smallest blast-radius. Reach for
> globs only when you genuinely need every tool under a namespace and you
> have reviewed what that namespace contains today **and** how it might
> grow tomorrow.

> 🪪 **`shell` / `execute` / `bash` are aliases.** The same shell-execution
> tool may surface under any of these `toolName` values depending on which
> plugin or extension registered it. The agent allow-list and the hook in
> §2 are both default-deny via allow-list, so all three aliases are blocked
> automatically. If you ever flip to a deny-list, enumerate **all three**
> or one will bypass the gate.

> 🧭 **Track appendices** — stack-specific completion notes live in
> [`labs/appendices/dotnet/lab-hardening.md`](appendices/dotnet/lab-hardening.md) and
> [`labs/appendices/node/lab-hardening.md`](appendices/node/lab-hardening.md).

Reference solution: [`solutions/lab-hardening/`](../solutions/lab-hardening/README.md).

## 0 — Prerequisites

🖥️ **Before you start:**

- The verification steps in §3 call `microsoft-learn/microsoft_docs_search`,
  which is provided by the **microsoft-learn** MCP server. If it is not
  already wired into your Copilot CLI, install it via the catalog entry in
  [`mcp-configs/copilot-cli/CATALOG.json`](../mcp-configs/copilot-cli/CATALOG.json)
  (search the catalog for `microsoft-learn`) or follow the upstream guidance
  at [Adding MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers).
  Without it, the positive-path probe in §3.1 will return "tool not
  available" rather than the success the lab expects.

## Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh. Versions, model tiers, and MCP server pins live in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — labs reference
> the registry rather than hardcoding values, so a single registry update
> propagates everywhere.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `Shift+Tab` toggles plan mode; autopilot mode is the default | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. |
| **Local tool discovery** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | Discovering which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Note: `extensions_manage` is an MCP tool, **not** a slash command — invoke it via the MCP surface, not via `/extensions_manage`. |
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
   | `tools` | `["read", "microsoft-learn/microsoft_docs_search"]` | Exact allow-list. No `shell`/`edit`/`search`. (Globs like `shell:*` are *supported* by the frontmatter grammar but deliberately avoided here — see the wildcard callout above.) |
   | `model` | pinned | The reviewer must be reproducible across sessions. |
   | `disable-model-invocation` | `true` | Main agent cannot auto-delegate to it — you must pick it explicitly. |
   | `user-invocable` | `false` | Excluded from `/agent` picker. Programmatic-only via `copilot --agent=tight-reviewer`. |

   Note: `infer:` is **retired** — use `disable-model-invocation` and
   `user-invocable` instead (config reference §2.1).

3. Verify the agent is *not* offered for auto-delegation. Slash commands
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
   blocked at the CLI layer (the agent's own `tools:` allow-list and the
   hook in §2 are still in force):

   ```bash
   copilot --allow-all-tools \
           --agent=tight-reviewer \
           --prompt "Review dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs"
   ```

## 2 — Add the `deny-unlisted-tools` `preToolUse` hook

Agent-level `tools:` is a *client-side* allow-list. That is one of the two
gates in the two-layer tool-gating model (config reference §6). A `preToolUse`
hook is a second, runtime gate — and because hooks run in every session
regardless of which agent is active, a hook catches the case where
`tools:` on the frontmatter is mistyped, deleted, or overridden.

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

   - It is a `preToolUse` hook (the only event whose output is honored —
     see the callout at the top of this lab).
   - Its bash and PowerShell branches both read the event JSON from stdin,
     parse `toolName`, and emit **only** `{"permissionDecision":"deny","permissionDecisionReason":"…"}`
     when the tool is not in the allow-list.
   - The allow-list is spelled out inline: `read`, `microsoft-learn/microsoft_docs_search`.
     Everything else — `shell`, `edit`, `search`, any other MCP server —
     produces a deny.

   > ⚠️ The JSON file has a `_comment` field at the top that explicitly
   > documents *why* no `allow` or `ask` branches exist: the runtime ignores
   > them. This is a defense-in-depth design, not an omission.

3. **Absence of deny is allow.** If the hook exits with no output, the tool
   call proceeds. That is by design — the hook is a filter, not a
   permission oracle.

## 3 — Verify end-to-end

With the agent and hook both in place, confirm defense-in-depth is working.

🖥️ **In your terminal:**

1. **Positive path** — the agent calls a permitted tool:

   ```bash
   copilot --allow-all-tools \
           --agent=tight-reviewer \
           --prompt "Summarize the Microsoft Learn guidance on EF Core migrations."
   ```

   Expected: the call to `microsoft-learn/microsoft_docs_search` succeeds;
   no deny output from the hook. (`--allow-all-tools` lifts the CLI-layer
   confirmation prompts; the agent's own `tools:` allow-list and the hook
   are still in force, which is the whole point of the lab.)

2. **Negative path** — the agent attempts a denied tool:

   ```bash
   copilot --allow-all-tools \
           --agent=tight-reviewer \
           --prompt "Run 'dotnet build' and tell me if it's green."
   ```

   Because `shell`/`execute`/`bash` is not in either the agent's `tools`
   allow-list **or** the hook's allow-list, the call is blocked. You
   should see the hook's `permissionDecisionReason` surfaced in the CLI
   output.

3. **Belt-and-braces check** — temporarily broaden the agent's `tools:` to
   `["*"]` in a throwaway branch and re-run step 2. The **hook still
   blocks**, because the hook's allow-list is independent of the agent's.

   > 💾 **Use `git stash` for hook-config experiments.** When you swap
   > between hook variants in the same session (e.g. comparing this
   > deny-only template against a different allow-list), stash the
   > working copy rather than `git checkout`-ing it away — checkout
   > silently discards uncommitted variants, stash preserves them:
   > ```bash
   > git stash push -m "lab-hardening: hook variant" -- .github/hooks/
   > # try a different hook config…
   > git stash pop                       # restore the variant
   > ```

   Revert your change immediately; this was only a verification.

   > 💡 Teaching point: this is why we ship both. A single misconfigured
   > frontmatter should not be able to broaden the blast radius of a
   > compromised review agent.

## 4 — Where to go next

- [`docs/copilot-config-reference.md` §2](../docs/copilot-config-reference.md#2-custom-agent-frontmatter-agentmd) — full custom-agent frontmatter grammar including the `server/tool` and `server/*` MCP-prefix syntax.
- [`docs/copilot-config-reference.md` §4](../docs/copilot-config-reference.md#4-hooks) — every documented hook event with its payload shape and whether its output is honored.
- [`docs/copilot-config-reference.md` §6](../docs/copilot-config-reference.md#6-two-layer-tool-gating) — the two-layer gating diagram (MCP-config `tools` + agent/skill allow-list) that this lab instantiates.

## References

- Custom agents configuration — <https://docs.github.com/en/copilot/reference/custom-agents-configuration>
- Hooks configuration — <https://docs.github.com/en/copilot/reference/hooks-configuration>
- About hooks — <https://docs.github.com/en/copilot/concepts/agents/cloud-agent/about-hooks>
- Adding MCP servers — <https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers>

## Cleanup

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
