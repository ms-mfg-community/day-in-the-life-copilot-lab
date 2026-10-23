export interface TermBlock {
  text: string;
  tone?: "normal" | "error" | "dim" | "accent" | "success";
  sim?: boolean;
}

export type TermEntry =
  | { kind: "cmd"; mode: "shell" | "copilot"; line: string }
  | { kind: "out"; blocks: TermBlock[] }
  | { kind: "stream"; text: string; active: boolean }
  | {
      kind: "tool";
      title: string;
      detail: string;
      running: boolean;
      success?: boolean;
    }
  | { kind: "skill"; name: string };

export interface TreeNode {
  name: string;
  path: string;
  kind: "file" | "dir";
  children?: TreeNode[];
}

export interface SessionMeta {
  active: boolean;
  busy: boolean;
  sessionId: string | null;
  selectedAgent: string | null;
  model: string | null;
  agents: { name: string; description: string }[];
  skills: { name: string; description: string; source: string }[];
  mcpServers: { name: string; status: string; toolCount?: number }[];
  instructions: { path: string; scope: string; exists: boolean }[];
}

export type StepKind = "read" | "live" | "sim" | "mixed";

export interface VerifyState {
  pass: boolean;
  message: string;
}
