# Prepared core: Phase 1 maintainer contract

This is the local, reproducible-core increment of [#38](https://github.com/ms-mfg-community/day-in-the-life-copilot-lab/issues/38),
based on `feature/modernize`. It is **not an approved browser-delivery release**.
The existing `.devcontainer` setup remains unchanged. The separate
`packaging/core/devcontainer.template.json` intentionally has no `image`, `build`,
or downloadable features; it is not a usable attendee entry point until Phase 2
supplies an approved published image and exercises real browser delivery.

Codespaces supplies remote compute. The image and sealed content remove package
setup. Prebuilds are only an optimization: GitHub explicitly excludes
`postCreateCommand` from prebuild execution. See [GitHub's prebuild documentation](https://github.com/github/docs/blob/main/content/codespaces/prebuilding-your-codespaces/about-github-codespaces-prebuilds.md).

## Build inputs and artifacts

The supported runtime profile is Linux x86-64, not host Windows dependencies or
an ARM image. Resolve changes during release preparation, never at an event.

| Input/artifact | Contract |
| --- | --- |
| `docs/_meta/registry.yaml` | Runtime base digests, Debian snapshot, tool pins, selected local MCP, Python direct requirements. Copilot and gh-aw consume the existing registry keys. |
| Root `package-lock.json` | Root development dependencies, including Vitest and workshop-builder dependencies. |
| `node/pnpm-lock.yaml` | Separate application dependency closure, including development-time `tsx`, TypeScript, native SQLite, tests, and Playwright. |
| `dotnet/*/packages.lock.json` | Full NuGet closure for every solution project, not copied restore assets tied to a build directory. |
| `packaging/core/tools/package-lock.json` | Exact Copilot CLI, pnpm, local MCP executables, TypeScript language server and supporting tooling; checked against registry pins. |
| `packaging/core/python/requirements.lock` | Hashed Linux CPython wheel closure for pandas/pyarrow fixture work. No pip resolution at startup. |
| Runtime image | Both .NET SDKs, Node, native modules built for this runtime, Python environment, Git/gh/gh-aw, Bash/jq/make/tmux, language servers, both Playwright browser revisions and their OS libraries. |
| `/opt/lab/bundles` | Separate root npm, Node pnpm, and NuGet archives. Hydration copies installed dependency content, not compiled demo applications. |
| `/opt/lab/nuget-feed` | Local-only recovery/restore source. Missing packages cannot fall back to nuget.org. |
| `/opt/lab/source.tar` | Exact committed source, with Git file modes. No working-tree changes, untracked credentials, host caches, or facilitator home are copied. |
| `/opt/lab/release.json` | Source commit/archive checksum, dependency-input hashes, archive checksums, platform/ABI, required content, and explicit capability boundaries. |
| `/opt/lab/inventory.json`, `*-sbom.cdx.json` | Resolved tools, OS packages, Python and application inventories, browser revisions, root/tool CycloneDX inventories, and locations of retained license material. These are not a completed Phase 5 provenance/license-compliance process. |

The Node and .NET Playwright versions remain independent. Each version's installer
runs during preparation, with browser garbage collection disabled. Runtime
`PLAYWRIGHT_BROWSERS_PATH` points to the immutable shared image directory.
Both revisions must work; a system Chrome substitution does not satisfy the
contract. See [Playwright browser version and path management](https://playwright.dev/dotnet/docs/browsers).

## Local preparation

Maintainers need a working **local Linux Docker engine**, Git, Node, and the root
development dependencies. These are release-preparation requirements, not attendee
installation instructions. The recipe uses public package/image sources during
this step. Do not supply tokens, Docker build secrets, personal homes, or tenant data.

Commit the intended changes locally first, naming files explicitly when staging.
Unrelated uncommitted changes are deliberately absent from the build archive.

```powershell
# From this repository, on the Phase 1 feature branch.
npm run test:packaging:coverage
node packaging\core\build.mjs --revision HEAD
$record = Get-Content packaging\core\out\release-record.json -Raw | ConvertFrom-Json
node packaging\core\verify.mjs --image $record.imageId
```

Equivalent Bash entry points are `bash packaging/core/build.sh --revision HEAD`
and `node packaging/core/verify.mjs --image <local-image-id>`.
`packaging/core/build.ps1` is the PowerShell wrapper.

`build.mjs` creates a fresh Git-archive context, checks the pinned inputs, builds
locally, and writes `packaging/core/out/release-record.json`. It never pushes,
publishes, opens a Codespace, changes credentials, or writes to GitHub.
The output distinguishes Docker's local **image ID** from a distribution digest:
`imageDigest: null` means unpublished, not a placeholder usable in a devcontainer.
Local image size is recorded without making download-time or cost promises.

The verification command refuses to pull an image. It creates only uniquely named
local test containers/volumes, with no passed-through tokens, Docker socket, host
home, or external network interfaces. It cleans up those specific resources.
Failure logs and successful evidence stay in ignored `packaging/core/out`.

## Prepared startup and developer commands

These commands run **inside the prepared Linux runtime**, in a compatible editable
checkout. The source can be supplied by Codespaces later; `init` never replaces it.

```bash
lab-core init
lab-core shell
# In that shell, ordinary development workflows use the prepared dependencies:
npm test -- --run tests/packaging
pnpm -C node build
pnpm -C node test
dotnet build dotnet/ContosoUniversity.sln
dotnet test dotnet/ContosoUniversity.Tests
pnpm -C node start
dotnet run --no-launch-profile --project dotnet/ContosoUniversity.Web
```

Use separate terminals for the two application servers. `lab-core exec -- COMMAND`
provides the same environment for a single command without starting an interactive
shell. `lab-core --workspace PATH ready` can address a renamed checkout explicitly;
commands invoked within a checkout's subdirectories locate its root.

The prepared shell disables network package resolution through npm/pnpm, pip,
Corepack and NuGet configuration. No initialization path runs an installer.
.NET restore regenerates `obj/project.assets.json` against the **real checkout
path**, using the local feed and hydrated package directory in locked mode.
It also runs when restore assets are absent or a checkout moves. Existing source,
databases, memory and installed dependency trees are not reseeded or replaced.
See [the .NET restore/configfile contract](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-restore).

Dependency manifest changes require a newly prepared release. Normal source edits
do not. Missing or corrupt image content, incompatible Node ABI/platform, altered
dependency inputs, unowned dependency directories, conflicting initialization, or
damaged initialized state produce errors. There is no `--ignore-failed-sources`,
registry retry, reset, or successful skip.

Some committed legacy Unix scripts have CRLF line endings. First initialization
converts those scripts to LF **only when their bytes still match the committed
hash recorded in the release**, preserving executable permissions. Already-edited
LF scripts are untouched; modified CRLF scripts fail clearly rather than being
rewritten. Resume never repeats this conversion. The original Git archive remains
unchanged and hash-bound to its commit, and the release records both original and
compatible script hashes. This does not edit or commit a maintainer's dirty hooks.

## State and configuration

| State | First creation / resume / replacement container |
| --- | --- |
| Source and worktrees | Remain editable in the checkout. Only checksum-matching pristine Unix scripts receive the first-run LF compatibility conversion described above; attendee edits are never replaced. Each worktree initializes its own dependencies and state. |
| `.lab-state/state.json` and dependency ownership markers | Initialize once; match the release before use. Interrupted hydration can continue only where ownership is provable. A stale initialization lock requires investigation, not automatic removal. |
| `.lab-state/nuget`, root/Node `node_modules` | Writable, attendee-owned hydrated copies. Resume verifies ownership; it does not reinstall missing initialized trees. pnpm's bundled store stays at its fixed image path. |
| `.lab-state/contoso-node.db` | Prepared Node startup opts into a file database. Transactional initialization records completion separately from row counts, so deleting all rows does not cause reseeding. The unprepared Node default stays in-memory. |
| `.lab-state/contoso-dotnet.db` | Prepared Development configuration opts into SQLite and transactional, marker-based initialization. Existing data and deliberate deletions survive resume; initialization failures stop the prepared app. The default app/test configuration keeps its prior initializer. |
| Memory, lessons and fixtures | Memory is checkout-local; existing `.copilot/lessons` and source-based lab work stay in the checkout. Readiness uses separate disposable memory probe data and an immutable image copy of the Parquet fixture; it does not rewrite or demand unchanged attendee memory/data. |
| CLI credentials, sessions and user-level LSP edits | Isolated under the attendee's home, not baked into the image or automatically exported. Treat home state as disposable across container replacement; renew sign-in and deliberately export non-secret customizations when needed. |
| Tool registrations | Missing per-user gh-aw/LSP registrations are restored from image content; edited LSP configuration and existing registrations are not overwritten. |

Only the prepared CLI configuration is selected; the tracked `.mcp.json`,
`.copilot/mcp-config.json`, and `.vscode/mcp.json` defaults are left untouched.
The `copilot` command in the prepared environment is a launcher for the **real
pinned Copilot binary**, with auto-update and built-in remote MCP disabled.
It disables existing MCP names for that invocation and supplies namespaced,
bundled filesystem/memory/sequential-thinking servers. Filesystem access is
restricted to that checkout's synthetic fixture directory. Language servers
point at the actual `node` and `dotnet` source roots.

GitHub API credentials are not proof of Copilot authorization. If an inherited
`GITHUB_TOKEN`/`GH_TOKEN` could silently select an identity, the launcher stops
unless an explicit Copilot credential or deliberate
`LAB_COPILOT_USE_GITHUB_TOKEN=1` choice is present. It never clears or changes
global credentials. This guard is not a completed Codespaces authentication
design. See [Copilot configuration-directory behavior](https://github.com/github/docs/blob/main/content/copilot/reference/copilot-cli-reference/cli-config-dir-reference.md).

The local replacement-container check uses the same `/workspaces` volume and a
fresh home. That is **not** evidence of real Codespaces create/resume/rebuild,
UID remapping, Settings Sync, dotfiles, image distribution, port privacy, or
standard-account/EMU behavior. Until Phase 2 exercises those paths, export
non-secret work and create a new workspace as the recovery path; never reset
or remove an attendee's checkout as a startup repair.

## Evidence and excluded claims

`verify.mjs` is an executable acceptance exercise, not a static configuration
check. It denies external networking, verifies package endpoint requests fail,
hydrates under a non-root identity, executes real local MCP tools, requests actual
language-server symbols, starts Chromium, tests native SQLite/Python/tmux, and
runs regression suites. It writes new failing tests against the real .NET and
Node view sources, edits those sources, recompiles/retests, and observes the
edited applications over HTTP. Both application E2E paths must execute against
their own prepared browsers.

It also checks resume, renamed checkout, an additional Git worktree, missing
content, and fresh-container reuse of persistent source/data. The only successful
evidence is the emitted `verified-image.json` tied to its actual image/release ID.
An image build or a staged template alone is not delivery evidence.

Still excluded from Phase 1: publishing and browser delivery; a live authenticated
Copilot model session; hosted GitHub workflows/agents and their separate runners;
tenant/Fabric/WorkIQ/Azure services; enterprise administration; incomplete ACP
transport; and curriculum/fallback-asset completion. The real Parquet fixture is
not Fabric or OneLake. Bundled plugin examples are not proof of marketplace
installation or enterprise enforcement. Existing workshop font/artwork/fallback
gaps are not relabeled as working packaged teaching assets.

Do not close #38 after this increment. Use references, not `Fixes`/`Closes`.
Image publication, remote writes, paid resources, deployment and organization
changes each require separate authorization.
