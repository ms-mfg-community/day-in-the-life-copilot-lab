using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ContosoUniversity.Infrastructure.Services
{
    public class StudentQueryService : IStudentQueryService
    {
        private readonly SchoolContext _context;

        public StudentQueryService(SchoolContext context)
        {
            _context = context;
        }

        public async Task<PagedResult<Student>> SearchStudentsAsync(StudentSearchCriteria criteria)
        {
            var pageNumber = Math.Max(1, criteria.PageNumber);
            var pageSize = Math.Clamp(criteria.PageSize, 1, 100);

            var query = _context.Students.AsNoTracking();
            var searchText = criteria.SearchText?.Trim();

            if (!string.IsNullOrWhiteSpace(searchText))
            {
                var pattern = $"%{searchText}%";
                query = query.Where(student =>
                    EF.Functions.Like(student.LastName, pattern) ||
                    EF.Functions.Like(student.FirstMidName, pattern));
            }

            if (criteria.EnrollmentDateFrom.HasValue)
            {
                query = query.Where(student => student.EnrollmentDate >= criteria.EnrollmentDateFrom.Value.Date);
            }

            if (criteria.EnrollmentDateTo.HasValue)
            {
                var toExclusive = criteria.EnrollmentDateTo.Value.Date.AddDays(1);
                query = query.Where(student => student.EnrollmentDate < toExclusive);
            }

            var orderedQuery = criteria.SortOption switch
            {
                StudentSortOption.LastNameDesc => query.OrderByDescending(student => student.LastName).ThenBy(student => student.ID),
                StudentSortOption.EnrollmentDateAsc => query.OrderBy(student => student.EnrollmentDate).ThenBy(student => student.ID),
                StudentSortOption.EnrollmentDateDesc => query.OrderByDescending(student => student.EnrollmentDate).ThenBy(student => student.ID),
                _ => query.OrderBy(student => student.LastName).ThenBy(student => student.ID)
            };

            var totalCount = await orderedQuery.CountAsync();
            var items = await orderedQuery
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return new PagedResult<Student>(items, totalCount, pageNumber, pageSize);
        }
    }
}
