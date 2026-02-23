using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Authorization;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    public class DepartmentsController : BaseController
    {
        private readonly IRepository<Department> _departmentRepository;
        private readonly IRepository<Instructor> _instructorRepository;
        private readonly new ILogger<DepartmentsController> _logger;

        public DepartmentsController(
            IRepository<Department> departmentRepository,
            IRepository<Instructor> instructorRepository,
            INotificationService notificationService,
            ILogger<DepartmentsController> logger) : base(notificationService, logger)
        {
            _departmentRepository = departmentRepository;
            _instructorRepository = instructorRepository;
            _logger = logger;
        }

        // GET: Departments
        [Authorize(Policy = "ReadOnlyAccess")]
        public async Task<IActionResult> Index()
        {
            var departments = await _departmentRepository.GetAllAsync();
            return View(departments);
        }

        // GET: Departments/Details/5
        [Authorize(Policy = "ReadOnlyAccess")]
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var department = await _departmentRepository.GetByIdAsync(id.Value);
            if (department == null)
            {
                return NotFound();
            }

            return View(department);
        }

        // GET: Departments/Create
        [Authorize(Policy = "RequireAdministratorRole")]
        public async Task<IActionResult> Create()
        {
            var instructors = await _instructorRepository.GetAllAsync();
            ViewData["InstructorID"] = new SelectList(
                instructors, 
                "ID", 
                "FullName");
                
            return View();
        }

        // POST: Departments/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Policy = "RequireAdministratorRole")]
        public async Task<IActionResult> Create([Bind("Name,Budget,StartDate,InstructorID")] Department department)
        {
            if (ModelState.IsValid)
            {
                try
                {
                    await _departmentRepository.AddAsync(department);
                    await _departmentRepository.SaveChangesAsync();
                    
                    // Send notification for department creation
                    await SendEntityNotificationAsync("Department", department.DepartmentID.ToString(), department.Name, EntityOperation.Create);
                    
                    return RedirectToAction(nameof(Index));
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error creating department: {Name}", department.Name);
                    ModelState.AddModelError("", "Unable to create department. Try again, and if the problem persists, see your system administrator.");
                }
            }

            var instructors = await _instructorRepository.GetAllAsync();
            ViewData["InstructorID"] = new SelectList(
                instructors, 
                "ID", 
                "FullName", 
                department.InstructorID);
                
            return View(department);
        }

        // GET: Departments/Edit/5
        [Authorize(Policy = "RequireAdministratorRole")]
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var department = await _departmentRepository.GetByIdAsync(id.Value);
            if (department == null)
            {
                return NotFound();
            }

            var instructors = await _instructorRepository.GetAllAsync();
            ViewData["InstructorID"] = new SelectList(
                instructors, 
                "ID", 
                "FullName", 
                department.InstructorID);
                
            return View(department);
        }

        // POST: Departments/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        [Authorize(Policy = "RequireAdministratorRole")]
        public async Task<IActionResult> Edit(int id, [Bind("DepartmentID,Name,Budget,StartDate,InstructorID,RowVersion")] Department department)
        {
            if (id != department.DepartmentID)
            {
                return BadRequest();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    await _departmentRepository.UpdateAsync(department);
                    await _departmentRepository.SaveChangesAsync();
                    
                    // Send notification for department update
                    await SendEntityNotificationAsync("Department", department.DepartmentID.ToString(), department.Name, EntityOperation.Update);
                    
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateConcurrencyException)
                {
                    var departmentInDb = await _departmentRepository.GetByIdAsync(department.DepartmentID);
                    
                    if (departmentInDb == null)
                    {
                        ModelState.AddModelError(string.Empty, "Unable to save changes. The department was deleted by another user.");
                    }
                    else
                    {
                        // Add model errors for each field that has changed
                        if (departmentInDb.Name != department.Name)
                            ModelState.AddModelError("Name", $"Current value: {departmentInDb.Name}");
                            
                        if (departmentInDb.Budget != department.Budget)
                            ModelState.AddModelError("Budget", $"Current value: {departmentInDb.Budget:c}");
                            
                        if (departmentInDb.StartDate != department.StartDate)
                            ModelState.AddModelError("StartDate", $"Current value: {departmentInDb.StartDate:d}");
                            
                        if (departmentInDb.InstructorID != department.InstructorID)
                        {
                            var instructor = await _instructorRepository.GetByIdAsync(departmentInDb.InstructorID ?? 0);
                            ModelState.AddModelError("InstructorID", $"Current value: {instructor?.FullName}");
                        }
                        
                        ModelState.AddModelError(string.Empty, "The record you attempted to edit "
                            + "was modified by another user after you got the original value. The "
                            + "edit operation was canceled and the current values in the database "
                            + "have been displayed. If you still want to edit this record, click "
                            + "the Save button again. Otherwise click the Back to List hyperlink.");
                        
                        department.RowVersion = departmentInDb.RowVersion;
                    }
                    
                    _logger.LogWarning("Concurrency conflict occurred while editing department {ID}", department.DepartmentID);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error editing department: {ID} - {Name}", department.DepartmentID, department.Name);
                    ModelState.AddModelError("", "Unable to save changes. Try again, and if the problem persists, see your system administrator.");
                }
            }
            
            var instructors = await _instructorRepository.GetAllAsync();
            ViewData["InstructorID"] = new SelectList(
                instructors, 
                "ID", 
                "FullName", 
                department.InstructorID);
                
            return View(department);
        }

        // GET: Departments/Delete/5
        [Authorize(Policy = "RequireAdministratorRole")]
        public async Task<IActionResult> Delete(int? id)
        {
            if (id == null)
            {
                return BadRequest();
            }

            var department = await _departmentRepository.GetByIdAsync(id.Value);
            if (department == null)
            {
                return NotFound();
            }

            return View(department);
        }

        // POST: Departments/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        [Authorize(Policy = "RequireAdministratorRole")]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            try
            {
                var department = await _departmentRepository.GetByIdAsync(id);
                if (department == null)
                {
                    return NotFound();
                }

                var departmentName = department.Name;
                await _departmentRepository.DeleteAsync(department);
                await _departmentRepository.SaveChangesAsync();
                
                // Send notification for department deletion
                await SendEntityNotificationAsync("Department", id.ToString(), departmentName, EntityOperation.Delete);
                
                return RedirectToAction(nameof(Index));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting department: {ID}", id);
                TempData["ErrorMessage"] = "Unable to delete the department. Try again, and if the problem persists, see your system administrator.";
                return RedirectToAction(nameof(Index));
            }
        }
    }
}
