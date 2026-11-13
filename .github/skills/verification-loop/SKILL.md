---
name: verification-loop
description: Comprehensive verification system for coding sessions. Use after completing features, before creating PRs, or after refactoring to ensure quality gates pass.
---

# Verification Loop Skill

A comprehensive verification system for coding sessions.

## When to Use

Invoke this skill:
- After completing a feature or significant code change
- Before creating a PR
- When you want to ensure quality gates pass
- After refactoring

## Verification Phases

### Phase 1: Build Verification
```bash
# Check if the solution builds (run from the repo root)
dotnet build dotnet/ContosoUniversity.sln 2>&1 | tail -20
```

If build fails, STOP and fix before continuing.

### Phase 2: Code Analysis
```bash
# Run .NET compiler & Roslyn analyzers as errors (NuGet advisories NU1901-NU1904 are checked in Phase 4)
dotnet build dotnet/ContosoUniversity.sln -warnaserror -warnnotaserror:NU1901,NU1902,NU1903,NU1904 2>&1 | head -30
```

Report all warnings and errors. Fix critical ones before continuing.

### Phase 3: Test Suite
```bash
# Run unit and integration tests with coverage
dotnet test dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj --collect:"XPlat Code Coverage" 2>&1 | tail -50

# Check coverage threshold
# Target: 80% minimum
```

The solution also holds the Playwright E2E project (`dotnet/ContosoUniversity.PlaywrightTests/`). It needs a running web app and browsers, so it is not part of this loop; run it separately with `make test-dotnet-e2e`.

Report:
- Total tests: X
- Passed: X
- Failed: X
- Coverage: X%

### Phase 4: Security Scan
```bash
# Check for hardcoded secrets
grep -rn "password\s*=" --include="*.cs" . 2>/dev/null | grep -v "test\|Test\|mock\|Mock" | head -10
grep -rn "api[_-]key" --include="*.cs" --include="*.json" . 2>/dev/null | head -10

# Check for vulnerable packages
dotnet list dotnet/ContosoUniversity.sln package --vulnerable 2>&1 | head -20

# Check for Console.WriteLine in production code (not tests)
grep -rn "Console.WriteLine" --include="*.cs" dotnet/ContosoUniversity.Web/ dotnet/ContosoUniversity.Core/ dotnet/ContosoUniversity.Infrastructure/ 2>/dev/null | head -10
```

### Phase 5: Diff Review
```bash
# Show what changed
git diff --stat
git diff HEAD~1 --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Potential edge cases

## Output Format

After running all phases, produce a verification report:

```
VERIFICATION REPORT
==================

Build:     [PASS/FAIL]
Analysis:  [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR

Issues to Fix:
1. ...
2. ...
```

## Continuous Mode

For long sessions, run verification every 15 minutes or after major changes:

```markdown
Set a mental checkpoint:
- After completing each method
- After finishing a service or controller
- Before moving to next task

Run verification
```

## Integration with Hooks

This skill complements postToolUse hooks but provides deeper verification.
Hooks catch issues immediately; this skill provides comprehensive review.
