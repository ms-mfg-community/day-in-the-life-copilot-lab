---
module: M4
title: "GitHub Agentic Workflows (gh-aw) — speaker script"
slide_source: workshop/slides/40-module-4.md
minutes: 25
phase: 3b
---

# M4 — Speaker script

Target audience: fluent Copilot CLI users who already know what gh-aw
is and have at least read one workflow file. This module is about
authoring CI agents safely: the trust model (`permissions:` read-only,
mutations via `safe-outputs:`), the three real patterns in repo, and
the failure modes you only find in production.

## 1. Open with the advanced problem

Do **not** start with "gh-aw is a way to run AI agents in GitHub
Actions". The room knows. Start with the trust model.

**Verbatim hook (~45 seconds):**

> "Everyone here has seen a gh-aw workflow. Some of you have written
> one. The advanced question is: **what is the blast radius of the
> agent you just shipped, and how do you prove it?** In standard
> GitHub Actions, you control blast radius with `permissions:`. In
> gh-aw, `permissions:` is only half the picture — the other half is
> `safe-outputs:`. Get that wrong and an agent that was supposed to
> post a comment can open pull requests on your default branch."

Point at the real example:

> "This repo ships one production gh-aw workflow —
> `.github/workflows/weekly-content-audit.md`. Over the next 25
> minutes we are going to treat it as the reference shape, then
> compare it to `generate-prd.md` and `code-review.md` — three
> patterns, three triggers, one trust model."

Anchor labs: `labs/lab08.md` (PRD authoring pattern), `labs/lab09.md`
(code-review pattern).

## 2. Demo script

**Copilot CLI + `gh` CLI only.** Every file exists in the repo; no
live GitHub Actions run required.

### Demo A — `.md` + `.lock.yml` side-by-side (~3 min)

```bash
cd ~/Coding_Projects/day-in-the-life-copilot-lab
ls .github/workflows/
head -40 .github/workflows/weekly-content-audit.md
head -40 .github/workflows/weekly-content-audit.lock.yml
```

Narrate: "The `.md` is what you edit. The `.lock.yml` is what GitHub
Actions runs. The compiler generates the lock file — **never edit
it by hand**. If you do, your next `gh aw compile` wipes the edit."

### Demo B — the three patterns on disk (~5 min)

```bash
# Pattern 1 — scheduled sweep (audit).
sed -n "1,40p" .github/workflows/weekly-content-audit.md

# Pattern 2 — branch-event authoring (PRD).
sed -n "1,22p" .github/workflows/generate-prd.md

# Pattern 3 — PR review on every change.
sed -n "1,20p" .github/workflows/code-review.md
```

Walk the room through each front-matter:

- **Audit:** `on: schedule + workflow_dispatch`, read-only
  permissions, two MCP servers, `safe-outputs.create-pull-request`
  with `max: 1`.
- **PRD:** `on: create` + `if:` branch-name filter, read-only
  permissions, bash allowlist scoped to `["dotnet", "mkdir"]`,
  `safe-outputs.create-pull-request` with `labels:` and a
  `title-prefix:`.
- **Code review:** `on: pull_request: [opened, synchronize]`,
  read-only permissions, `safe-outputs.add-comment` +
  `add-labels` — **no** pull-request-creation rights.

Land the beat: *"Three triggers, three mutation shapes, one
read-only permissions block. That is the whole trust story."*

### Demo C — the `safe-outputs` trust boundary (~5 min)

```bash
grep -n "safe-outputs" .github/workflows/*.md
grep -A6 "safe-outputs" .github/workflows/weekly-content-audit.md
```

Narrate: *"`permissions:` is what the agent's tools can read.
`safe-outputs:` is what the platform will do **for** the agent
after the agent finishes. The agent cannot `git push`; it can only
*ask* the platform to open a PR — and only if `create-pull-request`
is declared here, and only up to `max:` of them."*

Then the counter-example:

```bash
# Show what happens when you forget `max:`. Do NOT apply — read only.
grep -B1 -A5 "safe-outputs" .github/workflows/weekly-content-audit.md
```

Point: *"`max: 1` is the difference between one PR per run and N
duplicate PRs from an agent that retried itself."*

### Demo D — `tools:` allowlist and inline MCP (~4 min)

```bash
sed -n "15,27p" .github/workflows/weekly-content-audit.md
```

Call out each field verbatim from the file:

- `github.toolsets: [repos, issues, pull_requests]` — the GitHub
  MCP toolset allowlist.
- `bash: ["git", "ls", "cat", "grep", "find", "head", "tail", "wc", "date"]`
  — explicit list, **not** `"*"`. Every binary is enumerated.
- `edit:` — file-edit tool enabled.
- `web-fetch:` — HTTP GET from allowed URLs.
- `microsoft-learn:` — inline HTTP MCP server, pinned to
  `https://learn.microsoft.com/api/mcp`.
- `context7:` — inline stdio MCP server, pinned to
  `npx -y @upstash/context7-mcp@latest`.

*"This file is two MCP servers, one `tools:` allowlist, and a
capped `safe-outputs:` — it is the smallest possible trustworthy
CI agent."*

### Demo E — frontmatter spec lookup on the fly (~3 min)

```bash
# Spec lives upstream; this repo cites it in lab08.
grep -n "frontmatter" labs/lab08.md | head
```

Live on stage: open
<https://github.github.io/gh-aw/reference/frontmatter/> in a browser,
search for `safe-outputs`, point at the `create-pull-request`
section, confirm `max:` is a first-class field.

Teach the pattern: *"Never guess a front-matter key. Either the
repo has a working example you copy, or the spec URL has it. Do
not ship an invented key — the compile will fail in CI."*

## 3. Timing cues

<!-- total: 25 min -->

- 0:00 — Hook: blast radius and the `permissions:` + `safe-outputs:` pair. Point at `weekly-content-audit.md`. (2 min)
- 2:00 — Slide: "A gh-aw workflow is a Markdown file with YAML front-matter." Two parts — deterministic shell plus agent prompt. (2 min)
- 4:00 — **Demo A** — `.md` vs `.lock.yml` side-by-side. (3 min)
- 7:00 — Slide: "A real example in this repo — `weekly-content-audit.md`." (2 min)
- 9:00 — **Demo B** — the three patterns on disk (audit / PRD / code-review). (5 min)
- 14:00 — Slide: "The stable front-matter keys you will actually use." (1 min)
- 15:00 — **Demo C** — `safe-outputs` as the trust boundary. (4 min)
- 19:00 — Slide: "Two CI agent patterns — pick the right one." Cross-reference the Demo B files. (1 min)
- 20:00 — **Demo D** — `tools:` allowlist + inline MCP in audit workflow. (3 min)
- 23:00 — Slide: "Debugging a misfiring CI agent." Read the five symptoms. (1 min)
- 24:00 — Slide: "Takeaway." Three patterns, one trust model. (1 min, closes at 25:00)

## 4. Expected pitfalls

- **Someone proposes `permissions: contents: write`.** Reject out loud. In gh-aw the default posture is read-only permissions + mutations through `safe-outputs`. Writable permissions **plus** a gh-aw agent is the worst-of-both-worlds shape — you lose the audit trail and the cap at the same time.
- **Attendee edits the `.lock.yml` live.** Do not let this happen on stage. Always edit the `.md`. If someone insists, show `gh aw compile` regenerating the lock file and silently dropping their change.
- **`bash: "*"` as a shortcut.** Refuse. Explicit allowlist or nothing. Point at the audit workflow's enumeration as the reference length.
- **Missing `max:` on `create-pull-request`.** Name it before demo C — otherwise someone asks "what is `max:` for?" and you eat three minutes. Answer in advance: *"it is the cap on how many PRs a single run can open."*
- **Inline MCP server version drift.** The inline `context7` `@latest` is the reason `.github/workflows/weekly-content-audit.md` itself exists — the weekly audit flags upstream drift. Show `docs/_meta/registry.yaml` if you have 30 seconds; otherwise refer out.
- **Secrets in the prompt body.** `COPILOT_GITHUB_TOKEN` exists for tool calls, not for the prompt to reason about. Never `echo` it in the Markdown body. If the audit catches a prompt that mentions the token name, flag it for removal.
- **No Actions runs on the demo fork.** If the venue's account has no successful runs yet, do not try to trigger one live — walk the files and lock files on disk. The demos are written to not require a live run.
- **Frontmatter key someone saw online but is not in the spec.** Unknown keys compile-fail. Defer: *"open the spec URL, search for it, and if it is not there we do not ship it."*

## 5. Q&A prompts

- "Who has a gh-aw workflow in production today? What does its `safe-outputs:` block look like?"
- "Has anyone hit the lock-file-out-of-sync bug? How did you notice?"
- "What is your policy on `permissions:` in gh-aw — always read-only, or do you ever grant writes? Why?"
- "Anyone embedded an MCP server inline in a workflow? Which one, and how did you handle auth / rate limits?"
- "How are you versioning your gh-aw workflow files — pinning commits, or tracking `main`? What does `gh aw update` get you?"
- "What would you add to the weekly audit workflow in this repo if you inherited it tomorrow?"

## 6. Advanced-tip callouts

- **`gh aw compile` is the fastest feedback loop.** Regenerates the `.lock.yml` locally; you never need to push to see a syntax error.
- **`on.stop-after:` is the runaway-cost circuit breaker.** Set a deadline and the workflow self-disables after it. Use for experimental agents.
- **`on.roles:` and `on.skip-bots:` are access control.** Trigger only for `admin/maintainer/write`; skip when the actor is a bot you do not want looping. Reads like plumbing; behaves like a firewall.
- **`safe-outputs.max:` is the only durable cap.** An over-eager agent cannot talk its way past it — the platform enforces, not the prompt.
- **Inline MCP servers attach with the same shape as stdio / http MCP config.** If the server works locally under `copilot --additional-mcp-config`, the inline `tools:` form will work in-workflow too.
- **The `.lock.yml` is the real audit surface.** Reviewers should diff the `.lock.yml` on any PR that edits a workflow `.md` — that is the regenerated Actions YAML and it is the source of truth for what GitHub will execute.
- **`source:` + `redirect:` in front-matter let you track upstream workflows.** When you install a workflow with `gh aw add`, the `source:` field pins it; `redirect:` handles the upstream author renaming the file without breaking your install. Worth a 30-second mention if the room has a shared workflow library.
