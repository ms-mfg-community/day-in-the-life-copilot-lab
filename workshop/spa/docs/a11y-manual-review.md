# Manual accessibility review

The manual half of the WCAG 2.2 Level AA conformance record
([wcag-22-aa-conformance.md](wcag-22-aa-conformance.md); [spec 005](../../../specs/005-teaching-spa.md),
section 2.11, AC16). Every criterion the record marks `manual` points here, and this file says what
was examined, how, and what was found. The automated half is the gate
([a11y-tool.md](a11y-tool.md)), whose clean run is one input to several rows below, never the
whole of one.

## Scope and method

- **Reviewed:** the Teaching SPA as built from `feature/curriculum-v2` on 2026-10-26 (SPA-10), the
  multi-file build served over `http://localhost` and the portable file over `file:`, in Chromium
  141 (Playwright) with spot checks in Firefox 142 (Playwright) and Chrome 155. The chrome
  (segment navigation, Present controls, keyboard settings, live region, skip link), every route
  (the eight segments and `#/script`) and every interaction of the inventory in its rest and
  opened states.
- **Who and how:** the review was performed by the implementer of child issue 10 by reading the
  shell and interaction source, driving the built page by keyboard in the browser, and taking
  measurements through the browser's own DOM and style APIs (a short Playwright script, not kept:
  the measured figures are recorded below so they can be re-taken). It was not performed with a
  screen reader; where a criterion depends on how assistive technology renders a construct, the
  finding says so and rests on the ARIA pattern the construct follows.
- **Content vs. chrome:** the slides and scripts are the curriculum's own Markdown, rendered by
  the content pipeline. Findings about their text (link purpose, headings, language, sensory
  references) are about what the eight segments hold today; a future lab is held to the same
  rules by the tests named in each row, and by this review being repeated.

## Measured facts

Taken on 2026-10-26 against the build of that day, at a 320 × 256 CSS px viewport unless stated.

| What | Finding |
|---|---|
| `document.title` per route | Unique and descriptive on every route: the segment's title, then " — Teaching SPA"; the script surface says "Speaker script — <segment> — Teaching SPA". |
| `<html lang>` | `en` on every route. |
| Horizontal scrolling at 320 px | None: `documentElement.scrollWidth` is 320 on every route after code blocks were made to wrap (`styles.css`, `pre`). Before that change, code blocks widened six of the nine routes to 516–724 px. |
| Text spacing (line height 1.5, letter spacing 0.12 em, word spacing 0.16 em, paragraph spacing 2 em, injected) | No element with `overflow: hidden` clips its content on any route. |
| Links whose text is "here", "click", "more" or "link" | None on any route. |
| Form fields without a label | None: the three checkboxes are wrapped in `<label>`, the screen `<select>` has a `<label for>`. |
| Live regions | One `role="status"` `aria-live="polite"` region in the shell on every route; the carousel's slide wrapper is `aria-live="polite"` (F100). |
| Headings | Every segment has the shell's `<h1>` (the segment title) followed by the slide's own `<h1>` and its `<h2>` sections; the script surface the same with `<h3>` demo steps. Two `<h1>`s per page is allowed by HTML and by WCAG; the order is otherwise regular. |

## Findings by criterion

Criteria the record marks `automated` are not repeated here. "No such content" means the
application has none of the content the criterion governs, which satisfies the criterion.

### Perceivable

- **1.1.1 Non-text Content (automated, with a manual part).** The chrome has no images. The two
  complex visuals (the parameter chart, the node diagram) and the carousel and timer are built from
  text and carry an accessible name and a long description reachable in the page, declared in the
  inventory and checked in the DOM (`tests/spa/long-descriptions.test.ts`, AC19). The chart's bars
  are `aria-hidden` decoration beside the figures they repeat.
- **1.2.1–1.2.5 Time-based media.** No such content: the application has no audio and no video,
  prerecorded or live.
- **1.3.1 Info and Relationships.** Headings are heading elements; lists are lists; the chart's
  outputs are a `<dl>`; the shortcuts dialog is a `<table>` with `<th scope="col">`; every widget
  follows its APG pattern's roles and states (tabs, accordion, dialog, carousel, slider, group),
  which `tests/spa/interaction-inventory.test.ts` audits for every entry (AC6) and the gate's ARIA
  rules check in every state. Labels are associated by `<label>` or `aria-labelledby`.
- **1.3.2 Meaningful Sequence.** The DOM order is the reading order on every route: skip link,
  navigation, main, controls, settings, live region; each widget's controls precede what they
  control. No CSS reorders content (no `order`, no absolute positioning except the dialog backdrop).
- **1.3.3 Sensory Characteristics.** The chrome's instructions name controls by their labels
  ("activate Present", "press Esc or F11"), never by shape, position or colour. The slides are
  text; the one reference to a position ("below") is in a code comment.
- **1.3.4 Orientation.** Nothing locks or depends on orientation; the layout is a single column.
- **1.3.5 Identify Input Purpose.** No such content: the only inputs are three checkboxes and a
  `<select>` of screens, none of which collects information about the user.
- **1.4.1 Use of Color.** The current segment is marked by weight and an underline, the selected
  diagram node by a thicker border and bold text as well as colour, the active tab by
  `aria-selected`, a spent button by `aria-disabled`; the chart's figures are written beside the
  bars. Links in slide text are underlined by default.
- **1.4.2 Audio Control.** No such content.
- **1.4.4 Resize Text.** All sizes are in `rem`, `em` or unitless line heights; at 200 % browser
  zoom (640 px effective width on a 1280 px window) every route reads without loss, as the reflow
  measurement at 320 px also shows.
- **1.4.5 Images of Text.** No such content.
- **1.4.10 Reflow.** Measured: no horizontal scrolling at 320 px on any route (table above). Code
  blocks wrap rather than scroll; the parameter chart's rows wrap (`flex-wrap`).
- **1.4.11 Non-text Contrast.** The focus indicator is `#1a5fb4`, 3 px, held 2 px off the control
  by a Canvas-coloured gap: 5.7:1 against white and 3.6:1 against a dark Canvas, so it is 3:1 or
  better against what is adjacent to it in either colour scheme. The selected node of the diagram
  is `#0b3d91` on `#ffffff` (10.4:1) with a 3 px border; the slider track and bars have a
  `CanvasText` border; checkboxes and buttons keep the user agent's rendering.
- **1.4.12 Text Spacing.** Measured: nothing clipped under the criterion's spacing (table above).
- **1.4.13 Content on Hover or Focus.** The disclosure popover is dismissible (Escape, without
  moving pointer or focus), hoverable (the pointer can cross onto it) and persistent (it stays
  while hovered, focused or activated): `tests/spa/interaction-behavior.test.ts`, the
  `disclosure-popover` block, and AC13 in `tests/spa/keyboard.test.ts`. Nothing else appears on
  hover or focus.

### Operable

- **2.1.1 Keyboard, 2.1.2 No Keyboard Trap, 2.1.4 Character Key Shortcuts.** `tests/spa/keyboard.test.ts`
  and `tests/spa/keyboard-browser-check.mjs` (AC12, AC13, AC14): every inventory element and every
  segment is reached by keyboard alone; the only focus restriction is the modal dialogs', which
  Escape leaves; the four single-character shortcuts have a visible off switch and Ctrl+Alt
  equivalents. Keyboard lock while presenting is optional, off by default and never holds Escape
  (`presentation.ts`, `KEYBOARD_LOCK_CODES`).
- **2.2.1 Timing Adjustable.** The segment timer is the only timing: it starts only when the
  presenter presses Start, can be paused, stopped and reset, and at the end says so and moves
  nothing (`segment-timer.ts`). No session, no time-out.
- **2.2.2 Pause, Stop, Hide.** Nothing moves, blinks or updates by itself: the carousel does not
  rotate, the timer counts only after Start and has Pause and Stop
  (`tests/spa/interaction-behavior.test.ts`). AC18 of the gate shows no content auto-advances.
- **2.3.1 Three Flashes.** No such content: nothing flashes.
- **2.4.1 Bypass Blocks.** The skip link is the first focusable element and moves focus to `<main>`
  (`main.ts`, `onSkipLinkClick`; `tests/spa/shell.test.ts`); the gate's `bypass` rule sees it.
- **2.4.2 Page Titled.** Measured: unique, descriptive titles on every route (table above); the
  gate checks a title is present.
- **2.4.3 Focus Order.** Focus follows the DOM, which is the reading order (1.3.2). A dialog takes
  focus to its first control and gives it back to its invoker; a tablist and the diagram rove
  their tab stop so Tab leaves them after one stop (`tests/spa/interaction-behavior.test.ts`,
  `tests/spa/keyboard.test.ts`).
- **2.4.4 Link Purpose (In Context).** Segment links carry the segment's title; slide links carry
  the text the curriculum wrote, none of them "here" or "click" (table above); the skip link says
  where it goes.
- **2.4.5 Multiple Ways.** Every segment is reachable from the navigation on every route, by its
  URL (`#/<id>`), and by the n and p shortcuts; the deck is a sequence, which is itself one of the
  criterion's ways.
- **2.4.6 Headings and Labels.** Headings are the curriculum's section titles; every control's
  label says what it does ("Present", "Exit presentation", "Lock the keyboard while presenting",
  "Single-key shortcuts (n, p, t and ?)", "Keyboard shortcuts", "Previous step", "Increase <parameter>").
- **2.4.7 Focus Visible.** `:focus-visible` draws the ring described under 1.4.11 on every
  control, in both colour schemes and under forced colours (`styles.css`); nothing removes an
  outline.
- **2.4.11 Focus Not Obscured (Minimum).** Windowed, nothing is sticky. In fullscreen the controls
  are sticky at the foot of the root with `scroll-padding-bottom` so a focused element is scrolled
  clear of them (`index.html`); `tests/spa/presentation-mode.test.ts` holds that check, as commit
  6937a0a records. The dialogs are modal, so what they cover is inert and not focused.
- **2.5.1 Pointer Gestures, 2.5.2 Pointer Cancellation.** No gestures: every pointer action is a
  single click on a button or link, activated on `click` (up-event), so it can be cancelled by
  moving off before release.
- **2.5.3 Label in Name.** Every control's visible text is its accessible name (buttons and links
  take their name from content; the labelled checkboxes from their `<label>` text).
- **2.5.4 Motion Actuation.** No such content.
- **2.5.7 Dragging Movements.** Nothing requires a drag: the slider is set from the keyboard and
  from its Decrease and Increase buttons; the diagram's nodes are buttons (`parameter-chart.ts`,
  `node-diagram.ts`; `tests/spa/interaction-behavior.test.ts`).

### Understandable

- **3.1.2 Language of Parts.** The content is English throughout; the few foreign words are
  technical terms used as English. No part is in another language.
- **3.2.1 On Focus.** Focusing a control changes no context. The one focus-driven change is the
  disclosure popover showing (additional content, no context change) and a tab activating on
  focus, which the APG recommends and which changes the panel beside it, not the context.
- **3.2.2 On Input.** Changing a checkbox or the screen `<select>` changes a setting and announces
  it; it submits nothing and moves nowhere.
- **3.2.3 Consistent Navigation, 3.2.4 Consistent Identification.** The navigation, controls and
  settings are the same shell on every route, in the same order; the same control has the same
  label everywhere (the widget buttons are built by one module per pattern).
- **3.2.6 Consistent Help.** The one help mechanism, the "Keyboard shortcuts" dialog, is in the
  same place (the keyboard section) on every route.
- **3.3.1 Error Identification, 3.3.3 Error Suggestion, 3.3.4 Error Prevention.** No such content:
  nothing is submitted and no input can be in error. Failures the browser reports (fullscreen
  refused, pop-up blocked, lock refused) are written to the page and the status region in words
  that say what happened and what to do (`presentation.ts`).
- **3.3.2 Labels or Instructions.** Every input has a label (table above); the Present controls
  carry their instructions beside them ("move this browser window onto the audience monitor, then
  activate Present").
- **3.3.7 Redundant Entry.** No such content: nothing is entered.
- **3.3.8 Accessible Authentication.** No such content: there is no authentication.

### Robust

- **4.1.3 Status Messages.** Segment changes, synchronization state, timer state, recomputed chart
  values, the stage of a reveal and the shortcut setting are written to the `role="status"` live
  region without moving focus (`live-region.ts`; `tests/spa/shell.test.ts`,
  `tests/spa/interaction-behavior.test.ts`, `tests/spa/sync-speaker.test.ts`). A failed fullscreen
  request is written there as a kept message (`presentation-mode.test.ts`); the spec's `alert`
  reservation is not used, because the live region is the one the presenter watches.

## What this review does not establish

- How a given screen reader renders each pattern: the constructs follow the APG patterns and
  expose the roles, names and states those patterns require, which is what was checked.
- Conformance of future curriculum content beyond what the tests named above re-check.

## Revision of 2026-10-26: the deck

After the review above, the shell was rebuilt as a lesson (`workshop/spa/index.html`,
`workshop/spa/src/shell/deck.ts`, `workshop/spa/src/content/diagrams.ts`,
`workshop/spa/src/styles.css`). What changed against the facts recorded above, re-taken on
2026-10-26 in Chromium 141 (Playwright) against the dev server and the multi-file build:

- **DOM order (1.3.2, 2.4.3).** The root's children are the skip link, the bar (`#journey`: Agenda,
  the brand, the position, Previous and Next; the Present controls; the keyboard settings; the
  module strip; the cover dialog), `main`, the pager and the live region
  (`tests/spa/presentation-mode.test.ts` pins it). The skip link is still the first focusable
  element. Visual order is DOM order throughout; no `order` is used. Absolute positioning: the
  dialog backdrops, the skip link (off the top until focused, at full size), the presenter setup
  panel (under the bar, from its Setup control), the disclosure popover, and the nodes of a drawn
  diagram over its wires.
- **Screens.** A segment's document is cut into screens after the interactions mount: the opener
  (module code, title, the curriculum's advanced outcome, the outline, the labs, the timer where
  there is one) and one screen per h2 section, each at least a viewport tall. Nothing is removed:
  every element of the document is in a screen, and a screen the staged reveal has not reached is
  `hidden` with its content. ArrowRight, ArrowLeft, PageDown and PageUp move between screens
  except inside a widget, a field or a dialog, where they keep their meaning; Next at the last
  screen reveals the next step of a staged module or opens the next module.
- **What the reader acts on.** A list whose items open with a name becomes reveal cards (the name
  a `button` with `aria-expanded`, the point `hidden` until pressed, a Reveal all control); a code
  block gets a Copy control; a text-drawn tree becomes an explorer (folders are `button`s with
  `aria-expanded`); a text-drawn flow described in `content/diagrams.json` becomes a drawing whose
  nodes are `button`s (`aria-pressed`) with a step-through, the wires `aria-hidden` SVG, the title
  a `figcaption`, and the original text block kept under a Text version disclosure. The diagram's
  own long-description list is left as written.
- **Layout (1.3.4, 1.4.10).** One column; the bar wraps below 1100 px and again below 720 px.
  Measured: `documentElement.scrollWidth` equals the viewport width at 1100, 820 and 320 px.
- **Headings.** The slide's own first `<h1>` is `display: none` inside the opener, so a segment has
  one `<h1>` (the shell's, with the module code as a CSS kicker) followed by the sections' `<h2>`s.
- **Sticky content (2.4.11).** The bar is the one sticky element, windowed and in fullscreen;
  `html` and the fullscreen root carry `scroll-padding-top` of its height, so an element scrolled
  into view for focus lands below it.
- **Focus indicator (1.4.11, 2.4.7), colour (1.4.1, 1.4.3).** As in the stylesheet's header: the
  ring is `#1a5fb4` (light; 6.3:1 on white, 5.8:1 on the page) or `#9cc4ff` (dark; 11:1 on the
  page, 10:1 on a surface), 3 px with a 2 px surface-coloured gap; `--text-muted` is 6.6:1 on white
  and 7.9:1 on the dark surface; link text 6.3:1 and 8.5:1. The current module is a filled chip
  with bold text, an open card carries its state, a chosen diagram node a thicker border. The
  widgets' faces are the stylesheet's; the dialog's backdrop and opaque panel and the node
  diagram's declared colours stay inline, checked by `tests/spa/interaction-behavior.test.ts`.
- **Multiple ways (2.4.5), labels (2.4.6, 2.5.3).** The cover (also the agenda: every module with
  its minutes, labs and sections, each a link; Start, the speaker script, Present), the module
  strip, the opener's outline, Previous and Next, the pager, the arrow keys. Every control's
  visible text is its name.
- **Target size (2.5.8).** Every control the deck adds is at least 24 CSS px: the strip's chips
  (2 rem), the bar's buttons (2.25 rem), the outline and card buttons (2.75 and 3.25 rem), the
  Copy control (2 rem), a diagram's nodes (their drawn box, never under 24 px at any width the
  gate measures), the tree's folder toggles (2 rem), the disclosure summaries. The gate measures
  them in every route and opened state, including the cover and the setup panel.
  `workshop/spa/docs/target-size-exceptions.md` is unchanged: the deck's links sit outside `#main`,
  and inside it the deck adds buttons, never links.
- **Status messages (4.1.3).** Unchanged: a move the deck causes is announced as any move is; a
  diagram's step caption is plain text beside its controls.
- **Motion (AC18).** The one transition (the focus ring's offset) is under
  `prefers-reduced-motion: no-preference`; no smooth scrolling, no colour transition.

Re-run over the deck's build on 2026-10-26: `npm run spa:test:a11y` (32 browser cases in Chromium
141, zero axe-core violations, every target measured, the cover and the setup panel audited open),
`npm run spa:test:keyboard`, `npm run spa:test:present`, `npm run spa:test:sync`,
`npm run spa:test:single`, `tests/spa/interactions-browser-check.mjs` (Chromium and Firefox) and
`tests/spa/rehearsal-browser-check.mjs` in the installed Chrome 155 all pass;
`npx vitest run tests/spa` passes (45 files). The gate audits an opened state with the page scrolled
to its top: axe's `target-size` rule reads a control that has scrolled under the sticky bar as
partially obscured, which is where the scroll is, not what the target is.
