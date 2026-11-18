---
name: update-docs
description: "Sync documentation from source-of-truth: Makefile targets, package.json scripts, and .NET and Node configuration, and generate CONTRIB.md and RUNBOOK.md"
disable-model-invocation: true
---
# Update Documentation

Sync documentation from the source-of-truth files of this dual-track repo (ASP.NET Core under `dotnet/`, Node under `node/`):

1. Read the command sources
   - `Makefile` targets (run `make help`), the root `package.json` scripts and `node/package.json` scripts
   - `dotnet/ContosoUniversity.sln` and the `.csproj` files for the .NET build and test commands
   - Generate a commands reference table covering both tracks

2. Read the configuration sources
   - .NET: the keys in `dotnet/ContosoUniversity.Web/appsettings*.json` (never copy real values)
   - Node: the environment variables read through `process.env` in `node/` (for example `PORT`, `HOST`, `CONTOSO_SQLITE_PATH`, `E2E_BASE_URL`)
   - Document purpose and format of each

3. Generate `docs/CONTRIB.md` with:
   - Development workflow
   - Available commands (both tracks)
   - Environment setup
   - Testing procedures

4. Generate `docs/RUNBOOK.md` with:
   - Deployment procedures
   - Monitoring and alerts
   - Common issues and fixes
   - Rollback procedures

5. Identify obsolete documentation:
   - Find docs not modified in 90+ days
   - List for manual review

6. Show diff summary

Single source of truth: the `Makefile`, `package.json`, `node/package.json`, `dotnet/ContosoUniversity.sln`, the `appsettings*.json` files, and `docs/_meta/registry.yaml` for pinned versions.

Write the generated `.md` files under `docs/` (architecture maps belong in `docs/architecture/`; see `/update-codemaps`). The doc-blocker hook rejects new `.md` files outside the paths it allows.

