# Lessons — Log

Append-only journal of lessons as they are learned. Newest entries at
the top. Entries graduate from this log into a dedicated topic file and
a row in [`index.md`](index.md) during `/consolidate-lessons` runs.

See [`.github/instructions/lessons.instructions.md`](../../.github/instructions/lessons.instructions.md)
for the entry schema.

---

## 2026-04-24 — Seed the wiki layer

- **Context:** Introducing Lab 10's markdown-lessons pattern.
- **Lesson:** Workshops that teach agent memory land better when the
  repo already contains a realistic wiki — learners can `cat` a lesson
  instead of imagining one.
- **Evidence:** Prior Lab 10 drafts that only described the pattern
  generated questions like "but what does a lesson actually look
  like?"; shipping `example-lesson.md` resolves that.
- **Action for future sessions:** When introducing a new agent-facing
  convention, commit at least one realistic worked example alongside
  the rules.
- **Promoted to:** [example-lesson.md](example-lesson.md) (workshop
  content authoring section of `index.md`).
