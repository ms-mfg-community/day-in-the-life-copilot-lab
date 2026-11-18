---
description: "ASP.NET Core 8 MVC, EF Core and xUnit conventions for the ContosoUniversity .NET track"
applyTo: '**/*.cs,**/*.csproj,**/Program.cs,**/*.razor'
---

# .NET Guidelines

Conventions for the ContosoUniversity app in `dotnet/`: ASP.NET Core 8 MVC, Entity Framework Core (EF Core) and xUnit. Repo-wide rules live in `.github/copilot-instructions.md`.

## Architecture

- Clean architecture. `ContosoUniversity.Core` holds entities, interfaces and validation and depends on nothing else. `ContosoUniversity.Infrastructure` implements those interfaces (`SchoolContext`, `Repository<T>`, Azure services). `ContosoUniversity.Web` holds the MVC controllers, views and DI wiring.
- Follow SOLID: keep classes single-purpose and depend on abstractions. Controllers receive their dependencies (`IRepository<T>`, `INotificationService`, `IFileStorageService`) through constructor injection and never create services with `new`.
- Register services in `Program.cs` or the `Add...Services` extensions (`AddInfrastructureServices`, `AddWebServices`). The DbContext and repositories are scoped.
- Entities stay plain: data annotations and navigation properties. Put business rules in a service behind an interface in Core, not in a controller or a view.

## C# and ASP.NET Core

- Use `async`/`await` for all I/O: EF Core calls are async (`ToListAsync`, `SaveChangesAsync`) and nothing blocks with `.Result` or `.Wait()`.
- Nullable reference types are on. Fix a nullability warning rather than silencing it with `!`.
- Prefer records and `init`-only properties for DTOs and view models. Use LINQ and pattern matching where they read better than loops.
- Entity controllers derive from `BaseController`. A failed notification is logged and must not fail the request (see `SendEntityNotificationAsync`).
- Log with `ILogger<T>` and message templates, for example `"Deleted student {StudentId}"`. No `Console.WriteLine` in production code.
- Catch specific exceptions and add context. Never swallow an exception or return a stack trace to the browser.

## MVC and EF Core

- State-changing actions use `[HttpPost]`, `[ValidateAntiForgeryToken]`, `[Authorize(Roles = ...)]`, a `[Bind(...)]` allow-list and a `ModelState.IsValid` check.
- Query with LINQ and never concatenate SQL. Project only the columns a view needs, and add `Include` deliberately to avoid N+1 queries.
- There are no EF Core migrations: `DbInitializer` calls `EnsureCreated()`. Schema changes come from the entity classes, so do not add a `Migrations` folder unless asked.
- Development uses SQLite and other environments use SQL Server. `AddInfrastructureServices` picks the provider from the connection string, so keep queries provider-neutral.

## Tests

- xUnit and Moq in `dotnet/ContosoUniversity.Tests/`. Name tests `MethodName_Condition_ExpectedResult` and use Arrange-Act-Assert.
- Controller tests mock `IRepository<T>`. Integration tests derive from `BaseIntegrationTest` and use `CustomWebApplicationFactory<Program>` (in-memory SQLite, mocked Azure services, `CreateAuthenticatedClient(role)`).
- Run them with `dotnet test dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj`.
