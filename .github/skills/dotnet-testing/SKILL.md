---
name: dotnet-testing
description: .NET testing patterns for ContosoUniversity using xUnit, Moq, and WebApplicationFactory. Covers unit tests, integration tests, test infrastructure, mocking, and naming conventions.
---

# .NET Testing Patterns

Testing patterns and infrastructure for ASP.NET Core applications using xUnit, Moq, and WebApplicationFactory.

## Test Naming Convention

Use `MethodName_Condition_ExpectedResult` for all test methods:

```csharp
[Fact]
public async Task GetByIdAsync_ValidId_ReturnsStudent()

[Fact]
public async Task Details_NullId_ReturnsNotFound()

[Theory]
[InlineData("")]
[InlineData(null)]
public async Task Create_EmptyLastName_FailsValidation(string? lastName)
```

## Unit Test Pattern

```csharp
public class StudentsControllerTests
{
    private readonly Mock<IRepository<Student>> _mockRepo;
    private readonly StudentsController _controller;

    public StudentsControllerTests()
    {
        _mockRepo = new Mock<IRepository<Student>>();
        _controller = new StudentsController(_mockRepo.Object);
    }

    [Fact]
    public async Task Index_WithStudents_ReturnsViewWithStudentList()
    {
        // Arrange
        var students = new List<Student>
        {
            new() { ID = 1, FirstMidName = "Carson", LastName = "Alexander" }
        };
        _mockRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(students);

        // Act
        var result = await _controller.Index();

        // Assert
        var viewResult = Assert.IsType<ViewResult>(result);
        var model = Assert.IsAssignableFrom<IEnumerable<Student>>(viewResult.ViewData.Model);
        Assert.Single(model);
    }
}
```

## Integration Test Pattern

```csharp
public class StudentIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public StudentIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetStudents_ReturnsSuccessAndHtml()
    {
        var response = await _client.GetAsync("/Students");
        response.EnsureSuccessStatusCode();
    }
}
```

## Edge Cases to Always Test

| Category | Examples |
|----------|----------|
| Null inputs | `null` ID, `null` model |
| Empty collections | No students in database |
| Invalid IDs | 0, -1, non-existent |
| Validation failures | Missing required fields |
| Database errors | Repository throws exception |
