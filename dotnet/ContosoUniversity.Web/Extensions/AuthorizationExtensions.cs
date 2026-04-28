using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ContosoUniversity.Web.Extensions
{
    public static class AuthorizationExtensions
    {
        public static IServiceCollection AddAuthorizationPolicies(this IServiceCollection services)
        {
            services.AddAuthorization(options =>
            {
                // For local development environment, allow all authenticated users to pass role checks
                if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
                {
                    options.DefaultPolicy = new AuthorizationPolicyBuilder()
                        .RequireAuthenticatedUser()
                        .Build();
                        
                    // For development, override the role requirement evaluation
                    options.FallbackPolicy = new AuthorizationPolicyBuilder()
                        .RequireAuthenticatedUser()
                        .Build();
                }
                
                // Define a policy for admin users
                options.AddPolicy("RequireAdministratorRole", policy =>
                    policy.RequireRole("Administrator"));

                // Define a policy for instructors
                options.AddPolicy("RequireInstructorRole", policy =>
                    policy.RequireRole("Instructor", "Administrator"));
                
                // Define a policy for student management
                options.AddPolicy("CanManageStudents", policy =>
                    policy.RequireAssertion(context => 
                        context.User.IsInRole("Administrator") || 
                        context.User.IsInRole("Registrar") ||
                        context.User.HasClaim(c => 
                            c.Type == "Permission" && 
                            c.Value == "StudentManagement")));
                
                // Define a policy for course management
                options.AddPolicy("CanManageCourses", policy =>
                    policy.RequireAssertion(context => 
                        context.User.IsInRole("Administrator") || 
                        context.User.IsInRole("Instructor") ||
                        context.User.HasClaim(c => 
                            c.Type == "Permission" && 
                            c.Value == "CourseManagement")));
                
                // Define a policy for read-only access
                options.AddPolicy("ReadOnlyAccess", policy =>
                    policy.RequireAuthenticatedUser());
                
                // Define a policy for report access
                options.AddPolicy("CanAccessReports", policy =>
                    policy.RequireAssertion(context => 
                        context.User.IsInRole("Administrator") || 
                        context.User.IsInRole("Registrar") ||
                        context.User.HasClaim(c => 
                            c.Type == "Permission" && 
                            c.Value == "ReportAccess")));
            });

            return services;
        }
    }
}
