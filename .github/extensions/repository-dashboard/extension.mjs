import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

import { assignIssue, loadDashboard } from "./github-data.mjs";
import { renderDashboardHtml } from "./dashboard-html.mjs";

const servers = new Map();
const MAX_REQUEST_BYTES = 16_384;

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
    const chunks = [];
    let size = 0;

    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_REQUEST_BYTES) {
            throw new Error("Request body exceeds the supported size.");
        }
        chunks.push(chunk);
    }

    return chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function handleRequest(req, res, context) {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");

    try {
        if (req.method === "GET" && requestUrl.pathname === "/") {
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
                "Cache-Control": "no-store",
            });
            res.end(renderDashboardHtml(context.token));
            return;
        }

        if (req.method === "GET" && requestUrl.pathname === "/api/dashboard") {
            sendJson(res, 200, await loadDashboard());
            return;
        }

        const assignmentMatch = requestUrl.pathname.match(/^\/api\/issues\/(\d+)\/assign$/);
        if (req.method === "POST" && assignmentMatch) {
            if (req.headers["x-canvas-token"] !== context.token) {
                sendJson(res, 403, { error: "The canvas security token is missing or invalid." });
                return;
            }

            const body = await readJsonBody(req);
            const result = await assignIssue(Number(assignmentMatch[1]), body.assignee);
            sendJson(res, 200, result);
            return;
        }

        sendJson(res, 404, { error: "Route not found." });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected dashboard error.";
        sendJson(res, 500, { error: message });
    }
}

async function startServer(instanceId) {
    const context = {
        instanceId,
        token: randomBytes(24).toString("hex"),
    };
    const server = createServer((req, res) => void handleRequest(req, res, context));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

async function loadDashboardSummary() {
    const dashboard = await loadDashboard();
    return {
        repository: dashboard.repository,
        counts: {
            openIssues: dashboard.issues.length,
            openPullRequests: dashboard.pullRequests.length,
            recentRuns: dashboard.runs.length,
            unassignedIssues: dashboard.issues.filter((issue) => issue.lane === "unassigned").length,
            blockedIssues: dashboard.issues.filter((issue) => issue.lane === "blocked").length,
            failedRuns: dashboard.runs.filter((run) => run.conclusion === "failure").length,
        },
        errors: dashboard.errors,
        refreshedAt: dashboard.refreshedAt,
    };
}

await joinSession({
    canvases: [
        createCanvas({
            id: "repository-dashboard",
            displayName: "Repository dashboard",
            description: "Manage repository issues, linked pull requests, assignments, and GitHub Actions runs in one project view.",
            inputSchema: {
                type: "object",
                additionalProperties: false,
            },
            actions: [
                {
                    name: "refresh_dashboard",
                    description: "Refresh the repository dashboard and return its current summary.",
                    handler: async () => loadDashboardSummary(),
                },
                {
                    name: "assign_issue",
                    description: "Add a GitHub assignee to an open repository issue.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["issueNumber", "assignee"],
                        properties: {
                            issueNumber: { type: "integer", minimum: 1 },
                            assignee: { type: "string", minLength: 1, maxLength: 39 },
                        },
                    },
                    handler: async (ctx) => assignIssue(ctx.input.issueNumber, ctx.input.assignee),
                },
            ],
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId);
                    servers.set(ctx.instanceId, entry);
                }
                return {
                    title: "Repository dashboard",
                    status: "Issues, pull requests, and Actions",
                    url: entry.url,
                };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (!entry) {
                    return;
                }
                servers.delete(ctx.instanceId);
                await new Promise((resolve) => entry.server.close(resolve));
            },
        }),
    ],
});
