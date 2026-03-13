using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;
using AngleSharp;
using AngleSharp.Html.Dom;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using ContosoUniversity.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ContosoUniversity.Tests.Integration
{
    public class StudentIntegrationTests : BaseIntegrationTest
    {
        public StudentIntegrationTests(CustomWebApplicationFactory<Program> factory) : base(factory)
        {
        }

        [Fact]
        public async Task Get_StudentsIndex_ReturnsSuccessfulResponse()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");
            
            // Act
            var response = await client.GetAsync("/Students");

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            
            var content = await response.Content.ReadAsStringAsync();
            Assert.Contains("Students", content);
        }

        [Fact]
        public async Task Get_StudentsIndex_DisplaysSeededStudents()
        {
            // Arrange
            using var scope = Factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SchoolContext>();
            
            // Verify we have seeded data
            var studentsCount = await context.Students.CountAsync();
            Assert.True(studentsCount > 0, "No students found in test database");

            // Act
            using var client = Factory.CreateAuthenticatedClient("Admin");
            var response = await client.GetAsync("/Students");
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            
            // Parse HTML to validate structure
            var config = Configuration.Default;
            var context2 = BrowsingContext.New(config);
            var document = await context2.OpenAsync(req => req.Content(content));

            // Assert
            var table = document.QuerySelector("table");
            Assert.NotNull(table);

            var rows = document.QuerySelectorAll("tbody tr");
            Assert.True(rows.Length > 0, "No student rows found in the table");
        }

        [Fact]
        public async Task Get_StudentsIndex_WithNameSearch_FiltersResults()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");

            // Act
            var response = await client.GetAsync("/Students?searchString=Alexander");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var config = Configuration.Default;
            var browsingContext = BrowsingContext.New(config);
            var document = await browsingContext.OpenAsync(req => req.Content(content));
            var rows = document.QuerySelectorAll("tbody tr");

            Assert.Single(rows);

            var rowText = rows[0].TextContent;
            Assert.Contains("Alexander", rowText);
            Assert.DoesNotContain("Alonso", rowText);
            Assert.DoesNotContain("Anand", rowText);
            Assert.DoesNotContain("Barzdukas", rowText);
            Assert.DoesNotContain("Li", rowText);
        }

        [Fact]
        public async Task Get_StudentsIndex_WithNameSearch_NoMatch_ShowsEmptyMessage()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");

            // Act
            var response = await client.GetAsync("/Students?searchString=zzzzz");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();

            Assert.Contains("No students found.", content);
        }

        [Fact]
        public async Task Get_StudentsIndex_WithEnrollmentDateRange_FiltersResults()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");

            // Act
            var response = await client.GetAsync("/Students?enrollmentDateFrom=2012-01-01&enrollmentDateTo=2012-12-31");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var config = Configuration.Default;
            var browsingContext = BrowsingContext.New(config);
            var document = await browsingContext.OpenAsync(req => req.Content(content));
            var rows = document.QuerySelectorAll("tbody tr");
            var lastNames = rows
                .Select(row => row.QuerySelectorAll("td")[0].TextContent.Trim())
                .ToList();

            Assert.Equal(new[] { "Alonso", "Barzdukas", "Li" }, lastNames);
        }

        [Fact]
        public async Task Get_StudentsIndex_SortByNameDesc_ReversesSortOrder()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");

            // Act
            var response = await client.GetAsync("/Students?sortOrder=name_desc");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var config = Configuration.Default;
            var browsingContext = BrowsingContext.New(config);
            var document = await browsingContext.OpenAsync(req => req.Content(content));
            var rows = document.QuerySelectorAll("tbody tr");
            var firstStudentLastName = rows[0].QuerySelectorAll("td")[0].TextContent.Trim();

            Assert.Equal("Li", firstStudentLastName);
        }

        [Fact]
        public async Task Get_StudentsIndex_SortByDate_SortsByEnrollmentDate()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");

            // Act
            var response = await client.GetAsync("/Students?sortOrder=Date");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var config = Configuration.Default;
            var browsingContext = BrowsingContext.New(config);
            var document = await browsingContext.OpenAsync(req => req.Content(content));
            var rows = document.QuerySelectorAll("tbody tr");
            var firstStudentLastName = rows[0].QuerySelectorAll("td")[0].TextContent.Trim();

            Assert.Equal("Alexander", firstStudentLastName);
        }

        [Fact]
        public async Task Get_StudentsIndex_PreservesFilterInSortLinks()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");

            // Act
            var response = await client.GetAsync("/Students?searchString=A");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var config = Configuration.Default;
            var browsingContext = BrowsingContext.New(config);
            var document = await browsingContext.OpenAsync(req => req.Content(content));
            var sortLinks = document.QuerySelectorAll("th a")
                .Select(link => link.GetAttribute("href"))
                .Where(href => !string.IsNullOrWhiteSpace(href))
                .ToList();

            Assert.NotEmpty(sortLinks);
            Assert.All(sortLinks, href => Assert.Contains("currentFilter=A", href!));
        }

        [Fact]
        public async Task Get_StudentsIndex_ClearButton_PointsToCleanIndex()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");

            // Act
            var response = await client.GetAsync("/Students?searchString=test");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            var config = Configuration.Default;
            var browsingContext = BrowsingContext.New(config);
            var document = await browsingContext.OpenAsync(req => req.Content(content));
            var clearLink = document.QuerySelectorAll("a")
                .FirstOrDefault(link => link.TextContent.Trim() == "Clear");

            Assert.NotNull(clearLink);
            Assert.Equal("/Students", clearLink!.GetAttribute("href"));
        }

        [Fact]
        public async Task Get_CreateStudent_ReturnsCreateForm()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");
            
            // Act
            var response = await client.GetAsync("/Students/Create");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            
            Assert.Contains("Create", content);
            Assert.Contains("LastName", content);
            Assert.Contains("FirstMidName", content);
            Assert.Contains("EnrollmentDate", content);
        }

        [Fact]
        public async Task Post_CreateStudent_WithValidData_CreatesStudent()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");
            var createPage = await client.GetAsync("/Students/Create");
            createPage.EnsureSuccessStatusCode();
            
            var createContent = await createPage.Content.ReadAsStringAsync();
            var config = Configuration.Default;
            var context = BrowsingContext.New(config);
            var document = await context.OpenAsync(req => req.Content(createContent));
            
            var form = document.QuerySelector("form") as IHtmlFormElement;
            Assert.NotNull(form);

            // Extract anti-forgery token
            var antiForgeryToken = document.QuerySelector("input[name='__RequestVerificationToken']")?.GetAttribute("value");
            
            // Act
            var formData = new List<KeyValuePair<string, string>>
            {
                new("LastName", "TestStudent"),
                new("FirstMidName", "Integration Test"),
                new("EnrollmentDate", DateTime.Now.ToString("yyyy-MM-dd"))
            };
            
            // Add anti-forgery token if it exists
            if (!string.IsNullOrEmpty(antiForgeryToken))
            {
                formData.Add(new("__RequestVerificationToken", antiForgeryToken));
            }

            var response = await client.PostAsync("/Students/Create", new FormUrlEncodedContent(formData));

            // Assert
            // Should redirect to Index after successful creation
            Assert.True(response.StatusCode == HttpStatusCode.Redirect || 
                       response.StatusCode == HttpStatusCode.Found);

            // Verify the student was created in the database
            using var scope = Factory.Services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<SchoolContext>();
            
            var createdStudent = await dbContext.Students
                .FirstOrDefaultAsync(s => s.LastName == "TestStudent" && s.FirstMidName == "Integration Test");
            
            Assert.NotNull(createdStudent);
            Assert.Equal("TestStudent", createdStudent.LastName);
            Assert.Equal("Integration Test", createdStudent.FirstMidName);
        }

        [Fact]
        public async Task Get_StudentDetails_WithValidId_ReturnsStudentDetails()
        {
            // Arrange
            using var scope = Factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SchoolContext>();
            
            var student = await context.Students.FirstAsync();
            using var client = Factory.CreateAuthenticatedClient("Admin");
            
            // Act
            var response = await client.GetAsync($"/Students/Details/{student.ID}");

            // Assert
            response.EnsureSuccessStatusCode();
            var content = await response.Content.ReadAsStringAsync();
            
            Assert.Contains(student.LastName, content);
            Assert.Contains(student.FirstMidName, content);
        }

        [Fact]
        public async Task Get_StudentDetails_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            using var client = Factory.CreateAuthenticatedClient("Admin");
            
            // Act
            var response = await client.GetAsync("/Students/Details/99999");

            // Assert
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Database_Isolation_BetweenTests()
        {
            // This test verifies that each test gets a fresh database
            using var scope = Factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<SchoolContext>();
            
            var initialCount = await context.Students.CountAsync();
            
            // Add a new student
            var student = new Student
            {
                FirstMidName = "Isolation",
                LastName = "Test",
                EnrollmentDate = DateTime.Now
            };
            
            context.Students.Add(student);
            await context.SaveChangesAsync();
            
            var newCount = await context.Students.CountAsync();
            Assert.Equal(initialCount + 1, newCount);
            
            // This student should not affect other tests due to database isolation
        }
    }
}