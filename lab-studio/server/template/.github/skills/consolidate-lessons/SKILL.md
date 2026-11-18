---
name: consolidate-lessons
description: Promotes lessons from the append-only log into curated topic files and the index of the lessons wiki at .copilot/lessons/. Use when asked to consolidate, promote, or reorganize lessons.
---

# Consolidate Lessons

Reshape the lessons wiki: promote durable `log.md` entries into topic files
and the index. Options (passed as plain text in the request):

- `--dry-run` — report what would change; write NOTHING.
- `--scope project` — operate only on this workspace's `.copilot/lessons/`.

## Procedure

1. Read `.copilot/lessons/index.md`, `log.md`, and every topic file.
2. For each `log.md` entry whose `Promoted to:` is blank, decide:
   - **Promote** — durable and new: create `<topic>.md` following the schema
     in `.github/instructions/lessons.instructions.md`, or merge into an
     existing topic file (add a Revision log bullet).
   - **Hold** — task-specific or unproven: leave it in the log.
3. For every promotion: fill in the entry's `Promoted to:` line with the
   topic file name, and add one bullet to `index.md` under a topic heading.
4. Never delete log entries. Never rewrite old entries beyond `Promoted to:`.
5. Finish with a summary: decisions per entry, then a **Files touched** list.
   In a dry run the list must be empty.
