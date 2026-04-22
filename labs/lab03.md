---
title: "Creating a .NET Development Agent"
lab_number: 3
pace:
  presenter_minutes: 4
  self_paced_minutes: 15
registry: docs/_meta/registry.yaml
---

# 3 — Creating a .NET Development Agent

In this lab you will create a custom agent specialized for .NET development with ContosoUniversity.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

References:
- [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [MCP servers in agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration#mcp-servers)

## 3.1 Understand Agent Anatomy

Before creating your own agent, let's understand what makes up an agent file.

🖥️ **In your terminal:**

1. Look at an existing agent to understand the structure:

**WSL/Bash:**
```bash
head -30 .github/agents/planner.agent.md
```

**PowerShell:**
```powershell
Get-Content .github/agents/planner.agent.md -Head 30
```

2. An agent file has two parts:

**YAML Frontmatter** (between `---` markers):
```yaml
---
name: "agent-name"           # How users invoke: @agent-name
description: "What it does"  # Copilot uses this for routing
tools: ["read", "edit", "execute", "search"]  # Available tools
---
```

**Markdown Body**: The system prompt — personality, expertise, instructions, patterns.

3. Available tools:

| Tool | Purpose |
|------|---------|
| `read` | Read files from the workspace |
| `edit` | Create and modify files |
| `execute` | Run shell commands |
| `search` | Search across files with grep/glob |
| `agent` | Delegate to other agents |
| `web` | Search the web |

## 3.2 Create the Agent File (per track)

The exercise here is to create a **track-specific** dev agent — one that knows your codebase's project layout, build commands, and conventions. The full agent body lives in your track's appendix:

- **.NET track:** [`labs/appendices/dotnet/lab03.md`](appendices/dotnet/lab03.md) — `dotnet-dev` agent with EF Core / xUnit conventions
- **Node track:** [`labs/appendices/node/lab03.md`](appendices/node/lab03.md) — `node-dev` agent with Fastify / Drizzle conventions

Both appendices walk through:

1. Creating `.github/agents/<track>-dev.agent.md` with frontmatter (`name`, `description`, `tools`).
2. A system prompt that names the project layout, coding standards, and review checklist.
3. Verifying the agent loads with `head -5` (or `Get-Content -Head 5`).

> 💡 **Verify the agent loads:** Start a new Copilot session and try `@<track>-dev What files are in this project?`. If the agent responds, it's working. If you get "unknown agent", check the file is saved in `.github/agents/`.

## 3.3 Configure Tools and MCP Servers

The agent we created uses basic tools. Let's understand how to add MCP server access.

🖥️ **In your terminal:**

1. View the current MCP configuration:

**WSL/Bash:**
```bash
cat .copilot/mcp-config.json
```

**PowerShell:**
```powershell
Get-Content .copilot/mcp-config.json
```

2. Agents can reference MCP servers by adding them to the frontmatter. For example, to give the agent access to Context7 for .NET documentation lookups:

```yaml
---
name: "dotnet-dev"
description: "..."
tools: ["read", "edit", "execute", "search"]
mcp-servers: ["context7"]
---
```

3. The `mcp-servers` field references servers defined in `.copilot/mcp-config.json`. The agent can then use tools from those servers (e.g., `resolve-library-id` and `query-docs` from Context7).

> 💡 **Note**: MCP server access is optional. The base tools (`read`, `edit`, `execute`, `search`) are sufficient for most development tasks. Add MCP servers when the agent needs specific capabilities like documentation lookup or knowledge persistence.

## 3.4 Test the Agent

Let's test our new agent by asking it to analyze the ContosoUniversity codebase.

🖥️ **In your terminal:**

1. Start Copilot CLI:
```bash
copilot
```

2. Invoke the agent:
```
@dotnet-dev Analyze the dotnet/ContosoUniversity.Core project. What models exist and what are their relationships?
```

3. The agent should:
   - Read files from `dotnet/ContosoUniversity.Core/Models/`
   - Identify: Student, Course, Instructor, Enrollment, Department, OfficeAssignment
   - Describe relationships (Student has Enrollments, Course has Enrollments, etc.)

4. Try a development task:
```
@dotnet-dev What would I need to change to add a search feature to the Students controller?
```

The agent should reference the repository pattern, async patterns, and controller conventions from its system prompt.

> 💡 **Tip**: If the agent doesn't seem to follow its instructions, check that the YAML frontmatter is valid (no syntax errors) and that the file is in `.github/agents/`.

## 3.5 Final

<details>
<summary>Key Takeaways</summary>

After this lab you should understand:

| Concept | Details |
|---------|---------|
| **Agent file location** | `.github/agents/{name}.agent.md` |
| **YAML frontmatter** | `name`, `description`, `tools`, optional `mcp-servers` |
| **Tools** | `read`, `edit`, `execute`, `search`, `agent`, `web` |
| **System prompt** | Markdown body defines agent personality and instructions |
| **Invocation** | `@agent-name` in Copilot Chat or CLI |

**Best practices for agent design:**
- Give the agent a clear, focused domain (not "general purpose")
- List specific coding standards it should follow
- Include project-specific context (file structure, patterns)
- Add a review checklist for quality assurance
- Reference other agents for handoff (e.g., "invoke @dotnet-qa for tests")

</details>

<details>
<summary>Solution: dotnet-dev.agent.md</summary>

See [`solutions/lab03-dotnet-dev-agent/dotnet-dev.agent.md`](../solutions/lab03-dotnet-dev-agent/dotnet-dev.agent.md) for the complete reference implementation.

</details>

> This agent is now available for orchestration in Lab 07, where you'll coordinate multiple agents working together.

**Next:** [Lab 04 — Skills & Prompts](lab04.md)
