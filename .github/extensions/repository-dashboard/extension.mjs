import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

import {
    assignIssue,
    loadDashboard,
    loadRunDetails,
} from "./github-data.mjs";
import { renderDashboardHtml } from "./dashboard-html.mjs";
import {
    canvasUrl,
    parseAuthorizedRequestUrl,
} from "./request-security.mjs";

const servers = new Map();
const MAX_REQUEST_BYTES = 16_384;
const COPILOT_RESPONSE_TIMEOUT_MS = 180_000;
const MAX_PROMPT_LOG_CHARACTERS = 20_000;
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
    const details = await loadRunDetails(runId);
    const failedLogs = details.failedLogs.slice(-MAX_PROMPT_LOG_CHARACTERS);
    const prompt = [
        "The user explicitly requested a GitHub Actions failure recommendation from the Repository dashboard.",
        "Analyze the run details below. Do not edit files or start another session.",
        "Return a concise diagnosis with: likely root cause, evidence, recommended fix, and verification steps.",
        `Repository: ${(await loadDashboard()).repository.nameWithOwner}`,
        `Run: ${details.run.workflowName} (${details.run.url})`,
        `Failed jobs and steps:\n${JSON.stringify(details.failedJobs, null, 2)}`,
        `Failed log excerpt:\n${failedLogs || details.logError || "No failed logs were available."}`,
    ].join("\n\n");
    const response = await copilotSession.sendAndWait(
        { prompt },
        COPILOT_RESPONSE_TIMEOUT_MS,
    );
    return {
        recommendation: assistantResponseText(response),
        runUrl: details.run.url,
    };
}

async function startIssueWork(issueNumber, input) {
    const executionLocation = input.executionLocation;
    const agent = input.agent || "default";
    const assignee = input.assignee?.trim() || "";
    if (!EXECUTION_LOCATIONS.has(executionLocation)) {
        throw new Error("Execution location must be local or cloud.");
    }

    const dashboard = await loadDashboard();
    const issue = dashboard.issues.find((candidate) => candidate.number === issueNumber);
    if (!issue) {
        throw new Error(`Open issue #${issueNumber} was not found.`);
    }

    const availableAgents = new Set(dashboard.agents.map((candidate) => candidate.name));
    if (agent !== "default" && !availableAgents.has(agent)) {
        throw new Error(`Agent "${agent}" is not available in this repository.`);
    }

    if (assignee) {
        await assignIssue(issueNumber, assignee);
    }

    const agentInstruction = agent === "default"
        ? "Omit kickoff.agent so the project's default agent is used."
        : `Set kickoff.agent to "${agent}".`;
    const prompt = [
        "The user explicitly clicked Assign work in the Repository dashboard.",
        "Create a new project session now with the create_session tool; do not implement the issue in this current session.",
        `Set execution_location to "${executionLocation}".`,
        agentInstruction,
        'Set kickoff.mode to "autopilot", coordinate_with_creator to true, and notify_on_idle to "once".',
        "Leave base_branch unset so the new work starts from the project default branch.",
        `Use session name "Issue ${issueNumber}: ${issue.title.slice(0, 50)}".`,
        "Use this kickoff prompt:",
        `Work on ${dashboard.repository.nameWithOwner}#${issueNumber}: ${issue.title}`,
        issue.body?.slice(0, 4_000) || "Read the issue from GitHub for complete requirements.",
        "Investigate the root cause, implement a complete fix, run focused validation, and create a pull request when ready.",
        "After creating the session, reply with the session name and where it is running.",
    ].join("\n\n");
    const response = await copilotSession.sendAndWait(
        { prompt },
        COPILOT_RESPONSE_TIMEOUT_MS,
    );
    return {
        issueNumber,
        agent,
        executionLocation,
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
