// lib/render.mjs — renders the HTML shown inside each canvas iframe.
// Every piece of untrusted display data (issue/PR titles, labels, bodies)
// goes through `escapeHtml()` before interpolation -- this is the canvas
// trust boundary described in the lab doc, and the adversarial fixture
// exists specifically to prove this function is actually used everywhere
// it needs to be.

export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function modeBadge(mode) {
    const isFixture = mode === "fixture";
    const label = isFixture ? "Fixture" : "Live";
    const color = isFixture ? "#6b7280" : "#1a7f37";
    return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;color:white;background:${color};">${label}</span>`;
}

function page({ title, token, body, revision = 0 }) {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="capability-token" content="${escapeHtml(token)}" />
<meta name="canvas-revision" content="${escapeHtml(revision)}" />
<style>
  body { font-family: -apple-system, Segoe UI, sans-serif; margin: 16px; color: #1f2328; }
  h1 { font-size: 18px; }
  h2 { font-size: 15px; margin-top: 20px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border-bottom: 1px solid #d0d7de; padding: 6px 8px; text-align: left; font-size: 13px; }
  .blocked { color: #9a6700; }
  .ready { color: #1a7f37; }
  .closed { text-decoration: line-through; color: #59636e; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
  .tile { border: 1px solid #d0d7de; border-radius: 6px; padding: 8px; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${body}
<script>
  window.CAPABILITY_TOKEN = ${JSON.stringify(token)};
  window.CANVAS_REVISION = ${JSON.stringify(revision)};
  setInterval(async () => {
    try {
      const html = await fetch(location.href, { cache: "no-store" }).then((response) => response.text());
      const nextRevision = new DOMParser().parseFromString(html, "text/html")
        .querySelector('meta[name="canvas-revision"]')?.content;
      if (nextRevision !== String(window.CANVAS_REVISION)) location.reload();
    } catch {
      // The extension may be reloading; the next poll retries without blanking the canvas.
    }
  }, 1000);
</script>
</body>
</html>`;
}

function renderLinks(items) {
    if (!items?.length) return "—";
    return items
        .map((item) => {
            const text = `#${escapeHtml(item.number)} ${escapeHtml(item.title)} (${escapeHtml(item.state)})`;
            const href = safeHttpUrl(item.url);
            return href ? `<a href="${escapeHtml(href)}">${text}</a>` : text;
        })
        .join("<br />");
}

function safeHttpUrl(value) {
    try {
        const parsed = new URL(String(value));
        return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
    } catch {
        return "";
    }
}

function renderChecks(checks) {
    if (!checks?.length) return "—";
    return checks
        .map((check) => `${escapeHtml(check.name)}: ${escapeHtml(check.conclusion)}`)
        .join("<br />");
}

export function renderBoard({ board, readiness, token, revision = 0 }) {
    const readinessByNumber = new Map(readiness.map((r) => [r.number, r]));
    const rows = (board.issues ?? [])
        .map((issue) => {
            const state = readinessByNumber.get(issue.number);
            const statusClass = issue.state === "closed" ? "closed" : state?.ready ? "ready" : "blocked";
            const statusLabel =
                issue.state === "closed" ? "closed" : state?.ready ? "ready" : `blocked by ${state?.blockedBy.join(", ") || "?"}`;
            return `<tr class="${statusClass}">
  <td>#${escapeHtml(issue.number)}</td>
  <td>${escapeHtml(issue.title)}</td>
  <td>${escapeHtml((issue.labels ?? []).join(", "))}</td>
  <td>${escapeHtml(statusLabel)}</td>
  <td>${renderLinks(issue.linkedPRs)}</td>
  <td>${renderChecks(issue.checks)}</td>
</tr>`;
        })
        .join("\n");

    const epic = board.epic
        ? `<h2>Epic #${escapeHtml(board.epic.number)}: ${escapeHtml(board.epic.title)}</h2>
<p>State: ${escapeHtml(board.epic.state)} · Labels: ${escapeHtml((board.epic.labels ?? []).join(", "))}</p>`
        : "";
    const recentRuns = (board.recentRuns ?? [])
        .map((run) => `<li>${escapeHtml(run.workflow)} — ${escapeHtml(run.status)} / ${escapeHtml(run.conclusion)} — ${escapeHtml(run.createdAt)}</li>`)
        .join("");
    const body = `
${modeBadge(board.mode)}
<p>${escapeHtml(board.sourceRepo ?? "")} &mdash; captured ${escapeHtml(board.capturedAt ?? "")}</p>
${epic}
<table>
  <thead><tr><th>#</th><th>Title</th><th>Labels</th><th>Status</th><th>Linked PRs</th><th>Checks</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<h2>Recent workflow runs</h2>
<ul>${recentRuns || "<li>None found</li>"}</ul>`;

    return page({ title: "SDLC board", token, body, revision });
}

export function renderCodeMap({ codeMap, prerequisites, token, revision = 0 }) {
    const rows = (codeMap.projects ?? [])
        .map(
            (project) => `<tr>
  <td>${escapeHtml(project.name)}</td>
  <td>${escapeHtml(project.path)}</td>
  <td>${project.isTest ? "test" : "app"}</td>
  <td>${escapeHtml(project.status ?? "unknown")}</td>
</tr>`,
        )
        .join("\n");

    const warning =
        codeMap.malformedCount > 0
            ? `<p class="blocked">${escapeHtml(codeMap.malformedCount)} project entr${codeMap.malformedCount === 1 ? "y was" : "ies were"} malformed and skipped.</p>`
            : "";
    const prerequisiteTiles = (prerequisites?.checks ?? [])
        .map((check) => `<div class="tile ${check.available ? "ready" : "blocked"}">
<strong>${escapeHtml(check.label)}</strong><br />
${check.available ? "available" : "unavailable"}<br />
<small>${escapeHtml(check.detail)}</small>
</div>`)
        .join("");
    const liveStatus = prerequisites?.liveModeAvailable
        ? '<p class="ready">Live actions available</p>'
        : '<p class="blocked">Live actions unavailable</p>';

    const body = `
${modeBadge("live")}
${warning}
<h2>Prerequisites</h2>
${liveStatus}
<div class="tiles">${prerequisiteTiles || '<div class="tile blocked">Not checked yet</div>'}</div>
<h2>Solution projects</h2>
<table>
  <thead><tr><th>Project</th><th>Path</th><th>Kind</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

    return page({ title: "Code map", token, body, revision });
}

export function renderReleaseComposer({ draft, token, revision = 0 }) {
    const body = `
${modeBadge("fixture")}
<pre style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:6px;">${escapeHtml(draft ?? "")}</pre>`;
    return page({ title: "Release composer", token, body, revision });
}
