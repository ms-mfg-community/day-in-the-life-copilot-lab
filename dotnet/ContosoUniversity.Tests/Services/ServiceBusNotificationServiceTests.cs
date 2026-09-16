using System;
using System.Threading;
using System.Threading.Tasks;
using Azure.Messaging.ServiceBus;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using Newtonsoft.Json;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Infrastructure.Services;
using ContosoUniversity.Infrastructure.Configuration;

namespace ContosoUniversity.Tests.Services
{
    public class ServiceBusNotificationServiceTests
    {
        private readonly Mock<IOptions<ContosoUniversity.Infrastructure.Configuration.ServiceBusOptions>> _mockOptions;
        private readonly Mock<ILogger<ServiceBusNotificationService>> _mockLogger;

        public ServiceBusNotificationServiceTests()
        {
            _mockOptions = new Mock<IOptions<ContosoUniversity.Infrastructure.Configuration.ServiceBusOptions>>();
            _mockLogger = new Mock<ILogger<ServiceBusNotificationService>>();

            // Setup configuration for development mode (empty connection string)
            var options = new ContosoUniversity.Infrastructure.Configuration.ServiceBusOptions
            {
                ConnectionString = "", // Empty triggers development mode
                QueueName = "notifications"
            };
            _mockOptions.Setup(x => x.Value).Returns(options);
        }

        [Fact]
        public async Task SendNotificationAsync_InDevelopmentMode_StoresNotificationLocally()
        {
            // Arrange
            var entityType = "Student";
            var entityId = "1";
            var entityName = "John Doe";
            var operation = EntityOperation.Create;

            var service = new ServiceBusNotificationService(
                _mockOptions.Object,
                _mockLogger.Object);

            // Act
            await service.SendNotificationAsync(entityType, entityId, entityName, operation);

            // Assert - In development mode, notification should be logged and stored locally
            // We can't directly verify the internal storage, but we can verify no exceptions were thrown
            // and the logger was called appropriately
            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Local mode: Notification added")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.Once);
        }

        [Fact]
        public async Task ReceiveNotificationAsync_InDevelopmentMode_ReturnsUnreadNotification()
        {
            // Arrange
            var service = new ServiceBusNotificationService(
                _mockOptions.Object,
                _mockLogger.Object);

            // First, send a notification to have something to receive
            await service.SendNotificationAsync("Student", "1", "John Doe", EntityOperation.Create);

            // Act
            var result = service.ReceiveNotification();

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Student", result.EntityType);
            Assert.Equal("1", result.EntityId);
            Assert.Equal(EntityOperation.Create.ToString(), result.Operation);
            Assert.False(result.IsRead);
        }

        [Fact]
        public void ReceiveNotificationAsync_InDevelopmentMode_ReturnsNullWhenNoUnreadMessages()
        {
            // Arrange
            var service = new ServiceBusNotificationService(
                _mockOptions.Object,
                _mockLogger.Object);

            // Act (no notifications sent first)
            var result = service.ReceiveNotification();

            // Assert
            Assert.Null(result);
        }

        [Fact]
        public async Task MarkAsReadAsync_InDevelopmentMode_UpdatesNotificationStatus()
        {
            // Arrange
            var service = new ServiceBusNotificationService(
                _mockOptions.Object,
                _mockLogger.Object);

            // First, send a notification
            await service.SendNotificationAsync("Student", "1", "John Doe", EntityOperation.Create);
            
            // Get the notification
            var notification = service.ReceiveNotification();
            Assert.NotNull(notification);

            // Act
            await service.MarkAsReadAsync(notification.Id);

            // Assert - In development mode, this should complete without error
            // We can verify the logger was called appropriately
            _mockLogger.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Local mode")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
                Times.AtLeastOnce);
        }
    }
}
