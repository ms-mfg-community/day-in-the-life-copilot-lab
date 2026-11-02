import { useState } from "react";
import { api } from "../api";
import { refreshGithub } from "../controller";
import { useStudio } from "../store";
import type { GhFileChange, GhPull, GhRuleset } from "../types";

/**
 * The simulated GitHub surface: issues, PRs, Actions runs, settings.
 * Everything here is simulated EXCEPT the AI inside it — PRD generation, the
 * coding agent, and code review are real Copilot sessions on the server.
 */

type GhView = "issues" | "pulls" | "actions" | "settings";

function timeAgo(at: number): string {
  const s = Math.max(1, Math.round((Date.now() - at) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}

// ------------------------------------------------------------- diff renderer

function diffLines(
  before: string,
  after: string,
): { tag: "add" | "del" | "ctx"; text: string }[] {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length * b.length > 400_000) {
    return b.map((text) => ({ tag: "add" as const, text }));
  }
  // Classic LCS table — files in the sandbox are small.
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i]![j] =
        a[i] === b[j]
          ? dp[i + 1]![j + 1]! + 1
          : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const out: { tag: "add" | "del" | "ctx"; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ tag: "ctx", text: a[i] ?? "" });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push({ tag: "del", text: a[i] ?? "" });
      i++;
    } else {
      out.push({ tag: "add", text: b[j] ?? "" });
      j++;
    }
  }
  while (i < a.length) out.push({ tag: "del", text: a[i++] ?? "" });
  while (j < b.length) out.push({ tag: "add", text: b[j++] ?? "" });
  // Collapse long context runs.
  const collapsed: { tag: "add" | "del" | "ctx"; text: string }[] = [];
  let run: typeof out = [];
  const flush = (): void => {
    if (run.length > 7) {
      collapsed.push(...run.slice(0, 3));
      collapsed.push({
        tag: "ctx",
        text: `… ${run.length - 6} unchanged lines …`,
      });
      collapsed.push(...run.slice(-3));
    } else {
      collapsed.push(...run);
    }
    run = [];
  };
  for (const line of out) {
    if (line.tag === "ctx") run.push(line);
    else {
      flush();
      collapsed.push(line);
    }
  }
  flush();
  return collapsed;
}

function FileDiff({ change }: { change: GhFileChange }): JSX.Element {
  const lines =
    change.before === null
      ? (change.after ?? "")
          .split("\n")
          .map((text) => ({ tag: "add" as const, text }))
      : change.after === null
        ? change.before
            .split("\n")
            .map((text) => ({ tag: "del" as const, text }))
        : diffLines(change.before, change.after);
  return (
    <div className="gh-diff">
      <div className="df-file">
        {change.path}{" "}
        {change.before === null
          ? "(new file)"
          : change.after === null
            ? "(deleted)"
            : ""}
      </div>
      {lines.map((l, i) => (
        <div key={i} className={`df-line df-${l.tag}`}>
          {l.tag === "add" ? "+ " : l.tag === "del" ? "- " : "  "}
          {l.text}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------- issues

function IssuesView(): JSX.Element {
  const github = useStudio((s) => s.github);
  const [branchName, setBranchName] = useState<Record<number, string>>({});
  if (!github || github.issues.length === 0) {
    return (
      <div className="gh-empty">
        No issues yet. Lab 08 seeds the backlog with `gh issue create`.
      </div>
    );
  }
  return (
    <div>
      {github.issues.map((issue) => (
        <div className="gh-item" key={issue.number}>
          <div className="gh-title">
            <span
              className={
                issue.state === "open" ? "gh-status-open" : "gh-status-closed"
              }
            >
              {issue.state === "open" ? "◉" : "⊘"}
            </span>
            <span>
              #{issue.number} {issue.title}
            </span>
            {issue.labels.map((l) => (
              <span className="gh-label" key={l}>
                {l}
              </span>
            ))}
          </div>
          <div className="gh-meta">
            assignees: {issue.assignees.join(", ") || "none"}
            {issue.linkedBranch
              ? ` · linked branch: ${issue.linkedBranch}`
              : ""}
          </div>
          <div className="gh-md">{issue.body}</div>
          {issue.statusUpdates.length > 0 ? (
            <div className="gh-section">
              {issue.statusUpdates.map((u, i) => (
                <div className="gh-run-step" key={i}>
                  {u.text}{" "}
                  <span style={{ opacity: 0.5 }}>· {timeAgo(u.at)}</span>
                </div>
              ))}
            </div>
          ) : null}
          {issue.state === "open" ? (
            <div className="gh-actions">
              {!issue.linkedBranch ? (
                <>
                  <input
                    type="text"
                    className="gh-branch-input"
                    style={{
                      background: "var(--bench)",
                      border: "1px solid var(--bench-line)",
                      borderRadius: 6,
                      color: "#fff",
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                      padding: "4px 8px",
                    }}
                    placeholder={`feature/${issue.title
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-+|-+$/g, "")
                      .slice(0, 30)}`}
                    value={branchName[issue.number] ?? ""}
                    onChange={(e) =>
                      setBranchName((m) => ({
                        ...m,
                        [issue.number]: e.target.value,
                      }))
                    }
                    aria-label="Branch name"
                  />
                  <button
                    className="action run"
                    disabled={github.platformBusy}
                    onClick={() => {
                      const fallback = `feature/${issue.title
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-+|-+$/g, "")
                        .slice(0, 30)}`;
                      void api
                        .githubOp("create-branch-from-issue", {
                          issue: issue.number,
                          branch: branchName[issue.number]?.trim() || fallback,
                        })
                        .then(refreshGithub);
                    }}
                  >
                    Create a branch ▸
                  </button>
                </>
              ) : null}
              {!issue.assignees.includes("Copilot") ? (
                <button
                  className="action ghost"
                  disabled={github.platformBusy}
                  onClick={() =>
                    void api
                      .githubOp("assign-copilot", { issue: issue.number })
                      .then(refreshGithub)
                  }
                >
                  Assign to Copilot
                </button>
              ) : null}
              <button
                className="action ghost"
                onClick={() =>
                  void api
                    .githubOp("close-issue", { issue: issue.number })
                    .then(refreshGithub)
                }
              >
                Close issue
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------------- pulls

function PullView({ pr }: { pr: GhPull }): JSX.Element {
  const github = useStudio((s) => s.github);
  const [comment, setComment] = useState("");
  const [showFiles, setShowFiles] = useState(false);
  return (
    <div className="gh-item">
      <div className="gh-title">
        <span
          className={
            pr.state === "open" ? "gh-status-open" : "gh-status-closed"
          }
        >
          {pr.state === "open" ? "⇅" : "⊘"}
        </span>
        <span>
          #{pr.number} {pr.title}
        </span>
        {pr.draft ? <span className="gh-label">draft</span> : null}
        {pr.labels.map((l) => (
          <span className="gh-label" key={l}>
            {l}
          </span>
        ))}
      </div>
      <div className="gh-meta">
        {pr.head} → {pr.base}
        {pr.base !== "main" ? "  (stacked on another layer)" : ""} ·{" "}
        {pr.commits.length} commit(s) · reviewers:{" "}
        {pr.reviewers.join(", ") || "none"}
        {pr.linkedIssue ? ` · closes #${pr.linkedIssue}` : ""}
      </div>
      <div className="gh-md">{pr.body}</div>

      <div className="gh-actions">
        <button
          className="action ghost"
          onClick={() => setShowFiles((v) => !v)}
        >
          {showFiles ? "Hide" : "Show"} files changed ({pr.files.length})
        </button>
        {pr.state === "open" ? (
          <>
            {!pr.reviews.some((r) => r.author === "Copilot") ? (
              <button
                className="action run"
                disabled={github?.platformBusy}
                onClick={() =>
                  void api
                    .githubOp("request-review", { pr: pr.number })
                    .then(refreshGithub)
                }
              >
                Request Copilot review ▸
              </button>
            ) : null}
            {pr.draft ? (
              <button
                className="action ghost"
                onClick={() =>
                  void api
                    .githubOp("pr-ready", { pr: pr.number })
                    .then(refreshGithub)
                }
              >
                Ready for review
              </button>
            ) : null}
            <button
              className="action ghost"
              onClick={() =>
                void api
                  .githubOp("close-pr", { pr: pr.number, deleteBranch: true })
                  .then(refreshGithub)
              }
            >
              Close PR
            </button>
          </>
        ) : null}
      </div>

      {showFiles
        ? pr.files.map((f) => <FileDiff key={f.path} change={f} />)
        : null}

      {pr.reviews.length > 0 ? (
        <div className="gh-section">
          {pr.reviews.map((review, i) => (
            <div key={i}>
              <div className="gh-run-step">
                🤖 <strong>{review.author}</strong> reviewed ·{" "}
                {timeAgo(review.at)}{" "}
                <span className="gh-label">live Copilot</span>
              </div>
              <div className="gh-md">{review.body}</div>
            </div>
          ))}
        </div>
      ) : null}

      {pr.comments.length > 0 ? (
        <div className="gh-section">
          {pr.comments.map((c, i) => (
            <div className="gh-run-step" key={i}>
              💬 <strong>{c.author}</strong>: {c.body.slice(0, 300)}
            </div>
          ))}
        </div>
      ) : null}

      {pr.state === "open" ? (
        <div className="gh-actions gh-form" style={{ alignItems: "center" }}>
          <input
            type="text"
            placeholder="Comment — mention @copilot to make the agent iterate"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            aria-label={`Comment on PR ${pr.number}`}
          />
          <button
            className="action ghost"
            disabled={!comment.trim() || github?.platformBusy}
            onClick={() => {
              void api
                .githubOp("comment-pr", { pr: pr.number, body: comment })
                .then(refreshGithub);
              setComment("");
            }}
          >
            Comment
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PullsView(): JSX.Element {
  const github = useStudio((s) => s.github);
  const open = github?.pulls.filter((p) => p.state === "open") ?? [];
  const closed = github?.pulls.filter((p) => p.state === "closed") ?? [];
  if (open.length + closed.length === 0) {
    return (
      <div className="gh-empty">
        No pull requests yet — Lab 08's workflow and Lab 09's coding agent open
        them.
      </div>
    );
  }
  return (
    <div>
      {open.map((pr) => (
        <PullView key={pr.number} pr={pr} />
      ))}
      {closed.length > 0 ? (
        <div className="gh-meta" style={{ margin: "8px 0" }}>
          closed: {closed.map((p) => `#${p.number}`).join(", ")}
        </div>
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ actions

function ActionsView(): JSX.Element {
  const github = useStudio((s) => s.github);
  const [openRun, setOpenRun] = useState<number | null>(null);
  if (!github || github.runs.length === 0) {
    return (
      <div className="gh-empty">
        No workflow runs yet. Creating a feature/** branch triggers Generate
        PRD.
      </div>
    );
  }
  return (
    <div>
      {github.runs.map((run) => (
        <div className="gh-item" key={run.id}>
          <div className="gh-title">
            <span>
              {run.status !== "completed"
                ? "🟡"
                : run.conclusion === "success"
                  ? "🟢"
                  : "🔴"}{" "}
              {run.workflow}
            </span>
            <span className="gh-label">{run.event}</span>
          </div>
          <div className="gh-meta">
            run #{run.id} · branch {run.branch} · {run.status}
            {run.conclusion ? ` (${run.conclusion})` : ""} · started{" "}
            {timeAgo(run.startedAt)}
          </div>
          <div className="gh-actions">
            <button
              className="action ghost"
              onClick={() => setOpenRun(openRun === run.id ? null : run.id)}
            >
              {openRun === run.id ? "Hide log" : "View log"}
            </button>
          </div>
          {openRun === run.id ? (
            <div className="gh-section">
              {run.steps.map((step) => (
                <div key={step.name}>
                  <div className="gh-run-step">
                    {step.status === "completed"
                      ? "✓"
                      : step.status === "in_progress"
                        ? "◌"
                        : step.status === "skipped"
                          ? "⊘"
                          : "·"}{" "}
                    {step.name}
                  </div>
                  {step.log.length > 0 ? (
                    <div className="gh-run-log">{step.log.join("\n")}</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------- settings

const EMPTY_RULESET: GhRuleset = {
  name: "copilot-code-review",
  active: true,
  requirePullRequest: false,
  autoRequestCopilotReview: false,
  reviewDrafts: false,
  reviewNewPushes: false,
};

function SettingsView(): JSX.Element {
  const github = useStudio((s) => s.github);
  const existing = github?.settings.rulesets.find(
    (r) => r.name === "copilot-code-review",
  );
  const [draft, setDraft] = useState<GhRuleset>(existing ?? EMPTY_RULESET);
  if (!github) return <div className="gh-empty">loading…</div>;

  const toggle = (key: keyof GhRuleset): void =>
    setDraft((d) => ({ ...d, [key]: !d[key] }));

  return (
    <div>
      <div className="gh-item">
        <div className="gh-title">Actions → General</div>
        <div className="gh-form">
          <label>
            <input
              type="checkbox"
              checked={github.settings.actionsCanCreatePRs}
              onChange={(e) =>
                void api
                  .githubOp("toggle-actions-pr", { value: e.target.checked })
                  .then(refreshGithub)
              }
            />
            Allow GitHub Actions to create and approve pull requests
          </label>
          <div className="gh-meta">
            Off by default on real GitHub — Lab 08's safe-outputs PR creation
            needs it.
          </div>
        </div>
      </div>

      <div className="gh-item">
        <div className="gh-title">
          Rulesets — branch ruleset <code>copilot-code-review</code>
          {existing?.active ? <span className="gh-label">active</span> : null}
        </div>
        <div className="gh-form">
          <label>
            <input
              type="checkbox"
              checked={draft.active}
              onChange={() => toggle("active")}
            />
            Enforcement status: Active
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.requirePullRequest}
              onChange={() => toggle("requirePullRequest")}
            />
            Require a pull request before merging
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.autoRequestCopilotReview}
              onChange={() => toggle("autoRequestCopilotReview")}
            />
            Automatically request Copilot code review
          </label>
          <label style={{ paddingLeft: 22 }}>
            <input
              type="checkbox"
              checked={draft.reviewDrafts}
              onChange={() => toggle("reviewDrafts")}
            />
            Review draft pull requests
          </label>
          <label style={{ paddingLeft: 22 }}>
            <input
              type="checkbox"
              checked={draft.reviewNewPushes}
              onChange={() => toggle("reviewNewPushes")}
            />
            Review new pushes
          </label>
        </div>
        <div className="gh-actions">
          <button
            className="action run"
            onClick={() =>
              void api
                .githubOp("save-ruleset", { ruleset: draft })
                .then(refreshGithub)
            }
          >
            {existing ? "Save ruleset ▸" : "Create ruleset ▸"}
          </button>
        </div>
      </div>

      <div className="gh-item">
        <div className="gh-title">Secrets and variables → Actions</div>
        <div className="gh-meta">
          {github.secrets.length > 0
            ? `secrets: ${github.secrets.join(", ")}`
            : "no repository secrets — Lab 08 sets COPILOT_GITHUB_TOKEN"}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- panel

export function GitHubPanel(): JSX.Element {
  const [view, setView] = useState<GhView>("issues");
  const github = useStudio((s) => s.github);
  const counts = {
    issues: github?.issues.filter((i) => i.state === "open").length ?? 0,
    pulls: github?.pulls.filter((p) => p.state === "open").length ?? 0,
    actions: github?.runs.length ?? 0,
  };
  return (
    <div className="gh">
      <div className="gh-nav">
        {(["issues", "pulls", "actions", "settings"] as const).map((v) => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            onClick={() => setView(v)}
          >
            {v === "pulls" ? "Pull requests" : v[0]?.toUpperCase() + v.slice(1)}
            {v !== "settings" && counts[v] > 0 ? ` (${counts[v]})` : ""}
          </button>
        ))}
        <span
          className="gh-sim-tag"
          title="The GitHub plumbing is simulated; the AI inside it is live Copilot"
        >
          SIMULATED GITHUB · LIVE AI
        </span>
      </div>
      <div className="gh-body">
        {github?.platformBusy ? (
          <div className="gh-meta" style={{ marginBottom: 8 }}>
            ◌ a platform agent is running (live Copilot session)…
          </div>
        ) : null}
        {view === "issues" ? (
          <IssuesView />
        ) : view === "pulls" ? (
          <PullsView />
        ) : view === "actions" ? (
          <ActionsView />
        ) : (
          <SettingsView />
        )}
      </div>
    </div>
  );
}
