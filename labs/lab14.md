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

> 🧭 **Two routes through this lab.** The pace above is fixed, so each
> audience spends it differently.
>
> - **Presenter route (15 min).** Talk through §14.0–§14.3 (about 8
>   minutes), show the §14.4 `--help` and `--dry-run` forms (about 2),
>   and *narrate* the §14.5 worked example from the page (about 5). Do
>   not run it live: standing up tmux, two Copilot sessions and a real
>   TDD pass does not fit in 15 minutes.
> - **Learner route (45 min).** Read §14.0–§14.3, treat §14.4 as a
>   reference tour (only its `--help` and `--dry-run` examples are worth
>   running), then do §14.5 Steps 0–5 hands-on and finish with §14.8.
>   Suggested budget: about 10 minutes reading §14.0–§14.4, 25 on
>   Steps 0–5, and the last 10 for everything else: one recovery (a
>   BOUNCE from the rubric, a test to re-run, a pane to fix), then
>   §14.8 and the teardown. Do not plan on a first-try PROMOTE.
> - **Untimed extension.** §14.5 Step 6, the optional QA pane, sits
>   outside both routes. If you want it, do it after Step 5 and before
>   the §14.8 teardown — the teardown kills the session and deletes the
>   hand-off docs Step 6 needs.
>
> **Prepare before the clock starts.** None of this is counted in the
> 45 minutes:
>
> 1. Your environment is a row of the §14.0 matrix that is not ❌, and
>    `tmux -V` reports 3.0 or later (if it is missing, install it as
>    shown in §14.2).
> 2. Copilot CLI is installed and signed in, so `copilot` starts from the
>    repo root.
> 3. Node dependencies are installed and the suite starts green:
>    `pnpm -C node install`, then `pnpm -C node test`.
> 4. `git status` is clean, so the two commits in Step 3 are the only
>    changes you make.
> 5. You can open two terminals at the repo root in the same
>    environment — the same WSL distro or the same Codespace. Step 0
>    explains why.

> 💰 **Cost Budget**
> - Expected token footprint: ~80k in / ~25k out across a full
>   plan → implement → handoff → clear → qa → clear cycle.
>   That's the highest budget in the lab suite because the
>   orchestrator pane stays alive across many phases.
> - Cheaper alternative: pin the **orchestrator pane** to a
>   `models.premium` entry (it does the heavy judging once per phase,
>   and the one-off architecture phase is the only other place premium
>   is worth the spend) and keep **worker panes** on `auto` or a
>   `models.cheap` entry for the mechanical implement / test phases.
>   Read the current ids from the tiers in
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) instead
>   of copying them from a lab, and run `/model` to see what your own
>   account can serve.
> - Compaction trigger: this is the canonical home for the
>   discipline — every worker pane runs
>   `scripts/orchestrator/clear-context.sh` after each phase, and
>   the orchestrator promotes durable decisions into
>   `.copilot/lessons/` (Lab 10) once `plan.md` carries more than
>   two completed phases. The whole pattern is
>   designed to keep per-turn context bounded.
> - See [`docs/token-and-model-guide.md`](../docs/token-and-model-guide.md)
>   to verify your footprint between phases. The repo's
>   `.github/prompts/cost-check.prompt.md` is an **IDE prompt file**:
>   run it as `/cost-check` from Copilot Chat in VS Code, Visual
>   Studio, or JetBrains. The Copilot CLI has no `/cost-check`
>   command, so in a CLI pane paste the file's contents into the
>   session as an ordinary prompt.

> ⚠️ **Enterprise model policy changed — pinning tiers no longer holds
> automatically.** Since the org-wide policy took effect on 2026-08-26
> (announced 2026-07-29 in the
> [GitHub changelog](https://github.blog/changelog/2026-07-29-default-model-enablement-for-copilot-business-and-enterprise/)),
> any newly-GA model an admin has **not** explicitly configured is available to
> users **by default** (`model_default_availability_policy:
> "default-on-unless-disabled"` in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml)).
> This replaces the old implicit-hold/curated-allowlist behavior. Practical
> effect for this lab: the tiers named above (`auto`, `models.cheap`,
> `models.premium`) are still the curated choices, but a new model can
> silently show up as selectable in a worker or orchestrator pane's
> `/model` picker even though nobody added it to the registry's tiers.
> Don't assume "if it's not in the registry, it's not available" — if
> you want a hard ceiling on cost, explicitly pin the model per pane (as
> the Cost Budget above does) rather than relying on the org's model
> list being curated for you. Org admins who want the old curated-allowlist
> behavior must explicitly disable the global default-availability policy.

> 🪞 **Meta callout — this lab teaches the pattern that built this lab.**
> The repo you are reading was modernized using exactly the loop below.
> Each hand-off in the loop is a markdown document that follows the
> schema in Lab 13 §13.4.2; `scripts/orchestrator/handoff.sh` writes
> them into `.copilot/orchestrator-handoffs/`, a directory it creates on
> first use (a fresh checkout ships none). Lab 14 is the operational
> manual for that loop.

References:

- [Lab 13 §13.4.2 — A2A hand-off schema](lab13.md) — the contract Lab 14 operationalises
- [`.copilot/lessons/`](../.copilot/lessons/) — markdown wiki that preserves decisions across the `/clear` boundary (Lab 10)
- [`.github/prompts/orchestrator-rubric.prompt.md`](../.github/prompts/orchestrator-rubric.prompt.md) — the judging rubric the orchestrator pane uses
- [`scripts/orchestrator/`](../scripts/orchestrator/) — `tmux-start.sh`, `handoff.sh`, `clear-context.sh`
- [Lab 07 — Multi-Agent Orchestration](lab07.md) — the in-process orchestrator → dev → QA flow this lab generalises across panes
- [Lab 10 — Agent Memory: Personalities, Lessons, and Consolidation](lab10.md) — the wiki + consolidation primitives the orchestrator pane relies on

---

## 14.0 Compatibility matrix

Lab 14's orchestrator pattern is a thin layer over tmux, `send-keys`,
and the POSIX filesystem. That makes it fast and hackable — and it
also means it inherits every rough edge of the underlying OS. Before
running this lab live (or in an advanced workshop), confirm your
environment fits the matrix below.

| Tier | Environment | Status | Why |
|------|-------------|--------|-----|
| ✅ **Supported** | Native macOS (Intel or Apple Silicon) | Run as-is | POSIX, real tmux, stable `send-keys`. |
| ✅ **Supported** | Native Linux (Ubuntu 22.04+, Debian 12+, Fedora 39+) | Run as-is | POSIX, real tmux, stable `send-keys`. |
| ⭐ **Recommended on Windows** | WSL2 with Copilot CLI + tmux installed **inside** the WSL distro, repo cloned **under your Linux `$HOME`** (e.g. `~/repos/…`) | Run as-is | Full Linux kernel, fast ext4 I/O, reliable file-watchers. This is the only officially supported Windows path for the live workshop. |
| ⚠️ **Allowed but degraded** | WSL2 with the repo under `/mnt/c/…` or another Windows drive mount | Expect pain | Cross-boundary file I/O is ~10× slower, file-watchers drop events, `inotify` is unreliable, and `tmux send-keys` round-trips can stall. Works for exploration; unsafe for a timed demo. |
| ❌ **Unsupported for the live workshop** | Windows PowerShell-only (no WSL) | Do not attempt | No tmux, no POSIX filesystem semantics; every script under `scripts/orchestrator/` assumes a Unix shell. `preflight.ps1 -Lab14` will FAIL this configuration on purpose. |
| ❌ **Not tested / unsupported** | WSL1 | Do not attempt | tmux + interop behaviour under WSL1 is not validated; we have seen silent `send-keys` drops. Upgrade: `wsl --set-version <distro> 2`. `preflight.sh --lab14` will FAIL this on purpose. |
| ✅ **Supported** | GitHub Codespaces (default devcontainer) | Check for tmux, then run | Linux VM, but this repo's devcontainer does **not** install tmux — run `tmux -V` and, if it is missing, install it as shown in §14.2 before you start. Best choice when local setup is blocked. |

Run `scripts/preflight.sh --lab14` (or `pwsh scripts/preflight.ps1
-Lab14` where PowerShell is the only option) before starting this lab.
A single `FAIL` line maps directly to one of the rows above.

Two non-obvious rules that the matrix encodes:

1. **"WSL2" alone is not enough.** Where the *repo* lives matters as
   much as where the *shell* runs. A WSL2 shell pointed at
   `/mnt/c/Users/…/repo` is the degraded row, not the recommended
   row.
2. **The live workshop does not run on Windows PowerShell.** The
   `preflight.ps1` script exists to *tell you* you need WSL2 or
   Codespaces; it is not a substitute for them.

---

## 14.1 Why panes, why tmux, why now

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

This is the same separation Lab 13 §13.1 calls **trust boundaries** for
A2A peers. Lab 14 makes it physical: each pane is a process, each
process is its own context window, and `clear-context.sh` is the
boundary you draw on purpose.

---

## 14.2 tmux primer (5-minute version)

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
2. **Panes are addressed by index, not by title.** `tmux-start.sh` titles
   the two panes in the `work` window `worker` and `qa`, but those titles
   are only labels. `clear-context.sh` maps `worker` to pane 0 and `qa`
   to pane 1, and `handoff.sh --to-pane N` types into
   `copilot-orch:work.N`, so if you re-split or reorder the panes the
   scripts will hit the wrong one. Leave the layout alone.

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

## 14.3 The pattern, in one diagram

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
   token-discipline hammer that pairs with the
   [`.copilot/lessons/`](../.copilot/lessons/) wiki (Lab 10) — you
   don't need to keep the *summary* of phase N to start phase N+1;
   you only need the hand-off doc on disk plus any durable decisions
   the worker promoted into a lesson before clearing.
3. **All inter-pane state goes through hand-off docs on disk.** Never
   "screen-scrape" another pane. The doc is the contract; everything
   else is incidental.

---

## 14.4 The deliver scripts

You already have everything in `scripts/orchestrator/`. This section is a
**reference tour — read it, don't run it.** The live commands need a
Copilot session already running in a pane, and none exists yet, so each
one is run at the §14.5 step that needs it. The only commands worth
running here are the read-only `--help` and `--dry-run` forms shown
below.

| Script | What it does | Idempotent? |
|--------|--------------|-------------|
| `tmux-start.sh` | Provisions the layout above. Re-runs are safe. | Yes — re-uses existing session |
| `handoff.sh <phase>` | Writes a Lab 13 §13.4.2 hand-off doc into `.copilot/orchestrator-handoffs/` by default and prints its path. | Yes — every call writes a new timestamped doc |
| `clear-context.sh` | Sends `/clear` to a named worker pane. `--dry-run` prints instead of sending. | Yes — `/clear` is itself a no-op on a clean pane |

All three print a usage summary for `--help`, and `tests/orchestrator/*`
exercises them, so you can trust the contracts above without reading
the source. One quirk: `handoff.sh` takes the phase slug **first**, so
ask it for help as `handoff.sh 14-demo --help` — a leading `--help` is
rejected with "first arg must be a phase slug, not a flag" and exit
status 1.

### Bring up the layout

`tmux-start.sh` builds the layout from §14.3: an `orch` window with one
pane, and a `work` window whose two panes — `worker` (pane 0) and `qa`
(pane 1) — sit side by side. With `--no-attach` it leaves the session
detached, so you choose when to join it with `tmux attach`. You'll do
both in §14.5 Step 0; for now, read its usage text:

```bash
./scripts/orchestrator/tmux-start.sh --help
```

Once you are attached, move between windows with `Ctrl-b n` and between
panes with `Ctrl-b ←/→`.

### Write a hand-off

`handoff.sh <phase>` takes the phase slug first, then `--role` and the
repeatable `--input`, `--output`, `--question` and `--accept` flags,
which fill the sections of the Lab 13 §13.4.2 schema. It writes a new
timestamped document under `.copilot/orchestrator-handoffs/` and prints
that document's path on stdout (relative to the directory you ran it
from, so run it from the repo root). Add `--to-pane N --session NAME`
and it also types `cat <doc>` into pane N of the `work` window. You'll
write real hand-offs in §14.5 Steps 2 and 4; for now, read its usage
text — phase slug first:

```bash
./scripts/orchestrator/handoff.sh 14-demo --help
```

### Clear a worker between phases

`clear-context.sh --pane worker` types `/clear` into pane 0 of the `work`
window (`--pane qa` is pane 1); the orchestrator pane is never a target.
A real run needs the §14.5 layout and a Copilot session already running
in that pane, so **don't run it here** — it waits for §14.5 Step 5.
`--dry-run` prints what would be sent and sends nothing, so it is safe
anywhere:

```bash
./scripts/orchestrator/clear-context.sh --help
./scripts/orchestrator/clear-context.sh --pane worker --dry-run
```

---

## 14.5 Worked example — `GET /api/courses?departmentId=…` end-to-end

The Phase 3 Node app already has `GET /api/courses` returning the full
list. You're going to add an optional `departmentId` query-string filter
using the full pattern. (Courses carry a numeric `departmentId`; the app
has no department names, so that is the field to filter on.) We'll
narrate each step in terms of *which pane is talking to whom* — and every
block below says which process receives it:

- **Bash — control shell** blocks are typed into an ordinary terminal
  (Step 0 sets one up), never into a Copilot pane.
- **Prompt — orchestrator session**, **Prompt — worker session** and
  **Prompt — QA session** blocks are pasted into the Copilot CLI session
  running in that pane.

> 🛤️ This is intentionally a different slice from the Lab 13 worked
> example so you don't repeat work — pick this lab if you want a fresh
> endpoint, pick Lab 13 if you want to revisit the implementer-vs-critic
> conversation in a single session.

### Step 0 — bring up the layout (once)

Open **two terminals** at the repo root, both in the same environment —
the same WSL distro or the same Codespace, because a tmux session lives
inside one environment and a terminal in another can't see it. Then keep
their jobs apart:

- The **control shell** is an ordinary terminal. Every **Bash** block in
  this section runs here: the helper scripts, `pnpm` and `git`.
- The **tmux terminal** is the one you attach to the session. It only
  hosts the interactive Copilot CLI sessions; every **Prompt** block is
  pasted into one of them.

The split matters because whatever you type into a pane goes to the
process running there. A pane running Copilot CLI hands your text to the
model, not to a shell, so Bash typed into it is just another prompt. The
Copilot sessions stay running throughout; you never leave one to run a
command.

**Bash — control shell:**

```bash
./scripts/orchestrator/tmux-start.sh --no-attach
```

**Bash — tmux terminal:**

```bash
tmux attach -t copilot-orch
```

You land in the `orch` window. Every pane starts in the repo root,
because `tmux-start.sh` ran there, and starts as an ordinary shell — the
only thing you type into one is `copilot`, to start the session that will
live there. Start your orchestrator session in the `orch` pane, then
paste the rubric prompt:

**Prompt — orchestrator session:**

> Use [`.github/prompts/orchestrator-rubric.prompt.md`](../.github/prompts/orchestrator-rubric.prompt.md)
> as your judging contract for every hand-off you receive.

Switch to the `work` window (`Ctrl-b n`). It opens on the `worker` pane
(pane 0); start a Copilot CLI session there the same way. Leave the `qa`
pane (pane 1, to its right) empty for now — Step 6 starts it. The
orchestrator and worker sessions stay running from here on, and the
control shell does all the Bash.

### Step 1 — plan (orchestrator session)

In the orchestrator session, ask Copilot to draft the phase plan and to
tell you where it saved it:

**Prompt — orchestrator session:**

> Plan a single-phase change: add an optional `departmentId` filter to
> `GET /api/courses` in `node/web/routes/courses-api.ts`. The
> query-string value arrives as a string and the stored `departmentId` is
> an integer; with no filter the route must behave as it does today.
> Strict TDD (RED test first, committed before the implementation).
> Hand-off back to me when GREEN. Acceptance: one new integration test in
> `node/tests/integration/courses-api.test.ts` plus the existing tests
> green. Save the plan as your session's `plan.md` and reply with its
> full absolute path.

Copilot CLI keeps session files under `~/.copilot/session-state/<id>/` in
your home directory (or under `$COPILOT_HOME` if you have set it) — not
inside this repo, and under a session id you can't guess, which is why
the prompt asks for the path. Copy the absolute path it reports: Step 2
hands it to the worker. Check it from the control shell with
`ls <that-path>`; if the file isn't there, ask again.

### Step 2 — dispatch to dev (orchestrator → worker)

The worker starts with an empty context, so its brief has to carry
everything it needs — including where the plan is. In the control shell,
write the input hand-off and send it to the worker pane in one go,
replacing `<absolute-plan-path>` with the path from Step 1:

**Bash — control shell:**

```bash
./scripts/orchestrator/handoff.sh 14-courses-dev \
  --role orchestrator \
  --input  "Read the plan at <absolute-plan-path> first; the code to change is node/web/routes/courses-api.ts" \
  --output "RED integration test committed, then GREEN implementation of ?departmentId=" \
  --question "_none_" \
  --accept "pnpm -C node test green; the new test asserts departmentId=1 returns only the matching course" \
  --to-pane 0 --session copilot-orch
```

The `--to-pane 0` flag types `cat <doc>` into pane 0 of the `work` window
and presses Enter. That pane is running Copilot CLI, not a shell, so the
line arrives as a prompt rather than a command. Tell the worker what to
do with it:

**Prompt — worker session:**

> The line you just received names a hand-off document. Read it, and the
> plan file it points to, then wait — I'll give you the work one step at
> a time.

If the worker can't open the plan path, paste the plan's text into that
prompt instead.

### Step 3 — implement (worker session + control shell)

A strict TDD pass leaves two commits: the failing test, then the code
that fixes it. The worker session writes the code; you run the tests and
make the commits from the control shell, so the evidence in Step 4 is
something you saw yourself.

**RED.** Ask the worker for the test only:

**Prompt — worker session:**

> RED step only — don't touch `node/web/routes/courses-api.ts`. In
> `node/tests/integration/courses-api.test.ts`, add one test that POSTs
> two courses — `{ title: 'Calculus I', credits: 4, departmentId: 1 }`
> and `{ title: 'History 101', credits: 3, departmentId: 2 }` — then
> calls `GET /api/courses?departmentId=1` and asserts: status 200,
> exactly one course in `data`, its title is `Calculus I`, and
> `meta.total` is 1.

Run the suite and read the failure:

**Bash — control shell:**

```bash
pnpm -C node test
```

Exactly one test should fail — the new one, on its count assertion —
because the route ignores the query string and returns both courses. A
failure for any other reason (an import error, a typo, a 400 from one of
the POSTs) isn't a RED yet: have the worker fix the test first. Once the
failure is the right one, commit the test on its own:

**Bash — control shell:**

```bash
git add node/tests/integration/courses-api.test.ts
git commit -m "test(node-api): failing test for the departmentId filter"
```

**GREEN.** Now ask for the implementation:

**Prompt — worker session:**

> GREEN step: in `node/web/routes/courses-api.ts`, make
> `GET /api/courses` accept an optional `departmentId` query parameter.
> It arrives as a string and the stored value is an integer. When it is
> present, return only the matching courses, with `meta.total` set to the
> filtered count. With no parameter, behave exactly as today. Change
> nothing else.

Run the suite again; the commit only happens if it is fully green. If
anything fails, paste the failure output into the worker session and ask
for a fix.

**Bash — control shell:**

```bash
pnpm -C node test && git add node/web/routes/courses-api.ts \
  && git commit -m "feat(node-api): filter GET /api/courses by departmentId"
```

### Step 4 — hand back to the orchestrator (worker → orchestrator)

The rubric grades evidence, not claims, so collect it first. From the
control shell:

**Bash — control shell:**

```bash
git log --oneline -2
pnpm -C node test
```

`git log` lists the GREEN commit first and the RED commit below it — note
both SHAs. The test run ends with a `Tests … passed (…)` summary line;
copy it exactly as printed. Now write the return hand-off, replacing
`<red-sha>`, `<green-sha>` and `<summary-line>` with what you just
collected (and `<absolute-plan-path>` as in Step 2):

**Bash — control shell:**

```bash
./scripts/orchestrator/handoff.sh 14-courses-dev \
  --role dev \
  --input  "Orchestrator brief for 14-courses-dev; plan at <absolute-plan-path>" \
  --output "RED commit <red-sha>; GREEN commit <green-sha>; ran pnpm -C node test: <summary-line>" \
  --question "_none_" \
  --accept "pnpm -C node test green; the departmentId test passes"
```

Unlike Step 2 there is no `--to-pane`: that flag can only reach the
`work` window, never the orchestrator's pane. The command prints the new
document's path (relative to the repo root). Copy it — the hand-off
reaches the orchestrator when you give it that path in Step 5.

### Step 5 — judge, then clear (orchestrator session)

Give the orchestrator the path you copied in Step 4 and have it apply
the rubric — clearing nothing yet:

**Prompt — orchestrator session:**

> Read the hand-off at `<printed-path>` and apply the orchestrator rubric
> to it. Give me the verdict block. Don't clear anything yet.

It returns one of three verdicts:

- **PROMOTE** → free the worker for the next phase (the command below),
  then re-dispatch with a new hand-off;
- **BOUNCE** → fix what the rubric names and re-send a tighter brief into
  the (still-warm) worker pane by re-running the Step 2 command with the
  corrected text; do **not** clear it; or
- **STOP-AND-ASK** → the hand-off schema is intact, but one of the
  §14.7 stop-and-ask triggers fired: surface it to the human in the
  orchestrator session and wait for their answer.

A BOUNCE is an ordinary outcome, not a failed exercise: the rubric is
strict about evidence — both SHAs, the exact test command, its summary
line — and the learner route budgets time for one. Only on PROMOTE, clear
the worker from the control shell:

**Bash — control shell:**

```bash
./scripts/orchestrator/clear-context.sh --pane worker
```

This is the first live run of the script. It types `/clear` into pane 0
of the `work` window, so the worker session there starts over with zero
memory of the courses change — and that's what you want before phase
N+1.

### Step 6 — optional QA pane (untimed extension)

For higher-stakes phases, add an independent reviewer in the `qa` pane.
Step 0 left that pane empty, so this step starts its session itself — it
is not just Steps 2–5 again.

**Start QA.** In the tmux terminal, switch to the `work` window
(`Ctrl-b n`), move to the right-hand pane (`Ctrl-b →`) — pane 1, `qa` —
and start a Copilot CLI session there.

**Brief it.** From the control shell, write the QA brief and send it with
the same pane mapping as before (worker = 0, qa = 1). Replace
`<printed-path>` with the Step 4 hand-off's path and
`<absolute-plan-path>` as in Step 2:

**Bash — control shell:**

```bash
./scripts/orchestrator/handoff.sh 14-courses-qa \
  --role orchestrator \
  --input  "Read the dev hand-off at <printed-path> and the plan at <absolute-plan-path>" \
  --output "rubric verdict + spot-checked tests" \
  --question "_none_" \
  --accept "verdict recorded; carry-forwards logged" \
  --to-pane 1 --session copilot-orch
```

As in Step 2, the typed `cat <doc>` arrives as a prompt, so tell QA what
to do with it and what to hand back:

**Prompt — QA session:**

> Read the hand-off you were just sent, then the dev hand-off it points
> to. Spot-check the two commits it names and re-run `pnpm -C node test`
> yourself. Reply with a verdict — PROMOTE, BOUNCE or STOP-AND-ASK — and
> one line of reasons.

**Record it, then clear.** The orchestrator is the pane that remembers,
so give it QA's verdict first:

**Prompt — orchestrator session:**

> QA's verdict on the 14-courses-dev phase was `<verdict and reason>`.
> Record it as a carry-forward.

Only then clear QA from the control shell:

**Bash — control shell:**

```bash
./scripts/orchestrator/clear-context.sh --pane qa
```

That's the whole loop.

---

## 14.6 Token discipline — why `clear` and `.copilot/lessons/` complement each other

The [`.copilot/lessons/`](../.copilot/lessons/) markdown wiki (Lab 10)
exists because, even *inside* a single pane, you sometimes need to
shrink the working context without losing the durable decisions you
just made. Lab 14's `/clear` between phases is the heavier hammer for
the same problem — and the two are designed to be used together:

| Tool | Granularity | Loses what? | Use when |
|------|-------------|-------------|----------|
| Promote to `.copilot/lessons/` | Within a pane / phase | Nothing durable; verbose intermediate turns go away on the next `/clear` | You're mid-phase and the decision you just made matters beyond this session |
| `clear-context.sh` | Between phases | Everything in that worker pane | You've shipped the phase and the doc on disk (plus any freshly-written lesson) is the source of truth |
| Kill + restart pane | Nuclear | The whole shell process state | The pane has accumulated env-var / cwd cruft you don't want |

The orchestrator pane uses neither in normal operation: its job is to
*remember*, and its working set is small enough (plan + rubric +
hand-off summaries) that it doesn't need compaction.

---

## 14.7 Stop-and-ask triggers

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

## 14.8 Wrap-up & next steps

What you should now be able to do:

- [ ] Bring up the orchestrator + tmux layout with one command.
- [ ] Explain why the orchestrator pane is never cleared and why
      worker panes always are.
- [ ] Write a hand-off doc that passes the rubric in
      `.github/prompts/orchestrator-rubric.prompt.md`.
- [ ] Drive a phase end-to-end without losing the plan to
      context-window pressure.
- [ ] Recognise the five stop-and-ask triggers in §14.7.

Cross-references:

- Use the rubric prompt as the orchestrator pane's standing instruction.
- Pair this lab with **Lab 13** for the conceptual foundation
  (A2A / ACP, trust boundaries, failure modes).
- Pair with **Lab 07** if you'd rather stay in-process and use the
  `task` tool for sub-agents instead of spawning panes.
- Pair with **Lab 10** for the underlying session-state primitives
  (plan.md, todos, checkpoints) that the hand-off docs build on.
- [Lab 11](lab11.md) and [Lab 12](lab12.md) are useful background —
  Lab 11 for the plugin / distribution mindset that shaped
  `.github/skills/`, and Lab 12 for a concrete MCP integration you may
  want to hand to a worker pane in the orchestrator pattern below.

Recap: a tmux session, three short shell scripts, one rubric prompt,
and one rule — *the orchestrator remembers, the workers forget* — are
all you need to drive a multi-phase Copilot project without losing the
plot. The rest is discipline.

### Teardown

Lab 14 leaves a detached tmux session running and, if you ran
`handoff.sh`, a folder of hand-off docs. From the repo root:

```bash
# Closes every pane in the session, including any Copilot CLI session still
# running in one. "can't find session" just means it is already gone.
tmux kill-session -t copilot-orch

# The hand-off docs are untracked and not git-ignored, so list them first.
git status --short .copilot/orchestrator-handoffs

# Delete them. -f keeps this quiet if the folder was never created.
rm -rf .copilot/orchestrator-handoffs
```

The two commits from the worked example (§14.5 Step 3 — `test(node-api):`
then `feat(node-api):`) are your own work, so the teardown leaves them
alone — keep them, or undo them with `git revert` on each, newest first.
Your `~/.copilot/session-state/` folder is Copilot CLI's own state; leave
it in place.
