namespace ContosoUniversity.Web.Models
{
    public class InstructorIndexData
    {
        public IEnumerable<Core.Models.Instructor> Instructors { get; set; }
        public IEnumerable<Core.Models.Course> Courses { get; set; }
        public IEnumerable<Core.Models.Enrollment> Enrollments { get; set; }
    }
}
