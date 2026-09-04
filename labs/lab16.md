---
title: "Enterprise Marketplace & Plugin Governance"
lab_number: 16
pace:
  presenter_minutes: 6
  self_paced_minutes: 25
registry: docs/_meta/registry.yaml
---

# 16 — Enterprise Marketplace & Plugin Governance

Lab 11 taught you how to build and distribute a Copilot plugin, and
introduced `managed-settings.json` in passing. This lab goes deep on the
**GA enterprise governance mechanism** itself: the real schema, the AI
Controls admin surface that configures it, and how `strictKnownMarketplaces`
locks down where plugins can come from.

> ⏱️ Presenter pace: 6 minutes | Self-paced: 25 minutes

> 💡 **Enterprise context:** Lab 11's `COPILOT_PLUGIN_REGISTRIES` env var and
> `org-policy.example.yaml` allowlist are *local, opt-in* patterns any repo
> can adopt. `managed-settings.json` is different: it's centrally configured
> once by an enterprise admin and enforced on every Copilot Business/
> Enterprise client — Copilot CLI, VS Code, the GitHub Copilot app, the
> Copilot cloud agent and JetBrains IDEs (per-key support varies; see the
> published support matrix) — regardless of what a developer's local
> config says.

References:
- [Enterprise managed settings.json is generally available](https://github.blog/changelog/2026-07-01-enterprise-managed-settings-json-is-generally-available/) — confirmed via direct fetch
- [Enterprise managed settings now support strictKnownMarketplaces in VS Code and the CLI](https://github.blog/changelog/2026-06-25-enterprise-managed-settings-now-support-strictknownmarketplaces-in-vs-code-and-the-cli/)
- [Lab 11 — Building & Distributing a Copilot Plugin](lab11.md)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) `enterprise_managed_settings:` block

## 16.0 Copilot CLI currency (2026 refresh)

> 💡 Commands are current as of this refresh; versions, model tiers, and MCP
> pins live in [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml).

## 16.1 The `managed-settings.json` Mechanism

Confirmed from GitHub's own changelog (fetched directly, 2026-07-01 GA
announcement):

- **Where it lives:** the enterprise picks a **source organization**, and
  Copilot looks for the file at **`copilot/managed-settings.json`** inside
  that organization's `.github-private` repository. An older path,
  `.github/copilot/settings.json`, is kept for backward compatibility.
- **How it's picked up:** Copilot clients fetch the file from the server on
  every authentication, store it in memory, and refresh it hourly — so a
  change propagates to every user within the hour, or immediately on their
  next sign-in. Server delivery is only one of several supported channels,
  though: the precedence list below also names **MDM-managed** and
  **file-based** settings, so don't assume the server copy is the only
  thing in play when you debug an unexpected effective config.
- **Precedence:** four tiers, highest first — **MDM-managed → server-managed
  → file-based → user-level**. For most keys the highest tier that defines a
  key wins, overriding what a user configured locally. **Exception:**
  `sandbox` and `permissions.deny` / `.ask` / `.allow` are **composed in the
  most restrictive direction** across delivery methods rather than simply
  overridden — a deny set anywhere applies to everyone.
- **Getting started:** an enterprise admin selects the source organization
  from the **AI Controls** tab in enterprise settings (or via the REST API),
  then commits `copilot/managed-settings.json` to that org's
  `.github-private` repo's default branch.

Per `docs/_meta/registry.yaml` → `enterprise_managed_settings.supported_keys`,
a configuration using the plugin-governance keys looks like this:

```json
// copilot/managed-settings.json (shapes verified against the published
// schema — see registry.yaml for the version-controlled key list)
{
  "extraKnownMarketplaces": {
    "contoso-plugins": {
      "source": {
        "source": "github",
        "repo": "contoso-internal/contoso-copilot-plugins"
      },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "dotnet-suite@contoso-plugins": true
  },
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "contoso-internal/contoso-copilot-plugins" }
  ],
  "permissions": {
    "disableBypassPermissionsMode": "disable"
  },
  "model": "auto"
}
```

> ⚠️ **Shapes matter more than names here.** Four of these five keys are
> *not* the plain booleans/arrays their names suggest:
> - `extraKnownMarketplaces` is a **named-object map**, not a list of
>   `owner/repo` strings. Each entry has a `source` object (`github`, `git`
>   or `directory`) and an optional `autoUpdate` boolean.
> - `enabledPlugins` is a **boolean map** keyed `PLUGIN-NAME@MARKETPLACE-NAME`
>   — `true` requires the plugin, `false` blocks it.
> - `strictKnownMarketplaces` is an **array of marketplace objects**, not
>   `true`. An **empty array means complete lockdown**.
> - `disableBypassPermissionsMode` is **nested under `permissions`** and is
>   **string-valued** (`"disable"`), not a top-level boolean.
>
> `model` is the only one of the five that is a plain scalar.

> ⚠️ All keys are optional — an enterprise chooses only the governance
> surface it needs. GitHub explicitly documents that "additional keys will
> be continuously added over time," so treat this list as a floor, not a
> ceiling — re-check the registry note's `last_verified` date before relying
> on it for a live rollout.

## 16.2 `strictKnownMarketplaces` — Deny-by-Default Marketplaces

`strictKnownMarketplaces` is the enterprise-enforced analogue of Lab 11's
`org-policy.example.yaml` allowlist:

> ⚠️ **Release-stage precision (two separate events).** The 2026-06-25
> changelog introduced this key in **public preview** — its wording is
> *"This setting is now available in public preview."* It became **generally
> available on 2026-07-01**, when it was listed among the supported keys in
> the `managed-settings.json` GA announcement. If you are writing a rollout
> plan, cite the **2026-07-01** GA date, not 2026-06-25.

- When set, Copilot clients **refuse to install a plugin from any
  marketplace not explicitly listed** in the array. Note this is an array of
  marketplace objects, not a boolean — and an **empty array (`[]`) means
  complete lockdown**, which is the strictest setting available.
- Entries accept several source types — `github`, `git`, `url`, `npm`,
  `file`, `directory`, plus `hostPattern` / `pathPattern` regex matchers for
  broader rules.
- Combined with `enabledPlugins`, an enterprise can go further and
  allowlist specific plugins within a trusted marketplace, rather than
  trusting the whole marketplace.

> ⚠️ **Don't assume a first-party exemption.** The published schema
> documents no "GitHub's own marketplace is always trusted" carve-out for
> `strictKnownMarketplaces`, and "an empty array means complete lockdown"
> implies the opposite. A documented first-party exemption *does* exist for
> `deniedMcpServers` — don't carry it across to marketplaces. If you need
> GitHub's marketplace available, list it explicitly.

🖥️ **Model the policy locally (this repo's illustrative harness):**

This repo doesn't have live enterprise admin access to demonstrate against
a real GitHub Enterprise Cloud tenant, so model the same decision logic
using the `plugin-template/scripts/policy.mjs` evaluator from Lab 11 —
treat `strictKnownMarketplaces: true` as equivalent to
`default_action: deny` plus an allowlist of exactly the marketplaces named
in `extraKnownMarketplaces`:

```sh
node -e 'import("./plugin-template/scripts/policy.mjs").then(m => {
  const yaml = require("js-yaml");
  const fs = require("fs");
  const policy = yaml.load(fs.readFileSync("plugin-template/org-policy.example.yaml","utf8"));
  console.log("random-user/x ->", m.isAllowed(policy, "random-user/untrusted-plugin"));
  console.log("contoso-internal/anything ->", m.isAllowed(policy, "contoso-internal/anything-else"));
})'
```

> 💡 This is a teaching analogy, not a literal reimplementation of
> `managed-settings.json` — the real mechanism is enforced client-side by
> Copilot itself, not by a script you run. The point is the *decision
> shape* (deny-by-default + explicit allowlist) is identical.

## 16.3 Configuring It (Admin Walkthrough, Narrated)

Since this repo can't grant you a live enterprise admin session, walk
through the steps narratively and identify where each one would happen in
your own enterprise:

1. **Enterprise settings → AI Controls tab** — select or confirm the source
   organization for custom agents/managed settings (this is the same
   source-org selection used for custom-agent configuration at the
   enterprise level).
2. **Commit `copilot/managed-settings.json`** to that org's
   `.github-private` repo, on the default branch.
3. **Confirm activation** on the **Agents** page under **AI Controls** in
   enterprise settings — GitHub's docs note you can verify the
   configuration is active there.
4. **Wait for propagation** — up to an hour for already-signed-in users, or
   immediately for users who sign in fresh.

🖥️ **Discuss/answer (no live tenant needed):**

```
If our enterprise wanted to lock developers to only the
contoso-internal/contoso-copilot-plugins marketplace plus GitHub's
official one, and prevent any other plugin source, which two
managed-settings.json keys would we set, and what values?
```

> 💡 **Expected answer:** `extraKnownMarketplaces` (to register the
> marketplace) plus `strictKnownMarketplaces` (to deny everything else):
>
> ```json
> {
>   "extraKnownMarketplaces": {
>     "contoso-plugins": {
>       "source": {
>         "source": "github",
>         "repo": "contoso-internal/contoso-copilot-plugins"
>       }
>     }
>   },
>   "strictKnownMarketplaces": [
>     { "source": "github", "repo": "contoso-internal/contoso-copilot-plugins" }
>   ]
> }
> ```
>
> **Trap in the question:** it says "plus GitHub's official one." Because no
> first-party exemption is documented, GitHub's marketplace is **not**
> implicitly trusted — if you want it, add it to
> `strictKnownMarketplaces` as its own explicit entry. Answering
> `strictKnownMarketplaces: true` is the most common mistake: the key takes
> an **array**, not a boolean.

## 16.4 Check your work

✅ You can name the canonical file path (`copilot/managed-settings.json`)
and the legacy backward-compatible path (`.github/copilot/settings.json`).

✅ You can write each key in its **correct shape** — `extraKnownMarketplaces`
as a named-object map, `enabledPlugins` as a `NAME@MARKETPLACE` boolean map,
`strictKnownMarketplaces` as an array of marketplace objects,
`disableBypassPermissionsMode` nested under `permissions` with the string
value `"disable"`, and `model` as a plain scalar.

✅ You know the supported-key list has grown well beyond the five announced
at GA. It now also includes `permissions.deny` / `.ask` / `.allow`,
`allowedMcpServers`, `deniedMcpServers`, `sandbox`, `telemetry` and
`remoteControl` — check the published reference rather than memorising a
fixed list.

✅ You can state the four-tier precedence order (MDM → server → file-based →
user) and name the exception: `sandbox` and `permissions.*` compose
most-restrictively instead of overriding.

✅ You ran the `policy.mjs` allowlist analogy and got `allowed: false` for
an untrusted source and `allowed: true` for a trusted one.

## 16.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | Details |
|---------|---------|
| **Canonical path** | `copilot/managed-settings.json` in the enterprise's chosen source org's `.github-private` repo |
| **Legacy path** | `.github/copilot/settings.json` (backward-compat only) |
| **Precedence** | Four tiers — MDM → server → file-based → user. Exception: `sandbox` and `permissions.*` compose most-restrictively |
| **Refresh cadence** | On every sign-in, plus hourly for already-authenticated sessions |
| **Config entry point** | The **AI Controls** tab in enterprise settings |
| **Deny-by-default lever** | `strictKnownMarketplaces: [ … ]` (an **array** of marketplace objects; `[]` = total lockdown) + `extraKnownMarketplaces` |

</details>

**Next:** [Lab 17 — GitHub Admin Controls for Copilot/AI](lab17.md)
