import assert from "node:assert/strict";

import { renderDashboardHtml } from "./dashboard-html.mjs";
import { DASHBOARD_SCRIPT } from "./dashboard-script.mjs";

new Function(DASHBOARD_SCRIPT);

const html = renderDashboardHtml("test-token");
assert.match(html, /Repository dashboard/);
assert.match(html, /Assign work/);
assert.match(html, /Recommend fix/);
assert.match(html, /Local session/);
assert.match(html, /Cloud session/);
assert.match(html, /test-token/);
