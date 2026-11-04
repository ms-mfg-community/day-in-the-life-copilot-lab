import {
    ASSIGN_ISSUE_BODY_SCHEMA,
    readValidatedBody,
    START_WORK_BODY_SCHEMA,
} from "./request-validation.mjs";

// Routes take their actions as arguments so the guards in front of them can be tested without the Copilot SDK.
export function createApiRoutes(actions) {
    return [
        {
            name: "dashboard",
            method: "GET",
            pattern: /^\/api\/dashboard$/,
            budget: "dashboard",
            run: () => actions.loadDashboard(),
        },
        {
            name: "run-details",
            method: "GET",
            pattern: /^\/api\/runs\/(\d+)$/,
            budget: "read",
            run: (id) => actions.loadRunDetails(id),
        },
        {
            name: "kickoff-preview",
            method: "GET",
            pattern: /^\/api\/issues\/(\d+)\/kickoff-preview$/,
            budget: "read",
            run: async (id) => {
                const { issue, preview, digest } = await actions.loadKickoffPreview(id);
                return { issueNumber: issue.number, preview, digest };
            },
        },
        {
            name: "recommend",
            method: "POST",
            pattern: /^\/api\/runs\/(\d+)\/recommend$/,
            budget: "copilot",
            singleFlight: true,
            run: (id) => actions.recommendRunFix(id),
        },
        {
            name: "start-work",
            method: "POST",
            pattern: /^\/api\/issues\/(\d+)\/start$/,
            budget: "copilot",
            singleFlight: true,
            run: async (id, req) =>
                actions.startIssueWork(id, await readValidatedBody(req, START_WORK_BODY_SCHEMA)),
        },
        {
            name: "assign",
            method: "POST",
            pattern: /^\/api\/issues\/(\d+)\/assign$/,
            budget: "write",
            run: async (id, req) =>
                actions.assignIssue(id, (await readValidatedBody(req, ASSIGN_ISSUE_BODY_SCHEMA)).assignee),
        },
    ];
}
