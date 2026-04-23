---
module: M3
title: "Multi-agent orchestration — speaker script"
slide_source: workshop/slides/30-module-3.md
minutes: 30
phase: 3b
---

# M3 — Speaker script

Target audience: fluent Copilot CLI users who have run a custom agent
or two. The room knows what a sub-agent is. This module is about
picking the right orchestration shape, controlling budget, and
debugging when `/fleet` or a shared-context orchestrator goes wrong.

## 1. Open with the advanced problem

Do **not** start with "a sub-agent is an agent that runs inside…".
The room knows. Start with the decision.

**Verbatim hook (~60 seconds):**

> "Everyone here has run a custom agent. Some of you have wired an
> agent-of-agents with the `agent` tool in the `tools:` array. Over
> the next 30 minutes I want to answer the question you actually hit
> at scale: **five roles on one task — planner, implementer,
> reviewer, QA, security — do you run them serially in one session,
> use an agent-of-agents with shared context, fan out with `/fleet`,
> or background them with `/tasks`?** The wrong shape burns context
> you did not mean to burn, drops state between handoffs, and makes
> the resulting PR unreviewable."

Name the three failure modes out loud: **context bleed**, **token
cost**, **loss of reversibility**. Everything in this module is one
of those three in disguise.

Anchor lab: `labs/lab07.md` (builds the orchestrator you will see in
Demo A).

## 2. Demo script

**Copilot CLI only. No VS Code.** Every command runs in the workshop
repo.

### Demo A — four shapes on disk in 60 seconds each (~5 min)

```bash
cd ~/Coding_Projects/day-in-the-life-copilot-lab

# Shape 1 — single session, single agent. Plain copilot.
copilot --agent code-reviewer --no-custom-instructions \
  -p "review the last commit" --allow-all-tools

# Shape 2 — agent-of-agents. Read the orchestrator shape from lab07.
head -30 labs/lab07.md
sed -n '1,40p' .github/agents/planner.agent.md

# Shape 3 — /fleet dispatch. We will run this live in Demo C.
copilot help commands 2>&1 | sed -n "/Agents \/ Subagents/,/Code:/p"

# Shape 4 — background tasks. Just show the command exists.
copilot help commands 2>&1 | grep -E "/tasks|/fleet"
```

Narrate: "Same CLI, four different composition shapes. Pick one on
purpose."

### Demo B — the budget triangle (~4 min)

```bash
# Open an interactive session and walk the three budget knobs.
copilot --effort medium
```

Inside the session:

```
/context
/usage
/model
```

Talk through: `/context` (window fill), `/usage` (cost so far),
`/model` (switch tier mid-session). Then exit and point at the
docs:

```bash
head -40 docs/token-and-model-guide.md
```

Close the beat with: *"The three knobs are `/model`, `--effort`,
and `/compact` vs `/clear`. Orchestrators on premium, workers on
cheap, reset between phases."*

### Demo C — real `/fleet` on the last commit (~5 min)

```bash
copilot --agent planner --mode plan --add-dir .
```

Inside the session:

```
/fleet
"Run three parallel reviewers on the last commit — one for security, one for performance, one for style. Report back as three short bullet lists."
/tasks
/context
```

Narrate while it runs: point at `/tasks` showing the workers, read
the three result blocks aloud, then `/context` to show the
window delta. Land on: *"Three workers, three isolated contexts,
one conversation. That is the point."*

**Fallback if `/fleet` is cost-gated or the room has no network:**
Run the same three reviews sequentially, each as its own one-shot:

```bash
copilot --agent code-reviewer -p "security review of the last commit" --allow-all-tools
copilot --agent code-reviewer -p "performance review of the last commit" --allow-all-tools
copilot --agent code-reviewer -p "style review of the last commit" --allow-all-tools
```

You lose the parallelism, not the teaching outcome. Commit to the
fallback out loud — *"we are going sequential"* — so the room is
not confused about what they are watching.

### Demo D — the `agent` tool is the delegation primitive (~3 min)

```bash
grep -n "^tools:" .github/agents/*.agent.md
grep -l "\"agent\"" .github/agents/*.agent.md
```

Point at which agents have `agent` in their `tools:` array — those
are the ones that can actually delegate. Agents without it can
*describe* a handoff but cannot invoke another agent. This is a
silent failure class.

### Demo E — `/compact` vs `/clear` between phases (~3 min)

Still inside an interactive session:

```
/compact
/context
```

Then:

```
/clear
```

Narrate the difference: `/compact` summarizes in place (keeps the
plan, drops the chatter); `/clear` abandons the session entirely.
Use `/compact` between phases of the same task, `/clear` between
tasks. Do **not** `/clear` while workers are still running — you
will orphan them.

## 3. Timing cues

<!-- total: 30 min -->

- 0:00 — Open with the advanced problem. Name the three failure modes. (2 min)
- 2:00 — Slide: "Four composition shapes." Read each one-liner; ask the room for a real example of each. (3 min)
- 5:00 — Slide: "The context-isolation decision." (2 min)
- 7:00 — **Demo A** — four shapes on disk, 60 seconds each. (5 min)
- 12:00 — Slide: "Budget control — the three knobs." (2 min)
- 14:00 — **Demo B** — `/context`, `/usage`, `/model`. (4 min)
- 18:00 — Slide: "Real sub-agent dispatch — the Copilot CLI surface." Point at `copilot help commands`. (2 min)
- 20:00 — **Demo C** — live `/fleet` on the last commit. (5 min)
- 25:00 — **Demo D** — the `agent` tool is the delegation primitive. (2 min)
- 27:00 — **Demo E** — `/compact` vs `/clear` between phases. (2 min)
- 29:00 — Slide: "Takeaway." Flat over nested; pick the shape on purpose. (1 min, closes at 30:00)

## 4. Expected pitfalls

- **`/fleet` cost shock on stage.** Three workers on the premium default tier can spike the bill on a live demo. Pre-pin workers to a cheap tier for the demo (run `/model` before `/fleet`), or fall back to Demo C's sequential path. Document the choice out loud — the room learns from watching you budget.
- **No network / restricted environment.** `/fleet` and `/tasks` still work, but the workers hit API endpoints. If the venue blocks them, commit verbally to the sequential fallback before the demo starts, not after it fails.
- **Attendee asks "should I just always use `/fleet`?"** No — `/fleet` is wrong when workers need each other's output mid-flight. Name "plan → implement → review" as the classic anti-`/fleet` case (it is sequential, wants shared context, and the agent-of-agents shape is cheaper).
- **Fleet worker hangs.** Use `/tasks` to inspect and stop the stuck worker. Do not `/clear` the whole session — the orchestrator's plan is in there.
- **Agent without `agent` in its `tools:` list.** Symptom: the agent describes a delegation in prose but never invokes. Fix is in the agent file, not the prompt. Show `grep -l "\"agent\"" .github/agents/*.agent.md` during the explanation.
- **`/delegate` vs sub-agent delegation confusion.** `/delegate` is "send this whole session to GitHub so Copilot opens a PR remotely" — it is **not** local sub-agent dispatch. One question from the room always surfaces this; answer it by pointing at `copilot help commands`.
- **Context window misread.** `/context` shows the current session window — it does **not** show the sub-agent windows. Each `/fleet` worker has its own. Mention this explicitly so attendees do not over-count cost.

## 5. Q&A prompts

Seed these if the room is quiet:

- "Who has hit context bleed in an agent-of-agents setup — what was the tell?"
- "Anyone running `/fleet` regularly? How many workers before the tokens stop paying for themselves?"
- "How do you decide `--effort` on the orchestrator vs the workers? Is it a per-task call or a team-wide default?"
- "What's your `/compact` vs `/clear` rule of thumb today?"
- "Has anyone shipped a custom agent whose only job is to dispatch to other agents? What did its `tools:` array look like?"

## 6. Advanced-tip callouts

Drop these between slides as time permits. Each is ~30 seconds.

- **`/tasks` is the only place you see live sub-agent state.** `/context` and `/usage` show **your** session, not the workers'. When a `/fleet` run is spinning, `/tasks` is ground truth.
- **`--max-autopilot-continues` caps runaway workers.** If you autopilot a worker, put a ceiling on it. A default worker with no cap can loop dozens of continues on a single hand-off.
- **`/rewind` beats `/clear` for recovery.** When a turn goes sideways mid-orchestration, `/rewind` reverts the last turn's file changes and reasoning. `/clear` throws away the plan too.
- **Pin the orchestrator's model explicitly** — do not rely on the auto default. The orchestrator is the one agent where reasoning quality actually buys you something; everything else can ride cheap tiers.
- **`--mode plan` for the orchestrator, `--mode autopilot` for the workers.** The orchestrator should pause for confirmation; the workers should not. This composition is the whole point of having modes per-session.
- **The `agent` tool permission is contagious.** An agent with `agent` in its tools can dispatch to another agent with `agent` in *its* tools — that is how you end up with orchestrator-of-orchestrators by accident. Flatten when you see a three-deep chain.
- **`/delegate` is the out-of-band escape hatch.** When the local session is over budget and the work is mostly mechanical, `/delegate` hands it to GitHub for a PR. Use it as the exit, not the entry.
