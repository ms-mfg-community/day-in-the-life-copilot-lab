using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Web.Models;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    public class CoursesController : BaseController
    {
        private readonly IRepository<Course> _courseRepository;
        private readonly IRepository<Department> _departmentRepository;
        private readonly IFileStorageService _fileStorageService;
        private readonly IWebHostEnvironment _webHostEnvironment;
        private readonly new ILogger<CoursesController> _logger;  // Using 'new' to avoid warning about hiding the base class field

        public CoursesController(
            IRepository<Course> courseRepository,
            IRepository<Department> departmentRepository,
            INotificationService notificationService,
            IFileStorageService fileStorageService,
            IWebHostEnvironment webHostEnvironment,
            ILogger<CoursesController> logger) : base(notificationService, logger)
        {
            _courseRepository = courseRepository;
            _departmentRepository = departmentRepository;
            _fileStorageService = fileStorageService;
            _webHostEnvironment = webHostEnvironment;
            _logger = logger;
        }

        // GET: Courses
        public async Task<IActionResult> Index()
        {
            var courses = await _courseRepository.GetAllAsync();
            return View(courses);
        }

        // GET: Courses/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var courses = await _courseRepository.GetAllAsync();
            var course = courses.FirstOrDefault(c => c.CourseID == id);

            if (course == null)
            {
                return NotFound();
            }

            return View(course);
        }

        // GET: Courses/Create
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create()
        {
            var departments = await _departmentRepository.GetAllAsync();
            ViewData["DepartmentID"] = new SelectList(departments, "DepartmentID", "Name");
            return View(new CourseViewModel());
        }

        // POST: Courses/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create(CourseViewModel viewModel)
        {
            _logger.LogInformation("POST Create called with CourseID: {CourseID}, Title: {Title}", viewModel?.CourseID, viewModel?.Title);
            
            if (ModelState.IsValid)
            {
                try
                {
                    var course = new Course
                    {
                        CourseID = viewModel.CourseID,
                        Title = viewModel.Title,
                        Credits = viewModel.Credits,
                        DepartmentID = viewModel.DepartmentID
                    };

                    // Handle file upload if an image is provided
                    if (viewModel.TeachingMaterialImage != null && viewModel.TeachingMaterialImage.Length > 0)
                    {
                        var uploadResult = await Utilities.FileUploadUtility.UploadTeachingMaterialAsync(
                            viewModel.TeachingMaterialImage,
                            course.CourseID,
                            _fileStorageService,
                            _logger);
                            
                        if (!uploadResult.Success)
                        {
                            ModelState.AddModelError("TeachingMaterialImage", uploadResult.ErrorMessage ?? "Error uploading file");
                            var departments = await _departmentRepository.GetAllAsync();
                            ViewData["DepartmentID"] = new SelectList(departments, "DepartmentID", "Name", viewModel.DepartmentID);
                            return View(viewModel);
                        }
                        
                        course.TeachingMaterialImagePath = uploadResult.Url;
                    }

                    await _courseRepository.AddAsync(course);
                    await _courseRepository.SaveChangesAsync();
                    
                    // Send notification for course creation
                    await SendEntityNotificationAsync("Course", course.CourseID.ToString(), course.Title, EntityOperation.Create);
                    
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating course: {Title}", viewModel.Title);
                    ModelState.AddModelError("", "Unable to create course. Try again, and if the problem persists, see your system administrator.");
                }
            }

            var depts = await _departmentRepository.GetAllAsync();
            ViewData["DepartmentID"] = new SelectList(depts, "DepartmentID", "Name", viewModel.DepartmentID);
            return View(viewModel);
        }

        // GET: Courses/Edit/5
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var course = await _courseRepository.GetByIdAsync(id.Value);
            if (course == null)
            {
                return NotFound();
            }

            var viewModel = new CourseViewModel
            {
                CourseID = course.CourseID,
                Title = course.Title,
                Credits = course.Credits,
                DepartmentID = course.DepartmentID,
                TeachingMaterialImagePath = course.TeachingMaterialImagePath ?? string.Empty
            };

            var departments = await _departmentRepository.GetAllAsync();
            ViewData["DepartmentID"] = new SelectList(departments, "DepartmentID", "Name", course.DepartmentID);
            return View(viewModel);
        }

        // POST: Courses/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Edit(int id, CourseViewModel viewModel)
        {
            _logger.LogInformation("POST Edit called with ID: {ID}, CourseID: {CourseID}, Title: {Title}", id, viewModel?.CourseID, viewModel?.Title);
            
            if (id != viewModel.CourseID)
            {
                return BadRequest();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    var course = await _courseRepository.GetByIdAsync(id);
                    if (course == null)
                    {
                        return NotFound();
                    }

                    course.Title = viewModel.Title;
                    course.Credits = viewModel.Credits;
                    course.DepartmentID = viewModel.DepartmentID;
                    
                    // Handle file upload if a new image is provided
                    if (viewModel.TeachingMaterialImage != null && viewModel.TeachingMaterialImage.Length > 0)
                    {
                        // Delete old file if exists
                        if (!string.IsNullOrEmpty(course.TeachingMaterialImagePath))
                        {
                            await Utilities.FileUploadUtility.DeleteTeachingMaterialAsync(
                                course.TeachingMaterialImagePath,
                                _fileStorageService,
                                _logger);
                        }

                        var uploadResult = await Utilities.FileUploadUtility.UploadTeachingMaterialAsync(
                            viewModel.TeachingMaterialImage,
                            course.CourseID,
                            _fileStorageService,
                            _logger);
                            
                        if (!uploadResult.Success)
                        {
                            ModelState.AddModelError("TeachingMaterialImage", uploadResult.ErrorMessage ?? "Error uploading file");
                            var departments = await _departmentRepository.GetAllAsync();
                            ViewData["DepartmentID"] = new SelectList(departments, "DepartmentID", "Name", viewModel.DepartmentID);
                            return View(viewModel);
                        }
                        
                        course.TeachingMaterialImagePath = uploadResult.Url;
                    }

                    await _courseRepository.UpdateAsync(course);
                    await _courseRepository.SaveChangesAsync();
                    
                    // Send notification for course update
                    await SendEntityNotificationAsync("Course", course.CourseID.ToString(), course.Title, EntityOperation.Update);
                    
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!await CourseExists(viewModel.CourseID))
                    {
                        return NotFound();
                    }
                    else
                    {
                        throw;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error updating course: {ID} - {Title}", viewModel.CourseID, viewModel.Title);
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, see your system administrator.");
                }
            }

            var depts = await _departmentRepository.GetAllAsync();
            ViewData["DepartmentID"] = new SelectList(depts, "DepartmentID", "Name", viewModel.DepartmentID);
            return View(viewModel);
        }

        // GET: Courses/Delete/5
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var courses = await _courseRepository.GetAllAsync();
            var course = courses.FirstOrDefault(c => c.CourseID == id);
                
            if (course == null)
            {
                return NotFound();
            }

            return View(course);
        }

        // POST: Courses/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var course = await _courseRepository.GetByIdAsync(id);
            if (course == null)
            {
                return NotFound();
            }

            var courseTitle = course.Title;
            
            // Delete associated image file if it exists
            if (!string.IsNullOrEmpty(course.TeachingMaterialImagePath))
            {
                try
                {
                    await Utilities.FileUploadUtility.DeleteTeachingMaterialAsync(
                        course.TeachingMaterialImagePath,
                        _fileStorageService,
                        _logger);
                }
                catch (Exception ex)
                {
                    // Log the error but don't prevent deletion of the course
                    _logger.LogWarning(ex, "Error deleting file for course {ID}: {Message}", id, ex.Message);
                }
            }
            
            await _courseRepository.DeleteAsync(course);
            await _courseRepository.SaveChangesAsync();
            
            // Send notification for course deletion
            await SendEntityNotificationAsync("Course", id.ToString(), courseTitle, EntityOperation.Delete);
            
            return RedirectToAction(nameof(Index));
        }

        private async Task<bool> CourseExists(int id)
        {
            var courses = await _courseRepository.GetAllAsync();
            return courses.Any(e => e.CourseID == id);
        }
    }
}
