# Which Memory Do I Use?

A 1-page decision tree for the Day-in-the-Life Copilot Lab. When you
reach for "memory", you are almost always picking one of **three
layers** — the Karpathy pattern taught hands-on in
[Lab 10](../labs/lab10.md). The layers do not overlap. Use this page
to decide, then jump to the lab section that teaches it hands-on.

> 🧭 **TL;DR:** start at the top of the flowchart, take the first branch
> whose question you answer "yes" to, and stop there. Promotion goes
> upward: **Raw sources → Wiki → Schema.** Nothing lives in two
> layers at once.

---

## The flowchart

```
                       ┌──────────────────────────┐
                       │  I need to remember…     │
                       └────────────┬─────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        │                                                       │
        ▼                                                       ▼
"…something for the      ┌─────────────────────────┐  "…something across
 next 5 minutes /        │ Q1: lifetime of memory? │   sessions or the
 this single task"       └─────────────────────────┘   whole repo forever"
        │                                                       │
        ▼                                                       ▼
┌────────────────────┐                              ┌────────────────────────┐
│ LAYER 1            │                              │ Q2: durable decision,  │
│ Raw sources        │                              │ or binding rule?       │
│ (session-scoped)   │                              └──────────┬─────────────┘
│ • plan.md          │                           ┌─────────────┴─────────────┐
│ • SQL todos table  │                           ▼                           ▼
│ • /checkpoint      │                 "…a decision I want    "…a rule every
│ • ~/.copilot/      │                  the next session to    contributor and
│   session-state/   │                  *recall* (gotcha,      agent must
│ • session          │                  rationale, pattern)"   follow forever"
│   transcripts      │                           │                           │
└────────────────────┘                           ▼                           ▼
                                      ┌────────────────────┐  ┌────────────────────┐
                                      │ LAYER 2            │  │ LAYER 3            │
                                      │ The Wiki           │  │ The Schema         │
                                      │ (LLM-maintained    │  │ (binding rulebook) │
                                      │  markdown)         │  │                    │
                                      │ • .copilot/        │  │ • AGENTS.md        │
                                      │   lessons/ (proj)  │  │ • .github/         │
                                      │ • ~/.copilot/      │  │   instructions/    │
                                      │   lessons/ (user)  │  │   *.md             │
                                      │ • index.md / log.md│  │ • .github/         │
                                      │ • /consolidate-    │  │   copilot-         │
                                      │   lessons          │  │   instructions.md  │
                                      │ • agent            │  │ • agent            │
                                      │   personalities    │  │   personalities    │
                                      │   write to it      │  │   govern it        │
                                      └────────────────────┘  └────────────────────┘
```

---

## Layer-by-layer cheat sheet

| Layer | Name | Surface | Lifetime | Who writes it | Use when |
|------:|------|---------|----------|---------------|----------|
| 1 | **Raw sources** | `plan.md`, SQL `todos` / `todo_deps`, `/checkpoint`, `~/.copilot/session-state/<id>/`, session transcripts | This session only | The agent, live, as it works | You need todo tracking, a step-by-step plan, or a scratchpad that should *not* outlive the task |
| 2 | **The Wiki** — LLM-maintained markdown | `.copilot/lessons/` (project) and `~/.copilot/lessons/` (global). `index.md` is the catalog, `log.md` is the append-only journal, one file per lesson | Across sessions, in markdown, in git | The agent, by promoting durable findings out of Layer 1 | You want the next session to *recall* a decision, gotcha, rationale, or pattern without replaying the whole transcript |
| 3 | **The Schema** — binding rulebook | `AGENTS.md`, `.github/instructions/*.md`, `.github/copilot-instructions.md`, agent personalities in `.github/agents/` | Forever (binding, in git) | Humans, with agent help — governs how Layer 2 gets written | The rule applies to every contributor and every agent (commit hygiene, language idioms, security rules, review posture) |

---

## How the layers connect

```
Layer 1 (raw) ──▶ agent writes lesson ──▶ Layer 2 (wiki)
                                             │
                                             │ /consolidate-lessons
                                             │ promotes project lesson
                                             ▼
                                          ~/.copilot/lessons/
                                          (global wiki)
                                             │
                                             │ pattern recurs often enough
                                             │ to become a rule for everyone
                                             ▼
                                          Layer 3 (schema)
                                          AGENTS.md / instructions/
```

Three promotion paths — and only these three:

1. **Raw → Wiki.** A finding from Layer 1 ("this fixture has a footgun",
   "Drizzle beat Prisma because…") that proves durable graduates into a
   lesson file in `.copilot/lessons/`.
2. **Project wiki → Global wiki.** The `/consolidate-lessons` command
   (see [`.github/prompts/consolidate-lessons.prompt.md`](../.github/prompts/consolidate-lessons.prompt.md))
   promotes a project lesson to `~/.copilot/lessons/` when it applies
   beyond this repo, and flags stale or contradicting entries.
3. **Wiki → Schema.** A lesson that turns out to bind *every*
   contributor and *every* agent graduates into `AGENTS.md` or
   `.github/instructions/*.md`. This is a human-in-the-loop step, not
   automated. See [Lab 10 §10.3](../labs/lab10.md) for the walkthrough
   of agent personalities and how they govern wiki stewardship.

---

## Worked decision examples

| Situation | Layer | Why |
|-----------|------:|-----|
| "Track the 5 todos for this PR" | 1 | Disposable; dies with the session |
| "Remember why we picked Drizzle over Prisma" | 2 | Cross-session rationale — write a lesson, future sessions `cat` it instead of re-deriving |
| "This fixture has a footgun — don't forget next time" | 2 | Durable finding; belongs as a lesson in `.copilot/lessons/` |
| "I keep hitting the same gotcha in *every* repo, not just this one" | 2 (global) | `/consolidate-lessons` promotes it to `~/.copilot/lessons/` |
| "Always use `git add` per file in this repo" | 3 | Project rule, every contributor and every agent needs it — `AGENTS.md` |
| "Every C# file must follow DDD patterns" | 3 | Binding on everyone — `.github/instructions/dotnet.instructions.md` |
| "Our code-reviewer agent should be terse and bug-focused" | 3 | Personality governs how the agent writes lessons — lives in `.github/agents/code-reviewer.agent.md` |

---

## Which one *isn't* the answer?

A few surfaces sometimes get confused with memory but are **not** part
of the three-layer model:

- **Reindex** (semantic indexing of repo code) — this is a *retrieval*
  layer over files you already have. It has no lifetime of its own; it
  remembers whatever is currently checked in. If your question is
  answerable by reading the code, you don't need any memory layer at
  all. Covered in [Lab 10 §10.0](../labs/lab10.md).
- **Knowledge-graph servers** (e.g. a memory-MCP-style graph) — the
  workshop intentionally teaches the markdown-wiki pattern instead.
  Markdown round-trips are cheap, git-reviewable, and don't require a
  separate process to host. If you're tempted to stand one up, write
  a lesson in Layer 2 first and see if that's enough.
- **Behaviour-capture / "instinct" loops** — earlier iterations of the
  repo explored automated behaviour capture. The current pattern is
  simpler: capture the behaviour as a lesson in Layer 2, and if it
  turns out to be universal, promote it to Layer 3 by hand.

---

## Related references

- [`labs/lab10.md`](../labs/lab10.md) — hands-on walkthrough of all
  three layers against this repo.
- [`.copilot/lessons/README.md`](../.copilot/lessons/README.md) — the
  pattern, in-repo.
- [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md)
  — schema rules for how agents author the wiki.
- [`.github/prompts/consolidate-lessons.prompt.md`](../.github/prompts/consolidate-lessons.prompt.md)
  — the consolidation command that promotes project lessons to global
  and flags duplicates, staleness, and contradictions.
- [`AGENTS.md`](../AGENTS.md) — the top-level Layer 3 entry point.
