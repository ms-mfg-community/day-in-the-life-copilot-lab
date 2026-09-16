---
module: M4
title: "GitHub Agentic Workflows (gh-aw)"
anchor_labs: [lab08, lab09]
minutes: 25
phase: 3b
---

# M4 — GitHub Agentic Workflows (gh-aw)

## The advanced problem

Your local Copilot CLI loadout ends at your laptop. **gh-aw** — GitHub Agentic Workflows — is the same agent surface running in GitHub Actions, triggered by `push`, `pull_request`, `issues`, `schedule`, and friends. Fluent users already know what gh-aw is. The advanced question: **when does it earn its slot, what are the real failure modes in a CI agent, and how do you keep the blast radius small?**

The trap is treating gh-aw like a prompt runner. It isn't. It's an agent with tools, token scopes, and mutation rights on your repo. Every one of those is configurable — and every one of them is a way to blow up if you get it wrong.

Anchor labs: `labs/lab08.md` (PRD generation), `labs/lab09.md` (coding agent + code review).

---

## A gh-aw workflow is a Markdown file with YAML front-matter

Two parts — and this is the whole mental model:

1. **YAML front-matter** — the deterministic shell: triggers (`on:`), token scopes (`permissions:`), tool allowlist (`tools:`), runtimes (`runtimes:`), mutation rights (`safe-outputs:`), description.
2. **Markdown body** — the agent prompt. Free-form natural language. The agent reasons over this; it does not execute it line by line.

Lives in `.github/workflows/*.md`. The compiler emits a `.lock.yml` counterpart — that's the generated GitHub Actions YAML that actually runs. **Edit the `.md`, never the `.lock.yml`.**

---

## A real example in this repo — `weekly-content-audit.md`

`.github/workflows/weekly-content-audit.md` is the only gh-aw workflow currently committed. It's the reference shape. Key front-matter:

```yaml
---
on:
  schedule:
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
    labels: [automated, content-audit, needs-review]
    draft: false
    max: 1

description: "Weekly staleness audit — opens a PR with registry/lab updates and an audit report."
---
```

Notice: **read-only `permissions:`**, an **explicit `bash:` allowlist** (no `*`), two MCP servers attached inline, and all mutation funneled through `safe-outputs.create-pull-request` with `max: 1`. That's the shape of a CI agent you can trust.

Full spec: <https://github.github.io/gh-aw/reference/frontmatter/>.

---

## The stable front-matter keys you'll actually use

- `on:` — standard GitHub Actions triggers (`push`, `pull_request`, `issues`, `schedule`, `workflow_dispatch`, `create`). Plus gh-aw extensions: `reaction`, `stop-after`, `manual-approval`, `roles`, `skip-roles`, `skip-bots`.
- `permissions:` — same syntax as core Actions. **Keep it read-only**; writes go through `safe-outputs`.
- `tools:` — top-level allowlist: `github.toolsets`, `bash:` (array of permitted commands), `edit:`, `web-fetch:`, and inline MCP servers (`type: http` or stdio `command:/args:`).
- `runtimes:` — pin `node`, `python`, `go`, `dotnet`, etc. Defaults are sensible (`dotnet: "8.0"`); override only with reason.
- `safe-outputs:` — the **only** legitimate mutation surface. `create-pull-request`, `add-comment`, `add-labels`, `dispatch-workflow`. Every safe-output can cap with `max:` and `labels:`.
- `description:` — human-readable, shows up in the Actions UI and the generated lock file.

---

## Two CI agent patterns — pick the right one

- **Event-triggered authoring** — `on: create` (feature branch) or `on: issues: types: [opened]`. The agent reads context, drafts an artifact (PRD, issue triage, release notes), and opens a PR. Example in repo: `.github/workflows/generate-prd.md` (see `labs/lab08.md`).
- **PR review on every change** — `on: pull_request: types: [opened, synchronize]`. The agent reads the diff, posts structured review comments. Mutation is `safe-outputs.add-comment` + `add-labels`. Example in repo: `.github/workflows/code-review.md` (see `labs/lab09.md`).
- **Scheduled sweep** — `on: schedule: cron: ...`. The agent crawls state (versions, URLs, registry drift) and opens a single summary PR. Example in repo: `.github/workflows/weekly-content-audit.md`.

Three patterns, three triggers. Don't invent a fourth when one of these fits.

---

## Safe-outputs is the trust boundary

`permissions:` is read-only; the agent **cannot** push commits, post comments, or add labels directly. Every mutation declared under `safe-outputs:` becomes a post-agent step that the platform executes with its own token. That means:

- **The blast radius is what's in `safe-outputs:`, nothing more.** An agent prompt that says "delete all issues" has nowhere to delegate that intent; it's simply unreachable.
- **`max:` caps the volume.** `create-pull-request: { max: 1 }` means one PR per run — not one per request inside the agent's reasoning.
- **Labels, title prefixes, draft state — all declared up-front.** Reviewers always know which PRs came from which workflow.

When a gh-aw agent does something you didn't authorize, the bug is almost always a too-broad `safe-outputs:` block, not the prompt.

---

## Debugging a misfiring CI agent

Symptoms and the first place to look:

- **Never triggers.** `on:` filter or `if:` expression wrong. Read the expanded `.lock.yml` in the Actions run log; the filter evaluates there.
- **Triggers, no mutation.** `safe-outputs:` missing the action the agent wanted. Check the run log for "safe-output not permitted."
- **Permission denied on a bash command.** Command not in the `bash:` allowlist. Add it — do **not** switch to `bash: "*"`.
- **MCP server silent in-workflow.** Same class as local MCP: `tools:` allowlist filtering, auth scope, or cold-start timeout. Grep the Actions log for the server name.
- **Every run opens a new PR.** `max:` missing on `safe-outputs.create-pull-request`. Default is not what you want.

Fast-reproduce locally: `gh aw compile` (preview the `.lock.yml`) and `gh aw run` for a dispatch-style dry run against your fork.

---

## Live demo — the three reference workflows on disk

Anchor labs: `labs/lab08.md`, `labs/lab09.md`.

```bash
ls .github/workflows/
head -25 .github/workflows/weekly-content-audit.md
head -25 .github/workflows/generate-prd.md
head -20 .github/workflows/code-review.md

# Compare the agent markdown to the generated lock file.
diff <(head -40 .github/workflows/weekly-content-audit.md) \
     <(head -40 .github/workflows/weekly-content-audit.lock.yml) | head -30
```

Narrate the three patterns side by side — schedule-sweep (audit), branch-event authoring (PRD), PR review (code-review) — and point at each file's `safe-outputs:` block. That's the whole trust story in one glance.

---

## Expected failure modes

- **Copy-pasting a permissions block from a non-gh-aw workflow.** Core Actions workflows often grant `contents: write`. In gh-aw, **keep it read-only** and route all writes through `safe-outputs`. Writable permissions plus a gh-aw agent is the worst-of-both-worlds shape.
- **Editing the `.lock.yml`.** Regenerated every compile — your edit is gone. Always edit the `.md`.
- **`bash: "*"` as a shortcut.** Opens the agent to anything on the runner. Always enumerate.
- **MCP server URL drift.** The inline `microsoft-learn` `url:` and the inline `context7` `npx` args are pinned to versions. Bump them deliberately when the weekly content audit flags drift.
- **Skipping `max:` on `create-pull-request`.** Without a cap, a retry loop opens N duplicate PRs.
- **Leaking `COPILOT_GITHUB_TOKEN` into a prompt.** The token exists for tool calls, not for the agent to reason about. Never `echo` it in the markdown body.

---

## Takeaway

gh-aw is Copilot CLI's surface area in CI, governed by a different trust model: read-only `permissions:`, explicit `tools:` allowlist, mutations only through `safe-outputs:`. Three patterns — event-authoring, PR-review, scheduled-sweep — cover almost every legitimate use. When in doubt, look at `.github/workflows/weekly-content-audit.md` — it's the reference shape in this repo.
