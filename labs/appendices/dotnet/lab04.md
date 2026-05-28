---
title: ".NET Appendix — Lab 04 (Skills & Prompts)"
lab_number: 4
track: dotnet
parent_lab: lab04.md
---

# .NET Appendix — Lab 04

This appendix supplies the **.NET-track** content for [Lab 04 — Skills & Prompts](../../lab04.md): the full `dotnet-testing` skill body and the `create-dotnet-test` prompt body. The parent lab covers the conceptual skill/prompt pattern; this file gives you the .NET-flavored payload to paste in.

> Pair with: [`labs/appendices/node/lab04.md`](../node/lab04.md) for the Node-track equivalent.

> ⚠️ **Note (2026-04-24):** Per [docs.github.com](https://docs.github.com/en/copilot/tutorials/customization-library/prompt-files/your-first-prompt-file), prompt files (`.prompt.md`) are an **IDE-only** Copilot feature; the `@create-dotnet-test` invocation below works in Copilot Chat (VS Code / Visual Studio / JetBrains), not in Copilot CLI. The skill portion of this appendix is unaffected — skills run in CLI as written.

## `.github/skills/dotnet-testing/SKILL.md`

This appendix used to inline the full SKILL body, but the live skill at
[`.github/skills/dotnet-testing/SKILL.md`](../../../.github/skills/dotnet-testing/SKILL.md)
now covers **9 sections** (When to Activate, Test Naming, Unit Test Patterns,
Integration Test Patterns, Mocking Patterns, Test Data Helpers, Edge Cases,
Playwright E2E, Test Commands) — far more than would be readable in a heredoc.

For the lab, create a minimal **stub** so you've practised the skill-authoring
pattern (frontmatter + activation triggers + a short body), then read the live
skill for the production-grade examples.

**WSL/Bash:**

````bash
mkdir -p .github/skills/dotnet-testing
cat > .github/skills/dotnet-testing/SKILL.md << 'SKILL'
---
name: dotnet-testing
description: .NET testing patterns for ContosoUniversity using xUnit, Moq, and WebApplicationFactory. Covers unit tests, integration tests, mocking, and naming conventions.
---

# .NET Testing Patterns

Testing patterns for ASP.NET Core applications using xUnit, Moq, and WebApplicationFactory.

## When to Activate

Activate this skill when writing or reviewing tests under `dotnet/ContosoUniversity.Tests/`,
when adding xUnit `[Fact]`/`[Theory]` methods, or when wiring `WebApplicationFactory`-based
integration tests.

## Test Naming Convention

Use `MethodName_Condition_ExpectedResult` (e.g., `GetByIdAsync_ValidId_ReturnsStudent`).

> 📚 **Full pattern library:** see the canonical
> [`dotnet-testing` skill](../../../.github/skills/dotnet-testing/SKILL.md) for the
> complete 9-section reference (controller mocking, integration fixtures,
> Playwright E2E, edge-case checklist, common commands).
SKILL
````

**PowerShell:**

````powershell
New-Item -ItemType Directory -Path .github/skills/dotnet-testing -Force | Out-Null
@'
---
name: dotnet-testing
description: .NET testing patterns for ContosoUniversity using xUnit, Moq, and WebApplicationFactory. Covers unit tests, integration tests, mocking, and naming conventions.
---

# .NET Testing Patterns

Testing patterns for ASP.NET Core applications using xUnit, Moq, and WebApplicationFactory.

## When to Activate

Activate this skill when writing or reviewing tests under `dotnet/ContosoUniversity.Tests/`,
when adding xUnit `[Fact]`/`[Theory]` methods, or when wiring `WebApplicationFactory`-based
integration tests.

## Test Naming Convention

Use `MethodName_Condition_ExpectedResult` (e.g., `GetByIdAsync_ValidId_ReturnsStudent`).

> 📚 **Full pattern library:** see the canonical `dotnet-testing` skill at
> `.github/skills/dotnet-testing/SKILL.md` for the complete 9-section reference.
'@ | Out-File -FilePath .github/skills/dotnet-testing/SKILL.md -Encoding utf8
````

> 💡 **Why a stub here?** The lab's pedagogic goal is the skill-authoring
> *workflow* (create dir, write frontmatter + activation triggers, point at it
> from an agent). Once you've done that, the live skill is the source of
> truth for the full pattern set — keeping the appendix short avoids drift
> between this file and the production skill.

## `.github/prompts/create-dotnet-test.prompt.md`

**WSL/Bash:**

```bash
cat > .github/prompts/create-dotnet-test.prompt.md << 'PROMPT'
---
description: "Generate xUnit tests for a ContosoUniversity class. Creates unit tests with Moq mocks following MethodName_Condition_ExpectedResult naming."
mode: "agent"
tools: ["read", "edit", "execute", "search"]
---

# Create .NET Test

Generate comprehensive xUnit tests for a ContosoUniversity class.

## Instructions

1. **Read the source file** specified by the user (or the currently open file)
2. **Identify all public methods** that need testing
3. **Check existing test patterns** in `dotnet/ContosoUniversity.Tests/`
4. **Generate a test class** with these sections:
   - Mock setup in constructor
   - Happy path tests
   - Null/missing input tests
   - Not found tests
   - Validation failure tests
   - Error handling tests

## Naming Convention

Use `MethodName_Condition_ExpectedResult`:

- `Index_WithStudents_ReturnsViewWithStudentList`
- `Details_NullId_ReturnsNotFound`
- `Create_ValidModel_RedirectsToIndex`

## After Generating

1. Build: `dotnet build dotnet/ContosoUniversity.Tests/`
2. Run: `dotnet test dotnet/ContosoUniversity.Tests/ --filter "{ClassName}"`
3. Report results
PROMPT
```

## Try it

```
How should I write unit tests for the StudentsController in ContosoUniversity?
```

The `dotnet-testing` skill should auto-activate; you should see references to `MethodName_Condition_ExpectedResult` naming, Moq for mocking `IRepository<Student>`, and Arrange-Act-Assert.

```
@create-dotnet-test for dotnet/ContosoUniversity.Web/Controllers/CoursesController.cs
```

The prompt generates a complete test class for the `CoursesController`.
