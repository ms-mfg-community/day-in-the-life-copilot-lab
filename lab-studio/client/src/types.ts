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
  | { kind: "skill"; name: string }
  | {
      kind: "hook";
      hookType: string;
      toolName?: string;
      running: boolean;
      success?: boolean;
    }
  | {
      kind: "subagent";
      agentName: string;
      running: boolean;
      failed?: boolean;
      toolCalls?: number;
    };

// ------------------------------------------------- simulated GitHub surface

export interface GhIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  state: "open" | "closed";
  linkedBranch?: string;
  statusUpdates: { text: string; at: number }[];
}

export interface GhFileChange {
  path: string;
  before: string | null;
  after: string | null;
}

export interface GhPull {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  draft: boolean;
  head: string;
  base: string;
  labels: string[];
  reviewers: string[];
  files: GhFileChange[];
  commits: { message: string; at: number }[];
  comments: { author: string; body: string; at: number }[];
  reviews: { author: string; body: string; at: number }[];
  linkedIssue?: number;
}

export interface GhRun {
  id: number;
  workflow: string;
  event: string;
  branch: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure";
  steps: { name: string; status: string; log: string[] }[];
  startedAt: number;
}

export interface GhRuleset {
  name: string;
  active: boolean;
  requirePullRequest: boolean;
  autoRequestCopilotReview: boolean;
  reviewDrafts: boolean;
  reviewNewPushes: boolean;
}

export interface GitHubState {
  branches: string[];
  issues: GhIssue[];
  pulls: GhPull[];
  runs: GhRun[];
  secrets: string[];
  settings: {
    actionsCanCreatePRs: boolean;
    codingAgentEnabled: boolean;
    issuesEnabled: boolean;
    rulesets: GhRuleset[];
  };
  platformBusy: boolean;
}

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
