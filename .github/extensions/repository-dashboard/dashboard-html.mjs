import { DASHBOARD_SCRIPT } from "./dashboard-script.mjs";
import { DASHBOARD_STYLES } from "./dashboard-styles.mjs";

function serialize(value) {
    return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderDashboardHtml(token) {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Repository dashboard</title>
    <style>${DASHBOARD_STYLES}</style>
  </head>
  <body>
    <div id="app" aria-live="polite">
      <div class="loading-shell">
        <div class="spinner" aria-hidden="true"></div>
        <p>Loading repository activity...</p>
      </div>
    </div>
    <script>
      globalThis.__REPOSITORY_DASHBOARD__ = ${serialize({ token })};
      ${DASHBOARD_SCRIPT}
    </script>
  </body>
</html>`;
}
