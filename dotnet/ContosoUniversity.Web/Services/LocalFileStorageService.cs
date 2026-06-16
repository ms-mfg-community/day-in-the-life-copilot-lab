using ContosoUniversity.Core.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Threading.Tasks;

namespace ContosoUniversity.Web.Services
{
    /// <summary>
    /// Local implementation of IFileStorageService that stores files on the local file system
    /// </summary>
    public class LocalFileStorageService : IFileStorageService
    {
        private readonly ILogger<LocalFileStorageService> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly string _uploadsFolder;

        public LocalFileStorageService(
            ILogger<LocalFileStorageService> logger,
            IWebHostEnvironment environment)
        {
            _logger = logger;
            _environment = environment;
            
            // Create uploads folder within the web root
            _uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads");
            if (!Directory.Exists(_uploadsFolder))
            {
                Directory.CreateDirectory(_uploadsFolder);
            }
            
            _logger.LogInformation("Using local file storage service for development. Files will be stored in: {UploadsFolder}", _uploadsFolder);
        }

        public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType)
        {
            try
            {
                // Create a unique file name to avoid collisions
                var uniqueFileName = $"{Path.GetFileNameWithoutExtension(fileName)}_{Guid.NewGuid()}{Path.GetExtension(fileName)}";
                var filePath = Path.Combine(_uploadsFolder, uniqueFileName);
                
                // Save the file to the uploads folder
                using (var fileWriter = new FileStream(filePath, FileMode.Create))
                {
                    await fileStream.CopyToAsync(fileWriter);
                }
                
                _logger.LogInformation("File saved locally: {FileName} -> {LocalPath}", fileName, filePath);
                
                // Return a relative URL to the file
                return $"/uploads/{uniqueFileName}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file {FileName}: {Message}", fileName, ex.Message);
                throw;
            }
        }

        public async Task<bool> DeleteFileAsync(string fileUrl)
        {
            try
            {
                // Extract the file name from the URL
                var fileName = Path.GetFileName(fileUrl);
                var filePath = Path.Combine(_uploadsFolder, fileName);
                
                // Check if the file exists
                if (!File.Exists(filePath))
                {
                    _logger.LogWarning("File not found for deletion: {FilePath}", filePath);
                    return false;
                }
                
                // Delete the file
                File.Delete(filePath);
                _logger.LogInformation("File deleted: {FilePath}", filePath);
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file {FileUrl}: {Message}", fileUrl, ex.Message);
                return false;
            }
        }
        
        public string GetFileUrl(string fileName)
        {
            // For local storage, simply return a relative URL
            return $"/uploads/{fileName}";
        }

        public async Task<Stream?> DownloadFileAsync(string fileUrl)
        {
            try
            {
                // Extract the file name from the URL
                var fileName = Path.GetFileName(fileUrl);
                var filePath = Path.Combine(_uploadsFolder, fileName);
                
                // Check if the file exists
                if (!File.Exists(filePath))
                {
                    _logger.LogWarning("File not found for download: {FilePath}", filePath);
                    return null;
                }
                
                // Open the file and return the stream
                return new FileStream(filePath, FileMode.Open, FileAccess.Read);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading file {FileUrl}: {Message}", fileUrl, ex.Message);
                return null;
            }
        }
    }
}
