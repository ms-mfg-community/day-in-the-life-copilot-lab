# Lab 23 fixtures — custom SDLC stages, gates and the rework loop

The artifacts [Lab 23](../../lab23.md) installs. Two things live here: a Spec Kit
**extension** that declares the stages, and a workflow **overlay** that places them.

> ⚠️ Every `contoso` URL, author and repository in these files is **illustrative and
> unreachable**. Nothing here resolves to a real catalog or download.

## What's here

| Path | What it is | Used by |
|---|---|---|
| `contoso-review/extension.yml` | The extension manifest — two commands, two templates, one declared script | §23.2, §23.3 |
| `contoso-review/commands/speckit.contoso-review.epic.md` | The epic stage's command | §23.2 |
| `contoso-review/commands/speckit.contoso-review.qa-review.md` | The QA-review stage's command | §23.2 |
| `contoso-review/templates/epic-template.md` | The epic's output shape | §23.2 |
| `contoso-review/templates/qa-review-template.md` | The QA verdict's output shape | §23.2 |
| `contoso-review/scripts/bash/create-epic.sh` | Creates `.specify/epics/<slug>/` and seeds it | §23.2 |
| `contoso-review/scripts/powershell/create-epic.ps1` | PowerShell twin of the above | §23.2 |
| `overlays/contoso-stages.yml` | The workflow overlay that places the stages and their gates | §23.4, §23.5 |

## Three things that are easy to get wrong

**1. The overlay's source path here is not where it lives once installed.**

```text
labs/fixtures/lab23/overlays/contoso-stages.yml     <- the source, in this repo
.specify/workflows/overlays/speckit/contoso-stages.yml   <- where `overlay add` puts it
```

The directory under `overlays/` is the id of the workflow being **extended**
(`speckit`), not the overlay's own id. Spec Kit refuses to load an overlay stored
under a directory that disagrees with its `extends` value.

**2. Command names are namespaced to the extension id; templates and scripts are not.**

`extension.id` is `contoso-review`, so both commands must be
`speckit.contoso-review.<name>`. Using `speckit.contoso.epic` fails at install with
*"Command 'speckit.contoso.epic' must use extension namespace 'contoso-review'"*.
Template and script names are plain slugs (`epic-template`, `create-epic`) with no
prefix and no dots.

**3. `strategy` is not authorable on an extension's templates.**

Lab 22's preset used `replace`, `wrap` and `append`. Those are **preset-only**.
Extension-provided templates always replace, and a `strategy:` key here is rejected
outright rather than ignored.

## Why one script entry covers two files

`provides.scripts` takes one `file` per entry, and its `runtimes` list is
**informational metadata only** — Spec Kit does not use it to select or invoke
anything. So the bash script is declared and the PowerShell twin ships beside it,
chosen by the command at run time. Spec Kit's own `git` extension does the same
thing, and declares no `provides.scripts` at all.

## Relationship to Lab 22

Lab 22's `bundle.yml` pins `extension: contoso-review@1.0.0` — **this extension**.
Installing it resolves that reference, which you can prove:

```bash
specify extension add --dev ../labs/fixtures/lab23/contoso-review
specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle
```

The online validation now reports only the **workflow** as unresolved:

```text
Manifest is invalid:
  - Unresolved reference workflow:contoso-sdlc@1.0.0: workflow 'contoso-sdlc' is not
    bundled, installed, or present in any active catalog.
```

That remaining reference is [Lab 24](../../lab24.md)'s to satisfy. **The overlay in
this directory does not resolve it** — an overlay is not a bundle component kind, so
it cannot stand in for a workflow.
