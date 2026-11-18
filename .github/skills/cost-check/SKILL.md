---
name: cost-check
description: "Estimate the current Copilot CLI session's token footprint, list the\ntop-3 compaction opportunities, and recommend a model switch if the\nrunning mix looks expensive for the work in progress. Pair with\ndocs/token-and-model-guide.md."
disable-model-invocation: true
---
# /cost-check — Session Footprint & Compaction Advisor

You are running mid-session and the user wants to know **what their
Copilot CLI session has cost so far** and **how to keep the next
phase cheaper**. Treat this as a short, decision-oriented report —
not a tutorial. Reference
[`docs/token-and-model-guide.md`](../../../docs/token-and-model-guide.md)
for the underlying mental model; do **not** restate it here.

Produce the three sections below, in this order, using the data you
can observe (session store events, the active plan / handoff docs,
and the conversation history available to you). Be concrete and
quantitative wherever you can; when you can't, say so explicitly
rather than guessing.

## Footprint estimate

Query the session store for the current session's footprint:

```sql
-- via session_store_sql, scope: "personal"
SELECT
  usage_model,
  COUNT(*)                         AS turns,
  SUM(usage_input_tokens)          AS in_tokens,
  SUM(usage_output_tokens)         AS out_tokens
FROM events
WHERE session_id = '<current session id>'
  AND type = 'assistant.message'
GROUP BY usage_model
ORDER BY in_tokens DESC;
```

Report:

- Total input + output tokens for the session.
- Per-model breakdown (so the user can see if `auto` keeps escalating
  to a premium model).
- Tokens-per-turn average and the single most expensive turn.
- A coarse cost band (cheap / standard / premium) inferred from the
  per-model mix.

If the session store is empty or unavailable, say so and fall back to
estimating from the conversation length you can see in your own
context.

## Compaction opportunities

Identify the **top three** places where the session is paying for
context it no longer needs. For each, name the artifact and the
recommended action. Examples of what to look for:

1. Long completed phases still in `plan.md` that should be archived.
2. Tool outputs (large file reads, full test logs) re-sent every
   turn — recommend `view_range` or a summary message.
3. A finished sub-task whose context could be dropped via `/clear`
   (use `scripts/orchestrator/clear-context.sh` if Lab 14's
   orchestrator pattern is in play).
4. Large pasted snippets in user messages that could be replaced
   with a path reference.

Rank by estimated token savings. For each, write one sentence on
**how** to apply the fix (e.g., "run `strategic-compact` and keep
only the §3 summary").

## Model recommendation

Model ids live in one place: the `models:` block of
[`docs/_meta/registry.yaml`](../../../docs/_meta/registry.yaml). Pick a
**tier** and read the concrete id out of the registry. Do not quote an
id from memory: the CLI retires models, and a pinned id can send the
user to one they can no longer select.

Based on the footprint and the work the user is currently doing,
recommend one of:

- **Stay on `auto`** — current mix looks balanced.
- **Downshift** to a `models.cheap` entry — current work is mechanical
  and the model tier is overpaying.
- **Hold on standard** (a `models.standard` entry) — work is normal
  coding; pin for predictability.
- **Upshift** to a `models.premium` entry — current work is hard
  reasoning or a large refactor and a cheaper model is round-tripping
  too much.

Name the specific id you suggest, read from the registry, and tell the
user to run `/model` to switch. Justify the pick in one sentence with a
pointer to which evidence from the previous two sections drove the call.
If the user is about to dispatch sub-agents via the `task` tool, remind
them that `AGENTS.md` ("Token discipline") reserves `models.premium` for
sub-agent dispatches where quality matters more than speed, and that
simple, mechanical delegations can use `models.cheap`.

End with a one-line "next action" the user can take immediately
(e.g., `/clear`, archive plan §1–4, switch model, or "no action
needed — keep going").
