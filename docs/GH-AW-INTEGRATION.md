# GitHub Agent Workers (gh-aw) Integration Guide

How to run AI agent teams coordinated by the session broker inside GitHub Actions workflows.

## Architecture

```
GitHub Actions Runner
├── Service: session-broker (container, port 3456)
│   ├── MCP endpoint: /mcp
│   ├── REST API: /api/*
│   ├── SSE events: /events
│   └── SQLite (ephemeral /tmp/broker.db)
│
└── Job Steps
    ├── Register agent session (REST)
    ├── Create team + tasks (REST)
    └── gh-aw agent (connects via MCP)
```

The broker runs as a **sidecar service container** alongside your workflow job. Agents connect to it at `http://localhost:3456/mcp` using the MCP protocol.

## Prerequisites

1. **Container image** published to `ghcr.io` (see `docker-publish.yml` workflow)
2. **gh-aw preview access** (if using GitHub-hosted agent workers)
3. **`BROKER_TOKEN` secret** (optional, for authenticated access)

## Quick Start

### 1. Add the broker as a service

```yaml
jobs:
  agent-work:
    runs-on: ubuntu-latest
    services:
      broker:
        image: ghcr.io/YOUR_ORG/session-broker:latest
        ports:
          - 3456:3456
        env:
          BROKER_DB_PATH: /tmp/broker.db
          BROKER_TOKEN: ${{ secrets.BROKER_TOKEN }}
        options: >-
          --health-cmd "curl -sf http://localhost:3456/health || exit 1"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
```

### 2. Wait for health check

```yaml
    steps:
      - name: Wait for broker
        run: |
          for i in $(seq 1 30); do
            curl -sf http://localhost:3456/health > /dev/null 2>&1 && exit 0
            sleep 2
          done
          exit 1
```

### 3. Register and set up team

```yaml
      - name: Setup
        run: |
          # Register session
          curl -sf -X POST http://localhost:3456/api/register \
            -H 'Content-Type: application/json' \
            -d '{"id":"agent-1","purpose":"Feature work","working_dir":"/github/workspace","worktree":null}'

          # Create team
          TEAM_ID=$(curl -sf -X POST http://localhost:3456/api/teams \
            -H 'Content-Type: application/json' \
            -d '{"name":"my-team"}' | jq -r '.id')

          # Create tasks
          curl -sf -X POST "http://localhost:3456/api/teams/$TEAM_ID/tasks" \
            -H 'Content-Type: application/json' \
            -d '{"subject":"Implement feature"}'
```

### 4. Configure MCP for gh-aw agent

In your agent's tool configuration:

```yaml
tools:
  mcp-servers:
    session-broker:
      type: http
      url: http://localhost:3456/mcp
      headers:
        Authorization: "Bearer ${{ secrets.BROKER_TOKEN }}"
```

## MCP Config for Copilot CLI

If using GitHub Copilot CLI as the agent runtime, create `.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "session-broker": {
      "type": "http",
      "url": "http://localhost:3456/mcp",
      "tools": ["*"]
    }
  }
}
```

## Network Configuration

### Sidecar mode (recommended)

When the broker runs as a `services` container in the same job, it's accessible at `localhost:3456`. No additional network configuration needed.

### External broker

If the broker runs on an external server:

1. Set the broker URL in your workflow:
   ```yaml
   env:
     BROKER_URL: https://broker.example.com
   ```

2. For gh-aw, allow the broker URL in network config:
   ```yaml
   network:
     allowed:
       - broker.example.com:443
   ```

3. Set `BROKER_TOKEN` for authentication.

## Available MCP Tools

Once connected, agents can use all 40+ broker tools:

| Category | Tools | Purpose |
|----------|-------|---------|
| **Sessions** | `register_session`, `deregister_session`, `list_sessions` | Agent lifecycle |
| **Teams** | `create_team`, `join_team`, `leave_team`, `list_teams` | Team coordination |
| **Tasks** | `create_task`, `update_task`, `list_tasks`, `get_task` | Task management |
| **Messaging** | `send_message`, `get_messages` | Agent communication |
| **Conflicts** | `declare_intent`, `release_intent`, `check_conflicts` | File safety |
| **Capabilities** | `declare_capabilities`, `find_capable_agents` | Smart routing |
| **Events** | `wait_for_event`, `get_team_activity` | Real-time coordination |
| **Search** | `search_sessions` | Semantic agent discovery |

## Multi-Agent Pattern

For workflows that spawn multiple agents:

```yaml
    steps:
      - name: Create team with tasks
        run: |
          TEAM_ID=$(curl -sf -X POST http://localhost:3456/api/teams \
            -H 'Content-Type: application/json' \
            -d '{"name":"feature-team"}' | jq -r '.id')

          # Agent 1: implementation
          curl -sf -X POST "http://localhost:3456/api/teams/$TEAM_ID/tasks" \
            -H 'Content-Type: application/json' \
            -d '{"subject":"Implement feature","active_form":"Implementing feature"}'

          # Agent 2: testing (blocked by implementation)
          TASK2=$(curl -sf -X POST "http://localhost:3456/api/teams/$TEAM_ID/tasks" \
            -H 'Content-Type: application/json' \
            -d '{"subject":"Write tests","active_form":"Writing tests"}' | jq -r '.id')

          # Set dependency
          curl -sf -X PATCH "http://localhost:3456/api/tasks/$TASK2" \
            -H 'Content-Type: application/json' \
            -d '{"add_blocked_by":[1]}'
```

Each agent registers separately, joins the team, and claims tasks via `update_task` with its name as `owner`.

## Monitoring

### Check status during workflow

```yaml
      - name: Monitor
        run: |
          curl -sf http://localhost:3456/api/teams/$TEAM_ID/status | jq .
          curl -sf http://localhost:3456/api/teams/$TEAM_ID/tasks | jq .
```

### Dashboard (external broker only)

If running the broker externally with the dashboard:

```bash
docker compose up  # starts broker + dashboard on ports 3456 and 3001
```

Dashboard shows real-time agent sessions, team status, task progress, and activity feeds.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Broker health check fails | Check container logs: `docker logs <container>`. Ensure port 3456 is mapped. |
| Agent can't connect to MCP | Verify URL is `http://localhost:3456/mcp`. Check `Accept: text/event-stream` header. |
| Auth failures | Set `BROKER_TOKEN` secret and pass it in `Authorization: Bearer <token>` header. |
| Tasks not visible | Ensure agent joined the team before listing tasks. Tasks are team-scoped. |
| File conflicts | Use `declare_intent` before editing files, `check_conflicts` to detect overlaps. |

## Sample Workflow

See `.github/workflows/broker-team-demo.yml` for a complete working example that:
1. Starts broker as sidecar service
2. Registers an agent session
3. Creates a team from an issue
4. Creates tasks from issue metadata
5. Reports team status on completion
