using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Web;
using ContosoUniversity.Web.Extensions;

namespace ContosoUniversity.Web.Controllers
{
    public class AccountController : Controller
    {
        private readonly ILogger<AccountController> _logger;
        private readonly bool _isDevelopment;

        public AccountController(
            ILogger<AccountController> logger,
            IWebHostEnvironment environment)
        {
            _logger = logger;
            _isDevelopment = environment.IsDevelopment();
        }

        [AllowAnonymous]
        public async Task<IActionResult> SignIn()
        {
            // For local development, we'll automatically sign in
            // with a default admin account
            if (_isDevelopment)
            {
                return await LocalSignInAsync();
            }

            var redirectUrl = Url.Action("Index", "Home");
            return Challenge(
                new AuthenticationProperties { RedirectUri = redirectUrl },
                OpenIdConnectDefaults.AuthenticationScheme);
        }

        [Authorize]
        public async Task<IActionResult> SignOut()
        {
            // For local development, sign out of cookie auth
            if (_isDevelopment)
            {
                await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
                return RedirectToAction("Index", "Home");
            }
            
            var callbackUrl = Url.Action("SignedOut", "Account", values: null, protocol: Request.Scheme);
            
            return SignOut(
                new AuthenticationProperties { RedirectUri = callbackUrl },
                CookieAuthenticationDefaults.AuthenticationScheme,
                OpenIdConnectDefaults.AuthenticationScheme);
        }

        [AllowAnonymous]
        public IActionResult SignedOut()
        {
            if (User.Identity.IsAuthenticated)
            {
                // Redirect to home page if the user is authenticated.
                return RedirectToAction("Index", "Home");
            }

            return View();
        }

        [AllowAnonymous]
        public IActionResult AccessDenied()
        {
            return View();
        }
        
        // Method for local development authentication
        private async Task<IActionResult> LocalSignInAsync()
        {
            // Create claims for a test admin user
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, "Test Admin"),
                new Claim(ClaimTypes.NameIdentifier, "local-admin"),
                new Claim(ClaimTypes.Email, "admin@contosouniversity.local"),
                new Claim(ClaimTypes.Role, "Admin"),
                new Claim(ClaimTypes.Role, "Teacher"),
                new Claim(ClaimTypes.Role, "Administrator")
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            // Sign in with the test account
            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal,
                new AuthenticationProperties 
                { 
                    IsPersistent = true,
                    ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8)
                });

            _logger.LogInformation("Local development: Signed in as Test Admin with roles: {Roles}", 
                string.Join(", ", claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value)));
            
            // Redirect to the homepage
            return RedirectToAction("Index", "Home");
        }
    }
}

