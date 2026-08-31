namespace ContosoUniversity.Web.Models
{
    public class NotificationViewModel
    {
        public int ID { get; set; }
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public string? Title { get; set; }
        public string? Message { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? CreatedBy { get; set; }
        public bool IsRead { get; set; }
        public NotificationType Type { get; set; }
    }
}
