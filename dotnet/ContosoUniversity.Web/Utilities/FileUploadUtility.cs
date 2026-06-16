using ContosoUniversity.Core.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace ContosoUniversity.Web.Utilities
{
    public static class FileUploadUtility
    {
        public static async Task<(bool Success, string? Url, string? ErrorMessage)> UploadTeachingMaterialAsync(
            IFormFile file, 
            int courseId, 
            IFileStorageService fileStorageService,
            ILogger logger)
        {
            try
            {
                // Validate file type
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".bmp" };
                var fileExtension = Path.GetExtension(file.FileName).ToLower();
                
                if (!allowedExtensions.Contains(fileExtension))
                {
                    return (false, null, "Please upload a valid image file (jpg, jpeg, png, gif, bmp).");
                }

                // Validate file size (max 5MB)
                if (file.Length > 5 * 1024 * 1024)
                {
                    return (false, null, "File size must be less than 5MB.");
                }

                // Generate unique filename
                var fileName = $"course_{courseId}_{Guid.NewGuid()}{fileExtension}";
                
                // Upload to blob storage
                using (var stream = file.OpenReadStream())
                {
                    var uploadedUrl = await fileStorageService.UploadFileAsync(
                        stream,
                        fileName,
                        file.ContentType);
                        
                    logger.LogInformation("Teaching material uploaded for course {CourseId}: {Url}", courseId, uploadedUrl);
                    return (true, uploadedUrl, null);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error uploading teaching material for course {CourseId}", courseId);
                return (false, null, $"Error uploading file: {ex.Message}");
            }
        }

        public static async Task<bool> DeleteTeachingMaterialAsync(
            string fileUrl,
            IFileStorageService fileStorageService,
            ILogger logger)
        {
            try
            {
                if (string.IsNullOrEmpty(fileUrl))
                {
                    return true; // Nothing to delete
                }
                
                var result = await fileStorageService.DeleteFileAsync(fileUrl);
                logger.LogInformation("Teaching material deleted: {Url}, Result: {Result}", fileUrl, result);
                return result;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error deleting teaching material: {Url}", fileUrl);
                return false;
            }
        }
    }
}
