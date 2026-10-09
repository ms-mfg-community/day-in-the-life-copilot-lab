# 005 — Teaching SPA for the "Everything GitHub Copilot" curriculum

| | |
|---|---|
| **State** | `verified` |
| **Created** | 2026-10-09 |
| **Last updated** | 2026-10-09 |
| **Milestone** | Curriculum v2 — Labs Refresh & Teaching SPA |
| **Depends on** | none |
| **Executed by** | `dev-qa-judge` |

---

## 1. Objective and non-goals

### Objective

A presenter teaching the "Everything GitHub Copilot" hands-on curriculum needs a surface a
slide deck cannot give them: controls that change state, charts that recompute from presenter
input, diagrams that can be stepped through and interrogated, and reveals that respond to the
room rather than to a fixed click order. This spec describes that surface — the **Teaching
SPA** — as a real single-page application *built over* the curriculum's existing structured
markdown and JSON rather than a renderer that turns markdown into slides at load time, so the
teaching surface cannot drift away from the labs it teaches. The application runs fullscreen on
the monitor the audience sees and opens a **separate speaker-script surface** on a second
monitor that stays synchronized with it; multi-monitor is the normal case here, not an edge
case. The presenter frequently works from a laptop, possibly offline and possibly from a local
file, so the application must also exist as a single portable HTML file, must be fully operable
from the keyboard, and must conform to WCAG 2.2 Level AA across its chrome and every
interactive element. Where no published source establishes whether a browser mechanism works in
a given deployment — above all, synchronization and monitor selection from a `file:` URL — this
spec says so plainly in §4 instead of guessing, and requires the application to **probe and
degrade visibly** rather than assume.

### Non-goals

- **The lab content itself.** No lab, slide, speaker script, agenda entry or registry entry is
  authored, edited, re-ordered or retired by this spec. The application consumes them.
- **Any other spec.** This spec defines one application and the issues that build it.
- **Touching `workshop/site/hackathon.html`.** It stays byte-identical until a live rehearsal
  records the verdict `PASS` (AC21, AC22). A rehearsal that records `FAIL` is the state of
  *not proven*, so it leaves the freeze in force; only a `PASS` record releases it. The page is
  then retired by its own child issue (AC23) and by nothing else. Retirement means the file is
  gone and nothing under `workshop/`, `scripts/` or `docs/` still points a reader or a script at
  it. It does **not** mean the path stops being *named*: this spec names it, the retirement's own
  records under `workshop/spa/docs/` name it, and the criteria that retire it could not be
  written otherwise. AC23 is scoped to that code-and-documentation surface and excludes both,
  because a criterion that forbids its own text is not a criterion.
- **Replacing the Reveal.js deck build.** `scripts/workshop/build-slides.mjs`, the
  `make slides` target and `workshop/dist/` are untouched by this spec.
- **Server-side anything.** No backend, no database, no authentication, no runtime network
  calls during a presentation. The hosted deployment target is a static file server.
- **An authoring tool or CMS.** Content is edited as files in the repository and reviewed in
  pull requests, like the rest of the curriculum.
- **Telemetry or analytics** of any kind, at build time or presentation time.
- **Attendee self-serve mode, an LMS integration, localization, or PDF/print export.** The
  attendee handout keeps its existing path.
- **The `feature/epic-enterprise-harness` arc (Labs 21–26)**, which remains out of scope across
  Curriculum v2.

---

## 2. Acceptance criteria

Each criterion is **observable**: checkable by a named command or a named artifact.
A criterion no one can run is a wish, not a criterion.

The commands named below are npm scripts that §2.1 requires `package.json` to define, and the
artifacts are repository paths. §2.2–§2.11 are the **normative requirements each criterion
tests**: the table is the contract, the subsections are its content.

| # | Criterion | How it is observed |
|---|---|---|
| AC1 | Every file under `workshop/spa/content/` validates against a schema in `workshop/spa/schema/`, the front matter of every `workshop/slides/*.md`, `workshop/speaker-scripts/*.md` and `labs/*.md` validates against `workshop/spa/schema/frontmatter.schema.json`, and an intentionally invalid fixture fails | `npm run spa:validate` exits 0 for `workshop/spa/content/` and for those three curriculum globs, non-zero for `tests/spa/fixtures/invalid/` |
| AC2 | Every `slideSource`, `scriptSource` and `labRefs` entry in `workshop/spa/content/deck.json` resolves to an existing file, and each segment's `minutes` equals the `minutes` front-matter value of its slide source | `npx vitest run tests/spa/content-refs.test.ts` |
| AC3 | Built HTML derived from curriculum markdown contains no `on*` event-handler attribute, no `<script>`, no `javascript:` URL, and gives every heading a prefixed `id` | `npx vitest run tests/spa/markdown-pipeline.test.ts` |
| AC4 | The multi-file build succeeds and writes `workshop/spa/dist/index.html` | `npm run spa:build` exits 0 and the artifact exists |
| AC5 | The portable build writes `workshop/spa/dist/standalone/teaching-spa.html` containing no `<script src=`, no `<link rel="stylesheet"`, and no `import(` of a relative or absolute URL | `npm run spa:build:single` then `npx vitest run tests/spa/single-file.test.ts` |
| AC6 | Every `id` in `workshop/spa/content/interactions.json` is present in the built DOM carrying the ARIA role set its declared `pattern` requires, and every declared `pattern` is one of the patterns named in §2.4 | `npx vitest run tests/spa/interaction-inventory.test.ts` |
| AC7 | Activating the Present control from a real user gesture puts `[data-spa-root="presentation"]` into fullscreen | `npm run spa:test:present` |
| AC8 | When fullscreen ends without the application asking (simulated `fullscreenchange` with a null `fullscreenElement`), the application returns to windowed state on the same segment and writes the change to its status region | `npm run spa:test:present` |
| AC9 | Opening the speaker-script surface from the presentation window and then advancing the presentation updates the script surface's `data-segment-index` to the same value within 500 ms | `npm run spa:test:sync` |
| AC10 | With every transport forced to fail, the script surface shows its `not-synchronized` state, exposes manual navigation, and announces the change in its status region | `npm run spa:test:sync` |
| AC11 | `workshop/spa/docs/capability-matrix.md` holds one table whose column headers are exactly `Mechanism`, `Browser`, `Target`, `Verdict`, `Evidence`, with exactly one row for every combination of the eleven mechanisms named in §2.8, the four browsers `Chrome`, `Edge`, `Firefox` and `Safari`, and the three targets `file:`, `http://localhost` and `https://` — 132 rows, no duplicates, none missing. Every `Verdict` cell is exactly one of `works`, `fails`, `not measured`. Where the verdict is `works` or `fails`, the `Evidence` cell is either a probe-run id naming a file that exists under `workshop/spa/docs/probe-runs/` or a URL that appears in the §3 table of this file. Where the verdict is `not measured`, the `Evidence` cell is exactly `—` or the id of a `Q` row that appears in the §4 table of this file | `npm run spa:probe` then `npx vitest run tests/spa/capability-matrix.test.ts` |
| AC12 | A keyboard-only traversal reaches every element listed in `interactions.json` and every segment, with the test failing if any pointer event is dispatched | `npm run spa:test:keyboard` |
| AC13 | For every modal and every hover/focus popover, `Escape` dismisses it and focus returns to the element that invoked it | `npm run spa:test:keyboard` |
| AC14 | With the "single-key shortcuts" setting off, pressing every character bound as a shortcut changes no application state; with it on, each one does | `npm run spa:test:keyboard` |
| AC15 | `workshop/spa/docs/a11y-tool.md` names the automated accessibility checker the gate runs and the exact rule or tag selection passed to it; the gate runs that checker with exactly that selection over every route and over every interaction's opened state and reports zero violations | `npm run spa:test:a11y` exits 0, and `npx vitest run tests/spa/a11y-tool-config.test.ts` fails if the runner's configuration differs from the declaration in that file |
| AC16 | `workshop/spa/docs/wcag-22-aa-conformance.md` has one row per Level A and Level AA success criterion of WCAG 2.2, each with a `method` of `automated` or `manual` and a non-empty evidence path that resolves on disk | `npx vitest run tests/spa/a11y-checklist.test.ts` |
| AC17 | Every interactive element's bounding box is at least 24 × 24 CSS px, or is listed in `workshop/spa/docs/target-size-exceptions.md` naming the exception it relies on | `npm run spa:test:a11y` |
| AC18 | Under an emulated `prefers-reduced-motion: reduce`, no element has a non-zero computed animation or transition duration, and no content auto-advances | `npm run spa:test:a11y` |
| AC19 | Every chart and every diagram has an accessible name and a long description that is reachable in the page, declared in `interactions.json` and present in the DOM | `npx vitest run tests/spa/long-descriptions.test.ts` |
| AC20 | The portable build's first element inside `<head>` is a `<meta http-equiv="Content-Security-Policy">` whose `script-src` lists only `sha256-` hashes that match the file's inline scripts and contains none of `'unsafe-inline'`, `'unsafe-eval'`, `data:` | `npx vitest run tests/spa/single-file-csp.test.ts` |
| AC21 | Unless some `workshop/spa/docs/rehearsal-*.md` has a `## Verdict` section whose first word is `PASS`, `workshop/site/hackathon.html` is present and its SHA-256 equals the value in `workshop/spa/docs/hackathon-baseline.sha256`. A record whose verdict is `FAIL`, and the absence of any record, each leave this guard armed | `npx vitest run tests/spa/hackathon-untouched.test.ts` |
| AC22 | A rehearsal record `workshop/spa/docs/rehearsal-<YYYY-MM-DD>.md` exists containing the headings `## Environment`, `## What was presented`, `## Defects found`, `## Verdict`, and a `Verdict` section whose first word is `PASS` or `FAIL` | `npx vitest run tests/spa/rehearsal-record.test.ts` |
| AC23 | Once a rehearsal record with verdict `PASS` exists, `workshop/site/hackathon.html` is absent from the working tree and no tracked file under `workshop/`, `scripts/` or `docs/` references that path, other than the retirement's own records under `workshop/spa/docs/` | `npx vitest run tests/spa/hackathon-retired.test.ts` |
| AC24 | `workshop/spa/docs/content-authoring.md` holds one table whose column headers are exactly `Key`, `Occurs in`, `Meaning`, and whose set of `Key` values equals exactly the set of top-level front-matter keys occurring across `workshop/slides/*.md`, `workshop/speaker-scripts/*.md` and `labs/*.md` — no key present in those files is missing from it, and no key it lists is absent from all of them | `npx vitest run tests/spa/content-authoring-keys.test.ts` |
| AC25 | `workshop/spa/schema/frontmatter.schema.json` declares `additionalProperties: false`, and the set of top-level property names it accepts equals exactly the set of `Key` values in `workshop/spa/docs/content-authoring.md` — no documented key is missing from the schema, and the schema accepts no key the document does not list | `npx vitest run tests/spa/frontmatter-schema-keys.test.ts` |

### 2.1 Repository layout and commands

The build adds these paths and nothing outside them, except the `package.json` script entries.

| Path | Holds |
|---|---|
| `workshop/spa/content/deck.json` | The segment manifest: the ordered teaching spine |
| `workshop/spa/content/interactions.json` | The interaction inventory (§2.4) |
| `workshop/spa/content/datasets/*.json` | Data behind charts and simulations |
| `workshop/spa/schema/*.schema.json` | JSON Schemas for the three content kinds |
| `workshop/spa/schema/frontmatter.schema.json` | The closed schema for curriculum front matter (AC1, AC25) |
| `workshop/spa/src/**` | Application source |
| `workshop/spa/docs/content-authoring.md` | The enumerated front-matter keys the schema must accept (AC1, AC24, AC25) |
| `workshop/spa/docs/capability-matrix.md` | Measured deployment matrix (AC11) |
| `workshop/spa/docs/wcag-22-aa-conformance.md` | Per-criterion conformance record (AC16) |
| `workshop/spa/docs/target-size-exceptions.md` | Declared SC 2.5.8 exceptions (AC17) |
| `workshop/spa/docs/a11y-tool.md` | The automated checker the gate runs and its exact rule selection (AC15) |
| `workshop/spa/docs/probe-runs/*.json` | Raw probe output backing the matrix |
| `workshop/spa/docs/hackathon-baseline.sha256` | Freeze hash for the page being retired (AC21) |
| `workshop/spa/docs/rehearsal-<YYYY-MM-DD>.md` | Live-rehearsal record; its `## Verdict` is what arms or releases the freeze (AC21, AC22, AC23) |
| `workshop/spa/dist/` | Multi-file build output (ignored by git) |
| `workshop/spa/dist/standalone/teaching-spa.html` | Portable single-file build |
| `tests/spa/**` | Vitest and Playwright suites named in §2 |
| `scripts/spa/**` | Build, probe and schema-codegen scripts |

Required `package.json` scripts: `spa:dev`, `spa:build`, `spa:build:single`, `spa:validate`,
`spa:probe`, `spa:test:present`, `spa:test:sync`, `spa:test:keyboard`, `spa:test:a11y`.

### 2.2 Content schema and the no-drift rule (AC1, AC2, AC3, AC24, AC25)

**Source of truth stays where it is.** `labs/*.md`, `workshop/slides/*.md`,
`workshop/speaker-scripts/*.md`, `workshop/site/agenda.json` and `docs/_meta/registry.yaml`
remain the only places curriculum content is authored. `deck.json` **references** them by path
and **must not copy prose** out of them; AC2 is the test that the references resolve and that
the per-segment timings agree with the slide front matter.
`workshop/spa/schema/frontmatter.schema.json` MUST accept the front matter keys those files
already use, and `npm run spa:validate` MUST fail if any source file's front matter is rejected.
That second MUST is why **AC1 runs the validator over `workshop/slides/*.md`,
`workshop/speaker-scripts/*.md` and `labs/*.md` as well as over `workshop/spa/content/`**: a
validator pointed only at the application's own content files never reads a line of front matter,
so it can report nothing about whether the curriculum and the schema still agree.

`workshop/spa/docs/content-authoring.md` is where that key set is written down, as a table of
`Key` / `Occurs in` / `Meaning`. It is load-bearing — the front-matter schema is built against it
— so it is permitted neither to be a stale hand-maintained list nor to be documentation the
schema merely claims to follow. **Three criteria chain it to both sides, and all three are
needed:**

1. **AC24 binds the document to the curriculum.** Its set of `Key` values must equal exactly the
   set of top-level front-matter keys actually present in `workshop/slides/*.md`,
   `workshop/speaker-scripts/*.md` and `labs/*.md`: a new key added to a lab fails AC24 until it
   is documented, and a key removed from the curriculum fails AC24 until it is struck from the
   document.
2. **AC25 binds the schema to the document.** The set of top-level property names
   `frontmatter.schema.json` accepts must equal exactly that same `Key` column, and the schema
   must close that set with `additionalProperties: false` — without the closure, "the set the
   schema accepts" is unbounded and there is nothing to compare it against. A schema that stops
   accepting a documented key fails AC25; so does one that quietly accepts a key the document
   does not list.
3. **AC1 binds the schema to the files.** The validator runs that schema over the curriculum
   itself, so a schema that satisfies AC25 on paper but rejects a real file still fails.

Those three **together** are the mechanism by which the schema cannot quietly drift away from the
content it validates, and they are why this spec can require the schema to accept "the keys those
files already use" without enumerating them here. Any one of them alone leaves a hole large
enough to drive the whole drift through: AC24 alone never looks at the schema, AC25 alone never
looks at a curriculum file, and AC1 alone never looks at the document.

**Front matter.** Extraction uses `gray-matter`, which parses front matter from a string or
file and returns `data`, `content`, `excerpt`, `empty` and `isEmpty`, with non-enumerable
`orig`, `language` and `matter` for debugging [F146]; YAML is the default language, JSON and
JavaScript are handled out of the box, other languages are added through `options.engines`, and
the `---` delimiter is the default [F147]. The language may be auto-detected from text after the
first delimiter, and `matter.test()` reports whether front matter exists [F148]. `gray-matter`
documents no sanitization and no heading-anchor or slug generation [F149], so those are separate,
explicit stages below rather than assumed behaviour.

**Markdown to HTML.** The pipeline is `unified`, the core package for processing content with
plugins, on which the remark (markdown) and rehype (HTML) ecosystems are built and which can
connect them [F132]:

1. `remark-frontmatter` for front-matter syntax; its default option is `yaml` and it follows
   how GitHub handles front matter [F133]. It does **not** parse the data inside the front
   matter — the README says to write your own plugin for that [F134] — which is why
   `gray-matter` does that job above. Its `anywhere` option is **forbidden**: the README calls
   it "a terrible idea" and says it makes markdown less portable, and by default only matter at
   the start of a document is recognized [F135].
2. `remark-rehype` to produce HTML. Raw HTML in markdown is kept as mdast `html` nodes and
   embedded in hast as `raw` nodes that most plugins ignore [F136]. Raw HTML in curriculum
   content is **off by default**; enabling it would require `allowDangerousHtml: true` plus
   `rehype-raw`, which the README describes as a separate plugin precisely because full HTML
   parsing is heavy in performance and bundle size [F137], and `rehype-stringify`'s
   `allowDangerousHtml` is discouraged unless authors are completely trusted [F136].
3. `rehype-slug` for heading ids: it adds `id`s to `h1`–`h6` headings that do not already have
   one, from their text, using the github-slugger algorithm that matches how GitHub works,
   preserving existing ids and suffixing duplicates, with `prefix` as its only option [F142].
4. `rehype-sanitize` last. It drops anything not explicitly allowed by a schema, defaulting to
   GitHub-style sanitation, and the README recommends sanitizing any time you do not completely
   trust authors or the plugins being used [F138]. Its documented default behaviour removes
   event-handler attributes such as `onmouseover` and `onerror`, `script` elements, iframes and
   `javascript:` hrefs while keeping `<a>` and `<img src>` without the unsafe attributes [F139]
   — which is exactly what AC3 asserts.

**DOM clobbering is handled, not hoped about.** `rehype-slug`'s own Security section warns that
setting `id` attributes on headings can enable DOM clobbering, an XSS vector, and directs users
to `rehype-sanitize` [F143]. `rehype-sanitize` prevents it by prefixing every `id` and `name`
with `user-content-`, which breaks in-page links unless a client script rewrites hashes to the
prefixed ids as GitHub does — and the README supplies that `hashchange` script [F140]. The
application MUST ship that rewrite, or MUST NOT emit in-page anchors from content. Custom
sanitize schemas are permitted but the README flags them as advanced, requiring knowledge of
syntax trees [F141], so any deviation from the default schema must be justified in review.

`markdown-it` was considered as the alternative: its README and documentation home page
describe it as following the CommonMark spec plus syntax extensions, configurable via rules and
plugins, and "Safe by default" [F145]. That same entry records that the pages read do not detail
its option mechanics, so the `unified` chain is chosen because each stage's behaviour is
separately documented at the level this spec needs.

**JSON validation.** Ajv compiles a JSON Schema into efficient JavaScript validation code and
caches compiled functions, with the best performance coming from compiling once and reusing the
function from `compile` or `getSchema` [F150]; the validator is therefore built once per process
and reused. Ajv overwrites the `errors` property on every validation call, so any error array
that must outlive the next call is copied first [F151] — a real hazard for a batch validator
reporting every bad file at once. Schemas are authored for draft-2020-12, which requires a
different Ajv class import, is not backwards compatible, and cannot be combined with earlier
JSON Schema versions in the same Ajv instance, the default export being draft-07 [F152]. Strict
mode is **on**: it prevents silently ignored mistakes, does not change validation results versus
the specification but makes some schemas invalid, and by default fails compilation on unknown
keywords, unknown formats, and ignored keyword combinations such as `then` without `if` [F155];
the JSON Schema specification requires ignoring unknown keywords, which is how keyword typos stay
quietly ignored, and Ajv deviates from that default to catch them [F156]. Standard formats come
from the separate `ajv-formats` package, and format validation can be switched off with
`validateFormats: false` [F157]. The schema MUST NOT rely on the string-encoded-data (Content)
vocabulary to validate embedded markdown: implementations MUST NOT automatically decode, parse
or validate string contents by default, and a malformed string-encoded document MUST NOT make
the containing instance invalid [F158].

### 2.3 What makes this an application rather than a renderer

The objective's central constraint is that this is not a markdown-to-slides renderer. That is
made testable, not rhetorical, by five properties, each tied to a criterion:

| Property | Why a renderer cannot have it | Criterion |
|---|---|---|
| State that outlives navigation (chosen parameters, revealed steps, timer) | A renderer's output is a static document per slide | AC6, AC12 |
| Outputs computed at presentation time from presenter input | A renderer has no inputs | AC6, AC19 |
| An inventory of named, individually addressable interactions | A renderer has slides, not components | AC6 |
| A second window kept in step with the first | A renderer has no runtime to synchronize | AC9, AC10 |
| Capability detection with a declared degraded mode | A renderer has no capabilities to detect | AC10, AC11 |

### 2.4 Interaction inventory (AC6, AC19)

`workshop/spa/content/interactions.json` is the inventory. Every entry declares `id`, `pattern`,
`segment`, `label`, `keys`, `statusRegion` (boolean) and, for visual components,
`longDescriptionId`. AC6 fails if an entry declares a `pattern` that is not in this table, or if
a declared `id` is missing from the built DOM with that pattern's required roles.

| `pattern` | Used for | Required roles and states | Required keys |
|---|---|---|---|
| `tabs` | Surface-comparison explorer (AGENTS.md vs agents vs skills vs prompts vs hooks vs memory) | `tablist` / `tab` / `tabpanel`, `aria-controls` on each tab, `aria-selected` true on the active tab and false on all others, `aria-labelledby` on each panel, a label on the tablist, `aria-orientation=vertical` only when vertical [F94] | `Tab` into the active tab then out to the panel; `Left`/`Right` with wrap; `Space`/`Enter` when activation is not automatic; optional `Home`/`End`; no `Up`/`Down` on a horizontal tablist [F95] |
| `accordion` | Step-by-step lab walk-through | Header title in an element with role `button`, that button the only child of a `heading` element with an appropriate `aria-level` (a native `h1`–`h6` may be used), `aria-expanded`, `aria-controls` to the panel, `aria-disabled=true` when an open panel cannot be collapsed [F97] | `Enter` or `Space` expands a collapsed header and collapses an expanded one where collapsing is supported; `Tab`/`Shift+Tab` traverse all focusable elements as part of the normal page tab sequence [F98] |
| `carousel` | Model-lineup and release-timeline browsing | Container with role `region` or `group` and `aria-roledescription=carousel`, labelled; each slide `group` with `aria-roledescription=slide` and an accessible name, falling back to a form such as "3 of 10" [F100] | Previous and next buttons [F99]; `aria-live=polite` on the slide wrapper when not auto-rotating [F100] |
| `dialog` | Zoomed diagram, source view, settings | Role `dialog` with `aria-modal=true`, all operating controls as descendants, an accessible name via `aria-labelledby` or `aria-label` [F103] | Focus moves into the dialog on open; `Tab`/`Shift+Tab` wrap inside it; `Escape` closes; focus returns to the invoking element [F102] |
| `disclosure-popover` | Glossary and command-reference on hover or focus | Dismissible, hoverable and persistent additional content [F92] | `Escape` dismisses without moving pointer hover or keyboard focus [F92] |
| `parameter-chart` | Token/cost model, model-router simulator | Accessible name plus a long description that is a textual representation of the essential information the image conveys [F109]; recomputed values written to a `status` live region [F104] | Every parameter settable from the keyboard [F83] |
| `node-diagram` | Six-surface decision tree, extensibility architecture map | Same two-part text alternative as `parameter-chart` [F109]; selected state exposed and visually indicated at ≥3:1 against adjacent colours [F91] | Node selection and traversal from the keyboard; see the dragging rule below |
| `staged-reveal` | Progressive build-up within a segment | Current stage exposed in the status region [F93] | Forward/back keys; no timing-dependent keystrokes [F174] |
| `segment-timer` | Pacing against `minutes` | `status` live region [F104] | Pause/stop control [F108] |

Three inventory-wide rules, each the reason an AC exists:

- **Auto-rotation is off by default.** Where a `carousel` or `segment-timer` would move or
  update by itself, SC 2.2.2 requires a mechanism to pause, stop or hide moving, blinking or
  scrolling information that starts automatically, lasts more than five seconds and is presented
  in parallel with other content, and a mechanism to pause, stop, hide or control the frequency
  of auto-updating information that starts automatically and is presented in parallel with other
  content, unless essential [F108]. Where auto-rotation is enabled, the APG rules apply in full:
  rotation stops when any element in the carousel receives keyboard focus and does not resume
  unless the user activates the rotation control, it stops while the mouse hovers, a stop/start
  button is required, that control is the first element in the Tab sequence inside the carousel,
  and activating rotation, next or previous does not move focus [F99]. The rotation button's
  label changes between "Stop slide rotation" and "Start slide rotation" and does not use
  `aria-pressed` [F100], and the slide wrapper uses `aria-live=off` while auto-rotating and
  `aria-live=polite` when not [F100].
- **Slide-picker controls, if added, use the tabbed style.** The APG describes two styles: a
  tabbed carousel whose picker is implemented with the Tabs pattern, each slide being a
  `tabpanel` without `aria-roledescription`, and a grouped carousel with a button per slide,
  which the pattern describes as the least friendly for keyboard users because each button adds
  a tab stop [F101].
- **Nothing requires a drag.** Any functionality that uses a dragging movement must also be
  achievable by a single pointer without dragging, unless dragging is essential or the behaviour
  is determined by the user agent [F88]. A `node-diagram` node or a chart slider therefore gets
  a click-the-track or click-the-target equivalent.

Tabs activate automatically on focus where the panel displays without noticeable latency, which
the APG recommends [F96]; where a panel contains no focusable element or its first content
element is not focusable, the panel sets `tabindex="0"` [F96]. `aria-roledescription` is a
human-readable, author-localized description of an element's role, `aria-modal` indicates
whether an element is modal when displayed, and `aria-orientation` indicates horizontal,
vertical or unknown orientation [F105] — the inventory uses them only with those meanings.

### 2.5 Presentation mode (AC7, AC8, AC18)

**Entry is gesture-bound and single-element.** `Element.requestFullscreen()` requires transient
user activation — the user has to interact with the page or a UI element for the feature to
work [F8] — and MDN's Fullscreen guide states that fullscreen requests must come from within an
event handler or they are denied [F172]. In the specification's own terms, the steps set an
error flag unless the element's relevant global object has transient activation, and when there
is no error they **consume** that activation [F1]. Only one element is ever put into fullscreen,
because `exitFullscreen()` exits only the topmost element while `Esc` or `F11` exits all of them
[F172].

**Order of operations inside the activation handler**, which is normative here:

1. Open the speaker-script surface if the presenter asked for it. This happens **first** because
   the fullscreen steps consume the user activation [F1] and because `window.open()` returns
   `null` when the browser fails to open the context, for example when a popup blocker blocks it
   [F46] — a failure the application must surface, not swallow.
2. Acquire keyboard lock only if it is enabled and available (see below), because the Keyboard
   Lock draft recommends calling `navigator.keyboard.lock()` before
   `document.documentElement.requestFullscreen()`, and `document.exitFullscreen()` before
   `navigator.keyboard.unlock()` on the way out [F163].
3. Call `requestFullscreen()` on `[data-spa-root="presentation"]`.

The W3C Window Management draft shows a single click handler that awaits
`requestFullscreen({screen})` on one screen and then calls `window.open()` with `left`/`top`/
`width`/`height` from another `ScreenDetailed`, to start a multi-screen experience from one user
activation [F16]. That is the reverse of the order above and it appears in a non-normative
example section of that draft; this spec takes the conservative order because the normative
fullscreen steps consume activation [F1].

**Preconditions and failures are handled explicitly.** The Present control is disabled, with an
explanation, when `document.fullscreenEnabled` is false — that getter returns true if the
document is allowed to use the `fullscreen` feature and fullscreen is supported, and false
otherwise [F4]. The specification sets the error flag when the element is not in the HTML
namespace and is not an `svg` or `math` element, is a `dialog` element, fails the fullscreen
element ready check (connected, node document allowed to use the `fullscreen` feature, not a
shown popover), or when fullscreen is not supported [F2]; on error it appends a `fullscreenerror`
event for the element to the document's pending fullscreen events and rejects the promise with a
`TypeError`, and it rejects with a `TypeError` immediately when the document is not fully active
[F3]. MDN enumerates the `TypeError` rejection cases as the document not being fully active, the
element not being in a document, the element not being permitted to use the fullscreen feature
through Permissions Policy or other access control, the element being the document node, or the
element being an already-shown popover, plus `NotSupportedError` for an unsupported
`keyboardLock` option [F10]. If permission is granted the promise resolves and the element
receives a `fullscreenchange` event; if denied, the promise rejects and the element receives a
`fullscreenerror` event, and a detached element's document receives the events instead [F9]. The
application must therefore handle **both** the rejected promise and the `fullscreenerror` event,
must remain fully usable windowed after either, and must announce the failure in its status
region (§2.11).

**Fullscreen is not durable state.** The user agent may end any fullscreen session without a
close request or an `exitFullscreen()` call whenever it deems it necessary [F7]; navigating away,
changing tabs, or switching to another application exits fullscreen [F172]; and MDN advises
listening for `fullscreenchange` on the `Document` to learn when the user manually toggles
fullscreen or switches applications, causing a temporary exit [F13]. AC8 is the test that the
application reconciles rather than desynchronizes. Users are told they can press `Esc` or `F11`
to exit, as MDN recommends [F172].

**The application does not depend on the fullscreen viewport's exact shape.** The viewport is
resized to the full dimensions of the screen of the output device for `navigationUI` `hide` or
clamped to allow navigation controls for `show`, while `auto` is user-agent defined [F7]; the
layout is therefore responsive and asserts nothing about chrome.

**Embedding.** Should the application ever be framed, fullscreen is a policy-controlled feature
identified by the string `fullscreen` whose default allowlist is `self`, and content in a child
navigable can go fullscreen only when allowed through the iframe `allowfullscreen` attribute, the
iframe `allow` attribute, or a `Permissions-Policy` HTTP header [F6]. MDN adds that any set
Permissions-Policy must allow the `fullscreen` feature, that third-party frames need a header
such as `fullscreen=(self b.example.com)` plus `allow="fullscreen"` on the iframe, and that
elements must be in the top-level document or in an iframe carrying `allowfullscreen` [F11].

**Screen wake lock is progressive enhancement, never a precondition.** The Screen Wake Lock API
lets a web application request a lock that, under the right conditions and if allowed, prevents
the system from turning off a device's screen, and presenting to an audience is among its stated
use cases [F70]; MDN describes it as preventing devices from dimming or locking the screen and
lists presenting to an audience as a use case [F75]. It is exposed only in secure contexts:
`Navigator.wakeLock`, `WakeLock` and `WakeLockSentinel` are all annotated `[SecureContext]`
[F72], and MDN marks the API secure-context only [F67]. `request()` rejects with
`NotAllowedError` if the document is not fully active, if the `screen-wake-lock` Permissions
Policy denies it, if the user agent denies it, or if the document's visibility state is `hidden`
— only visible documents can acquire the lock — and the algorithm contains no user-activation
check [F73], which MDN's reference corroborates, listing the same four causes and no activation
requirement [F76]. The lock is released when the document is no longer visible, so the
application re-requests it on `visibilitychange`, as MDN's own example does [F75]. User agents
may time-limit or disallow wake locks for reasons such as battery status or power-saving mode,
and it is recommended that the user agent show an unobtrusive notification while a lock is
active [F74]; the feature is a policy-controlled feature `screen-wake-lock` with default
allowlist `self` [F74]. Support is reported from Chrome 85, Edge 90, Firefox 126 and Safari 16.4,
with no later versions marked unsupported [F77]. The specification is a W3C Working Draft of
29 September 2026 whose status section warns that it is extremely unstable and may change in
incompatible ways [F71] — so a rejected or absent wake lock is a logged, announced non-event.

**Keyboard lock is optional, off by default, and never locks `Escape`.** The Keyboard Lock
specification notes that keys such as `Escape`, `Alt+Tab`, `Cmd+\`` and `Ctrl+N` are not
available to a web application by default because the browser or operating system captures them,
and the API lets sites capture the keys the OS allows [F159]. It defines `Navigator.keyboard`
(`SecureContext`) and a `Keyboard` interface with
`lock(optional sequence<DOMString> keyCodes = [])` returning `Promise<undefined>`, and
`unlock()` [F160]; keys are matched by the `KeyboardEvent` `code` attribute, locking applies only
when the fullscreen element is non-null and keyboard lock is enabled, and a matching event goes
directly to the fullscreen document or element, bypassing normal user-agent processing [F161].
MDN adds that `lock()` can only capture keys the underlying operating system grants, requires
transient user activation, replaces the previously locked set on each call, locks all keys when
called with no argument, and takes `KeyboardEvent` `code` values, with `AbortError`,
`InvalidAccessError` and `InvalidStateError` as possible exceptions [F168]. It is valid only
during JavaScript-initiated fullscreen: F11 fullscreen can only be exited by the same shortcut,
`exitFullscreen()` does not work for it, fullscreen events are not fired for it, and no Keyboard
Lock processing happens during it [F164]. The API is explicitly best-effort — implementations
need not override every OS default and a platform's secure attention sequence such as
`Ctrl-Alt-Del` cannot be overridden [F165]. Support is Chrome 68 with Edge, Opera, Chrome Android
and Samsung Internet mirroring Chromium, and Firefox and Safari not supporting it [F167]. The
draft recommends locking `Escape` only if actually needed and, if it is locked, keeping its
primary meaning of exiting the current state [F163]; when `Escape` is locked, holding it for two
seconds exits fullscreen and pointer lock, and user agents must provide a way out of keyboard
lock including a press longer than two seconds [F162], and MDN notes most browsers use `Esc` to
exit fullscreen and a long press to exit keyboard lock [F13]. Because SC 2.1.2 treats `Esc` as
the commonly used standard exit method [F84], **this application never includes `Escape` in the
locked set.** The specification is published as a WICG Draft Community Group Report [F159], and
the older `w3c.github.io` URL now redirects to the WICG one [F166]. MDN describes the API's
intended use as games or remote-access apps providing a fullscreen immersive experience [F169].

### 2.6 Multi-monitor placement (AC7, AC11)

The W3C Window Management specification is a Working Draft dated 8 September 2026 whose stated
motivating use cases include, first among them, "Slideshow app presents on a projector, shows
speaker notes on a laptop screen." [F14] — this spec's exact scenario. It extends `Window`,
`Screen` and `FullscreenOptions` and introduces `ScreenDetails` and `ScreenDetailed`;
`getScreenDetails()` "may prompt the user for permission", and `screen.isExtended` is exposed to
secure contexts without a permission prompt [F15]. Fullscreen on a chosen screen is
`element.requestFullscreen({ screen: screenDetailed })` [F16]; MDN documents that `screen` option
as experimental, taking a `ScreenDetailed` object and specifying on which screen the element goes
fullscreen, and records that it is the only monitor-selection mechanism on that page [F12].

Four constraints make this an enhancement rather than the mechanism:

- **Secure context only.** The draft's WebIDL marks its new interfaces and members
  `[SecureContext]` [F18, F66], and MDN marks `ScreenDetails`, `ScreenDetailed`, the `Screen`
  `change` event, `Screen.isExtended` and `Window.getScreenDetails()` as secure-context only
  [F19, F65].
- **Permission and policy gated.** The permission and policy name is `window-management`
  (previously `window-placement`); `getScreenDetails()` rejects with `NotAllowedError` if the
  document is not allowed to use that policy-controlled feature, and otherwise requests permission
  to use it [F17]. MDN adds that if the `window-management` Permissions-Policy blocks the API,
  `getScreenDetails()` rejects with `NotAllowedError` and `screen.isExtended` always returns
  false, and that an iframe can be granted access with `allow="window-management"` [F20]. MDN's
  method page marks it experimental and secure-context only, says invoking it asks the user for
  permission to manage windows on all their displays, that the permission status can be checked
  with `Permissions.query()` using the name `window-management`, and that it throws
  `NotAllowedError` when blocked by policy or denied by the user [F21].
- **Two engines only.** Browser-compat data records `Window.getScreenDetails` added in Chrome
  100, with Edge and Opera mirroring Chrome, and Firefox and Safari both `version_added: false`,
  flagged experimental and standard-track [F22]. The caniuse entry lists Chrome 100–157 and Edge
  100–154 as supported, Firefox 2–160 as not supported, Safari 3.1–27.2 as not supported with
  Technology Preview "support unknown", and Safari on iOS 3.2–27.2 and Firefox for Android 157 as
  not supported [F23].
- **No default is published.** The Fullscreen Standard does not say which monitor is used when
  several exist [F7], and MDN's `requestFullscreen()` page does not say which monitor is used by
  default [F12]. This is a finding, recorded as Q3, not a gap to be filled by assumption.

**Required behaviour.** The application feature-detects `window.getScreenDetails`. Where it is
absent or denied, the Present control still works and the presenter is shown the documented
manual procedure — move the browser window onto the audience monitor, then activate Present —
and the application **must not claim** to have chosen a monitor. `screen.isExtended` may be read
to notice that a second screen exists without prompting [F15, F66], subject to the same policy
gate [F20]. No acceptance criterion depends on programmatic monitor selection.

**The Presentation API is explicitly rejected as the transport for this spec.** Its abstract
describes enabling web content to access presentation displays and use them for presenting web
content, as a Candidate Recommendation Draft dated 12 February 2025 from the Second Screen
Working Group [F78]; MDN describes it as displaying web content on large presentation devices
such as projectors and network-connected televisions, wired over HDMI or DVI or wireless via
DLNA, Chromecast, AirPlay or Miracast, marks it experimental and secure-context only, and
describes controller and receiver pages exchanging messages over a connection [F80]. Its
interfaces are annotated `[SecureContext]` [F79]. Compat data shows Chrome from 47 (receiver from
59) with Edge mirroring, Firefox `version_added: false` and Safari `version_added: false` with an
implementation URL [F81], and caniuse has no data file for it at all [F82]. It addresses casting
to a presentation device, not the second window on an extended desktop that the Window Management
draft names as its own first use case [F14].

### 2.7 Speaker-script surface and synchronization (AC9, AC10)

**One document, two surfaces.** The speaker script is a hash route of the same document
(`#/script`), not a second HTML file. This is forced by the portable build: the single-file
plugin is single-entry — it creates one HTML file and no others, and multiple HTML entry points
will not work or will not be optimized [F112] — and SPA routing via the History API does not
work from a local HTML file while hash-based SPA routing does [F111].

**Opening it.** The presentation window calls `window.open()` and keeps the returned handle.
`noopener` MUST NOT be used: with it, the new window has no access to the originating window via
`Window.opener` and `open()` returns `null` [F46]; the browser also leaves `opener` null for
`rel=noopener`, for `target=_blank` links unless `rel=opener` is requested, and when a
`Cross-Origin-Opener-Policy` of `same-origin` severs the reference [F45]; and the HTML Standard
defines `rel=noopener` as meaning the newly created top-level traversable will not contain an
auxiliary browsing context, so the resulting `Window`'s `opener` getter returns null [F47]. A
reference is required because `postMessage` needs the sender to already hold the target window
object, obtained for example from `window.open()`, `iframe.contentWindow`, or `window.opener`
[F43]. `open()` returning `null` is treated as a popup-blocker failure and surfaced to the
presenter [F46].

**Three transports, probed in order, with a handshake and a timeout.**

1. **`BroadcastChannel`.** The interface represents a named channel that any browsing context of
   a given origin can subscribe to, allowing communication between documents in different
   windows, tabs, frames or iframes of the same origin, with messages delivered to all listening
   objects except the sender [F29]; there is one single channel with a given name for all
   browsing contexts with the same origin [F30]. Normatively, `postMessage()` builds its
   destination list from `BroadcastChannel` objects that are eligible for messaging, whose
   storage key equals the sender's and whose channel name equals the sender's, then removes the
   sender itself [F24]; an object is eligible only when its relevant global object is a `Window`
   whose associated `Document` is fully active, or a `WorkerGlobalScope` whose closing flag is
   false and that is not suspendable [F25]. The storage key here is obtained by "obtain a storage
   key for non-storage purposes", which returns a tuple consisting of the environment's origin and
   has no opaque-origin failure step, unlike the plain "obtain a storage key" algorithm [F26].
   **The matching condition is therefore origin equality.** Support for the `message` event is
   recorded as Firefox 38+, Safari 15.4+, Chrome 54+ and Edge 79+, and `messageerror` as Firefox
   57+, Safari 15.4+, Chrome 60+ and Edge 79+ [F32].
2. **`window.postMessage` over the window handle or `opener`.** The receiver gets a
   `MessageEvent` carrying `data`, `origin` (the sender's origin at the time of the call) and
   `source` (a reference to the sending window) [F43]. `targetOrigin` defaults to `/`, which
   restricts the message to same-origin targets only; if the target window's origin does not
   match, the message is discarded; and `*` sends it regardless of origin [F41]. The normative
   steps replace `/` with the incumbent settings object's origin, parse any other non-`*` value
   as a URL (`SyntaxError` on failure), and in the queued task silently drop the message when the
   target's document origin is not same origin with `targetOrigin`, otherwise firing a `message`
   event whose `origin` is the incumbent origin and whose `source` is the sender's `WindowProxy`
   [F40]. MDN advises always providing a specific `targetOrigin` rather than `*` when the
   recipient's location is known, and notes that because `data:` URLs have opaque origins, a
   message to a `data:` URL context requires `*` [F42]. Cross-origin, `window.opener` exposes a
   limited set of properties that includes `postMessage` [F44].
3. **`localStorage` plus the `storage` event.** The event fires when another document sharing the
   same storage area updates it, is not fired on the window that made the change, and for
   `localStorage` fires in all other browsing contexts in the same origin as the initiating
   document including other tabs; it does not bubble and is not cancelable [F33]. Normatively,
   mutating a `Storage` object dispatches a `storage` event on `Window` objects holding an
   equivalent `Storage` object — the other objects of the same type whose relevant settings
   object's origin is same origin with the mutated storage's origin — queued as a global task on
   the DOM manipulation task source [F34].

**All three are origin-scoped, and that is the whole difficulty.** Two origins are same origin
only when they are the same opaque origin, or both tuple origins with identical schemes and
ports and equal hosts; otherwise they are not, and two **distinct** opaque origins are therefore
never same origin with each other [F39, F27]. An opaque origin is an internal value with no
serialization it can be recreated from, serialized as `"null"`, for which the only meaningful
operation is testing for equality [F48]. The URL Standard returns a tuple origin for the `ftp`,
`http`, `https`, `ws` and `wss` schemes, but for `file` it says "Unfortunate as it is, this is
left as an exercise to the reader. When in doubt, return a new opaque origin.", so the standard
mandates neither an opaque origin, nor a per-file origin, nor a per-directory origin, with a new
opaque origin as the suggested fallback [F49, F28, F127]. MDN reports that modern browsers
usually treat the origin of files loaded using `file:///` as opaque origins, and that if a file
includes other files from the same folder they are not assumed to come from the same origin and
may trigger CORS errors [F52, F38, F31]. Two vendor data points sit alongside this: Chromium's
`content_switches.cc` comments that by default `file://` URIs cannot read other `file://` URIs
and that `--allow-file-access-from-files` is a developer-only override [F58], and Firefox 68
changed, for CVE-2019-11730, to treat files in the same directory as being from different
origins, with documented side-effects on `file://` documents including workers no longer loading
[F57]. For `localStorage` specifically, MDN says that for documents loaded from `file:` URLs the
requirements are undefined and may vary among browsers, that in all current browsers it seems to
return a different object for each `file:` URL so each has its own storage area, that there are
no guarantees and this should not be relied on, and that some browsers have changed their
handling over time [F36, F53]; it lists `SecurityError` when the origin is not a valid
scheme/host/port tuple, giving `file:` and `data:` as examples [F37, F54], and the HTML Standard
throws `SecurityError` from the `localStorage` getter when the document's origin is an opaque
origin or when the request violates a policy decision, with the same wording for `sessionStorage`
[F35, F51].

What follows from that is a **conditional**, and this spec states it as one: if a browser gives
two `file:`-loaded documents distinct opaque origins, then the origin-equality condition that
`BroadcastChannel` destination matching [F24, F26], the `postMessage` target-origin check [F40,
F41] and the `storage` event target set [F34] each require cannot be satisfied, by [F39]. What
each of Chrome, Edge, Firefox and Safari actually does for two `file:` documents is **not
established by any published source read for this spec** — see Q4 and Q5. The application
therefore probes rather than assumes.

Served from `http://localhost` or from an `https://` host, both surfaces are the same document
at the same URL, the URL Standard gives that URL a tuple origin [F49], and two tuple origins with
identical schemes and ports and equal hosts are same origin [F27, F39]. The origin-equality
condition in each of the three algorithms is therefore satisfied there. That is a statement about
what the specifications require, not a measurement of any browser — which is why AC11 measures it
anyway.

**`targetOrigin: "*"` is confined to one case.** Because `*` sends the message regardless of
origin [F41] it is the only listed mechanism that is not origin-gated, and MDN advises against it
when the recipient's location is known [F42]. It is permitted **only** when
`window.origin` serializes to `"null"` — the serialization of an opaque origin [F48] — and then
only for presentation-state payloads that carry no credential and no content not already in the
repository. In that mode the receiver MUST verify that `event.source` is the window handle it
already holds [F43] before acting on a message.

**Payload and direction.** Messages carry the segment index, the reveal stage, timer state and a
monotonically increasing counter; a receiver ignores any message whose counter is not greater
than the last one it applied. Synchronization is one-way from presentation to script by default,
with an opt-in two-way mode.

**Degradation is a feature, not an error path.** When the handshake does not complete on any
transport within the configured timeout, the script surface enters `not-synchronized`: it shows
that state visibly, offers its own navigation so the presenter can keep working, and announces
the transition in its status region. AC10 is that behaviour's test; AC11 records which transport
actually worked where.

### 2.8 Deployment targets and what the sources establish (AC11)

The presenter may open the application from a local file, from `http://localhost`, or from a
hosted site. This table is the **specification's position**: what the published sources establish
for each mechanism in each target, and — just as importantly — where they establish nothing.

It is **not** the capability matrix, and its shape is deliberately different.
`workshop/spa/docs/capability-matrix.md` is the *measured* document, and it carries a dimension
this table cannot: the browser. A source that settles a mechanism settles it for every browser at
once; a probe only ever reports on the browser it ran in. So the matrix has one row per
(mechanism × browser × target) — the eleven mechanisms below, the four browsers `Chrome`, `Edge`,
`Firefox` and `Safari`, and the three targets `file:`, `http://localhost` and `https://`, giving
132 rows — and each row separates the two things AC11 has to be able to test independently: a
`Verdict` column that is exactly `works`, `fails` or `not measured`, and an `Evidence` column
whose permitted form **depends on that verdict**.

A `works` or `fails` verdict asserts something about behaviour, so its evidence is whatever
established it: a probe run recorded under `workshop/spa/docs/probe-runs/`, or a source URL from
§3 that settles the mechanism without measurement. A `not measured` verdict asserts the *absence*
of both — that no probe covered the combination and that no cited source settles it — so neither
of those two forms can exist for a row carrying it, and requiring one would make the verdict
literally unrecordable. Its evidence cell records **why** instead: a literal `—` where the
combination simply has not been probed yet, or the id of the §4 open question that explains why
it may never be. Of the eleven `file:` cells in the table below, ten are marked **not
established** and point at one of Q1–Q8 or Q11; the eleventh — ES modules fetched by URL, which
§2.9 forbids outright — is still a measurable combination, so its matrix row carries whichever
of the three verdicts the evidence supports, under the same rule as every other row.

`not measured` is a permanent and legitimate verdict here, not merely an unfinished-campaign
artifact. A browser the team cannot run on the machines available to it is never probed on those
machines, and leaves its thirty-three rows — eleven mechanisms × three targets — at `not measured`
indefinitely. That is a fact about the evidence, and the matrix must be able to state it rather
than contain a cell no honest value fits. A combination that no probe covered and no cited source
settles is recorded as `not measured`; it is never inferred from a neighbouring browser, a
neighbouring target, or this table.

| Mechanism | `file:` | `http://localhost` | `https://` hosted |
|---|---|---|---|
| Secure context | Algorithm returns Potentially Trustworthy for scheme `file` [F59] and the spec says UAs SHOULD treat `file` URLs as potentially trustworthy, but UAs prioritizing security MAY exclude it [F60]; MDN's guide lists `file:///path/to/resource.html` as secure [F64]. Per-browser behaviour **not established** → Q1 | Potentially Trustworthy via the loopback and `localhost` rules [F59]; MDN lists `http://localhost` as secure [F64] | Potentially Trustworthy for `https` [F59] |
| `requestFullscreen()` | Fullscreen is supported when there is no previously-established user preference, security risk or platform limitation, and the standard does not mention URL schemes or `file:` URLs [F5]. Browser behaviour **not established** → Q2 | Supported subject to [F2], [F4], [F5] | Supported subject to [F2], [F4], [F5] |
| `requestFullscreen({screen})` | Depends on Q1 and on the `window-management` permission; **not established** → Q3, Q11 | Chrome/Edge 100+ only [F22, F23], secure-context [F18, F19] and permission-gated [F17, F21] | Same as localhost [F22, F23] |
| `BroadcastChannel` | Origin-gated [F24, F26]; `file:` origin undefined [F49] and usually opaque [F52]; distinct opaque origins are never same origin [F39]. **Not established** → Q4 | Origin condition satisfied [F27, F49]; API support [F32] | Same [F27, F32] |
| `postMessage` via handle/`opener` | Origin-gated unless `*` [F40, F41]; same unresolved origin question. **Not established** → Q4 | Origin condition satisfied [F27, F40] | Same [F27, F40] |
| `localStorage` + `storage` event | Behaviour undefined for `file:`, per-URL storage areas, no guarantees [F36, F53]; `SecurityError` possible [F37, F54, F35]. **Not established** → Q5 | Fires in other same-origin contexts, not the writer [F33, F34] | Same [F33, F34] |
| Screen Wake Lock | Secure-context only [F72, F67]; depends on Q1. **Not established** → Q6 | Chrome 85 / Edge 90 / Firefox 126 / Safari 16.4 [F77] | Same [F77] |
| Keyboard Lock | `Navigator.keyboard` is `SecureContext` [F160]; depends on Q1. **Not established** → Q6 | Chrome 68, Chromium mirrors; not Firefox or Safari [F167] | Same [F167] |
| Service worker | Only secure contexts may register service workers [F61]; MDN describes that as served over HTTPS with `http://localhost` also treated as secure, and does not mention `file:` [F68]. **Not established** → Q7 | Available [F68]; Firefox additionally offers "Enable Service Workers over HTTP (when toolbox is open)" for testing [F69] | Available [F68] |
| ES module script fetched by URL | Imported module scripts are fetched in CORS mode [F126]; `file:` fetch is left unspecified with a network error as the suggested default [F50]; MDN warns that loading an HTML file locally with `file://` produces CORS errors from module security requirements and that a local web server is needed [F55]. **Forbidden by §2.9** | Works | Works |
| Inline `type="module"` script | **Not established** → Q8. The portable build's plugin README states the output is for offline apps you can double-click and open directly in the browser with no server [F110] | Works | Works |

Service workers are **not** the offline story here. Offline support for the local-file case is the
portable single-file artifact [F110]; a service worker, where it is available, is an optional
enhancement for the hosted case only.

**How the probe decides.** For each target the probe records `isSecureContext`, the boolean
defined on `WindowOrWorkerGlobalScope` by which an application can determine whether it is
executing in a secure context — the `[SecureContext]` WebIDL attribute being what keeps the gated
interfaces off a non-secure global in the first place [F63]. That single reading settles Q1 for
the machine it runs on and, with it, the dependent cells for Window Management, Screen Wake Lock
and Keyboard Lock. Where the application is ever framed, the probe also records the ancestor
chain, because a framed document is a secure context only if it is delivered from a potentially
trustworthy origin **and** embedded in a secure context, dedicated workers are secure contexts
only if their owner is one, and a non-secure parent therefore makes an `https` child non-secure
[F62]. A probe run is evidence about the browser and build it ran on, recorded in
`workshop/spa/docs/probe-runs/`; it does not become a claim about browsers in general — which is
exactly why AC11's matrix carries a `Browser` column. A probe campaign run only in Chrome leaves
the other 99 rows at `not measured`, each carrying `—` or a `Q` id in its `Evidence` cell; it
does not satisfy AC11 by filling them in from the Chrome result.

### 2.9 Build pipeline and the portable single-file target (AC4, AC5, AC20)

**Two builds from one source.** `npm run spa:build` produces the ordinary multi-file application;
`npm run spa:build:single` produces `teaching-spa.html`. Both use Vite with `base: './'`.

`vite-plugin-singlefile` inlines all JavaScript and CSS resources into the final
`dist/index.html` so the entire web app can be distributed as a single HTML file; its README
describes it as being for offline apps you can double-click and open directly in the browser with
no server, and says plainly that bundling everything into one file "isn't recommended for most
situations" and is not good performance-wise for a normal web server [F110]. That trade-off is
accepted deliberately, and only for the portable artifact — the hosted and localhost paths use the
multi-file build.

**Plugin behaviour the build depends on.** The plugin replaces each `<script ... src=...>` tag
with an inline `<script>` containing the chunk code, keeping the original attributes so
`type="module"` is preserved; it escapes `</script>` and `<!--` sequences inside the inlined code
as `\x3C`, replaces the `__VITE_PRELOAD__` marker with `void 0`, and replaces `<link>` stylesheet
tags with inline `<style>`, running with `enforce: 'post'` in `generateBundle` [F114]. Its
recommended build configuration sets `build.assetsInlineLimit` to `() => true`,
`build.cssCodeSplit` to `false`, `base` to `'./'`, `build.assetsDir` to `''`,
`chunkSizeWarningLimit` to `100000000`, and either `output.inlineDynamicImports = true` below
Vite 8 or `codeSplitting = false` from Vite 8 [F113]. Its `removeViteModuleLoader` option defaults
to false, `inlinePattern` limits which assets are inlined with missed assets generating a
warning, and `deleteInlinedFiles` defaults to true [F115].

**Consequences that are requirements, not preferences:**

- **Hash routing only.** SPA routing via the History API does not work from a local HTML file;
  hash-based SPA routing does [F111]. Cookies also do not work there, because there are no HTTP
  headers on `file:///` [F111]. The application stores presenter preferences in `localStorage`,
  which the same list reports as working from a local HTML file [F111], and treats its absence as
  non-fatal given [F35] and [F37].
- **One entry point.** The plugin is single-entry; multiple HTML entry points will not work or
  will not be optimized [F112]. This is why §2.7 makes the speaker surface a hash route.
- **No `public/` dependency in the portable build.** Files in Vite's `public` folder are not
  inlined, though the single HTML can reference them by relative path [F112]; the portable build
  must therefore not require any `public/` asset. SVG inlining is not supported directly [F112],
  so inline SVG is authored in source or imported as a string with Vite's `?raw` suffix [F119].
- **No runtime module fetch.** With `codeSplitting = false` / `inlineDynamicImports` there is a
  single bundle [F113]; Rollup documents `output.inlineDynamicImports` as inlining dynamic imports
  instead of creating new chunks to create a single bundle, possible only with a single input, and
  changing execution order so that a module imported only dynamically is executed immediately
  [F125]. This matters because the HTML Standard's "fetch a single imported module script"
  creates a request with mode `"cors"` — only a top-level worker, sharedworker or serviceworker
  module fetch uses `"same-origin"` — so module scripts loaded by URL are fetched in CORS mode
  unlike classic scripts [F126], and the Fetch Standard leaves `file:` URLs "as an exercise for
  the reader", suggesting a network error [F50]. MDN separately warns that loading an HTML file
  locally with a `file://` URL produces CORS errors because of JavaScript module security
  requirements, and that testing must be done through a server [F55]. The portable build therefore
  contains **no** `import()` of a URL at all; AC5 tests that.
- **Workers are avoided; if used, inlined.** Vite inlines a worker as a base64 string at build
  time with `?worker&inline`, where a plain `?worker` import produces a separate chunk [F119,
  F120]; worker detection only works when `new URL()` is used directly inside `new Worker()` with
  static string-literal options, otherwise the URL is treated as a static asset URL [F120]. The
  HTML Standard allows any same-origin URL including `blob:` for a worker script, and `data:`
  URLs too but with an opaque origin and the worker's cross-origin isolated capability set to
  false [F128]; MDN states the worker script URL must be same-origin with the document or a
  `blob:` or `data:` URL, with `SecurityError` on a same-origin violation [F56]; and Firefox 68's
  `file:` origin change is documented as preventing workers from loading in `file://` documents
  [F57]. No acceptance criterion may depend on a worker. The esbuild anti-pattern of calling
  `toString()` on a function and passing it to a `Worker` is forbidden; the documented approach is
  to build the worker source in a separate build step and insert it as a string [F122].
- **Bundler facts the configuration must respect.** Vite's `build.assetsInlineLimit` defaults to
  4096 bytes, inlines smaller assets as base64 URLs, disables inlining at `0`, and accepts a
  callback returning a boolean to opt in or out [F116]; `build.cssCodeSplit` defaults to true and,
  when disabled, extracts all CSS into a single file, while `build.modulePreload` injects a
  module-preload polyfill by default and a relative `base` makes `import.meta.url` the basis for
  dynamic-import preload paths at runtime [F117]. `build.rollupOptions` is deprecated and is an
  alias of `build.rolldownOptions`, so Vite 8 bundles with Rolldown; `build.target` defaults to
  `baseline-widely-available`, specifically chrome111, edge111, firefox114, safari16.4 and
  ios16.4 for that major [F118]. Where an esbuild-based step exists at all, bundling code with
  top-level await is only supported with an `esm` output format [F123], and esbuild code splitting
  is a documented work in progress that only works with `esm` and has a known import-ordering
  issue [F124] — so no esbuild splitting is used.

**Content Security Policy for the portable file (AC20).** Inline script execution is blocked
unless every policy allows it, either implicitly by not specifying `script-src` or `default-src`,
or explicitly via `'unsafe-inline'`, a nonce-source, or a hash-source matching the inline block,
where the hash-source grammar is `'sha256-'`, `'sha384-'` or `'sha512-'` followed by the base64
digest [F129]. Developers SHOULD NOT include `'unsafe-inline'` or `data:` as valid sources in
script policies because both enable XSS by allowing code directly in the document [F130]. A nonce
is not available to a file opened from disk — Vite's `html.cspNonce` adds a nonce attribute to
`<script>`, `<style>` and stylesheet/modulepreload `<link>` tags and injects a
`<meta property="csp-nonce">` tag, with the explicit requirement that the placeholder be replaced
with a unique value **per request** [F121] — so the portable build computes `sha256-` hashes at
build time instead. Because the plugin inlines assets as data URIs [F113, F116], the policy must
allow `data:` for `img-src` and `font-src` while never allowing it for `script-src`, which Vite
warns permits injection of arbitrary scripts [F121]. The policy is delivered by
`<meta http-equiv="Content-Security-Policy" content="...">`, which cannot carry
`Content-Security-Policy-Report-Only` or the `report-uri`, `frame-ancestors` and `sandbox`
directives and is not applied to content preceding it, so authors are strongly encouraged to place
it as early as possible [F131] — hence AC20's requirement that it be the first element in `<head>`.

Because that policy forbids `'unsafe-eval'`, schema validation in the browser uses Ajv's
standalone mode, which generates validation functions as JS files at build time via `ajv-cli`
(`>= 4.0.0`) or the library with `code.source: true`, and whose documented benefits include a
smaller browser bundle, faster start-up, and avoiding dynamic code evaluation with the `Function`
constructor when a page's Content Security Policy prohibits it [F153]. Standalone functions still
depend on Ajv's runtime folder code unless the output is run through a bundler such as esbuild to
produce fully isolated validation functions; standalone mode supports only `code` and `macro`
user-defined keywords; and if formats are used, `code.formats` must contain a code snippet
evaluating to the format definitions [F154].

### 2.10 Keyboard navigation (AC12, AC13, AC14)

The presenter drives this application from a keyboard while standing in front of a room, and an
assistive-technology user must be able to do everything a mouse user can. The requirements:

- **Everything is operable from a keyboard interface without requiring specific timings for
  individual keystrokes**, except where the underlying function depends on the path of the user's
  movement and not just the endpoints [F83, F174]. Examples of forbidden "specific timings"
  include requiring repeated keystrokes within a short period or holding a key down for an
  extended period before it registers [F174]. The Understanding document's instruction — ensure
  pointer actions have a keyboard equivalent [F83] — is AC12's shape.
- **No keyboard trap.** Where focus can be moved to a component it must be movable away using
  only a keyboard, and where that needs more than unmodified arrow or Tab keys or other standard
  exit methods the user must be told how [F84]. Restricting focus inside a modal dialog or
  popover does not fail the criterion as long as the user knows how to untrap it, and `Esc` is
  generally a commonly used standard exit method [F84] — which is AC13, and which is also why
  §2.5 forbids locking `Escape`.
- **Focus order preserves meaning and operability** where the order affects meaning or operation;
  the specification notes dynamic HTML can alter the sequence with scripting and `tabindex` [F85],
  which this application does whenever a modal or a reveal changes what is on screen.
- **A visible focus indicator** in some mode of operation for any keyboard-operable interface,
  not time limited: when the keyboard focus is shown it must remain visible [F86]. Because focus
  indication is non-text content it is also subject to SC 1.4.11 Non-text Contrast [F86], so the
  indicator meets 3:1 against adjacent colours [F91].
- **Focus is never entirely obscured** by the application's own chrome. The focused item must
  remain at least partially visible and not entirely hidden by author-created content, with
  sticky headers, sticky footers and non-modal dialogs the typical causes; passing routes include
  making the obscuring element modal, using scroll padding, or closing it on loss of focus, and a
  semi-transparent or blur overlay over a focused item may separately fail 1.4.11 [F87]. The
  presenter toolbar and the timer are exactly the sticky elements this criterion is about.
- **Single-character shortcuts are controllable (AC14).** Where a shortcut uses only letter,
  punctuation, number or symbol characters, at least one of these must hold: a mechanism to turn
  it off, a mechanism to remap it to include a non-printable modifier such as Ctrl or Alt, or the
  shortcut being active only while its component has focus [F173]. It applies even when the
  character needs Shift or AltGr, and to sequences of character keys [F173]. This application
  takes the first route — a visible setting that disables every single-character shortcut — and
  additionally publishes a modifier-based equivalent for each one.
- **Characters are matched on `key`, positions on `code`.** `KeyboardEvent.key` returns the key
  value taking modifier state, locale and layout into account, giving the character for printable
  keys, predefined values for control and special keys, `Unidentified` when the key cannot be
  identified and `Dead` for dead keys [F171]. `KeyboardEvent.code` is the physical key and is not
  altered by layout or modifiers — the same `"KeyQ"` is Q on QWERTY, `'` on Dvorak and A on
  AZERTY — and cannot be used to determine the character generated [F170]. Every
  character-labelled shortcut is therefore bound on `key`; `code` is used only where a physical
  position is meant, which is also the attribute Keyboard Lock matches on [F161, F168].
- **Per-pattern key maps** come from §2.4 and are not re-invented: tabs [F95], accordion [F98],
  carousel [F99] and modal dialog [F102].

### 2.11 WCAG 2.2 Level AA conformance (AC15, AC16, AC17, AC18, AC19)

The conformance target is **WCAG 2.2 Level AA for the application chrome and for every
interactive element**. `workshop/spa/docs/wcag-22-aa-conformance.md` is the record, one row per
criterion, each row declaring whether it is decided by an automated check or by a manual one and
pointing at the evidence (AC16). Automated coverage alone is not treated as conformance: §4 Q9
and Q10 record what this spec does not establish about criterion enumeration and tool coverage.

**The checker is named in the repository, not in this spec (AC15).** No source read for this spec
establishes which success criteria any automated checker decides, or what rule or tag vocabulary
any particular tool exposes (Q10). This spec therefore names no tool and asserts nothing about any
tool's rule set — doing so would be an unsourced factual claim sitting inside a normative
criterion. What it requires instead is that the choice be *declared and bound*:
`workshop/spa/docs/a11y-tool.md` records the checker the gate actually runs and the exact rule or
tag selection passed to it, and AC15 fails if the gate's configuration and that declaration
disagree, or if the run reports a violation. Choosing the tool, and justifying that its selected
rule set is the right one for a WCAG 2.2 AA target, is work for the build — done against the
tool's own current documentation, in review — not a fact this spec is entitled to state. The
conformance claim rests on AC16's per-criterion record, where every row declares `automated` or
`manual` and points at evidence; a clean automated run is one input to that record, never a
substitute for it.

The criteria whose text this spec relies on directly:

| Criterion | What it requires here |
|---|---|
| 1.4.3 Contrast (Minimum), AA | Enough light-dark contrast between text and its background for people with moderately low vision; large text (18 point, or 14 point bold) is allowed a lower ratio; purely decorative text is excluded [F90] |
| 1.4.11 Non-text Contrast, AA | Visual information needed to identify a control and how to operate it has at least 3:1 contrast with adjacent colours unless the control is inactive, and the same applies to information indicating state such as selected or focused; a hit-area boundary is required only when nothing else identifies the control, but a contrasting focus indication is still needed [F91] |
| 1.4.13 Content on Hover or Focus, AA | The glossary and command popovers are dismissible without moving pointer hover or keyboard focus, for example with `Esc`, hoverable and persistent; the two exemptions are input error messages and content that does not obscure other meaningful content; more predictable ways of adding content are usually preferable [F92] |
| 2.1.1 Keyboard, A | §2.10 [F83, F174] |
| 2.1.2 No Keyboard Trap, A | §2.10 [F84] |
| 2.1.4 Character Key Shortcuts, A | §2.10, AC14 [F173] |
| 2.2.2 Pause, Stop, Hide, A | The segment timer and any auto-advance get a pause/stop control or frequency control [F108] |
| 2.4.3 Focus Order, A | §2.10 [F85] |
| 2.4.7 Focus Visible, AA | §2.10 [F86] |
| 2.4.11 Focus Not Obscured (Minimum), AA | §2.10; the presenter toolbar and timer must not entirely hide the focused item [F87] |
| 2.5.7 Dragging Movements, AA | Every draggable affordance has a single-pointer, non-drag equivalent [F88] |
| 2.5.8 Target Size (Minimum), AA | AC17; 24 × 24 CSS px, or a declared exception [F89] |
| 4.1.3 Status Messages, AA | Segment changes, synchronization state, timer state and recomputed chart values are surfaced programmatically [F93] |

**Status messages.** SC 4.1.3 is worded to apply primarily when visible text is added to or
becomes visible on the page and requires it to be surfaced programmatically to assistive
technologies; it also covers modifications to persistent status text such as a count changing
from "0 items" to "3 items", removal of status text, non-displayed text for AT users, and
non-textual status content [F93]. The application uses a live region with the `status` role — a
type of live region whose content is advisory information not important enough to justify an
alert — reserving the `alert` role for important, usually time-sensitive information such as a
failed fullscreen request; live regions are regions updated by external events while focus is
elsewhere and are identified with `aria-live` and related properties [F104].

**Target size (AC17).** Targets must be at least 24 by 24 CSS pixels, with five exceptions
including Spacing — undersized targets pass if a 24 CSS pixel circle centred on each does not
intersect another target or another undersized target's circle — and Equivalent, where a
different control achieving the same function meets the size [F89]. Any control below 24 × 24 is
listed in `workshop/spa/docs/target-size-exceptions.md` naming the exception it relies on.

**Complex visuals (AC19).** A complex image needs a short description plus a long description,
which is a textual representation of the essential information the image conveys; the documented
approaches include a text link to the long description adjacent to the image, describing the long
description's location, and structurally associating the image with an adjacent long description
in HTML5 [F109]. Every chart and diagram in the inventory therefore declares both.

**Motion (AC18).** The application honours the reduce-motion preference. The relevant criterion,
SC 2.3.3 Animation from Interactions, is **Level AAA**, above this spec's target: it requires
that motion animation triggered by interaction can be disabled unless essential, and its
Understanding document presents, as solutions in its Intent section, avoiding unnecessary
animation, providing a control to turn off non-essential animation, or taking advantage of the
reduce-motion feature in the user agent or operating system, with an example of a page-flipping
animation that respects the `prefers-reduced-motion` CSS media query [F106]. Technique C39,
"Using the CSS prefers-reduced-motion query to prevent motion", is listed as a sufficient
technique for that criterion and shows both
`@media (prefers-reduced-motion: reduce) { /* disable motion */ }` and the inverse pattern of
static default styles plus `@media (prefers-reduced-motion: no-preference)` for the motion
[F107]. The inverse pattern is the one this application uses, so that a browser that never
reports a preference still gets the static presentation. Adopting an AAA criterion here is a
deliberate choice, not a claim of AAA conformance, and the C39 page itself notes that techniques
are not required to meet WCAG [F107]. Content that moves on its own remains governed by the Level
A criterion 2.2.2 instead [F108].

---

## 3. Verified facts

Every factual claim this spec relies on. **Mandatory** — a spec with no factual claims
states that explicitly rather than omitting the table.

A search-engine summary is a lead, not a source. The verifier opens the primary page.

Each row below was graded by opening the cited primary source. The **Verifier caveats** list that
follows the table records, for the rows where it matters, the limit of what the grade establishes;
the spec body relies on no row further than its caveat allows. Rows carrying a caveat are still
`VERIFIED` — the caveat bounds the claim, it does not withdraw it.

| # | Claim | Primary source URL | Published | Verdict |
|---|---|---|---|---|
| F1 | The WHATWG Fullscreen Standard's requestFullscreen() steps set an error flag unless the element's relevant global object has transient activation (or the call is triggered by a user-generated orientation change). When there is no error, the steps consume the user activation. | https://raw.githubusercontent.com/whatwg/fullscreen/main/fullscreen.bs | Living Standard; source last committed 2026-07-17 | `VERIFIED` |
| F2 | The WHATWG Standard's requestFullscreen() steps also set the error flag if the element is not in the HTML namespace and is not an svg or math element, is a dialog element, fails the 'fullscreen element ready check' (connected, node document allowed to use the 'fullscreen' feature, not a shown popover), or if 'fullscreen is supported' is false. | https://raw.githubusercontent.com/whatwg/fullscreen/main/fullscreen.bs | Living Standard; source last committed 2026-07-17 | `VERIFIED` |
| F3 | On error, the WHATWG algorithm appends a fullscreenerror event for the element to the document's pending fullscreen events and rejects the returned promise with a TypeError. If the document is not fully active, the promise is rejected with a TypeError immediately. | https://raw.githubusercontent.com/whatwg/fullscreen/main/fullscreen.bs | Living Standard; source last committed 2026-07-17 | `VERIFIED` |
| F4 | The WHATWG Standard defines the document.fullscreenEnabled getter as returning true if the document is allowed to use the 'fullscreen' feature and fullscreen is supported, and false otherwise. | https://fullscreen.spec.whatwg.org/ | 2026-07-17 | `VERIFIED` |
| F5 | The WHATWG Standard says fullscreen is supported if there is no previously-established user preference, security risk, or platform limitation. It does not mention URL schemes or file: URLs in the sections read. | https://fullscreen.spec.whatwg.org/ | 2026-07-17 | `VERIFIED` |
| F6 | The WHATWG Standard defines a policy-controlled feature identified by the string 'fullscreen' whose default allowlist is 'self'. Content in a child navigable can go fullscreen only if allowed through the iframe allowfullscreen attribute, the iframe allow attribute, or a Permissions-Policy HTTP header. | https://fullscreen.spec.whatwg.org/ | 2026-07-17 | `VERIFIED` |
| F7 | The WHATWG Standard says the user agent may end any fullscreen session without a close request or exitFullscreen() call whenever it deems necessary. The viewport is resized to the full dimensions of the 'screen of the output device' for navigationUI 'hide', or clamped for 'show'. 'auto' is user-agent defined. The standard does not say which monitor is used when several exist. | https://fullscreen.spec.whatwg.org/ | 2026-07-17 | `VERIFIED` |
| F8 | MDN states that Element.requestFullscreen() requires transient user activation: the user has to interact with the page or a UI element for the feature to work. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/element/requestfullscreen/index.md | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F9 | MDN states that if permission is granted the promise resolves and the element receives a fullscreenchange event. If permission is denied the promise is rejected and the element receives a fullscreenerror event. If the element was detached from its document, the document receives the events instead. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/element/requestfullscreen/index.md | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F10 | MDN lists TypeError rejection cases for requestFullscreen(): the document is not fully active, the element is not in a document, the element is not permitted to use the fullscreen feature (Permissions Policy or other access control), the element is the document node, or the element is an already-shown popover. It also lists NotSupportedError for an unsupported keyboardLock option. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/element/requestfullscreen/index.md | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F11 | MDN says any set Permissions-Policy must allow the 'fullscreen' feature, and that the default allowlist is self (the MDN text mistakenly names 'screen-wake-lock'). Third-party frames need a Permissions-Policy header such as fullscreen=(self b.example.com) plus allow="fullscreen" on the iframe. Elements must be in the top-level document or in an iframe with allowfullscreen. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/element/requestfullscreen/index.md | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F12 | MDN documents an experimental `screen` option of requestFullscreen(options) that takes a ScreenDetailed object and specifies on which screen the element goes fullscreen. This is the only monitor-selection mechanism on that page. The page does not say which monitor is used by default. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/element/requestfullscreen/index.md | 2026-09-11 (last modified, mdn/content commit history) | `VERIFIED` |
| F13 | MDN says to listen for fullscreenchange on the Document to learn when the user manually toggles fullscreen or switches applications, causing a temporary exit from fullscreen. Most browsers use Esc to exit fullscreen and long-press Esc to exit keyboard lock. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/element/requestfullscreen/index.md | 2026-09-11 (last modified, mdn/content commit history) | `VERIFIED` |
| F14 | The W3C Window Management specification is a Working Draft dated 8 September 2026. Its stated motivating use cases include 'Slideshow app presents on a projector, shows speaker notes on a laptop screen.' | https://www.w3.org/TR/window-management/ | 2026-09-08 | `VERIFIED` |
| F15 | The spec extends Window, Screen and FullscreenOptions and introduces ScreenDetails and ScreenDetailed. getScreenDetails() 'may prompt the user for permission'. screen.isExtended is exposed to secure contexts without a permission prompt. | https://www.w3.org/TR/window-management/ | 2026-09-08 | `VERIFIED` |
| F16 | The spec shows placing an element fullscreen on a chosen screen with element.requestFullscreen({ screen: screenDetailed }). It also shows a single click handler that awaits requestFullscreen({screen}) on one screen and then calls window.open() with left/top/width/height from another ScreenDetailed, to start a multi-screen experience from one user activation. | https://www.w3.org/TR/window-management/ | 2026-09-08 | `VERIFIED` |
| F17 | The spec's permission and policy name is 'window-management' (previously 'window-placement'). getScreenDetails() rejects with NotAllowedError if the Document is not allowed to use the policy-controlled feature 'window-management'. Otherwise it requests permission to use 'window-management'. | https://www.w3.org/TR/window-management/ | 2026-09-08 | `VERIFIED` |
| F18 | The spec's WebIDL marks its new interfaces and members [SecureContext], so the API is secure-context only. The spec text I searched contains no mention of file: URLs. | https://www.w3.org/TR/window-management/ | 2026-09-08 | `VERIFIED` |
| F19 | MDN's Window Management API page marks it experimental. It lists ScreenDetails, ScreenDetailed, Screen.isExtended, the Screen change event and Window.getScreenDetails() as secure-context only. It lists the requestFullscreen() 'screen' option as an extension. It cites slideshow apps showing speaker notes on the primary screen and the presentation on an external projector as a use case. It does not mention file: URLs. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window_management_api/index.md | 2025-07-07 | `VERIFIED` |
| F20 | MDN's Window Management API page says the window-management Permissions-Policy governs the API. If it is blocked, getScreenDetails() rejects with NotAllowedError and screen.isExtended always returns false. An iframe can be granted access with allow="window-management". | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window_management_api/index.md | 2025-07-07 | `VERIFIED` |
| F21 | MDN's Window.getScreenDetails() page marks it experimental and secure-context only. It says invoking it asks the user for permission to manage windows on all their displays. The permission status can be checked with Permissions.query() using the name 'window-management'. It throws NotAllowedError if blocked by Permissions-Policy or if the user denied the permission. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/getscreendetails/index.md | 2025-03-13 | `VERIFIED` |
| F22 | MDN browser-compat-data for api.Window.getScreenDetails: Chrome version_added 100, Edge mirrors Chrome, Opera mirrors Chrome. Firefox version_added false. Safari version_added false. Status is experimental: true, standard_track: true, deprecated: false. | https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Window.json | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F23 | caniuse (MDN-derived entry 'Window API: getScreenDetails') lists Chrome 100-157 and Edge 100-154 as supported. It lists Firefox 2-160 as not supported. It lists Safari 3.1-27.2 as not supported, with Safari Technology Preview marked 'support unknown'. It lists Safari on iOS 3.2-27.2 and Firefox for Android 157 as not supported. | https://caniuse.com/mdn-api_window_getscreendetails | live data; page served 2026-10-09 (usage share dated September 2026) | `VERIFIED` |
| F24 | The HTML Living Standard's BroadcastChannel postMessage() steps build the destination list from BroadcastChannel objects that are eligible for messaging, whose storage key (obtained via 'obtain a storage key for non-storage purposes' from their relevant settings object) equals the sender's storage key, and whose channel name equals the sender's channel name; the sender itself is removed. | https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts | 2026-10-09 | `VERIFIED` |
| F25 | A BroadcastChannel is eligible for messaging only when its relevant global object is a Window whose associated Document is fully active, or a WorkerGlobalScope whose closing flag is false and that is not suspendable. | https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts | 2026-10-09 | `VERIFIED` |
| F26 | The Storage Standard defines 'obtain a storage key for non-storage purposes' as returning a tuple consisting of the environment's origin. The separate 'obtain a storage key' algorithm returns failure if the key's origin is opaque, but BroadcastChannel uses the non-storage variant, which has no opaque-origin failure step. | https://storage.spec.whatwg.org/ | Living Standard, Last Updated 6 October 2026 | `VERIFIED` |
| F27 | The HTML Standard defines two origins as same origin if they are the same opaque origin, or both tuple origins with identical schemes and ports and equal hosts. | https://html.spec.whatwg.org/multipage/browsers.html | 2026-10-09 (page header: 'Living Standard — Last Updated 9 October 2026') | `VERIFIED` |
| F28 | The URL Standard says the origin of a URL whose scheme is 'file' is 'left as an exercise to the reader. When in doubt, return a new opaque origin.' So the spec does not define file: origin equivalence, and browsers decide it. | https://url.spec.whatwg.org/#origin | Living Standard, Last Updated 7 October 2026 | `VERIFIED` |
| F29 | MDN's BroadcastChannel page says the interface represents a named channel that any browsing context of a given origin can subscribe to, allowing communication between documents (windows, tabs, frames or iframes) of the same origin. Messages are delivered to all BroadcastChannel objects listening to the channel except the sender. | https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel | last modified 2024-06-03 | `VERIFIED` |
| F30 | MDN's BroadcastChannel constructor page says there is one single channel with a given name for all browsing contexts with the same origin. | https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel/BroadcastChannel | 2024-03-11 (MDN last modified) | `VERIFIED` |
| F31 | MDN's Same-origin policy page says modern browsers usually treat the origin of files loaded via file:/// as opaque origins. It adds that the URL specification makes file origins implementation-dependent and that some browsers may treat files in the same directory or subdirectory as same-origin, which has security implications (cites Mozilla advisory CVE-2019-11730). | https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy | 2026-09-17 (MDN last modified) | `VERIFIED` |
| F32 | The HTML spec's BroadcastChannel event handler tables carry MDN support data showing the message event supported in Firefox 38+, Safari 15.4+, Chrome 54+ and Edge 79+, and messageerror in Firefox 57+, Safari 15.4+, Chrome 60+ and Edge 79+. This data is for the API generally, not file: URLs. | https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts | 2026-10-09 | `VERIFIED` |
| F33 | The storage event fires when another document that shares the same storage area updates it, and is not fired on the window that made the change. For localStorage it fires in all other browsing contexts in the same origin as the initiating document, including other tabs of that origin. It does not bubble and is not cancelable. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/storage_event/index.md | 2026-08-21 | `VERIFIED` |
| F34 | HTML Standard, Web Storage: when a Storage object is mutated (setItem, removeItem, clear), the user agent dispatches a storage event on Window objects holding an equivalent Storage object. The target set is the other Storage objects of the same type whose relevant settings object's origin is same origin with the mutated Storage's origin. For sessionStorage the same top-level traversable is also required. The event is queued as a global task on the DOM manipulation task source. | https://html.spec.whatwg.org/multipage/webstorage.html | 2026-10-09 | `VERIFIED` |
| F35 | HTML Standard: the localStorage getter throws a SecurityError DOMException if the Document's origin is an opaque origin, or if the request violates a policy decision such as the user agent being configured not to persist data. The same applies to sessionStorage. | https://html.spec.whatwg.org/multipage/webstorage.html | 2026-10-09 | `VERIFIED` |
| F36 | MDN (localStorage): for documents loaded from file: URLs, the requirements for localStorage behaviour are undefined and may vary among browsers. In all current browsers localStorage seems to return a different object for each file: URL, so each file: URL has its own unique storage area. MDN says this is not guaranteed and should not be relied on, and that some browsers have changed their file: handling over time. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/localstorage/index.md | 2026-07-28 | `VERIFIED` |
| F37 | MDN (localStorage) lists SecurityError as thrown when the origin is not a valid scheme/host/port tuple. It gives the file: and data: schemes as examples of where this can happen. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/localstorage/index.md | 2026-07-28 | `VERIFIED` |
| F38 | MDN Same-origin policy: modern browsers usually treat the origin of files loaded using the file:/// scheme as opaque origins. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/security/defenses/same-origin_policy/index.md | 2026-09-17 | `VERIFIED` |
| F39 | HTML Standard: two origins A and B are same origin if they are the same opaque origin, or if both are tuple origins with identical schemes and ports and equal hosts. Otherwise they are not same origin. Two distinct opaque origins are therefore never same origin with each other. | https://html.spec.whatwg.org/multipage/browsers.html | 2026-10-09 (page header: 'Living Standard — Last Updated 9 October 2026') | `VERIFIED` |
| F40 | HTML Standard, window post message steps: targetOrigin '/' is replaced with the incumbent settings object's origin. Otherwise, if targetOrigin is not '*', it is parsed as a URL (SyntaxError on failure) and its origin is used. In the queued task, if targetOrigin is not literal '*' and the target window's associated Document's origin is not same origin with targetOrigin, the message is silently dropped. Otherwise a message event is fired at the target window with origin set to the incumbent settings object's origin and source set to the sender's WindowProxy. | https://html.spec.whatwg.org/multipage/web-messaging.html | 2026-10-09 | `VERIFIED` |
| F41 | HTML Standard: postMessage's targetOrigin defaults to '/', which restricts the message to same-origin targets only. If the target window's origin does not match the given target origin the message is discarded. Setting the target origin to '*' sends the message regardless of origin. | https://html.spec.whatwg.org/multipage/web-messaging.html | 2026-10-09 | `VERIFIED` |
| F42 | MDN postMessage: targetOrigin defaults to '/', meaning the origin of the caller. Because data: URLs have opaque origins, sending a message to a data: URL context requires targetOrigin '*'. MDN advises always providing a specific targetOrigin rather than '*' when the recipient's location is known. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/postmessage/index.md | 2026-09-04 | `VERIFIED` |
| F43 | MDN postMessage: the sender must already hold a reference to the target window, for example from window.open() for popups, iframe.contentWindow, or window.opener. The receiver gets a MessageEvent with data, origin (the sender's origin at the time of the call) and source (a reference to the sending window). | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/postmessage/index.md | 2026-09-04 | `VERIFIED` |
| F44 | MDN window.opener: window.opener returns the window that opened the current window via window.open() or a link with a target attribute, and is null if the window was not opened by another. If the opener is not same-origin, its functionality is limited. The accessible properties are window, self, location (only replace and href), close, closed, focus, blur, frames, length, top, opener, parent, postMessage and window[n]. All other properties throw a SecurityError. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/opener/index.md | 2025-04-10 | `VERIFIED` |
| F45 | MDN window.opener: the browser leaves opener null when noopener is passed in the window.open features or set as rel=noopener on a link. It also leaves it null for links with target=_blank unless rel=opener is requested, and when a Cross-Origin-Opener-Policy of same-origin severs the reference. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/opener/index.md | 2025-04-10 | `VERIFIED` |
| F46 | MDN window.open: the noopener feature gives the new window no access to the originating window via Window.opener, and open() returns null. Under noopener, non-empty target names other than _top, _self and _parent are treated like _blank. open() also returns null if the browser fails to open the context, for example when a popup blocker blocks it. The returned reference can be used to access the new context only as far as the same-origin policy allows. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window/open/index.md | 2026-08-21 | `VERIFIED` |
| F47 | HTML Standard: the rel=noopener link keyword means a newly created top-level traversable from following the hyperlink will not contain an auxiliary browsing context, so the resulting Window's opener getter returns null. | https://html.spec.whatwg.org/multipage/links.html | 2026-10-09 | `VERIFIED` |
| F48 | The HTML Standard defines an origin as either an opaque origin or a tuple origin. An opaque origin is an internal value with no serialization it can be recreated from, serialized as "null", for which the only meaningful operation is testing for equality. | https://html.spec.whatwg.org/multipage/browsers.html#origin | 2026-10-09 (page header: 'Living Standard — Last Updated 9 October 2026') | `VERIFIED` |
| F49 | The URL Standard's 'origin' algorithm returns a tuple origin for the schemes ftp, http, https, ws and wss. For "file" it states: "Unfortunate as it is, this is left as an exercise to the reader. When in doubt, return a new opaque origin." So the standard does not mandate whether a file: URL has an opaque origin, a per-file origin or a per-directory origin; a new opaque origin is the suggested fallback. | https://url.spec.whatwg.org/ | Living Standard, Last Updated 7 October 2026 | `VERIFIED` |
| F50 | The Fetch Standard defines the fetch schemes as about, blob, data, file and the HTTP(S) schemes. In scheme fetch for "file" it states: "For now, unfortunate as it is, file: URLs are left as an exercise for the reader. When in doubt, return a network error." So fetch() of file: URLs is implementation-defined, with a network error as the suggested default. | https://fetch.spec.whatwg.org/ | 2026-10-06 (Living Standard, Last Updated 6 October 2026) | `VERIFIED` |
| F51 | The HTML Standard says the localStorage getter throws a "SecurityError" DOMException if the Document's origin is an opaque origin or if the request violates a policy decision (for example, the user agent is configured not to allow the page to persist data). The same wording applies to sessionStorage. | https://html.spec.whatwg.org/multipage/webstorage.html | 2026-10-09 | `VERIFIED` |
| F52 | MDN's Same-origin policy page states: "Modern browsers usually treat the origin of files loaded using the file:/// scheme as opaque origins. What this means is that if a file includes other files from the same folder (say), they are not assumed to come from the same origin, and may trigger CORS errors." | https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy | 2026-09-17 (MDN last modified) | `VERIFIED` |
| F53 | MDN's localStorage page says that for documents loaded from file: URLs the requirements for localStorage behavior are undefined and may vary among browsers. It says that in all current browsers localStorage seems to return a different object for each file: URL, so each file: URL seems to have its own local-storage area. It says there are no guarantees and browsers may change file: handling at any time, and that some browsers have changed it over time. | https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | 2026-07-28 (MDN last modified) | `VERIFIED` |
| F54 | MDN's localStorage page lists SecurityError as thrown when the origin is not a valid scheme/host/port tuple, and gives the file: or data: schemes as examples where this can happen. | https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage | 2026-07-28 (MDN last modified) | `VERIFIED` |
| F55 | MDN's JavaScript modules guide warns that loading an HTML file locally with a file:// URL produces CORS errors because of JavaScript module security requirements, and that testing must be done through a server. It also says that to run the examples locally you need a local web server. | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules | 2026-08-21 (MDN last modified) | `VERIFIED` |
| F56 | MDN's Worker() constructor page says the worker script URL must be same-origin with the associated document, or a blob: or data: URL. It also says a SecurityError is thrown if the same-origin policy is violated. | https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker | 2026-05-21 (MDN last modified) | `VERIFIED` |
| F57 | Firefox 68 release notes on MDN say that, due to CVE-2019-11730 (same-origin policy treats all files in a directory as having the same origin), Firefox now treats files in the same directory as being from different origins. They say this has several side-effects on documents loaded via file:// URLs and give as an example that workers can no longer be loaded. They refer to Firefox bug 1558299 for background. | https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/68 | Firefox 68 released 2019-07-09; MDN page last modified 2026-09-04 | `VERIFIED` |
| F58 | Chromium's content_switches.cc comments the switch allow-file-access-from-files: "By default, file:// URIs cannot read other file:// URIs. This is an override for developers who need the old behavior for testing." So Chromium-based browsers (Chrome, Edge) block file:// to file:// reads by default, and a developer-only command-line switch relaxes that. | https://chromium.googlesource.com/chromium/src/+/main/content/public/common/content_switches.cc | tip of main, retrieved 2026-10-09 (per-file commit history returns 403 without sign-in) | `VERIFIED` |
| F59 | The Secure Contexts spec's 'Is origin potentially trustworthy?' algorithm returns Potentially Trustworthy for: https or wss schemes; hosts matching 127.0.0.0/8 or ::1/128; localhost, localhost., *.localhost and *.localhost. (when the user agent conforms to the let-localhost-be-localhost name resolution rules); scheme file; user-agent-authenticated schemes; and origins configured as trustworthy. Otherwise it returns Not Trustworthy. Port and domain have no effect. | https://w3c.github.io/webappsec-secure-contexts/ | Editor's Draft, 10 November 2023 | `VERIFIED` |
| F60 | The Secure Contexts spec says the user agent SHOULD treat file URLs as potentially trustworthy, but that user agents which prioritize security MAY choose to exclude file. So file: trust is a SHOULD with an explicit opt-out, not a MUST. | https://w3c.github.io/webappsec-secure-contexts/ | Editor's Draft, 10 November 2023 | `VERIFIED` |
| F61 | The Secure Contexts spec says Service Workers are always secure contexts, only secure contexts may register them, and they may only have clients that are secure contexts. | https://w3c.github.io/webappsec-secure-contexts/ | Editor's Draft, 10 November 2023 | `VERIFIED` |
| F62 | The Secure Contexts spec says a framed document is a secure context only if it is delivered from a potentially trustworthy origin and is embedded in a secure context. Dedicated workers are secure contexts only if their owner is one. A non-secure parent therefore makes an https child non-secure. | https://w3c.github.io/webappsec-secure-contexts/ | Editor's Draft, 10 November 2023 | `VERIFIED` |
| F63 | The Secure Contexts spec says applications can detect a secure context via the isSecureContext boolean on WindowOrWorkerGlobalScope. The [SecureContext] WebIDL attribute restricts operations and interfaces so they are not exposed to non-secure contexts. | https://w3c.github.io/webappsec-secure-contexts/ | Editor's Draft, 10 November 2023 | `VERIFIED` |
| F64 | MDN's Secure contexts guide gives http://localhost and file:///path/to/resource.html as secure (the guide labels them 'localhost URL' and 'file URL'), and http://example.com as not secure. It says the canonical definition is the W3C Secure Contexts specification. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/security/defenses/secure_contexts/index.md | 2026-09-14 | `VERIFIED` |
| F65 | MDN marks the Window Management API members as secure-context only: ScreenDetails, ScreenDetailed, the Screen change event, Screen.isExtended and Window.getScreenDetails(). | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/window_management_api/index.md | 2025-07-07 | `VERIFIED` |
| F66 | The W3C Window Management draft marks its interfaces [SecureContext], and states Screen.isExtended is exposed to secure contexts without a permission prompt. | https://raw.githubusercontent.com/w3c/window-management/main/index.bs | Editor's Draft (Status: ED); source last committed 2026-09-08 | `VERIFIED` |
| F67 | MDN marks the Screen Wake Lock API as secure-context only. The W3C Screen Wake Lock spec (Working Draft, 29 September 2026) marks WakeLock and WakeLockSentinel with the [SecureContext] extended attribute. | https://www.w3.org/TR/screen-wake-lock/ | 2026-09-29 | `VERIFIED` |
| F68 | MDN says service workers are only available in secure contexts: the document is served over HTTPS, although browsers also treat http://localhost as a secure context to facilitate local development. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/service_worker_api/index.md | 2026-08-15 (last modified, mdn/content commit history) | `VERIFIED` |
| F69 | MDN says that in Firefox, for testing, service workers can be run over HTTP via the DevTools option 'Enable Service Workers over HTTP (when toolbox is open)'. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/service_worker_api/index.md | 2026-08-15 (last modified, mdn/content commit history) | `VERIFIED` |
| F70 | The W3C Screen Wake Lock API spec's abstract says it lets web applications request a screen wake lock that, under the right conditions and if allowed, prevents the system from turning off a device's screen. Presenting to an audience is listed among its use cases. | https://www.w3.org/TR/screen-wake-lock/ | 2026-09-29 | `VERIFIED` |
| F71 | The Screen Wake Lock spec is a W3C Working Draft dated 29 September 2026. Its status section warns that it is extremely unstable and may change in incompatible ways. | https://www.w3.org/TR/screen-wake-lock/ | 2026-09-29 | `VERIFIED` |
| F72 | In the Screen Wake Lock spec, Navigator.wakeLock, WakeLock and WakeLockSentinel are all annotated [SecureContext]. The API is therefore exposed only in secure contexts. | https://www.w3.org/TR/screen-wake-lock/ | 2026-09-29 | `VERIFIED` |
| F73 | The Screen Wake Lock spec's request() algorithm rejects with NotAllowedError if the document is not fully active, if the 'screen-wake-lock' Permissions Policy denies it, if the user agent denies it, or if the document's visibility state is 'hidden'. Only visible documents can acquire a screen wake lock. The algorithm contains no user-activation check. | https://www.w3.org/TR/screen-wake-lock/ | 2026-09-29 | `VERIFIED` |
| F74 | The Screen Wake Lock spec defines a policy-controlled feature 'screen-wake-lock' with default allowlist 'self'. It says user agents may time-limit or disallow wake locks, for example for battery status or power-saving mode. It recommends an unobtrusive notification when a wake lock is active. | https://www.w3.org/TR/screen-wake-lock/ | 2026-09-29 | `VERIFIED` |
| F75 | MDN says the Screen Wake Lock API prevents devices from dimming or locking the screen, lists presenting to an audience as a use case, and marks the API as secure-context only. It says a request may be rejected for reasons such as power-save mode, low battery, or the document not being active or visible. It also says the lock is released when the document is no longer visible, so the app must re-request it, as in its visibilitychange example. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/screen_wake_lock_api/index.md | 2026-09-11 (last modified, mdn/content commit history) | `VERIFIED` |
| F76 | MDN's WakeLock.request() reference lists NotAllowedError causes: blocked by Permissions Policy, document not fully active, visibility state hidden, or the user agent could not acquire the platform wake lock (for example low battery). It lists no user-activation requirement. It is marked as secure-context only. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/wakelock/request/index.md | 2025-06-23 (last modified, mdn/content commit history) | `VERIFIED` |
| F77 | caniuse's 'Screen Wake Lock API' feature data shows full support from Chrome 85, Edge 90, Firefox 126 and Safari 16.4. The data file has no later versions marked unsupported. Chrome 84 and Firefox 125 are marked unsupported. Chrome 85 and later and Firefox 126 and later show 'y'. Safari 16.4 and iOS Safari 16.4 show 'y'. The file lists 'y' through Chrome 157, Edge 154, Firefox 160, Safari 27.2 and iOS Safari 27.2. | https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/wake-lock.json | retrieved 2026-10-09 (main branch); file title 'Screen Wake Lock API', status 'cr' | `VERIFIED` |
| F78 | The W3C Presentation API spec's abstract says it enables Web content to access presentation displays and use them for presenting Web content. It is a Candidate Recommendation Draft dated 12 February 2025 from the Second Screen Working Group. | https://www.w3.org/TR/presentation-api/ | 2025-02-12 | `VERIFIED` |
| F79 | In the Presentation API spec, interfaces such as PresentationRequest, PresentationAvailability, PresentationConnectionAvailableEvent, PresentationReceiver and PresentationConnectionList are annotated [SecureContext]. The API is therefore exposed only in secure contexts. | https://www.w3.org/TR/presentation-api/ | 2025-02-12 | `VERIFIED` |
| F80 | MDN says the Presentation API lets a user agent display web content on large presentation devices such as projectors and network-connected TVs, over HDMI/DVI wired or via DLNA, Chromecast, AirPlay or Miracast. It marks the API as experimental and secure-context only. It describes controller and receiver pages exchanging messages over a connection. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/presentation_api/index.md | 2025-09-19 (last modified, mdn/content commit history) | `VERIFIED` |
| F81 | MDN browser-compat-data for the Presentation interface shows Chrome supported from version 47 (receiver from 59) and Edge mirroring Chrome, so also supported. Firefox is version_added false (unsupported). Safari is version_added false, with an impl_url of webkit.org/b/149168. The feature is flagged experimental and standard-track. | https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Presentation.json | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F82 | caniuse has no data file for the Presentation API. A 404 was returned for features-json/presentation-api.json. | https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/presentation-api.json | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F83 | SC 2.1.1 Keyboard (Level A): all functionality must be operable through a keyboard interface without requiring specific timings for individual keystrokes, except where the underlying function depends on the path of the user's movement and not just the endpoints. The Understanding page's 'What to do' is to ensure pointer actions have a keyboard equivalent. | https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html | Updated 11 May 2026 (verified 2026-10-09) | `VERIFIED` |
| F84 | SC 2.1.2 No Keyboard Trap (Level A): if keyboard focus can be moved to a component, focus must be movable away using only a keyboard interface. If this needs more than unmodified arrow or Tab keys or other standard exit methods, the user must be advised of the method. Restricting focus inside a modal dialog or popover does not fail the criterion as long as the user knows how to leave it, and Esc is generally a commonly used standard exit method. | https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html | Updated 18 May 2026 (verified 2026-10-09) | `VERIFIED` |
| F85 | SC 2.4.3 Focus Order (Level A): if a page can be navigated sequentially and the order affects meaning or operation, focusable components must receive focus in an order that preserves meaning and operability. The page notes that dynamic HTML can alter the sequence with scripting and tabindex. | https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html | Updated 09 March 2026 (verified 2026-10-09) | `VERIFIED` |
| F86 | SC 2.4.7 Focus Visible (Level AA): any keyboard-operable user interface must have a mode of operation where the keyboard focus indicator is visible. The focus indicator must not be time limited. Because focus indicators are non-text content, they are also subject to SC 1.4.11 Non-text Contrast. 2.4.13 Focus Appearance is a separate AAA criterion. | https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html | Updated 06 September 2026 (verified 2026-10-09) | `VERIFIED` |
| F87 | SC 2.4.11 Focus Not Obscured (Minimum) (Level AA, new in WCAG 2.2): the item receiving keyboard focus must remain at least partially visible and not be entirely hidden by author-created content. Sticky headers or footers and non-modal dialogs are typical causes. A sticky cookie-style banner fails if it entirely obscures a focused component. Ways to pass include making the banner modal, using scroll-padding, or closing it on loss of focus. Semi-transparent or blur overlays over a focused item may separately fail 1.4.11. The AAA criterion 2.4.12 covers the stricter case where none of the focused item is obscured. | https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html | Updated 15 June 2026 (verified 2026-10-09) | `VERIFIED` |
| F88 | SC 2.5.7 Dragging Movements (Level AA, new in WCAG 2.2): any functionality that uses a dragging movement must also be achievable by a single pointer without dragging, unless dragging is essential or the behaviour is determined by the user agent. Examples given are a range slider (click the track to move the thumb) and a draggable carousel. This is relevant to draggable sliders, timelines or diagram nodes. | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html | Updated 10 August 2026 (verified 2026-10-09) | `VERIFIED` |
| F89 | SC 2.5.8 Target Size (Minimum) (Level AA, new in WCAG 2.2): targets must be at least 24 by 24 CSS pixels. There are five exceptions, including Spacing, where undersized targets pass if a 24 CSS pixel circle centred on each does not intersect another target or another undersized target's circle. Another exception is Equivalent, where a different control achieving the same function meets the size. | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | Updated 11 May 2026 (page-stated date); server Last-Modified 3 September 2026 | `VERIFIED` |
| F90 | SC 1.4.3 Contrast (Minimum) (Level AA): its intent is enough light-dark contrast between text and its background for people with moderately low vision. Large text (18 point, or 14 point bold) is allowed a lower contrast ratio. Purely decorative text is excluded. | https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html | Updated 06 September 2026 (verified 2026-10-09) | `VERIFIED` |
| F91 | SC 1.4.11 Non-text Contrast (Level AA): visual information needed to identify a control and how to operate it must have at least 3:1 contrast with adjacent colours, unless the control is inactive. The same applies to visual information that indicates state, such as selected or focused. A visual hit-area boundary is only required when there is no other visible way to identify the control, but a contrasting focus indication is still needed. | https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html | Updated 06 September 2026 (verified 2026-10-09) | `VERIFIED` |
| F92 | SC 1.4.13 Content on Hover or Focus (Level AA): additional content that appears and disappears with pointer hover or keyboard focus (custom tooltips, sub-menus, non-modal popups) must be dismissible, hoverable and persistent. Dismissible means it can be dismissed without moving pointer hover or keyboard focus, for example with Esc. There are two exemptions: input error messages, and content that does not obscure other meaningful content. The page notes that more predictable ways of adding content are usually preferable. | https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html | Updated 12 July 2026 (verified 2026-10-09) | `VERIFIED` |
| F93 | SC 4.1.3 Status Messages (Level AA): it is worded to apply primarily when visible text is added to or becomes visible on the page, and requires that this be surfaced programmatically to assistive technologies. The page also covers modifications to persistent status text (for example a count changing from '0 items' to '3 items'), removal of status text, non-displayed text for AT users, and non-textual status content. | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | Updated 11 May 2026 (page-stated date); server Last-Modified 3 September 2026 | `VERIFIED` |
| F94 | APG Tabs pattern, ARIA roles: the container has role tablist, each tab has role tab inside the tablist, and each content panel has role tabpanel. Each tab has aria-controls pointing to its tabpanel. The active tab has aria-selected=true and all other tabs have aria-selected=false. Each tabpanel has aria-labelledby pointing to its tab. The tablist is labelled by aria-labelledby or aria-label. A vertical tablist sets aria-orientation=vertical, and the default is horizontal. | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F95 | APG Tabs pattern, keyboard: Tab moves focus into the tab list onto the active tab, and the next Tab leaves the tablist for the tabpanel. In a horizontal tablist, Left Arrow and Right Arrow move focus to the previous or next tab and wrap from last to first and first to last. Space or Enter activates a tab that was not activated on focus. Home and End are optional and move to the first or last tab. In a vertical tablist, Down Arrow acts like Right Arrow and Up Arrow acts like Left Arrow. A horizontal tablist does not listen for Up Arrow or Down Arrow. | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F96 | APG Tabs pattern: it is recommended that tabs activate automatically on focus when the panels display without noticeable latency. If the tabpanel contains no focusable element, or its first content element is not focusable, the tabpanel should set tabindex=0. | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F97 | APG Accordion pattern, roles and states: each header title is in an element with role button, and that button is the only child of an element with role heading that has an appropriate aria-level (a native h1–h6 may be used). The button has aria-expanded=true or false and aria-controls pointing to the panel. If the open panel cannot be collapsed, the button has aria-disabled=true. Panels may optionally have role region with aria-labelledby pointing to the button. Avoid role region where it would create landmark proliferation, for example when more than about 6 panels can be open at once. | https://www.w3.org/WAI/ARIA/apg/patterns/accordion/ | 2026-10-07 | `VERIFIED` |
| F98 | APG Accordion pattern, keyboard: Enter or Space on a collapsed header expands its panel, and on an expanded header collapses it if collapsing is supported. In a single-expand accordion, expanding one panel collapses the other. Tab and Shift+Tab move through all focusable elements in the accordion as part of the normal page tab sequence. | https://www.w3.org/WAI/ARIA/apg/patterns/accordion/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F99 | APG Carousel pattern, rotation control: auto-rotation must stop when any element in the carousel receives keyboard focus, and it does not resume unless the user activates the rotation control. Rotation also stops while the mouse hovers over the carousel. The pattern requires previous and next slide buttons. If rotation is automatic it requires a stop/start rotation button. The rotation control, if present, is the first element in the Tab sequence inside the carousel. Activating the rotation, next or previous controls does not move focus. | https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F100 | APG Carousel pattern, roles: the container has role region or group with aria-roledescription=carousel, labelled by aria-labelledby or aria-label. Each slide has role group with aria-roledescription=slide and an accessible name. If there is no unique name, a name such as '3 of 10' may be used. The rotation button label changes between 'Stop slide rotation' and 'Start slide rotation' and does not use aria-pressed. A slide wrapper optionally has aria-atomic=false and aria-live=off while auto-rotating, or aria-live=polite when not auto-rotating. | https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F101 | APG Carousel pattern: the slide-picker controls may be a tabbed carousel (picker implemented with the Tabs pattern, each slide a tabpanel with no aria-roledescription) or a grouped carousel (a button per slide). The pattern describes the grouped style as the least friendly for keyboard users because each button adds a tab stop. | https://www.w3.org/WAI/ARIA/apg/patterns/carousel/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F102 | APG Modal Dialog pattern, keyboard: on open, focus moves into the dialog. Tab and Shift+Tab cycle within the dialog, wrapping from last to first and first to last. Escape closes the dialog. On close, focus returns to the invoking element unless that element no longer exists or the workflow makes another target more logical. A visible button that closes the dialog is strongly recommended. | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F103 | APG Modal Dialog pattern, roles: the container has role dialog and aria-modal=true, and all controls needed to operate it are descendants. It has an accessible name via aria-labelledby or aria-label, with optional aria-describedby. aria-modal=true should be set only when application code prevents all users from interacting with content outside the dialog and visual styling obscures that content. | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | No per-page content date published; HTTP Last-Modified 2026-10-07 (site build). Retrieved 2026-10-09. | `VERIFIED` |
| F104 | WAI-ARIA 1.2 defines the status role as a type of live region whose content is advisory information not important enough to justify an alert. It defines the alert role as a type of live region with important, usually time-sensitive, information. Live regions are regions updated by external events while focus is elsewhere, and are identified with aria-live and related properties. | https://www.w3.org/TR/wai-aria-1.2/ | 2023-06-06 | `VERIFIED` |
| F105 | WAI-ARIA 1.2 defines aria-roledescription as a human-readable, author-localized description for the role of an element, and aria-modal as indicating whether an element is modal when displayed. aria-orientation indicates a horizontal, vertical, or unknown orientation. | https://www.w3.org/TR/wai-aria-1.2/ | 2023-06-06 | `VERIFIED` |
| F106 | WCAG 2.2 SC 2.3.3 Animation from Interactions (Level AAA): motion animation triggered by interaction can be disabled unless it is essential. The Understanding document says conformance options include avoiding unnecessary animation, providing a control to turn off non-essential animation, or using the user-agent or OS reduce-motion feature. It gives an example of page-flipping animation that respects the prefers-reduced-motion CSS media query. | https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html | Updated 16 September 2025 | `VERIFIED` |
| F107 | WCAG 2.2 Technique C39 'Using the CSS prefers-reduced-motion query to prevent motion' is listed as a Sufficient technique for SC 2.3.3. It shows both @media (prefers-reduced-motion: reduce) { /* disable motion */ } and the inverse pattern with static default styles plus @media (prefers-reduced-motion: no-preference) for the motion. | https://www.w3.org/WAI/WCAG22/Techniques/css/C39 | Updated 12 January 2026 | `VERIFIED` |
| F108 | WCAG 2.2 SC 2.2.2 Pause, Stop, Hide (Level A): for moving, blinking or scrolling information that starts automatically, lasts more than five seconds and is presented in parallel with other content, there must be a mechanism to pause, stop or hide it unless it is essential. For auto-updating information that starts automatically and is presented in parallel with other content, there must be a mechanism to pause, stop or hide it or to control the update frequency, unless essential. The Understanding page for 2.3.3 says 2.2.2 applies to animation the page initiates automatically, whereas 2.3.3 applies to animation triggered by a user interaction. | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | Updated 10 August 2026 (page-stated date); server Last-Modified 3 September 2026 | `VERIFIED` |
| F109 | The W3C WAI Images tutorial on complex images says a complex image needs a short description plus a long description, which is a textual representation of the essential information the image conveys. It shows approaches including a text link to the long description adjacent to the image, describing the long description's location, and structurally associating the image with an adjacent long description in HTML5. | https://www.w3.org/WAI/tutorials/images/complex/ | Updated 08 April 2026 | `VERIFIED` |
| F110 | vite-plugin-singlefile inlines all JavaScript and CSS resources into the final dist/index.html so the entire web app can be distributed as a single HTML file. The README says it is for offline apps you can double-click and open directly in the browser with no server, and that bundling everything into one file 'isn't recommended for most situations' and is not good performance-wise for a normal web server. | https://raw.githubusercontent.com/richardtallent/vite-plugin-singlefile/main/README.md | 2025-07-02 | `VERIFIED` |
| F111 | vite-plugin-singlefile README lists what works from a local HTML file: localStorage, requests for images and fonts from external sites, hash-based SPA routing, and requests to external APIs (which need { mode: 'no-cors' } in fetch). It lists what does not work: SPA routing via the History API, cookies (no HTTP headers on file:///), WebXR immersive mode, Worklets, and sourcemaps (useless because inlining happens after they are generated). | https://raw.githubusercontent.com/richardtallent/vite-plugin-singlefile/main/README.md | 2025-07-02 | `VERIFIED` |
| F112 | vite-plugin-singlefile caveats: files in Vite's public folder are not inlined (the single HTML can reference them by relative path), and SVG inlining is not supported directly. The plugin is single-entry only (one HTML file, no other files); multiple HTML entry points will not work or will not be optimized. | https://raw.githubusercontent.com/richardtallent/vite-plugin-singlefile/main/README.md | 2025-07-02 | `VERIFIED` |
| F113 | The plugin's recommended build config sets build.assetsInlineLimit to () => true, build.cssCodeSplit to false, base to './', and build.assetsDir to ''. It sets output.inlineDynamicImports = true on Vite below 8, or codeSplitting = false on Vite 8 and later. It also sets chunkSizeWarningLimit to 100000000. | https://raw.githubusercontent.com/richardtallent/vite-plugin-singlefile/main/src/index.ts | 2026-04-17 | `VERIFIED` |
| F114 | The plugin's implementation replaces each <script ... src=...> tag with an inline <script> containing the chunk code, keeping the original attributes (so type="module" is preserved). It escapes '</script>' and '<!--' sequences inside the inlined code as \x3C, replaces the __VITE_PRELOAD__ marker with void 0, and replaces <link> stylesheet tags with inline <style>. The plugin runs with enforce 'post' in generateBundle. | https://raw.githubusercontent.com/richardtallent/vite-plugin-singlefile/main/src/index.ts | 2026-04-17 | `VERIFIED` |
| F115 | The plugin's removeViteModuleLoader option (default false) removes Vite's bundle-loading function from the build. The inlinePattern option limits which assets are inlined; assets missed by the patterns generate a warning. The deleteInlinedFiles option defaults to true. | https://raw.githubusercontent.com/richardtallent/vite-plugin-singlefile/main/README.md | 2025-07-02 | `VERIFIED` |
| F116 | Vite build.assetsInlineLimit defaults to 4096 bytes. Assets under the threshold are inlined as base64 URLs, and 0 disables inlining. It accepts a callback returning a boolean to opt in or out. With build.lib set, assets are always inlined regardless of size. | https://raw.githubusercontent.com/vitejs/vite/main/docs/config/build-options.md | 2026-09-22 | `VERIFIED` |
| F117 | Vite build.cssCodeSplit defaults to true. If disabled, all CSS in the project is extracted into a single CSS file. Vite's build.modulePreload injects a module-preload polyfill by default (polyfill: true, which can be set to false). With a relative base ('' or './'), import.meta.url is used at runtime to compute dynamic-import preload dependency paths. | https://raw.githubusercontent.com/vitejs/vite/main/docs/config/build-options.md | 2026-09-22 | `VERIFIED` |
| F118 | Vite's build.rollupOptions is deprecated and is an alias of build.rolldownOptions, so Vite 8 bundles with Rolldown. build.minify defaults to 'oxc' and build.target defaults to 'baseline-widely-available' (chrome111, edge111, firefox114, safari16.4, ios16.4 for this major). | https://raw.githubusercontent.com/vitejs/vite/main/docs/config/build-options.md | 2026-09-22 | `VERIFIED` |
| F119 | Vite supports ?inline and ?no-inline import suffixes to force or prevent inlining an asset as a data URI, and ?raw to import an asset as a string. Importing a worker with ?worker&inline inlines the worker as a base64 string at build time, whereas a plain ?worker import produces a separate chunk in the production build. | https://vite.dev/guide/assets | accessed 2026-10-09 (current Vite documentation; corroborated against vitejs/vite main docs/guide/assets.md) | `VERIFIED` |
| F120 | Vite supports 'new Worker(new URL("./worker.js", import.meta.url), { type: "module" })'. Worker detection works only if new URL() is used directly inside new Worker(), with static string-literal options. Otherwise the URL is treated as a static asset URL. The ?worker&inline suffix inlines the worker as a base64 string at build time. | https://vite.dev/guide/features | accessed 2026-10-09 (current Vite documentation; corroborated against vitejs/vite main docs/guide/features.md) | `VERIFIED` |
| F121 | Vite's CSP guidance: setting html.cspNonce makes Vite add a nonce attribute to <script>, <style> and stylesheet/modulepreload <link> tags and inject a <meta property="csp-nonce"> tag. The nonce placeholder must be replaced with a unique value per request. Because Vite inlines small assets as data: URIs by default, a CSP must either allow data: for directives such as img-src and font-src, or set build.assetsInlineLimit: 0. Vite warns not to allow data: for script-src because it permits injection of arbitrary scripts. | https://vite.dev/guide/features | undated page; opened and verified 2026-10-09 | `VERIFIED` |
| F122 | esbuild's guidance for web workers: do not call toString() on a function and pass it to a Worker. Instead, build the worker source in a separate build step and insert its source code as a string into the code that creates the worker (the 'define' feature is one way to insert the string at build time). | https://esbuild.github.io/content-types/ | 2026-08-09 (HTTP Last-Modified; page carries no version or date in body) | `VERIFIED` |
| F123 | esbuild documents that bundling code containing top-level await is only supported when the output format is 'esm'. | https://esbuild.github.io/content-types/ | 2026-08-09 (HTTP Last-Modified; page carries no version or date in body) | `VERIFIED` |
| F124 | esbuild code splitting is documented as a work in progress that currently only works with the esm output format, with a known ordering issue for import statements across split chunks. | https://esbuild.github.io/api/ | 2026-08-09 (HTTP Last-Modified; page carries no version or date in body) | `VERIFIED` |
| F125 | Rollup's output.inlineDynamicImports (default false) inlines dynamic imports instead of creating new chunks, to create a single bundle. It is only possible if a single input is provided, and it changes execution order: a module imported only dynamically is executed immediately when the dynamic import is inlined. | https://rollupjs.org/configuration-options/ | accessed 2026-10-09 (current Rollup documentation) | `VERIFIED` |
| F126 | The HTML Standard's 'fetch a single imported module script' algorithm creates a request with mode "cors" (only a top-level worker, sharedworker or serviceworker module fetch uses "same-origin"). Module scripts loaded by URL are therefore fetched in CORS mode, unlike classic scripts. | https://html.spec.whatwg.org/multipage/webappapis.html | 2026-10-09 | `VERIFIED` |
| F127 | The URL Standard's origin algorithm for the 'file' scheme says: 'Unfortunate as it is, this is left as an exercise to the reader. When in doubt, return a new opaque origin.' So a file: origin is implementation-defined and may be opaque. | https://url.spec.whatwg.org/ | Living Standard, Last Updated 7 October 2026 | `VERIFIED` |
| F128 | The HTML Standard's Worker constructor says any same-origin URL (including blob: URLs) can be used for the worker script, and data: URLs can also be used but create a worker with an opaque origin. For a data: worker, the worker global scope's cross-origin isolated capability is set to false. | https://html.spec.whatwg.org/multipage/workers.html | 2026-10-09 | `VERIFIED` |
| F129 | CSP Level 3 says inline script execution is blocked unless every policy allows inline script. A policy allows it either implicitly by not specifying script-src (or default-src), or explicitly by 'unsafe-inline', a nonce-source, or a hash-source that matches the inline block. The hash-source grammar is 'sha256-', 'sha384-' or 'sha512-' followed by the base64 digest. | https://www.w3.org/TR/CSP3/ | 2026-09-16 | `VERIFIED` |
| F130 | CSP Level 3 says developers SHOULD NOT include 'unsafe-inline' or data: as valid sources in script policies, because both enable XSS by allowing code directly in the document. | https://www.w3.org/TR/CSP3/ | 2026-09-16 | `VERIFIED` |
| F131 | CSP Level 3 allows a policy to be delivered by <meta http-equiv="Content-Security-Policy" content="...">. A meta policy does not support the Content-Security-Policy-Report-Only header or the report-uri, frame-ancestors and sandbox directives, and it is not applied to content that precedes the meta element, so authors are encouraged to place it as early as possible. | https://www.w3.org/TR/CSP3/ | 2026-09-16 | `VERIFIED` |
| F132 | unified is the core package for processing content with plugins; the remark (markdown), rehype (HTML) and retext ecosystems are built on it and can be connected together. | https://raw.githubusercontent.com/unifiedjs/unified/main/readme.md | 2026-10-03 (readme last commit on main; package.json 11.0.5, newest tag) | `VERIFIED` |
| F133 | remark-frontmatter is a unified/remark plugin that adds support for YAML, TOML and other frontmatter, and it follows how GitHub handles frontmatter. Its default option is 'yaml'. | https://raw.githubusercontent.com/remarkjs/remark-frontmatter/main/readme.md | 2023-10-02 (readme last commit on main; package.json 5.0.0, newest tag) | `VERIFIED` |
| F134 | remark-frontmatter does not parse the data inside the frontmatter. Its README says to create your own plugin to do that. The frontmatter appears in the mdast tree as a node such as {type:'toml', value:...}. | https://raw.githubusercontent.com/remarkjs/remark-frontmatter/main/readme.md | 2023-10-02 (readme last commit on main; package.json 5.0.0, newest tag) | `VERIFIED` |
| F135 | The remark-frontmatter README notes that its `anywhere` option (matter anywhere in the document) is 'a terrible idea' and makes markdown less portable. By default only matter at the start of the document is recognized. | https://raw.githubusercontent.com/remarkjs/remark-frontmatter/main/readme.md | 2023-10-02 (readme last commit on main; package.json 5.0.0, newest tag) | `VERIFIED` |
| F136 | remark-rehype turns markdown into HTML. Raw HTML in markdown is kept as mdast 'html' nodes and embedded in hast as 'raw' nodes, which most plugins ignore. rehype-stringify's allowDangerousHtml outputs it, which is discouraged unless you completely trust authors. rehype-raw parses it into standard hast nodes and is described as the only way to support untrusted content. | https://raw.githubusercontent.com/remarkjs/remark-rehype/main/readme.md | 2025-04-02 (readme last commit on main; package.json 11.1.2, newest tag) | `VERIFIED` |
| F137 | To support raw HTML inside markdown, remark-rehype must be configured with allowDangerousHtml: true and then rehype-raw used. The README says raw-HTML support is a separate plugin because it is heavy in performance and bundle size. | https://raw.githubusercontent.com/remarkjs/remark-rehype/main/readme.md | 2025-04-02 (readme last commit on main; package.json 11.1.2, newest tag) | `VERIFIED` |
| F138 | rehype-sanitize is a unified (rehype) plugin that sanitizes HTML. It drops anything not explicitly allowed by a schema, and its default schema (`defaultSchema`) follows GitHub-style sanitation. The README recommends sanitizing any time you do not completely trust authors or the plugins used. | https://raw.githubusercontent.com/rehypejs/rehype-sanitize/main/readme.md | 2023-09-28 | `VERIFIED` |
| F139 | In the rehype-sanitize README example, the default sanitize removes event-handler attributes such as onmouseover and onerror, script elements, iframes and javascript: hrefs. The `<a>` and `<img src>` elements are kept without the unsafe attributes. | https://raw.githubusercontent.com/rehypejs/rehype-sanitize/main/readme.md | 2023-09-28 | `VERIFIED` |
| F140 | rehype-sanitize prevents DOM clobbering by prefixing every id and name attribute with 'user-content-' (for example id="current" becomes id="user-content-current"). This breaks in-page links to headings unless a client script rewrites hashes to the prefixed ids, as GitHub does. The README supplies such a hashchange script. | https://raw.githubusercontent.com/rehypejs/rehype-sanitize/main/readme.md | 2023-09-28 | `VERIFIED` |
| F141 | rehype-sanitize is configured with a custom schema (`Options`). The README says this is advanced, requires knowledge of syntax trees, and refers to the hast-util-sanitize Schema docs. | https://raw.githubusercontent.com/rehypejs/rehype-sanitize/main/readme.md | 2023-09-28 | `VERIFIED` |
| F142 | rehype-slug adds `id`s to headings (h1-h6) that do not already have one, based on their text, using the github-slugger algorithm, which matches how GitHub works. Existing ids are preserved. Duplicate headings get numeric suffixes (e.g. 'elit' then 'elit-1'). Its only option is `prefix` (string, default ''). | https://raw.githubusercontent.com/rehypejs/rehype-slug/main/readme.md | 2023-08-31 (readme last commit on main; package.json 6.0.0, newest tag) | `VERIFIED` |
| F143 | The rehype-slug Security section warns that setting id attributes on headings can enable DOM clobbering, an XSS vector. It directs users to rehype-sanitize and its 'headings (DOM clobbering)' example. | https://raw.githubusercontent.com/rehypejs/rehype-slug/main/readme.md | 2023-08-31 (readme last commit on main; package.json 6.0.0, newest tag) | `VERIFIED` |
| F144 | remark-rehype notes that footnote ids generated from user content cause DOM clobbering, and that using a prefix solves it. This is the unified-ecosystem documentation of the clobbering risk. | https://raw.githubusercontent.com/remarkjs/remark-rehype/main/readme.md | 2025-04-02 (readme last commit on main; package.json 11.1.2, newest tag) | `VERIFIED` |
| F145 | markdown-it's README and documentation home page describe it as following the CommonMark spec plus syntax extensions, configurable via rules and plugins, and 'Safe by default'. The pages I fetched do not detail the option mechanics. | https://markdown-it.github.io/markdown-it/ | docs site build for markdown-it v15.0.2; retrieved 2026-10-09 | `VERIFIED` |
| F146 | gray-matter parses front matter from a string or file and returns an object with `data` (the parsed front matter), `content` (the input with the matter stripped), and `excerpt`, `empty` and `isEmpty`. The non-enumerable `orig`, `language` and `matter` properties support debugging. | https://raw.githubusercontent.com/jonschlinkert/gray-matter/master/README.md | 2023-07-12 | `VERIFIED` |
| F147 | gray-matter handles YAML (the default), JSON and JavaScript front matter out of the box. TOML and others can be added through `options.engines`. Delimiters are customizable via `options.delimiters` (default '---'). The README describes it as better than regex-based parsers at edge cases such as fenced code blocks containing front-matter examples. | https://raw.githubusercontent.com/jonschlinkert/gray-matter/master/README.md | 2023-07-12 | `VERIFIED` |
| F148 | gray-matter can auto-detect the front-matter language from text after the first delimiter (e.g. '---toml'). The README documents `matter.test(string)` to check whether front matter exists and `matter.stringify` to write it back. | https://raw.githubusercontent.com/jonschlinkert/gray-matter/master/README.md | 2023-07-12 | `VERIFIED` |
| F149 | The gray-matter README documents no sanitization behavior and no heading anchor or slug generation. It is a front-matter extractor only. | https://raw.githubusercontent.com/jonschlinkert/gray-matter/master/README.md | 2023-07-12 | `VERIFIED` |
| F150 | Ajv takes a JSON Schema (or JSON Type Definition) and compiles it into efficient JavaScript validation code. Compiled functions are cached, and the best performance comes from compiling once and reusing the function from `compile` or `getSchema`. | https://ajv.js.org/guide/getting-started.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F151 | Ajv overwrites the `errors` property on every validation call, so the errors array reference must be copied if it is needed later. | https://ajv.js.org/guide/getting-started.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F152 | Ajv supports JSON Schema draft-2020-12 via a different Ajv class import, but draft-2020-12 is not backwards compatible, and it cannot be combined with earlier JSON Schema versions in the same Ajv instance. The default export is draft-07. | https://ajv.js.org/json-schema.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F153 | Ajv's standalone mode generates validation functions as JS files at build time, using either ajv-cli (>= 4.0.0) or the JS library with `code.source: true`. Documented benefits are a smaller browser bundle, faster start-up, and avoiding dynamic code evaluation with the Function constructor when a page's Content Security Policy prohibits it. Output can be ES5 or ES6 and CJS or ESM. | https://ajv.js.org/standalone.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F154 | Ajv standalone functions still depend on Ajv's runtime folder code, unless the output is run through a bundler such as esbuild to produce fully isolated validation functions. Standalone mode supports only `code` and `macro` user-defined keywords, and if formats are used, `code.formats` must contain a code snippet that evaluates to the format definitions. | https://ajv.js.org/standalone.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F155 | Ajv strict mode prevents silently ignored mistakes in schemas. It does not change validation results versus the spec, but makes some schemas invalid. By default Ajv fails schema compilation on unknown keywords, on unknown formats, and on ignored keyword combinations such as 'then' without 'if' or 'additionalItems' without 'items'. The page recommends using JSON Schema with strict mode. | https://ajv.js.org/strict-mode.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F156 | Ajv's strict-mode page states the JSON Schema specification requires ignoring unknown keywords, and that this can leave keyword typos quietly ignored. Ajv deviates from that default to catch them. | https://ajv.js.org/strict-mode.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F157 | Ajv strict mode treats unknown formats as errors by default; standard formats come from the separate ajv-formats package, and format validation can be disabled with `validateFormats: false`. | https://ajv.js.org/strict-mode.html | undated page (Ajv v8 docs); retrieved 2026-10-09 | `VERIFIED` |
| F158 | The JSON Schema 2020-12 Validation specification's string-encoded-data (Content) vocabulary says implementations MUST NOT automatically decode, parse or validate string contents by default, for security and performance reasons. A malformed string-encoded document MUST NOT make the containing instance invalid. | https://json-schema.org/draft/2020-12/json-schema-validation#name-implementation-requirements | 2022-06-16 | `VERIFIED` |
| F159 | The Keyboard Lock spec says that by default keys such as Escape, Alt+Tab, Cmd+` and Ctrl+N are not available to the web app, because the browser or OS captures them. The Keyboard Lock API lets sites capture the keys the OS allows. | https://wicg.github.io/keyboard-lock/ | Draft Community Group Report, 6 October 2021 | `VERIFIED` |
| F160 | The Keyboard Lock spec defines Navigator.keyboard (SecureContext) and a Keyboard interface with lock(optional sequence<DOMString> keyCodes = []) returning Promise<undefined>, and unlock(). | https://wicg.github.io/keyboard-lock/ | Draft Community Group Report, 6 October 2021 | `VERIFIED` |
| F161 | The Keyboard Lock spec says keys are matched by the KeyboardEvent code attribute. Locking applies only when the fullscreen element is non-null and keyboard lock is enabled. If the reserved key codes list is empty or contains the code, the event goes directly to the fullscreen document or element, bypassing user-agent processing. | https://wicg.github.io/keyboard-lock/ | Draft Community Group Report, 6 October 2021 | `VERIFIED` |
| F162 | The Keyboard Lock spec's Escape handling: when Escape is locked, holding the key for 2 seconds exits fullscreen and pointer lock. The UA may overlay a message that Escape must be held. The security section requires UAs to give users a way to exit keyboard lock even if all keys are requested, including a long (more than 2 second) Escape press. | https://wicg.github.io/keyboard-lock/ | Draft Community Group Report, 6 October 2021 | `VERIFIED` |
| F163 | The Keyboard Lock spec recommends calling navigator.keyboard.lock() before document.documentElement.requestFullscreen(), and calling document.exitFullscreen() before navigator.keyboard.unlock() on the way out. It advises locking Escape only if needed, and keeping Escape's meaning as exiting the current state if it is locked. | https://wicg.github.io/keyboard-lock/ | Draft Community Group Report, 6 October 2021 | `VERIFIED` |
| F164 | The Keyboard Lock spec says F11 (user-initiated) fullscreen differs from JavaScript-initiated fullscreen. F11 fullscreen can only be exited by the same shortcut, exitFullscreen() does not work for it, and fullscreen events are not fired for it. Keyboard Lock is therefore valid only during JavaScript-initiated fullscreen, and no Keyboard Lock processing happens during F11 fullscreen. | https://wicg.github.io/keyboard-lock/ | 2021-10-06 | `VERIFIED` |
| F165 | The Keyboard Lock spec says the API is best-effort. Implementations need not override every OS default behaviour, and a platform's secure attention sequence (e.g. Ctrl-Alt-Del on Windows) cannot be overridden. Mobile devices will not typically support the API. | https://wicg.github.io/keyboard-lock/ | 2021-10-06 | `VERIFIED` |
| F166 | The old URL https://w3c.github.io/keyboard-lock/ now redirects to the WICG spec, so Keyboard Lock is published as a WICG (Web Incubator Community Group) draft. | https://w3c.github.io/keyboard-lock/ | redirect page undated, fetched 2026-10-09; target spec dated 6 October 2021 | `VERIFIED` |
| F167 | MDN browser-compat-data records Keyboard.lock and Keyboard.unlock as supported from Chrome 68. Edge, Opera, Chrome Android and Samsung Internet are set to 'mirror', i.e. inherit the upstream Chromium version. Firefox is version_added false and Safari is version_added false. The status flags are experimental true, standard_track true, deprecated false. | https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Keyboard.json | retrieved 2026-10-09 (main branch) | `VERIFIED` |
| F168 | MDN says Keyboard.lock() can only capture keys the underlying OS grants. It requires transient user activation. Each call replaces the previous locked set. With no argument all keys are locked. It takes KeyboardEvent code values, and AbortError, InvalidAccessError and InvalidStateError are possible exceptions. MDN marks the page experimental. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/keyboard/lock/index.md | 2026-08-22 (last modified, mdn/content commit history) | `VERIFIED` |
| F169 | MDN's Keyboard API overview says its intended use is web apps such as games or remote-access apps that provide a fullscreen immersive experience. It marks the API experimental. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/keyboard_api/index.md | 2026-08-22 (last modified, mdn/content commit history) | `VERIFIED` |
| F170 | MDN: KeyboardEvent.code is the physical key and is not altered by keyboard layout or modifier state. The same code 'KeyQ' is Q on QWERTY, ' on Dvorak and A on AZERTY. code cannot be used to determine the character generated, and key should be used for that. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/keyboardevent/code/index.md | 2025-10-13 (last modified, mdn/content commit history) | `VERIFIED` |
| F171 | MDN: KeyboardEvent.key returns the key value taking into account modifier state, locale and layout. Printable keys return the character (e.g. 'b', or 'B' with Shift, ' ' for Space). Control and special keys return predefined key values. Unidentifiable keys return 'Unidentified', and dead keys return 'Dead'. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/keyboardevent/key/index.md | 2026-09-02 (last modified, mdn/content commit history) | `VERIFIED` |
| F172 | MDN's Fullscreen API guide says pressing Esc or F11 exits all fullscreen elements, while exitFullscreen() exits only the topmost. Users should be told they can press Esc or F11 to exit. Navigating away, changing tabs, or switching apps (e.g. Alt-Tab) also exits fullscreen. Fullscreen requests must come from within an event handler or they are denied. | https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/fullscreen_api/guide/index.md | 2026-03-23 (last modified, mdn/content commit history) | `VERIFIED` |
| F173 | WCAG 2.2 SC 2.1.4 Character Key Shortcuts (Level A): if a shortcut uses only letter, punctuation, number or symbol characters, at least one of these must hold: a mechanism to turn it off; a mechanism to remap it to include a non-printable modifier key such as Ctrl or Alt; or the shortcut is active only when its UI component has focus. The Understanding document says it applies even when the character needs Shift or AltGr, and to sequences of character keys. | https://www.w3.org/WAI/WCAG22/Understanding/character-key-shortcuts.html | Updated 23 February 2026 (verified 2026-10-09) | `VERIFIED` |
| F174 | WCAG 2.2 SC 2.1.1 Keyboard (Level A): all functionality must be operable through a keyboard interface without requiring specific timings for individual keystrokes, except where the function depends on the path of movement. The Understanding document gives examples of specific timings as repeating keystrokes within a short time or holding a key down for an extended period. | https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html | Updated 11 May 2026 (verified 2026-10-09) | `VERIFIED` |

Verdicts: `VERIFIED` / `UNVERIFIED` / `CONTRADICTED` / `NO-SOURCE`.
Only `VERIFIED` claims may appear in the spec body. Everything else lives in §4.

### Verifier caveats

- **F7** — the Fullscreen Standard frames *honouring* `navigationUI` as optional ("optionally
  taking into account options["navigationUI"]"), though the resize itself is not optional; this
  spec therefore asserts no particular fullscreen viewport shape.
- **F11** — the MDN sentence that states the default allowlist literally names `screen-wake-lock`,
  not `fullscreen`, immediately after naming the fullscreen directive. The default allowlist for
  the `fullscreen` feature is taken from the Fullscreen Standard itself (F6), not from this row.
- **F16** — both code patterns come from non-normative example sections of the Window Management
  draft; they document an intended usage, not a user-agent requirement. §2.5 deliberately departs
  from the ordering shown there.
- **F18** — every new interface and member carries `[SecureContext]` **except** the dictionary
  member in `partial dictionary FullscreenOptions { ScreenDetailed screen; }`, which is a
  dictionary member rather than an interface member.
- **F23** — the upper version bounds are live values that move with every browser release; this
  row is version-dated, not permanent, and must be re-read before any claim of current support.
- **F26** — the cited Storage Standard page contains no mention of `BroadcastChannel`. The link
  between `BroadcastChannel` and the non-storage storage-key algorithm is established by F24, in
  the HTML Standard, not by this page.
- **F30** — the MDN page is JavaScript-rendered, so the text was read from the authoritative MDN
  source file in `mdn/content` rather than from the rendered page at the cited URL.
- **F32** — the compat figures carry no URL-scheme qualification: they establish support for the
  API in general and say nothing about documents loaded from `file:` URLs.
- **F34** — the specification's term is "traversable navigable", not "top-level traversable"; the
  difference was checked and found immaterial at this version of the standard.
- **F39** — the final clause ("two distinct opaque origins are therefore never same origin") is
  the mechanical entailment of the quoted algorithm, which the claim marks with "therefore", not
  a separate sentence of specification prose.
- **F40** — the specification also has an intervening `messageerror` branch when deserialization
  throws; the row describes the success path.
- **F44** — between the property list and "all other properties throw a SecurityError", MDN adds
  that `then`, `Symbol.toStringTag`, `Symbol.hasInstance` and `Symbol.isConcatSpreadable` are
  present with value `undefined` rather than throwing, so the final sentence reads slightly
  broader than the source.
- **F46** — the source's sentence about non-empty target names carries a trailing qualifier ("in
  terms of deciding whether to open a new browsing context") that the claim compresses away.
- **F50** — "implementation-defined" is the claim's own gloss, not specification language: the
  Fetch Standard declines to specify the behaviour ("left as an exercise for the reader"). This
  spec does not present that phrase as a quotation.
- **F58** — the Chromium source file names neither Chrome nor Edge; the Edge half was corroborated
  against Microsoft's separate WebView2 documentation for the same switch.
- **F60** — the Secure Contexts specification is internally in tension here: the prose carries the
  SHOULD and the MAY-exclude, while the algorithm's own step for scheme `file` is unconditional.
  Q1 exists because of that tension.
- **F61** — the sentence is in a section the specification labels non-normative; cite it as the
  specification's own summary of its normative text, not as a normative requirement.
- **F66** — "without a permission prompt" is not "without a policy gate": `isExtended` remains
  gated by the `window-management` policy-controlled feature (F20).
- **F67** — the MDN half of this row was verified on the rendered MDN Screen Wake Lock API page,
  a different URL from the W3C specification cited in the row.
- **F74** — the sentence about user agents time-limiting or disallowing wake locks sits in a
  non-normative passage of the Introduction.
- **F87, F88, F89** — "new in WCAG 2.2" is not asserted on the Understanding pages themselves; it
  was corroborated separately against the W3C WAI "What's New in WCAG 2.2" page.
- **F88** — "timelines" and "diagram nodes" are not named examples on the page; they fall within
  the criterion's own stated scope. The source also requires that the single-pointer alternative
  not rely on a path-based gesture such as swiping or flicking.
- **F91** — the normative success-criterion text carries a second exception the claim omits:
  "where the appearance of the component is determined by the user agent and not modified by the
  author".
- **F95** — the source conditions which element receives focus when Tab leaves the tablist: the
  tabpanel, *unless* the first element containing meaningful content inside it is focusable.
- **F100** — the verifier recorded a scope qualifier on this row. It must not be treated as the
  complete carousel role set; the APG Carousel page is to be re-read in full before the carousel
  is implemented.
- **F106** — the three options are presented as "solutions" in the Understanding document's Intent
  section; they are not a normative list of conformance options.
- **F107** — the technique page itself states that techniques are not required to meet WCAG.
- **F108** — the final sentence of the claim is not stated on the cited Pause, Stop, Hide page; it
  was verified separately against the Understanding page for SC 2.3.3.
- **F111** — the "what does work" items are a subset of the README's list, and the README caveats
  that only some items were tested in Chromium-based browsers. Nothing in that list establishes
  behaviour in Firefox or Safari.
- **F113** — the recommended configuration is applied only when the plugin's
  `useRecommendedBuildConfig` option is true, which is its default.
- **F115** — the README says missed assets "generate a warning" while the implementation logs at
  info level; the row is graded against the README.
- **F116, F117, F118** — verified against the Vite 8 documentation branch; they are version-scoped
  and must be re-read against the Vite version actually pinned.
- **F117** — the claim does not mention two documented sub-cases: `build.cssCodeSplit` defaults to
  false when `build.lib` is set, and the module-preload polyfill does not apply to library mode.
- **F118** — the documented `build.minify` default is `'oxc'` for the client build and `false` for
  the SSR build; only the client half is asserted here.
- **F121** — the verifier recorded a minor scope qualifier on this row; the Vite CSP guidance must
  be re-read against the pinned Vite version before the portable build's policy is finalised.
- **F126** — the request is created one algorithm deeper than the claim's wording implies: "fetch
  a single imported module script" delegates to "fetch a single module script", which is where
  the `"cors"` mode is set.
- **F129** — a policy only blocks when its disposition is `enforce`; report-only policies report
  without blocking.
- **F146** — the README also lists `file.stringify` as non-enumerable; the row's list of
  non-enumerable properties is not exhaustive.
- **F147** — the README's own introduction is looser than its body, claiming TOML and CoffeeScript
  support; the body and the implementation agree on YAML, JSON and JavaScript, which is what this
  row and this spec rely on.
- **F149** — the README also documents `.stringify` and `.read`, so "front-matter extractor only"
  slightly understates the documented API; the material point — no sanitization, no anchor or slug
  generation — holds.
- **F153** — the page adds a caveat the row omits: with a large number of schemas the standalone
  bundle can become bigger.
- **F154** — the page says `code.formats` SHOULD contain the snippet, where the row says must.
- **F159, F164, F165** — Keyboard Lock is an incubation-stage WICG Draft Community Group Report,
  not a W3C standards-track specification, and is cited as such throughout.
- **F161** — this row does not itself carry the constraint that the API is valid only during
  JavaScript-initiated fullscreen; that comes from F164.
- **F166** — the redirect is a client-side JavaScript redirect served with HTTP 200, not an HTTP
  3xx redirect, and the group's official name is the Web Platform Incubator Community Group.

---

## 4. Open questions

Anything `UNVERIFIED`, `CONTRADICTED`, or `NO-SOURCE`, carried visibly rather than resolved
by assertion. "No published guidance exists" is a finding and belongs here as one.

`Q` rows are questions no source read for this spec answers. `C` rows are claims that were
checked against their cited source and **contradicted** by it; they are recorded so that the
contradiction, and not the claim, is what reaches the build.

| # | Question | Why it is still open | Blocks |
|---|---|---|---|
| Q1 | Is a document loaded from a `file:` URL a secure context in current Chrome, Edge, Firefox and Safari? | The Secure Contexts specification says the user agent SHOULD treat `file` URLs as potentially trustworthy but that user agents prioritizing security MAY exclude `file` [F60], while its own algorithm step for scheme `file` is unconditional [F59, and the F60 caveat]; MDN's guide lists a `file` URL as secure [F64]. No source read for this spec records what each of the four browsers actually does. | AC11; it is the parent of Q3, Q6 |
| Q2 | Does `Element.requestFullscreen()` succeed from a `file:` URL in those browsers? | Fullscreen is supported when there is no previously-established user preference, security risk or platform limitation, and the standard does not mention URL schemes or `file:` URLs in the sections read [F5]. **No published source read for this spec addresses browser behaviour for `file:` URLs.** | AC11; AC7 is measured on `http://localhost`, so nothing is blocked from building |
| Q3 | Which monitor does a browser use for fullscreen when the `screen` option is not supplied and more than one monitor exists? | The Fullscreen Standard does not say which monitor is used when several exist [F7], and MDN's `requestFullscreen()` page does not say which monitor is used by default [F12]. **No published guidance was found on this point.** It is a finding, not a gap to be filled by inference. | Nothing — §2.6 makes monitor placement manual by design |
| Q4 | Can two documents loaded from `file:` URLs exchange `BroadcastChannel` or `postMessage` messages in those browsers? | Both mechanisms are origin-gated [F24, F26, F40, F41]; the URL Standard leaves the origin of a `file:` URL unspecified [F49, F28]; MDN reports browsers usually treat `file:///` as opaque origins [F52, F38]; and two distinct opaque origins are never same origin [F39]. Chromium documents that `file://` URIs cannot read other `file://` URIs by default [F58] and Firefox 68 made same-directory files different origins [F57] — but none of those sources states the outcome for these two APIs. | AC11; it is why AC10 (visible degradation) exists at all |
| Q5 | Does the `storage` event propagate between two documents loaded from `file:` URLs? | MDN says the requirements for `localStorage` behaviour from `file:` URLs are undefined and may vary among browsers, that each `file:` URL seems to have its own storage area, and that this must not be relied on [F36, F53]; `SecurityError` is listed for `file:` and for opaque origins [F37, F54, F35]. No source read establishes the event's behaviour there. | AC11 |
| Q6 | Are the Screen Wake Lock and Keyboard Lock APIs available from a `file:` URL? | Both are secure-context gated [F72, F67, F160]. The answer depends on Q1 and is not separately established by any source read for this spec. | AC11; neither API is a precondition for any other criterion |
| Q7 | Can a service worker be registered from a `file:` URL? | Only secure contexts may register service workers [F61, in a section the specification labels non-normative]; MDN describes the secure context as the document being served over HTTPS, with `http://localhost` also treated as secure, and does not mention `file:` [F68]. Not established. | Nothing — offline support for the local-file case is the portable single-file artifact [F110] |
| Q8 | Does an inline `type="module"` script execute in a document loaded from a `file:` URL in each of the four browsers? | MDN warns that loading an HTML file locally with a `file://` URL produces CORS errors because of JavaScript module security requirements and that a local web server is needed [F55]; the portable build's plugin preserves `type="module"` on the scripts it inlines [F114] and its README states the output is for offline apps opened directly with no server [F110], with the caveat that only some behaviours were tested in Chromium-based browsers [F111 caveat]. No source read settles the per-browser outcome for an inline module script. | AC11; it is the single highest-value cell in the capability matrix |
| Q9 | What is the complete set of WCAG 2.2 Level A and Level AA success criteria? | No source enumerating the full set was read for this spec. The thirteen criteria listed in §2.11 are those whose text this spec relies on, not a claim of completeness. | AC16 — its checklist must be built from the published WCAG 2.2 Recommendation at the time of execution, not from §3 |
| Q10 | Which of those criteria can an automated checker decide? | No source read for this spec establishes the WCAG coverage of any automated tool. | AC16 — which is why every row carries an explicit `automated` / `manual` method |
| Q11 | How does the `window-management` permission behave for a document with an opaque or `file:` origin — prompt, auto-deny, or policy rejection? | The specification describes the prompt and the `NotAllowedError` for a disallowed policy-controlled feature [F17, F21] and MDN describes the policy behaviour [F20], but none of those sources addresses opaque or `file:` origins. | AC11 |
| C1 | `CONTRADICTED` — "requestFullscreen's `screen` option rejects with `NotAllowedError` when the relevant global object lacks transient activation, waiving it within the transient activation duration after a `[[targetScreenFullscreen]]` time." | The Window Management draft assigns both behaviours to different methods. Its `Element.requestFullscreen()` changes are two steps and reject nothing: take `options["screen"]` into account when moving and resizing the viewport, and set `[[targetScreenFullscreen]]`. The `NotAllowedError`-for-missing-transient-activation step belongs to "Request a window display state change" (serving `minimize()`, `maximize()`, `restore()`) and to `setResizable()`. | §2.5 must not assume the `screen` option carries its own activation rejection; it relies on [F1] instead |
| C2 | `CONTRADICTED` — "Only `http`, `https`, `ftp`, `ws` and `wss` return a tuple origin; other schemes return a new opaque origin." | The URL Standard's origin switch has a `blob` branch **before** the scheme list that can return a tuple origin, illustrated by the standard's own worked example. The exclusivity assertion is wrong. F49, which states the same scheme list without "only", is the row this spec uses. | §2.7 must not treat `blob:` as opaque by default |
| C3 | `CONTRADICTED` — "If `noopener` is false, the new context's opener browsing context is set to the source's browsing context." | That step sits in the branch of the window open steps taken only when an **existing** navigable was targeted, not when a new context is created, so the claim's scope is wrong. | §2.7 verifies the opener/handle reference at runtime rather than assuming it; [F43], [F45] and [F46] carry the requirement |
| C4 | `CONTRADICTED` — "The CVE-2019-11730 entry in Mozilla advisory MFSA 2019-21 could not be seen in the fetched page." | The entry is present and readable at the cited URL. The claim described a retrieval artifact, not the source. | Nothing — no statement in this spec depends on it; the Firefox 68 behaviour is carried by [F57] |
| C5 | `CONTRADICTED` — "Clipboard writing needs a secure context plus transient activation." | The wording was taken from MDN's Firefox-web-extension bullet and presented as the API-wide rule; MDN's general text is materially different. | Nothing — this spec specifies no clipboard feature. Any later copy-to-clipboard affordance needs its own verification |
| C6 | `CONTRADICTED` — "MDN marks the Presentation API secure-context only via both a secure-context header and a compat-table notice." | The `securecontext_header` is present; there is no compat-table notice, because no `secure_context_required` flag exists for those features in browser-compat-data. | Nothing — §2.6 rejects the Presentation API on [F78]–[F82], not on this |
| C7 | `CONTRADICTED` — "The W3C Service Workers specification marks its interfaces with `[SecureContext]`." | Not at that blanket scope: seven interfaces the specification defines carry `[Exposed=ServiceWorker]` only. The secure-context property is stated normatively in prose instead. | §2.8 relies on [F61] and [F68], not on a blanket IDL claim |
| C8 | `CONTRADICTED` — "A preload animation can be essential under SC 2.2.2 if interaction cannot occur during that phase for all users." | The source makes the exemption conditional on **two** conjoined conditions, the second being that not indicating progress could confuse users or make them think the content was frozen; the claim dropped it. | §2.11 claims no preload exemption: any loading animation must satisfy both conditions or be pausable [F108] |
| C9 | `CONTRADICTED` — "esbuild's `base64` loader exports a `Uint8Array` decoded at run time; `binary` is the optimized alternative." | Reversed: `base64` embeds the file Base64-encoded and exports it **as a string**; `binary` is the loader whose output is decoded at run time and exported as a `Uint8Array`. | §2.9 uses Vite's documented inlining mechanisms [F116, F119], not esbuild loader assumptions |
| C10 | Discrepancy inside an otherwise `VERIFIED` row — F144's final sentence, "This is the unified-ecosystem documentation of the clobbering risk", is the claimant's characterization and is not asserted by the cited source, which itself defers to `rehype-sanitize` for the fuller treatment. | The row stays in §3 because §3 reproduces the graded record in full, but **this spec cites F144 nowhere in its body.** The DOM-clobbering requirement in §2.2 rests on [F143] and [F140] instead, both of which state it directly. | Nothing |

---

## 5. Execution

The application is built by the `dev-qa-judge` loop. The developer's claims are not inputs to
verification or review: QA and the judge each re-derive what the change must do from this spec
and from the diff, and never see the developer's account of what was built.

| Stage | Agent | Contract — what it is given, what it must return |
|---|---|---|
| 1 | `slidesmith` | Given the interaction inventory (§2.4), the presentation-mode requirements (§2.5) and the conformance target (§2.11). Returns the visual design of the presentation surface and the speaker-script surface, including focus indication meeting [F86] and [F91] and target sizes meeting [F89]. |
| 2 | `Vasher` | Given this spec and the design from stage 1. Returns the implementation and the build pipeline, against the acceptance criteria in §2 and nothing beyond them. |
| 3 | `Wayne` | Given this spec and the diff, **not** the developer's claims. Independently re-derives the acceptance criteria, writes the missing tests, runs the full gate itself, and returns findings with reproductions and a machine-readable verdict. |
| 4 | `slide-review` gate | Given the built presentation surface. Returns a layout and composition report, which is an input to stage 6. |
| 5 | `deck-standards` gate | Given the built presentation surface and its speaker scripts. Returns a standards report, which is an input to stage 6. |
| 6 | `Vin` | Given the speaker-script content surfaced by the application. Returns the voice pass on those scripts. |
| 7 | `judge` | Given this spec, the diff, and the stage 4 and 5 gate reports — **not** the developer's summary. Re-derives the acceptance criteria, actively tries to break the result, and returns a verdict with reproductions. |

**Loop:** `dev-qa-judge`  **maxRounds:** `to be assigned by John`  **Escalates to:** John

---

## 6. Model assignment

Assignment is by **stage property**, not stage prestige.

| Stage | Model | Rationale |
|---|---|---|
| 1 — `slidesmith` | To be assigned by John | Generative visual work, cheap to iterate, immediately checkable against AC15 and AC17 |
| 2 — `Vasher` | To be assigned by John | Long implementation context across build, runtime and tests; wrongness is expensive but visible to stages 3 and 7 |
| 3 — `Wayne` | To be assigned by John | Must re-derive criteria independently and execute the gate; wrongness here is expensive **and invisible** |
| 4 — `slide-review` | To be assigned by John | Narrow mechanical gate over a rendered artifact |
| 5 — `deck-standards` | To be assigned by John | Narrow mechanical gate over a rendered artifact plus its scripts |
| 6 — `Vin` | To be assigned by John | Voice and register judgment over prose |
| 7 — `judge` | To be assigned by John | Adversarial judgment, load-bearing, must hold large context, wrongness is expensive **and invisible** |

> Workflow-owned subagents are **not** subject to the `task`-tool sub-agent model gate —
> see `_decisions.md` D-2026-10-08-01. Per-stage model assignment inside a loop is free.

---

## 7. Child issues

The issues this spec generates. Created under the milestone **after** the spec is `reviewed`.
Scope comes from this list and nowhere else; anything added mid-flight needs a spec amendment.

| # | Title | Labels | Depends on |
|---|---|---|---|
| 1 | Content schema and Ajv validation harness — `workshop/spa/schema/`, the closed `frontmatter.schema.json`, `workshop/spa/content/`, `workshop/spa/docs/content-authoring.md` with both its curriculum↔document and document↔schema key-equality tests, `npm run spa:validate` over the content directory **and** the three curriculum globs, invalid fixtures (AC1, AC2, AC24, AC25) | `spa`, `content`, `test` | — |
| 2 | Markdown pipeline: unified + remark-frontmatter + remark-rehype + rehype-slug + rehype-sanitize, with the `user-content-` hash rewrite (AC3) | `spa`, `content` | 1 |
| 3 | Application shell: hash routing, segment state, status region, `npm run spa:build` (AC4) | `spa`, `build` | 1, 2 |
| 4 | Interaction inventory part 1 — `tabs`, `accordion`, `dialog`, `staged-reveal`, `disclosure-popover` with their APG roles and key maps (AC6, AC13) | `spa`, `a11y` | 3 |
| 5 | Interaction inventory part 2 — `parameter-chart`, `node-diagram`, `carousel`, `segment-timer`, each with a long description (AC6, AC19) | `spa`, `a11y` | 3 |
| 6 | Presentation mode — gesture-bound fullscreen, failure handling, `fullscreenchange` reconciliation, optional wake lock (AC7, AC8) | `spa` | 3 |
| 7 | Speaker-script surface and the three transports with handshake, timeout and visible degradation (AC9, AC10) | `spa` | 3, 6 |
| 8 | Capability probe and `workshop/spa/docs/capability-matrix.md` — all 132 (mechanism × browser × target) rows across `file:`, `localhost` and hosted in Chrome, Edge, Firefox and Safari, each with a separate `Verdict` and `Evidence` cell, including the `—`/`Q`-id evidence form that `not measured` rows require (AC11) | `spa`, `docs`, `test` | 7 |
| 9 | Keyboard model: full operability, no traps, single-key shortcut toggle and modifier equivalents (AC12, AC13, AC14) | `spa`, `a11y` | 4, 5, 6 |
| 10 | Accessibility gate: select and declare the automated checker and its rule selection in `workshop/spa/docs/a11y-tool.md`, bind the gate to that declaration, target-size audit and exceptions doc, reduced-motion assertions, per-criterion conformance record (AC15, AC16, AC17, AC18) | `a11y`, `test`, `docs` | 4, 5, 9 |
| 11 | Portable single-file build with build-time CSP hashes (AC5, AC20) | `spa`, `build` | 3, 7 |
| 12 | Freeze `workshop/site/hackathon.html`: record its SHA-256 and add the guard test, which stays armed until a rehearsal record with verdict `PASS` exists and is **not** released by a `FAIL` record (AC21) | `test` | — |
| 13 | Live rehearsal of the Teaching SPA and its rehearsal record (AC22) | `docs` | 6, 7, 8, 10, 11, 12 |
| 14 | Retire `workshop/site/hackathon.html` — delete it, update every reference to it under `workshop/`, `scripts/` and `docs/`, and flip the guard test (AC23) | `spa`, `docs` | 13 |

---

## Changelog

| Date | Change |
|---|---|
| 2026-10-09 | Created |
| 2026-10-09 | Review round 2: AC15 no longer asserts an unsourced external tool or its tag vocabulary and now binds the gate to a declared `workshop/spa/docs/a11y-tool.md` (§2.11); AC11 separates `Verdict` from `Evidence` and gains the browser dimension the objective requires, with §2.8 restated to match; AC21's freeze is released only by a `PASS` rehearsal record, never by a `FAIL` one; `dialog` added to child issue 4; `workshop/spa/docs/content-authoring.md` given a slot in §2.1 and an observable criterion, AC24. |
| 2026-10-09 | Review round 3, three structural defects closed. (1) AC11's `Evidence` rule was unsatisfiable for exactly the rows whose verdict is `not measured` — the two permitted forms were the two things that verdict asserts are absent — so the rule is now conditional on the verdict and `not measured` rows carry `—` or a §4 `Q` id; §2.8 restates the rule and records that `not measured` is a permanent verdict, not only a campaign artifact. (2) AC23's second clause forbade any tracked file from referencing `workshop/site/hackathon.html`, which this spec itself must do to state AC21–AC23 at all; it is now scoped to the `workshop/`, `scripts/` and `docs/` surface, excluding the retirement's own records, with the reasoning in §1. (3) The schema↔content loop was open: nothing compared the schema to anything, and §2.2's second MUST was observed by no criterion. AC1 now runs `spa:validate` over the three curriculum globs, new AC25 binds `frontmatter.schema.json`'s closed key set to `content-authoring.md`, and §2.2 states the three-link chain instead of claiming one test does the work of three. |
