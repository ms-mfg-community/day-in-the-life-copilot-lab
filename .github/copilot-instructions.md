# Repository Custom Instructions

These instructions apply to all Copilot interactions in this repository.

## Code Style

- Use immutable patterns. Always create new objects with spread operators instead of mutating.
- Prefer many small files (200-400 lines) over few large files (800 max).
- Keep functions under 50 lines. Avoid nesting deeper than 4 levels.
- Use early returns to reduce nesting.
- No hardcoded values. Extract constants with descriptive names.
- No `console.log` in production code. Use structured logging.
- Handle all errors comprehensively with try/catch. Include context in error messages.
- Validate all user input at system boundaries using schema validation (Zod, Pydantic).

## Immutability (Critical)

```typescript
// CORRECT: Create new objects
function updateUser(user, name) {
  return { ...user, name }
}

// WRONG: Never mutate
function updateUser(user, name) {
  user.name = name // MUTATION
  return user
}
```

## API Response Format

```typescript
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: { total: number; page: number; limit: number }
}
```

## Patterns

- Use the repository pattern for data access abstraction.
- Use custom hooks with the `use` prefix for reusable React logic.
- Implement debounce for search inputs and expensive operations.
- Use `Promise.all` for independent async operations.
- Select only needed columns in database queries. Avoid `SELECT *`.

## Git Workflow

- Commit message format: `<type>: <description>` where type is one of: feat, fix, refactor, docs, test, chore, perf, ci.
- Add files individually with `git add`. Never use `git add .` or `git add -A`.
- Write concise commit messages focused on the "why" rather than the "what."

## Testing

- Write tests before implementation (TDD: RED -> GREEN -> REFACTOR).
- Minimum 80% test coverage across unit, integration, and E2E tests.
- Use the Arrange-Act-Assert pattern.
- Test behavior, not implementation details.
- Mock external dependencies. Do not skip error path testing.

## Security

- Never hardcode secrets. Use environment variables for all API keys, tokens, and passwords.
- Use parameterized queries for all database operations. No SQL string concatenation.
- Sanitize user-provided HTML. Configure Content Security Policy headers.
- Store tokens in httpOnly cookies, not localStorage.
- Implement rate limiting on all API endpoints.
- Error messages must not leak sensitive data or stack traces.

## Agent Behavior

- Read existing code before proposing changes.
- Avoid over-engineering. Only make changes that are directly requested.
- Do not add features, refactor code, or make improvements beyond what was asked.
- Three similar lines of code is better than a premature abstraction.
- When something fails, stop and explain. Do not silently retry.
- When uncertain, ask before proceeding.

## Documentation & Reference (MCP-First)

When you need documentation, **always try MCP tools first** before falling back to static links or general knowledge.

**Context7** — library/framework docs:
1. `resolve-library-id` — find the Context7 library ID for a package
2. `query-docs` — query documentation with the resolved library ID

**Microsoft Learn** — Azure/Microsoft docs:
1. `microsoft_docs_search` — search official Microsoft documentation
2. `microsoft_docs_fetch` — get full content from a specific docs URL
3. `microsoft_code_sample_search` — find official code examples

Only fall back to static links when MCP tools return no results or are unavailable. When falling back, state: "MCP unavailable. Using static reference: [link]"

## .NET / ContosoUniversity Project

This repository contains a brownfield .NET web application (ContosoUniversity) used as the lab project.

- **Architecture**: Clean architecture with Core (domain), Infrastructure (data/services), Web (ASP.NET MVC), Tests (xUnit), PlaywrightTests (E2E).
- **Solution**: `ContosoUniversity.sln` at the repo root.
- **Patterns**: Repository pattern, dependency injection, Entity Framework Core.
- **Testing**: xUnit for unit/integration tests, Playwright for E2E.
- When performing code review, ignore files in the `reports/` directory.
