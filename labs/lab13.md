---
title: "A2A Concepts with Copilot CLI ACP"
lab_number: 13
pace:
  presenter_minutes: 10
  self_paced_minutes: 35
registry: docs/_meta/registry.yaml
---

# 13 — A2A Concepts with Copilot CLI ACP

In this lab you'll learn what **agent-to-agent (A2A)** orchestration is,
how the **Agent Communication Protocol (ACP)** maps onto Copilot CLI's
local primitives (`task`, `write_agent`, `read_agent`), drive a concrete
**two-agent task** (an *implementer* and a *critic* working on the same
Node app), inspect the resulting transcript, and rehearse the three
failure modes every A2A system runs into in production.

> ⏱️ Presenter pace: 10 minutes | Self-paced: 35 minutes

> 💰 **Cost Budget**
> - Expected token footprint: ~50k in / ~15k out for the full
>   two-agent loop. The implementer + critic exchange is the
>   single most expensive pattern in the lab suite because each
>   peer re-reads the shared workspace every turn.
> - Cheaper alternative: keep the **critic** on `claude-haiku-4.5`
>   (criticism is mostly pattern-matching against a rubric) and
>   reserve `claude-opus-4.6` for the **implementer** when the
>   task is non-trivial. For the warm-up two-agent task in
>   Part A, both peers can run on `gpt-5-mini` to learn the
>   protocol without paying for premium reasoning.
> - Compaction trigger: cap each peer at the turn limit you set
>   in §13's failure-modes section, then `/clear` between Part A
>   (warm-up) and Part B (failure-mode rehearsal).
> - See [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md).

> 🛤️ **Choose your path** before you start:
>
> - **Live ACP path** — your local Copilot CLI is at the floor pinned in
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml)
>   (`copilot_cli_version_floor`). You'll spawn a real peer agent
>   subprocess and observe its turns.
> - **Concept / simulated path** — older CLI, restricted environment, or
>   air-gapped review. You'll run the same two-agent flow using only the
>   in-process `task` tool to dispatch sub-agents. Same learning
>   outcomes, no separate process tree.
>
> Both paths use the **Phase 3 Node app** (`node/`) as the working
> codebase so the lab series stays cumulative.

References:

- [`AGENTS.md`](../AGENTS.md) — agent suite (orchestrator, code-reviewer, planner, …)
- [`.github/agents/code-reviewer.agent.md`](../.github/agents/code-reviewer.agent.md)
- [`.github/skills/strategic-compact`](../.github/skills/strategic-compact) — context-hygiene skill cited in §13.4
- [Lab 07 — Multi-Agent Orchestration](lab07.md) — the orchestrator → dev → QA → review flow you'll extend here
- [Lab 10 — Reindex, Session Management & Memory](lab10.md) — session state primitives Lab 13 builds on
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — CLI version floor for the live ACP path

---

## 13.0 What is A2A — and what is ACP?

| Term | What it means here |
|------|--------------------|
| **A2A (agent-to-agent)** | A pattern where two or more agents — each with its own context window, tool allowlist, and system prompt — collaborate on one task by exchanging messages. |
| **ACP (Agent Communication Protocol)** | The wire-level contract that lets those agents speak to each other regardless of which model or runtime hosts them. Copilot CLI's `task` / `write_agent` / `read_agent` tools are the local in-process primitives that map onto ACP's peer-message shape. |
| **Peer agent** | An agent reachable over A2A. It's a peer (not a child) because it owns its own context and can refuse, push back, or disconnect. |
| **Sub-agent** | An agent dispatched *inside* the parent's context via the `task` tool. Cheaper than A2A, but the parent owns the transcript and the trust boundary is shared. |

**Key property:** an A2A peer is a *trust boundary*. It runs with its own
tool allowlist and its own system prompt. A sub-agent is *inside* your
trust boundary — anything it can do, you implicitly authorised.

### When to reach for A2A vs a single agent with sub-agents

Use the lighter pattern unless you actually need the heavier one. Most
"I need multi-agent!" intuitions are better served by a single agent
calling `task` with a tightly scoped prompt.

| Choose **single agent + sub-agents (`task`)** when… | Choose **A2A peers** when… |
|---|---|
| The work is one logical task with parallelisable research threads | Two roles must hold *opposing* incentives (e.g. implementer vs. critic) |
| You want a single transcript / session state | You need separate context windows so one peer's reasoning can't bias the other |
| You trust every tool the dispatched agent will call | You want a stricter tool allowlist on one of the peers (e.g. critic is read-only) |
| Latency and token cost matter | Determinism, audit trail, and role isolation matter more than tokens |

The single-agent-with-sub-agents pattern is what Lab 07 already teaches.
This lab is about the cases the Lab 07 pattern can't cleanly cover.

> 🪞 **Trust boundaries, restated.** When you call `task`, the sub-agent
> inherits your environment (cwd, env vars, MCP allowlist). When you
> spawn a peer over ACP, the peer is configured *separately* — it can be
> read-only, can be on a different model, and can even live in a
> different repo. That separation is the whole point.

---

## 13.1 Prerequisites

| Path | Prerequisite |
|------|--------------|
| Both | Copilot CLI installed and authenticated (Lab 01 setup) |
| Both | The Phase 3 Node app builds locally: `make test-node` is green |
| Live | Copilot CLI version `>= copilot_cli_version_floor` from the registry (run `copilot --version` to check) |
| Live | A second terminal pane (or tmux split) so you can watch the peer agent's pane |
| Concept | No extra setup — uses only the in-process `task` tool |

Quick check:

```bash
copilot --version            # compare against docs/_meta/registry.yaml
make test-node               # confirm baseline
```

---

## Part A — A two-agent task: implementer + critic

You will modify a small piece of the Node app (the Students repository's
list endpoint) using two agents:

| Peer | Role | Tool allowlist | Model hint |
|------|------|---------------|------------|
| `implementer` | Reads the failing test, edits the route, runs `vitest`. Owns write access. | full file edit + `bash` (scoped to `npm`/`pnpm`/`vitest`) | a coding-strong model (e.g. `claude-opus-4.6`) |
| `critic` | Reviews the diff, questions design choices, demands tests for edge cases. **Read-only**. | `view`, `grep`, `glob` only — no `edit` | a reasoning-strong model |

### A.1 Pick a target change

Use this contract for the worked example. (You can substitute any small
slice of the Node app; the pedagogy is the same.)

> Add a `?limit=N` query parameter to `GET /students`. Cap at 100. If
> `N` is non-numeric or negative, return `400` with a JSON error body
> matching the existing error shape. Keep existing tests green; add at
> least one new test per branch.

### A.2 Drive the flow from your main Copilot CLI session (concept path)

In the **concept / simulated** path you stay in one Copilot CLI session
and use the `task` tool to dispatch the two peers as sub-agents. The
trust boundary is fuzzy here — that's an *intentional* trade-off so
learners on locked-down environments can still complete the lab.

```text
You (driver) → task(name="implementer", agent_type="general-purpose",
                    mode="background", prompt="<contract from A.1 +
                    'edit code, run vitest, report when green'>")
            → task(name="critic", agent_type="rubber-duck",
                    mode="background", prompt="<contract from A.1 +
                    'review the implementer's diff; demand tests for
                    every branch; you may NOT edit files'>")
```

After both agents are spawned, drive the conversation:

```text
read_agent(agent_id="<implementer-id>", wait=true)   # see initial diff
write_agent(agent_id="<critic-id>",
            message="Here is the implementer's diff: <paste>. Critique
                     against the contract. List blocking issues only.")
read_agent(agent_id="<critic-id>", wait=true)        # collect critique
write_agent(agent_id="<implementer-id>",
            message="Critic findings: <paste>. Address blocking items
                     only; restate any you reject and why.")
```

Iterate until the critic returns *"no blocking issues"* or you hit your
turn cap (see §13.3.1).

### A.3 Drive the flow on the live ACP path

If your CLI is at the registry floor and exposes ACP-mode peer
registration, you can spawn the **critic** as its own CLI process with
its own configuration:

```bash
# Pane 2 — start the critic peer with a strict, read-only config.
COPILOT_AGENT_ID=critic copilot \
  --agent rubber-duck \
  --tool-allowlist 'view,grep,glob,lsp' \
  --listen-acp
```

In your **driver** pane (Pane 1), register the peer and exchange
messages using your CLI's ACP commands (the exact CLI subcommand names
follow the version pinned in
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml); check
`copilot --help`). Conceptually the loop is identical to A.2:

```text
register peer "critic" → send "review this diff" → receive critique
                       → forward to implementer → repeat
```

> 🔌 **Why the registry pin matters.** ACP-mode subcommand names have
> moved between CLI versions. The registry is the single source of
> truth — if your CLI's `--help` doesn't match what's described here,
> bump the floor (or stay on the concept path) rather than guessing.

### A.4 Inspect the transcript

Both peers retain their full conversation history. From the driver:

```text
list_agents()                    # shows status: running | idle | completed
read_agent(agent_id="<id>",      # since_turn=0 returns the full transcript
           since_turn=0)
```

Save the transcript to `node/.a2a-transcript-<date>.md` for later
review. Treat it as a first-class artifact — you'll quote it in the PR
body and again in §13.4 when you compare A2A patterns to single-agent
patterns.

---

## Part B — Failure modes and mitigations

Every A2A system runs into the same three pathologies. The point of
this part is to *deliberately* trigger each one in a controlled setting,
recognise the signature, and apply the mitigation.

### B.1 Looping (the critic that never says yes)

**Trigger.** Re-spawn the critic with this system prompt addition:
*"Always demand at least one more test, regardless of coverage."*

**What you'll see.** The implementer ships a diff. Critic demands "one
more edge case." Implementer adds it. Critic demands another. After 5
turns the diff is bloated and the actual contract from §A.1 has been
buried.

**Mitigation — turn cap.** Set a hard ceiling on rounds in the driver
contract. The driver, not the peers, owns this counter:

```text
MAX_TURNS = 4
on critic reply:
    if turn >= MAX_TURNS:
        force-resolve: ask critic to label remaining items
                       as "ship-blocking" or "follow-up", merge if no
                       ship-blocking remain.
```

This is a **maximum turns** / **iteration limit** rule. It belongs in
the driver, never the peers themselves.

### B.2 Context drift (the peer working from stale assumptions)

**Trigger.** After turn 2, edit the contract from §A.1 (e.g. raise the
cap from 100 to 500) but only update *one* peer.

**What you'll see.** The implementer codes against the new contract,
the critic reviews against the old one, and the loop never converges
because the two peers are arguing about different specs. Symptom: the
peers stop asking new questions and start repeating themselves.

**Mitigation — explicit hand-off contract / shared scratchpad.**
Promote the contract from §A.1 into a single shared doc that *both*
peers re-read at the top of every turn:

```text
node/.a2a/handoff.md
  ## phase
  ## inputs       (links to spec, failing test, current diff hash)
  ## outputs      (what the peer must return)
  ## open_questions
  ## acceptance   (the bar for "done")
```

Every driver message starts with: *"Re-read `node/.a2a/handoff.md`
first. Then: …"*. This is the **hand-off schema** mitigation — it costs
a handful of tokens per turn and pays for itself the first time
context drifts.

### B.3 Hand-off ambiguity (the under-specified contract)

**Trigger.** Replace the contract from §A.1 with the one-liner *"Make
the students endpoint better."*

**What you'll see.** Implementer picks an interpretation (caching?
pagination? validation?). Critic reviews against a *different* implicit
interpretation. The diff balloons; turn 3 is a meta-discussion about
what the task actually was.

**Mitigation — the hand-off contract from §B.2 *plus* an
acceptance-criteria gate.** Refuse to spawn peers until the
`acceptance` section of the hand-off doc is concrete. Rule of thumb:
if a junior engineer reading only the `acceptance` section can't tell
whether a PR meets the bar, the contract is too vague — fix that before
spending another A2A token.

> 💡 The orchestrator agent in [`AGENTS.md`](../AGENTS.md) already
> enforces this gate when you use the `/orchestrate` command — it
> refuses to spawn workers until the plan has acceptance criteria. Lab
> 13 is teaching you the *why* behind that behaviour so you can apply
> it without `/orchestrate`.

---

## 13.4 Where this fits in the wider toolkit

A2A is the *most expensive* coordination pattern in this repo. Reach
for the cheaper ones first:

| Pattern | When it wins |
|---|---|
| **Single agent**, well-prompted | Routine work, one role, one trust boundary |
| **Single agent + `task` sub-agents** (Lab 07) | Parallel research threads, same trust boundary |
| **Single agent + rubber-duck critique** | You want a sanity-check pass without standing up a peer (see the `rubber-duck` agent type and the `code-reviewer` custom agent) |
| **A2A peers** (this lab) | Roles must hold opposing incentives or live in different trust boundaries |
| **Orchestrator + tmux pattern** (Lab 14, next cycle) | A2A made operational across many phases — long-lived orchestrator pane, short-lived workers, `/clear` between phases |

Two skills already in this repo are direct prerequisites for getting A2A
right:

- **`rubber-duck`** (built-in agent type) — the "critic without standing
  up a peer" baseline. If a rubber-duck pass would have caught the
  issue, you didn't need A2A.
- **`strategic-compact`** (skill) — A2A burns context fast across both
  peers. Compact at phase boundaries, not on a timer.

---

## 13.5 Wrap-up checklist

Before you close the lab, confirm:

- [ ] You ran the two-agent loop end-to-end on at least one path (live or concept).
- [ ] You can name the three failure modes (looping, context drift, hand-off ambiguity) and the mitigation each one demands (turn cap, shared hand-off doc, acceptance gate).
- [ ] You can articulate, in one sentence, the rule for choosing A2A over a single agent with sub-agents.
- [ ] You saved the transcript from §A.4 somewhere reviewable.
- [ ] You re-read [`AGENTS.md`](../AGENTS.md) with fresh eyes — the orchestrator and rubber-duck entries should now read as A2A primitives, not just "more agents."

### Next steps

- **Lab 14** (next cycle) puts this pattern on rails with a tmux-based
  orchestrator deep-dive and shipped helper scripts. The hand-off doc
  schema introduced in §B.2 is the contract Lab 14 will automate.
- Try the two-agent loop on a real PR in your fork. The first time it
  catches a bug a single-agent flow missed, you'll feel why the
  pattern earns its overhead.
