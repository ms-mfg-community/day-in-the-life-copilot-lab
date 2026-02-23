---
applyTo: "**/*.test.*,**/*.spec.*,**/e2e/**,**/tests/**,**/__tests__/**"
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

Use the Arrange-Act-Assert (AAA) pattern:

```typescript
test('returns empty array when no markets match query', () => {
  // Arrange
  const query = 'nonexistent'

  // Act
  const result = searchMarkets(query)

  // Assert
  expect(result).toEqual([])
})
```

## Test Types

- **Unit Tests**: Individual functions, utilities, components. Keep under 50ms each.
- **Integration Tests**: API endpoints, database operations, service interactions.
- **E2E Tests (Playwright)**: Critical user flows, complete workflows.

## Best Practices

- One assertion per test when possible. Focus on single behavior.
- Use descriptive test names that explain the scenario being tested.
- Each test must be independent. No shared mutable state between tests.
- Mock external dependencies (APIs, databases) in unit tests.
- Use semantic selectors in E2E tests (`data-testid`, role, text content).
- Never use `.skip()` to ignore failing tests. Fix or remove them.
- Clean up resources with `afterEach` or `t.Cleanup()`.

## Mocking

- Mock at system boundaries (external APIs, databases, third-party services).
- Do not mock internal modules unless necessary for isolation.
- Prefer integration tests over heavily mocked unit tests.

## Troubleshooting

- If a test fails, fix the implementation, not the test (unless the test is wrong).
- Check test isolation: failing tests should not depend on execution order.
- Verify mocks return the expected shape and types.
