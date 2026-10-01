---
title: "Tech-Lead Harness & Marketplace Lockdown"
lab_number: 21
pace:
  presenter_minutes: 6
  self_paced_minutes: 25
registry: docs/_meta/registry.yaml
---

# 21 — Tech-Lead Harness & Marketplace Lockdown

This lab packages three role agents for an enterprise agentic SDLC and applies
centrally managed controls to the plugin marketplaces they may use. It extends
[Lab 11](lab11.md)'s plugin distribution pattern and
[Lab 16](lab16.md)'s `managed-settings.json` governance mechanism.

> ⏱️ Presenter pace: 6 minutes | Self-paced: 25 minutes

References:

- [How Spec Kit Develops Spec Kit: An Agentic SDLC](https://github.github.com/spec-kit/guides/agentic-sdlc.html)
- [EPIC-001 Handbook alignment and acceptance criteria](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/66)
- [Custom agents configuration](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Overriding enterprise-managed settings for teams](https://docs.github.com/en/enterprise-cloud@latest/copilot/how-tos/administer-copilot/manage-for-enterprise/use-managed-settings/override-settings-for-teams)
- [Lab 11 — Building & Distributing a Copilot Plugin](lab11.md)
- [Lab 16 — Enterprise Marketplace & Plugin Governance](lab16.md)
- [`enterprise-harness-bundle/`](../enterprise-harness-bundle/)
- [`docs/_meta/registry.yaml`](../docs/_meta/registry.yaml)

## 21.1 A Role Bundle, Not a Mandatory Pipeline

The bundle contains three agents and their supporting skills:

| Role              | Use it to                                                                 | Handoff                                                                                        |
| ----------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Spec Author**   | Turn a feature request into scenarios and observable acceptance criteria. | A human reviews the specification; unresolved decisions remain explicit.                       |
| **Task Executor** | Implement approved requirements with focused tests and evidence.          | A reviewer gets the diff and the exact checks that ran.                                        |
| **QA Reviewer**   | Compare the change and test evidence with the approved intent.            | Findings go to the implementer or human reviewer; the reviewer does not silently fix the diff. |

Each agent declares an explicit, non-wildcard `tools:` list. Omitting `tools:`
would grant every available tool, while `tools: []` would disable tools
entirely. The QA agent deliberately keeps `execute` so it can run behavioral
checks, but it has no general edit tool. Its only output is produced by the
deterministic `write-qa-verdict.mjs` writer at `qa-review.md`; the behavioral
eval verifies that no source file changes.

Spec Kit's published agentic SDLC guide treats planning, requirements,
design, development, testing, deployment, and maintenance as a map, not a
required sequence. A small change can stay in its issue and PR; work can begin
at an existing specification, test, or bug report. Use the roles where they add
value, and keep human decisions visible at handoffs.

The additional governance requirements in this lab are tracked by
[EPIC-001 cleanup issue #66](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/66):
least-privilege tools, behavioral evaluation, load-mode ownership, team pilots,
surface-specific settings, supply-chain scanning, and versioned rollback.

Agent analysis does not replace deterministic checks. Tests, linters, release
workflows, and maintainers' merge decisions remain separate evidence and
approval surfaces. Installing the bundle does not vendor Spec Kit; the
specification and QA bindings require the centrally initialized stage commands
introduced in later labs.

For this enterprise lab arc, the intended organizational route is
`constitution → epic → feature spec → plan → story tasks → implement → QA
review`, with rework allowed back to an earlier stage. That is an organization-
defined process, not a universal Spec Kit requirement; these role agents do
not enforce stage order on their own.

### Load lifecycle

| Primitive                          | Load mode                                       | Design implication                                                |
| ---------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| Repository/enterprise instructions | Eager preload                                   | Put rules here when they must apply to every relevant turn.       |
| Skills                             | Lazy/on-demand, matched from their descriptions | Do not hide non-negotiable policy in an auto-activated skill.     |
| Agents                             | Dispatcher-mediated                             | Select the role explicitly or let a supported client dispatch it. |

Spec Kit owns the stage commands and templates. The spec-author agent binds to
`speckit.specify`, and the QA agent binds to the organization-owned
`qa-review` stage instead of copying either rubric. The tests include a binding
check so those references cannot drift silently.

## 21.2 Check the Bundle Before Publishing

The bundle manifest follows the same contract as `plugin-template/`:
`minimum_cli_version` must match
`docs/_meta/registry.yaml` → `copilot_cli_version_floor`. The repository's
tests validate the bundle manifest and the installer's entrypoints.

Run the dry-run from the repository root:

**WSL/Bash:**

```bash
node enterprise-harness-bundle/scripts/install.mjs
```

**PowerShell:**

```powershell
node enterprise-harness-bundle/scripts/install.mjs
```

The command must report `ok=true`. It checks that every agent and skill
declared in `manifest.yaml` exists. It does not publish, sign, or install the
plugin into a user's environment. The bundle's tag-triggered release workflow
shows the Lab 11 convention for validating the tag, attaching an SBOM, and
attesting release provenance. It also rejects invisible and bidirectional
Unicode controls before release. The bundle has no MCP server; if one is added,
pin it to a reviewed version rather than `latest`.

Installing a primitive is executing it: the client discovers and activates the
files that arrive with the plugin. Review the full release contents, not only
the manifest.

## 21.3 Deny Unapproved Marketplace Sources

The portable `org-policy.example.yaml` is a local policy example; it is not
the centrally enforced marketplace setting. For an enterprise deployment,
configure the JSON at
`copilot/managed-settings.json` in the selected source organization's
`.github-private` repository, as described in Lab 16.

This combined example registers the internal bundle marketplace, requires its
plugin, and explicitly allows the GitHub-maintained
[`github/awesome-copilot`](https://github.com/github/awesome-copilot)
marketplace. Replace the example endpoint with the organization's collector
before deployment. Keep credentials out of the committed file; populate
collector authentication headers only through the approved secret-management
process.

```json
{
  "extraKnownMarketplaces": {
    "contoso-plugins": {
      "source": {
        "source": "github",
        "repo": "contoso-internal/enterprise-copilot-harness"
      },
      "autoUpdate": false
    }
  },
  "enabledPlugins": {
    "enterprise-harness@contoso-plugins": true
  },
  "strictKnownMarketplaces": [
    {
      "source": "github",
      "repo": "contoso-internal/enterprise-copilot-harness"
    },
    {
      "source": "github",
      "repo": "github/awesome-copilot"
    }
  ],
  "telemetry": {
    "enabled": true,
    "endpoint": "https://otel.contoso.example/v1/traces",
    "protocol": "http/protobuf",
    "captureContent": false,
    "lockCaptureContent": true,
    "serviceName": "copilot-enterprise",
    "resourceAttributes": {
      "deployment.environment": "production"
    },
    "headers": {}
  }
}
```

The marketplace key shapes are significant:

- `extraKnownMarketplaces` is a **named-object map**; each name points to a
  `source` object.
- `enabledPlugins` is a **boolean map** keyed as
  `PLUGIN-NAME@MARKETPLACE-NAME`.
- `strictKnownMarketplaces` is an **array of marketplace objects**. Only the
  sources in the array are permitted; an empty array (`[]`) means complete
  marketplace lockdown.

There is no documented first-party-marketplace exemption. If the organization
wants GitHub's maintained `awesome-copilot` marketplace, list its repository
explicitly as this example does. For a total marketplace lockout instead,
set `"strictKnownMarketplaces": []` and do not expect users to install from
any marketplace.

`telemetry.captureContent` is off here, and `lockCaptureContent` enforces that
choice. Capturing prompts or responses is a governance decision: a named
privacy/security approver should authorize it before an administrator enables
content capture. Telemetry is sent to the organization's configured collector;
GitHub does not receive or store those exported traces. The endpoint is
illustrative, and this Lab 21 example does not provision a collector. This
managed telemetry setting is supported for Copilot CLI and VS Code; Lab 25
covers the pipeline and offline/Azure reporting paths.

### Spec Kit `--yolo` compatibility result

Do **not** add `permissions.disableBypassPermissionsMode` to this baseline yet.
Spec Kit v1.0.12's Copilot integration appends `--yolo` by default unless
`SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0`. The current upstream Copilot CLI issue
[`github/copilot-cli#4528`](https://github.com/github/copilot-cli/issues/4528)
reports that non-interactive `-p --yolo` bypasses this managed key and remains
open. A conclusive local file-policy test requires administrator access to the
machine-level managed-settings location, which this worktree does not have.

Until a controlled enterprise test proves the interaction, run Spec Kit with:

**WSL/Bash:**

```bash
export SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0
specify workflow run <workflow>
```

**PowerShell:**

```powershell
$env:SPECKIT_COPILOT_ALLOW_ALL_TOOLS = "0"
specify workflow run <workflow>
```

Explicit agent tools and workflow permission grants then define the boundary.
This is a deliberate safe default, not a claim that the product bug is fixed.

## 21.4 Pilot with Team Overrides

Pilot the lockdown with one or two representative enterprise teams before
making it universal. Team overrides work only for a **server-managed**
deployment. Mark eligible keys as `overridable` in
`copilot/managed-settings.json`, map teams in `copilot/team-mappings.json`, and
put their values under `copilot/teams/*.json`.

For example, the baseline can expose a stricter marketplace value for team
pilots:

```json
{
  "strictKnownMarketplaces": {
    "overridable": [
      {
        "source": "github",
        "repo": "contoso-internal/enterprise-copilot-harness"
      },
      {
        "source": "github",
        "repo": "github/awesome-copilot"
      }
    ]
  }
}
```

```json
{
  "pilot.json": ["agentic-sdlc-pilot"]
}
```

```json
{
  "strictKnownMarketplaces": [
    {
      "source": "github",
      "repo": "contoso-internal/enterprise-copilot-harness"
    }
  ],
  "enabledPlugins": {
    "enterprise-harness@contoso-plugins": true
  }
}
```

`enabledPlugins` is additive per team. If a user belongs to several mapped
teams, GitHub combines the least restrictive value for each key. `telemetry`
cannot vary per team, so the combined Lab 21/Lab 25 telemetry policy remains an
enterprise-wide decision. MDM-managed and file-based deployments do not use
these team files.

## 21.5 Know the Governed Surfaces

| Surface             | Bundle primitives                                        | Marketplace/plugin keys | `telemetry` | Notes                                                                                                            |
| ------------------- | -------------------------------------------------------- | ----------------------: | ----------: | ---------------------------------------------------------------------------------------------------------------- |
| Copilot CLI         | Agents and skills                                        |                     Yes |         Yes | Primary bundle verification surface.                                                                             |
| VS Code             | Custom agents and skills                                 |                     Yes |         Yes | Uses the same enterprise marketplace policy.                                                                     |
| GitHub Copilot app  | Plugin-provided agents/skills supported by the app       |                     Yes |          No | Managed permission-key support varies by key.                                                                    |
| Copilot cloud agent | Repository/plugin capabilities supported by cloud agent  |                     Yes |          No | `permissions.*` managed keys are not supported in the published matrix.                                          |
| JetBrains IDEs      | Custom agents are preview; verify each bundled primitive |                     Yes |   Ambiguous | The key text names CLI/VS Code, while the published matrix also checks JetBrains; validate before relying on it. |

Copilot Code Review is not a managed-settings client.

Plugins can carry reusable instructions/rules, but they should not pretend to
contain repository-specific architecture or domain context. Keep repo-owned
instructions and `AGENTS.md` in the repository; see [Lab 2](lab02.md) and
[Lab 10](lab10.md). Before lockdown, inventory installed plugins, agents,
skills, instructions, hooks, MCP servers, and same-ID collisions. Repository
or user definitions can shadow centrally supplied agents or skills, so plugin
installation alone is not content enforcement.

New primitive requests arrive as pull requests to the marketplace repository
and pass `CODEOWNERS` review. Keep the bundle small enough for reviewers to
read in an afternoon.

Description text is part of the activation API: changing an agent or skill
description requires a major version; a body-only clarification is a patch.
Publish immutable releases. Roll back a bad mandated release by repointing the
marketplace entry and mandated plugin version to the last approved tag, while
retaining the bad release for audit. Use the bundle manifest version for U5/U6
attribution; do not assume `gen_ai.agent.version` is populated until verified.

## 21.6 Configure and Review the Policy

1. Inventory the primitives currently in use and check for same-ID collisions.
2. Have the enterprise administrator select the managed-settings source
   organization in AI Controls.
3. Review the combined file, replace the sample endpoint, and approve any
   telemetry content-capture decision before publishing it to the source
   repository's default branch.
4. Validate the bundle dry-run, agent binding tests, QA behavioral eval, and
   marketplace names against the
   `strictKnownMarketplaces` array before rolling the policy out.
5. Pilot through enterprise team mappings and verify each supported client.
6. Confirm the configuration is active in AI Controls before expanding it.

Changing `org-policy.example.yaml` alone does not enforce an enterprise
marketplace policy. Use `strictKnownMarketplaces` for client-enforced source
restriction; use the local evaluator only for the portable allowlist analogy
or a repository's own CI gate.

## 21.7 Check Your Work

✅ The bundle dry-run reports `ok=true`, and the manifest version floor
matches the registry.

✅ The three bundled roles separate specification, implementation, and
review, while allowing stages to be skipped or revisited when the work already
has adequate evidence.

✅ Every agent has explicit tools, the QA agent keeps executable evidence
gathering without a general edit tool, and its eval leaves only
`qa-review.md` changed.

✅ `extraKnownMarketplaces`, `enabledPlugins`, and
`strictKnownMarketplaces` use their documented map/map/array shapes.

✅ GitHub's maintained marketplace is explicitly listed when it is allowed;
`strictKnownMarketplaces: []` is identified as total lockdown.

✅ Telemetry content capture is disabled and locked in the example, and any
decision to enable it has a named approver.

✅ Team overrides are limited to server-managed deployments, least-restrictive
multi-team merging and additive plugins are understood, and telemetry remains
enterprise-wide.

✅ Spec Kit runs with `SPECKIT_COPILOT_ALLOW_ALL_TOOLS=0` until the unresolved
`--yolo`/managed-policy interaction is verified in a controlled environment.
