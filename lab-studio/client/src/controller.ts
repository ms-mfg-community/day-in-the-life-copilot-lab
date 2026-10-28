import { api } from "./api";
import { useStudio } from "./store";
import type { TermEntry } from "./types";

/** Imperative glue between the terminal UI, the server API, and the SSE stream. */

let eventSource: EventSource | null = null;

export function connectEvents(): void {
  if (eventSource) return;
  eventSource = new EventSource("/api/events");
  eventSource.onopen = () => {
    // On (re)connect, resync busy/session state — the server may have restarted.
    void api
      .sessionMeta()
      .then((meta) => {
        useStudio.getState().setCopilotBusy(meta.busy);
        useStudio.getState().setSessionMeta(meta);
        if (!meta.active) useStudio.getState().setTermMode("shell");
      })
      .catch(() => undefined);
  };
  eventSource.onmessage = (msg) => {
    const event = JSON.parse(msg.data) as Record<string, unknown> & {
      kind: string;
    };
    const { updateEntries, setCopilotBusy, setSessionMeta } =
      useStudio.getState();
    switch (event.kind) {
      case "delta": {
        const text = String(event.text ?? "");
        if (!text) break;
        updateEntries((entries) => {
          const last = entries[entries.length - 1];
          if (last?.kind === "stream" && last.active) {
            return [
              ...entries.slice(0, -1),
              { ...last, text: last.text + text },
            ];
          }
          return [...entries, { kind: "stream", text, active: true }];
        });
        break;
      }
      case "message": {
        // Authoritative full text for the current reply segment.
        const text = String(event.text ?? "");
        updateEntries((entries) => {
          const last = entries[entries.length - 1];
          if (last?.kind === "stream" && last.active) {
            return [
              ...entries.slice(0, -1),
              { kind: "stream", text, active: false },
            ];
          }
          return [...entries, { kind: "stream", text, active: false }];
        });
        break;
      }
      case "tool-start":
        updateEntries((entries) => [
          ...finalizeStream(entries),
          {
            kind: "tool",
            title: String(event.toolTitle ?? event.toolName ?? "tool"),
            detail: summarizeArgs(event.toolName as string, event.args),
            running: true,
          },
        ]);
        break;
      case "tool-done":
        updateEntries((entries) => {
          const idx = entries.map((e) => e.kind).lastIndexOf("tool");
          if (idx === -1) return entries;
          const tool = entries[idx] as Extract<TermEntry, { kind: "tool" }>;
          if (!tool.running) return entries;
          const next = [...entries];
          next[idx] = {
            ...tool,
            running: false,
            success: Boolean(event.success),
          };
          return next;
        });
        break;
      case "skill-invoked":
        updateEntries((entries) => [
          ...finalizeStream(entries),
          { kind: "skill", name: String(event.name ?? "") },
        ]);
        break;
      case "hook": {
        if (event.phase === "start") {
          updateEntries((entries) => [
            ...finalizeStream(entries),
            {
              kind: "hook",
              hookType: String(event.hookType ?? "hook"),
              toolName:
                typeof event.toolName === "string" ? event.toolName : undefined,
              running: true,
            },
          ]);
        } else {
          updateEntries((entries) => {
            const idx = entries.map((e) => e.kind).lastIndexOf("hook");
            if (idx === -1) return entries;
            const hook = entries[idx] as Extract<TermEntry, { kind: "hook" }>;
            if (!hook.running) return entries;
            const next = [...entries];
            next[idx] = {
              ...hook,
              running: false,
              success: event.success !== false,
            };
            return next;
          });
        }
        break;
      }
      case "subagent-start":
        updateEntries((entries) => [
          ...finalizeStream(entries),
          {
            kind: "subagent",
            agentName: String(event.agentName ?? "subagent"),
            running: true,
          },
        ]);
        break;
      case "subagent-done":
        updateEntries((entries) => {
          let idx = -1;
          for (let i = entries.length - 1; i >= 0; i--) {
            const e = entries[i];
            if (
              e?.kind === "subagent" &&
              e.agentName === String(event.agentName ?? "") &&
              e.running
            ) {
              idx = i;
              break;
            }
          }
          if (idx === -1) return entries;
          const run = entries[idx] as Extract<TermEntry, { kind: "subagent" }>;
          const next = [...entries];
          next[idx] = {
            ...run,
            running: false,
            failed: Boolean(event.failed),
            toolCalls: Number(event.toolCalls ?? 0),
          };
          return next;
        });
        break;
      case "github-updated":
        void refreshGithub();
        void refreshTree();
        break;
      case "busy":
        setCopilotBusy(Boolean(event.busy));
        break;
      case "idle":
        setCopilotBusy(false);
        updateEntries(finalizeStream);
        void refreshMeta();
        break;
      case "error":
        setCopilotBusy(false);
        updateEntries((entries) => [
          ...finalizeStream(entries),
          {
            kind: "out",
            blocks: [
              {
                text: `error: ${String(event.message ?? "unknown")}`,
                tone: "error",
              },
            ],
          },
        ]);
        break;
      case "session-started":
      case "session-ended":
      case "meta-updated":
        void refreshMeta();
        break;
      default:
        break;
    }
  };
}

function finalizeStream(entries: TermEntry[]): TermEntry[] {
  const last = entries[entries.length - 1];
  if (last?.kind === "stream" && last.active) {
    return [...entries.slice(0, -1), { ...last, active: false }];
  }
  return entries;
}

function summarizeArgs(toolName: string | undefined, args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const record = args as Record<string, unknown>;
  const interesting =
    record.path ??
    record.pattern ??
    record.command ??
    record.query ??
    record.topic ??
    record.file ??
    "";
  const text =
    typeof interesting === "string"
      ? interesting
      : JSON.stringify(record).slice(0, 80);
  const shortened = text.length > 72 ? `…${text.slice(-70)}` : text;
  return toolName?.startsWith("lab-docs-")
    ? `${toolName} ${shortened}`
    : shortened;
}

export async function refreshMeta(): Promise<void> {
  try {
    const meta = await api.sessionMeta();
    useStudio.getState().setSessionMeta(meta);
  } catch {
    // Server unreachable — the health banner handles this.
  }
}

export async function refreshGithub(): Promise<void> {
  try {
    const state = await api.github();
    useStudio.getState().setGithub(state);
  } catch {
    // ignore
  }
}

export async function refreshTree(): Promise<void> {
  try {
    const { tree } = await api.tree();
    useStudio.getState().setTree(tree);
  } catch {
    // ignore
  }
}

/** Run a line as if typed into the terminal (used by both the input and Run buttons). */
export async function runLine(line: string): Promise<void> {
  const state = useStudio.getState();
  if (state.termBusy) return;
  const mode = state.termMode;
  state.pushEntries([{ kind: "cmd", mode, line }]);

  if (mode === "shell" && line.trim() === "clear") {
    useStudio.getState().updateEntries(() => []);
    return;
  }

  state.setTermBusy(true);
  try {
    const result = await api.terminal(line, mode);
    const { pushEntries, setTermMode } = useStudio.getState();
    if (result.blocks.length > 0)
      pushEntries([{ kind: "out", blocks: result.blocks }]);
    setTermMode(result.mode);
    void refreshMeta();
    void refreshTree();
  } catch (error) {
    useStudio.getState().pushEntries([
      {
        kind: "out",
        blocks: [
          {
            text: error instanceof Error ? error.message : String(error),
            tone: "error",
          },
        ],
      },
    ]);
  } finally {
    useStudio.getState().setTermBusy(false);
  }
}

/**
 * Run a sequence of lines, waiting for Copilot to go idle between prompts.
 * Used by the manual's "Run" buttons so a card can e.g. start a session, then prompt.
 */
export async function runSequence(lines: string[]): Promise<void> {
  for (const line of lines) {
    await waitForCopilotIdle();
    await runLine(line);
  }
}

/**
 * Restart (or start) the Copilot session, then run the given session lines.
 * From the shell this types `copilot`; inside a session it types `/new` —
 * the two restart paths the labs teach.
 */
export async function runRestartSequence(lines: string[]): Promise<void> {
  const mode = useStudio.getState().termMode;
  const first = mode === "copilot" ? "/new" : "copilot";
  await runSequence([first, ...lines]);
}

function waitForCopilotIdle(): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      const { copilotBusy, termBusy } = useStudio.getState();
      if (!copilotBusy && !termBusy) {
        resolve();
      } else {
        setTimeout(check, 250);
      }
    };
    check();
  });
}

export async function openWorkspaceFile(
  path: string,
  proposedContent?: string,
): Promise<void> {
  const store = useStudio.getState();
  try {
    const { content } = await api.readFile(path);
    store.openFile(path, content);
  } catch {
    store.openFile(path, proposedContent ?? "");
    if (proposedContent !== undefined)
      store.setFileContent(proposedContent, true);
  }
}

export async function insertFile(path: string, content: string): Promise<void> {
  await api.writeFile(path, content);
  await refreshTree();
  useStudio.getState().openFile(path, content);
}

export async function saveOpenFile(): Promise<void> {
  const { selectedFile, fileContent, setFileContent } = useStudio.getState();
  if (!selectedFile) return;
  await api.writeFile(selectedFile, fileContent);
  setFileContent(fileContent, false);
  await refreshTree();
}
