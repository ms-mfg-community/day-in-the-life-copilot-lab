# WCAG 2.2 Level AA conformance record

The per-criterion conformance record of the Teaching SPA ([spec 005](../../../specs/005-teaching-spa.md),
section 2.11, AC16): one row per Level A and Level AA success criterion of the
[WCAG 2.2 Recommendation of 12 December 2024](https://www.w3.org/TR/WCAG22/) (31 Level A, 24 Level AA;
4.1.1 Parsing is removed in 2.2). The target is the application chrome and every interactive element.

`Method` is how the criterion is decided for this application:

- `automated`: the gate ([a11y-tool.md](a11y-tool.md); `npm run spa:test:a11y`) decides it in
  full, in every route and every opened state. Its evidence names the gate, and any other test that
  decides part of it.
- `manual`: a person decided it, and [a11y-manual-review.md](a11y-manual-review.md) says what was
  examined and found; the evidence also names the tests that hold the finding in place where there
  are any. A clean automated run is an input to several of these rows, never the whole of one
  (open questions Q9, Q10).

Every `Evidence` path is relative to the repository root and must exist; `tests/spa/a11y-checklist.test.ts`
checks the set of rows, the methods and the paths.

| Criterion | Name | Level | Method | Evidence | Notes |
|---|---|---|---|---|---|
| 1.1.1 | Non-text Content | A | automated | `tests/spa/a11y-browser-check.mjs`, `tests/spa/long-descriptions.test.ts` | No images in the chrome; the gate's `image-alt`, `svg-img-alt`, `role-img-alt`, `aria-meter-name` and `aria-progressbar-name` rules run in every state. The chart and the diagram, text-built, declare and carry a name and a long description (AC19). |
| 1.2.1 | Audio-only and Video-only (Prerecorded) | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 1.2.2 | Captions (Prerecorded) | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 1.2.3 | Audio Description or Media Alternative (Prerecorded) | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 1.2.4 | Captions (Live) | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 1.2.5 | Audio Description (Prerecorded) | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 1.3.1 | Info and Relationships | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/interaction-inventory.test.ts`, `tests/spa/a11y-browser-check.mjs` | Headings, lists, the definition list, the table and every APG role set; the AC6 audit and the gate's ARIA and list rules hold them. |
| 1.3.2 | Meaningful Sequence | A | manual | `workshop/spa/docs/a11y-manual-review.md` | DOM order is reading order; no CSS reordering. |
| 1.3.3 | Sensory Characteristics | A | manual | `workshop/spa/docs/a11y-manual-review.md` | Instructions name controls by label, never by shape, position or colour. |
| 1.3.4 | Orientation | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | Single column; nothing locks orientation. |
| 1.3.5 | Identify Input Purpose | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | No input collects information about the user. |
| 1.4.1 | Use of Color | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/a11y-browser-check.mjs` | Current segment, selected node, active tab and spent buttons are marked by more than colour; the gate's `link-in-text-block` rule runs. |
| 1.4.2 | Audio Control | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 1.4.3 | Contrast (Minimum) | AA | automated | `tests/spa/a11y-browser-check.mjs` | The gate's `color-contrast` rule, over every route and opened state. |
| 1.4.4 | Resize Text | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | Relative units throughout; reads at 200 % zoom. |
| 1.4.5 | Images of Text | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 1.4.10 | Reflow | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `workshop/spa/src/styles.css` | Measured: no horizontal scroll at 320 px on any route; code blocks wrap. |
| 1.4.11 | Non-text Contrast | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `workshop/spa/src/styles.css`, `tests/spa/interaction-behavior.test.ts` | Focus ring 3:1 or better against adjacent colours in both schemes; the selected node's colours are checked by the behaviour tests. |
| 1.4.12 | Text Spacing | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | Measured: nothing clipped under the criterion's spacing. |
| 1.4.13 | Content on Hover or Focus | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/interaction-behavior.test.ts`, `tests/spa/keyboard.test.ts` | The disclosure popover is dismissible, hoverable and persistent (AC13). |
| 2.1.1 | Keyboard | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/keyboard.test.ts`, `tests/spa/keyboard-browser-check.mjs` | Every inventory element and segment reached by keyboard alone, no pointer event (AC12). |
| 2.1.2 | No Keyboard Trap | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/keyboard.test.ts`, `tests/spa/interaction-behavior.test.ts` | Only the modal dialogs restrict focus, and Escape leaves them (AC13); keyboard lock never holds Escape. |
| 2.1.4 | Character Key Shortcuts | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/keyboard.test.ts`, `tests/spa/keyboard-browser-check.mjs` | A visible setting turns every single-character shortcut off; Ctrl+Alt equivalents (AC14). |
| 2.2.1 | Timing Adjustable | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/interaction-behavior.test.ts` | The timer starts only on Start, can be paused, stopped and reset, and moves nothing at the end. |
| 2.2.2 | Pause, Stop, Hide | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/interaction-behavior.test.ts`, `tests/spa/a11y-browser-check.mjs` | Nothing moves by itself; the carousel does not rotate; AC18 shows no auto-advance; the gate's `blink` and `marquee` rules run. |
| 2.3.1 | Three Flashes or Below Threshold | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 2.4.1 | Bypass Blocks | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/shell.test.ts`, `tests/spa/a11y-browser-check.mjs` | The skip link is first and moves focus to main; the gate's `bypass` rule runs. |
| 2.4.2 | Page Titled | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/a11y-browser-check.mjs` | Measured: unique, descriptive titles on every route; the gate's `document-title` rule runs. |
| 2.4.3 | Focus Order | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/interaction-behavior.test.ts`, `tests/spa/keyboard.test.ts` | Focus follows the DOM; dialogs take and return focus; roving tab stops. |
| 2.4.4 | Link Purpose (In Context) | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/a11y-browser-check.mjs` | Segment links carry titles; no "here" or "click" links; the gate's `link-name` rule runs. |
| 2.4.5 | Multiple Ways | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | Navigation on every route, URLs, the n and p shortcuts; the deck is a sequence. |
| 2.4.6 | Headings and Labels | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | Section titles as headings; every control's label says what it does. |
| 2.4.7 | Focus Visible | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `workshop/spa/src/styles.css`, `tests/spa/a11y-browser-check.mjs` | The `:focus-visible` ring on every control; the gate's control case shows it is applied to the focused control. |
| 2.4.11 | Focus Not Obscured (Minimum) | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/presentation-mode.test.ts` | Sticky controls in fullscreen with scroll padding; the presentation tests hold the check. |
| 2.5.1 | Pointer Gestures | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No gestures: single clicks only. |
| 2.5.2 | Pointer Cancellation | A | manual | `workshop/spa/docs/a11y-manual-review.md` | Activation on `click` (the up-event). |
| 2.5.3 | Label in Name | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/a11y-browser-check.mjs` | Visible text is the accessible name; the gate's `label-content-name-mismatch` rule runs. |
| 2.5.4 | Motion Actuation | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 2.5.7 | Dragging Movements | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/interaction-behavior.test.ts` | Slider set by keyboard and by Decrease/Increase buttons; nodes are buttons. |
| 2.5.8 | Target Size (Minimum) | AA | automated | `tests/spa/a11y-browser-check.mjs`, `workshop/spa/docs/target-size-exceptions.md` | Every visible interactive element measured 24 × 24 or more in every state, or matched to a declared exception (AC17); the gate's `target-size` rule runs too. |
| 3.1.1 | Language of Page | A | automated | `tests/spa/a11y-browser-check.mjs` | The gate's `html-has-lang`, `html-lang-valid` and `html-xml-lang-mismatch` rules; `lang="en"`. |
| 3.1.2 | Language of Parts | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/a11y-browser-check.mjs` | English throughout; the gate's `valid-lang` rule runs. |
| 3.2.1 | On Focus | A | manual | `workshop/spa/docs/a11y-manual-review.md` | Focus changes no context. |
| 3.2.2 | On Input | A | manual | `workshop/spa/docs/a11y-manual-review.md` | A setting changes and is announced; nothing submits or navigates. |
| 3.2.3 | Consistent Navigation | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | The same shell, in the same order, on every route. |
| 3.2.4 | Consistent Identification | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | One module per pattern builds the same control with the same label everywhere. |
| 3.2.6 | Consistent Help | A | manual | `workshop/spa/docs/a11y-manual-review.md` | The shortcuts dialog is in the same place on every route. |
| 3.3.1 | Error Identification | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No input can be in error; browser refusals are written in words. |
| 3.3.2 | Labels or Instructions | A | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/a11y-browser-check.mjs` | Every input labelled; instructions beside the Present controls; the gate's `label` and `select-name` rules run. |
| 3.3.3 | Error Suggestion | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 3.3.4 | Error Prevention (Legal, Financial, Data) | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 3.3.7 | Redundant Entry | A | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 3.3.8 | Accessible Authentication (Minimum) | AA | manual | `workshop/spa/docs/a11y-manual-review.md` | No such content. |
| 4.1.2 | Name, Role, Value | A | automated | `tests/spa/a11y-browser-check.mjs`, `tests/spa/interaction-inventory.test.ts` | The gate's ARIA, name and `nested-interactive` rules in every state, and the AC6 role-set audit of every inventory entry. |
| 4.1.3 | Status Messages | AA | manual | `workshop/spa/docs/a11y-manual-review.md`, `tests/spa/shell.test.ts`, `tests/spa/interaction-behavior.test.ts`, `tests/spa/sync-speaker.test.ts` | Segment, sync, timer, chart and reveal changes written to the `role="status"` region without moving focus. |
