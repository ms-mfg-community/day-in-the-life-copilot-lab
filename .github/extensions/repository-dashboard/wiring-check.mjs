import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";

import { createApiRoutes } from "./api-routes.mjs";
import { createDashboardServer } from "./http-handler.mjs";
import { resolveApprovedKickoff } from "./kickoff-approval.mjs";
import { previewDigest } from "./prompt-builder.mjs";
import { DASHBOARD_CSP } from "./request-security.mjs";
import { MAX_REQUEST_BYTES } from "./request-validation.mjs";

const LEAKY_ERROR = "secret C:\\Users\\someone\\repo";
const GOOD_DIGEST = "a".repeat(64);
const DASHBOARD_BUDGET = 12;
const REQUEST_TIMEOUT_MS = 3_000;

// The approval gate sits between the browser and Copilot, so it is exercised with injected loaders.
const preview = "preview text";
const loaders = (agents = ["reviewer"]) => ({
    loadPreview: async () => ({ repo: "o/r", issue: { number: 7 }, preview, digest: previewDigest(preview) }),
    loadAgents: async () => new Set(agents),
});
const approvedInput = { executionLocation: "local", kickoffDigest: previewDigest(preview) };

const approved = await resolveApprovedKickoff(7, approvedInput, loaders());
assert.equal(approved.agent, "default");
await assert.rejects(
    resolveApprovedKickoff(7, { ...approvedInput, kickoffDigest: GOOD_DIGEST }, loaders()),
    (error) => error.statusCode === 409,
    "A stale kickoff digest was approved.",
);
await assert.rejects(
    resolveApprovedKickoff(7, { ...approvedInput, executionLocation: "mars" }, loaders()),
    (error) => error.statusCode === 400,
    "An unknown execution location was approved.",
);
await assert.rejects(
    resolveApprovedKickoff(7, { ...approvedInput, agent: "--evil" }, loaders()),
    (error) => error.statusCode === 400,
    "An agent outside the repository list was approved.",
);
assert.equal(
    (await resolveApprovedKickoff(7, { ...approvedInput, agent: "reviewer" }, loaders())).agent,
    "reviewer",
);

// The real HTTP server runs with stubbed actions so every guard in front of them is observable.
const calls = { assign: [], start: [] };
let releaseRecommend;
const recommendGate = new Promise((resolve) => { releaseRecommend = resolve; });
const actions = {
    loadDashboard: async () => ({ ok: true }),
    loadRunDetails: async () => {
        throw new Error(LEAKY_ERROR);
    },
    loadKickoffPreview: async () => ({ issue: { number: 7 }, preview, digest: previewDigest(preview) }),
    recommendRunFix: async () => recommendGate.then(() => ({ recommendation: "done" })),
    startIssueWork: async (id, input) => {
        calls.start.push([id, input]);
        return { started: id };
    },
    assignIssue: async (id, assignee) => {
        calls.assign.push([id, assignee]);
        return { assigned: assignee };
    },
};
const { server, url } = await createDashboardServer({
    instanceId: "wiring-check",
    routes: createApiRoutes(actions),
});
const base = new URL(url);
const token = base.searchParams.get("canvasToken");

function send({ method = "GET", path = "/", headers = {}, body }) {
    return new Promise((resolve, reject) => {
        const req = httpRequest(
            { host: base.hostname, port: base.port, method, path, headers },
            (res) => {
                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    text: Buffer.concat(chunks).toString("utf8"),
                }));
            },
        );
        req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error("The request timed out.")));
        req.on("error", reject);
        req.end(body);
    });
}
const authed = (extra = {}) => ({ "x-canvas-token": token, ...extra });
const post = (path, body) => send({
    method: "POST",
    path,
    headers: authed({ "content-type": "application/json" }),
    body: typeof body === "string" ? body : JSON.stringify(body),
});

try {
    const page = await send({ path: `/?canvasToken=${token}` });
    assert.equal(page.status, 200);
    assert.equal(page.headers["content-security-policy"], DASHBOARD_CSP, "The CSP header was not sent.");
    assert.equal(page.headers["referrer-policy"], "no-referrer");

    assert.equal((await send({ path: "/api/dashboard" })).status, 403, "A tokenless API call was served.");
    assert.equal(
        (await send({ path: "/api/dashboard", headers: authed({ host: "evil.example" }) })).status,
        403,
        "A foreign Host header was served.",
    );
    assert.equal((await send({ path: "/api/nope", headers: authed() })).status, 404);

    const failure = await send({ path: "/api/runs/1", headers: authed() });
    assert.equal(failure.status, 500);
    assert.ok(!failure.text.includes("secret"), "An internal error message reached the client.");

    const malformed = await post("/api/issues/7/start", "{not json");
    assert.equal(malformed.status, 400);
    assert.ok(!/Unexpected token|JSON\.parse/.test(malformed.text), "A raw parser message reached the client.");
    assert.equal((await post("/api/issues/7/start", { executionLocation: "local" })).status, 400);
    assert.equal(
        (await post("/api/issues/7/start", "x".repeat(MAX_REQUEST_BYTES + 1))).status,
        413,
        "An oversized body was not rejected with 413.",
    );
    assert.equal(calls.start.length, 0, "A rejected body still reached the start action.");

    const started = await post("/api/issues/7/start", { executionLocation: "local", kickoffDigest: GOOD_DIGEST });
    assert.equal(started.status, 200);
    assert.deepEqual(calls.start, [[7, { executionLocation: "local", kickoffDigest: GOOD_DIGEST }]]);

    assert.equal((await post("/api/issues/7/assign", { assignee: "octocat", issueNumber: 1 })).status, 400);
    assert.equal(calls.assign.length, 0, "A body with an unsupported field reached the assign action.");
    assert.equal((await post("/api/issues/7/assign", { assignee: "octocat" })).status, 200);

    // Only one recommendation per run may be in flight, and the second caller is told so.
    const first = post("/api/runs/9/recommend", {});
    const second = await post("/api/runs/9/recommend", {});
    assert.equal(second.status, 409, "A duplicate expensive request was not rejected.");
    releaseRecommend();
    assert.equal((await first).status, 200);

    const statuses = [];
    for (let attempt = 0; attempt <= DASHBOARD_BUDGET; attempt += 1) {
        statuses.push((await send({ path: "/api/dashboard", headers: authed() })).status);
    }
    assert.equal(statuses.at(-1), 429, "The dashboard route budget was never enforced.");
} finally {
    releaseRecommend();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
}
