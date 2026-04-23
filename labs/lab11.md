---
title: "Building & Distributing a Copilot Plugin (Enterprise Marketplace Pattern)"
lab_number: 11
pace:
  presenter_minutes: 6
  self_paced_minutes: 25
registry: docs/_meta/registry.yaml
---

# 11 — Building & Distributing a Copilot Plugin (Enterprise Marketplace Pattern)

In this lab you will scaffold a Copilot plugin, bundle an agent + skill + hook,
publish it to a **private org-internal registry repo**, install it into a fresh
workspace, and enforce an org allowlist policy that blocks untrusted sources.

> ⏱️ Presenter pace: 6 minutes | Self-paced: 25 minutes

> 💡 **Enterprise context:** The Copilot plugin marketplace is where teams
> share reusable agents, skills, hooks, and MCP wiring. In regulated or
> large-org environments you do **not** want developers pulling plugins from
> random public sources. This lab teaches the pattern:
> private registry → allowlist policy → signed releases → SBOM → reproducible
> install. The `plugin-template/` directory at the repo root is a drop-in
> starting point.

References:
- [Finding and installing plugins](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing)
- [Awesome Copilot marketplace](https://github.com/github/awesome-copilot)
- [`plugin-template/README.md`](../plugin-template/README.md)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — CLI version floor + model tiers

## 11.0 Copilot CLI currency (2026 refresh)

This lab assumes the current CLI surface (taught in Labs 01, 05, 07–10):

| Capability | Command / surface |
|------------|-------------------|
| **Install a plugin** | `/plugin install owner/repo` |
| **Parallel subagents** | `/fleet` |
| **Plan mode vs autopilot mode** | `Shift+Tab` (plan mode) vs autopilot mode |
| **Mid-session model switch** | `/model <tier-or-id>` (tiers in `docs/_meta/registry.yaml`) |
| **Local tool discovery** | `extensions_manage` operation `list` / `inspect` / `guide` / `scaffold` |

## 11.1 Anatomy of a Plugin

Open [`plugin-template/`](../plugin-template/) in your editor. A Copilot
plugin is a directory with:

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

## 11.2 Scaffold a Plugin with `extensions_manage`

🖥️ **In Copilot CLI:**

1. Ask Copilot to show the extensions authoring guide (the template IS this
   guide in action):

   ```
   Use extensions_manage operation guide to show me the plugin authoring steps,
   then scaffold a plugin at ./my-plugin copied from plugin-template/.
   ```

2. Verify the scaffold by running a dry-run install against the template:

   **WSL/Bash:**
   ```bash
   node plugin-template/scripts/install.mjs
   ```

   **PowerShell:**
   ```powershell
   node plugin-template/scripts/install.mjs
   ```

3. Confirm the output reports `ok: true` with resolved entrypoints.

## 11.3 Publish to a Private Org Registry

The canonical enterprise pattern is a **private org repo** named something
like `contoso-internal/contoso-copilot-plugins` that hosts one or more
plugins. Consumers install with:

```sh
copilot plugin install contoso-internal/contoso-copilot-plugins --ref v0.1.0
```

To pin the org registry so developers cannot accidentally install from
elsewhere, set the environment variable at the org onboarding layer
(devcontainer, CI image, shell profile):

```sh
export COPILOT_PLUGIN_REGISTRIES="contoso-internal/contoso-copilot-plugins"
```

### Release workflow

`plugin-template/.github/workflows/release.yml` fires on push of a
`vMAJOR.MINOR.PATCH` tag and:

- Validates the manifest version matches the tag.
- Generates a **CycloneDX SBOM** (`sbom.cdx.json`) via `anchore/sbom-action`.
- Attests build provenance via `actions/attest-build-provenance`.
- Creates a GitHub Release with auto-generated notes + SBOM attached.

## 11.4 Install into a Fresh Workspace & Verify

🖥️ **In a clean directory (simulating a consumer machine):**

1. Install the plugin:
   ```sh
   /plugin install contoso-internal/contoso-copilot-plugins
   ```

2. Verify it loaded:
   ```
   Use extensions_manage operation list to show me what is loaded.
   Then operation inspect on "contoso-copilot-starter".
   ```

3. Run the bundled `/example` prompt — it should confirm plugin name + version.

## 11.5 Enforce an Org Allowlist Policy

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
globs. To gate installs in CI, add a step that calls
`isAllowed(policy, source)` and exits non-zero on `allowed: false`.

🖥️ **Try it:**

```sh
node -e 'import("./plugin-template/scripts/policy.mjs").then(m => {
  const yaml = require("js-yaml");
  const fs = require("fs");
  const policy = yaml.load(fs.readFileSync("plugin-template/org-policy.example.yaml","utf8"));
  console.log(m.isAllowed(policy, "random-user/untrusted-plugin"));
  console.log(m.isAllowed(policy, "contoso-internal/anything-else"));
})'
```

You should see the first call return `allowed: false` and the second
`allowed: true` (matched the `contoso-internal/*` glob).

## 11.6 Deprecation & Migration

- **Never delete a shipped version.** Mark old manifests `deprecated: true`
  and publish a replacement with a `migration_to: <name>@<version>` hint.
- Document breaking changes with a `BREAKING:` prefix in release notes —
  the release workflow includes them verbatim.
- Require `signed_releases: true` and `sbom: true` in the org policy so
  consumers cannot silently install an unsigned build.

## 11.7 Check your work

✅ `plugin-template/manifest.yaml` validates against
`tests/plugin-template/manifest.schema.json`.

✅ `node plugin-template/scripts/install.mjs` prints `ok: true`.

✅ `isAllowed(policy, "random-user/x")` returns `allowed: false`.

✅ `npm test` stays green — the three `tests/plugin-template/*` suites
enforce this contract on every PR.

## What's next

Lab 12 takes the same "configuration as a product" mindset into the data
plane with Fabric MCP + notebooks. Labs 13 and 14 wire multi-plugin
workspaces into A2A orchestration and tmux-driven execution patterns.

- [Lab 12](lab12.md) — Fabric MCP with Copilot CLI & VS Code (data-plane
  MCP, offline Parquet fallback, notebook hygiene).
- [Lab 13](lab13.md) — A2A concepts with Copilot CLI ACP (implementer +
  critic, trust boundaries, hand-off schema).
- [Lab 14](lab14.md) — Orchestrator + tmux deep-dive (the pattern that
  built this repo; operationalises Lab 13's hand-off schema).
