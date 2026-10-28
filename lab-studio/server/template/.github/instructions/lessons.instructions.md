---
description: "Schema for the lessons wiki — how Copilot records and promotes lessons"
applyTo: "**/.copilot/lessons/**"
---

# Lessons Wiki Schema

## log.md entries (append-only, newest first)

Each entry is a level-2 heading plus a bullet list:

```markdown
## <YYYY-MM-DD> — <one-line lesson>

- Context: <what was happening>
- Lesson: <the durable fact>
- Evidence: <file paths or observations that back it up>
- Action for future sessions: <what to do differently>
- Promoted to: <blank until consolidation fills it in>
```

## Topic files

One durable lesson per file, with front-matter: `topic`, `scope`
(`project` | `global` | `project-override`), `updated`, `tags`. Body carries
**Context**, **Lesson**, **Evidence**, and a `## Revision log` list.

## Rules

- `log.md` is append-only — never rewrite old entries except to fill in
  `Promoted to:`.
- `index.md` gets exactly one bullet per promoted lesson, under a topic
  heading.
- Lessons are advisory (Layer 2). A rule that must bind every task belongs
  in the schema layer instead (AGENTS.md or an instructions file).
