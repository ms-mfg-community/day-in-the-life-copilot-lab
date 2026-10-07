import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { DashboardRequestError } from "./request-security.mjs";

const execFileAsync = promisify(execFile);
const COMMAND_TIMEOUT_MS = 30_000;
const PAGE_TIMEOUT_MS = 20_000;
const PAGINATION_DEADLINE_MS = 45_000;
const MAX_GRAPHQL_PAGES = 20;
const MAX_REST_PAGES = 10;
const REST_PAGE_SIZE = 100;
const RUN_LIST_LIMIT = 30;
const MAX_BUFFER_BYTES = 10 * 1024 * 1024;
const MAX_LOG_CHARACTERS = 60_000;
const LOG_SCAN_CHARACTERS = MAX_LOG_CHARACTERS * 2;
const MAX_ERROR_DETAIL_LINES = 3;
const MAX_ERROR_DETAIL_CHARACTERS = 300;
const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const AGENT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const FULL_ISSUE_URL_PATTERN = /https?:\/\/([^/\s<>()]+)\/([^/\s<>()]+)\/([^/\s<>()]+)\/issues\/(\d+)\b/gi;
const ISSUES_QUERY = `
query($owner: String!, $name: String!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 100, states: OPEN, after: $endCursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number title url body createdAt updatedAt
        author { login avatarUrl }
        labels(first: 100) { nodes { name color description } }
        assignees(first: 100) { nodes { login name avatarUrl } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;
const PULL_REQUESTS_QUERY = `
query($owner: String!, $name: String!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: 100, states: OPEN, after: $endCursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number title url body isDraft reviewDecision createdAt updatedAt headRefName baseRefName
        author { login avatarUrl }
        labels(first: 100) { nodes { name color description } }
        assignees(first: 100) { nodes { login name avatarUrl } }
        closingIssuesReferences(first: 100) {
          nodes { number repository { nameWithOwner } }
        }
        statusCheckRollup {
          contexts(first: 100) {
            nodes {
              ... on CheckRun { status conclusion }
              ... on StatusContext { state }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;
const ISSUE_QUERY = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issueOrPullRequest(number: $number) {
      __typename
      ... on Issue { number title url body state }
    }
  }
}`;

function describeExecFailure(error) {
    if (error?.killed || error?.signal) {
        return "the GitHub CLI timed out.";
    }
    if (error?.code === "ENOENT") {
        return "the GitHub CLI (gh) is not installed or not on PATH.";
    }
    if (error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
        return "the response was larger than the dashboard can read.";
    }
    return "the GitHub CLI exited unexpectedly.";
}

export function summarizeGhFailure(error) {
    const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
    if (stderr) {
        return stderr
            .split("\n")
            .slice(0, MAX_ERROR_DETAIL_LINES)
            .join(" ")
            .slice(0, MAX_ERROR_DETAIL_CHARACTERS);
    }
    return describeExecFailure(error);
}

async function runGh(args, timeoutMs = COMMAND_TIMEOUT_MS) {
    try {
        const { stdout } = await execFileAsync("gh", args, {
            cwd: process.cwd(),
            encoding: "utf8",
            maxBuffer: MAX_BUFFER_BYTES,
            timeout: timeoutMs,
            windowsHide: true,
        });
        return stdout.trim();
    } catch (error) {
        const failure = new DashboardRequestError(
            502,
            `GitHub request failed: ${summarizeGhFailure(error)}`,
        );
        failure.stdout = typeof error?.stdout === "string" ? error.stdout : "";
        throw failure;
    }
}

async function runGhJson(args, timeoutMs) {
    const output = await runGh(args, timeoutMs);
    if (!output) {
        return null;
    }

    try {
        return JSON.parse(output);
    } catch {
        throw new DashboardRequestError(502, "GitHub returned a response the dashboard could not parse.");
    }
}

export function flattenGraphqlPages(pages, connectionName) {
    return (pages ?? []).flatMap(
        (page) => page?.data?.repository?.[connectionName]?.nodes ?? [],
    );
}

function splitRepositoryName(repo) {
    const separatorIndex = repo.indexOf("/");
    return {
        owner: repo.slice(0, separatorIndex),
        name: repo.slice(separatorIndex + 1),
    };
}

export async function collectConnectionPages(fetchPage, connectionName, limits) {
    const { maxPages, deadlineAt, clock = Date.now } = limits;
    const pages = [];
    let cursor = null;

    for (let page = 0; page < maxPages; page += 1) {
        const remainingMs = deadlineAt - clock();
        if (remainingMs <= 0) {
            break;
        }
        const payload = await fetchPage(cursor, remainingMs);
        pages.push(payload);
        const pageInfo = payload?.data?.repository?.[connectionName]?.pageInfo;
        if (!pageInfo) {
            break;
        }
        if (!pageInfo.hasNextPage || !pageInfo.endCursor) {
            return { data: flattenGraphqlPages(pages, connectionName), truncated: false };
        }
        cursor = pageInfo.endCursor;
    }

    return { data: flattenGraphqlPages(pages, connectionName), truncated: true };
}

async function loadPaginatedConnection(repo, connectionName, query) {
    const { owner, name } = splitRepositoryName(repo);
    const fetchPage = (cursor, remainingMs) => {
        const args = [
            "api", "graphql",
            "-f", `owner=${owner}`,
            "-f", `name=${name}`,
            "-f", `query=${query}`,
        ];
        if (cursor) {
            args.push("-f", `endCursor=${cursor}`);
        }
        return runGhJson(args, Math.min(remainingMs, PAGE_TIMEOUT_MS));
    };
    return collectConnectionPages(fetchPage, connectionName, {
        maxPages: MAX_GRAPHQL_PAGES,
        deadlineAt: Date.now() + PAGINATION_DEADLINE_MS,
    });
}

export async function collectRestPages(fetchPage, limits) {
    const { maxPages, pageSize, deadlineAt, clock = Date.now } = limits;
    const items = [];

    for (let page = 1; page <= maxPages; page += 1) {
        const remainingMs = deadlineAt - clock();
        if (remainingMs <= 0) {
            break;
        }
        const batch = await fetchPage(page, remainingMs);
        const received = Array.isArray(batch) ? batch : [];
        items.push(...received);
        if (received.length < pageSize) {
            return { data: items, truncated: false };
        }
    }

    return { data: items, truncated: true };
}

async function loadAssignableUsers(repo) {
    const fetchPage = (page, remainingMs) => runGhJson(
        ["api", `repos/${repo}/assignees?per_page=${REST_PAGE_SIZE}&page=${page}`],
        Math.min(remainingMs, PAGE_TIMEOUT_MS),
    );
    return collectRestPages(fetchPage, {
        maxPages: MAX_REST_PAGES,
        pageSize: REST_PAGE_SIZE,
        deadlineAt: Date.now() + PAGINATION_DEADLINE_MS,
    });
}

async function loadRepositoryAgents() {
    const agentsDirectory = join(process.cwd(), ".github", "agents");

    try {
        const entries = await readdir(agentsDirectory, { withFileTypes: true });
        const agentFiles = entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".agent.md"))
            .map((entry) => entry.name);
        const agents = await Promise.all(agentFiles.map(async (fileName) => {
            const content = await readFile(join(agentsDirectory, fileName), "utf8");
            const frontmatter = content.match(/^---\s*([\s\S]*?)\s*---/);
            const nameMatch = frontmatter?.[1].match(/^name:\s*["']?([^"'\r\n]+)["']?\s*$/m);
            const fallbackName = fileName.replace(/\.agent\.md$/, "");
            return {
                name: nameMatch?.[1]?.trim() || fallbackName,
                source: "project",
            };
        }));
        return agents
            .filter((agent) => AGENT_NAME_PATTERN.test(agent.name))
            .sort((left, right) => left.name.localeCompare(right.name));
    } catch (error) {
        if (error?.code === "ENOENT") {
            return [];
        }
        throw new DashboardRequestError(500, "Unable to discover repository agents.");
    }
}

export function extractReferencedIssues(body, closingIssuesReferences, repo, repositoryUrl) {
    const normalizedRepo = repo.toLowerCase();
    const repositoryHost = new URL(repositoryUrl).host.toLowerCase();
    const explicit = (closingIssuesReferences ?? [])
        .filter((issue) =>
            issue.repository?.nameWithOwner?.toLowerCase() === normalizedRepo)
        .map((issue) => issue.number);
    const issueUrls = [...(body ?? "").matchAll(FULL_ISSUE_URL_PATTERN)]
        .filter((match) =>
            match[1].toLowerCase() === repositoryHost
            && `${match[2]}/${match[3]}`.toLowerCase() === normalizedRepo)
        .map((match) => Number(match[4]))
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

function normalizePullRequests(pullRequests, repo, repositoryUrl) {
    return pullRequests.map((pullRequest) => ({
        ...pullRequest,
        labels: pullRequest.labels?.nodes ?? [],
        assignees: pullRequest.assignees?.nodes ?? [],
        closingIssuesReferences: pullRequest.closingIssuesReferences?.nodes ?? [],
        statusCheckRollup: pullRequest.statusCheckRollup?.contexts?.nodes ?? [],
        relatedIssueNumbers: extractReferencedIssues(
            pullRequest.body,
            pullRequest.closingIssuesReferences?.nodes,
            repo,
            repositoryUrl,
        ),
        checks: summarizeChecks(pullRequest.statusCheckRollup?.contexts?.nodes),
    }));
}

function normalizeIssues(issues, pullRequests) {
    return issues.map((issue) => {
        const normalizedIssue = {
            ...issue,
            labels: issue.labels?.nodes ?? [],
            assignees: issue.assignees?.nodes ?? [],
        };
        const linkedPullRequests = pullRequests
            .filter((pullRequest) => pullRequest.relatedIssueNumbers.includes(normalizedIssue.number))
            .map(({ number, title, url, isDraft }) => ({ number, title, url, isDraft }));
        const isBlocked = normalizedIssue.labels
            .some((label) => /blocked|waiting|on hold/i.test(label.name));
        const lane = isBlocked
            ? "blocked"
            : normalizedIssue.assignees.length > 0 ? "assigned" : "unassigned";
        return { ...normalizedIssue, lane, linkedPullRequests };
    });
}

function completeSection(data) {
    return { data: data ?? [], truncated: false };
}

async function loadSection(name, operation) {
    try {
        const { data, truncated } = await operation();
        return { name, data: data ?? [], truncated, error: null };
    } catch (error) {
        return {
            name,
            data: [],
            truncated: false,
            error: error instanceof Error ? error.message : `Unable to load ${name}.`,
        };
    }
}

export function buildDashboardPayload({ repository, viewer, sections, refreshedAt }) {
    const sectionMap = Object.fromEntries(sections.map((section) => [section.name, section]));
    const pullRequests = normalizePullRequests(
        sectionMap.pullRequests?.data ?? [],
        repository.nameWithOwner,
        repository.url,
    );

    return {
        repository,
        viewer,
        issues: normalizeIssues(sectionMap.issues?.data ?? [], pullRequests),
        pullRequests,
        runs: sectionMap.runs?.data ?? [],
        assignableUsers: (sectionMap.assignableUsers?.data ?? []).map(
            ({ login, avatar_url: avatarUrl }) => ({ login, avatarUrl }),
        ),
        agents: sectionMap.agents?.data ?? [],
        errors: Object.fromEntries(
            sections.filter((section) => section.error)
                .map((section) => [section.name, section.error]),
        ),
        truncated: Object.fromEntries(
            sections.filter((section) => section.truncated)
                .map((section) => [section.name, true]),
        ),
        refreshedAt,
    };
}

export async function loadDashboard() {
    const [repositoryView, viewer] = await Promise.all([
        runGhJson(["repo", "view", "--json", "nameWithOwner,url,defaultBranchRef"]),
        runGhJson(["api", "user"]),
    ]);
    const repo = repositoryView.nameWithOwner;

    const sections = await Promise.all([
        loadSection("issues", () =>
            loadPaginatedConnection(repo, "issues", ISSUES_QUERY),
        ),
        loadSection("pullRequests", () =>
            loadPaginatedConnection(repo, "pullRequests", PULL_REQUESTS_QUERY),
        ),
        loadSection("runs", async () => {
            const runs = await runGhJson([
                "run", "list", "--repo", repo, "--limit", String(RUN_LIST_LIMIT),
                "--json", "databaseId,displayTitle,event,headBranch,status,conclusion,workflowName,createdAt,updatedAt,url,number",
            ]) ?? [];
            return { data: runs, truncated: runs.length >= RUN_LIST_LIMIT };
        }),
        loadSection("assignableUsers", () => loadAssignableUsers(repo)),
        loadSection("agents", async () => completeSection(await loadRepositoryAgents())),
    ]);

    return buildDashboardPayload({
        repository: {
            nameWithOwner: repo,
            url: repositoryView.url,
            defaultBranch: repositoryView.defaultBranchRef?.name ?? "",
        },
        viewer: { login: viewer.login, avatarUrl: viewer.avatar_url },
        sections,
        refreshedAt: new Date().toISOString(),
    });
}

function validateRunId(runId) {
    if (!Number.isSafeInteger(runId) || runId < 1) {
        throw new DashboardRequestError(400, "Run ID must be a positive integer.");
    }
}

function validateIssueNumber(issueNumber) {
    if (!Number.isSafeInteger(issueNumber) || issueNumber < 1) {
        throw new DashboardRequestError(400, "Issue number must be a positive integer.");
    }
}

export async function loadRepositoryName() {
    const repository = await runGhJson(["repo", "view", "--json", "nameWithOwner"]);
    return repository.nameWithOwner;
}

export async function loadAgentNames() {
    const agents = await loadRepositoryAgents();
    return new Set(agents.map((agent) => agent.name));
}

export function isNotFoundOnly(body) {
    return Boolean(body)
        && Array.isArray(body.errors)
        && body.errors.length > 0
        && body.errors.every((entry) => entry?.type === "NOT_FOUND");
}

export function selectOpenIssue(payload) {
    const node = payload?.data?.repository?.issueOrPullRequest;
    if (!node || node.__typename !== "Issue" || node.state !== "OPEN") {
        return null;
    }
    return node;
}

async function runGraphqlAllowingNotFound(args) {
    try {
        return JSON.parse(await runGh(args));
    } catch (error) {
        let body = null;
        try {
            body = JSON.parse(error?.stdout ?? "");
        } catch {
            body = null;
        }
        if (isNotFoundOnly(body)) {
            return body;
        }
        throw error;
    }
}

export async function loadOpenIssue(issueNumber) {
    validateIssueNumber(issueNumber);
    const repo = await loadRepositoryName();
    const { owner, name } = splitRepositoryName(repo);
    const payload = await runGraphqlAllowingNotFound([
        "api", "graphql",
        "-f", `owner=${owner}`,
        "-f", `name=${name}`,
        "-F", `number=${issueNumber}`,
        "-f", `query=${ISSUE_QUERY}`,
    ]);
    const issue = selectOpenIssue(payload);
    if (!issue) {
        throw new DashboardRequestError(404, `Open issue #${issueNumber} was not found.`);
    }
    return { repo, issue };
}

function stripAnsi(value) {
    return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

export function clampFailedLogs(raw) {
    const tail = raw.length > LOG_SCAN_CHARACTERS ? raw.slice(-LOG_SCAN_CHARACTERS) : raw;
    const cleaned = stripAnsi(tail);
    return {
        failedLogs: cleaned.slice(-MAX_LOG_CHARACTERS),
        logsWereTruncated: tail.length < raw.length || cleaned.length > MAX_LOG_CHARACTERS,
    };
}

async function loadFailedLogs(runId, repo) {
    try {
        const raw = await runGh([
            "run", "view", String(runId), "--repo", repo, "--log-failed",
        ]);
        return { ...clampFailedLogs(raw), logError: null };
    } catch (error) {
        return {
            failedLogs: "",
            logsWereTruncated: false,
            logError: error instanceof Error ? error.message : "Failed logs are unavailable.",
        };
    }
}

export async function loadRunDetails(runId) {
    validateRunId(runId);
    const repo = await loadRepositoryName();
    const run = await runGhJson([
        "run", "view", String(runId), "--repo", repo,
        "--json", "databaseId,displayTitle,event,headBranch,headSha,status,conclusion,workflowName,createdAt,updatedAt,url,jobs",
    ]);
    const logs = await loadFailedLogs(runId, repo);

    const { jobs = [], ...runSummary } = run;
    return {
        run: runSummary,
        failedJobs: jobs
            .filter((job) => job.conclusion === "failure")
            .map((job) => ({
                ...job,
                failedSteps: (job.steps ?? []).filter((step) => step.conclusion === "failure"),
            })),
        ...logs,
        logCharacterLimit: MAX_LOG_CHARACTERS,
    };
}

export async function assignIssue(issueNumber, assignee) {
    validateIssueNumber(issueNumber);
    if (typeof assignee !== "string" || !GITHUB_LOGIN_PATTERN.test(assignee)) {
        throw new DashboardRequestError(400, "Assignee must be a valid GitHub login.");
    }

    const repo = await loadRepositoryName();
    await runGh([
        "issue", "edit", String(issueNumber),
        "--repo", repo,
        "--add-assignee", assignee,
    ]);

    return {
        issueNumber,
        assignee,
        message: `Assigned #${issueNumber} to @${assignee}.`,
    };
}
