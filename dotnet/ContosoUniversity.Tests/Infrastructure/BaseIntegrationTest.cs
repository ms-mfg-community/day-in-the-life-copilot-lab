using Microsoft.Extensions.DependencyInjection;
using ContosoUniversity.Infrastructure.Data;
using Xunit;

namespace ContosoUniversity.Tests.Infrastructure
{
    /// <summary>
    /// Base class for integration tests that provides common setup and utilities
    /// </summary>
    public abstract class BaseIntegrationTest : IClassFixture<CustomWebApplicationFactory<Program>>, IAsyncLifetime
    {
        protected readonly CustomWebApplicationFactory<Program> Factory;
        protected readonly HttpClient Client;
        protected SchoolContext DbContext { get; private set; } = null!;

        protected BaseIntegrationTest(CustomWebApplicationFactory<Program> factory)
        {
            Factory = factory;
            Client = factory.CreateClient();
        }

        /// <summary>
        /// Initialize test - sets up fresh database for each test
        /// </summary>
        public virtual async Task InitializeAsync()
        {
            // Create a new scope for this test
            var scope = Factory.Services.CreateScope();
            DbContext = scope.ServiceProvider.GetRequiredService<SchoolContext>();
            
            // Reset database for test isolation
            await ResetDatabaseAsync();
            
            // Seed with fresh test data
            TestDataSeeder.SeedTestData(DbContext);
        }

        /// <summary>
        /// Cleanup after test
        /// </summary>
        public virtual async Task DisposeAsync()
        {
            await ResetDatabaseAsync();
            DbContext?.Dispose();
        }

        /// <summary>
        /// Creates an authenticated HTTP client for testing
        /// </summary>
        protected HttpClient CreateAuthenticatedClient(string role = "Administrator", string userName = "test@contoso.edu")
        {
            return Factory.CreateAuthenticatedClient(role, userName);
        }

        /// <summary>
        /// Creates an unauthenticated HTTP client for testing
        /// </summary>
        protected HttpClient CreateUnauthenticatedClient()
        {
            return Factory.CreateUnauthenticatedClient();
        }

        /// <summary>
        /// Resets the database to clean state
        /// </summary>
        private async Task ResetDatabaseAsync()
        {
            if (DbContext != null)
            {
                await DbContext.Database.EnsureDeletedAsync();
                await DbContext.Database.EnsureCreatedAsync();
            }
        }

        /// <summary>
        /// Gets a fresh database context from the DI container
        /// </summary>
        protected SchoolContext GetFreshContext()
        {
            var scope = Factory.Services.CreateScope();
            return scope.ServiceProvider.GetRequiredService<SchoolContext>();
        }

        /// <summary>
        /// Helper method to get service from DI container
        /// </summary>
        protected T GetService<T>() where T : notnull
        {
            return Factory.Services.GetRequiredService<T>();
        }
    }
}