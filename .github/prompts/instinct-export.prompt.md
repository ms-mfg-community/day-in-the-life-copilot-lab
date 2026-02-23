---
description: "Export learned instincts to a shareable YAML format for teammates or other projects"
agent: "agent"
argument-hint: "--domain <name> | --min-confidence <n> | --output <file>"
---

# Instinct Export

Exports instincts to a shareable format for:
- Sharing with teammates
- Transferring to a new machine
- Contributing to project conventions

## Usage

```
/instinct-export                           # Export all personal instincts
/instinct-export --domain testing          # Export only testing instincts
/instinct-export --min-confidence 0.7      # Only export high-confidence instincts
/instinct-export --output team-instincts.yaml
```

## What to Do

1. Read instincts from `~/.copilot/homunculus/instincts/personal/`
2. Filter based on flags
3. Strip sensitive information:
   - Remove session IDs
   - Remove file paths (keep only patterns)
   - Remove old timestamps
4. Generate export file

## Output Format

Creates a YAML file:

```yaml
version: "2.0"
exported_by: "continuous-learning-v2"
export_date: "2026-01-30T10:30:00Z"

instincts:
  - id: prefer-functional-style
    trigger: "when writing new functions"
    action: "Use functional patterns over classes"
    confidence: 0.8
    domain: code-style
    observations: 8
```

## Privacy

Exports include: trigger patterns, actions, confidence scores, domains, observation counts.

Exports do NOT include: actual code snippets, file paths, session transcripts, personal identifiers.

## Flags

- `--domain <name>`: Export only specified domain
- `--min-confidence <n>`: Minimum confidence threshold (default: 0.3)
- `--output <file>`: Output file path (default: instincts-export-YYYYMMDD.yaml)
- `--format <yaml|json|md>`: Output format (default: yaml)
- `--include-evidence`: Include evidence text (default: excluded)

> **Note:** This prompt is available in VS Code, Visual Studio, and JetBrains. For Copilot CLI, describe the task directly.
