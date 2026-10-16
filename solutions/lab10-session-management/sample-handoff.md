## Continuing: Everything GitHub Copilot Hands-On Lab

Last commit: abc1234 "docs: complete lab 10 agent memory exercises"
Branch: main
Date: 2026-04-24T16:30:00Z

### Context

Finished the exercises in all 10 labs of the workshop; Lab 10's §10.6
cleanup is still to do. Lab 10 wrapped the **three-layer
agent memory** model: raw sources (Layer 1) → the wiki in
`.copilot/lessons/` (Layer 2) → the schema in `AGENTS.md` and
`.github/instructions/` (Layer 3). Memory is plain markdown the agent
maintains itself — diffable, revertable, and committed alongside the
code.

### State of Work

**✅ Done:**
- [x] Lab 01 — Mapped configuration ecosystem and instruction hierarchy
- [x] Lab 02 — Created custom instructions and updated AGENTS.md
- [x] Lab 03 — Built a specialized .NET development agent
- [x] Lab 04 — Created a skill and a prompt
- [x] Lab 05 — Configured MCP servers and tried the wiki for cross-session persistence
- [x] Lab 06 — Built hooks for guardrails and automation
- [x] Lab 07 — Orchestrated a multi-agent development pipeline
- [x] Lab 08 — Automated PRD generation with GitHub Agentic Workflows
- [x] Lab 09 — Used Copilot Code Review for AI-powered pull request reviews
- [x] Lab 10 §10.0–§10.5 — Three-layer agent memory: raw sources, the wiki, the schema, and the `consolidate-lessons` prompt file

**🚧 In Progress:**
- [ ] Lab 10 §10.6 cleanup — revert the files the lab changed and remove any
      lab-created global wiki (not started)

**⏸️ Not Started:**
- [ ] Seed `.copilot/lessons/` in your own repo with one real lesson
- [ ] Run the `consolidate-lessons` prompt file with `--dry-run --scope both` weekly

### Current Position

**Where We Stopped:**
- Finished the §10.5 wrap-up: printed the three-layer loop diagram and
  saved this handoff. The §10.6 cleanup has not been done.

**Why We Stopped:**
- Lab 10 exercises finished; the §10.6 cleanup is still to do.

### Key Discoveries

Anything durable below should be promoted into `.copilot/lessons/log.md`
before you start a fresh conversation: a handoff is Layer 1, so nothing
curates it and a fresh conversation cannot see it until you point it there.
It stays on disk where you saved it until you delete it.

- The wiki recall demo works without any server: write a lesson in one
  session, `/exit`, ask the new session to consult `.copilot/lessons/`
  before answering — it does.
- `~/.copilot/lessons/` is per-workstation and is *not* committed from
  this repo; create it on first run.
- The `consolidate-lessons` prompt file flags contradictions between
  project and global lessons under `CONTRADICTION` — it does not
  auto-resolve them.
- Agent personalities (`planner.agent.md` vs `code-reviewer.agent.md`)
  surface different *kinds* of lessons, but neither has a file-writing
  tool — you, or a session that can write files, record them, and the
  schema keeps the shape consistent across roles.

### Files Modified

**Created (during labs):**
- `.github/instructions/razor-views.instructions.md` — Razor view conventions (Lab 02)
- `.github/agents/dotnet-dev.agent.md` — .NET development agent (Lab 03)
- `.github/skills/dotnet-testing/SKILL.md` — Testing skill (Lab 04)
- `.github/prompts/create-dotnet-test.prompt.md` — Test prompt (Lab 04)
- `.copilot/mcp-config.json` — MCP server configuration (Lab 05)
- `.copilot/lessons/log.md` — Appended a lesson during Lab 10 §10.2a
- `scripts/hooks/post-tool-use-dotnet-build.sh` — Build hook (Lab 06)
- `.github/agents/lab-orchestrator.agent.md` — Orchestrator agent (Lab 07)

### Next Steps

1. **Immediate:** Do the Lab 10 §10.6 cleanup. Revert
   `.github/instructions/dotnet.instructions.md` and `.copilot/lessons/`
   with `git restore --source=HEAD --staged --worktree`, delete the new
   files the scaffold created by name, remove the global wiki only if the
   §10.2c extension created it, and confirm `git status --short` shows
   nothing you did not mean to keep.
2. **Then:** Skim `.copilot/lessons/index.md` and pick one project
   lesson worth promoting — ask the agent to follow
   `.github/prompts/consolidate-lessons.prompt.md` with `--dry-run --scope both`.
3. **Then:** Adapt the lessons pattern to your team's repo. Seed
   `index.md`, `log.md`, and one real lesson before opening it to the
   wider team.
4. **Finally:** Set up gh-aw workflows and Copilot Code Review in your
   organization (Labs 08–09).

### Verification

**Commands to verify:**
```bash
# Verify MCP config is present (read it; no JSON tool required)
cat .copilot/mcp-config.json

# Verify the wiki ships and is parseable
ls .copilot/lessons/
head -30 .copilot/lessons/log.md

# Build the .NET project
dotnet build dotnet/ContosoUniversity.sln

# Build the test project (running its tests needs the ASP.NET Core 8 runtime)
dotnet build dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj
```

### Fresh Context Prompt

```text
## Resume Session

**Handoff:** lab10-handoff.md in the session's files folder (outside the repo)
**Branch:** main
**Last Commit:** abc1234 "docs: complete lab 10 agent memory exercises"

### Quick Context
Finished the exercises in all 10 labs covering the full local Copilot CLI
surface: agents, skills, prompts, hooks, MCP, orchestration, gh-aw, code
review, and three-layer agent memory in plain markdown. The Lab 10 §10.6
cleanup is still to do.

### Immediate Next Step
1. Do the Lab 10 §10.6 cleanup: revert the files the lab changed, remove any
   lab-created global wiki, and confirm `git status --short` is clean.
2. Then apply learned patterns to a real project — start by creating an
   AGENTS.md, a copilot-instructions.md, and a `.copilot/lessons/`
   wiki seeded with one real lesson.

### Read the wiki first
Before doing anything, ask the agent to read:
- `.copilot/lessons/index.md` (project catalog)
- `~/.copilot/lessons/index.md` (global catalog, if present)
- the most recent entries in `.copilot/lessons/log.md`

That's how this repo persists context across sessions — no server,
no graph, just markdown the agent wrote to itself last time.

### Recommended Agents
- dotnet-dev.agent.md — for .NET development
- code-reviewer.agent.md — for code review
- planner.agent.md — for feature planning

### Recommended Prompts
Prompt files — ask the agent to follow them by path:
- handoff.prompt.md — for session continuity
- consolidate-lessons.prompt.md — to reshape the wiki (always start with --dry-run)
- tdd.prompt.md — for test-driven development
- orchestrate.prompt.md — for multi-agent workflows
```
