# Memory-MCP Integration Guide

**Stream:** EPIC-005 Stream 2 - Memory & Search Enhancement
**Created:** 2026-02-04

---

## Overview

This guide explains how to use memory-MCP alongside the session-broker's semantic search capabilities. Both systems store and retrieve information, but serve different purposes and have different lifetimes.

## Two Memory Systems

### 1. memory-MCP (Knowledge Graph)

**Purpose:** Persistent cross-session knowledge storage

**Best for:**
- Architectural decisions and rationale
- Design patterns discovered during development
- Project conventions and standards
- Technical debt tracking
- Cross-session learning

**Lifetime:** Persistent until explicitly deleted

**Data model:** Entities, relations, and observations

**Example uses:**
```
Entity: "Authentication Architecture"
Observations:
- "Uses JWT tokens with 24-hour expiry"
- "Refresh tokens stored in httpOnly cookies"
- "Rate limiting: 100 requests/minute per user"

Entity: "Database Conventions"
Observations:
- "Snake_case for column names"
- "UUID primary keys for all tables"
- "Soft deletes via deleted_at column"
```

### 2. Session-Broker Semantic Search

**Purpose:** Find relevant active sessions by similarity

**Best for:**
- Discovering which sessions are working on related tasks
- Avoiding duplicate work across parallel sessions
- Finding sessions to coordinate with
- Session discovery based on purpose

**Lifetime:** Ephemeral (lives with session registration)

**Data model:** Session purpose text with vector embeddings

**Example uses:**
```
Query: "authentication implementation"
Results:
- Session "auth-feature" (0.89 similarity)
- Session "login-flow" (0.72 similarity)
- Session "security-review" (0.65 similarity)
```

## When to Use Which

| Scenario | Use memory-MCP | Use Session Search |
|----------|---------------|-------------------|
| "What auth pattern does this project use?" | ✅ | |
| "Which session is working on auth?" | | ✅ |
| "Store this design decision" | ✅ | |
| "Find sessions with overlapping work" | | ✅ |
| "What conventions were established?" | ✅ | |
| "Who should I coordinate with?" | | ✅ |

## Integration Patterns

### Pattern 1: Session Registration with Memory Lookup

When a session starts, check memory-MCP for relevant context:

```typescript
// 1. Register with session-broker
await broker.registerSession({
  id: 'session-auth-123',
  purpose: 'Implement JWT authentication',
  working_dir: '/project'
})

// 2. Search memory-MCP for relevant knowledge
const entities = await memory.searchNodes('authentication JWT')
// Returns: patterns, decisions, conventions

// 3. Apply learned context to current work
```

### Pattern 2: Coordination Discovery

Before starting work, find related sessions:

```typescript
// 1. Search for sessions with similar purposes
const results = await broker.searchSessions({
  query: 'authentication security login',
  top_k: 5
})

// 2. If similar sessions found, check for conflicts
if (results.length > 0) {
  for (const session of results) {
    // Consider sending coordination message
    await broker.sendMessage({
      sender_id: mySessionId,
      receiver_id: session.session_id,
      content: 'Also working on auth - let's coordinate'
    })
  }
}
```

### Pattern 3: Learning Capture

After completing significant work, store learnings:

```typescript
// 1. Complete implementation work
// ... coding ...

// 2. Store decisions in memory-MCP
await memory.createEntity({
  name: 'JWT Implementation Decision',
  entityType: 'Decision',
  observations: [
    'Chose RS256 over HS256 for key rotation support',
    'Token expiry: 15 minutes access, 7 days refresh',
    'Stored refresh tokens in Redis for revocation'
  ]
})

// 3. Deregister from session-broker
await broker.deregisterSession({ id: mySessionId })
```

### Pattern 4: Cross-Session Knowledge Sharing

Share findings across parallel sessions:

```typescript
// Session A discovers important pattern
await memory.createEntity({
  name: 'API Rate Limiting Pattern',
  entityType: 'Pattern',
  observations: [
    'Use sliding window algorithm',
    'Redis MULTI/EXEC for atomicity',
    'Return X-RateLimit-* headers'
  ]
})

// Session B (working on different API) queries and applies
const patterns = await memory.searchNodes('rate limiting')
// Applies consistent pattern without rediscovery
```

## Configuration

### Session-Broker Semantic Search

```bash
# No API keys required - fastembed runs locally

# Optional configuration
SEARCH_TOP_K=5                          # default
SEARCH_MIN_SIMILARITY=0.3               # default
```

**Note:** fastembed downloads the BGE-small-en-v1.5 model (~30MB) on first use.

### memory-MCP

Configure in your MCP settings:

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-memory"]
    }
  }
}
```

## API Reference

### Session-Broker Search Endpoints

#### MCP Tools

```typescript
// Search sessions by semantic similarity
search_sessions({
  query: string,           // Search text
  top_k?: number,          // Max results (default: 5)
  min_similarity?: number  // Threshold 0-1 (default: 0.3)
})

// Index/re-index a session
index_session({
  session_id: string,
  force?: boolean  // Force re-indexing
})

// Get index statistics
get_index_stats()
```

#### REST API

```bash
# Search sessions
curl -X POST http://localhost:3456/api/search_sessions \
  -H "Content-Type: application/json" \
  -d '{"query": "authentication", "top_k": 5}'

# Get index stats
curl http://localhost:3456/api/index_stats
```

### memory-MCP Tools

```typescript
// Create entities
create_entities([{
  name: string,
  entityType: string,
  observations: string[]
}])

// Create relations
create_relations([{
  from: string,
  to: string,
  relationType: string
}])

// Search nodes
search_nodes({ query: string })

// Read full graph
read_graph()
```

## Best Practices

### 1. Consistent Entity Naming

Use consistent entity types across sessions:
- `Decision` - Architectural/design decisions
- `Pattern` - Reusable implementation patterns
- `Convention` - Project-wide standards
- `Discovery` - Learnings from debugging/exploration

### 2. Rich Observations

Include enough context in observations:
```typescript
// Good
"Chose PostgreSQL over MySQL for JSON column support and better concurrent write handling"

// Too brief
"Using PostgreSQL"
```

### 3. Relate Entities

Build a connected knowledge graph:
```typescript
await memory.createRelations([
  { from: 'JWT Auth', to: 'Redis Sessions', relationType: 'depends_on' },
  { from: 'API Rate Limiting', to: 'Redis', relationType: 'uses' }
])
```

### 4. Session Purpose Clarity

Write clear, searchable session purposes:
```typescript
// Good - specific and searchable
purpose: 'Implementing JWT authentication with refresh token rotation'

// Less useful
purpose: 'Working on auth stuff'
```

### 5. Regular Memory Updates

Update memory-MCP as you learn:
```typescript
await memory.addObservations([{
  entityName: 'Database Schema',
  contents: [
    'Added indexes on user_id columns for query performance',
    'Partitioned events table by month'
  ]
}])
```

## Graceful Degradation

### Without memory-MCP

If memory-MCP is not configured:
- Session coordination via session-broker works fully
- Cross-session knowledge must be shared via messages
- Consider documenting decisions in code comments/docs

## Troubleshooting

### Search returns no results

1. Verify sessions are registered: `GET /api/index_stats`
2. Try lower `min_similarity` threshold
3. Ensure query is semantically related to session purposes
4. Check if model downloaded: first search may be slow (~30MB download)

### memory-MCP not responding

1. Check MCP server is running
2. Verify configuration in settings
3. Check for memory graph file corruption

### First search is slow

This is normal - fastembed downloads the model on first use (~30MB).
Subsequent searches are sub-millisecond.

---

## Summary

| Feature | memory-MCP | Session Search |
|---------|-----------|----------------|
| Persistence | Permanent | Session lifetime |
| Scope | Cross-session knowledge | Active session discovery |
| Data | Entities + relations | Purposes + embeddings |
| Query | Keyword + semantic | Semantic only |
| Use case | Learning capture | Coordination |

Use **memory-MCP** for knowledge that should persist across sessions.
Use **session search** for finding and coordinating with active sessions.
