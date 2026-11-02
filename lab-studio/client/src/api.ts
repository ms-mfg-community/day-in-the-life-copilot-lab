import type {
  GitHubState,
  SessionMeta,
  TermBlock,
  TreeNode,
  VerifyState,
} from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () =>
    fetch("/api/health").then((r) =>
      json<{ ok: boolean; sessionActive: boolean; busy: boolean }>(r),
    ),

  resetSandbox: () =>
    fetch("/api/sandbox/reset", { method: "POST" }).then((r) =>
      json<{ ok: boolean }>(r),
    ),

  tree: () =>
    fetch("/api/sandbox/tree").then((r) => json<{ tree: TreeNode[] }>(r)),

  readFile: (path: string) =>
    fetch(`/api/sandbox/file?path=${encodeURIComponent(path)}`).then((r) =>
      json<{ path: string; content: string }>(r),
    ),

  writeFile: (path: string, content: string) =>
    fetch("/api/sandbox/file", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    }).then((r) => json<{ ok: boolean }>(r)),

  terminal: (line: string, mode: "shell" | "copilot") =>
    fetch("/api/terminal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ line, mode }),
    }).then((r) =>
      json<{
        blocks: TermBlock[];
        mode: "shell" | "copilot";
        streaming?: boolean;
      }>(r),
    ),

  sessionMeta: () =>
    fetch("/api/session/meta").then((r) => json<SessionMeta>(r)),

  verify: (id: string) =>
    fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).then((r) => json<VerifyState>(r)),

  github: () => fetch("/api/github").then((r) => json<GitHubState>(r)),

  githubOp: (op: string, payload: Record<string, unknown> = {}) =>
    fetch("/api/github/op", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op, ...payload }),
    }).then((r) => json<{ ok: boolean }>(r)),
};
