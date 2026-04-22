using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Infrastructure.Configuration;
using ContosoUniversity.Infrastructure.Data;
using ContosoUniversity.Infrastructure.Repositories;
using ContosoUniversity.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ContosoUniversity.Infrastructure
{
    public static class DependencyInjection
    {
        public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
        {
            // Add Database — use SQLite when connection string indicates it, otherwise SQL Server
            var connectionString = configuration.GetConnectionString("DefaultConnection") 
                ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

            if (connectionString.Contains("Data Source=", StringComparison.OrdinalIgnoreCase) 
                && !connectionString.Contains("Server=", StringComparison.OrdinalIgnoreCase))
            {
                services.AddDbContext<SchoolContext>(options =>
                    options.UseSqlite(connectionString));
            }
            else
            {
                services.AddDbContext<SchoolContext>(options =>
                    options.UseSqlServer(
                        connectionString,
                        b => b.MigrationsAssembly(typeof(SchoolContext).Assembly.FullName)));
            }

            // Add Repositories
            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));

            // Configure options
            services.Configure<Configuration.ServiceBusOptions>(options => 
            {
                options.ConnectionString = configuration["ServiceBus:ConnectionString"] ?? "UseDevelopmentStorage=true";
                options.QueueName = configuration["ServiceBus:QueueName"] ?? "development-queue";
            });

            services.Configure<Configuration.BlobStorageOptions>(options => 
            {
                options.ConnectionString = configuration["BlobStorage:ConnectionString"] ?? "UseDevelopmentStorage=true";
                options.ContainerName = configuration["BlobStorage:ContainerName"] ?? "development-container";
            });

            // Register infrastructure services
            // We don't register these here because they're overridden in the Web project for local development
            // services.AddSingleton<INotificationService, ServiceBusNotificationService>();
            // services.AddSingleton<IFileStorageService, BlobStorageService>();

            return services;
        }
    }
}
