using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    public abstract class BaseController : Controller
    {
        protected readonly INotificationService _notificationService;
        protected readonly ILogger<BaseController> _logger;

        protected BaseController(
            INotificationService notificationService,
            ILogger<BaseController> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        protected async Task SendEntityNotificationAsync(string entityType, string entityId, EntityOperation operation)
        {
            await SendEntityNotificationAsync(entityType, entityId, null, operation);
        }

        protected async Task SendEntityNotificationAsync(string entityType, string entityId, string? entityDisplayName, EntityOperation operation)
        {
            try
            {
                var userName = User.Identity?.IsAuthenticated == true ? 
                    User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email) : 
                    "System";
                
                await _notificationService.SendNotificationAsync(entityType, entityId, entityDisplayName, operation, userName);
            }
            catch (Exception ex)
            {
                // Log the error but don't break the main operation
                _logger.LogError(ex, "Failed to send notification: {Message}", ex.Message);
            }
        }

        protected void SendEntityNotification(string entityType, string entityId, EntityOperation operation)
        {
            SendEntityNotification(entityType, entityId, null, operation);
        }

        protected void SendEntityNotification(string entityType, string entityId, string? entityDisplayName, EntityOperation operation)
        {
            try
            {
                var userName = User.Identity?.IsAuthenticated == true ? 
                    User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email) : 
                    "System";
                
                _notificationService.SendNotification(entityType, entityId, entityDisplayName, operation, userName);
            }
            catch (Exception ex)
            {
                // Log the error but don't break the main operation
                _logger.LogError(ex, "Failed to send notification: {Message}", ex.Message);
            }
        }
    }
}

