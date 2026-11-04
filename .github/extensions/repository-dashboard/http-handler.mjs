import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

import { renderDashboardHtml } from "./dashboard-html.mjs";
import {
    consumeToken,
    createRequestBudgets,
    createSingleFlightGuard,
} from "./rate-limit.mjs";
import {
    canvasHost,
    canvasUrl,
    DASHBOARD_CSP,
    DashboardRequestError,
    parseAuthorizedRequestUrl,
} from "./request-security.mjs";

const REFILL_INTERVAL_MS = 60_000;
const TOKEN_BYTES = 24;
const REQUEST_BUDGETS = {
    read: { capacity: 60, refillIntervalMs: REFILL_INTERVAL_MS },
    dashboard: { capacity: 12, refillIntervalMs: REFILL_INTERVAL_MS },
    write: { capacity: 20, refillIntervalMs: REFILL_INTERVAL_MS },
    copilot: { capacity: 6, refillIntervalMs: REFILL_INTERVAL_MS },
};

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(payload));
}

function sendDashboardHtml(res, token) {
    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": DASHBOARD_CSP,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
    });
    res.end(renderDashboardHtml(token));
}

function matchApiRoute(routes, method, pathname) {
    for (const route of routes) {
        if (route.method !== method) {
            continue;
        }
        const match = pathname.match(route.pattern);
        if (match) {
            return { route, id: Number(match[1]) };
        }
    }
    return null;
}

function runRoute({ route, id }, req, context) {
    consumeToken(context.budgets[route.budget]);
    if (!route.singleFlight) {
        return route.run(id, req);
    }
    return context.inFlight.run(`${route.name}:${id}`, () => route.run(id, req));
}

async function handleRequest(req, res, context) {
    try {
        const requestUrl = parseAuthorizedRequestUrl(req, context);

        if (req.method === "GET" && requestUrl.pathname === "/") {
            sendDashboardHtml(res, context.token);
            return;
        }

        const matched = matchApiRoute(context.routes, req.method, requestUrl.pathname);
        if (!matched) {
            sendJson(res, 404, { error: "Route not found." });
            return;
        }

        sendJson(res, 200, await runRoute(matched, req, context));
    } catch (error) {
        if (error instanceof DashboardRequestError) {
            sendJson(res, error.statusCode, { error: error.message });
            return;
        }
        sendJson(res, 500, { error: "The dashboard hit an unexpected error." });
    }
}

export async function createDashboardServer({ instanceId, routes }) {
    const context = {
        instanceId,
        routes,
        token: randomBytes(TOKEN_BYTES).toString("hex"),
        budgets: createRequestBudgets(REQUEST_BUDGETS),
        inFlight: createSingleFlightGuard(),
    };
    const server = createServer((req, res) => void handleRequest(req, res, {
        ...context,
        host: canvasHost(server.address()?.port),
    }));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return { server, url: canvasUrl(server.address().port, context.token) };
}
