---
description: "Comprehensive Go code review for idiomatic patterns, concurrency safety, error handling, and security"
agent: "agent"
---

# Go Code Review

Comprehensive Go-specific code review.

## What This Prompt Does

1. **Identify Go Changes**: Find modified `.go` files via `git diff`
2. **Run Static Analysis**: Execute `go vet`, `staticcheck`, `golangci-lint`
3. **Security Scan**: Check for SQL injection, command injection, race conditions
4. **Concurrency Review**: Analyze goroutine safety, channel usage, mutex patterns
5. **Idiomatic Go Check**: Verify code follows Go conventions
6. **Generate Report**: Categorize issues by severity

## Review Categories

### CRITICAL (Must Fix)
- SQL/Command injection vulnerabilities
- Race conditions without synchronization
- Goroutine leaks
- Hardcoded credentials
- Unsafe pointer usage
- Ignored errors in critical paths

### HIGH (Should Fix)
- Missing error wrapping with context
- Panic instead of error returns
- Context not propagated
- Unbuffered channels causing deadlocks
- Missing mutex protection

### MEDIUM (Consider)
- Non-idiomatic code patterns
- Missing godoc comments on exports
- Inefficient string concatenation
- Table-driven tests not used

## Automated Checks

```bash
go vet ./...
staticcheck ./...
golangci-lint run
go build -race ./...
govulncheck ./...
```

## Approval Criteria

| Status | Condition |
|--------|-----------|
| Approve | No CRITICAL or HIGH issues |
| Warning | Only MEDIUM issues |
| Block | CRITICAL or HIGH issues found |

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, describe the task directly.
