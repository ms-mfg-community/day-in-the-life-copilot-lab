---
description: "Testing conventions for ContosoUniversity: xUnit and Moq on the .NET track, Vitest on the Node track, Playwright for E2E"
applyTo: "**/*.test.*,**/*.spec.*,**/e2e/**,**/tests/**,**/__tests__/**,**/ContosoUniversity.Tests/**,**/ContosoUniversity.PlaywrightTests/**"
---

# Testing Instructions

These instructions apply when working with test files.

## Test-Driven Development

Follow the RED-GREEN-REFACTOR cycle:
1. Write a failing test first (RED).
2. Write minimal code to make it pass (GREEN).
3. Refactor while keeping tests green (REFACTOR).

## Coverage Requirements

- Minimum 80% test coverage (unit + integration + E2E).
- All edge cases covered: null, undefined, empty, boundary values.
- Error scenarios tested, not just happy paths.

## Test Structure

Use the Arrange-Act-Assert (AAA) pattern.

**.NET (xUnit + Moq)** in `dotnet/ContosoUniversity.Tests/`. Controllers are tested against a mocked `IRepository<Student>`. Name tests `MethodName_Condition_ExpectedResult`:

```csharp
// From StudentsControllerTests; _mockStudentRepository and _controller are built in its constructor.
[Fact]
public async Task Details_WithInvalidId_ReturnsNotFound()
{
    // Arrange
    var id = 999;
    _mockStudentRepository
        .Setup(repo => repo.GetByIdAsync(id))
        .ReturnsAsync((Student?)null);

    // Act
    var result = await _controller.Details(id);

    // Assert
    Assert.IsType<NotFoundResult>(result);
}
```

**Node (Vitest)** in `node/tests/`, with a fresh in-memory SQLite database per test:

```typescript
// From student-repo.test.ts
describe('StudentRepo (Drizzle, in-memory SQLite)', () => {
  let repo: StudentRepo;

  beforeEach(async () => {
    repo = createStudentRepo(await createInMemoryDb());
  });

  it('returns null for missing student', async () => {
    // Arrange: the empty database from beforeEach

    // Act
    const got = await repo.getById(9999);

    // Assert
    expect(got).toBeNull();
  });
});
```

## Test Types

- **Unit Tests**: Controllers with a mocked `IRepository<T>` (.NET) and repositories on in-memory SQLite (Node). Keep under 50ms each.
- **Integration Tests**: .NET tests derive from `BaseIntegrationTest` and use `CustomWebApplicationFactory<Program>`; Node tests call `app.inject()` on `buildApp({ db, logger: false })`.
- **E2E Tests (Playwright)**: Critical user flows, complete workflows. They need browsers (and, on the .NET track, a running web app), so they run separately from the unit and integration commands.

## Best Practices

- One assertion per test when possible. Focus on single behavior.
- Use descriptive test names that explain the scenario being tested.
- Each test must be independent. No shared mutable state between tests.
- Mock external dependencies (APIs, databases) in unit tests.
- Use semantic selectors in E2E tests (`data-testid`, role, text content).
- Never use `.skip()` (Vitest) or `Skip =` (xUnit) to ignore failing tests. Fix or remove them.
- Clean up resources in `afterEach` (Vitest, for example `await app.close()`) or `IAsyncLifetime.DisposeAsync` (xUnit).

## Mocking

- Mock at system boundaries (external APIs, databases, third-party services).
- Do not mock internal modules unless necessary for isolation.
- Prefer integration tests over heavily mocked unit tests.

## Troubleshooting

- If a test fails, fix the implementation, not the test (unless the test is wrong).
- Check test isolation: failing tests should not depend on execution order.
- Verify mocks return the expected shape and types.
