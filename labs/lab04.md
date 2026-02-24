# 4 — Skills & Prompts

In this lab you will create a new skill and prompt template for .NET testing.

> ⏱️ Presenter pace: 4 minutes | Self-paced: 15 minutes

References:
- [Agent skills](https://docs.github.com/en/copilot/using-github-copilot/using-copilot-agent-skills)
- [Prompt files](https://docs.github.com/en/copilot/using-github-copilot/using-prompt-files)

## 4.1 Skills: Auto-Activating Knowledge

Skills are knowledge packs that Copilot loads **automatically** when the conversation topic matches their description. You don't invoke them — they activate on their own.

🖥️ **In your terminal:**

1. Look at a skill's frontmatter — the `description` drives activation:

**WSL/Bash:**
```bash
head -5 .github/skills/coding-standards/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/coding-standards/SKILL.md -Head 5
```

The `description` field is critical. A clear, specific description means better auto-activation.

> 💡 **Progressive disclosure:** Copilot only reads the skill `name` and `description` upfront. The full body loads only when relevant — so you can have dozens of skills without overwhelming the model's context window.

## 4.2 Create a Skill

Let's create a `.NET testing` skill with patterns specific to ContosoUniversity.

🖥️ **In your terminal:**

1. Create the skill directory and file:

**WSL/Bash:**
```bash
mkdir -p .github/skills/dotnet-testing
```

**PowerShell:**
```powershell
New-Item -ItemType Directory -Path .github/skills/dotnet-testing -Force | Out-Null
```

2. Create the SKILL.md:

**WSL/Bash:**
```bash
cat > .github/skills/dotnet-testing/SKILL.md << 'SKILL'
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
SKILL
```

**PowerShell:**
```powershell
@'
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
'@ | Out-File -FilePath .github/skills/dotnet-testing/SKILL.md -Encoding utf8
```

3. Verify the skill frontmatter:

**WSL/Bash:**
```bash
head -5 .github/skills/dotnet-testing/SKILL.md
```

**PowerShell:**
```powershell
Get-Content .github/skills/dotnet-testing/SKILL.md -Head 5
```

## 4.3 Create a Prompt Template

Prompts are reusable templates invoked with `/prompt-name`. Let's create one that generates tests.

🖥️ **In your terminal:**

1. Examine an existing prompt:

**WSL/Bash:**
```bash
head -15 .github/prompts/create-test.prompt.md
```

**PowerShell:**
```powershell
Get-Content .github/prompts/create-test.prompt.md -Head 15
```

2. Create the .NET-specific test prompt:

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
PROMPT
```

**PowerShell:**
```powershell
@'
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
'@ | Out-File -FilePath .github/prompts/create-dotnet-test.prompt.md -Encoding utf8
```

3. Verify:

**WSL/Bash:**
```bash
head -7 .github/prompts/create-dotnet-test.prompt.md
```

**PowerShell:**
```powershell
Get-Content .github/prompts/create-dotnet-test.prompt.md -Head 7
```

## 4.4 Test Skill Auto-Activation

Let's verify the skill activates when discussing .NET testing.

🖥️ **In your terminal:**

1. Start Copilot CLI:
```bash
gh copilot
```

2. Ask a question that should trigger the `dotnet-testing` skill:
```
How should I write unit tests for the StudentsController in ContosoUniversity?
```

3. Copilot should reference patterns from your skill:
   - `MethodName_Condition_ExpectedResult` naming
   - Moq for mocking `IRepository<Student>`
   - Arrange-Act-Assert pattern

> 💡 **What you should see:** The response should reference patterns from your skill — look for mentions of `MethodName_Condition_ExpectedResult()` naming, Moq for mocking, or WebApplicationFactory. If none appear, the skill may not have auto-activated — try mentioning "testing" or "xUnit" explicitly.

4. Now try the prompt:
```
/create-dotnet-test for ContosoUniversity.Web/Controllers/CoursesController.cs
```

The prompt should generate a complete test class for the CoursesController.

> 💡 **Expected output:** A complete xUnit test class with `[Fact]` methods following the naming convention. The file won't be created until you explicitly ask Copilot to save it.

> 💡 **Skills vs Prompts**: Skills activate automatically based on topic. Prompts are invoked explicitly with `/name`. Use skills for knowledge (patterns, conventions) and prompts for actions (generate code, run workflows).

## 4.5 Final

<details>
<summary>Key Takeaways</summary>

| Concept | File | Purpose |
|---------|------|---------|
| **Skills** | `.github/skills/{name}/SKILL.md` | Auto-activating knowledge bases |
| **Prompts** | `.github/prompts/{name}.prompt.md` | Explicitly invoked templates |

**Skill frontmatter:**
- `name` — lowercase with hyphens, used as identifier
- `description` — drives auto-activation (max 1024 chars). Be specific!

**Prompt frontmatter:**
- `description` — what the prompt does
- `mode` — `"agent"` for multi-step workflows
- `tools` — which tools the prompt can use

**Best practices:**
- Write clear, specific descriptions — they drive activation/discovery
- Keep skills focused on one domain (testing, security, architecture)
- Use prompts for repeatable workflows (generate tests, review code)
- Test activation by asking natural questions about the topic

</details>

<details>
<summary>Solutions</summary>

- Skill: [`solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md`](../solutions/lab04-skill-and-prompt/dotnet-testing/SKILL.md)
- Prompt: [`solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md`](../solutions/lab04-skill-and-prompt/create-dotnet-test.prompt.md)

</details>

**Next:** [Lab 05 — MCP Server Configuration](lab05.md)
