using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ContosoUniversity.Web.Models
{
    public class Notification
    {
        [Key]
        public int ID { get; set; }
        
        [Required]
        [StringLength(100)]
        public string EntityType { get; set; }
        
        [Required]
        [StringLength(50)]
        public string EntityId { get; set; }
        
        [Required]
        [StringLength(20)]
        public string Operation { get; set; } // CREATE, UPDATE, DELETE
        
        [Required]
        [StringLength(256)]
        public string Message { get; set; }
        
        [Required]
        public DateTime CreatedAt { get; set; }
        
        [StringLength(100)]
        public string CreatedBy { get; set; }
        
        public bool IsRead { get; set; }
        
        public DateTime? ReadAt { get; set; }

        [NotMapped]
        public NotificationType Type
        {
            get
            {
                if (Enum.TryParse<NotificationType>(Operation, out var result))
                {
                    return result;
                }
                return NotificationType.INFO;
            }
        }
    }
    
    // Using ContosoUniversity.Core.Models.EntityOperation instead of duplicating here
    
    public enum NotificationType
    {
        CREATE,
        UPDATE,
        DELETE,
        INFO
    }
}
