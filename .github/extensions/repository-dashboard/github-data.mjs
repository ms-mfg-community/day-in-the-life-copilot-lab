import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 30_000;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

async function runGh(args) {
    try {
        const { stdout } = await execFileAsync("gh", args, {
            cwd: process.cwd(),
            encoding: "utf8",
            maxBuffer: MAX_BUFFER_BYTES,
            timeout: COMMAND_TIMEOUT_MS,
            windowsHide: true,
        });
        return stdout.trim();
    } catch (error) {
        const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
        const detail = stderr || error?.message || "Unknown GitHub CLI error.";
        throw new Error(`GitHub request failed: ${detail}`);
    }
}

async function runGhJson(args) {
    const output = await runGh(args);
    if (!output) {
        return null;
    }

    try {
        return JSON.parse(output);
    } catch (error) {
        throw new Error(`GitHub returned invalid JSON: ${error.message}`);
    }
}

function extractReferencedIssues(body, closingIssuesReferences) {
    const explicit = (closingIssuesReferences ?? []).map((issue) => issue.number);
    const issueUrls = [...(body ?? "").matchAll(/\/issues\/(\d+)\b/g)]
        .map((match) => Number(match[1]))
        .filter(Number.isInteger);
    return [...new Set([...explicit, ...issueUrls])].sort((left, right) => left - right);
}

function summarizeChecks(statusCheckRollup) {
    const checks = statusCheckRollup ?? [];
    const failedStates = new Set(["FAILURE", "ERROR", "CANCELLED", "TIMED_OUT", "ACTION_REQUIRED"]);
    const pendingStates = new Set(["EXPECTED", "PENDING", "QUEUED", "IN_PROGRESS", "WAITING", "REQUESTED"]);

    return checks.reduce(
        (summary, check) => {
            const state = String(check.conclusion || check.state || check.status || "").toUpperCase();
            if (failedStates.has(state)) {
                return { ...summary, failed: summary.failed + 1, total: summary.total + 1 };
            }
            if (pendingStates.has(state) || !state) {
                return { ...summary, pending: summary.pending + 1, total: summary.total + 1 };
            }
            return { ...summary, passed: summary.passed + 1, total: summary.total + 1 };
        },
        { total: 0, passed: 0, failed: 0, pending: 0 },
    );
}

function normalizePullRequests(pullRequests) {
    return pullRequests.map((pullRequest) => ({
        ...pullRequest,
        relatedIssueNumbers: extractReferencedIssues(
            pullRequest.body,
            pullRequest.closingIssuesReferences,
        ),
        checks: summarizeChecks(pullRequest.statusCheckRollup),
    }));
}

function normalizeIssues(issues, pullRequests) {
    return issues.map((issue) => {
        const linkedPullRequests = pullRequests
            .filter((pullRequest) => pullRequest.relatedIssueNumbers.includes(issue.number))
            .map(({ number, title, url, isDraft }) => ({ number, title, url, isDraft }));
        const isBlocked = issue.labels.some((label) => /blocked|waiting|on hold/i.test(label.name));
        const lane = isBlocked ? "blocked" : issue.assignees.length > 0 ? "assigned" : "unassigned";
        return { ...issue, lane, linkedPullRequests };
    });
}

async function loadSection(name, operation) {
    try {
        return { name, data: await operation(), error: null };
    } catch (error) {
        return {
            name,
            data: [],
            error: error instanceof Error ? error.message : `Unable to load ${name}.`,
        };
    }
}

export async function loadDashboard() {
    const [repository, viewer] = await Promise.all([
        runGhJson(["repo", "view", "--json", "nameWithOwner,url,defaultBranchRef"]),
        runGhJson(["api", "user"]),
    ]);
    const repo = repository.nameWithOwner;

    const sections = await Promise.all([
        loadSection("issues", () =>
            runGhJson([
                "issue", "list", "--repo", repo, "--state", "open", "--limit", "100",
                "--json", "number,title,url,body,labels,assignees,author,createdAt,updatedAt",
            ]),
        ),
        loadSection("pullRequests", () =>
            runGhJson([
                "pr", "list", "--repo", repo, "--state", "open", "--limit", "100",
                "--json", "number,title,url,body,isDraft,author,assignees,labels,reviewDecision,statusCheckRollup,createdAt,updatedAt,closingIssuesReferences,headRefName,baseRefName",
            ]),
        ),
        loadSection("runs", () =>
            runGhJson([
                "run", "list", "--repo", repo, "--limit", "30",
                "--json", "databaseId,displayTitle,event,headBranch,status,conclusion,workflowName,createdAt,updatedAt,url,number",
            ]),
        ),
        loadSection("assignableUsers", () =>
            runGhJson(["api", `repos/${repo}/assignees?per_page=100`]),
        ),
    ]);

    const sectionMap = Object.fromEntries(sections.map((section) => [section.name, section]));
    const pullRequests = normalizePullRequests(sectionMap.pullRequests.data ?? []);
    const issues = normalizeIssues(sectionMap.issues.data ?? [], pullRequests);
    const errors = Object.fromEntries(
        sections.filter((section) => section.error).map((section) => [section.name, section.error]),
    );

    return {
        repository: {
            nameWithOwner: repo,
            url: repository.url,
            defaultBranch: repository.defaultBranchRef?.name ?? "",
        },
        viewer: { login: viewer.login, avatarUrl: viewer.avatar_url },
        issues,
        pullRequests,
        runs: sectionMap.runs.data ?? [],
        assignableUsers: (sectionMap.assignableUsers.data ?? []).map(({ login, avatar_url: avatarUrl }) => ({
            login,
            avatarUrl,
        })),
        errors,
        refreshedAt: new Date().toISOString(),
    };
}

export async function assignIssue(issueNumber, assignee) {
    if (!Number.isInteger(issueNumber) || issueNumber < 1) {
        throw new Error("Issue number must be a positive integer.");
    }
    if (typeof assignee !== "string" || !GITHUB_LOGIN_PATTERN.test(assignee)) {
        throw new Error("Assignee must be a valid GitHub login.");
    }

    const repository = await runGhJson(["repo", "view", "--json", "nameWithOwner"]);
    await runGh([
        "issue", "edit", String(issueNumber),
        "--repo", repository.nameWithOwner,
        "--add-assignee", assignee,
    ]);

    return {
        issueNumber,
        assignee,
        message: `Assigned #${issueNumber} to @${assignee}.`,
    };
}
