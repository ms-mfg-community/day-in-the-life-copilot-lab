# 10 — Reindex, Session Management, Memory & Advanced Features

In this lab you will learn how Copilot understands your codebase (reindex), when you still need cross-session persistence (Memory MCP), session handoff techniques, and advanced Copilot CLI capabilities. This is the capstone — it ties everything together.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 15 minutes

References:
- [Repository indexing](https://docs.github.com/en/copilot/concepts/context/repository-indexing)
- [Memory MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
- [MCP specification](https://spec.modelcontextprotocol.io/)
- [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)

## 10.0 Reindex: How Copilot Understands Your Code

Before we talk about Memory MCP, let's understand what Copilot **already knows** about your codebase — without any extra configuration.

Copilot automatically builds a **semantic index** of your repository. This isn't keyword search — it's a meaning-based understanding of your code's structure, types, relationships, and patterns. This is called **reindex**.

| Feature | Details |
|---------|---------|
| **Speed** | Near-instant (seconds, even for large repos) |
| **How it works** | Builds a semantic index when you open the repo; refreshes as you edit |
| **What it understands** | Function purpose, type relationships, call hierarchies, patterns |
| **Available on** | All Copilot tiers — no limits on repos indexed |
| **Automatic** | No configuration needed — just open the repo |

🖥️ **Try it — ask Copilot questions about your codebase:**

```
How does the repository pattern work in ContosoUniversity?
```

```
What happens when a student enrolls in a course? Trace the flow from controller to database.
```

```
Show me all the places where Department is referenced across the solution.
```

> 💡 **Key insight:** Copilot answers these questions by searching semantically — it understands that "enrolls" relates to the `Enrollment` entity, `EnrollmentsController`, and the repository methods, even though those files don't all contain the word "enroll." This is reindex in action.

### What reindex handles vs. what it doesn't

| Reindex handles automatically ✅ | Still needs Memory MCP ❌ |
|----------------------------------|--------------------------|
| Code structure and relationships | Architecture decisions ("we chose X over Y because...") |
| Type hierarchies and call graphs | Team conventions not in code |
| File contents and patterns | Insights from previous sessions |
| Project architecture (from code) | Cross-session continuity |
| Test patterns and naming | Deployment notes, meeting decisions |

> 💡 **Bottom line:** Reindex replaced the need to manually teach Copilot about your code. Memory MCP is now complementary — use it for **decisions, context, and knowledge that isn't in the code itself.**

---

## 10.1 Memory MCP: Persistent Knowledge Beyond Code

Reindex understands your code automatically, but some knowledge lives **outside the codebase** — architecture decisions, team conventions, insights from debugging sessions, deployment gotchas. The Memory MCP provides a **persistent knowledge graph** for this kind of knowledge.

🖥️ **In your terminal:**

1. Verify the Memory MCP is configured:

**WSL/Bash:**
```bash
cat .copilot/mcp-config.json | grep -A 5 '"memory"'
```

**PowerShell:**
```powershell
Get-Content .copilot/mcp-config.json | Select-String -Pattern '"memory"' -Context 0,5
```

You should see:
```json
"memory": {
  "type": "local",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-memory"],
  "tools": ["*"]
}
```

> 💡 **Data model:** Memory MCP stores a knowledge graph. A **node** is an entity (e.g., "ContosoUniversity"). An **observation** is a fact about it. A **relation** links two entities. Think of it as: entities have observations, and relations connect entities.

2. The Memory MCP provides these tools:

| Tool | Purpose |
|------|---------|
| `create_entities` | Create new nodes in the knowledge graph |
| `create_relations` | Link entities together |
| `add_observations` | Add facts to existing entities |
| `search_nodes` | Search the knowledge graph |
| `open_nodes` | Retrieve specific entities by name |
| `read_graph` | Read the entire knowledge graph |
| `delete_entities` | Remove entities |
| `delete_relations` | Remove relations |
| `delete_observations` | Remove specific observations |

> 💡 **Knowledge graph model:** Entities are nodes (things), observations are facts about an entity, and relations are edges connecting entities. Think of it like a mini database with flexible schema.

## 10.2 Store Decisions and Context in Memory MCP

Reindex already knows your code structure. Use Memory MCP for knowledge that **isn't in the code** — decisions, conventions, and insights that future sessions need.

🖥️ **In Copilot CLI, ask the agent to store knowledge:**

```
Store the following in the Memory MCP knowledge graph:

Entity: ContosoUniversity-Decisions
Type: decisions
Observations:
- Chose repository pattern over direct DbContext access for testability
- Test naming convention: MethodName_Condition_ExpectedResult (team agreed 2024-Q3)
- SQL Server for production, SQLite for integration tests via WebApplicationFactory
- gh-aw PRD workflow triggers on feature/** branches — do NOT use for hotfixes
- Code review requires approval from @code-reviewer agent before merge
```

The agent will call `create_entities` to store this in the knowledge graph.

2. Now store a relation:

```
Store a relation in Memory MCP:
From: ContosoUniversity  Relation: "uses"  To: CleanArchitecture
Create the CleanArchitecture entity with type "pattern" and observation:
"Core has no dependencies, Infrastructure depends on Core, Web depends on both"
```

3. Verify what was stored:

```
Search the Memory MCP for "ContosoUniversity"
```

The agent calls `search_nodes` and returns the entity with all its observations.

> 💡 **Expected response:** Copilot confirms storage with something like "I've stored the ContosoUniversity entity with observations about its architecture." If it says "Memory MCP not available," the server isn't configured in `.copilot/mcp-config.json`.

> 💡 **When to store:** Store decisions, conventions, and gotchas — things that took effort to discover and aren't obvious from reading the code. Reindex already handles code structure, so don't duplicate that.

## 10.3 Use Knowledge Across Sessions

The power of Memory MCP becomes clear when you start a new session. The knowledge graph persists on disk, so a future session can read it.

🖥️ **In Copilot CLI:**

1. Read the full knowledge graph:
```
Read the entire Memory MCP knowledge graph and summarize what's stored.
```

The agent calls `read_graph` and shows all entities, observations, and relations.

2. Ask a question that uses stored knowledge:
```
Based on what's in the Memory MCP, what testing patterns should I follow for ContosoUniversity?
```

The agent searches the knowledge graph, finds the ContosoUniversity entity, reads the test naming convention observation, and provides a contextual answer.

3. Add a new observation based on what we learned in this lab:
```
Add these observations to the ContosoUniversity entity in Memory MCP:
- Has gh-aw workflow for PRD generation on feature/** branch creation
- Has gh-aw workflow for automated code review on pull requests
- Lab orchestrator delegates to dotnet-dev, dotnet-qa, then code-reviewer
```

> 💡 **Memory is cumulative.** Each session adds knowledge. Over time, the knowledge graph becomes a rich context that makes the AI assistant more effective — it remembers your project's conventions, decisions, and patterns.

## 10.4 Automatic Learning with Continuous Learning Skills

Memory MCP stores knowledge **explicitly** — you tell it what to remember. But what if the AI could learn **automatically** from your coding sessions?

This repository includes two **continuous-learning** skills that do exactly that.

🖥️ **In your terminal:**

1. Examine the continuous-learning skill:

**WSL/Bash:**
```bash
head -30 .github/skills/continuous-learning/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/continuous-learning/SKILL.md | Select-Object -First 30
```

This skill runs as a **sessionEnd hook** — at the end of each coding session, it:
1. Evaluates whether the session had enough activity (10+ messages)
2. Detects patterns: error resolutions, user corrections, workarounds, debugging techniques
3. Saves useful patterns to `~/.copilot/skills/learned/` as reusable knowledge

2. Now look at the v2 evolution:

**WSL/Bash:**
```bash
head -50 .github/skills/continuous-learning-v2/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/continuous-learning-v2/SKILL.md | Select-Object -First 50
```

| Feature | v1 (continuous-learning) | v2 (instinct-based) |
|---------|--------------------------|---------------------|
| **When** | sessionEnd hook (end of session) | preToolUse/postToolUse hooks (every action) |
| **Granularity** | Full skills | Atomic "instincts" with confidence scores |
| **Confidence** | None | 0.3 (tentative) → 0.9 (near-certain) |
| **Evolution** | Direct to skill | Instincts cluster → skills, commands, or agents |
| **Sharing** | None | Export/import instincts across teams |

3. See how v2 uses the hooks you learned about in Lab 06:

**WSL/Bash:**
```bash
grep -A 10 '"hooks"' .github/skills/continuous-learning-v2/SKILL.md | head -12
```

**PowerShell:**
```powershell
Get-Content .github/skills/continuous-learning-v2/SKILL.md | Select-String -Pattern '"hooks"' -Context 0,10 | Select-Object -First 1 | ForEach-Object { $_.Context.PostContext[0..9] -join "`n" }
```

The v2 architecture uses `preToolUse` and `postToolUse` hooks — the same hook types we explored in Lab 06. This means every tool call is observed, and patterns are never missed.

> 💡 **Three layers of knowledge:** Reindex is your **automatic code understanding** — it reads the code. Memory MCP is your **explicit decision store** — you tell it what to remember. Continuous learning is your **automatic pattern extractor** — it learns from what you do. Together, they make your AI assistant progressively smarter.

> 💡 **Ties it all together:** Notice how continuous learning combines skills (Lab 04), hooks (Lab 06), and session persistence (this lab). Each Copilot feature amplifies the others.

## 10.5 Session Handoff Techniques

When you reach the end of a session (context limit, break, or task boundary), create a handoff document so the next session can resume efficiently.

🖥️ **In Copilot CLI:**

1. This repository includes a handoff prompt. Examine it:

**WSL/Bash:**
```bash
cat .github/prompts/handoff.prompt.md | head -20
```

**PowerShell:**
```powershell
Get-Content .github/prompts/handoff.prompt.md | Select-Object -First 20
```

2. Use the handoff prompt to generate a handoff document:
```
/handoff
```

When prompted, provide:
- **Work description:** "Completed all 10 labs of the Everything GitHub Copilot hands-on workshop"
- **Stop reason:** "Lab complete"
- **Blocker:** (leave empty)

3. The prompt generates a structured handoff document with:
   - Current git state (branch, recent commits, modified files)
   - What was completed and what remains
   - Key discoveries and decisions
   - Verification commands
   - A fresh-context prompt block for the next session

4. You can also use the checkpoint prompt for lightweight saves:

**WSL/Bash:**
```bash
cat .github/prompts/checkpoint.prompt.md | head -15
```

**PowerShell:**
```powershell
Get-Content .github/prompts/checkpoint.prompt.md | Select-Object -First 15
```

```
/checkpoint create "lab-complete"
```

> 💡 **Handoff vs Checkpoint:** Use `/handoff` at the end of a session (comprehensive). Use `/checkpoint` at intermediate milestones (lightweight — just a git stash/commit marker).

> 💡 **When to use each:** Use `/checkpoint` at small milestones (finished a lab, completed initial design). Use `/handoff` when ending a session entirely — it generates a comprehensive context document for your next session.

## 10.6 Advanced Copilot CLI Features

The features we've covered so far — agents, skills, hooks, MCP, orchestration — are the building blocks. The Copilot CLI has additional advanced capabilities that amplify everything you've learned.

### LSP Integration (Language Server Protocol)

Copilot CLI interfaces with **language servers** for deep code intelligence — not just text search, but semantic understanding of your code.

```bash
# View and configure language servers
/lsp
```

| Capability | What It Does |
|-----------|-------------|
| Go-to-definition | Jump to where a symbol is defined |
| Find references | Find every usage of a function/type |
| Hover info | Get type signatures and documentation |
| Diagnostics | Real-time errors and warnings |
| Rename | Semantically rename a symbol across files |

You configure language servers via `.github/lsp.json` (per-repo) or `~/.copilot/lsp-config.json` (global):

```json
{
  "lspServers": {
    "typescript": {
      "command": "typescript-language-server",
      "args": ["--stdio"],
      "fileExtensions": { ".ts": "typescript", ".tsx": "typescript" }
    }
  }
}
```

> 💡 **Why this matters:** When Copilot uses LSP, it doesn't just `grep` your code — it *understands* types, inheritance, call hierarchies, and project structure. This is how it knows that changing a method signature will break 12 other files.

### Semantic Code Search (Reindex)

We covered reindex in section 10.0 — Copilot builds a **meaning-based index** of your codebase automatically. Here's a quick recap of what makes it powerful:

| Feature | Details |
|---------|---------|
| **Indexing speed** | Near-instant (seconds, even for large projects) |
| **How it works** | Builds a semantic index on repo open; refreshes as you work |
| **What it understands** | Function purpose, relationships, patterns — not just names |
| **Available on** | All Copilot tiers, no limits on repos indexed |

When you ask *"How does authentication work in this project?"*, Copilot uses semantic search — it finds relevant code by **meaning**, not by grepping for the word "auth".

### GitHub MCP: Remote Semantic Search

The built-in GitHub MCP server extends this to **remote repositories**:

```
Search the GitHub repo dotnet/aspnetcore for how middleware pipeline ordering works
```

Copilot can semantically search any GitHub repo you have access to — without cloning it. This is powerful for:
- Understanding upstream dependencies
- Finding examples in open-source projects
- Scanning organization repos for patterns or security issues

### Sub-Agents & Parallel Execution

Copilot CLI can spawn **specialized sub-agents** that run in parallel:

| Sub-Agent | Purpose | Model |
|-----------|---------|-------|
| `explore` | Fast codebase analysis and Q&A | Haiku (fast) |
| `task` | Run builds, tests, lints — brief on success, verbose on failure | Haiku (fast) |
| `plan` | Generate implementation plans | Sonnet |
| `code-review` | High signal-to-noise code review | Sonnet |

```bash
# Enable parallel agent execution
/fleet
```

With `/fleet` mode, multiple sub-agents work simultaneously — one explores the codebase while another runs tests while a third reviews changes. This is what makes complex workflows fast.

### Autopilot Mode

```
Shift+Tab  →  cycle through: interactive → plan → autopilot
```

In **autopilot mode**, the agent keeps working until the task is complete — no manual "continue" needed. Combined with sub-agents and fleet mode, this enables fully autonomous multi-step workflows.

### Context Management

For long sessions, Copilot provides tools to manage the context window:

| Command | Purpose |
|---------|---------|
| `/compact` | Summarize conversation history to free up context space |
| `/context` | Visualize token usage — see how full your context window is |
| `/session` | View session info and workspace summary |
| `/share` | Export session to markdown or GitHub gist |

> 💡 **Tying it all together:** LSP gives Copilot semantic code understanding. Semantic search indexes your codebase by meaning. GitHub MCP extends that reach to remote repos. Sub-agents parallelize work. Autopilot removes the human bottleneck. And context management keeps long sessions productive. Each feature amplifies the others.

## 10.7 How It All Fits Together

Let's review how every piece we've learned connects in a real development workflow:

```
┌─────────────────────────────────────────────────────┐
│                    GitHub (Platform)                  │
│                                                       │
│  Create Branch ──→ gh-aw: PRD Generated               │
│                                                       │
│  Open PR ──→ Copilot Code Review (built-in)           │
│                                                       │
│  GitHub MCP ──→ Semantic search across remote repos   │
│                                                       │
│  Enterprise policies ──→ Org-wide rules & rulesets    │
│                                                       │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────┴─────────────────────────────┐
│              Local (Copilot CLI + VS Code)            │
│                                                       │
│  Code Intelligence                                    │
│    LSP servers      → Go-to-def, hover, diagnostics   │
│    Semantic search  → Meaning-based code indexing      │
│    ripgrep + glob   → Fast pattern matching            │
│                                                       │
│  Configuration Ecosystem                              │
│    AGENTS.md          → Project context for all agents │
│    instructions/      → Rules for specific file types  │
│    copilot-instructions → Global behavior rules        │
│                                                       │
│  Agents & Orchestration                               │
│    dotnet-dev       → Implements features              │
│    dotnet-qa        → Writes tests                     │
│    code-reviewer    → Reviews code                     │
│    lab-orchestrator → Coordinates the pipeline         │
│    Sub-agents       → explore, task, plan (parallel)   │
│                                                       │
│  Knowledge & Automation                               │
│    skills/            → Auto-activated knowledge       │
│    prompts/           → Reusable command templates     │
│    hooks/             → Lifecycle guardrails           │
│    MCP servers        → context7, memory, ms-learn     │
│                                                       │
│  Session Management                                   │
│    /compact, /context → Token management               │
│    /fleet             → Parallel sub-agents            │
│    Autopilot          → Shift+Tab for autonomous mode  │
│    /handoff           → Cross-session continuity       │
│                                                       │
└───────────────────────────────────────────────────────┘
```

The workflow in practice:

1. **Create a feature branch** → gh-aw generates a PRD
2. **Read the PRD** → understand what to build
3. **Ask `@lab-orchestrator`** → it delegates to `@dotnet-dev`, `@dotnet-qa`, `@code-reviewer`
4. **Skills activate** → `dotnet-testing` provides testing patterns automatically
5. **Hooks fire** → `secret-scan` blocks secrets, `dotnet-build` verifies compilation
6. **Memory MCP** → stores decisions and conventions for future sessions
7. **Continuous learning** → automatically extracts patterns from your session
8. **Push + open PR** → Copilot Code Review provides automated feedback
9. **Iterate** → fix issues, push, get re-reviewed
10. **Handoff** → generate handoff doc when the session ends

## 10.8 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Reindex** | Automatic semantic understanding of your codebase — no config needed |
| **Memory MCP** | Persistent knowledge graph for decisions and context beyond code |
| **Entities** | Nodes with a name, type, and observations |
| **Relations** | Directed edges between entities |
| **Observations** | Individual facts attached to an entity |
| **Continuous learning** | Automatic pattern extraction from coding sessions |
| **Instincts (v2)** | Atomic learned behaviors with confidence scoring |
| **Handoff prompt** | `/handoff` — comprehensive session end document |
| **Checkpoint prompt** | `/checkpoint` — lightweight progress marker |
| **LSP** | Language server integration for semantic code intelligence |
| **Semantic search** | Meaning-based codebase indexing (instant) |
| **GitHub MCP** | Remote semantic search across GitHub repos |
| **Sub-agents** | Parallel specialized agents (explore, task, plan, review) |
| **Fleet mode** | `/fleet` — enable parallel sub-agent execution |
| **Autopilot** | `Shift+Tab` — agent works until task is complete |
| **Context mgmt** | `/compact`, `/context` for long session management |

**The complete Copilot agentic surface:**

| Feature | Location | Purpose |
|---------|----------|---------|
| Agents | `.github/agents/` | Specialized AI personas |
| Skills | `.github/skills/` | Auto-activated knowledge packs |
| Instructions | `.github/instructions/` | Path-specific rules |
| Prompts | `.github/prompts/` | Reusable command templates |
| Hooks | `.github/hooks/` | Lifecycle guardrails |
| MCP servers | `.copilot/mcp-config.json` | External tool integrations |
| LSP servers | `.github/lsp.json` | Language-aware code intelligence |
| AGENTS.md | Root | Project context for all agents |
| copilot-instructions.md | `.github/` | Global behavior rules |
| gh-aw workflows | `.github/workflows/*.md` | Cloud-side AI automation |
| Copilot Code Review | GitHub Settings (rulesets) | Platform-level AI PR review |

</details>

## Lab Complete 🎉

Congratulations! You've gone from zero to a full understanding of the GitHub Copilot agentic surface:

- ✅ **Lab 01** — Mapped the configuration ecosystem and instruction hierarchy
- ✅ **Lab 02** — Created custom instructions and updated AGENTS.md
- ✅ **Lab 03** — Built a specialized .NET development agent
- ✅ **Lab 04** — Created a skill and a prompt
- ✅ **Lab 05** — Configured MCP servers for extended capabilities
- ✅ **Lab 06** — Built hooks for guardrails and automation
- ✅ **Lab 07** — Orchestrated a multi-agent development pipeline
- ✅ **Lab 08** — Automated PRD generation with GitHub Agentic Workflows
- ✅ **Lab 09** — Used Copilot Code Review for AI-powered pull request reviews
- ✅ **Lab 10** — Explored reindex, used Memory MCP for decisions, practiced handoffs, and toured advanced features

### The Big Picture

Remember the opening video — 4 terminals collaborating on a real feature? That session broker was built using exactly these primitives: agents for specialization, MCP for coordination, hooks for guardrails, instructions for consistency. The question isn't whether AI changes how you work — it's how fast you can build your own agentic workflows.

### What's Next?

- **Customize:** Adapt these patterns to your own projects
- **Extend:** Create new agents, skills, and workflows for your team
- **Share:** Push your configurations to a shared repo for team-wide use
- **Scale:** Use gh-aw and Copilot Code Review to extend agentic workflows across your organization
- **Explore:** Try `/fleet` mode, autopilot (`Shift+Tab`), and `/lsp` in your daily work

**Return to:** [README](../README.md)
