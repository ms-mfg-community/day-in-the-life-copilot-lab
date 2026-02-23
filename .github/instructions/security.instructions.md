---
applyTo: "**/*"
---

# Security Instructions

These security rules apply to all files in this repository.

## Mandatory Checks Before Any Commit

- No hardcoded secrets (API keys, passwords, tokens) in source code.
- All user inputs validated with schema validation (Zod, Pydantic, etc.).
- SQL injection prevention: use parameterized queries only. No string concatenation.
- XSS prevention: sanitize all user-provided HTML.
- CSRF protection enabled on state-changing endpoints.
- Authentication and authorization verified on protected routes.
- Rate limiting configured on all API endpoints.
- Error messages must not leak sensitive data, stack traces, or internal paths.

## Secret Management

```typescript
// NEVER: Hardcoded secrets
const apiKey = "sk-proj-xxxxx"

// ALWAYS: Environment variables
const apiKey = process.env.API_KEY

if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

## Input Validation

```typescript
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150)
})

const validated = schema.parse(input)
```

## Authentication

- Store tokens in httpOnly cookies with Secure and SameSite=Strict flags.
- Never store tokens in localStorage (vulnerable to XSS).
- Verify authorization before every sensitive operation.
- Enable Row Level Security in Supabase/PostgreSQL.

## Dependency Security

- Run `npm audit` regularly. Fix vulnerabilities before deploying.
- Commit lock files (`package-lock.json`, `pnpm-lock.yaml`).
- Use `npm ci` in CI/CD for reproducible builds.
