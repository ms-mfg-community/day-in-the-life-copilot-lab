---
title: "Centralized Spec Kit Templates & the Org Catalog"
lab_number: 22
pace:
  presenter_minutes: 7
  self_paced_minutes: 35
registry: docs/_meta/registry.yaml
---

# 22 — Centralized Spec Kit Templates & the Org Catalog

Every team in your org writes specs a little differently. You fix that once —
in an **org preset** — and distribute it the way Spec Kit actually supports:
a preset, a `bundle.yml`, and a catalog that controls what may be installed.
No forks, no copy-paste, no drift.

> ⏱️ Presenter pace: 7 minutes | Self-paced: 35 minutes

**Part of:** Labs 21–26, the enterprise agentic SDLC harness arc — builds on Lab 21.

> ⚠️ **Spec Kit moves fast.** It shipped thirteen releases in the five weeks to
> 2026-09-25, twice within a single day. Nothing in this lab hardcodes a version:
> every command reads the pin from
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). If a flag below
> doesn't exist in your build, check the pin before you check your typing.

References:
- [Lab 18 — Spec-Driven Development with Spec Kit](lab18.md) — the prerequisite
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — `spec_kit_version`
- `labs/fixtures/lab22/` — the preset, bundle and catalog you'll install in this lab

## 22.0 Prerequisites and currency

> 💡 Versions and pins live in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). This lab names no
> version inline — read `spec_kit_version` and substitute it.

You need [Lab 18](lab18.md) done, and the Spec Kit CLI at the pinned release:

🖥️ **In your terminal (from the repository root).** Every path in this lab is relative to
the repo root, and the demo project you create in §22.2 must be a direct child of it —
otherwise the `../labs/fixtures/lab22/...` paths in §22.4, §22.7 and §22.8 will not resolve.

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v<version>
specify check
```

Replace `<version>` with `spec_kit_version` from the registry.

> 💡 The demo projects this lab creates (`contoso-sdd-demo/`, `contoso-commands-demo/`,
> `demo/`) are learner scratch and are gitignored. Delete them when you're done.

## 22.1 The problem, and the fix that isn't

Your platform team writes a good spec template. Teams copy it into their repos.
Six months later there are fourteen versions of it and nobody knows which is
current.

The tempting fix is to **fork Spec Kit** and bake your templates into core.
Don't. Spec Kit released thirteen times in five weeks — a fork turns every one
of those into a merge conflict you own forever, and you will stop merging, and
then you are running a stale SDLC toolchain on purpose.

Spec Kit's answer is a **resolution stack**: your customizations sit *above*
core and compose with it. You never edit core, so upgrading core costs nothing.

## 22.2 Initialize with the Copilot integration

🖥️ **From the repository root:**

```bash
specify init contoso-sdd-demo --integration copilot
cd contoso-sdd-demo
```

You are now one level below the repo root, which is why the fixture paths later in this lab
begin with `../`.

> ⚠️ **There is no `--ai` flag.** It was removed. `--integration` replaces it.
> If you're following an older blog post, this is the first thing that will
> fail you.

### Which layout you want depends on where you work

`--integration copilot` is, in Spec Kit's own words, *"GitHub Copilot in VS Code"* — its
module docstring says so, and both of its layouts register `requires_cli: False`, which
`specify integration list` renders as **`no (IDE)`**. That matters, because **the default
layout and the opt-in layout land in different places for a Copilot CLI user.**

**Default — skills.** One directory per command:

```text
.github/skills/speckit-specify/SKILL.md
.github/skills/speckit-plan/SKILL.md
.github/skills/speckit-tasks/SKILL.md
```

- **In VS Code:** these are chat slash commands. You invoke them with a **hyphen** —
  `/speckit-specify`, not `/speckit.specify`.
- **In Copilot CLI:** these load as **skills** — capabilities the model reaches for on its
  own, listed under `/skills`. **There is no `/speckit-specify` to type.** If you expect a
  slash command here, nothing will happen.

**Opt-in — agents and prompts:**

```bash
specify init contoso-commands-demo --integration copilot --integration-options="--commands"
```

That scaffolds `.github/agents/speckit.<command>.agent.md`, a companion
`.github/prompts/speckit.<command>.prompt.md` for each command, and a `.vscode/settings.json`
merge. Note the **dotted** names here, against the hyphenated skill directories above.

- **In VS Code:** the `.prompt.md` files are the prompt-file layout.
- **In Copilot CLI:** `.github/agents/*.agent.md` **is exactly Copilot CLI's own custom-agent
  format** — the same shape this repo uses for its own agents. So each Spec Kit command
  becomes a **CLI agent**: browse them with `/agent`, name one in a prompt, or run
  `copilot --agent <name> --prompt "…"`. **Restart the CLI after init** — agents are loaded
  at startup.

> 🎯 **For this lab series, choose `--commands`.** Labs 01–20 work in Copilot CLI, and the
> agents layout is the one that gives a CLI user something to invoke. Take the default
> skills layout if your cohort is in VS Code. **The two modes are mutually exclusive** —
> passing both `--skills` and `--commands` is an error.

> 💡 **What you should see** after the plain `--integration copilot` run above:
> `.github/skills/` populated, `.github/prompts/` **absent**, `.github/agents/` **absent**.
> After the `--commands` run: `.github/agents/` and `.github/prompts/` populated instead.
> Run `/agent` in the CLI to confirm the Spec Kit agents are loaded; if they aren't listed,
> you haven't restarted.

Your project constitution lives at **`.specify/memory/constitution.md`**.

## 22.3 The resolution stack

Every file resolves **independently** through four layers, highest precedence
first:

| # | Layer | Location |
|---|---|---|
| 1 | Project-local overrides | `.specify/templates/overrides/` |
| 2 | Installed presets — by priority | `.specify/presets/<id>/` |
| 3 | Installed extensions — by priority | `.specify/extensions/<id>/` |
| 4 | Spec Kit core | `.specify/templates/` |

Priority defaults to `10`; **lower numbers win**; ties break alphabetically by
preset id. Because each file resolves on its own, your `spec-template` can come
from your preset while `plan-template` still comes from core.

When you can't work out which layer won, ask:

```bash
specify preset resolve spec-template
```

> ⚠️ **`preset resolve` takes a _template_ name, not a preset id.**
> `specify preset resolve spec-template` works. `specify preset resolve
> contoso-sdd` does not — that's a preset, and the command will not find it.
> A dotted argument is treated as a *command* name, so
> `specify preset resolve speckit.specify` resolves that command.

> ⚠️ **A preset is a default, not enforcement.** Layer 1 outranks your org preset, so any
> repo can drop a file into `.specify/templates/overrides/` and that version wins, with no
> approval step. If a template mustn't drift, check it in CI: run
> `specify preset resolve <template>` for each template your preset ships, and fail the
> build unless `top layer from:` names your org preset. That catches a project override and
> a competing higher-priority preset alike.

## 22.4 Build the org preset

Open `labs/fixtures/lab22/contoso-sdd/preset.yml`. It overrides three core
templates, and deliberately uses a **different composition strategy for each**:

| Template | Strategy | What happens |
|---|---|---|
| `spec-template` | `replace` *(default)* | Contoso's template supersedes core's entirely |
| `plan-template` | `wrap` | Core's plan is kept, wrapped in Contoso review gates |
| `tasks-template` | `append` | Contoso governance tasks are added after core's list |

The full set is `replace`, `prepend`, `append`, `wrap`. Two details that cost
people time:

- A `wrap` file must contain the literal **`{CORE_TEMPLATE}`** placeholder —
  that's where the lower layer gets substituted. Look at
  `labs/fixtures/lab22/contoso-sdd/templates/plan-template.md`. Delete the
  placeholder and the wrap **cannot produce output**: Spec Kit warns
  `composition error: Wrap strategy … is missing the {CORE_TEMPLATE} placeholder`.
  It does warn — but the resolve output still *looks* like a chain, so read the
  warnings rather than the chain (§22.8).
- **Scripts are different.** They support only `replace` and `wrap`, and a
  script wrapper uses **`$CORE_SCRIPT`**, not `{CORE_TEMPLATE}`.

Note also that `name:` and `file:` do different jobs. `name:` says *which*
template to compose with; `file:` says where this content lives. That's why the
`append` entry lives in `tasks-governance.md` while composing onto
`tasks-template`.

Install it from the local directory:

```bash
specify preset add --dev ../labs/fixtures/lab22/contoso-sdd
specify preset list
specify preset resolve plan-template
```

> 💡 **What you should see:** `preset list` prints presets in precedence order,
> highest first. `preset resolve plan-template` shows a **composition chain**
> rather than a single file — the wrapper on top, core underneath.

## 22.5 The trap: `--preset` does not take a URL

`specify init --preset` accepts **an ID, a bundled preset name, or a local
directory**. It does not accept a URL. What makes this dangerous is how it
fails:

```bash
specify init demo --integration copilot --preset https://example.com/preset.zip
```

```text
Warning: Preset 'https://example.com/preset.zip' not found in catalog. Skipping.
```

> ⚠️ **That is a warning, not an error.** `init` continues and **exits 0**. You
> get a green run and a project with none of your templates. Nothing tells you
> again. Check `specify preset list` after init if you passed `--preset`.

To install from a URL, do it **after** init:

```bash
specify preset add --from https://example.com/preset.zip
```

`--from` takes a `.zip`, `.tar.gz` or `.tgz` archive URL. Use `--dev <path>`
for a local directory, and `--priority <N>` to place it in the stack.

## 22.6 The org catalog as a supply-chain control

Your compliance owner wants developers to **discover** community presets freely
but **install** only reviewed ones. That's a catalog.

Copy `labs/fixtures/lab22/preset-catalogs.yml` to `.specify/preset-catalogs.yml`
and read it. It declares two catalogs: your org's, with `install_allowed: true`,
and the community one with `install_allowed: false`.

```bash
specify preset search governance
specify preset add <a-community-preset-id>
```

> 💡 **What you should see:** search returns community results — discovery works. (The
> Contoso catalog URL in the fixture is illustrative and unreachable, so it contributes
> nothing; in your org it would.) The install is **refused**, and the refusal names the
> `--from <archive-url>` form to use instead. That's the point: discovery-only is a
> **redirect into review**, not a wall.

> ⚠️ **The big one — catalog config *replaces* the defaults, it does not merge.**
> Spec Kit resolves catalogs in this order and returns the **first layer that
> exists**:
>
> 1. `SPECKIT_PRESET_CATALOG_URL` — one catalog, replacing everything
> 2. `.specify/preset-catalogs.yml` — your project
> 3. `~/.specify/preset-catalogs.yml` — your user
> 4. the built-in stack: `default` (installable) + `community` (discovery-only)
>
> The moment step 2 exists, **step 4 never runs**. Create a project catalog
> config and the built-in catalogs are gone — which is why the fixture
> re-declares `community` explicitly. If you add your org catalog and your
> developers suddenly can't find *any* community preset, this is why.

You can also add a catalog from the CLI instead of editing the file by hand. **Do one or the
other, not both** — if you copied the fixture above, `contoso-approved` already exists:

```bash
specify preset catalog add https://raw.githubusercontent.com/contoso/spec-kit-catalog/main/catalog.json \
  --name contoso-approved --priority 1 --install-allowed \
  --description "Contoso-reviewed presets. Installable."
specify preset catalog list
```

> 💡 As of the pinned release, `preset catalog add` is **idempotent** — re-running it with a
> *byte-identical* entry is a silent no-op rather than an error. "Identical" means all of
> `url`, `priority`, `install_allowed` **and `description`** match; that's why
> `--description` is passed above, to match the fixture exactly. Reuse the same `--name` with
> *any* field different and the add is **refused** with
> `Warning: A catalog named 'contoso-approved' already exists.` and a non-zero exit —
> use `specify preset catalog remove` first.

The catalog file itself is JSON — see `labs/fixtures/lab22/catalog.json` for the
shape your org would publish.

## 22.7 One versioned install: `bundle.yml`

A preset is one piece. Real org standards are a preset **plus** an extension
**plus** a workflow, and they have to move together. That's a bundle.

Open `labs/fixtures/lab22/contoso-sdd-bundle/bundle.yml`:

```yaml
provides:
  presets:
    - id: "contoso-sdd"
      version: "1.0.0"
      priority: 5
      strategy: "replace"
  extensions:
    - id: "contoso-review"
      version: "1.0.0"
  workflows:
    - id: "contoso-sdlc"
      version: "1.0.0"
```

One bundle version pins one version of each component. Install the bundle and
you get all three; upgrade the bundle and all three move together — so a repo
can never end up running this quarter's preset against last quarter's workflow.

> ⚠️ **A preset reference requires both `priority` and `strategy`.** Omit either
> and `specify bundle validate` rejects the bundle. Neither bundle shipped with
> Spec Kit declares a preset, so there's no built-in example to copy — this is
> the shape.

> 💡 `contoso-review` and `contoso-sdlc` are **referenced here but built later**:
> the extension in [Lab 23](lab23.md), the workflow in [Lab 24](lab24.md). This
> lab teaches the packaging; the arc fills in the components.

Validate before you publish:

```bash
specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle --offline
```

> ⚠️ **Two flags, both load-bearing.** `--path` is needed because `validate` defaults to
> `bundle.yml` in the *current* directory, and you are standing in your project, not the
> bundle. `--offline` is needed because **online validation resolves every reference** — and
> two of these three don't exist yet:
>
> ```text
> Manifest is invalid:
>   - Unresolved reference extension:contoso-review@1.0.0: extension 'contoso-review' is
>     not bundled, installed, or present in any active catalog.
>   - Unresolved reference workflow:contoso-sdlc@1.0.0: workflow 'contoso-sdlc' is not
>     bundled, installed, or present in any active catalog.
> ```
>
> Note which reference is **not** in that list: `preset:contoso-sdd` resolves, because you
> installed it in §22.4. A reference is satisfied if the component is **bundled, installed,
> or in an active catalog** — any one of the three. That's the rule the error message states,
> and `--dev` satisfies it by installing.
>
> `--offline` skips reference resolution and checks the manifest's **structure** instead,
> which is what you want while components are still being built:
>
> ```text
> ! Could not verify extension 'contoso-review' offline (not bundled or installed);
>   re-run validate online to check catalogs.
> ! Could not verify workflow 'contoso-sdlc' offline (not bundled or installed);
>   re-run validate online to check catalogs.
> ✓ contoso-sdd is well-formed and valid.
> ```
>
> Those `!` lines are expected — `--offline` is telling you what it *didn't* check. Once
> Labs 23 and 24 ship the components, the online form passes too.

## 22.8 Verify

Run these and confirm each one:

```bash
specify preset list                      # your preset, in precedence order
specify preset resolve spec-template     # resolves to the preset (replace)
specify preset resolve plan-template     # shows a composition chain (wrap)
specify preset catalog list              # org: install allowed; community: discovery only
specify bundle validate --path ../labs/fixtures/lab22/contoso-sdd-bundle --offline
```

> 💡 **Prove the `wrap` really depends on the placeholder.** Delete `{CORE_TEMPLATE}` from
> `labs/fixtures/lab22/contoso-sdd/templates/plan-template.md`, reinstall the preset, and
> re-run the resolve:
>
> ```bash
> specify preset remove contoso-sdd
> specify preset add --dev ../labs/fixtures/lab22/contoso-sdd
> specify preset resolve plan-template
> ```
>
> **`preset add` will not overwrite an installed preset** — it exits 1 with
> `Preset 'contoso-sdd' is already installed. Use 'specify preset remove contoso-sdd'
> first.` and there is no `--force`. Remove, then add. (Don't reach for `preset update`
> here: it is deliberately destructive, and for a `--dev` install it removes the preset and
> then fails to find it in any catalog.)
>
> The chain still *renders* — the chain is built from strategies, not from the placeholder —
> but Spec Kit now warns:
>
> ```text
> Warning: composition error: Wrap strategy in 'contoso-sdd v1.0.0' is missing the
> {CORE_TEMPLATE} placeholder. The wrapper must contain {CORE_TEMPLATE} to indicate
> where the lower-priority content should be inserted.
> Warning: composition cannot produce output (no base layer with 'replace' strategy)
> ```
>
> **Read the warnings, not the chain.** Put the placeholder back.
>
> The fixture deliberately contains the token **exactly once** — Spec Kit substring-matches
> the whole file, so a second mention in a comment would satisfy the check and hide the
> deletion.

## What you built

- An **org preset** overriding three core templates, using three different
  composition strategies, installed without forking anything.
- An **org catalog** that lets developers discover widely and install narrowly.
- A **bundle** that pins preset, extension and workflow as one versioned unit.

## Key takeaways

- **Never fork Spec Kit.** The release cadence makes it a permanent merge tax.
  Compose above core instead.
- **`--ai` is gone; use `--integration`.** `--integration copilot` is Spec Kit's **VS Code**
  integration (`requires_cli: False`). It installs **skills** by default at
  `.github/skills/speckit-<command>/SKILL.md` — chat slash commands `/speckit-<command>` in
  VS Code, but in **Copilot CLI** they are model-invoked skills with **no slash command**.
  `--integration-options="--commands"` writes `.github/agents/speckit.<command>.agent.md`,
  which **is** Copilot CLI's custom-agent format — reachable via `/agent` after a restart.
  **Working in the CLI? Take `--commands`.**
- **`init --preset` takes an ID, a bundled name, or a directory — never a URL**,
  and it fails by *warning and continuing*. Use `preset add --from <url>` after init.
- **A project catalog config replaces the built-in catalogs.** Re-declare
  anything you still want.
- **`preset resolve` takes a template name**, and it's the fastest way to answer
  "which layer won?"
- The constitution lives at **`.specify/memory/constitution.md`**.

## Versions and pins

This lab reads every version it depends on from the content registry at
[`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml). No version string
is hardcoded in this file. See the registry's re-verification obligations
before running this lab with a cohort.
