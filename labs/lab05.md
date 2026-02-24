# 5 — MCP Server Configuration

In this lab you will explore and configure Model Context Protocol (MCP) servers.

> ⏱️ Presenter pace: 3 minutes | Self-paced: 15 minutes

References:
- [MCP specification](https://spec.modelcontextprotocol.io/)
- [Using MCP servers with Copilot](https://docs.github.com/en/copilot/using-github-copilot/using-mcp-servers-with-copilot)

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
gh copilot
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

## 5.3 Use Memory MCP for Persistence

The Memory MCP provides a knowledge graph that persists across sessions. Entities, observations, and relations survive between conversations.

🖥️ **In your terminal:**

1. In Copilot CLI, store a fact about the project:
```
Store in memory: ContosoUniversity uses Entity Framework Core 8 with SQL Server and follows the repository pattern. The main database context is SchoolContext.
```

2. Copilot will call `create_entities` to store this as a knowledge graph entity.

3. Verify it was stored:
```
Search memory for "ContosoUniversity database"
```

4. Store a relationship:
```
Store in memory: The Student entity has a one-to-many relationship with Enrollment. The Course entity also has a one-to-many relationship with Enrollment. Enrollment is the join table.
```

5. Read back the full graph:
```
Show me everything stored in memory about ContosoUniversity.
```

You should see entities with observations and relations between them.

> 💡 **Cross-session persistence**: Memory MCP data survives across Copilot sessions. Use it for project decisions, architecture notes, and context that should be available in future conversations.

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
    "memory": { ... },
    "sequential-thinking": { ... },
    "workiq": { ... },
    "microsoft-learn": { ... },
    "fetch": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
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
| memory | `create_entities`, `search_nodes`, `read_graph` | Knowledge persistence |
| sequential-thinking | `sequentialthinking` | Structured reasoning |
| microsoft-learn | `microsoft_docs_search`, `microsoft_docs_fetch` | Microsoft documentation |

**Best practices:**
- Use `context7` for up-to-date library docs instead of guessing from training data
- Use `memory` for project decisions that should persist across sessions
- Use `sequential-thinking` for complex multi-step reasoning
- Restrict `tools` to only what's needed for security

</details>

<details>
<summary>Solution: mcp-config.json with fetch server</summary>

See [`solutions/lab05-mcp-config/mcp-config.json`](../solutions/lab05-mcp-config/mcp-config.json)

</details>

**Next:** [Lab 06 — Hooks](lab06.md)
