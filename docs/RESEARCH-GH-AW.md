# Research: GitHub Agentic Workflows (gh-aw)

**Date:** 2026-02-09
**Source:** https://github.github.io/gh-aw/

## What It Is

GitHub Agentic Workflows (gh-aw) is a framework for running AI-powered automation inside GitHub Actions. Workflows are Markdown files (`.md`) in `.github/workflows/`, compiled to GitHub Actions YAML (`.lock.yml`), executed by a coding agent (Copilot CLI, Claude, or Codex) inside a sandboxed container.

**Made by:** GitHub Next & Microsoft Research

## What gh-aw Provides That We Don't Need to Build

This is the critical insight — gh-aw as a layer eliminates significant infrastructure work from our roadmap.

| Capability | gh-aw Does It | We Were Going to Build It |
|-----------|--------------|--------------------------|
| CI/CD triggers (push, PR, issue, schedule, manual) | Yes — `on:` frontmatter | Part of enterprise vision |
| Sandboxed execution | Yes — containerized agent + network firewall | P0 in vision doc |
| Permission separation (read-only agent, safe writes) | Yes — safe-outputs with separate jobs | Part of security requirements |
| Multi-engine support (Copilot, Claude, Codex) | Yes — `engine:` config | Cross-tool coordination |
| MCP server integration | Yes — stdio, container, or HTTP | Already have this |
| Secret management | Yes — `secrets:` with per-tool injection, not in AI context | P0 in vision doc |
| Workflow chaining | Yes — `dispatch-workflow` safe output | Not started |
| Concurrency control | Yes — automatic concurrency policies | Not started |
| Network firewall (domain allowlisting) | Yes — Agent Workflow Firewall | P0 in vision doc |
| Scheduled runs (cron) | Yes — `schedule:` trigger | P2 "scheduled teams" |
| Pre/post execution steps | Yes — `steps:` and `post-steps:` | Not started |
| Sidecar services (postgres, etc.) | Yes — `services:` | Not started |
| Persistent cross-run memory | Yes — `cache-memory` tool | Partially via shared_state |
| Audit trail (lock files, workflow-id markers) | Yes — compilation + markers | P0 in vision doc |
| Safe write operations (PRs, issues, comments, labels) | Yes — 20+ safe-output types | Not started |

## What We Still Uniquely Provide (Session Broker Value-Add)

| Capability | Why gh-aw Doesn't Cover It |
|-----------|---------------------------|
| **Real-time inter-agent messaging** | gh-aw agents are isolated per workflow run |
| **File conflict detection** | No concept of concurrent file edits across agents |
| **Team management with roles** | No team abstraction, just individual workflow runs |
| **Live dashboard** | GitHub Actions UI shows jobs, not agent coordination |
| **Semantic search across sessions** | No cross-run agent discovery |
| **Shared state across agents** | `cache-memory` is per-workflow, not cross-agent |
| **Task management with dependencies** | No task board, just workflow triggers |
| **wait_for_event coordination** | Agents can't wait on each other's events |
| **Fleet mode coordination** | Fleet sub-agents need broker for conflict detection |

## The Integration Play

**gh-aw is the platform layer. Session broker is the coordination layer.**

```
GitHub Event (push, PR, issue, schedule)
  ↓
gh-aw workflow triggers
  ↓
Agent runs in sandboxed container with:
  - MCP access to session-broker (HTTP endpoint)
  - Safe outputs for PRs, issues, comments
  - Network access to broker endpoint
  ↓
Session broker provides:
  - Team creation + agent registration
  - Task assignment + dependency tracking
  - File intent declaration + conflict detection
  - Cross-agent messaging
  - Dashboard visibility
```

### MCP Server Config in gh-aw

The session broker can be added to any gh-aw workflow as an HTTP MCP server:

```yaml
---
on:
  issues:
    types: [opened, labeled]
permissions:
  issues: write
  contents: read
tools:
  github:
    toolsets: [issues, pull_requests]
  mcp-servers:
    session-broker:
      url: "https://broker.example.com/mcp"
      headers:
        Authorization: "Bearer ${{ secrets.BROKER_TOKEN }}"
      allowed: ["register_session", "create_team", "create_task", "update_task",
                "send_message", "declare_intent", "check_conflicts", "list_tasks"]
network:
  allowed:
    - defaults
    - "broker.example.com"
safe-outputs:
  create-pull-request:
    max: 1
---

# Feature Implementation Workflow

Read the issue and analyze requirements.
Register with the session broker and create a team.
Decompose work into tasks with dependencies.
Coordinate with other agents via broker messaging.
Implement the feature and create a PR.
```

### Or as a Container Image

```yaml
tools:
  mcp-servers:
    session-broker:
      container: "ghcr.io/your-org/session-broker:latest"
      env:
        BROKER_PORT: "3456"
        BROKER_DB_PATH: "/tmp/broker.db"
```

## What This Changes in Our Roadmap

### Can Drop or Simplify

- **CI/CD trigger infrastructure** — gh-aw handles it
- **Sandbox/container security** — gh-aw handles it
- **Secret management** — gh-aw handles it, broker just needs to accept auth
- **Scheduled agent runs** — gh-aw cron triggers
- **Safe write operations** — gh-aw safe-outputs handle PRs, issues, etc.

### Should Add

- **Broker authentication** — gh-aw will pass `Authorization` header; broker needs to validate it
- **Container image packaging** — publish broker as `ghcr.io` image for gh-aw `container:` config
- **Stateless mode** — per-workflow-run broker instance (SQLite in `/tmp`) for isolated runs
- **Persistent mode** — central broker for cross-workflow coordination

### Keeps Its Value

- **Inter-agent coordination** — gh-aw agents are isolated; broker bridges them
- **File conflict detection** — unique to broker
- **Dashboard** — complements GitHub Actions UI with agent-specific views
- **Fleet mode integration** — broker coordinates fleet sub-agents
- **Cross-platform** — works with local dev (tmux), gh-aw, and any MCP client

## gh-aw Architecture Details

### Workflow Structure

```
.github/workflows/
  my-workflow.md           # Source (frontmatter + markdown prompt)
  my-workflow.lock.yml     # Compiled (GitHub Actions YAML)
```

Markdown body loaded at runtime — editable without recompilation. Only frontmatter changes require `gh aw compile`.

### Safe Outputs (20+ Types)

| Category | Operations |
|---------|-----------|
| Issues | create, update, close |
| PRs | create, update, close, review-comment |
| Comments | add, hide |
| Labels | add, remove |
| Assignments | reviewer, milestone, user, agent |
| Workflows | dispatch (trigger other workflows) |
| Projects | create, update, status-update |
| Security | create/autofix code-scanning alerts |
| Releases | update, upload-asset |
| Discussions | create, update, close |

All sanitized: secret redaction, URL filtering, size limits, HTTPS enforcement. Write operations run in separate jobs with scoped permissions.

### Tools Available to Agent

| Tool | Description |
|------|-------------|
| `bash` | Shell commands |
| `edit` | File editing |
| `github` | GitHub API (20 toolsets: issues, PRs, actions, code_security, etc.) |
| `web-fetch` | HTTP requests |
| `web-search` | Web search |
| `playwright` | Browser automation |
| `cache-memory` | Persistent cross-run memory |
| `repo-memory` | Repository-specific context |
| `agentic-workflows` | Workflow introspection |
| Custom MCP servers | stdio, container, or HTTP |

### Engine Config

```yaml
engine:
  id: copilot          # or claude, codex
  model: gpt-5         # or claude-sonnet-4, etc.
```

### Network Firewall

```yaml
network:
  allowed:
    - defaults           # Basic infrastructure
    - python             # PyPI ecosystem
    - "api.example.com"  # Custom domains
```

## Action Items

1. [x] Add API key authentication to session broker (`BROKER_TOKEN` env var, bearer middleware)
2. [ ] Package broker as container image for `ghcr.io`
3. [ ] Create sample gh-aw workflow using broker as MCP server
4. [ ] Test broker connectivity from gh-aw sandbox
5. [ ] Add "stateless mode" (ephemeral SQLite) for isolated workflow runs
6. [x] Update vision doc to reflect what gh-aw provides as platform layer (VISION-K8S-FOR-AGENTS.md)
