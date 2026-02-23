---
description: "Import instincts from teammates, Skill Creator, or other sources with conflict resolution"
agent: "agent"
argument-hint: "<file-or-url> [--dry-run] [--force] [--min-confidence <n>]"
---

# Instinct Import

Import instincts from:
- Teammates' exports
- Skill Creator (repo analysis)
- Community collections
- Previous machine backups

## Usage

```
/instinct-import team-instincts.yaml
/instinct-import https://github.com/org/repo/instincts.yaml
/instinct-import --from-skill-creator acme/webapp
```

## What to Do

1. Fetch the instinct file (local path or URL)
2. Parse and validate the format
3. Check for duplicates with existing instincts
4. Merge or add new instincts
5. Save to `~/.copilot/homunculus/instincts/inherited/`

## Merge Strategies

### For Duplicates
- **Higher confidence wins**: Keep the one with higher confidence
- **Merge evidence**: Combine observation counts
- **Update timestamp**: Mark as recently validated

### For Conflicts
- **Skip by default**: Don't import conflicting instincts
- **Flag for review**: Mark both as needing attention
- **Manual resolution**: User decides which to keep

## Source Tracking

Imported instincts are tagged with:
```yaml
source: "inherited"
imported_from: "team-instincts.yaml"
imported_at: "2026-01-30T10:30:00Z"
```

## Flags

- `--dry-run`: Preview without importing
- `--force`: Import even if conflicts exist
- `--merge-strategy <higher|local|import>`: How to handle duplicates
- `--from-skill-creator <owner/repo>`: Import from Skill Creator analysis
- `--min-confidence <n>`: Only import instincts above threshold

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, describe the task directly.
