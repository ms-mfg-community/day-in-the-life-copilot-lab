---
title: "MCP Server Configuration"
lab_number: 5
pace:
  presenter_minutes: 3
  self_paced_minutes: 15
registry: docs/_meta/registry.yaml
---

# 5 — MCP Server Configuration

In this lab you will explore and configure Model Context Protocol (MCP) servers.

> ⏱️ Presenter pace: 3 minutes | Self-paced: 15 minutes

References:
- [MCP specification](https://spec.modelcontextprotocol.io/)
- [Using MCP servers with Copilot](https://docs.github.com/en/copilot/using-github-copilot/using-mcp-servers-with-copilot)

> 🧭 **Track appendices** — track-specific MCP server picks live in
> [`labs/appendices/dotnet/lab05.md`](appendices/dotnet/lab05.md) and
> [`labs/appendices/node/lab05.md`](appendices/node/lab05.md).

## 5.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` | Pulling an MCP-bundling plugin from a private or public registry. |
| **Parallel subagents** | `/fleet` | Querying multiple MCP servers in parallel (e.g. `context7` + `microsoft-learn`). |
| **Plan mode vs autopilot mode** | `Shift+Tab` (plan mode) vs autopilot mode | Plan mode when wiring a new MCP server; autopilot mode when re-running well-known MCP queries. |
| **Mid-session model switch** | `/model <tier-or-id>` | Downshift to `models.cheap` in the registry when the answer is already in MCP-retrieved context. |
| **Local tool discovery** | `extensions_manage` operation `list` | Seeing which MCP-backed tools are loaded right now. |

## 5.1 Examine Existing MCP Configuration

MCP servers extend Copilot's capabilities with external tools — documentation lookup, knowledge persistence, structured reasoning, and more.

🖥️ **In your terminal:**

1. View the MCP configuration:

**WSL/Bash:**
```bash
cat .copilot/mcp-config.json
```

**PowerShell:**
```powershell
Get-Content .copilot/mcp-config.json
```

2. This repository ships with 5 MCP servers:

| Server | Type | Purpose |
|--------|------|---------|
| `context7` | local (stdio) | Third-party library documentation lookup |
| `memory` | local (stdio) | Knowledge graph for persisting entities across sessions |
| `sequential-thinking` | local (stdio) | Structured chain-of-thought reasoning |
| `workiq` | local (stdio) | Microsoft Work IQ for productivity |
| `microsoft-learn` | http | Azure/Microsoft official documentation |

3. Notice the two server types:
   - **local** (`"type": "local"`): Runs as a subprocess via `npx`. Uses stdio for communication.
   - **http** (`"type": "http"`): Connects to a remote URL. No local process needed.

```json
{
  "context7": {
    "type": "local",
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp"],
    "tools": ["*"]
  },
  "microsoft-learn": {
    "type": "http",
    "url": "https://learn.microsoft.com/api/mcp",
    "tools": ["*"]
  }
}
```

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

MCP gives you live tools (docs, search, structured reasoning); it
intentionally does **not** give you cross-session memory. This repo
solves persistence with plain markdown files the agent maintains
itself, governed by [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md).
That's the pattern Lab 10 unpacks in full — here you just see it
working alongside MCP.

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

2. In Copilot CLI, ask the agent to record a project fact as a lesson:
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
> `/consolidate-lessons` command that promotes durable lessons.

## 5.4 Add a New MCP Server

Let's add a new MCP server to the configuration. We'll add a filesystem server for enhanced file operations.

🖥️ **In your terminal:**

1. Open the MCP configuration:
```bash
code .copilot/mcp-config.json
```

2. Add a new server entry. For example, to add a fetch server for web content:

```json
{
  "mcpServers": {
    "context7": { ... },
    "sequential-thinking": { ... },
    "workiq": { ... },
    "microsoft-learn": { ... },
    "fetch": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@kazuph/mcp-fetch"],
      "tools": ["*"]
    }
  }
}
```

3. The fetch server provides a `fetch` tool that can retrieve web pages, API responses, and other HTTP content.

4. After saving, restart your Copilot session for the new server to load.

5. Test the new server:
```
Fetch the README from https://raw.githubusercontent.com/dotnet/aspnetcore/main/README.md
```

> ⚠️ **Security note**: Be careful with MCP servers that have broad access. The `tools: ["*"]` setting exposes all tools. In production, restrict to only the tools you need.

> 💡 **Verify the server loaded:** After restarting your Copilot session, test with a query the new server should handle. If it responds with relevant data, the server is working.

## 5.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Config location** | `.copilot/mcp-config.json` |
| **Server types** | `local` (stdio subprocess) or `http` (remote URL) |
| **Tool filtering** | `"tools": ["*"]` for all, or list specific tool names |
| **Agent access** | Use `mcp-servers` in agent frontmatter to grant server access |

**Available MCP servers in this repo:**

| Server | Tools | Use Case |
|--------|-------|----------|
| context7 | `resolve-library-id`, `query-docs` | Library documentation |
| sequential-thinking | `sequentialthinking` | Structured reasoning |
| microsoft-learn | `microsoft_docs_search`, `microsoft_docs_fetch` | Microsoft documentation |

**Best practices:**
- Use `context7` for up-to-date library docs instead of guessing from training data
- Use `sequential-thinking` for complex multi-step reasoning
- Restrict `tools` to only what's needed for security
- For cross-session persistence, write a lesson to `.copilot/lessons/` (see §5.3) — MCP is intentionally not the memory layer in this repo

</details>

<details>
<summary>Solution: mcp-config.json with fetch server</summary>

See [`solutions/lab05-mcp-config/mcp-config.json`](../solutions/lab05-mcp-config/mcp-config.json)

</details>

**Next:** [Lab 06 — Hooks](lab06.md)
