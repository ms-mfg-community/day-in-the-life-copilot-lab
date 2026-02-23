using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ContosoUniversity.Tests.Infrastructure
{
    /// <summary>
    /// Extension methods for setting up test authentication
    /// </summary>
    public static class TestAuthenticationExtensions
    {
        /// <summary>
        /// Common test roles
        /// </summary>
        public static class TestRoles
        {
            public const string Administrator = "Administrator";
            public const string Teacher = "Teacher"; 
            public const string Instructor = "Instructor";
            public const string Student = "Student";
        }

        /// <summary>
        /// Common test users
        /// </summary>
        public static class TestUsers
        {
            public const string AdminUser = "admin@contoso.edu";
            public const string TeacherUser = "teacher@contoso.edu";
            public const string InstructorUser = "instructor@contoso.edu";
            public const string StudentUser = "student@contoso.edu";
        }

        /// <summary>
        /// Creates an administrator client for testing
        /// </summary>
        public static HttpClient CreateAdminClient<T>(this WebApplicationFactory<T> factory) where T : class
        {
            return factory.CreateClientWithRole(TestRoles.Administrator, TestUsers.AdminUser);
        }

        /// <summary>
        /// Creates an instructor client for testing  
        /// </summary>
        public static HttpClient CreateInstructorClient<T>(this WebApplicationFactory<T> factory) where T : class
        {
            return factory.CreateClientWithRole(TestRoles.Instructor, TestUsers.InstructorUser);
        }

        /// <summary>
        /// Creates a student client for testing
        /// </summary>
        public static HttpClient CreateStudentClient<T>(this WebApplicationFactory<T> factory) where T : class
        {
            return factory.CreateClientWithRole(TestRoles.Student, TestUsers.StudentUser);
        }

        /// <summary>
        /// Creates a client with a specific role for testing
        /// </summary>
        public static HttpClient CreateClientWithRole<T>(this WebApplicationFactory<T> factory, string role, string userName = "test@contoso.edu") where T : class
        {
            return factory.WithWebHostBuilder(builder =>
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
        }

        /// <summary>
        /// Creates a client with multiple roles for testing
        /// </summary>
        public static HttpClient CreateClientWithRoles<T>(this WebApplicationFactory<T> factory, string[] roles, string userName = "test@contoso.edu") where T : class
        {
            return factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddAuthentication("Test")
                        .AddScheme<TestAuthenticationSchemeOptions, TestAuthenticationSchemeHandler>(
                            "Test", options =>
                            {
                                var claims = new List<Claim>
                                {
                                    new Claim(ClaimTypes.Name, userName),
                                    new Claim(ClaimTypes.NameIdentifier, userName),
                                    new Claim("preferred_username", userName)
                                };

                                // Add all roles
                                foreach (var role in roles)
                                {
                                    claims.Add(new Claim(ClaimTypes.Role, role));
                                }

                                options.ClaimsIdentity = new ClaimsIdentity(claims, "Test");
                            });
                });
            }).CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });
        }
    }
}