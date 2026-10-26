# Retirement of workshop/site/hackathon.html

The Reveal.js hackathon deck, `workshop/site/hackathon.html`, is retired on 2026-10-26
([spec 005](../../../specs/005-teaching-spa.md), section 1 and child issue 14; AC21, AC23). The Teaching
SPA is the live-delivery surface in its place: `npm run spa:build` for the multi-file build and
`npm run spa:build:single` for the portable `workshop/spa/dist/standalone/teaching-spa.html`.

## What authorizes it

The rehearsal record [`rehearsal-2026-10-26.md`](rehearsal-2026-10-26.md), whose verdict is PASS.
That record says what it rehearsed and how; read it before taking the verdict further than it goes.

## What this record does

- It releases the AC21 freeze: `tests/spa/hackathon-untouched.test.ts` keys on this file existing
  and asserts nothing once it does. The baseline digest in
  [`hackathon-baseline.sha256`](hackathon-baseline.sha256) stays as the record of the bytes that
  were frozen.
- It arms AC23: `tests/spa/hackathon-retired.test.ts` now requires the page to be gone and no
  tracked file under `workshop/`, `scripts/` or `docs/` to point at it, this record and the
  rehearsal records excepted.

## What went with the page

- `workshop/site/hackathon.html`, deleted.
- `scripts/workshop/screenshot-slides.mjs` and `scripts/workshop/test-presenter-mode.mjs`, which
  screenshotted the deck and smoke-tested its presenter mode and had no other purpose, deleted.
- The `.gitattributes` line that pinned the page's bytes for the freeze, removed.
- `workshop/README.md` and `workshop/facilitator-guide.md`, which told the presenter to open the
  deck, now tell them to open the Teaching SPA.

`workshop/site/agenda.json` stays: the deck read it at run time, and `docs/workshop/presenter-script.md`
still describes the schedule it holds.
