// lib/canvases/codeMapCanvas.mjs — reference canvas: the live
// dotnet/ContosoUniversity.sln project list, so the SDLC board's issue
// graph can be grounded against the real solution structure.

import crypto from "node:crypto";
import { parseSolution } from "../codeMap.mjs";
import { renderCodeMap } from "../render.mjs";
import { startInstanceServer } from "../httpCanvasServer.mjs";

export function buildCodeMapCanvas({ repoRoot }) {
    const instances = new Map();
    const slnPath = `${repoRoot}/dotnet/ContosoUniversity.sln`;

    async function refresh(state) {
        state.codeMap = await parseSolution(slnPath);
    }

    return {
        id: "code-map",
        displayName: "Code map",
        description: "Parses dotnet/ContosoUniversity.sln into the live project list for this repo.",
        actions: [
            {
                name: "refresh",
                description: "Re-parse the solution file.",
                handler: async (ctx) => {
                    const entry = instances.get(ctx.instanceId);
                    if (!entry) throw new Error("canvas instance not open -- call open() first");
                    await refresh(entry.state);
                    return {
                        projectCount: entry.state.codeMap.projects.length,
                        malformedCount: entry.state.codeMap.malformedCount,
                    };
                },
            },
        ],
        open: async (ctx) => {
            let entry = instances.get(ctx.instanceId);
            if (!entry) {
                const state = { token: crypto.randomUUID() };
                await refresh(state);
                const server = await startInstanceServer(() =>
                    renderCodeMap({ codeMap: state.codeMap, token: state.token }),
                );
                entry = { state, server };
                instances.set(ctx.instanceId, entry);
            }
            return { title: "Code map", url: entry.server.url };
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
