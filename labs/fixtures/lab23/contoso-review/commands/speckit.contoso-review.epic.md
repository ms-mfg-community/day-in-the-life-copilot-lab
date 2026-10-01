---
description: "Frame a body of work as an epic before any spec is written"
---

# Epic

Frame a body of work **before** anyone writes a spec. An epic answers "why are we
doing this, what does done look like, and what is explicitly out of scope" — so the
specs underneath it inherit a decision instead of re-litigating one.

The output is a single file at `.specify/epics/<slug>/epic.md`.

## User Input

```text
$ARGUMENTS
```

Treat the user input as a description of the body of work, optionally with a slug.

## Slug Resolution

Each epic gets its own directory under `.specify/epics/<slug>/`. Resolve the slug in
this order:

1. **User-provided slug** — use it verbatim after normalization (lowercase,
   hyphen-separated, digits and `-` only).
2. **Interactive** — ask the user, suggesting a 2–4 word kebab-case candidate derived
   from the description.
3. **Non-interactive** — generate a 2–4 word kebab-case slug yourself. If
   `.specify/epics/<slug>/` already exists, append the shortest disambiguating suffix
   (`-2`, `-3`, …). **Never overwrite an existing epic directory.**

## Steps

1. **Create the directory and seed the file.** Run the helper script for **your platform**
   from the repository root — both twins ship, so pick the one your shell runs:

   ```bash
   .specify/extensions/contoso-review/scripts/bash/create-epic.sh <slug>
   ```

   ```powershell
   .specify\extensions\contoso-review\scripts\powershell\create-epic.ps1 -Slug <slug>
   ```

   The script creates `.specify/epics/<slug>/` and copies the `epic-template`
   into it as `epic.md`. It refuses to overwrite an existing epic.

2. **Read the template** at `.specify/epics/<slug>/epic.md` and fill every section.
   Leave no `[PLACEHOLDER]` behind — an unfilled placeholder is the single most
   common reason an epic gets waved through a gate without being read.

3. **Be specific about non-goals.** The "Out of scope" section is what stops a spec
   underneath this epic from quietly growing. If you cannot name at least two things
   this epic is *not* doing, the epic is not yet framed.

4. **Derive the acceptance signals** — how will we know this epic is done? Write them
   as observable outcomes, not activities. They are not a QA checklist: `qa-review`
   reads a feature's spec, never the epic. Each signal flows into the acceptance
   criteria of the spec that delivers it, and QA checks it there.

5. **Report** the epic path and a one-paragraph summary, then stop. Do **not** start
   writing a spec: the next step is a human review gate.

## Notes

- This command does not create a feature. `.specify/feature.json` is untouched.
- The epic is deliberately written before `speckit.specify` so the spec has a frame
  to sit inside.
