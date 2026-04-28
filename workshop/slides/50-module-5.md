---
module: M5
title: "Enterprise plugin marketplace"
anchor_labs: [lab11]
minutes: 20
phase: 3c
---

# M5 — Enterprise plugin marketplace

## The advanced problem

You already install Copilot plugins on your laptop. The advanced question is **how does a 500-engineer org distribute its own plugins safely?** Public marketplaces (`github/awesome-copilot`, vendor repos) are fine for self-study — they are **not** acceptable as the default source for a regulated or large-org environment. What you actually need:

- A **private org registry** that carries your plugins.
- An **allowlist policy** that blocks everything else by default.
- **Signed releases + SBOM** so consumers can verify what they installed.
- **CODEOWNERS review gates** on the manifest, the policy, and the release workflow — not just "whoever merges first."

Anchor lab: `labs/lab11.md`. Reference template: `plugin-template/` at the repo root.

---

## A plugin is a directory — here is its anatomy

A Copilot plugin is a directory with one contract file plus bundled extension surfaces. `plugin-template/manifest.yaml` is the contract:

```yaml
name: contoso-copilot-starter
version: 0.1.0
minimum_cli_version: "1.0.35-4"
entrypoints:
  agents:    [agents/example-agent.md]
  skills:    [skills/example-skill/SKILL.md]
  hooks:     [hooks/example-hook.sh]
  prompts:   [prompts/example.prompt.md]
mcp_servers:
  - name: context7
    transport: stdio
    pin: latest
```

Key contract — **`minimum_cli_version` must equal** `docs/_meta/registry.yaml → copilot_cli_version_floor`. CI enforces this. When the floor moves, both bump together.

---

## The four enterprise controls that matter

Walk these top-to-bottom; they are the blast-radius story.

- **Private org registry.** A private repo such as `contoso-internal/contoso-copilot-plugins`. Installs with `copilot plugin install contoso-internal/contoso-copilot-plugins --ref v0.1.0`.
- **Registry pinning via env.** `COPILOT_PLUGIN_REGISTRIES="contoso-internal/contoso-copilot-plugins"` baked into the devcontainer / CI image / onboarding script. Developers cannot accidentally pull from elsewhere.
- **Deny-by-default allowlist policy.** `plugin-template/org-policy.example.yaml` expresses `default_action: deny` plus a short allowlist (your org, one curated public source). `plugin-template/scripts/policy.mjs` evaluates it with segment-wildcard globs.
- **Signed releases + SBOM.** `plugin-template/.github/workflows/release.yml` fires on `v*.*.*` tags, attaches a CycloneDX SBOM via `anchore/sbom-action`, attests build provenance via `actions/attest-build-provenance`, and creates the GitHub Release. The allowlist requires both: `signed_releases: true`, `sbom: true`.

Four controls, one property: *nothing gets installed unless the org said so, and we can prove what was installed.*

---

## The allowlist policy — read this verbatim

`plugin-template/org-policy.example.yaml`:

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

Segment-wildcard semantics: `contoso-internal/*` matches any repo under that org, **not** `contoso-other/contoso-internal-thing`. Evaluated by `plugin-template/scripts/policy.mjs → isAllowed(policy, source)` — returns `{ allowed: boolean, reason: string }`. Add new sources only via PR into the central policy repo.

---

## CODEOWNERS is the review gate

`plugin-template/CODEOWNERS` enforces that the sensitive files **cannot** be merged without platform + security review:

```
*                          @contoso-internal/copilot-platform
/manifest.yaml             @contoso-internal/copilot-platform @contoso-internal/security
/org-policy.example.yaml   @contoso-internal/copilot-platform @contoso-internal/security
/.github/workflows/        @contoso-internal/copilot-platform @contoso-internal/release-engineering
```

Three rules:

- Every path requires platform review.
- The manifest and the policy require **security** too.
- The workflows directory requires **release engineering** too.

Without this, "deny-by-default + allowlist" is just a YAML file anyone can edit.

---

## The release workflow — three artefacts, one tag

`plugin-template/.github/workflows/release.yml` triggers on `push.tags: v*.*.*` and produces:

- A **GitHub Release** with auto-generated notes (from the tag delta).
- A **CycloneDX SBOM** as a release asset (`anchore/sbom-action@v0`, `format: cyclonedx-json`).
- A **build provenance attestation** (`actions/attest-build-provenance`, needs `id-token: write` + `attestations: write`).

Consumers (and CI gates) require all three. A release that is missing the SBOM is not installable under `require.signed_releases + sbom`.

Job-level permissions: `contents: write`, `id-token: write`, `attestations: write` — least privilege; the workflow-level default is read-only.

---

## Install, verify, audit — the consumer side

From a clean workspace:

```sh
copilot plugin install contoso-internal/contoso-copilot-plugins --ref v0.1.0
```

Then, inside Copilot CLI, use `extensions_manage` — operation `list` confirms the plugin loaded, operation `inspect` shows its manifest + entrypoints. Dry-run locally before committing an install:

```sh
node plugin-template/scripts/install.mjs   # expect ok: true
```

Policy-gate it in CI:

```sh
node -e 'import("./plugin-template/scripts/policy.mjs").then(m => {
  const yaml = require("js-yaml");
  const fs = require("fs");
  const policy = yaml.load(fs.readFileSync("plugin-template/org-policy.example.yaml","utf8"));
  console.log(m.isAllowed(policy, "random-user/untrusted-plugin"));
  console.log(m.isAllowed(policy, "contoso-internal/anything-else"));
})'
```

Expect `allowed: false` then `allowed: true`. That two-line round-trip **is** your enterprise acceptance test.

---

## Deprecation & migration — the part everyone skips

- **Never delete a shipped version.** Mark the old manifest `deprecated: true`, publish a replacement with `migration_to: <name>@<version>`, keep the old tag published for the deprecation window.
- **Breaking changes are flagged in release notes** with a `BREAKING:` prefix. The release workflow passes notes through verbatim, so the word survives.
- **Signed + SBOM stay required across versions.** Do not weaken `require:` to ship a hotfix. Fix the pipeline instead.

If you skip this, you ship an untracked breaking change and a fleet of developer machines pin to the last working version silently. That failure mode is the opposite of what the allowlist was supposed to buy you.

---

## Expected failure modes

- **A contributor edits the allowlist directly.** CODEOWNERS exists precisely to catch this. Never accept a policy PR without `@security` on it.
- **`minimum_cli_version` drifts from the registry floor.** CI enforces equality (`tests/plugin-template/manifest-schema.test.ts` in this repo). Bump both in the same commit.
- **Registry env var not set on the dev machine.** Developer accidentally installs from a public source that happens to be on the allowlist. Fix at onboarding — bake `COPILOT_PLUGIN_REGISTRIES` into the devcontainer image.
- **Release without SBOM.** A flaky network on the SBOM step silently drops the asset. Gate installs on presence, not on workflow exit code.
- **Deleting a deprecated version.** Consumers pinned to that tag break. Always preserve history; deprecation is a metadata change, not a deletion.

---

## Takeaway

The enterprise marketplace story is four controls stacked: private registry + registry pinning + deny-by-default allowlist + signed-release-with-SBOM. CODEOWNERS is what keeps them honest. `plugin-template/` is the drop-in starting point — clone, rename, ship.
