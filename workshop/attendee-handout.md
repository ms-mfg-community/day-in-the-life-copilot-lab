---
title: "Advanced Copilot CLI Workshop — Attendee Handout"
arc: workshop-materials
phase: 4
audience: "Workshop attendees (mid-workshop reference + take-home)"
render_target: "Make handout-pdf for printable PDF"
---

# Advanced Copilot CLI Workshop — Attendee Handout

> **Reference card.** Keep this open during the workshop; take it home
> after. Per-module cards carry the three to five key takeaways, the
> exact terminal commands demonstrated, and pointers back to the
> anchor labs for post-workshop depth.
>
> Per-module minutes and advanced outcomes are authoritative in
> `workshop/curriculum.md`. This document is a condensed reference,
> not a replacement.

## Module cards

One card per module. Copy the commands verbatim; the live demos use
them as-written.

### M1 — Copilot CLI extensibility architecture (35 min)

**Key takeaways.**
- Six extension surfaces form one coherent project profile:
  `AGENTS.md`, custom agents (`~/.copilot/agents/` +
  `.github/copilot/agents/`), skills, prompts, hooks, and memory.
- Reach for each on cost/latency/reuse grounds — not "one of each".
- `AGENTS.md` is the cheapest surface; custom agents are the most
  expensive at session-start.

**Commands.**
```bash
copilot --help
ls ~/.copilot/agents/ .github/copilot/agents/ 2>/dev/null
cat AGENTS.md | head -40
```

**Anchor labs.** `labs/lab01.md` (topology), `labs/lab02.md`
(`AGENTS.md`), `labs/lab03.md` (custom agents), `labs/lab04.md`
(skills + prompts), `labs/lab06.md` (hooks), `labs/lab10.md`
(agent memory: Raw sources → Wiki → Schema).

### M2 — MCP servers in anger (30 min)

**Key takeaways.**
- `copilot --additional-mcp-config <file>` is your per-session
  override lever — do not edit global config mid-demo.
- Silent empty returns usually mean an auth gate or a missing
  capability — not a bug. Check the server's health endpoint first.
- Fabric MCP has an offline Parquet fallback path for restricted
  networks (documented in `labs/lab12.md`).

**Commands.**
```bash
copilot --additional-mcp-config ./mcp-configs/workshop.json
cat ~/.copilot/mcp-config.json
```

**Anchor labs.** `labs/lab05.md` (MCP configuration),
`labs/lab12.md` (Fabric MCP + offline Parquet).

### M3 — Multi-agent orchestration (25 min)

**Key takeaways.**
- Sub-agents are **stateless across invocations** — pass complete
  context every call.
- Model-route by task shape: cheap models for mechanical sweeps,
  premium for judgment.
- Not every task wants a sub-agent. Overhead beats parallelism for
  small scopes.

**Commands.** (inside a Copilot CLI session)
```
/task explore "summarize all README.md files under labs/"
/task code-review "review changes in the last commit on feature/modernize"
```

**Anchor lab.** `labs/lab07.md` (multi-agent orchestration, model
routing, dev/QA/reviewer patterns).

### M4 — GitHub Agentic Workflows (gh-aw) (25 min)

**Key takeaways.**
- gh-aw workflows are markdown under `.github/workflows/*.md`,
  compiled to YAML Actions by `gh aw compile`.
- Schema version is pinned in `docs/_meta/registry.yaml`
  (`gh_aw_schema_version`) — read that before authoring.
- Debug through the generated GitHub Actions log, not the markdown
  source.

**Commands.**
```bash
gh aw --help
gh aw compile
ls .github/workflows/*.md
```

**Anchor labs.** `labs/lab08.md` (PRD-generation workflow),
`labs/lab09.md` (code-review workflow).

### M5 — Enterprise plugin marketplace (20 min)

**Key takeaways.**
- `plugin-template/` is the reference layout: `manifest.yaml`,
  `org-policy.example.yaml`, `CODEOWNERS`, `release.yml`.
- Hooks publish with the plugin and run in every consumer session
  — blast-radius matters.
- Org-scoped discovery is environment-bound; test publish in a
  scratch org first.

**Commands.**
```bash
cat plugin-template/manifest.yaml
cat plugin-template/org-policy.example.yaml
cat plugin-template/CODEOWNERS
cat plugin-template/.github/workflows/release.yml
```

**Anchor lab.** `labs/lab11.md` (building and distributing a
Copilot plugin).

### M6 — A2A / ACP + tmux orchestrator (25 min, flagship)

**Key takeaways.**
- `copilot --acp` runs a Copilot CLI session as an Agent Client
  Protocol server (`--acp  Start as Agent Client Protocol server`
  per `copilot --help`).
- The tmux orchestrator pattern: one long-lived orchestrator pane,
  short-lived worker panes, `plan → implement → handoff → clear →
  qa → clear → next`.
- Lab 14 compatibility matrix: native macOS/Linux supported, WSL2
  on Linux filesystem recommended for Windows, `/mnt/c/` degraded,
  Windows-PowerShell-only unsupported for live delivery.

**Commands.**
```bash
copilot --help | grep acp
scripts/orchestrator/tmux-start.sh
scripts/orchestrator/handoff.sh
scripts/orchestrator/clear-context.sh
```

**Anchor labs.** `labs/lab13.md` (A2A + ACP handshake),
`labs/lab14.md` (orchestrator + tmux deep-dive + compatibility
matrix).

## Troubleshooting

Primary reference: `TROUBLESHOOTING.md` at the repo root. The
patterns below are the ones attendees hit most often in delivery.

| Symptom | Likely cause | First fix |
|---|---|---|
| `copilot` not found | CLI not installed or not on `PATH` | Re-run the install from `README.md` prework |
| MCP server hangs on a tool call | Missing auth or capability | Swap to `--additional-mcp-config` with the offline/stub server |
| `gh aw compile` fails with schema error | Version drift in workflow markdown | Check `docs/_meta/registry.yaml` → `gh_aw_schema_version` |
| tmux panes start then die on Windows | WSL1 or repo under `/mnt/c/` | Move repo to Linux filesystem inside WSL2 |
| Sub-agent dispatch returns nothing | Stateless — missing context | Re-dispatch with the full context embedded in the task prompt |
| Plugin publish rejects with CODEOWNERS error | Missing owner approval | Check `plugin-template/CODEOWNERS` pattern |

If none of the above apply, capture the exact command, the full
error, and the environment (`uname -a`, `copilot --version`), and
file an issue against the workshop repo.

## Resources

- Repository: this repo (`README.md` is the entry point).
- `copilot --help` — authoritative CLI reference.
- Microsoft Learn entries cited in the decks (see slide footers for
  URLs).
- Curriculum: `workshop/curriculum.md` (guarded source of truth for
  module minutes and advanced outcomes).
- Timing: `workshop/timing-plan.md`.
- Facilitator-side playbook: `workshop/facilitator-guide.md`
  (interesting to read post-workshop — shows the fallback machinery).
