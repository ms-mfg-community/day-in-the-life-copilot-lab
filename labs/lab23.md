---
title: "Custom SDLC Stages, Gates & the Rework Loop"
lab_number: 23
pace:
  presenter_minutes: 7
  self_paced_minutes: 35
registry: docs/_meta/registry.yaml
---

# 23 — Custom SDLC Stages, Gates & the Rework Loop

Your SDLC has stages Spec Kit doesn't ship. Contoso frames an **epic** before
anyone writes a spec, and runs a **QA review** after implementation — and the
default five-phase flow has neither. You'll add both without forking anything:
an **extension** declares the stages, an **overlay** places them, and **gates**
stop the work until someone approves it.

You'll also learn exactly where that enforcement ends, because it ends sooner
than it looks.

> ⏱️ Presenter pace: 7 minutes | Self-paced: 35 minutes

**Part of:** Labs 21–26, the enterprise agentic SDLC harness arc — builds on Lab 22.

> ⚠️ **Spec Kit moves fast.** Nothing in this lab hardcodes a version: every
> command reads the pin from
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). If a flag below
> doesn't exist in your build, check the pin before you check your typing.

References:
- [Lab 22 — Centralized Spec Kit Templates & the Org Catalog](lab22.md) — the prerequisite
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — `spec_kit_version`
- `labs/fixtures/lab23/` — the extension and overlay you'll install in this lab

## 23.0 Prerequisites and currency

> 💡 Versions and pins live in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). This lab names no
> version inline — read `spec_kit_version` and substitute it.

You need [Lab 22](lab22.md) done, and the Spec Kit CLI at the pinned release:

🖥️ **In your terminal (from the repository root).** Every path in this lab is relative to
the repo root, and the demo project you create below must be a direct child of it —
otherwise the `../labs/fixtures/lab23/...` paths won't resolve.

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v<version>
specify init contoso-sdlc-demo --integration copilot --integration-options="--commands"
cd contoso-sdlc-demo
```

Replace `<version>` with `spec_kit_version` from the registry. `--commands` is the
Copilot **CLI** layout — see Lab 22 §22.2 if you need the reasoning.

> 💡 `contoso-sdlc-demo/` is learner scratch and is gitignored. Delete it when you're done.

## 23.1 The default SDLC, and why yours differs

Spec Kit ships one workflow. Look at what it actually does:

```bash
specify workflow info speckit
```

Its steps, in order:

```yaml
steps:
  - id: specify
    command: speckit.specify
  - id: review-spec
    type: gate
  - id: plan
    command: speckit.plan
  - id: review-plan
    type: gate
  - id: tasks
    command: speckit.tasks
  - id: implement
    command: speckit.implement
```

Two things to notice.

**There are already gates.** Review happens between spec and plan, and between plan and
tasks. You're not introducing the idea of a gate — you're adding two of your own.

**The workflow ends on `implement`.** There is **no gate after implementation**. Whatever
the agent built goes unreviewed as far as this workflow is concerned. That's the gap
Contoso's QA-review stage fills.

Contoso needs:

```text
epic → review-epic → specify → review-spec → plan → review-plan → tasks → implement → qa-review → review-qa
```

Two new commands, two new gates. Nothing in core changes.

## 23.2 Declare the stages: the `contoso-review` extension

A **command** that doesn't exist can't be placed in a workflow, so the extension comes
first. Open `labs/fixtures/lab23/contoso-review/extension.yml`:

```yaml
extension:
  id: contoso-review
  version: "1.0.0"

provides:
  commands:
    - name: speckit.contoso-review.epic
      file: commands/speckit.contoso-review.epic.md
    - name: speckit.contoso-review.qa-review
      file: commands/speckit.contoso-review.qa-review.md
  templates:
    - name: epic-template
      file: templates/epic-template.md
    - name: qa-review-template
      file: templates/qa-review-template.md
  scripts:
    - name: create-epic
      file: scripts/bash/create-epic.sh
      runtimes: ["bash", "powershell"]
```

Three rules here will bite you, and only one of them is obvious.

> ⚠️ **1. A command's middle segment must equal `extension.id` — exactly.**
> The id is `contoso-review`, so the commands are `speckit.contoso-review.epic` and
> `speckit.contoso-review.qa-review`. Shortening it to `speckit.contoso.epic` looks
> tidier and fails at install:
>
> ```text
> Validation Error: Command 'speckit.contoso.epic' must use extension namespace
> 'contoso-review'
> ```
>
> Note *where* that fires: at **install**, not when the YAML is parsed. A manifest that
> loads fine can still be rejected.

> ⚠️ **2. Templates and scripts are _not_ namespaced.** Command names are dotted and
> prefixed; template and script names are plain lowercase-and-hyphen slugs —
> `epic-template`, `create-epic`. A dot is rejected: `epic.template` gives
> *"Invalid template name 'epic.template': must be lowercase…"*.

> ⚠️ **3. `strategy` is preset-only — you cannot use it here.** In Lab 22 you composed
> templates with `replace`, `wrap` and `append`. Extension-provided templates **always
> replace**, and a `strategy:` key in this file is rejected outright rather than ignored:
> *"'strategy' is not authorable for extension-provided artifacts"*. If you're carrying
> habits over from Lab 22, this is the one that catches you.

**Why one script entry covers two files.** `provides.scripts` takes one `file` per entry,
and `runtimes` is **informational metadata only** — Spec Kit never uses it to select or
invoke anything. So the bash script is declared and the PowerShell twin ships beside it at
`labs/fixtures/lab23/contoso-review/scripts/powershell/create-epic.ps1`, with the command
markdown choosing between them. Spec Kit's own `git` extension ships the same
per-runtime layout — `scripts/bash/`, `scripts/powershell/`, `scripts/python/` — and goes
further still, declaring **no** `provides.scripts` at all. Declaring the entry is optional;
what matters is that the declaration never dispatches.

> 💡 **Only the `epic` command ships a script.** `qa-review` doesn't need one — it calls
> core's `check-prerequisites` to locate the feature, and writing the verdict is the
> agent's job. An extension declares what it actually provides; a script per command is
> not a requirement.

### Where an epic lives, and how specs hang off it

Adding a stage raises a structural question the tool does not answer for you: **where does
an epic's artifact live, and how does it relate to the specs underneath it?** Contoso's
answer is in the fixture, and it's worth copying.

**One directory per epic, beside — not inside — the features:**

```text
.specify/epics/<slug>/epic.md      # the epic
specs/<nnn-slug>/spec.md           # the features that deliver it
```

`create-epic.sh` creates `.specify/epics/<slug>/` and refuses to overwrite an existing
epic, so a slug collision fails loudly instead of silently replacing someone's framing.

**The link is a table in the epic, not a field in the spec.** `epic-template.md` carries:

```markdown
## Specs under this epic

| Spec | Feature directory | Status |
|---|---|---|
| [name] | `specs/[nnn-slug]/` | Not started |
```

The epic points **down** at its specs rather than each spec pointing **up** at an epic.
That's deliberate: Spec Kit owns `specs/` and regenerates what's in it, so a parent
reference added to a spec template is a field you'd have to defend on every regeneration.
A table in the epic is yours, changes when the epic changes, and gives a reviewer the whole
picture in the one file the epic gate puts in front of them.

> ⚠️ **Nothing enforces this.** It is a convention your `epic` command writes down, not a
> constraint Spec Kit checks — the same honesty that applies to stage ordering (§23.8).

## 23.3 Install and verify the extension

```bash
specify extension add --dev ../labs/fixtures/lab23/contoso-review
specify extension list
```

You should see `contoso-review` with **Commands: 2**.

> 💡 **Prove rule 1 to yourself.** Copy the fixture somewhere temporary, change
> `speckit.contoso-review.epic` to `speckit.contoso.epic`, and install the copy **with
> `--force`** — you already installed `contoso-review` above, and without `--force` you'll
> just get *"Extension 'contoso-review' is already installed"*, which is a different
> failure entirely:
>
> ```bash
> specify extension add --dev /tmp/broken-copy --force
> ```
>
> ```text
> Validation Error: Command 'speckit.contoso.epic' must use extension namespace
> 'contoso-review'
> ```
>
> That check is the reason the id and the command prefix can never drift apart.

**Now collect on Lab 22's promise.** Lab 22's `bundle.yml` pinned
`extension: contoso-review@1.0.0` — this extension — and its validation reported two
unresolved references. One of them is now satisfied:

```bash
specify preset add --dev ../labs/fixtures/lab22/contoso-sdd
specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle
```

```text
Manifest is invalid:
  - Unresolved reference workflow:contoso-sdlc@1.0.0: workflow 'contoso-sdlc' is not
    bundled, installed, or present in any active catalog.
```

The extension line is gone. Only the **workflow** is still unresolved, and that's
[Lab 24](lab24.md)'s to ship.

> ⚠️ **That first command is not optional.** Install the Lab 22 preset too, or
> `preset:contoso-sdd@1.0.0` appears in the output as well and you get **two** lines
> instead of one. A reference resolves if the component is bundled, **installed**, or in
> an active catalog — and you installed this preset in Lab 22's project, not this one.

> 💡 **The overlay you're about to build will _not_ clear that workflow line.** An overlay
> is not a bundle component kind — bundles ship extensions, presets, steps and workflows.
> An overlay is project-local state a bundle doesn't manage, which is also why it survives
> `bundle update`.

## 23.4 Place the stages: the workflow overlay

You never edit the base workflow. You **overlay** it. Open
`labs/fixtures/lab23/overlays/contoso-stages.yml`:

```yaml
id: contoso-stages
extends: speckit
priority: 10

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
```

Install it and look at the result:

```bash
specify workflow overlay add ../labs/fixtures/lab23/overlays/contoso-stages.yml
specify workflow resolve speckit
```

```text
Step attribution:
  • epic: project:contoso-stages
  • review-epic: project:contoso-stages
  • specify: base
  • review-spec: base
  ...
  • implement: base
  • qa-review: project:contoso-stages
  • review-qa: project:contoso-stages
```

Your stages are in, core is untouched, and `resolve` tells you which layer every step
came from.

**Four things about overlays that are not guessable.**

> ⚠️ **It lands under the _extended_ workflow's id, not its own.** The file is now at
> `.specify/workflows/overlays/speckit/contoso-stages.yml` — `speckit`, because that's
> what `extends:` says. Put it under `.../overlays/contoso-stages/` by hand and Spec Kit
> never scans it; the overlay silently does nothing.

> ⚠️ **Anchors must name a step in the _base_ workflow.** You cannot anchor on a step your
> own overlay inserted. This is why both epic edits above anchor on `specify` rather than
> the more natural `insert_after: epic`:
>
> ```text
> Error: Overlay 'contoso-stages' has invalid edits:
>   - Edit 1: anchor 'epic' does not match any base step id.
> ```
>
> Edit indices are **zero-based**, so "Edit 1" is the second edit.

> 💡 **Sibling edits sharing an anchor apply in authoring order** — they are not reversed.
> That's what puts `epic` before `review-epic`, and `qa-review` before `review-qa`. It's
> the mechanism that makes base-only anchoring workable.

> ⚠️ **Two edit forms, and you can't mix them in one edit.** The shorthand above puts the
> operation in the key (`insert_before: specify`). The long form is
> `operation: insert_before` with a separate `anchor: specify`. Using both in a single
> edit fails with *"mixes shorthand operation key … with explicit 'operation' field"*.
> Also: `id` and `extends` take lowercase letters, digits and hyphens — **a dot is
> rejected**, so `contoso.stages` is not a legal overlay id.

## 23.5 Gates that actually stop the work

A gate is a step type, and it is small:

```yaml
- id: review-qa
  type: gate
  message: "QA verdict: approve to close the feature, reject to send it back."
  options: [approve, reject]
  on_reject: retry
```

`message` is required. `options` defaults to `[approve, reject]`.

**`on_reject` accepts exactly three values. There are no others.**

| Value | What rejection does |
|---|---|
| `abort` (default) | The run **fails** and stops here |
| `retry` | The run **pauses on this gate**. Fix the artifact, then resume and answer again |
| `skip` | The gate **completes** and the choice is recorded — downstream steps decide |

> ⚠️ **Do not invent a fourth.** `on_reject: rework` is rejected — *"'on_reject' must be
> 'abort', 'skip', or 'retry'"*. And note **when**: that error appears at
> `specify workflow run`, not at `overlay add` or `resolve`. See §23.8.

> ⚠️ **The trap that costs you a review.** Rejection is matched against the words
> **`reject`** and **`abort`** only. Name your rejection option something friendlier —
> `rework`, `needs-work`, `changes-requested` — and the gate treats it as **approval** and
> walks straight past the review it exists to enforce. There's a partial guard:
> `options` must contain a `reject` or `abort` choice when `on_reject` is `abort` or
> `retry`. But `options: [approve, reject, rework]` satisfies that guard and still
> silently approves whenever a reviewer picks `rework`.

> 💡 **Show the reviewer what they're approving.** A gate can render a file into the
> prompt with `show_file: specs/001-checkout/spec.md` — up to 200 lines. A reviewer who
> has to go and find the artifact usually doesn't.

> ⚠️ **A gate records a choice, not an approver.** The gate is a local pause. Its output
> keeps its own `message`, `options`, `on_reject` and `show_file`, plus the `choice` that
> was made — nothing about who made it — and it lives in the run's `state.json`, which is
> overwritten when the gate runs again. So "someone approves it" means whoever answered
> the prompt. When you need an approval of record, make it a durable GitHub artifact, such
> as a `CODEOWNERS` review on the PR; [Lab 24](lab24.md) builds one.

## 23.6 The rework loop

US-3.3 of this arc asks for rework to be a first-class path. Here is the honest answer:

> ⚠️ **A gate cannot send work back to an earlier stage.** There is no `goto`, no
> `on_reject: <step-id>`, no rewind. `on_reject` is `abort`, `skip` or `retry` — and
> that's the whole surface.

So the loop is built from what does exist. **`retry` is the mechanism:**

1. The reviewer rejects `review-qa`. The run **pauses** — it doesn't fail.
2. You fix the artifact **out of band**: edit the spec, re-run `speckit.plan`, whatever
   the QA review's findings say.
3. `specify workflow resume <run-id>`. The gate **runs again** and can now be approved.

The run state on disk is what makes this safe — the run is parked, not lost, and
`status --json` tells you exactly which step it's parked on.

> ⚠️ **An out-of-band fix skips the earlier gates.** Step 2 happens outside the run, so a
> spec or plan you edit there never goes back through `review-spec` or `review-plan` (or
> `review-epic`, if the epic changed); `resume` re-asks `review-qa` and nothing else.
> That's fine for an implementation-only fix. When the rejection changes the spec or the
> scope, the workflow can't send your edit back through its gate: a new run starts again at
> `epic`, and the `do-while` variant below re-runs commands rather than re-reviewing your
> edit. Get the changed spec or plan reviewed outside the run, for example on the PR that
> changes it, before you resume. [Lab 24](lab24.md) classifies rejections this way.

**Two variants worth knowing.** Use `on_reject: skip` and the gate completes with the
verdict recorded in its output, so a downstream `if` or `switch` step can route the
rejection instead of stopping. And if you genuinely need an earlier stage to **re-run**,
that's a `do-while` (or `while`) step wrapping the stages, looping while the gate's choice
is still a rejection — `max_iterations` defaults to 10. That's a bigger construct than
this lab ships, and it brings the expression language with it.

> ⚠️ **If you do reach for a loop, the `condition` will catch you.** It must be a
> **single complete `{{ }}` block**. Write `condition: inputs.count > 100` and it is never
> evaluated at all — a non-empty string is always truthy, so the loop runs to
> `max_iterations` every time. Spec Kit's validator does flag this, in three different
> flavours. Read the message.

**What happens to `tasks.md` when the spec changes.** Re-running `speckit.tasks`
**regenerates** the file from the template and the current design artifacts. Nothing reads,
preserves or merges the previous `tasks.md`, and every regenerated task comes back
unchecked. So if rework changes the spec, treat the task list as disposable — record
progress in the QA review or your tracker, not in checkboxes you're about to overwrite.

## 23.7 Run it

```bash
specify workflow run speckit
```

The run starts at your `epic` stage, which **dispatches `speckit.contoso-review.epic` to
your coding agent** — so run this where the agent is available, the same way you'd invoke
any Spec Kit command. When the command returns, the run reaches `review-epic`, the gate
renders in your terminal and waits. Then, from another shell or after it pauses:

```bash
specify workflow status                 # every run
specify workflow status <run-id> --json # one run, machine-readable
specify workflow resume <run-id>
```

**Run state lives on disk**, which is why resume works across sessions:

```text
.specify/workflows/runs/<run-id>/
  state.json     # status, current_step_index, current_step_id, step_results, error
  inputs.json    # the inputs the run was started with
  log.jsonl      # append-only event log
  workflow.yml   # the composed workflow this run was started from
```

The run id is an eight-character string. `state.json` is written atomically, so a reader
never sees a half-written file. Note the fourth file: the run keeps **its own copy of the
composed workflow**, so changing an overlay mid-run doesn't retarget a run already in
flight.

> 💡 **Gates don't fail in CI — they pause.** When stdin isn't a terminal, a gate returns
> `PAUSED` instead of prompting. Your pipeline parks the run and a human resumes it later.
> That's a feature, but it does mean an unattended run can stop and wait rather than
> finishing.

## 23.8 The honest caveats

This is the part of the lab that matters most. Four of these are limits, and the fifth
is the one that wastes an afternoon.

**1. Invoking a command directly is not blocked.** The workflow engine *dispatches*
commands; it does not *intercept* them. Nothing stops anyone running `speckit.plan`
straight from their agent and skipping your epic stage entirely — ordering is a convention
**unless** the work is driven through `specify workflow run`.

> 💡 **How you'd invoke it directly depends on the layout**, and it's worth knowing because
> neither form is a dotted slash command:
>
> | Layout | Direct invocation |
> |---|---|
> | `--commands` (this lab) | `--agent speckit.plan` — agents are **not** slash commands |
> | skills (the default) | `/speckit-plan` — hyphenated, in VS Code chat |
>
> `/speckit.plan` is valid on **neither**. The ordering point holds either way.

The second belt is the prerequisite scripts — `check-prerequisites --require-tasks` makes
an implement-phase command refuse to run before `tasks.md` exists. Use both; neither alone
is enforcement.

**2. Hook events are a fixed list, and unknown names fail _silently_.** Core defines
`before_`/`after_` pairs for its own commands only — `specify`, `plan`, `tasks`,
`implement`, `analyze`, `checklist`, `clarify`, `constitution`, `converge` and
`taskstoissues`. Twenty events, and **`before_epic` is not one of them**, because you
cannot hook a phase core doesn't define. **And nothing tells you.** Put `before_epic:` in
`extension.yml` and it validates, installs, and then never fires. No error, no warning —
just a hook that doesn't happen.

> 💡 **Check the list yourself rather than trusting a doc.** The authoritative source is
> the installed command bodies, which is what actually emits the hooks. With the
> `--commands` layout this lab uses, they're in `.github/agents/`:
>
> ```powershell
> Select-String -Path .github\agents\speckit.*.agent.md -Pattern 'hooks\.(before|after)_'
> ```
>
> (On the default **skills** layout it's `.github/skills/speckit-*/SKILL.md` instead.)
> Both return the same twenty events. Spec Kit's own extension API reference has lagged
> that list before — at the pinned release it still names only nine commands and omits
> `converge`. **Derive it, don't read it.**

**3. Feature state is not the Git branch.** The active feature is whatever
`.specify/feature.json` points at. **`git checkout` alone does not switch features** —
commands resolve from that file, not from your branch. It's excluded by a managed
`.specify/.gitignore` because it's machine-local, so it does not travel with the repo.
(`SPECIFY_FEATURE_DIRECTORY` overrides it; `SPECIFY_FEATURE_NO_PERSIST=1` stops scripts
rewriting it when several agents share one checkout.)

**4. A gate cannot rewind the workflow.** Covered in §23.6, repeated because it's the
assumption most people arrive with.

**5. ⚠️ Validation is staged, and a `✓` does not mean what you think.** Each stage checks
different things, and a mistake surfaces only at the stage that looks for it:

| Command | Catches | Misses |
|---|---|---|
| `overlay add` | Manifest shape — dots in `id`, mixed edit forms, bad step ids | Bad anchors, bad `on_reject` |
| `workflow resolve` | Anchors that don't match a base step | Bad `on_reject` |
| `workflow run` | Step config — including `on_reject` | — |

An overlay with `on_reject: rework` passes `overlay add` **and** `resolve` with a tick,
and fails at `run`. **Run all three, in that order, before you believe an overlay works.**

## 23.9 Verify

Run these and confirm each one:

```bash
specify extension list                       # contoso-review, Commands: 2
specify workflow overlay list speckit        # contoso-stages, enabled
specify workflow resolve speckit             # 10 steps, 4 attributed to the overlay
specify workflow run speckit                 # runs the epic command, then stops at the gate
specify workflow status --json               # the paused run, machine-readable
```

> 💡 **`overlay list` takes the workflow id.** Overlays are stored per workflow, so
> `specify workflow overlay list` on its own exits 2 with *"Missing argument
> 'WORKFLOW_ID'"*. Name the workflow you overlaid: `speckit`.

> 💡 **Prove caveat 5 for yourself.** Copy the overlay, change `on_reject` to `rework`,
> `overlay add` it and `resolve` it — both succeed. Then `run` it and watch it fail.
> That's the gap between "it installed" and "it works".

## What you built

- A **Spec Kit extension** declaring two stages your SDLC has and core doesn't, with
  their own templates and scripts, installed without forking anything.
- A **workflow overlay** that inserts those stages and their gates into the base
  workflow, composing above core instead of editing it.
- A **rework path** that parks a run on a gate rather than losing it.

## Key takeaways

- **Declare, then place.** An extension provides the commands; an overlay decides where
  they sit. They are separate artifacts for a reason — the same extension can be placed
  differently by different teams.
- **A command's namespace is its extension's id**, enforced at install. Templates and
  scripts are plain slugs, and `strategy` is preset-only.
- **Overlay anchors name base steps**, the overlay lives under the **extended** workflow's
  id, and sibling edits apply in authoring order.
- **`on_reject` is `abort` | `skip` | `retry`.** There is no backward jump; `retry` plus
  `resume` is the rework loop.
- **Name your rejection option `reject`.** Anything friendlier is read as approval.
- **The tool enforces ordering only inside `specify workflow run`.** Chat is still chat,
  and `check-prerequisites` is your second belt.
- **`✓` is stage-specific.** `overlay add`, `resolve` and `run` check different things.

## Versions and pins

This lab reads every version it depends on from the content registry at
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). No version string
is hardcoded in this file. See the registry's re-verification obligations
before running this lab with a cohort.
