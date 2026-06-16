namespace ContosoUniversity.Infrastructure.Configuration
{
    public class ServiceOptions
    {
        public ServiceBusOptions ServiceBus { get; set; } = new ServiceBusOptions();
        public BlobStorageOptions BlobStorage { get; set; } = new BlobStorageOptions();
    }

    public class ServiceBusOptions
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string QueueName { get; set; } = string.Empty;
    }

    public class BlobStorageOptions
    {
        public string ConnectionString { get; set; } = string.Empty;
        public string ContainerName { get; set; } = string.Empty;
    }
}
