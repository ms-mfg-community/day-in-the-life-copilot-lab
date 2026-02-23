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
3. **Check existing test patterns** in `ContosoUniversity.Tests/`
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

1. Build: `dotnet build ContosoUniversity.Tests/`
2. Run: `dotnet test ContosoUniversity.Tests/ --filter "{ClassName}"`
3. Report results
