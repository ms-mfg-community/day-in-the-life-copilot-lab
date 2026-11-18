import { bridge } from "./copilot-bridge.js";
import { fileExists, parseFrontmatter, readWorkspaceFile } from "./sandbox.js";
import {
  addIssueStatus,
  applyChanges,
  createPull,
  createRun,
  diffAgainstSnapshot,
  loadGitHub,
  mutateGitHub,
  revertChanges,
  snapshotWorkspace,
  updateRun,
  type SimFileChange,
  type SimPull,
} from "./sim-github.js";

/**
 * The simulated platform's automation engine. GitHub's plumbing (triggers,
 * jobs, PRs) is simulated; every agent inside it is a real Copilot session
 * run through bridge.runWorker().
 */

let platformBusy = false;

export function isPlatformBusy(): boolean {
  return platformBusy;
}

function notify(): void {
  bridge.broadcast({ kind: "github-updated" });
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function excerptChanges(changes: SimFileChange[], maxChars = 9000): string {
  const parts: string[] = [];
  for (const change of changes) {
    const kind =
      change.before === null
        ? "created"
        : change.after === null
          ? "deleted"
          : "modified";
    parts.push(
      `--- ${change.path} (${kind}) ---\n${(change.after ?? change.before ?? "").slice(0, 2500)}`,
    );
  }
  return parts.join("\n\n").slice(0, maxChars);
}

// ----------------------------------------------------------- gh aw workflows

/** Fires on simulated branch creation: the generate-prd gh-aw workflow. */
export async function triggerBranchCreate(
  branch: string,
  linkedIssueNumber?: number,
): Promise<void> {
  if (!fileExists(".github/workflows/generate-prd.md")) return;
  if (!/^(feature|story)\//.test(branch)) return;
  if (platformBusy)
    throw new Error(
      "A platform agent is already running — wait for the current run to finish.",
    );
  platformBusy = true;

  const run = createRun("Generate PRD", "create", branch, [
    "pre_activation",
    "activation",
    "agent",
    "safe_outputs",
  ]);
  notify();

  const log = (step: number, line: string): void => {
    updateRun(run.id, (r) => {
      r.steps[step]?.log.push(line);
    });
    notify();
  };
  const stepStatus = (
    step: number,
    status: "in_progress" | "completed" | "skipped",
  ): void => {
    updateRun(run.id, (r) => {
      const s = r.steps[step];
      if (s) s.status = status;
      if (status === "in_progress") r.status = "in_progress";
    });
    notify();
  };

  try {
    stepStatus(0, "in_progress");
    log(
      0,
      `Evaluating branch filter: startsWith(refs/heads/${branch}, 'refs/heads/feature/') → true`,
    );
    await sleep(500);
    stepStatus(0, "completed");

    stepStatus(1, "in_progress");
    log(1, "Daily AI credit check: OK");
    const github = loadGitHub();
    if (!github.secrets.includes("COPILOT_GITHUB_TOKEN")) {
      log(
        1,
        "⚠ COPILOT_GITHUB_TOKEN secret not set — a real run would fail here.",
      );
      log(
        1,
        "Lab Studio continues anyway (the studio reuses your local Copilot auth).",
      );
    } else {
      log(
        1,
        "COPILOT_GITHUB_TOKEN secret found — Copilot engine authenticated.",
      );
    }
    await sleep(400);
    stepStatus(1, "completed");

    stepStatus(2, "in_progress");
    log(2, "Setup gh-aw runtime · checkout repository · node 22");
    log(
      2,
      "Starting Copilot agent with the generate-prd.md instructions… (live)",
    );

    const workflow = parseFrontmatter(
      readWorkspaceFile(".github/workflows/generate-prd.md"),
    );
    const slug = branch.replace(/\//g, "-");
    const prdPath = `docs/prd/PRD-${slug}.md`;
    const issue = linkedIssueNumber
      ? loadGitHub().issues.find((i) => i.number === linkedIssueNumber)
      : undefined;
    const issueContext = issue
      ? `\n\nThe branch is linked to issue #${issue.number}: "${issue.title}"\n\n${issue.body}\n\nUnder "Feature Overview", include a "Related Issues" line referencing #${issue.number}, and make sure every acceptance criterion from the issue is covered.`
      : `\n\nNo issue is linked to this branch. Under "Feature Overview", include a "Related Issues: #N/A" line and derive the feature from the branch name alone.`;

    const snapshot = snapshotWorkspace();
    await bridge.runWorker({
      label: "prd-agent",
      prompt: `You are the agent job of a GitHub Agentic Workflow. Follow these workflow instructions:\n\n${workflow.body.slice(0, 3000)}\n\nThe triggering branch is "${branch}".${issueContext}\n\nWrite the PRD now: create the file ${prdPath} in this workspace using your file editing tool. Keep it under 120 lines. Do not modify any other file. When done, reply with one line: PRD_WRITTEN.`,
      onProgress: (line) => log(2, line),
    });

    const changes = diffAgainstSnapshot(snapshot).filter(
      (c) => c.path === prdPath,
    );
    if (changes.length === 0 || !fileExists(prdPath)) {
      log(2, "✗ Agent did not produce the PRD file.");
      stepStatus(2, "completed");
      stepStatus(3, "skipped");
      updateRun(run.id, (r) => {
        r.status = "completed";
        r.conclusion = "failure";
      });
      notify();
      return;
    }
    log(2, `✓ Agent wrote ${prdPath}`);
    stepStatus(2, "completed");

    stepStatus(3, "in_progress");
    const settings = loadGitHub().settings;
    if (!settings.actionsCanCreatePRs) {
      log(
        3,
        '✗ Blocked: "Allow GitHub Actions to create and approve pull requests" is OFF.',
      );
      log(
        3,
        "Enable it under Settings → Actions, then create the branch again — or create the PR by hand.",
      );
      updateRun(run.id, (r) => {
        r.status = "completed";
        r.conclusion = "failure";
      });
      notify();
      return;
    }
    const pr = createPull({
      title: `[prd] docs: Add PRD for ${branch}`,
      body: `PRD generated by the generate-prd agentic workflow for \`${branch}\`.${issue ? `\n\nLinked issue: #${issue.number}` : ""}`,
      state: "open",
      draft: false,
      head: `${branch}-prd`,
      base: branch,
      labels: ["prd", "ai-generated"],
      reviewers: [],
      files: changes,
      commits: [{ message: `docs: add PRD for ${branch}`, at: Date.now() }],
      comments: [],
      reviews: [],
      linkedIssue: issue?.number,
    });
    log(
      3,
      `✓ Opened pull request #${pr.number} with the generated PRD (labels: prd, ai-generated).`,
    );
    stepStatus(3, "completed");
    updateRun(run.id, (r) => {
      r.status = "completed";
      r.conclusion = "success";
    });
    notify();
  } catch (error) {
    updateRun(run.id, (r) => {
      r.status = "completed";
      r.conclusion = "failure";
      r.steps
        .find((s) => s.status === "in_progress")
        ?.log.push(
          `✗ ${error instanceof Error ? error.message : String(error)}`,
        );
    });
    notify();
  } finally {
    platformBusy = false;
  }
}

// -------------------------------------------------------------- coding agent

export async function runCodingAgent(issueNumber: number): Promise<void> {
  const issue = loadGitHub().issues.find((i) => i.number === issueNumber);
  if (!issue) throw new Error(`Issue #${issueNumber} not found`);
  if (platformBusy)
    throw new Error(
      "A platform agent is already running — wait for it to finish.",
    );
  platformBusy = true;

  const status = (text: string): void => {
    addIssueStatus(issueNumber, text);
    notify();
  };

  try {
    status("🤖 Copilot started working on this issue.");
    status("Reading the codebase and custom instructions…");

    const branch = `copilot/fix-${issueNumber}`;
    mutateGitHub((state) => {
      if (!state.branches.includes(branch)) state.branches.push(branch);
    });

    const snapshot = snapshotWorkspace();
    await bridge.runWorker({
      label: "coding-agent",
      prompt: `You are the Copilot Coding Agent implementing a GitHub issue in this workspace.\n\nIssue #${issue.number}: ${issue.title}\n\n${issue.body}\n\nImplement the issue now by editing files with your file tools. Keep the change minimal and follow the repository's conventions (.github/copilot-instructions.md, AGENTS.md). Add or update a Vitest test if the issue asks for one. Do not create documentation files. When done, reply with a 3-5 line summary of what you changed.`,
      onProgress: (line) => status(line),
    });

    const changes = diffAgainstSnapshot(snapshot);
    if (changes.length === 0) {
      status("⚠ The agent made no file changes — no pull request to open.");
      return;
    }
    // The agent "worked on a branch": main gets put back, the PR holds the diff.
    revertChanges(changes);

    const pr = createPull({
      title: issue.title,
      body: `Implements #${issue.number}.\n\nThis pull request was created by the Copilot coding agent (simulated platform, real Copilot session). Files changed: ${changes.map((c) => c.path).join(", ")}.`,
      state: "open",
      draft: true,
      head: branch,
      base: "main",
      labels: [],
      reviewers: [],
      files: changes,
      commits: [
        {
          message: `feat: ${issue.title.replace(/^feat:\s*/i, "")}`,
          at: Date.now(),
        },
      ],
      comments: [],
      reviews: [],
      linkedIssue: issue.number,
    });
    status(
      `✓ Opened draft pull request #${pr.number} with ${changes.length} changed file(s). Review requested.`,
    );

    const ruleset = loadGitHub().settings.rulesets.find(
      (r) => r.active && r.autoRequestCopilotReview,
    );
    if (ruleset && (ruleset.reviewDrafts || !pr.draft)) {
      status("Ruleset matched — Copilot code review requested automatically.");
      platformBusy = false;
      await runCodeReview(pr.number);
    }
  } finally {
    platformBusy = false;
  }
}

// --------------------------------------------------------------- code review

export async function runCodeReview(prNumber: number): Promise<void> {
  const pr = loadGitHub().pulls.find((p) => p.number === prNumber);
  if (!pr) throw new Error(`Pull request #${prNumber} not found`);
  if (platformBusy)
    throw new Error(
      "A platform agent is already running — wait for it to finish.",
    );
  platformBusy = true;

  try {
    mutateGitHub((state) => {
      const target = state.pulls.find((p) => p.number === prNumber);
      if (target && !target.reviewers.includes("Copilot"))
        target.reviewers.push("Copilot");
    });
    notify();

    const review = await bridge.runWorker({
      label: "code-review",
      prompt: `You are Copilot Code Review reviewing a pull request in this repository. Read .github/copilot-instructions.md and AGENTS.md first — review against those project conventions, not just generic best practice.\n\nPull request #${pr.number}: ${pr.title}\n\nChanged files:\n\n${excerptChanges(pr.files)}\n\nWrite a concise review as markdown: start with a one-line verdict, then at most four findings as bullets (each: severity emoji ✅/⚠️/🔒/🧪, the point, and the file it concerns). Praise is allowed when the change is clean. Do NOT edit any files.`,
    });

    mutateGitHub((state) => {
      const target = state.pulls.find((p) => p.number === prNumber);
      target?.reviews.push({
        author: "Copilot",
        body: review || "✅ No issues found.",
        at: Date.now(),
      });
    });
    notify();
  } finally {
    platformBusy = false;
  }
}

// ---------------------------------------------------------------- iteration

export async function iterateOnPull(
  prNumber: number,
  comment: string,
): Promise<void> {
  const pr = loadGitHub().pulls.find((p) => p.number === prNumber);
  if (!pr) throw new Error(`Pull request #${prNumber} not found`);
  if (platformBusy)
    throw new Error(
      "A platform agent is already running — wait for it to finish.",
    );
  platformBusy = true;

  try {
    mutateGitHub((state) => {
      state.pulls
        .find((p) => p.number === prNumber)
        ?.comments.push({ author: "you", body: comment, at: Date.now() });
    });
    notify();

    // Check out the PR branch: apply its file states, let the real agent work.
    const baseline = snapshotWorkspace();
    applyChanges(pr.files);
    const branchSnapshot = snapshotWorkspace();

    await bridge.runWorker({
      label: "coding-agent",
      prompt: `You are the Copilot Coding Agent responding to review feedback on your pull request "${pr.title}". The PR's changes are already applied to this workspace.\n\nThe feedback comment:\n\n${comment.replace(/@copilot/gi, "").trim()}\n\nAddress the feedback by editing files now. Keep the change minimal. Reply with a 2-3 line summary when done.`,
    });

    const newWork = diffAgainstSnapshot(branchSnapshot);
    const combined = diffAgainstSnapshot(baseline);
    // Put main back the way it was.
    revertChanges(combined);

    mutateGitHub((state) => {
      const target = state.pulls.find((p) => p.number === prNumber);
      if (!target) return;
      target.files = combined;
      target.commits.push({
        message: `fix: address review feedback (${newWork.length} file(s))`,
        at: Date.now(),
      });
    });
    notify();

    const ruleset = loadGitHub().settings.rulesets.find(
      (r) => r.active && r.autoRequestCopilotReview,
    );
    if (ruleset?.reviewNewPushes) {
      platformBusy = false;
      await runCodeReview(prNumber);
    }
  } finally {
    platformBusy = false;
  }
}
