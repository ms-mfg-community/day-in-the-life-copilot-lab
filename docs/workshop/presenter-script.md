# Presenter Script — GitHub Copilot Hackathon Workshop

This is the read-aloud script for the single-day, four-hour GitHub Copilot Hackathon workshop. The deck has 60 slides; every slide gets one section here, in deck order, keyed by slide number and title. Each section contains three subsections: **What you say** is near-verbatim narration sized for the slide; **Slide cues** lists what is on screen so you can point at the right thing; **Transition** is a one- or two-line bridge into the next slide.

Read this document straight through. You should not need to open the deck's speaker-notes panel, the lab files, or any other reference while presenting — everything you need to deliver the workshop is in this script. Labs are not interleaved with the talk; the second half of the workshop is a single consolidated lab block where attendees run Lab 01 through Lab 14 in numeric order. When a slide's content carries an inline `🧪 Workshop anchor — Lab NN` note-bar, this script flags the matching lab once with a brief "we will do this hands-on at the end in Lab NN" — there are no other lab cues in the talk.

The audience is practicing developers, solution architects, and engineers, so the tone is peer-to-peer and technical. The agenda widget on the deck is driven by `agenda.json`; the timezone selector lets attendees match the schedule to their clock without reloading. Total runtime is 240 minutes including the presentation block, two breaks, and the lab block.

## Slide 1 — Title

### What you say

Hey everyone, welcome. I'm JohnHenry Hain, Senior Cloud Solution Architect at Microsoft, and I'm joined by Bob O'Keefe — also a Senior CSA. We're here to run a hands-on GitHub Copilot Hackathon with you today.

Before we jump in, let me set expectations for how this session works. We have four hours total. The first chunk is a presentation block — we'll walk through the Copilot product surface end to end: what's available, how the pieces fit together, and where the agentic capabilities actually live. We'll cover the CLI, agentic workflows, extensibility, MCP servers, and a bunch of the newer features you may or may not have gotten your hands on yet. We move fast, but the goal is to give you the mental model so that when you sit down to do the labs, you know what you're building toward.

The second chunk is a consolidated lab block. You'll work through the labs in order on your own machine. We'll be walking around, answering questions, debugging with you — the usual hackathon format. The labs are designed to be self-paced, so if you're faster, push ahead. If you hit a wall, flag us down.

A couple of ground rules. This isn't a marketing pitch. You all ship code for a living — we're going to talk about what actually works, where the rough edges are, and how to get the most out of this tooling in real workflows. If something doesn't apply to your stack, say so — we'd rather have a conversation than a lecture.

We're also assuming you've got a GitHub account with Copilot access and a working dev environment. If you're still getting set up, start that now in the background — the setup instructions are in the repo README. You want everything ready to go by the time we hit the lab block.

One more thing: the slide deck is a single-page web app. You can follow along on your own screen if you want — the URL is in the repo. But honestly, for the presentation block, just listen and save your laptop battery for the labs.

Alright, let's get moving.

### Slide cues
- 🤖 emoji and main title: "GitHub Copilot Hackathon"
- Presenter names: JohnHenry Hain and Bob O'Keefe — Sr. Cloud Solution Architects, Microsoft

### Transition
Let's look at how the day breaks down — here's the agenda.


## Slide 2 — Agenda

### What you say

So here's the shape of the day. This is a single-day, four-hour workshop — two hundred and forty minutes, total. We split it into two major blocks.

The first block is what we're doing right now: the presentation sessions. These are short, focused segments covering the full Copilot surface area. We'll start with an overview of the product family — what Copilot actually includes today, which features land in which IDEs, how the plan tiers break down. Then we'll shift into the CLI, which is where a huge chunk of the agentic capability lives. After that, we'll cover extensibility — custom instructions, agents, skills, prompts, hooks, MCP servers. Then we'll hit agentic workflows, the coding agent, and how all of this connects to your CI/CD pipeline.

The second block is the hands-on lab time. You'll run through the labs in sequence on your own machine. The labs map directly to the topics we cover in the presentation — so by the time you're doing Lab 3, you'll already have the context from the slides. We're not going to stop between each topic and do a lab. That context-switching kills momentum. Instead, you absorb the concepts first, then apply them all at once.

There are two short breaks built into the schedule — the deck has a timezone-aware agenda widget that renders the exact times from agenda.json. Use the timezone dropdown on the next slide to see the times in your local zone. If you're in Central Time, the default is already set for you.

The tagline on screen says it well: Learn, Practice, Ship. That's the arc. The presentation block is "learn." The lab block is "practice." And by the end, you'll have a working setup with custom agents, MCP servers, and agentic workflows configured in a real repo — that's the "ship" part. You walk out with something you can actually use tomorrow.

If at any point during the presentation you have a question, just raise your hand. We'd rather address it in context than have you sit on it for an hour. But if it's a deep "how do I configure X for my specific environment" question, we'll park it for the lab block where we can pair on it.

Let's look at the actual schedule with times.

### Slide cues
- 📅 emoji and section title: "Agenda"
- Tagline: "Single-Day Workshop · 4 Hours · Learn · Practice · Ship"

### Transition
Here's the detailed schedule with session times — adjust the timezone dropdown if you need to.


## Slide 3 — Schedule

### What you say

Alright, this is the actual schedule view. The agenda renders dynamically from agenda.json, so what you see on screen should reflect the real session times. If the timezone isn't right for you, there's a dropdown at the top — it supports Eastern, Central, Mountain, Pacific, Alaska, and Hawaii. Central is selected by default.

I won't read every line item to you — you can see it on screen. But let me call out the structure. The presentation block comes first. We'll move through the Copilot overview, the CLI deep-dive, extensibility, agentic workflows, and the coding agent. Each topic is a focused segment — we're not going to spend forty-five minutes on any one thing. The goal is to give you enough depth to understand the "why" and the "how," then let the labs cement it.

After the presentation block, there's a break, and then we move into the consolidated lab block. The labs are numbered and sequential. You start with Lab 1 and work forward. Some labs build on prior ones, so don't skip around unless you're confident you know what you're doing. Each lab has clear instructions in the repo — they're markdown files with step-by-step walkthroughs.

There's also a break built into the lab block itself. We'll call it out when we get there, but feel free to stretch your legs whenever you need to — you're self-pacing at that point anyway.

One thing to note: the schedule is designed to fit in four hours total. That means the presentation block is tight. We're going to keep moving. If we get behind, we'll trim the narration rather than cut labs — the hands-on time is the most valuable part of the day.

If you're following along on your own device, the deck loads the agenda from the same JSON file, so you'll see the same schedule. If you want to customize the times for your own team later — say you're running this internally — just edit agenda.json. You don't need to touch the HTML at all. That's the whole point of the separation.

Let me also flag: the schedule will call out which labs map to which presentation topics. So when we cover the CLI in the slides, you'll know that Labs 1 and 2 are where you get hands-on with it. Same pattern for every section. That mapping is intentional — it keeps the day coherent.

Alright, enough logistics. Let's get into the actual content.

### Slide cues
- Title: "Hackathon Schedule"
- Timezone dropdown bar with options: Eastern, Central (selected), Mountain, Pacific, Alaska, Hawaii
- Agenda tabs and day content rendered dynamically from agenda.json

### Transition
Let's start with the big picture — what is GitHub Copilot as a product family today?


## Slide 4 — Copilot Overview

### What you say

This is the section header for Module 1: GitHub Copilot Overview. Before we drill into any single feature, I want to make sure we're all working from the same mental model of what Copilot actually is in mid-2026.

When most people hear "GitHub Copilot," they think autocomplete in their editor. Tab to accept, move on. And that's where it started — but that's a small fraction of what the product does today. Copilot is now a family of AI-powered development tools that spans the entire software development lifecycle.

Let me lay out the surface area. You've got code completion — the original feature, inline suggestions as you type. That still works, it's still useful, and it's gotten significantly better with model upgrades. But on top of that, you've got Copilot Chat — a conversational interface embedded in your IDE where you can ask questions about your codebase, generate code, explain code, write tests. Chat is available in VS Code, JetBrains, Visual Studio, Xcode, Eclipse, and on GitHub.com itself.

Then there's the CLI — a full agentic platform running in your terminal. We'll spend a good chunk of time on this because it's where a lot of the most powerful capabilities live. Agent mode, MCP server integration, multi-agent orchestration, autonomous workflows — all of that runs through the CLI.

Beyond that, you've got the Copilot Coding Agent — a cloud-hosted agent that can be assigned GitHub issues and autonomously writes code, opens PRs, and iterates on review feedback. It runs on the gh-aw platform, which is GitHub's agentic workflow infrastructure built on top of Actions.

And then there's the extensibility layer: custom instructions, custom agents, skills, prompt files, hooks, and MCP servers. This is where Copilot stops being a generic tool and starts being tuned to your codebase, your team's conventions, and your specific workflows.

The tagline on screen captures it: "AI-powered development — from code completion to autonomous agents." That's the arc we're going to walk through today. We'll start broad with the feature matrix, narrow into the CLI and extensibility, and end with the agentic workflow platform.

The next few slides are scope-setting. We're going to move fast through the overview — the deep dives come later in each dedicated section.

### Slide cues
- 🧭 emoji and section title: "GitHub Copilot Overview"
- Tagline: "AI-powered development — from code completion to autonomous agents"

### Transition
Let's start with the feature matrix — which capabilities land in which IDEs and platforms.


## Slide 5 — Feature Matrix

### What you say

This is the Copilot feature matrix. It shows you which features are available in which IDEs and platforms. Take a second to scan it — there's a lot here, and the pattern matters.

The columns are: VS Code, CLI, JetBrains, Visual Studio, Neovim, Xcode, Eclipse, and GitHub.com. The rows are the features. Green check means GA — generally available. Blue circle means preview. Dash means not applicable. Empty circle means not supported.

A few things jump out. VS Code is the most feature-complete surface. It gets updates first, it supports everything from code completion to agent mode to MCP to vision to prompt files to the coding agent. If you're working in VS Code, you have access to the full platform. The CLI is a close second — it supports code completion, model picker, agent mode, MCP, skills, extensions, code review, custom instructions, prompt files, PR summaries, and the coding agent via delegate. Where it shows dashes — things like edit mode, next edit suggestions, vision — those are inherently visual IDE features that don't apply in a terminal context.

JetBrains and Visual Studio are strong — they've got agent mode, MCP, code review, and most of the core features at GA. Eclipse added agent mode, chat, and MCP in May 2025, so it's catching up. Xcode has chat, agent mode, MCP, and code review. Neovim is the outlier — it officially supports code completion only.

On the far right, GitHub.com has its own set of features: Copilot Chat, the coding agent, issues and discussions summarization, PR summaries, Copilot Spaces, and text completions. Issues and Discussions — where Copilot summarizes threads and drafts responses — is GitHub.com only.

Check the note bar at the bottom: this matrix changes frequently. The source of truth is docs.github.com/copilot/reference/copilot-feature-matrix. Bookmark that. Also worth noting: GitHub Mobile includes Copilot Chat, which isn't in this grid.

The key takeaway is that Copilot isn't one thing — it's a platform with different capability sets depending on where you're using it. Today we'll focus primarily on VS Code and the CLI, because that's where the deepest feature set lives and where the labs are built.

One more thing: skills are currently supported in VS Code, CLI, and GitHub.com only. If your team is on JetBrains, that's a gap to be aware of. Extensions have broader support — VS Code, CLI, JetBrains, Visual Studio, and GitHub.com.

### Slide cues
- Title: "Copilot Feature Matrix"
- Subtitle: "Feature support across IDEs and platforms"
- Table columns: Feature, VS Code, CLI, JetBrains, VS, Neovim, Xcode, Eclipse, GitHub.com
- 19 feature rows including: Code completion, Copilot Chat, Model picker, Agent mode, MCP, Skills, Extensions, Code review, Custom instructions, Next edit suggestions, Edit mode, Vision, Prompt files, Code referencing, PR summaries, Text completions, Copilot Spaces, Copilot Coding Agent, Issues & Discussions
- Legend: ✅ = GA, 🔵 = Preview, — = Not applicable, ⚪ = Not supported
- Note bar: VS Code receives updates first; check docs.github.com for current matrix; GitHub Mobile includes Copilot Chat

### Transition
Now let's look at the plan tiers — what you get at each pricing level.


## Slide 6 — Plan Tiers

### What you say

Here's the plan breakdown. Four tiers: Free, Pro, Business, and Enterprise. Let me walk through each one because the boundaries matter for what your team can actually use.

Free. This launched in December 2024 and it's available to every GitHub account — no credit card required. You get two thousand code completions per month and fifty chat messages per month. It works in VS Code and JetBrains. The models available are GPT-4o and Claude 3.5 Sonnet. That's a real, usable tier. If you're evaluating Copilot, or you're running a hackathon, or you just want to try it on a side project — Free gets you there. The limits are per-month and they reset, so for light usage it's perfectly fine.

Pro. Ten dollars a month. This is where the limits come off. Unlimited code completions. You get the full model picker — every model GitHub makes available, you can switch between them. Agent mode and MCP are unlocked. All supported IDEs, not just VS Code and JetBrains. For an individual developer who's using Copilot daily, Pro is the tier that makes sense. The jump from Free to Pro is significant in terms of capability.

Business. Nineteen dollars per user per month. Everything in Pro, plus the controls that IT and platform teams care about. Policy controls — you can restrict which models are available, enforce content exclusions, manage which features are turned on or off. Audit logs for compliance. And Knowledge Bases — the ability to index internal documentation and feed it into Copilot's context. If you're rolling Copilot out to a team or an org, Business is where you get the governance layer.

Enterprise. Thirty-nine dollars per user per month. Everything in Business, plus custom fine-tuning, which is now GA. Multi-repo context, meaning Copilot can pull context from across your organization's repositories, not just the one you have open. The Copilot Coding Agent is GA at this tier. And advanced security controls. Enterprise is for organizations that need the deepest integration and the most control.

One thing to flag: if you're on GitHub Enterprise Server — GHES — the feature availability timeline is separate. Not everything that's GA on github.com is immediately available on GHES. Check the Enterprise Server docs if that's your environment.

The note bar on screen also calls out that the Free tier is great for hackathons and exploration — which is exactly what we're doing today. If anyone here is on the Free tier, you'll be able to do most of the labs. Some features that require Pro or above will be noted in the lab instructions.

### Slide cues
- Title: "GitHub Copilot Plans"
- Subtitle: "From free to enterprise — a tier for every developer"
- Four cards: Free (🆓), Pro (⚡), Business (🏢), Enterprise (🔒)
- Free: 2,000 completions/mo, 50 chat messages/mo, VS Code & JetBrains, GPT-4o & Claude 3.5 Sonnet
- Pro: $10/mo, unlimited completions, all models, agent mode & MCP, all IDEs
- Business: $19/user/mo, everything in Pro, policy & model controls, audit logs, Knowledge Bases
- Enterprise: $39/user/mo, everything in Business, custom fine-tuning (GA), Coding Agent (GA), multi-repo context, advanced security controls
- Note bar: Free tier needs no credit card; GHES has a separate feature timeline

### Transition
Now that you know what Copilot offers and at what tier, let's look at where all the customization files actually live.


## Slide 7 — Extensibility Map

### What you say

This is one of the most important slides in the whole deck, because it answers the question: where do I put things? When you want to customize Copilot — add instructions, create agents, define skills, wire up MCP servers — there are specific file paths and naming conventions. This slide lays out the entire extensibility surface in two columns.

On the left: repository level. Everything under `.github/` in your repo. This is team-shared, version-controlled configuration. Let me walk the tree. At the top, `copilot-instructions.md` — this is your repo-wide instruction file. It's always loaded into Copilot's context when you're working in that repo. Think of it as a system prompt for your codebase. Below that, `agents/` with `*.agent.md` files — these are custom agents scoped to this repo. `prompts/` with `*.prompt.md` — reusable prompt templates your team shares. `instructions/` with `*.instructions.md` — these are path-specific instructions tied to glob patterns. So you can say "when editing files matching `**/*.test.*`, load these testing conventions." That's powerful for enforcing standards without nagging people in pull reviews.

Then `skills/` with `*/SKILL.md` — project-specific skills that bundle instructions with scripts. `workflows/` for agentic workflows — the `.md` and `.lock.yml` files that define gh-aw configurations. And `hooks/` with shell or JavaScript files that fire on pre and post tool-call events. At the root level, you can also have `AGENTS.md` or `CLAUDE.md` which serve as top-level instruction files.

On the right: user level. Everything under `~/.copilot/` on your machine. Same structure — `copilot-instructions.md` for your personal global instructions, agents, prompts, skills, hooks. Plus `mcp-config.json` for your MCP server configuration. The note at the bottom mentions `~/.claude/` follows the same structure for Claude Code users.

The key distinction: repo-level files are shared with your team and version-controlled. User-level files are personal, local-only, and available across all repos. If there's a naming conflict — say both levels define an agent with the same name — repo-level wins.

This matters because it means you can have team conventions enforced at the repo level, while each developer carries their own personal preferences, agents, and MCP connections at the user level. Both layers compose together at runtime.

We'll get into each of these file types in detail later, and you'll create several of them in the labs. For now, just orient yourself to the two-column layout: `.github/` for the team, `~/.copilot/` for you.

### Slide cues
- Title: "Copilot Extensibility Map"
- Subtitle: "Where customization files live and what they do"
- Two-column layout: Repository Level (.github/) on left, User Level (~/) on right
- Repo level tree: copilot-instructions.md, agents/*.agent.md, prompts/*.prompt.md, instructions/*.instructions.md, skills/*/SKILL.md, workflows/*.md & *.lock.yml, hooks/*.sh & *.js, AGENTS.md / CLAUDE.md
- Repo level tags: ✅ Version controlled · ✅ Shared with team · ✅ Works on GitHub.com
- User level tree: ~/.copilot/ with copilot-instructions.md, agents/*.agent.md, prompts/*.prompt.md, skills/*/SKILL.md, mcp-config.json, hooks/*.sh & *.js; also ~/.claude/ for Claude Code
- User level tags: 🔒 Local only · 👤 Personal preferences · 🌐 Available in all repos
- Note bar: Repo-level wins over user-level on naming conflicts

### Transition
Before we go deeper into Copilot, let's address a question I get a lot: how does Copilot relate to Azure AI Foundry?


## Slide 8 — Copilot vs Foundry

### What you say

This slide addresses what is probably the most common confusion I see with enterprise customers: GitHub Copilot versus Azure AI Foundry. Are they competitors? Do I pick one? The answer is no — they sit at different layers of the stack. The deciding question is on screen: who is the end user?

Left column: GitHub Copilot. The end user is a developer. If the agent you're building helps you write software — coding agents, CI/CD automation, code generation, refactoring, testing, internal engineering tools, dev automation workflows — that's Copilot's lane. It lives in VS Code, GitHub, and the CLI. It's optimized for fast iteration loops, it's integrated into the software development lifecycle, and it requires minimal infrastructure setup. You don't need to provision anything in Azure to use Copilot.

Right column: Azure AI Foundry. The end user is a business user or a customer. If the agent you're building delivers business value to someone who isn't a developer — customer-facing AI apps, enterprise copilots for HR or finance or ops, multi-agent systems, RAG over enterprise data, cross-system workflow automation — that's Foundry. It gives you full orchestration, multi-agent coordination, data connectors with grounding and memory, governance and compliance controls, VNet isolation, and the ability to bring your own model and scale globally.

The middle column is the important one: use both. The rule is simple. Copilot builds the system. Foundry runs the system. The architecture pattern they show here is a two-layer stack: Copilot is the build layer — generate code, build APIs, write prompts, set up infrastructure. Foundry is the run layer — orchestration, tool calling, observability, governance. You deploy from one to the other.

The CTO mental model on the slide puts it cleanly: Copilot accelerates engineers. Foundry creates products. Those are different value propositions solving different problems.

Most real-world enterprise projects use both. You use Copilot to build the application faster — the code, the tests, the infrastructure. Then you deploy that application into Foundry for production orchestration, monitoring, and governance. They're complementary.

The note bar at the bottom reinforces this: Copilot is your development accelerator; Foundry is your production AI platform. If you take one thing from this slide, it's the question: who is the end user? Developer equals Copilot. Business user or customer equals Foundry. Both? Use both.

### Slide cues
- Title: "GitHub Copilot vs Azure AI Foundry"
- Subtitle: "They are not competitors — ask: who is the end user?"
- Three-column layout: GitHub Copilot (👩‍💻), Use Both (🔗), Azure AI Foundry (🏭)
- Copilot end user: Developer. Use cases: coding agents, CI/CD & infra automation, code gen/refactoring/testing, internal engineering tools, dev automation workflows. Wins: lives in VS Code/GitHub/CLI, fast iteration loop, integrated into SDLC, minimal infra setup
- Foundry end user: Business User / Customer. Use cases: customer-facing AI apps, enterprise copilots, multi-agent systems, RAG over enterprise data, cross-system workflow automation. Wins: full orchestration + multi-agent, data connectors/grounding/memory, governance/compliance/VNet isolation, bring your own model
- Use Both: Copilot = build layer, Foundry = run layer. CTO mental model: Copilot accelerates engineers, Foundry creates products
- Note bar: They sit at different layers. Most real-world projects use both.

### Transition
Alright, let's shift gears. We're leaving the IDE and moving into the terminal — let's talk about the GitHub Copilot CLI.


## Slide 9 — GitHub Copilot CLI

### What you say

This is the section header for the CLI deep-dive. We're shifting context now — everything from here forward is terminal-first. If you're someone who lives in the terminal, this is going to feel natural. If you're primarily an IDE user, pay attention, because the CLI unlocks capabilities that don't exist in the editor.

The tagline on screen says it: "The full agentic platform in your terminal." That's not hyperbole. The GitHub Copilot CLI isn't a chat wrapper. It's a full agent runtime with tool use, sub-agent orchestration, MCP server integration, session management, and the ability to run headless in CI/CD pipelines. It can read and write files, execute shell commands, call external tools through MCP, delegate work to the cloud coding agent, and coordinate multiple agents in parallel.

On screen you'll see a list of reference links. Let me call out the ones worth bookmarking. First, the GitHub Blog post on CLI General Availability — that covers the launch and the core capabilities. Second, the Agentic Workflows blog post, which explains the gh-aw platform and how it connects to the CLI. Third, the "Idea to PR" guide, which walks through a real workflow from initial prompt to merged pull request using the CLI. And fourth, the official CLI documentation — that's your reference for commands, flags, configuration, and the full feature set.

The fifth link is the feature matrix we just looked at — it includes CLI-specific columns so you can see exactly what's supported.

For this workshop, the CLI is the primary surface we'll be working with in the labs. When you get to the lab block, Labs 1 and 2 are CLI-focused. You'll install it, configure it, run your first agentic session, set up MCP servers, and see how the extensibility files we just discussed — instructions, agents, skills, hooks — all get loaded by the CLI at startup.

If you haven't installed the CLI yet, the command is `gh extension install github/gh-copilot` for the base extension, but for the full agentic CLI it's a standalone install. The lab instructions have the exact steps. Don't worry about installing it now — we'll get to that.

One thing to orient you: when I say "the CLI," I'm talking about the GitHub Copilot CLI specifically — `gh copilot` — not the `gh` CLI itself, though the Copilot CLI is distributed as a `gh` extension. The distinction matters because the Copilot CLI has its own configuration directory at `~/.copilot/`, its own session management, and its own set of slash commands.

### Slide cues
- ⌨️ emoji and section title: "GitHub Copilot CLI"
- Tagline: "The full agentic platform in your terminal"
- Reference link rows: GitHub Blog: CLI General Availability, GitHub Blog: Agentic Workflows, GitHub Blog: Idea to PR Guide, Official CLI Documentation, Feature Matrix & More

### Transition
So why the terminal? What does the CLI give you that the IDE doesn't? Let's look at the feature set.


## Slide 10 — Why CLI

### What you say

This slide is a feature grid showing you what makes the CLI a distinct platform, not just a secondary interface. Let me walk through the highlights.

`/fleet` — parallel multi-agent orchestration. This lets you spin up multiple sub-agents that run concurrently. You give each one a task, they execute in parallel, and results come back to your main session. This is the CLI's answer to "I need to do five things at once." In an IDE, you're working sequentially. In the CLI, you can fan out.

`/delegate` — async handoff to the cloud coding agent. When you're in a CLI session and you hit a task that's going to take a while — a large refactor, a complex feature implementation — you can delegate it to the cloud agent. It runs on gh-aw, opens a PR when it's done, and you continue with your local work. The handoff is seamless.

`--yolo` — fully autonomous autopilot mode. This turns off all confirmation prompts. The agent executes tool calls — file edits, shell commands, everything — without asking for approval. Use it when you trust the task scope and you want the agent to just go. Obviously, use it on a branch, not on main.

`/research` — multi-step deep research with citations. This isn't just "search the web." The agent formulates a research plan, executes multiple search and retrieval steps, synthesizes findings, and provides cited sources. It's useful for understanding unfamiliar codebases, evaluating library choices, or preparing technical design documents.

`--continue` — session persistence and resume. Your CLI sessions are saved. You can close your terminal, come back the next day, and pick up exactly where you left off with `--continue`. The full conversation history, context, and state are preserved.

`/compact` — compress session history. When your session context gets long, `/compact` summarizes earlier turns to free up context window space without losing the important information. It's garbage collection for your conversation.

`-p "task"` — scriptable headless mode. This is the one that makes the CLI a CI/CD tool. You can invoke the CLI non-interactively with a prompt string, and it runs to completion and exits. Pipe it into your build scripts, your GitHub Actions, your automation pipelines. The agent runs, does the work, and returns output you can capture.

The remaining items: per-subagent model selection lets you pick different models for different agents — use a fast model for routine tasks, a more capable model for complex reasoning. CLAUDE.md and GEMINI.md support means the CLI reads those instruction files alongside Copilot's own format. And custom LSP integration lets you wire up language servers for richer code intelligence.

The note on screen puts it well: the CLI isn't just a chat window — it's a full agentic platform.

### Slide cues
- Title: "Why GitHub Copilot CLI?"
- Subtitle: "A full agentic platform in your terminal"
- Feature grid with 10 items: /fleet (parallel multi-agent orchestration), /delegate (async handoff to cloud coding agent), --yolo (fully autonomous autopilot mode), /research (multi-step deep research with citations), --continue (session persistence & resume), /compact (compress session history), -p "task" (scriptable headless mode for CI/CD), models (per-subagent model selection), CLAUDE.md (CLAUDE.md / GEMINI.md support), LSP (custom LSP integration)

### Transition
Those are the features — now let's look at the adoption numbers that back up why this matters.


## Slide 11 — Stats

### What you say

Let's ground the CLI discussion with some data. There are four stats on screen, and they tell a story about where development is heading.

First: sixty-nine percent of developers keep a terminal always open. That's not "sometimes use a terminal" — that's always open, part of the daily workflow. If you're in this room, you're probably in that sixty-nine percent. The terminal isn't going away; it's the cockpit for most professional developers.

Second: seventy percent or more use the terminal as their primary daily tool. This reinforces the first stat but goes further — it's not just open, it's primary. More than the IDE, more than the browser, more than Slack. The terminal is where the work happens. This is why building a full agentic platform in the terminal makes sense — you're meeting developers where they already are.

Third: twenty to forty percent productivity improvement with terminal-first AI. This is the range reported across studies and early adopters. It's a wide range because it depends on the task, the developer's experience, and how well the tooling is configured. But even at the low end, twenty percent is significant. That's roughly one day per week. The improvements come from reduced context-switching — you're not bouncing between the terminal, the IDE, a browser, and a chat window. Everything converges in one place.

Fourth, and this is the one that gets attention in planning conversations: seventy-five percent reduction in PR completion time. The specific numbers on the slide are 9.6 days down to 2.4 days. That's not a marginal improvement — it's a structural change in how fast code moves from "work in progress" to "merged." The combination of agent-assisted coding, automated PR creation, and streamlined review cycles compresses the timeline dramatically.

The callout note below the stats makes an important observation: every major AI lab shipped a CLI-first agent in 2025. Anthropic shipped Claude Code. OpenAI shipped Codex CLI. Google shipped Gemini CLI. GitHub shipped the Copilot CLI. This wasn't a coincidence — the industry converged on the terminal as the right interface for agentic AI development tools. The terminal gives you file system access, shell execution, process control, and composability with existing Unix tooling. It's the natural home for agents that need to do real work.

The blue TL;DR bar at the bottom repeats the headline: the CLI isn't just a chat window — it's a full agentic platform. That framing is important because it sets expectations for what we'll do in the labs. You're not going to be chatting with a bot. You're going to be running an agent that reads your code, modifies files, executes commands, and ships work.

### Slide cues
- Title: "More Devs Choosing the CLI"
- Subtitle: "The terminal-first revolution"
- Four stat cards: 69% (developers keep a terminal always open), 70%+ (use terminal as primary daily tool), 20-40% (productivity improvement with terminal-first AI), 75% (reduction in PR completion time — 9.6 → 2.4 days)
- Note bar: 🚀 Every major AI lab shipped a CLI-first agent in 2025
- Blue note bar: TL;DR: The CLI isn't just a chat window — it's a full agentic platform.

### Transition
So the CLI runs locally on your machine. But what about cloud-side agentic execution? That's the gh-aw platform.


## Slide 12 — gh-aw Platform

### What you say

This slide puts the two agentic execution modes side by side: the CLI agent on the left, the gh-aw platform on the right. They're complementary — not competing — and understanding the boundary between them is key to using Copilot effectively.

Left side: `gh copilot` CLI. This is the interactive terminal agent. It runs locally on your machine. You're in the loop — you see what it's doing, you approve tool calls (unless you're in yolo mode), you guide the conversation. It's real-time, synchronous, and immediate. You can use `/fleet` to spin up parallel sub-agents, and you can use `/delegate` to hand off a task to the cloud when you want to go async.

Right side: `gh-aw` — GitHub Agentic Workflows. This is the server-side orchestration layer. It runs in GitHub Actions infrastructure, in the cloud. It's event-triggered — a new issue, a PR comment, a scheduled cron, a manual dispatch. It's async, fire-and-forget. You kick off a workflow and it runs autonomously. This is what powers the Copilot Coding Agent — when you assign an issue to Copilot and it opens a PR, that's gh-aw running behind the scenes.

The connection between them is `/delegate`. When you're in a CLI session and you delegate a task, you're handing it off from the local agent to the gh-aw cloud platform. The work continues without you. When it's done, you get a PR. That bridge — from interactive to autonomous — is what makes the two modes a single workflow rather than two separate tools.

The gh-aw platform has a notable capability that's worth calling out: multi-engine support. It can compile the same workflow definition for multiple AI engines — `copilot` for the GitHub Copilot CLI engine, `claude` for Claude Code, `codex` for OpenAI's Codex CLI, and `opencode` as well. The underlying AI differs, but the workflow structure, the Safe Outputs security model, and the MCP tool access are identical across engines. That's important for organizations that want engine flexibility without rewriting their automation.

The note bar at the bottom has the install command: `gh extension install github/gh-aw`. It previously lived under `githubnext/gh-aw` but moved to the main GitHub org in February 2026. If you have an older install, you'll want to update the source.

A few recent additions worth mentioning: domain blocklist via network.blocked frontmatter, MemoryOps for shared memory across workflow runs, a skip-if-check-failing pre-activation gate, and new safe outputs like create-discussion and remove-labels. We'll cover the Safe Outputs architecture in more detail on the next slide.

For now, the mental model is: CLI for interactive, gh-aw for autonomous. `/delegate` bridges them. And both use the same extensibility files — instructions, agents, MCP servers — so your configuration carries across both execution modes.

### Slide cues
- Title: "CLI Agent vs gh-aw Platform"
- Subtitle: "Two complementary agentic execution modes"
- Two-column comparison with arrow badge between them
- Left card (⌨️ gh copilot CLI): Interactive terminal agent, runs locally, real-time/in-the-loop, /fleet for parallel sub-agents, /delegate hands off to cloud
- Right card (☁️ gh-aw Platform): GitHub Actions-hosted agent runner, event-triggered/runs in cloud, async — fire and forget, powers the Coding Agent, server-side orchestration layer, supports copilot/claude/codex/opencode engines
- Note bar: /delegate bridges CLI to gh-aw; Install: gh extension install github/gh-aw (moved from githubnext/gh-aw in Feb 2026)

### Transition
Next, let's look at how gh-aw keeps things secure with its Safe Outputs architecture.
## Slide 13 — gh-aw Safe Outputs

### What you say

So we just walked through what gh-aw workflows look like. Now let's talk about why you can actually trust them in production — and that comes down to the Safe Outputs architecture. This is a four-layer security model, and honestly it's one of the more elegant things about the design.

Here's the core idea: the AI agent runs with `contents: read` permission only. It literally cannot create issues, open PRs, or post comments directly. That's layer one — read-only by default. The agent doesn't get write credentials. Period.

Layer two: instead of writing to GitHub directly, the agent emits structured actions into an NDJSON file. That's newline-delimited JSON — one action per line. The agent calls MCP tools, and those tools write to this output file. So you have a clean, parseable record of every write the agent wants to perform.

Layer three: after the agent job finishes, separate execution jobs pick up that NDJSON file. These jobs have write permissions. They parse each line, validate it, and execute the actual GitHub operations — creating an issue, posting a comment, opening a pull request.

And layer four — this is the prompt injection story. Because the AI reasoning and the write operations are fully separated processes, a prompt injection attack — even a successful one — cannot trigger unauthorized writes. The AI never holds write credentials. Even if someone slips malicious instructions into an issue body or a PR description that the agent reads, the worst that happens is the agent writes bad NDJSON entries, which the execution jobs can validate and reject.

On screen you'll see the Safe Output Types: `create-issue`, `add-comment`, `create-pull-request`, `create-discussion`, `remove-labels`, and `append-only-comments`. Those are your primitives. Pull requests can also carry an `expires` field, so they auto-close if nobody merges them — that's a nice hygiene detail. And the whole chain sits behind a DIFC proxy for a full audit trail.

The "Why It Matters" box sums it up: it's safe for production use, the write operations are auditable, PRs auto-close with expiration dates, and you get Data Integrity and Flow Control through the proxy layer. This isn't an experimental feature — this is the architecture that makes autonomous workflows viable in environments where you care about governance.

### Slide cues

- Four icon rows on the left: "AI Agent — Read Only" (`contents: read`), "NDJSON Output File" (one JSON object per line), "Separate Execution Jobs" (with write permissions), "Prompt Injection Protection" (AI reasoning and writes fully separated)
- Blue card "Safe Output Types" with pills: `create-issue`, `add-comment`, `create-pull-request`, `create-discussion`, `remove-labels`, `append-only-comments`
- Accent card "Why It Matters": Safe for production use, Auditable write operations, PRs auto-close with `expires`, DIFC proxy for full audit trail

### Transition

That's the security model for autonomous writes. Now let's shift gears — we're going to move from what the CLI does to how you customize and extend it.

## Slide 14 — Customizing CLI

### What you say

Alright, we're moving into a new section. Up to now we've been talking about what the CLI can do out of the box — agentic mode, tool calling, gh-aw workflows, Safe Outputs. From here we're going to look at how you make it yours.

There are three main customization surfaces we're going to cover: hooks, plugins, and custom agents. Each one operates at a different layer of the stack, and they compose together — which is the whole point. You don't pick one; you use all three where they make sense.

Hooks give you deterministic, non-AI control. These are shell scripts that fire at specific lifecycle events — before a tool call, after a tool call, when the agent stops. They run outside the AI loop entirely. If you need a hard guardrail that the model can't talk its way around, hooks are your mechanism.

Plugins are the packaging and distribution layer. Think of a plugin as an npm package for AI capabilities — it bundles agents, skills, hooks, MCP server configs, and slash commands into a single installable unit. When your team standardizes on a set of conventions and tools, plugins are how you ship that to everyone.

Custom agents and extensions round it out. These are the GitHub-side extensions like gh-aw and marketplace apps, and the local-side CLI extensions you author with the scaffold-inspect-reload loop. Between all three layers you can customize basically every aspect of how the agent behaves.

What's important to understand is the layering. Hooks are imperative — they're your policy enforcement point. Skills and instructions shape what the AI knows and how it reasons. Plugins package all of that up for distribution. And extensions add entirely new tools and capabilities. We're going to walk through each of these in the next several slides, and you'll get hands-on with all of them in the labs at the end of the workshop.

The key takeaway for this section: Copilot CLI is not a closed box. It's designed to be customized, and the customization surfaces are file-based, version-controllable, and composable. Let's start with hooks.

### Slide cues

- Section divider slide with 🎨 icon
- Title: "Customizing GitHub Copilot CLI"
- Tagline: "Hooks, Plugins, and Custom Agents"

### Transition

Let's start with the most foundational customization primitive — hooks. These are your deterministic control surface.

## Slide 15 — Hooks Overview

### What you say

Hooks are the only mechanism in the Copilot CLI that gives you deterministic, non-AI-mediated control over the agent. That distinction matters. Skills, instructions, custom agents — all of those operate inside the AI loop. They influence how the model reasons, but the model can still choose to ignore them or interpret them creatively. Hooks are different. They're imperative code — shell scripts — that execute at agent lifecycle events, and they run completely outside the AI.

Let's break down what's on screen. First: hooks are custom shell scripts that execute at agent lifecycle events. This is real code, not AI-mediated. You write a bash script or a Python script, you tell the CLI when to run it, and it runs. No model interpretation, no prompt engineering, no hoping the LLM follows your instruction.

Second: hooks run outside the AI loop. This is the key differentiator. Unlike skills and agents, which are prompts the model processes, hooks are code that the CLI runtime executes directly. The AI doesn't see them, doesn't interpret them, doesn't get a vote.

Third: deterministic control. If you need something to always happen — not usually happen, not happen when the model feels like it — hooks are your answer. They're the policy enforcement point.

Fourth — and this is the most powerful pattern — you can gate MCP tool calls. The `preToolUse` hook fires before any tool call dispatches. That means you can intercept calls to `context7`, `memory`, `microsoft-learn`, or any other MCP server and validate them before they fire. Want to block certain query patterns? Redact sensitive data from requests? Enforce rate limits? That's `preToolUse`.

Notice the callout at the bottom: hooks also fire during subagent execution and can be bundled inside plugins. So when you dispatch a task to a sub-agent, your hooks still apply. There's no escape hatch.

We'll get hands-on with this in Lab 06 at the end, where you'll author hooks that gate `preToolUse` on the workshop MCP set — `context7`, `memory`, `sequential-thinking`, `workiq`, `microsoft-learn`, and `fabric`. You'll see exactly how these intercept and validate tool calls in practice.

The reference links on screen point to the hooks configuration reference, the CLI hooks guide, and the official tutorial if you want to go deeper after the workshop.

### Slide cues

- Icon rows: "Custom Shell Scripts" (execute at agent lifecycle events), "Runs Outside the AI Loop" (imperative code, not AI-mediated), "Deterministic Control" (non-AI-mediated control), "Gate MCP Tool Calls" (`preToolUse` intercepts calls to `context7`, `memory`, `microsoft-learn`, `fabric`)
- Card: "Hooks fire during subagent execution and can be bundled inside plugins."
- Link rows: Hooks Configuration Reference, Using Hooks with CLI, Official Hooks Tutorial
- Note bar: 🧪 Workshop anchor — Lab 06

### Transition

Now that you know what hooks are, let's look at when exactly they fire. The lifecycle ordering matters.

## Slide 16 — Hooks Lifecycle

### What you say

This slide shows you the five lifecycle events where hooks can fire, in the order they execute. The visual on screen is a vertical timeline — follow it top to bottom.

First up is `PreToolUse`. This fires before any tool call. When the agent decides to call `bash`, `edit`, `grep`, or any MCP tool, `PreToolUse` fires first. Your hook gets the tool name and the arguments the agent wants to pass. You return an exit code: zero means allow, non-zero means block. If you return non-zero, that tool call never executes. The agent gets told "that was blocked" and has to figure out a different approach. This is your primary gatekeeping point.

Next is `PostToolUse`. This fires after a tool finishes executing. You get the tool name, the arguments that were used, and the result. This is where you run validators — did the file edit introduce a syntax error? Did the bash command touch something it shouldn't have? You can log, you can alert, you can even modify what the agent sees as the result. Post-tool hooks are great for auto-formatting: the agent edits a file, your PostToolUse hook runs Prettier or `dotnet format`, and the agent never has to think about code style.

Third is `Notification`. This fires when the agent emits a notification — status updates, progress messages, that kind of thing. This is where you wire up Slack alerts or desktop notifications. The agent says "I finished the refactor," your hook sends that to your team channel.

Fourth is `Stop`. This fires once when the agent stops or completes its task. Use it for cleanup, final audit log entries, summary generation, or committing work. If you want to auto-commit everything the agent did at the end of a session, `Stop` is your hook.

Fifth is `SubagentStop`. This fires when a subagent finishes — not the main agent, but a task or explore agent that was dispatched. If you're running parallel sub-agents and need to aggregate results or validate outputs, `SubagentStop` is your event.

The critical rule is at the bottom: exit code zero means allow, non-zero means block. This is a hard contract. Your hooks are the circuit breaker. We'll map each of these lifecycle events to actual scripts in Lab 06 at the end of the workshop.

### Slide cues

- Vertical timeline with five colored dots and boxes: `PreToolUse` (before any tool call), `PostToolUse` (after tool execution), `Notification` (on agent notifications), `Stop` (when agent stops/completes), `SubagentStop` (when subagent finishes)
- Note bar: "Hooks return exit codes: `0` = allow, `non-0` = block the action"
- Note bar: 🧪 Workshop anchor — Lab 06: map each lifecycle event to a script in `~/.copilot/hooks/`

### Transition

That's the lifecycle. Now let's look at what you actually build with it — starting with the most common use cases.

## Slide 17 — Hooks Use Cases 1

### What you say

Alright, let's get practical. This slide shows four hook patterns you'll actually use in production. These aren't theoretical — they're the patterns teams adopt first.

First card: Security Guardrails. This is the `PreToolUse` hook doing what it does best. You write a script that inspects every bash command the agent wants to run and blocks dangerous ones — `rm -rf`, `DROP TABLE`, access to sensitive filesystem paths like `/etc/shadow` or your secrets directory. You can also validate MCP tool inputs before they fire. If the agent tries to pass user credentials to an external service, your hook catches it and blocks it. This is probably the single most important hook pattern, and it's why we start with it.

Second card: Audit Logging. Every tool call, every file edit, every terminal command the agent executes — you log it. Your `PostToolUse` hook appends a structured JSON entry to an audit trail. In regulated environments, this isn't optional. Even outside compliance, having a complete record of what the agent did during a session is invaluable for debugging. When someone asks "why did the agent change this file?" you can point to the log.

Third card: Auto-Format and Lint. This is one of those patterns that sounds simple but saves enormous friction. You wire a `PostToolUse` hook that runs your formatter after every file edit. The agent writes some C# code, your hook runs `dotnet format`. The agent edits a TypeScript file, your hook runs Prettier. The code is always correctly formatted, and you never have to put "please format your code" in a prompt. Deterministic beats probabilistic every time.

Fourth card: Notifications. This is the `Notification` and `Stop` hooks working together. The agent finishes a task or hits an error? Send a Slack message, fire a Teams webhook, pop a desktop notification. This matters when you're running long agent sessions in the background — you kick off a complex refactor, switch to other work, and get pinged when it's done or when something goes wrong.

In Lab 06 at the end you'll implement the security-guardrail and audit-logging patterns as real shell hooks, wired up against the workshop MCP servers. You'll see how they compose without adding latency to the agent loop.

### Slide cues

- Four cards in 2×2 grid: 🔒 "Security Guardrails" (block `rm -rf`, `DROP TABLE`, sensitive paths; validate tool inputs), 📊 "Audit Logging" (log every tool call, file edit, terminal command), ✅ "Auto-Format & Lint" (run formatters after every file edit), 🔔 "Notifications" (Slack/Teams/desktop alerts on completion or error)
- Note bar: 🧪 Workshop anchor — Lab 06: wire a security-guardrail hook that blocks risky shell + redacts secrets before `microsoft-learn` / `context7` calls

### Transition

Those are the foundational patterns. The next slide has four more that push hooks further.

## Slide 18 — Hooks Use Cases 2

### What you say

Part two — these patterns are a step up in sophistication. They're about using hooks to build a tighter feedback loop around the agent's work.

First: Auto-Test on Edit. This is a `PostToolUse` hook that detects file modifications and immediately runs the relevant tests. Not all the tests — just the ones that cover the code that changed. The agent edits a repository class, your hook runs the unit tests for that class right then. The key insight here is timing: you catch regressions immediately, on the edit that introduced them, not twenty edits later when the agent is done and you run the full suite. By that point, the agent may have built a chain of changes on top of broken code. Auto-test breaks that cycle.

Second: Changelog Generation. Your `PostToolUse` hook watches for file edits and auto-appends entries to a changelog. The agent refactors a service class, the hook logs "refactored StudentService to use repository pattern" with a timestamp. You build documentation automatically as the agent works. This is especially useful in long sessions where the agent makes dozens of changes — at the end you have a structured record, not just a git diff.

Third: Auto-Commit. This is a `Stop` or `PostToolUse` hook that creates git commits at checkpoints. The agent finishes a logical unit of work, your hook commits it with a descriptive message. Why does this matter? Rollback. If the agent goes off the rails on step seven of a twelve-step refactor, you can roll back to the commit after step six instead of starting over. This is essential for long sessions. Think of it as savepoints in a database transaction — you wouldn't run a complex migration without them.

Fourth: Rate Limiting. This is the safety net for runaway behavior. Your `PreToolUse` hook counts tool calls and blocks the agent if it exceeds a threshold — say, fifty bash commands per minute or two hundred total operations per session. Without this, a confused agent can burn through API quotas, generate hundreds of files, or loop endlessly on a failing test. Rate limiting is the circuit breaker that prevents a bad session from becoming an expensive one.

These auto-test and auto-commit patterns get real exercise in Lab 06, running against the ContosoUniversity .NET project that ships with the workshop. You'll see them working on actual C# code with actual test suites.

### Slide cues

- Four cards in 2×2 grid: 🧪 "Auto-Test on Edit" (run relevant tests after each file modification, catch regressions immediately), 📝 "Changelog Generation" (auto-append changes to a changelog as agent works), 💾 "Auto-Commit" (git commits at checkpoints, enable rollback to stable states), 🚫 "Rate Limiting" (limit tool calls per minute or total operations per session)
- Note bar: 🧪 Workshop anchor — Lab 06: auto-test + auto-commit hooks demoed against the ContosoUniversity .NET project

### Transition

So hooks give you deterministic control. But how do you package hooks together with agents, skills, and MCP configs for distribution? That's plugins.

## Slide 19 — Plugins Overview

### What you say

Plugins are the distribution unit for everything we've been talking about. Hooks, agents, skills, MCP server configs, tools, slash commands — a plugin bundles all of those into a single installable package. Think of it as an npm package for AI capabilities.

Let me walk through the three key properties on screen. First: top-level packaging. A plugin is an installable bundle that can contain custom agents, skills, tools, and hooks. It's not just one thing — it's a coherent set of capabilities that belong together. Your team's code review agent, the skills it needs, the hooks that enforce your policies, the MCP server configs that give it access to your internal docs — all of that goes in one plugin.

Second: distributable. This is the npm analogy. You build a plugin, you publish it, other people install it. You can share within a team, across an org, or publicly through a marketplace. The point is reusability — you solve a problem once, package it, and everyone benefits.

Third: six extension types. On the right side of the screen you can see all six: Agents, Skills, Tools, Hooks, MCP Servers, and Slash Commands. That's the full surface area. A plugin doesn't have to include all six — most won't — but it can. The composability means you pick what you need.

Now, why does this matter beyond convenience? Standardization. When every developer on your team installs the same plugin, they get the same agents, the same guardrail hooks, the same skill definitions. You're not hoping everyone read the wiki and configured their setup correctly. The plugin is the contract.

And there's an enterprise angle here too. Org-scoped plugins mean your platform team can publish approved capabilities to an internal marketplace, and developers install them the same way they'd install any other package. You get governance without friction.

We'll do this hands-on in Lab 11 at the end of the workshop — you'll take the agents, skills, and hooks we've built throughout the day and package them into a single plugin, then walk the org-scoped enterprise marketplace publish path. That's where this really clicks.

### Slide cues

- Icon rows: "Top-Level Packaging" (installable bundle with agents, skills, tools, hooks), "Distributable" (npm package analogy — share and reuse), "6 Extension Types" (Agents, Skills, Tools, Hooks, MCP Servers, Slash Commands)
- Six mini-cards on right: 🤖 Agents, ⚡ Skills, 🔧 Tools, ⚡ Hooks, 🔌 MCP Servers, ⌨️ Slash Commands
- Note bar: 🧪 Workshop anchor — Lab 11

### Transition

Let's look at what's actually inside a plugin — the file structure and the manifest.

## Slide 20 — Plugin Structure

### What you say

Here's the anatomy of a plugin. On the left side of the screen you've got a file tree showing a typical plugin directory structure. Let's walk through it.

The root is your plugin directory — `my-plugin/` in this example. At the top level sits `plugin.json`. This is the manifest — it's the contract. It declares the plugin's name, version, what capabilities it provides, and what dependencies it has. If your plugin needs specific MCP servers available, that goes in `plugin.json`. If it requires certain hook blast-radius permissions, that's declared here too. Think of it like `package.json` for an npm package — it's what the runtime reads to understand what your plugin offers and what it needs.

Below that you have directories for each extension type. The `agents/` directory holds agent definitions — in this example, `reviewer.md`, which is a custom code review agent. The `skills/` directory has skill definitions organized in subdirectories, each with a `SKILL.md` file. The `hooks/` directory contains your shell scripts — `pre-tool.sh` in this example, which would be a `PreToolUse` hook. The `tools/` directory has custom tool implementations — `analyze.py` here. And `mcp/` holds MCP server code — `server.js`.

The key design principle on the right side: plugins are composable. Not every plugin needs all six extension types. If you're building a plugin that's just a set of guardrail hooks, you have `plugin.json` and a `hooks/` directory. That's it. If you're building a full-featured code review solution, you might have an agent, skills, hooks, and a custom MCP server. Mix and match.

And plugins are shareable. You can publish to registries or share via git. Teams standardize on the same plugin set — your senior engineer builds the plugin, publishes it, and everyone on the team installs it. No more "did you copy the hooks from the wiki?" conversations.

The important detail for the workshop: in Lab 11 you'll create a `plugin.json` that declares the workshop MCP servers — `context7`, `memory`, `sequential-thinking`, `workiq`, `microsoft-learn`, `fabric` — and explicitly scopes the hook blast-radius for org-scoped publication. The manifest is where you bound what your plugin can do, and that bounding is what makes it safe to distribute.

### Slide cues

- File tree on left: `my-plugin/` root containing `plugin.json`, `agents/reviewer.md`, `skills/deploy/SKILL.md`, `hooks/pre-tool.sh`, `tools/analyze.py`, `mcp/server.js`
- Three cards on right: 📄 "plugin.json" (manifest with name, version, capabilities, dependencies), 🔧 "Composable" (not every plugin needs all 6 types), 📤 "Shareable" (publish to registries or share via git)
- Note bar: 🧪 Workshop anchor — Lab 11: ship a plugin whose `plugin.json` declares the workshop MCP set + hook blast-radius scope

### Transition

Now let's zoom out and talk about the two sides of the extensibility story — GitHub-hosted extensions versus local CLI extensions.

## Slide 21 — GitHub Copilot Extensions

### What you say

This slide draws a line that's important to understand: there are two sides to Copilot extensibility. This slide covers the GitHub-hosted side. The next slide covers the local CLI side. They're complementary, not competing.

First card: gh-aw Agentic Workflows. We already covered this in detail — these are the markdown-defined agent workflows that run on GitHub Actions runners. The key point here in the extensibility context is that they're server-side. They run in GitHub's infrastructure, triggered by GitHub events, with GitHub identity and permissions. The triggers, jobs, and safe-output guardrails are all declared in YAML frontmatter. This is where your CI/CD-flavored agent automation lives.

Second card: GitHub-Hosted Skills. These are skills packaged as GitHub Apps that can be invoked from chat. The difference from the repo-level skills we'll talk about shortly is that discovery is centralized — they live in GitHub's ecosystem — and authentication flows through GitHub identity. You don't manage credentials; the platform handles it. This is the model for third-party skill providers who want to reach the entire GitHub user base.

Third card: Marketplace Publish. This is the distribution mechanism for GitHub-hosted extensions. You can publish org-scoped listings for internal use or public marketplace listings for everyone. The GitHub UI gives you versioning, audit trails, and rollback capabilities. For enterprise teams, org-scoped publication means you control exactly which extensions are available to your developers.

The important thing to internalize here is the execution boundary. Everything on this slide runs on GitHub's side — GitHub runners, GitHub identity, GitHub's marketplace infrastructure. The agent doesn't run on your laptop. The skills resolve through GitHub Apps. The publishing and governance happen in the GitHub UI.

Why does that matter? Security model. When you're deciding where to put automation, the question is: does this need access to my local filesystem, my local tools, my local context? If yes, that's a CLI extension — next slide. If it's triggered by GitHub events and operates on GitHub resources, it's a GitHub extension — this slide.

We'll wire gh-aw safe-output guardrails in Lab 09 and walk the org-scoped publish path in Lab 11 — both of those happen in the lab block at the end.

### Slide cues

- Three cards in a row: 🤖 "gh-aw Agentic Workflows" (markdown-defined, run on Actions runners, YAML frontmatter), 🧩 "GitHub-Hosted Skills" (skills as GitHub Apps, centralized discovery, GitHub identity auth), 🏪 "Marketplace Publish" (org-scoped or public, version/audit/rollback via GitHub UI)
- Subtitle: "GitHub-hosted extensibility — agentic workflows & marketplace"
- Note bar: 🧪 Workshop anchor — Lab 09 + Lab 11

### Transition

That's the GitHub-hosted side. Now let's look at what runs locally — CLI extensions that live in your repo and your editor.

## Slide 22 — Copilot CLI Extensions

### What you say

CLI extensions are the local-side counterpart to what we just saw. These run inside the Copilot CLI process on your machine, with access to your local filesystem, your local tools, and your full development context. That's the fundamental difference.

Let me walk through the three points on screen. First: two install paths. You can put extensions in `.github/extensions/` for project-scoped extensions — these travel with the repo, so every collaborator gets them. Or you can put them in your user extensions directory for personal tooling that follows you across all projects. Same authoring model either way; the only difference is scope.

Second: the authoring loop. This is designed to be tight. You run `extensions_manage` to scaffold a skeleton extension file. Then you inspect the manifest to verify it looks right. Then you run `extensions_reload` to hot-load from disk — and the new tool appears immediately in your session. No restart required. You scaffold, inspect, reload, invoke, iterate. The slide calls this out explicitly: "scaffold → inspect → reload." That's the loop.

Third: your extensions can reach the full workshop MCP server set. An extension you author can call `context7` for library docs, `memory` for knowledge graph persistence, `sequential-thinking` for structured reasoning, `workiq` for Microsoft 365 data, `microsoft-learn` for Azure documentation, and `fabric` for data operations. Your custom tools have the same MCP access as the built-in tools.

The card on the right reinforces the authoring loop. It's short by design — scaffold a skeleton, inspect the manifest, reload from disk, exercise the new tool. All without restarting the CLI session. The pills at the bottom — scaffold, inspect, reload, invoke — are the four steps you'll cycle through.

Now here's where it connects back to what we covered earlier: CLI extensions and hooks share the same blast-radius concerns. If you're publishing a plugin that contains CLI extensions and hooks, you need to bound what both can do. The `plugin.json` manifest declares those bounds, and that scoping is what makes it safe for org-scoped distribution.

We'll package a CLI extension into a plugin and bound its hook blast-radius in Lab 11 and Lab 06 at the end of the workshop.

### Slide cues

- Icon rows: 📂 "Two install paths" (`.github/extensions/` for project-scoped, user dir for personal), 🛠️ "Author loop" (`extensions_manage` scaffolds/inspects, `extensions_reload` hot-loads), 🔌 "Reach the workshop MCP set" (`context7`, `memory`, `sequential-thinking`, `workiq`, `microsoft-learn`, `fabric`)
- Card: "scaffold → inspect → reload" loop description with pills: scaffold, inspect, reload, invoke
- Note bar: 🧪 Workshop anchor — Lab 11 + Lab 06

### Transition

We've covered how to extend the CLI from the outside. Now let's go deeper into the customization that shapes how the agent thinks — skills and instructions.

## Slide 23 — Skills & Instructions

### What you say

Alright, new section. We've been talking about hooks, plugins, and extensions — those are the mechanisms for controlling and extending what the agent can do. Now we're going to talk about the layer that shapes how the agent thinks. This is the skills and instructions layer.

There are four levers in this space: skills, instructions, prompt files, and custom agents. These are all file-based, which means they live in your repo, they're version-controlled, and they're portable. That last point is important — the same skill file works in VS Code, in the Copilot CLI, and in the coding agent. Write once, use everywhere.

Let me frame why this section matters. The tools we covered earlier — hooks, extensions, plugins — those operate at the infrastructure level. They control what the agent is allowed to do, what tools it has access to, how its actions are packaged and distributed. Skills and instructions operate at the reasoning level. They control what the agent knows, what patterns it follows, what conventions it respects, and what workflows it can execute.

Think about it this way: hooks are your guardrails — they enforce policy deterministically. Skills and instructions are your expertise — they encode domain knowledge and team standards into the agent's context. You need both. Guardrails without expertise gives you a safe but dumb agent. Expertise without guardrails gives you a capable but unpredictable agent. The combination is what makes agentic development actually work in a team setting.

The four levers stack underneath every Copilot surface we've covered so far. Whether the agent is running in the CLI, in VS Code, or as a coding agent on a pull request — skills and instructions shape its behavior. They're the foundation layer.

Over the next slides we'll dig into the differences between skills and instructions, how to author them, and how they compose with everything else. This is where you go from "the agent can do things" to "the agent does things the way my team does them."

### Slide cues

- Section divider slide with ⚡ icon
- Title: "GitHub Copilot Skills & Instructions"
- Tagline: "Customize Copilot with skills, instructions, prompt files, and custom agents"

### Transition

So skills and instructions are both customization levers — but they work differently. Let's compare them side by side.

## Slide 24 — Skills vs Instructions

### What you say

This is the slide you'll probably come back to after the workshop, because the distinction between skills and custom instructions trips people up at first. They feel similar — they're both ways to customize Copilot's behavior — but they serve different purposes and have different characteristics. Let's walk through the comparison table.

Purpose. Skills teach specialized capabilities and workflows. "Here's how to deploy to our staging environment." "Here's how to run our integration test suite." "Here's our TDD workflow." Instructions define coding standards and guidelines. "Always use immutable patterns." "Follow our naming conventions." "Include error handling in every public method." Skills are about what to do; instructions are about how to do it.

Portability. Skills work across VS Code, Copilot CLI, and the coding agent. They follow the open standard at `agentskills.io`. Instructions are supported in IDEs and on GitHub.com. The portability difference matters — if you need something that works in every Copilot surface including headless coding agents, skills are your path.

Content. Skills can contain instructions, scripts, examples, and resources. They're rich packages. Instructions are instructions only — text that tells the model what conventions to follow. Skills are heavier; instructions are lighter.

Scope. This is the big behavioral difference. Skills are task-specific and loaded on-demand. The agent invokes a skill when it needs that capability — it's not always in context. Instructions are always applied, or applied via glob patterns to specific file types. If you put something in `.github/copilot-instructions.md`, it's in every conversation. If you scope an instruction with a glob pattern like `**/*.cs`, it applies whenever C# files are in context. Skills are pulled in; instructions are pushed in.

Standard. Skills follow the open `agentskills.io` standard. Instructions are IDE-specific in format, though the concepts are consistent across tools.

So the practical decision framework is: if it's a workflow or capability the agent should use sometimes, make it a skill. If it's a standard or convention the agent should always follow, make it an instruction. Your TDD workflow is a skill. Your "never use `var` in C#" rule is an instruction. Your deployment runbook is a skill. Your commit message format is an instruction.

We'll apply this decision framework in the labs — Lab 02 for instructions and Lab 04 for skills.

### Slide cues

- Two-column comparison with "VS" badge in center
- Left card (⚡ Agent Skills): table with rows — Purpose: "Teach specialized capabilities & workflows", Portability: "VS Code, Copilot CLI, & coding agent", Content: "Instructions, scripts, examples & resources", Scope: "Task-specific, loaded on-demand", Standard: "Open standard (`agentskills.io`)"
- Right card (📋 Custom Instructions): table with rows — Purpose: "Define coding standards & guidelines", Portability: "Supported IDE's and GitHub.com only", Content: "Instructions only", Scope: "Always applied (or via glob patterns)", Standard: "IDE-specific"

### Transition

Now that you can tell skills and instructions apart, let's look at how you actually create a skill from scratch.
## Slide 25 — How to Create Skills

### What you say
Alright, so you know what skills are — let's talk about how you actually make one. The good news is there's no SDK, no build step, no packaging ritual. It's completely file-based. You create a directory, drop a `SKILL.md` file in it, and that's your entry point. That file is the minimum viable skill. The YAML frontmatter at the top — specifically the `name` and `description` fields — is what Copilot reads to decide whether your skill is relevant to a given prompt. If you mess up the frontmatter, the skill is invisible. It's the single most common failure mode I see with first-attempt skills.

Where do you put this directory? You've got two options. For personal skills that follow you across projects, store them in `~/.copilot/skills/`. There's also the legacy `~/.claude/skills/` path if you've been using that. For project-level skills that the whole team shares, you'd commit them to the repo in a conventional location.

Now look at the directory structure on screen. You've got your `SKILL.md` at the root of the skill directory — that's required. Everything else is optional but useful. You can add a `scripts/` folder with automation like validation scripts, an `examples/` folder with sample code that demonstrates the pattern you want the LLM to follow, and a `docs/` folder with reference material. These additional resources aren't loaded upfront — they're pulled in only when needed, which keeps the context window lean.

Think of a skill directory as a self-contained knowledge package. The `SKILL.md` is the instructions, the scripts are executable tools, and the examples are few-shot demonstrations. You're essentially building a teaching module for the LLM. The richer your skill directory, the more reliably the model will follow your intent — but you don't have to go all-in on day one. Start with just the `SKILL.md` and iterate.

We'll build one of these hands-on at the end in Lab 04. You'll author a real `SKILL.md` with proper frontmatter and watch the CLI discover it when you send a matching prompt.

### Slide cues
- Two-column layout: left side has three icon rows (Directory-Based, Personal Skills, Rich Resources); right side shows a file tree diagram of a sample skill directory
- File tree: `my-skill/` containing `SKILL.md`, `scripts/validate.sh`, `examples/sample.ts`, `docs/reference.md`
- Workshop anchor note bar at bottom referencing Lab 04

### Transition
That's how you create a skill — now let's look at how Copilot actually decides to use one, because there's a three-level loading process that's worth understanding.


## Slide 26 — How Copilot Uses Skills

### What you say
So you've got a skill sitting in a directory. How does Copilot decide whether to pull it in? It's not random, and you don't have to manually select it. There's a progressive three-level engagement model, and it's designed to be efficient with the context window.

Level one is skill discovery. When you send a prompt, Copilot reads the `name` and `description` fields from your YAML frontmatter. That's it — just the metadata. It's a lightweight check to see if the skill might be relevant. This is why that frontmatter matters so much. If your description is vague or missing, the skill never makes it past this gate. You want a description that's specific enough to match the right prompts but not so narrow it never triggers.

Level two is instructions loading. When your prompt matches the skill's description, Copilot loads the full body of the `SKILL.md` into context. Now the model has your detailed instructions — the patterns to follow, the rules to enforce, the conventions to respect. This is where the real value lives. Everything you write in the body of that markdown file becomes part of the model's working knowledge for that conversation.

Level three is resource access. This is where those extra files — scripts, examples, documentation — come into play. The model only pulls them in when it actually needs them. If the instructions in your `SKILL.md` reference a script or example, the model can access it. But it won't preload your entire docs folder just because it's there. This is maximum context efficiency — you get a rich skill with lots of supporting material, but the context window only pays for what's used.

The key insight here, the thing on the note bar at the bottom of the slide — skills are automatically activated based on your prompt. There's no manual selection step, no slash command to invoke them. You just ask a question, and if your skill's frontmatter matches, it loads. It's declarative, not imperative. That's what makes skills composable — you can have dozens of them and the right ones surface at the right time.

### Slide cues
- Three stacked tier blocks in a vertical progression: Level 1 (Skill Discovery), Level 2 (Instructions Loading), Level 3 (Resource Access)
- Each level has a color-coded label and icon (magnifying glass, book, folder)
- Note bar at bottom: "Skills are automatically activated based on your prompt — no manual selection needed"

### Transition
Skills are one of three customization mechanisms. Let's zoom out and see how they fit alongside custom instructions and prompt files.


## Slide 27 — Custom Instructions

### What you say
This slide is the big picture — three ways to customize Copilot's behavior, side by side. Think of these as three concentric rings of control, each with a different scope.

First up: custom instructions. These are your global preferences. You define them once, and they apply to every single conversation. Think coding style rules, naming conventions, your preferred error handling patterns, architecture guidelines. In the VS Code or CLI context, this is your `copilot-instructions.md` file. For the Copilot CLI, it's also the custom instructions block in your `AGENTS.md`. The point is — these fire on every interaction. You don't have to remember to invoke them. If you want Copilot to always use immutable patterns or always add null checks, this is where you encode that.

Second: prompt files. These are saved prompt instructions in markdown files with the `.prompt.md` extension. They're reusable and version-controlled — you commit them right alongside your code. Where custom instructions are "always on," prompt files are "on demand." You reference them when you need a specific workflow — generating a migration, scaffolding a test suite, writing release notes. They're like runbooks for the LLM.

Third: custom agents. These go further. An agent bundles specific instructions with specific tools and optionally a specific model. It's a purpose-built AI persona. You might have a code review agent, an architecture agent, a testing agent — each with different capabilities and constraints. We'll dig into agents in detail on the next couple of slides.

The mental model here is: instructions set the floor — the baseline behavior you always want. Prompt files are your reusable workflows for specific tasks. Agents are your specialized team members with their own tools and expertise. All three compose together. Your custom instructions apply inside an agent session. A prompt file can reference resources that a skill surfaces. It's layers, not silos.

We'll set up the instructions and agents for our ContosoUniversity repo hands-on at the end in Lab 02.

### Slide cues
- Three-card layout across the slide: Custom Instructions (gear icon, accent color), Prompt Files (document icon, blue), Custom Agents (robot icon, green)
- Each card has a short description of scope and behavior
- Workshop anchor note bar referencing Lab 02 and mentioning `AGENTS.md` + `.github/copilot-instructions.md`

### Transition
Let's drill into prompt files next — there are four design principles that make the difference between a prompt file that works and one that just adds noise.


## Slide 28 — Prompt Files

### What you say
Prompt files are where a lot of teams get the most immediate value, because they let you codify workflows that you'd otherwise type out every time. The slide lays out four key principles — let's walk through each one.

First: reference other files. A prompt file shouldn't try to contain everything. Instead, link to the files and resources the task should use as context. If you're writing a prompt file for generating API endpoints, reference your existing controller patterns, your route conventions, your DTO schemas. The model gets the context it needs without you copy-pasting boilerplate into the prompt file itself. This is also how prompt files stay stable — the referenced files evolve with the codebase, and the prompt file's instructions stay relevant.

Second: single, clear purpose. Each prompt file should do one thing well. Don't create a mega prompt file that handles test generation, code review, and documentation in one shot. You end up with something that's mediocre at all three. Instead, write `generate-tests.prompt.md`, `review-pr.prompt.md`, `write-docs.prompt.md`. Small, focused, composable. If you need a compound workflow, chain prompt files together rather than bloating a single one.

Third: describe both the what and the how. It's not enough to say "generate unit tests." You need to specify the approach: use xUnit, follow the Arrange-Act-Assert pattern, mock external dependencies with Moq, target 80% coverage. The what is the objective; the how is the implementation strategy. When you include both, the model's output is dramatically more consistent. Without the how, you're rolling the dice on which testing framework the model picks today.

Fourth: modular system. Your prompt files should connect to your broader workflow. They compose together — one prompt file can reference another's output, or they can all reference the same set of instructions. Think of them as building blocks in a pipeline, not isolated scripts. When you commit them to your repo, the whole team benefits from the same workflows with the same quality bar.

These four principles — reference files, single purpose, what plus how, modularity — they apply whether you're in VS Code, the CLI, or GitHub.com.

### Slide cues
- Single-column layout with four icon rows: paperclip (Reference Other Files), target (Single Clear Purpose), clipboard (Describe WHAT and HOW), chain link (Modular System)
- Each row has a short explanatory sentence
- No workshop anchor on this slide

### Transition
Prompt files define workflows. Custom agents take that further — they give the workflow its own tools, model, and identity. Let's look at how you build one.


## Slide 29 — Custom Agents

### What you say
Custom agents are where things get really interesting. You're not just giving the model instructions anymore — you're building a purpose-specific assistant with its own capabilities, its own model, and its own personality. Let's break down the four configuration axes on screen.

First: the description. This shows up as placeholder text in the chat input when someone selects your agent. It's not just cosmetic — it signals to the user what this agent is for. "Code review specialist focusing on security and performance" tells you exactly when to reach for it.

Second: tool configuration. You specify which tools or tool sets are available to the agent. A code review agent probably needs file reading and grep but doesn't need terminal access. A deployment agent needs shell execution but maybe shouldn't be browsing the web. This is your security boundary — you're scoping what the agent can do, not just what it knows.

Third: model selection. You can pin a specific model to each agent. This is a big deal for consistency. If you're dispatching sub-agents via the task tool, you want predictable behavior — so you pin `claude-opus-4.6` for quality-sensitive dispatches, or a faster model like Haiku for routine tool-heavy loops. The model choice becomes part of the agent's identity, not a per-conversation decision.

Fourth: markdown instructions. The instructions field supports full markdown with links. This is where you encode the agent's expertise — its domain knowledge, its decision-making rules, its output format expectations. Think of it as the system prompt, but richer and version-controlled.

Look at the right side of the slide — those pill tags show the kinds of agents people build: code review, architecture, testing, documentation, migration. Each one is a different combination of tools, model, and instructions tuned for a specific job. You're essentially building a team of specialists that your developers can summon on demand.

We'll author a real CLI custom agent hands-on at the end in Lab 03 — you'll set up the frontmatter, pin a model, configure a tool allowlist, and write the instructions.

### Slide cues
- Two-column layout: left has four icon rows (Description as Placeholder, Configure Tools, Select AI Model, Markdown Instructions); right has a centered card with a construction emoji, "Purpose-Built Experiences" heading, and pill tags for Code Review, Architecture, Testing, Documentation, Migration
- Workshop anchor note bar referencing Lab 03 and `.github/agents/` directory

### Transition
One agent is useful. Multiple agents working together — that's where you unlock real leverage. Let's look at multi-agent topology.


## Slide 30 — Multi-Agent Topology

### What you say
So far we've talked about building individual agents. This slide is about composing them — when should you delegate work to a sub-agent versus just doing it yourself?

On the left you can see the cast of agents we've set up for this workshop. There are two groups. The development roles — `dev`, `qa`, `pm`, `orchestrator`, `code-reviewer`, `planner`, `architect`, `tdd-guide`, `security-reviewer` — these handle the day-to-day engineering workflow. Then there are the Azure specialists — Stratus for infrastructure as code and Bicep, Nexus for Agent SDK and MCP, Prism for Fabric data architecture, Forge for Foundry, Sentinel for testing and quality, and Conductor who orchestrates the whole squad.

The key decision framework is the third row on the left: delegate versus do-it-yourself. The heuristic is straightforward. Delegate when the work decomposes into independent threads — for example, analyzing multiple services in parallel, or running research across different areas of a large codebase. Delegate when the task requires expert-domain knowledge that a specialized agent carries. But do it yourself for surgical edits and small lookups — a four-line code change doesn't need a sub-agent. The context stays in your conversation, and you avoid the overhead of spinning up a new agent context.

Now look at the card on the right — the pinned dispatch model. When we dispatch sub-agents via the `task` tool in this workshop, we pin `claude-opus-4.6`. That's our quality floor for delegated work. But for routine tool-heavy loops — running builds, grepping files, iterating through test results — you'd reach for a cheaper, faster model. And when the main agent hits a genuinely hard reasoning problem — architecture decisions, complex debugging — you'd escalate to a premium model. It's a tiered strategy: fast models for grunt work, balanced models for delegation, premium models for the hard stuff.

This isn't theoretical — you'll compose agents in Lab 03 where you author them, and again in Lab 14 where you orchestrate the dev-QA loop. The topology is practical, not academic.

### Slide cues
- Two-column layout: left has three icon rows listing workshop dev roles, Azure specialists (with codenames), and the delegate vs. DIY heuristic; right has an accent card explaining the pinned dispatch model with agent pill tags
- Workshop anchor note bar referencing Lab 03 and Lab 14

### Transition
Agents and skills live in your repo. But what about a persistent workspace that follows you across conversations? That's Copilot Spaces.


## Slide 31 — Copilot Spaces

### What you say
Copilot Spaces are a newer concept that solves a real pain point. How many times have you started a Copilot conversation and spent the first few messages just re-explaining your project? "Here's my repo, here's the architecture, here are the conventions I follow." Spaces eliminate that repetition.

A Space is a persistent, shareable AI workspace. You create one, attach your repositories and specific files as context, add custom instructions, and that context sticks around across conversations. Next time you open a conversation in that Space, Copilot already knows your project. No re-explaining, no pasting the same file references every time.

There are three key properties here. First: attach context. You select the repos, files, and instructions that define your workspace. This is the "teach Copilot about my project" step, but you only do it once. Second: persistent memory. The Space remembers your attached context across every conversation you have within it. Your third conversation has the same context as your first — it's cumulative, not ephemeral. Third: shareable. You can share a Space with teammates. Now your whole team has the same AI-assisted baseline. The new engineer who joined last week gets the same quality of Copilot responses as the senior who set up the Space, because the context — the repos, the conventions, the patterns — is already loaded.

Look at the card on the right side of the slide. Creating a Space is straightforward: select repos and files as context, add custom instructions, share with your team. It's available today in VS Code and on GitHub.com.

The mental model I'd give you is this: if custom instructions are your coding standards, and skills are your domain knowledge, then Spaces are your project workspace. They're the container that holds all of that context together and makes it persistent. For teams working on a complex codebase — especially when you've got junior engineers ramping up or cross-functional folks who need AI assistance but don't live in the code every day — Spaces are a force multiplier.

### Slide cues
- Two-column layout: left has three icon rows (Attach Context, Persistent Memory, Shareable); right has a centered card with galaxy emoji, "Create a Space" heading, three bullet steps, and a note bar showing availability in VS Code and GitHub.com
- No workshop anchor on this slide

### Transition
Let's shift gears from how you configure Copilot to how it works alongside you in the editor. Next Edit Suggestions might be the most underappreciated feature in the whole suite.


## Slide 32 — Next Edit Suggestions

### What you say
Next Edit Suggestions — NES — is one of those features that sounds simple but fundamentally changes your editing flow once you internalize it. Here's the concept: Copilot watches your edits, figures out what you're doing, and proactively suggests the next location in your code that needs the same or a similar change.

The classic example is renaming. You rename a variable on line 12. NES immediately highlights the next occurrence on line 47 and suggests the same rename. You press Tab to accept, and it jumps to the next one. You're flowing through a refactoring without ever opening find-and-replace, without ever doing a global search. It's the model understanding your intent — "this person is renaming userId to userID" — and propagating that intent through the file.

But it goes beyond simple renames. If you change a function signature, NES can suggest updates to the call sites. If you add a parameter to a constructor, it'll suggest adding it to the places that instantiate that class. It's watching the semantic pattern of your edit, not just doing string matching. That's the key difference between NES and find-and-replace — NES understands what you're doing, not just what you typed.

The interaction model is dead simple — one-key accept with Tab. You stay in your editing flow. You don't switch to a chat panel, you don't type a command, you don't break context. This is what the slide calls the "ambient editing layer." NES works alongside the inline completions you already use — suggestions as you type plus predictions of what you'll change next. Together, they form a continuous editing assist that's always present but never intrusive.

On availability: NES is generally available in VS Code and Visual Studio, and in preview for JetBrains, Xcode, and Eclipse. If you're in VS Code — which most of you probably are — you've got it right now.

One practical tip: NES gets better the more consistently you edit. If you make one rename and then do something completely different, NES has less signal. But if you're working through a systematic refactoring — updating types, propagating changes, aligning signatures — NES is at its best. Let it ride the wave of your intent.

### Slide cues
- Two-column layout: left has three icon rows (Watches Your Edits, Propagate Changes, One-Key Accept with Tab); right has a blue accent card labeled "Ambient Completions" explaining how NES and inline completions form the ambient editing layer
- Availability note bar: GA in VS Code and Visual Studio, Preview in JetBrains, Xcode, and Eclipse

### Transition
NES is model-powered, which brings up an important question — which model should you actually use for what? Let's talk model selection.


## Slide 33 — Model Selection

### What you say
Model selection is one of those decisions that can feel overwhelming given the sheer number of options, so this slide gives you a practical framework. Three tiers — fast, balanced, and deep reasoning — each mapped to the kinds of tasks where they shine.

Fast and focused models — GPT-4o mini, o4-mini, Gemini 2.0 Flash. These are your everyday workhorses. Code completion, quick Q&A, simple refactors. They're cheap, they're fast, and for straightforward tasks they're perfectly capable. If you're asking "what does this function do" or "add a null check here," you don't need a reasoning model — you need speed. In the CLI context, these are what you'd use for routine tool-heavy loops: running builds, grepping files, iterating through linter output.

Balanced models — GPT-5, GPT-4.1, Claude Sonnet 4, Gemini 2.5 Pro. This is the sweet spot for most agentic work. When Copilot is in agent mode — reading files, making multi-file edits, running tests, reasoning about your codebase — these models deliver the right balance of intelligence and throughput. Code review, feature implementation, refactoring across multiple files — the balanced tier handles it. In our workshop, sub-agent dispatches pin Claude Opus 4.6 specifically, but for your main conversation loop, this balanced tier is usually the right call.

Deep reasoning models — o3, Claude Sonnet 4.5, Claude Opus 4.5. These are for the hard problems. Architecture decisions where you need the model to reason through tradeoffs. Complex debugging where the bug spans multiple subsystems. Extended thinking tasks where the model needs to plan before it acts. These models are slower and more expensive, but when you need that depth of analysis, nothing else will do.

The note bar at the bottom is important — you select models per conversation via the model picker. It's available in VS Code, JetBrains, Visual Studio, Xcode, and GitHub.com. You're not locked into one model for everything. Start a conversation with a fast model for exploration, switch to a balanced model when you're ready to implement, escalate to a reasoning model if you hit a gnarly architectural question. The model picker makes this fluid.

### Slide cues
- Three-card layout: Fast & Focused (accent color, lightning icon, pill tags for GPT-4o mini / o4-mini / Gemini 2.0 Flash), Balanced (blue, brain icon, pills for GPT-5 / GPT-4.1 / Claude Sonnet 4 / Gemini 2.5 Pro), Deep Reasoning (green, telescope icon, pills for o3 / Claude Sonnet 4.5 / Claude Opus 4.5)
- Each card lists three example use cases
- Note bar: model picker available across VS Code, JetBrains, Visual Studio, Xcode, and GitHub.com

### Transition
Models process text — but Copilot can also process images. Let's look at vision and multimodal input.


## Slide 34 — Vision & Multimodal

### What you say
This is one of those capabilities that's surprisingly practical once you start using it. You can attach images — screenshots, UI mockups, architecture diagrams — directly into Copilot Chat, and the model will analyze them and respond accordingly.

The first use case on screen is the most common: attach images to chat. You drag and drop a screenshot, a Figma export, a whiteboard photo, whatever visual artifact you've got — right into the chat input. The model sees it. This sounds basic, but think about how much time you've spent trying to describe a UI layout in words, or explaining what a specific error dialog looks like. Now you just paste the screenshot.

Second: debug from screenshots. You've got a broken UI? A weird layout issue? An error dialog you can't reproduce? Paste the screenshot. Copilot analyzes the visual, cross-references it with your code, and suggests fixes. This is particularly powerful for CSS and layout issues where the problem is inherently visual. Describing "the sidebar is overlapping the main content on mobile viewports" is way less efficient than just showing the screenshot.

Third: design to code. Share a UI wireframe or a Figma export, and ask Copilot to generate the corresponding component code. This bridges the designer-developer handoff gap. You're not manually translating a mockup into JSX or Razor — you show the model what the UI should look like and it generates a starting point. It's not pixel-perfect, but it gets you 70-80% there, and then you iterate.

On the right side of the slide you can see IDE availability. Vision is now generally available across VS Code, JetBrains, Visual Studio, and Eclipse. The note at the bottom is important — it works with models that support vision, which includes GPT-4.1, Claude Sonnet 4, and Gemini 2.5 Pro. If you're using a text-only model, you won't get the image analysis capability, so check your model selection.

The broader trend here is multimodal input becoming a standard part of the development workflow. It's not a gimmick — it's a genuinely faster way to communicate context to the model when that context is visual.

### Slide cues
- Two-column layout: left has three icon rows (Attach Images to Chat, Debug from Screenshots, Design → Code); right has a blue card showing IDE availability — GA checkmarks for VS Code, JetBrains, Visual Studio, and Eclipse
- Note bar within the card: "Works with models that support vision (e.g. GPT-4.1, Claude Sonnet 4, Gemini 2.5 Pro)"

### Transition
We've covered the editor features. Now let's talk about extending Copilot's capabilities beyond what it can do out of the box — that's the Model Context Protocol.


## Slide 35 — MCP

### What you say
Welcome to the MCP module — Model Context Protocol. This is one of the most important architectural concepts in the modern AI tooling landscape, and it's where Copilot goes from a smart autocomplete to a genuinely extensible platform.

The tagline on screen says it well: extend Copilot capabilities with an open standard — MCP in practice. Let me unpack that. MCP is an open protocol — think of it like USB-C for AI applications. Just as USB-C gives you a universal physical connector that works with any device, MCP gives you a universal protocol for connecting AI applications to external tools and data sources. Before MCP, every AI tool had its own bespoke integration story. You want to connect to a database? Write a custom plugin. You want to access documentation? Different plugin. Each one with its own API, its own auth model, its own lifecycle. MCP standardizes all of that.

The three pillars on screen capture what MCP enables. First: extend Copilot capabilities. Out of the box, Copilot can read files, write code, and run terminal commands. MCP lets you add any tool — database queries, API calls, cloud service management, CI/CD pipelines. The tool surface becomes open-ended. Second: share context with LLMs. MCP servers can expose data — files, database records, API responses — as context that the model can reason over. The model doesn't just have your code; it has whatever data sources you connect. Third: create new tools and services. You can author your own MCP servers that expose domain-specific capabilities. Got an internal API? Wrap it in an MCP server and Copilot can call it directly.

This isn't hypothetical. In our workshop, we've got six MCP servers configured: Context7 for third-party library documentation, a memory server for persisting knowledge across sessions, sequential-thinking for structured reasoning, WorkIQ for Microsoft productivity data, Microsoft Learn for Azure documentation, and a Fabric server for data architecture. Each one extends what Copilot can do beyond its native capabilities.

Let's look at the core concepts that make MCP work.

### Slide cues
- Section divider slide with large heading "Model Context Protocol" and subtitle "Extend Copilot capabilities with an open standard — MCP in practice"
- Three centered icons below: plug (Extend Copilot capabilities), handshake (Share context with LLMs), wrench (Create new tools & services)
- Decorative glow rings in background

### Transition
MCP defines three primary primitives — resources, prompts, and tools. Let's break each one down.


## Slide 36 — Core Concepts 1

### What you say
MCP is built on three primary primitives, and understanding these is essential before you wire up any MCP server. They're on screen as three cards — resources, prompts, and tools. Let's go through each one.

Resources are data and content that an MCP server exposes to the AI model. Think of resources as the "read" side of MCP. A server can surface files from a filesystem, records from a database, responses from an API — anything that the model might need to reason over. The key insight is that resources are model-accessible data that doesn't have to live in your local filesystem. Your Copilot session can access a documentation corpus, a database schema, or a live API response — all through the resource primitive. It's how you expand the model's knowledge beyond "what's in this repo."

Prompts are reusable prompt templates and workflows that an MCP server defines. These are standardized interactions for common tasks. If you've got a pattern like "analyze this data and produce a summary in this specific format," you can encode that as an MCP prompt. The server defines the template, and the client — Copilot — fills in the variables. Sequential-thinking, one of our workshop MCP servers, is a good example: it offers structured chain-of-thought prompt templates that help the model reason step by step.

Tools are the "write" side — they let the LLM interact with external systems, perform computations, and take actions. This is the most powerful primitive. When Copilot calls an MCP tool, it's executing real operations: querying a database, hitting an API endpoint, running a computation. Context7 in our workshop setup exposes tools for looking up third-party library documentation. Microsoft Learn exposes tools for searching Azure documentation. The model doesn't just know about these systems — it can call into them.

The note bar at the bottom lists our workshop MCP servers: Context7, memory, sequential-thinking, WorkIQ, Microsoft Learn, and Fabric. Each one surfaces a different mix of tools and resources. We'll wire these up hands-on at the end in Lab 05, and you'll see each primitive in action — tools that execute, resources that surface data, and prompts that structure reasoning.

### Slide cues
- Three-card layout: Resources (chart icon, accent color — data and content), Prompts (speech bubble icon, blue — reusable prompt templates), Tools (wrench icon, green — interact with external systems)
- Workshop anchor note bar listing the six MCP servers: context7, memory, sequential-thinking, workiq, microsoft-learn, fabric

### Transition
Those are the three primitives. Next we'll look at how MCP servers actually connect to Copilot — the transport layer and configuration model.
## Slide 37 — Core Concepts 2

### What you say

Alright, we covered tools, resources, and prompts — those are the things you interact with directly. Now let's look at the supporting infrastructure underneath MCP that makes those pieces work reliably and securely.

First up: **Sampling**. This is a pattern where the MCP server itself can request LLM completions back through the client. Why does that matter? Because it means a server can initiate its own AI interactions — it's not just a dumb pipe. The server can reason about its own data before handing results back to you. It flips the interaction model on its head compared to a typical API call.

Next: **Roots**. Roots define the boundaries of where an MCP server is allowed to operate. Think of them as a security perimeter. When you configure a server, you're telling it "you can look at this directory, these repos, this scope — nothing else." That's critical in an enterprise setting where you don't want an MCP server casually crawling your entire filesystem. Roots give you scoped access for security and context control.

And finally: **Transports**. This is the communication foundation — literally how the client talks to the server. The two main flavors you'll see are stdio and HTTP. Stdio means the server runs as a local process and communicates over standard input/output — it's fast, it's simple, no network hops. HTTP means the server is running somewhere on the network, maybe a managed service, maybe your own infrastructure.

Here's a practical example from our workshop setup. Four of our MCP servers — context7, memory, sequential-thinking, and workiq — all run over stdio. They're local processes on your machine. The other two — microsoft-learn and fabric — run over HTTP because they're remote services. You'll see this firsthand when we do the hands-on work in Lab 05.

This transport choice isn't just an implementation detail. It affects latency, security posture, and deployment complexity. Stdio is great for development and local tooling. HTTP is what you'll use when you need to share servers across a team or connect to managed services. And these roots and sampling concepts come back into play when you start composing servers across sub-agents — which is exactly what happens in Lab 07.

So sampling, roots, and transports — that's the infrastructure that makes the tool-resource-prompt layer actually work in practice.

### Slide cues

- Three-column card layout: Sampling (orange), Roots (accent), Transports (blue)
- Sampling: "Servers request LLM completions through the client"
- Roots: "Define boundaries where servers can operate"
- Transports: "stdio, HTTP, and more"
- Workshop anchor note bar at bottom referencing Lab 05: stdio for context7/memory/sequential-thinking/workiq; HTTP for microsoft-learn + fabric

### Transition

That covers the protocol layer. Now let's pivot to something immediately practical — how you write instructions that actually steer Copilot's behavior effectively.

---

## Slide 38 — Generate Instructions

### What you say

So we've talked about MCP servers, tools, resources — all the infrastructure. But here's a question: how do you actually tell Copilot what your team cares about? How do you encode your conventions, your patterns, your "we do it this way" preferences so Copilot respects them consistently?

The answer is custom instructions, and there are four key techniques to writing ones that actually work.

**First: write short, self-contained statements.** Each instruction should stand completely on its own. Don't write a paragraph explaining your philosophy on error handling — write a clear, actionable directive. "Always use structured logging with correlation IDs." "Return early from functions to avoid deep nesting." Short statements are easier for the model to apply consistently. Think of them as lint rules for an AI — concise, unambiguous, and independent.

**Second: focus on coding standards and architectural patterns.** This is where you get the highest leverage. Naming conventions, code organization preferences, which patterns you use — repository pattern, CQRS, whatever your team has standardized on. These are the things that make code reviews painful when they're inconsistent. Put them in instructions and Copilot handles it from the start.

**Third: pair instructions with features.** Instructions don't exist in isolation. They combine with code review, the coding agent, and chat features for maximum impact. When you write an instruction about test coverage, that instruction applies when Copilot is doing code review on a PR, when the coding agent is autonomously writing code, and when you're chatting about your codebase. One instruction, multiple surfaces.

**Fourth: make them team-specific.** Generic best practices are fine, but the real power comes from encoding what's unique to your team. Your framework choices, your internal libraries, your deployment conventions, the things a new hire wouldn't know for six months. That's what turns instructions from a nice-to-have into a real productivity multiplier.

These instructions end up in `.github/copilot-instructions.md` in your repository. They're version-controlled, they travel with the code, and every Copilot surface reads them. You'll write one yourself during the hands-on labs.

The key takeaway: invest thirty minutes writing good instructions and you'll save hours of "actually, we don't do it that way" conversations.

### Slide cues

- Four cards in a 2×2 grid:
  - "Write Short Statements" (accent) — self-contained, clear, actionable
  - "Coding Standards & Patterns" (blue) — architectural patterns, naming, code org
  - "Pair with Features" (green) — code review, coding agent, chat
  - "Team-Specific Standards" (orange) — unique conventions, frameworks, best practices

### Transition

Now, instructions are about steering Copilot's behavior. But what if you want to extend Copilot's capabilities with third-party tools? That's where Copilot Extensions come in.

---

## Slide 39 — Copilot Extensions

### What you say

So far everything we've talked about — MCP servers, instructions, skills — that's all stuff you configure yourself. Copilot Extensions are the other side of the coin: these are third-party integrations that vendors build and publish on the GitHub Marketplace.

The mechanics are simple. You browse the Marketplace, install an extension, and then invoke it by typing `@extension-name` in Copilot Chat. That's it. No server configuration, no JSON files, no local processes to manage. The extension brings external data and actions directly into your conversation context.

Let's look at what's on screen. You've got Datadog, Sentry, Docker, Atlassian, Azure, HashiCorp, MongoDB, SonarQube — there are over a hundred extensions available now. These are real integrations. `@datadog` lets you query your monitoring data from chat. `@sentry` brings in your error tracking. `@docker` helps with container configuration. These aren't toys — they're production-grade integrations.

Now here's the important distinction you need to understand: **Extensions versus MCP servers**. They're complementary, not competing. Extensions are installed via GitHub and use OAuth for permissions — they're managed SaaS integrations. MCP servers run locally or in your own infrastructure — they're custom tooling you control. Use Extensions when a vendor has already built what you need. Use MCP when you need custom integrations with internal systems, or when you need the kind of control that comes with running things yourself.

Think of it this way: if you need to talk to Datadog, install the extension — someone already built it, it's maintained, and it has proper OAuth scoping. If you need to talk to your internal deployment system that nobody outside your org has ever heard of, that's an MCP server.

The model for extension developers is also worth knowing about. If you're building tooling for your platform teams, you can publish extensions that your entire org can use. It's the same pattern as GitHub Apps — you define the permissions, build the integration, publish it to the Marketplace or keep it internal.

So to sum up: Extensions are your fast path to vendor integrations, MCP is your custom tooling layer, and they compose nicely together. You'll often have both in a real-world setup.

### Slide cues

- Left column: three icon-rows — GitHub Marketplace (browse and install), @extension-name in Chat (invoke by name), Extensions vs MCP (installed via GitHub with OAuth vs run locally)
- Right column: "Popular Extensions" card showing pills: @datadog, @sentry, @docker, @atlassian, @azure, @hashicorp, @mongodb, @sonarqube
- Note bar: "100+ extensions at github.com/marketplace"

### Transition

Extensions bring third-party data into Copilot. But what about your own internal documentation — your wikis, your runbooks, your architecture decision records? That's what Knowledge Bases solve.

---

## Slide 40 — Knowledge Bases

### What you say

This is one of those Enterprise features that, once you see it, you immediately understand why it matters. Knowledge Bases let you index your internal documentation and codebases so Copilot can reference them during conversations.

Here's the problem it solves. You ask Copilot a question about your internal API — maybe it's a custom authentication service your team built. Copilot has never seen your internal docs. Without Knowledge Bases, it guesses based on common patterns and maybe hallucinates an API that doesn't exist. With Knowledge Bases, it actually searches your indexed documentation and gives you an answer grounded in your real APIs.

Let me walk through what's on screen. First: **index internal docs**. You connect your wikis, your documentation repos, your codebases as a searchable knowledge index. This isn't just full-text search — it's a proper semantic index that Copilot can reason over.

Second: **Copilot searches it automatically**. You don't have to explicitly tell Copilot "go check the knowledge base." During conversations, it retrieves relevant content on its own. You ask about your deployment process, and it pulls in your runbook.

Third: this is an **Enterprise and Business feature**. It's managed in your Organization or Enterprise settings. That's important because it means your admin controls what gets indexed and who has access.

Fourth, and this is the big one for large orgs: **multi-repository context**. On Enterprise, Copilot Chat can reference code across multiple repositories in a single conversation. You're working in the frontend repo and you need to understand the backend API contract? Copilot can span across both repos in the same conversation. That's org-wide codebase awareness.

Look at the use cases on the right side of the slide. Company coding standards wiki — so every developer gets consistent guidance. Architecture decision records — so Copilot understands why you made certain choices, not just what the code does. Internal API documentation, onboarding runbooks, legacy codebase context. And cross-repo org-wide code context for the Enterprise tier.

The callout at the bottom is important: this reduces hallucination on internal APIs and frameworks. That's the real win. Copilot stops making things up about your internal systems because it has actual documentation to reference.

If your organization is on Enterprise or Business, this should be one of the first things you set up.

### Slide cues

- Left column: four icon-rows — Index Internal Docs, Copilot Searches It, Enterprise & Business, Multi-Repository Context
- Right column: blue card "Use Cases" — company coding standards wiki, ADRs, internal API docs, onboarding & runbooks, legacy codebase context, cross-repo org-wide code context
- Blue note bar: "Reduces hallucination on internal APIs & frameworks"

### Transition

So that's about connecting Copilot to your org's knowledge. Now let's step outside Copilot itself for a moment and look at GitHub Models — a free playground for experimenting with AI models directly.

---

## Slide 41 — GitHub Models

### What you say

GitHub Models is one of those things that often flies under the radar, but it's genuinely useful. It's a free AI model playground that lives at `github.com/marketplace/models`, and it's separate from Copilot itself.

So what is it? Think of it as a sandbox where you can test prompts against dozens of models side by side. GPT-4o, Llama, Mistral, Phi — they're all there. You type a prompt, pick a model, and see what comes back. Then you switch to a different model with the same prompt and compare. That's incredibly valuable when you're trying to figure out which model works best for a particular use case.

The second piece is **code snippets**. Once you find a model you like, GitHub Models generates ready-to-use SDK code for you. Pick your language — JavaScript, Python, C# — and you get a working code snippet that calls that model's API. It's a fast path from "I'm experimenting" to "I'm integrating."

And the best part: it's **free to explore**. It's included with your GitHub account. No separate API subscription needed, no credit card, no Azure setup. You just go to the Marketplace, click Models, and start experimenting. Obviously there are rate limits on the free tier, but for prototyping and evaluation, it's more than enough.

Now look at the right side of the slide — the GitHub AI ecosystem card. This shows you how the pieces fit together. Copilot is your integrated AI assistant — it's in your IDE, in your terminal, in your PR reviews. Models is the playground and API layer — it's where you experiment and prototype. Extensions are the third-party marketplace — that's vendor integrations we just talked about. Three complementary pieces, each serving a different purpose.

A practical scenario: you're building an internal tool that needs to summarize support tickets. You go to GitHub Models, test your summarization prompt against GPT-4o, Llama, and Mistral. You figure out which model gives the best results for your data. Then you grab the SDK snippet and integrate it into your application. That whole workflow happens without leaving GitHub.

So if you haven't checked out GitHub Models yet, I'd encourage you to poke around. It's at `github.com/marketplace/models`, it's free, and it's a great way to build intuition about different models' strengths.

### Slide cues

- Left column: three icon-rows — Prompt Playground (test against dozens of models), Code Snippets (generate SDK code for any model/language), Free to Explore (included with GitHub)
- Right column: "The GitHub AI Ecosystem" card showing three pills — Copilot (integrated AI assistant), Models (model playground & API), Extensions (3rd-party marketplace)
- Note bar: `github.com/marketplace/models`

### Transition

Speaking of building things quickly — let's look at GitHub Spark, which takes the idea of "describe what you want" to a whole new level.

---

## Slide 42 — GitHub Spark

### What you say

GitHub Spark is something coming out of GitHub Next — their research and prototyping group. The pitch is simple: describe what you want to build in natural language, and Spark generates a fully functional micro-app for you. No full-stack development required.

Now, I want to be clear about positioning. This is not Copilot. It's a separate product in GitHub's AI ecosystem, and it's aimed at a different use case. Where Copilot helps you write code in your editor, Spark helps you build small, self-contained applications through conversation.

Here's how it works. **Natural language to app**: you describe what you want — "I need a team standup tracker where people can post updates and see what everyone else posted today." Spark takes that description and generates a working micro-app. Not a code skeleton, not a template — a functional application you can actually use.

**Instant hosting**: this is the part that makes it practical. The app Spark generates is immediately hosted on GitHub infrastructure. You get a shareable link. No deployment pipeline, no infrastructure provisioning, no "let me spin up a container." You describe it, Spark builds it, you share the link. Done.

**Iterative refinement**: and here's where the conversational aspect really shines. You look at what Spark built, and you say "add a column for blockers" or "make the UI dark mode" or "add a chart showing update frequency." Spark modifies the app through conversation. You're essentially pair-programming with an AI, but at the application level instead of the code level.

The practical use cases here are internal tools, prototypes, and demos. Need a quick dashboard for your team? A form that collects data and displays it? A voting tool for your next retro? These are the kinds of things that typically take half a day of setup — picking a framework, configuring hosting, wiring up a database. Spark compresses that into a conversation.

Look at the right side — Spark sits alongside Copilot and Models in the GitHub AI ecosystem. Copilot is your developer assistant, Models is your playground and API, and Spark is natural language micro-apps. Each one solves a different problem, and together they cover a wide range of the "I need AI to help me build" spectrum.

It's available at `githubnext.com/projects/github-spark` if you want to try it out.

### Slide cues

- Left column: three icon-rows — Natural Language to App (describe and generate), Instant Hosting (hosted on GitHub, share a link), Iterative Refinement (refine through conversation)
- Right column: accent card "Part of GitHub's AI Ecosystem" — Copilot (developer AI assistant), Models (model playground & API), Spark (natural language micro-apps)
- Note bar: `githubnext.com/projects/github-spark`

### Transition

Alright, we've covered the broader GitHub AI ecosystem. Now let's dive into the real headliner of the intermediate section — the GitHub Copilot Coding Agent.

---

## Slide 43 — Coding Agent

### What you say

Okay, let's shift gears. Everything up to now — MCP, instructions, extensions, knowledge bases — that's all about making Copilot smarter and better connected while you're driving. The Coding Agent is fundamentally different. This is Copilot working autonomously, without you in the loop.

This is the section title slide for Module 4, and I want to frame this properly because it represents a real paradigm shift in how we think about developer tooling. With Agent Mode in your IDE, you're interactive — you're chatting, you're approving changes, you're steering. With the Coding Agent, you assign it a task, walk away, and come back to a pull request.

It runs in GitHub Actions. It's not on your laptop. It's not in your editor. It's a headless agent executing in a CI runner, with access to your repository, your test suite, your build tools. It plans, it codes, it tests, it iterates — and when it's done, it opens a PR for you to review.

That's a fundamentally different trust model, and it requires a different kind of setup. You need to tell the agent about your project — how to build, how to test, what the architecture looks like, what it should and shouldn't touch. That's what the next few slides are about.

Think about the implications for a moment. Every team has that backlog of issues that are well-defined but nobody picks up — small refactors, documentation updates, straightforward bug fixes. The Coding Agent is designed for exactly that work. You write a clear issue, assign it to Copilot, and move on. The agent handles the implementation, validates it against your test suite, and surfaces a PR. Your time goes toward review and architectural decisions instead of writing boilerplate.

That said, this isn't magic. The quality of the output depends directly on how well you've configured your project for autonomous work. Good documentation, clear testing commands, explicit guardrails — all of that matters more when there's no human correcting course in real time.

Let's dig into what the Coding Agent actually is and how it works.

### Slide cues

- Section title slide with large robot emoji (🤖)
- "GitHub Copilot Coding Agent" in large section title
- Tagline: "GitHub Copilot intermediate"
- Visual glow ring effect in background

### Transition

So what exactly is the Coding Agent? Let's break it down into its four core pillars.

---

## Slide 44 — What is it?

### What you say

Let's get precise about what the Coding Agent actually is. There are four pillars here, and each one matters.

**AI-powered development.** The agent works autonomously on issues — it plans an approach, writes code, runs tests, observes the results, and iterates. This isn't "generate a snippet and hope for the best." It's a full Plan-Act-Observe loop, the same kind of agentic behavior you see in Agent Mode, but running without you watching.

**Asynchronous execution.** And this is the key differentiator. The Coding Agent operates in its own GitHub Actions-powered environment. It's not blocking your workflow. You're not sitting there waiting for it to finish. It's running on a CI runner in the cloud while you're working on something else entirely — reviewing PRs, having lunch, sleeping. The async model is what makes this practical for real work.

**Issue-driven.** The entry point is a GitHub issue. You write up what you need — a bug fix, a feature, a refactoring task — and you assign it to Copilot. That's the interface. No special UI, no separate tool. Issues are the work items, and Copilot picks them up just like a team member would. You can continue working on other priorities while it runs.

**Deep environment access.** The agent doesn't just see your code — it has full access to a development environment. It can read your project files, understand your directory structure, run your build commands, execute your test suite. It actively explores the codebase to find what it needs. If it needs to understand how your authentication middleware works before fixing a bug in a protected endpoint, it goes and reads that code. It's not working from a shallow context window.

Put these four things together and you've got something genuinely new: an AI agent that takes an issue, autonomously develops a solution in a real environment, validates it against your test suite, and delivers a pull request. Your job shifts from writing the code to reviewing the PR and verifying the approach.

That's a meaningful change in the development workflow, and it raises important questions about how you set up your project to make this work well. We'll get to that.

### Slide cues

- Four icon-rows in a single column:
  - 🧠 AI-Powered Development — "plans, codes, tests, and iterates"
  - ⚡ Asynchronous Execution — "GitHub Actions-powered environment"
  - 📋 Issue-Driven — "Assign it issues or tasks"
  - 🔍 Deep Environment Access — "Full access to your VS Code environment"

### Transition

Now, the Coding Agent runs in GitHub Actions. But there's actually a broader story here — Copilot as a first-class step in your CI/CD pipelines.

---

## Slide 45 — Copilot in Actions

### What you say

So the Coding Agent uses GitHub Actions as its runtime. But there's a separate, equally interesting capability: running Copilot as a first-class job step in your CI/CD pipelines. This is Copilot in GitHub Actions.

The mechanic is straightforward. In any workflow YAML, you add `uses: github/copilot-action` as a step. That's it. Copilot runs as a native Actions step — not a sidecar, not a wrapper around something else. It's a proper job step with full access to the workflow context.

What makes this powerful is that it's **event-driven**. You can trigger Copilot tasks on any GitHub event — `push`, `pull_request`, `issue_comment`, `schedule`, whatever your workflows already respond to. That means you can wire Copilot into your existing automation without rearchitecting anything.

Let me give you some concrete use cases from the slide. **Auto-review PRs on open** — a pull request comes in, your workflow fires, and Copilot does an initial code review with inline comments. That's not replacing human review, but it catches the obvious stuff before a human even looks at it. **Generate release notes on tag** — you push a tag, Copilot reads the commits since the last release and writes up coherent release notes. **Triage new issues with labels** — an issue gets filed, Copilot reads it, applies appropriate labels, maybe adds a comment about which team should look at it. **Create tests for changed files** — files get modified in a PR, Copilot generates test cases for the changed code. **Update docs on merge to main** — code hits main, Copilot updates the corresponding documentation.

Now there's an important distinction in the note bar at the bottom: this is **distinct from gh-aw**, which is the GitHub Agentic Workflows platform. Agentic Workflows orchestrate full multi-step agent tasks — they're more complex and powerful. Copilot in Actions is simpler and more focused: it's a single step in an existing pipeline. Think of gh-aw as the full autonomous workflow engine, and Copilot in Actions as the lightweight "add Copilot to this specific pipeline step" option.

Both are valuable. If you want Copilot to do one focused task as part of an existing workflow, use the Actions integration. If you want Copilot to own an entire issue end-to-end, that's the Coding Agent running through the agentic workflow system.

### Slide cues

- Left column: three icon-rows — First-Class Job Step (`uses: github/copilot-action`), Event-Driven Automation (push, pull_request, issue_comment, schedule), CI/CD Integration (code review, docs, tests, triage)
- Right column: blue card "Example Use Cases" — auto-review PRs, generate release notes, triage issues, create tests, update docs
- Blue note bar: "Distinct from gh-aw — native Actions, no extra tooling needed"

### Transition

Now that we've seen how the Coding Agent runs, let's compare it directly against Agent Mode and Copilot Workspace — three approaches that people often confuse.

---

## Slide 46 — Mode vs Agent

### What you say

This is the comparison slide people always ask about, so let's be really clear. You're looking at three distinct approaches to AI-assisted development, and they serve different purposes.

**Agent Mode** — this is what you've been using in your IDE. It's interactive. You're in the loop. Copilot plans an approach, takes an action — edits a file, runs a command — observes the result, and then decides what to do next. The Plan-Act-Observe loop runs on your machine, with your immediate feedback. You see everything happening in real time, you can steer it, you can interrupt it. The feedback cycle is immediate. This is your workhorse for day-to-day development tasks where you want to stay in control.

**Coding Agent** — this is the autonomous mode we just talked about. You assign a GitHub issue to Copilot. The agent reads your `COPILOT.md` for project context — build commands, architecture overview, rules. Then it works autonomously in a GitHub Actions environment. No human in the loop during execution. When it's done, it creates a pull request. You review the PR like you would from any team member. The key distinction: you're not interactive during execution. You fire and forget, then review the output.

**Copilot Workspace** — and here's the third option that's different again. You start from an issue on GitHub.com — in the browser. Workspace generates a collaborative plan: here's what I think needs to change, here's the file tree diff. But crucially, you review and edit that plan before any code gets committed. It's a collaborative planning experience. You shape the implementation, you approve the approach, and then it executes. It's GA for Enterprise and it's entirely browser-based.

So think of it as a spectrum. Agent Mode: fully interactive, local, you're driving. Workspace: collaborative, browser-based, you shape the plan. Coding Agent: fully autonomous, cloud-based, you review the result. Different levels of human involvement, different execution models, different use cases.

In practice, you'll use all three. Agent Mode for your current feature work. Coding Agent for that backlog of small issues nobody wants to pick up. Workspace for exploring how to approach a complex change before committing to an implementation strategy.

### Slide cues

- Three-column card layout:
  - Agent Mode (accent): iterates locally, Plan→Act→Observe, interactive, immediate feedback
  - Coding Agent (blue): assign GitHub issues, reads COPILOT.md, works autonomously in Actions, creates PRs
  - Copilot Workspace (green): start from issue on GitHub.com, collaborative plan + file tree diff, review & edit before committing, GA for Enterprise, browser-based

### Transition

So the Coding Agent is autonomous — but how do you customize its behavior for different kinds of work? That's where custom agents for the Coding Agent come in.

---

## Slide 47 — Custom Agents

### What you say

When you assign an issue to the Coding Agent, you don't have to use a one-size-fits-all approach. You can select or create a custom agent that's tailored to the specific type of work.

This is about giving the autonomous agent the right persona and toolset for the job. Look at the two key levers on the left side of the slide.

**Select or create.** When you're assigning an issue to Copilot, you choose which agent handles it. If you've already defined agents for common workflows, you pick the one that fits. If the task doesn't match any existing agent, you create a new one right there. The agent definition becomes part of your repository's configuration, so it's reusable for future issues.

**Workflow-specific.** Different types of work need different expertise and different guardrails. A Kubernetes architect agent knows about cluster configuration, Helm charts, and resource limits. A database migration specialist knows about schema changes, data integrity, and rollback strategies. You wouldn't give the same instructions to a human doing those two jobs, and you shouldn't give the same instructions to an AI agent either.

Look at the right side of the slide — you've got four example agents. An **Architecture Agent** for structural changes and design decisions. A **Kubernetes Agent** for container orchestration work. A **Testing Agent** for writing and improving test suites. A **Docs Agent** for documentation updates. Each one has a different focus, different constraints, different definitions of "done."

Now, this is different from the custom agents we talked about earlier in the skills section. Those were about agent definitions in your `.github/agents/` directory for use in IDE chat — things like a QA agent or a PM agent you can `@mention` in conversation. These custom agents are specifically for the Coding Agent's autonomous execution. They determine how Copilot behaves when it's working on issues without you in the loop.

The practical implication: if you're going to use the Coding Agent seriously, invest time in defining agents for your common workflows. A well-defined agent with the right instructions, the right tools, and the right guardrails will produce dramatically better results than the default. It's the same principle as writing good instructions, but applied to autonomous execution where the stakes are higher because there's no human steering in real time.

### Slide cues

- Left column: two icon-rows — Select or Create (pick or author an agent when assigning issues), Workflow-Specific (tailor to different workflows — Kubernetes architect, DB migration, etc.)
- Right column: four stacked mini-cards with colored left borders — Architecture Agent (🏗️), Kubernetes Agent (🐳), Testing Agent (🧪), Docs Agent (📝)

### Transition

And the most important piece of project configuration for the Coding Agent is the COPILOT.md file. Let's look at what goes in it.

---

## Slide 48 — COPILOT.md

### What you say

If you take one thing away from this Coding Agent section, it should be this: write a good `COPILOT.md`. It's the single most impactful thing you can do to make the Coding Agent effective.

`COPILOT.md` goes in your repository root. The Coding Agent reads it automatically on every run — before it even looks at the issue it's been assigned. It's the agent's orientation document, the "here's everything you need to know about this project" file.

So what goes in it? **Testing commands and build steps.** This is table stakes. The agent needs to know how to build your project and run your tests. If it can't validate its own changes, it's flying blind. `npm test`, `dotnet build`, `make lint` — whatever your project uses, put it in there.

**Architecture overview.** Where does the API code live? Where's the frontend? What's the directory structure? The agent can explore and figure this out, but that costs time and tokens. Give it the map upfront.

**Do and don't rules.** This is where you set guardrails. "Never modify migration files." "Tests required for all PRs." "Don't change the public API surface without explicit approval." These rules prevent the agent from doing things that would get a PR rejected immediately.

Now look at the example on the right side of the slide. It's simple markdown — a project name, build and test commands, architecture notes, and rules. Nothing fancy. That's the point — it's a lightweight format that's easy to write and maintain.

Here's a critical distinction: **COPILOT.md versus copilot-instructions.md**. The `.github/copilot-instructions.md` file is for Copilot Chat — it steers the interactive conversation surfaces. `COPILOT.md` is the primary configuration for the autonomous Coding Agent. They serve different purposes and can coexist. Think of `copilot-instructions.md` as "how to talk to me" and `COPILOT.md` as "how to work on this project unsupervised."

Without a `COPILOT.md`, the agent has to discover everything by exploring the codebase. It'll figure out your test commands by looking at `package.json` or your Makefile. It'll infer your architecture by reading directory structures. But that exploration takes time, costs tokens, and sometimes leads the agent down the wrong path. A good `COPILOT.md` makes the agent faster and safer. It's the difference between handing someone a codebase with no README and handing them one with clear onboarding docs.

We'll actually write one for ContosoUniversity during the hands-on labs — you'll see how straightforward it is and how much difference it makes.

### Slide cues

- Left column: three icon-rows — Repository Root File (COPILOT.md in repo root, read automatically), What to Include (testing, build, architecture, rules, conventions), vs copilot-instructions.md (chat vs autonomous agent distinction)
- Right column: accent card "Example COPILOT.md" showing a rendered markdown example with Project heading, Build & Test section (npm test, npm run lint), Architecture section (REST API in src/api/, React frontend in src/ui/), Rules section (never modify migrations, tests required)

### Transition

Now that we know how to configure the Coding Agent, let's look at how it handles one of the most important parts of the development workflow — code review.
## Slide 49 — Code Review

### What you say
Alright, let's talk about Copilot Code Review — one of the features that genuinely changes how your team handles pull requests. The idea is simple: Copilot acts as an additional reviewer on your PRs. It reads the diff, leaves inline comments on specific lines, and in many cases suggests concrete code changes you can accept with a single click.

There are three things it does on every review. First, inline PR comments — actionable, line-level feedback. Not vague "this could be better" stuff; it points at a line and says "this null check is missing" or "this query could be N+1." Second, suggested changes — these show up as GitHub suggestion blocks. The author can accept, edit, or dismiss them right in the PR conversation. Third, a diff summary — Copilot writes a high-level overview of what changed, why it matters, and which areas probably need the most human attention.

Enabling it is straightforward. You go to your org or repo settings, find the Copilot section, and turn on automatic code review. Once it's on, you can request a review from "Copilot" just like you'd request one from a teammate. It shows up in the reviewer dropdown.

Now, the important framing here: this does not replace human reviewers. It works alongside them. The value is that Copilot catches the mechanical stuff — missing error handling, unused imports, obvious bugs — so that when your human reviewer sits down, they can focus on architecture, design decisions, and business logic. It's a filter, not a replacement.

In Lab 09, you'll build a GitHub Agentic Workflows code-review workflow that triggers Copilot Code Review on every PR to the ContosoUniversity repo. You'll pin the model, configure the safe-output guardrails we discussed earlier, and validate the whole thing on a real PR. So you'll see this working end-to-end in the lab block.

One thing worth noting: code review works on GitHub.com. This isn't an IDE feature — it's a platform feature. The PR is the unit of work, and Copilot meets you there.

### Slide cues
- Left column: three icon rows — Inline PR Comments, Suggested Changes, Diff Summary
- Right card (blue): "Enable Code Review" — steps: Org/Repo Settings → Copilot, enable automatic code review, request review from Copilot on any PR
- Blue note bar: "Works alongside human reviewers — catches issues early so humans can focus on design & logic"

### Transition
Those inline comments and suggestions are great, but what about the PR description itself? Let's look at how Copilot can auto-generate that too.

## Slide 50 — PR Summaries

### What you say
This one is deceptively simple but saves a surprising amount of time. Copilot PR Summaries auto-generate pull request descriptions directly from your diffs and commit messages.

Here's the workflow. You push your branch, open a PR on GitHub, and in the description field you'll see a little sparkle icon — the Copilot icon. Click it. Copilot reads your diffs and your commit history, then drafts a structured description: a brief summary paragraph at the top, followed by bullet-pointed highlights of the key changes. It's not just listing files — it's actually summarizing what changed semantically.

The output is a draft. You review it, tweak it if needed, and submit. Now your reviewers have real context before they even look at the code. If you've ever opened a PR that just says "fixes stuff" or has an empty description — and we've all done it — this is the cure for that.

It works on GitHub.com, in VS Code, in Visual Studio, and in the Copilot CLI. Basically, wherever you're opening PRs, the summary generation is available.

One important caveat: this is a paid feature. It's available on Copilot Pro, Business, and Enterprise plans, but it's not included in Copilot Free. So if you're evaluating Copilot for your org and PR workflow efficiency matters — and it should — this is one of the features that justifies the paid tier.

In terms of how this connects to what we just saw: Code Review and PR Summaries operate on the same PRs. You push code, Copilot writes the description, then Copilot reviews the diff. Your human reviewers show up to a PR that already has context and has already been through a first-pass review. That's a pretty significant workflow improvement with zero additional effort from the author beyond clicking a button.

In Lab 09, once your code-review workflow is wired up, PR Summaries are the natural next thing to enable on those same PRs. The sparkle icon in the description box does the rest.

### Slide cues
- Left column: three icon rows — Auto-Generate Descriptions (sparkle icon in PR description field), Highlights Key Changes (structured overview with bullets), Works Everywhere (GitHub.com, VS Code, Visual Studio, Copilot CLI)
- Right card (blue): "Workflow" — Push branch → Open PR → Click sparkle → Review/edit draft → Submit
- Blue note bar: "Available on paid plans (Pro, Business, Enterprise) · Not included in Copilot Free"

### Transition
So Copilot can review your code and summarize your PRs. But what about when the code has actual security vulnerabilities? That's where Autofix comes in.

## Slide 51 — Autofix

### What you say
Copilot Autofix is where code review meets security scanning. The idea: when GitHub Advanced Security detects a vulnerability in your code — through CodeQL or other code scanning — Copilot automatically generates a suggested fix. Not just a warning, not just a description of the problem, but an actual code change you can apply.

There are three pieces to how this works. First, it's integrated with code scanning. When GHAS finds a vulnerability — say, a SQL injection or a cross-site scripting issue — Copilot kicks in and drafts a remediation. Second, the fix shows up as a one-click suggestion right in the PR. The developer can accept it, modify it, or reject it, same as any other suggested change. Third, and this is the key value prop, it's shift-left security. You're catching and fixing security issues at the PR stage, before they ever reach production.

The slide shows the categories of alerts Autofix can handle: SQL injection, XSS, path traversal, SSRF, and hardcoded secrets. These are the bread-and-butter web vulnerabilities that show up in every security audit. Having automated remediation for these — at the point where the code is being reviewed — dramatically shortens the time from detection to fix.

Now, the requirement: this needs GitHub Advanced Security. GHAS is what runs CodeQL and produces the alerts. Autofix is the Copilot layer on top that turns those alerts into actionable fixes. If your org isn't on GHAS, you won't see this feature. But if you are, it's a significant force multiplier for your security posture.

Think about the workflow we've been building across these three slides. A developer pushes code. Copilot writes the PR summary. Copilot reviews the diff and leaves inline comments. CodeQL scans for vulnerabilities. If it finds one, Copilot Autofix drafts a fix. By the time a human reviewer opens that PR, the mechanical quality checks and security scanning are already done. That's the pipeline.

In the lab context, this sits adjacent to Lab 09. The same PRs your code-review workflow comments on are the ones where Autofix would fire if a CodeQL alert triggers. It's the same surface, the same feedback loop.

### Slide cues
- Left column: three icon rows — Integrated with Code Scanning (GHAS detects vulnerability, Copilot generates fix), One-Click Remediation (fixes as PR comments), Shift Left Security (fix at PR stage, not production)
- Right card (orange): "Supported Alerts" — pills: SQL Injection, XSS, Path Traversal, SSRF, Hardcoded Secrets
- Orange note bar: "Requires GitHub Advanced Security (GHAS)"

### Transition
Now that we've seen the review and security surface, let's zoom out and look at what's actually happening under the hood when an agent runs — the architecture of agent mode itself.

## Slide 52 — Architecture

### What you say
This slide peels back the curtain on what's actually happening when you're in agent mode — whether that's Copilot in VS Code, the Copilot CLI, or the Coding Agent running in the cloud. The architecture is the same pattern across all of them.

At the top you've got three context layers. The machine — your OS, your environment, your installed tools. The workspace — the repo, the files, the directory structure. And the Copilot agent plus the user — the system prompt, your instructions, and whatever you've typed. These three layers feed into what the slide calls the LLM Loop.

The LLM Loop is the core of agent mode. It goes: prompt in, streamed results back, tool calls out, tool results back in, repeat. That loop runs until the agent decides it's done or you interrupt it. The tools it can call are shown in the pills on the slide: `run_in_terminal`, `edit_file`, `read_file`, `search`, `list_files`, `browser`. These are the building blocks. Every complex thing an agent does — running tests, fixing build errors, refactoring code — is composed of these primitive tool calls.

Below the loop, you've got the output layer: OS context, the tool call itself, and the tool results. Those results feed back into the next iteration of the loop. So the agent reads a file, sees a problem, edits the file, runs the tests, sees a failure, edits again — that's all iterations of this same loop.

The key insight here is that agent mode isn't magic. It's a well-defined loop with well-defined tools. The LLM decides which tool to call next based on the accumulated context. When it works well, it's because the context is clear and the tools are the right primitives. When it struggles, it's usually because the context is ambiguous or the task requires a tool the agent doesn't have.

This is also why the configuration surface we spent time on earlier matters so much. Instructions, agents, skills, MCP servers — all of that shapes what goes into the prompt and what tools are available in the loop. You're not just configuring preferences; you're shaping the agent's decision-making environment.

Understanding this loop is essential for the orchestration patterns coming next — because multi-agent workflows are fundamentally about coordinating multiple instances of this loop.

### Slide cues
- Top row: three boxes connected by arrows — Machine → Workspace → Copilot (+ User)
- Down arrow into LLM Loop box: "Prompt → Streamed Results → Tool Calls → Tool Results → Repeat"
- Tool pills inside loop: run_in_terminal, edit_file, read_file, search, list_files, browser
- Bottom row: three boxes — OS Context, Tool Call, Tool Results

### Transition
Now that we understand the single-agent loop, let's talk about managing agents at scale — when and how to orchestrate more than one.

## Slide 53 — Agent Management

### What you say
Alright, we're entering the agent management section. This is module five of six, and it's where we shift from "how does one agent work" to "how do I orchestrate multiple agents for complex workflows."

Up to this point, everything we've covered has been about making a single agent as effective as possible — giving it the right instructions, the right tools via MCP, the right skills and prompts. That's table stakes. But real-world engineering work often exceeds what a single agent session can handle. Maybe the task takes longer than thirty minutes. Maybe you need different specialized perspectives. Maybe you want a dev agent and a QA agent working in parallel on the same codebase.

The question this section answers is: when do you spawn one session versus many? And when you spawn many, how do you coordinate them so they don't step on each other, lose context, or produce conflicting changes?

We're going to cover three things. First, single versus multi-session — the decision framework for when to stay in one session versus breaking work across multiple. Second, orchestration patterns — sequential pipelines where one agent's output feeds the next, and parallel execution where independent tasks run concurrently. Third, handoff protocols — how agents pass context between sessions so nothing gets lost.

If you were in Lab 07, you already saw multi-agent orchestration in action — running sequential and parallel sub-agent dispatches via the task tool. The next few slides give you the mental model behind what you did there. And Labs 13 and 14 take it further with A2A, the Agent Communication Protocol, and the tmux meta-loop pattern where dev and QA agents trade control of panes.

This is the part of the workshop where things get genuinely interesting from a systems-design perspective. You're not just using AI to write code anymore — you're designing agent workflows the same way you'd design a distributed system. Let's dig in.

### Slide cues
- Section title slide with glow ring
- Large emoji: 🎛️
- Title: "GitHub Copilot Agent Management"
- Tagline: "Orchestrating AI agents for complex workflows"

### Transition
The first decision in agent management is simple: one session or many? Let's look at how to make that call.

## Slide 54 — Sessions

### What you say
This is the fundamental decision in agent management: do you stay in a single session or split across multiple? The answer depends on the shape of your task.

Single-session is your default. It's ideal for tasks under thirty minutes with a clear scope. You're building a feature, fixing a bug, writing a set of tests — the deliverable is self-contained, and you can get it done without the agent running out of context. The big advantage is that the agent maintains full context throughout. It remembers what it's already tried, what files it's read, what decisions it's made. There's no overhead for context transfer.

Multi-session is what you reach for when the task exceeds what one session can hold. There are a few signals. The task takes longer than a context window can sustain — the agent starts forgetting things or repeating itself. The work naturally breaks into phases where you want to pause, review, and redirect. You're hitting debugging cycles where the context is getting polluted with failed attempts and stack traces. Or the task simply requires more time than you want to spend in a single sitting.

The key to making multi-session work is handoff documents. When a session ends — whether by completion, context exhaustion, or your decision to break — the agent writes a structured document capturing what's done, what's pending, and what decisions were made. The next session reads that document first and picks up where the previous one left off. Work persists through those handoff docs.

Think of it like this: single-session is a sprint. You go fast, you stay focused, you ship something. Multi-session is a relay race. You hand the baton cleanly, and the next runner picks up at full speed. The baton is the handoff document.

In practice, most developers default to single-session and only break into multi-session when they hit a wall. That's fine — that's the right instinct. Just know that when you do need multi-session, the handoff protocol makes it work. We'll cover the details of those handoff documents in a couple of slides.

The versus layout on the slide makes this a clean comparison. Single-session on the left in purple, multi-session on the right in blue, with the VS badge in the middle.

### Slide cues
- Two-card comparison layout with VS badge between them
- Left card (accent/purple): "Single-Session" — under 30 min, clear scope, self-contained, full context maintained
- Right card (blue): "Multi-Session" — exceeds context window, requires phase breaks, debugging cycles, handoff documents

### Transition
Once you've decided on multi-session, the next question is ordering. Do your agents run one after another, or all at once? Let's start with sequential.

## Slide 55 — Sequential

### What you say
Sequential orchestration is your default when the output of one agent is the input to the next. Think assembly line — each station adds value, and nothing can proceed until the previous station finishes.

The slide shows three patterns. Pattern one is the linear pipeline: Scout, Scribe, Builder. Each agent specializes in one phase. The Scout explores the codebase and gathers context. The Scribe writes a plan or specification based on what the Scout found. The Builder implements based on what the Scribe wrote. Strict ordered execution — each agent has a narrow, well-defined job.

Pattern two is dependency-driven order. This is a generalization of the linear pipeline. Instead of a fixed sequence, you analyze the data flow — which agent's output does another agent need? — and build the execution order from those dependencies. Data flows through the pipeline with clear input/output contracts between stages. This is closer to how build systems work: you declare dependencies and let the scheduler figure out the order.

Pattern three is quality gates. This is the one people forget, and it's arguably the most important. Between each stage, you have a validation checkpoint. The question at each gate: does this output meet the bar for the next agent to consume it? If the Scout's analysis is incomplete, you don't pass it to the Scribe. If the Scribe's plan has gaps, the Builder doesn't start. Quality gates prevent flawed outputs from cascading downstream — and in agent workflows, cascading errors compound fast.

In Lab 07, you already saw this pattern in action when you ran sequential sub-agent dispatches via the task tool. One agent finishes, its output gets passed to the next, and the chain progresses. The mental model is the same whether you're doing it manually with copy-paste between sessions, programmatically with the task tool, or through the tmux orchestrator pattern you'll see in Lab 14.

The practical advice: default to sequential unless you can prove independence. It's easier to reason about, easier to debug, and easier to insert quality gates. Only go parallel when you've identified genuinely independent work items.

### Slide cues
- Three stacked tiers (top to bottom):
  - Tier 1 (accent): "Linear Pipeline" — Scout → Scribe → Builder, strict ordered execution
  - Tier 2 (blue): "Dependency-Driven Order" — output feeds input, clear contracts
  - Tier 3 (green): "Quality Gates" — validation checkpoints prevent error propagation

### Transition
But sometimes tasks genuinely are independent, and running them one at a time is just wasting time. That's when you go parallel.

## Slide 56 — Parallel

### What you say
Parallel orchestration is about finding independent tasks and running them at the same time. The goal is straightforward: reduce total wall-clock time by doing concurrent work.

The slide shows three cards and a flow diagram. The first card is simultaneous execution — the core idea. If you have three agents and their tasks don't depend on each other, run all three at once. Your total time is the duration of the slowest agent, not the sum of all three. That's a significant speedup for the right workloads.

The second card is independent task identification, and this is where the real work lives. Not everything can run concurrently. You need to analyze your tasks and figure out which ones are truly independent — no shared state, no ordering constraints, no files they both need to modify. If two agents are editing the same file, running them in parallel creates merge conflicts. If one agent's output feeds another's input, they're not independent — they're sequential. Getting this analysis right is the difference between a smooth parallel run and a mess of conflicting changes.

The third card is dependency mapping. This is the practice of drawing out the graph of what depends on what. Visually map it. Find the critical path — the longest chain of dependent tasks — and focus your optimization there. Parallelizing tasks that aren't on the critical path doesn't actually speed anything up.

The flow at the bottom of the slide shows the merge pattern: Agent A, Agent B, and Agent C run concurrently, their outputs merge, and you get the combined result. That merge step is important. Someone — or some agent — needs to reconcile the parallel outputs. In the Copilot CLI, the task tool handles this naturally: you dispatch multiple sub-agents, they return their results, and the parent agent integrates them.

In practice, the most common parallel pattern you'll use is dispatching explore agents for codebase research — one agent investigates the auth module, another looks at the database layer, a third analyzes the API routes. They're reading, not writing, so there's no conflict risk. For write operations, be more careful about what you parallelize.

Lab 07 covered this with parallel sub-agent dispatches. The takeaway: parallel is powerful but requires upfront analysis of independence.

### Slide cues
- Three cards in a row:
  - Accent card: "Simultaneous Execution" — reduce time for independent tasks
  - Blue card: "Independent Task ID" — analyze inputs/outputs for parallelizable work
  - Green card: "Dependency Mapping" — visual graph, find critical path
- Bottom flow diagram: Agent A + Agent B + Agent C → Merge → Result (shown as pills with arrows)

### Transition
Now let's push further — what happens when agents don't just run in parallel but actually talk to each other? That's the A2A and tmux meta-loop pattern.

## Slide 57 — A2A & tmux Meta-Loop

### What you say
This is the most advanced orchestration pattern in the workshop, and it's where we go from running agents side by side to having them actually communicate and hand off work to each other.

There are three concepts on this slide. First, the ACP handshake. ACP is the Agent Communication Protocol. When you run `copilot --acp`, you open a communication channel between agents. At the handshake, the agents assert their roles, their tool access control lists, and their session identity. This is how one agent knows what the other agent is allowed to do and what role it plays in the workflow.

Second, the tmux dev-QA loop. This is a concrete implementation of agent-to-agent coordination. You have two tmux panes. One runs a dev agent. The other runs a QA agent. Dev edits code; QA verifies it. They take turns. The contract between them — and this is the critical piece — is a file called `.orchestrator/session.md`. That file has YAML frontmatter declaring the current role, the current phase, and the status of the previous phase. Every time a pane restarts or a role swaps, the agent reads that file first.

Third, the Karpathy memory pattern. This is the insight that ties it together: LLM sessions are stateless. The agent doesn't remember anything from a previous session. So the durable artifact has to be a structured text file that the next session reads before it does anything else. Treat the handoff doc as the agent's external long-term memory. It's explicit, it's append-only, and it's machine-readable. Sessions come and go; the file is the state.

The green card on the right reinforces this: `session.md` is the contract. Every pane restart, every role swap, every checkpoint reads it first. It survives context compaction, context resets, and even machine reboots. It's the single source of truth.

Lab 13 walks you through the ACP handshake — setting up `copilot --acp`, asserting roles, configuring tool ACLs. Lab 14 layers the tmux dev-QA meta-loop on top of that and proves the loop survives a pane crash. These are the two deepest labs in the workshop.

### Slide cues
- Left column: three icon rows — ACP handshake (`copilot --acp`, roles/ACLs/identity), tmux dev↔QA loop (two panes, `.orchestrator/session.md` contract), Karpathy memory pattern (handoff doc as external memory)
- Right card (green): "session.md = the contract" — read on every restart/swap/checkpoint, survives compaction and reboots; pills: role, phase, verification, handoff
- Workshop anchor note bar: "Lab 13 + Lab 14" — Lab 13 walks ACP, Lab 14 layers tmux meta-loop

### Transition
The tmux loop works because of one thing: the handoff document. Let's zoom in on what makes a good handoff.

## Slide 58 — Handoffs

### What you say
Handoff documents are the glue that makes multi-session and multi-agent workflows actually work. Without them, every new session starts from zero. With a good handoff doc, the next session — or the next agent — picks up exactly where the previous one left off.

The slide shows three properties of a good handoff document. First, copy-paste ready prompts. The next session's prompt should work immediately. No manual setup, no context rebuilding, no "first go read these five files." The handoff doc should contain enough context that you can paste it into a new session and the agent knows what to do.

Second, structured context. Clear sections for what's done, what's pending, and what key decisions were made along the way. This isn't a narrative — it's structured data. Think YAML frontmatter with status fields, bulleted lists of completed items, a section for open questions. The more structured it is, the easier it is for the next agent to parse and act on.

Third, explicit artifact tracking. Every file created, modified, or deleted gets listed with an explanation. This is your audit trail. When the next session opens, it knows exactly what state the workspace is in without having to re-explore the whole repo. This also matters for code review — when a human looks at the handoff doc, they can see the full scope of changes at a glance.

Now, the workshop anchor on this slide ties back to Labs 13 and 14. In Lab 13, the ACP handshake establishes how agents identify themselves to each other — `copilot --acp`, role assertion, tool ACLs. In Lab 14, the tmux meta-loop puts this into practice. Dev pane edits code, writes its status to `.orchestrator/session.md`, and QA pane picks it up. QA verifies, writes its results back, and dev pane resumes. The handoff document is what makes that loop reliable.

The practical takeaway: treat your handoff document as the single source of truth between sessions. It's your insurance policy against context loss. If the machine reboots, if the context window fills up, if you switch to a different agent — the handoff doc survives. Everything else is transient. The file is the state.

This pattern works at every scale — from a solo developer breaking a long task into two sessions, to an enterprise team running parallel agent workflows across a monorepo.

### Slide cues
- Three cards in a row:
  - Accent card: "Copy-Paste Ready Prompts" — next session works immediately, no manual setup
  - Blue card: "Structured Context" — sections for done, pending, decisions
  - Green card: "Explicit Artifact Tracking" — every file created/modified/deleted with explanations
- Workshop anchor note bar: "Lab 13 + Lab 14" — ACP handshake and tmux meta-loop with `.orchestrator/session.md`

### Transition
Alright — that's the end of the presentation block. Everything we've talked about today lands in the labs. Let's walk through the lab block.

## Slide 59 — Lab Block — All Labs in Order

### What you say
This is it — the hands-on portion of the workshop. Everything we've covered in the presentation block feeds into these fourteen labs. They run in strict numeric order, one through fourteen, because each lab builds on the output of the one before it. If you skip Lab 3, Lab 4 won't have the agent it depends on. If you skip Lab 5, Lab 12 won't have the MCP foundation. So: sequential, no skipping.

Time-boxing is critical. Budget your time per lab. If you're falling behind, skip the optional sections within a lab rather than skipping an entire lab. Every lab has a core deliverable that the next lab depends on, plus optional extensions that go deeper. Protect the core, flex on the extensions.

Let me walk you through the arc. Lab 1 maps the entire Copilot configuration surface — `~/.copilot`, `.github/`, `AGENTS.md` — so you know where everything lives. Labs 2 through 4 build the static configuration layer: custom instructions and AGENTS.md in Lab 2, a .NET development agent in Lab 3, and skills plus prompts in Lab 4. Labs 5 and 6 layer in the dynamic pieces: MCP server configuration in Lab 5, hooks in Lab 6. Lab 7 is where orchestration enters — you'll run sequential and parallel sub-agent dispatches via the task tool, pinning the model for hard reasoning tasks.

Labs 8 and 9 move to the platform. Lab 8 ships a PRD agent through GitHub Agentic Workflows. Lab 9 wires the Copilot Coding Agent into automated code review on real PRs. Lab 10 is agent memory — personalities, lessons, and consolidation patterns. Lab 11 packages everything you've built as a distributable plugin, using the org-scoped marketplace pattern with explicit hook scope. Lab 12 is the Fabric MCP variant, including an offline Parquet path for restricted networks where you can't hit the Fabric API directly. Lab 13 introduces A2A concepts with the Copilot CLI ACP handshake. And Lab 14 is the deep-dive — the orchestrator plus tmux pattern where dev and QA agents coordinate through the session.md contract.

You'll notice five workshop anchor note bars on the slide. These are the same anchors we referenced throughout the deck: Lab 01 for the config surface, Labs 05 and 12 for MCP, Lab 07 for orchestration, Labs 08 and 09 for GitHub Agentic Workflows and the Coding Agent, and Lab 11 for the plugin marketplace. They're your trail markers tying the presentation content to the hands-on work.

Start with Lab 1. Work sequentially. Ask questions as you go. Let's build.

### Slide cues
- Title: "🧪 Lab Block — All Labs in Order"
- Subtitle: "Run these in numeric order — each lab builds on the prior one"
- Numbered list (two columns): Labs 01–14 with titles
- Five workshop anchor note bars below the list:
  - Lab 01: map every config touchpoint
  - Lab 05 + 12: context7 + microsoft-learn MCP; Fabric MCP with offline Parquet
  - Lab 07: sequential/parallel dispatches, pinning claude-opus-4.6
  - Lab 08 + 09: PRD via gh-aw; Coding Agent for code review
  - Lab 11: plugin build, sign, distribute via org marketplace

### Transition
That's the entire workshop content. Let's close it out.

## Slide 60 — Thank You

### What you say
That's a wrap on the presentation and lab block. Thank you all for spending the day with us and for bringing your questions and energy to the labs.

A few resources to take with you. First, agentskills.io — that's the open standard for defining agent skills. If you're building reusable agent configurations for your team or your org, that's where the spec lives. Second, github.com/copilot — the product home page, always has the latest on features, pricing, and what's new. And third, docs.github.com — the official documentation. When you're back at your desk and trying to remember how to configure a specific MCP server or write a custom instruction, that's your reference.

The labs you worked through today gave you a complete, working Copilot configuration surface — from instructions and agents through MCP servers, hooks, orchestration, and the plugin distribution model. That's not a demo environment; that's a pattern you can take directly to your own repos and your own teams. Everything you built today — the agents, the skills, the MCP configurations, the hooks, the plugin — lives in your fork. Push it, share it, iterate on it.

If you want to go deeper on any of the patterns — the A2A handshake, the tmux meta-loop, the GitHub Agentic Workflows — the lab materials are yours to keep. They're designed to be self-contained, so you can revisit them or share them with colleagues who couldn't make it today. The repo README has setup instructions so anyone on your team can spin up the same environment and work through the labs at their own pace.

One thing I'd encourage: take the orchestration patterns from Labs 7, 13, and 14 and try them on a real task in your own codebase this week while the muscle memory is fresh. The difference between "I understand the concept" and "I've done this on my own code" is enormous.

From us — JohnHenry Hain and Bob O'Keefe, Senior Cloud Solution Architects at Microsoft — thank you for your time. We're around for questions, and we'd genuinely love to hear what you build with this.

Let's open it up for Q&A.

### Slide cues
- Section slide with glow rings
- Large rocket emoji: 🚀
- Title: "Thank You!"
- Tagline: "Start building with GitHub Copilot Skills today"
- Three resource pills: agentskills.io, github.com/copilot, docs.github.com
- Presenters: JohnHenry Hain and Bob O'Keefe, Sr. Cloud Solution Architects, Microsoft

### Transition
End of deck — open Q&A.
