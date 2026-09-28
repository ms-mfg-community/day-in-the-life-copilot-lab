# EPIC-001 / Issue #52 — Custom SDLC stages, gates and the rework loop (Lab 23)

**Implementation plan (spec only — no implementation in this document).**

| Field | Value |
|---|---|
| Parent epic | [EPIC-001 — Enterprise Agentic SDLC Harness](EPIC-001-enterprise-agentic-sdlc-harness.md) (issue #47) |
| Child issue | #52 — *Lab 23 — custom SDLC stages, gates and the rework loop (EPIC-001 U3)* |
| Decomposition item | 5 of 9 — depends on item 4 (#51, **complete locally, unpushed**). The only unblocked issue on the critical path `#52 → #53 → #59` |
| Spec authored | 2026-09-28 |
| Branch | `feature/epic-enterprise-harness` (base is **not** `main` — see #48 spec §7.3) |
| Open decisions | **None.** Three resolved by John 2026-09-28 — see §7.5, §7.6, §7.7 |
| Status | **Approved 2026-09-28.** Story 52.1 in progress |
| Stories | [EPIC-001-52-stories.md](EPIC-001-52-stories.md) — the dev and QA breakdown of this plan |

This document is written so that a cold-start session can execute it file-by-file without
re-deriving anything. Every YAML and frontmatter block below is literal and pasteable.

> **Scope of #52.** Author `labs/lab23.md` and ship the two artifacts it teaches: the
> **`contoso-review` extension** (which Lab 22's committed `bundle.yml` already pins) and a
> **workflow overlay** over the base `speckit` workflow. #52 does **not** build the
> `contoso-sdlc` *workflow* (that is #53/Lab 24 — §7.3), does **not** touch Labs 21, 22 or
> 24–26, and does **not** fix the `labs/lab18.md` command-flow collision (§6, departure D5,
> carried from #51).

---

## 1. Version re-verification — performed 2026-09-28

The epic's Appendix A.3 imposes a standing obligation to re-verify pinned versions **at
implementation time**. #51 pinned `spec_kit_version: "1.0.12"` with
`spec_kit_version_last_verified: "2026-09-25"`. That re-verification was repeated on
**2026-09-28**, the day this spec was written, against the primary source.

**Record 5 — 2026-09-28, #52 spec authoring (current).**

| Claim | 2026-09-25 value | **Verified 2026-09-28** | Result | Primary source |
|---|---|---|---|---|
| Spec Kit latest release | `v1.0.12` | **`v1.0.12`** | ✅ **HOLDS** | `gh api "repos/github/spec-kit/releases?per_page=10"` → newest tag `v1.0.12`, published `2026-09-25T17:48:57Z`, `prerelease=false`. Nothing newer |

**The pin has not moved.** This is the first re-verification in the arc that came back
unchanged — three days with no release, against a project that shipped thirteen in the
previous thirty-five. **That is not evidence the cadence has slowed**; it is one quiet
weekend. §8 step 1 still requires re-checking at implementation.

> ⚠️ **The registry's `spec_kit_version` does not change in #52.** Only
> `spec_kit_version_last_verified` moves, `2026-09-25` → `2026-09-28`, recording that the
> check actually happened. A `last_verified` date that claims a check nobody ran is worse
> than a stale one, because it suppresses the next session's suspicion.

### 1.1 What changed since `v1.0.12`

**Nothing.** `v1.0.12` is still the newest release, so the `v1.0.11`/`v1.0.12` delta
recorded in [#51's spec §1.1](EPIC-001-51-lab22-spec.md) is still the complete delta since
#48's `1.0.10` pin. No new release notes to read.

**Carried forward, for #53 not #52.** The `v1.0.12` notes repeat the standing deprecation:
*"The core /speckit.taskstoissues command is planned to move out of Spec Kit core in a
future release."* Lab 24 (#53) uses `taskstoissues`. **Re-check before writing #53** —
unchanged advice from #48 and #51. Note that `taskstoissues` is still present in
`_FALLBACK_CORE_COMMAND_NAMES` and still has `before_`/`after_` hook events at this tag
(§1.2, criterion 6), so the move has not happened yet.

### 1.2 Constraint re-verification — U3's eight acceptance criteria, against source

Every claim below was verified by reading the Spec Kit source **at tag `v1.0.12`**, not
from training data, not from a web search, and not from this repo's earlier specs. Paths
are relative to the repo root of a `git clone --branch v1.0.12`.

**Criterion 1 — `extension.yml` declares two commands, each with its own template and
script.** ✅ **Supported, with one hard naming constraint U3's wording does not survive.**

- `provides` accepts `commands`, `templates`, `scripts` and `config`
  (`src/specify_cli/extensions/__init__.py:381-392`). An extension must provide at least
  one of commands / hooks / events / templates / scripts (`ibid.:405`).
- Command entry: `name` and `file` **required**; `description` and `aliases` optional
  (`ibid.:450-470`).
- `EXTENSION_COMMAND_NAME_PATTERN = ^speckit\.([a-z0-9-]+)\.([a-z0-9-]+)$`
  (`ibid.:66`). Hyphens are legal in **both** segments, so `qa-review` is a valid command
  segment.
- ⚠️ **The middle segment must equal `extension.id` exactly.** Enforced at install time:
  ```python
  namespace = match.group(1)
  if namespace != manifest.id:
      raise ValidationError(f"{kind.capitalize()} '{name}' must use extension namespace '{manifest.id}'")
  ```
  (`ibid.:1141-1145`). Corroborated by every shipped extension — `git` → `speckit.git.*`,
  `bug` → `speckit.bug.*`, `agent-context` → `speckit.agent-context.update` — and by
  `_try_correct_command_name`'s docstring, which corrects only when the prefix matches
  `ext_id` *"to ensure the result passes the install-time namespace check"* (`ibid.:655`).
  **An extension id may not be a core command name** (`ibid.:1099`).
  **Consequence: see §6/D1.** U3 says `speckit.<org>.epic`; the id is fixed to
  `contoso-review` by Lab 22's committed bundle, so the commands are
  `speckit.contoso-review.epic` and `speckit.contoso-review.qa-review`.
- `provides.templates[]` / `provides.scripts[]` entry: `name` **required**, matching
  `^[a-z0-9-]+$` (`ibid.:71`) — **not namespaced, no dots**; `file` **required**;
  `description` optional; `runtimes` (scripts only) ⊆ `{bash, powershell, python}`
  (`ibid.:73, 632-641`).
- ⚠️ **`strategy` is rejected** on extension templates and scripts — *"'strategy' is not
  authorable for extension-provided artifacts, which always use 'replace' semantics"*
  (`ibid.:628-631`). `wrap`/`prepend`/`append` are **preset-only**
  (`extensions/EXTENSION-API-REFERENCE.md:140-141`). This is a direct contrast with Lab
  22's preset, which demonstrates all three composable strategies — and the most likely
  mistake for a learner coming straight from Lab 22.
- ⚠️ **`runtimes` is informational only** — *"Purely informational metadata — it is not
  used to select or invoke the script"* (`EXTENSION-API-REFERENCE.md:147-148`). One entry
  names one `file`. Core ships runtime variants by directory convention
  (`scripts/bash/`, `scripts/powershell/`, `scripts/python/`) and the command markdown
  picks; `provides.scripts` is a *declaration*, not a dispatcher. Note that the `git`
  extension ships scripts in all three directories and declares **no** `provides.scripts`
  at all.
- `REQUIRED_FIELDS = ["schema_version", "extension", "requires", "provides"]`
  (`ibid.:229`).

**Criterion 2 — a workflow overlay using `extends:`, `insert_after` and `type: gate` with
`on_reject`.** ✅ **Supported.** Verified in
`src/specify_cli/workflows/overlay/schema.py` and `.../step/gate/__init__.py`.

Overlay manifest keys: `id`, `extends`, `edits` (non-empty list), `priority` (default
`10`), `enabled` (default `true`).

- ⚠️ **`id` and `extends` must match `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`** (`schema.py:11`)
  — lowercase letters, digits and hyphens only. **A dot is rejected.** So an overlay may
  not be called `contoso.sdlc`.
- Reserved: overlay `id` may not be `overlays`; `extends` may not be `overlays`, `runs` or
  `steps` (`schema.py:13-14`).
- `VALID_OPERATIONS = {insert_after, insert_before, replace, remove}` (`schema.py:16`).
- ⚠️ **Two authoring forms, and mixing them is an error.** Shorthand
  `- insert_after: <anchor>` with a sibling `step:` mapping, **or** explicit
  `operation: insert_after` + `anchor: <anchor>`. Using both in one edit fails with
  *"mixes shorthand operation key … with explicit 'operation' field"* (`schema.py:81-85`).
  Two shorthand keys in one edit also fail.
- A step `id` inside an edit **must not contain `:`** — reserved for engine-generated
  nested ids (`schema.py:116-120`).
- `remove` **must not** carry a `step` (`schema.py:108-111`); every other operation
  **must** (`schema.py:113`).

**The base `speckit` workflow at this tag** (`workflows/speckit/workflow.yml`,
`workflow.version: "1.0.1"`) — these are the only legal `insert_after` anchors:

| Step id | Type |
|---|---|
| `specify` | command `speckit.specify` |
| `review-spec` | **gate** |
| `plan` | command `speckit.plan` |
| `review-plan` | **gate** |
| `tasks` | command `speckit.tasks` |
| `implement` | command `speckit.implement` |

> ⚠️ **There is no gate after `implement`.** The base workflow ends on the implement step.
> A QA-review stage after implementation is therefore a genuine addition, not a
> replacement — which is exactly what US-3.1 asks for.

**The gate step — the single most important verification in this spec.**
`on_reject` accepts **exactly three values: `abort`, `skip`, `retry`**. Both `validate()`
and `execute()` reject anything else, loudly:

```python
if on_reject not in ("abort", "skip", "retry"):
    return StepResult(status=StepStatus.FAILED, error=... )
```
(`step/gate/__init__.py`, `execute` and `validate`).

| Value | Behaviour (verified in `execute`) |
|---|---|
| `abort` (default) | `StepResult(FAILED)`, `output.aborted = True`, run stops with *"Gate rejected by user at step 'x'"* |
| `retry` | `StepResult(PAUSED)` — *"Pause so the next resume re-executes this gate"*. **Re-runs the gate, not the upstream stage** |
| `skip` | `StepResult(COMPLETED)` — *"downstream steps decide"* |

- ⚠️ **There is no backward jump.** No `goto`, no `on_reject: <step-id>`, no
  re-entry into an earlier stage. **§1.3 explains what the rework loop therefore is.**
- `message` is **required** (`validate`). `options` defaults to `[approve, reject]` and
  must be a non-empty list of strings.
- ⚠️ **Validation trap:** when `on_reject` is `abort` or `retry`, `options` **must**
  contain a `reject` or `abort` choice, case-insensitively — otherwise
  *"on_reject=… but options has no 'reject' or 'abort' choice"*.
- ⚠️ **Runtime trap, worse than the validation one:** rejection is detected by
  `choice.lower() in ("reject", "abort")` **only**. An option named `rework`,
  `changes-requested` or `needs-work` falls through to `COMPLETED` and **is treated as
  approval**. A gate authored as `options: [approve, rework]` with `on_reject: abort`
  fails validation; one authored as `options: [approve, reject, rework]` validates, and
  then silently approves whenever the reviewer picks `rework`.
- `show_file` renders a file's contents into the prompt (max
  `MAX_SHOW_FILE_LINES = 200`, control characters stripped) so the reviewer can read the
  artifact at the gate.
- `verdict_input` names a workflow input used as the choice on non-interactive resume; it
  is **not supported inside fan-out templates**.
- ⚠️ **Non-interactive runs PAUSE, they do not fail:** `if not sys.stdin.isatty(): return
  StepResult(status=StepStatus.PAUSED, ...)`. So a gate in CI parks the run for
  `specify workflow resume`.
- On `EOF`/`Ctrl-C` the prompt returns `options[-1]` — *"default to last (usually
  reject)"*. **Option order is therefore load-bearing.**

**Criterion 3 — the overlay lives under `.specify/workflows/overlays/<id>/`.**
⚠️ **True, but `<id>` is the _extended_ workflow's id, not the overlay's own.**

- Read path: `ProjectOverlaySource.collect(workflow_id)` scans
  `project_root/.specify/workflows/overlays/<workflow_id>/*.yml|*.yaml`
  (`overlay/layer_sources.py`), and **raises** if `overlay.extends != workflow_id`:
  *"Overlay extends 'x', but is stored under workflow 'y'."*
- Write path: `workflow_overlay_add` targets
  `_project_overlay_dir(project_root, overlay.extends)` (`overlay/operations.py:195`), with
  the **file** named from the overlay id.
- **So an overlay with `extends: speckit` lives at
  `.specify/workflows/overlays/speckit/<overlay-id>.yml`.** See §6/D2.
- Duplicate overlay ids within one directory are rejected; symlinked overlay files and
  directories are rejected; `enabled: false` is skipped during resolution but still listed
  by management commands.
- CLI: `specify workflow overlay add <path-to-yml> [--priority N]`
  (`overlay/command_add.py`), plus `list`, `remove`, `enable`, `disable`, `set-priority`.
- ⚠️ **"Survives `bundle update`" is true for a reason worth stating precisely.**
  `COMPONENT_KINDS = ("extensions", "presets", "steps", "workflows")`
  (`src/specify_cli/bundles/manifest.py:21`) — **`overlays` is not a bundle component
  kind.** The overlay survives a bundle update because it is project-local state the
  bundle does not manage, **not** because the bundle ships it. A bundle cannot deliver an
  overlay at this release.

**Criterion 4 — `specify workflow run` / `status --json` / `resume`, and where run state
is persisted.** ✅ **All three exist.**

- The `specify workflow` group registers `run`, `resume`, `status`, `list`, `add`,
  `remove`, `update`, `enable`, `disable`, `search`, `info`, `resolve`, plus the `catalog`,
  `step` and `overlay` sub-groups (`workflows/_commands.py:register`).
- `specify workflow status [RUN_ID] [--json]` — run id optional, *"shows all if omitted"*
  (`command_status.py`). The `--json` payload carries the shared run payload plus
  `created_at`, `updated_at` and a `steps` map of step id → status.
- **Run state: `.specify/workflows/runs/<run_id>/`** (`engine.py:715`), holding
  **`state.json`**, **`inputs.json`** and **`log.jsonl`**. Both JSON files are written
  atomically (temp file + `os.replace`).
- `state.json` keys: `run_id`, `workflow_id`, `installed_workflow_id`,
  `installed_registry_root`, `status`, `current_step_index`, `current_step_id`,
  `step_results`, `workflow_dir`, `created_at`, `updated_at`, `error`.
- `run_id` is `str(uuid.uuid4())[:8]` — an 8-character id — constrained to
  `^[a-zA-Z0-9][a-zA-Z0-9_-]*$` because it is interpolated into a filesystem path.

**Criterion 5 — the honest caveat: chat-time ordering is not enforced.** ✅ **Confirmed,
and it is structural rather than a gap.** Spec Kit commands are markdown prompt/skill/agent
files handed to the agent; the workflow engine is a **separate driver** that dispatches
those same commands. Nothing intercepts a command typed in chat, so ordering outside
`specify workflow run` is convention. The second belt is real and worth showing:

`scripts/bash/check-prerequisites.sh` and `scripts/powershell/check-prerequisites.ps1`
take `--json`, `--require-spec`, `--require-tasks`, `--include-tasks`, `--paths-only`,
`--template NAME`. `--require-tasks` is what makes an implement-phase command refuse to run
before `tasks.md` exists. ⚠️ `--paths-only` deliberately does **not** write
`feature.json` (issue #3025, `check-prerequisites.sh:101`).

**Criterion 6 — hook events are a fixed lifecycle list; there is no `before_epic`.**
⚠️ **True, but the consequence is materially worse than "there is no such event."**

The standard events (`extensions/EXTENSION-API-REFERENCE.md:616-638`) are `before_` and
`after_` pairs over **nine** core commands: `specify`, `plan`, `tasks`, `implement`,
`analyze`, `checklist`, `clarify`, `constitution`, `taskstoissues` — **eighteen events**.

- ⚠️ **There is no whitelist.** Hook validation checks only that each event's value is a
  mapping (or non-empty list of mappings), that each entry has a `command`, and that any
  `priority` is an integer ≥ 1 (`extensions/__init__.py:413-443`). **It never checks the
  event _name_.** So `before_epic:` in `extension.yml` **validates cleanly, installs
  cleanly, and then never fires** — because nothing in core emits that event. A silent
  no-op, not an error. See §6/D3.
- Hook entry fields: `command` (required), `priority` (int ≥ 1, default
  `DEFAULT_HOOK_PRIORITY = 10`, lower runs first, ties keep authoring order via stable
  sort), `optional`, `prompt`, `description`, `condition`.
- 🔹 Noted, not taught: `converge` is in `_FALLBACK_CORE_COMMAND_NAMES`
  (`extensions/__init__.py:52-65`) but has **no** hook-event pair in the API reference. The
  hook list covers nine of the ten core command names.

**Criterion 7 — feature state lives in `.specify/feature.json`, is gitignored, and
`git checkout` alone does not switch features.** ✅ **Confirmed verbatim in Spec Kit's own
docs.**

- `docs/quickstart.md:25`: *"Spec Kit tracks the active feature by the feature directory
  recorded in `.specify/feature.json` (overridable with the `SPECIFY_FEATURE_DIRECTORY`
  environment variable). Commands resolve the feature from that state, **not** from the
  checked-out Git branch — no Git required. … the active feature is still whichever
  directory that state points to; `git checkout` alone does not change it."*
- ⚠️ **Gitignored via a _managed_ `.specify/.gitignore`**, not the repo-root `.gitignore`:
  *"`specify init` scaffolds a managed `.specify/.gitignore` that excludes machine-local
  state — `feature.json` … and per-machine extension `extensions/*/local-config.yml`
  overrides — while leaving everything else under `.specify/` … shareable"*
  (`docs/reference/core.md:61`). Corroborated by `tests/test_shared_infra_gitignore.py`,
  which asserts both `feature.json` and the `.specify/feature.json` path form.
- `SPECIFY_FEATURE_DIRECTORY` takes precedence over the file.
  `SPECIFY_FEATURE_NO_PERSIST=1` stops every core script writing it — *"Useful when
  multiple agents run concurrently against the same checkout"* (`docs/reference/core.md:57`).
- ⚠️ `SPECIFY_FEATURE` sets the feature **label** only and does **not** locate the
  directory; with only that set, `get_feature_paths` fails
  (`docs/reference/core.md:56`). Worth one sentence so a learner does not reach for it.

**Criterion 8 — the rework loop is modelled explicitly.** ⚠️ **Supported, but not the way
a reader of U3 would assume.** See §1.3.

### 1.3 The verified surface Lab 23 teaches — and the rework loop, honestly

**The twelve built-in step types**, taken from the registry at
`src/specify_cli/workflows/__init__.py` and each step's own `type_key`:

| `type` in YAML | Module | Note |
|---|---|---|
| `command` | `step/command` | dispatch a Spec Kit command |
| `gate` | `step/gate` | human review gate |
| `shell` | `step/shell` | runs with the user's privileges |
| `prompt` | `step/prompt` | |
| `init` | `step/init` | |
| `slot` | `step/slot` | |
| `if` | `step/if_then` | ⚠️ **`if`, not `if_then`** |
| `switch` | `step/switch` | |
| `while` | `step/while_loop` | ⚠️ **`while`, not `while_loop`** |
| `do-while` | `step/do_while` | ⚠️ **hyphen** |
| `fan-out` | `step/fan_out` | ⚠️ **hyphen** |
| `fan-in` | `step/fan_in` | ⚠️ **hyphen** |

> ⚠️ **Four module names differ from their YAML `type` keys.** A learner who writes
> `type: do_while` or `type: if_then` gets an unregistered step type. This is worth one
> line in the lab.

**So what _is_ the rework loop?** Three mechanisms exist, and none of them is a backward
jump:

1. **`on_reject: retry` + `specify workflow resume`.** Rejecting PAUSES the run *on the
   gate*. The author fixes the artifact **out of band**, then resumes; the gate re-executes
   and can now be approved. This is the closest thing to "rework" Spec Kit ships, and it is
   the one to lead with — it is honest, it is one flag, and the run state in
   `.specify/workflows/runs/<run_id>/state.json` shows exactly where the run is parked.
2. **`on_reject: skip` + a downstream `if`/`switch`** branching on the gate's recorded
   `output.choice`. The gate completes, the verdict is data, and the workflow decides what
   happens next. This models "route the rejection somewhere" rather than "stop".
3. **A `do-while` (or `while`) step wrapping a stage sequence**, looping while the gate's
   choice is still a rejection. `do-while` executes its nested `steps` at least once and
   the engine re-evaluates `condition` after each iteration; `max_iterations` defaults to
   **10**. This is the only construct that genuinely re-runs an earlier stage.
   - ⚠️ **The `condition` trap, and it is a good one.** A condition must be a **single
     complete `{{ }}` block**. A bare string such as `condition: inputs.count > 100` is
     *never evaluated* — `bool()` on a non-empty string is always `True`, so the loop runs
     to `max_iterations`. Spec Kit's validator catches this with three distinct messages
     (never-evaluated, malformed block, interpolated-to-text) in
     `step/do_while/__init__.py`. The validator only fires on a validated load, so the lab
     should show the message rather than assert the rule.

**What happens to `tasks.md` when the spec changes** (US-3.3, criterion 8) — **answered
2026-09-28, from source.** Two facts settle it:

1. **`setup-tasks.sh` / `.ps1` never writes `tasks.md`.** It resolves `tasks-template`
   through the override stack and emits JSON — `FEATURE_DIR`, `AVAILABLE_DOCS`,
   `TASKS_TEMPLATE`, `TASKS_TEMPLATE_CONTENT`. The file is written by the **agent**, not
   the script.
2. **The command instructs the agent to _generate_ the file, not to merge it.**
   `templates/commands/tasks.md` step 4 reads *"**Generate tasks.md**: Use
   TASKS_TEMPLATE_CONTENT … as the structure. Fill with: …"*, and its format rules require
   every emitted task to carry an **unchecked** `- [ ]` box. Nothing in the command or its
   script reads, preserves, or merges an existing `tasks.md`.

**So: re-running `speckit.tasks` after a spec change regenerates `tasks.md` from the
template and the design artifacts, and prior task state — completed checkboxes, notes — is
not carried over.** ⚠️ **State this at exactly that strength and no further.** What is
verified is the *instruction the agent is given*; an agent could in principle read the old
file, but nothing tells it to and nothing merges for it. The lab says what the command
does, not what every agent will always do.

### 1.4 Evidence base consulted

All at tag `v1.0.12` unless noted. Paths relative to a `git clone --depth 1 --branch
v1.0.12 https://github.com/github/spec-kit.git`.

| Claim area | File(s) |
|---|---|
| Release pin | `gh api "repos/github/spec-kit/releases?per_page=10"` |
| Extension manifest, namespace check, hooks validation | `src/specify_cli/extensions/__init__.py` (lines 52-79, 229, 375-443, 450-470, 570-641, 648-667, 1082-1160) |
| Extension `provides` / hooks reference | `extensions/EXTENSION-API-REFERENCE.md` (43-74, 140-157, 580-660) |
| Shipped extension shape | `extensions/git/extension.yml`, `extensions/bug/extension.yml`, `extensions/agent-context/extension.yml` |
| Overlay schema | `src/specify_cli/workflows/overlay/schema.py` |
| Overlay storage and load rules | `src/specify_cli/workflows/overlay/layer_sources.py` |
| Overlay write path | `src/specify_cli/workflows/overlay/operations.py:195-279` |
| Overlay CLI | `src/specify_cli/workflows/overlay/command_add.py` and siblings |
| Base workflow and its anchors | `workflows/speckit/workflow.yml` |
| Gate semantics | `src/specify_cli/workflows/step/gate/__init__.py` |
| Step type registry | `src/specify_cli/workflows/__init__.py` |
| Loop conditions | `src/specify_cli/workflows/step/do_while/__init__.py` |
| Run state | `src/specify_cli/workflows/engine.py:593-800` |
| Workflow CLI surface | `src/specify_cli/workflows/_commands.py:1467-1535`, `command_status.py` |
| Bundle component kinds | `src/specify_cli/bundles/manifest.py:19-33` |
| `feature.json` | `docs/quickstart.md:25`, `docs/reference/core.md:55-61`, `tests/test_shared_infra_gitignore.py` |
| Prerequisite scripts | `scripts/bash/check-prerequisites.sh:1-41,101` |

---

## 2. Gate analysis — what actually has to be true

### 2.1 Baseline — measured 2026-09-28

```powershell
npx vitest run tests/lab-structure tests/meta tests/content-currency
# 13 files | 213 tests | all passing
```

Matches what #51 handed over. The four uncommitted files in the working tree
(`README.md`, `labs/lab11.md`, `labs/lab14.md`, `labs/setup.md` — John's, §7.4) are present
and the gate is green with them.

### 2.2 Which suites actually read `labs/lab23.md`

| Suite | Reads lab23? | What it asserts | Risk for #52 |
|---|---|---|---|
| `lab-structure/labs-have-frontmatter` | **Yes** | `title`, `lab_number`, `pace` present; `lab_number` equals the filename number | Low — keep frontmatter intact |
| `lab-structure/links-resolve` | **Yes** | Every internal markdown link resolves on disk | ⚠️ **The live hazard** — §2.3 |
| `meta/enumeration-parity` | **Yes (indirectly)** | Each lab **ID** appears across the registry, `README.md` and `labs/setup.md` — **not** title-string equality | ⚠️ Weaker than it looks — §2.4 |
| `content-currency/registry-consumed` | **Yes (as a set)** | ≥ 3 labs contain the literal `docs/_meta/registry.yaml` | Low — the lab23 stub already contains it; **must not lose it** |
| `content-currency/cli-commands-current` | **No** | Targets labs 01, 05, 07–10 only | None |
| `lab-structure/labs-language-agnostic` | **No** | Targets labs 03–06 only | None |
| `lab-structure/appendices-parity` | **No** | Appendix pairs for labs 03–06 | None |

### 2.3 ⚠️ The gate hazard — `links-resolve` and the new artifacts

`links-resolve` globs `labs/*.md` **non-recursively** and requires every `[text](target)`
internal link to exist on disk. Two consequences, unchanged from #51 §2.3:

1. **Files under `labs/fixtures/lab23/` are not themselves scanned.** Only top-level
   `labs/*.md` is. Putting the artifacts there keeps the suite at its current file count.
2. **Fixture artifacts are referenced as inline code paths in backticks, never as markdown
   links** — the convention Lab 12 established and Lab 22 followed.

**Test-count arithmetic.** `links-resolve` emits 1 discovery test + 1 per `labs/*.md` = 31
today (30 files). `labs-have-frontmatter` emits 1 + 1 per `lab\d+.md` = 27 today (26 labs).
**#52 adds no file to `labs/` top level, so both counts are unchanged.** The expected
post-change gate is therefore **13 files / 213 tests**, identical to baseline. *If the
count moves, stop and understand why before trusting the commit.*

> ⚠️ **`labs/lab23.md` already links to `lab22.md`** (its Prerequisites line) and to
> `../docs/epics/EPIC-001-enterprise-agentic-sdlc-harness.md` (the stub banner). The stub
> banner and its epic link **go away** when the body is replaced. Both `lab22.md` and
> `lab24.md` exist, so forward and backward links in the arc are safe — but **check every
> link you keep**, because the stub's epic link is one `../` hop out of `labs/` and is the
> shape most likely to be copied wrongly into the new body.

### 2.4 Frontmatter and registry must agree — but the gate will not tell you if they don't

| Frontmatter key | Registry key | Current value |
|---|---|---|
| `title` | `labs.lab23.title` | `Custom SDLC Stages, Gates & the Rework Loop` |
| `pace.presenter_minutes` | `pace_presenter_minutes` | `7` |
| `pace.self_paced_minutes` | `pace_self_minutes` | `35` |
| *(none — do not invent one)* | `pace_workshop_minutes` | `12` |

> ⚠️ **No test enforces the title agreement.** Proved by mutation probe during #51's round
> 4: drifting the frontmatter `title` while leaving the registry's alone leaves the full
> gate **green at 13 files / 213 tests**. `enumeration-parity` asserts lab **ID** presence
> only; `labs-have-frontmatter` checks key presence and `lab_number`. This is **manual
> check M10**, not a gated one — and with no test CI on pull requests, nothing else catches
> a drift.

**#52 changes none of these values.** The title stays character-for-character identical,
including the `&`. If a later decision changes one, both files change in the same commit.

---

## 3. File-by-file implementation

| # | File | Action | Why |
|---|---|---|---|
| 1 | `docs/_meta/registry.yaml` | **Edit** — `spec_kit_version_last_verified` `2026-09-25` → `2026-09-28` and refresh the dated sentence. **`spec_kit_version` does not change** | §1, Record 5 — standing Appendix A.3 obligation |
| 2 | `labs/lab23.md` | **Replace** stub body; keep frontmatter byte-identical | The lab itself (§3.2) |
| 3 | `labs/fixtures/lab23/contoso-review/extension.yml` | **Create** | The extension manifest Lab 22's bundle pins (§3.3) |
| 4 | `labs/fixtures/lab23/contoso-review/commands/speckit.contoso-review.epic.md` | **Create** | Epic stage command |
| 5 | `labs/fixtures/lab23/contoso-review/commands/speckit.contoso-review.qa-review.md` | **Create** | QA-review stage command |
| 6 | `labs/fixtures/lab23/contoso-review/templates/epic-template.md` | **Create** | `provides.templates` entry |
| 7 | `labs/fixtures/lab23/contoso-review/templates/qa-review-template.md` | **Create** | `provides.templates` entry |
| 8 | `labs/fixtures/lab23/contoso-review/scripts/bash/create-epic.sh` | **Create** | `provides.scripts` entry (bash) |
| 9 | `labs/fixtures/lab23/contoso-review/scripts/powershell/create-epic.ps1` | **Create** | PowerShell twin — this repo ships both (`AGENTS.md`) |
| 10 | `labs/fixtures/lab23/overlays/contoso-stages.yml` | **Create** | The workflow overlay (§3.4) |
| 11 | `labs/fixtures/lab23/README.md` | **Create** | What each artifact is and which lab step uses it (Lab 12/22 fixture convention) |
| 12 | `CHANGELOG.md` | **Edit** | Record #52, per the #48/#51 precedent |

> **Not touched:** `README.md`, `labs/setup.md` (enumeration rows already exist from #48,
> and the uncommitted README edits are John's — §7.4); `labs/lab18.md` (departure D5);
> `labs/lab22.md` and `labs/fixtures/lab22/**` (§7.2); `.github/workflows/weekly-content-audit.lock.yml`
> (never recompile — #48 spec §3.7).

### 3.1 `docs/_meta/registry.yaml` — refresh the verification date only

The `RE-VERIFICATION OBLIGATION` block and the generic lead paragraph above it are
**preserved**. `spec_kit_version` stays `"1.0.12"`. Only the dated sentence and
`spec_kit_version_last_verified` change, adding Record 5 without discarding the history
that makes the block credible.

Append to the existing obligation comment (immediately before `spec_kit_version:`) and
update the one scalar:

```yaml
# Re-verified 2026-09-28 for EPIC-001 #52 via
# `gh api "repos/github/spec-kit/releases?per_page=10"`: still v1.0.12, no
# newer release, no prerelease. Three days with no release is NOT evidence the
# cadence slowed — re-check before the next cohort and at the start of any work
# that consumes this key.
spec_kit_version: "1.0.12"
spec_kit_version_last_verified: "2026-09-28"
```

**Constraints.** The lead paragraph and every existing dated sentence are **not** removed.
Both keys stay top-level scalars in their current position. The file must still parse as
YAML. The diff must contain **only** this comment addition and the one changed date.

### 3.2 `labs/lab23.md` — the lab

**Frontmatter is preserved byte-for-byte.** Only the body below the closing `---` is
replaced. Required section order, matching the house shape used by Labs 11–22:

| § | Section | Must contain |
|---|---|---|
| — | Title, hook paragraph, pace line, "Part of" line, References | "builds on Lab 22"; a link to `lab22.md`; the registry link; `labs/fixtures/lab23/` as a **code path** |
| 23.0 | Prerequisites and currency | Lab 22 done; registry pin note; the demo project is a direct child of the repo root so `../labs/fixtures/lab23/...` resolves; demo dirs are gitignored |
| 23.1 | The default SDLC, and why yours differs | The base `speckit` workflow's six steps (§1.2 table) and the absence of a gate after `implement` |
| 23.2 | Declare the stages: the `contoso-review` extension | `provides.commands` / `templates` / `scripts`; the **namespace rule** (§6/D1); `strategy` rejected here though Lab 22 used it |
| 23.3 | Install and verify the extension | `specify extension add --dev ../labs/fixtures/lab23/contoso-review`; the Lab 22 bundle cross-check (§3.5) |
| 23.4 | Place the stages: the workflow overlay | `extends: speckit`; `insert_after` anchors; **shorthand vs explicit form, not both**; no dots in `id`/`extends` |
| 23.5 | Gates that actually stop the work | `type: gate`, `message`, `options`, `on_reject`; the three legal values; **the `rework`-option trap**; `show_file` |
| 23.6 | The rework loop | All three mechanisms from §1.3, led by `on_reject: retry` + `resume`; the `do-while` condition trap; what happens to `tasks.md` (§8 step 2) |
| 23.7 | Run it: `run`, `status --json`, `resume` | Run state at `.specify/workflows/runs/<run_id>/{state.json,inputs.json,log.jsonl}`; non-TTY pauses |
| 23.8 | The honest caveats | Chat ordering unenforced + `check-prerequisites` as the second belt; hook events fixed **and unvalidated**; `feature.json` gitignored and `git checkout` does not switch features |
| 23.9 | Verify | A short command list the learner runs and confirms |
| — | What you built / Key takeaways / Versions and pins | Mirrors Lab 22's closing shape |

**Honest-caveat requirements — all four must appear, and none may be softened:**

1. Typing a command in chat is **not** blocked; ordering is convention unless driven
   through `specify workflow run`. `check-prerequisites --require-tasks` is the second belt.
2. Hook events are a fixed list of eighteen, **and an unknown event name is not rejected**
   — `before_epic:` installs clean and silently never fires (§6/D3).
3. `.specify/feature.json` is gitignored by a **managed `.specify/.gitignore`**, and
   `git checkout` alone does not switch features.
4. **There is no backward jump in a gate.** `on_reject` is `abort` | `skip` | `retry`.

### 3.3 `labs/fixtures/lab23/contoso-review/extension.yml`

Shape is settled by §1.2 criterion 1. The id is `contoso-review` because Lab 22's
**already-committed** `bundle.yml` pins `extension: contoso-review@1.0.0`, and the
install-time namespace check then forces both command names.

```yaml
schema_version: "1.0"

extension:
  id: contoso-review
  name: "Contoso Review Stages"
  version: "1.0.0"
  description: "Adds Contoso's epic and QA-review stages to the Spec Kit SDLC."
  author: "Contoso Platform Engineering"
  license: MIT

requires:
  speckit_version: ">=1.0.0"

# The middle segment of every command name MUST equal extension.id above.
# `speckit.contoso.epic` would be rejected at install with
# "Command 'speckit.contoso.epic' must use extension namespace 'contoso-review'".
provides:
  commands:
    - name: speckit.contoso-review.epic
      file: commands/speckit.contoso-review.epic.md
      description: "Frame a body of work as an epic before any spec is written"
    - name: speckit.contoso-review.qa-review
      file: commands/speckit.contoso-review.qa-review.md
      description: "Review an implemented feature against its spec and record a verdict"
  # Template and script names are NOT namespaced — plain `^[a-z0-9-]+$` slugs.
  # `strategy` is not authorable here: extension artifacts always replace.
  templates:
    - name: epic-template
      file: templates/epic-template.md
      description: "The epic stage's output shape"
    - name: qa-review-template
      file: templates/qa-review-template.md
      description: "The QA-review stage's verdict shape"
  scripts:
    - name: create-epic
      file: scripts/bash/create-epic.sh
      description: "Create the epic directory and seed it from the template"
      # `runtimes` is informational only — it does not select or invoke anything.
      runtimes: ["bash", "powershell"]

tags: ["contoso", "sdlc", "governance", "qa"]
```

> ⚠️ **Do not add `hooks:` naming a custom event.** `before_epic` would validate and never
> fire (§6/D3). If the lab demonstrates that trap, it does so in prose and in a clearly
> labelled *broken* snippet — never in the shipped fixture, which must install clean.

### 3.4 `labs/fixtures/lab23/overlays/contoso-stages.yml`

`extends: speckit` places this at `.specify/workflows/overlays/speckit/contoso-stages.yml`
once added — **confirmed by running it** (§1.2 criterion 3, story 52.1 AC 8). The overlay id
is **`contoso-stages`**, deliberately *not* `contoso-sdlc` — see §7.1.

> ⚠️ **Anchors resolve against the _base_ step list only — verified 2026-09-28 (M15).**
> An overlay **cannot** anchor on a step it inserted itself. The first draft of this
> fixture used `insert_after: epic` and `insert_after: qa-review`, and
> `specify workflow resolve speckit` rejected it:
>
> ```text
> Error: Overlay 'contoso-stages' has invalid edits:
>   - Edit 1: anchor 'epic' does not match any base step id.
>   - Edit 3: anchor 'qa-review' does not match any base step id.
> ```
>
> (Edit indices are **0-based**.) The fix is to anchor every edit on a base step and rely
> on the second verified fact: **sibling edits that share an anchor are applied in
> authoring order.** Two `insert_before: specify` edits therefore yield `epic` then
> `review-epic`; two `insert_after: implement` edits yield `qa-review` then `review-qa` —
> they are *not* reversed. Both facts are worth one line each in the lab.

```yaml
id: contoso-stages
extends: speckit
priority: 10
enabled: true

edits:
  - insert_before: specify
    step:
      id: epic
      command: speckit.contoso-review.epic
      integration: "{{ inputs.integration }}"
      input:
        args: "{{ inputs.spec }}"

  - insert_before: specify
    step:
      id: review-epic
      type: gate
      message: "Approve the epic before any spec is written."
      options: [approve, reject]
      on_reject: retry

  - insert_after: implement
    step:
      id: qa-review
      command: speckit.contoso-review.qa-review
      integration: "{{ inputs.integration }}"
      input:
        args: "{{ inputs.spec }}"

  - insert_after: implement
    step:
      id: review-qa
      type: gate
      message: "QA verdict: approve to close the feature, reject to send it back."
      options: [approve, reject]
      on_reject: retry
```

**Verified composed order** (`specify workflow resolve speckit`, 2026-09-28):

```text
epic → review-epic → specify → review-spec → plan → review-plan → tasks → implement
     → qa-review → review-qa
```

with `epic`, `review-epic`, `qa-review` and `review-qa` attributed to
`project:contoso-stages` and the rest to `base`. **This is exactly the stage sequence U3
asks for**, and it is an addition to the base workflow rather than a replacement of it.

**Constraints.** `id` and `extends` carry **no dots**. No step `id` contains `:`. Every
edit uses the shorthand form consistently. Every anchor names a **base** step.

### 3.5 The Lab 22 cross-check — a real, testable consequence

Lab 22 §22.7 tells the learner, in committed prose, that online bundle validation currently
fails on two unresolved references and that *"Once Labs 23 and 24 ship the components, the
online form passes too."* #52 ships the first of those two.

A reference resolves if the component is **bundled, installed, or in an active catalog**
(any one). So once the learner runs
`specify extension add --dev ../labs/fixtures/lab23/contoso-review`, the online form of

```bash
specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle
```

should stop reporting `extension:contoso-review@1.0.0` and report **only**
`workflow:contoso-sdlc@1.0.0`. **This is manual check M14 and story 52.2 AC 6.** It is the
single best proof that the fixture is genuinely correct rather than merely well-formed.

> ⚠️ **The overlay does not resolve `workflow:contoso-sdlc`.** `overlays` is not a bundle
> component kind (§1.2 criterion 3). Lab 23 must not imply that shipping the overlay
> satisfies the bundle's workflow reference — that stays open until #53.

### 3.6 `labs/fixtures/lab23/README.md`

Follows the Lab 22 fixture README: what each artifact is, which lab section installs it,
and an explicit statement that `contoso` URLs are illustrative and unreachable. Must also
state that the overlay's on-disk home differs from its source path here.

---

## 4. "No hardcoded versions" — explicit statement

`tests/content-currency/registry-consumed.test.ts` and the epic require labs to read
versions from `docs/_meta/registry.yaml`.

**Rules.**

1. `labs/lab23.md` contains **no Spec Kit release literal** — not `1.0.12`, not `v1.0.12`,
   not any other release number. Install commands render the placeholder form
   `git+https://github.com/github/spec-kit.git@v<version>` and point at the registry.
2. `labs/lab23.md` **retains** the literal string `docs/_meta/registry.yaml`.
3. Fixture files legitimately carry *Contoso artifact* versions (`version: "1.0.0"`) and
   **range constraints** (`speckit_version: ">=1.0.0"`), never the pinned release. A `>=`
   floor is a compatibility statement, not a pin, and does not decay.
3a. The same exemption extends to a labelled excerpt of a fixture quoted inside the lab
   (carried from #51 §4 rule 3a).
4. **Verification** is the **general** sweep — every semantic version in the file must be
   shown to be a Contoso artifact version or a `>=` floor:
   ```powershell
   Select-String -Path labs\lab23.md -Pattern '\b\d+\.\d+\.\d+\b'
   ```
   **Any hit that is not a Contoso artifact version or a `>=` floor is a violation.** Do
   not substitute a narrow enumeration of known release numbers — it goes blind the moment
   Spec Kit ships a version outside it (#51 §4, rule 4).

⚠️ **One new wrinkle for #52.** The base workflow carries `workflow.version: "1.0.1"` and
`requires.speckit_version: ">=0.8.5"`. If the lab quotes the base workflow, those numbers
come with it. They are **Spec Kit's own artifact versions**, not the release pin, and they
decay independently — so **prefer quoting the base workflow's `steps:` only**, without its
`workflow:` or `requires:` blocks. If a quote must include them, label the excerpt and
classify the hits under rule 4.

---

## 5. Acceptance gate

### 5.1 Expected post-change result

```powershell
npx vitest run tests/lab-structure tests/meta tests/content-currency
```

**Expected: 13 files / 213 tests, all passing — identical to the §2.1 baseline.** #52 adds
no file to `labs/` top level (§2.3). **A changed count is a stop signal**, not something to
rationalize.

### 5.2 Regression surface

The full suite is **pre-existing red and not #52's to fix**: 45 failed / 437 passed across
`tests/workflows`, `tests/workshop`, `tests/extensions`, `tests/hooks`,
`tests/orchestrator`, `tests/plugin-template` and `tests/scripts`. **Read every result as a
delta against that baseline, never as an absolute** — including the failing-test
*identities*, not just the counts. A suite that was red before and is red now is not a #52
finding (stories §2 rule 10).

### 5.3 Manual checks CI cannot perform

CI checks structure, not truth. These catch a lab that passes the gate and still teaches a
dead end.

| # | Check | How |
|---|---|---|
| M1 | Every `specify` command in the lab exists at the pinned release | Cross-read against §1.2. Anything not in that evidence set is removed |
| M2 | Command namespace rule is stated and the fixture obeys it | Fixture uses `speckit.contoso-review.*`; lab explains why `speckit.contoso.*` is rejected |
| M3 | `on_reject` is documented as **exactly** `abort` \| `skip` \| `retry` | `Select-String -Path labs\lab23.md -Pattern 'on_reject'` — no `goto`, no invented verb |
| M4 | The `rework`-named-option trap is stated | Lab says rejection matches only `reject`/`abort` |
| M5 | The overlay path is described as the **extended workflow's** id | Lab says `.specify/workflows/overlays/speckit/`, not `.../overlays/contoso-stages/` |
| M6 | Overlay `id`/`extends` are shown as dot-free slugs | `Select-String` the fixture; no `contoso.stages` anywhere |
| M7 | Shorthand vs explicit edit forms — the lab warns they cannot be mixed | Prose + fixture consistency |
| M8 | Hook events: fixed list **and** unvalidated-name consequence both stated | §3.2 caveat 2 |
| M9 | No version literal in `labs/lab23.md` | §4, rule 4 — the general sweep, with each hit classified |
| M10 | Frontmatter and registry still agree | §2.4 table, all four rows |
| M11 | Fixture artifacts referenced as code paths, not markdown links | §2.3 |
| M12 | Step `type` keys are exact | `do-while`, `if`, `while`, `fan-in`, `fan-out` — not the module names |
| M13 | **Every fixture manifest passes Spec Kit's own validator** at the pinned tag, with an **anti-vacuity control** | `ExtensionManifest` accepts `extension.yml`; `validate_overlay_yaml` returns `[]` for the overlay. Then **break a copy** (drop `strategy`-free rule: e.g. rename a command to `speckit.contoso.epic`) and confirm it *fails*. Key presence is not validity — #51 round 1 shipped a `bundle.yml` with every required key that `specify bundle validate` still rejected |
| M14 | **The Lab 22 bundle cross-check** | §3.5 — after `extension add --dev`, online `bundle validate` reports only `workflow:contoso-sdlc` as unresolved |
| M15 | `insert_after` on a just-inserted step is proven, not assumed | §3.4 warning; §8 step 3 |
| M16 | Lab 23 does not contradict Lab 22 | Read `labs/lab22.md` §22.7's "built later" note and the Key takeaways; the CLI-vs-VS-Code framing (D10) must be consistent |

---

## 6. Departures from issue #52's body and the epic's U3

| # | U3 / #52 says | This plan does | Why |
|---|---|---|---|
| D1 | `extension.yml` declares **`speckit.<org>.epic`** and `speckit.<org>.qa-review` | Declares **`speckit.contoso-review.epic`** and **`speckit.contoso-review.qa-review`** | §1.2 criterion 1. The middle segment **must equal `extension.id`** (`extensions/__init__.py:1141-1145`, hard `ValidationError` at install). The id is fixed to `contoso-review` by Lab 22's **already-committed** `bundle.yml`. Reading `<org>` as the literal `contoso` would either break the bundle or fail the namespace check. `<org>` is a placeholder for the **extension id**, and the arc already chose it |
| D2 | *"The overlay lives under `.specify/workflows/overlays/<id>/`"* | States plainly that `<id>` is the **extended workflow's** id — `.specify/workflows/overlays/speckit/` | §1.2 criterion 3. `ProjectOverlaySource` scans `overlays/<workflow_id>/` and **raises** if `overlay.extends != workflow_id`. A learner who reads `<id>` as the overlay's own id creates a directory Spec Kit never scans, and the overlay silently does nothing |
| D3 | *"Lab states that hook events are a fixed lifecycle list — there is no `before_epic`"* | Says that **and** that an unknown event name is **not rejected**: it validates, installs, and never fires | §1.2 criterion 6. Hook validation never checks the event name (`extensions/__init__.py:413-443`). "There is no `before_epic`" implies an error the learner would see; the truth is a silent no-op, which is the more dangerous failure and the one worth teaching |
| D4 | *"`type: gate` steps with `on_reject` to enforce approval"* + *"the rework loop is modelled explicitly"* | Teaches `on_reject` as **exactly `abort` \| `skip` \| `retry`**, states that **no backward jump exists**, and models rework via the three mechanisms in §1.3 | §1.2. `on_reject: retry` **pauses on the gate**, it does not re-run the upstream stage. A lab implying a gate can send work back to an earlier stage would teach a construct Spec Kit does not have |
| D5 | `labs/lab18.md:44-45` teaches the older 5-command flow | **Logged, not fixed** | Carried from #51/D5. Out of scope for #52; it sits on the Lab 18 → Lab 22 seam (O1) |
| D6 | — | The overlay is named **`contoso-stages`**, not `contoso-sdlc` | §7.1. `contoso-sdlc` is the **workflow** id Lab 22's bundle pins and #53 builds. Reusing it for an overlay would imply the overlay satisfies that reference — it cannot, because `overlays` is not a bundle component kind |
| D7 | — | Artifacts live in `labs/fixtures/lab23/`, referenced as code paths | §2.3. Lab 12 set the precedent, Lab 22 followed it, and it keeps the gate count stable |
| D8 | — | The registry's `spec_kit_version` is **unchanged**; only `last_verified` moves | §1, Record 5. The pin genuinely did not move; recording the check honestly is the point of the obligation block |
| D9 | — | The lab quotes the base workflow's `steps:` only, not its `workflow:`/`requires:` blocks | §4. Those carry Spec Kit's own artifact versions, which decay independently of the release pin |
| D10 | *(inherited)* the IDE-only Copilot framing in U2 criterion 3 and #51's body | Lab 23 carries **#51's corrected CLI-first framing** forward: this arc's learners are in Copilot CLI | Carried from #51/D10. ⚠️ **The epic's U2 criterion 3 and #51's body are still uncorrected** (O4) — both are remote writes, owner John. U3 itself does not repeat the error, but #52 must not re-introduce it |

---

## 7. Decisions

### 7.1 Overlay id is `contoso-stages`, not `contoso-sdlc` — **resolved**

The bundle pins a **workflow** called `contoso-sdlc`, which #53 builds. An **overlay** is a
different component kind and cannot satisfy that reference (§1.2 criterion 3). Giving the
overlay the same id would teach a false equivalence at exactly the seam where the arc is
most likely to confuse. `contoso-stages` describes what it does and collides with nothing.

### 7.2 Lab 22 and its fixtures are not modified — **resolved**

Lab 22 is complete and its bundle is committed. #52 ships the component Lab 22 already
promised; it does not renegotiate Lab 22's contract. If the M14 cross-check reveals that
Lab 22 states something false, that is a **finding logged against #55**, not an edit here
— #51 is awaiting John's push decision and editing it now would invalidate its QA history.

### 7.3 The `contoso-sdlc` workflow is #53's, not #52's — **resolved**

U3 asks for a workflow **overlay**; U4/#53 owns the standalone workflow. #51 §7.2 already
recorded this split. #52 building a `contoso-sdlc` workflow would pre-empt Lab 24.

### 7.4 The four uncommitted files stay untouched — **resolved**

Unchanged from #48 and #51. `README.md`, `labs/lab11.md`, `labs/lab14.md` and
`labs/setup.md` carry John's uncommitted edits. Every file is staged individually with
`git add <path>`; `git add .` and `git add -A` are forbidden by `AGENTS.md` and would sweep
John's work into #52's commits.

### 7.5 Ship both script runtimes, declare the bash one — **resolved 2026-09-28 (John)**

`AGENTS.md` says shell scripts ship in *"both Bash and PowerShell variants"*, and this
cohort is on Windows. `provides.scripts` takes **one `file` per entry** and `runtimes` is
informational only (§1.2 criterion 1), so the PowerShell twin is **shipped but
undeclared** — exactly how core's `git` extension does it. The lab states why the twin is
undeclared, so a learner does not read the single `file:` as "bash only".

> 🔹 **Rejected:** a bash-only fixture. Smaller, but it contradicts `AGENTS.md` and strands
> a Windows cohort on the one lab in the arc that asks them to run a script.

### 7.6 Rework loop: `retry` + `resume` is the mechanism — **resolved 2026-09-28 (John)**

§1.3 gives three mechanisms. The lab **teaches `on_reject: retry` + `specify workflow
resume`** as the working mechanism — one flag, demonstrably true, and the run state shows
exactly where the run is parked. `skip` + a downstream `if` is shown as the routing variant
**in prose**. The `do-while` wrap is described as a labelled *"if you need a true stage
re-run"* note and is **not shipped in the overlay**.

> 🔹 **Rejected:** shipping the full `do-while` loop. It is the only construct that
> genuinely re-runs an earlier stage, but it drags the expression language and its
> `condition` trap into a 35-minute lab and risks making it a 55-minute one. The note
> preserves the honest answer without the cost.

### 7.7 The branch keeps stacking locally — **resolved 2026-09-28 (John)**

#51's commits stay unpushed and #52 lands on top of them on
`feature/epic-enterprise-harness`. The push decision is deferred, deliberately. **No push,
PR, issue edit, comment or label happens without John's explicit per-action approval**
(§8 step 14).

---

## 8. Execution checklist

1. **Re-verify the Spec Kit release** at the start of implementation:
   `gh api "repos/github/spec-kit/releases?per_page=10"`. If it has moved past `v1.0.12`,
   read the notes of every newer release and re-check §1.2's eight criteria against the new
   tag **before writing anything** — especially the gate step, the overlay schema and the
   extension namespace check. Update §1, §1.2, §1.3, §3.1 and §6/D8 accordingly.
2. **Settle the `tasks.md`-on-spec-change question by running it** (§1.3), not by
   reasoning. Whatever the lab says about rework and `tasks.md` must be observed behaviour.
3. **Prove the §3.4 anchor-order question by running it** (M15) before shipping the
   overlay. If `insert_after: epic` does not resolve against a step inserted by the same
   overlay, restructure the edits and update §3.4.
4. Refresh `docs/_meta/registry.yaml` (§3.1). Verify it still parses; verify the diff is
   only the comment addition and the one date.
5. Create the fixture tree (§3.3–§3.6, files 3–11).
6. **Validate every manifest with Spec Kit's own validator, with the anti-vacuity control**
   (M13). A manifest that carries every key this spec names can still be rejected.
7. Run the M14 Lab 22 cross-check (§3.5).
8. Write `labs/lab23.md` (§3.2), frontmatter untouched.
9. Run the gate (§5.1). Expect **13 files / 213 tests**. Investigate any movement.
10. Run the §4 no-literal sweep and the §5.3 manual checks M1–M16.
11. `CHANGELOG.md` entry.
12. Commit per concern, `<type>: <description>`, **files added individually**. Never amend
    or rebase — every QA round must be able to diff from the commit it last reviewed.
13. Delete the `%TEMP%` spec-kit clone.
14. **Stop. No push, no PR, no issue edit** without John's explicit per-action approval.

> ⚠️ **Never run `specify` with cwd at the repo root** — it writes `.specify/` caches into
> the tree. The demo project is a direct child of the repo root, and every fixture path in
> the lab is therefore `../labs/fixtures/lab23/...`.

---

## 9. Known-broken repo state — not #52's to fix

Carried from #48 and #51, re-confirmed 2026-09-28. None of this blocks #52; all of it
produces noise that is **not a signal about this work**.

| Item | Effect on #52 | Owner |
|---|---|---|
| **#63** — AWF model `auto` has no AI-credits pricing | The Copilot Code Review check on any PR **fails without reviewing anything** (`Changes +0 -0`). Pushing a new `feature/*` branch **auto-files a duplicate `[aw]` issue** | John / repo admin |
| **#57** — `COPILOT_GITHUB_TOKEN` auth failure | The weekly content audit has never run, so checks 8 and 9 **are not re-checking the pins**. This is why §1's re-verification is done by hand, and why §8 step 1 repeats it | John / repo admin |
| **O4** — the epic's **U2 criterion 3** and **#51's body, constraint 2** still carry the IDE-only Copilot framing | #52 must not re-introduce it (§6/D10). Both are remote writes | John |
| **O1** — `labs/lab18.md:44-45` teaches the older 5-command flow | Logged, not fixed (§6/D5). Ages on the Lab 18 → Lab 22 seam | — |
| `tests/workflows` `gh aw compile` failures (4) | Pre-existing red. Never returns a story | — |
| `tests/workshop` (12 failed / 59 passed) and the wider red surface — 45 failed / 437 passed repo-wide | Pre-existing red. Never returns a story | — |
| `weekly-content-audit.lock.yml` pinned to gh-aw v0.50.1 while the toolchain is v0.86.2 | **Do not recompile.** Recompiling changes the GitHub MCP server image the lock pins | — |
| There is **no test CI on pull requests** | The gate will not catch a mistake. **Run it locally, every round** | — |
