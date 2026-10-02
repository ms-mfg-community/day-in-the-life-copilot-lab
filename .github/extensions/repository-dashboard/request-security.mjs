const CANVAS_TOKEN_PARAMETER = "canvasToken";

export class DashboardRequestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

export function parseAuthorizedRequestUrl(req, expectedToken) {
    let requestUrl;
    try {
        requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    } catch {
        throw new DashboardRequestError(400, "Request URL is malformed.");
    }

    const headerToken = req.headers["x-canvas-token"];
    const isInitialCanvasLoad = req.method === "GET" && requestUrl.pathname === "/";
    const queryToken = isInitialCanvasLoad
        ? requestUrl.searchParams.get(CANVAS_TOKEN_PARAMETER)
        : null;
    if (headerToken !== expectedToken && queryToken !== expectedToken) {
        throw new DashboardRequestError(
            403,
            "The canvas security token is missing or invalid.",
        );
    }

    return requestUrl;
}

export function canvasUrl(port, token) {
    const url = new URL(`http://127.0.0.1:${port}/`);
    url.searchParams.set(CANVAS_TOKEN_PARAMETER, token);
    return url.toString();
}
