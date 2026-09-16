using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using ContosoUniversity.Core.Validation;

namespace ContosoUniversity.Core.Models
{
    public class Department
    {
        public int DepartmentID { get; set; }

        [StringLength(50, MinimumLength = 3)]
        [Required]
        [DepartmentNameValidation]
        public string Name { get; set; } = string.Empty;

        [DataType(DataType.Currency)]
        [Column(TypeName = "money")]
        [Range(0, 10000000)]
        [Display(Name = "Budget")]
        public decimal Budget { get; set; }

        [DataType(DataType.Date)]
        [DisplayFormat(DataFormatString = "{0:yyyy-MM-dd}", ApplyFormatInEditMode = true)]
        [Display(Name = "Start Date")]
        [FutureDateValidation(5)]
        public DateTime StartDate { get; set; }

        [Display(Name = "Administrator")]
        public int? InstructorID { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }

        [Display(Name = "Department Type")]
        public string? DepartmentType { get; set; } = "Academic";

        public virtual Instructor? Administrator { get; set; }
        public virtual ICollection<Course> Courses { get; set; } = new List<Course>();
    }
}
