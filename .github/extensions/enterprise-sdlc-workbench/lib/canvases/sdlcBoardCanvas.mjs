// lib/canvases/sdlcBoardCanvas.mjs — the primary canvas: EPIC-001 issue
// graph, dependency readiness, linked PRs/checks, and dry-run-by-default
// dispatch. Fixture mode (the default) needs no `gh` auth; live mode reads
// whatever repo/epic the canvas is opened against.

import crypto from "node:crypto";
import { loadFixtureBoard, loadLiveBoard, computeReadiness, filterByLabel } from "../board.mjs";
import { dispatch } from "../dispatch.mjs";
import { renderBoard } from "../render.mjs";
import { startInstanceServer } from "../httpCanvasServer.mjs";

export function buildSdlcBoardCanvas({ fixturePath }) {
    const instances = new Map(); // instanceId -> { state, server }

    async function refreshBoard(state) {
        state.board =
            state.mode === "live"
                ? await loadLiveBoard({ repo: state.repo, epicNumber: state.epicNumber })
                : await loadFixtureBoard(fixturePath);
        state.readiness = computeReadiness(state.board);
        state.repo ??= state.board.sourceRepo;
        state.revision += 1;
    }

    function requireInstance(instanceId) {
        const entry = instances.get(instanceId);
        if (!entry) throw new Error("canvas instance not open -- call open() first");
        return entry;
    }

    function requireToken(entry, token) {
        if (token !== entry.state.token) {
            throw new Error("invalid capability token for this canvas instance");
        }
    }

    return {
        id: "sdlc-board",
        displayName: "SDLC board",
        description: "EPIC-001 issue graph: dependency readiness, linked PRs/checks, dry-run dispatch.",
        inputSchema: {
            type: "object",
            properties: {
                repo: { type: "string", description: "owner/name repo to query in live mode" },
                epicNumber: { type: "integer" },
                mode: { enum: ["fixture", "live"] },
            },
        },
        actions: [
            {
                name: "refresh",
                description: "Reload board data from the current mode (fixture snapshot or live gh query).",
                handler: async (ctx) => {
                    const entry = requireInstance(ctx.instanceId);
                    await refreshBoard(entry.state);
                    return {
                        mode: entry.state.board.mode,
                        issueCount: entry.state.board.issues?.length ?? 0,
                        refreshUrl: entry.server.url,
                    };
                },
            },
            {
                name: "filter_by_label",
                description: "Return the subset of board issues carrying the given label.",
                inputSchema: {
                    type: "object",
                    required: ["label"],
                    properties: { label: { type: "string" } },
                },
                handler: async (ctx) => {
                    const entry = requireInstance(ctx.instanceId);
                    entry.state.activeLabel = ctx.input.label;
                    entry.state.revision += 1;
                    return {
                        issues: filterByLabel(entry.state.board, entry.state.activeLabel),
                        refreshUrl: entry.server.url,
                    };
                },
            },
            {
                name: "dispatch",
                description:
                    "Record a dry-run (default) or real assignment/audit comment on an issue, keyed by correlation key. Requires the per-instance capability token shown in the rendered board.",
                inputSchema: {
                    type: "object",
                    required: [
                        "issueNumber",
                        "correlationKey",
                        "agentPreset",
                        "presetVersion",
                        "executionLocation",
                        "capabilityToken",
                    ],
                    properties: {
                        issueNumber: { type: "integer" },
                        correlationKey: { type: "string" },
                        agentPreset: { type: "string" },
                        presetVersion: { type: "string" },
                        executionLocation: { type: "string", enum: ["local", "cloud", "remote"] },
                        assignee: { type: "string" },
                        note: { type: "string" },
                        dryRun: { type: "boolean" },
                        capabilityToken: { type: "string" },
                    },
                },
                handler: async (ctx) => {
                    const entry = requireInstance(ctx.instanceId);
                    requireToken(entry, ctx.input.capabilityToken);
                    return dispatch({
                        repo: entry.state.repo,
                        issueNumber: ctx.input.issueNumber,
                        correlationKey: ctx.input.correlationKey,
                        agentPreset: ctx.input.agentPreset,
                        presetVersion: ctx.input.presetVersion,
                        executionLocation: ctx.input.executionLocation,
                        assignee: ctx.input.assignee,
                        note: ctx.input.note,
                        dryRun: ctx.input.dryRun ?? true,
                    });
                },
            },
        ],
        open: async (ctx) => {
            let entry = instances.get(ctx.instanceId);
            if (!entry) {
                const state = {
                    mode: ctx.input?.mode ?? "fixture",
                    repo: ctx.input?.repo,
                    epicNumber: ctx.input?.epicNumber,
                    token: crypto.randomUUID(),
                    activeLabel: "",
                    revision: 0,
                };
                await refreshBoard(state);
                const server = await startInstanceServer(() =>
                    renderBoard({
                        board: {
                            ...state.board,
                            issues: filterByLabel(state.board, state.activeLabel),
                        },
                        readiness: state.readiness,
                        token: state.token,
                        revision: state.revision,
                    }),
                );
                entry = { state, server };
                instances.set(ctx.instanceId, entry);
            }
            return { title: "SDLC board", url: entry.server.url };
        },
        onClose: async (ctx) => {
            const entry = instances.get(ctx.instanceId);
            if (entry) {
                instances.delete(ctx.instanceId);
                await entry.server.close();
            }
        },
    };
}
