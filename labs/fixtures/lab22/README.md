# Lab 22 fixtures — Contoso SDD Standards

The artifacts [Lab 22](../../lab22.md) builds. Each one is real and installable,
so you can run the lab's commands against these files rather than retyping them.

> ⚠️ **The `contoso` URLs in these files are illustrative and unreachable by
> design.** Nothing in Lab 22 fetches them. The preset is installed from this
> directory with `--dev`, which needs no network. They are here so the manifests
> look like the real thing, because in production they would be real.

| Path | What it is | Used by |
|---|---|---|
| `contoso-sdd/preset.yml` | The org preset manifest. Demonstrates all three composition strategies | Step 3 |
| `contoso-sdd/templates/spec-template.md` | `replace` — supersedes core's spec template outright | Step 3 |
| `contoso-sdd/templates/plan-template.md` | `wrap` — contains the `{CORE_TEMPLATE}` placeholder | Step 3 |
| `contoso-sdd/templates/tasks-governance.md` | `append` — a fragment added after core's task list | Step 3 |
| `preset-catalogs.yml` | The org catalog config. Copy to `.specify/preset-catalogs.yml` | Step 5 |
| `catalog.json` | The org catalog `preset-catalogs.yml` points at | Step 5 |
| `contoso-sdd-bundle/bundle.yml` | Pins preset + extension + workflow as one versioned install | Step 6 |

## Two things worth knowing before you read them

**`preset-catalogs.yml` replaces the built-in catalogs — it does not add to them.**
Spec Kit returns the first catalog layer that exists, so creating this file removes
the built-in `default` and `community` catalogs from the active set. That is why the
file re-declares `community` explicitly. See the comment at the top of the file.

**The bundle pins two components this lab does not ship.** `contoso-review` (an
extension) and `contoso-sdlc` (a workflow) are built in [Lab 23](../../lab23.md) and
[Lab 24](../../lab24.md). Lab 22 teaches the *packaging*; the components arrive later
in the arc. The bundle is deliberately shown whole so the shape is clear.

## Versions

No Spec Kit version is hardcoded here. `speckit_version: ">=1.0.0"` is a
compatibility floor, not a pin — the pinned release lives in
[`docs/_meta/registry.yaml`](../../../docs/_meta/registry.yaml). The `1.0.0` values
in these files are *Contoso artifact* versions and have nothing to do with the Spec
Kit release.
