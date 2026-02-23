using Microsoft.AspNetCore.Http;
using System.ComponentModel.DataAnnotations;

namespace ContosoUniversity.Web.Models
{
    public class CourseViewModel
    {
        [Display(Name = "Number")]
        public int CourseID { get; set; }

        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Title { get; set; }

        [Required]
        [Range(0, 5)]
        public int Credits { get; set; }

        [Required]
        [Display(Name = "Department")]
        public int DepartmentID { get; set; }

        [Display(Name = "Teaching Material")]
        public string? TeachingMaterialImagePath { get; set; }

        [Display(Name = "Upload Teaching Material Image")]
        public IFormFile? TeachingMaterialImage { get; set; }
    }
}
