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

## 3.2 Create the Agent File

Now let's create a .NET development agent specialized for ContosoUniversity.

🖥️ **In your terminal:**

1. Create the agent file:

**WSL/Bash:**
```bash
cat > .github/agents/dotnet-dev.agent.md << 'AGENT'
---
name: "dotnet-dev"
description: "Specialized .NET development agent for ContosoUniversity. Expertise in clean architecture, EF Core, ASP.NET MVC, dependency injection, and C# best practices."
tools: ["read", "edit", "execute", "search"]
---

# .NET Development Agent

You are a .NET development specialist working on the ContosoUniversity application. You implement features following clean architecture, DDD principles, and .NET best practices.

## When Invoked

1. Check the solution builds: `dotnet build ContosoUniversity.sln`
2. Review the relevant project layer before making changes
3. Follow the architecture: Core → Infrastructure → Web
4. Implement with proper dependency injection and async patterns

## ContosoUniversity Architecture

```
ContosoUniversity.Core/           # Domain models, interfaces, validation
ContosoUniversity.Infrastructure/ # EF Core, data access, repositories
ContosoUniversity.Web/            # ASP.NET MVC controllers, views, DI config
ContosoUniversity.Tests/          # xUnit tests
ContosoUniversity.PlaywrightTests/ # E2E tests
```

## Coding Standards

- **Async all the way**: Use `async Task<IActionResult>` for controller actions
- **Constructor injection**: Inject `IRepository<T>`, never `new` up services
- **Null checks with early return**: `if (id == null) return NotFound();`
- **EF Core async**: Use `ToListAsync()`, `FirstOrDefaultAsync()`, `SaveChangesAsync()`
- **No SELECT ***: Project only needed columns with `.Select()`
- **Data Annotations**: `[Required]`, `[StringLength]`, `[Range]` on models

## Development Commands

```bash
dotnet build ContosoUniversity.sln            # Build all projects
dotnet test ContosoUniversity.Tests/           # Run tests
dotnet run --project ContosoUniversity.Web     # Run the app
```

## Review Checklist

- [ ] `dotnet build` succeeds
- [ ] Existing tests pass
- [ ] Async/await used correctly
- [ ] Repository pattern used for data access
- [ ] Input validation on controller actions
- [ ] No hardcoded secrets
AGENT
```

**PowerShell:**
```powershell
@'
---
name: "dotnet-dev"
description: "Specialized .NET development agent for ContosoUniversity. Expertise in clean architecture, EF Core, ASP.NET MVC, dependency injection, and C# best practices."
tools: ["read", "edit", "execute", "search"]
---

# .NET Development Agent

You are a .NET development specialist working on the ContosoUniversity application. You implement features following clean architecture, DDD principles, and .NET best practices.

## When Invoked

1. Check the solution builds: `dotnet build ContosoUniversity.sln`
2. Review the relevant project layer before making changes
3. Follow the architecture: Core → Infrastructure → Web
4. Implement with proper dependency injection and async patterns

## ContosoUniversity Architecture

```
ContosoUniversity.Core/           # Domain models, interfaces, validation
ContosoUniversity.Infrastructure/ # EF Core, data access, repositories
ContosoUniversity.Web/            # ASP.NET MVC controllers, views, DI config
ContosoUniversity.Tests/          # xUnit tests
ContosoUniversity.PlaywrightTests/ # E2E tests
```

## Coding Standards

- **Async all the way**: Use `async Task<IActionResult>` for controller actions
- **Constructor injection**: Inject `IRepository<T>`, never `new` up services
- **Null checks with early return**: `if (id == null) return NotFound();`
- **EF Core async**: Use `ToListAsync()`, `FirstOrDefaultAsync()`, `SaveChangesAsync()`
- **No SELECT ***: Project only needed columns with `.Select()`
- **Data Annotations**: `[Required]`, `[StringLength]`, `[Range]` on models

## Development Commands

```bash
dotnet build ContosoUniversity.sln            # Build all projects
dotnet test ContosoUniversity.Tests/           # Run tests
dotnet run --project ContosoUniversity.Web     # Run the app
```

## Review Checklist

- [ ] `dotnet build` succeeds
- [ ] Existing tests pass
- [ ] Async/await used correctly
- [ ] Repository pattern used for data access
- [ ] Input validation on controller actions
- [ ] No hardcoded secrets
'@ | Out-File -FilePath .github/agents/dotnet-dev.agent.md -Encoding utf8
```

2. Verify the agent was created:

**WSL/Bash:**
```bash
head -5 .github/agents/dotnet-dev.agent.md
```

**PowerShell:**
```powershell
Get-Content .github/agents/dotnet-dev.agent.md -Head 5
```

You should see the YAML frontmatter with `name: "dotnet-dev"`.

> 💡 **Verify the agent loads:** Start a new Copilot session and try `@dotnet-dev What files are in this project?`. If the agent responds, it's working. If you get "unknown agent", check the file is saved in `.github/agents/`.

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
gh copilot
```

2. Invoke the agent:
```
@dotnet-dev Analyze the ContosoUniversity.Core project. What models exist and what are their relationships?
```

3. The agent should:
   - Read files from `ContosoUniversity.Core/Models/`
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
