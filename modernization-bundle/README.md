# Modernization Bundle — Packaged Self-Improving-Agents Plugin

This is the "package it so it can be used anywhere" deliverable for the
2026 modernization track (Labs 15-20). It's a real Copilot plugin — built
from the same `plugin-template/` scaffold as [Lab 11](../labs/lab11.md) —
that bundles this lab suite's self-improvement pattern so another repo can
install it directly, instead of hand-copying files.

## What's in the box

| Path | Purpose |
|------|---------|
| `manifest.yaml` | Plugin metadata + entrypoints. Validated the same way as `plugin-template/manifest.yaml`. |
| `agents/modernization-auditor.agent.md` | Bounded drift-detection agent — mechanical fixes only, never deletes or rewrites design. |
| `skills/modernization-drift-scanner/SKILL.md` | Portable scan logic (stale refs, contradicted instructions, underused files, eval-harness contradictions, duplication) — reusable interactively or from a scheduled workflow. |
| `hooks/block-self-edit-hook.sh` | Pre-tool-use hook that blocks any edit to this plugin's own manifest/release-workflow/CODEOWNERS — prevents privilege escalation. |
| `prompts/modernization-scan.prompt.md` | `/modernization-scan` — report-only entry point. |
| `org-policy.example.yaml` | Deny-by-default allowlist policy template (same shape as Lab 11/16). |
| `scripts/install.mjs` | `copilot plugin install --dry-run` simulator (identical contract to `plugin-template/scripts/install.mjs`). |
| `scripts/policy.mjs` | Allowlist evaluator. |
| `.github/workflows/release.yml` | Tag → GitHub Release → SBOM → provenance attestation. |
| `CODEOWNERS` | Review gating. |

## Relationship to `.github/workflows/self-improving-agents.md`

This bundle and the standalone gh-aw workflow at the repo root
(`.github/workflows/self-improving-agents.md`, built in [Lab 19](../labs/lab19.md))
are **two different distribution shapes for the same idea**:

- **The gh-aw workflow** runs unattended on a schedule inside *this* repo's
  GitHub Actions, and is copy-pasted (with its "Portability config" block
  edited) into another repo's `.github/workflows/`.
- **This plugin** is installed via `copilot plugin install`, and gives an
  individual developer the same scan logic as an interactive
  `/modernization-scan` command inside their own Copilot CLI session — no
  GitHub Actions required, works in any repo including ones without CI.

Pick whichever distribution shape matches how a target repo wants to
consume it — or install both, since they share the same underlying scan
logic (`modernization-drift-scanner`) and the same bounded guardrails
(mechanical-fixes-only, no self-editing, no silent deletion).

## Enterprise distribution

Follow the same four steps as [`plugin-template/README.md`](../plugin-template/README.md)
and [Lab 11](../labs/lab11.md): publish to a private org registry, pin it
with `COPILOT_PLUGIN_REGISTRIES` (or, for GA enterprise governance, list it
in `managed-settings.json`'s `extraKnownMarketplaces` — see
[Lab 16](../labs/lab16.md)), enforce the allowlist policy, and sign
releases with an SBOM.

```sh
# Dry-run the install before publishing
node modernization-bundle/scripts/install.mjs   # expect ok=true
```

## Versioning & deprecation

Same rules as `plugin-template/`: `minimum_cli_version` tracks
`docs/_meta/registry.yaml` → `copilot_cli_version_floor`; never delete a
shipped version — mark `deprecated: true` with a `migration_to` hint.

## Further reading

- [Lab 19](../labs/lab19.md) — the standalone gh-aw workflow this bundle's
  agent/skill logic mirrors.
- [Lab 11](../labs/lab11.md) — the plugin-packaging fundamentals this
  bundle is built on.
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml) — authoritative
  CLI version floor.
