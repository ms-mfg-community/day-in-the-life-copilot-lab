using ContosoUniversity.Core.Models;

namespace ContosoUniversity.Core.Interfaces
{
    public interface INotificationService
    {
        void SendNotification(string entityType, string entityId, EntityOperation operation, string? userName = null);
        void SendNotification(string entityType, string entityId, string? entityDisplayName, EntityOperation operation, string? userName = null);
        Task SendNotificationAsync(string entityType, string entityId, EntityOperation operation, string? userName = null);
        Task SendNotificationAsync(string entityType, string entityId, string? entityDisplayName, EntityOperation operation, string? userName = null);
        Notification? ReceiveNotification();
        Task<Notification?> ReceiveNotificationAsync();
        void MarkAsRead(int notificationId);
        Task MarkAsReadAsync(int notificationId);
        void Dispose();
    }
}
