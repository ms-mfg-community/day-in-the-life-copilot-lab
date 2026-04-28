---
title: "Verify .NET changes with a full solution build, not just tests"
scope: project
tags: [dotnet, verification, build, ci]
created: 2026-04-24
updated: 2026-04-24
related:
  - ../../AGENTS.md
  - ../../.github/instructions/dotnet.instructions.md
---

# Verify .NET changes with a full solution build, not just tests

## Summary

After modifying any project under `dotnet/`, run
`dotnet build dotnet/ContosoUniversity.sln` in addition to `dotnet test`.
`dotnet test` only restores and builds the test projects' dependency
graph — a Web-only breakage (missing Razor partial, broken
`Program.cs`, unreferenced project) can slip through a green test run.

## Context

Discovered during lab development when a refactor left
`ContosoUniversity.Web` failing to build while the xUnit suite stayed
green because none of the test projects referenced the affected file.
CI caught it; the local pre-commit loop did not.

## Pattern

Always run, in this order:

```bash
# WSL / macOS / Linux
dotnet restore dotnet/ContosoUniversity.sln
dotnet build   dotnet/ContosoUniversity.sln --no-restore
dotnet test    dotnet/ContosoUniversity.sln --no-build
```

```powershell
# Windows PowerShell
dotnet restore dotnet\ContosoUniversity.sln
dotnet build   dotnet\ContosoUniversity.sln --no-restore
dotnet test    dotnet\ContosoUniversity.sln --no-build
```

If any step fails, stop and fix before moving on. `--no-build` on the
test step guarantees the test run is using the artifacts produced by
the explicit build, not a silent incremental rebuild.

## Counter-examples

- ❌ `dotnet test` alone after editing a Razor view.
- ❌ `dotnet build` in the `Web/` project directory only — skips
  Infrastructure and Core dependency graphs.

## Also applies to

Lab code blocks that teach verification. Every lab that mutates .NET
code should instruct learners to run the full build + test pair, and
should ship both WSL/Bash and PowerShell variants of the commands.

## Revision log

- 2026-04-24 — Created during Phase A of the Lab 10 rewrite.
