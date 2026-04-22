---
title: "Lab 04 — Node.js skill & prompt (track appendix)"
lab_number: 4
track: node
---

# Lab 04 — Node track appendix: `node-testing` skill + `@create-node-test` prompt

This appendix gives you the Node.js variants of the skill and prompt template created in [`labs/lab04.md`](../../lab04.md).

## A. Create the `node-testing` skill

**WSL/Bash:**

````bash
mkdir -p .github/skills/node-testing
cat > .github/skills/node-testing/SKILL.md << 'SKILL'
---
name: node-testing
description: Node.js testing patterns for ContosoUniversity (Node track) using Vitest, Fastify inject(), and in-memory Drizzle. Covers unit tests, integration tests, fixtures, and naming conventions.
---

# Node.js Testing Patterns (Node track)

Testing patterns for Fastify + Drizzle applications using Vitest.

## Test Naming Convention

`<unit-under-test>.<scenario>.<expected-outcome>` — e.g.
`createStudent.withValidPayload.returns201`.

## Unit Test Pattern (Vitest)

```ts
import { describe, it, expect } from 'vitest';
import { createInMemoryDb } from '../../infra/db.js';
import { createStudentRepo } from '../../infra/repos/student-repo.js';

describe('StudentRepo', () => {
  it('create returns the persisted student with an id', async () => {
    const db = await createInMemoryDb();
    const repo = createStudentRepo(db);
    const created = await repo.create({ firstName: 'Ada', lastName: 'Lovelace', enrollmentDate: new Date('2024-09-01') });
    expect(created.id).toBeDefined();
  });
});
```

## Integration Test Pattern (Fastify `inject()`)

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../../web/app.js';
import { createInMemoryDb } from '../../infra/db.js';

describe('GET /api/students', () => {
  it('returns ApiResponse envelope with seeded data', async () => {
    const db = await createInMemoryDb();
    const app = await buildApp({ db });
    const res = await app.inject({ method: 'GET', url: '/api/students' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});
```

## Edge Cases to Always Test

- Missing required fields → 400 with `success: false`
- Unknown id → 404
- Duplicate unique constraint → 409
- Empty list → 200 with `data: []`
SKILL
````

**PowerShell:** wrap in `@'...'@ | Out-File -FilePath .github/skills/node-testing/SKILL.md -Encoding utf8`.

## B. Create the `@create-node-test` prompt

````bash
mkdir -p .github/prompts
cat > .github/prompts/create-node-test.prompt.md << 'PROMPT'
---
name: create-node-test
description: Generate a Vitest test file for a Node.js Fastify route or repository
---

# Create Node Test

Generate a Vitest test file following the `node-testing` skill conventions.

## Instructions

1. Identify whether the target is a route (integration) or a repository (unit).
2. For repositories: build an in-memory db, instantiate the repo, exercise CRUD.
3. For routes: build the Fastify app via `buildApp({ db })` and use `app.inject()`.
4. Cover happy path + 1 validation failure + 1 not-found case.
5. Place the file in `node/tests/unit/` or `node/tests/integration/`.

## Naming Convention

`<feature>.test.ts` — e.g. `student-repo.test.ts`, `students-api.test.ts`.

## After Generating

- Run `pnpm -C node test` and confirm all new cases pass.
- Ensure no `console.log` appears in the test file.
PROMPT
````

## C. Verify

```bash
head -5 .github/skills/node-testing/SKILL.md
head -7 .github/prompts/create-node-test.prompt.md
```
