using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Web.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace ContosoUniversity.Web.ViewComponents
{
    public class NotificationsViewComponent : ViewComponent
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<NotificationsViewComponent> _logger;

        public NotificationsViewComponent(
            INotificationService notificationService,
            ILogger<NotificationsViewComponent> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        public IViewComponentResult Invoke(int maxNotifications = 5)
        {
            var viewModels = new List<NotificationViewModel>();
            var count = 0;
            
            try
            {
                // Get notifications from service
                var notification = _notificationService.ReceiveNotification();
                while (notification != null && count < maxNotifications)
                {
                    viewModels.Add(new NotificationViewModel
                    {
                        ID = notification.Id,
                        EntityType = notification.EntityType,
                        EntityId = notification.EntityId,
                        Title = GetNotificationTitle(notification.EntityType, notification.Operation),
                        Message = notification.Message,
                        CreatedAt = notification.CreatedAt,
                        CreatedBy = notification.CreatedBy ?? "System",
                        IsRead = notification.IsRead,
                        Type = GetNotificationType(notification.Operation)
                    });
                    
                    count++;
                    notification = _notificationService.ReceiveNotification();
                }
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications for view component");
            }

            return View(viewModels);
        }

        private string GetNotificationTitle(string entityType, string operation)
        {
            return operation switch
            {
                "CREATE" => $"New {entityType}",
                "UPDATE" => $"{entityType} Updated",
                "DELETE" => $"{entityType} Deleted",
                _ => $"{entityType} Notification"
            };
        }
        
        private NotificationType GetNotificationType(string operation)
        {
            return operation switch
            {
                "CREATE" => NotificationType.CREATE,
                "UPDATE" => NotificationType.UPDATE,
                "DELETE" => NotificationType.DELETE,
                _ => NotificationType.INFO
            };
        }
    }
}
