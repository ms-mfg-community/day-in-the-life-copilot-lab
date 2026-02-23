using System.Security.Claims;

namespace ContosoUniversity.Web.Services
{
    public interface IUserService
    {
        ClaimsPrincipal GetCurrentUser();
        bool IsUserAuthenticated();
    }

    // A simple implementation for local development only
    public class LocalUserService : IUserService
    {
        public ClaimsPrincipal GetCurrentUser()
        {
            // Create claims for a test admin user
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, "Test Admin"),
                new Claim(ClaimTypes.NameIdentifier, "local-admin"),
                new Claim(ClaimTypes.Email, "admin@contosouniversity.local"),
                new Claim(ClaimTypes.Role, "Administrator")
            };

            var identity = new ClaimsIdentity(claims, "LocalAuth");
            return new ClaimsPrincipal(identity);
        }

        public bool IsUserAuthenticated()
        {
            // For local development, always return true
            return true;
        }
    }
}
