# Rehearsal 2026-10-26

The rehearsal of the Teaching SPA that child issue 13 of [spec 005](../../../specs/005-teaching-spa.md)
calls for (AC22), held on 2026-10-26 on the presenter machine against `feature/curriculum-v2` at
commit `387b96d`, with SPA-07 through SPA-11 merged and the defect below fixed in that commit.

**What kind of rehearsal this was.** There was no audience and no second person: the deck was
driven end to end by a script in real browsers, `tests/spa/rehearsal-browser-check.mjs`, which
does what a presenter does (a click on Present, the n and t keys, Enter and Escape on the widgets,
the Exit control) and records what the page and the speaker script window showed, with one run
headed in the installed Chrome so that fullscreen landed on this machine's own two monitors. It
rehearsed the application, not the delivery of the curriculum: nothing here says how the material
reads from the podium. A rehearsal in the room, by the presenter, is still worth holding before the
first session; this record is what authorizes the retirement of the old deck (AC23), and it says
exactly what it covered.

## Environment

| | |
|---|---|
| Machine | Windows 11 Pro, build 10.0.26300, two monitors (`screen.isExtended` was true in the headed run; `getScreenDetails()` listed 2 screens in the probe campaign's headed check) |
| Build | `feature/curriculum-v2` at `387b96d`; `npm run spa:build` (multi-file, served over `http://localhost` by the check's own static server) and `npm run spa:build:single` (`workshop/spa/dist/standalone/teaching-spa.html`, opened over `file:`) |
| Runtime | Node 24.15.0; Playwright 1.56.1 from npm's npx cache (`scripts/spa/lib/playwright.mjs`); nothing installed for the rehearsal |
| Chrome | 155.0.8059.86, the installed browser, launched by channel: one headless run and one headed run |
| Edge | 156.0.4314.42, the installed browser, launched by channel, headless |
| Firefox | 142.0.1, Playwright's build of Firefox, headless |
| Safari | not available on this machine; its rows of the capability matrix are `not measured` |
| Content | the deck of `workshop/spa/content/deck.json` as of this commit: eight segments (M1, M2, M3, M4, M5, M5b, M5c, M6), the nine interactions of `interactions.json`, the eight speaker scripts |

## What was presented

The walk, in each of the four runs (Chrome headless, Chrome headed, Edge, Firefox):

1. The first segment opened at `#/m1-extensibility-architecture`; Present was enabled.
2. Presentation mode with the speaker script window. In Chrome and Edge from one click, with "Also
   open the speaker script window" on: fullscreen began and stayed, and the script window opened. In
   Firefox, which ends fullscreen whenever a window opens or is raised, by the page's own two-step
   path: "Open speaker script" first, then Present. Fullscreen began and stayed in every run.
3. The script window reported `synchronized` over `broadcastchannel` within 3–73 ms of opening.
4. The n shortcut through all eight segments; the script window followed every move, the slowest
   in 115 ms (Chrome headless), 44 ms (Edge), 88 ms (Firefox), 27 ms (Chrome headed), against the
   500 ms of AC9.
5. On M1, t started the segment timer and t paused it; the script window showed `running`, then
   `paused`.
6. On M4, all ten steps of the staged reveal, from its Next step control by keyboard; the script
   window showed each stage.
7. On M5c, the enlarged synergy diagram opened on Enter and closed on Escape, focus back on its
   button.
8. Exit presentation: the window was windowed again and the status region said "Presentation mode
   off. Fullscreen ended and the window is showing segment 7 of 8".
9. The portable file from disk: it booted under its Content-Security-Policy, presented, opened its
   script window from the same file (origin `null`), and the script followed two moves over
   `broadcastchannel` within 9–123 ms.

The gates were run on the same build and all passed: `spa:test:present` (42 browser cases),
`spa:test:sync` (75 browser cases), `spa:test:keyboard` (18 Vitest, 4 browser cases in Chromium
and in Firefox), `spa:test:a11y` (30 browser cases in Chromium and in Firefox, zero axe-core
violations in every route and opened state; 12 Vitest), `spa:test:single` (16 Vitest, 5 browser
cases in Chromium and in Firefox), the AC11 matrix test over the probe campaign of the same day
(99 of 132 rows measured), and the whole Vitest suite.

## Defects found

- **D1, fixed in `387b96d`.** With "Also open the speaker script window" on, Present opened the
  window and never went fullscreen: the status region said "Fullscreen could not start", in Chrome,
  Edge and Firefox alike. Found in the first Chrome run. Cause, measured with a page of its own in
  all four engines (Chrome 155, Edge 156, Firefox 142, WebKit 26): a `window.open()` before
  `requestFullscreen()` leaves no user activation for the request, which Chrome, Edge and Firefox
  refuse; a `window.open()` and a `keyboard.lock()` made once fullscreen has begun are honoured in
  all four. The handler now requests fullscreen first and opens the window and takes the lock once
  fullscreen has begun. **This contradicts the order section 2.5 of the spec calls normative**, which
  rests on the fullscreen steps consuming the activation (F1); the spec needs amending on this point,
  which is not done here. The earlier gates had not caught it because the browser check stubs
  `window.open` and the sync check leaves fullscreen as soon as the window has opened.
- **Browser behaviour, not a defect of the application, recorded for the presenter.** Firefox (and
  WebKit) end fullscreen when a new window opens or is raised, whatever the order. The page now
  carries an "Open speaker script" control and says, beside the option, to use it first in Firefox
  and Safari, then Present with the option off. The Firefox run used that path and stayed fullscreen.
- Nothing else was found: every move, state and announcement listed above was as the spec requires.

## Verdict

PASS. The application did what the spec requires it to do in presentation, from the keyboard,
with the speaker script window following in every run, in Chrome, Edge and Firefox, over
`http://localhost` and from a file, with the one defect found fixed and retested in the same
rehearsal. The verdict is for what this record says was rehearsed: a scripted run-through on the
presenter machine, not a session in front of a room.
