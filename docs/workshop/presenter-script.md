---
title: "Advanced Copilot CLI Workshop — Presenter Script"
audience: "Advanced developers / platform engineers; 4-hour single-day workshop"
total_runtime: "4h 00m (08:00–12:00 America/Chicago, with two 10-min breaks and a 40-min contingency tail)"
generated_from: "workshop/site/hackathon.html (64 slides) + workshop/site/agenda.json"
---

# Advanced Copilot CLI Workshop — Presenter Script

This is the **slide-keyed front page** the presenter reads on the podium. It walks every slide in deck order, names what to say, names which lab to dive into and at which cue, and links into the **backing detail** in `workshop/speaker-scripts/module-XX-*.md` (the 6 module narrative files). The deck's inline `<div class="slide-notes">` blocks are the live cue layer (press **N** in the deck to reveal them); this file is the longer-form companion.

## How to use this document

1. Read the **module banner** when you cross into a new module — the banner is your reset point on time and intent.
2. For each slide, read **Say this** verbatim or as a starting line, then follow **Then** to drive the next action (advance, demo, switch app, lab dive).
3. **Lab dive** lines name the exact `labs/<file>.md` to open, the cue (slide # + spoken phrase), and the matching `workshop/speaker-scripts/module-XX-*.md` section to keep open in a second pane. Slides with no dive show `Lab dive: —`.
4. The 6 `workshop/speaker-scripts/module-*.md` files hold the **full demo narrative** (Demo A/B/C scripts, pitfalls, timing). Open them alongside this file — do not merge. This file is the index; those files are the chapters.
5. Slide numbers in this script match `<section>` order in `workshop/site/hackathon.html`. Titles are byte-equivalent to the deck's `<h1>`/`<h2>` headings. All `labs/` and `workshop/speaker-scripts/` paths in this document are repo-root-relative (this file lives at `docs/workshop/presenter-script.md`).

---

## Module banner — Welcome (08:00–08:05)

Top-of-day smoke test: environment, CLI auth, MCP servers reachable. Not a content module. Stay tight; you owe M1 every minute you can save here.

### Slide 1 — GitHub Copilot Hackathon
- Target time: 08:00 (~30s)
- Say this: "Welcome. JohnHenry Hain and Bob O'Keefe — Sr. CSAs. This is the advanced Copilot CLI workshop, and the next four hours are hands-on, terminal-first."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem` (sets the room's mental model for "advanced" before we get to M1)

### Slide 2 — Agenda
- Target time: 08:00 (~30s)
- Say this: "Six modules, two breaks, one flagship. By 11:05 you'll have run the tmux orchestrator end-to-end. Don't get lost in the marketing slides — I'll blast through them."
- Then: Advance to schedule.
- Lab dive: —
- Backing detail: `workshop/curriculum.md`

### Slide 3 — Hackathon Schedule
- Target time: 08:01 (~45s)
- Say this: "This is rendered live from `agenda.json`. Modules M1–M6 plus a Q&A; M6 is the flagship A2A + tmux meta-loop."
- Then: Point at the M6 row, then advance.
- Lab dive: —
- Backing detail: `workshop/site/agenda.json` (timing source)

### Slide 4 — GitHub CopilotOverview
- Target time: 08:01 (~30s)
- Say this: "Two slides of context so the rest lands. We're not selling Copilot today — we're operating it."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem`

### Slide 5 — Copilot Feature Matrix
- Target time: 08:02 (~45s)
- Say this: "Chat, edits, agent mode, the cloud Coding Agent, and CLI. Today is CLI-first; the Coding Agent shows up in M4."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#1-open-with-the-advanced-problem`

### Slide 6 — GitHub Copilot Plans
- Target time: 08:02 (~30s)
- Say this: "Pro / Business / Enterprise gates the cloud Coding Agent and the org-scoped extension/plugin marketplace surfaces we use in M5."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-05-marketplace.md#1-open-with-the-advanced-problem`

### Slide 7 — Copilot Extensibility Map
- Target time: 08:03 (~45s)
- Say this: "This is the map of every surface we'll touch — agents, skills, prompts, hooks, MCP, plugins, extensions. Memorize this picture; we'll come back to every box."
- Then: Trace the map left-to-right with the cursor, then advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#2-demo-script`

### Slide 8 — GitHub Copilot vs Azure AI Foundry
- Target time: 08:04 (~45s)
- Say this: "Copilot is the developer surface. Foundry is the platform for shipping agents to production. They compose; they don't replace each other."
- Then: Advance into the Lab 01 cue.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem`

---

## Module banner — M1 — Copilot CLI extensibility architecture (08:05–08:40)

Choose between AGENTS.md, custom agents, skills, prompts, hooks, and memory; wire them into one coherent project profile. Anchor labs: lab01, lab02, lab03, lab04, lab06, lab10.

### Slide 9 — → Lab 01: Exploring Copilot Configuration `[lab-cue]`
- Target time: 08:05 (~60s — full cue read)
- Say this: "First lab cue. Open `labs/lab01.md` now and inventory what Copilot loads on a fresh machine: AGENTS.md, custom agents, skills, prompts, hooks, MCP servers. You can't customize what you can't see."
- Then: Pause for attendees to open the lab; do NOT live-demo here — this is a cue, not a demo. Advance after 60s.
- Lab dive: `labs/lab01.md` — cue at slide #9 ("inventory what Copilot loads"); open `workshop/speaker-scripts/module-01-extensibility-architecture.md#demo-a-whats-loaded-right-now-4-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#demo-a-whats-loaded-right-now-4-min`

### Slide 10 — GitHub Copilot CLI
- Target time: 08:06 (~30s)
- Say this: "Section divider. Everything from here through slide 36 is the CLI's customization surface. Settle in."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#2-demo-script`

### Slide 11 — Why GitHub Copilot CLI?
- Target time: 08:07 (~30s — flag-fast-pace per plan.md risk)
- Say this: "Terminal-native, agentic, scriptable. Audience knows this. Moving on."
- Then: Advance immediately.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem`

### Slide 12 — More Devs Choosing the CLI
- Target time: 08:07 (~20s — flag-fast-pace per plan.md risk)
- Say this: "Adoption stats. They're up. Moving on."
- Then: Advance immediately.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem`

### Slide 13 — CLI Agent vs gh-aw Platform
- Target time: 08:08 (~60s)
- Say this: "Quick teaser for M4: the CLI is the human's loop, gh-aw is the unattended loop. Same agent, different operator. We'll come back to this hard at slide 47."
- Then: Advance. Resist diving into gh-aw now.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#1-open-with-the-advanced-problem`

### Slide 14 — gh-aw Safe Outputs Architecture
- Target time: 08:09 (~60s)
- Say this: "Foundation slide for M4 — `safe-outputs` is the trust boundary that lets us trust agent output enough to file PRs and issues. Mark this; we operate on it in M4."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#demo-c-the-safe-outputs-trust-boundary-5-min`

### Slide 15 — CustomizingGitHub Copilot CLI
- Target time: 08:10 (~30s)
- Say this: "Section divider. The next nine slides are the M1 backbone: hooks, plugins/extensions, skills, prompts, agents."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#demo-b-surface-by-surface-in-30-seconds-each-6-min`

### Slide 16 — Hooks Overview
- Target time: 08:11 (~90s)
- Say this: "Hooks are the deterministic safety rail. They run on every turn, every session — no LLM in the path. Pre-prompt, post-response, pre-tool-call, post-tool-call."
- Then: Advance through the lifecycle slides.
- Lab dive: `labs/lab06.md` — cue at slide #16 ("hooks are the deterministic safety rail"); open `workshop/speaker-scripts/module-01-extensibility-architecture.md#hooks--every-turn-every-session` alongside.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#hooks--every-turn-every-session`

### Slide 17 — Hooks Lifecycle
- Target time: 08:12 (~60s)
- Say this: "Four event points. Order matters: pre-prompt fires before the model sees the turn; pre-tool-call is your last chance to veto an action."
- Then: Advance.
- Lab dive: `labs/lab06.md` — cue at slide #17 ("order matters"); same backing detail as slide 16.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#hooks--every-turn-every-session`

### Slide 18 — Hooks Use Cases Part 1
- Target time: 08:13 (~60s)
- Say this: "Audit logging, redaction, command allow-listing. These are the patterns lab06 walks you through."
- Then: Advance.
- Lab dive: `labs/lab06.md` — cue at slide #18 ("audit logging, redaction, allow-listing"); same backing detail.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#hooks--every-turn-every-session`

### Slide 19 — Hooks Use Cases Part 2
- Target time: 08:14 (~60s)
- Say this: "Validation gates and policy enforcement — the hook is the only thing on this slide that can't be talked out of running. That's the point."
- Then: Advance into Plugins.
- Lab dive: `labs/lab06.md` — cue at slide #19 ("the only thing that can't be talked out of running"); same backing detail.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#hooks--every-turn-every-session`

### Slide 25 — GitHub CopilotSkills & Instructions
- Target time: 08:22 (~30s)
- Say this: "Section divider. Skills and instructions are the two ways you teach Copilot what *this project* expects."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-skill--the-description-drives-activation`

### Slide 26 — Skills vs Custom Instructions
- Target time: 08:23 (~75s)
- Say this: "Decision framing: instructions are always-on context; skills are activated by description match. If it applies to every turn, instruct it; if it applies sometimes, skill it."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-skill--the-description-drives-activation`

### Slide 27 — How to Create Skills
- Target time: 08:25 (~75s)
- Say this: "SKILL.md frontmatter — `name` and `description` are required. The description is the activation signal; write it like an LLM is the reader, because one is."
- Then: Advance.
- Lab dive: `labs/lab04.md` — cue at slide #27 ("the description is the activation signal"); open `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-skill--the-description-drives-activation` alongside.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-skill--the-description-drives-activation`

### Slide 28 — How Copilot Uses Skills
- Target time: 08:26 (~60s)
- Say this: "Runtime: Copilot scans skill descriptions, matches against the turn, loads matching SKILL.md bodies into context. No magic — just description matching."
- Then: Advance.
- Lab dive: `labs/lab04.md` — cue at slide #28 ("no magic — just description matching"); same backing detail.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-skill--the-description-drives-activation`

### Slide 29 — Custom Instructions Overview
- Target time: 08:28 (~75s)
- Say this: "AGENTS.md and `.github/copilot-instructions.md`. Always-on. Use them for invariants — coding standards, security rules, what 'done' means in this repo."
- Then: Advance.
- Lab dive: `labs/lab02.md` — cue at slide #29 ("AGENTS.md and copilot-instructions.md"); open `workshop/speaker-scripts/module-01-extensibility-architecture.md#agentsmd--copilot-instructionsmd` alongside.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#agentsmd--copilot-instructionsmd`

### Slide 30 — Prompt File Techniques
- Target time: 08:30 (~75s)
- Say this: "`.prompt.md` files are slash-command-invokable. They are not auto-loaded — the human has to ask. Use for repeatable workflows like `/code-review` or `/handoff_prompt`."
- Then: Advance.
- Lab dive: `labs/lab04.md` — cue at slide #30 ("the human has to ask"); same backing detail as slide 27.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-prompt--human-invoked`

### Slide 31 — Custom Agents
- Target time: 08:32 (~90s)
- Say this: "Custom agents in `.github/agents/`. Each one is a scoped role with its own tools, model, and instructions. lab03 walks through authoring one."
- Then: Advance.
- Lab dive: `labs/lab03.md` — cue at slide #31 ("each one is a scoped role"); open `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-custom-agent` alongside. **Optional second dive:** `labs/lab10.md` (Karpathy-style memory pattern) — mention in passing as the persistent-context companion to custom agents; defer the dive to homework if running tight.
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-custom-agent`

### Slide 33 — Copilot Spaces
- Target time: 08:34 (~30s — off-spine)
- Say this: "IDE-side feature for grouping context. Off-spine for a terminal-first workshop; mention only."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem`

### Slide 34 — Next Edit Suggestions (NES)
- Target time: 08:35 (~30s — off-spine)
- Say this: "IDE inline-edit feature. Surface only if asked in Q&A."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem`

### Slide 36 — Vision & Multimodal Input
- Target time: 08:38 (~30s — off-spine)
- Say this: "Multimodal in. Off-spine; mention only."
- Then: Advance into the M2 cue.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-01-extensibility-architecture.md#1-open-with-the-advanced-problem`

---

## Module banner — M2 — MCP servers in anger (08:40–09:10)

Compose multiple MCP servers in one session, debug silent failures, use `--additional-mcp-config` for per-session overrides. Anchor labs: lab05, lab12.

### Slide 37 — → Lab 05 + Lab 12: MCP in anger `[lab-cue]`
- Target time: 08:40 (~60s — full cue read)
- Say this: "Two anchor labs for M2. lab05 is MCP composition — three servers in one session. lab12 is Fabric MCP with the offline Parquet fallback for restricted networks. Open both tabs now."
- Then: Pause 60s for attendees to open both labs. Advance into the MCP block.
- Lab dive: `labs/lab05.md` (MCP composition) **and** `labs/lab12.md` (Fabric MCP + offline Parquet) — cue at slide #37 ("three servers in one session"); open `workshop/speaker-scripts/module-02-mcp.md#demo-b-compose-three-servers-with---additional-mcp-config-5-min` and `#demo-c-fabric-mcp--auth-6-min` in two panes.
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#2-demo-script`

### Slide 38 — Model Context Protocol
- Target time: 08:41 (~45s)
- Say this: "Section divider. MCP is the open protocol every Copilot surface speaks for tool/resource extension."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#1-open-with-the-advanced-problem`

### Slide 39 — Core MCP Concepts Part 1
- Target time: 08:42 (~120s)
- Say this: "Servers, tools, transport. stdio for local trusted servers; HTTP for remote. The transport choice is a security choice."
- Then: Advance.
- Lab dive: `labs/lab05.md` — cue at slide #39 ("the transport choice is a security choice"); open `workshop/speaker-scripts/module-02-mcp.md#demo-a-config-layer-tour-3-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#demo-a-config-layer-tour-3-min`

### Slide 40 — Core MCP Concepts Part 2
- Target time: 08:44 (~120s)
- Say this: "Resources, prompts, sampling. Resources are reads; tools are writes; prompts are templates the server offers the client. Most of M2's debugging time goes here."
- Then: Advance.
- Lab dive: `labs/lab05.md` — cue at slide #40 ("most debugging time goes here"); same backing detail.
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#demo-d-break-one-on-purpose-debug-repair-6-min`

### Slide 41 — Generate Custom Instructions
- Target time: 08:46 (~90s)
- Say this: "An MCP server can scaffold instructions for you. Useful but easy to over-rely on — the LLM is writing your invariants."
- Then: Advance.
- Lab dive: `labs/lab12.md` — cue at slide #41 ("the LLM is writing your invariants"); open `workshop/speaker-scripts/module-02-mcp.md#demo-c-fabric-mcp--auth-6-min` alongside (Fabric-MCP composition).
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#demo-c-fabric-mcp--auth-6-min`

### Slide 43 — Knowledge Bases
- Target time: 08:50 (~30s — off-spine)
- Say this: "KB feature for grounding. Adjacent to MCP resources. Mention only."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#1-open-with-the-advanced-problem`

### Slide 44 — GitHub Models
- Target time: 08:51 (~30s — off-spine)
- Say this: "GitHub Models inference catalog. Useful for evaluation; not on today's spine."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#1-open-with-the-advanced-problem`

### Slide 45 — GitHub Spark ✨
- Target time: 08:52 (~30s — off-spine)
- Say this: "Micro-app builder. Off-spine; mention only."
- Then: Advance into the M4 cue.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-02-mcp.md#1-open-with-the-advanced-problem`

---

## Module banner — M3 — Multi-agent orchestration (09:20–09:45)

> Order note: M3 in the deck weaves through three places — slide 32 (topology), slide 35 (model selection), and slides 57–61 (the agent-management section). Per the agenda, M3 runs after the 09:10 break. Use slides 32 and 35 in the M1 flow as foreshadowing; do the actual M3 dive at slide 57.

Decompose tasks into parallel stateless sub-agent dispatches, route models by cost/judgment, know when not to spawn one. Anchor lab: lab07.

### Slide 32 — Multi-Agent Topology
- Target time: 08:33 (~60s — foreshadow M3)
- Say this: "First glimpse of M3. There are four shapes: single session, agent-of-agents, `task`-tool dispatch, background tasks. We'll walk all four at slide 57."
- Then: Advance — do NOT dive yet.
- Lab dive: `labs/lab07.md` — preview cue only at slide #32 ("we'll walk all four at slide 57"); open `workshop/speaker-scripts/module-03-multi-agent.md#demo-a-four-shapes-on-disk-60-seconds-each-4-min` for reference.
- Backing detail: `workshop/speaker-scripts/module-03-multi-agent.md#demo-a-four-shapes-on-disk-60-seconds-each-4-min`

### Slide 35 — Model Selection Guide
- Target time: 08:37 (~75s — M3 foreshadow)
- Say this: "Model routing is half of multi-agent design. Cheap haiku for tool-heavy loops; opus only for hard reasoning. We'll use this at slide 61 when we dispatch parallel sub-agents."
- Then: Advance.
- Lab dive: `labs/lab07.md` — preview cue at slide #35 ("model routing is half of multi-agent design"); open `workshop/speaker-scripts/module-03-multi-agent.md#demo-b-the-budget-triangle-3-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-03-multi-agent.md#demo-b-the-budget-triangle-3-min`

### Slide 57 — → Lab 07: Multi-Agent Orchestration `[lab-cue]`
- Target time: 09:20 (~60s — full cue read, post-break)
- Say this: "Welcome back from the break. M3 starts here. Open `labs/lab07.md` — parallel sub-agent dispatch via the `task` tool, with model routing per agent. This is the M3 advanced outcome."
- Then: Pause 60s. Advance into Agent Management.
- Lab dive: `labs/lab07.md` — cue at slide #57 ("parallel sub-agent dispatch via the task tool"); open `workshop/speaker-scripts/module-03-multi-agent.md#2-demo-script` alongside.
- Backing detail: `workshop/speaker-scripts/module-03-multi-agent.md#2-demo-script`

### Slide 58 — GitHub CopilotAgent Management
- Target time: 09:21 (~30s)
- Say this: "Section divider. Sessions, sequential, parallel — three management patterns."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-03-multi-agent.md#1-open-with-the-advanced-problem`

### Slide 59 — Single vs Multiple Sessions
- Target time: 09:22 (~120s)
- Say this: "Most problems do not need multiple sessions. Multi-session is for when state has to live longer than one window of context — that's the test."
- Then: Advance.
- Lab dive: `labs/lab07.md` — cue at slide #59 ("the test for multi-session"); open `workshop/speaker-scripts/module-03-multi-agent.md#demo-a-four-shapes-on-disk-60-seconds-each-4-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-03-multi-agent.md#demo-a-four-shapes-on-disk-60-seconds-each-4-min`

### Slide 60 — Sequential Orchestration
- Target time: 09:24 (~120s)
- Say this: "Sequential is the easy mode: one agent finishes, hands off, next agent starts. Plan → implement → QA. No concurrency bugs."
- Then: Demo lab07's sequential shape, then advance.
- Lab dive: `labs/lab07.md` — cue at slide #60 ("plan → implement → QA, no concurrency bugs"); same backing detail as slide 59.
- Backing detail: `workshop/speaker-scripts/module-03-multi-agent.md#demo-a-four-shapes-on-disk-60-seconds-each-4-min`

### Slide 61 — Parallel Orchestration
- Target time: 09:26 (~180s — flagship M3 demo)
- Say this: "Parallel via the `task` tool. Each sub-agent is stateless — you must pass complete context every time. This is the M3 flagship pattern, and lab07 is built around it."
- Then: Run the live `task`-tool dispatch from `module-03-multi-agent.md` Demo C. Then advance into M6.
- Lab dive: `labs/lab07.md` — cue at slide #61 ("each sub-agent is stateless"); open `workshop/speaker-scripts/module-03-multi-agent.md#demo-b-the-budget-triangle-3-min` for the model-routing budget triangle.
- Backing detail: `workshop/speaker-scripts/module-03-multi-agent.md#demo-b-the-budget-triangle-3-min`

---

## Module banner — M4 — GitHub Agentic Workflows (gh-aw) (09:45–10:10)

Read, author, and debug gh-aw workflows on the registry-pinned schema for PRD generation and code review. Anchor labs: lab08, lab09.

### Slide 46 — → Lab 08 + Lab 09: gh-aw workflows `[lab-cue]`
- Target time: 09:45 (~60s — full cue read)
- Say this: "Two anchor labs back-to-back. lab08 is the PRD-generation agent — branch-event triggered. lab09 is the code-review agent — PR triggered. Open both."
- Then: Pause 60s. Advance into Coding Agent.
- Lab dive: `labs/lab08.md` (PRD-gen workflow) **and** `labs/lab09.md` (code-review workflow) — cue at slide #46 ("PRD-generation and code-review"); open `workshop/speaker-scripts/module-04-gh-aw.md#demo-b-the-three-patterns-on-disk-5-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#2-demo-script`

### Slide 47 — GitHub CopilotCoding Agent
- Target time: 09:46 (~30s)
- Say this: "Section divider. The cloud Coding Agent runs in GitHub Actions — same agent surface, different operator."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#1-open-with-the-advanced-problem`

### Slide 48 — What is the Coding Agent?
- Target time: 09:47 (~75s)
- Say this: "Cloud-runner Copilot. You assign issues to it; it opens PRs. The CLI is the human's loop; the Coding Agent is the unattended loop. Same brain."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#1-open-with-the-advanced-problem`

### Slide 49 — Copilot in GitHub Actions
- Target time: 09:48 (~120s)
- Say this: "gh-aw is how you orchestrate the Coding Agent inside Actions. `.md` source, `.lock.yml` compiled — the lock file is what runs."
- Then: Advance.
- Lab dive: `labs/lab08.md` — cue at slide #49 ("md source, lock.yml compiled"); open `workshop/speaker-scripts/module-04-gh-aw.md#demo-a-md--lockyml-side-by-side-3-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#demo-a-md--lockyml-side-by-side-3-min`

### Slide 50 — Agent Mode vs Coding Agent vs Workspace
- Target time: 09:50 (~90s)
- Say this: "Three agent surfaces, one decision: who's pressing 'go'? Agent mode is editor-driven, Coding Agent is event-driven, Workspace is task-driven. Pick by operator, not by feature."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#1-open-with-the-advanced-problem`

### Slide 51 — Custom Agents for the Coding Agent
- Target time: 09:52 (~90s)
- Say this: "Cloud-side custom agents are the Coding Agent's profile. Different from the CLI custom agents in slide 31 — same idea, different runtime."
- Then: Advance.
- Lab dive: —
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#demo-b-the-three-patterns-on-disk-5-min`

### Slide 52 — COPILOT.md Instructions File
- Target time: 09:53 (~75s)
- Say this: "COPILOT.md is the cloud-agent's AGENTS.md. Repo-scoped guidance the Coding Agent reads on every run. Same authoring discipline as lab02."
- Then: Advance.
- Lab dive: `labs/lab02.md` — secondary dive at slide #52 ("same authoring discipline as lab02"); open `workshop/speaker-scripts/module-01-extensibility-architecture.md#agentsmd--copilot-instructionsmd` alongside (lab02 lives in M1).
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#demo-b-the-three-patterns-on-disk-5-min`

### Slide 53 — Copilot Code Review
- Target time: 09:55 (~120s)
- Say this: "lab09 builds this exact workflow: a gh-aw `.md` that reviews every PR, posts inline comments, files an issue if it finds a regression."
- Then: Open `labs/lab09.md` README in a side pane and walk the `.md` source.
- Lab dive: `labs/lab09.md` — cue at slide #53 ("a gh-aw md that reviews every PR"); open `workshop/speaker-scripts/module-04-gh-aw.md#demo-b-the-three-patterns-on-disk-5-min` alongside (Pattern 3).
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#demo-b-the-three-patterns-on-disk-5-min`

### Slide 54 — Copilot PR Summaries
- Target time: 09:57 (~60s)
- Say this: "Auto-generated PR summaries. Useful, but the trust boundary is `safe-outputs` — slide 14. Don't let the agent post unbounded markdown."
- Then: Advance.
- Lab dive: `labs/lab09.md` — cue at slide #54 ("the trust boundary is safe-outputs"); open `workshop/speaker-scripts/module-04-gh-aw.md#demo-c-the-safe-outputs-trust-boundary-5-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#demo-c-the-safe-outputs-trust-boundary-5-min`

### Slide 55 — Copilot Autofix
- Target time: 09:58 (~60s)
- Say this: "Code-scanning + autofix. The agent proposes the fix; the human merges. This is where lab09's review workflow gets its teeth."
- Then: Advance.
- Lab dive: `labs/lab09.md` — cue at slide #55 ("where the review workflow gets its teeth"); same backing detail as slide 53.
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#demo-b-the-three-patterns-on-disk-5-min`

### Slide 56 — Agent Architecture
- Target time: 09:59 (~120s)
- Say this: "Coding Agent runtime topology — runner, broker, model. Optional read; lab08 doesn't require it but it's useful when you debug a stuck workflow."
- Then: Advance into the break.
- Lab dive: `labs/lab08.md` — optional dive at slide #56 ("useful when you debug a stuck workflow"); open `workshop/speaker-scripts/module-04-gh-aw.md#2-demo-script` if attendees ask why a workflow won't fire.
- Backing detail: `workshop/speaker-scripts/module-04-gh-aw.md#2-demo-script`

---

## Module banner — M5 — Enterprise plugin marketplace (10:20–10:40)

Package agents/skills/prompts/hooks as a plugin, publish to an internal marketplace, reason about versioning and blast radius. Anchor lab: lab11.

### Slide 20 — Plugins Overview
- Target time: 08:16 (~60s — pre-break foreshadow; full M5 dive at 10:20)
- Say this: "Quick foreshadow. Plugins package config — agents, skills, prompts, hooks — into one installable artifact. Full M5 deep-dive after the second break at slide 24's cue."
- Then: Advance.
- Lab dive: `labs/lab11.md` — preview cue at slide #20 ("plugins package config"); open `workshop/speaker-scripts/module-05-marketplace.md#demo-a-plugin-anatomy-on-disk-3-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-05-marketplace.md#demo-a-plugin-anatomy-on-disk-3-min`

### Slide 21 — Plugin Structure
- Target time: 08:17 (~60s — pre-break foreshadow)
- Say this: "Plugin manifest, file layout, install paths. Don't memorize now — lab11 walks the layout."
- Then: Advance.
- Lab dive: `labs/lab11.md` — preview cue at slide #21 ("lab11 walks the layout"); same backing detail as slide 20.
- Backing detail: `workshop/speaker-scripts/module-05-marketplace.md#demo-a-plugin-anatomy-on-disk-3-min`

### Slide 24 — → Lab 11: Plugin Marketplace `[lab-cue]`
- Target time: 08:21 (~45s — cue, dive at 10:20 post-break)
- Say this: "M5 anchor cue. Open `labs/lab11.md` now — package + publish team config; org-scoped install; CODEOWNERS as the review gate. We do the live demo at 10:20."
- Then: Advance. Resist the demo.
- Lab dive: `labs/lab11.md` — cue at slide #24 ("package + publish; org-scoped install; CODEOWNERS as review gate"); open `workshop/speaker-scripts/module-05-marketplace.md#2-demo-script` alongside (full demo battery for the 10:20 dive).
- Backing detail: `workshop/speaker-scripts/module-05-marketplace.md#2-demo-script`

---

## Module banner — M5b — GitHub Copilot Extensions (gh-ext) (subset of 10:20–10:40)

gh-ext surface vs CLI plugins; org-scoped install and discovery. Anchor lab: lab-gh-extensions.

### Slide 22 — GitHub Copilot Extensions
- Target time: 08:18 (~75s)
- Say this: "Different from CLI plugins. Extensions are the gh-ext surface — installable from the marketplace, scoped to GitHub itself, distributed as `gh` CLI extensions."
- Then: Advance.
- Lab dive: `labs/lab-gh-extensions.md` — cue at slide #22 ("scoped to GitHub itself, distributed as gh CLI extensions"); open `workshop/speaker-scripts/module-05b-gh-extensions.md#demo-a-install-the-gh-clab-extension-3-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-05b-gh-extensions.md#demo-a-install-the-gh-clab-extension-3-min`

### Slide 42 — Copilot Extensions
- Target time: 08:48 (~30s — second pass, off-spine)
- Say this: "Same surface as slide 22, viewed from MCP-adjacent context. Mention only — full M5b lives in lab-gh-extensions."
- Then: Advance.
- Lab dive: `labs/lab-gh-extensions.md` — secondary cue at slide #42 ("full M5b lives in lab-gh-extensions"); open `workshop/speaker-scripts/module-05b-gh-extensions.md#demo-b-three-mode-fallback-walkthrough-5-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-05b-gh-extensions.md#demo-b-three-mode-fallback-walkthrough-5-min`

---

## Module banner — M5c — CLI Extensions (cli-ext) (subset of 10:20–10:40)

CLI-side extension surface; packaging team config beyond plugins. Anchor lab: lab-copilot-cli-extensions.

### Slide 23 — Copilot CLI Extensions
- Target time: 08:19 (~75s)
- Say this: "M5c — the synergy slot. CLI extensions register with `extensions_manage` and compose with hooks: deterministic hook × probabilistic extension. lab-copilot-cli-extensions walks both."
- Then: Advance into the Lab 11 cue.
- Lab dive: `labs/lab-copilot-cli-extensions.md` — cue at slide #23 ("deterministic hook × probabilistic extension"); open `workshop/speaker-scripts/module-05c-copilot-cli-extensions.md#demo-b-deterministic-hook--probabilistic-extension-synergy-4-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-05c-copilot-cli-extensions.md#demo-b-deterministic-hook--probabilistic-extension-synergy-4-min`

---

## Module banner — M6 — A2A / ACP + tmux orchestrator meta-loop (flagship) (10:40–11:05)

Stand up the tmux orchestrator (plan→implement→handoff→clear→qa) and run Copilot CLI as an ACP server. Anchor labs: lab13, lab14.

### Slide 62 — A2A & the tmux Meta-Loop
- Target time: 10:40 (~300s — flagship demo)
- Say this: "This is the flagship. `copilot --acp` makes Copilot CLI an ACP server. The tmux orchestrator runs plan→implement→handoff→clear→qa as a meta-loop. Lab 13 stands it up. Lab 14 is the compatibility matrix — read it verbatim before you scale this past one repo."
- Then: Run Demo D from `module-06-a2a-tmux.md` — one full cycle live (~5 min).
- Lab dive: `labs/lab13.md` (ACP handshake) **and** `labs/lab14.md` (tmux meta-loop + compatibility matrix) — cue at slide #62 ("read the compatibility matrix verbatim"); open `workshop/speaker-scripts/module-06-a2a-tmux.md#demo-d-one-full-cycle-live-5-min` and `#demo-e-the-lab-14-compatibility-matrix-read-verbatim-3-min`.
- Backing detail: `workshop/speaker-scripts/module-06-a2a-tmux.md#demo-d-one-full-cycle-live-5-min`

### Slide 63 — Workflows & Handoff Documents
- Target time: 10:46 (~180s)
- Say this: "Handoff documents are how you keep state between phases without re-paying the context tax. `.orchestrator/session.md` is the canonical example — every phase reads its predecessor's handoff."
- Then: Show the actual `.orchestrator/session.md` from this repo. Advance into the closing.
- Lab dive: `labs/lab13.md` and `labs/lab14.md` — cue at slide #63 ("every phase reads its predecessor's handoff"); open `workshop/speaker-scripts/module-06-a2a-tmux.md#demo-c-the-three-scripts-that-make-it-a-loop-4-min` alongside.
- Backing detail: `workshop/speaker-scripts/module-06-a2a-tmux.md#demo-c-the-three-scripts-that-make-it-a-loop-4-min`

---

## Module banner — Q&A and wrap (11:05–11:20)

Open Q&A, references, and pointers to follow-on labs and registry sources of truth.

### Slide 64 — Thank You!
- Target time: 11:05 (~90s, then open Q&A)
- Say this: "That's the workshop. JohnHenry Hain and Bob O'Keefe — find us in the chat. Three follow-on directions: Karpathy memory in lab10, the security/blast-radius hardening pass in lab-hardening, and the Lab 14 compatibility matrix as your A2A scaling guide."
- Then: Open Q&A. Use any remaining time on contingency slides 33–36 / 42–45 only if asked.
- Lab dive: `labs/lab-hardening.md` — closing dive at slide #64 ("the security/blast-radius hardening pass"); also reinforce `labs/lab10.md` (Karpathy memory) as the homework follow-on. Backing scripts: open `workshop/speaker-scripts/module-05-marketplace.md#4-expected-pitfalls` for blast-radius reasoning and `workshop/speaker-scripts/module-01-extensibility-architecture.md#a-custom-agent` for the memory-pattern context.
- Backing detail: `workshop/speaker-scripts/module-05-marketplace.md#4-expected-pitfalls`

---

## Anchor-lab coverage check (self-audit)

Every anchor lab from `.orchestrator/slide-mapping.md` appears in at least one `Lab dive` line above:

- **lab01** → slide 9
- **lab02** → slides 29, 52
- **lab03** → slide 31
- **lab04** → slides 27, 28, 30
- **lab05** → slides 37, 39, 40
- **lab06** → slides 16, 17, 18, 19
- **lab07** → slides 32, 35, 57, 59, 60, 61
- **lab08** → slides 46, 49, 56
- **lab09** → slides 46, 53, 54, 55
- **lab10** → slide 31 (optional second dive), slide 64 (homework)
- **lab11** → slides 20, 21, 24
- **lab12** → slides 37, 41
- **lab13** → slides 62, 63
- **lab14** → slides 62, 63
- **lab-gh-extensions** → slides 22, 42
- **lab-copilot-cli-extensions** → slide 23
- **lab-hardening** → slide 64

All 5 `data-section="lab-cue"` slides (9, 24, 37, 46, 57) carry non-empty `Lab dive` lines.
