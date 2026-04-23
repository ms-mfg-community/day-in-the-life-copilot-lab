---
title: "Advanced Copilot CLI Workshop — materials root"
arc: workshop-materials
phase: 2
---

# Advanced Copilot CLI Workshop — materials

This directory carries the live-delivery surface for the four-hour
Advanced Copilot CLI workshop. Labs under `labs/` remain authoritative
for self-paced study; materials here are curated slices that reference
the labs, not duplicates of them.

## Layout

- `curriculum.md` — source of truth for the module list, per-module
  advanced outcomes, anchor-lab mapping, and the 4-hour time budget.
  Phase 1 froze this file; slides, speaker scripts, and the
  facilitator guide derive from it.
- `slides/*.md` — slide source, one markdown file per module plus a
  cover. Phase 2 ships the skeleton; Phase 3 drops per-module content
  into the existing file shape. Each file carries YAML front-matter
  with `module`, `anchor_labs`, and `minutes` so tooling can
  cross-check against `curriculum.md` without re-parsing prose.
- `dist/` — built deck output (HTML). Generated, not checked in.
  Regenerate with `make slides`.

## Build

```
make slides
```

Produces `workshop/dist/index.html` — one self-contained HTML file
with embedded CSS, scroll-snap linear navigation, and printable slides
(use the browser's print dialog for PDF export; no separate toolchain
required for Phase 2).

## Slide framework decision

**Chosen: static HTML + zero-devDep Node build script**
(`scripts/workshop/build-slides.mjs`).

### Rationale

Lowest maintenance for the actual content shape — "talking-head slides
+ code blocks + screenshots + occasional diagrams, no animations, no
custom interactivity." The build script is ~180 lines of plain Node
(no runtime dependencies), renders a small markdown subset
(headings, fenced code, bullet lists, inline code, images), and emits
one self-contained HTML file. Authors still write markdown, so the
authoring ergonomic for Phase 3's code-heavy content matches what
reveal-md would have given us.

Lowest-maintenance criteria this choice meets:

1. **Zero new runtime dependencies** — nothing to pin, upgrade, or
   audit. `npm audit` deltas from this phase: 0 added advisories.
2. **No transitive CVE churn** — reveal-md pulls in mermaid →
   dompurify → ~10 open DOMPurify advisories plus an advisory on
   reveal-md itself via mermaid. We carry none of that.
3. **No build server, no watcher, no browser install** — a single
   Node script runs in under a second. CI runs it without extra
   setup.
4. **Self-contained output** — one HTML file, no asset graph. Print
   to PDF in a browser without a separate `--pdf` codepath.
5. **Scales to Phase 3 unchanged** — the markdown subset covers
   headings, code blocks, lists, inline code, and images, which is
   exactly the content shape `curriculum.md` calls for. Phase 3
   never needs to edit the builder.

### Rejected alternative: reveal-md

Rejected because its dependency tree (reveal.js + mermaid + dompurify
+ highlight.js + express + livereload) introduced 21 npm advisories
— 6 high, 14 moderate — on install, without delivering any feature
this deck needs (no animations, no live-reload requirement for a
once-a-quarter workshop, no mermaid diagrams in the curriculum).
"Lowest maintenance" does not survive a transitive CVE inbox.

### Rejected alternative: raw reveal.js

Rejected per plan default — no concrete requirement forces it.
Animations and fragment-based reveal are explicitly out of scope for
this deck.

### DevDep footprint

**Zero new devDependencies.** `package.json` is unchanged by Phase 2.

## Test surface

Phase 2 ships `tests/workshop/slides.test.ts` with **outcome-based
assertions only** (per `.orchestrator/plan.md` Phase 2 finding #4):

- `make slides` builds `workshop/dist/index.html` from a clean dist.
- Built HTML sets `<html lang>` and every `<img>` carries `alt`.
- Every internal `href`/`src` in the built HTML resolves on disk.
- Every repo-relative path referenced inside a slide code span
  resolves on disk (so a live-demo `cat labs/lab14.md` can't rot
  silently).
- Every `labNN` reference in slide source resolves to a real lab id
  in `docs/_meta/registry.yaml`.

Deeper a11y (contrast ratios, keyboard-only navigation) is Phase 5.
Per-module file-existence parity tests are explicitly **not** written,
so Phase 3 can evolve the slide layout without test churn.
