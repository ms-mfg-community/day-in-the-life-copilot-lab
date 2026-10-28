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

🖥️ **In your terminal (From the repository root):**

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
name: "agent-name"           # Display name (optional)
description: "What it does"  # Required: Copilot uses this for routing
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

All paths in the appendices are relative to the repository root — `cd` there before running any of the appendix commands.

> ⚠️ **PowerShell learners — paste the whole file, not a placeholder.** Each appendix shows the agent file as a WSL/Bash `cat > … << 'AGENT'` block, and its PowerShell version may be abbreviated: the .NET appendix's PowerShell block, for example, ends with the literal line `(see WSL/Bash body above for the complete prompt)` instead of the full prompt. If you use PowerShell, the text inside the `@'` … `'@` here-string must be the **complete file** from the WSL/Bash example: the frontmatter and the whole Markdown body, every section down to the *Review Checklist*. Copy everything between the `cat > … << 'AGENT'` line and the closing `AGENT` line, and delete the placeholder line if it is there. Those two wrapper lines are shell syntax, not file content.

Both appendices walk through:

1. Creating **`.github/agents/<track>-dev.agent.md`**. Use the **`.agent.md`** suffix: it is the convention the agents already in `.github/agents/` follow.
2. A system prompt that names the project layout, coding standards, and review checklist.

When the file exists, check it from your shell prompt. These are ordinary shell commands, so type them in a regular PowerShell or WSL/Bash terminal, not inside a Copilot session. First, check that the file starts with your frontmatter: `head -5 .github/agents/<track>-dev.agent.md` (PowerShell: `Get-Content .github/agents/<track>-dev.agent.md -Head 5`). You should see the opening `---`, the `name`, `description`, and `tools` lines, and the closing `---`.

Then check that the body made it into the file too. The `*` in `*-dev.agent.md` matches `dotnet` or `node`, so the same command works for either track:

**WSL/Bash:**
```bash
grep -nE '^## (Coding Standards|Review Checklist)' .github/agents/*-dev.agent.md
```

**PowerShell:**
```powershell
Select-String -Path .github/agents/*-dev.agent.md -Pattern '^## (Coding Standards|Review Checklist)'
```

You should see two matching lines for your agent file: `## Coding Standards` and `## Review Checklist`. If nothing matches, the file has only the frontmatter (or a placeholder) — go back to the appendix and paste the whole body before you continue.

> 🔄 **Restart required after creating the agent file**
>
> Copilot CLI and the VS Code Copilot extension discover `.github/agents/*.agent.md` files **once at session start** — agent definitions are **not** hot-reloaded when you save. Skip the restart and `/agent` may not list your new agent, and `--agent <track>-dev` may not find it, even though the file is on disk.
>
> After creating (or editing) the agent file:
>
> 1. Exit your current Copilot CLI session: type `exit` (or press <kbd>Ctrl</kbd>+<kbd>D</kbd>).
> 2. Restart it: `copilot`.
> 3. In VS Code, run **Developer: Reload Window** from the Command Palette (<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>) so the extension re-reads `.github/agents/`.

> 💡 **Verify the agent loads:** After restarting, check that Copilot can see your agent. There are two ways in, depending on where you are:
>
> - **Inside a Copilot session** (you just ran `copilot` for the restart and haven't exited): type `/agent` and pick `<track>-dev` from the list.
> - **At your shell prompt** (an ordinary PowerShell or WSL/Bash terminal): run `copilot --agent <track>-dev`.
>
> Then ask *"What files are in this project?"* If the agent responds, it's working. If Copilot can't find it, confirm the file is named `<track>-dev.agent.md` and lives under `.github/agents/`.
>
> **Then leave Copilot before you continue.** Type `/exit` to get back to your shell prompt. §3.3 and the first step of §3.4 are ordinary shell commands (`cat`, `Get-Content`, `copilot --agent …`); typed inside a Copilot session, they go to the model as a chat message instead of running in your shell.

## 3.3 Configure Tools and MCP Servers

The agent we created uses basic tools. Let's understand how to add MCP server access.

> 📚 **This section is a preview.** [Lab 05](lab05.md) is the canonical MCP configuration lab — it covers per-server scoping, credential handling, and the centralized `mcp-configs/` source of truth. The snippet below shows just enough to wire an MCP server into an agent's frontmatter; defer the full setup walkthrough to lab 05.

🖥️ **At your shell prompt, from the repository root** (if you are still inside Copilot, type `/exit` first):

1. View this repository's MCP configuration (the file ships with the repo, so you have it on a fresh clone):

**WSL/Bash:**
```bash
cat .copilot/mcp-config.json
```

**PowerShell:**
```powershell
Get-Content .copilot/mcp-config.json
```

Copilot CLI also supports a personal, machine-wide MCP file at `~/.copilot/mcp-config.json`. It may not exist on a fresh install, so this lab uses the repository's file instead.

2. Agents can declare MCP servers directly in their frontmatter. For example, to give the agent access to Context7 for .NET documentation lookups:

```yaml
---
name: "dotnet-dev"
description: "..."
tools: ["read", "edit", "execute", "search", "context7/*"]
mcp-servers:
  context7:
    type: local
    command: npx
    args: ["-y", "@upstash/context7-mcp"]
    tools: ["*"]
---
```

3. The `mcp-servers` field is an **object**: each key names a server, and its value uses the same fields (`type`, `command`, `args`, `tools`) as the `context7` entry in this repository's `.copilot/mcp-config.json`. The agent can then use tools from that server (e.g., `resolve-library-id` and `query-docs` from Context7) — but only if its own `tools` list allows them. Per GitHub's reference, that list filters MCP tools as well as built-in ones, so step 2 adds `context7/*` (every tool from the `context7` server) next to the four built-in aliases; the `tools: ["*"]` inside the `context7` entry does not override that filter. Also per GitHub's reference, `mcp-servers` is not used by VS Code and other IDE custom agents.

> 💡 **Note**: MCP server access is optional. The base tools (`read`, `edit`, `execute`, `search`) are sufficient for most development tasks. Add MCP servers when the agent needs specific capabilities like documentation lookup or knowledge persistence.

## 3.4 Test the Agent

Let's test our new agent by asking it to analyze the ContosoUniversity codebase — the .NET application on the .NET track, the Node application on the Node track.

Use the agent you created in §3.2: **`dotnet-dev`** on the .NET track or **`node-dev`** on the Node track. Each step below shows both tracks, so follow yours and skip the other. You will select the agent in two different ways, typed in two different places:

- **At your shell prompt**, `copilot --agent <name>` starts Copilot with that agent already selected (step 1).
- **Inside a running Copilot session**, `/agent <name>` switches to that agent (step 2).

🖥️ **At your shell prompt, from the repository root** (if you are still inside Copilot, type `/exit` first):

1. Non-interactive smoke test — verify the agent loaded and responds without entering the REPL:

**.NET track — WSL/Bash:**
```bash
copilot --agent dotnet-dev --prompt "List the files under dotnet/ContosoUniversity.Core/Models/ and name the entities." --allow-all-tools
```

**.NET track — PowerShell:**
```powershell
copilot --agent dotnet-dev --prompt 'List the files under dotnet/ContosoUniversity.Core/Models/ and name the entities.' --allow-all-tools
```

**Node track — WSL/Bash:**
```bash
copilot --agent node-dev --prompt "List the files under node/core/entities/ and name the entities." --allow-all-tools
```

**Node track — PowerShell:**
```powershell
copilot --agent node-dev --prompt 'List the files under node/core/entities/ and name the entities.' --allow-all-tools
```

If Copilot can't find your agent (`dotnet-dev` or `node-dev`), check the filename and location from §3.2 and make sure you did the 🔄 restart — exit and re-run `copilot`.

2. For an interactive session, start the REPL at your shell prompt:

```bash
copilot
```

From here on you are **inside Copilot**: what you type goes to the model, not to your shell. Select your agent:

**.NET track:**
```
/agent dotnet-dev
```

**Node track:**
```
/agent node-dev
```

Then type your request as a normal message:

**.NET track:**
```
Analyze the dotnet/ContosoUniversity.Core project. What models exist and what are their relationships?
```

**Node track:**
```
Analyze the node/core and node/infra folders. What entities exist and what are their relationships?
```

3. The agent should:

   **.NET track:**
   - Read files from `dotnet/ContosoUniversity.Core/Models/`
   - Identify the entity classes: Student, Course, Instructor, Enrollment, Department, OfficeAssignment, CourseAssignment, and Notification, plus the abstract `Person` base class that Student and Instructor inherit from
   - Describe relationships (Student has Enrollments, Course has Enrollments, etc.)

   **Node track:**
   - Read files from `node/core/entities/` and `node/infra/schema.ts`
   - Identify the entities Student, Course, and Instructor — enrollments are a table in `node/infra/schema.ts`, not a separate entity file
   - Describe relationships: Student and Course are linked through the `enrollments` table, which also stores the `grade`

4. With your agent still selected, try a development task:

**.NET track:**
```
What would I need to change to add a search feature to the Students controller?
```

**Node track:**
```
What would I need to change to add a search feature to the students API routes?
```

5. **Trace one instruction from your file to the answer.** The step-4 answer only teaches you something if you can tell it came from *your* agent file, so pick one line of that file and follow it into the response:
   1. Keep your Copilot session open. In a second terminal tab or in your editor, open `.github/agents/<track>-dev.agent.md` and find the **Coding Standards** list. (It is the same text as in your track's appendix, so you can read it there instead.)
   2. Find your track's bullet, then look for it in the step-4 answer:
      - **.NET track — "Async all the way"** (`async Task<IActionResult>` for controller actions): find a controller action the agent shows, proposes, or changes. Is it declared `async Task<IActionResult>`? The Students list already has a basic name search in its `Index` action, so the agent may point you at that existing action — that counts.
      - **Node track — "Validation"** (Zod schemas at the route boundary): does the agent validate the search input with a Zod schema, for example `z.object(...)` or `safeParse`?
   3. If you can't find it, that isn't a failure — a model doesn't apply every line of its instructions every time. Back in your Copilot session, ask: `Which of the coding standards in your instructions apply to this change?` Then put its list next to the bullets in your file and find each one it names.

When you're done, type `/exit` to leave Copilot and return to your shell prompt.

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
| **Invocation** | `/agent <name>` in a CLI session, or `copilot --agent <name>` |

**Best practices for agent design:**
- Give the agent a clear, focused domain (not "general purpose")
- List specific coding standards it should follow
- Include project-specific context (file structure, patterns)
- Add a review checklist for quality assurance
- Reference other agents for handoff (e.g., "hand off to the dotnet-qa agent for tests")

</details>

<details>
<summary>Solution: dotnet-dev.agent.md</summary>

See [`solutions/lab03-dotnet-dev-agent/dotnet-dev.agent.md`](../solutions/lab03-dotnet-dev-agent/dotnet-dev.agent.md) for the complete reference implementation.

</details>

> This agent is now available for orchestration in Lab 07, where you'll coordinate multiple agents working together.

**Next:** [Lab 04 — Skills & Prompts](lab04.md)
