---
name: dotnet-testing
description: .NET testing patterns for ContosoUniversity using xUnit, Moq, and WebApplicationFactory. Covers unit tests, integration tests, test infrastructure, mocking, and naming conventions.
---

# .NET Testing Patterns

Testing patterns and infrastructure for ASP.NET Core applications using xUnit, Moq, and WebApplicationFactory.

## When to Activate

- Writing or reviewing .NET test files (`*Tests.cs`, `*Test.cs`)
- Discussing xUnit, Moq, or WebApplicationFactory
- Creating test infrastructure for ASP.NET Core projects
- Asking about test coverage for .NET code

## Test Naming Convention

Use the `MethodName_Condition_ExpectedResult` pattern for all test methods:

```csharp
[Fact]
public async Task GetByIdAsync_ValidId_ReturnsStudent()

[Fact]
public async Task GetByIdAsync_InvalidId_ReturnsNull()

[Fact]
public async Task Create_InvalidModel_ReturnsViewWithErrors()

[Theory]
[InlineData("")]
[InlineData(null)]
public async Task Create_EmptyLastName_FailsValidation(string? lastName)
```

## Unit Test Patterns

### Controller Tests with Mocked Dependencies

```csharp
using Moq;
using Xunit;
using Microsoft.AspNetCore.Mvc;

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
            new() { ID = 1, FirstMidName = "Carson", LastName = "Alexander" },
            new() { ID = 2, FirstMidName = "Meredith", LastName = "Alonso" }
        };
        _mockRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(students);

        // Act
        var result = await _controller.Index();

        // Assert
        var viewResult = Assert.IsType<ViewResult>(result);
        var model = Assert.IsAssignableFrom<IEnumerable<Student>>(viewResult.ViewData.Model);
        Assert.Equal(2, model.Count());
    }

    [Fact]
    public async Task Details_NullId_ReturnsNotFound()
    {
        // Act
        var result = await _controller.Details(null);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Details_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockRepo.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Student?)null);

        // Act
        var result = await _controller.Details(999);

        // Assert
        Assert.IsType<NotFoundResult>(result);
    }
}
```

### Testing Model Validation

```csharp
[Fact]
public void Student_MissingLastName_FailsValidation()
{
    // Arrange
    var student = new Student { FirstMidName = "Test" };
    var context = new ValidationContext(student);
    var results = new List<ValidationResult>();

    // Act
    var isValid = Validator.TryValidateObject(student, context, results, true);

    // Assert
    Assert.False(isValid);
    Assert.Contains(results, r => r.MemberNames.Contains("LastName"));
}
```

## Integration Test Patterns

### WebApplicationFactory Setup

```csharp
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove the production database registration
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<SchoolContext>));
            if (descriptor != null) services.Remove(descriptor);

            // Add in-memory database for testing
            services.AddDbContext<SchoolContext>(options =>
                options.UseInMemoryDatabase("TestDb"));

            // Seed test data
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<SchoolContext>();
            db.Database.EnsureCreated();
            TestDataSeeder.Seed(db);
        });
    }
}
```

### Integration Test Class

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
        // Act
        var response = await _client.GetAsync("/Students");

        // Assert
        response.EnsureSuccessStatusCode();
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Students", content);
    }

    [Fact]
    public async Task GetStudent_InvalidId_Returns404()
    {
        // Act
        var response = await _client.GetAsync("/Students/Details/99999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

## Mocking Patterns

### Common Mock Setups

```csharp
// Return a specific result
_mockRepo.Setup(r => r.GetByIdAsync(1))
    .ReturnsAsync(new Student { ID = 1, LastName = "Test" });

// Return null (entity not found)
_mockRepo.Setup(r => r.GetByIdAsync(It.IsAny<int>()))
    .ReturnsAsync((Student?)null);

// Throw an exception
_mockRepo.Setup(r => r.GetAllAsync())
    .ThrowsAsync(new InvalidOperationException("Database unavailable"));

// Verify method was called
_mockRepo.Verify(r => r.UpdateAsync(It.Is<Student>(s => s.LastName == "Updated")),
    Times.Once);

// Capture argument
Student? capturedStudent = null;
_mockRepo.Setup(r => r.AddAsync(It.IsAny<Student>()))
    .Callback<Student>(s => capturedStudent = s)
    .Returns(Task.CompletedTask);
```

### Mocking Services

```csharp
var mockNotification = new Mock<INotificationService>();
mockNotification.Setup(n => n.SendAsync(It.IsAny<string>(), It.IsAny<string>()))
    .Returns(Task.CompletedTask);

var mockFileStorage = new Mock<IFileStorageService>();
mockFileStorage.Setup(f => f.SaveFileAsync(It.IsAny<Stream>(), It.IsAny<string>()))
    .ReturnsAsync("/uploads/test-file.pdf");
```

## Test Data Helpers

```csharp
public static class TestDataSeeder
{
    public static void Seed(SchoolContext context)
    {
        context.Students.AddRange(
            new Student { FirstMidName = "Carson", LastName = "Alexander",
                          EnrollmentDate = DateTime.Parse("2019-09-01") },
            new Student { FirstMidName = "Meredith", LastName = "Alonso",
                          EnrollmentDate = DateTime.Parse("2017-09-01") }
        );

        context.Courses.AddRange(
            new Course { CourseID = 1050, Title = "Chemistry", Credits = 3 },
            new Course { CourseID = 4022, Title = "Microeconomics", Credits = 3 }
        );

        context.SaveChanges();
    }
}
```

## Edge Cases to Always Test

| Category | Examples |
|----------|----------|
| Null inputs | `null` ID, `null` model |
| Empty collections | No students in database |
| Invalid IDs | 0, -1, `int.MaxValue`, non-existent |
| Validation failures | Missing required fields, exceeding string lengths |
| Concurrent access | Two updates to same entity |
| Database errors | Connection failures, constraint violations |

## Playwright E2E Patterns

```csharp
[Test]
public async Task StudentList_DisplaysStudents()
{
    await Page.GotoAsync("/Students");
    await Expect(Page.Locator("h2")).ToContainTextAsync("Students");

    var rows = Page.Locator("table tbody tr");
    await Expect(rows).ToHaveCountAsync(count => count > 0);
}

[Test]
public async Task CreateStudent_ValidData_RedirectsToIndex()
{
    await Page.GotoAsync("/Students/Create");
    await Page.FillAsync("#LastName", "TestStudent");
    await Page.FillAsync("#FirstMidName", "New");
    await Page.FillAsync("#EnrollmentDate", "2024-01-15");
    await Page.ClickAsync("input[type='submit']");

    await Expect(Page).ToHaveURLAsync(new Regex("/Students$"));
}
```

## Test Commands

```bash
dotnet test                                          # Run all tests
dotnet test --filter "FullyQualifiedName~Students"   # Filter by name
dotnet test --collect:"XPlat Code Coverage"          # With coverage
dotnet test --logger "console;verbosity=detailed"    # Verbose output
```
