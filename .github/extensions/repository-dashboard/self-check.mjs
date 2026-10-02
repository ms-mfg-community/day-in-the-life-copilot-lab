import assert from "node:assert/strict";

import { renderDashboardHtml } from "./dashboard-html.mjs";
import { DASHBOARD_SCRIPT } from "./dashboard-script.mjs";
import {
    canvasUrl,
    parseAuthorizedRequestUrl,
} from "./request-security.mjs";
import { extractReferencedIssues, flattenGraphqlPages } from "./github-data.mjs";

new Function(DASHBOARD_SCRIPT);

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

assert.throws(
    () => parseAuthorizedRequestUrl({
        url: "/",
        headers: {},
    }, "test-token"),
    (error) => error.statusCode === 403
        && error.message === "The canvas security token is missing or invalid.",
);

assert.throws(
    () => parseAuthorizedRequestUrl({
        url: "http://[::1",
        headers: { "x-canvas-token": "test-token" },
    }, "test-token"),
    (error) => error.statusCode === 400
        && error.message === "Request URL is malformed.",
);

assert.match(
    DASHBOARD_SCRIPT,
    /fetchDashboard\(\) \{[\s\S]*requestJson\("\/api\/dashboard"/,
);
assert.match(DASHBOARD_SCRIPT, /"X-Canvas-Token": config\.token/);

assert.match(DASHBOARD_SCRIPT, /const FILTER_DEBOUNCE_DELAY_MS = \d+;/);
assert.match(DASHBOARD_SCRIPT, /clearTimeout\(filterRenderTimeout\)/);
assert.match(
    DASHBOARD_SCRIPT,
    /setTimeout\(\(\) => \{[\s\S]*render\(\);[\s\S]*\}, FILTER_DEBOUNCE_DELAY_MS\)/,
);
assert.match(
    DASHBOARD_SCRIPT,
    /setSelectionRange\(selectionStart, selectionEnd, selectionDirection\)/,
);
assert.match(
    DASHBOARD_SCRIPT,
    /addEventListener\("input", \(event\) => \{\s*scheduleFilterRender\(event\.target\);\s*\}\)/,
);
assert.match(
    DASHBOARD_SCRIPT,
    /state\.activeTab === id \? ' aria-current="page"' : ""/,
);

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
