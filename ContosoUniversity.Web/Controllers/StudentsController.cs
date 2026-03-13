using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Web.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Logging;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    public class StudentsController : BaseController
    {
        private readonly IRepository<Student> _studentRepository;
        private readonly IStudentQueryService _studentQueryService;
        private readonly new ILogger<StudentsController> _logger;

        public StudentsController(
            IRepository<Student> studentRepository,
            IStudentQueryService studentQueryService,
            INotificationService notificationService,
            ILogger<StudentsController> logger) : base(notificationService, logger)
        {
            _studentRepository = studentRepository;
            _studentQueryService = studentQueryService;
            _logger = logger;
        }

        // GET: Students
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> Index(
            string? sortOrder,
            string? currentFilter,
            string? searchString,
            int? pageNumber,
            DateTime? enrollmentDateFrom,
            DateTime? enrollmentDateTo)
        {
            if (searchString != null)
            {
                pageNumber = 1;
            }
            else
            {
                searchString = currentFilter;
            }

            var criteria = new StudentSearchCriteria
            {
                SearchText = searchString,
                EnrollmentDateFrom = enrollmentDateFrom,
                EnrollmentDateTo = enrollmentDateTo,
                SortOption = sortOrder switch
                {
                    "name_desc" => StudentSortOption.LastNameDesc,
                    "Date" => StudentSortOption.EnrollmentDateAsc,
                    "date_desc" => StudentSortOption.EnrollmentDateDesc,
                    _ => StudentSortOption.LastNameAsc,
                },
                PageNumber = pageNumber ?? 1,
                PageSize = 10,
            };

            var result = await _studentQueryService.SearchStudentsAsync(criteria);

            var viewModel = new StudentIndexViewModel
            {
                Students = result.Items,
                CurrentSort = sortOrder,
                SearchText = searchString,
                EnrollmentDateFrom = enrollmentDateFrom,
                EnrollmentDateTo = enrollmentDateTo,
                NameSortParm = string.IsNullOrEmpty(sortOrder) ? "name_desc" : string.Empty,
                DateSortParm = sortOrder == "Date" ? "date_desc" : "Date",
                PageNumber = result.PageNumber,
                TotalPages = result.TotalPages,
                HasPreviousPage = result.HasPreviousPage,
                HasNextPage = result.HasNextPage,
            };

            return View(viewModel);
        }

        // GET: Students/Details/5
        [Authorize(Roles = "Admin,Teacher")]
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            // For now, we'll use GetByIdAsync for the student and handle enrollments separately
            // In a real application, we would modify the repository to support eager loading
            var student = await _studentRepository.GetByIdAsync(id.Value);
            if (student == null)
            {
                return NotFound();
            }

            return View(student);
        }

        // GET: Students/Create
        [Authorize(Roles = "Admin")]
        public IActionResult Create()
        {
            var student = new Student
            {
                EnrollmentDate = DateTime.Today // Set default to today's date
            };
            return View(student);
        }

        // POST: Students/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([Bind("LastName,FirstMidName,EnrollmentDate")] Student student)
        {
            try
            {
                // Validate EnrollmentDate is not default/minimum value
                if (student.EnrollmentDate == DateTime.MinValue || student.EnrollmentDate == default)
                {
                    ModelState.AddModelError("EnrollmentDate", "Please enter a valid enrollment date.");
                }

                // Ensure EnrollmentDate is within valid SQL Server datetime range
                if (student.EnrollmentDate < new DateTime(1753, 1, 1) || student.EnrollmentDate > new DateTime(9999, 12, 31))
                {
                    ModelState.AddModelError("EnrollmentDate", "Enrollment date must be between 1753 and 9999.");
                }

                if (ModelState.IsValid)
                {
                    await _studentRepository.AddAsync(student);
                    await _studentRepository.SaveChangesAsync();
                    
                    // Send notification for student creation
                    var studentName = $"{student.FirstMidName} {student.LastName}";
                    await SendEntityNotificationAsync("Student", student.ID.ToString(), studentName, EntityOperation.Create);
                    
                    return RedirectToAction(nameof(Index));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating student: {Message} | Student: {FirstName} {LastName} | EnrollmentDate: {EnrollmentDate}",
                    ex.Message, student?.FirstMidName, student?.LastName, student?.EnrollmentDate);
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists see your system administrator.");
            }
            return View(student);
        }

        // GET: Students/Edit/5
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var student = await _studentRepository.GetByIdAsync(id.Value);
            if (student == null)
            {
                return NotFound();
            }
            return View(student);
        }

        // POST: Students/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(int id, [Bind("ID,LastName,FirstMidName,EnrollmentDate")] Student student)
        {
            if (id != student.ID)
            {
                return BadRequest();
            }

            try
            {
                // Validate EnrollmentDate is not default/minimum value
                if (student.EnrollmentDate == DateTime.MinValue || student.EnrollmentDate == default)
                {
                    ModelState.AddModelError("EnrollmentDate", "Please enter a valid enrollment date.");
                }

                // Ensure EnrollmentDate is within valid SQL Server datetime range
                if (student.EnrollmentDate < new DateTime(1753, 1, 1) || student.EnrollmentDate > new DateTime(9999, 12, 31))
                {
                    ModelState.AddModelError("EnrollmentDate", "Enrollment date must be between 1753 and 9999.");
                }

                if (ModelState.IsValid)
                {
                    try
                    {
                        await _studentRepository.UpdateAsync(student);
                        await _studentRepository.SaveChangesAsync();
                        
                        // Send notification for student update
                        var studentName = $"{student.FirstMidName} {student.LastName}";
                        await SendEntityNotificationAsync("Student", student.ID.ToString(), studentName, EntityOperation.Update);
                    }
                    catch (DbUpdateConcurrencyException)
                    {
                        if (!await StudentExists(student.ID))
                        {
                            return NotFound();
                        }
                        else
                        {
                            throw;
                        }
                    }
                    return RedirectToAction(nameof(Index));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing student: {Message} | Student ID: {ID} | Student: {FirstName} {LastName} | EnrollmentDate: {EnrollmentDate}",
                    ex.Message, student?.ID, student?.FirstMidName, student?.LastName, student?.EnrollmentDate);
                ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists see your system administrator.");
            }
            return View(student);
        }

        // GET: Students/Delete/5
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var student = await _studentRepository.GetByIdAsync(id.Value);
            if (student == null)
            {
                return NotFound();
            }

            return View(student);
        }

        // POST: Students/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            try
            {
                var student = await _studentRepository.GetByIdAsync(id);
                if (student == null)
                {
                    return NotFound();
                }

                var studentName = $"{student.FirstMidName} {student.LastName}";
                await _studentRepository.DeleteAsync(student);
                await _studentRepository.SaveChangesAsync();
                
                // Send notification for student deletion
                await SendEntityNotificationAsync("Student", id.ToString(), studentName, EntityOperation.Delete);
                
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting student: {Message} | Student ID: {ID}", ex.Message, id);
                TempData["ErrorMessage"] = "Unable to delete the student. Try again, and if the problem persists see your system administrator.";
                return RedirectToAction(nameof(Index));
            }
        }

        private async Task<bool> StudentExists(int id)
        {
            var students = await _studentRepository.GetAllAsync();
            return students.Any(e => e.ID == id);
        }
    }
}
