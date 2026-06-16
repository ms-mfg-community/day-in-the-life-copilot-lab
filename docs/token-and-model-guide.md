# Token & Model Selection Guide

> 💡 **Why this exists.** Copilot CLI bills by tokens. The same task
> can cost 5x more or less depending on which model you pick, how
> many tool calls you batch into a turn, and whether you remember to
> compact context between phases. This guide gives you a mental model
> for cost-conscious Copilot use.
>
> Pair it with the `/cost-check` prompt
> ([`.github/prompts/cost-check.prompt.md`](../.github/prompts/cost-check.prompt.md))
> when you want a per-session estimate, and with the
> `strategic-compact` skill when you want a recommended compaction
> point.

> ⚠️ **Note (2026-04-24):** Per [docs.github.com](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file), prompt files (`.prompt.md`) are an **IDE-only** Copilot feature today — Copilot CLI does not expose a `/cost-check` slash command for user-authored prompts. Treat the `.prompt.md` file as a reusable template you paste into a CLI session, or invoke it from Copilot Chat in your IDE.

---

## Model selection

Copilot CLI lets you pick a model per **session** (top-level chat) and
per **sub-agent dispatch** (the `task` tool's `model` parameter).
Defaulting to `auto` is fine 80% of the time — it routes routine work
to a cheap model and escalates only when the request is hard. The
remaining 20% is where you save (or burn) the most tokens.

The `task` tool currently accepts the following model IDs. Each entry
below tells you when to reach for it.

### Default

- **`auto`** — let the router decide. **Use for almost everything.**
  When in doubt, leave it on `auto` and only override when you have a
  reason from one of the rows below.

### Cheap & fast (routine, high-volume)

Use these when the work is mechanical, the prompt is short, and you
do **not** need long-form reasoning. Examples: renaming a symbol,
running a known shell command, summarizing a file you've already
read, scaffolding a test stub.

- **`claude-haiku-4.5`** — fastest Claude tier. Great for tool-heavy
  loops (lots of small tool calls) where latency dominates cost.
- **`gpt-5-mini`** — fastest GPT tier. Pairs well with `claude-haiku-4.5`
  for A/B comparisons and as a fallback when Anthropic capacity is
  tight.
- **`gpt-5.4-mini`** — current GPT mini line; same niche as `gpt-5-mini`
  but on the newer training. Prefer it when you need slightly stronger
  reasoning than `gpt-5-mini` while staying in the cheap tier.
- **`gpt-4.1`** — older but still very cheap. Reach for it on
  high-volume, low-stakes batch jobs where you just need a competent
  text transformer.

### Standard (the workhorse middle)

These are the models `auto` will most often pick for normal coding
work. Use them explicitly when you want to avoid escalation but `mini`
is too weak.

- **`claude-sonnet-4.6`** — current Sonnet default. Strong all-rounder.
- **`claude-sonnet-4.5`** — previous Sonnet generation; pin to it if a
  workflow regressed on 4.6.
- **`claude-sonnet-4`** — the original Sonnet 4. Useful as a stable
  fallback for older labs and reproducibility tests.
- **`gpt-5.4`** — current GPT standard tier.
- **`gpt-5.2`** — previous GPT standard tier; pin for reproducibility
  when you've already validated a workflow against it.
- **`goldeneye`** — internal GitHub model (preview / staff use).
  Mention only — most learners will never pick this directly. If you
  see it in `--model` output, treat it as a standard-tier model.

### Premium (deep reasoning, large refactors, planning)

Reach for these when the cost is justified by the size or difficulty
of the task: multi-file refactors, architecture planning, debugging
across modules, designing the orchestrator rubric for a new phase.
Premium calls cost roughly 5–10× a cheap call — measure twice.

- **`claude-opus-4.7`** — newest Opus. Default premium pick when you
  need the strongest reasoning available.
- **`claude-opus-4.6`** — previous Opus generation. **This is what the
  repo's `copilot-instructions.md` tells you to set on `task` tool
  sub-agent dispatches** — it's the right balance of quality and cost
  for sub-agent work.
- **`claude-opus-4.6-1m`** — the 1M-context Opus 4.6 variant. Use only
  when you genuinely need the long context (e.g., reading an entire
  large lab plus its appendices in one turn). Otherwise it's wasted
  spend on the same intelligence as `claude-opus-4.6`.
- **`claude-opus-4.5`** — older Opus; keep available for reproducibility
  on prior phases that were graded with it.
- **`gpt-5.3-codex`** — GPT premium-codex. The right choice for
  code-heavy reasoning (large refactors, multi-file diffs, complex
  test generation) when you want a non-Anthropic second opinion.
- **`gpt-5.2-codex`** — previous Codex generation; same niche, pinned
  for reproducibility.

### Decision shortcut

| Situation | Pick |
|-----------|------|
| Most chats / unsure | `auto` |
| Tight loop of small tool calls, low stakes | `claude-haiku-4.5` or `gpt-5-mini` |
| Normal coding, you want predictability | `claude-sonnet-4.6` or `gpt-5.4` |
| Repo conventions on sub-agents | `claude-opus-4.6` |
| Hard reasoning / multi-file refactor | `claude-opus-4.7` or `gpt-5.3-codex` |
| Need >200k context window in one turn | `claude-opus-4.6-1m` |

---

## Batching

The single biggest token leak in Copilot CLI sessions is **chatty
turns** — calling the same tool five times in a row when one batched
call would do. The repo's `copilot-instructions.md` already mandates
this; the rule is repeated here so it's discoverable from a learner's
first day.

Rules of thumb:

- **Reads:** when you know you'll need three files, issue three `view`
  calls in the **same response**. Vitest does this for you under the
  hood; you should do it too.
- **Edits:** make all non-overlapping edits to the same file in one
  response. The `edit` tool applies them sequentially with no
  reader/writer conflict.
- **Shell commands:** chain related commands with `&&` or `;` instead
  of one bash call per command. `git add foo && git add bar &&
  git commit -m '…'` is one round-trip, not three.
- **Search + read:** if a `grep` will narrow your reads, run grep and
  the resulting `view` calls in the same response when you can predict
  the targets.

The trade-off: batching only helps when the calls are **independent**.
If call B's parameters depend on call A's output, you must wait. Don't
fake parallelism with placeholder values.

---

## Context hygiene

Tokens scale with **the entire conversation history sent to the model
each turn**, not just your latest message. A long session re-sends a
growing context window every turn — that's where surprise bills come
from.

Practices, in order of how often you should reach for them:

1. **`view_range` for large files.** Files over ~50 KB get truncated by
   the `view` tool, but the truncation still costs tokens. Pass
   `view_range: [start, end]` to read only the relevant slice.
   Skim with `grep -n` first to find the right lines.
2. **`/clear` between phases.** When the orchestrator hands off a
   completed phase, the worker pane should `/clear` before starting
   the next one. Lab 14's `scripts/orchestrator/clear-context.sh`
   automates the safe-reset flow (snapshot → handoff doc →
   `/clear`).
3. **Strategic compaction mid-phase.** When a single phase grows long,
   invoke the `strategic-compact` skill to summarize the conversation
   so far into a checkpoint message and continue from there. Cheaper
   than `/clear` because you keep the summary, but cheaper than
   continuing because you drop the verbose history.
4. **Archive finished plan sections.** When `plan.md` has phases that
   are done and reviewed, move them to an "archive" section at the
   bottom (or to a separate file) so they aren't re-sent every turn.
5. **Avoid full-file reads of large files.** If you only need one
   function from a 2000-line file, use `lsp goToDefinition` or `grep`
   to locate it, then `view_range` the surrounding 50 lines. Do not
   `view` the whole file "for context" — that's the most common
   silent cost.
6. **One topic per session when possible.** Two unrelated tasks
   sharing a session pay each other's token cost on every turn.
   `/clear` and start fresh, or open a second pane (Lab 14 pattern).

---

## Prompt shape

Your own prompts cost tokens too. The shape that works:

- **Short on routine.** When you're driving a familiar tool ("run the
  tests", "commit this with a conventional message"), one sentence is
  enough. Don't restate the task spec the model already saw two turns
  ago.
- **Rich for sub-agents.** When you dispatch via the `task` tool, the
  sub-agent has **none** of your context. Provide the full problem,
  the relevant file paths, the constraints, and the expected output
  shape in one block. A 500-token prompt that prevents three
  clarification round-trips is a bargain.
- **Cite, don't paste.** Instead of pasting a 200-line file into the
  prompt, reference its path and let the agent read the slice it
  needs. The agent can `view_range`; you can't selectively un-paste.
- **State the budget.** For exploratory work, tell the agent what
  "good enough" looks like ("first working answer, don't over-research")
  so it doesn't fan out into a 10-tool investigation.

---

## Measuring

You can't optimize what you don't measure. Copilot CLI surfaces token
usage at three granularities:

- **Per turn.** Each model response includes `usage_input_tokens` and
  `usage_output_tokens` in the event stream. The `events` table in
  the session store (`session_store_sql`) has these columns
  (`usage_input_tokens`, `usage_output_tokens`, `usage_model`); you
  can query them per session or per phase.
- **Per session.** `SELECT SUM(usage_input_tokens),
  SUM(usage_output_tokens) FROM events WHERE session_id = ?`
  gives you a total. Run it before and after a phase to see the
  delta.
- **Per repository / week.** Same query without the `WHERE`, scoped
  with `session_store_sql` `scope: "repository"`, gives you a
  team-wide footprint over time.

The `/cost-check` prompt
([`.github/prompts/cost-check.prompt.md`](../.github/prompts/cost-check.prompt.md))
does this for you mid-session: it queries the current session's
events, surfaces the top-3 compaction opportunities, and recommends
a model switch if the running mix looks expensive for the work you're
doing. Run it once per phase as a habit.

---

## Cross-references

- [Lab 07 — Multi-Agent Orchestration](../labs/lab07.md) — Cost Budget sidebar shows orchestrator footprint.
- [Lab 10 — Context, Memory & Learning](../labs/lab10.md) — Cost Budget sidebar shows the four-layer memory cost trade-offs.
- [Lab 13 — A2A / ACP Concepts](../labs/lab13.md) — Cost Budget sidebar shows two-agent loop footprint.
- [Lab 14 — Orchestrator + tmux Pattern](../labs/lab14.md) — Cost Budget sidebar shows multi-phase orchestrator footprint and is the canonical home for `/clear` discipline.
- `strategic-compact` skill — when and how to compact mid-phase.
- `.github/prompts/cost-check.prompt.md` — on-demand session footprint estimate.
