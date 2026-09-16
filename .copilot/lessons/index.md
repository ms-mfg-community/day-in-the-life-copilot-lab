# Lessons — Index

Hand-curated catalog of durable lessons this agent has learned while
working in this repository. Agents consult this file first when a task
resembles prior work. See [`README.md`](README.md) for the pattern and
[`.github/instructions/lessons.instructions.md`](../../.github/instructions/lessons.instructions.md)
for authoring rules.

## How to use this file

- **Reading:** Scan headings and summaries; open the linked lesson file
  only if the task matches.
- **Writing:** Add an entry under the matching section with a link to a
  kebab-case lesson file in this directory. Keep the one-line summary
  under ~120 characters.
- **Promotion:** Entries are promoted here from `log.md` during
  consolidation. New lessons start in `log.md`.

## Build & verification

- [example-lesson](example-lesson.md) — Run the full solution build
  after .NET edits; `dotnet test` alone misses Web-only breakages.

## Workshop content authoring

- [example-lesson](example-lesson.md) — Ship every shell command in a
  lab with both a WSL/Bash fence and a PowerShell fence.

<!--
  Consolidation notes: when two bullets reference the same lesson file,
  that's fine — it means the lesson is indexed under more than one
  heading. When two bullets reference *different* files with the same
  topic, /consolidate-lessons should merge them.
-->
