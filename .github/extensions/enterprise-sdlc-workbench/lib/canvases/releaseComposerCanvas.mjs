// lib/canvases/releaseComposerCanvas.mjs — drafts a handoff/release-notes
// markdown from completed issues and merged PRs. "Compose", "save", and
// "publish" are three distinct actions: composing never touches disk,
// saving never touches GitHub, and publishing requires an already-saved
// draft plus the per-instance capability token.

import crypto from "node:crypto";
import { composeHandoffMarkdown, saveDraft, readDraftForPublish } from "../releaseComposer.mjs";
import { renderReleaseComposer } from "../render.mjs";
import { startInstanceServer } from "../httpCanvasServer.mjs";
import { run } from "../exec.mjs";

export function buildReleaseComposerCanvas({ repoRoot }) {
    const instances = new Map();

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
        id: "release-composer",
        displayName: "Release composer",
        description:
            "Drafts a handoff/release-notes markdown from completed issues and merged PRs; opt-in save under docs/releases/.",
        actions: [
            {
                name: "compose",
                description: "Compose a draft handoff markdown from the given issues/PRs. Does not write anything.",
                inputSchema: {
                    type: "object",
                    required: ["title", "correlationKey"],
                    properties: {
                        title: { type: "string" },
                        correlationKey: { type: "string" },
                        issues: { type: "array", items: { type: "object" } },
                        pullRequests: { type: "array", items: { type: "object" } },
                    },
                },
                handler: async (ctx) => {
                    const entry = requireInstance(ctx.instanceId);
                    entry.state.draft = composeHandoffMarkdown(ctx.input);
                    entry.state.revision += 1;
                    return { draft: entry.state.draft, refreshUrl: entry.server.url };
                },
            },
            {
                name: "save_draft",
                description:
                    "Opt-in: save the current composed draft under docs/releases/. Never silently overwrites. Requires the per-instance capability token.",
                inputSchema: {
                    type: "object",
                    required: ["filename", "capabilityToken"],
                    properties: {
                        filename: { type: "string" },
                        overwrite: { type: "boolean" },
                        capabilityToken: { type: "string" },
                    },
                },
                handler: async (ctx) => {
                    const entry = requireInstance(ctx.instanceId);
                    requireToken(entry, ctx.input.capabilityToken);
                    if (!entry.state.draft) throw new Error("nothing composed yet -- call compose first");
                    return saveDraft({
                        repoRoot,
                        filename: ctx.input.filename,
                        content: entry.state.draft,
                        overwrite: ctx.input.overwrite ?? false,
                    });
                },
            },
            {
                name: "publish",
                description:
                    "Opt-in and distinct from save: posts a previously saved draft as a comment on the given issue. Requires the per-instance capability token.",
                inputSchema: {
                    type: "object",
                    required: ["filename", "repo", "issueNumber", "capabilityToken"],
                    properties: {
                        filename: { type: "string" },
                        repo: { type: "string" },
                        issueNumber: { type: "integer" },
                        capabilityToken: { type: "string" },
                    },
                },
                handler: async (ctx) => {
                    const entry = requireInstance(ctx.instanceId);
                    requireToken(entry, ctx.input.capabilityToken);
                    const body = await readDraftForPublish({ repoRoot, filename: ctx.input.filename });
                    const result = await run(
                        "gh",
                        ["issue", "comment", String(ctx.input.issueNumber), "--repo", ctx.input.repo, "--body", body],
                        { timeoutMs: 15_000 },
                    );
                    return { applied: result.ok, error: result.ok ? undefined : result.error };
                },
            },
        ],
        open: async (ctx) => {
            let entry = instances.get(ctx.instanceId);
            if (!entry) {
                const state = { token: crypto.randomUUID(), draft: "", revision: 0 };
                const server = await startInstanceServer(() =>
                    renderReleaseComposer({
                        draft: state.draft,
                        token: state.token,
                        revision: state.revision,
                    }),
                );
                entry = { state, server };
                instances.set(ctx.instanceId, entry);
            }
            return { title: "Release composer", url: entry.server.url };
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
