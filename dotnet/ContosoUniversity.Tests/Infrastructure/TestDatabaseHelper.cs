using ContosoUniversity.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ContosoUniversity.Tests.Infrastructure
{
    public static class TestDatabaseHelper
    {
        /// <summary>
        /// Creates a fresh in-memory database for testing
        /// </summary>
        public static SchoolContext CreateInMemoryContext(string? databaseName = null)
        {
            databaseName ??= Guid.NewGuid().ToString();

            var options = new DbContextOptionsBuilder<SchoolContext>()
                .UseInMemoryDatabase(databaseName: databaseName)
                .EnableSensitiveDataLogging()
                .Options;

            var context = new SchoolContext(options);
            context.Database.EnsureCreated();

            return context;
        }

        /// <summary>
        /// Creates an in-memory database with seeded test data
        /// </summary>
        public static SchoolContext CreateSeededInMemoryContext(string? databaseName = null)
        {
            var context = CreateInMemoryContext(databaseName);
            TestDataSeeder.SeedTestData(context);
            return context;
        }

        /// <summary>
        /// Resets the database by clearing all data
        /// </summary>
        public static void ResetDatabase(SchoolContext context)
        {
            context.Enrollments.RemoveRange(context.Enrollments);
            context.Courses.RemoveRange(context.Courses);
            context.Students.RemoveRange(context.Students);
            context.Instructors.RemoveRange(context.Instructors);
            context.Departments.RemoveRange(context.Departments);
            context.Notifications.RemoveRange(context.Notifications);
            context.SaveChanges();
        }

        /// <summary>
        /// Disposes and recreates the database with fresh test data
        /// </summary>
        public static void RefreshDatabase(SchoolContext context)
        {
            ResetDatabase(context);
            TestDataSeeder.SeedTestData(context);
        }
    }
}