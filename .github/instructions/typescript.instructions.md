---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript Instructions

These instructions apply to all TypeScript and TSX files.

## Type Safety

- Never use `any`. Use `unknown` when the type is truly unknown, then narrow.
- Define explicit interfaces for all data structures, API responses, and props.
- Use union types for string literals: `'active' | 'resolved' | 'closed'`.
- Use generics for reusable functions and components.

```typescript
// GOOD: Explicit types
interface Market {
  id: string
  name: string
  status: 'active' | 'resolved' | 'closed'
}

// BAD: Using any
function getMarket(id: any): Promise<any> { }
```

## Immutability

- Always use spread operators to create new objects and arrays.
- Never mutate function arguments or state directly.
- Use `Readonly<T>` for data that should not be modified.

```typescript
// GOOD
const updated = { ...user, name: 'New Name' }
const extended = [...items, newItem]

// BAD
user.name = 'New Name'
items.push(newItem)
```

## Naming Conventions

- Variables and functions: `camelCase`. Use verb-noun pattern for functions.
- Types and interfaces: `PascalCase`. No `I` prefix on interfaces.
- Constants: `UPPER_SNAKE_CASE` for true constants.
- Files: `camelCase` for utilities, `PascalCase` for components.

## Error Handling

- Always wrap async operations in try/catch.
- Provide context in error messages: what failed and why.
- Use custom error classes for domain-specific errors.
- Never swallow errors silently.

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  throw new Error(`Failed to process request: ${(error as Error).message}`)
}
```

## React Patterns (TSX)

- Use functional components with typed props interfaces.
- Memoize expensive computations with `useMemo`.
- Memoize callbacks passed to children with `useCallback`.
- Use `React.memo` for pure components that receive complex props.
- Prefer composition over inheritance for component reuse.

## Async Patterns

- Use `Promise.all` for independent async operations.
- Use `Promise.allSettled` when some failures are acceptable.
- Avoid sequential awaits for independent operations.

```typescript
// GOOD: Parallel
const [users, markets] = await Promise.all([
  fetchUsers(),
  fetchMarkets()
])

// BAD: Sequential when unnecessary
const users = await fetchUsers()
const markets = await fetchMarkets()
```

## Validation

- Validate all external input at system boundaries using Zod.
- Export validation schemas alongside their corresponding types.
- Use `z.infer<typeof schema>` to derive types from schemas.
