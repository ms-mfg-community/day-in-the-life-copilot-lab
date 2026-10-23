import {
  approveAll,
  CopilotClient,
  type CopilotSession,
} from "@github/copilot-sdk";
import { join } from "node:path";
import {
  readMcpConfig,
  SANDBOX_DIR,
  scanInstructionSources,
  type InstructionSource,
} from "./sandbox.js";

/** Normalized event pushed to the browser over SSE. */
export interface StudioEvent {
  kind:
    | "session-started"
    | "session-ended"
    | "delta"
    | "message"
    | "reasoning"
    | "tool-start"
    | "tool-done"
    | "skill-invoked"
    | "idle"
    | "busy"
    | "error"
    | "meta-updated";
  [key: string]: unknown;
}

export interface SkillInfo {
  name: string;
  description: string;
  source: string;
  path?: string;
}

export interface AgentInfo {
  name: string;
  description: string;
  tools?: string[];
}

export interface McpServerInfo {
  name: string;
  status: string;
  source: string;
  toolCount?: number;
}

interface SessionMeta {
  sessionId: string;
  model: string | null;
  selectedAgent: string | null;
  skills: SkillInfo[];
  agents: AgentInfo[];
  mcpServers: McpServerInfo[];
  /** Instruction sources snapshotted when the session started. */
  instructionSnapshot: InstructionSource[];
  startedAt: number;
}

type Listener = (event: StudioEvent) => void;

const PROMPT_TIMEOUT_MS = 240_000;

export class CopilotBridge {
  private client: CopilotClient | null = null;
  private session: CopilotSession | null = null;
  private meta: SessionMeta | null = null;
  private listeners = new Set<Listener>();
  private busy = false;
  private idleResolvers: (() => void)[] = [];
  /** History the verify checks consult. */
  readonly promptHistory: {
    prompt: string;
    agent: string | null;
    at: number;
  }[] = [];
  readonly toolCalls: { toolName: string; at: number }[] = [];
  readonly skillInvocations: { name: string; at: number }[] = [];
  sessionGeneration = 0;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: StudioEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get hasSession(): boolean {
    return this.session !== null;
  }

  getMeta(): SessionMeta | null {
    return this.meta;
  }

  private async ensureClient(): Promise<CopilotClient> {
    if (!this.client) {
      this.client = new CopilotClient({ logLevel: "error" });
      await this.client.start();
    }
    return this.client;
  }

  /** Start (or restart) the lab session against the sandbox workspace. */
  async startSession(): Promise<SessionMeta> {
    await this.endSession();
    const client = await this.ensureClient();
    const mcpServers = readMcpConfig();
    const session = await client.createSession({
      workingDirectory: SANDBOX_DIR,
      trustWorkingDirectory: "session",
      onPermissionRequest: approveAll,
      agentDirectories: [join(SANDBOX_DIR, ".github", "agents")],
      skillDirectories: [join(SANDBOX_DIR, ".github", "skills")],
      // SDK session config accepts the same shape as .copilot/mcp-config.json entries.
      mcpServers: mcpServers as never,
    });
    this.session = session;
    this.sessionGeneration += 1;
    this.meta = {
      sessionId: session.sessionId,
      model: null,
      selectedAgent: null,
      skills: [],
      agents: [],
      mcpServers: [],
      instructionSnapshot: scanInstructionSources(),
      startedAt: Date.now(),
    };
    this.wireEvents(session);
    await this.refreshFromRpc();
    this.emit({ kind: "session-started", sessionId: session.sessionId });
    return this.meta;
  }

  /**
   * Pull agents, skills and MCP state directly over session RPC. Discovery
   * events also update meta, but they arrive lazily (often on the first turn) —
   * the RPC pull makes /skills, /mcp and /agent correct right after start.
   */
  async refreshFromRpc(): Promise<void> {
    const session = this.session;
    const meta = this.meta;
    if (!session || !meta) return;
    const rpc = (
      session as unknown as {
        rpc: Record<string, Record<string, (p?: object) => Promise<unknown>>>;
      }
    ).rpc;
    await Promise.all([
      rpc.skills
        ?.list?.({})
        .then((r) => {
          const skills =
            (r as { skills?: Record<string, unknown>[] }).skills ?? [];
          meta.skills = skills.map((s) => ({
            name: String(s.name ?? ""),
            description: String(s.description ?? ""),
            source: String(s.source ?? ""),
            path: typeof s.path === "string" ? s.path : undefined,
          }));
        })
        .catch(() => undefined),
      rpc.agent
        // Without agentDirectories the RPC skips the project scan entirely.
        ?.list?.({ agentDirectories: [join(SANDBOX_DIR, ".github", "agents")] })
        .then((r) => {
          const agents =
            (r as { agents?: Record<string, unknown>[] }).agents ?? [];
          meta.agents = agents.map((a) => ({
            name: String(a.name ?? ""),
            description: String(a.description ?? ""),
            tools: Array.isArray(a.tools) ? (a.tools as string[]) : undefined,
          }));
        })
        .catch(() => undefined),
      rpc.mcp
        ?.list?.({})
        .then((r) => {
          const servers =
            (r as { servers?: Record<string, unknown>[] }).servers ?? [];
          for (const s of servers) {
            const name = String(s.name ?? "");
            const existing = meta.mcpServers.find((m) => m.name === name);
            if (existing) {
              existing.status = String(s.status ?? existing.status);
            } else {
              meta.mcpServers.push({
                name,
                status: String(s.status ?? "unknown"),
                source: "config",
              });
            }
          }
        })
        .catch(() => undefined),
    ]);
    this.emit({ kind: "meta-updated" });
  }

  private wireEvents(session: CopilotSession): void {
    session.on((event) => {
      const data = (event as { data?: unknown }).data as
        Record<string, unknown> | undefined;
      const meta = this.meta;
      switch (event.type) {
        case "assistant.message_delta":
          this.emit({
            kind: "delta",
            text: (data?.deltaContent as string) ?? "",
          });
          break;
        case "assistant.message": {
          const content = (data?.content as string) ?? "";
          if (content.trim()) this.emit({ kind: "message", text: content });
          break;
        }
        case "tool.execution_start": {
          const toolName = (data?.toolName as string) ?? "tool";
          this.toolCalls.push({ toolName, at: Date.now() });
          this.emit({
            kind: "tool-start",
            toolName,
            toolTitle: (data?.toolTitle as string) ?? toolName,
            args: data?.arguments ?? {},
          });
          break;
        }
        case "tool.execution_complete": {
          const result = data?.result as Record<string, unknown> | undefined;
          this.emit({
            kind: "tool-done",
            success: (data?.success as boolean) ?? true,
            preview:
              typeof result?.content === "string"
                ? result.content.slice(0, 200)
                : undefined,
          });
          break;
        }
        case "skill.invoked": {
          const name = (data?.name as string) ?? "";
          this.skillInvocations.push({ name, at: Date.now() });
          this.emit({ kind: "skill-invoked", name });
          break;
        }
        case "session.skills_loaded": {
          if (meta) {
            const skills = (data?.skills as Record<string, unknown>[]) ?? [];
            meta.skills = skills.map((s) => ({
              name: String(s.name ?? ""),
              description: String(s.description ?? ""),
              source: String(s.source ?? ""),
              path: typeof s.path === "string" ? s.path : undefined,
            }));
            this.emit({ kind: "meta-updated" });
          }
          break;
        }
        case "session.custom_agents_updated": {
          if (meta) {
            const agents = (data?.agents as Record<string, unknown>[]) ?? [];
            meta.agents = agents.map((a) => ({
              name: String(a.name ?? ""),
              description: String(a.description ?? ""),
              tools: Array.isArray(a.tools) ? (a.tools as string[]) : undefined,
            }));
            this.emit({ kind: "meta-updated" });
          }
          break;
        }
        case "session.mcp_servers_loaded": {
          if (meta) {
            const servers = (data?.servers as Record<string, unknown>[]) ?? [];
            meta.mcpServers = servers.map((s) => ({
              name: String(s.name ?? ""),
              status: String(s.status ?? "unknown"),
              source: String(s.source ?? "config"),
            }));
            this.emit({ kind: "meta-updated" });
          }
          break;
        }
        case "session.mcp_server_tools_loaded": {
          if (meta) {
            const name = String(data?.serverName ?? "");
            const server = meta.mcpServers.find((s) => s.name === name);
            if (server) server.toolCount = Number(data?.toolCount ?? 0);
            this.emit({ kind: "meta-updated" });
          }
          break;
        }
        case "session.model_change": {
          if (meta) {
            meta.model = String((data?.model as string) ?? meta.model ?? "");
            this.emit({ kind: "meta-updated" });
          }
          break;
        }
        case "session.error": {
          this.setBusy(false);
          this.emit({
            kind: "error",
            message: String(data?.message ?? "Session error"),
          });
          break;
        }
        case "session.idle": {
          this.setBusy(false);
          this.emit({ kind: "idle" });
          for (const resolve of this.idleResolvers.splice(0)) resolve();
          break;
        }
        default:
          break;
      }
    });
  }

  private setBusy(busy: boolean): void {
    if (this.busy !== busy) {
      this.busy = busy;
      this.emit({ kind: "busy", busy });
    }
  }

  /** Send a prompt; the reply streams to SSE subscribers. Resolves when the turn ends. */
  async sendPrompt(prompt: string): Promise<void> {
    if (!this.session) await this.startSession();
    const session = this.session;
    if (!session) throw new Error("No Copilot session");
    if (this.busy)
      throw new Error("Copilot is still working on the previous prompt");
    this.promptHistory.push({
      prompt,
      agent: this.meta?.selectedAgent ?? null,
      at: Date.now(),
    });
    this.setBusy(true);
    const idle = new Promise<void>((resolve) =>
      this.idleResolvers.push(resolve),
    );
    const timeout = new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error("Copilot timed out after 4 minutes")),
        PROMPT_TIMEOUT_MS,
      ),
    );
    try {
      await session.send({ prompt });
      await Promise.race([idle, timeout]);
    } catch (error) {
      this.setBusy(false);
      this.emit({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async selectAgent(name: string): Promise<void> {
    if (!this.session) await this.startSession();
    const session = this.session;
    if (!session) throw new Error("No Copilot session");
    const rpc = (
      session as unknown as {
        rpc: { agent: { select: (p: { name: string }) => Promise<void> } };
      }
    ).rpc;
    await rpc.agent.select({ name });
    if (this.meta) {
      this.meta.selectedAgent = name;
      this.emit({ kind: "meta-updated" });
    }
  }

  clearSelectedAgent(): void {
    if (this.meta) {
      this.meta.selectedAgent = null;
      this.emit({ kind: "meta-updated" });
    }
  }

  async endSession(): Promise<void> {
    const session = this.session;
    this.session = null;
    this.meta = null;
    this.busy = false;
    if (session) {
      try {
        await session.disconnect();
      } catch {
        // Session already gone — nothing to clean up.
      }
      this.emit({ kind: "session-ended" });
    }
  }

  async shutdown(): Promise<void> {
    await this.endSession();
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
  }
}

export const bridge = new CopilotBridge();
