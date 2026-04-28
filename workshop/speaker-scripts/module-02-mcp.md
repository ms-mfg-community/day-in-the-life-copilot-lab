---
module: M2
title: "MCP servers in anger — speaker script"
slide_source: workshop/slides/20-module-2.md
minutes: 30
phase: 3a
---

# M2 — Speaker script

Target: fluent users who've configured *one* MCP server. This module
is about running *several* at once without silent failures.

## 1. Open with the advanced problem

**Verbatim hook (~45 seconds):**

> "Everyone here has configured an MCP server. What we haven't
> trained for is the interesting failure mode — the one where the
> server is listed, the handshake succeeded, and every query
> returns an empty array. No 401, no stack trace, just `[]`. Over
> the next 30 minutes we're going to compose three servers in one
> session, collide their tool names on purpose, break one of them,
> and repair it — all from Copilot CLI."

Anchor labs: `labs/lab05.md` (MCP configuration), `labs/lab12.md`
(Fabric MCP with the offline-simulator fallback for no-Fabric
environments).

## 2. Demo script

### Demo A — config layer tour (~3 min)

```bash
copilot mcp list
cat ~/.copilot/mcp-config.json | head -30 || true
ls mcp-configs/copilot-cli/individual/
head -30 mcp-configs/copilot-cli/CATALOG.json
```

Narrate the **three** layers — user, workspace, plugin — and the
one Copilot-CLI gotcha from the catalog header comment: top-level
key is `mcpServers`, `type: local` for stdio, and **every entry
requires a `tools` array**. VS Code uses a different shape; this is
the #1 "worked in VS Code, not in the CLI" trap.

### Demo B — compose three servers with `--additional-mcp-config` (~5 min)

```bash
cat mcp-configs/copilot-cli/individual/context7.json
copilot --additional-mcp-config @mcp-configs/copilot-cli/individual/context7.json \
        --additional-mcp-config @mcp-configs/copilot-cli/individual/microsoft-learn.json \
        --additional-mcp-config @mcp-configs/copilot-cli/individual/memory.json
```

Inside the session:

```
/env
/fleet
```

Ask one cross-server question so attendees see parallel dispatch,
then show `/env` again to point at the resolved tool list.

### Demo C — Fabric MCP + auth (~6 min)

Live path — token via `az`:

```bash
export FABRIC_AUTH_TOKEN=$(az account get-access-token \
  --resource https://api.fabric.microsoft.com \
  --query accessToken -o tsv)
export FABRIC_WORKSPACE_ID=<guid>
copilot --additional-mcp-config @mcp-configs/copilot-cli/individual/fabric.json
> /mcp
> "List the lakehouses in my workspace."
```

Point at the `env` block in `mcp-configs/copilot-cli/individual/fabric.json` — the token is **never** inline; it's `${env:FABRIC_AUTH_TOKEN}`. Call out the hour-long token lifetime as the #1 cause of silent empty results later in the session.

**If no Fabric tenant / Codespaces / restricted network:** switch to the offline Parquet-fixture path documented in `labs/lab12.md`. Same teaching outcomes, no auth needed.

### Demo D — break one on purpose, debug, repair (~6 min)

```bash
copilot --disable-mcp-server context7 -p \
  "search context7 for nextjs app router" \
  --log-level debug --log-dir /tmp/mcp-debug --allow-all-tools
grep -i context7 /tmp/mcp-debug/*.log | head -20
```

Point out: **disabled**, not broken — the server is just not there. Now the silent-empty class:

```bash
# Simulate: rename the tools allowlist to ["does_not_exist"]
copilot --additional-mcp-config \
  '{"mcpServers":{"context7":{"type":"local","command":"npx","args":["-y","@upstash/context7-mcp"],"tools":["does_not_exist"]}}}' \
  -p "search for anything" --log-level debug --allow-all-tools
```

The server is up; its tool list is scoped to nothing. `/env` inside an interactive session would show zero `context7(*)` tools. Repair = restore the allowlist to `["*"]` or the specific tools.

### Demo E — collision + disambiguation (~3 min)

Two servers expose a `search` tool. Show the namespaced form and the scoping flags:

```bash
copilot --allow-tool='context7(*)' \
        --deny-tool='microsoft-learn(search)' \
        -p "lookup MSAL.NET best practices" --allow-all-tools
```

Narrate: tools are *always* namespaced by server inside Copilot CLI — collisions don't exist at the model layer, only in human shorthand.

## 3. Timing cues

<!-- total: 30 min -->

- 0:00 — Hook: the silent-empty failure mode. Name the three config layers. (2 min)
- 2:00 — Slide: "Three layers of configuration." Point at `copilot mcp list`. (2 min)
- 4:00 — Slide: "Copilot CLI config shape — what trips people up." Show the CLI-vs-VS-Code diff. (2 min)
- 6:00 — **Demo A** — config layer tour. (3 min)
- 9:00 — Slide: "Multi-server composition — the good case." (1 min)
- 10:00 — **Demo B** — compose three servers via `--additional-mcp-config`, `/fleet`. (5 min)
- 15:00 — Slide: "Fabric MCP — the anger part." (2 min)
- 17:00 — **Demo C** — Fabric MCP live path (or offline fallback). (5 min)
- 22:00 — Slide: "Tool-name collisions." (1 min)
- 23:00 — **Demo D** — break and debug (disabled + wrong allowlist). (4 min)
- 27:00 — **Demo E** — collision + `--allow-tool` / `--deny-tool` disambiguation. (2 min)
- 29:00 — Slide: "Takeaway." Composition scales by subtraction. (1 min, closes at 30:00)

## 4. Expected pitfalls

- **Live Fabric token expires mid-demo.** Likely if the module is late in the day. Re-run the `az account get-access-token` one-liner; the server does **not** auto-refresh. If the tenant is unavailable, switch to the `labs/lab12.md` offline simulator path — commit to it verbally ("we're going offline now") so the room isn't confused.
- **`npx` cold-start lag.** First-time `@upstash/context7-mcp`, `@modelcontextprotocol/server-memory`, `@microsoft/fabric-mcp@latest` all pull packages. Pre-warm before the session (`npx -y @upstash/context7-mcp --help`, etc.) so the demo doesn't sit on a dependency install.
- **Attendee pastes a VS Code `mcp.json` and asks why it doesn't load.** Expected. Show `mcp-configs/copilot-cli/CATALOG.json` — the top-level key and the required `tools` array are the two deltas. Don't try to script-convert live; demonstrate the diff and move on.
- **`copilot mcp list` shows a server but `/env` doesn't show its tools.** That's the `tools` allowlist filtering. This is the exact silent-empty class in Demo D — walk it back to allowlist, not to a broken server.
- **`--additional-mcp-config` repeated flag confusion.** The flag is **repeatable** — it does not replace, it augments. Say this explicitly; attendees will otherwise assume the last one wins.
- **`--disable-builtin-mcps` on stage.** Only mention it; do **not** disable the built-in github-mcp-server live — the rest of the workshop may assume it's on.
- **Demo failure with no network.** Fallback: `copilot --additional-mcp-config @mcp-configs/copilot-cli/individual/memory-offline.json` — the offline memory config in this repo works without network, proves the composition mechanic, and keeps the narrative alive.

## 5. Q&A prompts

- "Who's running Fabric MCP (or any auth-scoped server) in production? How do you refresh tokens mid-session without killing the conversation?"
- "Has anyone hit a tool-name collision in real work? Which servers?"
- "Do you pin MCP versions (like this repo does in `docs/_meta/registry.yaml`), or float them with `@latest`?"
- "What's your debug flow when an MCP server goes silent — do you `/clear` and retry, or log-dive?"
- "Anyone composing more than five servers in a single session? What breaks first — startup time, context window, or tool-namespace confusion?"

## 6. Advanced-tip callouts

- **`--additional-mcp-config` accepts either JSON string or `@path`.** The JSON-string form is perfect for one-off demos without leaving a file behind. Pair with `--allow-all-tools` and `-p` for a truly one-shot MCP invocation.
- **`--disable-mcp-server` beats commenting out JSON.** Cleaner for debugging and reversible per-session without touching disk.
- **`/mcp` inside an interactive session** is a faster inspector than `copilot mcp list` outside — it shows the **resolved** set including plugin-provided servers.
- **`--log-level debug --log-dir <dir>`** is the single most useful flag combo for MCP debugging. Every JSON-RPC request and response is in the log. Grep by server name.
- **Fabric's `obtain_token_command` is committed** in `mcp-configs/copilot-cli/individual/fabric.json` — you never memorize the `az` incantation, you copy it from there. Treat those config files as executable documentation.
- **Plugin-bundled MCP servers share the same namespace rules.** Installing two plugins that bundle the same server is ambiguous — `copilot plugin list` will show which plugin owns which server, and `--disable-mcp-server <name>` scopes by resolved name, not by plugin.
- **`/fleet` is the performance multiplier.** Three MCP servers serially is three round-trips; `/fleet` asks the model to dispatch in parallel. Worth showing even if the tokens cost slightly more — latency drops ~3x on cold queries.
