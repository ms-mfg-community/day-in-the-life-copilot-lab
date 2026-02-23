using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Infrastructure.Data;
using ContosoUniversity.Web.Services;
using Microsoft.EntityFrameworkCore;

namespace ContosoUniversity.Web.Extensions
{
    public static class ServiceExtensions
    {
        public static IServiceCollection AddWebServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Register services based on environment
            if (Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development")
            {
                // Use local implementations for development
                services.AddSingleton<INotificationService, LocalNotificationService>();
                services.AddSingleton<IFileStorageService, LocalFileStorageService>();
                
                // Log that we're using local services
                var serviceProvider = services.BuildServiceProvider();
                var logger = serviceProvider.GetRequiredService<ILogger<IServiceCollection>>();
                logger.LogInformation("Using local service implementations for development environment");
            }
            else
            {
                // In production, we'd use the real Azure services
                // For now, we'll use the local services for testing
                services.AddSingleton<INotificationService, LocalNotificationService>();
                services.AddSingleton<IFileStorageService, LocalFileStorageService>();
                
                // Log that we're using local services for production temporarily
                var serviceProvider = services.BuildServiceProvider();
                var logger = serviceProvider.GetRequiredService<ILogger<IServiceCollection>>();
                logger.LogWarning("Using local service implementations for production environment temporarily. This should be replaced with real Azure services in production.");
            }

            return services;
        }
    }
}
