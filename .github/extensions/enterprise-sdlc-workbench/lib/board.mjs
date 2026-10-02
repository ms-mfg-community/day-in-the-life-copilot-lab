// lib/board.mjs — builds the SDLC board data shown by the `sdlc-board`
// canvas: the EPIC-001 issue graph, dependency edges, linked PRs/checks, and
// recent workflow runs.
//
// Dry-run / fixture mode is the default and requires no network access or
// `gh` auth: it reads a frozen JSON snapshot shipped with the extension.
// Live mode shells out to `gh` via lib/exec.mjs for whatever repo the canvas
// is actually opened against -- it must never hardcode the EPIC-001 issue
// numbers; those only ever appear in the fixture file itself.

import { readFile } from "node:fs/promises";
import { runJson } from "./exec.mjs";

export const MODE_FIXTURE = "fixture";
export const MODE_LIVE = "live";
const GH_TIMEOUT_MS = 15_000;
const RECENT_RUN_LIMIT = 10;
const EPIC_FIELDS = "number,title,state,labels,url,body,subIssues";
const ISSUE_FIELDS = "number,title,state,labels,url,body,closedByPullRequestsReferences";
const PR_FIELDS = "number,title,state,url,mergedAt,statusCheckRollup";

/**
 * @param {string} fixturePath - absolute path to fixtures/epic-001-board.json
 */
export async function loadFixtureBoard(fixturePath) {
    const raw = await readFile(fixturePath, "utf8");
    const data = JSON.parse(raw);
    return { mode: MODE_FIXTURE, ...data };
}

/**
 * Builds a board for whatever repo/issue the canvas was opened against.
 * Never references EPIC-001 issue numbers -- `epicNumber` is supplied by the
 * caller (typically the issue the session is linked to).
 *
 * @param {{ repo: string, epicNumber?: number }} params
 */
export async function loadLiveBoard({ repo, epicNumber, runJsonImpl = runJson }) {
    if (!repo || typeof repo !== "string" || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
        throw new Error("loadLiveBoard requires a repo in 'owner/name' form");
    }
    if (!Number.isInteger(epicNumber) || epicNumber < 1) {
        throw new Error("loadLiveBoard requires a positive epicNumber");
    }

    const epicResult = await queryIssue({ repo, number: epicNumber, fields: EPIC_FIELDS, runJsonImpl });
    if (!epicResult.ok) {
        return {
            mode: MODE_LIVE,
            sourceRepo: repo,
            capturedAt: new Date().toISOString(),
            degraded: true,
            error: epicResult.error ?? epicResult.stderr ?? "gh issue view failed",
            issues: [],
            recentRuns: [],
        };
    }

    const epic = normalizeIssue(epicResult.data);
    const childSpecs = extractChildIssueSpecs(epicResult.data);
    const issueResults = await Promise.all(
        childSpecs.map(({ number, dependsOn }) =>
            loadLiveIssue({ repo, number, fallbackDependencies: dependsOn, runJsonImpl }),
        ),
    );
    const runResult = await queryRecentRuns({ repo, runJsonImpl });
    const issues = issueResults.filter((result) => result.issue).map((result) => result.issue);
    const errors = issueResults.flatMap((result) => result.error ? [result.error] : []);
    if (!runResult.ok) errors.push(runResult.error ?? runResult.stderr ?? "gh run list failed");

    return {
        mode: MODE_LIVE,
        sourceRepo: repo,
        capturedAt: new Date().toISOString(),
        degraded: errors.length > 0,
        errors,
        epic,
        issues,
        recentRuns: normalizeRuns(runResult),
    };
}

function queryIssue({ repo, number, fields, runJsonImpl }) {
    return runJsonImpl(
        "gh",
        ["issue", "view", String(number), "--repo", repo, "--json", fields],
        { timeoutMs: GH_TIMEOUT_MS },
    );
}

function queryRecentRuns({ repo, runJsonImpl }) {
    return runJsonImpl(
        "gh",
        [
            "run",
            "list",
            "--repo",
            repo,
            "--limit",
            String(RECENT_RUN_LIMIT),
            "--json",
            "workflowName,status,conclusion,createdAt,url",
        ],
        { timeoutMs: GH_TIMEOUT_MS },
    );
}

function normalizeRuns(result) {
    if (!result.ok) return [];
    return (result.data ?? []).map((run) => ({
        workflow: run.workflowName,
        status: String(run.status ?? "").toLowerCase(),
        conclusion: String(run.conclusion ?? "").toLowerCase(),
        createdAt: run.createdAt,
        url: run.url,
    }));
}

function extractChildIssueSpecs(epic) {
    const subIssues = epic?.subIssues?.nodes ?? [];
    const specs = new Map(
        subIssues
            .filter((issue) => Number.isInteger(issue.number))
            .map((issue) => [issue.number, { number: issue.number, dependsOn: [] }]),
    );
    const childPattern = /^-\s*\[[ xX]\]\s*#(\d+)\b([^\n]*)/gm;
    for (const match of String(epic?.body ?? "").matchAll(childPattern)) {
        const number = Number(match[1]);
        specs.set(number, { number, dependsOn: extractDependencies(match[2]) });
    }
    return [...specs.values()];
}

async function loadLiveIssue({ repo, number, fallbackDependencies, runJsonImpl }) {
    const issueResult = await queryIssue({ repo, number, fields: ISSUE_FIELDS, runJsonImpl });
    if (!issueResult.ok) {
        return { error: `issue #${number}: ${issueResult.error ?? issueResult.stderr ?? "query failed"}` };
    }

    const prNumbers = [
        ...new Set(
            (issueResult.data.closedByPullRequestsReferences ?? [])
                .map((pr) => pr.number)
                .filter(Number.isInteger),
        ),
    ];
    const prResults = await Promise.all(prNumbers.map((prNumber) =>
        runJsonImpl(
            "gh",
            ["pr", "view", String(prNumber), "--repo", repo, "--json", PR_FIELDS],
            { timeoutMs: GH_TIMEOUT_MS },
        ),
    ));
    const { linkedPRs, checks } = normalizePullRequests(prResults);
    const bodyDependencies = extractDependencies(issueResult.data.body);

    return {
        issue: {
            ...normalizeIssue(issueResult.data),
            dependsOn: bodyDependencies.length > 0 ? bodyDependencies : fallbackDependencies,
            linkedPRs,
            checks,
        },
    };
}

function normalizePullRequests(prResults) {
    const linkedPRs = [];
    const checks = [];
    for (const prResult of prResults) {
        if (!prResult.ok) continue;
        linkedPRs.push({
            number: prResult.data.number,
            title: prResult.data.title,
            state: prResult.data.mergedAt ? "merged" : String(prResult.data.state ?? "").toLowerCase(),
            url: prResult.data.url,
        });
        for (const check of prResult.data.statusCheckRollup ?? []) {
            checks.push({
                name: check.name ?? check.context ?? "unnamed check",
                conclusion: String(check.conclusion ?? check.state ?? check.status ?? "unknown").toLowerCase(),
            });
        }
    }
    return { linkedPRs, checks };
}

function normalizeIssue(issue) {
    return {
        number: issue?.number,
        title: issue?.title,
        state: String(issue?.state ?? "").toLowerCase(),
        labels: (issue?.labels ?? []).map((label) => typeof label === "string" ? label : label.name),
        url: issue?.url,
    };
}

function extractDependencies(body) {
    const dependencies = new Set();
    for (const match of String(body ?? "").matchAll(/depends on ([^)\n.]+)/gi)) {
        const text = match[1];
        for (const range of text.matchAll(/#(\d+)\s*-\s*#?(\d+)/g)) {
            const start = Number(range[1]);
            const end = Number(range[2]);
            for (let value = start; value <= end; value += 1) dependencies.add(value);
        }
        for (const reference of text.matchAll(/#(\d+)/g)) dependencies.add(Number(reference[1]));
    }
    return [...dependencies];
}

/**
 * Derives a simple dependency-ready/blocked view used by the board renderer:
 * an issue is "ready" if open and every `dependsOn` entry is closed.
 */
/**
 * The Lab 26 hands-on exercise: filter the board's issues down to those
 * carrying a given label. Small and additive on purpose -- learners wire
 * this into a real `filter_by_label` canvas action rather than working
 * against a deliberately-broken canvas.
 *
 * @param {{issues: Array<object>}} board
 * @param {string} label
 */
export function filterByLabel(board, label) {
    if (!label) return board.issues ?? [];
    const needle = label.toLowerCase();
    return (board.issues ?? []).filter((issue) => (issue.labels ?? []).some((l) => l.toLowerCase() === needle));
}

export function computeReadiness(board) {
    const byNumber = new Map((board.issues ?? []).map((issue) => [issue.number, issue]));
    return (board.issues ?? []).map((issue) => {
        const blockers = (issue.dependsOn ?? []).filter((depNumber) => {
            const dep = byNumber.get(depNumber);
            return !dep || dep.state !== "closed";
        });
        return {
            number: issue.number,
            ready: issue.state === "open" && blockers.length === 0,
            blockedBy: blockers,
        };
    });
}
