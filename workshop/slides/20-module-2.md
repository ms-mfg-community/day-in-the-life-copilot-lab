---
module: M2
title: "MCP servers in anger"
anchor_labs: [lab05, lab12]
minutes: 30
phase: 3a
---

# M2 — MCP servers in anger

## The advanced problem

One MCP server is easy. **Five** is where it gets interesting: tool-name collisions across servers, auth scopes that don't share, startup ordering, silent empty-result failures, and the cost of holding five long-lived stdio connections on every session. Fluent users already know *what* MCP is; this module is about composing several of them and debugging when one goes wrong.

Anchor labs: `labs/lab05.md`, `labs/lab12.md`.

---

## Three layers of configuration

```
User       ~/.copilot/mcp-config.json
Workspace  .mcp.json
Plugin     Installed plugins with MCP servers
```

`copilot mcp list` shows the resolved set. Later sources **augment** earlier ones — they do not fully replace. Per-session override without touching disk:

```bash
copilot --additional-mcp-config ./fabric-mcp.json -p "list my lakehouses"
```

That flag is repeatable and accepts either a JSON string or `@/path/to/file`. It's the right tool for "try this server for one session only."

---

## Copilot CLI config shape — what trips people up

`mcp-configs/copilot-cli/CATALOG.json` documents the format:

- Top-level key is **`mcpServers`** (not `servers`).
- `type` is **`local`** for stdio, `http` for HTTP, `sse` for SSE.
- Every entry **requires a `tools` array** — `["*"]` to expose everything, or an allowlist.

VS Code's `mcp.json` uses `servers` and `type: stdio`. Copy-pasting between clients is the single biggest source of "it worked in VS Code but not in the CLI."

---

## Multi-server composition — the good case

Fluent pattern from `labs/lab05.md`: three servers, each earning its keep.

```json
{
  "mcpServers": {
    "context7":         { "type": "local", "command": "npx",
                          "args": ["-y", "@upstash/context7-mcp"],
                          "tools": ["*"] },
    "microsoft-learn":  { "type": "http",
                          "url": "https://learn.microsoft.com/api/mcp",
                          "tools": ["*"] },
    "memory":           { "type": "local", "command": "npx",
                          "args": ["-y", "@modelcontextprotocol/server-memory"],
                          "tools": ["*"] }
  }
}
```

Parallel dispatch across them with `/fleet` (see `labs/lab05.md`) is the payoff — a single question can hit three indexes in one turn.

---

## Fabric MCP — the anger part

Fabric MCP needs real auth. Config lives at `mcp-configs/copilot-cli/individual/fabric.json`; `labs/lab12.md` is the full walkthrough.

```bash
# Token, never inline:
export FABRIC_AUTH_TOKEN=$(az account get-access-token \
  --resource https://api.fabric.microsoft.com \
  --query accessToken -o tsv)
export FABRIC_WORKSPACE_ID=<guid>

copilot --additional-mcp-config @mcp-configs/copilot-cli/individual/fabric.json
> /mcp
```

The `env` block in the config uses `${env:FABRIC_AUTH_TOKEN}` — **never** paste the token into the file. Token lifetime is ~1 hour; if the server starts returning empty results mid-session, the token expired. Re-export and restart the session.

Offline fallback for restricted networks: `labs/lab12.md` ships a Parquet-fixture path so the demo still works without a Fabric tenant.

---

## Tool-name collisions

Two servers can legitimately expose tools with the same short name (`search`, `query`, `run`). Copilot CLI namespaces them with the server name — `context7(search)` versus `fabric(search)`. Three ways to disambiguate:

- `--allow-tool='context7(*)' --deny-tool='fabric(*)'` for a scoped session.
- `--available-tools` to restrict the universe explicitly.
- `--disable-mcp-server fabric` to drop the server entirely for one session.

Use `/env` inside the session to see the *resolved* tool list — that's ground truth, not the config.

---

## Debugging — the silent empty-result class

Symptom: the server is listed in `/mcp`, no errors, but every query returns `[]`.

- **Confirm it started.** `copilot mcp list` shows the handshake state. A server that failed to connect is missing, not "returning empty."
- **Check the tool namespace.** `/env` prints every tool the model can see. If `fabric(list_lakehouses)` is absent but the server is up, the `tools` allowlist is filtering it out.
- **Auth scope.** Fabric, Azure, GitHub MCPs fail open — they return empty, not 401. Re-mint the token.
- **Log dive.** `--log-level debug --log-dir ./mcp-debug` then `grep -i fabric ./mcp-debug/*.log` — every tool call + response is there.
- **Isolate.** Re-run with `--disable-builtin-mcps --additional-mcp-config @just-this-one.json`. If it works alone, a collision or startup-ordering issue is hiding in the full config.

Clean fix for a stuck session: `/clear` ends the session; next start re-negotiates every handshake.

---

## Live demo — compose, break, repair

```bash
# Healthy composition.
copilot mcp list
copilot
> /fleet
> "Using context7 and microsoft-learn, compare MSAL.NET and Microsoft.Identity.Web."

# Break it on purpose.
copilot --disable-mcp-server context7 -p "same question" --log-level debug

# Per-session override without touching ~/.copilot/.
copilot --additional-mcp-config ./workshop-servers.json
> /env
```

---

## Takeaway

MCP composition scales by *subtraction*: start with the ones you need for this session, not every server you've ever configured. `--additional-mcp-config`, `--disable-mcp-server`, and `/env` are the three you'll use most. When a server goes quiet, suspect auth scope before you suspect the server.
