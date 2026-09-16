---
title: "Lab 05 — Node.js MCP picks (track appendix)"
lab_number: 5
track: node
---

# Lab 05 — Node track appendix: MCP picks

The MCP servers introduced in [`labs/lab05.md`](../../lab05.md) all apply to the Node track. This appendix calls out which servers earn the most leverage when working in the Fastify + Drizzle stack and how to wire them.

## A. Recommended MCP picks for the Node track

| Server | Why it matters on the Node track |
|--------|----------------------------------|
| `context7` | Look up Fastify, Drizzle, Vitest, Pino docs on demand without leaving Copilot. |
| `microsoft-learn` | Azure SDK for JS / TS guidance when deploying the Node track to App Service or Container Apps. |
| `sequential-thinking` | Helpful when designing a new route + repo + test trio in one go. |
| `memory` | Persist domain shape (Student, Course, Instructor relations) across sessions. |

## B. Sanity-check the Node workspace before invoking MCP

Before relying on context7 to lookup Drizzle docs, make sure the workspace actually
parses your schema:

```bash
pnpm -C node install
pnpm -C node test
```

A failing test surface gives Copilot more accurate context to ground its answers in.

## C. Suggested first prompt

> `@context7 In the node/ workspace I have Fastify v4 and Drizzle ORM (better-sqlite3). Show me the idiomatic way to register a route plugin that depends on a Drizzle db instance via Fastify decorators.`
