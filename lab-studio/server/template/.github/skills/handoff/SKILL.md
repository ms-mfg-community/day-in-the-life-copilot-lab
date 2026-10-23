---
name: handoff
description: Writes a hand-off document so a fresh session (or another agent) can resume work without the current conversation. Use when asked to hand off, checkpoint progress for a successor, or wrap up a work session.
---

# Handoff

Write a hand-off file that lets a session with NO shared history resume this
work. The requester supplies: a work description, a stop reason, any blocker,
and where to save the file.

## Required sections

```markdown
# Handoff — <work description>

## State of the work

<what is done, what is in flight, exact file paths touched>

## Stop reason

<why this session is stopping>

## Blockers

<anything a successor must resolve first, or "none">

## Fresh Context Prompt

<a single paragraph a fresh session can be given verbatim: where we
stopped, and the Immediate Next Step, named concretely>
```

Keep it under 40 lines. Name real files, not vague areas. The Fresh Context
Prompt must stand entirely on its own.
