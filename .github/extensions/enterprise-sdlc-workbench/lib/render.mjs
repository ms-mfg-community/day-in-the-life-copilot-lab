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

function page({ title, token, body }) {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<meta name="capability-token" content="${escapeHtml(token)}" />
<style>
  body { font-family: -apple-system, Segoe UI, sans-serif; margin: 16px; color: #1f2328; }
  h1 { font-size: 18px; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border-bottom: 1px solid #d0d7de; padding: 6px 8px; text-align: left; font-size: 13px; }
  .blocked { color: #9a6700; }
  .ready { color: #1a7f37; }
  .closed { text-decoration: line-through; color: #59636e; }
</style>
</head>
<body>
<h1>${escapeHtml(title)}</h1>
${body}
<script>
  window.CAPABILITY_TOKEN = ${JSON.stringify(token)};
</script>
</body>
</html>`;
}

export function renderBoard({ board, readiness, token }) {
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
</tr>`;
        })
        .join("\n");

    const body = `
${modeBadge(board.mode)}
<p>${escapeHtml(board.sourceRepo ?? "")} &mdash; captured ${escapeHtml(board.capturedAt ?? "")}</p>
<table>
  <thead><tr><th>#</th><th>Title</th><th>Labels</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

    return page({ title: "SDLC board", token, body });
}

export function renderCodeMap({ codeMap, token }) {
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

    const body = `
${modeBadge("live")}
${warning}
<table>
  <thead><tr><th>Project</th><th>Path</th><th>Kind</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

    return page({ title: "Code map", token, body });
}

export function renderReleaseComposer({ draft, token }) {
    const body = `
${modeBadge("fixture")}
<pre style="white-space:pre-wrap;background:#f6f8fa;padding:12px;border-radius:6px;">${escapeHtml(draft ?? "")}</pre>`;
    return page({ title: "Release composer", token, body });
}
