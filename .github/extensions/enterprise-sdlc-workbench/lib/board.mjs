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
export async function loadLiveBoard({ repo, epicNumber }) {
    if (!repo || typeof repo !== "string") {
        throw new Error("loadLiveBoard requires a repo in 'owner/name' form");
    }

    const listArgs = [
        "issue",
        "list",
        "--repo",
        repo,
        "--state",
        "all",
        "--limit",
        "100",
        "--json",
        "number,title,state,labels,url",
    ];

    const result = await runJson("gh", listArgs, { timeoutMs: 15_000 });
    if (!result.ok) {
        return {
            mode: MODE_LIVE,
            sourceRepo: repo,
            capturedAt: new Date().toISOString(),
            degraded: true,
            error: result.error ?? result.stderr ?? "gh issue list failed",
            issues: [],
        };
    }

    const issues = (result.data ?? []).map((issue) => ({
        number: issue.number,
        title: issue.title,
        state: String(issue.state ?? "").toLowerCase(),
        labels: (issue.labels ?? []).map((label) => label.name),
        dependsOn: [],
        linkedPRs: [],
        checks: [],
        url: issue.url,
    }));

    return {
        mode: MODE_LIVE,
        sourceRepo: repo,
        capturedAt: new Date().toISOString(),
        degraded: false,
        epic: epicNumber ? { number: epicNumber } : undefined,
        issues,
    };
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
            return dep ? dep.state !== "closed" : false;
        });
        return {
            number: issue.number,
            ready: issue.state === "open" && blockers.length === 0,
            blockedBy: blockers,
        };
    });
}
