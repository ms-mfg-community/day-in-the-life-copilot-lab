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
how the **Agent Client Protocol (ACP)** behind `copilot --acp` differs from Copilot CLI's
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
>   reserve a model from `models.premium` in the registry for the **implementer** when the
>   task is non-trivial. For the warm-up two-agent task in
>   Part A, both peers can run on `gpt-5-mini` to learn the
>   protocol without paying for premium reasoning.
> - Compaction trigger: cap the loop at the four-round limit set in
>   §13.3.2 (§13.4.1 explains why). Run `/clear` between Part A
>   (warm-up) and Part B (failure-mode rehearsal) **only after** you
>   have saved a checkpoint of the contract, both agent IDs, the models
>   you pinned and your turn counter — `/clear` drops all four, and a
>   saved transcript is not a substitute. No checkpoint, no `/clear`.
>   §13.3.4 shows how to write one and how Part B starts from it.
> - See [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md).

> 🛤️ **Choose your path** before you start:
>
> - **Live ACP path** — your local Copilot CLI is at the floor pinned in
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml)
>   (`copilot_cli_version_floor`). An ACP client you bring *and already
>   operate* (an ACP-capable editor or a script of your own, one that logs
>   its session — see §13.2) launches a real `copilot --acp` server as the
>   critic and you observe its turns.
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
- [`.copilot/lessons/`](../.copilot/lessons/) — markdown wiki agents use to preserve decisions across phase boundaries (cited in §13.5)
- [Lab 07 — Multi-Agent Orchestration](lab07.md) — the orchestrator → dev → QA → review flow you'll extend here
- [Lab 10 — Agent Memory: Personalities, Lessons, and Consolidation](lab10.md) — the wiki + schema primitives Lab 13 builds on
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — CLI version floor for the live ACP path

---

## 13.0 Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (confirmed GA, ~Aug 2026):** `/plugin`, `/mcp`, and
> `/skills` are real interactive commands backed by an in-terminal dashboard —
> you can discover, install, and configure plugins, MCP servers, and skills
> without hand-editing config files. The terminal also gained tabs for
> browsing issues/PRs/gists. Config-file editing still works and is what the
> underlying `extensions_manage` MCP tool inspects, but the dashboard is now
> the primary interactive path for a human at the prompt.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` (or the `/plugin` dashboard) | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `/plan` or `Shift+Tab` for plan mode vs `/autopilot` to toggle autopilot mode | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. Autopilot is a toggle you switch on — it is not the default. |
| **Mid-session model switch** | `/model MODEL-ID` (or `/model auto` to let Copilot choose) | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. The tier names are registry keys, not `/model` arguments. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to switch modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

## 13.1 What is A2A — and what is ACP?

| Term | What it means here |
|------|--------------------|
| **A2A (agent-to-agent)** | A pattern where two or more agents — each with its own context window, tool allowlist, and system prompt — collaborate on one task by exchanging messages. |
| **ACP (Agent Client Protocol)** | The protocol behind `copilot --acp`: an ACP *client* (an editor, an IDE, or a script) drives Copilot CLI as an *agent* — over stdio by default. It standardises client-to-agent communication; it is not a peer-to-peer agent protocol. Copilot CLI's `task` / `write_agent` / `read_agent` tools are separate, local primitives that give you the same two-agent shape inside one session. |
| **Peer agent** | An agent reachable over A2A. It's a peer (not a child) because it owns its own context and can refuse, push back, or disconnect. |
| **Sub-agent** | An agent the parent dispatches with the `task` tool. It gets its **own context window**, but it is spawned from the parent's session, so the parent owns the transcript and the trust boundary is shared. Cheaper than A2A. |

**Key property:** an A2A peer is a *trust boundary*. It runs with its own
tool allowlist and its own system prompt. A sub-agent is *inside* your
trust boundary — anything it can do, you implicitly authorised.

### 13.1.1 When to reach for A2A vs a single agent with sub-agents

Use the lighter pattern unless you actually need the heavier one. Most
"I need multi-agent!" intuitions are better served by a single agent
calling `task` with a tightly scoped prompt.

| Choose **single agent + sub-agents (`task`)** when… | Choose **A2A peers** when… |
|---|---|
| The work is one logical task with parallelisable research threads | Two roles must hold *opposing* incentives (e.g. implementer vs. critic) |
| You want a single transcript / session state | You need a separately configured process (its own tools, model and trust boundary), not just a separate context window |
| You trust every tool the dispatched agent will call | You want a stricter tool allowlist on one of the peers (e.g. critic is read-only) |
| Latency and token cost matter | Determinism, audit trail, and role isolation matter more than tokens |

The single-agent-with-sub-agents pattern is what Lab 07 already teaches.
This lab is about the cases the Lab 07 pattern can't cleanly cover.

> 🪞 **Trust boundaries, restated.** When you call `task`, the sub-agent
> inherits your environment (cwd, env vars, MCP allowlist). When you
> launch a peer with `copilot --acp`, the peer is a separate process with
> its own configuration — it can be read-only, can be on a different
> model, and can even live in a different repo. That separation is the
> whole point.

---

## 13.2 Prerequisites

> 📎 **Background (not hard prerequisites).** [Lab 11](lab11.md) and
> [Lab 12](lab12.md) are useful context: Lab 11 for the plugin /
> distribution mindset, Lab 12 for a concrete MCP integration you can
> hand to a peer agent in the A2A pattern introduced below.

| Path | Prerequisite |
|------|--------------|
| Both | Copilot CLI installed and authenticated (Lab 01 setup) |
| Both | **Multi-agent basics — [Lab 07](lab07.md) or equivalent:** you have delegated work from one Copilot CLI session to a sub-agent and checked its dispatch entry. This lab adds the `task`, `read_agent` and `write_agent` tool calls on top |
| Both | **Agent memory — [Lab 10](lab10.md) or equivalent:** you know the `.copilot/lessons/` wiki; §13.5 relies on it |
| Both | **Application-review basics:** you can read an HTTP status code and a JSON error body, run `vitest`, and read a `git diff` — you will judge the implementer's work with them |
| Both | The Phase 3 Node app builds locally: `make test-node` is green |
| Both | A clean `node/` tree — `git status --short -- node` prints nothing (if it lists files, commit or stash them first) — so the diff you review holds only this lab's edits |
| Both | Node dependencies installed: `pnpm -C node install` (first time only) |
| Live | Copilot CLI version `>= copilot_cli_version_floor` from the registry (run `copilot --version` to check) |
| Live | An ACP client you **already operate**: you know how to set its launch arguments, it can take a diff from you as a prompt and show you the reply, and it **logs the session**. This lab does not teach an ACP client or the transport — no such client? Use the concept path |
| Concept | No extra setup — uses only the in-process `task` tool |

Quick check — the clean-tree check goes first, before the install can
touch anything:

```bash
git status --short -- node   # prints nothing when node/ is clean
pnpm -C node install         # first time only — installs vitest, etc.
copilot --version            # compare against docs/_meta/registry.yaml
copilot --help | grep -q -- '--acp' && echo "ACP: yes" || echo "ACP: missing — bump CLI"
make test-node               # confirm baseline
```

Windows PowerShell has no `grep`; run this form of the ACP check in place
of the `copilot --help | grep` line above:

```powershell
if (copilot --help | Select-String -Quiet -SimpleMatch -- '--acp') { "ACP: yes" } else { "ACP: missing - bump CLI" }
```

---

## 13.3 Part A — A two-agent task: implementer + critic

You will modify a small piece of the Node app (the Students JSON list
endpoint at `node/web/routes/students-api.ts`) using two agents:

| Peer | Role | Tool allowlist | Model hint |
|------|------|---------------|------------|
| `implementer` | Reads the failing test, edits the route, runs `vitest`. Owns write access. | full file edit + `bash` (scoped to `npm`/`pnpm`/`vitest`) | a coding-strong model (an id from the registry's `models.premium`) |
| `critic` | Reviews the diff, questions design choices, demands tests for edge cases. **Read-only**. | `view`, `grep`, `glob` only — no `edit` | a reasoning-strong model |

### 13.3.1 Pick a target change

Use this contract for the worked example. (You can substitute any small
slice of the Node app; the pedagogy is the same.)

> Add a `?limit=N` query parameter to `GET /api/students` (the JSON
> list endpoint in `node/web/routes/students-api.ts` — **not** the
> `GET /students` HTML page route). Cap at 100. If `N` is non-numeric
> or negative, return `400` with a JSON error body matching the
> existing error shape. Keep existing tests green; add at least one
> new test per branch.

### 13.3.2 Drive the flow from your main Copilot CLI session (concept path)

In the **concept / simulated** path you stay in one Copilot CLI session
and use the `task` tool to dispatch the two peers as sub-agents. The
trust boundary is fuzzy here — that's an *intentional* trade-off so
learners on locked-down environments can still complete the lab.

> 🧭 **Who does what.** `task`, `read_agent`, `write_agent` and
> `list_agents` are **tool calls the model makes** — you never type
> them. You type plain-language instructions into your main Copilot CLI
> session, the **driver**, and it makes the calls. Every `task` call
> returns an **agent ID**, which `read_agent` and `write_agent` need;
> `list_agents` shows the IDs again if you lose one. The diagrams below
> show what the driver calls — the only text you paste is the block
> marked **paste-ready**.

```text
Main session → task(name="implementer", agent_type="general-purpose",
                    description="Implement limit change",
                    model="<an id from models.premium>",
                    prompt="<contract from §13.3.1 +
                    'edit code, run vitest, then return the diff and
                    the test result'>")
               (returns the implementer's agent ID; the driver reads
               the implementer's reply and waits for the diff — only
               then:)
            → task(name="critic", agent_type="rubber-duck",
                    description="Critique implementer diff",
                    model="claude-haiku-4.5",
                    prompt="<contract from §13.3.1 + the diff, pasted
                    in + 'review that diff; demand tests for every
                    branch; you may NOT edit files'>")
```

> 💸 **Pass `model=…` explicitly.** The cost-budget block at the top
> of this lab only holds if you pin the cheap model on the critic and
> the strong model on the implementer. The `task` tool defaults to
> your **session** model, which silently routes everything through
> whatever you have selected (often a premium-tier model) and blows the
> budget. The example above shows the canonical pinning — replace the
> placeholder with an id from `models.premium` in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).
>
> The `task` call itself needs `name`, `description` (a short label),
> `agent_type` and `prompt`; `model` is the optional field you are
> pinning here.

> 🚧 **Trust boundary on the concept path.** `agent_type="rubber-duck"`
> still has the full CLI tool surface for investigation (including
> `bash` and `lsp`); the "read-only" cell in the table above is
> enforced by **convention** on the concept path and by `--available-tools`
> on the live path in §13.3.3. Treat the concept path as a learning
> simulator, not a hardened sandbox.

> 🛑 **Set the turn cap before the first dispatch.** The loop runs for
> at most **four rounds**, and the driver — not the peers — owns the
> count. A **round** is one critic reply: round 1 is the critic's first
> review, round 2 its review of the implementer's first revision, and
> so on. If the critic has not said *"no blocking issues"* by its
> fourth reply, **stop**: send the implementer nothing more, ask the
> critic once to label every remaining item *ship-blocking* or
> *follow-up* (that request is not a fifth round), and have Copilot
> report the labelled list, the current diff and the test result back to
> you. What happens next is your call. §13.4.1 shows why the cap exists.

**Paste-ready — this is the text you type.** Replace `<contract>` with
the blockquote from §13.3.1 and `<premium-model-id>` with an id from
`models.premium` in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml),
then paste it into your main Copilot CLI session:

```text
You are the driver of a two-agent loop. Do all code work through the
task tool; you write no code yourself, only the notes files I ask you
for. As soon as a task call returns an agent ID, tell me what it is.

Contract: <contract>

1. Dispatch ONLY the implementer: name "implementer", agent_type
   "general-purpose", description "Implement limit change", model
   <premium-model-id>. Its prompt is the contract plus: "Edit the code
   but do not commit, run `pnpm -C node test`, then reply with the
   output of `git diff HEAD -- node` (print any new file in full) and
   the test result."
2. Wait for its reply. If the reply has no diff, ask for one. Do NOT
   dispatch the critic until you are holding the diff.
3. Dispatch the critic: name "critic", agent_type "rubber-duck",
   description "Critique implementer diff", model claude-haiku-4.5. Its
   prompt is the contract, the diff pasted in, and: "Review this diff
   against the contract. Demand a test for every branch. List blocking
   issues only. You may NOT edit files."
4. Run rounds. A round is one critic reply; after each, tell me "round
   N of 4". If the critic says "no blocking issues", stop and report.
   Otherwise write_agent its findings to the implementer (blocking
   items only; restate any it rejects and why; reply with the updated
   diff and test result), then write_agent the new diff to the critic.
5. After the critic's 4th reply, stop. Send the implementer nothing
   more. Ask the critic once to label each remaining item
   "ship-blocking" or "follow-up", then report that list, the current
   diff and the test result to me.
```

After the critic's first review, every round repeats this cycle. The
driver makes the calls; you watch the round count:

```text
write_agent(agent_id="<implementer-id>",
            message="Critic findings: <paste>. Address blocking items
                     only; restate any you reject and why. Then reply
                     with your updated diff and the test result.")
read_agent(agent_id="<implementer-id>", wait=true)   # collect revised diff
write_agent(agent_id="<critic-id>",
            message="Implementer's revised diff: <paste>. Critique
                     against the contract. List blocking issues only.")
read_agent(agent_id="<critic-id>", wait=true)        # collect critique
```

The loop ends when the critic returns *"no blocking issues"* or the cap
above is reached, whichever comes first.

### 13.3.3 Drive the flow on the live ACP path

`copilot --acp` does not register peers. It starts Copilot CLI as an
**Agent Client Protocol server** (stdio by default). The driver on this
path is an **ACP client** — an ACP-capable editor, or a script of your
own — that launches the server as the critic and then sends it
`initialize`, `session/new` and `session/prompt` messages. The help
output (`copilot --help`) documents no peer-registration subcommand; if
it lists `--acp` (§13.2), the CLI side of the live path is ready.

This path assumes an ACP client you **already operate** (§13.2): you
know how to set its launch arguments, send it a prompt and read the
reply, and it logs the session. The **implementer is reused from the
concept flow** — it is still a `task` sub-agent in your main Copilot
CLI session. Paste the instruction from §13.3.2 with its steps 3–5
replaced by *"3. Show me the diff and stop."* Only the **critic** moves
to the live server. The two sides cannot message each other, so **you**
carry the diff into your ACP client and the critique back to your main
session, by hand — and you count the rounds.

The server's configuration is fixed when it starts, so the critic's
read-only allowlist goes on the launch command. Your ACP client runs
something like:

```bash
# Launched by your ACP client — a strict, read-only critic.
copilot \
  --agent rubber-duck \
  --available-tools='view,grep,glob,lsp' \
  --acp
```

> 🪪 **Flag verification.** `--available-tools` is set when the server
> starts and applies to every session the client opens — it is the
> launcher, not the connecting client, that decides the critic's tools.
> Tool names follow the CLI's allowlist syntax — see
> `copilot --help | grep allow-tool` (PowerShell:
> `copilot --help | Select-String allow-tool`) for the canonical list
> and `--allow-tool='shell(git:*)'` syntax for scoped shell access. The
> CLI floor for the live path is pinned in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml); always
> cross-check `copilot --help` before assuming a flag exists.

Conceptually it is the loop from §13.3.2 with the critic behind your
ACP client:

```text
main session   implementer returns its diff (§13.3.2, steps 1–2)
you            paste the contract + diff into your ACP client
ACP client     start critic server → session/new → session/prompt
               "review this diff" → critique (logged by the client)
you            tell your main session: "pass these findings to the
               implementer and show me its revised diff"
main session   implementer returns a revised diff → repeat; the
               four-round cap from §13.3.2 still applies
```

> 🔌 **No ACP client? Stay on the concept path.** This lab does not
> ship an ACP client, so the live path needs one you bring. ACP support
> in Copilot CLI is a public-preview interface and its details can move
> between CLI versions — if you have no client you already know how to
> configure and use, or `copilot --help` does not list `--acp`,
> complete Part A on the concept path in §13.3.2 rather than guessing.

### 13.3.4 Inspect the transcript

On the concept path, both peers retain their full conversation history.
Ask your main session (the driver) to make these two calls — they are
tool calls, not commands you type:

```text
list_agents()                    # shows status: running | idle | completed
read_agent(agent_id="<id>",      # since_turn=0 returns the full transcript
           since_turn=0)
```

Save the transcript (on the live path, whatever your ACP client logged)
to `node/.a2a-transcript-<date>.md` for later review. Treat it as a
first-class artifact — you'll quote it in the PR body and again in
§13.5 when you compare A2A patterns to single-agent patterns.

**Write a checkpoint before you `/clear`.** A transcript is a record,
not a restart point: `/clear` empties your main session's context, and
with it the contract, the agent IDs, the pinned models and your round
counter. Paste this to Copilot first:

```text
Write node/.a2a/checkpoint.md (git-ignored scratch) containing: the
contract we used; the agent ID and pinned model of the implementer and
of the critic (run list_agents first so the IDs are exact); the round
we reached (N of 4); and why the loop stopped.
```

On the live path the critic has no agent ID, so add where your ACP
client logged its session. Part B then starts one of two ways:

- **Same session, no `/clear`:** nothing is lost, and each §13.4 trial
  dispatches fresh agents anyway.
- **After `/clear`:** tell Copilot to read `node/.a2a/checkpoint.md`,
  then dispatch fresh agents from the saved contract and models. Do not
  rely on the old agent IDs still being usable — keep them as labels
  for the transcript.

§13.5 covers when a decision deserves a durable `.copilot/lessons/`
entry instead.

---

## 13.4 Part B — Failure modes and mitigations

Every A2A system runs into the same three pathologies. The point of
this part is to *deliberately* trigger each one in a controlled setting,
recognise the signature, and apply the mitigation.

Each trial reruns the §13.3.2 loop with its trigger applied: paste that
instruction again and it dispatches a fresh implementer and critic. Each
trial starts with a **Reset first.** step, because a leftover from the
previous trial — a critic you told to always demand more, a contract
you edited, a diff still sitting in `node/` — can be the real reason
the next loop fails, and then you cannot tell the three signatures
apart. Every reset has the same three parts: the **normal critic**, the
**§13.3.1 contract** as written, and a clean `node/`, which you get by
parking the previous edits with `git stash`.

A stash is local to your clone and covers only `node/`. Git-ignored
files such as `node/.a2a/` stay where they are, and on a tree with no
changes the command just prints *No local changes to save*. The parked
edits are throwaway: when Part B is over, `git stash list` shows the
`lab13-…` entries on top, and `git stash drop` removes the newest one —
run it once per `lab13-…` entry, and leave any older stash that isn't
labelled `lab13-…` alone. (`git stash pop` instead puts the newest entry
back in `node/`, if you want to look at it first.)

### 13.4.1 Looping (the critic that never says yes)

**Reset first.** Park Part A's change, so the implementer has something
to implement:

```bash
git stash push -u -m "lab13-partA" -- node
```

The §13.3.2 instruction, as written, already holds the normal critic and
the §13.3.1 contract; the trigger below changes only the critic's prompt
and the cap.

**Trigger.** Re-spawn the critic with this system prompt addition:
*"Always demand at least one more test, regardless of coverage."* For
this trial only, delete the four-round limit from the paste-ready
instruction (the "of 4" in step 4 and all of step 5) so that nothing
but you can stop the loop, and stop it yourself after the critic's
fifth reply.

**What you'll see.** The implementer ships a diff. Critic demands "one
more edge case." Implementer adds it. Critic demands another. After 5
turns the diff is bloated and the actual contract from §13.3.1 has been
buried.

**Mitigation — turn cap.** Set a hard ceiling on rounds in the driver
contract — the one you set in §13.3.2 and lifted for this trial. The
driver, not the peers, owns this counter:

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

### 13.4.2 Context drift (the peer working from stale assumptions)

**Reset first.** Park §13.4.1's edits:

```bash
git stash push -u -m "lab13-trial1" -- node
```

Then start the loop from the §13.3.2 instruction exactly as written.
That retires the always-demand-more critic and puts the §13.3.1
contract and the four-round limit back.

**Trigger.** After turn 2, edit the contract from §13.3.1 (e.g. raise the
cap from 100 to 500) but only update *one* peer.

**What you'll see.** The implementer codes against the new contract,
the critic reviews against the old one, and the loop never converges
because the two peers are arguing about different specs. Symptom: the
peers stop asking new questions and start repeating themselves.

**Mitigation — explicit hand-off contract / shared scratchpad.**
Promote the contract from §13.3.1 into a single shared doc that *both*
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

### 13.4.3 Hand-off ambiguity (the under-specified contract)

**Reset first.** Park §13.4.2's edits:

```bash
git stash push -u -m "lab13-trial2" -- node
```

Then start from the §13.3.2 instruction with its normal critic and
four-round limit, and let the trigger below replace the contract, so
nothing of §13.4.2's 500 cap survives. One thing can: if you wrote
`node/.a2a/handoff.md` in §13.4.2, it is git-ignored, so the stash left
it, and it still describes the 500 cap. Delete it now, or overwrite it
for this trial's task when you reach the mitigation.

**Trigger.** Replace the contract from §13.3.1 with the one-liner *"Make
the students endpoint better."*

**What you'll see.** Implementer picks an interpretation (caching?
pagination? validation?). Critic reviews against a *different* implicit
interpretation. The diff balloons; turn 3 is a meta-discussion about
what the task actually was.

**Mitigation — the hand-off contract from §13.4.2 *plus* an
acceptance-criteria gate.** Refuse to spawn peers until the
`acceptance` section of the hand-off doc is concrete. Rule of thumb:
if a junior engineer reading only the `acceptance` section can't tell
whether a PR meets the bar, the contract is too vague — fix that before
spending another A2A token.

> 💡 The repository's
> [`orchestrate.prompt.md`](../.github/prompts/orchestrate.prompt.md)
> sequences agents and aggregates their hand-off documents, but it does
> **not** enforce an acceptance-criteria gate — and it is a prompt file
> for IDE chat (VS Code, Visual Studio, JetBrains), not a Copilot CLI
> command. In Copilot CLI **you** are the gate: write the `acceptance`
> section of the hand-off doc before you dispatch a peer.

---

## 13.5 Where this fits in the wider toolkit

A2A is the *most expensive* coordination pattern in this repo. Reach
for the cheaper ones first:

| Pattern | When it wins |
|---|---|
| **Single agent**, well-prompted | Routine work, one role, one trust boundary |
| **Single agent + `task` sub-agents** (Lab 07) | Parallel research threads, same trust boundary |
| **Single agent + rubber-duck critique** | You want a sanity-check pass without standing up a peer (see the `rubber-duck` agent type and the `code-reviewer` custom agent) |
| **A2A peers** (this lab) | Roles must hold opposing incentives or live in different trust boundaries |
| **Orchestrator + tmux pattern** ([Lab 14](lab14.md)) | A2A made operational across many phases — long-lived orchestrator pane, short-lived workers, `/clear` between phases |

Two existing building blocks are direct prerequisites for getting A2A
right:

- **`rubber-duck`** (built-in agent type) — the "critic without standing
  up a peer" baseline. If a rubber-duck pass would have caught the
  issue, you didn't need A2A.
- **`.copilot/lessons/`** (markdown wiki, Lab 10) — A2A burns context fast
  across both peers. Before `/clear` at a phase boundary, promote durable
  decisions into a lesson file so the next peer can recall them without
  replaying the whole transcript.

---

## 13.6 Wrap-up checklist

Before you close the lab, confirm:

- [ ] You ran the two-agent loop end-to-end on at least one path (live or concept).
- [ ] You can name the three failure modes (looping, context drift, hand-off ambiguity) and the mitigation each one demands (turn cap, shared hand-off doc, acceptance gate).
- [ ] You can articulate, in one sentence, the rule for choosing A2A over a single agent with sub-agents.
- [ ] You saved the transcript from §13.3.4 somewhere reviewable.
- [ ] You re-read [`AGENTS.md`](../AGENTS.md) with fresh eyes — the `orchestrator` and `code-reviewer` entries should now read as A2A roles (coordinator and critic), not just "more agents."

### 13.6.1 Next steps

- **[Lab 14](lab14.md)** puts this pattern on rails with a
  tmux-based orchestrator deep-dive and shipped helper scripts. The
  hand-off doc schema introduced in §13.4.2 is the contract Lab 14 will
  automate.
- Try the two-agent loop on a real PR in your fork. The first time it
  catches a bug a single-agent flow missed, you'll feel why the
  pattern earns its overhead.

## 13.7 Cleanup

<!-- @include docs/_partials/cleanup.md — do not edit inline; edit the partial and re-sync. -->
> 🧹 **Cleanup — leave the machine the way you found it.**
> Run this checklist before moving to the next lab. Per-lab specifics (named
> agent / hook / extension files this lab created) should already have been
> reverted in the steps above; this is the generic sweep that catches the
> long-tail.

🖥️ **In your terminal:**

1. **Stop background processes.** Anything you started in the foreground with
   `&` or in another tmux pane (dev servers, watchers, `gh aw` long-runs,
   tail-follows). If you used the bash tool in async mode, make sure those
   shells are stopped.

   **WSL/Bash:**
   ```bash
   jobs -l                       # any background jobs in this shell?
   # kill them by PID — never `pkill`/`killall`
   ```

   **PowerShell:**
   ```powershell
   Get-Job                       # any background jobs?
   Get-Job | Stop-Job; Get-Job | Remove-Job
   ```

2. **Restore Copilot CLI config if you mutated it.** Some labs ask you to
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json`. If you stashed the original, restore it now.
   If you edited in place without backing up, check `git status` in the lab
   repo (workspace configs) and revert anything you didn't mean to keep.

   **WSL/Bash:**
   ```bash
   # If you saved a backup like ~/.copilot/config.json.bak:
   [ -f ~/.copilot/config.json.bak ] && mv ~/.copilot/config.json.bak ~/.copilot/config.json
   ```

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** These directories accumulate
   across labs and are safe to clean once you've finished:

   ```bash
   # Per-session scratch (safe to inspect; delete only what this lab created):
   ls ~/.copilot/lessons/        2>/dev/null
   ls node/.a2a/                  2>/dev/null
   ls node/.a2a-transcript-*.md   2>/dev/null
   ls .git/CLAB_SUMMARY.md        2>/dev/null
   ```

   Delete only files that this lab created. Do not blanket-delete
   `~/.copilot/lessons/` if other sessions wrote to it.

5. **Revert any `core.hooksPath` or other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise.

   ```bash
   git config --get core.hooksPath
   # if set to a lab path, unset:
   git config --unset core.hooksPath
   ```

6. **Confirm working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Any unexpected files (untracked agents, hooks, extensions, scratch
   notebooks) should be removed or moved out of the repo before continuing.

7. **Verify build is still green.** Optional but recommended after labs that
   touched hooks, agents, or skills:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept) and the build is clean, you're ready for the next lab.
<!-- @end-include docs/_partials/cleanup.md -->
