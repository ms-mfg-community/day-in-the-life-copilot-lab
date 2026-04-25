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
permitted to call — no wildcards, no `shell`, no `edit`. Second, a
`preToolUse` hook (`deny-unlisted-tools.json`) that emits `deny` whenever a
tool call falls outside an allow-list, so even a misconfigured `tools:` line
on the agent frontmatter is caught before execution. Belt **and** braces.

> 🧭 **Track appendices** — stack-specific completion notes live in
> [`labs/appendices/dotnet/lab-hardening.md`](appendices/dotnet/lab-hardening.md) and
> [`labs/appendices/node/lab-hardening.md`](appendices/node/lab-hardening.md).

Reference solution: [`solutions/lab-hardening/`](../solutions/lab-hardening/README.md).

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
   | `tools` | `["read", "microsoft-learn/microsoft_docs_search"]` | Exact allow-list. No wildcards. No `shell`/`edit`/`search`. |
   | `model` | pinned | The reviewer must be reproducible across sessions. |
   | `disable-model-invocation` | `true` | Main agent cannot auto-delegate to it — you must pick it explicitly. |
   | `user-invocable` | `false` | Excluded from `/agent` picker. Programmatic-only via `copilot --agent=tight-reviewer`. |

   Note: `infer:` is **retired** — use `disable-model-invocation` and
   `user-invocable` instead (config reference §2.1).

3. Verify the agent is *not* offered for auto-delegation:

   ```text
   /agent
   ```

   Because `user-invocable: false`, `tight-reviewer` does **not** appear in
   the picker. Because `disable-model-invocation: true`, natural-language
   mentions (e.g. *"have the reviewer look at this"*) will **not** trigger
   it either. The only way in is:

   ```bash
   copilot --agent=tight-reviewer --prompt "Review dotnet/ContosoUniversity.Web/Controllers/StudentsController.cs"
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
   copilot --agent=tight-reviewer \
           --prompt "Summarize the Microsoft Learn guidance on EF Core migrations."
   ```

   Expected: the call to `microsoft-learn/microsoft_docs_search` succeeds;
   no deny output from the hook.

2. **Negative path** — the agent attempts a denied tool:

   ```bash
   copilot --agent=tight-reviewer \
           --prompt "Run 'dotnet build' and tell me if it's green."
   ```

   Because `shell`/`execute` is not in either the agent's `tools` allow-list
   **or** the hook's allow-list, the call is blocked. You should see the
   hook's `permissionDecisionReason` surfaced in the CLI output.

3. **Belt-and-braces check** — temporarily broaden the agent's `tools:` to
   `["*"]` in a throwaway branch and re-run step 2. The **hook still
   blocks**, because the hook's allow-list is independent of the agent's.
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
