---
name: coding-standards
description: Universal coding standards, best practices, and patterns for C#, ASP.NET Core, and Entity Framework Core development.
---

# Coding Standards & Best Practices

Universal coding standards applicable across all projects in this .NET solution.

## Code Quality Principles

### 1. Readability First
- Code is read more than written
- Clear variable and method names
- Self-documenting code preferred over comments
- Consistent formatting

### 2. KISS (Keep It Simple, Stupid)
- Simplest solution that works
- Avoid over-engineering
- No premature optimization
- Easy to understand > clever code

### 3. DRY (Don't Repeat Yourself)
- Extract common logic into methods and services
- Create reusable abstractions
- Share utilities across layers
- Avoid copy-paste programming

### 4. YAGNI (You Aren't Gonna Need It)
- Don't build features before they're needed
- Avoid speculative generality
- Add complexity only when required
- Start simple, refactor when needed

## C# Standards

### Naming Conventions

```csharp
// ✅ GOOD: Descriptive names following .NET conventions
public string LastName { get; set; }
private readonly IStudentRepository _studentRepository;
const int MaxEnrollmentsPerStudent = 8;

// ❌ BAD: Unclear or non-standard names
public string ln { get; set; }
private readonly IStudentRepository repo;
const int x = 8;
```

### Method Naming

```csharp
// ✅ GOOD: Verb-noun pattern, PascalCase
public async Task<Student> GetStudentByIdAsync(int id) { }
public bool IsValidEnrollmentDate(DateTime date) { }
public IEnumerable<Course> FilterByDepartment(int departmentId) { }

// ❌ BAD: Unclear or noun-only
public async Task<Student> Student(int id) { }
public bool Date(DateTime d) { }
```

### Immutability Pattern (CRITICAL)

```csharp
// ✅ GOOD: Use records for immutable DTOs
public record StudentDto(string LastName, string FirstMidName, DateTime EnrollmentDate);

// ✅ GOOD: Use init-only setters
public class CreateStudentCommand
{
    public string LastName { get; init; } = default!;
    public string FirstMidName { get; init; } = default!;
    public DateTime EnrollmentDate { get; init; }
}

// ❌ BAD: Mutable DTOs with public setters
public class StudentDto
{
    public string LastName { get; set; }  // MUTATION
}
```

### Error Handling

```csharp
// ✅ GOOD: Comprehensive error handling with context
public async Task<Student> GetStudentByIdAsync(int id)
{
    try
    {
        var student = await _context.Students
            .Include(s => s.Enrollments)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (student is null)
        {
            throw new NotFoundException($"Student with ID {id} was not found.");
        }

        return student;
    }
    catch (Exception ex) when (ex is not NotFoundException)
    {
        _logger.LogError(ex, "Failed to retrieve student {StudentId}", id);
        throw new DataAccessException("Unable to retrieve student.", ex);
    }
}

// ❌ BAD: No error handling
public async Task<Student> GetStudentByIdAsync(int id)
{
    return await _context.Students.FindAsync(id);
}
```

### Async/Await Best Practices

```csharp
// ✅ GOOD: Parallel execution when possible
var studentsTask = _studentRepository.GetAllAsync();
var coursesTask = _courseRepository.GetAllAsync();
var departmentsTask = _departmentRepository.GetAllAsync();

await Task.WhenAll(studentsTask, coursesTask, departmentsTask);

var students = await studentsTask;
var courses = await coursesTask;
var departments = await departmentsTask;

// ❌ BAD: Sequential when unnecessary
var students = await _studentRepository.GetAllAsync();
var courses = await _courseRepository.GetAllAsync();
var departments = await _departmentRepository.GetAllAsync();
```

### Type Safety

```csharp
// ✅ GOOD: Strong typing with enums and value objects
public enum Grade { A, B, C, D, F }

public class Enrollment
{
    public int StudentId { get; init; }
    public int CourseId { get; init; }
    public Grade? Grade { get; set; }
}

// ❌ BAD: Stringly typed or object
public class Enrollment
{
    public object Grade { get; set; }  // No type safety
}
```

## ASP.NET Core Best Practices

### Controller Structure

```csharp
// ✅ GOOD: Thin controller, logic in services
[ApiController]
[Route("api/[controller]")]
public class StudentsController : ControllerBase
{
    private readonly IStudentService _studentService;

    public StudentsController(IStudentService studentService)
    {
        _studentService = studentService;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StudentDto>> GetById(int id)
    {
        var student = await _studentService.GetByIdAsync(id);
        if (student is null) return NotFound();
        return Ok(student);
    }
}

// ❌ BAD: Fat controller with business logic inline
[HttpGet("{id}")]
public async Task<ActionResult> GetById(int id)
{
    var student = await _context.Students.FindAsync(id);
    // 50 lines of business logic here...
}
```

### Dependency Injection

```csharp
// ✅ GOOD: Constructor injection with interfaces
public class StudentService : IStudentService
{
    private readonly IStudentRepository _repository;
    private readonly ILogger<StudentService> _logger;

    public StudentService(
        IStudentRepository repository,
        ILogger<StudentService> logger)
    {
        _repository = repository;
        _logger = logger;
    }
}

// Registration in Program.cs
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<IStudentService, StudentService>();
```

### Input Validation

```csharp
using System.ComponentModel.DataAnnotations;

// ✅ GOOD: Data annotation validation
public class CreateStudentDto
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string LastName { get; init; } = default!;

    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string FirstMidName { get; init; } = default!;

    [DataType(DataType.Date)]
    public DateTime EnrollmentDate { get; init; }
}

// In controller — model binding validates automatically
[HttpPost]
[ValidateAntiForgeryToken]
public async Task<IActionResult> Create([Bind("LastName,FirstMidName,EnrollmentDate")] CreateStudentDto dto)
{
    if (!ModelState.IsValid) return View(dto);
    // proceed
}
```

## Entity Framework Core

### Query Best Practices

```csharp
// ✅ GOOD: Select only needed columns, use AsNoTracking for reads
var students = await _context.Students
    .AsNoTracking()
    .Where(s => s.EnrollmentDate >= startDate)
    .Select(s => new StudentDto(s.LastName, s.FirstMidName, s.EnrollmentDate))
    .ToListAsync();

// ❌ BAD: Load everything
var students = await _context.Students.ToListAsync();
```

### Include Navigation Properties Explicitly

```csharp
// ✅ GOOD: Explicit includes
var student = await _context.Students
    .Include(s => s.Enrollments)
        .ThenInclude(e => e.Course)
    .FirstOrDefaultAsync(s => s.Id == id);

// ❌ BAD: Relying on lazy loading (performance trap)
var student = await _context.Students.FindAsync(id);
var enrollments = student.Enrollments; // N+1 query
```

## File Organization

### Project Structure (Clean Architecture)

```
dotnet/ContosoUniversity.sln
├── dotnet/ContosoUniversity.Core/          # Domain layer
│   ├── Entities/                           # Domain entities
│   └── Interfaces/                         # Repository interfaces
├── dotnet/ContosoUniversity.Infrastructure/ # Data access layer
│   ├── Data/                               # DbContext, migrations
│   └── Repositories/                       # Repository implementations
├── dotnet/ContosoUniversity.Web/           # Presentation layer
│   ├── Controllers/                        # MVC controllers
│   ├── Models/                             # View models & DTOs
│   └── Views/                              # Razor views
├── dotnet/ContosoUniversity.Tests/         # Unit & integration tests
└── dotnet/ContosoUniversity.PlaywrightTests/ # E2E tests
```

### File Naming

```
Entities/Student.cs              # PascalCase, singular nouns
Controllers/StudentsController.cs # PascalCase, plural + Controller suffix
Interfaces/IStudentRepository.cs  # PascalCase, I prefix for interfaces
Models/StudentDto.cs             # PascalCase with Dto suffix
```

## Comments & Documentation

### When to Comment

```csharp
// ✅ GOOD: Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the external API during outages
var delay = Math.Min(1000 * Math.Pow(2, retryCount), 30000);

// Deliberately bypassing change tracking for bulk read performance
var results = await _context.Students.AsNoTracking().ToListAsync();

// ❌ BAD: Stating the obvious
// Increment counter by 1
count++;

// Set name to student's name
name = student.LastName;
```

### XML Documentation for Public APIs

```csharp
/// <summary>
/// Retrieves a student by their unique identifier, including enrollment data.
/// </summary>
/// <param name="id">The student's unique identifier.</param>
/// <returns>The student with enrollments, or null if not found.</returns>
/// <exception cref="DataAccessException">Thrown when the database is unavailable.</exception>
public async Task<Student?> GetStudentByIdAsync(int id)
{
    // Implementation
}
```

## Performance Best Practices

### Caching

```csharp
// ✅ GOOD: Use IMemoryCache for frequently accessed data
public async Task<IEnumerable<Department>> GetDepartmentsAsync()
{
    return await _cache.GetOrCreateAsync("departments", async entry =>
    {
        entry.SlidingExpiration = TimeSpan.FromMinutes(10);
        return await _context.Departments.AsNoTracking().ToListAsync();
    });
}
```

### Pagination

```csharp
// ✅ GOOD: Always paginate large result sets
public async Task<PaginatedList<Student>> GetStudentsAsync(int pageIndex, int pageSize)
{
    return await PaginatedList<Student>.CreateAsync(
        _context.Students.AsNoTracking().OrderBy(s => s.LastName),
        pageIndex,
        pageSize);
}
```

## Testing Standards

### Test Structure (AAA Pattern)

```csharp
[Fact]
public async Task GetStudentById_ExistingId_ReturnsStudent()
{
    // Arrange
    var expectedStudent = new Student { Id = 1, LastName = "Smith" };
    _mockRepository.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(expectedStudent);

    // Act
    var result = await _service.GetStudentByIdAsync(1);

    // Assert
    Assert.NotNull(result);
    Assert.Equal("Smith", result.LastName);
}
```

### Test Naming

```csharp
// ✅ GOOD: MethodName_Condition_ExpectedResult pattern
[Fact] public async Task GetById_NonExistentId_ReturnsNotFound() { }
[Fact] public void Enroll_ExceedsMaxCredits_ThrowsException() { }
[Fact] public async Task Create_ValidStudent_ReturnsCreatedResult() { }

// ❌ BAD: Vague test names
[Fact] public void Works() { }
[Fact] public void TestStudent() { }
```

## Code Smell Detection

Watch for these anti-patterns:

### 1. Long Methods
```csharp
// ❌ BAD: Method > 50 lines
public async Task ProcessEnrollment() { /* 100 lines */ }

// ✅ GOOD: Split into smaller methods
public async Task ProcessEnrollment()
{
    var validated = await ValidateEnrollment();
    var transformed = MapToEntity(validated);
    await SaveEnrollment(transformed);
}
```

### 2. Deep Nesting
```csharp
// ❌ BAD: 5+ levels of nesting
if (student != null)
{
    if (student.IsActive)
    {
        if (course != null)
        {
            if (course.HasCapacity)
            {
                // Do something
            }
        }
    }
}

// ✅ GOOD: Early returns (guard clauses)
if (student is null) return;
if (!student.IsActive) return;
if (course is null) return;
if (!course.HasCapacity) return;

// Do something
```

### 3. Magic Numbers
```csharp
// ❌ BAD: Unexplained numbers
if (credits > 18) { }

// ✅ GOOD: Named constants
private const int MaxCreditsPerSemester = 18;

if (credits > MaxCreditsPerSemester) { }
```

**Remember**: Code quality is not negotiable. Clear, maintainable code enables rapid development and confident refactoring.
