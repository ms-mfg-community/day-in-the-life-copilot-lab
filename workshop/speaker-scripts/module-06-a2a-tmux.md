---
module: M6
title: "A2A / ACP + tmux orchestrator meta-loop — speaker script"
slide_source: workshop/slides/60-module-6.md
minutes: 25
phase: 3c
---

# M6 — Speaker script (flagship)

Target audience: fluent Copilot CLI users who run sub-agents and
have hit the real ceiling — context bleed across phases, no clean
way to pause and review a long-running worker, no reproducible
hand-off story. This is the flagship module. 25 minutes.

## 1. Open with the advanced problem

Do **not** start with "A2A stands for agent-to-agent." The room
knows. Start with the ceiling you actually hit.

**Verbatim hook (~60 seconds):**

> "Everyone here has run sub-agents. You have hit the ceiling: one
> worker loops for 20 minutes, you have no clean way to freeze it,
> review its output, hand the work to a fresh reviewer, and
> continue. `/clear` throws away the plan you wanted to keep.
> Shared context poisons every hand-off. That is the problem two
> tools solve together. **A2A over ACP** — `copilot --acp` turns
> the CLI into an Agent Client Protocol server so a second agent
> can drive it as a peer, each peer with its own context and tool
> allowlist. **The tmux orchestrator meta-loop** — one never-
> cleared orchestrator pane coordinating short-lived worker and
> qa panes that get `/clear`-ed between phases, with hand-off
> state living on disk. Together: `plan → implement → handoff →
> clear → qa → clear → next`. Repeatable. This is the pattern
> that built this repo."

Anchor labs: `labs/lab13.md` (A2A / ACP concepts), `labs/lab14.md`
(the tmux meta-loop with its compatibility matrix).

## 2. Demo script

**Copilot CLI + tmux. Run every demo in the workshop repo on a
supported environment — native macOS, native Linux, or WSL2 with
repo under `$HOME`. If you are on `/mnt/c/` or WSL1 or Windows-
only PowerShell, do not run demos C–E live; narrate from the
files instead.**

### Demo A — `--acp` is one flag in `copilot --help` (~2 min)

```bash
copilot --help 2>&1 | grep -A1 -- '--acp'
```

Expected output — read it on stage:

```
--acp                   Start as Agent Client Protocol server
```

Narrate: *"One flag, one behaviour. The CLI listens on stdio/stdout
as an ACP server instead of starting an interactive session. Your
other agent becomes the ACP client and drives the session through
ACP messages. This is the primitive A2A is built on."*

Then contrast with sub-agent dispatch:

```bash
copilot help commands 2>&1 | grep -E "^  /fleet|^  /tasks"
```

*"`/fleet` and `/tasks` dispatch sub-agents inside your session —
same trust boundary. `--acp` is a different trust boundary: a peer
with its own tool allowlist. Pick the lighter one unless you
actually need the heavier."*

### Demo B — the tmux meta-loop diagram in the lab (~3 min)

```bash
sed -n "160,210p" labs/lab14.md
```

Walk the ASCII diagram in `labs/lab14.md` on stage. Name the three
rules out loud:

1. The orchestrator pane is never cleared.
2. The worker pane is cleared between every phase.
3. Hand-off state lives on disk, not in chat.

*"There is no IPC magic. Panes, files, and `/clear`. That is the
whole mechanism."*

### Demo C — the three scripts that make it a loop (~4 min)

```bash
ls scripts/orchestrator/
head -30 scripts/orchestrator/tmux-start.sh
head -30 scripts/orchestrator/handoff.sh
head -30 scripts/orchestrator/clear-context.sh
```

Walk each one:

- `scripts/orchestrator/tmux-start.sh` — creates the `copilot-orch`
  session with named panes `orchestrator`, `worker`, `qa`. Named
  panes so later scripts never depend on numeric indices.
- `scripts/orchestrator/handoff.sh <phase>` — writes a structured
  hand-off doc using the Lab 13 §B.2 schema (phase / inputs /
  outputs / open_questions / acceptance). Prints the doc's path
  on stdout.
- `scripts/orchestrator/clear-context.sh --pane worker` — sends
  `/clear` into the named pane. `--dry-run` prints instead of
  sending.

*"Five lines of `tmux send-keys`, a schema on disk, two
conventions. That is the runtime."*

### Demo D — one full cycle live (~5 min)

Pre-flight on a supported env:

```bash
./scripts/orchestrator/tmux-start.sh
```

Then attach to the session the script prints, or on stage narrate
the pane layout. From the orchestrator pane:

```bash
./scripts/orchestrator/handoff.sh 14-courses-dev \
  --role orchestrator \
  --input "endpoint GET /api/courses?department=..." \
  --accept "controller + unit test + integration test"
```

Read the doc the script wrote. *"This is what the worker pane
reads. Nothing lives in my chat."*

Worker finishes. Back in orchestrator:

```bash
./scripts/orchestrator/clear-context.sh --pane worker --dry-run
./scripts/orchestrator/clear-context.sh --pane worker
```

*"`--dry-run` first, then real `/clear`. Worker is back to a clean
context for the next phase. Orchestrator never saw the chatter —
just the one-line output doc."*

Repeat the same for `qa`:

```bash
./scripts/orchestrator/handoff.sh 14-courses-qa --role qa --output "PASS"
./scripts/orchestrator/clear-context.sh --pane qa
```

Close the beat: *"`plan → implement → handoff → clear → qa → clear
→ next`. The worker and qa panes burn through fresh contexts; the
orchestrator keeps the plan."*

**Fallback if tmux is unavailable or the room is on a degraded
env:** narrate the same sequence against `labs/lab14.md` sections
14.3–14.5. You lose the live send-keys moment, not the teaching
outcome. Commit to the fallback out loud — *"we are going
read-only because this room is on `/mnt/c/`"* — so the room is
not confused about what they are watching.

### Demo E — the Lab 14 compatibility matrix, read verbatim (~3 min)

```bash
sed -n "60,80p" labs/lab14.md
```

Read the six rows of the matrix aloud. Emphasise two rules:

- **"WSL2" alone is not enough.** Where the *repo* lives matters.
  A WSL2 shell pointed at `/mnt/c/Users/.../repo` is the **degraded**
  row, not the recommended row. Cross-boundary I/O is roughly 10×
  slower, file-watchers drop events, `inotify` is unreliable, and
  `tmux send-keys` round-trips can stall.
- **The live workshop does not run on Windows PowerShell.** The
  preflight script `scripts/preflight.ps1` exists to *tell you* you
  need WSL2 or Codespaces — it is not a substitute for them. WSL1
  is also out; upgrade with `wsl --set-version <distro> 2`.

*"If you promise tmux-orchestrator to a Windows audience without
reading this matrix first, you will eat ten minutes of debugging
silent `send-keys` drops on stage. Run `scripts/preflight.sh
--lab14` before the session, not during."*

### Demo F — why this earns the flagship slot (~2 min)

```bash
head -30 docs/token-and-model-guide.md
```

State the three payoffs out loud:

- **Context discipline under a deadline.** Every phase starts on a
  clean worker. Single largest token-cost lever in this workshop.
- **Reviewable hand-offs.** The schema on disk is a diff target.
  A reviewer can read phase docs in order and reconstruct every
  decision — impossible when state lived only in chat.
- **A2A-ready without rewriting.** Once the worker pane is a
  discrete process with a hand-off schema, swapping `copilot` for
  `copilot --acp` behind an ACP client is a one-line change. The
  meta-loop forces the architecture into an A2A-ready shape.

Close the module: *"If you ship one pattern out of this workshop,
ship this one."*

## 3. Timing cues

<!-- total: 25 min -->

- 0:00 — Hook: the ceiling — context bleed, `/clear` burns the plan, no hand-off story. Introduce the two tools together. (2 min)
- 2:00 — Slide: "A2A vs sub-agents — the trust-boundary distinction." (2 min)
- 4:00 — **Demo A** — `copilot --help | grep --acp` + contrast with `/fleet` / `/tasks`. (2 min)
- 6:00 — Slide: "The `--acp` flag, verbatim from copilot --help." (1 min)
- 7:00 — Slide: "The tmux meta-loop — one diagram, three rules." (2 min)
- 9:00 — **Demo B** — walk the Lab 14 diagram in `labs/lab14.md`. (3 min)
- 12:00 — Slide: "The scripts that make it a loop." (1 min)
- 13:00 — **Demo C** — `scripts/orchestrator/*.sh` walkthrough. (3 min)
- 16:00 — **Demo D** — one full `tmux-start → handoff → clear → qa → clear` cycle live. (4 min, tight)
- 20:00 — Slide: "WSL caveat — this is the Lab 14 compatibility matrix." (1 min)
- 21:00 — **Demo E** — read the compatibility matrix verbatim; emphasise the two non-obvious rules. (2 min)
- 23:00 — **Demo F** — why this earns the flagship slot; three payoffs. (1 min)
- 24:00 — Slide: "Takeaway." A2A is the trust-boundary story; tmux-orchestrator is the context-discipline story; read the matrix. (1 min, closes at 25:00)

## 4. Expected pitfalls

- **Running demo D on `/mnt/c/` or WSL1 on stage.** `tmux send-keys` drops events silently; file-watchers miss writes. Check `scripts/preflight.sh --lab14` output **before** the session. If the preflight was not run, commit to the read-only fallback (narrate against `labs/lab14.md` sections 14.3–14.5) and say so out loud.
- **Attendee asks "is `--acp` the same as a sub-agent?"** No. `--acp` runs the CLI as a *server* that an external ACP *client* drives — separate process, separate trust boundary. `/fleet` and `/tasks` dispatch sub-agents *inside* your session — shared trust boundary. Show the two commands side-by-side to make it visible.
- **Clearing the orchestrator pane live.** It is the only place the plan exists. Treat it as append-only. Use `/compact` in the orchestrator, never `/clear`. Call this out during demo D before you near the `clear-context.sh` step — reduces the risk someone asks mid-demo.
- **Running `clear-context.sh` without `--dry-run` first.** Always preview. The dry-run is cheap and the failure mode (wiping the wrong pane) is expensive.
- **Panes drift off the named convention.** `worker` and `qa` are **names**, not indices. If someone has customised their tmux config with numeric addressing, the scripts will target the wrong pane. Demo C's walkthrough pre-empts this — call it out.
- **Attendee wants to nest orchestrators.** Three-deep chains are a smell. Flatten: one orchestrator, N workers, done. If someone pushes back, ask them to name the failure mode the extra layer solves; usually there is none.
- **`--acp` demo against a running Copilot CLI session.** The current session is the client, not the server. Running `copilot --acp` in the same pane does not "upgrade" it. If you want a live ACP demo (beyond the `--help` inspection) you need a second process as the client — out of scope for a 25-minute module; refer to `labs/lab13.md` A.3 (*"Drive the flow on the live ACP path"*).
- **Mixing the Codespaces fallback with the native-macOS timing.** Codespaces is `✅ Supported` in the matrix but some tmux fonts render the ASCII box-drawing poorly. Pre-check your terminal font before Demo B.

## 5. Q&A prompts

Seed these if the room is quiet:

- "Who is running a tmux-orchestrator pattern today? How many panes, and where does your hand-off state live — disk, memory, chat?"
- "Has anyone driven `copilot --acp` from a non-Copilot ACP client? What did you use — a test harness, a different runtime, another CLI?"
- "What is your rule for when a task deserves A2A vs sub-agent dispatch? Where is the line?"
- "What made you stop clearing context between phases — if you did stop? Or are you still `/clear`-ing and losing state?"
- "How do you review a multi-phase agent workflow after the fact — do you read chat transcripts, hand-off docs, or git history?"
- "For the Windows folks: who is on WSL2 with the repo under `$HOME`, versus `/mnt/c/`? What did the `/mnt/c/` path cost you in practice?"

## 6. Advanced-tip callouts

Drop these between slides as time permits. Each is ~30 seconds.

- **The hand-off doc schema is the real contract.** Lab 13 §B.2 defines it: `phase / inputs / outputs / open_questions / acceptance`. Stick to it verbatim; every script downstream depends on those field names.
- **`handoff.sh --to-pane` + `--session` can push a hand-off doc into a pane automatically.** Optional, but it removes the copy-paste step and is the closest thing to "ACP messages" in the shell-only setup.
- **`clear-context.sh --dry-run` is part of the review loop.** Use it as a visual confirmation that you are about to `/clear` the pane you actually meant to `/clear`. Cheap insurance.
- **`copilot --acp` does not print a banner.** It just starts listening. If you are wondering whether it worked, it did — ACP clients are your diagnostic signal, not the CLI.
- **`--acp` plus `--allow-all-tools` is the non-interactive A2A shape.** An ACP client cannot answer permission prompts. Either pre-authorise with `--allow-all-tools` (in trusted environments) or narrow with `--allow-tool` / `--deny-tool`.
- **Pin the orchestrator model explicitly.** Orchestrator on `claude-opus-4.7` or `gpt-5.3-codex`; workers on `claude-haiku-4.5` or `gpt-5-mini` per `docs/token-and-model-guide.md`. The orchestrator is the one pane where reasoning quality pays off; everything else rides cheap tiers.
- **`scripts/preflight.sh --lab14` is the pre-session check.** Run it at the venue **before** attendees arrive, on every facilitator machine. A `FAIL` line maps directly to one row in the compatibility matrix.
- **Codespaces is the universal escape hatch.** When a Windows attendee cannot make WSL2 work in time, Codespaces runs `tmux` out of the box via the devcontainer post-create. Demo D works there unchanged.
