# Enterprise Harness Bundle

This bundle packages three small role agents for a governed agentic SDLC. It
does not replace Spec Kit's stage commands or an individual repository's own
knowledge.

## Components and load modes

| Component              | Load mode           | Contract                                                                    |
| ---------------------- | ------------------- | --------------------------------------------------------------------------- |
| `spec-author` agent    | Dispatcher-mediated | Invoked for specification work and bound to `speckit.specify`.              |
| `task-executor` agent  | Dispatcher-mediated | Invoked for approved implementation tasks.                                  |
| `qa-reviewer` agent    | Dispatcher-mediated | Invoked independently with spec, tasks, diff, and executed evidence.        |
| `spec-authoring` skill | Lazy/on-demand      | Activates from its description and binds to the installed Spec Kit command. |
| `task-execution` skill | Lazy/on-demand      | Activates for bounded implementation work.                                  |
| `qa-review` skill      | Lazy/on-demand      | Binds to the organization-owned QA stage and evidence contract.             |

Rules that must apply on every turn belong in enterprise/repository
instructions, managed settings, hooks, or deterministic checks—not in a skill
whose activation depends on probabilistic description matching.

## Security boundaries

Every agent declares an explicit, non-wildcard `tools:` list. The QA agent has
`read`, `search`, and `execute` for evidence, and no `edit` tool. Its
agent-scoped `qa-boundary` MCP server exposes one tool, `write_verdict`, which
validates the verdict and always writes `qa-review.md` at the repository root.
The server is bundled locally and resolved through `${PLUGIN_ROOT}`; it does
not fetch or execute a mutable external MCP package. Copilot CLI expands
`${PLUGIN_ROOT}` in a plugin agent's `mcp-servers` from version 1.0.85, which
is above the registry's general CLI floor, so the verdict writer needs 1.0.85
or later. VS Code and other IDE custom agents don't use an agent's
`mcp-servers`, so the verdict writer is only available in Copilot CLI.

`execute` can still write files at run time. The boundary rests on the missing
`edit` tool, the fixed-path verdict writer, and the live eval in
`evals/qa-review.md`, which fails if a QA run changes anything except
`qa-review.md`. Run that eval before each release; `release.yml` doesn't run
it. It checks behavior before release and is not runtime prevention. For
runtime prevention, add managed `permissions.deny` rules such as `Edit(...)`
and `Shell(...)` patterns. They apply to every agent in a session, not just
the QA reviewer, so use them where that scope fits.

Installing a plugin activates code and instructions. Treat file presence as
execution: review the manifest, agents, skills, hooks, scripts, MCP
configuration, and release provenance before enabling a release.

## Repository knowledge and precedence

Plugins can contribute reusable rules/instructions, but repository-specific
architecture, domain knowledge, `AGENTS.md`, and path instructions stay
repository-owned. See Labs 2 and 10 for those layers. A same-ID definition at a
closer scope can shadow centrally distributed agents or skills, so inventory
collisions during rollout rather than treating installation as enforcement.

## Versioning and rollback

- Changing an agent or skill **description** changes activation behavior and
  requires a major version.
- A body-only clarification that preserves activation and outputs is a patch.
- Additive compatible components are a minor version.
- Publish immutable tags. `qa-review.md` records the bundle version from
  `manifest.yaml`; use it in downstream evidence. `gen_ai.agent.version`
  carries the agent definition's version when known and the runtime version
  otherwise, so check which one the target client emits before attributing a
  release to it.
- To roll back a bad mandated release, repoint the marketplace entry to the
  last approved immutable tag or commit. `enabledPlugins` needs no change: it
  maps each plugin to `true` or `false` and carries no version. Retain the bad
  release for audit rather than deleting it.

Requests for new primitives arrive as pull requests to the marketplace
repository. `CODEOWNERS` supplies platform and security review before a release
can become the enterprise baseline.

## Verification

```powershell
node enterprise-harness-bundle/scripts/install.mjs
node enterprise-harness-bundle/scripts/scan-unicode.mjs enterprise-harness-bundle
npm test -- tests/enterprise-harness-bundle
```

Before a release, also run the live QA eval described in
[`evals/qa-review.md`](evals/qa-review.md). It runs the agent through Copilot
CLI, so it uses AI credits and isn't part of `npm test`.
