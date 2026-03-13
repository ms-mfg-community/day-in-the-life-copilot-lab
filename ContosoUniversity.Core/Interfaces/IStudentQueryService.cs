using ContosoUniversity.Core.Models;

namespace ContosoUniversity.Core.Interfaces
{
    public interface IStudentQueryService
    {
        Task<PagedResult<Student>> SearchStudentsAsync(StudentSearchCriteria criteria);
    }
}
