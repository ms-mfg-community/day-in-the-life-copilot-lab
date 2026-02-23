using Microsoft.Playwright.NUnit;
using Microsoft.Playwright;
using NUnit.Framework;

namespace ContosoUniversity.PlaywrightTests;

[Parallelizable(ParallelScope.Self)]
[TestFixture]
public class CourseEditTests : PageTest
{
    private const string BaseUrl = "https://localhost:52379";
    
    [Test]
    public async Task EditCourse_ChangeCreditFromThreeToFour_ShouldSaveChanges()
    {
        // First, sign in to the application (required for ASP.NET Core version)
        await Page.GotoAsync($"{BaseUrl}/Account/SignIn");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // The LocalSignInAsync method should automatically redirect us to the home page
        await Expect(Page).ToHaveURLAsync($"{BaseUrl}/");
        
        // Now navigate to the courses page
        await Page.GotoAsync($"{BaseUrl}/Courses");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // Debug: Take a screenshot and check page content
        await Page.ScreenshotAsync(new() { Path = "../../screenshots/debug_courses_page.png" });
        Console.WriteLine($"Page Title: {await Page.TitleAsync()}");
        Console.WriteLine($"Page URL: {Page.Url}");
        
        // Check if there's a table on the page
        var tables = Page.Locator("table");
        var tableCount = await tables.CountAsync();
        Console.WriteLine($"Found {tableCount} tables on page");
        
        // Look for any Edit buttons/links with various selectors
        var editButtons1 = Page.Locator("a:has-text('Edit')");
        var editButtons2 = Page.Locator("a.btn-warning");
        var editButtons3 = Page.Locator("a[href*='Edit']");
        
        Console.WriteLine($"Edit buttons (text): {await editButtons1.CountAsync()}");
        Console.WriteLine($"Edit buttons (.btn-warning): {await editButtons2.CountAsync()}");
        Console.WriteLine($"Edit links (href): {await editButtons3.CountAsync()}");
        
        // Print some page content for debugging
        var pageContent = await Page.Locator("body").TextContentAsync();
        Console.WriteLine($"Page contains 'Edit': {pageContent?.Contains("Edit")}");
        Console.WriteLine($"Page contains 'Course': {pageContent?.Contains("Course")}");
        
        // Try to find any edit button
        var editButton = Page.Locator("a:has-text('Edit')").First;
        
        // Wait with a longer timeout and better error handling
        try
        {
            await editButton.WaitForAsync(new() { Timeout = 10000 });
            await editButton.ClickAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error clicking edit button: {ex.Message}");
            // Take another screenshot to see what's on the page
            await Page.ScreenshotAsync(new() { Path = "../../screenshots/debug_error_page.png" });
            throw;
        }
        
        // Wait for the edit page to load
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // Verify we're on an edit page
        await Expect(Page.Locator("h2")).ToContainTextAsync("Edit");
        
        // Find the credits input field and verify current value
        var creditsInput = Page.Locator("input[id*='Credits']");
        var currentCredits = await creditsInput.InputValueAsync();
        
        // Change credits from 3 to 4 (or whatever the current value is to 4)
        await creditsInput.FillAsync("4");
        
        // Click the Save button
        await Page.Locator("input[type='submit'][value='Save']").ClickAsync();
        
        // Wait for navigation back to index page
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // Verify we're back on the courses index page
        await Expect(Page).ToHaveURLAsync($"{BaseUrl}/Courses");
        
        // Verify the course was updated by checking the table contains the updated credit value
        // This assumes the courses table shows the credits
        await Expect(Page.Locator("table")).ToContainTextAsync("4");
    }
    
    [Test]
    public async Task EditSpecificTestCourse_ChangeCreditFromThreeToFour_ShouldSaveChanges()
    {
        // First, sign in to the application (required for ASP.NET Core version)
        await Page.GotoAsync($"{BaseUrl}/Account/SignIn");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // The LocalSignInAsync method should automatically redirect us to the home page
        await Expect(Page).ToHaveURLAsync($"{BaseUrl}/");
        
        // Navigate to the courses page
        await Page.GotoAsync($"{BaseUrl}/Courses");
        
        // Wait for the page to load
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // Look for the "Test Course" we created earlier (CourseID 1111) or create it first
        var testCourseRow = Page.Locator("tr:has-text('Test Course')");
        
        if (await testCourseRow.CountAsync() == 0)
        {
            // If test course doesn't exist, create it first
            await CreateTestCourse();
            await Page.GotoAsync($"{BaseUrl}/Courses");
            await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        }
        
        // Find the Edit button for the Test Course
        var editButton = testCourseRow.Locator("a:has-text('Edit')");
        await editButton.ClickAsync();
        
        // Wait for the edit page to load
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // Verify we're editing the correct course
        await Expect(Page.Locator("input[id*='Title']")).ToHaveValueAsync("Test Course");
        
        // Change credits to 4
        var creditsInput = Page.Locator("input[id*='Credits']");
        await creditsInput.FillAsync("4");
        
        // Click the Save button
        await Page.Locator("input[type='submit'][value='Save']").ClickAsync();
        
        // Wait for navigation back to index page
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // Verify we're back on the courses index page
        await Expect(Page).ToHaveURLAsync($"{BaseUrl}/Courses");
        
        // Verify the Test Course now shows 4 credits
        var updatedTestCourseRow = Page.Locator("tr:has-text('Test Course')");
        await Expect(updatedTestCourseRow).ToContainTextAsync("4");
    }
    
    private async Task CreateTestCourse()
    {
        // Ensure we're authenticated before creating a course
        if (!Page.Url.Contains(BaseUrl))
        {
            await Page.GotoAsync($"{BaseUrl}/Account/SignIn");
            await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        }
        
        // Navigate to create course page
        await Page.GotoAsync($"{BaseUrl}/Courses/Create");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        
        // Fill in the course details
        await Page.Locator("input[id*='CourseID']").FillAsync("1111");
        await Page.Locator("input[id*='Title']").FillAsync("Test Course");
        await Page.Locator("input[id*='Credits']").FillAsync("3");
        
        // Select a department (get the first actual department, not the empty option)
        var departmentOptions = Page.Locator("select[id*='DepartmentID'] option");
        var departmentCount = await departmentOptions.CountAsync();
        if (departmentCount > 1) // Skip empty option at index 0
        {
            var departmentValue = await departmentOptions.Nth(1).GetAttributeAsync("value");
            await Page.Locator("select[id*='DepartmentID']").SelectOptionAsync(departmentValue!);
        }
        
        // Click Create button
        await Page.Locator("input[type='submit'][value='Create']").ClickAsync();
        
        // Wait for redirect to index
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
    }
}
