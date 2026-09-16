# Contoso Copilot Plugin — Enterprise Template

A production-ready starting point for a privately-distributed Copilot plugin.
Use it as a GitHub template repo for your team's own plugins.

## What's in the box

| Path | Purpose |
|------|---------|
| `manifest.yaml` | Plugin metadata + entrypoints. Validated by JSON schema in CI. |
| `agents/example-agent.md` | One bundled agent. |
| `skills/example-skill/SKILL.md` | One bundled skill. |
| `hooks/example-hook.sh` | One pre-tool-use hook. |
| `prompts/example.prompt.md` | One `/example` slash prompt. |
| `org-policy.example.yaml` | Deny-by-default allowlist policy template. |
| `scripts/install.mjs` | `copilot plugin install --dry-run` simulator. |
| `scripts/policy.mjs` | Allowlist evaluator (used by CI + org tooling). |
| `.github/workflows/release.yml` | Tag → GitHub Release → SBOM → provenance attestation. |
| `CODEOWNERS` | Review gating for manifest, policy, and release workflow. |

## Versioning

- **Semantic versioning.** `vMAJOR.MINOR.PATCH` tags trigger the release
  workflow. The manifest `version` field must match the tag (without the `v`).
- **`minimum_cli_version`** in `manifest.yaml` MUST track
  `docs/_meta/registry.yaml` → `copilot_cli_version_floor`. Bump both
  together; CI enforces equality.

## Enterprise distribution

### 1. Publish to a private org registry

Put this template's content in a private repo, e.g.
`contoso-internal/contoso-copilot-plugins`. Consumers install with:

```sh
copilot plugin install contoso-internal/contoso-copilot-plugins --ref v0.1.0
```

Use `--dry-run` to validate before committing the install — CI replicates this
via `scripts/install.mjs`:

```sh
node plugin-template/scripts/install.mjs   # expect ok=true
```

### 2. Pin the org registry with `COPILOT_PLUGIN_REGISTRIES`

Set the env var at the org level (devcontainer, CI, onboarding script):

```sh
export COPILOT_PLUGIN_REGISTRIES="contoso-internal/contoso-copilot-plugins"
```

Combined with the allowlist policy below, this blocks developers from pulling
plugins from untrusted sources by accident.

### 3. Enforce the allowlist policy

Copy `org-policy.example.yaml` to `.copilot/org-policy.yaml` in every
developer workspace. `scripts/policy.mjs` exports `isAllowed(policy, source)`
used by CI gates. Add new sources only via pull request into the central
policy repo.

### 4. Sign releases + SBOM

The bundled release workflow:
- Attaches a CycloneDX SBOM as a release asset.
- Generates a build provenance attestation with
  `actions/attest-build-provenance`.
- Auto-generates release notes from the tag delta.

Require these artifacts at install time (`require.signed_releases: true` in
`org-policy.example.yaml`) — the policy evaluator refuses sources that do
not carry them.

## Deprecation & migration

- **Never delete a shipped version.** Mark manifests `deprecated: true` with
  a `migration_to: <name>@<version>` hint and keep the tag published for at
  least one minor cycle.
- Document breaking changes in release notes with a `BREAKING:` prefix — the
  release workflow includes them verbatim.
- For removed commands/agents, add a top-level `deprecations:` block to the
  replacement manifest so consumers get an inline migration pointer.

## Local development

```sh
# 1. Clone the template and rename.
gh repo create contoso-internal/my-plugin --template contoso-internal/contoso-copilot-plugins --private

# 2. Dry-run the install.
node plugin-template/scripts/install.mjs

# 3. Run the policy check.
node -e 'import("./plugin-template/scripts/policy.mjs").then(m => console.log(m.isAllowed({default_action:"deny",allowlist:[{source:"contoso-internal/my-plugin"}]}, "contoso-internal/my-plugin")))'

# 4. Commit, tag, push.
git tag v0.1.0 && git push --tags
```

## Further reading

- `labs/lab11.md` — hands-on walkthrough of this template.
- `docs/_meta/registry.yaml` — authoritative CLI version floor + model tiers.
