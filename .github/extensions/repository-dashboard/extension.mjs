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
    assertPreviewApproved,
    buildIssueKickoffPreview,
    buildIssueKickoffPrompt,
    buildRunFailurePreview,
    buildRunFailurePrompt,
    previewDigest,
} from "./prompt-builder.mjs";
import {
    canvasHost,
    canvasUrl,
    DashboardRequestError,
    parseAuthorizedRequestUrl,
} from "./request-security.mjs";
import {
    ASSIGN_ISSUE_ACTION_SCHEMA,
    ASSIGN_ISSUE_BODY_SCHEMA,
    EXECUTION_LOCATIONS,
    readValidatedBody,
    RUN_DETAILS_ACTION_SCHEMA,
    START_WORK_BODY_SCHEMA,
    validateInput,
} from "./request-validation.mjs";

import {
    consumeToken,
    createRequestBudgets,
    createSingleFlightGuard,
} from "./rate-limit.mjs";

const servers = new Map();
const COPILOT_RESPONSE_TIMEOUT_MS = 180_000;
const REFILL_INTERVAL_MS = 60_000;
const REQUEST_BUDGETS = {
    read: { capacity: 60, refillIntervalMs: REFILL_INTERVAL_MS },
    write: { capacity: 20, refillIntervalMs: REFILL_INTERVAL_MS },
    copilot: { capacity: 6, refillIntervalMs: REFILL_INTERVAL_MS },
};
const DASHBOARD_CSP = [
    "default-src 'self'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    "connect-src 'self'",
    "img-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
].join("; ");
let copilotSession;

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(payload));
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
    assertPreviewApproved(kickoff.preview, input.kickoffDigest);

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

const API_ROUTES = [
    {
        name: "dashboard",
        method: "GET",
        pattern: /^\/api\/dashboard$/,
        budget: "read",
        run: () => loadDashboard(),
    },
    {
        name: "run-details",
        method: "GET",
        pattern: /^\/api\/runs\/(\d+)$/,
        budget: "read",
        run: (id) => loadRunDetails(id),
    },
    {
        name: "kickoff-preview",
        method: "GET",
        pattern: /^\/api\/issues\/(\d+)\/kickoff-preview$/,
        budget: "read",
        run: async (id) => {
            const { issue, preview, digest } = await loadKickoffPreview(id);
            return { issueNumber: issue.number, preview, digest };
        },
    },
    {
        name: "recommend",
        method: "POST",
        pattern: /^\/api\/runs\/(\d+)\/recommend$/,
        budget: "copilot",
        singleFlight: true,
        run: (id) => recommendRunFix(id),
    },
    {
        name: "start-work",
        method: "POST",
        pattern: /^\/api\/issues\/(\d+)\/start$/,
        budget: "copilot",
        singleFlight: true,
        run: async (id, req) =>
            startIssueWork(id, await readValidatedBody(req, START_WORK_BODY_SCHEMA)),
    },
    {
        name: "assign",
        method: "POST",
        pattern: /^\/api\/issues\/(\d+)\/assign$/,
        budget: "write",
        run: async (id, req) =>
            assignIssue(id, (await readValidatedBody(req, ASSIGN_ISSUE_BODY_SCHEMA)).assignee),
    },
];

function matchApiRoute(method, pathname) {
    for (const route of API_ROUTES) {
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

function sendDashboardHtml(res, token) {
    res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": DASHBOARD_CSP,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
    });
    res.end(renderDashboardHtml(token));
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

        const matched = matchApiRoute(req.method, requestUrl.pathname);
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

async function startServer(instanceId) {
    const context = {
        instanceId,
        token: randomBytes(24).toString("hex"),
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
                    inputSchema: ASSIGN_ISSUE_ACTION_SCHEMA,
                    handler: async (ctx) => {
                        const input = validateInput(ASSIGN_ISSUE_ACTION_SCHEMA, ctx.input);
                        return assignIssue(input.issueNumber, input.assignee);
                    },
                },
                {
                    name: "get_run_details",
                    description: "Return failed jobs, failed steps, and failed log output for a GitHub Actions run.",
                    inputSchema: RUN_DETAILS_ACTION_SCHEMA,
                    handler: async (ctx) => {
                        const input = validateInput(RUN_DETAILS_ACTION_SCHEMA, ctx.input);
                        return loadRunDetails(input.runId);
                    },
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
