namespace ContosoUniversity.Core.Models
{
    public class StudentSearchCriteria
    {
        public string? SearchText { get; set; }
        public DateTime? EnrollmentDateFrom { get; set; }
        public DateTime? EnrollmentDateTo { get; set; }
        public StudentSortOption SortOption { get; set; } = StudentSortOption.LastNameAsc;
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
