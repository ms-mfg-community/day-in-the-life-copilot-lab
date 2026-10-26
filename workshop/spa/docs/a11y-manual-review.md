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
