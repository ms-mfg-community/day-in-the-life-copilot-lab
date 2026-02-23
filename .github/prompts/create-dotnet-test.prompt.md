---
description: "Generate xUnit tests for a ContosoUniversity class. Creates unit tests with Moq mocks following MethodName_Condition_ExpectedResult naming. Covers happy paths, edge cases, and error scenarios."
mode: "agent"
tools: ["read", "edit", "execute", "search"]
---

# Create .NET Test

Generate comprehensive xUnit tests for a ContosoUniversity class.

## Instructions

1. **Read the source file** specified by the user (or the currently open file)
2. **Identify all public methods** that need testing
3. **Check existing test patterns** in `ContosoUniversity.Tests/`
4. **Generate a test class** following the conventions below

## Test File Location

- Controller tests → `ContosoUniversity.Tests/Controllers/{Name}ControllerTests.cs`
- Integration tests → `ContosoUniversity.Tests/Integration/{Name}IntegrationTests.cs`
- Model/validation tests → `ContosoUniversity.Tests/Models/{Name}Tests.cs`

## Required Structure

```csharp
using Moq;
using Xunit;
using Microsoft.AspNetCore.Mvc;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Web.Controllers;

namespace ContosoUniversity.Tests.Controllers;

public class {ClassName}Tests
{
    // Mock dependencies
    private readonly Mock<IRepository<{Entity}>> _mockRepo;
    private readonly {ClassName} _sut; // System Under Test

    public {ClassName}Tests()
    {
        _mockRepo = new Mock<IRepository<{Entity}>>();
        _sut = new {ClassName}(_mockRepo.Object);
    }

    // Tests follow...
}
```

## Naming Convention

Use `MethodName_Condition_ExpectedResult`:

- `Index_WithStudents_ReturnsViewWithStudentList`
- `Details_NullId_ReturnsNotFound`
- `Create_ValidModel_RedirectsToIndex`
- `Delete_NonExistentId_ReturnsNotFound`

## Coverage Requirements

For each public method, generate tests for:

1. **Happy path** — expected input produces expected output
2. **Null/missing input** — null parameters, missing required fields
3. **Not found** — entity does not exist in database
4. **Validation failure** — invalid model state
5. **Error handling** — repository throws exception

## After Generating

1. Verify the test file compiles: `dotnet build ContosoUniversity.Tests/`
2. Run the tests: `dotnet test ContosoUniversity.Tests/ --filter "{ClassName}"` 
3. Report results to the user
