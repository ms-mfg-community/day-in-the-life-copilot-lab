using ContosoUniversity.Core.Models;
using ContosoUniversity.Infrastructure.Data;

namespace ContosoUniversity.Tests.Infrastructure
{
    public static class TestDataSeeder
    {
        public static void SeedTestData(SchoolContext context)
        {
            if (context.Students.Any())
            {
                return; // Database has been seeded
            }

            // Seed Departments
            var departments = new[]
            {
                new Department
                {
                    Name = "Computer Science",
                    Budget = 100000,
                    StartDate = DateTime.Parse("2020-09-01"),
                    DepartmentType = "Engineering"
                },
                new Department
                {
                    Name = "Mathematics", 
                    Budget = 90000,
                    StartDate = DateTime.Parse("2020-09-01"),
                    DepartmentType = "Sciences"
                },
                new Department
                {
                    Name = "English",
                    Budget = 80000,
                    StartDate = DateTime.Parse("2020-09-01"), 
                    DepartmentType = "Liberal Arts"
                }
            };

            context.Departments.AddRange(departments);
            context.SaveChanges();

            // Seed Instructors
            var instructors = new[]
            {
                new Instructor
                {
                    FirstMidName = "Kim",
                    LastName = "Abercrombie",
                    HireDate = DateTime.Parse("2020-03-11")
                },
                new Instructor
                {
                    FirstMidName = "Fadi",
                    LastName = "Fakhouri", 
                    HireDate = DateTime.Parse("2020-07-06")
                },
                new Instructor
                {
                    FirstMidName = "Roger",
                    LastName = "Harui",
                    HireDate = DateTime.Parse("2020-07-01")
                }
            };

            context.Instructors.AddRange(instructors);
            context.SaveChanges();

            // Assign instructors to departments
            departments[0].InstructorID = instructors[0].ID;
            departments[1].InstructorID = instructors[1].ID;
            departments[2].InstructorID = instructors[2].ID;
            context.SaveChanges();

            // Seed Courses
            var courses = new[]
            {
                new Course
                {
                    CourseID = 1050,
                    Title = "Chemistry",
                    Credits = 3,
                    DepartmentID = departments[0].DepartmentID
                },
                new Course
                {
                    CourseID = 4022,
                    Title = "Microeconomics",
                    Credits = 3,
                    DepartmentID = departments[1].DepartmentID
                },
                new Course
                {
                    CourseID = 4041,
                    Title = "Macroeconomics", 
                    Credits = 3,
                    DepartmentID = departments[1].DepartmentID
                },
                new Course
                {
                    CourseID = 1045,
                    Title = "Calculus",
                    Credits = 4,
                    DepartmentID = departments[1].DepartmentID
                },
                new Course
                {
                    CourseID = 3141,
                    Title = "Trigonometry",
                    Credits = 4,
                    DepartmentID = departments[1].DepartmentID
                },
                new Course
                {
                    CourseID = 2021,
                    Title = "Composition",
                    Credits = 3,
                    DepartmentID = departments[2].DepartmentID
                },
                new Course
                {
                    CourseID = 2042,
                    Title = "Literature",
                    Credits = 4,
                    DepartmentID = departments[2].DepartmentID
                }
            };

            context.Courses.AddRange(courses);
            context.SaveChanges();

            // Seed Students
            var students = new[]
            {
                new Student
                {
                    FirstMidName = "Carson",
                    LastName = "Alexander",
                    EnrollmentDate = DateTime.Parse("2010-09-01")
                },
                new Student
                {
                    FirstMidName = "Meredith", 
                    LastName = "Alonso",
                    EnrollmentDate = DateTime.Parse("2012-09-01")
                },
                new Student
                {
                    FirstMidName = "Arturo",
                    LastName = "Anand",
                    EnrollmentDate = DateTime.Parse("2013-09-01")
                },
                new Student
                {
                    FirstMidName = "Gytis",
                    LastName = "Barzdukas",
                    EnrollmentDate = DateTime.Parse("2012-09-01")
                },
                new Student
                {
                    FirstMidName = "Yan",
                    LastName = "Li",
                    EnrollmentDate = DateTime.Parse("2012-09-01")
                }
            };

            context.Students.AddRange(students);
            context.SaveChanges();

            // Seed Enrollments
            var enrollments = new[]
            {
                new Enrollment
                {
                    StudentID = students[0].ID,
                    CourseID = 1050,
                    Grade = Grade.A
                },
                new Enrollment
                {
                    StudentID = students[0].ID,
                    CourseID = 4022,
                    Grade = Grade.C
                },
                new Enrollment
                {
                    StudentID = students[0].ID,
                    CourseID = 4041,
                    Grade = Grade.B
                },
                new Enrollment
                {
                    StudentID = students[1].ID,
                    CourseID = 1045,
                    Grade = Grade.B
                },
                new Enrollment
                {
                    StudentID = students[1].ID,
                    CourseID = 3141,
                    Grade = Grade.F
                },
                new Enrollment
                {
                    StudentID = students[1].ID,
                    CourseID = 2021,
                    Grade = Grade.F
                },
                new Enrollment
                {
                    StudentID = students[2].ID,
                    CourseID = 1050
                },
                new Enrollment
                {
                    StudentID = students[3].ID,
                    CourseID = 1050
                },
                new Enrollment
                {
                    StudentID = students[3].ID,
                    CourseID = 4022,
                    Grade = Grade.F
                },
                new Enrollment
                {
                    StudentID = students[4].ID,
                    CourseID = 4041,
                    Grade = Grade.C
                }
            };

            context.Enrollments.AddRange(enrollments);
            context.SaveChanges();
        }
    }
}