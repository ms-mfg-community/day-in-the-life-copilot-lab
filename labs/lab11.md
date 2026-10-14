---
title: "Building & Distributing a Copilot Plugin (Enterprise Marketplace Pattern)"
lab_number: 11
pace:
  presenter_minutes: 6
  self_paced_minutes: 45
registry: docs/_meta/registry.yaml
---

# 11 — Building & Distributing a Copilot Plugin (Enterprise Marketplace Pattern)

In this lab you will scaffold a plugin from the repo's `plugin-template/` (an
agent + skill + hook bundle), read through how it is published to a **private
org-internal registry repo** and installed into a fresh workspace, and
evaluate an allowlist policy against sample install sources. The policy
exercise is a local simulation of the allow-or-deny decision; real, central
enforcement is the managed-settings path in §11.3 and [Lab 16](lab16.md).

> ⏱️ Presenter pace: 6 minutes | Self-paced: 45 minutes
>
> The 6-minute presenter pace is a selective preview (the §11.1 anatomy and a
> look at the policy file), not a complete guided walkthrough. Both figures
> are planning estimates, not measurements.

> 📋 **Before you start.** This is an **advanced**-tier lab with a **mixed**
> surface. §11.1, §11.2, §11.5 and §11.7 are local file and `node` work.
> §11.3 and §11.4 describe an org-registry flow that you read along with,
> because `contoso-internal` is a made-up org.
>
> - **You already know:** how to work in a terminal (Bash/WSL or PowerShell)
>   and a text editor, plus custom agents ([Lab 03](lab03.md)), skills and
>   prompts ([Lab 04](lab04.md)) and hooks ([Lab 06](lab06.md)). The template
>   bundles one of each, and this lab does not re-teach them.
> - **You have:** a clone of this repository and Node.js with npm (a current
>   LTS release). Only the read-along in §11.3 and §11.4 needs the Copilot
>   CLI, at or above `copilot_cli_version_floor` in
>   [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).
> - **Install the dependencies once, from the repository root:** run
>   `npm ci` (the same in Bash and PowerShell).
>   `plugin-template/scripts/install.mjs` and the §11.5 snippet import
>   `js-yaml`, and the §11.7 checks run on Vitest. A fresh clone has none of
>   them, so a `Cannot find package 'js-yaml'` error means this step was
>   skipped.

> 💡 **Enterprise context:** The Copilot plugin marketplace is where teams
> share reusable agents, skills, hooks, and MCP wiring. In regulated or
> large-org environments you do **not** want developers pulling plugins from
> random public sources. This lab teaches the pattern:
> private registry → allowlist policy → signed releases → SBOM → reproducible
> install. The `plugin-template/` directory at the repo root is a teaching
> scaffold for that pattern; §11.1 explains how its `manifest.yaml` relates to
> the `plugin.json` that the Copilot CLI reads natively.

References:
- [Finding and installing plugins](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing)
- [Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference) — the native `plugin.json`, install sources, marketplace pinning
- [Awesome Copilot marketplace](https://github.com/github/awesome-copilot)
- [Enterprise managed settings (GA, 2026-07-01)](https://github.blog/changelog/2026-07-01-enterprise-managed-settings-json-is-generally-available/)
- [`plugin-template/README.md`](../plugin-template/README.md)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — CLI version floor, model tiers, managed-settings keys

## 11.0 Copilot CLI currency (2026 refresh)

<!-- @include docs/_partials/currency.md — do not edit inline; edit the partial and re-sync. -->
> 💡 Commands below reflect the current Copilot CLI surface as of this lab
> refresh (CLI floor per [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml):
> see `copilot_cli_version_floor`). Versions, model tiers, and MCP server pins
> live in the registry — labs reference it rather than hardcoding values, so a
> single registry update propagates everywhere.

> 🆕 **Terminal UX refresh (confirmed GA, ~Aug 2026):** `/plugin`, `/mcp`, and
> `/skills` are real interactive commands backed by an in-terminal dashboard —
> you can discover, install, and configure plugins, MCP servers, and skills
> without hand-editing config files. The terminal also gained tabs for
> browsing issues/PRs/gists. Config-file editing still works and is what the
> underlying `extensions_manage` MCP tool inspects, but the dashboard is now
> the primary interactive path for a human at the prompt.

| Capability | Command / surface | Use when |
|------------|-------------------|----------|
| **Install a plugin** | `/plugin install owner/repo` (or the `/plugin` dashboard) | Pulling a packaged multi-agent or skill bundle from a marketplace or org-internal plugin source. |
| **Parallel subagents** | `/fleet` | Fanning work out across multiple short-lived workers under one orchestrator (see [Lab 14 — Orchestrator + tmux](../labs/lab14.md)). |
| **Plan mode vs autopilot mode** | `Shift+Tab` toggles plan mode; autopilot mode is the default | Plan-heavy work (design, decomposition) runs in plan mode; well-scoped execution runs in autopilot mode. |
| **Mid-session model switch** | `/model <tier-or-id>` | Upshift to `models.premium` (per [`registry.yaml`](../docs/_meta/registry.yaml)) for hard reasoning; downshift to `models.cheap` for tool-heavy loops. Note: an enterprise's global model-default-availability policy (see [Lab 17](../labs/lab17.md)) may make additional models selectable here even if the registry's curated tiers don't list them. |
| **Local tool discovery (model-side)** | `extensions_manage` MCP tool, `operation: "list"` / `"inspect"` / `"guide"` / `"scaffold"` | The agent enumerating which agents, skills, hooks, and extensions are contributing to the session before wiring a handoff. Invoke as a tool call (e.g. `extensions_manage({operation: "list"})`), **not** as `/extensions_manage` — there is no such slash command. |
| **Local tool discovery (user-side)** | `/skills`, `/plugin`, `/mcp` | The human listing or managing skills, plugins, and MCP servers from the prompt via the in-terminal dashboard. These are real built-in slashes; `/extensions manage` and `/extensions mode` are **not** — use `Shift+Tab` to toggle plan/autopilot modes. |
| **LSP-backed code intelligence** | Automatic — no slash command | Copilot CLI transparently prefers a configured language server over text search for go-to-definition, find references, rename, and call hierarchy. See [Lab 15 — LSP & Code Intelligence](../labs/lab15.md). |
<!-- @end-include docs/_partials/currency.md -->

## 11.1 Anatomy of a Plugin

Open [`plugin-template/`](../plugin-template/) in your editor. This template
is a directory with:

| File / dir | Purpose |
|------------|---------|
| `manifest.yaml` | Name, version, description, `minimum_cli_version`, entrypoints, MCP server declarations. |
| `agents/*.md` | Bundled custom agents. |
| `skills/*/SKILL.md` | Bundled skills (capability prompts). |
| `hooks/*.sh` (or `.ps1`) | Pre/post tool-use hooks shipped with the plugin. |
| `prompts/*.prompt.md` | Bundled slash prompts. |
| `org-policy.example.yaml` | Optional: a template for org-level allowlist policy. |
| `.github/workflows/release.yml` | Tag → GitHub Release → SBOM + provenance. |
| `CODEOWNERS` | Enforces review on manifest, policy, and release workflow. |
| `README.md` | Versioning guidance, `COPILOT_PLUGIN_REGISTRIES` pinning, deprecation/migration. |

**Key contract:** `manifest.yaml → minimum_cli_version` must equal
`docs/_meta/registry.yaml → copilot_cli_version_floor`. CI enforces this
(see `tests/plugin-template/manifest-schema.test.ts`).

> ℹ️ **`manifest.yaml` is this template's own manifest, not the CLI's native
> one.** It is read by `scripts/install.mjs`, the repo's dry-run simulator
> (§11.2). The Copilot CLI itself loads a plugin from a manifest named
> `plugin.json` (see the
> [plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)),
> and this template does not ship one. The supply-chain pattern in this lab
> is the same either way; to publish a plugin that the CLI loads natively, add
> a `plugin.json` as the plugin reference describes.

## 11.2 Scaffold a Plugin with `extensions_manage`

> ℹ️ **A note on the tool in this heading.** In current Copilot CLI builds the
> `extensions_manage` tool (its `guide` and `scaffold` operations) authors
> **Node.js extensions** at `.github/extensions/<name>/extension.mjs`. It does
> not author a plugin shaped like `plugin-template/`, so this section
> scaffolds by copying the template instead.

🖥️ **From the repo root, in a terminal:**

1. Copy the template to `./my-plugin`. If `my-plugin/` already exists, remove
   it first: copying onto an existing directory nests the template inside it.

   **WSL/Bash:**
   ```bash
   cp -a plugin-template my-plugin
   ```

   **PowerShell:**
   ```powershell
   Copy-Item -Recurse plugin-template my-plugin
   ```

   `my-plugin/` is a scratch copy for this lab; §11.8 removes it.

2. Dry-run the installer. It reads `manifest.yaml` and checks that every
   entrypoint resolves. With no argument it checks `plugin-template/`; pass a
   directory to check your copy:

   **WSL/Bash:**
   ```bash
   node plugin-template/scripts/install.mjs             # checks the template itself
   node plugin-template/scripts/install.mjs my-plugin   # checks your copy from step 1
   ```

   **PowerShell:**
   ```powershell
   node plugin-template/scripts/install.mjs             # checks the template itself
   node plugin-template/scripts/install.mjs my-plugin   # checks your copy from step 1
   ```

3. Confirm each run prints `ok=true`, followed by a JSON line that lists the
   resolved entrypoints (agents, skills, hooks, prompts). The first line says
   `plugin-template dry-run` even when you pass `my-plugin`; that label is
   fixed. A non-zero exit means the check failed, and the output names what is
   missing. If you skipped step 1, the `my-plugin` run exits 2 with
   `manifest.yaml not found`, because that directory does not exist.

## 11.3 Publish to a Private Org Registry

> ℹ️ **Illustrative — substitute your own org.** `contoso-internal` and
> `contoso-internal/contoso-copilot-plugins` are example names, and that repo
> does not exist. Read the install commands in this section and in §11.4 as
> the shape of the flow, and replace the org and repo with ones you control
> before you try them.

The canonical enterprise pattern is a **private org repo** named something
like `contoso-internal/contoso-copilot-plugins` that hosts one or more
plugins. Consumers install with:

```sh
copilot plugin install contoso-internal/contoso-copilot-plugins
```

In current Copilot CLI builds, `copilot plugin install` takes one source:
`owner/repo`, `owner/repo:path/to/plugin` for a plugin in a subdirectory, a Git
URL, or `plugin@marketplace` after you register the marketplace with
`copilot plugin marketplace add`. It has no `--ref` option. To pin a version,
set `ref` (for example, a release tag) or a full 40-character `sha` in the
marketplace entry's `source` object, as the
[plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference)
describes.

To pin the org registry so developers cannot accidentally install from
elsewhere, set the environment variable at the org onboarding layer
(devcontainer, CI image, shell profile):

**WSL/Bash:**
```bash
export COPILOT_PLUGIN_REGISTRIES="contoso-internal/contoso-copilot-plugins"
```

**PowerShell:**
```powershell
$env:COPILOT_PLUGIN_REGISTRIES = "contoso-internal/contoso-copilot-plugins"
```

> ⚠️ **Confirm your build honours it.** `COPILOT_PLUGIN_REGISTRIES` is the
> convention in `plugin-template/README.md`. As of October 2026 it is not
> listed in `copilot help environment` or in the plugin reference, so treat it
> as a pin to verify, not a guaranteed control. The centrally enforced control
> is the managed-settings mechanism below.

> 🆕 **GA enterprise mechanism (confirmed, 2026-07-01):** for GitHub
> Enterprise Cloud customers, the `COPILOT_PLUGIN_REGISTRIES` env var above
> is a *local/devcontainer-level* pin. The **official, centrally enforced**
> mechanism is `managed-settings.json`, configured once by an enterprise
> admin via the **AI Controls** tab in enterprise settings and stored at
> **`copilot/managed-settings.json`** in the enterprise's chosen source
> organization's `.github-private` repo (an older `.github/copilot/settings.json`
> path is kept for backward compatibility, but `copilot/managed-settings.json`
> is the current canonical path). It is fetched by Copilot clients (VS Code
> and Copilot CLI today) and **takes precedence over** any local/file-based
> config for the keys it sets (the full order is
> `enterprise_managed_settings.precedence_order` in the registry). GitHub keeps
> adding supported keys, so read them from
> `enterprise_managed_settings.supported_keys` in
> [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) (a floor, per the
> registry's own comment), not from a list frozen in this lab. This repo's
> `org-policy.example.yaml` + `policy.mjs` (below)
> models the same deny-by-default allowlist *idea* in a portable,
> framework-agnostic way you can adapt for CI gating regardless of which
> enterprise settings mechanism you're on — but for a real GitHub Enterprise
> Cloud rollout, configure `strictKnownMarketplaces`/`enabledPlugins` in
> `managed-settings.json` as the source of truth. See [Lab 16](lab16.md) for
> the full walkthrough of this GA mechanism, including the schema and rollout
> steps.

### Release workflow

`plugin-template/.github/workflows/release.yml` fires on push of a
`vMAJOR.MINOR.PATCH` tag and:

- Validates the manifest version matches the tag.
- Generates a **CycloneDX SBOM** (`sbom.cdx.json`) via `anchore/sbom-action`.
- Attests build provenance via `actions/attest-build-provenance`.
- Creates a GitHub Release with auto-generated notes + SBOM attached.

## 11.4 Install into a Fresh Workspace & Verify

> ℹ️ **Illustrative — substitute your own org.** These steps use the example
> repo from §11.3, which does not exist, so replace `contoso-internal` with
> your own org and repo or read along without running them. The CLI loads a
> plugin through a `plugin.json` (see the note in §11.1), which this template
> does not ship, so add one to the repo you publish.

🖥️ **In a clean directory (simulating a consumer machine):**

1. Install the plugin. Inside a Copilot CLI session, run:
   ```
   /plugin install contoso-internal/contoso-copilot-plugins
   ```
   From a terminal, the equivalent is the `copilot plugin install` command
   from §11.3.

2. Verify it loaded: run `copilot plugin list` in a terminal, or `/plugin list`
   inside a session, and look for your plugin's name
   (`contoso-copilot-starter` if you kept the template's name) with its
   version and status.

   > ℹ️ The `extensions_manage` tool's `list` and `inspect` operations cover
   > running Node.js extensions, not installed plugins, so they will not show
   > this plugin.

3. If your build offers the bundled `/example` prompt, run it. It should
   confirm plugin name + version. A `prompts/` directory is this template's
   convention, and the plugin reference does not list it as a plugin
   component, so if `/example` is not offered, skip this step.

## 11.5 Enforce an Org Allowlist Policy

> ℹ️ **This section is a decision simulation.** `policy.mjs` is a small local
> evaluator that answers "would this source be allowed?" for a policy file.
> Nothing connects it to the Copilot CLI's installer, so running it blocks no
> installation. Central enforcement is the managed-settings path in §11.3,
> which [Lab 16](lab16.md) takes further. Here you read a policy and check its
> decisions.

Open [`plugin-template/org-policy.example.yaml`](../plugin-template/org-policy.example.yaml).
It expresses **deny-by-default** with an explicit allowlist:

```yaml
default_action: deny
allowlist:
  - source: "contoso-internal/contoso-copilot-plugins"
  - source: "contoso-internal/*"
  - source: "github/awesome-copilot"
require:
  signed_releases: true
  sbom: true
```

The evaluator (`plugin-template/scripts/policy.mjs`) supports segment-wildcard
globs. As an illustration only, a CI job in your own pipeline could call
`isAllowed(policy, source)` and exit non-zero on `allowed: false`. This lab
does not build that job, and a CI check alone does not stop a developer from
installing a plugin on their own machine.

> ⚠️ **`require:` is declared intent, not enforcement.** `isAllowed` evaluates
> only `default_action` and the allowlist, and it never reads `require:`. An
> allowlisted source therefore returns `allowed: true` even when its release
> carries no signature and no SBOM. Enforce signing and SBOMs in the release
> pipeline (see **Release workflow** in §11.3), not in this evaluator.

🖥️ **Try it, from the repo root:**

The same command runs unchanged in WSL/Bash and PowerShell: the outer quotes
are double and the inner quotes are single. It needs the `js-yaml` package
that `npm ci` installed (see **Before you start**).

```sh
node -e "import('./plugin-template/scripts/policy.mjs').then(m => {
  const yaml = require('js-yaml');
  const fs = require('fs');
  const policy = yaml.load(fs.readFileSync('plugin-template/org-policy.example.yaml','utf8'));
  console.log(m.isAllowed(policy, 'random-user/untrusted-plugin'));
  console.log(m.isAllowed(policy, 'contoso-internal/anything-else'));
})"
```

You should see the first call return `allowed: false` and the second
`allowed: true` (matched the `contoso-internal/*` glob).

## 11.6 Deprecation & Migration

- **Never delete a shipped version.** Keep every published release
  installable and announce a deprecation in the README and the release notes,
  naming the replacement as `<name>@<version>`. Do not add `deprecated` or
  `migration_to` to `manifest.yaml`: the manifest schema allows no extra
  fields, so the §11.7 schema check would fail.
- Document breaking changes with a `BREAKING:` prefix in release notes —
  the release workflow includes them verbatim.
- Declare `signed_releases: true` and `sbom: true` under `require:` in the org
  policy to record what every release must carry. The sample evaluator does
  not read `require:` (§11.5), so enforce it where the release is built: the
  workflow in §11.3 generates the SBOM and attests build provenance.

## 11.7 Check your work

✅ `plugin-template/manifest.yaml` validates against
`tests/plugin-template/manifest.schema.json`.

✅ `node plugin-template/scripts/install.mjs` prints `ok=true`.

✅ `isAllowed(policy, "random-user/x")` returns `allowed: false`.

✅ `npm test` stays green — the four `tests/plugin-template/*` suites
(`install-dry-run`, `install-runs`, `manifest-schema`,
`org-policy-allowlist`) enforce this contract on every PR. To run only
the plugin-template suites locally, use `npx vitest run tests/plugin-template`.

## What's next

Lab 12 takes the same "configuration as a product" mindset into the data
plane with Fabric MCP + notebooks. Lab 16 goes deeper into the GA
enterprise-managed-settings mechanism this lab introduced above. Labs 13
and 14 wire multi-plugin workspaces into A2A orchestration and tmux-driven
execution patterns.

- [Lab 12](lab12.md) — Fabric MCP with Copilot CLI & VS Code (data-plane
  MCP, offline Parquet fallback, notebook hygiene).
- [Lab 13](lab13.md) — A2A concepts with Copilot CLI ACP (implementer +
  critic, trust boundaries, hand-off schema).
- [Lab 14](lab14.md) — Orchestrator + tmux deep-dive (the pattern that
  built this repo; operationalises Lab 13's hand-off schema).
- [Lab 16](lab16.md) — Enterprise marketplace & plugin governance: the
  full `managed-settings.json` schema, `strictKnownMarketplaces`
  allowlisting, and the AI Controls admin surface.

## 11.8 Cleanup

From the repo root, delete the `my-plugin/` copy you made in §11.2 (skip this if you never made it): `rm -rf my-plugin` in WSL/Bash, or `Remove-Item -Recurse -Force my-plugin -ErrorAction SilentlyContinue` in PowerShell.

<!-- @include docs/_partials/cleanup.md — do not edit inline; edit the partial and re-sync. -->
> 🧹 **Cleanup — leave the machine the way you found it.**
> Run this checklist before moving to the next lab. Per-lab specifics (named
> agent / hook / extension files this lab created) should already have been
> reverted in the steps above; this is the generic sweep that catches the
> long-tail.

🖥️ **In your terminal:**

1. **Stop background processes.** Anything you started in the foreground with
   `&` or in another tmux pane (dev servers, watchers, `gh aw` long-runs,
   tail-follows). If you used the bash tool in async mode, make sure those
   shells are stopped.

   **WSL/Bash:**
   ```bash
   jobs -l                       # any background jobs in this shell?
   # kill them by PID — never `pkill`/`killall`
   ```

   **PowerShell:**
   ```powershell
   Get-Job                       # any background jobs?
   Get-Job | Stop-Job; Get-Job | Remove-Job
   ```

2. **Restore Copilot CLI config if you mutated it.** Some labs ask you to
   edit `~/.copilot/config.json`, `~/.copilot/mcp-config.json`, or
   `.copilot/mcp-config.json`. If you stashed the original, restore it now.
   If you edited in place without backing up, check `git status` in the lab
   repo (workspace configs) and revert anything you didn't mean to keep.

   **WSL/Bash:**
   ```bash
   # If you saved a backup like ~/.copilot/config.json.bak:
   [ -f ~/.copilot/config.json.bak ] && mv ~/.copilot/config.json.bak ~/.copilot/config.json
   ```

3. **Exit and restart `copilot` if you touched extensions or MCP.** The
   runtime caches loaded extensions and MCP servers; reloading via
   `extensions_reload` does **not** clear an extension whose source dir was
   deleted. Fully exit the `copilot` process and start a fresh session.

4. **Sweep the long-tail artifact paths.** These directories accumulate
   across labs and are safe to clean once you've finished:

   ```bash
   # Per-session scratch (safe to inspect; delete only what this lab created):
   ls ~/.copilot/lessons/        2>/dev/null
   ls node/.a2a/                  2>/dev/null
   ls node/.a2a-transcript-*.md   2>/dev/null
   ls .git/CLAB_SUMMARY.md        2>/dev/null
   ```

   Delete only files that this lab created. Do not blanket-delete
   `~/.copilot/lessons/` if other sessions wrote to it.

5. **Revert any `core.hooksPath` or other git-config mutations.** Some labs
   point git at a custom hooks dir for the duration of an exercise.

   ```bash
   git config --get core.hooksPath
   # if set to a lab path, unset:
   git config --unset core.hooksPath
   ```

6. **Confirm working tree is clean (or expected).**

   ```bash
   git status --short
   ```

   Any unexpected files (untracked agents, hooks, extensions, scratch
   notebooks) should be removed or moved out of the repo before continuing.

7. **Verify build is still green.** Optional but recommended after labs that
   touched hooks, agents, or skills:

   ```bash
   dotnet build dotnet/ContosoUniversity.sln --nologo
   ```

> ✅ Once `git status --short` is empty (or shows only files you intentionally
> kept) and the build is clean, you're ready for the next lab.
<!-- @end-include docs/_partials/cleanup.md -->
