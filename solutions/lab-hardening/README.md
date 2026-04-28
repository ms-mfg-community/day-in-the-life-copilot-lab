# `lab-hardening` — solution scaffold

Runnable scaffold for [`labs/lab-hardening.md`](../../labs/lab-hardening.md).

Two files, two gates in the two-layer tool-gating model:

| File | Gate | Purpose |
|---|---|---|
| `tight-reviewer.agent.md` | **Agent-side** (client allow-list) | Custom agent with `tools: [read, microsoft-learn/microsoft_docs_search]`, pinned model, `disable-model-invocation: true`, `user-invocable: false`. |
| `deny-unlisted-tools.json` | **Runtime-side** (`preToolUse` hook) | Emits `{"permissionDecision":"deny",…}` when `toolName` is outside the same allow-list. Bash **and** PowerShell branches. |

Together they implement the deterministic-control story described in
[`docs/copilot-config-reference.md` §6](../../docs/copilot-config-reference.md#6-two-layer-tool-gating).
The hook is deny-only by design — `allow` and `ask` outputs are accepted
by the runtime today but **not honored**. See the `_comment` at the top of
`deny-unlisted-tools.json`.

## Install (project scope)

**Bash:**

```bash
mkdir -p .github/agents .github/hooks
cp solutions/lab-hardening/tight-reviewer.agent.md \
   .github/agents/tight-reviewer.agent.md
cp solutions/lab-hardening/deny-unlisted-tools.json \
   .github/hooks/deny-unlisted-tools.json
```

**PowerShell:**

```powershell
New-Item -ItemType Directory -Force .github/agents, .github/hooks | Out-Null
Copy-Item solutions/lab-hardening/tight-reviewer.agent.md `
          .github/agents/tight-reviewer.agent.md
Copy-Item solutions/lab-hardening/deny-unlisted-tools.json `
          .github/hooks/deny-unlisted-tools.json
```

> Note: if `.github/hooks/default.json` already defines a `preToolUse`
> array, keep the files side-by-side — the runtime merges all `*.json`
> files in the directory. Splitting keeps diffs scannable.

## Load and verify

1. **Reload** — start or restart `copilot` in the project root so it
   discovers `.github/agents/` and `.github/hooks/` on session start.

2. **Confirm the agent is not auto-invocable:**

   ```text
   /agent
   ```

   `tight-reviewer` must be **absent** from the picker (because
   `user-invocable: false`). Natural-language mentions must not trigger
   it (because `disable-model-invocation: true`).

3. **Positive path** — exercise a permitted tool:

   ```bash
   copilot --agent=tight-reviewer \
           --prompt "Summarize Microsoft Learn guidance on EF Core migrations. Cite sources."
   ```

   Expected: a Learn-cited summary. No deny output.

4. **Negative path** — attempt a denied tool:

   ```bash
   copilot --agent=tight-reviewer \
           --prompt "Run 'dotnet build' and tell me if it is green."
   ```

   Expected: the hook emits `{"permissionDecision":"deny",…}` and the
   `shell`/`execute` tool never runs. The agent's frontmatter would have
   blocked it too — the hook is the second gate that survives a future
   misedit of the agent.

## Sources

- [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Hooks configuration](https://docs.github.com/en/copilot/reference/hooks-configuration)
- [`docs/copilot-config-reference.md`](../../docs/copilot-config-reference.md) §2 (agents), §4 (hooks), §6 (two-layer gating)
