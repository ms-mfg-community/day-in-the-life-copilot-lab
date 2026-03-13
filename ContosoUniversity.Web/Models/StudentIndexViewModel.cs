using ContosoUniversity.Core.Models;

namespace ContosoUniversity.Web.Models
{
    public class StudentIndexViewModel
    {
        public IReadOnlyList<Student> Students { get; set; } = Array.Empty<Student>();
        public string? CurrentSort { get; set; }
        public string? SearchText { get; set; }
        public DateTime? EnrollmentDateFrom { get; set; }
        public DateTime? EnrollmentDateTo { get; set; }
        public string NameSortParm { get; set; } = string.Empty;
        public string DateSortParm { get; set; } = string.Empty;
        public int PageNumber { get; set; }
        public int TotalPages { get; set; }
        public bool HasPreviousPage { get; set; }
        public bool HasNextPage { get; set; }
    }
}
