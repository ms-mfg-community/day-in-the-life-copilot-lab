---
agent: 'agent'
description: 'Generate session handoff documentation for work continuity'
---

Create a comprehensive session handoff document for my current work.

## Context

Work description: ${input:work_description:What were you working on?}
Why stopped: ${input:stop_reason:Why are you stopping? (e.g., context limit, blocker, decision point, break)}
Current blocker: ${input:blocker:Any blockers or unresolved issues? (leave empty if none)}

## Analysis Tasks

1. **Check git status and recent commits:**
   - Current branch name
   - Staged, unstaged, and untracked files
   - Last 5 commits to understand trajectory and commit style
   - Run: `git status --porcelain`, `git log --oneline -5`, `git diff --stat`

2. **Look for existing handoff documentation:**
   - Check if #file:handoff.md exists
   - Check if #file:HANDOFF.md exists
   - Check #file:docs/SESSION_HANDOFFS/ for prior handoffs
   - If found, read them and incorporate context

3. **Analyze modified files:**
   - Read changed files to understand scope and purpose
   - Identify what features/modules are affected
   - Note any critical dependencies or relationships

## Output Format

Generate a markdown document with these sections:

### 1. Header
```
## Continuing: [brief description of work]

Last commit: [hash] "[message]"
Branch: [current branch]
Date: [current date/time]
```

### 2. Context
- Original goal/objective
- Important background decisions made
- Relevant constraints or requirements
- Links to related issues/PRs (if mentioned in commits)

### 3. State of Work

**✅ Done:**
- [x] Completed item 1
- [x] Completed item 2

**🚧 In Progress:**
- [ ] Current item (where work stopped)
- [ ] Next planned item

**⏸️ Not Started:**
- [ ] Future item 1
- [ ] Future item 2

### 4. Current Position

**Where We Stopped:**
- Specific file, function, or line where work paused
- What was actively being worked on

**Why We Stopped:**
- [Blocker, decision point, context limit, natural break, etc.]

### 5. Key Discoveries

Document important learnings to avoid re-derivation:
- "Discovered X uses Y pattern, not Z"
- "Tried approach A, failed because B"
- "Critical dependency: C must happen before D"
- "Warning: E has quirk F that requires workaround G"

### 6. Files Modified

**Created:**
- `path/to/file1.ts` - [purpose]
- `path/to/file2.ts` - [purpose]

**Modified:**
- `path/to/file3.ts` - [what changed and why]
- `path/to/file4.ts` - [what changed and why]

**Deleted:**
- `path/to/file5.ts` - [why removed]

### 7. Open Questions

Unresolved items needing decisions or research:
1. Question about X - [context and why it matters]
2. Choice between A vs B - [tradeoffs]
3. Unclear requirement Y - [what needs clarification]

### 8. Next Steps

Specific actionable items in priority order:
1. **Immediate:** [what to do first and why]
2. **Then:** [what follows]
3. **Finally:** [what completes this phase]

### 9. Verification

**Tests that should pass:**
- [List specific test commands]

**Commands to verify:**
```bash
[verification commands]
```

**Expected output:**
- [What should happen when things are working]

### 10. Pitfalls to Avoid

Lessons learned - what NOT to do:
- ❌ Don't try X because Y
- ❌ Avoid pattern Z, use W instead
- ❌ Never touch file F without also updating G

### 11. Quick Reference

**Key files:**
- [Important file paths]

**Important functions/classes:**
- [Critical code locations]

**Dependencies:**
- [Key packages or modules]

**Documentation links:**
- [Relevant docs]

---

## Success Criteria

The handoff document should allow the next session to:
- ✅ Understand context within 30 seconds
- ✅ Know exactly where to start
- ✅ Avoid re-deriving previous learnings
- ✅ Make informed decisions based on documented tradeoffs
- ✅ Verify work is on track using provided commands

Generate a self-contained, paste-ready handoff document following this structure.

### 12. Fresh Context Prompt

Generate a copy/paste block for the next session:

```text
## Resume Session

**Handoff:** [link to handoff doc]
**Branch:** [current branch]
**Last Commit:** [hash] "[message]"

### Quick Context
[2-3 sentence summary of what was being worked on]

### Immediate Next Step
1. [First action to take]

### Read Memory
Use Memory MCP: memory-read_graph to get entity observations

### Recommended Agents
[List 2-3 most relevant agents for this work]
- typescript-dev.agent.md - for TS development
- tdd-guide.agent.md - for test-first implementation

### Recommended Prompts
[List 2-3 most relevant prompts]
- /tdd - for test-driven development
- /code-review - after implementation
```

### Building Agent Awareness

To generate relevant agent recommendations:
1. Read .github/agents/*.md files
2. Match agents to current work domain
3. Suggest 2-3 most relevant agents

Available agents (scan for current list):
- agent-framework - Azure Agent Framework SDK
- ai-foundry - Microsoft Foundry Platform
- architect - System architecture
- azure-infrastructure - Azure IaC/Bicep
- azure-orchestrator - Cross-domain coordination
- azure-testing - Azure DevOps testing
- build-error-resolver - Build/type error fixes
- code-reviewer - Code review
- database-reviewer - PostgreSQL/database review
- doc-updater - Documentation updates
- doc-writer - Documentation writing
- e2e-runner - End-to-end testing
- fabric-data - Microsoft Fabric/data
- go-build-resolver - Go build errors
- go-reviewer - Go code review
- observer - Session observation
- planner - Planning specialist
- refactor-cleaner - Dead code cleanup
- security-reviewer - Security checks
- story-writer - User stories
- tdd-guide - Test-driven development
- typescript-dev - TypeScript development
- typescript-qa - TypeScript testing

Available prompts (scan for current list):
- /build-fix - Fix build errors
- /checkpoint - Create checkpoint
- /code-review - Code review
- /commit - Commit changes
- /cost-optimize - Cost optimization
- /create-agent - Create new agent
- /create-bicep - Create Bicep templates
- /create-epic - Epic creation
- /create-test - Create tests
- /design-lakehouse - Lakehouse design
- /e2e - E2E tests
- /eval - Evaluation harness
- /evolve - Evolve instincts
- /go-build - Go build fixes
- /go-review - Go code review
- /go-test - Go testing
- /handoff - This prompt
- /hooks-check - Verify hooks
- /instinct-export - Export instincts
- /instinct-import - Import instincts
- /instinct-status - Instinct status
- /learn - Learning capture
- /orchestrate - Multi-agent orchestration
- /plan - Planning
- /plan-infrastructure - Infrastructure planning
- /refactor-clean - Refactor/cleanup
- /security-baseline - Security baseline
- /select-model - Model selection
- /setup-pm - Setup package manager
- /skill-create - Create skills
- /tdd - TDD workflow
- /test-coverage - Test coverage
- /update-codemaps - Update codemaps
- /update-docs - Update documentation
- /verify - Verification loop
- /waf-review - Well-Architected review
