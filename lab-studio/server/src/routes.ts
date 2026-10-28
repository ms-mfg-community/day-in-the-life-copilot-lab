import type { FastifyInstance } from "fastify";
import { execFile } from "node:child_process";
import { bridge, type StudioEvent } from "./copilot-bridge.js";
import {
  ensureSandbox,
  fileExists,
  readTree,
  readWorkspaceFile,
  resetSandbox,
  safePath,
  writeWorkspaceFile,
} from "./sandbox.js";
import {
  isPlatformBusy,
  iterateOnPull,
  runCodeReview,
  runCodingAgent,
  triggerBranchCreate,
} from "./sim-actions.js";
import { loadGitHub, mutateGitHub, type SimRuleset } from "./sim-github.js";
import { runTerminalLine, type TermBlock } from "./sim-terminal.js";
import { runVerify } from "./verify.js";

interface TerminalBody {
  line: string;
  mode: "shell" | "copilot";
}

/** Run a learner-authored hook script for real, with the event JSON on stdin. */
function runHookScript(scriptRel: string, json: string): Promise<TermBlock[]> {
  return new Promise((resolve) => {
    let script: string;
    try {
      script = safePath(scriptRel);
    } catch {
      resolve([
        { text: "hook scripts must live under scripts/hooks/", tone: "error" },
      ]);
      return;
    }
    if (!fileExists(scriptRel)) {
      resolve([{ text: `bash: ${scriptRel}: no such file`, tone: "error" }]);
      return;
    }
    const child = execFile(
      "bash",
      [script],
      { timeout: 15000, cwd: safePath(".") },
      (error, stdout, stderr) => {
        const blocks: TermBlock[] = [];
        for (const line of `${stdout}${stderr}`.split("\n")) {
          if (line.trim()) blocks.push({ text: line });
        }
        const code = error ? ((error as { code?: number }).code ?? 1) : 0;
        blocks.push({
          text: `(exit status ${code})`,
          tone: code === 0 ? "success" : "error",
        });
        resolve(blocks);
      },
    );
    child.stdin?.write(json);
    child.stdin?.end();
  });
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
      case "hook-pipe": {
        const blocks = await runHookScript(result.script, result.json);
        return { blocks, mode: "shell" };
      }
    }
  });

  app.post<{ Body: { id: string } }>("/api/verify", async (req) => {
    ensureSandbox();
    return runVerify(req.body.id);
  });

  // ------------------------------------------------- simulated GitHub surface

  app.get("/api/github", async () => {
    ensureSandbox();
    return { ...loadGitHub(), platformBusy: isPlatformBusy() };
  });

  app.post<{ Body: { op: string; [key: string]: unknown } }>(
    "/api/github/op",
    async (req, reply) => {
      ensureSandbox();
      const { op } = req.body;
      const notify = (): void => bridge.broadcast({ kind: "github-updated" });
      try {
        switch (op) {
          case "create-branch-from-issue": {
            const issueNumber = Number(req.body.issue);
            const branch = String(req.body.branch ?? "");
            if (!branch)
              return reply.code(400).send({ error: "branch required" });
            mutateGitHub((state) => {
              if (!state.branches.includes(branch)) state.branches.push(branch);
              const issue = state.issues.find((i) => i.number === issueNumber);
              if (issue) issue.linkedBranch = branch;
            });
            notify();
            void triggerBranchCreate(branch, issueNumber).catch(
              () => undefined,
            );
            return { ok: true };
          }
          case "assign-copilot": {
            const issueNumber = Number(req.body.issue);
            if (isPlatformBusy())
              return reply
                .code(409)
                .send({ error: "A platform agent is already running." });
            mutateGitHub((state) => {
              const issue = state.issues.find((i) => i.number === issueNumber);
              if (issue && !issue.assignees.includes("Copilot"))
                issue.assignees.push("Copilot");
            });
            notify();
            void runCodingAgent(issueNumber).catch(() => undefined);
            return { ok: true };
          }
          case "toggle-actions-pr": {
            mutateGitHub((state) => {
              state.settings.actionsCanCreatePRs = Boolean(req.body.value);
            });
            notify();
            return { ok: true };
          }
          case "save-ruleset": {
            const ruleset = req.body.ruleset as SimRuleset;
            mutateGitHub((state) => {
              const existing = state.settings.rulesets.findIndex(
                (r) => r.name === ruleset.name,
              );
              if (existing >= 0) state.settings.rulesets[existing] = ruleset;
              else state.settings.rulesets.push(ruleset);
            });
            notify();
            return { ok: true };
          }
          case "request-review": {
            const pr = Number(req.body.pr);
            if (isPlatformBusy())
              return reply
                .code(409)
                .send({ error: "A platform agent is already running." });
            void runCodeReview(pr).catch(() => undefined);
            return { ok: true };
          }
          case "comment-pr": {
            const pr = Number(req.body.pr);
            const body = String(req.body.body ?? "");
            if (/@copilot/i.test(body)) {
              if (isPlatformBusy())
                return reply
                  .code(409)
                  .send({ error: "A platform agent is already running." });
              void iterateOnPull(pr, body).catch(() => undefined);
            } else {
              mutateGitHub((state) => {
                state.pulls
                  .find((p) => p.number === pr)
                  ?.comments.push({ author: "you", body, at: Date.now() });
              });
              notify();
            }
            return { ok: true };
          }
          case "pr-ready": {
            mutateGitHub((state) => {
              const pull = state.pulls.find(
                (p) => p.number === Number(req.body.pr),
              );
              if (pull) pull.draft = false;
            });
            notify();
            return { ok: true };
          }
          case "close-pr": {
            mutateGitHub((state) => {
              const pull = state.pulls.find(
                (p) => p.number === Number(req.body.pr),
              );
              if (pull) {
                pull.state = "closed";
                if (req.body.deleteBranch)
                  state.branches = state.branches.filter(
                    (b) => b !== pull.head,
                  );
              }
            });
            notify();
            return { ok: true };
          }
          case "close-issue": {
            mutateGitHub((state) => {
              const issue = state.issues.find(
                (i) => i.number === Number(req.body.issue),
              );
              if (issue) issue.state = "closed";
            });
            notify();
            return { ok: true };
          }
          default:
            return reply.code(400).send({ error: `Unknown op: ${op}` });
        }
      } catch (error) {
        return reply
          .code(500)
          .send({
            error: error instanceof Error ? error.message : String(error),
          });
      }
    },
  );

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
