import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

import {
    assignIssue,
    loadDashboard,
    loadRepositoryName,
    loadRunDetails,
} from "./github-data.mjs";
import { createApiRoutes } from "./api-routes.mjs";
import { createDashboardServer } from "./http-handler.mjs";
import { loadKickoffPreview, resolveApprovedKickoff } from "./kickoff-approval.mjs";
import {
    buildIssueKickoffPrompt,
    buildRunFailurePreview,
    buildRunFailurePrompt,
} from "./prompt-builder.mjs";
import {
    ASSIGN_ISSUE_ACTION_SCHEMA,
    RUN_DETAILS_ACTION_SCHEMA,
    validateInput,
} from "./request-validation.mjs";

const servers = new Map();
const COPILOT_RESPONSE_TIMEOUT_MS = 180_000;
let copilotSession;

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

const apiRoutes = createApiRoutes({
    loadDashboard,
    loadRunDetails,
    loadKickoffPreview,
    recommendRunFix,
    startIssueWork,
    assignIssue,
});

async function startServer(instanceId) {
    return createDashboardServer({ instanceId, routes: apiRoutes });
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
