# 10 — Session Management, Memory & Advanced Features

In this lab you will learn cross-session persistence with the Memory MCP, practice session handoff, and get a tour of advanced Copilot CLI capabilities. This is the capstone — it ties everything together.

> ⏱️ Presenter pace: 5 minutes | Self-paced: 15 minutes

References:
- [Memory MCP server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
- [MCP specification](https://spec.modelcontextprotocol.io/)
- [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli)

## 10.1 Understand the Memory MCP

AI coding assistants lose all context when a session ends. The Memory MCP server solves this by providing a **persistent knowledge graph** — a database of entities, observations, and relations that survives across sessions.

🖥️ **In your terminal:**

1. Verify the Memory MCP is configured:
```bash
cat .copilot/mcp-config.json | grep -A 5 '"memory"'
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

## 10.2 Store Knowledge in Memory MCP

Let's store some knowledge about the ContosoUniversity project that would be useful for a future session.

🖥️ **In Copilot CLI, ask the agent to store knowledge:**

```
Store the following in the Memory MCP knowledge graph:

Entity: ContosoUniversity
Type: project
Observations:
- .NET 8 clean architecture project with Core, Infrastructure, Web, Tests, and PlaywrightTests projects
- Uses Entity Framework Core with SQL Server for data access
- Models: Student, Course, Instructor, Enrollment, Department, OfficeAssignment
- Repository pattern in Infrastructure, DI in Web startup
- Test naming convention: MethodName_Condition_ExpectedResult
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

> 💡 **When to store:** Store facts that took effort to discover — architecture patterns, naming conventions, gotchas, key decisions. Don't store things easily found by reading the code.

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
```bash
head -30 .github/skills/continuous-learning/SKILL.md
```

This skill runs as a **sessionEnd hook** — at the end of each coding session, it:
1. Evaluates whether the session had enough activity (10+ messages)
2. Detects patterns: error resolutions, user corrections, workarounds, debugging techniques
3. Saves useful patterns to `~/.copilot/skills/learned/` as reusable knowledge

2. Now look at the v2 evolution:
```bash
head -50 .github/skills/continuous-learning-v2/SKILL.md
```

| Feature | v1 (continuous-learning) | v2 (instinct-based) |
|---------|--------------------------|---------------------|
| **When** | sessionEnd hook (end of session) | preToolUse/postToolUse hooks (every action) |
| **Granularity** | Full skills | Atomic "instincts" with confidence scores |
| **Confidence** | None | 0.3 (tentative) → 0.9 (near-certain) |
| **Evolution** | Direct to skill | Instincts cluster → skills, commands, or agents |
| **Sharing** | None | Export/import instincts across teams |

3. See how v2 uses the hooks you learned about in Lab 06:
```bash
grep -A 10 '"hooks"' .github/skills/continuous-learning-v2/SKILL.md | head -12
```

The v2 architecture uses `preToolUse` and `postToolUse` hooks — the same hook types we explored in Lab 06. This means every tool call is observed, and patterns are never missed.

> 💡 **Explicit + Automatic:** Memory MCP is your **explicit** knowledge store — you decide what to remember. Continuous learning is your **automatic** pattern extractor — it learns from what you do. Together, they make your AI assistant progressively smarter across sessions.

> 💡 **Ties it all together:** Notice how continuous learning combines skills (Lab 04), hooks (Lab 06), and session persistence (this lab). Each Copilot feature amplifies the others.

## 10.5 Session Handoff Techniques

When you reach the end of a session (context limit, break, or task boundary), create a handoff document so the next session can resume efficiently.

🖥️ **In Copilot CLI:**

1. This repository includes a handoff prompt. Examine it:
```bash
cat .github/prompts/handoff.prompt.md | head -20
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
```bash
cat .github/prompts/checkpoint.prompt.md | head -15
```

```
/checkpoint create "lab-complete"
```

> 💡 **Handoff vs Checkpoint:** Use `/handoff` at the end of a session (comprehensive). Use `/checkpoint` at intermediate milestones (lightweight — just a git stash/commit marker).

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

### Semantic Code Search

Copilot builds a **meaning-based index** of your codebase — not keyword matching, but intent-based retrieval.

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
| **Memory MCP** | Persistent knowledge graph across sessions |
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
- ✅ **Lab 10** — Used Memory MCP, explored LSP, semantic search, sub-agents, and fleet mode

### The Big Picture

Remember the opening video — 4 terminals collaborating on a real feature? That session broker was built using exactly these primitives: agents for specialization, MCP for coordination, hooks for guardrails, instructions for consistency. The question isn't whether AI changes how you work — it's how fast you can build your own agentic workflows.

### What's Next?

- **Customize:** Adapt these patterns to your own projects
- **Extend:** Create new agents, skills, and workflows for your team
- **Share:** Push your configurations to a shared repo for team-wide use
- **Scale:** Use gh-aw and Copilot Code Review to extend agentic workflows across your organization
- **Explore:** Try `/fleet` mode, autopilot (`Shift+Tab`), and `/lsp` in your daily work

**Return to:** [README](../README.md)
