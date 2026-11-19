// lib/dispatch.mjs — records an "assignment"/dispatch decision as an audit
// comment on a GitHub issue, keyed by the correlation key so re-running the
// same dispatch updates the existing comment instead of posting a
// duplicate.
//
// Dry-run is the default: `dispatch()` never calls `gh` unless the caller
// passes `{ dryRun: false }` explicitly. This mirrors the "two distinct,
// separately-confirmed actions" rule used for release publishing -- a
// learner (or a bug) can't accidentally post to a real issue.

import { createHash } from "node:crypto";
import { runJson, run } from "./exec.mjs";
import { isValidCorrelationKey } from "./correlation.mjs";

const MARKER_SCHEMA = "v1";

/**
 * ghcp-was-here: the idempotency marker is a best-effort guard, not a lock.
 * Two dispatches racing for the same correlation key can both observe "no
 * existing marker" and both post, producing two comments. Known ceiling;
 * upgrade path is a server-side lock (e.g. a dedicated coordination issue
 * label, or a small external mutex) if concurrent dispatch ever matters.
 */
export function buildMarker(correlationKey) {
    const hash = createHash("sha256").update(correlationKey).digest("hex").slice(0, 16);
    return `<!-- enterprise-sdlc-workbench:dispatch:${MARKER_SCHEMA}:${hash} -->`;
}

function inlineCode(value) {
    return String(value).replace(/`/g, "\\`");
}

function renderCommentBody({
    correlationKey,
    assignee,
    note,
    agentPreset,
    presetVersion,
    executionLocation,
    timestamp,
}) {
    const marker = buildMarker(correlationKey);
    const lines = [
        marker,
        `**Dispatch recorded** via the Lab 26 enterprise-sdlc-workbench canvas.`,
        `- Correlation key: \`${inlineCode(correlationKey)}\``,
        `- Agent preset: \`${inlineCode(agentPreset)}\``,
        `- Preset/bundle version: \`${inlineCode(presetVersion)}\``,
        `- Execution location: \`${inlineCode(executionLocation)}\``,
        `- Timestamp: \`${inlineCode(timestamp)}\``,
        assignee ? `- Assignee: ${assignee}` : null,
        note ? `- Note: ${note}` : null,
    ].filter(Boolean);
    return lines.join("\n");
}

/**
 * @param {{ repo: string, issueNumber: number, correlationKey: string, agentPreset: string, presetVersion: string, executionLocation: string, timestamp?: string, assignee?: string, note?: string, dryRun?: boolean }} params
 */
export async function dispatch({
    repo,
    issueNumber,
    correlationKey,
    agentPreset,
    presetVersion,
    executionLocation,
    timestamp = new Date().toISOString(),
    assignee,
    note,
    dryRun = true,
}) {
    if (!isValidCorrelationKey(correlationKey)) {
        throw new Error(`dispatch() requires a valid correlation key, got "${correlationKey}"`);
    }
    if (!repo || !issueNumber) {
        throw new Error("dispatch() requires repo and issueNumber");
    }
    for (const [name, value] of Object.entries({ agentPreset, presetVersion, executionLocation })) {
        if (!value || typeof value !== "string") {
            throw new Error(`dispatch() requires ${name}`);
        }
    }
    if (Number.isNaN(Date.parse(timestamp))) {
        throw new Error(`dispatch() requires an ISO timestamp, got "${timestamp}"`);
    }

    const body = renderCommentBody({
        correlationKey,
        assignee,
        note,
        agentPreset,
        presetVersion,
        executionLocation,
        timestamp,
    });
    const marker = buildMarker(correlationKey);

    if (dryRun) {
        return { dryRun: true, repo, issueNumber, correlationKey, marker, body, applied: false };
    }

    const existing = await findExistingComment({ repo, issueNumber, marker });
    if (existing) {
        const result = await run(
            "gh",
            ["api", `repos/${repo}/issues/comments/${existing.id}`, "-X", "PATCH", "-f", `body=${body}`],
            { timeoutMs: 15_000 },
        );
        return { dryRun: false, repo, issueNumber, correlationKey, marker, applied: result.ok, updated: true, error: result.ok ? undefined : result.error };
    }

    const result = await run("gh", ["issue", "comment", String(issueNumber), "--repo", repo, "--body", body], {
        timeoutMs: 15_000,
    });
    return { dryRun: false, repo, issueNumber, correlationKey, marker, applied: result.ok, updated: false, error: result.ok ? undefined : result.error };
}

async function findExistingComment({ repo, issueNumber, marker }) {
    const result = await runJson(
        "gh",
        ["api", `repos/${repo}/issues/${issueNumber}/comments`, "--paginate"],
        { timeoutMs: 15_000 },
    );
    if (!result.ok || !Array.isArray(result.data)) return null;
    return result.data.find((comment) => typeof comment.body === "string" && comment.body.includes(marker)) ?? null;
}
