using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Authorization;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Web.Models.SchoolViewModels;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    public class InstructorsController : BaseController
    {
        private readonly IRepository<Instructor> _instructorRepository;
        private readonly IRepository<Course> _courseRepository;
        private readonly IRepository<Department> _departmentRepository;
        private readonly new ILogger<InstructorsController> _logger;

        public InstructorsController(
            IRepository<Instructor> instructorRepository,
            IRepository<Course> courseRepository,
            IRepository<Department> departmentRepository,
            INotificationService notificationService,
            ILogger<InstructorsController> logger) : base(notificationService, logger)
        {
            _instructorRepository = instructorRepository;
            _courseRepository = courseRepository;
            _departmentRepository = departmentRepository;
            _logger = logger;
        }

        // GET: Instructors
        public async Task<IActionResult> Index(int? id, int? courseID)
        {
            var viewModel = new InstructorIndexData();
            
            var instructors = await _instructorRepository.GetAllAsync();
            
            // Since we can't use Include with IEnumerable, we need to manually filter and order
            viewModel.Instructors = instructors
                .OrderBy(i => i.LastName)
                .ToList();

            if (id != null)
            {
                ViewData["InstructorID"] = id.Value;
                var instructor = viewModel.Instructors.Where(i => i.ID == id.Value).Single();
                viewModel.Courses = instructor.CourseAssignments.Select(s => s.Course);
            }

            if (courseID != null)
            {
                ViewData["CourseID"] = courseID.Value;
                viewModel.Enrollments = viewModel.Courses
                    .Where(x => x.CourseID == courseID)
                    .Single()
                    .Enrollments;
            }

            return View(viewModel);
        }

        // GET: Instructors/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var instructor = await _instructorRepository.GetByIdAsync(id.Value);
            if (instructor == null)
            {
                return NotFound();
            }

            return View(instructor);
        }

        // GET: Instructors/Create
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create()
        {
            var instructor = new Instructor();
            instructor.CourseAssignments = new List<CourseAssignment>();
            await PopulateAssignedCourseDataAsync(instructor);
            return View(instructor);
        }

        // POST: Instructors/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([Bind("LastName,FirstMidName,HireDate,OfficeAssignment")] Instructor instructor, string[] selectedCourses)
        {
            try
            {
                if (selectedCourses != null)
                {
                    instructor.CourseAssignments = new List<CourseAssignment>();
                    foreach (var course in selectedCourses)
                    {
                        var courseToAdd = new CourseAssignment { InstructorID = instructor.ID, CourseID = int.Parse(course) };
                        instructor.CourseAssignments.Add(courseToAdd);
                    }
                }

                if (ModelState.IsValid)
                {
                    await _instructorRepository.AddAsync(instructor);
                    await _instructorRepository.SaveChangesAsync();
                    
                    // Send notification for instructor creation
                    await SendEntityNotificationAsync("Instructor", instructor.ID.ToString(), instructor.FullName, EntityOperation.Create);
                    
                    return RedirectToAction(nameof(Index));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating instructor: {FirstName} {LastName}", instructor.FirstMidName, instructor.LastName);
                ModelState.AddModelError("", "Unable to create instructor. Try again, and if the problem persists, see your system administrator.");
            }

            await PopulateAssignedCourseDataAsync(instructor);
            return View(instructor);
        }

        // GET: Instructors/Edit/5
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var instructor = await _instructorRepository.GetByIdAsync(id.Value);
            
            if (instructor == null)
            {
                return NotFound();
            }

            await PopulateAssignedCourseDataAsync(instructor);
            return View(instructor);
        }

        // POST: Instructors/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(int? id, string[] selectedCourses)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var instructorToUpdate = await _instructorRepository.GetByIdAsync(id.Value);
            
            if (instructorToUpdate == null)
            {
                return NotFound();
            }

            if (await TryUpdateModelAsync(instructorToUpdate, "",
                i => i.FirstMidName, i => i.LastName, i => i.HireDate, i => i.OfficeAssignment))
            {
                try
                {
                    if (String.IsNullOrWhiteSpace(instructorToUpdate.OfficeAssignment?.Location))
                    {
                        instructorToUpdate.OfficeAssignment = null;
                    }

                    await UpdateInstructorCoursesAsync(selectedCourses, instructorToUpdate);
                    await _instructorRepository.SaveChangesAsync();
                    
                    // Send notification for instructor update
                    await SendEntityNotificationAsync("Instructor", instructorToUpdate.ID.ToString(), instructorToUpdate.FullName, EntityOperation.Update);

                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating instructor: {ID} - {FirstName} {LastName}", 
                        instructorToUpdate.ID, instructorToUpdate.FirstMidName, instructorToUpdate.LastName);
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, see your system administrator.");
                }
            }

            await PopulateAssignedCourseDataAsync(instructorToUpdate);
            return View(instructorToUpdate);
        }

        // GET: Instructors/Delete/5
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var instructor = await _instructorRepository.GetByIdAsync(id.Value);
            if (instructor == null)
            {
                return NotFound();
            }

            return View(instructor);
        }

        // POST: Instructors/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            try
            {
                var instructor = await _instructorRepository.GetByIdAsync(id);

                if (instructor == null)
                {
                    return NotFound();
                }

                // Update any departments where this instructor is set as administrator
                var departments = await _departmentRepository.GetAllAsync();
                var departmentsWithInstructor = departments.Where(d => d.InstructorID == id).ToList();

                foreach (var department in departments)
                {
                    department.InstructorID = null;
                    await _departmentRepository.UpdateAsync(department);
                }

                await _instructorRepository.DeleteAsync(instructor);
                await _instructorRepository.SaveChangesAsync();
                
                // Send notification for instructor deletion
                await SendEntityNotificationAsync("Instructor", id.ToString(), instructor.FullName, EntityOperation.Delete);
                
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting instructor: {ID}", id);
                TempData["ErrorMessage"] = "Unable to delete instructor. Try again, and if the problem persists, see your system administrator.";
                return RedirectToAction(nameof(Index));
            }
        }

        private async Task PopulateAssignedCourseDataAsync(Instructor instructor)
        {
            var allCourses = await _courseRepository.GetAllAsync();
            var instructorCourses = new HashSet<int>(instructor.CourseAssignments.Select(c => c.CourseID));
            var viewModel = new List<AssignedCourseData>();
            
            foreach (var course in allCourses)
            {
                viewModel.Add(new AssignedCourseData
                {
                    CourseID = course.CourseID,
                    Title = course.Title,
                    Assigned = instructorCourses.Contains(course.CourseID)
                });
            }
            
            ViewData["Courses"] = viewModel;
        }

        private async Task UpdateInstructorCoursesAsync(string[] selectedCourses, Instructor instructorToUpdate)
        {
            if (selectedCourses == null)
            {
                instructorToUpdate.CourseAssignments = new List<CourseAssignment>();
                return;
            }

            var selectedCoursesHS = new HashSet<string>(selectedCourses);
            var instructorCourses = new HashSet<int>(instructorToUpdate.CourseAssignments.Select(c => c.CourseID));
            var allCourses = await _courseRepository.GetAllAsync();

            foreach (var course in allCourses)
            {
                if (selectedCoursesHS.Contains(course.CourseID.ToString()))
                {
                    if (!instructorCourses.Contains(course.CourseID))
                    {
                        instructorToUpdate.CourseAssignments.Add(new CourseAssignment 
                        { 
                            InstructorID = instructorToUpdate.ID, 
                            CourseID = course.CourseID 
                        });
                    }
                }
                else
                {
                    if (instructorCourses.Contains(course.CourseID))
                    {
                        var courseToRemove = instructorToUpdate.CourseAssignments
                            .FirstOrDefault(i => i.CourseID == course.CourseID);
                            
                        if (courseToRemove != null)
                        {
                            instructorToUpdate.CourseAssignments.Remove(courseToRemove);
                        }
                    }
                }
            }
        }
    }
}

