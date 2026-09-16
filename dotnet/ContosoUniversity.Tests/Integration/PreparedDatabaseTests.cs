using ContosoUniversity.Core.Models;
using ContosoUniversity.Infrastructure.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace ContosoUniversity.Tests.Integration;

public class PreparedDatabaseTests
{
    [Fact]
    public async Task InitializeAsync_NewDatabase_SeedsLocalData()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var context = CreateContext(connection);

        await PreparedDbInitializer.InitializeAsync(context, NullLogger.Instance);

        Assert.NotEmpty(await context.Students.ToListAsync());
        Assert.NotEmpty(await context.Courses.ToListAsync());
    }

    [Fact]
    public async Task InitializeAsync_DeletedAttendeeData_DoesNotReseedOnResume()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using (var first = CreateContext(connection))
        {
            await PreparedDbInitializer.InitializeAsync(first, NullLogger.Instance);
            first.Enrollments.RemoveRange(first.Enrollments);
            first.Students.RemoveRange(first.Students);
            await first.SaveChangesAsync();
        }
        await using var resumed = CreateContext(connection);

        await PreparedDbInitializer.InitializeAsync(resumed, NullLogger.Instance);

        Assert.Empty(await resumed.Students.ToListAsync());
        Assert.NotEmpty(await resumed.Courses.ToListAsync());
    }

    [Fact]
    public async Task InitializeAsync_PreexistingAttendeeData_PreservesItWithoutSeeding()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        await using var context = CreateContext(connection);
        await context.Database.EnsureCreatedAsync();
        context.Students.Add(new Student
        {
            FirstMidName = "Attendee", LastName = "Keep", EnrollmentDate = new DateTime(2026, 9, 8)
        });
        await context.SaveChangesAsync();

        await PreparedDbInitializer.InitializeAsync(context, NullLogger.Instance);

        Assert.Equal("Keep", (await context.Students.SingleAsync()).LastName);
        Assert.Empty(await context.Courses.ToListAsync());
    }

    [Fact]
    public async Task InitializeAsync_ExternalDatabase_RejectsItBeforeConnecting()
    {
        var options = new DbContextOptionsBuilder<SchoolContext>()
            .UseSqlServer("Server=disabled.invalid;Database=not-a-live-service;Integrated Security=True")
            .Options;
        await using var context = new SchoolContext(options);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            PreparedDbInitializer.InitializeAsync(context, NullLogger.Instance));
    }

    private static SchoolContext CreateContext(SqliteConnection connection) =>
        new(new DbContextOptionsBuilder<SchoolContext>().UseSqlite(connection).Options);
}
