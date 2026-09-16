---
module: M6
title: "A2A / ACP + tmux orchestrator meta-loop"
anchor_labs: [lab13, lab14]
minutes: 25
phase: 3c
---

# M6 — A2A / ACP + tmux orchestrator meta-loop (flagship)

## The advanced problem

You already run sub-agents. You have hit the ceiling: shared context poisons every hand-off, `/clear` between phases throws away the plan you wanted to keep, and when one worker loops for 20 minutes you have no clean way to **freeze it, review its output, hand its work to a fresh reviewer, and continue**. That is the problem two tools solve together:

- **A2A / ACP** — `--acp` turns the CLI into an **Agent Client Protocol server** so a second agent (local or remote) can drive it as a peer. Each peer has its own context, tool allowlist, and trust boundary.
- **tmux-orchestrator meta-loop** — one never-cleared orchestrator pane coordinating short-lived `worker` and `qa` panes that get `/clear`-ed between phases, with hand-off state living on disk.

Together: a repeatable `plan → implement → handoff → clear → qa → clear → next` cycle that scales past one session without burning context.

Anchor labs: `labs/lab13.md` (A2A / ACP concepts), `labs/lab14.md` (tmux orchestrator pattern — the meta-loop that built this repo).

---

## A2A vs sub-agents — the trust-boundary distinction

Both ship in the CLI; they are **not interchangeable**.

- **Sub-agent via `task` tool** — dispatched *inside* the parent's context. Cheaper. The parent owns the transcript. Anything the sub-agent can do, you implicitly authorised.
- **A2A peer via `--acp`** — an agent reachable over the Agent Communication Protocol. It runs with **its own** tool allowlist and **its own** system prompt. It can refuse, push back, or disconnect. Trust boundary is explicit.

Reach for the lighter shape unless you actually need the heavier one. Most "I need multi-agent!" intuitions are better served by a single agent calling `task` with a tightly scoped prompt.

---

## The `--acp` flag, verbatim from `copilot --help`

```
--acp                   Start as Agent Client Protocol server
```

One flag, one behaviour: the CLI listens on stdio/stdout as an ACP server instead of starting an interactive session. Your *other* agent (a Copilot CLI session, a different runtime, a test harness) becomes the ACP **client** and drives the session through ACP messages.

This is the primitive. The local in-process primitives — `task`, `write_agent`, `read_agent` — map onto the same peer-message shape, which is why `labs/lab13.md` teaches both paths on one mental model.

---

## The tmux meta-loop — one diagram, three rules

```
                      plan → implement → handoff → clear → qa → clear → next
┌─ ORCHESTRATOR pane ─────────────────┐     ┌─ WORKER pane ─┬─ QA pane ─────┐
│  never /clear-ed                    │ ──▶ │  /clear-ed    │  /clear-ed    │
│  owns .copilot/session-state/*      │     │  between      │  between      │
│  writes hand-off docs               │ ◀── │  phases       │  phases       │
└─────────────────────────────────────┘     └───────────────┴───────────────┘
```

Three rules — break any one and the loop collapses:

1. **The orchestrator pane is never cleared.** It is the only place the end-to-end plan lives.
2. **The worker pane is cleared between every phase.** This is the whole point — a fresh context window stops the previous phase's scratch work from poisoning the next.
3. **Hand-off state lives on disk**, not in chat. The orchestrator writes a doc, the next pane reads the doc. Panes are transient; the files are the contract.

There is no IPC magic. It is panes, files, and `/clear`.

---

## The scripts that make it a loop

`scripts/orchestrator/` ships three scripts — this is the whole runtime:

- `scripts/orchestrator/tmux-start.sh` — creates the `copilot-orch` session with `orchestrator` + `worker` + `qa` panes. Named panes so later scripts never rely on numeric indices.
- `scripts/orchestrator/handoff.sh <phase>` — writes a structured hand-off doc using the Lab 13 §B.2 schema (phase / inputs / outputs / open_questions / acceptance) into the session workspace. Prints the doc's path on stdout so you can pipe it into the next pane.
- `scripts/orchestrator/clear-context.sh --pane worker` — sends `/clear` into the named pane. Supports `--dry-run`.

Five lines of `tmux send-keys`, a schema on disk, two conventions. That is the mechanism.

---

## The cycle in commands

```bash
# Kick off the session.
./scripts/orchestrator/tmux-start.sh

# Orchestrator produces a hand-off for the worker.
./scripts/orchestrator/handoff.sh 14-courses-dev \
  --role orchestrator \
  --input "endpoint GET /api/courses?department=..." \
  --accept "controller + unit test + integration test"

# Worker implements in its pane. When it is done:
./scripts/orchestrator/handoff.sh 14-courses-dev \
  --role dev \
  --output "patch at src/Controllers/CoursesController.cs, tests green"

# Orchestrator reads the output doc, then /clears the worker.
./scripts/orchestrator/clear-context.sh --pane worker

# QA runs in its own pane against the hand-off doc.
./scripts/orchestrator/handoff.sh 14-courses-qa --role qa --output "PASS"
./scripts/orchestrator/clear-context.sh --pane qa
```

The orchestrator never sees more than a one-line summary of each phase. That is why it fits.

---

## WSL caveat — this is the Lab 14 compatibility matrix

`labs/lab14.md` carries a matrix. Read it before you promise tmux meta-loop to a Windows audience.

| Tier | Environment | Status |
|------|-------------|--------|
| ✅ Supported | Native macOS, Native Linux (Ubuntu 22.04+ / Debian 12+ / Fedora 39+) | Run as-is |
| ⭐ Recommended on Windows | WSL2, tmux + Copilot CLI installed **inside** the distro, repo cloned under **Linux `$HOME`** (e.g. `~/repos/…`) | Run as-is |
| ⚠️ Allowed but degraded | WSL2 with repo under `/mnt/c/…` | File I/O ~10× slower, file-watchers drop events, `inotify` unreliable, `send-keys` can stall |
| ❌ Unsupported | Windows PowerShell-only (no WSL) | No tmux, no POSIX filesystem; `preflight.ps1 -Lab14` FAILs on purpose |
| ❌ Not tested | WSL1 | `send-keys` silently drops; upgrade with `wsl --set-version <distro> 2` |
| ✅ Supported | GitHub Codespaces | tmux available via the devcontainer post-create |

Two non-obvious rules: **"WSL2" alone is not enough** — where the *repo* lives matters. **The live workshop does not run on Windows PowerShell** — the preflight script is there to *tell you* you need WSL2 or Codespaces, not to replace them.

---

## Why this earns the flagship slot

Three things the meta-loop buys that no simpler shape does:

- **Context discipline under a deadline.** Every phase starts on a clean worker. Long-running orchestration no longer collapses into "context-full, start over." This is the single largest token-cost lever in the workshop.
- **Reviewable hand-offs.** The schema on disk is a diff target. A code reviewer can read the phase docs in chronological order and reconstruct every decision — impossible when state lived only in a single chat log.
- **A2A-ready without rewriting.** Once the worker pane is a discrete process with a hand-off schema, swapping `copilot` for `copilot --acp` behind an ACP client is a one-line change. The meta-loop is the *forcing function* that got your architecture ready for A2A.

If you ship one pattern out of this workshop, this is the one.

---

## Expected failure modes

- **Running on WSL1 or `/mnt/c/` and wondering why `send-keys` drops.** It is not your script; it is the matrix. Run `scripts/preflight.sh --lab14` first.
- **Clearing the orchestrator pane.** The orchestrator is the plan. Treat it as append-only. Use `/compact` there, never `/clear`.
- **Skipping the `handoff.sh` doc and typing a summary directly into the next pane.** You have just reinvented chat-as-IPC. The doc is the contract; if it is not on disk, it did not happen.
- **Nesting orchestrators of orchestrators.** A three-deep chain is a smell. Flatten: one orchestrator, N workers, done.
- **Treating `--acp` as the same thing as sub-agent dispatch.** It is not. `--acp` runs the CLI as a *server* for an external client; `task` dispatches a sub-agent *inside* your session. Different trust boundaries, different cost profiles.
- **Pinning the orchestrator to a cheap model.** The orchestrator is the one pane where reasoning quality pays off. Workers ride `claude-haiku-4.5` / `gpt-5-mini` per `docs/token-and-model-guide.md`; orchestrator stays on a premium tier.

---

## Takeaway

A2A is the trust-boundary story: `--acp` turns Copilot CLI into a peer a different agent can drive. tmux-orchestrator is the *context-discipline* story: a never-cleared orchestrator coordinating cleared worker + qa panes with hand-off docs on disk. Read the matrix before you promise it on Windows. Read `labs/lab13.md` and `labs/lab14.md` for the full walk-through.

---

## What's next

- See [`workshop/slides/56-module-5c-copilot-cli-extensions.md`](56-module-5c-copilot-cli-extensions.md) and [`labs/lab-copilot-cli-extensions.md`](../../labs/lab-copilot-cli-extensions.md) for the deterministic-hook × probabilistic-extension synergy pattern.
- M5b — [`gh` extensions](55-module-5b-gh-extensions.md) (anchor lab: `labs/lab-gh-extensions.md`) — build your own `gh` command that calls an LLM and wires into a git pre-commit hook.
