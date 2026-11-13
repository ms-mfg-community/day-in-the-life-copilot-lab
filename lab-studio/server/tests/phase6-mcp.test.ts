import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bridge, type McpServerInfo } from "../src/copilot-bridge.js";
import { registerRoutes } from "../src/routes.js";
import { resetSandbox } from "../src/sandbox.js";
import { runTerminalLine } from "../src/sim-terminal.js";

// The real SDK metadata shape; "pending" and source "config" were also
// observed by starting a real CopilotBridge session during this QA stage.
function metadata(
  mcpServers: McpServerInfo[],
): NonNullable<ReturnType<typeof bridge.getMeta>> {
  return {
    sessionId: "phase6-test",
    model: null,
    selectedAgent: null,
    agents: [],
    skills: [],
    mcpServers,
    instructionSnapshot: [],
    startedAt: Date.now(),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Phase 6 MCP details alias", () => {
  it("mcpGet.configuredServer.selectsItsDetailsAndPreservesShowCompatibility", () => {
    vi.spyOn(bridge, "getMeta").mockReturnValue(
      metadata([
        { name: "lab-docs", status: "connected", source: "config", toolCount: 2 },
        { name: "other-server", status: "pending", source: "config" },
      ]),
    );

    const get = runTerminalLine("/mcp get lab-docs", "copilot");

    expect(get.blocks).toMatchObject([
      { text: "lab-docs", tone: "accent" },
      { text: "  status: connected", tone: "success" },
      { text: "  source: config" },
      { text: "  tools:  2" },
    ]);
    expect(get.blocks.some((block) => block.sim)).toBe(false);
    expect(get).not.toHaveProperty("action");
    expect(get.blocks).toEqual(
      runTerminalLine("/mcp show lab-docs", "copilot").blocks,
    );
  });

  it("terminalHttp.mcpGet.usesRefreshedRpcMetadataAndHandlesMissingName", async () => {
    resetSandbox();
    let current = metadata([]);
    vi.spyOn(bridge, "hasSession", "get").mockReturnValue(true);
    vi.spyOn(bridge, "getMeta").mockImplementation(() => current);
    // Only the SDK RPC boundary is stubbed; the HTTP route and CLI parser run.
    vi.spyOn(bridge, "refreshFromRpc").mockImplementation(async () => {
      current = metadata([
        { name: "lab-docs", status: "pending", source: "config" },
      ]);
    });
    const app = Fastify();
    registerRoutes(app);
    try {
      const response = await app.inject({
        method: "POST",
        url: "/api/terminal",
        payload: { line: "/mcp get lab-docs", mode: "copilot" },
      });
      expect(response.statusCode).toBe(200);
      expect(response.json<unknown>()).toEqual({
        blocks: [
          { text: "lab-docs", tone: "accent" },
          { text: "  status: pending", tone: "normal" },
          { text: "  source: config" },
          { text: "  tools:  unknown" },
        ],
        mode: "copilot",
      });
      const missingName = await app.inject({
        method: "POST",
        url: "/api/terminal",
        payload: { line: "/mcp get", mode: "copilot" },
      });
      expect(missingName.json<unknown>()).toEqual({
        blocks: [
          {
            text: "mcp server '' is not configured in this session",
            tone: "error",
          },
        ],
        mode: "copilot",
      });
    } finally {
      await app.close();
    }
  });
});
