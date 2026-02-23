using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using ContosoUniversity.Infrastructure.Services;
using ContosoUniversity.Infrastructure.Configuration;

namespace ContosoUniversity.Tests.Services
{
    public class BlobStorageServiceTests
    {
        private readonly Mock<BlobServiceClient> _mockBlobServiceClient;
        private readonly Mock<BlobContainerClient> _mockBlobContainerClient;
        private readonly Mock<BlobClient> _mockBlobClient;
        private readonly Mock<IOptions<ContosoUniversity.Infrastructure.Configuration.BlobStorageOptions>> _mockOptions;
        private readonly Mock<ILogger<BlobStorageService>> _mockLogger;

        public BlobStorageServiceTests()
        {
            _mockBlobServiceClient = new Mock<BlobServiceClient>();
            _mockBlobContainerClient = new Mock<BlobContainerClient>();
            _mockBlobClient = new Mock<BlobClient>();
            _mockOptions = new Mock<IOptions<ContosoUniversity.Infrastructure.Configuration.BlobStorageOptions>>();
            _mockLogger = new Mock<ILogger<BlobStorageService>>();

            // Setup options
            _mockOptions.Setup(o => o.Value)
                .Returns(new ContosoUniversity.Infrastructure.Configuration.BlobStorageOptions
                {
                    ConnectionString = "DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test==;EndpointSuffix=core.windows.net"
                });
        }

        [Fact]
        public async Task UploadFileAsync_InDevelopmentMode_StoresFileLocally()
        {
            // Arrange
            var fileName = "testfile.jpg";
            var contentType = "image/jpeg";
            var fileContent = new MemoryStream(new byte[] { 1, 2, 3, 4, 5 });

            // Service will be in development mode due to our test configuration
            var service = new BlobStorageService(
                _mockOptions.Object,
                _mockLogger.Object);

            // Act
            var result = await service.UploadFileAsync(fileContent, fileName, contentType);

            // Assert
            Assert.NotNull(result);
            Assert.StartsWith("http://localhost/local-files/testfile_", result);
            Assert.EndsWith(".jpg", result);
        }

        [Fact]
        public async Task DeleteFileAsync_InDevelopmentMode_RemovesFileLocally()
        {
            // Arrange
            var service = new BlobStorageService(
                _mockOptions.Object,
                _mockLogger.Object);

            // First upload a file to have something to delete
            var fileContent = new MemoryStream(new byte[] { 1, 2, 3, 4, 5 });
            var uploadedUrl = await service.UploadFileAsync(fileContent, "testfile.jpg", "image/jpeg");

            // Act
            var result = await service.DeleteFileAsync(uploadedUrl);

            // Assert
            Assert.True(result);
        }

        [Fact]
        public async Task UploadFileAsync_WithInvalidStream_ThrowsException()
        {
            // Arrange
            var fileName = "testfile.jpg";
            var contentType = "image/jpeg";
            
            var service = new BlobStorageService(
                _mockOptions.Object,
                _mockLogger.Object);

            // Use a disposed stream to force an exception
            var fileContent = new MemoryStream(new byte[] { 1, 2, 3, 4, 5 });
            fileContent.Dispose();

            // Act & Assert
            await Assert.ThrowsAsync<ObjectDisposedException>(() => 
                service.UploadFileAsync(fileContent, fileName, contentType));
        }
    }
}
