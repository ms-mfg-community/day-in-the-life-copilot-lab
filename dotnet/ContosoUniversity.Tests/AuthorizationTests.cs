using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Tests
{
    public class AuthorizationTests
    {
        [Fact]
        public async Task RequireAdministratorRole_WithAdminUser_Succeeds()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "admin@contoso.edu"),
                new Claim(ClaimTypes.Role, "Administrator")
            }, "TestAuthentication"));
            
            var context = new AuthorizationHandlerContext(
                new AuthorizationPolicyBuilder().RequireRole("Administrator").Build().Requirements,
                user, null);

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "RequireAdministratorRole");

            // Assert
            Assert.True(result.Succeeded);
        }

        [Fact]
        public async Task RequireAdministratorRole_WithNonAdminUser_Fails()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "instructor@contoso.edu"),
                new Claim(ClaimTypes.Role, "Instructor")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "RequireAdministratorRole");

            // Assert
            Assert.False(result.Succeeded);
        }

        [Fact]
        public async Task RequireInstructorRole_WithInstructorUser_Succeeds()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "instructor@contoso.edu"),
                new Claim(ClaimTypes.Role, "Instructor")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "RequireInstructorRole");

            // Assert
            Assert.True(result.Succeeded);
        }

        [Fact]
        public async Task RequireInstructorRole_WithAdminUser_Succeeds()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "admin@contoso.edu"),
                new Claim(ClaimTypes.Role, "Administrator")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "RequireInstructorRole");

            // Assert
            Assert.True(result.Succeeded);
        }

        [Fact]
        public async Task RequireInstructorRole_WithStudentUser_Fails()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "student@contoso.edu"),
                new Claim(ClaimTypes.Role, "Student")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "RequireInstructorRole");

            // Assert
            Assert.False(result.Succeeded);
        }
        
        [Fact]
        public async Task CanManageStudents_WithRegistrarUser_Succeeds()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "registrar@contoso.edu"),
                new Claim(ClaimTypes.Role, "Registrar")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "CanManageStudents");

            // Assert
            Assert.True(result.Succeeded);
        }
        
        [Fact]
        public async Task CanManageStudents_WithPermissionClaim_Succeeds()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "staff@contoso.edu"),
                new Claim(ClaimTypes.Role, "Staff"),
                new Claim("Permission", "StudentManagement")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "CanManageStudents");

            // Assert
            Assert.True(result.Succeeded);
        }
        
        [Fact]
        public async Task CanManageCourses_WithInstructorUser_Succeeds()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "instructor@contoso.edu"),
                new Claim(ClaimTypes.Role, "Instructor")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "CanManageCourses");

            // Assert
            Assert.True(result.Succeeded);
        }
        
        [Fact]
        public async Task ReadOnlyAccess_WithAuthenticatedUser_Succeeds()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Name, "user@contoso.edu")
            }, "TestAuthentication"));

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "ReadOnlyAccess");

            // Assert
            Assert.True(result.Succeeded);
        }
        
        [Fact]
        public async Task ReadOnlyAccess_WithAnonymousUser_Fails()
        {
            // Arrange
            var services = new ServiceCollection();
            services.AddLogging(); // Add logging services
            services.AddAuthorizationPolicies();
            
            var sp = services.BuildServiceProvider();
            var authorizationService = sp.GetRequiredService<IAuthorizationService>();
            
            var user = new ClaimsPrincipal(new ClaimsIdentity());

            // Act
            var result = await authorizationService.AuthorizeAsync(user, null, "ReadOnlyAccess");

            // Assert
            Assert.False(result.Succeeded);
        }
    }
}
