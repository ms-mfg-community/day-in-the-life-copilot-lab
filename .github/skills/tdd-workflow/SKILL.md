---
name: tdd-workflow
description: Use this skill when writing new features, fixing bugs, or refactoring code. Enforces test-driven development with 80%+ coverage including unit, integration, and E2E tests.
---

# Test-Driven Development Workflow

This skill ensures all code development follows TDD principles with comprehensive test coverage.

## When to Activate

- Writing new features or functionality
- Fixing bugs or issues
- Refactoring existing code
- Adding controller actions or service methods
- Creating new domain entities or repositories

## Core Principles

### 1. Tests BEFORE Code
ALWAYS write tests first, then implement code to make tests pass.

### 2. Coverage Requirements
- Minimum 80% coverage (unit + integration + E2E)
- All edge cases covered
- Error scenarios tested
- Boundary conditions verified

### 3. Test Types

#### Unit Tests (xUnit)
- Individual service methods
- Domain entity logic
- Repository operations (with in-memory DB)
- Helpers and utilities

#### Integration Tests (WebApplicationFactory)
- Controller endpoints
- Database operations with EF Core
- Service interactions
- Middleware behavior

#### E2E Tests (Playwright)
- Critical user flows
- Complete workflows
- Browser automation
- UI interactions

## TDD Workflow Steps

### Step 1: Write User Journeys
```
As a [role], I want to [action], so that [benefit]

Example:
As an administrator, I want to create a new course with credits,
so that students can enroll in it next semester.
```

### Step 2: Generate Test Cases
For each user journey, create comprehensive test cases:

```csharp
public class CourseServiceTests
{
    [Fact]
    public async Task CreateCourse_ValidData_ReturnsCourse() { }

    [Fact]
    public async Task CreateCourse_DuplicateTitle_ThrowsException() { }

    [Fact]
    public async Task CreateCourse_InvalidCredits_ThrowsValidationException() { }

    [Fact]
    public async Task CreateCourse_NonExistentDepartment_ThrowsNotFoundException() { }
}
```

### Step 3: Run Tests (They Should Fail)
```bash
dotnet test
# Tests should fail - we haven't implemented yet
```

### Step 4: Implement Code
Write minimal code to make tests pass:

```csharp
// Implementation guided by tests
public async Task<Course> CreateCourseAsync(CreateCourseDto dto)
{
    // Minimal implementation to pass tests
}
```

### Step 5: Run Tests Again
```bash
dotnet test
# Tests should now pass
```

### Step 6: Refactor
Improve code quality while keeping tests green:
- Remove duplication
- Improve naming
- Optimize performance
- Enhance readability

### Step 7: Verify Coverage
```bash
dotnet test --collect:"XPlat Code Coverage"
# Verify 80%+ coverage achieved
```

## Testing Patterns

### Unit Test Pattern (xUnit + Moq)
```csharp
using Moq;
using Xunit;

public class StudentServiceTests
{
    private readonly Mock<IStudentRepository> _mockRepository;
    private readonly StudentService _service;

    public StudentServiceTests()
    {
        _mockRepository = new Mock<IStudentRepository>();
        _service = new StudentService(_mockRepository.Object);
    }

    [Fact]
    public async Task GetById_ExistingId_ReturnsStudent()
    {
        // Arrange
        var expected = new Student { Id = 1, LastName = "Smith", FirstMidName = "John" };
        _mockRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(expected);

        // Act
        var result = await _service.GetByIdAsync(1);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Smith", result.LastName);
    }

    [Fact]
    public async Task GetById_NonExistentId_ReturnsNull()
    {
        // Arrange
        _mockRepository.Setup(r => r.GetByIdAsync(999)).ReturnsAsync((Student?)null);

        // Act
        var result = await _service.GetByIdAsync(999);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task Create_DuplicateEmail_ThrowsException()
    {
        // Arrange
        var dto = new CreateStudentDto { LastName = "Smith", FirstMidName = "John" };
        _mockRepository.Setup(r => r.ExistsAsync(It.IsAny<string>())).ReturnsAsync(true);

        // Act & Assert
        await Assert.ThrowsAsync<DuplicateEntityException>(
            () => _service.CreateAsync(dto));
    }
}
```

### Integration Test Pattern (WebApplicationFactory)
```csharp
using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using Xunit;

public class StudentsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public StudentsControllerTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetStudents_ReturnsSuccessStatusCode()
    {
        // Act
        var response = await _client.GetAsync("/Students");

        // Assert
        response.EnsureSuccessStatusCode();
        Assert.Equal("text/html; charset=utf-8",
            response.Content.Headers.ContentType?.ToString());
    }

    [Fact]
    public async Task GetStudent_InvalidId_ReturnsNotFound()
    {
        // Act
        var response = await _client.GetAsync("/Students/Details/99999");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```

### E2E Test Pattern (Playwright)
```csharp
using Microsoft.Playwright;
using Xunit;

public class StudentE2ETests : IAsyncLifetime
{
    private IPlaywright _playwright = null!;
    private IBrowser _browser = null!;
    private IPage _page = null!;

    public async Task InitializeAsync()
    {
        _playwright = await Playwright.CreateAsync();
        _browser = await _playwright.Chromium.LaunchAsync();
        _page = await _browser.NewPageAsync();
    }

    [Fact]
    public async Task User_CanViewStudentList()
    {
        // Navigate to students page
        await _page.GotoAsync("https://localhost:5001/Students");

        // Verify page loaded
        await Expect(_page.Locator("h2")).ToContainTextAsync("Students");

        // Verify student table is displayed
        var rows = _page.Locator("table tbody tr");
        var count = await rows.CountAsync();
        Assert.True(count > 0, "Student table should contain rows");
    }

    [Fact]
    public async Task User_CanCreateNewStudent()
    {
        await _page.GotoAsync("https://localhost:5001/Students/Create");

        // Fill the form
        await _page.FillAsync("#LastName", "TestStudent");
        await _page.FillAsync("#FirstMidName", "Integration");
        await _page.FillAsync("#EnrollmentDate", "2024-09-01");

        // Submit
        await _page.ClickAsync("input[type='submit']");

        // Verify redirect to index
        await Expect(_page).ToHaveURLAsync(new Regex("/Students$"));
    }

    public async Task DisposeAsync()
    {
        await _browser.DisposeAsync();
        _playwright.Dispose();
    }
}
```

## Test File Organization

```
dotnet/ContosoUniversity.Tests/
├── Unit/
│   ├── Services/
│   │   ├── StudentServiceTests.cs
│   │   └── CourseServiceTests.cs
│   ├── Entities/
│   │   ├── StudentTests.cs
│   │   └── EnrollmentTests.cs
│   └── Helpers/
│       └── PaginatedListTests.cs
├── Integration/
│   ├── Controllers/
│   │   ├── StudentsControllerTests.cs
│   │   └── CoursesControllerTests.cs
│   └── Data/
│       └── StudentRepositoryTests.cs
└── Fixtures/
    ├── TestDatabaseFixture.cs
    └── TestDataBuilder.cs

dotnet/ContosoUniversity.PlaywrightTests/
├── StudentE2ETests.cs
├── CourseE2ETests.cs
└── NavigationE2ETests.cs
```

## Mocking with Moq

### Repository Mock
```csharp
var mockRepo = new Mock<IStudentRepository>();
mockRepo.Setup(r => r.GetAllAsync())
    .ReturnsAsync(new List<Student>
    {
        new() { Id = 1, LastName = "Smith", FirstMidName = "John" },
        new() { Id = 2, LastName = "Doe", FirstMidName = "Jane" }
    });
```

### DbContext with In-Memory Database
```csharp
private static SchoolContext CreateInMemoryContext()
{
    var options = new DbContextOptionsBuilder<SchoolContext>()
        .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
        .Options;

    var context = new SchoolContext(options);
    context.Database.EnsureCreated();
    return context;
}
```

### Logger Mock
```csharp
var mockLogger = new Mock<ILogger<StudentService>>();
// Verify logging occurred
mockLogger.Verify(
    x => x.Log(
        LogLevel.Error,
        It.IsAny<EventId>(),
        It.IsAny<It.IsAnyType>(),
        It.IsAny<Exception>(),
        It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
    Times.Once);
```

## Test Coverage Verification

### Run Coverage Report
```bash
dotnet test --collect:"XPlat Code Coverage"
# or with ReportGenerator
dotnet test --collect:"XPlat Code Coverage" -- DataCollectionRunSettings.DataCollectors.DataCollector.Configuration.Format=cobertura
reportgenerator -reports:**/coverage.cobertura.xml -targetdir:coverage-report
```

## Common Testing Mistakes to Avoid

### ❌ WRONG: Testing Implementation Details
```csharp
// Don't test private methods or internal state
Assert.Equal(5, service._internalCounter);
```

### ✅ CORRECT: Test Observable Behavior
```csharp
// Test the public contract
var result = await service.GetStudentsAsync();
Assert.Equal(5, result.Count);
```

### ❌ WRONG: Brittle Selectors in E2E
```csharp
// Breaks easily
await page.ClickAsync(".css-class-xyz");
```

### ✅ CORRECT: Semantic Selectors
```csharp
// Resilient to changes
await page.ClickAsync("text=Submit");
await page.ClickAsync("[data-testid='submit-button']");
```

### ❌ WRONG: No Test Isolation
```csharp
// Tests share state — order-dependent
[Fact] public async Task CreatesStudent() { /* inserts into shared DB */ }
[Fact] public async Task UpdatesSameStudent() { /* depends on previous test */ }
```

### ✅ CORRECT: Independent Tests
```csharp
// Each test creates its own data
[Fact]
public async Task CreatesStudent()
{
    using var context = CreateInMemoryContext();
    // Test logic with isolated DB
}
```

## Continuous Testing

### Watch Mode During Development
```bash
dotnet watch test --project ContosoUniversity.Tests
# Tests run automatically on file changes
```

### CI/CD Integration
```yaml
# GitHub Actions
- name: Run Tests
  run: dotnet test --collect:"XPlat Code Coverage" --logger "trx"
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Best Practices

1. **Write Tests First** — Always TDD
2. **One Assert Per Test** — Focus on single behavior
3. **MethodName_Condition_ExpectedResult** — Clear naming convention
4. **Arrange-Act-Assert** — Clear test structure
5. **Mock External Dependencies** — Use Moq for isolation
6. **Test Edge Cases** — Null, empty, boundary values
7. **Test Error Paths** — Not just happy paths
8. **Keep Tests Fast** — Unit tests < 50ms each
9. **Clean Up After Tests** — Use `IDisposable` / `IAsyncLifetime`
10. **Review Coverage Reports** — Identify gaps

## Success Metrics

- 80%+ code coverage achieved
- All tests passing (green)
- No skipped or disabled tests
- Fast test execution (< 30s for unit tests)
- E2E tests cover critical user flows
- Tests catch bugs before production

---

**Remember**: Tests are not optional. They are the safety net that enables confident refactoring, rapid development, and production reliability.
