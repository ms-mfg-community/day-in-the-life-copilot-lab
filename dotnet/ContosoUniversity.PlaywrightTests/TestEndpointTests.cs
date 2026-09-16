namespace ContosoUniversity.PlaywrightTests;

public class TestEndpointTests
{
    [TestCase(null, "https://localhost:52379")]
    [TestCase("http://127.0.0.1:52380", "http://127.0.0.1:52380")]
    [TestCase("https://preview.example.invalid/", "https://preview.example.invalid")]
    public void Resolve_ValidEndpoint_ReturnsNormalizedBaseUrl(string? configured, string expected)
    {
        Assert.That(TestEndpoint.Resolve(configured), Is.EqualTo(expected));
    }

    [TestCase("")]
    [TestCase("relative/path")]
    [TestCase("file:///tmp/application")]
    [TestCase("https://example.invalid/?secret=not-a-credential")]
    [TestCase("https://example.invalid/#fragment")]
    [TestCase("https://user@example.invalid/")]
    public void Resolve_InvalidEndpoint_RejectsItWithoutAFallback(string configured)
    {
        Assert.Throws<InvalidOperationException>(() => TestEndpoint.Resolve(configured));
    }
}
