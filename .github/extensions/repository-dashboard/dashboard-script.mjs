export const DASHBOARD_SCRIPT = String.raw`
const app = document.querySelector("#app");
const config = globalThis.__REPOSITORY_DASHBOARD__;
const FILTER_DEBOUNCE_DELAY_MS = 200;
const state = {
  dashboard: null,
  activeTab: "overview",
  filter: "",
  loading: false,
};
let filterRenderTimeout;

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
  const assigneeOptions = users.map((user) =>
    '<option value="' + escapeHtml(user.login) + '"></option>'
  ).join("");
  const agentOptions = [
    { name: "default" },
    ...state.dashboard.agents,
  ].map((agent) =>
    '<option value="' + escapeHtml(agent.name) + '">' +
      escapeHtml(agent.name === "default" ? "Default agent" : agent.name) +
    '</option>'
  ).join("");
  return '<details class="work-assignment"><summary class="button small primary">Assign work</summary>' +
    '<form class="assignment" data-issue="' + issue.number + '">' +
      '<label>Agent<select name="agent">' + agentOptions + '</select></label>' +
      '<label>Session<select name="executionLocation">' +
        '<option value="local">Local session</option>' +
        '<option value="cloud">Cloud session</option>' +
      '</select></label>' +
      '<label class="assignment-wide">GitHub assignee (optional)' +
        '<input name="assignee" list="assignees-' + issue.number + '" value="' +
        escapeHtml(viewer) + '" /></label>' +
      '<datalist id="assignees-' + issue.number + '">' + assigneeOptions + '</datalist>' +
      '<button class="button small primary assignment-submit" type="submit">Start session</button>' +
    '</form><div class="assignment-result" aria-live="polite"></div></details>';
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
  const recommendationButton = run.conclusion === "failure"
    ? '<button class="button small recommend-run" data-run="' + run.databaseId +
      '" type="button">Recommend fix</button>'
    : "";
  return '<article class="item-card">' +
    '<h3><a href="' + escapeHtml(run.url) + '" target="_blank" rel="noreferrer">' +
      escapeHtml(run.workflowName || run.displayTitle) + ' #' + run.number + '</a></h3>' +
    '<div class="run-meta">' + runBadge(run) +
      '<span>' + escapeHtml(run.headBranch || "No branch") + '</span>' +
      '<span>' + escapeHtml(run.event) + '</span>' +
      '<span>' + escapeHtml(formatDate(run.createdAt)) + '</span></div>' +
    '<div class="run-actions"><button class="button small run-details-button" data-run="' +
      run.databaseId + '" type="button">View details</button>' + recommendationButton + '</div>' +
    '<div class="run-details" id="run-details-' + run.databaseId + '" aria-live="polite"></div>' +
  '</article>';
}

function renderRunDetails(details) {
  const failedJobs = details.failedJobs.length
    ? details.failedJobs.map((job) => {
        const steps = job.failedSteps.length
          ? job.failedSteps.map((step) =>
              '<li><strong>' + escapeHtml(step.name) + '</strong> · ' +
              escapeHtml(step.conclusion) + '</li>'
            ).join("")
          : '<li>No failed step metadata was returned.</li>';
        return '<section class="failed-job"><h4><a href="' + escapeHtml(job.url) +
          '" target="_blank" rel="noreferrer">' + escapeHtml(job.name) +
          '</a></h4><ul>' + steps + '</ul></section>';
      }).join("")
    : '<p class="muted">No failed jobs were reported for this run.</p>';
  const logNotice = details.logsWereTruncated
    ? '<p class="muted">Showing the final 60,000 characters of failed logs.</p>'
    : "";
  const logs = details.failedLogs
    ? '<pre class="failed-logs">' + escapeHtml(details.failedLogs) + '</pre>'
    : '<p class="muted">' + escapeHtml(details.logError || "No failed logs are available.") + '</p>';
  return '<div class="run-details-inner"><h4>Failure breakout</h4>' +
    failedJobs + logNotice + logs + '<div class="copilot-recommendation"></div></div>';
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
        '"' + (state.activeTab === id ? ' aria-current="page"' : "") +
        ' data-tab="' + id + '" type="button">' + label + '</button>'
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
  return requestJson("/api/dashboard", { cache: "no-store" });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "X-Canvas-Token": config.token,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The request failed.");
  return payload;
}

async function refresh() {
  cancelFilterRender();
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
  const formData = new FormData(form);
  const button = form.querySelector(".assignment-submit");
  const result = form.parentElement.querySelector(".assignment-result");
  button.disabled = true;
  result.innerHTML = '<p class="muted">Creating the selected session...</p>';
  try {
    const payload = await requestJson("/api/issues/" + issueNumber + "/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent: formData.get("agent"),
        executionLocation: formData.get("executionLocation"),
        assignee: formData.get("assignee"),
      }),
    });
    result.innerHTML = '<p class="session-result">' + escapeHtml(payload.message) + '</p>';
    showToast("Work session created.");
  } catch (error) {
    result.innerHTML = '<p class="request-error">' + escapeHtml(error.message) + '</p>';
    button.disabled = false;
  }
}

async function showRunDetails(button) {
  const runId = Number(button.dataset.run);
  const container = document.querySelector("#run-details-" + runId);
  if (container.dataset.loaded === "true") {
    container.hidden = !container.hidden;
    button.textContent = container.hidden ? "View details" : "Hide details";
    return;
  }

  button.disabled = true;
  container.innerHTML = '<p class="muted">Loading failed jobs and logs...</p>';
  try {
    const details = await requestJson("/api/runs/" + runId);
    container.innerHTML = renderRunDetails(details);
    container.dataset.loaded = "true";
    container.hidden = false;
    button.textContent = "Hide details";
  } catch (error) {
    container.innerHTML = '<p class="request-error">' + escapeHtml(error.message) + '</p>';
  } finally {
    button.disabled = false;
  }
}

async function recommendRunFix(button) {
  const runId = Number(button.dataset.run);
  const container = document.querySelector("#run-details-" + runId);
  button.disabled = true;
  if (container.dataset.loaded !== "true") {
    await showRunDetails(document.querySelector('.run-details-button[data-run="' + runId + '"]'));
  }
  const target = container.querySelector(".copilot-recommendation") || container;
  target.innerHTML = '<p class="muted">Copilot is analyzing the failure...</p>';
  try {
    const payload = await requestJson("/api/runs/" + runId + "/recommend", {
      method: "POST",
    });
    target.innerHTML = '<h4>Copilot recommendation</h4><pre class="recommendation-text">' +
      escapeHtml(payload.recommendation) + '</pre>';
  } catch (error) {
    target.innerHTML = '<p class="request-error">' + escapeHtml(error.message) + '</p>';
  } finally {
    button.disabled = false;
  }
}

function cancelFilterRender() {
  if (filterRenderTimeout === undefined) return;
  clearTimeout(filterRenderTimeout);
  filterRenderTimeout = undefined;
}

function scheduleFilterRender(input) {
  const filter = input.value;
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;
  const selectionDirection = input.selectionDirection;
  cancelFilterRender();
  filterRenderTimeout = setTimeout(() => {
    state.filter = filter;
    render();
    const renderedInput = document.querySelector("#filter");
    renderedInput?.focus();
    if (selectionStart !== null && selectionEnd !== null) {
      renderedInput?.setSelectionRange(selectionStart, selectionEnd, selectionDirection);
    }
    filterRenderTimeout = undefined;
  }, FILTER_DEBOUNCE_DELAY_MS);
}

function bindEvents() {
  document.querySelector("#refresh")?.addEventListener("click", refresh);
  document.querySelectorAll("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      cancelFilterRender();
      state.activeTab = tab.dataset.tab;
      state.filter = "";
      render();
    });
  });
  document.querySelector("#filter")?.addEventListener("input", (event) => {
    scheduleFilterRender(event.target);
  });
  document.querySelectorAll(".assignment").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      void submitAssignment(form);
    });
  });
  document.querySelectorAll(".run-details-button").forEach((button) => {
    button.addEventListener("click", () => void showRunDetails(button));
  });
  document.querySelectorAll(".recommend-run").forEach((button) => {
    button.addEventListener("click", () => void recommendRunFix(button));
  });
}

void refresh();
`;
