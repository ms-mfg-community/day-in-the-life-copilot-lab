import type { FastifyInstance } from "fastify";
import { bridge, type StudioEvent } from "./copilot-bridge.js";
import {
  ensureSandbox,
  fileExists,
  readTree,
  readWorkspaceFile,
  resetSandbox,
  writeWorkspaceFile,
} from "./sandbox.js";
import { runTerminalLine, type TermBlock } from "./sim-terminal.js";
import { runVerify } from "./verify.js";

interface TerminalBody {
  line: string;
  mode: "shell" | "copilot";
}

function metaSummaryBlocks(): TermBlock[] {
  const meta = bridge.getMeta();
  if (!meta) return [];
  return [
    {
      text: `Session ready — ${meta.agents.length} custom agents · ${meta.skills.length} skills · ${meta.mcpServers.length} MCP servers · ${meta.instructionSnapshot.filter((s) => s.exists).length} instruction sources`,
      tone: "success",
    },
    {
      text: "Type a prompt, or try /agent, /skills list, /mcp list, /instructions, /exit.",
      tone: "dim",
    },
  ];
}

export function registerRoutes(app: FastifyInstance): void {
  app.get("/api/health", async () => {
    ensureSandbox();
    return {
      ok: true,
      sandboxReady: true,
      sessionActive: bridge.hasSession,
      busy: bridge.isBusy,
    };
  });

  app.post("/api/sandbox/reset", async () => {
    await bridge.endSession();
    resetSandbox();
    return { ok: true };
  });

  app.get("/api/sandbox/tree", async () => {
    ensureSandbox();
    return { tree: readTree() };
  });

  app.get<{ Querystring: { path: string } }>(
    "/api/sandbox/file",
    async (req, reply) => {
      const { path } = req.query;
      if (!path || !fileExists(path)) {
        return reply.code(404).send({ error: `File not found: ${path ?? ""}` });
      }
      return { path, content: readWorkspaceFile(path) };
    },
  );

  app.put<{ Body: { path: string; content: string } }>(
    "/api/sandbox/file",
    async (req, reply) => {
      const { path, content } = req.body;
      if (!path) return reply.code(400).send({ error: "path is required" });
      writeWorkspaceFile(path, content);
      return { ok: true };
    },
  );

  app.get("/api/session/meta", async () => {
    const meta = bridge.getMeta();
    return {
      active: bridge.hasSession,
      busy: bridge.isBusy,
      sessionId: meta?.sessionId ?? null,
      selectedAgent: meta?.selectedAgent ?? null,
      model: meta?.model ?? null,
      agents: meta?.agents ?? [],
      skills: meta?.skills ?? [],
      mcpServers: meta?.mcpServers ?? [],
      instructions: meta?.instructionSnapshot ?? [],
    };
  });

  app.post<{ Body: TerminalBody }>("/api/terminal", async (req) => {
    ensureSandbox();
    const { line, mode } = req.body;
    // Slash commands that report session state answer from live RPC data.
    if (
      mode === "copilot" &&
      /^\/(skills|mcp|agent|env)\b/.test(line.trim()) &&
      bridge.hasSession
    ) {
      await bridge.refreshFromRpc();
    }
    const result = runTerminalLine(line, mode);

    if (!("action" in result)) return { blocks: result.blocks, mode };

    switch (result.action) {
      case "enter-copilot": {
        try {
          await bridge.startSession();
          return {
            blocks: [...result.blocks, ...metaSummaryBlocks()],
            mode: "copilot",
          };
        } catch (error) {
          return {
            blocks: [
              ...result.blocks,
              {
                text: `Could not start a Copilot session: ${error instanceof Error ? error.message : String(error)}`,
                tone: "error",
              },
              {
                text: "Is Copilot CLI authenticated on this machine? Run `copilot login` in a real terminal once.",
                tone: "dim",
              },
            ],
            mode: "shell",
          };
        }
      }
      case "exit-copilot": {
        await bridge.endSession();
        return { blocks: result.blocks, mode: "shell" };
      }
      case "new-session": {
        try {
          await bridge.startSession();
          return {
            blocks: [...result.blocks, ...metaSummaryBlocks()],
            mode: "copilot",
          };
        } catch (error) {
          return {
            blocks: [
              {
                text: `Restart failed: ${error instanceof Error ? error.message : String(error)}`,
                tone: "error",
              },
            ],
            mode: "copilot",
          };
        }
      }
      case "select-agent": {
        try {
          const freshSession = !bridge.hasSession;
          if (freshSession) await bridge.startSession();
          await bridge.selectAgent(result.agent);
          return {
            blocks: [
              ...result.blocks,
              ...(freshSession ? metaSummaryBlocks() : []),
              {
                text: `Agent '${result.agent}' selected — its system prompt now steers every reply.`,
                tone: "success",
              },
            ],
            mode: "copilot",
          };
        } catch {
          return {
            blocks: [
              {
                text: `Custom agent '${result.agent}' not found in this session.`,
                tone: "error",
              },
              {
                text: "Agents are discovered once at session start. If you just created the file, restart with /new.",
                tone: "dim",
              },
            ],
            mode: "copilot",
          };
        }
      }
      case "prompt": {
        try {
          const freshSession = !bridge.hasSession;
          if (freshSession) await bridge.startSession();
          if (result.agent) await bridge.selectAgent(result.agent);
          // Fire and forget — the reply streams over /api/events.
          void bridge.sendPrompt(result.prompt).catch(() => undefined);
          return {
            blocks: [
              ...result.blocks,
              ...(freshSession ? metaSummaryBlocks() : []),
              ...(result.agent
                ? [
                    {
                      text: `Agent '${result.agent}' selected.`,
                      tone: "success" as const,
                    },
                  ]
                : []),
            ],
            mode: "copilot",
            streaming: true,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          const agentMissing = result.agent && /not found/i.test(message);
          return {
            blocks: [
              {
                text: agentMissing
                  ? `Custom agent '${result.agent}' not found in this session.`
                  : message,
                tone: "error",
              },
              ...(agentMissing
                ? [
                    {
                      text: "Agents are discovered once at session start. If you just created the file, restart with /new.",
                      tone: "dim" as const,
                    },
                  ]
                : []),
            ],
            mode: "copilot",
          };
        }
      }
    }
  });

  app.post<{ Body: { id: string } }>("/api/verify", async (req) => {
    ensureSandbox();
    return runVerify(req.body.id);
  });

  app.get("/api/events", (req, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    reply.raw.write(": connected\n\n");
    const send = (event: StudioEvent): void => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const unsubscribe = bridge.subscribe(send);
    const ping = setInterval(() => reply.raw.write(": ping\n\n"), 15000);
    req.raw.on("close", () => {
      clearInterval(ping);
      unsubscribe();
    });
  });
}
