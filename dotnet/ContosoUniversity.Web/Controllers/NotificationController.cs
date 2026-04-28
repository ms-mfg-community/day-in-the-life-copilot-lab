using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Web.Models;
using Microsoft.AspNetCore.Authorization;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    [Authorize(Roles = "Admin")]
    public class NotificationController : BaseController
    {
        // No need to redeclare logger as it's already in the base class
        
        public NotificationController(
            INotificationService notificationService,
            ILogger<NotificationController> logger) : base(notificationService, logger)
        {
            // No need to assign to a new field
        }

        // GET: Notification
        public IActionResult Index()
        {
            // The view will be populated using AJAX from our API endpoints
            return View();
        }

        // GET: api/notification-admin - Get pending notifications for admin
        [HttpGet]
        [Route("api/notification-admin")]
        public JsonResult GetNotifications()
        {
            try
            {
                // For a web app using the Core interface, we'd normally implement a repository
                // pattern to fetch notifications, but we'll simulate this for now
                var notifications = new List<object>();
                
                var notification = _notificationService.ReceiveNotification();
                
                while (notification != null)
                {
                    notifications.Add(new
                    {
                        id = notification.Id,
                        entityType = notification.EntityType,
                        entityId = notification.EntityId,
                        title = GetNotificationTitle(notification.EntityType, notification.Operation),
                        message = notification.Message,
                        createdAt = notification.CreatedAt,
                        createdBy = notification.CreatedBy,
                        isRead = notification.IsRead,
                        type = notification.Operation
                    });
                    
                    if (notifications.Count >= 10)
                        break;
                        
                    notification = _notificationService.ReceiveNotification();
                }

                return Json(new { 
                    success = true, 
                    notifications = notifications,
                    count = notifications.Count 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving notifications");
                return Json(new { success = false, message = $"Error retrieving notifications: {ex.Message}" });
            }
        }

        // POST: api/notifications/mark-read
        [HttpPost]
        [Route("api/notifications/mark-read")]
        public JsonResult MarkAsRead(int id)
        {
            try
            {
                _notificationService.MarkAsRead(id);
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return Json(new { success = false, message = $"Error marking notification as read: {ex.Message}" });
            }
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
    }
}

