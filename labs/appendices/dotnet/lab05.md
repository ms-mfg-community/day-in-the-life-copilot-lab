---
title: ".NET Appendix — Lab 05 (MCP Configuration)"
lab_number: 5
track: dotnet
parent_lab: lab05.md
---

# .NET Appendix — Lab 05

This appendix lists MCP servers that are most useful for the **.NET track** of [Lab 05 — MCP Server Configuration](../../lab05.md).

> Pair with: [`labs/appendices/node/lab05.md`](../node/lab05.md) for the Node-track equivalent.

## Recommended MCP servers for .NET work

| Server | Why it helps a .NET dev |
|---|---|
| `context7` | Resolve official Microsoft Learn / .NET API / EF Core docs by package name. |
| `microsoft-learn` | First-party Microsoft Learn search and fetch — ASP.NET Core, EF Core, MAUI. |
| `memory` | Persist project conventions across sessions (e.g. "we always use repository pattern"). |
| `sequential-thinking` | Step through long EF Core migration plans. |

## Verify MCP servers see the dotnet/ paths

After moving the projects, your agent's `.NET search` calls should target `dotnet/ContosoUniversity.*` paths. A quick smoke test inside Copilot CLI:

```
@dotnet-dev Use Context7 to look up the EF Core 8 IRepository pattern and confirm we apply it correctly in dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs.
```

The agent should:

1. Call `resolve-library-id` for EF Core via Context7.
2. Read the actual file at `dotnet/ContosoUniversity.Infrastructure/Data/Repository.cs`.
3. Compare and report.
