using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Core.Models;
using ContosoUniversity.Web.Controllers;

namespace ContosoUniversity.Tests.Controllers
{
    public class DepartmentsControllerTests
    {
        private readonly Mock<IRepository<Department>> _mockDepartmentRepository;
        private readonly Mock<IRepository<Instructor>> _mockInstructorRepository;
        private readonly Mock<INotificationService> _mockNotificationService;
        private readonly Mock<ILogger<DepartmentsController>> _mockLogger;
        private readonly DepartmentsController _controller;

        public DepartmentsControllerTests()
        {
            _mockDepartmentRepository = new Mock<IRepository<Department>>();
            _mockInstructorRepository = new Mock<IRepository<Instructor>>();
            _mockNotificationService = new Mock<INotificationService>();
            _mockLogger = new Mock<ILogger<DepartmentsController>>();

            _controller = new DepartmentsController(
                _mockDepartmentRepository.Object,
                _mockInstructorRepository.Object,
                _mockNotificationService.Object,
                _mockLogger.Object);
        }

        [Fact]
        public async Task Index_ReturnsViewWithDepartments()
        {
            // Arrange
            var departments = new List<Department>
            {
                new Department { DepartmentID = 1, Name = "Computer Science", Budget = 100000, StartDate = DateTime.Parse("2020-09-01") },
                new Department { DepartmentID = 2, Name = "Mathematics", Budget = 90000, StartDate = DateTime.Parse("2020-09-01") }
            };

            _mockDepartmentRepository.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(departments);

            // Act
            var result = await _controller.Index();

            // Assert
            var viewResult = Assert.IsType<ViewResult>(result);
            var model = Assert.IsAssignableFrom<List<Department>>(viewResult.Model);
            Assert.Equal(2, model.Count);
        }

        [Fact]
        public async Task Details_WithNullId_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.Details(null);

            // Assert
            Assert.IsType<BadRequestResult>(result);
        }

        [Fact]
        public async Task Details_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            _mockDepartmentRepository.Setup(repo => repo.GetByIdAsync(It.IsAny<int>()))
                .ReturnsAsync((Department?)null);

            // Act
            var result = await _controller.Details(1);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task Details_WithValidId_ReturnsViewWithDepartment()
        {
            // Arrange
            var department = new Department 
            { 
                DepartmentID = 1, 
                Name = "Computer Science", 
                Budget = 100000, 
                StartDate = DateTime.Parse("2020-09-01"),
                Courses = new List<Course>()
            };

            _mockDepartmentRepository.Setup(repo => repo.GetByIdAsync(1))
                .ReturnsAsync(department);

            // Act
            var result = await _controller.Details(1);

            // Assert
            var viewResult = Assert.IsType<ViewResult>(result);
            var model = Assert.IsAssignableFrom<Department>(viewResult.Model);
            Assert.Equal(1, model.DepartmentID);
            Assert.Equal("Computer Science", model.Name);
        }

        [Fact]
        public async Task Create_Get_ReturnsViewWithInstructorSelectList()
        {
            // Arrange
            var instructors = new List<Instructor>
            {
                new Instructor { ID = 1, FirstMidName = "John", LastName = "Smith" },
                new Instructor { ID = 2, FirstMidName = "Jane", LastName = "Doe" }
            };

            _mockInstructorRepository.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(instructors);

            // Act
            var result = await _controller.Create();

            // Assert
            var viewResult = Assert.IsType<ViewResult>(result);
            Assert.NotNull(viewResult.ViewData["InstructorID"]);
            var selectList = Assert.IsType<SelectList>(viewResult.ViewData["InstructorID"]);
            Assert.Equal(2, selectList.Count());
        }

        [Fact]
        public async Task Create_Post_WithInvalidModel_ReturnsViewWithModel()
        {
            // Arrange
            var department = new Department
            {
                Name = "Test Department",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01")
            };

            var instructors = new List<Instructor>
            {
                new Instructor { ID = 1, FirstMidName = "John", LastName = "Smith" }
            }.AsQueryable();

            _mockInstructorRepository.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(instructors);

            _controller.ModelState.AddModelError("Error", "Model error");

            // Act
            var result = await _controller.Create(department);

            // Assert
            var viewResult = Assert.IsType<ViewResult>(result);
            var model = Assert.IsAssignableFrom<Department>(viewResult.Model);
            Assert.Equal(department, model);
            Assert.NotNull(viewResult.ViewData["InstructorID"]);
        }

        [Fact]
        public async Task Create_Post_WithValidModel_RedirectsToIndex()
        {
            // Arrange
            var department = new Department
            {
                Name = "Test Department",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01")
            };

            _mockDepartmentRepository.Setup(repo => repo.AddAsync(It.IsAny<Department>()))
                .ReturnsAsync(department);
            _mockDepartmentRepository.Setup(repo => repo.SaveChangesAsync())
                .Returns(Task.CompletedTask);

            // Act
            var result = await _controller.Create(department);

            // Assert
            var redirectResult = Assert.IsType<RedirectToActionResult>(result);
            Assert.Equal("Index", redirectResult.ActionName);
            _mockDepartmentRepository.Verify(repo => repo.AddAsync(It.IsAny<Department>()), Times.Once);
            _mockDepartmentRepository.Verify(repo => repo.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task Edit_Get_WithNullId_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.Edit(null);

            // Assert
            Assert.IsType<BadRequestResult>(result);
        }

        [Fact]
        public async Task Edit_Get_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            _mockDepartmentRepository.Setup(repo => repo.GetByIdAsync(It.IsAny<int>()))
                .ReturnsAsync((Department?)null);

            // Act
            var result = await _controller.Edit(1);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task Edit_Get_WithValidId_ReturnsViewWithDepartment()
        {
            // Arrange
            var department = new Department
            {
                DepartmentID = 1,
                Name = "Computer Science",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01"),
                InstructorID = 1
            };

            var instructors = new List<Instructor>
            {
                new Instructor { ID = 1, FirstMidName = "John", LastName = "Smith" }
            }.AsQueryable();

            _mockDepartmentRepository.Setup(repo => repo.GetByIdAsync(1))
                .ReturnsAsync(department);
            _mockInstructorRepository.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(instructors);

            // Act
            var result = await _controller.Edit(1);

            // Assert
            var viewResult = Assert.IsType<ViewResult>(result);
            var model = Assert.IsAssignableFrom<Department>(viewResult.Model);
            Assert.Equal(1, model.DepartmentID);
            Assert.NotNull(viewResult.ViewData["InstructorID"]);
        }

        [Fact]
        public async Task Edit_Post_WithInvalidModelState_ReturnsViewWithModel()
        {
            // Arrange
            var department = new Department
            {
                DepartmentID = 1,
                Name = "Computer Science",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01"),
                InstructorID = 1
            };

            var instructors = new List<Instructor>
            {
                new Instructor { ID = 1, FirstMidName = "John", LastName = "Smith" }
            }.AsQueryable();

            _mockInstructorRepository.Setup(repo => repo.GetAllAsync())
                .ReturnsAsync(instructors);

            _controller.ModelState.AddModelError("Error", "Model error");

            // Act
            var result = await _controller.Edit(1, department);

            // Assert
            var viewResult = Assert.IsType<ViewResult>(result);
            var model = Assert.IsAssignableFrom<Department>(viewResult.Model);
            Assert.Equal(department, model);
            Assert.NotNull(viewResult.ViewData["InstructorID"]);
        }

        [Fact]
        public async Task Edit_Post_WithIdMismatch_ReturnsBadRequest()
        {
            // Arrange
            var department = new Department
            {
                DepartmentID = 2,
                Name = "Computer Science",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01")
            };

            // Act
            var result = await _controller.Edit(1, department);

            // Assert
            Assert.IsType<BadRequestResult>(result);
        }

        [Fact]
        public async Task Edit_Post_WithValidModel_RedirectsToIndex()
        {
            // Arrange
            var department = new Department
            {
                DepartmentID = 1,
                Name = "Computer Science",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01")
            };

            _mockDepartmentRepository.Setup(repo => repo.UpdateAsync(It.IsAny<Department>()))
                .Returns(Task.CompletedTask);
            _mockDepartmentRepository.Setup(repo => repo.SaveChangesAsync())
                .Returns(Task.CompletedTask);

            // Act
            var result = await _controller.Edit(1, department);

            // Assert
            var redirectResult = Assert.IsType<RedirectToActionResult>(result);
            Assert.Equal("Index", redirectResult.ActionName);
            _mockDepartmentRepository.Verify(repo => repo.UpdateAsync(It.IsAny<Department>()), Times.Once);
            _mockDepartmentRepository.Verify(repo => repo.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task Delete_Get_WithNullId_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.Delete(null);

            // Assert
            Assert.IsType<BadRequestResult>(result);
        }

        [Fact]
        public async Task Delete_Get_WithInvalidId_ReturnsNotFound()
        {
            // Arrange
            _mockDepartmentRepository.Setup(repo => repo.GetByIdAsync(It.IsAny<int>()))
                .ReturnsAsync((Department?)null);

            // Act
            var result = await _controller.Delete(1);

            // Assert
            Assert.IsType<NotFoundResult>(result);
        }

        [Fact]
        public async Task Delete_Get_WithValidId_ReturnsViewWithDepartment()
        {
            // Arrange
            var department = new Department
            {
                DepartmentID = 1,
                Name = "Computer Science",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01")
            };

            _mockDepartmentRepository.Setup(repo => repo.GetByIdAsync(1))
                .ReturnsAsync(department);

            // Act
            var result = await _controller.Delete(1);

            // Assert
            var viewResult = Assert.IsType<ViewResult>(result);
            var model = Assert.IsAssignableFrom<Department>(viewResult.Model);
            Assert.Equal(1, model.DepartmentID);
        }

        [Fact]
        public async Task DeleteConfirmed_WithValidId_RedirectsToIndex()
        {
            // Arrange
            var department = new Department
            {
                DepartmentID = 1,
                Name = "Computer Science",
                Budget = 100000,
                StartDate = DateTime.Parse("2020-09-01")
            };

            _mockDepartmentRepository.Setup(repo => repo.GetByIdAsync(1))
                .ReturnsAsync(department);
            _mockDepartmentRepository.Setup(repo => repo.DeleteAsync(It.IsAny<Department>()))
                .Returns(Task.CompletedTask);
            _mockDepartmentRepository.Setup(repo => repo.SaveChangesAsync())
                .Returns(Task.CompletedTask);

            // Act
            var result = await _controller.DeleteConfirmed(1);

            // Assert
            var redirectResult = Assert.IsType<RedirectToActionResult>(result);
            Assert.Equal("Index", redirectResult.ActionName);
            _mockDepartmentRepository.Verify(repo => repo.DeleteAsync(It.IsAny<Department>()), Times.Once);
            _mockDepartmentRepository.Verify(repo => repo.SaveChangesAsync(), Times.Once);
        }
    }
}
