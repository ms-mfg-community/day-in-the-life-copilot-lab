namespace ContosoUniversity.PlaywrightTests;

internal static class TestEndpoint
{
    private const string DefaultBaseUrl = "https://localhost:52379";

    public static string Resolve(string? configured)
    {
        if (configured is null) return DefaultBaseUrl;
        if (!Uri.TryCreate(configured, UriKind.Absolute, out var endpoint)
            || (endpoint.Scheme != Uri.UriSchemeHttp && endpoint.Scheme != Uri.UriSchemeHttps)
            || endpoint.UserInfo.Length > 0 || endpoint.Query.Length > 0 || endpoint.Fragment.Length > 0)
        {
            throw new InvalidOperationException("E2E_BASE_URL must be an absolute HTTP(S) URL without credentials, query, or fragment.");
        }
        return endpoint.AbsoluteUri.TrimEnd('/');
    }
}
