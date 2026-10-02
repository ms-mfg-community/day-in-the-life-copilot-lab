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
only `read` and `search` built-ins. Its agent-scoped `qa-boundary` MCP server
exposes `run_evidence` and `write_verdict`, so it can execute behavioral checks
and write `qa-review.md` without receiving a general shell or edit tool.

`run_evidence` snapshots Git-visible tracked and untracked non-ignored files,
restores unauthorized modifications, and fails if anything except
`qa-review.md` changes. Git metadata and ignored files are outside this
file-write boundary. `write_verdict` validates the verdict and always targets
that fixed file. The server is bundled locally and resolved through
`${PLUGIN_ROOT}`; it does not fetch or execute a mutable external MCP package.

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
- Publish immutable tags and record the manifest version in downstream
  evidence. Do not assume `gen_ai.agent.version` is populated until the target
  client has been verified.
- To roll back a bad mandated release, point the marketplace entry to the last
  approved immutable tag, update the mandated plugin version, and retain the
  bad release for audit rather than deleting it.

Requests for new primitives arrive as pull requests to the marketplace
repository. `CODEOWNERS` supplies platform and security review before a release
can become the enterprise baseline.

## Verification

```powershell
node enterprise-harness-bundle/scripts/install.mjs
node enterprise-harness-bundle/scripts/scan-unicode.mjs enterprise-harness-bundle
npm test -- tests/enterprise-harness-bundle
```
