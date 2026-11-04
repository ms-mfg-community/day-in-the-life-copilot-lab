# Which Memory Do I Use?

A 1-page decision tree for the Day-in-the-Life Copilot Lab. When you
reach for "memory", you are almost always picking one of **three
layers**, taught hands-on in [Lab 10](../labs/lab10.md). The layers do
not overlap. Layer 2, cross-session recall, comes in three flavours:
**native** (GitHub Copilot Memory), **DIY** (a markdown wiki in git) and
**custom** (a self-hosted memory service such as SCNS). Use this page to
decide, then jump to the lab section that teaches it hands-on.

> 🧭 **TL;DR:** start at the top of the flowchart and take the first branch
> whose question you answer "yes" to. If you land on Layer 2, use Q3 to
> pick a flavour. Promotion goes upward: **Raw sources → Recall →
> Schema.** Nothing lives in two layers at once. Layer 2 is advisory;
> only Layer 3 binds.

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
                                      │ Recall (advisory)  │  │ The Schema         │
                                      │                    │  │ (binding rulebook) │
                                      │ Pick one option:   │  │                    │
                                      │ • Copilot Memory   │  │ • AGENTS.md        │
                                      │   (native, hosted) │  │ • .github/         │
                                      │ • .copilot/        │  │   instructions/    │
                                      │   lessons/ wiki    │  │   *.md             │
                                      │   (DIY, in git)    │  │ • .github/         │
                                      │ • a custom service │  │   copilot-         │
                                      │   such as SCNS     │  │   instructions.md  │
                                      │                    │  │ • agent            │
                                      │ ▶ see Q3 below     │  │   personalities    │
                                      │                    │  │   govern it        │
                                      └────────────────────┘  └────────────────────┘
```

---

## Layer-by-layer cheat sheet

| Layer | Name | Surface | Lifetime | Who writes it | Use when |
|------:|------|---------|----------|---------------|----------|
| 1 | **Raw sources** | `plan.md`, SQL `todos` / `todo_deps`, `/checkpoint`, `~/.copilot/session-state/<id>/`, session transcripts | This session only | The agent, live, as it works | You need todo tracking, a step-by-step plan, or a scratchpad that should *not* outlive the task |
| 2 | **Recall** — advisory, cross-session | One of three flavours (see Q3): **Copilot Memory** (GitHub-hosted repository-level facts and user-level preferences); **the wiki** (`.copilot/lessons/` for the project and `~/.copilot/lessons/` globally — `index.md` is the catalog, `log.md` the append-only journal, one file per lesson); or **a custom service** such as SCNS | Across sessions. Copilot Memory expires unused memories; the wiki lives in git; a custom service keeps whatever its own rules allow | The agent: by storing a memory (on its own or when you ask; approval prompts depend on the surface), by writing a lesson, or through a service's tools | You want the next session to *recall* a decision, gotcha, rationale, or pattern without replaying the whole transcript |
| 3 | **The Schema** — binding rulebook | `AGENTS.md`, `.github/instructions/*.md`, `.github/copilot-instructions.md`, agent personalities in `.github/agents/` | Forever (binding, in git) | Humans, with agent help — governs how Layer 2 gets written | The rule applies to every contributor and every agent (commit hygiene, language idioms, security rules, review posture) |

---

## Q3 — which Layer 2 option?

Pick by **where the memory should live and who curates it**. Every
option is advisory: if a rule must hold every time, it belongs in
Layer 3.

| Option | What it is | Pick it when | Watch out for | Lab 10 |
|--------|------------|--------------|---------------|--------|
| **Native — Copilot Memory** | GitHub-hosted. **Repository-level facts** are scoped to one repository, created by people with write access, and used for anyone with read access who has Memory on. **User-level preferences** follow you across repositories. | You want zero setup and recall that works across Copilot surfaces | Depends on your plan and policy. Unused memories expire. Asking Copilot to "forget" only downvotes a memory — delete it in settings. | [§10.2](../labs/lab10.md) |
| **Native curation — Copilot Dreaming** | An optional background pass, in public preview, that curates memories and proposes instruction or skill changes as pull requests | Your organization wants hosted curation and accepts the cost | Every run bills AI credits, even a run that changes nothing. Memory changes apply without per-change approval. Memory and instruction curation need session sync. | [§10.5](../labs/lab10.md) — explained, not enabled |
| **DIY — the wiki** | Markdown in git: `.copilot/lessons/` and `~/.copilot/lessons/`, curated by `/consolidate-lessons` | You want memory you can `cat`, diff, review and revert, travelling with the repo | You do the curation. There is no semantic search. | [§10.3](../labs/lab10.md), [§10.5](../labs/lab10.md) |
| **Custom — SCNS** | A self-hosted, local-first memory service (alpha). It runs per-repository brokers over a SQLite vault with full-text and local-embedding search, and plugs into Copilot CLI through an extension and hooks. | You need semantic retrieval the markdown wiki cannot give, your own retention rules, or coordination across many agents and repositories | It is alpha software that you run, secure and back up. It does not replace instruction files. | [§10.6](../labs/lab10.md) |

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
   (see [`.github/skills/consolidate-lessons/SKILL.md`](../.github/skills/consolidate-lessons/SKILL.md))
   promotes a project lesson to `~/.copilot/lessons/` when it applies
   beyond this repo, and flags stale or contradicting entries.
3. **Wiki → Schema.** A lesson that turns out to bind *every*
   contributor and *every* agent graduates into `AGENTS.md` or
   `.github/instructions/*.md`. This is a human-in-the-loop step, not
   automated. See [Lab 10 §10.4](../labs/lab10.md) for the walkthrough
   of agent personalities and how they govern wiki stewardship.

The same rule applies to the other Layer 2 flavours. A Copilot Memory
fact that every contributor must follow belongs in an instructions
file, not just in memory: memory is used when it seems relevant, while
instructions apply every time.

---

## Worked decision examples

| Situation | Layer | Why |
|-----------|------:|-----|
| "Track the 5 todos for this PR" | 1 | Disposable; dies with the session |
| "Remember why we picked Drizzle over Prisma" | 2 | Cross-session rationale — write a lesson, future sessions `cat` it instead of re-deriving |
| "This fixture has a footgun — don't forget next time" | 2 | Durable finding; belongs as a lesson in `.copilot/lessons/` |
| "I keep hitting the same gotcha in *every* repo, not just this one" | 2 (global) | `/consolidate-lessons` promotes it to `~/.copilot/lessons/` |
| "In all my projects, explain a change before you make it" | 2 (native) | A user-level preference in Copilot Memory follows you everywhere |
| "In this repository, build the whole solution, not one project" | 2 (native) | A repository-level fact, shared with everyone who has read access and Memory on |
| "Curate our memories automatically overnight" | 2 (native curation) | Copilot Dreaming — a deliberate opt-in (yours on an eligible personal plan, an admin's for an organization), because every run costs AI credits |
| "Semantic recall across dozens of repos, with my own retrieval and retention rules" | 2 (custom) | A self-hosted service such as SCNS |
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
- **A generic knowledge-graph server** (e.g. a memory-MCP-style graph)
  is a storage engine, not a memory strategy. Start with Q3: Copilot
  Memory or the wiki covers most needs. If they don't, the custom
  option is a purpose-built memory service with its own retention,
  scoping and review rules (SCNS is the worked example) — not a bare
  graph store.
- **Behaviour-capture / "instinct" loops** — earlier iterations of the
  repo explored automated behaviour capture. The current pattern is
  simpler: capture the behaviour as a lesson in Layer 2, and if it
  turns out to be universal, promote it to Layer 3 by hand.

---

## Related references

- [`labs/lab10.md`](../labs/lab10.md) — hands-on walkthrough of all
  three layers and every Layer 2 option against this repo.
- [About GitHub Copilot Memory](https://docs.github.com/en/copilot/concepts/prompting-and-context/copilot-memory)
  — repository-level facts and user-level preferences.
- [SCNS](https://github.com/johnhain-msft/scns) — the custom memory
  service used as the worked example.
- [`.copilot/lessons/README.md`](../.copilot/lessons/README.md) — the
  pattern, in-repo.
- [`.github/instructions/lessons.instructions.md`](../.github/instructions/lessons.instructions.md)
  — schema rules for how agents author the wiki.
- [`.github/skills/consolidate-lessons/SKILL.md`](../.github/skills/consolidate-lessons/SKILL.md)
  — the consolidation command that promotes project lessons to global
  and flags duplicates, staleness, and contradictions.
- [`AGENTS.md`](../AGENTS.md) — the top-level Layer 3 entry point.
