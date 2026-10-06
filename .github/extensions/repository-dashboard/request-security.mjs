import { timingSafeEqual } from "node:crypto";

const CANVAS_TOKEN_PARAMETER = "canvasToken";
const CANVAS_HOST = "127.0.0.1";

export class DashboardRequestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

function secretsMatch(candidate, expected) {
    if (typeof candidate !== "string" || candidate.length !== expected.length) {
        return false;
    }
    return timingSafeEqual(
        Buffer.from(candidate, "utf8"),
        Buffer.from(expected, "utf8"),
    );
}

export function canvasHost(port) {
    return `${CANVAS_HOST}:${port}`;
}

function assertExpectedOrigin(req, host) {
    if (req.headers.host !== host) {
        throw new DashboardRequestError(403, "The request was made for an unexpected host.");
    }
    const origin = req.headers.origin;
    if (origin !== undefined && origin !== `http://${host}`) {
        throw new DashboardRequestError(403, "The request came from an unexpected origin.");
    }
}

export function parseAuthorizedRequestUrl(req, { token, host }) {
    let requestUrl;
    try {
        requestUrl = new URL(req.url ?? "/", `http://${CANVAS_HOST}`);
    } catch {
        throw new DashboardRequestError(400, "Request URL is malformed.");
    }

    assertExpectedOrigin(req, host);

    const headerToken = req.headers["x-canvas-token"];
    const isInitialCanvasLoad = req.method === "GET" && requestUrl.pathname === "/";
    const queryToken = isInitialCanvasLoad
        ? requestUrl.searchParams.get(CANVAS_TOKEN_PARAMETER)
        : null;
    if (!secretsMatch(headerToken, token) && !secretsMatch(queryToken, token)) {
        throw new DashboardRequestError(
            403,
            "The canvas security token is missing or invalid.",
        );
    }

    return requestUrl;
}

export function canvasUrl(port, token) {
    const url = new URL(`http://${canvasHost(port)}/`);
    url.searchParams.set(CANVAS_TOKEN_PARAMETER, token);
    return url.toString();
}
