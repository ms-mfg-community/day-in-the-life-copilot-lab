using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContosoUniversity.Web.Controllers
{
    [Authorize(Roles = "Admin")]
    public class NotificationsController : BaseController
    {
        public NotificationsController(
            INotificationService notificationService,
            ILogger<NotificationsController> logger) : base(notificationService, logger)
        {
        }

        // GET: Notifications
        public IActionResult Index()
        {
            return View();
        }

        // GET: api/notifications
        [HttpGet]
        [Route("api/notifications")]
        public async Task<IActionResult> GetNotifications()
        {
            var notifications = new List<Notification>();
            
            try
            {
                // Read all available notifications from the queue
                Notification? notification;
                while ((notification = await _notificationService.ReceiveNotificationAsync()) != null)
                {
                    notifications.Add(notification);
                    
                    // Limit to prevent overwhelming the UI
                    if (notifications.Count >= 10)
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving notifications");
                return Json(new { success = false, message = "Error retrieving notifications" });
            }

            return Json(new { 
                success = true, 
                notifications = notifications,
                count = notifications.Count 
            });
        }

        // POST: api/notifications/mark-read
        [HttpPost]
        [Route("api/notifications/mark-read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                await _notificationService.MarkAsReadAsync(id);
                return Json(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read: {ID}", id);
                return Json(new { success = false, message = "Error updating notification" });
            }
        }
    }
}

