---
title: "Orchestrator + tmux Pattern (Deep-Dive)"
lab_number: 14
pace:
  presenter_minutes: 15
  self_paced_minutes: 45
registry: docs/_meta/registry.yaml
---

# 14 — Orchestrator + tmux Pattern (Deep-Dive)

In Lab 13 you met **A2A / ACP** at the concept level and ran a
two-agent implementer + critic loop in a single Copilot CLI session.
Lab 14 takes the same idea to its production shape: **one tmux session,
one long-lived orchestrator pane, one or two short-lived worker panes**,
and a strict cycle of `plan → implement → handoff → clear → qa → clear
→ next phase` that lets a single human drive a multi-phase modernization
without losing the plot.

> ⏱️ Presenter pace: 15 minutes | Self-paced: 45 minutes

> 🪞 **Meta callout — this lab teaches the pattern that built this lab.**
> The repo you are reading was modernized using exactly the loop below.
> The hand-off contracts under `.orchestrator/session.md` (see Lab 13
> §B.2 for the schema) are real artefacts from that build-out — Lab 14
> is the operational manual for what you've already been seeing.

References:

- [Lab 13 §B.2 — A2A hand-off schema](lab13.md) — the contract Lab 14 operationalises
- [`.github/skills/strategic-compact`](../.github/skills/strategic-compact) — context-hygiene skill that pairs with the `clear` step
- [`.github/prompts/orchestrator-rubric.prompt.md`](../.github/prompts/orchestrator-rubric.prompt.md) — the judging rubric the orchestrator pane uses
- [`scripts/orchestrator/`](../scripts/orchestrator/) — `tmux-start.sh`, `handoff.sh`, `clear-context.sh`
- [Lab 07 — Multi-Agent Orchestration](lab07.md) — the in-process orchestrator → dev → QA flow this lab generalises across panes
- [Lab 10 — Reindex, Session Management & Memory](lab10.md) — session-state primitives the orchestrator pane relies on

---

## 14.0 Why panes, why tmux, why now

A single Copilot CLI session is one big context window. As a phased
modernization grows, that window fills up with:

- the cross-phase plan and rationale (you need it to last);
- the current phase's transcript (huge, but disposable once shipped);
- review/QA back-and-forth (also disposable).

If you do all three in one pane, two bad things happen:

1. **Token blow-up** — by phase 4 you're paying to re-read phase 1's
   transcript on every turn.
2. **Context drift** — the model starts conflating "the plan" with
   "what happened last phase," and decisions silently shift.

The pattern fixes both by **separating long-lived strategic context
(orchestrator pane) from short-lived tactical context (worker panes)**,
and using tmux as the cheap multiplexer that keeps both alive without a
heavyweight scheduler. It's intentionally low-magic: there is no daemon,
no broker, no queue — just panes, files, and `/clear`.

This is the same separation Lab 13 §13.2 calls **trust boundaries** for
A2A peers. Lab 14 makes it physical: each pane is a process, each
process is its own context window, and `clear-context.sh` is the
boundary you draw on purpose.

---

## 14.1 tmux primer (5-minute version)

Skip ahead if you already speak tmux. If not, this is enough to drive
Lab 14:

| Concept | What it is | Default keybinding |
|---------|------------|--------------------|
| **Session** | A named collection of windows. Survives terminal close. | `tmux new -s NAME` to create; `tmux attach -t NAME` to re-attach |
| **Window** | A "tab" inside a session. Each window has its own panes. | `Ctrl-b c` (new), `Ctrl-b n` / `Ctrl-b p` (next/prev) |
| **Pane** | A split inside a window. Each pane is its own shell process. | `Ctrl-b %` (vertical split), `Ctrl-b "` (horizontal split) |
| **Move focus** | Switch which pane the keyboard is talking to. | `Ctrl-b ←/→/↑/↓` |
| **Detach** | Leave the session running and return to your normal shell. | `Ctrl-b d` |
| **Kill** | Tear it all down. | `tmux kill-session -t NAME` |
| **Send keys** | Type into another pane from a script. | `tmux send-keys -t NAME:WINDOW.PANE "TEXT" C-m` |

Two non-obvious tips that matter for this lab:

1. **`tmux send-keys` is how scripts talk to panes.** That's the entire
   mechanism behind `clear-context.sh`. There's no IPC magic.
2. **Pane titles are addressable.** `tmux-start.sh` titles the worker
   panes `worker` and `qa` so other scripts don't depend on numeric
   indices changing if you re-split.

If your environment doesn't have tmux:

```bash
# Debian / Ubuntu
sudo apt-get install -y tmux
# macOS
brew install tmux
# Windows — use WSL2 (tmux runs inside the WSL distro), or use VS Code's
# integrated terminal on a remote/dev container that ships tmux.
```

`tmux -V` should report **3.0 or later**.

---

## 14.2 The pattern, in one diagram

```
┌─────────────────────────── tmux session: copilot-orch ────────────────────────────┐
│                                                                                   │
│ ┌─ window: orch ──────────────────┐    ┌─ window: work ─────────────────────────┐ │
│ │                                 │    │ ┌──────────── ┬──────────────────────┐ │ │
│ │  ORCHESTRATOR pane (long-lived) │    │ │  worker     │  qa                  │ │ │
│ │                                 │    │ │  pane       │  pane                │ │ │
│ │  - holds the plan               │    │ │             │                      │ │ │
│ │  - reads handoff docs           │    │ │  /clear-ed  │  /clear-ed           │ │ │
│ │  - applies the rubric           │    │ │  between    │  between             │ │ │
│ │  - decides PROMOTE / BOUNCE     │    │ │  phases     │  phases              │ │ │
│ │  - never /clear-ed              │    │ │             │                      │ │ │
│ │                                 │    │ └─────────────┴──────────────────────┘ │ │
│ └─────────────────────────────────┘    └────────────────────────────────────────┘ │
│                                                                                   │
│   plan ─▶ implement ─▶ handoff ─▶ clear (worker) ─▶ qa ─▶ clear (qa) ─▶ next      │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

Three rules make the diagram work:

1. **The orchestrator pane is never cleared.** It is the only place
   where the multi-phase plan, the rubric, and the carry-forward log
   live. Clearing it loses the project.
2. **The worker pane is cleared between every phase.** This is the
   token-discipline cousin of the [`strategic-compact`](../.github/skills/strategic-compact)
   skill — but more aggressive, because you don't need to keep the
   *summary* of phase N to start phase N+1; you only need the
   hand-off doc, which is on disk.
3. **All inter-pane state goes through hand-off docs on disk.** Never
   "screen-scrape" another pane. The doc is the contract; everything
   else is incidental.

---

## 14.3 The deliver scripts

You already have everything in `scripts/orchestrator/`. Quick tour:

| Script | What it does | Idempotent? |
|--------|--------------|-------------|
| `tmux-start.sh` | Provisions the layout above. Re-runs are safe. | Yes — re-uses existing session |
| `handoff.sh <phase>` | Writes a Lab 13 §B.2 hand-off doc into the session workspace and prints its path. | Yes — every call writes a new timestamped doc |
| `clear-context.sh` | Sends `/clear` to a named worker pane. `--dry-run` prints instead of sending. | Yes — `/clear` is itself a no-op on a clean pane |

All three honour `--help`. They are exercised by
`tests/orchestrator/*` so you can trust the contracts above without
reading the source.

### Bring up the layout

```bash
# Detached — recommended; you'll attach explicitly when you're ready.
./scripts/orchestrator/tmux-start.sh --no-attach

# Attach when you want to drive it
tmux attach -t copilot-orch
```

You should see two windows: `orch` (one pane) and `work` (split
horizontally into `worker` and `qa`). Move between windows with
`Ctrl-b n` and panes with `Ctrl-b ←/→`.

### Write a hand-off

```bash
./scripts/orchestrator/handoff.sh 14-demo \
  --role dev \
  --input  "lab plan §14.4 worked example" \
  --output "GET /api/courses?department=… implemented + tested" \
  --question "do we paginate?  carry-forward: defer to phase 7" \
  --accept "node test suite green; new endpoint covered"
```

You'll get a path on stdout. Open the doc in your editor — that's the
contract the next pane will read.

### Clear a worker between phases

```bash
# Show what would happen without sending — useful in CI / dry-runs.
./scripts/orchestrator/clear-context.sh --pane worker --dry-run

# Actually send /clear into the worker pane.
./scripts/orchestrator/clear-context.sh --pane worker
```

---

## 14.4 Worked example — `GET /api/courses?department=…` end-to-end

The Phase 3 Node app already has `GET /api/courses` returning the full
list. You're going to add a `department` query-string filter using the
full pattern. We'll narrate each step in terms of *which pane is
talking to whom*.

> 🛤️ This is intentionally a different slice from the Lab 13 worked
> example so you don't repeat work — pick this lab if you want a fresh
> endpoint, pick Lab 13 if you want to revisit the implementer-vs-critic
> conversation in a single session.

### Step 0 — bring up the layout (once)

```bash
./scripts/orchestrator/tmux-start.sh --no-attach
tmux attach -t copilot-orch
```

In the `orch` window, start your orchestrator Copilot CLI session.
Paste the rubric prompt:

> Use [`.github/prompts/orchestrator-rubric.prompt.md`](../.github/prompts/orchestrator-rubric.prompt.md)
> as your judging contract for every hand-off you receive.

Switch to the `work` window (`Ctrl-b n`) and start a Copilot CLI
session in the `worker` pane. Leave `qa` empty for now — we'll spin it
up after the dev pass.

### Step 1 — plan (orchestrator pane)

In the orchestrator pane, ask Copilot to draft the phase plan:

> Plan a single-phase change: add an optional `department` filter to
> `GET /api/courses` in `node/web/routes/courses-api.ts`. Strict TDD
> (RED test first). Hand-off back to me when GREEN. Acceptance: new
> integration test plus existing tests green.

Save the plan to `.copilot/session-state/<id>/plan.md` (the session
folder Copilot CLI exposes).

### Step 2 — dispatch to dev (orchestrator → worker)

From the orchestrator pane, write the input hand-off and send it to
the worker pane in one go:

```bash
./scripts/orchestrator/handoff.sh 14-courses-dev \
  --role orchestrator \
  --input  "plan above; node/web/routes/courses-api.ts" \
  --output "RED integration test then GREEN impl for ?department=…" \
  --question "URL-decode case-fold? carry-forward: yes, lower-case both sides" \
  --accept "make test-node green; new test asserts filtering by 'Mathematics'" \
  --to-pane 0 --session copilot-orch
```

The `--to-pane 0` flag types `cat <doc>` into the worker pane so the
worker just sees the brief without you copy-pasting.

### Step 3 — implement (worker pane)

In the worker pane, drive a strict TDD pass:

1. **RED**: add a failing integration test in
   `node/tests/integration/courses-api.test.ts` that posts two courses
   in different departments and asserts
   `GET /api/courses?department=Mathematics` returns only the
   Mathematics one.
2. Confirm it fails for the right reason (`pnpm -C node test`).
3. **GREEN**: extend the route handler in `courses-api.ts` to accept
   `req.query.department` (lower-cased, optional) and filter the
   in-memory result.
4. Re-run `pnpm -C node test` until green.
5. Per-file `git add` + a `feat(node-api):` commit.

### Step 4 — hand back to QA (worker → orchestrator)

```bash
./scripts/orchestrator/handoff.sh 14-courses-dev \
  --role dev \
  --input  "the orchestrator brief above" \
  --output "RED commit <sha>; GREEN commit <sha>; pnpm test summary appended" \
  --question "_none_" \
  --accept "make test-node green; new endpoint behaviour test passes"
```

### Step 5 — promote, then clear (orchestrator pane)

In the orchestrator pane, apply the rubric. Either:

- **PROMOTE** → run `./scripts/orchestrator/clear-context.sh --pane worker`
  to free the worker for the next phase, then re-dispatch with a new
  hand-off; or
- **BOUNCE** → re-issue a tighter brief into the (still-warm) worker
  pane; do **not** clear it.

For the worked example you'll PROMOTE on the first try. The point is
that the worker now has zero memory of the courses change — and that's
what you want before phase N+1.

### Step 6 — optional QA pane

For higher-stakes phases, repeat steps 2–5 with the `qa` pane:

```bash
# orchestrator → qa
./scripts/orchestrator/handoff.sh 14-courses-qa \
  --role orchestrator --input "dev hand-off above" \
  --output "rubric verdict + spot-checked tests" \
  --question "_none_" \
  --accept "verdict recorded; carry-forwards logged"

# When QA is done, /clear it too
./scripts/orchestrator/clear-context.sh --pane qa
```

That's the whole loop.

---

## 14.5 Token discipline — why `clear` and `strategic-compact` complement each other

The [`strategic-compact`](../.github/skills/strategic-compact) skill
exists because, even *inside* a single pane, you sometimes want to
shrink the working context without losing the plot. Lab 14's `/clear`
between phases is the heavier hammer for the same problem:

| Tool | Granularity | Loses what? | Use when |
|------|-------------|-------------|----------|
| `strategic-compact` skill | Within a pane / phase | Verbose intermediate turns; keeps decisions | You're mid-phase and approaching the window limit |
| `clear-context.sh` | Between phases | Everything in that worker pane | You've shipped the phase and the doc on disk is the source of truth |
| Kill + restart pane | Nuclear | The whole shell process state | The pane has accumulated env-var / cwd cruft you don't want |

The orchestrator pane uses neither in normal operation: its job is to
*remember*, and its working set is small enough (plan + rubric +
hand-off summaries) that it doesn't need compaction.

---

## 14.6 Stop-and-ask triggers

The orchestrator pane is the human's eyes. These are the situations
where the rubric tells it to **STOP-AND-ASK** instead of promoting or
bouncing on its own:

1. **Open questions accumulating** — the same `## open_questions`
   bullet appears in two consecutive hand-offs without being answered.
2. **Scope drift the rubric can't classify** — the worker shipped
   correct work that was *not* in the plan. The human must decide:
   accept and re-plan, or revert.
3. **Tests pass but evidence is thin** — e.g. the worker says "tests
   pass" without naming a command. Don't BOUNCE silently; surface it.
4. **TDD trail missing** — no RED commit visible before GREEN, and the
   change is non-trivial. Surface for review.
5. **`tmux` itself misbehaves** — pane disappears, send-keys drops
   characters, `clear` doesn't take. Don't paper over infra problems
   in the rubric.

---

## 14.7 Wrap-up & next steps

What you should now be able to do:

- [ ] Bring up the orchestrator + tmux layout with one command.
- [ ] Explain why the orchestrator pane is never cleared and why
      worker panes always are.
- [ ] Write a hand-off doc that passes the rubric in
      `.github/prompts/orchestrator-rubric.prompt.md`.
- [ ] Drive a phase end-to-end without losing the plan to
      context-window pressure.
- [ ] Recognise the four stop-and-ask triggers above.

Cross-references:

- Use the rubric prompt as the orchestrator pane's standing instruction.
- Pair this lab with **Lab 13** for the conceptual foundation
  (A2A / ACP, trust boundaries, failure modes).
- Pair with **Lab 07** if you'd rather stay in-process and use the
  `task` tool for sub-agents instead of spawning panes.
- Pair with **Lab 10** for the underlying session-state primitives
  (plan.md, todos, checkpoints) that the hand-off docs build on.

Recap: a tmux session, three short shell scripts, one rubric prompt,
and one rule — *the orchestrator remembers, the workers forget* — are
all you need to drive a multi-phase Copilot project without losing the
plot. The rest is discipline.
