---
on:
  schedule:
    # Sunday 05:00 UTC — weekly content staleness sweep.
    - cron: "0 5 * * 0"
  workflow_dispatch:

permissions:
  contents: read
  issues: read
  pull-requests: read

network: defaults

tools:
  github:
    toolsets: [repos, issues, pull_requests]
  edit:
  bash: ["git", "ls", "cat", "grep", "find", "head", "tail", "wc", "date"]
  web-fetch:
  microsoft-learn:
    type: http
    url: "https://learn.microsoft.com/api/mcp"
  context7:
    command: "npx"
    args: ["-y", "@upstash/context7-mcp@latest"]

safe-outputs:
  create-pull-request:
    title-prefix: "chore(audit): "
    labels:
      - automated
      - content-audit
      - needs-review
    draft: false
    max: 1

description: "Weekly staleness audit — opens a PR with registry/lab updates and an audit report."
---

## Weekly Content Staleness Audit

You are the **Content Currency Auditor** for the Day-in-the-Life Copilot Lab. Your job is to detect drift between what this repo teaches and the current state of the upstream tools/services it references, then propose a single pull request that fixes the safe drift and reports the rest.

The repository's content registry lives at `docs/_meta/registry.yaml`. Treat it as the source of truth for what the labs claim is current.

### Inputs you must read

1. `docs/_meta/registry.yaml` — current pinned versions, MCP servers, models, lab pacing.
2. `docs/_meta/audit-report.template.md` — required output format. **Do not invent a different schema.**
3. Every file under `labs/` (especially `labs/lab*.md` and `labs/appendices/`).
4. `README.md`, `AGENTS.md`, `CONTRIBUTING.md`, `TROUBLESHOOTING.md`.
5. `mcp-configs/**/*.json`.
6. `node/package.json`, all `**/*.csproj` files.
7. `tests/content-currency/**` — the assertions any new registry value must keep satisfying.

### The seven checks (run all of them)

1. **Copilot CLI version** — compare `copilot_cli_version_floor` in the registry to the current GitHub Copilot CLI release. Use `web-search` and `microsoft-learn` MCP to corroborate.
2. **gh-aw schema/features** — compare `gh_aw_schema_version` and any documented features against the latest `github/gh-aw` release notes.
3. **MCP server versions & catalogue** — for each entry under `mcp_servers`, verify the server is still maintained and note any new official servers (`microsoft-learn`, etc.) that should be added.
4. **Referenced documentation URLs** — collect every external URL appearing in `labs/`, `README.md`, `AGENTS.md`, and `mcp-configs/`. HEAD-check each. Record broken or redirected URLs (with the new canonical URL when available). Use the `broken_link_retries` value from `registry.yaml` as the retry count.
5. **Package versions** — for each dependency in `node/package.json` and the top-level `<PackageReference>` entries in `**/*.csproj`, compare against the current latest stable on npm / NuGet via `context7` MCP. Flag majors as **review-needed**, patches/minors as **safe to bump**.
6. **Model names & pricing hints** — for every model name in `models:` (registry) and any model referenced inline in labs, confirm it is still listed in the current model catalogue. Capture pricing-tier hints if they have changed.
7. **Lab pacing** — for each `labs/lab*.md`, sanity-check the `pace_*` minutes in `registry.yaml` against the lab's word count (use ≈250 wpm for self-study, ≈150 wpm for presenter). Flag entries that are off by more than 50%.

### What to change in the PR

- **`docs/_meta/registry.yaml`** — apply only **safe** updates: patch/minor SDK bumps, fixed redirected URLs, added MCP servers that are clearly in scope. Leave majors and model-catalogue churn for human review (record them in the report only).
- **Lab files** — only mechanical edits (e.g., a moved doc URL, a renamed product). Do **not** rewrite prose.
- **`docs/_meta/audit-report.md`** — generate this file fresh from `docs/_meta/audit-report.template.md`. It must contain:
  - A `## Summary` block with totals per check.
  - A `## Checks` section with one subsection per check (`### 1. Copilot CLI version`, etc.) listing findings.
  - A `## Suggestions for Additions` section listing new CLI commands, new MCP servers, or new model IDs that should be taught but currently are not.
  - A `## Metadata` block with the run date, branch name, and registry `schema_version`.

### PR conventions

- Branch name: `automation/weekly-audit-YYYY-MM-DD` (use today's UTC date).
- Commit messages: conventional commits, one logical change per commit, `git add` per file (no `git add .` / `-A`). Each commit ends with the trailer `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.
- Title: `chore(audit): weekly content staleness sweep — YYYY-MM-DD` (the `chore(audit):` prefix is added by `safe-outputs`).
- Body: paste the rendered `docs/_meta/audit-report.md` with a leading `> Generated automatically by .github/workflows/weekly-content-audit.md` quote.
- Labels: `automated`, `content-audit`, `needs-review` (added by `safe-outputs`).
- Mark the PR as **draft** if the total number of file changes exceeds the `audit.draft_pr_if_changes_exceed` threshold from `registry.yaml`.
- Do not request reviewers explicitly — `.github/CODEOWNERS` handles assignment.

### Authentication & secrets

- Use the workflow-provided `COPILOT_GITHUB_TOKEN` for all GitHub API access. Never echo the token. Never commit it.
- All MCP servers in `tools:` are read-only and need no extra credentials.

### Hard constraints

- **Single PR.** If a previous `automation/weekly-audit-*` branch already exists for this week, update it instead of opening a new one.
- **No `write-all` permissions.** The job runs read-only; writes happen exclusively through `safe-outputs`.
- **Deterministic-ish.** Same registry + same upstream state → same report.
- If any check cannot run (network failure, MCP unavailable), record the failure under that check's section in the report rather than skipping silently.
