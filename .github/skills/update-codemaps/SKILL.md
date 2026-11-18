---
name: update-codemaps
description: "Analyze codebase structure and update architecture documentation with import/export dependency maps"
disable-model-invocation: true
---
# Update Codemaps

Analyze the codebase structure and update the architecture documentation in `docs/architecture/`. Write the maps there, not into a new top-level folder: the doc-blocker hook (`scripts/hooks/pre-tool-use-doc-blocker.sh`) rejects new `.md` files outside `docs/`, `.github/`, `labs/` and the other paths it allows.

1. Scan both tracks for imports, exports, and dependencies:
   - .NET: the project references in each `.csproj` under `dotnet/`, plus namespaces, `using` directives and DI registrations (`Program.cs`, `DependencyInjection.cs`)
   - Node: the `import` graph across `node/core/`, `node/infra/`, `node/web/` and `node/tests/`
2. Generate token-lean codemaps in the following format:
   - `docs/architecture/overview.md` - Overall architecture and how the two tracks map to the same domain
   - `docs/architecture/dotnet.md` - Core, Infrastructure and Web layering, DI wiring, test projects
   - `docs/architecture/node.md` - core, infra and web layering, routes, test layout
   - `docs/architecture/data.md` - Entities (Student, Course, Instructor, Department, Enrollment), the EF Core `SchoolContext` and the Drizzle schema

3. Calculate diff percentage from previous version
4. If changes > 30%, request user approval before updating
5. Add freshness timestamp to each codemap
