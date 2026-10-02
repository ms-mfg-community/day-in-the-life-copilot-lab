# enterprise-sdlc-workbench

A project-scoped GitHub Copilot App canvas extension for Lab 26. It gives a
learner three linked canvases for driving (a fictional, forward-looking)
enterprise agentic SDLC from inside the Copilot App, grounded in **this
repo's real GitHub issues/PRs** and the **ContosoUniversity .NET solution**.

## Canvases

| Canvas | Purpose |
| --- | --- |
| `sdlc-board` | The EPIC-001 issue graph: dependency readiness, linked PRs/checks, filter-by-label, dry-run dispatch. |
| `code-map` | Live parse of `dotnet/ContosoUniversity.sln` into the project list, so the board's issue graph can be grounded against real code. |
| `release-composer` | Drafts a handoff/release-notes markdown from completed issues and merged PRs; opt-in save under `docs/releases/`. |

## Trust boundary

- **Fixture mode is the default** and requires no `gh` auth or network
  access: `sdlc-board` reads `fixtures/epic-001-board.json`, a frozen
  snapshot of this repo's real EPIC-001 issue graph (captured 2026-10-01).
  A visible **Fixture**/**Live** badge is always shown.
- **Live mode** never hardcodes the EPIC-001 issue numbers -- it queries
  the selected epic, parses its child/dependency list, loads each child
  issue's linked PR/check data, and loads recent workflow runs via `gh`.
- Every mutating action (`dispatch`, `save_draft`, `publish`) requires a
  **per-instance capability token** that is only ever exposed inside the
  canvas's own rendered HTML, never guessable from the agent side alone.
- All untrusted display data (issue/PR titles, labels) is HTML-escaped
  before being interpolated into the rendered canvas (`lib/render.mjs`).
  `fixtures/adversarial-board.json` exists specifically to prove this.
- `lib/exec.mjs` always shells out via `execFile` with an argv array --
  never a shell string -- and every probe/call is bounded by a timeout and
  an output cap.
- "Save" and "publish" in the release composer are two distinct,
  separately-confirmed actions; saving never silently overwrites an
  existing file (exclusive atomic creation is used), and both require the
  capability token.
- Canvas actions that change visible state increment a revision and return
  `refreshUrl`; the rendered page polls that revision and reloads itself,
  so filters, prerequisite checks, and composed drafts become visible in
  the already-open panel.
- Dispatch audit comments include the correlation key, selected agent
  preset, preset/bundle version, execution location, and timestamp.

## Known simplifications (`ghcp-was-here`)

- `lib/correlation.mjs`'s `feature/stage/task/run` key is **this lab's own
  v1 convention**, not the EPIC-001 "Provenance section" referenced by
  issue #59 -- that section doesn't exist yet (Labs 21-25 are
  unimplemented as of this lab). Reconcile against it once it ships.
- `lib/dispatch.mjs`'s idempotency marker is a best-effort guard, not a
  lock: two concurrent dispatches for the same correlation key can both
  post a duplicate comment. See the comment above `buildMarker()` for the
  upgrade path.

## Layout

```
extension.mjs             # SDK wiring only (imports lib/canvasDefs.mjs)
lib/canvasDefs.mjs         # SDK-free factory: builds the 3 canvas descriptors
lib/canvases/*.mjs          # per-canvas open/actions/onClose
lib/exec.mjs                # safe execFile wrapper (timeout + output cap)
lib/correlation.mjs         # correlation key format/parse/validate
lib/board.mjs                # fixture + live board data, readiness, filter
lib/codeMap.mjs               # .sln parser
lib/prerequisites.mjs          # bounded tool/auth checks
lib/dispatch.mjs                # dry-run-by-default audit comment
lib/releaseComposer.mjs          # draft/save/publish (docs/releases/)
lib/render.mjs                    # HTML renderers + escaping + badges
fixtures/                          # frozen snapshots incl. adversarial cases
```

See `labs/lab26.md` for the full walkthrough.
