---
module: M5
title: "Enterprise plugin marketplace — speaker script"
slide_source: workshop/slides/50-module-5.md
minutes: 20
phase: 3c
---

# M5 — Speaker script

Target audience: fluent Copilot CLI users who have installed plugins
and written at least one custom agent or skill. The room knows what
a plugin is. This module is about **distributing** plugins at
enterprise scale — private registry, allowlist, signed release,
CODEOWNERS. 20 minutes.

## 1. Open with the advanced problem

Do **not** start with "a plugin bundles an agent plus a skill plus a
hook". The room knows. Start with the blast radius.

**Verbatim hook (~60 seconds):**

> "Everyone here has installed a Copilot plugin. The advanced
> question is: **how does your org distribute its own plugins
> without letting developers pull anything from anywhere?** Public
> marketplaces like `github/awesome-copilot` are fine for self-
> study — they are not acceptable as the default source in a
> regulated or large-org environment. Over the next 20 minutes we
> are going to walk the four controls that make a plugin
> marketplace enterprise-grade: private registry, allowlist policy,
> signed releases with SBOM, and CODEOWNERS review gates. Reference
> template is `plugin-template/` at the root of this repo — clone,
> rename, ship."

Anchor lab: `labs/lab11.md`.

## 2. Demo script

**Copilot CLI only. Every file exists in this repo — no live GitHub
Actions run required.**

### Demo A — plugin anatomy on disk (~3 min)

```bash
cd ~/Coding_Projects/day-in-the-life-copilot-lab
ls plugin-template/
cat plugin-template/manifest.yaml
```

Walk the manifest line by line: `name`, `version`, `minimum_cli_version`,
`entrypoints` (agents / skills / hooks / prompts), `mcp_servers`.

Land on the contract: *"`minimum_cli_version` must equal
`docs/_meta/registry.yaml → copilot_cli_version_floor`. CI enforces
it. When the floor moves, both bump together — in the same commit."*

### Demo B — the allowlist policy in action (~3 min)

```bash
cat plugin-template/org-policy.example.yaml
```

Read the `default_action: deny`, the three allowlist entries, and
the `require: signed_releases: true, sbom: true` block out loud.

Then run the evaluator against one bad and one good source:

```bash
node -e 'import("./plugin-template/scripts/policy.mjs").then(m => {
  const yaml = require("js-yaml");
  const fs = require("fs");
  const policy = yaml.load(fs.readFileSync("plugin-template/org-policy.example.yaml","utf8"));
  console.log(m.isAllowed(policy, "random-user/untrusted-plugin"));
  console.log(m.isAllowed(policy, "contoso-internal/anything-else"));
})'
```

Narrate: first returns `allowed: false` (no match), second returns
`allowed: true` (matched `contoso-internal/*` glob). *"This two-line
round-trip is your enterprise acceptance test."*

### Demo C — CODEOWNERS as the review gate (~2 min)

```bash
cat plugin-template/CODEOWNERS
```

Point at the three rules:

- every path → platform team review
- `/manifest.yaml` + `/org-policy.example.yaml` → platform **and**
  security
- `/.github/workflows/` → platform **and** release engineering

*"Without CODEOWNERS, deny-by-default-plus-allowlist is just a YAML
file anyone can edit. CODEOWNERS is what keeps the policy honest."*

### Demo D — the release workflow: SBOM + provenance (~3 min)

```bash
head -50 plugin-template/.github/workflows/release.yml
```

Walk the three artefacts the workflow produces on a `v*.*.*` tag:

- GitHub Release (auto-generated notes)
- CycloneDX SBOM attached via `anchore/sbom-action@v0`
- build provenance via `actions/attest-build-provenance`

Point at the job-level permissions: `contents: write`,
`id-token: write`, `attestations: write` — least privilege, not
workflow-level. The workflow-level default is read-only.

Close: *"The allowlist requires `signed_releases: true` and
`sbom: true`. A release missing the SBOM is not installable. That
is the enforcement mechanism — not the prose."*

### Demo E — dry-run install + extensions_manage round-trip (~2 min)

```bash
node plugin-template/scripts/install.mjs
```

Expect `ok: true` with resolved entrypoints.

Then (verbally, no interactive session needed): *"Inside Copilot CLI
on a consumer machine, the round-trip is `copilot plugin install
<owner/repo> --ref vX.Y.Z`, then `extensions_manage` operation
`list` to confirm it loaded, then operation `inspect` to dump its
manifest. If the org has set `COPILOT_PLUGIN_REGISTRIES` in the
devcontainer image, step one cannot pull from any source outside
the allowlist."*

Anchor it: *"Four controls stacked — registry, pinning, allowlist,
signed release — and CODEOWNERS is the lock on the whole stack."*

## 3. Timing cues

<!-- total: 20 min -->

- 0:00 — Open with the advanced problem. Name the four controls. (2 min)
- 2:00 — Slide: "A plugin is a directory — here is its anatomy." Read the manifest. (1 min)
- 3:00 — **Demo A** — plugin anatomy on disk. (3 min)
- 6:00 — Slide: "The four enterprise controls that matter." Walk top-to-bottom. (2 min)
- 8:00 — **Demo B** — the allowlist policy + `isAllowed` round-trip. (3 min)
- 11:00 — Slide: "CODEOWNERS is the review gate." Read the three rules. (1 min)
- 12:00 — **Demo C** — `cat plugin-template/CODEOWNERS`. (2 min)
- 14:00 — Slide: "The release workflow — three artefacts, one tag." (1 min)
- 15:00 — **Demo D** — `release.yml` head + permissions block. (3 min)
- 18:00 — **Demo E** — `install.mjs` dry-run + `extensions_manage` round-trip. (1 min)
- 19:00 — Slide: "Takeaway." Four controls + CODEOWNERS. (1 min, closes at 20:00)

## 4. Expected pitfalls

- **Attendee asks "why can't I just use `github/awesome-copilot` at work?"** Answer: you can — **on the allowlist**. The point is not "public is bad", it is "default-allow is bad." A curated public source pinned in `org-policy.example.yaml` is fine; a wildcard default is not. Show the third allowlist entry as the in-policy example.
- **`minimum_cli_version` ≠ `copilot_cli_version_floor`.** Someone bumps one and forgets the other. The manifest-schema test in this repo fails on next `npm test`. Fix in the same commit; never two commits apart.
- **Someone proposes editing the CODEOWNERS file in the same PR as the manifest.** That defeats the gate. Refuse on stage — the CODEOWNERS change needs its own PR with its own review path.
- **Release workflow missing `id-token: write` or `attestations: write`.** The attestation step silently fails in a log line you have to scroll for. Show the job-level permissions block before demo D runs; forewarn the failure mode.
- **SBOM step skipped because the network was flaky.** Do **not** gate installs on workflow exit code — gate on SBOM asset presence. Mention this verbally during demo D.
- **Attendee wants to delete a deprecated version to "clean up."** Hard no. Shipped versions are append-only. Mark `deprecated: true`, add `migration_to:`, keep the tag. Deleting it breaks every consumer pinned to it.
- **Room asks "does `COPILOT_PLUGIN_REGISTRIES` support multiple?"** Yes — comma-separated, and the allowlist still gates each one. Mention in passing; do not derail the demo flow.

## 5. Q&A prompts

Seed these if the room is quiet:

- "Who is running a private plugin registry today? How did you pick between a private repo and a package registry?"
- "What does your `org-policy.yaml` allowlist look like — how many entries, how often does it change?"
- "Has anyone enforced signed-release-plus-SBOM in CI? What was the enforcement seam — CI gate, install script, both?"
- "CODEOWNERS on the manifest — is your security team on that path, or just your platform team?"
- "How do you handle breaking changes in a shipped plugin? Deprecation window, migration hint, release-notes convention?"
- "What did it cost you the first time a developer installed from an un-allowlisted source?"

## 6. Advanced-tip callouts

Drop these between slides as time permits. Each is ~30 seconds.

- **`COPILOT_PLUGIN_REGISTRIES` is the cheapest enforcement seam.** Set it in the devcontainer image and 95% of accidental public installs stop cold — before the allowlist even evaluates.
- **The allowlist evaluator is one function.** `isAllowed(policy, source)` — lift it into any CI gate. It is 20 lines of JavaScript; do not reinvent it per repo.
- **CycloneDX, not SPDX.** `anchore/sbom-action@v0` defaults to CycloneDX and the release workflow pins that format explicitly. If your org has an SPDX pipeline elsewhere, convert at the consumer, not the producer.
- **`actions/attest-build-provenance` is the SLSA provenance primitive.** Free, one action, `id-token: write` + `attestations: write`. If you are not using it yet, start with the plugin release workflow — smallest possible surface to prove it works.
- **Manifest `mcp_servers:` lets a plugin ship MCP wiring.** A plugin can declare an MCP server (stdio / http) as part of its entrypoints — the consumer does not have to edit `~/.copilot/mcp-config.json` by hand. Useful when the plugin **is** the MCP integration.
- **`deprecated: true` + `migration_to:` is a metadata contract.** Consumer tooling can warn on install of a deprecated version and surface the migration target. It is not enforced by the CLI today, but the fields are stable — ship them now.
- **Segment wildcards are not regex.** `contoso-internal/*` matches one segment. `contoso-*/*` matches one segment on both sides. There is no `**`; if you need arbitrary-depth matching, split it into two allowlist entries.
