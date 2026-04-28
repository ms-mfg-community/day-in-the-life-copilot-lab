# Accessibility Notes — Advanced Copilot CLI Workshop

> Accessibility policy and verification notes for workshop materials.
> Read alongside [`workshop/rehearsal-checklist.md`](./rehearsal-checklist.md)
> and the slide source under `workshop/slides/`.

## Alt-text policy

- **Every image in `workshop/slides/*.md` MUST carry non-empty alt text.**
  Markdown `![alt](src)` with an empty `alt` is treated as a test
  failure by `tests/workshop/phase-5-rehearsal.test.ts`.
- Alt text describes what the image *conveys in context*, not the
  filename. For screenshots of CLI output, state the outcome
  (e.g. "Copilot CLI listing three installed plugins"), not the
  pixel content.
- Decorative-only graphics (logos, section dividers) are avoided in
  slide source. If ever added, use a short descriptive alt (e.g.
  "Workshop logo") — we do not ship empty-alt decorative images.
- The same rule applies to `workshop/fallback-screenshots/`: when
  real screenshots replace the stub `.placeholder` files, each image
  must ship with alt text in the `README.md` entry that references it.

## Color-contrast verification for slide templates

- Slide templates target **WCAG 2.1 AA** contrast minimums: 4.5:1 for
  body text, 3:1 for large text (≥ 18 pt regular or ≥ 14 pt bold).
- Code blocks on slides use the default reveal-md / static-HTML theme
  whose foreground/background pair has been spot-checked to clear
  4.5:1 on projector white-point. Any custom theme override must be
  re-checked before use.
- Avoid colour as the sole signal. Where speaker scripts mark cues
  with colour (e.g. red/green status), the slide also carries a text
  or icon cue so colour-blind attendees are not disadvantaged.
- Verify contrast on the actual projector in the venue during
  `## Room check` of the rehearsal checklist — ambient light can
  wash out otherwise compliant pairs.

## Caption guidance for demos

- If the live session is recorded, enable platform captions (Teams /
  Zoom / Meet auto-captions) before the first demo and confirm they
  are on during `## Tech check`.
- Narrate every demo action in plain language before performing it
  ("I'll now compose three MCP servers with `copilot --additional-mcp-config`, which registers Context7, Microsoft Learn, and memory")
  so audio-only attendees and caption readers follow without seeing
  the terminal.
- When a demo produces important textual output that is too small to
  read on the projector, read the key line aloud. The fallback
  screenshot in `workshop/fallback-screenshots/` should likewise be
  summarised in speech, not just shown.
- Post-session: attach the caption transcript to the recording when
  it is distributed; do not rely on attendees re-running the session
  to recover text.

## Keyboard navigation notes

- The built slide deck (`workshop/dist/index.html`) is operable with
  keyboard alone: **Arrow Right / Space** advances, **Arrow Left**
  retreats, **F** enters full-screen, **Esc** exits.
- Do not depend on mouse-only interactions in slides or demos.
- Terminal demos should be driven from the keyboard — no mouse
  pointer chases, which are disorienting for attendees using screen
  magnification.
- Verify keyboard-only navigation during the slide-advance rehearsal
  step of `workshop/rehearsal-checklist.md`.

## Verification checkpoints

| Checkpoint | Where it is enforced |
|---|---|
| Slide images have alt text | `tests/workshop/phase-5-rehearsal.test.ts` (automated) |
| Contrast verified on projector | `workshop/rehearsal-checklist.md` → Room check |
| Captions enabled before first demo | `workshop/rehearsal-checklist.md` → Tech check |
| Keyboard-only deck navigation | `workshop/rehearsal-checklist.md` → Slide-advance rehearsal |
