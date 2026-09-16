---
agent: 'agent'
description: 'Consolidate .copilot/lessons/ — merge duplicates, promote project lessons to global, flag contradictions'
argument-hint: '[--dry-run] [--scope project|global|both]'
---

# /consolidate-lessons

Consolidate the markdown-lessons wiki introduced in [Lab 10](../../labs/lab10.md).
This command is the **only** supported way to promote entries out of
`log.md`, merge duplicate topic files, or move project lessons into
the global scope.

Authoring rules: [`.github/instructions/lessons.instructions.md`](../instructions/lessons.instructions.md).
Pattern overview: [`.copilot/lessons/README.md`](../../.copilot/lessons/README.md).

## Inputs

- `--dry-run` (optional) — print the planned changes as a diff and
  stop. No files written.
- `--scope` (optional, default `both`) — limit consolidation to
  `project` (repo-local `.copilot/lessons/`), `global`
  (`~/.copilot/lessons/`), or `both`.

If the user did not pass arguments, default to `--scope both`
without `--dry-run`, and summarize what you will change before
writing.

## Procedure

### 1. Inventory

Enumerate the wiki:

```bash
ls -1 .copilot/lessons/ 2>/dev/null
ls -1 "$HOME/.copilot/lessons/" 2>/dev/null
```

```powershell
Get-ChildItem -Name .copilot\lessons 2>$null
Get-ChildItem -Name "$HOME\.copilot\lessons" 2>$null
```

Read every `index.md`, `log.md`, and `<slug>.md` in scope. Build an
in-memory map of:

- **Topic files** keyed by slug, with their front-matter (`scope`,
  `tags`, `updated`) and section headings.
- **Log entries** keyed by date + title, with any `Promoted to:` value.
- **Index bullets** keyed by the file they point to.

### 2. Promote log entries

For each `log.md` entry whose `Promoted to:` is blank:

1. Decide whether it belongs in an existing topic file or a new one.
2. If new: create `<slug>.md` using the required front-matter and
   section set from `lessons.instructions.md`. Slug must be kebab-case
   and describe the lesson.
3. If existing: append a bullet under `## Pattern` (or the most
   relevant section) and add a dated line to that file's
   `## Revision log`. Bump `updated:`.
4. Add a row to `index.md` under the appropriate topic heading.
5. Fill in `Promoted to:` on the `log.md` entry. **Do not delete log
   entries** — the log is append-only history.

### 3. Merge duplicates

Two topic files are duplicates when their titles, tags, or summaries
describe the same lesson. For each duplicate pair:

1. Keep the file with the earlier `created:` date as canonical.
2. Merge unique content from the other file's `Pattern`,
   `Counter-examples`, and `Also applies to` sections into the
   canonical file.
3. Append a `## Revision log` entry noting the merge and the retired
   slug.
4. Delete the duplicate file **and** update any `index.md` bullets or
   inter-lesson links that pointed at it.

### 4. Promote project → global

A `scope: project` lesson is a candidate for promotion when it:

- References no repo-specific paths (no `dotnet/ContosoUniversity...`,
  no `labs/`, no project-specific tool names);
- Describes a pattern that applies to the agent's behavior across
  repos (coding style, verification discipline, prompt hygiene).

For each candidate:

1. Copy the file to `~/.copilot/lessons/<slug>.md`.
2. Change `scope:` to `global` in the copy and bump `updated:`.
3. Replace the project file's body with a short stub that points at
   the global version, or delete the project file if nothing project-
   specific remains. Keep an `index.md` entry in the project wiki
   only if the project still benefits from a local pointer.
4. Record the promotion in the global `log.md` and in the project
   `log.md` (one line each).

### 5. Flag contradictions

If a global lesson and a project lesson disagree and the project
lesson is **not** marked `scope: project-override`:

- Do not auto-resolve.
- Print a `CONTRADICTION` section in your summary listing each pair
  with file paths, conflicting claims, and the relevant `updated:`
  dates.
- Leave the files untouched and recommend a human reviewer.

### 6. Tag and link hygiene

- Normalize tags to lowercase kebab-case.
- Report (but don't silently rename) any tag used in only one file —
  either the lesson is mis-tagged or the tag should be adopted more
  broadly.
- Fix broken relative links in any file you touch.

### 7. Summarize

Print, in order:

1. **Promotions** — log → topic-file moves.
2. **Merges** — duplicate topic files collapsed.
3. **Project → global** — lessons moved to `~/.copilot/lessons/`.
4. **Contradictions** — pairs flagged for human review.
5. **Tag drift** — singleton tags worth reviewing.
6. **Files touched** — explicit list, suitable for a commit message.

If invoked with `--dry-run`, stop here without writing.

## Commit guidance

When the run is not a dry run, stage files individually (per
`AGENTS.md`: never `git add .` or `git add -A`) and propose a single
commit with the `docs:` prefix, e.g.:

```
docs: consolidate lessons wiki (promote 2, merge 1, flag 1 conflict)
```

Do not commit on the user's behalf unless explicitly asked.

## Scheduling note

This prompt is **command-only** by design. If you want consolidation
on autopilot, add a cron/launchd/Task Scheduler entry that invokes
`copilot /consolidate-lessons` on a cadence that matches how quickly
your wiki grows (weekly is a reasonable default). Lab 10 §10.4 shows
a one-line cron example; no cron is shipped in this repo.
