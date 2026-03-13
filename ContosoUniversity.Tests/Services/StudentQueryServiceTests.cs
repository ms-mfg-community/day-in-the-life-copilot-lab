using System;
using System.Linq;
using System.Threading.Tasks;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Infrastructure.Data;
using ContosoUniversity.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace ContosoUniversity.Tests.Services
{
    public class StudentQueryServiceTests : IDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly SchoolContext _context;
        private readonly StudentQueryService _service;

        public StudentQueryServiceTests()
        {
            _connection = new SqliteConnection("DataSource=:memory:");
            _connection.Open();

            var options = new DbContextOptionsBuilder<SchoolContext>()
                .UseSqlite(_connection)
                .Options;

            _context = new SchoolContext(options);
            _context.Database.EnsureCreated();
            SeedStudents();
            _service = new StudentQueryService(_context);
        }

        [Fact]
        public async Task SearchStudentsAsync_NoFilters_ReturnsAllStudentsOrderedByLastName()
        {
            // Arrange
            var criteria = new StudentSearchCriteria { PageSize = 20 };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(12, result.TotalCount);
            Assert.Equal(12, result.Items.Count);
            Assert.Equal(
                new[] { "Alexander", "Alonso", "Anand", "Anderson", "Barzdukas", "Justice", "Kim", "Li", "Martin", "Norman", "Olivetto", "Park" },
                result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_SearchByLastName_ReturnsMatchingStudents()
        {
            // Arrange
            var criteria = new StudentSearchCriteria { SearchText = "Al" };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(2, result.TotalCount);
            Assert.Equal(new[] { "Alexander", "Alonso" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_SearchByFirstName_ReturnsMatchingStudents()
        {
            // Arrange
            var criteria = new StudentSearchCriteria { SearchText = "Yan" };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            var student = Assert.Single(result.Items);
            Assert.Equal(1, result.TotalCount);
            Assert.Equal("Yan", student.FirstMidName);
            Assert.Equal("Li", student.LastName);
        }

        [Fact]
        public async Task SearchStudentsAsync_SearchTextCaseInsensitive_ReturnsMatchingStudents()
        {
            // Arrange
            var criteria = new StudentSearchCriteria { SearchText = "al" };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(2, result.TotalCount);
            Assert.Equal(new[] { "Alexander", "Alonso" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_SearchNoMatch_ReturnsEmptyResult()
        {
            // Arrange
            var criteria = new StudentSearchCriteria { SearchText = "zzz" };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Empty(result.Items);
            Assert.Equal(0, result.TotalCount);
            Assert.Equal(0, result.TotalPages);
            Assert.False(result.HasPreviousPage);
            Assert.False(result.HasNextPage);
        }

        [Fact]
        public async Task SearchStudentsAsync_EnrollmentDateFrom_FiltersCorrectly()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                EnrollmentDateFrom = new DateTime(2013, 1, 1),
                PageSize = 20,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(5, result.TotalCount);
            Assert.All(result.Items, student => Assert.True(student.EnrollmentDate >= new DateTime(2013, 1, 1)));
            Assert.Equal(new[] { "Anand", "Anderson", "Kim", "Norman", "Park" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_EnrollmentDateTo_FiltersCorrectly()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                EnrollmentDateTo = new DateTime(2011, 12, 31),
                PageSize = 20,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(4, result.TotalCount);
            Assert.All(result.Items, student => Assert.True(student.EnrollmentDate <= new DateTime(2011, 12, 31)));
            Assert.Equal(new[] { "Alexander", "Justice", "Martin", "Olivetto" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_EnrollmentDateRange_FiltersCorrectly()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                EnrollmentDateFrom = new DateTime(2012, 1, 1),
                EnrollmentDateTo = new DateTime(2012, 12, 31),
                PageSize = 20,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(3, result.TotalCount);
            Assert.All(result.Items, student => Assert.InRange(student.EnrollmentDate, new DateTime(2012, 1, 1), new DateTime(2012, 12, 31)));
            Assert.Equal(new[] { "Alonso", "Barzdukas", "Li" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_SortByLastNameDesc_ReturnsSortedResults()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                SortOption = StudentSortOption.LastNameDesc,
                PageSize = 20,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(
                new[] { "Park", "Olivetto", "Norman", "Martin", "Li", "Kim", "Justice", "Barzdukas", "Anderson", "Anand", "Alonso", "Alexander" },
                result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_SortByEnrollmentDateAsc_ReturnsSortedResults()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                SortOption = StudentSortOption.EnrollmentDateAsc,
                PageSize = 20,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(
                new[] { "Olivetto", "Alexander", "Martin", "Justice", "Li", "Barzdukas", "Alonso", "Norman", "Anand", "Park", "Anderson", "Kim" },
                result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_SortByEnrollmentDateDesc_ReturnsSortedResults()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                SortOption = StudentSortOption.EnrollmentDateDesc,
                PageSize = 20,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(
                new[] { "Kim", "Anderson", "Park", "Anand", "Norman", "Alonso", "Barzdukas", "Li", "Justice", "Martin", "Alexander", "Olivetto" },
                result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_PagingFirstPage_ReturnsCorrectSubset()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                PageNumber = 1,
                PageSize = 3,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(12, result.TotalCount);
            Assert.Equal(4, result.TotalPages);
            Assert.False(result.HasPreviousPage);
            Assert.True(result.HasNextPage);
            Assert.Equal(new[] { "Alexander", "Alonso", "Anand" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_PagingSecondPage_ReturnsCorrectSubset()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                PageNumber = 2,
                PageSize = 3,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(12, result.TotalCount);
            Assert.Equal(4, result.TotalPages);
            Assert.True(result.HasPreviousPage);
            Assert.True(result.HasNextPage);
            Assert.Equal(new[] { "Anderson", "Barzdukas", "Justice" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_PagingLastPage_ReturnsRemainingItems()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                PageNumber = 3,
                PageSize = 5,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(12, result.TotalCount);
            Assert.Equal(3, result.TotalPages);
            Assert.True(result.HasPreviousPage);
            Assert.False(result.HasNextPage);
            Assert.Equal(new[] { "Olivetto", "Park" }, result.Items.Select(student => student.LastName).ToArray());
        }

        [Fact]
        public async Task SearchStudentsAsync_CombinedFiltersAndPaging_WorksTogether()
        {
            // Arrange
            var criteria = new StudentSearchCriteria
            {
                SearchText = "A",
                EnrollmentDateFrom = new DateTime(2013, 1, 1),
                EnrollmentDateTo = new DateTime(2014, 12, 31),
                PageNumber = 1,
                PageSize = 2,
            };

            // Act
            var result = await _service.SearchStudentsAsync(criteria);

            // Assert
            Assert.Equal(4, result.TotalCount);
            Assert.Equal(2, result.TotalPages);
            Assert.Equal(new[] { "Anand", "Anderson" }, result.Items.Select(student => student.LastName).ToArray());
            Assert.All(result.Items, student => Assert.InRange(student.EnrollmentDate, new DateTime(2013, 1, 1), new DateTime(2014, 12, 31)));
        }

        public void Dispose()
        {
            _context.Dispose();
            _connection.Dispose();
        }

        private void SeedStudents()
        {
            _context.Students.AddRange(
                new Student { FirstMidName = "Carson", LastName = "Alexander", EnrollmentDate = DateTime.Parse("2010-09-01") },
                new Student { FirstMidName = "Meredith", LastName = "Alonso", EnrollmentDate = DateTime.Parse("2012-09-01") },
                new Student { FirstMidName = "Arturo", LastName = "Anand", EnrollmentDate = DateTime.Parse("2013-09-01") },
                new Student { FirstMidName = "Gytis", LastName = "Barzdukas", EnrollmentDate = DateTime.Parse("2012-06-01") },
                new Student { FirstMidName = "Yan", LastName = "Li", EnrollmentDate = DateTime.Parse("2012-03-01") },
                new Student { FirstMidName = "Peggy", LastName = "Justice", EnrollmentDate = DateTime.Parse("2011-09-01") },
                new Student { FirstMidName = "Laura", LastName = "Norman", EnrollmentDate = DateTime.Parse("2013-01-15") },
                new Student { FirstMidName = "Nino", LastName = "Olivetto", EnrollmentDate = DateTime.Parse("2010-06-01") },
                new Student { FirstMidName = "Angela", LastName = "Martin", EnrollmentDate = DateTime.Parse("2011-03-01") },
                new Student { FirstMidName = "Thomas", LastName = "Anderson", EnrollmentDate = DateTime.Parse("2014-09-01") },
                new Student { FirstMidName = "Lisa", LastName = "Park", EnrollmentDate = DateTime.Parse("2014-01-15") },
                new Student { FirstMidName = "David", LastName = "Kim", EnrollmentDate = DateTime.Parse("2015-09-01") });

            _context.SaveChanges();
        }
    }
}
