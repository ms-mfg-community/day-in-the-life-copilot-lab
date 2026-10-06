import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

import {
    assignIssue,
    loadAgentNames,
    loadDashboard,
    loadOpenIssue,
    loadRepositoryName,
    loadRunDetails,
} from "./github-data.mjs";
import { renderDashboardHtml } from "./dashboard-html.mjs";
import {
    buildIssueKickoffPreview,
    buildIssueKickoffPrompt,
    buildRunFailurePreview,
    buildRunFailurePrompt,
    previewDigest,
} from "./prompt-builder.mjs";
import {
    canvasUrl,
    DashboardRequestError,
    parseAuthorizedRequestUrl,
} from "./request-security.mjs";

const servers = new Map();
const MAX_REQUEST_BYTES = 16_384;
const COPILOT_RESPONSE_TIMEOUT_MS = 180_000;
const EXECUTION_LOCATIONS = new Set(["local", "cloud"]);
let copilotSession;

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

function assistantResponseText(response) {
    const content = response?.data?.content;
    if (typeof content === "string" && content.trim()) {
        return content.trim();
    }
    throw new Error("Copilot completed without returning a recommendation.");
}

async function recommendRunFix(runId) {
    const [details, repository] = await Promise.all([
        loadRunDetails(runId),
        loadRepositoryName(),
    ]);
    const prompt = buildRunFailurePrompt({
        repository,
        runId,
        preview: buildRunFailurePreview(details),
    });
    const response = await copilotSession.sendAndWait(
        { prompt },
        COPILOT_RESPONSE_TIMEOUT_MS,
    );
    return {
        recommendation: assistantResponseText(response),
        runUrl: details.run.url,
    };
}

async function loadKickoffPreview(issueNumber) {
    const { repo, issue } = await loadOpenIssue(issueNumber);
    const preview = buildIssueKickoffPreview({
        issueNumber: issue.number,
        title: issue.title,
        body: issue.body,
    });
    return { repo, issue, preview, digest: previewDigest(preview) };
}

async function resolveApprovedKickoff(issueNumber, input) {
    if (!EXECUTION_LOCATIONS.has(input.executionLocation)) {
        throw new DashboardRequestError(400, "Execution location must be local or cloud.");
    }

    const kickoff = await loadKickoffPreview(issueNumber);
    if (kickoff.digest !== input.kickoffDigest) {
        throw new DashboardRequestError(
            409,
            "This issue changed after its kickoff text was shown. Refresh the dashboard and review it again before starting work.",
        );
    }

    const agent = input.agent || "default";
    if (agent !== "default" && !(await loadAgentNames()).has(agent)) {
        throw new DashboardRequestError(400, "That agent is not available in this repository.");
    }
    return { ...kickoff, agent };
}

async function startIssueWork(issueNumber, input) {
    const { repo, issue, preview, agent } = await resolveApprovedKickoff(issueNumber, input);
    const assignee = input.assignee?.trim() || "";
    if (assignee) {
        await assignIssue(issueNumber, assignee);
    }

    const prompt = buildIssueKickoffPrompt({
        repository: repo,
        issueNumber: issue.number,
        title: issue.title,
        preview,
        agent,
        executionLocation: input.executionLocation,
    });
    const response = await copilotSession.sendAndWait(
        { prompt },
        COPILOT_RESPONSE_TIMEOUT_MS,
    );
    return {
        issueNumber: issue.number,
        agent,
        executionLocation: input.executionLocation,
        assignee: assignee || null,
        message: assistantResponseText(response),
    };
}

async function handleRequest(req, res, context) {
    try {
        const requestUrl = parseAuthorizedRequestUrl(req, context.token);

        if (req.method === "GET" && requestUrl.pathname === "/") {
            res.writeHead(200, {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Security-Policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:",
                "Cache-Control": "no-store",
                "Referrer-Policy": "no-referrer",
            });
            res.end(renderDashboardHtml(context.token));
            return;
        }

        if (req.method === "GET" && requestUrl.pathname === "/api/dashboard") {
            sendJson(res, 200, await loadDashboard());
            return;
        }

        const runDetailsMatch = requestUrl.pathname.match(/^\/api\/runs\/(\d+)$/);
        if (req.method === "GET" && runDetailsMatch) {
            sendJson(res, 200, await loadRunDetails(Number(runDetailsMatch[1])));
            return;
        }

        const recommendationMatch = requestUrl.pathname.match(/^\/api\/runs\/(\d+)\/recommend$/);
        if (req.method === "POST" && recommendationMatch) {
            sendJson(res, 200, await recommendRunFix(Number(recommendationMatch[1])));
            return;
        }

        const startWorkMatch = requestUrl.pathname.match(/^\/api\/issues\/(\d+)\/start$/);
        if (req.method === "POST" && startWorkMatch) {
            const body = await readJsonBody(req);
            sendJson(res, 200, await startIssueWork(Number(startWorkMatch[1]), body));
            return;
        }

        const kickoffPreviewMatch = requestUrl.pathname.match(/^\/api\/issues\/(\d+)\/kickoff-preview$/);
        if (req.method === "GET" && kickoffPreviewMatch) {
            const { issue, preview, digest } = await loadKickoffPreview(
                Number(kickoffPreviewMatch[1]),
            );
            sendJson(res, 200, { issueNumber: issue.number, preview, digest });
            return;
        }

        const assignmentMatch = requestUrl.pathname.match(/^\/api\/issues\/(\d+)\/assign$/);
        if (req.method === "POST" && assignmentMatch) {
            const body = await readJsonBody(req);
            const result = await assignIssue(Number(assignmentMatch[1]), body.assignee);
            sendJson(res, 200, result);
            return;
        }

        sendJson(res, 404, { error: "Route not found." });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected dashboard error.";
        const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500;
        sendJson(res, statusCode, { error: message });
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
    return { server, url: canvasUrl(port, context.token) };
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

copilotSession = await joinSession({
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
                {
                    name: "get_run_details",
                    description: "Return failed jobs, failed steps, and failed log output for a GitHub Actions run.",
                    inputSchema: {
                        type: "object",
                        additionalProperties: false,
                        required: ["runId"],
                        properties: {
                            runId: { type: "integer", minimum: 1 },
                        },
                    },
                    handler: async (ctx) => loadRunDetails(ctx.input.runId),
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
