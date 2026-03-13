using Microsoft.Playwright.NUnit;
using Microsoft.Playwright;
using NUnit.Framework;

namespace ContosoUniversity.PlaywrightTests;

[Parallelizable(ParallelScope.Self)]
[TestFixture]
public class StudentSearchTests : PageTest
{
    private const string BaseUrl = "https://localhost:52379";

    private ILocator SearchInput => Page.Locator("input[name='searchString']");
    private ILocator EnrollmentDateFromInput => Page.Locator("input[name='enrollmentDateFrom']");
    private ILocator EnrollmentDateToInput => Page.Locator("input[name='enrollmentDateTo']");
    private ILocator SearchButton => Page.Locator("input[type='submit'][value='Search']");
    private ILocator ClearButton => Page.Locator("a:has-text('Clear')");
    private ILocator StudentRows => Page.Locator("table tbody tr");

    private async Task SignInAsync()
    {
        await Page.GotoAsync($"{BaseUrl}/Account/SignIn");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
        await Expect(Page).ToHaveURLAsync($"{BaseUrl}/");
    }

    private async Task GoToStudentsIndexAsync()
    {
        await Page.GotoAsync($"{BaseUrl}/Students");
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);
    }

    [Test]
    public async Task StudentsIndex_LoadsSuccessfully_ShowsSearchForm()
    {
        await SignInAsync();
        await GoToStudentsIndexAsync();

        await Expect(SearchInput).ToBeVisibleAsync();
        await Expect(EnrollmentDateFromInput).ToBeVisibleAsync();
        await Expect(EnrollmentDateToInput).ToBeVisibleAsync();
        await Expect(SearchButton).ToBeVisibleAsync();
    }

    [Test]
    public async Task StudentsIndex_SearchByName_FiltersTableResults()
    {
        await SignInAsync();
        await GoToStudentsIndexAsync();

        await SearchInput.FillAsync("Alexander");
        await SearchButton.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(StudentRows).ToHaveCountAsync(1);
        await Expect(StudentRows.First).ToContainTextAsync("Alexander");

        var rowTexts = await StudentRows.AllTextContentsAsync();
        Assert.That(rowTexts, Has.Count.EqualTo(1));
        Assert.That(rowTexts[0], Does.Not.Contain("Barzdukas"));
        Assert.That(rowTexts[0], Does.Not.Contain("Li"));
    }

    [Test]
    public async Task StudentsIndex_SearchByName_NoResults_ShowsEmptyMessage()
    {
        await SignInAsync();
        await GoToStudentsIndexAsync();

        await SearchInput.FillAsync("ZZZZNOTFOUND");
        await SearchButton.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(Page.GetByText("No students found.")).ToBeVisibleAsync();
    }

    [Test]
    public async Task StudentsIndex_ClearButton_ResetsSearch()
    {
        await SignInAsync();
        await GoToStudentsIndexAsync();

        var initialRowCount = await StudentRows.CountAsync();

        await SearchInput.FillAsync("Alexander");
        await SearchButton.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        await Expect(StudentRows).ToHaveCountAsync(1);
        await Expect(StudentRows.First).ToContainTextAsync("Alexander");

        await ClearButton.ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var clearedRowCount = await StudentRows.CountAsync();
        Assert.That(clearedRowCount, Is.EqualTo(initialRowCount));
        Assert.That(clearedRowCount, Is.GreaterThan(1));
        await Expect(SearchInput).ToHaveValueAsync(string.Empty);
        await Expect(Page.Locator("table")).ToContainTextAsync("Alexander");
        await Expect(Page.Locator("table")).ToContainTextAsync("Barzdukas");
        await Expect(Page.Locator("table")).ToContainTextAsync("Li");
    }

    [Test]
    public async Task StudentsIndex_SortByLastName_ReordersTable()
    {
        await SignInAsync();
        await GoToStudentsIndexAsync();

        await Expect(StudentRows.First).ToContainTextAsync("Alexander");
        var firstRowBeforeSort = (await StudentRows.First.TextContentAsync())?.Trim();

        await Page.Locator("a:has-text('Last Name')").ClickAsync();
        await Page.WaitForLoadStateAsync(LoadState.NetworkIdle);

        var firstRowAfterSort = (await StudentRows.First.TextContentAsync())?.Trim();
        Assert.That(firstRowBeforeSort, Is.Not.Null.And.Not.Empty);
        Assert.That(firstRowAfterSort, Is.Not.Null.And.Not.Empty);
        Assert.That(firstRowAfterSort, Is.Not.EqualTo(firstRowBeforeSort));
        await Expect(StudentRows.First).ToContainTextAsync("Olivetto");
    }
}
