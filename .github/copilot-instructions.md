# Repository Custom Instructions

These instructions apply to all Copilot interactions in this repository.

This repository holds two tracks of the same ContosoUniversity app: ASP.NET Core 8 MVC with Entity Framework Core under `dotnet/`, and Node with Fastify and Drizzle under `node/`. Rules below apply to both tracks unless a track is named.

## Code Style

- Use immutable patterns. In TypeScript create new objects with spread operators instead of mutating; in C# prefer records and `init`-only properties for DTOs and view models.
- Prefer many small files (200-400 lines) over few large files (800 max).
- Keep functions under 50 lines. Avoid nesting deeper than 4 levels.
- Use early returns to reduce nesting.
- No hardcoded values. Extract constants with descriptive names.
- No `Console.WriteLine` or `console.log` in production code. Use structured logging (`ILogger<T>` in .NET, the Fastify logger in Node).
- Handle all errors comprehensively with try/catch. Include context in error messages.
- Validate all user input at system boundaries: Zod schemas in Fastify route handlers (Node); data annotations, `ModelState.IsValid` and `[Bind]` allow-lists in MVC controllers (.NET).

## Immutability (Critical)

```typescript
// CORRECT: Create new objects
function renameStudent(student: Student, lastName: string): Student {
  return { ...student, lastName }
}

// WRONG: Never mutate (Student's fields are readonly, so this does not even compile)
function renameStudent(student: Student, lastName: string): Student {
  student.lastName = lastName // MUTATION
  return student
}
```

## API Response Format

Every Fastify route replies through `ok()` / `fail()` in `node/web/api-response.ts`:

```typescript
type ApiResponse<T> =
  | { success: true; data: T; meta?: { total: number; page?: number; limit?: number } }
  | { success: false; error: string }
```

## Patterns

- Use the repository pattern for data access abstraction (for example, the repository interfaces in `node/core/repos/` on the Node track).
- Use dependency injection. In .NET register services in `Program.cs` and the `Add...Services` extension methods; in Node pass dependencies such as `db` into `buildApp` instead of importing singletons.
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
- .NET tests use xUnit and Moq; Node tests use Vitest; Playwright covers E2E on both tracks.

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

- **Architecture**: Clean architecture under `dotnet/` with Core (domain), Infrastructure (data/services), Web (ASP.NET Core 8 MVC), Tests (xUnit), PlaywrightTests (E2E).
- **Solution**: `dotnet/ContosoUniversity.sln`. From the repo root, build with `dotnet build dotnet/ContosoUniversity.sln` and run the unit and integration tests with `dotnet test dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj`.
- **Patterns**: Repository pattern, dependency injection, Entity Framework Core.
- **Testing**: xUnit for unit/integration tests, Playwright for E2E.
- When performing code review, ignore files in the `reports/` directory.

## Node / ContosoUniversity Project

The same domain also ships as a Node track in `node/`: Fastify 5, Drizzle ORM on SQLite, Zod, Vitest and Playwright.

- **Layout**: `core/` (entities and repository interfaces), `infra/` (Drizzle schema and repositories), `web/` (Fastify app and routes), `tests/` (Vitest unit and integration tests), `e2e/` (Playwright).
- **Commands**: `pnpm -C node test` runs Vitest; `pnpm -C node build` type-checks with `tsc --noEmit`.
- **Conventions**: ES modules with `.js` import specifiers, strict TypeScript, request bodies validated with Zod `safeParse`, replies built with `ok()` / `fail()`.
