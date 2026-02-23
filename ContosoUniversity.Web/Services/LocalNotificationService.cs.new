using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ContosoUniversity.Web.Services
{
    /// <summary>
    /// Local implementation of INotificationService for development environment
    /// This avoids the dependency on Azure Service Bus during local testing
    /// </summary>
    public class LocalNotificationService : INotificationService, IAsyncDisposable
    {
        private readonly ILogger<LocalNotificationService> _logger;
        private static readonly List<Notification> _notifications = new List<Notification>();
        private static int _nextId = 1;

        public LocalNotificationService(ILogger<LocalNotificationService> logger)
        {
            _logger = logger;
            _logger.LogInformation("Using local notification service for development");
        }

        public void SendNotification(string entityType, string entityId, EntityOperation operation, string? userName = null)
        {
            SendNotification(entityType, entityId, null, operation, userName);
        }

        public void SendNotification(string entityType, string entityId, string? entityDisplayName, EntityOperation operation, string? userName = null)
        {
            var notification = new Notification
            {
                Id = System.Threading.Interlocked.Increment(ref _nextId),
                EntityType = entityType,
                EntityId = entityId,
                Operation = operation.ToString(),
                Message = GenerateMessage(entityType, entityId, entityDisplayName, operation),
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userName ?? "System",
                IsRead = false
            };

            lock (_notifications)
            {
                _notifications.Add(notification);
            }

            _logger.LogInformation("Local notification sent: {EntityType} {EntityId} {Operation}", 
                entityType, entityId, operation);
        }

        public Task SendNotificationAsync(string entityType, string entityId, EntityOperation operation, string? userName = null)
        {
            SendNotification(entityType, entityId, operation, userName);
            return Task.CompletedTask;
        }

        public Task SendNotificationAsync(string entityType, string entityId, string? entityDisplayName, EntityOperation operation, string? userName = null)
        {
            SendNotification(entityType, entityId, entityDisplayName, operation, userName);
            return Task.CompletedTask;
        }

        public Notification? ReceiveNotification()
        {
            lock (_notifications)
            {
                return _notifications.FirstOrDefault(n => !n.IsRead);
            }
        }

        public Task<Notification?> ReceiveNotificationAsync()
        {
            return Task.FromResult(ReceiveNotification());
        }

        public IEnumerable<Notification> GetNotifications(int count = 10)
        {
            lock (_notifications)
            {
                return _notifications
                    .OrderByDescending(n => n.CreatedAt)
                    .Take(count)
                    .ToList();
            }
        }

        public IEnumerable<Notification> GetUnreadNotifications(int count = 10)
        {
            lock (_notifications)
            {
                return _notifications
                    .Where(n => !n.IsRead)
                    .OrderByDescending(n => n.CreatedAt)
                    .Take(count)
                    .ToList();
            }
        }

        public void MarkAsRead(int notificationId)
        {
            lock (_notifications)
            {
                var notification = _notifications.FirstOrDefault(n => n.Id == notificationId);
                if (notification != null)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                    _logger.LogInformation("Notification {Id} marked as read", notificationId);
                }
            }
        }

        public Task MarkAsReadAsync(int notificationId)
        {
            MarkAsRead(notificationId);
            return Task.CompletedTask;
        }

        public void MarkAllAsRead()
        {
            lock (_notifications)
            {
                foreach (var notification in _notifications.Where(n => !n.IsRead))
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                }
                _logger.LogInformation("All notifications marked as read");
            }
        }

        private string GenerateMessage(string entityType, string entityId, string? entityDisplayName, EntityOperation operation)
        {
            var entityName = string.IsNullOrEmpty(entityDisplayName) ? entityId : entityDisplayName;
            return operation switch
            {
                EntityOperation.Create => $"New {entityType} '{entityName}' was created",
                EntityOperation.Update => $"{entityType} '{entityName}' was updated",
                EntityOperation.Delete => $"{entityType} '{entityName}' was deleted",
                _ => $"{operation} operation performed on {entityType} '{entityName}'"
            };
        }

        public void Dispose()
        {
            // No resources to dispose in the mock implementation
            GC.SuppressFinalize(this);
        }

        public ValueTask DisposeAsync()
        {
            Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
