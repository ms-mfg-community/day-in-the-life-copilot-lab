using ContosoUniversity.Infrastructure;
using ContosoUniversity.Infrastructure.Data;
using ContosoUniversity.Web.Extensions;
using ContosoUniversity.Web.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
var initialScopes = builder.Configuration["DownstreamApi:Scopes"]?.Split(' ') ?? builder.Configuration["MicrosoftGraph:Scopes"]?.Split(' ');

// Configure authentication based on environment
if (builder.Environment.IsDevelopment())
{
    // Use cookie authentication for local development
    builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
        .AddCookie(options =>
        {
            options.Cookie.Name = "ContosoUniversity.Auth";
            options.LoginPath = "/Account/SignIn";
            options.LogoutPath = "/Account/SignOut";
            options.AccessDeniedPath = "/Account/AccessDenied";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
            options.ExpireTimeSpan = TimeSpan.FromHours(8);
            options.SlidingExpiration = true;
        });
    
    Console.WriteLine("Configured for local development with cookie authentication");
}
else
{
    // Add Microsoft Identity authentication for non-development environments
    builder.Services.AddAuthentication(OpenIdConnectDefaults.AuthenticationScheme)
        .AddMicrosoftIdentityWebApp(builder.Configuration.GetSection("AzureAd"))
        .EnableTokenAcquisitionToCallDownstreamApi(initialScopes)
        .AddInMemoryTokenCaches();
        
    // Note: AddMicrosoftGraph method is not available in the current version
    // For production, we would need to add the Microsoft.Identity.Web.MicrosoftGraph package
}

// Add database and repositories
builder.Services.AddInfrastructureServices(builder.Configuration);

// Add web-specific services
builder.Services.AddWebServices(builder.Configuration);

// Add controllers and views
builder.Services.AddControllersWithViews();

// Add Microsoft Identity UI (only in non-development environments)
if (!builder.Environment.IsDevelopment())
{
    builder.Services.AddControllersWithViews()
        .AddMicrosoftIdentityUI();
}

// Add authorization policies
builder.Services.AddAuthorizationPolicies();

// Add Razor Pages support
builder.Services.AddRazorPages();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    
    // Log that we're in development mode
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogInformation("Running in Development mode with local authentication");
}
else
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");
app.MapRazorPages();

// Initialize the database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<SchoolContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();
        await DbInitializer.InitializeAsync(context, logger);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// In development mode, create the uploads directory if it doesn't exist
if (app.Environment.IsDevelopment())
{
    var webHostEnvironment = app.Services.GetRequiredService<IWebHostEnvironment>();
    var uploadsPath = Path.Combine(webHostEnvironment.WebRootPath, "uploads");
    if (!Directory.Exists(uploadsPath))
    {
        Directory.CreateDirectory(uploadsPath);
    }
}

app.Run();

// Make the implicit Program class public for testing
public partial class Program { }
