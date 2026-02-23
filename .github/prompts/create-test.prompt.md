---
description: "Generate unit tests for a .NET component using xUnit with Arrange-Act-Assert pattern and 80%+ coverage"
agent: "agent"
---

# Create Test

Generate comprehensive xUnit tests for a target .NET class or method.

## Process

1. **Analyze** the target class/method — identify public API, dependencies, and business rules.
2. **Generate** an xUnit test class with proper structure and naming.
3. **Cover** happy path, edge cases, and error scenarios.
4. **Mock** external dependencies using Moq.
5. **Verify** coverage targets are met.

## Test Naming Convention

Use the `MethodName_Condition_ExpectedResult()` pattern:

```csharp
[Fact]
public void GetById_WithValidId_ReturnsStudent() { }

[Fact]
public void GetById_WithInvalidId_ReturnsNull() { }

[Fact]
public void Create_WithNullName_ThrowsArgumentException() { }
```

## Test Structure

Use the Arrange-Act-Assert pattern:

```csharp
[Fact]
public void MethodName_Condition_ExpectedResult()
{
    // Arrange
    var sut = CreateSystemUnderTest();

    // Act
    var result = sut.MethodUnderTest();

    // Assert
    Assert.NotNull(result);
}
```

## Scenarios to Cover

- **Happy path** — valid inputs produce expected outputs
- **Edge cases** — null, empty, boundary values, zero, max values
- **Error scenarios** — invalid input, missing dependencies, exceptions
- **State transitions** — verify side effects and state changes

## Integration Tests

Use `WebApplicationFactory` when testing controllers or endpoints:

```csharp
public class StudentApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public StudentApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }
}
```

## Coverage Requirements

- **80% minimum** overall code coverage
- All public methods must have at least one test
- All error paths must be exercised
