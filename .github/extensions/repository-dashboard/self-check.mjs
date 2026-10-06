import assert from "node:assert/strict";

import { renderDashboardHtml } from "./dashboard-html.mjs";
import { DASHBOARD_SCRIPT } from "./dashboard-script.mjs";
import {
    canvasUrl,
    parseAuthorizedRequestUrl,
} from "./request-security.mjs";
import {
    assignIssue,
    extractReferencedIssues,
    flattenGraphqlPages,
    loadRunDetails,
} from "./github-data.mjs";

const HOSTILE_HTML = '<img src=x onerror="alert(1)">';
const HOSTILE_SCRIPT = "</script><script>alert(2)</script>";
const DEBOUNCE_OBSERVATION_DELAY_MS = 60;
const DEBOUNCE_SETTLE_DELAY_MS = 400;
const DASHBOARD_SCOPE_EXPORTS = `
return {
  escapeHtml, renderRunDetails, metric, render, state, scheduleFilterRender,
};`;

function createElementStub() {
    return {
        innerHTML: "",
        textContent: "",
        className: "",
        value: "",
        hidden: false,
        disabled: false,
        dataset: {},
        parentElement: null,
        addEventListener() {},
        append() {},
        remove() {},
        focus() {},
        setSelectionRange() {},
        querySelector: () => null,
        querySelectorAll: () => [],
    };
}

function createDocumentStub(app) {
    return {
        body: createElementStub(),
        createElement: () => createElementStub(),
        querySelector: (selector) => (selector === "#app" ? app : null),
        querySelectorAll: () => [],
    };
}

function hostileDashboard() {
    const actor = { login: HOSTILE_HTML, avatarUrl: HOSTILE_HTML };
    return {
        repository: {
            nameWithOwner: HOSTILE_HTML,
            url: "https://github.com/example/dashboard",
            defaultBranch: HOSTILE_SCRIPT,
        },
        viewer: { login: HOSTILE_HTML },
        issues: [{
            number: 1,
            title: HOSTILE_HTML,
            url: "https://github.com/example/dashboard/issues/1",
            body: `${HOSTILE_SCRIPT} ${HOSTILE_HTML}`,
            updatedAt: "2026-01-01T00:00:00Z",
            lane: "unassigned",
            labels: [{ name: HOSTILE_HTML }],
            assignees: [actor],
            linkedPullRequests: [{ number: 2, title: HOSTILE_HTML, url: "https://x.test/2", isDraft: true }],
        }],
        pullRequests: [{
            number: 2,
            title: HOSTILE_HTML,
            url: "https://github.com/example/dashboard/pull/2",
            isDraft: false,
            reviewDecision: HOSTILE_HTML,
            headRefName: HOSTILE_HTML,
            baseRefName: HOSTILE_SCRIPT,
            labels: [{ name: HOSTILE_HTML }],
            assignees: [actor],
            relatedIssueNumbers: [1],
            checks: { total: 1, passed: 0, failed: 1, pending: 0 },
        }],
        runs: [{
            databaseId: 42,
            number: 7,
            workflowName: HOSTILE_HTML,
            displayTitle: HOSTILE_HTML,
            event: HOSTILE_SCRIPT,
            headBranch: HOSTILE_HTML,
            status: "completed",
            conclusion: "failure",
            createdAt: "2026-01-01T00:00:00Z",
            url: "https://github.com/example/dashboard/actions/runs/42",
        }],
        assignableUsers: [{ login: HOSTILE_HTML }],
        agents: [{ name: HOSTILE_HTML }],
        errors: { issues: HOSTILE_HTML },
        refreshedAt: "2026-01-01T00:00:00Z",
    };
}

async function instantiateDashboard(dashboard) {
    const app = createElementStub();
    const requests = [];
    const factory = new Function(
        "document",
        "globalThis",
        "fetch",
        DASHBOARD_SCRIPT + DASHBOARD_SCOPE_EXPORTS,
    );
    const scope = factory(
        createDocumentStub(app),
        { __REPOSITORY_DASHBOARD__: { token: "test-token" } },
        async (url, options) => {
            requests.push({ url, options });
            return { ok: true, json: async () => dashboard };
        },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    return { app, scope, requests };
}

function countOccurrences(haystack, needle) {
    return haystack.split(needle).length - 1;
}

function assertNoLiveMarkup(label, html) {
    assert.ok(html.length > 0, `${label} rendered nothing.`);
    assert.equal(
        /<\/?\s*(?:img|script|svg|iframe|object|embed)\b/i.test(html),
        false,
        `${label} emitted unescaped attacker markup.`,
    );
    for (const payload of [HOSTILE_HTML, HOSTILE_SCRIPT]) {
        assert.equal(
            html.includes(payload),
            false,
            `${label} echoed an attacker payload verbatim.`,
        );
    }
}

const dashboard = hostileDashboard();
const { app, scope, requests } = await instantiateDashboard(dashboard);

// The renderer must escape every untrusted field it interpolates.
assert.equal(scope.escapeHtml('<&>"\''), "&lt;&amp;&gt;&quot;&#039;");
assert.equal(scope.escapeHtml(null), "");
assertNoLiveMarkup("Overview tab", app.innerHTML);
assert.ok(app.innerHTML.includes("&lt;img"), "Overview tab did not escape issue content.");
assert.equal(countOccurrences(app.innerHTML, 'aria-current="page"'), 1);

scope.state.activeTab = "issues";
scope.render();
assertNoLiveMarkup("Issues tab", app.innerHTML);
assert.equal(countOccurrences(app.innerHTML, 'aria-current="page"'), 1);

scope.state.activeTab = "pullRequests";
scope.render();
assertNoLiveMarkup("Pull requests tab", app.innerHTML);
assert.equal(countOccurrences(app.innerHTML, 'aria-current="page"'), 1);

scope.state.activeTab = "runs";
scope.render();
assertNoLiveMarkup("Actions tab", app.innerHTML);
assert.equal(countOccurrences(app.innerHTML, 'aria-current="page"'), 1);

scope.state.activeTab = "overview";
scope.render();

// Failed-run details are rendered from CI output that contributors can influence.
assertNoLiveMarkup("Run details", scope.renderRunDetails({
    failedJobs: [{
        name: HOSTILE_HTML,
        url: "https://github.com/example/dashboard/actions/runs/42/job/1",
        failedSteps: [{ name: HOSTILE_SCRIPT, conclusion: HOSTILE_HTML }],
    }],
    failedLogs: `${HOSTILE_SCRIPT}\n${HOSTILE_HTML}`,
    logsWereTruncated: true,
    logError: null,
}));
assertNoLiveMarkup("Run details log error", scope.renderRunDetails({
    failedJobs: [],
    failedLogs: "",
    logsWereTruncated: false,
    logError: HOSTILE_HTML,
}));

// Every browser request must carry the canvas token.
assert.equal(requests.length > 0, true, "The dashboard never requested its data.");
for (const request of requests) {
    assert.equal(request.options.headers["X-Canvas-Token"], "test-token");
}
assert.equal(requests[0].url, "/api/dashboard");

// Filtering is debounced rather than re-rendering on every keystroke.
scope.state.filter = "";
scope.scheduleFilterRender({
    value: "needle",
    selectionStart: 6,
    selectionEnd: 6,
    selectionDirection: "none",
});
await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_OBSERVATION_DELAY_MS));
assert.equal(scope.state.filter, "", "The filter was applied without debouncing.");
await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_SETTLE_DELAY_MS));
assert.equal(scope.state.filter, "needle", "The debounced filter never applied.");
scope.state.filter = "";
scope.render();

const html = renderDashboardHtml("test-token");
assert.match(html, /Repository dashboard/);
assert.match(html, /Assign work/);
assert.match(html, /Recommend fix/);
assert.match(html, /Local session/);
assert.match(html, /Cloud session/);
assert.match(html, /test-token/);

const authorizedUrl = parseAuthorizedRequestUrl({
    url: "/api/dashboard",
    headers: { "x-canvas-token": "test-token" },
}, "test-token");
assert.equal(authorizedUrl.pathname, "/api/dashboard");

const initialUrl = canvasUrl(1234, "test-token");
assert.equal(initialUrl, "http://127.0.0.1:1234/?canvasToken=test-token");
assert.equal(parseAuthorizedRequestUrl({
    method: "GET",
    url: initialUrl,
    headers: {},
}, "test-token").pathname, "/");

assert.throws(
    () => parseAuthorizedRequestUrl({
        method: "GET",
        url: "/api/dashboard?canvasToken=test-token",
        headers: {},
    }, "test-token"),
    (error) => error.statusCode === 403,
);

for (const headerToken of [undefined, "", "wrong-token", "test-token-longer", "test-toke"]) {
    assert.throws(
        () => parseAuthorizedRequestUrl({
            url: "/",
            headers: headerToken === undefined ? {} : { "x-canvas-token": headerToken },
        }, "test-token"),
        (error) => error.statusCode === 403
            && error.message === "The canvas security token is missing or invalid.",
        `Token "${headerToken}" was accepted.`,
    );
}

assert.throws(
    () => parseAuthorizedRequestUrl({
        url: "http://[::1",
        headers: { "x-canvas-token": "test-token" },
    }, "test-token"),
    (error) => error.statusCode === 400
        && error.message === "Request URL is malformed.",
);

// Identifiers reaching the GitHub CLI are validated before any process is spawned.
for (const runId of [0, -1, 1.5, Number.NaN, "42", null, 2 ** 53]) {
    await assert.rejects(
        () => loadRunDetails(runId),
        /Run ID must be a positive integer\./,
        `Run ID ${String(runId)} was accepted.`,
    );
}

for (const assignee of [
    "--add-label", "-X", "a;whoami", "a b", "-", "", null, 12_345, { $ne: 1 },
    "a".repeat(40), "https://evil.test",
]) {
    await assert.rejects(
        () => assignIssue(1, assignee),
        /Assignee must be a valid GitHub login\./,
        `Assignee ${JSON.stringify(assignee)} was accepted.`,
    );
}

for (const issueNumber of [0, -1, 1.5, "1", null]) {
    await assert.rejects(
        () => assignIssue(issueNumber, "octocat"),
        /Issue number must be a positive integer\./,
        `Issue number ${String(issueNumber)} was accepted.`,
    );
}

assert.deepEqual(
    extractReferencedIssues(
        [
            "Same repository: https://github.com/example/dashboard/issues/12",
            "Other repository: https://github.com/other/project/issues/34",
            "Wrong host: https://example.test/example/dashboard/issues/78",
        ].join("\n"),
        [
            { number: 34, repository: { nameWithOwner: "other/project" } },
            { number: 56, repository: { nameWithOwner: "example/dashboard" } },
        ],
        "example/dashboard",
        "https://github.com/example/dashboard",
    ),
    [12, 56],
);

assert.deepEqual(
    flattenGraphqlPages(
        [
            { data: { repository: { issues: { nodes: [{ number: 1 }, { number: 2 }] } } } },
            { data: { repository: { issues: { nodes: [{ number: 3 }] } } } },
        ],
        "issues",
    ),
    [{ number: 1 }, { number: 2 }, { number: 3 }],
);
