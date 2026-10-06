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
input:focus-visible,
select:focus-visible,
summary:focus-visible {
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 10px;
}

.assignment input,
.assignment select,
.filter-input {
  min-width: 0;
  border: 1px solid var(--border-color-default, #30363d);
  border-radius: 6px;
  padding: 6px 8px;
  background: var(--background-color-default, #0d1117);
  color: var(--text-color-default, #f0f6fc);
}

.assignment label {
  display: grid;
  gap: 4px;
  color: var(--text-color-muted, #8b949e);
  font-size: var(--text-body-small, 12px);
}

.assignment-wide,
.assignment-submit {
  grid-column: 1 / -1;
}

.work-assignment {
  margin-top: 10px;
}

.work-assignment summary {
  width: fit-content;
  list-style: none;
}

.work-assignment summary::-webkit-details-marker {
  display: none;
}

.assignment-result {
  margin-top: 8px;
}

.session-result,
.recommendation-text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
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

.run-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.run-details {
  margin-top: 10px;
}

.run-details-inner {
  border-top: 1px solid var(--border-color-default, #30363d);
  padding-top: 10px;
}

.run-details-inner h4,
.failed-job h4 {
  margin: 0 0 7px;
}

.failed-job {
  margin-bottom: 10px;
}

.failed-job ul {
  margin: 0;
  padding-left: 20px;
}

.failed-logs,
.recommendation-text,
.kickoff-text {
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--border-color-default, #30363d);
  border-radius: 6px;
  padding: 10px;
  background: var(--background-color-default, #0d1117);
  color: var(--text-color-default, #f0f6fc);
  font-family: var(--font-mono, Consolas, monospace);
  font-size: var(--text-code-inline, 12px);
  white-space: pre-wrap;
}

.kickoff-preview {
  margin: 4px 0 8px;
}

.kickoff-text {
  max-height: 220px;
  margin: 4px 0 0;
}

.copilot-recommendation {
  margin-top: 12px;
}

.request-error {
  color: var(--true-color-red, #f85149);
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

  .assignment {
    grid-template-columns: 1fr;
  }
}
`;
