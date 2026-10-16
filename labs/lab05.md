---
title: "MCP Server Configuration"
lab_number: 5
pace:
  presenter_minutes: 3
  self_paced_minutes: 50
registry: docs/_meta/registry.yaml
---

# 5 — MCP Server Configuration

In this lab you will explore and configure Model Context Protocol (MCP) servers.

> ⏱️ Presenter pace: 3 minutes | Self-paced: 50 minutes

**Prerequisite:** finish [Setup](setup.md), [Lab 01](lab01.md) and [Lab 02](lab02.md) first — `copilot --version` prints a version number, you are signed in to GitHub Copilot, and Node.js is installed, because `npx` starts the local MCP servers in this lab.

References:
- [MCP specification changelog (2026-07-28)](https://modelcontextprotocol.io/specification/2026-07-28/changelog)
- [Adding MCP servers for GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers)

> 🧭 **Track appendices** — track-specific MCP server picks live in
> [`labs/appendices/dotnet/lab05.md`](appendices/dotnet/lab05.md) and
> [`labs/appendices/node/lab05.md`](appendices/node/lab05.md).

## 5.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

> 🆕 **MCP protocol revision (2026-07-28, confirmed breaking change):** the
> servers below now speak the stateless MCP spec pinned at
> `mcp_protocol_spec_version` in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).
> Protocol-level sessions and the `initialize` handshake are gone — every
> request now carries its protocol version/capabilities inline, and a new
> `server/discover` RPC replaces the old handshake for version negotiation.
> This is transparent to you as a Copilot CLI user (the client handles it),
> but if you ever read raw MCP traffic or write your own server, don't expect
> an `Mcp-Session-Id` header or a stateful `initialize` call — see
> [the official changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog).

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling an MCP-bundling plugin from a private or public registry. |
| **Parallel subagents** | `/fleet` | Querying multiple MCP servers in parallel (e.g. `context7` + `microsoft-learn`). |
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | Plan mode when wiring a new MCP server; autopilot mode when re-running well-known MCP queries. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto`; `/model auto efficiency`, `/model auto balance` or `/model auto intelligence` to pick an Auto tier) | Pick an id from the registry's `models.cheap` when the answer is already in MCP-retrieved context. `cheap`, `standard` and `premium` are registry keys, not `/model` arguments. |
| **Local tool discovery** | `/mcp list` for configured MCP servers; `/mcp show SERVER-NAME` for one server's status and tools; `extensions_manage` operation `list` for extensions (a model-side tool call, **not** a slash command) | Use `/mcp list` and `/mcp show` to see which MCP servers and tools are loaded right now. `extensions_manage` lists Copilot CLI extensions, not MCP servers or tools. |

## 5.1 Examine Existing MCP Configuration

MCP servers extend Copilot's capabilities with external tools — documentation lookup, knowledge persistence, structured reasoning, and more.

🖥️ **In your terminal:**

1. View the MCP configuration:

**WSL/Bash:**
```bash
cat ~/.copilot/mcp-config.json
```

**PowerShell:**
```powershell
Get-Content ~/.copilot/mcp-config.json
```

> 💡 **"No such file or directory"?** A fresh install has no user-level `mcp-config.json` yet — you create it in §5.4. To read a working example now, run `cat .copilot/mcp-config.json` (bash) or `Get-Content .copilot/mcp-config.json` (PowerShell) from the repo root — that is this repo's own copy.

2. The table below lists the MCP servers this workshop works with. The
   authoritative list — including each server's pinned version — lives in
   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) under `mcp_servers:`;
   read a pin there rather than copying a version number from this page. (The
   registry also lists `filesystem`, which is reserved for the prepared-core
   environment and not used in this lab, so it has no row here.) This repo's
   own `.copilot/mcp-config.json` configures `context7`, `sequential-thinking`,
   `workiq` and `microsoft-learn`; the remaining rows are not in that file.

| Server | Type | Purpose |
|--------|------|---------|
| `context7` | local (stdio) | Third-party library documentation lookup |
| `memory` | local (stdio) | Knowledge-graph persistence primitive — see §5.3 for why this repo does **not** rely on it for cross-session memory |
| `sequential-thinking` | local (stdio) | Structured chain-of-thought reasoning |
| `workiq` | local (stdio) | Microsoft Work IQ for productivity |
| `microsoft-learn` | http | Azure/Microsoft official documentation |
| `fabric` | local (stdio) | Local/open-source Fabric MCP Server for OneLake/medallion patterns (see [Lab 12](lab12.md); a separate remote Fabric Core MCP Server also exists for live-tenant work) |

3. Notice the two server types:
   - **local** (`"type": "local"`): Runs as a subprocess via `npx`. Uses stdio for communication.
   - **http** (`"type": "http"`): Connects to a remote URL. No local process needed.

```json
{
  "mcpServers": {
    "context7": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@2.2.1"],
      "tools": ["*"]
    },
    "microsoft-learn": {
      "type": "http",
      "url": "https://learn.microsoft.com/api/mcp",
      "tools": ["*"]
    }
  }
}
```

> 💡 This is an excerpt: a real file can hold more servers inside the same top-level `mcpServers` object. `@2.2.1` is the `context7` pin recorded in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) under `mcp_servers:` — take pins from there rather than from memory. (This repo's own `.copilot/mcp-config.json` still leaves `context7` unpinned.)

> 💡 **`tools: ["*"]`** means all tools from the server are available. You can restrict this to specific tools for security.

## 5.2 Use Context7 for Documentation Lookup

Context7 provides up-to-date documentation for libraries and frameworks. Let's use it to look up .NET documentation.

🖥️ **In your terminal:**

1. Start Copilot CLI:
```bash
copilot
```

2. Ask a question that requires library documentation:
```
Using Context7, look up how to configure WebApplicationFactory for integration testing in ASP.NET Core.
```

3. Behind the scenes, Copilot calls two Context7 tools:
   - `resolve-library-id` — finds the Context7 library ID for "ASP.NET Core"
   - `query-docs` — queries documentation with the resolved ID

4. Try another lookup:
```
Use Context7 to find Entity Framework Core migration best practices.
```

> 💡 Context7 is especially useful for staying current with library documentation — it fetches real-time docs rather than relying on training data.

> 💡 **What you should see:** Copilot responds with up-to-date documentation from the library. If it says "Context7 not available" or ignores the tool, the MCP server may not have started — check that `npx` is available and Node.js is installed.

## 5.3 Cross-session persistence — markdown lessons, not a server

MCP gives you live tools (docs, search, structured reasoning); this repo
intentionally does **not** treat any MCP server as cross-session memory —
including the `memory` server listed above, which implements the generic
knowledge-graph *primitive* but isn't wired into this repo's persistence
story. Instead, this repo solves persistence with plain markdown files the
agent maintains itself, governed by [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md).
That's the pattern Lab 10 unpacks in full — here you just see it
working alongside MCP.

> 🆕 **Why this distinction matters more since 2026-07-28:** the MCP spec
> revision removed protocol-level sessions entirely (no `initialize`
> handshake, no `Mcp-Session-Id`). Any cross-call state an MCP server needs
> is now an explicit, server-minted handle passed back as an ordinary tool
> argument — never an implicit session. That makes app-layer persistence
> (like this repo's `.copilot/lessons/` markdown wiki) even more clearly a
> *client/application* concern, not something the protocol does for you.

🖥️ **In your terminal:**

1. Inspect the wiki that ships with the repo:

**WSL/Bash:**
```bash
ls .copilot/lessons/
head -20 .copilot/lessons/index.md
```

**PowerShell:**
```powershell
Get-ChildItem .copilot/lessons
Get-Content .copilot/lessons/index.md | Select-Object -First 20
```

2. In Copilot CLI, ask the agent to record a project fact as a lesson. This writes to a git-tracked file in your checkout — §5.6 shows how to undo it:
```
Append a lesson to .copilot/lessons/log.md: ContosoUniversity uses
Entity Framework Core 8 with SQL Server and follows the repository
pattern; the main DbContext is SchoolContext. Follow the schema in
.github/instructions/lessons.instructions.md and leave "Promoted to"
blank.
```

3. Verify the append landed in git-tracked markdown:

**WSL/Bash:**
```bash
head -30 .copilot/lessons/log.md
```

**PowerShell:**
```powershell
Get-Content .copilot/lessons/log.md | Select-Object -First 30
```

4. Open a fresh session (`/exit`, then start Copilot again) and ask:
```
What does this repo use for data access? Check .copilot/lessons/
before answering.
```

The agent reads the lesson you just wrote — no knowledge-graph server,
no embeddings, no cross-session database. Just markdown the agent
wrote to itself, committed alongside the code.

> 💡 **Why markdown, not a server?** Files are diffable, reviewable,
> revertable, and ship with the repo. Lab 10 walks through the full
> three-layer model (raw sources → wiki → schema) and the
> [`consolidate-lessons` prompt file](../.github/prompts/consolidate-lessons.prompt.md)
> that promotes durable lessons. It is a prompt file, not a CLI slash command:
> in Copilot CLI you ask the agent in plain English to follow it (see
> [Lab 10](lab10.md) §10.4).

## 5.4 Add a New MCP Server

Let's add a new MCP server to the configuration. We'll add a fetch server that retrieves web content.

🖥️ **In your terminal:**

1. Open the user-level MCP configuration in any editor. In VS Code, this command works in both bash and PowerShell; if the file does not exist yet, saving creates it:
```bash
code "$HOME/.copilot/mcp-config.json"
```

2. Add a new server entry. The `fetch` entry below, including its `@1.6.2` pin, is taken from the `fetch` entry in [`mcp-configs/copilot-cli/CATALOG.json`](../mcp-configs/copilot-cli/CATALOG.json). If your file has no `mcpServers` object yet, paste the whole snippet; if it already has one, add only the `"fetch"` entry inside it (mind the commas):

```json
{
  "mcpServers": {
    "fetch": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@kazuph/mcp-fetch@1.6.2"],
      "tools": ["*"]
    }
  }
}
```

3. The `fetch` server provides an `imageFetch` tool that fetches a web page and returns it as markdown; images are off by default. Before v1.2.0 of the package this tool was called `fetch`; the current package rejects that name. The package's README says it is "designed for macOS only due to its dependency on macOS-specific clipboard operations". This exercise fetches plain text with images off, but if `fetch` does not start on your machine, `/mcp show fetch` shows its status and you can still finish the configuration steps.

4. After saving, restart your Copilot session for the new server to load: `/exit`, then start `copilot` again.

5. Test the new server:
```
Using the fetch MCP server's imageFetch tool, fetch https://raw.githubusercontent.com/dotnet/aspnetcore/main/README.md and summarize it in two sentences.
```

> ⚠️ **Security note**: Be careful with MCP servers that have broad access. The `tools: ["*"]` setting exposes all tools. In production, restrict to only the tools you need.

> 💡 **Verify the server loaded:** After restarting your Copilot session, `/mcp list` should show `fetch` along with its status, and `/mcp show fetch` should list its `imageFetch` tool. Then run the test prompt above. It names `imageFetch` on purpose: a vaguer "fetch this page" request can be answered by Copilot's built-in web access without ever touching the new server. If it responds with relevant data, the server is working. §5.6 shows how to remove it.

## 5.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Config location** | `~/.copilot/mcp-config.json` (user scope; workspace scope uses `<workspace>/.mcp.json`) |
| **Server types** | `local` (stdio subprocess) or `http` (remote URL) |
| **Tool filtering** | `"tools": ["*"]` for all, or list specific tool names |
| **Agent access** | Use `mcp-servers` in agent frontmatter to grant server access |

**The workshop's MCP server catalogue** — not an inventory of what is currently running. `memory` and `fabric` are catalogue entries this repo's `.copilot/mcp-config.json` does not configure; see §5.1.

| Server | Tools | Use Case |
|--------|-------|----------|
| context7 | `resolve-library-id`, `query-docs` | Library documentation |
| memory | knowledge-graph primitive | Available but not used for this repo's persistence story — see §5.3 |
| sequential-thinking | `sequentialthinking` | Structured reasoning |
| microsoft-learn | `microsoft_docs_search`, `microsoft_docs_fetch` | Microsoft documentation |
| fabric | Fabric/OneLake tools | Local Fabric MCP for Lab 12 (see registry `note` for remote-vs-local distinction) |

**Best practices:**
- Use `context7` for up-to-date library docs instead of guessing from training data
- Use `sequential-thinking` for complex multi-step reasoning
- Restrict `tools` to only what's needed for security
- For cross-session persistence, write a lesson to `.copilot/lessons/` (see §5.3) — MCP is intentionally not the memory layer in this repo

</details>

<details>
<summary>Solution: .mcp.json with fetch server</summary>

See [`solutions/lab05-mcp-config/.mcp.json`](../solutions/lab05-mcp-config/.mcp.json)

</details>

**Next:** [Lab 06 — Hooks](lab06.md)

## 5.6 Cleanup

This lab changes two files. Undo both when you are done.

1. If you ran the §5.3 step 2 prompt, revert the lesson it appended. `.copilot/lessons/log.md` is tracked by git, so, from the repository root, restore it from `HEAD`:

```bash
git restore --source=HEAD --staged --worktree .copilot/lessons/log.md
git status --short
```

This puts the file back to its last committed state, so it removes the exercise entry and any other uncommitted edit you made to that file. `git status --short` should no longer list `.copilot/lessons/log.md`; if it lists another file under `.copilot/lessons/`, restore that file the same way. If you already committed the entry, remove it by hand or `git revert` that commit.

2. Remove the `fetch` entry you added to `~/.copilot/mcp-config.json` in §5.4 — only that entry, not the whole `mcpServers` object. If `fetch` was the last entry, also delete the comma after the entry before it so the JSON stays valid. Restart Copilot CLI, then run `/mcp list` to confirm `fetch` is gone.
