import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { join, relative } from "node:path";
import {
  fileExists,
  readWorkspaceFile,
  SANDBOX_DIR,
  safePath,
  writeWorkspaceFile,
} from "./sandbox.js";

/**
 * Simulated GitHub: issues, branches, pull requests, Actions runs, and the
 * repository settings labs 08-09 teach. Everything lives in the sandbox at
 * .sim/github.json so "Reset workspace" clears it. The AI work inside runs
 * (PRD generation, the coding agent, code review) is real Copilot — only the
 * GitHub plumbing around it is simulated.
 */

export interface SimIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  state: "open" | "closed";
  linkedBranch?: string;
  statusUpdates: { text: string; at: number }[];
}

export interface SimFileChange {
  path: string;
  before: string | null;
  after: string | null;
}

export interface SimPull {
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  draft: boolean;
  head: string;
  base: string;
  labels: string[];
  reviewers: string[];
  files: SimFileChange[];
  commits: { message: string; at: number }[];
  comments: { author: string; body: string; at: number }[];
  reviews: { author: string; body: string; at: number }[];
  linkedIssue?: number;
}

export interface SimRunStep {
  name: string;
  status: "queued" | "in_progress" | "completed" | "skipped";
  log: string[];
}

export interface SimRun {
  id: number;
  workflow: string;
  event: string;
  branch: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure";
  steps: SimRunStep[];
  startedAt: number;
}

export interface SimRuleset {
  name: string;
  active: boolean;
  requirePullRequest: boolean;
  autoRequestCopilotReview: boolean;
  reviewDrafts: boolean;
  reviewNewPushes: boolean;
}

export interface SimGitHubState {
  branches: string[];
  issues: SimIssue[];
  pulls: SimPull[];
  runs: SimRun[];
  secrets: string[];
  settings: {
    actionsCanCreatePRs: boolean;
    codingAgentEnabled: boolean;
    issuesEnabled: boolean;
    rulesets: SimRuleset[];
  };
  counters: { issue: number; pull: number; run: number };
}

const STATE_PATH = ".sim/github.json";

function emptyState(): SimGitHubState {
  return {
    branches: [],
    issues: [],
    pulls: [],
    runs: [],
    secrets: [],
    settings: {
      actionsCanCreatePRs: false,
      codingAgentEnabled: true,
      issuesEnabled: true,
      rulesets: [],
    },
    counters: { issue: 0, pull: 0, run: 0 },
  };
}

export function loadGitHub(): SimGitHubState {
  if (!fileExists(STATE_PATH)) return emptyState();
  try {
    return {
      ...emptyState(),
      ...(JSON.parse(readWorkspaceFile(STATE_PATH)) as SimGitHubState),
    };
  } catch {
    return emptyState();
  }
}

export function saveGitHub(state: SimGitHubState): void {
  writeWorkspaceFile(STATE_PATH, JSON.stringify(state, null, 2));
}

export function mutateGitHub<T>(fn: (state: SimGitHubState) => T): T {
  const state = loadGitHub();
  const result = fn(state);
  saveGitHub(state);
  return result;
}

// ------------------------------------------------------------- workspace diff

const SKIP_DIRS = new Set([".sim", "node_modules", ".git"]);
const MAX_SNAPSHOT_FILE = 200_000;

/** Snapshot every text file in the sandbox (path → content). */
export function snapshotWorkspace(): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name) || entry.name === ".DS_Store") continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && statSync(abs).size <= MAX_SNAPSHOT_FILE) {
        files.set(relative(SANDBOX_DIR, abs), readFileSync(abs, "utf8"));
      }
    }
  };
  walk(SANDBOX_DIR);
  return files;
}

/** Changed / created / deleted files relative to a snapshot. */
export function diffAgainstSnapshot(
  snapshot: Map<string, string>,
): SimFileChange[] {
  const current = snapshotWorkspace();
  const changes: SimFileChange[] = [];
  for (const [path, after] of current) {
    const before = snapshot.get(path);
    if (before === undefined) changes.push({ path, before: null, after });
    else if (before !== after) changes.push({ path, before, after });
  }
  for (const [path, before] of snapshot) {
    if (!current.has(path)) changes.push({ path, before, after: null });
  }
  return changes;
}

/** Put the workspace back the way the snapshot had it, for the given changes. */
export function revertChanges(changes: SimFileChange[]): void {
  for (const change of changes) {
    if (change.before === null) {
      const abs = safePath(change.path);
      if (existsSync(abs)) rmSync(abs);
    } else {
      writeWorkspaceFile(change.path, change.before);
    }
  }
}

/** Write a set of "after" states into the workspace (used to check out a PR branch). */
export function applyChanges(changes: SimFileChange[]): void {
  for (const change of changes) {
    if (change.after === null) {
      const abs = safePath(change.path);
      if (existsSync(abs)) rmSync(abs);
    } else {
      writeWorkspaceFile(change.path, change.after);
    }
  }
}

// ------------------------------------------------------------- high-level ops

export function createIssue(
  title: string,
  body: string,
  labels: string[] = [],
): SimIssue {
  return mutateGitHub((state) => {
    const issue: SimIssue = {
      number: ++state.counters.issue,
      title,
      body,
      labels,
      assignees: [],
      state: "open",
      statusUpdates: [],
    };
    state.issues.push(issue);
    return issue;
  });
}

export function addIssueStatus(issueNumber: number, text: string): void {
  mutateGitHub((state) => {
    const issue = state.issues.find((i) => i.number === issueNumber);
    issue?.statusUpdates.push({ text, at: Date.now() });
  });
}

export function createRun(
  workflow: string,
  event: string,
  branch: string,
  stepNames: string[],
): SimRun {
  return mutateGitHub((state) => {
    const run: SimRun = {
      id: ++state.counters.run,
      workflow,
      event,
      branch,
      status: "queued",
      steps: stepNames.map((name) => ({ name, status: "queued", log: [] })),
      startedAt: Date.now(),
    };
    state.runs.unshift(run);
    return run;
  });
}

export function updateRun(id: number, fn: (run: SimRun) => void): void {
  mutateGitHub((state) => {
    const run = state.runs.find((r) => r.id === id);
    if (run) fn(run);
  });
}

export function createPull(pull: Omit<SimPull, "number">): SimPull {
  return mutateGitHub((state) => {
    const created: SimPull = { ...pull, number: ++state.counters.pull };
    state.pulls.push(created);
    return created;
  });
}
