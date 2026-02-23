using System.Data.Common;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Infrastructure.Data;

namespace ContosoUniversity.Tests.Infrastructure
{
    public class CustomWebApplicationFactory<TProgram> : WebApplicationFactory<TProgram> where TProgram : class
    {
        private DbConnection? _connection;

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                // Remove the existing database configuration
                services.RemoveAll(typeof(DbContextOptions<SchoolContext>));
                services.RemoveAll(typeof(SchoolContext));

                // Create SQLite in-memory database
                _connection = new SqliteConnection("DataSource=:memory:");
                _connection.Open();

                services.AddDbContext<SchoolContext>(options =>
                {
                    options.UseSqlite(_connection);
                    options.EnableSensitiveDataLogging();
                    options.LogTo(Console.WriteLine, LogLevel.Information);
                });

                // Replace Azure services with mocks for testing
                services.RemoveAll(typeof(INotificationService));
                services.RemoveAll(typeof(IFileStorageService));

                // Add mock notification service
                var mockNotificationService = new Mock<INotificationService>();
                services.AddSingleton(mockNotificationService.Object);

                // Add mock file storage service
                var mockFileStorageService = new Mock<IFileStorageService>();
                mockFileStorageService
                    .Setup(x => x.UploadFileAsync(It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<string>()))
                    .ReturnsAsync("http://test.local/test-file.jpg");
                mockFileStorageService
                    .Setup(x => x.DeleteFileAsync(It.IsAny<string>()))
                    .ReturnsAsync(true);
                services.AddSingleton(mockFileStorageService.Object);

                // Configure test environment
                builder.UseEnvironment("Testing");

                // Ensure database is created and seeded
                var serviceProvider = services.BuildServiceProvider();
                using var scope = serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<SchoolContext>();
                
                try
                {
                    context.Database.EnsureCreated();
                    TestDataSeeder.SeedTestData(context);
                }
                catch (Exception ex)
                {
                    var logger = scope.ServiceProvider.GetRequiredService<ILogger<CustomWebApplicationFactory<TProgram>>>();
                    logger.LogError(ex, "An error occurred seeding the database with test data.");
                    throw;
                }
            });

            // Configure content root and web root for testing
            var contentRoot = Directory.GetCurrentDirectory();
            builder.UseContentRoot(contentRoot);
            
            // Set up a temporary web root path for testing
            var tempWebRoot = Path.Combine(contentRoot, "temp_wwwroot");
            Directory.CreateDirectory(tempWebRoot);
            builder.UseWebRoot(tempWebRoot);
        }

        /// <summary>
        /// Creates an HTTP client with authentication for the specified role
        /// </summary>
        public HttpClient CreateAuthenticatedClient(string role = "Administrator", string userName = "test@contoso.edu")
        {
            var client = WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication("Test")
                        .AddScheme<TestAuthenticationSchemeOptions, TestAuthenticationSchemeHandler>(
                            "Test", options => 
                            {
                                options.ClaimsIdentity = new ClaimsIdentity(new[]
                                {
                                    new Claim(ClaimTypes.Name, userName),
                                    new Claim(ClaimTypes.NameIdentifier, userName),
                                    new Claim(ClaimTypes.Role, role),
                                    new Claim("preferred_username", userName)
                                }, "Test");
                            });
                });
            }).CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });

            return client;
        }

        /// <summary>
        /// Creates an unauthenticated client
        /// </summary>
        public HttpClient CreateUnauthenticatedClient()
        {
            return CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                _connection?.Close();
                _connection?.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    /// <summary>
    /// Custom authentication scheme options for testing
    /// </summary>
    public class TestAuthenticationSchemeOptions : AuthenticationSchemeOptions
    {
        public ClaimsIdentity ClaimsIdentity { get; set; } = new();
    }

    /// <summary>
    /// Test authentication handler for simulating authentication in tests
    /// </summary>
    public class TestAuthenticationSchemeHandler : AuthenticationHandler<TestAuthenticationSchemeOptions>
    {
        public TestAuthenticationSchemeHandler(IOptionsMonitor<TestAuthenticationSchemeOptions> options,
            ILoggerFactory logger, UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            var authenticationTicket = new AuthenticationTicket(
                new ClaimsPrincipal(Options.ClaimsIdentity), "Test");
            
            return Task.FromResult(AuthenticateResult.Success(authenticationTicket));
        }
    }
}