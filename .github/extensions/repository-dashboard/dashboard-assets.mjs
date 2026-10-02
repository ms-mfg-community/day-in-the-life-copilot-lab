export const DASHBOARD_STYLES = String.raw`
:root {
  color-scheme: light dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--background-color-default, #0d1117);
  color: var(--text-color-default, #f0f6fc);
  font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  font-size: var(--text-body-medium, 14px);
  line-height: var(--leading-body-medium, 20px);
}

button,
input,
select {
  font: inherit;
}

button,
a {
  -webkit-tap-highlight-color: transparent;
}

a {
  color: var(--true-color-blue, #58a6ff);
}

.loading-shell,
.error-screen {
  min-height: 100vh;
  display: grid;
  place-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}

.spinner {
  width: 28px;
  height: 28px;
  margin: auto;
  border: 3px solid var(--border-color-default, #30363d);
  border-top-color: var(--true-color-blue, #58a6ff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.app-shell {
  min-height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color-default, #30363d);
  background: color-mix(in srgb, var(--background-color-default, #0d1117) 92%, transparent);
  backdrop-filter: blur(12px);
}

.repo-title {
  min-width: 0;
}

.repo-title h1 {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--text-title-medium, 20px);
  line-height: var(--leading-title-medium, 26px);
}

.repo-title p {
  margin: 2px 0 0;
  color: var(--text-color-muted, #8b949e);
  font-size: var(--text-body-small, 12px);
}

.toolbar,
.tabs,
.card-meta,
.labels,
.assignee-row,
.pr-links,
.run-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.button {
  border: 1px solid var(--border-color-default, #30363d);
  border-radius: 6px;
  padding: 6px 11px;
  background: var(--background-color-muted, #21262d);
  color: var(--text-color-default, #f0f6fc);
  cursor: pointer;
}

.button:hover {
  border-color: var(--text-color-muted, #8b949e);
}

.button:focus-visible,
input:focus-visible {
  outline: 2px solid var(--color-focus-outline, #2f81f7);
  outline-offset: 2px;
}

.button.primary {
  border-color: color-mix(in srgb, var(--true-color-blue, #2f81f7) 70%, transparent);
  background: var(--true-color-blue, #2f81f7);
  color: var(--color-white, #fff);
}

.button.small {
  padding: 4px 8px;
  font-size: var(--text-body-small, 12px);
}

.button[disabled] {
  opacity: 0.55;
  cursor: wait;
}

.tabs {
  overflow-x: auto;
  padding: 10px 20px 0;
  border-bottom: 1px solid var(--border-color-default, #30363d);
}

.tab {
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 8px 10px 10px;
  background: transparent;
  color: var(--text-color-muted, #8b949e);
  cursor: pointer;
  white-space: nowrap;
}

.tab.active {
  border-bottom-color: var(--true-color-red, #f78166);
  color: var(--text-color-default, #f0f6fc);
  font-weight: var(--font-weight-semibold, 600);
}

.content {
  padding: 20px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.metric,
.panel,
.lane,
.item-card,
.notice {
  border: 1px solid var(--border-color-default, #30363d);
  border-radius: 8px;
  background: var(--background-color-muted, #161b22);
}

.metric {
  padding: 14px;
}

.metric strong {
  display: block;
  margin-top: 4px;
  font-size: var(--text-title-large, 26px);
  line-height: var(--leading-title-large, 32px);
}

.muted {
  color: var(--text-color-muted, #8b949e);
}

.board {
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 1fr));
  gap: 12px;
  align-items: start;
}

.lane {
  min-width: 0;
  padding: 10px;
}

.lane-header,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.lane-header {
  margin-bottom: 10px;
  padding: 2px 4px;
}

.lane-header h2,
.section-header h2 {
  margin: 0;
  font-size: var(--text-title-small, 16px);
}

.count {
  min-width: 24px;
  border-radius: 999px;
  padding: 2px 7px;
  background: var(--background-color-emphasis, #30363d);
  text-align: center;
  font-size: var(--text-body-small, 12px);
}

.card-list,
.detail-list {
  display: grid;
  gap: 8px;
}

.item-card {
  padding: 11px;
  background: var(--background-color-default, #0d1117);
}

.item-card h3 {
  margin: 0 0 7px;
  font-size: var(--text-body-medium, 14px);
  line-height: 19px;
}

.item-card h3 a {
  color: inherit;
  text-decoration: none;
}

.item-card h3 a:hover {
  text-decoration: underline;
}

.card-meta,
.run-meta {
  flex-wrap: wrap;
  color: var(--text-color-muted, #8b949e);
  font-size: var(--text-body-small, 12px);
}

.labels {
  flex-wrap: wrap;
  margin-top: 8px;
}

.label,
.badge {
  border: 1px solid var(--border-color-default, #30363d);
  border-radius: 999px;
  padding: 1px 7px;
  font-size: 11px;
  line-height: 18px;
}

.badge.success {
  border-color: color-mix(in srgb, var(--true-color-green, #3fb950) 55%, transparent);
  color: var(--true-color-green, #3fb950);
}

.badge.danger {
  border-color: color-mix(in srgb, var(--true-color-red, #f85149) 55%, transparent);
  color: var(--true-color-red, #f85149);
}

.badge.warning {
  border-color: color-mix(in srgb, var(--true-color-yellow, #d29922) 55%, transparent);
  color: var(--true-color-yellow, #d29922);
}

.badge.neutral {
  color: var(--text-color-muted, #8b949e);
}

.assignment {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px;
  margin-top: 10px;
}

.assignment input,
.filter-input {
  min-width: 0;
  border: 1px solid var(--border-color-default, #30363d);
  border-radius: 6px;
  padding: 6px 8px;
  background: var(--background-color-default, #0d1117);
  color: var(--text-color-default, #f0f6fc);
}

.pr-links {
  flex-wrap: wrap;
  margin-top: 8px;
}

.pr-links a {
  font-size: var(--text-body-small, 12px);
  text-decoration: none;
}

.panel {
  padding: 14px;
}

.section-header {
  margin-bottom: 12px;
}

.filter-input {
  width: min(320px, 45vw);
}

.body-preview {
  margin: 8px 0 0;
  color: var(--text-color-muted, #8b949e);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.notice {
  margin-bottom: 16px;
  padding: 10px 12px;
  border-color: color-mix(in srgb, var(--true-color-yellow, #d29922) 60%, transparent);
  color: var(--true-color-yellow, #d29922);
}

.empty {
  padding: 16px 8px;
  color: var(--text-color-muted, #8b949e);
  text-align: center;
}

.toast {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 20;
  max-width: min(420px, calc(100vw - 36px));
  border: 1px solid var(--border-color-default, #30363d);
  border-radius: 8px;
  padding: 10px 13px;
  background: var(--background-color-emphasis, #30363d);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.3);
}

@media (max-width: 900px) {
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .board {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .topbar {
    align-items: flex-start;
    padding: 12px;
  }

  .content {
    padding: 12px;
  }

  .tabs {
    padding-left: 12px;
  }

  .metrics {
    grid-template-columns: 1fr 1fr;
  }

  .section-header {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-input {
    width: 100%;
  }
}
`;

export const DASHBOARD_SCRIPT = String.raw`
const app = document.querySelector("#app");
const config = globalThis.__REPOSITORY_DASHBOARD__;
const state = {
  dashboard: null,
  activeTab: "overview",
  filter: "",
  loading: false,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function matchesFilter(item) {
  const needle = state.filter.trim().toLowerCase();
  if (!needle) return true;
  return JSON.stringify(item).toLowerCase().includes(needle);
}

function renderLabels(labels) {
  if (!labels?.length) return "";
  return '<div class="labels">' + labels.map((label) =>
    '<span class="label">' + escapeHtml(label.name) + '</span>'
  ).join("") + '</div>';
}

function renderLinkedPullRequests(pullRequests) {
  if (!pullRequests?.length) return "";
  return '<div class="pr-links"><span class="muted">Linked PRs:</span>' +
    pullRequests.map((pullRequest) =>
      '<a href="' + escapeHtml(pullRequest.url) + '" target="_blank" rel="noreferrer">#' +
      pullRequest.number + (pullRequest.isDraft ? " draft" : "") + '</a>'
    ).join("") + '</div>';
}

function assignmentControls(issue) {
  const viewer = state.dashboard.viewer.login;
  const users = state.dashboard.assignableUsers;
  const options = users.map((user) =>
    '<option value="' + escapeHtml(user.login) + '"></option>'
  ).join("");
  return '<form class="assignment" data-issue="' + issue.number + '">' +
    '<input name="assignee" list="assignees-' + issue.number + '" value="' +
    escapeHtml(viewer) + '" aria-label="GitHub assignee for issue ' + issue.number + '" />' +
    '<datalist id="assignees-' + issue.number + '">' + options + '</datalist>' +
    '<button class="button small primary" type="submit">Assign</button>' +
  '</form>';
}

function issueCard(issue, includeBody = false) {
  const assignees = issue.assignees?.length
    ? issue.assignees.map((assignee) => "@" + assignee.login).join(", ")
    : "Unassigned";
  const body = includeBody && issue.body
    ? '<p class="body-preview">' + escapeHtml(issue.body.slice(0, 700)) +
      (issue.body.length > 700 ? "..." : "") + '</p>'
    : "";
  return '<article class="item-card">' +
    '<h3><a href="' + escapeHtml(issue.url) + '" target="_blank" rel="noreferrer">#' +
      issue.number + " " + escapeHtml(issue.title) + '</a></h3>' +
    '<div class="card-meta"><span>' + escapeHtml(assignees) + '</span>' +
      '<span>Updated ' + escapeHtml(formatDate(issue.updatedAt)) + '</span></div>' +
    renderLabels(issue.labels) +
    renderLinkedPullRequests(issue.linkedPullRequests) +
    body +
    assignmentControls(issue) +
  '</article>';
}

function checkBadge(pullRequest) {
  const checks = pullRequest.checks;
  if (!checks.total) return '<span class="badge neutral">No checks</span>';
  if (checks.failed) return '<span class="badge danger">' + checks.failed + ' failed</span>';
  if (checks.pending) return '<span class="badge warning">' + checks.pending + ' pending</span>';
  return '<span class="badge success">' + checks.passed + ' passed</span>';
}

function pullRequestCard(pullRequest) {
  const issueLinks = pullRequest.relatedIssueNumbers.length
    ? '<div class="pr-links"><span class="muted">Issues:</span>' +
      pullRequest.relatedIssueNumbers.map((number) =>
        '<span class="badge neutral">#' + number + '</span>'
      ).join("") + '</div>'
    : '<div class="pr-links"><span class="muted">No linked issue detected</span></div>';
  return '<article class="item-card">' +
    '<h3><a href="' + escapeHtml(pullRequest.url) + '" target="_blank" rel="noreferrer">#' +
      pullRequest.number + " " + escapeHtml(pullRequest.title) + '</a></h3>' +
    '<div class="card-meta">' +
      (pullRequest.isDraft ? '<span class="badge warning">Draft</span>' : '<span class="badge success">Ready</span>') +
      checkBadge(pullRequest) +
      '<span>' + escapeHtml(pullRequest.headRefName) + ' → ' + escapeHtml(pullRequest.baseRefName) + '</span>' +
      (pullRequest.reviewDecision ? '<span>' + escapeHtml(pullRequest.reviewDecision) + '</span>' : "") +
    '</div>' +
    issueLinks +
    renderLabels(pullRequest.labels) +
  '</article>';
}

function runBadge(run) {
  const outcome = run.conclusion || run.status;
  const className = run.conclusion === "success"
    ? "success"
    : run.status !== "completed"
      ? "warning"
      : "danger";
  return '<span class="badge ' + className + '">' + escapeHtml(outcome) + '</span>';
}

function runCard(run) {
  return '<article class="item-card">' +
    '<h3><a href="' + escapeHtml(run.url) + '" target="_blank" rel="noreferrer">' +
      escapeHtml(run.workflowName || run.displayTitle) + ' #' + run.number + '</a></h3>' +
    '<div class="run-meta">' + runBadge(run) +
      '<span>' + escapeHtml(run.headBranch || "No branch") + '</span>' +
      '<span>' + escapeHtml(run.event) + '</span>' +
      '<span>' + escapeHtml(formatDate(run.createdAt)) + '</span></div>' +
  '</article>';
}

function metric(label, value) {
  return '<div class="metric"><span class="muted">' + escapeHtml(label) +
    '</span><strong>' + value + '</strong></div>';
}

function renderErrors() {
  const entries = Object.entries(state.dashboard.errors);
  if (!entries.length) return "";
  return '<div class="notice"><strong>Some data could not be loaded.</strong><br />' +
    entries.map(([section, message]) =>
      escapeHtml(section) + ": " + escapeHtml(message)
    ).join("<br />") + '</div>';
}

function renderOverview() {
  const issues = state.dashboard.issues;
  const lanes = [
    ["unassigned", "Ready / unassigned"],
    ["assigned", "In progress"],
    ["blocked", "Blocked / waiting"],
  ];
  const board = lanes.map(([lane, label]) => {
    const items = issues.filter((issue) => issue.lane === lane);
    return '<section class="lane"><div class="lane-header"><h2>' + label +
      '</h2><span class="count">' + items.length + '</span></div><div class="card-list">' +
      (items.length ? items.map((issue) => issueCard(issue)).join("") :
        '<div class="empty">No issues in this lane.</div>') +
    '</div></section>';
  }).join("");
  const failedRuns = state.dashboard.runs.filter((run) => run.conclusion === "failure").length;
  return '<div class="metrics">' +
    metric("Open issues", issues.length) +
    metric("Open pull requests", state.dashboard.pullRequests.length) +
    metric("Unassigned", issues.filter((issue) => issue.lane === "unassigned").length) +
    metric("Recent failed runs", failedRuns) +
  '</div><div class="board">' + board + '</div>';
}

function renderListTab(kind) {
  const configByKind = {
    issues: {
      title: "Open issues",
      items: state.dashboard.issues,
      render: (item) => issueCard(item, true),
    },
    pullRequests: {
      title: "Open pull requests",
      items: state.dashboard.pullRequests,
      render: pullRequestCard,
    },
    runs: {
      title: "GitHub Actions runs",
      items: state.dashboard.runs,
      render: runCard,
    },
  };
  const selected = configByKind[kind];
  const items = selected.items.filter(matchesFilter);
  return '<section class="panel"><div class="section-header"><h2>' +
    selected.title + ' <span class="count">' + items.length + '</span></h2>' +
    '<input id="filter" class="filter-input" value="' + escapeHtml(state.filter) +
    '" placeholder="Filter this view..." aria-label="Filter dashboard items" /></div>' +
    '<div class="detail-list">' +
      (items.length ? items.map(selected.render).join("") :
        '<div class="empty">No matching items.</div>') +
    '</div></section>';
}

function renderContent() {
  if (state.activeTab === "overview") return renderOverview();
  if (state.activeTab === "issues") return renderListTab("issues");
  if (state.activeTab === "pullRequests") return renderListTab("pullRequests");
  return renderListTab("runs");
}

function render() {
  const dashboard = state.dashboard;
  const tabs = [
    ["overview", "Overview"],
    ["issues", "Issues"],
    ["pullRequests", "Pull requests"],
    ["runs", "Actions"],
  ];
  app.innerHTML = '<main class="app-shell">' +
    '<header class="topbar"><div class="repo-title"><h1>' +
      escapeHtml(dashboard.repository.nameWithOwner) + '</h1><p>Default branch: ' +
      escapeHtml(dashboard.repository.defaultBranch) + ' · refreshed ' +
      escapeHtml(formatDate(dashboard.refreshedAt)) + '</p></div>' +
      '<div class="toolbar"><span class="muted">@' + escapeHtml(dashboard.viewer.login) + '</span>' +
      '<button id="refresh" class="button" type="button"' +
        (state.loading ? " disabled" : "") + '>Refresh</button></div></header>' +
    '<nav class="tabs" aria-label="Dashboard views">' +
      tabs.map(([id, label]) =>
        '<button class="tab ' + (state.activeTab === id ? "active" : "") +
        '" data-tab="' + id + '" type="button">' + label + '</button>'
      ).join("") + '</nav>' +
    '<div class="content">' + renderErrors() + renderContent() + '</div>' +
  '</main>';
  bindEvents();
}

function showToast(message) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3500);
}

async function fetchDashboard() {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Unable to load dashboard.");
  return payload;
}

async function refresh() {
  state.loading = true;
  if (state.dashboard) render();
  try {
    state.dashboard = await fetchDashboard();
    render();
  } catch (error) {
    if (state.dashboard) {
      showToast(error.message);
      return;
    }
    app.innerHTML = '<div class="error-screen"><h1>Dashboard unavailable</h1><p>' +
      escapeHtml(error.message) + '</p><button id="retry" class="button">Retry</button></div>';
    document.querySelector("#retry")?.addEventListener("click", refresh);
  } finally {
    state.loading = false;
    if (state.dashboard) render();
  }
}

async function submitAssignment(form) {
  const issueNumber = Number(form.dataset.issue);
  const assignee = new FormData(form).get("assignee");
  const button = form.querySelector("button");
  button.disabled = true;
  try {
    const response = await fetch("/api/issues/" + issueNumber + "/assign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Canvas-Token": config.token,
      },
      body: JSON.stringify({ assignee }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Assignment failed.");
    showToast(payload.message);
    state.dashboard = await fetchDashboard();
    render();
  } catch (error) {
    showToast(error.message);
    button.disabled = false;
  }
}

function bindEvents() {
  document.querySelector("#refresh")?.addEventListener("click", refresh);
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      state.activeTab = tab.dataset.tab;
      state.filter = "";
      render();
    });
  });
  document.querySelector("#filter")?.addEventListener("input", (event) => {
    state.filter = event.target.value;
    render();
    const input = document.querySelector("#filter");
    input?.focus();
    input?.setSelectionRange(state.filter.length, state.filter.length);
  });
  document.querySelectorAll(".assignment").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitAssignment(form);
    });
  });
}

void refresh();
`;
