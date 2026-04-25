---
description: "Schema for the LLM-maintained markdown wiki in .copilot/lessons/ and ~/.copilot/lessons/"
applyTo: "**/.copilot/lessons/**,**/lessons/**/*.md"
---

# Lessons Wiki — Authoring Schema

These rules govern how agents write and maintain the markdown wiki in
`.copilot/lessons/` (project scope) and `~/.copilot/lessons/` (global
scope). Background and pedagogy live in
[`.copilot/lessons/README.md`](../../.copilot/lessons/README.md) and in
[Lab 10](../../labs/lab10.md).

Agents **must** follow this schema whenever they create, update, or
consolidate lesson files. Humans can use the same rules, but the
primary audience is the agent.

## File layout

| File | Purpose | Append or replace? |
| --- | --- | --- |
| `index.md` | Catalog. Short bullets grouped by topic heading. | Edit in place during consolidation. |
| `log.md` | Dated append-only journal of new lessons. | Append; never rewrite history. |
| `<slug>.md` | One durable lesson per file. | Replace sections in place; keep a Revision log. |

`<slug>` is kebab-case, describes the lesson (not the author), and
matches the filename: `verify-dotnet-with-solution-build.md`, not
`2026-04-24-note.md`.

## Required front-matter for topic files

Every `<slug>.md` file starts with YAML front-matter:

```yaml
---
title: "One-sentence imperative title, ≤ 80 chars"
scope: project | global | project-override
tags: [kebab-case, list]
created: YYYY-MM-DD
updated: YYYY-MM-DD
related:
  - path/to/related/doc.md
---
```

Rules:

- `scope: project-override` means "this project lesson intentionally
  contradicts a global lesson." The consolidation prompt leaves these
  alone; a human must reconcile.
- `tags` are lowercase kebab-case. Reuse existing tags where possible;
  `/consolidate-lessons` reports tag drift.
- `updated` must change on every edit. `created` never changes.

## Required sections in topic files

In order, each topic file has:

1. `# <Title>` matching front-matter `title`.
2. `## Summary` — 1–3 sentences. The TL;DR an agent reads first.
3. `## Context` — when/where the lesson was learned; what failure
   surfaced it. Evidence matters; rumor doesn't.
4. `## Pattern` — the prescription. Code blocks, checklists, or
   step-by-step. For any shell command, provide **both** a WSL/Bash
   fenced block and a PowerShell fenced block.
5. `## Counter-examples` — optional, but highly recommended. "What
   looks right but isn't."
6. `## Also applies to` — optional. Cross-references to other lessons
   or repo areas.
7. `## Revision log` — dated bullet list. Append only.

## `log.md` entry shape

Each `log.md` entry is a level-2 heading and a bullet list:

```markdown
## YYYY-MM-DD — Short title

- **Context:** Where/when this came up.
- **Lesson:** What to do differently next time (imperative voice).
- **Evidence:** A link, a test name, a commit, an error message.
- **Action for future sessions:** The rule an agent should follow.
- **Promoted to:** `<slug>.md` (filled in at consolidation time; leave
  blank if not yet promoted).
```

## `index.md` entry shape

Bullets under a topic heading, each linking to a topic file:

```markdown
## <Topic heading>

- [<slug>](<slug>.md) — ≤120-char summary in imperative voice.
```

## Writing voice

- **Imperative, not descriptive.** "Run the full solution build" — not
  "I ran the full solution build."
- **Agent-to-agent.** Assume the reader is a future Copilot session
  without your current context.
- **Cite evidence.** A lesson without evidence is a guess. Link to a
  failing test, a commit, a PR comment, or quoted error output.
- **No secrets.** No API keys, customer data, or credentials. If a
  lesson is about handling a secret, describe the pattern abstractly.

## When to add, update, or split

| Situation | Action |
| --- | --- |
| Learned something you didn't know at the start of the session and it will matter next session. | Append to `log.md`. |
| The same lesson already exists in a `<slug>.md` file. | Update that file; bump `updated:`; append a Revision log bullet. |
| A topic file has grown past ~300 lines or covers two unrelated cases. | Propose a split during `/consolidate-lessons`. Do not split mid-session. |
| You're about to write the same lesson twice in one session. | You're overfitting to the immediate task. Stop and ask whether this is really durable. |

## Consolidation contract

`/consolidate-lessons` is the only mechanism that:

- Moves entries from `log.md` into topic files.
- Promotes `scope: project` lessons to `~/.copilot/lessons/` when they
  apply beyond this repo.
- Merges duplicate topic files.
- Flags contradictions between project and global scopes.

Non-consolidation edits should be surgical: fix a single file, don't
reorganize the wiki.

## Interaction with Layer 3 (AGENTS.md / other instructions)

If a lesson hardens into a rule that **must** apply on every task —
not just when the topic comes up — propose promoting it to
`AGENTS.md` or to a targeted `.github/instructions/*.md` file during
consolidation. Lessons are advisory; instructions are binding.
