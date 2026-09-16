using ContosoUniversity.Core.Interfaces;
using ContosoUniversity.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using ContosoUniversity.Web.Models;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    public class HomeController : BaseController
    {
        private readonly SchoolContext _context;

        public HomeController(
            SchoolContext context, 
            INotificationService notificationService,
            ILogger<HomeController> logger) : base(notificationService, logger)
        {
            _context = context;
        }

        public async Task<IActionResult> Index()
        {
            return View();
        }

        public async Task<IActionResult> About()
        {
            var data = await _context.Students
                .GroupBy(s => s.EnrollmentDate)
                .Select(g => new EnrollmentDateGroup
                {
                    EnrollmentDate = g.Key,
                    StudentCount = g.Count()
                })
                .OrderBy(x => x.EnrollmentDate)
                .ToListAsync();

            return View(data);
        }

        [AllowAnonymous]
        public IActionResult Privacy()
        {
            return View();
        }

        // Debug action to check current user claims
        public IActionResult Debug()
        {
            var claims = User.Claims.Select(c => new { c.Type, c.Value }).ToList();
            var isAuthenticated = User.Identity?.IsAuthenticated ?? false;
            var name = User.Identity?.Name ?? "Not Set";
            var roles = User.Claims.Where(c => c.Type == System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
            
            ViewBag.IsAuthenticated = isAuthenticated;
            ViewBag.Name = name;
            ViewBag.Claims = claims;
            ViewBag.Roles = roles;
            
            return View();
        }

        [AllowAnonymous]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = HttpContext.TraceIdentifier });
        }
    }
}

