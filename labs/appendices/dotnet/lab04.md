---
title: ".NET Appendix — Lab 04 (Skills & Prompts)"
lab_number: 4
track: dotnet
parent_lab: lab04.md
---

# .NET Appendix — Lab 04

This appendix supplies the **.NET-track** content for [Lab 04 — Skills & Prompts](../../lab04.md): the full `dotnet-testing` skill body and the `create-dotnet-test` prompt body. The parent lab covers the conceptual skill/prompt pattern; this file gives you the .NET-flavored payload to paste in.

> Pair with: [`labs/appendices/node/lab04.md`](../node/lab04.md) for the Node-track equivalent.

## `.github/skills/dotnet-testing/SKILL.md`

**WSL/Bash:**

````bash
mkdir -p .github/skills/dotnet-testing
cat > .github/skills/dotnet-testing/SKILL.md << 'SKILL'
---
name: dotnet-testing
description: .NET testing patterns for ContosoUniversity using xUnit, Moq, and WebApplicationFactory. Covers unit tests, integration tests, test infrastructure, mocking, and naming conventions.
---

# .NET Testing Patterns

Testing patterns and infrastructure for ASP.NET Core applications using xUnit, Moq, and WebApplicationFactory.

## Test Naming Convention

Use `MethodName_Condition_ExpectedResult` for all test methods:

- `GetByIdAsync_ValidId_ReturnsStudent`
- `Details_NullId_ReturnsNotFound`
- `Create_EmptyLastName_FailsValidation`

## Unit Test Pattern

A unit test class for `StudentsController` should:

1. Mock `IRepository<Student>` with Moq.
2. Construct the controller with the mock.
3. Use `[Fact]` for single scenarios and `[Theory]` + `[InlineData]` for parameterised cases.
4. Assert on the `IActionResult` shape (`ViewResult`, `RedirectToActionResult`, `NotFoundResult`).

```text
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
        var students = new List<Student>
        {
            new() { ID = 1, FirstMidName = "Carson", LastName = "Alexander" }
        };
        _mockRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(students);

        var result = await _controller.Index();

        var viewResult = Assert.IsType<ViewResult>(result);
        var model = Assert.IsAssignableFrom<IEnumerable<Student>>(viewResult.ViewData.Model);
        Assert.Single(model);
    }
}
```

## Integration Test Pattern

```text
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
SKILL
````

**PowerShell:**

````powershell
New-Item -ItemType Directory -Path .github/skills/dotnet-testing -Force | Out-Null
@'
(paste the SKILL body shown above)
'@ | Out-File -FilePath .github/skills/dotnet-testing/SKILL.md -Encoding utf8
````

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
