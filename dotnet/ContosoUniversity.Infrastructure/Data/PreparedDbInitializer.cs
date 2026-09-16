using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace ContosoUniversity.Infrastructure.Data;

public static class PreparedDbInitializer
{
    private const string InitializedKey = "core-initialization-complete";
    private const string CreateMarkerTable =
        "CREATE TABLE IF NOT EXISTS PreparedLabInitialization (KeyName TEXT PRIMARY KEY NOT NULL)";

    public static async Task InitializeAsync(SchoolContext context, ILogger logger)
    {
        if (!context.Database.IsSqlite())
        {
            throw new InvalidOperationException("The prepared core requires a local SQLite database.");
        }

        await context.Database.EnsureCreatedAsync();
        await using var transaction = await context.Database.BeginTransactionAsync();
        await context.Database.ExecuteSqlRawAsync(CreateMarkerTable);
        var initialized = await context.Database
            .SqlQuery<int>($"SELECT COUNT(*) AS Value FROM PreparedLabInitialization WHERE KeyName = {InitializedKey}")
            .SingleAsync();

        if (initialized == 0)
        {
            if (!await HasAttendeeDataAsync(context))
            {
                await DbInitializer.InitializeAsync(context, logger);
            }
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO PreparedLabInitialization (KeyName) VALUES ({InitializedKey})");
        }

        await transaction.CommitAsync();
        logger.LogInformation("Prepared local database initialization is complete; existing attendee data is preserved");
    }

    private static async Task<bool> HasAttendeeDataAsync(SchoolContext context) =>
        await context.People.AnyAsync()
        || await context.Courses.AnyAsync()
        || await context.Departments.AnyAsync()
        || await context.Notifications.AnyAsync();
}
